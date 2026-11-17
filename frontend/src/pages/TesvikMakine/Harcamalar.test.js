import React from 'react';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import Harcamalar from './Harcamalar';
import svc from '../../services/tesvikMakineService';

jest.mock('../../services/tesvikMakineService', () => ({
  harcamalariGetir: jest.fn(), harcamaEkle: jest.fn(), harcamaGuncelle: jest.fn(),
  harcamaSil: jest.fn(), harcamaEvrakiYukle: jest.fn(), harcamaEvrakiIndir: jest.fn(),
  musteriHarcamalariniGetir: jest.fn(), musteriHarcamaEkle: jest.fn()
}));

const kategoriler = { diger: { altKategoriler: [
  { id: 'montaj', etiket: 'Montaj Giderleri' }, { id: 'kurFarki', etiket: 'Kur Farkı Giderleri' }
] } };
const temel = { kategori: 'diger', altKategori: 'montaj', tarih: '2026-11-13T00:00:00.000Z', no: 'F-001', tutar: 1250.75, adet: 2 };
const ilk = { ...temel, _id: '1', evraklar: [] };
const harcamalariAc = (duzenlenebilir = true) => render(<Harcamalar tesvikModel="Tesvik" tesvikId="belge-1" kategori="diger"
  baslik="Diğer Harcamalar" duzenlenebilir={duzenlenebilir} />);
const turSec = (ad) => {
  fireEvent.mouseDown(screen.getByRole('combobox', { name: /Harcama Türü/ }));
  fireEvent.click(screen.getByRole('option', { name: ad }));
};

beforeEach(() => { jest.resetAllMocks(); });

test('tür seçildikten sonra girilen fatura kendi grubuna ve toplama eklenir; üç türden dosya yüklenebilir', async () => {
  const yeni = {
    ...temel, _id: '2', no: 'F-002', altKategori: 'kurFarki', tutar: 246.25, evraklar: [],
    yevmiyeNo: '00042', yevmiyeTarihi: '2026-11-17T00:00:00.000Z'
  };
  svc.harcamalariGetir.mockResolvedValue({ kategoriler, kalemler: [ilk] });
  svc.harcamaEkle.mockResolvedValue(yeni);
  const evraklar = [{ _id: 'ek-1', dosyaAdi: 'yeni-1.pdf', tur: 'fatura_pdf' }];
  svc.harcamaEvrakiYukle.mockResolvedValue({ ...yeni, evraklar });
  harcamalariAc();
  expect(await screen.findByText('F-001')).toBeInTheDocument();
  expect(screen.getByText('13.11.2026')).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Kalem Gir' }));
  expect(screen.queryByLabelText(/Fatura Tarihi/)).toBeNull();
  turSec('Kur Farkı Giderleri');
  fireEvent.change(screen.getByLabelText(/Fatura Tarihi/), { target: { value: '2026-11-13' } });
  fireEvent.change(screen.getByLabelText(/Fatura Sayısı/), { target: { value: 'F-002' } });
  fireEvent.change(screen.getByLabelText('Yevmiye No'), { target: { value: ' 00042 ' } });
  fireEvent.change(screen.getByLabelText('Yevmiye Tarihi'), { target: { value: '2026-11-17' } });
  fireEvent.change(screen.getByLabelText(/Kalem Tutarı/), { target: { value: '246,25' } });
  fireEvent.click(screen.getByRole('button', { name: 'Kaydet' }));

  const ekPenceresi = within(await screen.findByRole('dialog', { name: 'F-002 Evrakları' }));
  expect(svc.harcamaEkle).toHaveBeenCalledWith('Tesvik', 'belge-1', expect.objectContaining({
    kategori: 'diger', altKategori: 'kurFarki', tutar: 246.25, istekId: expect.any(String),
    yevmiyeNo: '00042', yevmiyeTarihi: '2026-11-17'
  }));
  for (const [etiket, uzanti] of [['Fatura PDF', 'pdf'], ['Fatura XML', 'xml'], ['Yevmiye Kayıt PDF', 'pdf']]) {
    const alan = ekPenceresi.getByLabelText(etiket);
    expect(alan).toHaveAttribute('multiple');
    fireEvent.change(alan, { target: { files: [1, 2].map((n) => new File(['sentetik'], `yeni-${n}.${uzanti}`)) } });
  }
  fireEvent.click(ekPenceresi.getByRole('button', { name: 'Dosyaları Yükle' }));
  expect(await ekPenceresi.findByRole('button', { name: 'yeni-1.pdf indir' })).toBeInTheDocument();
  const [model, belge, id, govde] = svc.harcamaEvrakiYukle.mock.calls[0];
  expect([model, belge, id]).toEqual(['Tesvik', 'belge-1', '2']);
  for (const alan of ['faturaPdf', 'faturaXml', 'yevmiyePdf']) expect(govde.getAll(alan)).toHaveLength(2);

  fireEvent.click(ekPenceresi.getByRole('button', { name: 'Kapat' }));
  await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
  expect(screen.getByRole('row', { name: /Genel Toplam/ })).toHaveTextContent('₺1.497,00');
  const grup = screen.getByRole('rowheader', { name: 'Kur Farkı Giderleri' }).closest('tbody');
  expect(within(grup).getByText('F-002')).toBeInTheDocument();
  expect(within(grup).getByText('00042')).toBeInTheDocument();
  expect(within(grup).getByText('17.11.2026')).toBeInTheDocument();
  expect(within(grup).queryByText('F-001')).toBeNull();
});

