import React from 'react';
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import MusteriBelgeSayfasi from './MusteriBelgeSayfasi';
import api, { uploadPost } from '../../utils/axios';
import * as helpers from '../TesvikMakine/helpers';

jest.mock('../../utils/axios', () => ({ __esModule: true,
  default: { get: jest.fn(), post: jest.fn(), patch: jest.fn(), delete: jest.fn() }, uploadPost: jest.fn() }));

beforeEach(() => {
  jest.resetAllMocks();
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
const belgeyiAc = (makineler, makineListeleri = { yerli: [], ithal: [] }) => {
  api.get.mockResolvedValue(yanit({ tur: 'eski', belge: { yatirimciUnvan: 'TEST FİRMA', belgeYonetimi: { belgeNo: '123' }, makineListeleri }, etiketler: {}, makineler }));
  return render(<MemoryRouter initialEntries={['/belge/test-token']} future={{ v7_startTransition: true, v7_relativeSplatPath: true }}><Routes>
    <Route path="/belge/:token" element={<MusteriBelgeSayfasi />} />
  </Routes></MemoryRouter>);
};
const dosyaSec = (etiket, files) => fireEvent.change(screen.getByLabelText(etiket), { target: { files } });

test('müşteri belge düzenindeki onaylı listeleri salt okunur, gerçekleşen listeleri ayrı görür', async () => {
  belgeyiAc({ yerli: [makine('Y1', 'local')], ithal: [makine('I1', 'import', [kalem('b1', 'BEYAN-1')])] }, {
    yerli: [{ rowId: 'Y1', siraNo: 1, makineId: 'MAK-1', adiVeOzelligi: 'Onaylı Yerli Makine', miktar: 2, birim: '142', birimFiyatiTl: 123.45, toplamTutariTl: 246.9 }],
    ithal: [{ rowId: 'I1', siraNo: 1, makineId: 'MAK-2', adiVeOzelligi: 'Onaylı İthal Makine', miktar: 1, birim: '142', gtipKodu: '8477.80', birimFiyatiFob: 180, gumrukDovizKodu: 'EUR', toplamTutarFobUsd: 200, kullanilmisMakine: '3' }]
  });
  const tabs = await screen.findAllByRole('tab');
  expect(tabs.map((tab) => tab.textContent)).toEqual([
    'Belge Künye Bilgileri', 'Yatırım Cinsi', 'Ürün Bilgileri', 'Onaylı Yerli Liste (1)', 'Onaylı İthal Liste (1)',
    'Finansal Bilgiler', 'Özel Şartlar', 'Destek Unsurları', 'Gerçekleşen Yerli Liste', 'Gerçekleşen İthal Liste',
    'Diğer Harcamalar', 'Bina İnşaat Harcamaları', 'Arazi-Arsa Harcamaları', 'Gerçekleşme Özeti'
  ]);

  fireEvent.click(screen.getByRole('tab', { name: 'Onaylı Yerli Liste (1)' }));
  expect(screen.getByRole('columnheader', { name: 'Birim' })).toBeInTheDocument();
  expect(screen.getByRole('row', { name: /MAK-1 Onaylı Yerli Makine.*ADET.*123,45 TL.*246,9 TL/ })).toBeInTheDocument();
  expect(screen.queryByRole('button', { name: /Kalem Gir|Gör \/ Ekle/ })).not.toBeInTheDocument();

  fireEvent.click(screen.getByRole('tab', { name: 'Onaylı İthal Liste (1)' }));
  expect(screen.getByRole('columnheader', { name: 'Kullanılmış' })).toBeInTheDocument();
  expect(screen.getByRole('row', { name: /8477.80 Onaylı İthal Makine.*180 EUR.*200 USD.*KULLANILMIŞ MÜNFERİT/ })).toBeInTheDocument();
  expect(screen.queryByText('BEYAN-1')).not.toBeInTheDocument();
  expect(screen.queryByRole('button', { name: /Kalem Gir|Gör \/ Ekle/ })).not.toBeInTheDocument();

  fireEvent.click(screen.getByRole('tab', { name: 'Gerçekleşen İthal Liste' }));
  fireEvent.click(screen.getByRole('button', { name: 'Gör / Ekle' }));
  const pencere = within(screen.getByRole('dialog', { name: 'Beyanname Kalemleri' }));
  expect(pencere.getByText('BEYAN-1')).toBeInTheDocument();
  expect(pencere.getByRole('button', { name: 'BEYAN-1 düzenle' })).toBeEnabled();
  expect(pencere.getByRole('button', { name: 'BEYAN-1 sil' })).toBeEnabled();
  expect(api.get).toHaveBeenCalledTimes(1);
});

test('müşteri üç harcama sekmesinden kayıt ve evrak ekler, özet güncel TL toplamını gösterir', async () => {
  const kategoriler = {
    diger: { altKategoriler: [{ id: 'montaj', etiket: 'Montaj Giderleri' }] },
    bina: { altKategoriler: [{ id: 'anaBina', etiket: 'Ana Bina' }] },
    arazi: { altKategoriler: [{ id: 'arazi', etiket: 'Arazi' }] }
  };
  const personel = { ...kalem('personel-1', 'PERSONEL-1', 'personel'), kategori: 'diger', altKategori: 'montaj', evrakEklenebilir: false };
  const yeni = { ...kalem('yeni-1', 'GIDER-1'), kategori: 'diger', altKategori: 'montaj', tutar: 1200.25, evrakEklenebilir: true };
  api.post.mockResolvedValueOnce(yanit(yeni));
  uploadPost.mockResolvedValueOnce(yanit({ ...yeni, evraklar: [{ _id: 'd1', tur: 'fatura_pdf', dosyaAdi: 'gider.pdf' }] }));

  belgeyiAc({ yerli: [], ithal: [] });
  const sekmeAdlari = ['Diğer Harcamalar', 'Bina İnşaat Harcamaları', 'Arazi-Arsa Harcamaları', 'Gerçekleşme Özeti'];
  const sekmeler = await screen.findAllByRole('tab');
  const sirasi = sekmeler.findIndex((sekme) => sekme.textContent === 'Özel Şartlar');
  expect(sekmeler.slice(sirasi + 1).map((sekme) => sekme.textContent)).toEqual([
    'Destek Unsurları', 'Gerçekleşen Yerli Liste', 'Gerçekleşen İthal Liste', ...sekmeAdlari
  ]);
  for (const ad of sekmeAdlari.slice(0, 3).reverse()) {
    api.get.mockResolvedValueOnce(yanit({ kategoriler, kalemler: [personel] }));
    fireEvent.click(screen.getByRole('tab', { name: ad }));
    expect(await screen.findByRole('region', { name: ad })).toBeInTheDocument();
    await waitFor(() => expect(screen.getByRole('button', { name: 'Kalem Gir' })).toBeEnabled());
  }
  const liste = screen.getByRole('region', { name: 'Diğer Harcamalar' });
  expect(screen.getByText('PERSONEL-1')).toBeInTheDocument();
  for (const islem of ['düzenle', 'sil', 'evrakları']) {
    expect(within(liste).getByRole('button', { name: `PERSONEL-1 ${islem}` })).toBeEnabled();
  }

  fireEvent.click(within(liste).getByRole('button', { name: 'Kalem Gir' }));
  fireEvent.mouseDown(screen.getByRole('combobox', { name: /Harcama Türü/ }));
  fireEvent.click(screen.getByRole('option', { name: 'Montaj Giderleri' }));
  fireEvent.change(screen.getByLabelText(/Fatura Tarihi/), { target: { value: '2026-11-05' } });
  fireEvent.change(screen.getByLabelText(/Fatura Sayısı/), { target: { value: 'GIDER-1' } });
  fireEvent.change(screen.getByLabelText(/Kalem Tutarı/), { target: { value: '1.200,25' } });
  expect(screen.getByRole('button', { name: 'Kaydet' })).toBeDisabled();
  fireEvent.change(screen.getByLabelText(/Adınız Soyadınız/), { target: { value: 'Test Yetkili' } });
  fireEvent.click(screen.getByRole('button', { name: 'Kaydet' }));
  const evrak = within(await screen.findByRole('dialog', { name: 'GIDER-1 Evrakları' }));
  expect(api.post).toHaveBeenCalledWith('/musteri-belge/test-token/harcamalar', expect.objectContaining({
    kategori: 'diger', altKategori: 'montaj', tutar: 1200.25, giren: 'Test Yetkili', istekId: expect.any(String)
  }), expect.objectContaining({ signal: expect.any(AbortSignal) }));

  expect(evrak.getByLabelText('Fatura PDF')).toHaveAttribute('multiple');
  dosyaSec('Fatura PDF', [dosya('gider.pdf'), dosya('ikinci.pdf')]);
  dosyaSec('Fatura XML', [dosya('gider.xml', 'application/xml')]);
  dosyaSec('Yevmiye Kayıt PDF', [dosya('yevmiye.pdf')]);
  fireEvent.click(evrak.getByRole('button', { name: 'Dosyaları Yükle' }));
  expect(await evrak.findByText('Evraklar yüklendi.')).toBeInTheDocument();
  const [yol, govde] = uploadPost.mock.calls[0];
  expect(yol).toBe('/musteri-belge/test-token/harcamalar/yeni-1/evrak');
  expect(govde.getAll('faturaPdf')).toHaveLength(2);
  expect(govde.get('faturaXml').name).toBe('gider.xml');
  expect(govde.get('yevmiyePdf').name).toBe('yevmiye.pdf');
  expect(evrak.getByRole('button', { name: 'gider.pdf indir' })).toBeEnabled();
  expect(evrak.getByRole('button', { name: 'gider.pdf sil' })).toBeEnabled();
  fireEvent.click(evrak.getByRole('button', { name: 'Kapat' }));
  await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
  expect(within(liste).getByRole('button', { name: 'GIDER-1 düzenle' })).toBeEnabled();
  expect(within(liste).getByRole('button', { name: 'GIDER-1 sil' })).toBeEnabled();

  api.get.mockResolvedValueOnce(yanit({ gruplar: [], yerli: 100, ithal: 150, kurFarki: 0, toplam: 1450.25 }));
  fireEvent.click(screen.getByRole('tab', { name: 'Gerçekleşme Özeti' }));
  const ozet = await screen.findByRole('table', { name: 'Gerçekleşme özeti' });
  expect(within(ozet).getByText(para(1450.25))).toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Tüm Gerçekleşme Listesi' })).toBeEnabled();
  expect(api.get).toHaveBeenLastCalledWith('/musteri-belge/test-token/gerceklesme', expect.objectContaining({ signal: expect.any(AbortSignal) }));
  expect(api.get.mock.calls.every(([adres]) => adres.startsWith('/musteri-belge/test-token'))).toBe(true);
});

test('müşteri ithal makinede birim etiketini, EUR birim fiyatını ve USD FOB toplamını görür', async () => {
  belgeyiAc({ yerli: [], ithal: [{
    ...makine('I1', 'import'), birim: '142', birimFiyat: 165000, birimParaBirimi: 'EUR', toplam: 179000, paraBirimi: 'USD'
  }] });
  fireEvent.click(await screen.findByRole('tab', { name: 'Gerçekleşen İthal Liste' }));
  expect(screen.getByText('1 ADET')).toBeInTheDocument();
  expect(screen.getByText(para(165000, 'EUR'))).toBeInTheDocument();
  expect(screen.getByText(para(179000, 'USD'))).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Kalem Gir' }));
  expect(within(screen.getByRole('dialog')).getByText(`1 ADET · Birim: ${para(165000, 'EUR')} · FOB Toplam: ${para(179000, 'USD')}`)).toBeInTheDocument();
});

test('ithal beyanname toplamı sıfır olduğunda TL gösterilir', async () => {
  const kayit = { ...kalem('b1', 'BY-001', 'personel'), tutar: 0, tutarParaBirimi: 'TRY' };
  belgeyiAc({ yerli: [], ithal: [{ ...makine('I1', 'import', [kayit]), faturaToplami: 0, faturaTutarToplamlari: {} }] });
  fireEvent.click(await screen.findByRole('tab', { name: 'Gerçekleşen İthal Liste' }));
  expect(screen.getByText(`1 kalem · ${para(0)}`)).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Gör / Ekle' }));
  expect(within(screen.getByRole('row', { name: /Toplam/ })).getByText(para(0))).toBeInTheDocument();
});

test.each([
  ['local', 'firma'], ['local', 'personel'], ['import', 'firma'], ['import', 'personel']
])('müşteri %s listesindeki %s kaleminin tutar ve yevmiyesini değiştirir ve siler', async (listType, kaynak) => {
  const rowId = listType === 'import' ? 'I1' : 'Y1';
  const ilk = { ...kalem('kayit-1', 'KAYIT-001', kaynak), tutarParaBirimi: 'TRY', yevmiyeNo: '00012', yevmiyeTarihi: '2026-11-05' };
  const guncelKalem = { ...ilk, tutar: 2345.5, yevmiyeNo: '00029', yevmiyeTarihi: '2026-11-19' };
  const guncelMakine = { ...makine(rowId, listType, [guncelKalem]), faturaTutarToplamlari: { TRY: 2345.5 } };
  api.patch.mockRejectedValueOnce({ response: { data: { message: 'Bağlantı yenilendi. Tekrar deneyin.' } } })
    .mockResolvedValueOnce(yanit(guncelMakine));
  api.delete.mockResolvedValueOnce(yanit(makine(rowId, listType)));
  jest.spyOn(window, 'confirm').mockReturnValue(true);
  belgeyiAc({ yerli: listType === 'local' ? [makine(rowId, listType, [ilk])] : [],
    ithal: listType === 'import' ? [makine(rowId, listType, [ilk])] : [] });
  fireEvent.click(await screen.findByRole('tab', { name: listType === 'import' ? 'Gerçekleşen İthal Liste' : 'Gerçekleşen Yerli Liste' }));
  fireEvent.click(screen.getByRole('button', { name: 'Gör / Ekle' }));
  fireEvent.click(screen.getByRole('button', { name: 'KAYIT-001 düzenle' }));
  expect(screen.getByLabelText('Yevmiye No')).toHaveValue('00012');
  fireEvent.change(screen.getByLabelText(/Kalem Tutarı/), { target: { value: '2.345,50' } });
  fireEvent.change(screen.getByLabelText('Yevmiye No'), { target: { value: '00029' } });
  fireEvent.change(screen.getByLabelText('Yevmiye Tarihi'), { target: { value: '2026-11-19' } });
  fireEvent.change(screen.getByLabelText(/Adınız Soyadınız/), { target: { value: 'Firma Yetkilisi' } });
  fireEvent.click(screen.getByRole('button', { name: 'Güncelle' }));
  expect(await screen.findByText('Bağlantı yenilendi. Tekrar deneyin.')).toBeInTheDocument();
  expect(screen.getByLabelText('Yevmiye No')).toHaveValue('00029');
  expect(screen.getByRole('row', { name: /KAYIT-001 00012/ })).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Güncelle' }));
  expect(await screen.findByText('Kalem güncellendi.')).toBeInTheDocument();
  expect(api.patch).toHaveBeenLastCalledWith('/musteri-belge/test-token/fatura-kalemi/kayit-1', expect.objectContaining({
    rowId, listType, no: 'KAYIT-001', tutar: 2345.5, tutarParaBirimi: 'TRY',
    yevmiyeNo: '00029', yevmiyeTarihi: '2026-11-19', giren: 'Firma Yetkilisi'
  }), expect.objectContaining({ signal: expect.any(AbortSignal) }));
  const satir = within(screen.getByRole('row', { name: /KAYIT-001 00029/ }));
  expect(satir.getByRole('cell', { name: '19.11.2026' })).toBeInTheDocument();
  expect(satir.getByText(para(2345.5))).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'KAYIT-001 sil' }));
  expect(await screen.findByText('Kalem silindi.')).toBeInTheDocument();
  expect(api.delete).toHaveBeenLastCalledWith('/musteri-belge/test-token/fatura-kalemi/kayit-1', expect.objectContaining({
    data: { rowId, listType, giren: 'Firma Yetkilisi' }, signal: expect.any(AbortSignal)
  }));
  expect(screen.queryByRole('row', { name: /KAYIT-001/ })).not.toBeInTheDocument();
  expect(api.patch.mock.calls.every(([adres]) => adres.startsWith('/musteri-belge/test-token/'))).toBe(true);
  expect(api.delete.mock.calls.every(([adres]) => adres.startsWith('/musteri-belge/test-token/'))).toBe(true);
});

