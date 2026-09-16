// 🧪 Dosya sunumu (serveFile)
//
// Müşteri (16.09.2026, İşlem & Evrak → "Firmadan Gelen Evraklar"): "evrak indirmeye çalışırken
// böyle bir hata alıyorum" → "Dosya indirilemedi."
//
// Ölçüldü (canlı veri): o talebin 6 dosyası Cloudinary'de; 5 PDF'in DOĞRUDAN adresi 401, JPEG'i
// 200 dönüyor. serveFile bulut dosyasında tarayıcıyı o adrese yönlendirdiği için indirme düşüyordu.
// Artık dosya sunucuda indirilip kendi alan adımızdan akıtılıyor.

const storage = require('../../services/tesvikMakine/storageService');

const sahteYanit = () => {
  const y = { basliklar: {}, durum: 200 };
  y.setHeader = (k, v) => { y.basliklar[k] = v; };
  y.status = (k) => { y.durum = k; return y; };
  y.json = (o) => { y.json_govde = o; return y; };
  y.send = (b) => { y.gonderilen = b; return y; };
  y.redirect = (u) => { y.yonlendirme = u; return y; };
  y.download = (yol, ad) => { y.indirme = { yol, ad }; return y; };
  return y;
};

const BULUT_PDF = 'https://res.cloudinary.com/drweumniy/image/upload/v1757/Islem_Evrak/Gelen/taahhutname.pdf';

describe('serveFile — bulut dosyası', () => {
  test('yönlendirme yapmaz, içeriği kendisi akıtır', async () => {
    const res = sahteYanit();
    await storage.serveFile(
      { fileUrl: BULUT_PDF, originalName: 'Taahhütname.pdf', mimeType: 'application/pdf' },
      res,
      { buluttanIndir: async () => ({ buffer: Buffer.from('%PDF-1.4'), contentType: 'application/pdf' }) }
    );
    expect(res.yonlendirme).toBeUndefined();
    expect(res.basliklar['Content-Type']).toBe('application/pdf');
    expect(res.basliklar['Content-Length']).toBe(8);
    expect(res.basliklar['Content-Disposition']).toBe(`attachment; filename*=UTF-8''${encodeURIComponent('Taahhütname.pdf')}`);
    expect(Buffer.isBuffer(res.gonderilen)).toBe(true);
  });

  // Bozuk adlar eski kayıtlarda duruyor; indirirken de düzgün olmalı
  test('latin1 okunmuş adı indirirken onarır', async () => {
    const res = sahteYanit();
    await storage.serveFile(
      { fileUrl: BULUT_PDF, originalName: 'GÃ¼ncel Ä°mza SirkÃ¼leri.pdf' },
      res,
      { buluttanIndir: async () => ({ buffer: Buffer.from('x'), contentType: 'application/pdf' }) }
    );
    expect(decodeURIComponent(res.basliklar['Content-Disposition'].split("UTF-8''")[1]))
      .toBe('Güncel İmza Sirküleri.pdf');
  });

  test('bulut dosyası alınamazsa 502 ve ne yapılacağını söyleyen mesaj', async () => {
    const res = sahteYanit();
    await storage.serveFile({ fileUrl: BULUT_PDF, originalName: 'a.pdf' }, res, { buluttanIndir: async () => null });
    expect(res.durum).toBe(502);
    expect(res.json_govde.message).toMatch(/yeniden yükleyin/);
    expect(res.yonlendirme).toBeUndefined();
  });
});

describe('serveFile — yerel dosya', () => {
  test('uploads dışındaki yol reddedilir', async () => {
    const res = sahteYanit();
    await storage.serveFile({ filePath: '/etc/passwd', originalName: 'passwd' }, res);
    expect(res.durum).toBe(403);
  });

  test('diskte olmayan dosyada sunucunun yeniden başlatılmış olabileceği söylenir', async () => {
    const res = sahteYanit();
    await storage.serveFile({ filePath: 'Islem_Evrak/Gelen/yok-boyle-bir-dosya.pdf', originalName: 'yok.pdf' }, res);
    expect(res.durum).toBe(404);
    expect(res.json_govde.message).toMatch(/yeniden başlatıldığında/);
  });
});
