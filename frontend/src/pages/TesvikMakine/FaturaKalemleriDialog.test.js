import React, { act } from 'react';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import FaturaKalemleriDialog from './FaturaKalemleriDialog';
import api, { uploadPost } from '../../utils/axios';

jest.mock('../../utils/axios', () => ({
  __esModule: true,
  default: { get: jest.fn(), post: jest.fn(), patch: jest.fn() },
  uploadPost: jest.fn()
}));

const makine = { listType: 'local', rowId: 'makine-1', machineName: 'Pres', siraNo: 1 };
const props = { open: true, tesvikModel: 'Tesvik', tesvikId: 'belge-1', makine, onClose: () => {} };
const ekler = [
  { _id: 'pdf-1', tur: 'fatura_pdf', dosyaAdi: 'fatura.pdf' },
  { _id: 'pdf-2', tur: 'fatura_pdf', dosyaAdi: 'ikinci.pdf' },
  { _id: 'xml-1', tur: 'fatura_xml', dosyaAdi: 'e-fatura' },
  { _id: 'yevmiye-1', tur: 'yevmiye_pdf', dosyaAdi: 'yevmiye.pdf' },
  { _id: 'bilinmeyen', tur: 'bilinmeyen', dosyaAdi: 'gosterme.html' }
];
const surec = { _id: 'surec-1', faturalar: [
  { _id: 'kalem-1', no: 'F-1', kaynak: 'firma', evraklar: ekler },
  { _id: 'kalem-2', no: 'F-2', evraklar: [{ _id: 'xml-2', tur: 'fatura_xml', dosyaAdi: 'baska.xml' }] },
  { _id: 'kalem-3', no: 'F-3', tutar: 25 }
] };
const pdf = () => new Blob(['%PDF-test'], { type: 'application/pdf' });
const kur = (extra) => render(<FaturaKalemleriDialog {...props} {...extra} />);
const evraklariAc = async () => fireEvent.click(await screen.findByRole('button', { name: 'F-1 evrakları' }));

const eskiOlustur = URL.createObjectURL;
const eskiKaldir = URL.revokeObjectURL;
let pencere;
let indirilen;

beforeEach(() => {
  jest.clearAllMocks();
  api.post.mockResolvedValue({ data: { data: surec } });
  pencere = { closed: false, opener: window, document: { body: {} }, location: { replace: jest.fn() }, close: jest.fn() };
  jest.spyOn(window, 'open').mockReturnValue(pencere);
  URL.createObjectURL = jest.fn(() => 'blob:evrak');
  URL.revokeObjectURL = jest.fn();
  indirilen = [];
  jest.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function () { indirilen.push(this.download); });
});

afterEach(() => {
  jest.restoreAllMocks();
  URL.createObjectURL = eskiOlustur;
  URL.revokeObjectURL = eskiKaldir;
});

test('salt okunur yerli fatura kaleminin birden çok evrakı türüne göre görünür', async () => {
  api.get.mockResolvedValueOnce({ data: { data: { process: surec } } });
  kur({ duzenlenebilir: false, makine: { ...makine, process: { _id: surec._id } } });
  fireEvent.click(await screen.findByRole('cell', { name: 'F-1' }));
  const liste = within(screen.getByRole('region', { name: 'F-1 evrak listesi' }));
  expect(liste.getByText('Fatura PDF')).toBeInTheDocument();
  expect(liste.getByText('Fatura XML')).toBeInTheDocument();
  expect(liste.getByText('Yevmiye Kayıt PDF')).toBeInTheDocument();
  expect(liste.getByRole('button', { name: 'fatura.pdf aç' })).toBeInTheDocument();
  expect(liste.getByRole('button', { name: 'ikinci.pdf aç' })).toBeInTheDocument();
  expect(liste.getByRole('button', { name: 'e-fatura.xml indir' })).toBeInTheDocument();
  expect(liste.getByRole('button', { name: 'yevmiye.pdf aç' })).toBeInTheDocument();
  expect(liste.queryByText('gosterme.html')).not.toBeInTheDocument();
  expect(liste.queryByLabelText('Fatura PDF')).not.toBeInTheDocument();
  expect(screen.queryByRole('button', { name: 'F-3 evrakları' })).not.toBeInTheDocument();

  fireEvent.click(screen.getByRole('button', { name: 'F-2 evrakları' }));
  expect(screen.queryByRole('region', { name: 'F-1 evrak listesi' })).not.toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'baska.xml indir' })).toBeInTheDocument();
});

