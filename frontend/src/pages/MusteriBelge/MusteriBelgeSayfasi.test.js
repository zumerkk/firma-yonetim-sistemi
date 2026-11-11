import React from 'react';
import { act, fireEvent, render, screen, within } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import MusteriBelgeSayfasi from './MusteriBelgeSayfasi';
import api, { uploadPost } from '../../utils/axios';

jest.mock('../../utils/axios', () => ({ __esModule: true, default: { get: jest.fn(), post: jest.fn() }, uploadPost: jest.fn() }));

beforeEach(() => {
  jest.clearAllMocks();
  localStorage.removeItem('musteriBelge.giren');
});

afterEach(() => jest.restoreAllMocks());

const yanit = (data) => ({ data: { data } });
const makine = (rowId, listType, kalemler = []) => ({
  rowId, listType, siraNo: 1, adi: `Makine ${rowId}`, miktar: 1, birim: 'ADET',
  kalemler, faturaToplami: kalemler.length * 100, faturaAdedi: kalemler.length
});
const kalem = (_id, no, kaynak = 'firma', evraklar = []) => ({ _id, no, kaynak, evraklar, tarih: '2026-11-05', tutar: 100 });
const dosya = (ad, tur = 'application/pdf') => new File(['örnek'], ad, { type: tur });
const para = (tutar, currency = 'TRY') => tutar.toLocaleString('tr-TR', { style: 'currency', currency, maximumFractionDigits: 2 });
const belgeyiAc = (makineler) => {
  api.get.mockResolvedValue(yanit({ tur: 'eski', belge: { yatirimciUnvan: 'TEST FİRMA', belgeYonetimi: { belgeNo: '123' } }, etiketler: {}, makineler }));
  return render(<MemoryRouter initialEntries={['/belge/test-token']} future={{ v7_startTransition: true, v7_relativeSplatPath: true }}><Routes>
    <Route path="/belge/:token" element={<MusteriBelgeSayfasi />} />
  </Routes></MemoryRouter>);
};
const dosyaSec = (etiket, files) => fireEvent.change(screen.getByLabelText(etiket), { target: { files } });

test('müşteri ithal makinede birim etiketini, EUR birim fiyatını ve USD FOB toplamını görür', async () => {
  belgeyiAc({ yerli: [], ithal: [{
    ...makine('I1', 'import'), birim: '142', birimFiyat: 165000, birimParaBirimi: 'EUR', toplam: 179000, paraBirimi: 'USD'
  }] });
  fireEvent.click(await screen.findByText('İthal Liste (1)'));
  expect(screen.getByText('1 ADET')).toBeInTheDocument();
  expect(screen.getByText(para(165000, 'EUR'))).toBeInTheDocument();
  expect(screen.getByText(para(179000, 'USD'))).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Kalem Gir' }));
  expect(within(screen.getByRole('dialog')).getByText(`1 ADET · Birim: ${para(165000, 'EUR')} · FOB Toplam: ${para(179000, 'USD')}`)).toBeInTheDocument();
});

