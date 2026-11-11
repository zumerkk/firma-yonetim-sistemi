import React, { act } from 'react';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import FaturaKalemleriDialog from './FaturaKalemleriDialog';
import api from '../../utils/axios';

jest.mock('../../utils/axios', () => ({
  __esModule: true,
  default: { get: jest.fn(), post: jest.fn() },
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

test('seçili yerli fatura kaleminin birden çok evrakı türüne göre görünür', async () => {
  kur();
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
  expect(screen.queryByRole('button', { name: 'F-3 evrakları' })).not.toBeInTheDocument();

  fireEvent.click(screen.getByRole('button', { name: 'F-2 evrakları' }));
  expect(screen.queryByRole('region', { name: 'F-1 evrak listesi' })).not.toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'baska.xml indir' })).toBeInTheDocument();
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

test('ithal beyannamede fatura evrakları sütunu açılmaz', async () => {
  kur({ makine: { ...makine, listType: 'import' } });
  expect(await screen.findByRole('columnheader', { name: 'Beyanname No' })).toBeInTheDocument();
  expect(screen.queryByRole('columnheader', { name: 'Evraklar' })).not.toBeInTheDocument();
});