test('müşteri eski dövizli beyannameyi düzenlerken döviz ve dokunulmayan yevmiye bilgisi korunur', async () => {
  const eski = { ...kalem('doviz-1', 'BY-EUR', 'personel'), tutarParaBirimi: 'EUR', malBedeliTl: 12000,
    yevmiyeNo: '00018', yevmiyeTarihi: '2026-11-05' };
  const guncel = { ...makine('I1', 'import', [{ ...eski, tutar: 125.25, malBedeliTl: 14000 }]),
    faturaTutarToplamlari: { EUR: 125.25, TRY: 14000 } };
  api.patch.mockResolvedValueOnce(yanit(guncel));
  jest.spyOn(window, 'confirm').mockReturnValue(true);
  belgeyiAc({ yerli: [], ithal: [makine('I1', 'import', [eski])] });
  fireEvent.click(await screen.findByRole('tab', { name: 'Gerçekleşen İthal Liste' }));
  fireEvent.click(screen.getByRole('button', { name: 'Gör / Ekle' }));
  fireEvent.click(screen.getByRole('button', { name: 'BY-EUR düzenle' }));
  fireEvent.change(screen.getByLabelText(/Kalem Tutarı – Mal Bedeli \(EUR\)/), { target: { value: '125,25' } });
  fireEvent.change(screen.getByLabelText('Mal Bedeli TL'), { target: { value: '14.000' } });
  fireEvent.change(screen.getByLabelText(/Adınız Soyadınız/), { target: { value: 'Firma Yetkilisi' } });
  fireEvent.click(screen.getByRole('button', { name: 'Güncelle' }));
  expect(await screen.findByText('Kalem güncellendi.')).toBeInTheDocument();
  const [, govde] = api.patch.mock.calls[0];
  expect(govde).toMatchObject({ tutar: 125.25, malBedeliTl: 14000 });
  expect(govde).not.toHaveProperty('tutarParaBirimi');
  expect(govde).not.toHaveProperty('yevmiyeNo');
  expect(govde).not.toHaveProperty('yevmiyeTarihi');
  expect(within(screen.getByRole('row', { name: /BY-EUR 00018/ })).getByText(para(125.25, 'EUR'))).toBeInTheDocument();
});