test('yerli fatura kalemi kaydedilince üç türde birden fazla evrak aynı kaleme yüklenebilir', async () => {
  const yeni = { _id: 'yeni', no: 'F-YENI', kaynak: 'personel' };
  api.post.mockResolvedValueOnce({ data: { data: surec } });
  api.post.mockResolvedValueOnce({ data: { data: { yeniKalemId: yeni._id, faturalar: [...surec.faturalar, yeni] } } });
  const dosyaGruplari = [
    ['Fatura PDF', 'faturaPdf', 'fatura_pdf', ['fatura-1.pdf', 'fatura-2.pdf'], '%PDF-1.4'],
    ['Fatura XML', 'faturaXml', 'fatura_xml', ['fatura-1.xml', 'fatura-2.xml'], '<Invoice/>'],
    ['Yevmiye Kayıt PDF', 'yevmiyePdf', 'yevmiye_pdf', ['yevmiye-1.pdf', 'yevmiye-2.pdf'], '%PDF-1.4']
  ];
  const evraklar = dosyaGruplari.flatMap(([, , tur, adlar]) => adlar.map((ad) => ({ _id: ad, tur, dosyaAdi: ad })));
  uploadPost.mockResolvedValueOnce({ data: { data: { faturalar: [...surec.faturalar, { ...yeni, evraklar }] } } });
  kur();
  expect(await screen.findByRole('button', { name: 'F-3 evrakları' })).toBeEnabled();
  fireEvent.change(screen.getByRole('textbox', { name: 'Fatura Sayısı' }), { target: { value: yeni.no } });
  fireEvent.click(screen.getByRole('button', { name: 'Kaydet' }));
  const panel = within(await screen.findByRole('region', { name: 'F-YENI evrak listesi' }));

  dosyaGruplari.forEach(([etiket, , , adlar, icerik]) => {
    const input = panel.getByLabelText(etiket);
    expect(input).toHaveAttribute('multiple');
    fireEvent.change(input, { target: { files: adlar.map((ad) => new File([icerik], ad)) } });
  });
  fireEvent.click(panel.getByRole('button', { name: 'Dosyaları Yükle' }));
  expect(await panel.findByRole('alert')).toHaveTextContent('Evraklar yüklendi.');
  const [url, form] = uploadPost.mock.calls[0];
  expect(url).toBe('/tesvik-makine/process/surec-1/fatura-kalemleri/yeni/evrak');
  dosyaGruplari.forEach(([, alan, , adlar]) => expect(form.getAll(alan).map((dosya) => dosya.name)).toEqual(adlar));
  expect(panel.getByRole('button', { name: 'fatura-2.xml indir' })).toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'F-YENI evrakları' })).toHaveTextContent('Evraklar (6)');
});

test('PDF yalnız kimlikli blob isteği sonrası bağımsız sekmeye açılır, XML dosya olarak iner', async () => {
  let tamamla;
  api.get.mockImplementationOnce(() => new Promise((resolve) => { tamamla = resolve; }));
  api.get.mockResolvedValueOnce({ data: new Blob(['<Invoice/>'], { type: 'application/xml' }) });
  kur();
  await evraklariAc();
  const pdfDugme = screen.getByRole('button', { name: 'fatura.pdf aç' });
  fireEvent.click(pdfDugme);
  expect(window.open).toHaveBeenCalledWith('', '_blank');
  expect(pencere.opener).toBeNull();
  expect(pdfDugme).toBeDisabled();
  expect(api.get).toHaveBeenCalledWith('/tesvik-makine/process/surec-1/fatura-kalemleri/kalem-1/evrak/pdf-1',
    expect.objectContaining({ responseType: 'blob', timeout: 120000 }));
  expect(pencere.location.replace).not.toHaveBeenCalled();
  await act(async () => { tamamla({ data: pdf() }); });
  expect(pencere.location.replace).toHaveBeenCalledWith('blob:evrak');
  expect(URL.createObjectURL.mock.calls[0][0].type).toBe('application/pdf');

  fireEvent.click(screen.getByRole('button', { name: 'e-fatura.xml indir' }));
  await waitFor(() => expect(indirilen).toEqual(['e-fatura.xml']));
  expect(window.open).toHaveBeenCalledTimes(1);
  expect(URL.createObjectURL.mock.calls[1][0].type).toBe('application/octet-stream');
});

