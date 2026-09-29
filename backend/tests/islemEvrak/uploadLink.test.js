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

// 📎 Maildeki ekler yükleme sayfasından da indirilebilmeli
// Müşteri (29.09.2026): "Bazen mail gönderilmiyor yükleme linkini whatsapptan vs. yolluyoruz da
// o linkte kompakt olarak ekler de görünse çok iyi olur."
describe('public örnek dosya indirme', () => {
  const ctrl = require('../../controllers/islemEvrakController');
  const svc = require('../../services/islemEvrak/islemEvrakService');
  const storageService = require('../../services/tesvikMakine/storageService');

  const yanit = () => {
    const r = { kod: 200 };
    r.status = (k) => { r.kod = k; return r; };
    r.json = (g) => { r.govde = g; return r; };
    return r;
  };
  afterEach(() => jest.restoreAllMocks());

  const talepTaklidi = (evrak) => ({
    istenenEvraklar: { id: (x) => (String(x) === 'e1' ? evrak : null) }
  });

  test('örnek dosya varsa akıtılır', async () => {
    const evrak = { _id: 'e1', ad: 'Vergi Levhası', zorunlu: true, ornekDosya: { fileUrl: 'https://res.cloudinary.com/x/v.pdf', dosyaAdi: 'ornek.pdf' } };
    jest.spyOn(svc, 'resolveByToken').mockResolvedValue({ talep: talepTaklidi(evrak) });
    const servis = jest.spyOn(storageService, 'serveFile').mockResolvedValue(undefined);
    const r = yanit();
    await ctrl.publicOrnekIndir({ params: { token: 't', evrakId: 'e1' } }, r);
    expect(servis).toHaveBeenCalledWith(expect.objectContaining({ fileUrl: 'https://res.cloudinary.com/x/v.pdf' }), r);
  });

  test('mailde istenmeyen evrakın örneği paylaşılmaz (mail eki kuralıyla aynı)', async () => {
    const evrak = { _id: 'e1', ad: 'Kapasite', zorunlu: false, ornekDosya: { fileUrl: 'https://x/k.pdf' } };
    jest.spyOn(svc, 'resolveByToken').mockResolvedValue({ talep: talepTaklidi(evrak) });
    const r = yanit();
    await ctrl.publicOrnekIndir({ params: { token: 't', evrakId: 'e1' } }, r);
    expect(r.kod).toBe(404);
  });

  test('süresi dolmuş bağlantı 410 döner', async () => {
    jest.spyOn(svc, 'resolveByToken').mockResolvedValue({ expired: true });
    const r = yanit();
    await ctrl.publicOrnekIndir({ params: { token: 't', evrakId: 'e1' } }, r);
    expect(r.kod).toBe(410);
  });
});