test.each([true, false])('personel düzenlemesinde sadece değiştirilen yevmiye alanları gönderilir (temizle: %s)', async (temizle) => {
  svc.harcamalariGetir.mockResolvedValue({ kategoriler, kalemler: [
    { ...ilk, yevmiyeNo: '00042', yevmiyeTarihi: '2026-11-17T00:00:00.000Z' }
  ] });
  svc.harcamaGuncelle.mockResolvedValue(ilk);
  harcamalariAc();
  fireEvent.click(await screen.findByRole('button', { name: 'F-001 düzenle' }));
  const no = screen.getByLabelText('Yevmiye No');
  const tarih = screen.getByLabelText('Yevmiye Tarihi');
  expect(no).toHaveValue('00042');
  expect(tarih).toHaveValue('2026-11-17');
  if (temizle) {
    fireEvent.change(no, { target: { value: '' } });
    fireEvent.change(tarih, { target: { value: '' } });
  } else {
    fireEvent.change(screen.getByLabelText('Kalem İçeriği'), { target: { value: 'Güncel açıklama' } });
  }
  fireEvent.click(screen.getByRole('button', { name: 'Kaydet' }));
  expect(await screen.findByRole('dialog', { name: 'F-001 Evrakları' })).toBeInTheDocument();
  const [model, belge, id, govde] = svc.harcamaGuncelle.mock.calls[0];
  expect([model, belge, id]).toEqual(['Tesvik', 'belge-1', '1']);
  if (temizle) {
    expect(govde).toMatchObject({ yevmiyeNo: '', yevmiyeTarihi: '' });
  } else {
    expect(govde).not.toHaveProperty('yevmiyeNo');
    expect(govde).not.toHaveProperty('yevmiyeTarihi');
  }
});

test('müşteri yevmiye bilgisiyle harcama ekler ve kayıt için düzenleme veya silme düğmesi görmez', async () => {
  svc.musteriHarcamalariniGetir.mockResolvedValue({ kategoriler, kalemler: [] });
  svc.musteriHarcamaEkle.mockResolvedValue({
    ...ilk, yevmiyeNo: '00042', yevmiyeTarihi: '2026-11-17T00:00:00.000Z', evrakEklenebilir: true
  });
  render(<Harcamalar musteriToken="musteri-linki" kategori="diger" baslik="Diğer Harcamalar" />);
  await waitFor(() => expect(screen.getByRole('button', { name: 'Kalem Gir' })).toBeEnabled());
  fireEvent.click(screen.getByRole('button', { name: 'Kalem Gir' }));
  turSec('Montaj Giderleri');
  fireEvent.change(screen.getByLabelText(/Fatura Tarihi/), { target: { value: '2026-11-13' } });
  fireEvent.change(screen.getByLabelText(/Fatura Sayısı/), { target: { value: 'F-001' } });
  fireEvent.change(screen.getByLabelText('Yevmiye No'), { target: { value: '00042' } });
  fireEvent.change(screen.getByLabelText('Yevmiye Tarihi'), { target: { value: '2026-11-17' } });
  fireEvent.change(screen.getByLabelText(/Kalem Tutarı/), { target: { value: '1250,75' } });
  fireEvent.change(screen.getByLabelText(/Adınız Soyadınız/), { target: { value: 'Test Kullanıcısı' } });
  fireEvent.click(screen.getByRole('button', { name: 'Kaydet' }));
  const ekPenceresi = within(await screen.findByRole('dialog', { name: 'F-001 Evrakları' }));
  expect(svc.musteriHarcamaEkle).toHaveBeenCalledWith('musteri-linki', expect.objectContaining({
    yevmiyeNo: '00042', yevmiyeTarihi: '2026-11-17'
  }), expect.objectContaining({ signal: expect.anything() }));
  fireEvent.click(ekPenceresi.getByRole('button', { name: 'Kapat' }));
  await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
  expect(screen.getByText('00042')).toBeInTheDocument();
  expect(screen.getByText('17.11.2026')).toBeInTheDocument();
  expect(screen.queryByRole('button', { name: 'F-001 düzenle' })).toBeNull();
  expect(screen.queryByRole('button', { name: 'F-001 sil' })).toBeNull();
});

test('salt okunur kullanıcı kayıtlı evrakları görür, ekleme ve düzenleme yapamaz', async () => {
  const ek = { _id: 'ek-1', dosyaAdi: 'fatura.pdf', tur: 'fatura_pdf' };
  svc.harcamalariGetir.mockResolvedValue({ kategoriler, kalemler: [{ ...ilk, evraklar: [ek] }] });
  harcamalariAc(false);
  fireEvent.click(await screen.findByRole('button', { name: 'F-001 evrakları' }));
  expect(screen.getByRole('button', { name: 'fatura.pdf' })).toBeInTheDocument();
  expect(screen.queryByLabelText('Fatura PDF')).toBeNull();
  expect(screen.queryByRole('button', { name: 'Kalem Gir' })).toBeNull();
  expect(screen.queryByRole('button', { name: 'F-001 düzenle' })).toBeNull();
});
