import api from '../utils/axios';
import { sistemYedegiIndir } from './backupService';

jest.mock('../utils/axios', () => ({ get: jest.fn() }));

const dosya = (bytes) => ({ size: bytes.length, slice: () => ({ arrayBuffer: async () => Uint8Array.from(bytes).buffer }) });
const tamamZip = () => dosya([0x50, 0x4b, 3, 4, ...Array(18).fill(0), 0x50, 0x4b, 5, 6, ...Array(18).fill(0)]);

afterEach(() => jest.clearAllMocks());

test('toplamı bilinmeyen ZIP indirmesinde sahte yüzde üretmez; sonu doğrulanmış dosyayı döndürür', async () => {
  const blob = tamamZip();
  const onProgress = jest.fn();
  const controller = new AbortController();
  api.get.mockImplementationOnce(async (url, options) => {
    options.onDownloadProgress({ loaded: 4096 });
    expect(options.signal).toBe(controller.signal);
    expect(options.timeout).toBe(900000);
    return { data: blob, headers: { 'content-disposition': 'attachment; filename="GM_Yedek_2026.zip"' } };
  });
  await expect(sistemYedegiIndir({ onProgress, signal: controller.signal }))
    .resolves.toEqual({ blob, filename: 'GM_Yedek_2026.zip' });
  expect(onProgress).toHaveBeenCalledWith({ loaded: 4096, percent: null });
});

test('yarım kalan ZIP başarılı yedek olarak indirilmez', async () => {
  api.get.mockResolvedValueOnce({ data: dosya([0x50, 0x4b, 3, 4, 0]), headers: {} });
  await expect(sistemYedegiIndir()).rejects.toThrow('Yedek dosyası tamamlanamadı');
});

test('sunucunun JSON hata mesajını blob yanıtından okur', async () => {
  api.get.mockRejectedValueOnce(Object.assign(new Error('HTTP 500'), {
    response: { data: { text: async () => JSON.stringify({ message: 'Veritabanına erişilemiyor' }) } }
  }));
  await expect(sistemYedegiIndir()).rejects.toThrow('Veritabanına erişilemiyor');
});

test('ZIP doğrulaması sürerken iptal edilirse indirme sonucu döndürmez', async () => {
  let dogrulamayiBitir;
  let dogrulamaBasladi;
  const basladi = new Promise((resolve) => { dogrulamaBasladi = resolve; });
  const blob = tamamZip();
  const tail = await blob.slice().arrayBuffer();
  blob.slice = () => ({ arrayBuffer: () => new Promise((resolve) => {
    dogrulamayiBitir = () => resolve(tail);
    dogrulamaBasladi();
  }) });
  api.get.mockResolvedValueOnce({ data: blob, headers: {} });
  const controller = new AbortController();
  const sonuc = sistemYedegiIndir({ signal: controller.signal });
  await basladi;
  controller.abort();
  dogrulamayiBitir();
  await expect(sonuc).rejects.toMatchObject({ code: 'ERR_CANCELED' });
});
