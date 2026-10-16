import React, { act } from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import MusteriLinkiDugmesi from './MusteriLinkiDugmesi';
import api from '../../utils/axios';

jest.mock('../../utils/axios', () => ({ get: jest.fn(), post: jest.fn(), delete: jest.fn() }));
const bilgi = { link: 'https://ornek.test/belge/gecerli-link', surum: 'a'.repeat(64) };
const cevap = (data) => ({ data: { success: true, data } });
const ac = () => fireEvent.click(screen.getByRole('button', { name: 'Müşteri Linki' }));
const kur = () => render(<MusteriLinkiDugmesi tesvikModel="Tesvik" tesvikId="belge-1" />);
const ertelenen = () => {
  let resolve;
  const promise = new Promise((r) => { resolve = r; });
  return { promise, resolve };
};

beforeEach(() => jest.resetAllMocks());

test('soğuk sunucunun geçici okuma hatası bir kez tekrar edilir; mevcut link korunur, POST yapılmaz', async () => {
  api.get.mockRejectedValueOnce({ code: 'ECONNABORTED' }).mockResolvedValueOnce(cevap(bilgi));
  kur(); ac();
  expect(await screen.findByDisplayValue(bilgi.link, {}, { timeout: 2000 })).toBeInTheDocument();
  expect(api.get).toHaveBeenCalledTimes(2);
  expect(api.get).toHaveBeenCalledWith('/musteri-belge/yonetim/Tesvik/belge-1', expect.objectContaining({ timeout: 60000 }));
  expect(api.post).not.toHaveBeenCalled();
});

test('ağ hatası anlaşılır görünür; üretim kapalıdır ve tekrar dene yalnız okur', async () => {
  api.get.mockRejectedValue({ code: 'ERR_NETWORK' });
  kur(); ac();
  expect(await screen.findByText(/Sunucuya ulaşılamadı/, {}, { timeout: 2000 })).toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Link Üret' })).toBeDisabled();
  api.get.mockResolvedValueOnce(cevap(bilgi));
  fireEvent.click(screen.getByRole('button', { name: 'Tekrar Dene' }));
  expect(await screen.findByDisplayValue(bilgi.link)).toBeInTheDocument();
  expect(api.post).not.toHaveBeenCalled();
});

test('oturum hatası yeniden sorgulanmaz ve kullanıcı mesajı gösterilir', async () => {
  api.get.mockRejectedValueOnce({ response: { status: 401 }, kullaniciMesaji: 'Oturum süresi doldu. Yeniden giriş yapın.' });
  kur(); ac();
  expect(await screen.findByText('Oturum süresi doldu. Yeniden giriş yapın.')).toBeInTheDocument();
  expect(api.get).toHaveBeenCalledTimes(1);
});

test('yenileme yanıtı kaybolursa aynı işlem kimliği ve görülen sürümle tekrar edilir', async () => {
  api.get.mockResolvedValueOnce(cevap(bilgi));
  api.post.mockRejectedValueOnce({ code: 'ECONNABORTED' }).mockResolvedValueOnce(cevap({ ...bilgi, link: `${bilgi.link}-yeni` }));
  const onay = jest.spyOn(window, 'confirm').mockReturnValue(true);
  kur(); ac();
  await screen.findByDisplayValue(bilgi.link);
  fireEvent.click(screen.getByRole('button', { name: 'Yeni Link Üret' }));
  expect(await screen.findByText(/İşlem tamamlanmış olabilir/)).toBeInTheDocument();
  expect(api.post).toHaveBeenCalledTimes(1);
  const ilkGovde = api.post.mock.calls[0][1];
  expect(ilkGovde).toMatchObject({ yenile: true, beklenenSurum: bilgi.surum, istekId: expect.any(String) });
  fireEvent.click(screen.getByRole('button', { name: 'Tekrar Dene' }));
  await screen.findByDisplayValue(`${bilgi.link}-yeni`);
  expect(api.post.mock.calls[1][1]).toEqual(ilkGovde);
  onay.mockRestore();
});

