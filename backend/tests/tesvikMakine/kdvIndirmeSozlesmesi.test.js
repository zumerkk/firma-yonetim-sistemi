// 🧪 KDV MUAFİYET İNDİRME — HATA SÖZLEŞMESİ
//
// Müşteri (Yiğit, 8 Eylül 2026): "kdv muafiyet yazısı linkinde indirmeye
// çalışırken böyle bir hata alıyorum" → "Dosya indirilemedi. Lütfen tekrar
// deneyin."
//
// Kök sebep YAPILANDIRMAYDI: dosya Render'ın UÇUCU diskine yazılmıştı
// (/opt/render/.../uploads) çünkü CLOUDINARY_STORAGE_ENABLED ayarlı değildi.
// Backend her yeniden başladığında dosya siliniyordu; kayıt veritabanında
// duruyordu. Müşterinin "silip yeniden yükleyince düzeliyor" gözlemi de bunu
// doğruluyor — sonraki restart'a kadar çalışıyordu.
//
// Bu testler KODUN o durumu SESSİZ GEÇMEMESİNİ sabitliyor: fetchBuffer artık
// sebep döndürüyor ve "tekrar deneyin" demek yerine doğru mesaj seçiliyor.

const fs = require('fs-extra');
const path = require('path');
const os = require('os');
const kdvMuafiyetService = require('../../services/tesvikMakine/kdvMuafiyetService');
const storageService = require('../../services/tesvikMakine/storageService');

describe('fetchBuffer — sebep döndürme sözleşmesi', () => {
  test('kayıt yoksa KAYIT_YOK', async () => {
    expect(await kdvMuafiyetService.fetchBuffer(null)).toMatchObject({ hata: 'KAYIT_YOK' });
    expect(await kdvMuafiyetService.fetchBuffer({})).toMatchObject({ hata: 'KAYIT_YOK' });
  });

  test('kayıt var ama dosya DİSKTE YOK → DISKTE_YOK (uçucu disk vakası)', async () => {
    const sonuc = await kdvMuafiyetService.fetchBuffer({
      dosyaAdi: 'yok.pdf',
      mimeType: 'application/pdf',
      dosyaYolu: path.join(storageService.BASE_DIR, 'olmayan-klasor', 'yok.pdf')
    });
    expect(sonuc).toMatchObject({ hata: 'DISKTE_YOK' });
  });

  test('kök dizin dışındaki yol reddedilir — dizin geçişi koruması', async () => {
    const sonuc = await kdvMuafiyetService.fetchBuffer({
      dosyaAdi: 'passwd', mimeType: 'text/plain', dosyaYolu: '/etc/passwd'
    });
    expect(sonuc).toMatchObject({ hata: 'DISKTE_YOK', detay: 'gecersiz-yol' });
  });

  test('dosya varsa buffer döner — hata alanı YOK', async () => {
    const klasor = await fs.mkdtemp(path.join(storageService.BASE_DIR, 'test-'));
    const dosya = path.join(klasor, 'var.pdf');
    await fs.writeFile(dosya, 'PDF-icerik');
    try {
      const sonuc = await kdvMuafiyetService.fetchBuffer({
        dosyaAdi: 'var.pdf', mimeType: 'application/pdf', dosyaYolu: dosya
      });
      expect(sonuc.hata).toBeUndefined();
      expect(sonuc.buffer.toString()).toBe('PDF-icerik');
      expect(sonuc.contentType).toBe('application/pdf');
    } finally {
      await fs.remove(klasor);
    }
  });

  test('dönüş DAİMA nesne — çağıranlar `if (!file)` ile yetinemez', async () => {
    // Sözleşme değişikliği bu: eskiden null dönüyordu ve iki controller
    // `if (!file)` kontrol ediyordu. Artık {hata} truthy, ikisi de güncellendi.
    const sonuc = await kdvMuafiyetService.fetchBuffer(null);
    expect(sonuc).not.toBeNull();
    expect(typeof sonuc).toBe('object');
  });
});

describe('storageService — uçucu depolama tespiti', () => {
  test('Cloudinary bayrağı yoksa sağlayıcı local kalır', () => {
    const eski = process.env.CLOUDINARY_STORAGE_ENABLED;
    delete process.env.CLOUDINARY_STORAGE_ENABLED;
    expect(storageService.isCloudinaryConfigured()).toBe(false);
    expect(storageService.getProvider()).toBe('local');
    if (eski !== undefined) process.env.CLOUDINARY_STORAGE_ENABLED = eski;
  });

  test('kimlik bilgileri olsa bile BAYRAK olmadan local kalır — asıl tuzak bu', () => {
    const yedek = { ...process.env };
    process.env.CLOUDINARY_CLOUD_NAME = 'test';
    process.env.CLOUDINARY_API_KEY = 'k';
    process.env.CLOUDINARY_API_SECRET = 's';
    delete process.env.CLOUDINARY_STORAGE_ENABLED;
    expect(storageService.getProvider()).toBe('local');   // ← üretimde olan tam olarak buydu
    process.env.CLOUDINARY_STORAGE_ENABLED = 'true';
    expect(storageService.getProvider()).toBe('cloudinary');
    process.env = yedek;
  });
});