test('müşteri danışman faturasına ait evrakı yalnız belge ve makine kapsamındaki uçtan indirir ve siler', async () => {
  const evrak = { _id: 'evrak-1', dosyaAdi: 'yanlis.pdf', tur: 'fatura_pdf' };
  const ilk = makine('Y1', 'local', [kalem('kalem-1', 'FT-EVRAK', 'personel', [evrak])]);
  api.delete.mockResolvedValueOnce(yanit({ ...ilk, kalemler: [{ ...ilk.kalemler[0], evraklar: [] }] }));
  jest.spyOn(window, 'confirm').mockReturnValue(true);
  belgeyiAc({ yerli: [ilk], ithal: [] });
  fireEvent.click(await screen.findByRole('tab', { name: 'Gerçekleşen Yerli Liste' }));
  fireEvent.click(screen.getByRole('button', { name: 'Gör / Ekle' }));
  fireEvent.click(screen.getByRole('button', { name: 'Evraklar (1)' }));
  const indir = jest.spyOn(helpers, 'saveBlobResponse').mockImplementation(() => {});
  const dosyaYaniti = { data: new Blob(['dosya'], { type: 'application/pdf' }) };
  api.get.mockResolvedValueOnce(dosyaYaniti);
  fireEvent.click(screen.getByRole('button', { name: 'yanlis.pdf indir' }));
  await waitFor(() => expect(indir).toHaveBeenCalledWith(dosyaYaniti, 'yanlis.pdf'));
  expect(api.get).toHaveBeenLastCalledWith('/musteri-belge/test-token/fatura-kalemi/kalem-1/evrak/evrak-1', expect.objectContaining({
    params: { rowId: 'Y1', listType: 'local' }, signal: expect.any(AbortSignal), responseType: 'blob'
  }));
  fireEvent.click(screen.getByRole('button', { name: 'yanlis.pdf sil' }));
  expect(await screen.findByText('Evrak silindi.')).toBeInTheDocument();
  expect(api.delete).toHaveBeenCalledWith('/musteri-belge/test-token/fatura-kalemi/kalem-1/evrak/evrak-1', expect.objectContaining({
    params: { rowId: 'Y1', listType: 'local' }, signal: expect.any(AbortSignal)
  }));
  expect(screen.queryByRole('button', { name: 'yanlis.pdf sil' })).not.toBeInTheDocument();
});