test('sekme engellenirse PDF aynı adla indirilir', async () => {
  window.open.mockReturnValueOnce(null);
  api.get.mockResolvedValueOnce({ data: pdf() });
  kur();
  await evraklariAc();
  fireEvent.click(screen.getByRole('button', { name: 'yevmiye.pdf aç' }));
  await waitFor(() => expect(indirilen).toEqual(['yevmiye.pdf']));
});

test('evrak hatası seçili kalemde görünür ve başarısız PDF sekmesi kapanır', async () => {
  api.get.mockRejectedValueOnce({ response: { data: { message: 'Bu evrak artık mevcut değil.' } } });
  kur();
  await evraklariAc();
  fireEvent.click(screen.getByRole('button', { name: 'ikinci.pdf aç' }));
  expect(await screen.findByRole('alert')).toHaveTextContent('Bu evrak artık mevcut değil.');
  expect(pencere.close).toHaveBeenCalled();
  expect(pencere.location.replace).not.toHaveBeenCalled();
  expect(screen.getByRole('button', { name: 'ikinci.pdf aç' })).toBeEnabled();
});

test('pencere kapandığında bekleyen evrak iptal olur ve geç yanıt açılmaz', async () => {
  let tamamla;
  api.get.mockImplementationOnce(() => new Promise((resolve) => { tamamla = resolve; }));
  const { rerender } = kur();
  await evraklariAc();
  fireEvent.click(screen.getByRole('button', { name: 'fatura.pdf aç' }));
  const { signal } = api.get.mock.calls[0][1];
  rerender(<FaturaKalemleriDialog {...props} open={false} />);
  expect(signal.aborted).toBe(true);
  expect(pencere.close).toHaveBeenCalled();
  await act(async () => { tamamla({ data: pdf() }); });
  expect(URL.createObjectURL).not.toHaveBeenCalled();
});

test('ithal beyannamede yeni TL kalemi kaydedilince evrak alanları o kalem için açılır', async () => {
  const eski = { _id: 'eski', no: 'B-ESKI', tutar: 75, tutarParaBirimi: 'EUR', kaynak: 'personel' };
  const yeni = { _id: 'yeni', no: 'B-YENI', tutar: 1250.25, tutarParaBirimi: 'TRY', kaynak: 'personel' };
  api.post.mockResolvedValueOnce({ data: { data: { _id: 'surec-1', currency: 'EUR', faturalar: [eski] } } });
  api.post.mockResolvedValueOnce({ data: { data: { yeniKalemId: yeni._id, faturalar: [eski, yeni], faturaTutarToplamlari: { EUR: 75, TRY: 1250.25 } } } });
  const yuklenen = { ...yeni, evraklar: [
    { _id: 'beyanname', tur: 'beyanname_pdf', dosyaAdi: 'beyanname.pdf' },
    { _id: 'beyanname-2', tur: 'beyanname_pdf', dosyaAdi: 'beyanname-2.pdf' }
  ] };
  uploadPost.mockResolvedValueOnce({ data: { data: { faturalar: [eski, yuklenen] } } });
  kur({ makine: { ...makine, listType: 'import', currency: 'EUR', totalPrice: 1800, unit: '142', quantity: 4 } });
  expect(await screen.findByRole('columnheader', { name: 'Beyanname No' })).toBeInTheDocument();
  expect(screen.getByText('4 ADET')).toBeInTheDocument();
  expect(screen.getByText(/\$1\.800,00/)).toBeInTheDocument();
  fireEvent.change(screen.getByRole('textbox', { name: 'Beyanname No' }), { target: { value: 'B-YENI' } });
  fireEvent.change(screen.getByRole('textbox', { name: 'Kalem Tutarı – Mal Bedeli TL' }), { target: { value: '1.250,25' } });
  fireEvent.click(screen.getByRole('button', { name: 'Kaydet' }));
  const evrak = within(await screen.findByRole('region', { name: 'B-YENI evrak listesi' }));
  expect(screen.queryByRole('region', { name: 'B-ESKI evrak listesi' })).not.toBeInTheDocument();
  expect(api.post.mock.calls[1][1]).toMatchObject({ no: 'B-YENI', tutar: 1250.25, tutarParaBirimi: 'TRY' });
  expect(screen.getByText(/₺1\.250,25.*€75,00/)).toBeInTheDocument();

  const pdfler = ['beyanname.pdf', 'beyanname-2.pdf'].map((ad) => new File(['%PDF-1.4'], ad, { type: 'application/pdf' }));
  fireEvent.change(evrak.getByLabelText('Beyanname PDF'), { target: { files: pdfler } });
  expect(evrak.getByLabelText('Yurt Dışı Fatura PDF')).toHaveAttribute('multiple');
  expect(evrak.getByLabelText('Yevmiye Kaydı PDF')).toHaveAttribute('multiple');
  fireEvent.click(evrak.getByRole('button', { name: 'Dosyaları Yükle' }));
  expect(await evrak.findByRole('button', { name: 'beyanname.pdf aç' })).toBeInTheDocument();
  const [url, form] = uploadPost.mock.calls[0];
  expect(url).toBe('/tesvik-makine/process/surec-1/fatura-kalemleri/yeni/evrak');
  expect(form.getAll('beyannamePdf').map((file) => file.name)).toEqual(pdfler.map((file) => file.name));
  expect(form.has('rowId')).toBe(false);
});