test('yerli fatura evraksız kaydedilir ve yalnız dönen yeni kaleme PDF, XML ve yevmiye eklenir', async () => {
  const ilkMakine = makine('Y1', 'local');
  const yeniKalem = kalem('hedef', 'FT-001');
  const baskaKalem = kalem('es-zamanli', 'FT-002');
  const kayit = { ...ilkMakine, kalemler: [yeniKalem, baskaKalem], yeniKalemId: 'hedef' };
  const evraklar = [
    { _id: 'pdf1', tur: 'fatura_pdf', dosyaAdi: 'bir.pdf' },
    { _id: 'pdf2', tur: 'fatura_pdf', dosyaAdi: 'iki.pdf' },
    { _id: 'xml1', tur: 'fatura_xml', dosyaAdi: 'fatura.xml' },
    { _id: 'yevmiye1', tur: 'yevmiye_pdf', dosyaAdi: 'yevmiye.pdf' }
  ];
  api.post.mockResolvedValue(yanit(kayit));
  uploadPost.mockResolvedValue(yanit({ ...kayit, kalemler: [{ ...yeniKalem, evraklar }, baskaKalem] }));
  jest.spyOn(window, 'confirm').mockReturnValue(true);
  belgeyiAc({ yerli: [ilkMakine], ithal: [] });
  fireEvent.click(await screen.findByText('Yerli Liste (1)'));
  fireEvent.click(screen.getByRole('button', { name: 'Kalem Gir' }));
  expect(screen.queryByLabelText('Fatura PDF')).not.toBeInTheDocument();
  fireEvent.change(screen.getByLabelText(/Fatura Tarihi/), { target: { value: '2026-11-05' } });
  fireEvent.change(screen.getByLabelText(/Fatura Sayısı/), { target: { value: 'FT-001' } });
  fireEvent.change(screen.getByLabelText(/Kalem Tutarı/), { target: { value: '100' } });
  fireEvent.change(screen.getByLabelText(/Adınız Soyadınız/), { target: { value: 'Test Yetkili' } });
  fireEvent.click(screen.getByRole('button', { name: 'Kaydet' }));

  expect(await screen.findByText('Fatura Evrakları · FT-001')).toBeInTheDocument();
  expect(screen.queryByText('Fatura Evrakları · FT-002')).not.toBeInTheDocument();
  expect(api.post).toHaveBeenCalledWith('/musteri-belge/test-token/fatura-kalemi', expect.objectContaining({ no: 'FT-001', rowId: 'Y1' }), expect.any(Object));
  expect(uploadPost).not.toHaveBeenCalled();

  dosyaSec('Fatura PDF', [dosya('bir.pdf'), dosya('iki.pdf')]);
  dosyaSec('Fatura XML', [dosya('fatura.xml', 'application/xml')]);
  dosyaSec('Yevmiye Kayıt PDF', [dosya('yevmiye.pdf')]);
  fireEvent.click(screen.getByRole('button', { name: 'Dosyaları Yükle' }));
  expect(await screen.findByText('Evraklar yüklendi.')).toBeInTheDocument();
  const [url, form] = uploadPost.mock.calls[0];
  expect(url).toBe('/musteri-belge/test-token/fatura-kalemi/hedef/evrak');
  expect(form.get('rowId')).toBe('Y1');
  expect(form.getAll('faturaPdf').map((f) => f.name)).toEqual(['bir.pdf', 'iki.pdf']);
  expect(form.get('faturaXml').name).toBe('fatura.xml');
  expect(form.get('yevmiyePdf').name).toBe('yevmiye.pdf');
  expect(within(screen.getByRole('list', { name: 'Fatura PDF yüklenen dosyalar' })).getByText('iki.pdf')).toBeInTheDocument();
  expect(screen.queryByRole('link', { name: 'iki.pdf' })).not.toBeInTheDocument();
});

test('var olan yerli faturada yükleme sınırları uygulanır ve bağlantı hatası sonrası aynı istek yinelenir', async () => {
  const ilkKalem = kalem('k1', 'FT-001');
  const ilkMakine = makine('Y1', 'local', [ilkKalem, kalem('p1', 'DANIŞMAN-001', 'personel')]);
  const guncel = { ...ilkMakine, kalemler: [
    { ...ilkKalem, evraklar: [{ _id: 'd1', tur: 'fatura_pdf', dosyaAdi: 'yeniden.pdf' }] }, ilkMakine.kalemler[1]
  ] };
  let tamamla;
  uploadPost.mockRejectedValueOnce(new Error('Bağlantı kesildi'));
  uploadPost.mockImplementationOnce(() => new Promise((resolve) => { tamamla = resolve; }));
  belgeyiAc({ yerli: [ilkMakine], ithal: [] });
  fireEvent.click(await screen.findByText('Yerli Liste (1)'));
  fireEvent.click(screen.getByRole('button', { name: 'Gör / Ekle' }));
  expect(screen.getAllByRole('button', { name: 'Evrak Yükle' })).toHaveLength(1);
  fireEvent.click(screen.getByRole('button', { name: 'Evrak Yükle' }));

  dosyaSec('Fatura PDF', Array.from({ length: 7 }, (_, i) => dosya(`${i}.pdf`)));
  expect(screen.getByText(/en fazla 6 dosya yükleyebilirsiniz/)).toBeInTheDocument();
  const buyuk = dosya('buyuk.pdf');
  Object.defineProperty(buyuk, 'size', { value: 10 * 1024 * 1024 + 1 });
  dosyaSec('Fatura PDF', [buyuk]);
  expect(screen.getByText(/10 MB sınırını aşıyor/)).toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Dosyaları Yükle' })).toBeDisabled();
  expect(uploadPost).not.toHaveBeenCalled();

  dosyaSec('Fatura PDF', [dosya('yeniden.pdf')]);
  fireEvent.click(screen.getByRole('button', { name: 'Dosyaları Yükle' }));
  expect(await screen.findByText('Bağlantı kesildi')).toBeInTheDocument();
  const ilkIstek = uploadPost.mock.calls[0][1].get('istekId');
  expect(ilkIstek).toBeTruthy();
  const yukle = screen.getByRole('button', { name: 'Dosyaları Yükle' });
  fireEvent.click(yukle);
  fireEvent.click(yukle);
  expect(yukle).toBeDisabled();
  expect(screen.getAllByRole('button', { name: 'Kapat' }).every((b) => b.disabled)).toBe(true);
  expect(uploadPost).toHaveBeenCalledTimes(2);
  expect(uploadPost.mock.calls[1][1].get('istekId')).toBe(ilkIstek);
  await act(async () => { tamamla(yanit(guncel)); });
  expect(await screen.findByText('Evraklar yüklendi.')).toBeInTheDocument();
  expect(screen.getByText('yeniden.pdf')).toBeInTheDocument();

  uploadPost.mockResolvedValueOnce(yanit({ ...guncel, kalemler: [{ ...guncel.kalemler[0], evraklar: [
    ...guncel.kalemler[0].evraklar, { _id: 'd2', tur: 'fatura_pdf', dosyaAdi: 'ek.pdf' }
  ] }, guncel.kalemler[1]] }));
  dosyaSec('Fatura PDF', [dosya('ek.pdf')]);
  fireEvent.click(screen.getByRole('button', { name: 'Dosyaları Yükle' }));
  expect(await screen.findByRole('button', { name: 'Evraklar (2)' })).toBeInTheDocument();
  expect(uploadPost.mock.calls[2][1].get('istekId')).not.toBe(ilkIstek);
  expect(screen.getByText('yeniden.pdf')).toBeInTheDocument();
  expect(screen.getByText('ek.pdf')).toBeInTheDocument();
});