test('yerli fatura evraksız kaydedilir ve yalnız dönen yeni kaleme PDF, XML ve yevmiye eklenir', async () => {
  const ilkMakine = makine('Y1', 'local');
  const yeniKalem = { ...kalem('hedef', 'FT-001'), yevmiyeNo: '000032', yevmiyeTarihi: '2026-11-12T00:00:00.000Z' };
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
  const onay = jest.spyOn(window, 'confirm').mockReturnValue(true);
  belgeyiAc({ yerli: [ilkMakine], ithal: [] });
  fireEvent.click(await screen.findByRole('tab', { name: 'Gerçekleşen Yerli Liste' }));
  fireEvent.click(screen.getByRole('button', { name: 'Kalem Gir' }));
  expect(screen.queryByLabelText('Fatura PDF')).not.toBeInTheDocument();
  fireEvent.change(screen.getByLabelText(/Fatura Tarihi/), { target: { value: '2026-11-05' } });
  fireEvent.change(screen.getByLabelText(/Fatura Sayısı/), { target: { value: 'FT-001' } });
  const yevmiyeNo = screen.getByLabelText('Yevmiye No');
  expect(yevmiyeNo).toHaveAttribute('maxlength', '100');
  expect(yevmiyeNo).not.toBeRequired();
  fireEvent.change(yevmiyeNo, { target: { value: '000032' } });
  fireEvent.change(screen.getByLabelText('Yevmiye Tarihi'), { target: { value: '2026-11-12' } });
  fireEvent.change(screen.getByLabelText(/Kalem Tutarı/), { target: { value: '100' } });
  fireEvent.change(screen.getByLabelText(/Adınız Soyadınız/), { target: { value: 'Test Yetkili' } });
  fireEvent.click(screen.getByRole('button', { name: 'Kaydet' }));

  expect(await screen.findByText('Fatura Evrakları · FT-001')).toBeInTheDocument();
  expect(screen.queryByText('Fatura Evrakları · FT-002')).not.toBeInTheDocument();
  expect(onay).toHaveBeenCalledWith(expect.stringContaining('Yevmiye No: 000032\nYevmiye Tarihi: 12.11.2026'));
  expect(api.post).toHaveBeenCalledWith('/musteri-belge/test-token/fatura-kalemi', expect.objectContaining({
    no: 'FT-001', rowId: 'Y1', yevmiyeNo: '000032', yevmiyeTarihi: '2026-11-12'
  }), expect.any(Object));
  const yeniSatir = within(screen.getByRole('row', { name: /FT-001 000032/ }));
  expect(yeniSatir.getByRole('cell', { name: '000032' })).toBeInTheDocument();
  expect(yeniSatir.getByRole('cell', { name: '12.11.2026' })).toBeInTheDocument();
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
  fireEvent.click(await screen.findByRole('tab', { name: 'Gerçekleşen Yerli Liste' }));
  fireEvent.click(screen.getByRole('button', { name: 'Gör / Ekle' }));
  expect(screen.getAllByRole('button', { name: 'Evrak Yükle' })).toHaveLength(2);
  fireEvent.click(within(screen.getByRole('row', { name: /FT-001/ })).getByRole('button', { name: 'Evrak Yükle' }));

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
  fireEvent.click(await screen.findByRole('tab', { name: 'Gerçekleşen Yerli Liste' }));
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
  const yeniKalem = { ...kalem('yeni', 'BY-YENI'), tutar: 1250.75, tutarParaBirimi: 'TRY', yevmiyeNo: '000055' };
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
  fireEvent.click(await screen.findByRole('tab', { name: 'Gerçekleşen İthal Liste' }));
  expect(screen.getByText(`2 kalem · ${para(100, 'EUR')} · ${para(75, 'USD')}`)).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Gör / Ekle' }));
  const eskiSatir = screen.getByRole('row', { name: /BY-ESKI/ });
  expect(within(eskiSatir).getByText(para(100, 'EUR'))).toBeInTheDocument();
  expect(within(screen.getByRole('row', { name: /BY-DANISMAN/ })).getByRole('button', { name: 'Evrak Yükle' })).toBeEnabled();
  fireEvent.click(within(eskiSatir).getByRole('button', { name: 'Evrak Yükle' }));
  expect(screen.getByText('Beyanname Evrakları · BY-ESKI')).toBeInTheDocument();
  expect(screen.getByLabelText('Beyanname PDF')).toHaveAttribute('multiple');
  expect(screen.getByLabelText('Yurt Dışı Fatura PDF')).toHaveAttribute('multiple');
  expect(screen.getByLabelText('Yevmiye Kaydı PDF')).toHaveAttribute('multiple');
  expect(screen.queryByLabelText('Fatura PDF')).not.toBeInTheDocument();

  fireEvent.change(screen.getByLabelText(/Beyanname Tarihi/), { target: { value: '2026-11-05' } });
  fireEvent.change(screen.getByLabelText(/Beyanname No/), { target: { value: 'BY-YENI' } });
  fireEvent.change(screen.getByLabelText('Yevmiye No'), { target: { value: '000055' } });
  fireEvent.change(screen.getByLabelText(/Kalem Tutarı – Mal Bedeli TL/), { target: { value: '1.250,75' } });
  fireEvent.change(screen.getByLabelText(/Adınız Soyadınız/), { target: { value: 'Test Yetkili' } });
  fireEvent.click(screen.getByRole('button', { name: 'Kaydet' }));
  expect(await screen.findByText('Beyanname Evrakları · BY-YENI')).toBeInTheDocument();
  expect(screen.queryByText('Beyanname Evrakları · BY-ESKI')).not.toBeInTheDocument();
  expect(onay).toHaveBeenCalledWith(expect.stringContaining(`Mal Bedeli TL: ${para(1250.75)}`));
  expect(api.post).toHaveBeenCalledWith('/musteri-belge/test-token/fatura-kalemi', expect.objectContaining({
    listType: 'import', rowId: 'I1', no: 'BY-YENI', tutar: 1250.75, tutarParaBirimi: 'TRY',
    yevmiyeNo: '000055', yevmiyeTarihi: null
  }), expect.any(Object));
  expect(uploadPost).not.toHaveBeenCalled();
  expect(within(screen.getByRole('row', { name: /BY-YENI .*Firma/ })).getByText(para(1250.75))).toBeInTheDocument();
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