test('salt okunur personel beyanname ekini açabilir ve yükleme alanını görmez', async () => {
  const ithal = { _id: 'surec-1', faturalar: [{
    _id: 'b1', no: 'B-1', evraklar: [{ _id: 'evrak-1', tur: 'beyanname_pdf', dosyaAdi: 'beyanname.pdf' }]
  }] };
  api.get.mockResolvedValueOnce({ data: { data: { process: ithal } } }).mockResolvedValueOnce({ data: pdf() });
  kur({ duzenlenebilir: false, makine: { ...makine, listType: 'import', process: { _id: 'surec-1' } } });
  fireEvent.click(await screen.findByRole('button', { name: 'B-1 evrakları' }));
  fireEvent.click(screen.getByRole('button', { name: 'beyanname.pdf aç' }));
  await waitFor(() => expect(pencere.location.replace).toHaveBeenCalledWith('blob:evrak'));
  expect(api.post).not.toHaveBeenCalled();
  expect(screen.queryByRole('button', { name: 'Kaydet' })).not.toBeInTheDocument();
  expect(screen.queryByLabelText('Beyanname PDF')).not.toBeInTheDocument();
});

test('eski dövizli beyannamenin TL karşılığı düzenlenirken özgün tutar ayrı kalır', async () => {
  const eski = { _id: 'eski', no: 'B-ESKI', tutar: 75, tutarParaBirimi: 'EUR', kaynak: 'personel' };
  const guncel = { ...eski, malBedeliTl: 2450.75 };
  api.post.mockResolvedValueOnce({ data: { data: { _id: 'surec-1', currency: 'EUR', faturalar: [eski] } } });
  api.patch
    .mockResolvedValueOnce({ data: { data: { faturalar: [guncel], faturaTutarToplamlari: { EUR: 75, TRY: 2450.75 } } } })
    .mockResolvedValueOnce({ data: { data: { faturalar: [eski], faturaTutarToplamlari: { EUR: 75 } } } });
  kur({ makine: { ...makine, listType: 'import', currency: 'EUR' } });
  fireEvent.click(await screen.findByRole('button', { name: 'B-ESKI düzelt' }));
  expect(screen.getByRole('textbox', { name: 'Kalem Tutarı – Mal Bedeli (EUR)' })).toHaveValue('75,00');
  const malBedeli = screen.getByRole('textbox', { name: 'Mal Bedeli TL' });
  fireEvent.change(malBedeli, { target: { value: '0' } });
  expect(screen.getByRole('button', { name: 'Kaydet' })).toBeDisabled();
  fireEvent.change(malBedeli, { target: { value: '2.450,75' } });
  fireEvent.click(screen.getByRole('button', { name: 'Kaydet' }));

  await screen.findByText('Kalem güncellendi');
  expect(api.patch).toHaveBeenCalledWith('/tesvik-makine/process/surec-1/fatura-kalemleri/eski', expect.objectContaining({
    tutar: 75, malBedeliTl: 2450.75
  }));
  const satir = within(screen.getByRole('row', { name: /B-ESKI/ }));
  expect(satir.getByText('€75,00')).toBeInTheDocument();
  expect(satir.getByText('Mal Bedeli TL ₺2.450,75')).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'B-ESKI düzelt' }));
  const kayitliTutar = screen.getByRole('textbox', { name: 'Mal Bedeli TL' });
  expect(kayitliTutar).toHaveValue('2.450,75');
  fireEvent.change(kayitliTutar, { target: { value: '' } });
  fireEvent.click(screen.getByRole('button', { name: 'Kaydet' }));
  await waitFor(() => expect(screen.queryByText('Mal Bedeli TL ₺2.450,75')).not.toBeInTheDocument());
  expect(api.patch.mock.calls[1][1]).toMatchObject({ tutar: 75, malBedeliTl: null });
});
