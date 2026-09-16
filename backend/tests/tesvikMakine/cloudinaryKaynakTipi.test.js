// 🧪 Cloudinary kaynak türü seçimi
//
// Müşteri (16.09.2026, İşlem & Evrak): "evrak indirmeye çalışırken 'Dosya indirilemedi.' hatası
// alıyorum." Ölçüldü (canlı): 'auto' ile yüklenen PDF image türünde saklanıyor ve hesapta PDF
// teslimatı kapalı olduğundan adres 401 dönüyor; aynı talepteki JPEG 200 dönüyordu. Belge Takip
// modülü baştan beri raw kullanıyor ve oradaki 912 dosya iniyor — ölçüt uzantı.

const { cloudinaryKaynakTipi } = require('../../services/tesvikMakine/storageService');

describe('cloudinaryKaynakTipi', () => {
  test.each(['.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp', '.heic', '.svg'])('resim %s → image', (ext) => {
    expect(cloudinaryKaynakTipi(`foto${ext}`)).toBe('image');
  });

  test.each(['.pdf', '.docx', '.doc', '.xlsx', '.xls', '.zip', '.rar', '.txt', '.xml'])('belge %s → raw', (ext) => {
    expect(cloudinaryKaynakTipi(`evrak${ext}`)).toBe('raw');
  });

  test('büyük harfli uzantı ve yol da çözülür', () => {
    expect(cloudinaryKaynakTipi('klasor/alt/Belge.PDF')).toBe('raw');
    expect(cloudinaryKaynakTipi('klasor/Foto.JPG')).toBe('image');
  });

  // Uzantısız public_id (eski kayıtlar) — silme çağrısında image varsayımı eskiden de böyleydi
  test('uzantısız ad raw sayılır', () => {
    expect(cloudinaryKaynakTipi('tesvik-evrak/Gelen/dosya_1789')).toBe('raw');
    expect(cloudinaryKaynakTipi('')).toBe('raw');
    expect(cloudinaryKaynakTipi(undefined)).toBe('raw');
  });
});