test('kapanmış pencerenin geç yanıtı yeniden açılan pencereyi değiştirmez', async () => {
  const eski = ertelenen();
  api.get.mockReturnValueOnce(eski.promise).mockResolvedValueOnce(cevap(bilgi));
  kur(); ac();
  const sinyal = api.get.mock.calls[0][1].signal;
  fireEvent.click(screen.getByRole('button', { name: 'Kapat', exact: true }));
  expect(sinyal.aborted).toBe(true);
  await screen.findByRole('button', { name: 'Müşteri Linki' });
  ac();
  await screen.findByDisplayValue(bilgi.link);
  await act(async () => eski.resolve(cevap({ ...bilgi, link: `${bilgi.link}-eski` })));
  expect(screen.getByDisplayValue(bilgi.link)).toBeInTheDocument();
  expect(screen.queryByDisplayValue(`${bilgi.link}-eski`)).not.toBeInTheDocument();
});

test('belge değişince önceki istek iptal edilir ve eski link yeni belgeye taşınmaz', async () => {
  const eski = ertelenen();
  api.get.mockReturnValueOnce(eski.promise).mockResolvedValueOnce(cevap(bilgi));
  const { rerender } = kur(); ac();
  const sinyal = api.get.mock.calls[0][1].signal;
  rerender(<MusteriLinkiDugmesi tesvikModel="YeniTesvik" tesvikId="belge-2" />);
  expect(sinyal.aborted).toBe(true);
  await act(async () => eski.resolve(cevap({ ...bilgi, link: `${bilgi.link}-eski` })));
  await screen.findByRole('button', { name: 'Müşteri Linki' });
  ac();
  await screen.findByDisplayValue(bilgi.link);
  expect(api.get.mock.calls[1][0]).toBe('/musteri-belge/yonetim/YeniTesvik/belge-2');
  expect(screen.queryByDisplayValue(`${bilgi.link}-eski`)).not.toBeInTheDocument();
});

test('kapatma yanıtı kaybolursa tekrar düğmesi yalnız durumu okur, ikinci silme göndermez', async () => {
  api.get.mockResolvedValueOnce(cevap(bilgi)).mockResolvedValueOnce(cevap(null));
  api.delete.mockRejectedValueOnce({ code: 'ERR_NETWORK' });
  const onay = jest.spyOn(window, 'confirm').mockReturnValue(true);
  kur(); ac();
  await screen.findByDisplayValue(bilgi.link);
  fireEvent.click(screen.getByRole('button', { name: 'Linki Kapat' }));
  await screen.findByText(/İşlem tamamlanmış olabilir/);
  fireEvent.click(screen.getByRole('button', { name: 'Tekrar Dene' }));
  expect(await screen.findByText(/henüz link üretilmedi/)).toBeInTheDocument();
  expect(api.delete).toHaveBeenCalledTimes(1);
  expect(api.get).toHaveBeenCalledTimes(2);
  onay.mockRestore();
});

test('ilk üretim yanıtı kaybolunca tekrar yalnız okur; kapalı link ancak bilinçli yeni üretimle açılır', async () => {
  api.get.mockResolvedValue(cevap(null));
  api.post.mockRejectedValueOnce({ code: 'ERR_NETWORK' }).mockResolvedValueOnce(cevap(bilgi));
  kur(); ac();
  await screen.findByText(/henüz link üretilmedi/);
  fireEvent.click(screen.getByRole('button', { name: 'Link Üret' }));
  await screen.findByText(/İşlem tamamlanmış olabilir/);
  fireEvent.click(screen.getByRole('button', { name: 'Tekrar Dene' }));
  await screen.findByText(/henüz link üretilmedi/);
  expect(api.get).toHaveBeenCalledTimes(2);
  expect(api.post).toHaveBeenCalledTimes(1);
  fireEvent.click(screen.getByRole('button', { name: 'Link Üret' }));
  await screen.findByDisplayValue(bilgi.link);
  expect(api.post).toHaveBeenCalledTimes(2);
  expect(api.post.mock.calls[1][1].istekId).not.toBe(api.post.mock.calls[0][1].istekId);
});

test.each([{ data: '<html>Sunucu hazırlanıyor</html>' }, cevap({})])('beklenmeyen yanıt link yok gibi gösterilmez ve üretim açılmaz: %p', async (yanit) => {
  api.get.mockResolvedValueOnce(yanit);
  kur(); ac();
  expect(await screen.findByText(/beklenmeyen bir yanıt/)).toBeInTheDocument();
  expect(screen.queryByText(/henüz link üretilmedi/)).not.toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Link Üret' })).toBeDisabled();
});