test('bekleyen dosya başka makineye taşınmaz', async () => {
  belgeyiAc({
    yerli: [makine('Y1', 'local', [kalem('k1', 'FT-001')]), makine('Y2', 'local', [kalem('k2', 'FT-002')])],
    ithal: []
  });
  fireEvent.click(await screen.findByText('Yerli Liste (2)'));
  fireEvent.click(screen.getByText('Makine Y1'));
  fireEvent.click(screen.getByRole('button', { name: 'Evrak Yükle' }));
  dosyaSec('Fatura PDF', [dosya('bekleyen.pdf')]);
  expect(screen.getByText('bekleyen.pdf')).toBeInTheDocument();
  fireEvent.click(screen.getAllByRole('button', { name: 'Kapat' }).at(-1));
  fireEvent.click(screen.getByText('Makine Y2'));
  fireEvent.click(screen.getByRole('button', { name: 'Evrak Yükle' }));
  expect(screen.queryByText('bekleyen.pdf')).not.toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Dosyaları Yükle' })).toBeDisabled();
});

test('yeni beyanname mal bedeli TL ile kaydedilir ve ithal evrak türleri yüklenebilir', async () => {
  const eskiKalem = { ...kalem('eski', 'BY-ESKI'), tutarParaBirimi: 'EUR' };
  const personelKalemi = { ...kalem('personel', 'BY-DANISMAN', 'personel'), tutar: 75, tutarParaBirimi: 'USD' };
  const yeniKalem = { ...kalem('yeni', 'BY-YENI'), tutar: 1250.75, tutarParaBirimi: 'TRY' };
  const ilkMakine = { ...makine('I1', 'import', [eskiKalem, personelKalemi]), faturaTutarToplamlari: { EUR: 100, USD: 75 } };
  const kayit = {
    ...ilkMakine, kalemler: [eskiKalem, personelKalemi, yeniKalem], yeniKalemId: 'yeni',
    faturaToplami: 1250.75, faturaTutarToplamlari: { EUR: 100, USD: 75, TRY: 1250.75 }
  };
  const evraklar = [
    { _id: 'b1', tur: 'beyanname_pdf', dosyaAdi: 'beyanname-1.pdf' },
    { _id: 'b2', tur: 'beyanname_pdf', dosyaAdi: 'beyanname-2.pdf' },
    { _id: 'f1', tur: 'yurtdisi_fatura_pdf', dosyaAdi: 'yurt-disi.pdf' },
    { _id: 'y1', tur: 'yevmiye_pdf', dosyaAdi: 'yevmiye.pdf' }
  ];
  api.post.mockResolvedValue(yanit(kayit));
  uploadPost.mockResolvedValue(yanit({ ...kayit, kalemler: [eskiKalem, personelKalemi, { ...yeniKalem, evraklar }] }));
  const onay = jest.spyOn(window, 'confirm').mockReturnValue(true);
  belgeyiAc({ yerli: [], ithal: [ilkMakine] });
  fireEvent.click(await screen.findByText('İthal Liste (1)'));
  expect(screen.getByText(`2 kalem · ${para(100, 'EUR')} · ${para(75, 'USD')}`)).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Gör / Ekle' }));
  const eskiSatir = screen.getByRole('row', { name: /BY-ESKI/ });
  expect(within(eskiSatir).getByText(para(100, 'EUR'))).toBeInTheDocument();
  expect(within(screen.getByRole('row', { name: /BY-DANISMAN/ })).queryByRole('button', { name: 'Evrak Yükle' })).not.toBeInTheDocument();
  fireEvent.click(within(eskiSatir).getByRole('button', { name: 'Evrak Yükle' }));
  expect(screen.getByText('Beyanname Evrakları · BY-ESKI')).toBeInTheDocument();
  expect(screen.getByLabelText('Beyanname PDF')).toHaveAttribute('multiple');
  expect(screen.getByLabelText('Yurt Dışı Fatura PDF')).toHaveAttribute('multiple');
  expect(screen.getByLabelText('Yevmiye Kaydı PDF')).toHaveAttribute('multiple');
  expect(screen.queryByLabelText('Fatura PDF')).not.toBeInTheDocument();

  fireEvent.change(screen.getByLabelText(/Beyanname Tarihi/), { target: { value: '2026-11-05' } });
  fireEvent.change(screen.getByLabelText(/Beyanname No/), { target: { value: 'BY-YENI' } });
  fireEvent.change(screen.getByLabelText(/Kalem Tutarı – Mal Bedeli TL/), { target: { value: '1.250,75' } });
  fireEvent.change(screen.getByLabelText(/Adınız Soyadınız/), { target: { value: 'Test Yetkili' } });
  fireEvent.click(screen.getByRole('button', { name: 'Kaydet' }));
  expect(await screen.findByText('Beyanname Evrakları · BY-YENI')).toBeInTheDocument();
  expect(screen.queryByText('Beyanname Evrakları · BY-ESKI')).not.toBeInTheDocument();
  expect(onay).toHaveBeenCalledWith(expect.stringContaining(`Mal Bedeli TL: ${para(1250.75)}`));
  expect(api.post).toHaveBeenCalledWith('/musteri-belge/test-token/fatura-kalemi', expect.objectContaining({
    listType: 'import', rowId: 'I1', no: 'BY-YENI', tutar: 1250.75, tutarParaBirimi: 'TRY'
  }), expect.any(Object));
  expect(uploadPost).not.toHaveBeenCalled();
  expect(within(screen.getByRole('row', { name: /BY-YENI .*Onaylandı/ })).getByText(para(1250.75))).toBeInTheDocument();
  const toplamlar = `${para(1250.75)} · ${para(100, 'EUR')} · ${para(75, 'USD')}`;
  expect(within(screen.getByRole('dialog')).getByText(toplamlar)).toBeInTheDocument();

  dosyaSec('Beyanname PDF', [dosya('beyanname-1.pdf'), dosya('beyanname-2.pdf')]);
  dosyaSec('Yurt Dışı Fatura PDF', [dosya('yurt-disi.pdf')]);
  dosyaSec('Yevmiye Kaydı PDF', [dosya('yevmiye.pdf')]);
  fireEvent.click(screen.getByRole('button', { name: 'Dosyaları Yükle' }));
  expect(await screen.findByText('Evraklar yüklendi.')).toBeInTheDocument();
  const [url, form] = uploadPost.mock.calls[0];
  expect(url).toBe('/musteri-belge/test-token/fatura-kalemi/yeni/evrak');
  expect(form.get('rowId')).toBe('I1');
  expect(form.getAll('beyannamePdf').map((f) => f.name)).toEqual(['beyanname-1.pdf', 'beyanname-2.pdf']);
  expect(form.get('yurtdisiFaturaPdf').name).toBe('yurt-disi.pdf');
  expect(form.get('yevmiyePdf').name).toBe('yevmiye.pdf');
  expect(within(screen.getByRole('list', { name: 'Yurt Dışı Fatura PDF yüklenen dosyalar' })).getByText('yurt-disi.pdf')).toBeInTheDocument();
  fireEvent.click(screen.getAllByRole('button', { name: 'Kapat' }).at(-1));
  expect(screen.getByText(`3 kalem · ${toplamlar}`)).toBeInTheDocument();
});
