// 🧪 responseType:'blob' isteklerde sunucu hata mesajının kaybolmaması
//
// Gerçek vaka (8 Eylül 2026): KDV muafiyet indirmede sunucu "Dosya sunucuda
// bulunamadı — yeniden yüklenmesi gerekiyor" diyordu, ekranda "Dosya
// indirilemedi. Lütfen tekrar deneyin." yazıyordu. Yanıltıcıydı: tekrar
// denemek hiçbir şeyi değiştirmiyordu.

import { hataMesaji, hataMesajiSenkron } from './hataMesaji';

// jsdom'da Blob.text() her sürümde yok; deterministik olsun diye sahte kullanıyoruz.
const sahteBlob = (metin) => {
  const b = new Blob([metin]);
  b.text = () => Promise.resolve(metin);
  return b;
};

describe('hataMesaji — blob gövdesinden JSON çözme', () => {
  test('blob içindeki JSON mesajı çıkarılır — ASIL DÜZELTME', async () => {
    const hata = { response: { data: sahteBlob(JSON.stringify({ message: 'Dosya sunucuda bulunamadı.' })) } };
    expect(await hataMesaji(hata, 'yedek')).toBe('Dosya sunucuda bulunamadı.');
  });

  test('blob JSON değilse yedek metne düşer — patlamaz', async () => {
    const hata = { response: { data: sahteBlob('<html>502 Bad Gateway</html>') } };
    expect(await hataMesaji(hata, 'yedek metin')).toBe('yedek metin');
  });

  test('düz JSON yanıtta message doğrudan alınır', async () => {
    const hata = { response: { data: { message: 'Sunucu mesajı' } } };
    expect(await hataMesaji(hata, 'yedek')).toBe('Sunucu mesajı');
  });

  test('kullaniciMesaji önceliklidir — axios katmanı 401/timeout için koyuyor', async () => {
    const hata = { kullaniciMesaji: 'Oturum doğrulanamadı', response: { data: { message: 'Unauthorized' } } };
    expect(await hataMesaji(hata, 'yedek')).toBe('Oturum doğrulanamadı');
  });

  test('yanıt hiç yoksa (ağ hatası) hata mesajına düşer', async () => {
    expect(await hataMesaji({ message: 'Network Error' }, 'yedek')).toBe('Network Error');
  });

  test('hiçbir şey yoksa yedek metin döner', async () => {
    expect(await hataMesaji(undefined, 'son çare')).toBe('son çare');
    expect(await hataMesaji({}, 'son çare')).toBe('son çare');
  });

  test('blob boşsa yedek metne düşer', async () => {
    const hata = { response: { data: sahteBlob('') } };
    expect(await hataMesaji(hata, 'yedek')).toBe('yedek');
  });
});

describe('hataMesajiSenkron — blob beklemeyen istekler', () => {
  test('sunucu mesajını alır', () => {
    expect(hataMesajiSenkron({ response: { data: { message: 'X' } } }, 'y')).toBe('X');
  });
  test('yedek metne düşer', () => {
    expect(hataMesajiSenkron({}, 'y')).toBe('y');
  });
});
