// 🧪 İŞLEM & EVRAK - public yükleme linki
// Müşteri: "maildeki yükleme linkine de Bağlantı bulunamadı veya geçersiz. diyor"
//
// Kök neden: islemEvrakService, teşvik-makine'nin buildUploadLink'ini olduğu gibi
// kullanıyordu; o da yolu /upload/tesvik/<token> olarak sabitliyordu. Firma bu adrese
// gidince teşvik-makine sayfası açılıyor, token orada bulunamıyor ve "geçersiz" diyor.
// Bu modülün firma sayfası /evrak/:token (AppRouter).

const tokenService = require('../../services/tesvikMakine/uploadTokenService');

const ESKI_ENV = { ...process.env };
afterEach(() => { process.env = { ...ESKI_ENV }; });

describe('buildUploadLink - route öneki', () => {
  test('varsayılan yol teşvik-makine sayfasıdır (geriye uyumluluk)', () => {
    process.env.UPLOAD_PUBLIC_BASE_URL = 'https://gmplansis.com';
    expect(tokenService.buildUploadLink('ABC1234567')).toBe('https://gmplansis.com/upload/tesvik/ABC1234567');
  });

  test('İşlem & Evrak modülü kendi sayfasına link üretir', () => {
    process.env.UPLOAD_PUBLIC_BASE_URL = 'https://gmplansis.com';
    expect(tokenService.buildUploadLink('ABC1234567', '/evrak')).toBe('https://gmplansis.com/evrak/ABC1234567');
  });

  test('sondaki bölü işareti yolu bozmaz', () => {
    process.env.UPLOAD_PUBLIC_BASE_URL = 'https://gmplansis.com/';
    expect(tokenService.buildUploadLink('T1', '/evrak/')).toBe('https://gmplansis.com/evrak/T1');
  });

  test('taban adres yoksa göreli yol döner', () => {
    delete process.env.UPLOAD_PUBLIC_BASE_URL;
    delete process.env.FRONTEND_URL;
    expect(tokenService.buildUploadLink('T1', '/evrak')).toBe('/evrak/T1');
  });

  test('FRONTEND_URL birden çok origin içerse de ilk adres alınır', () => {
    delete process.env.UPLOAD_PUBLIC_BASE_URL;
    process.env.FRONTEND_URL = 'https://a.com,https://b.com';
    expect(tokenService.buildUploadLink('T1', '/evrak')).toBe('https://a.com/evrak/T1');
  });
});

describe('islemEvrakService - link üretimi bu modülün sayfasına gider', () => {
  const svc = require('../../services/islemEvrak/islemEvrakService');

  test('ensureUploadLink /evrak yolunu kullanır', async () => {
    process.env.UPLOAD_PUBLIC_BASE_URL = 'https://gmplansis.com';
    // save() DB'ye gitmesin: sahte talep nesnesi
    const talep = {
      islemTuruAdi: 'ETUYS Yetkilendirme',
      uploadToken: '',
      uploadTokenExpiresAt: null,
      save: async () => {}
    };
    const link = await svc.ensureUploadLink(talep);
    expect(link).toContain('https://gmplansis.com/evrak/');
    expect(link).not.toContain('/upload/tesvik/');
    // Token üretilmiş ve talebe yazılmış olmalı
    expect(talep.uploadToken).toBeTruthy();
    expect(link.endsWith(talep.uploadToken)).toBe(true);
  });

  // Geçerli bir token varken yenilenmemeli: aksi halde firmaya daha önce
  // gönderilmiş maildeki link her önizlemede geçersizleşirdi.
  test('mevcut geçerli token yeniden üretilmez, yalnızca doğru yola bağlanır', async () => {
    process.env.UPLOAD_PUBLIC_BASE_URL = 'https://gmplansis.com';
    let kaydedildi = false;
    const mevcutToken = 'ETUYSYetkil-Ab3Cd5Ef7G'; // ensureUploadLink'in ürettiği önek biçimi
    const talep = {
      islemTuruAdi: 'ETUYS Yetkilendirme',
      uploadToken: mevcutToken,
      uploadTokenExpiresAt: null, // süresiz
      save: async () => { kaydedildi = true; }
    };

    const link = await svc.ensureUploadLink(talep);

    expect(talep.uploadToken).toBe(mevcutToken); // token korundu
    expect(kaydedildi).toBe(false);              // gereksiz kayıt yok
    expect(link).toBe(`https://gmplansis.com/evrak/${mevcutToken}`);
  });
});
