// 🧪 YETKİ BİTİŞ TARİHİ DOĞRULAMASI
// DB'siz çalışır: gerçek express-validator zinciri sahte istek üzerinde koşulur.
//
// Müşteri (Ankara ofisi, 8 Eylül 2026):
//   "bir de bu hatanın olmaması gerek, çünkü süresi bitse de biz burada
//    güncelleme yapmaya devam edebiliriz"
//
// Eski kural: "ETUYS/DYS yetki bitiş tarihi bugün veya gelecek bir tarih
// olmalıdır" — geçmiş tarihli firmayı KAYDETTİRMİYORDU.
//
// Kural sistemin kendisiyle çelişiyordu: panelde "Yetki Süresi Yaklaşan" ve
// "Süresi Geçmiş" sayaçları var; süresi dolmuş firma takip edilmesi gereken
// şeyin ta kendisi. Ölçüldü: üretimde 1257 firmanın 27'si (%2,1) bu yüzden
// hiç kaydedilemiyordu ve sayı her gün artıyordu.

const { validationResult } = require('express-validator');
const { validateCreateFirma, validateUpdateFirma } = require('../../middleware/validation');

// Zinciri sahte istek üzerinde koştur, yalnız ilgilendiğimiz alanın hatasını döndür
const dogrula = async (zincir, alan, deger) => {
  const req = { body: { [alan]: deger }, query: {}, params: {}, cookies: {}, headers: {} };
  for (const kural of zincir) {
    if (typeof kural.run === 'function') await kural.run(req);
  }
  return validationResult(req).array().filter((h) => h.path === alan);
};

const gunEkle = (n) => {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return d.toISOString().slice(0, 10);
};

describe.each([
  ['firma oluşturma', validateCreateFirma],
  ['firma güncelleme', validateUpdateFirma]
])('%s — yetki bitiş tarihi', (_ad, zincir) => {
  describe.each(['etuysYetkiBitisTarihi', 'dysYetkiBitisTarihi'])('%s', (alan) => {
    test('GEÇMİŞ tarih artık KABUL EDİLİYOR — asıl düzeltme bu', async () => {
      expect(await dogrula(zincir, alan, gunEkle(-400))).toHaveLength(0);
      expect(await dogrula(zincir, alan, gunEkle(-1))).toHaveLength(0);
    });

    test('bugün ve gelecek tarih kabul edilir', async () => {
      expect(await dogrula(zincir, alan, gunEkle(0))).toHaveLength(0);
      expect(await dogrula(zincir, alan, gunEkle(365))).toHaveLength(0);
    });

    test('boş değer kabul edilir — alan zorunlu değil', async () => {
      expect(await dogrula(zincir, alan, '')).toHaveLength(0);
    });

    test('yazım hatası yakalanır — yıl hanesi eksik/fazla', async () => {
      // isISO8601() bunları GEÇERLİ sayar; makul aralık kuralı yakalar.
      expect((await dogrula(zincir, alan, '0226-05-10')).length).toBeGreaterThan(0);
      expect((await dogrula(zincir, alan, '9999-05-10')).length).toBeGreaterThan(0);
    });

    test('bozuk tarih reddedilir', async () => {
      expect((await dogrula(zincir, alan, 'abc')).length).toBeGreaterThan(0);
    });

    test('eski hata mesajı artık üretilmiyor', async () => {
      const hatalar = await dogrula(zincir, alan, gunEkle(-30));
      expect(hatalar.map((h) => h.msg).join(' ')).not.toMatch(/bugün veya gelecek/);
    });
  });
});
