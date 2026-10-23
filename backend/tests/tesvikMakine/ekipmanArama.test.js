// 🧪 Ekipman Takip arama — Türkçe harf duyarsız (müşteri, 23.10.2026): "armin group var ARMİN yazınca çıkıyor
// sadece armın/armin/ARMIN olarak yazınca çıkmıyor"
const ctrl = require('../../controllers/tesvikMakineController');

test.each(['armin', 'armın', 'ARMIN', 'ARMİN', 'armin  grup'])('"%s" → ARMİN GRUP bulunur', (q) => {
  const { $or } = ctrl._buildCertMatch({ q });
  expect($or[0].yatirimciUnvan.test('ARMİN GRUP MAKİNA İMALATI SANAYİ VE TİCARET LİMİTED ŞİRKETİ')).toBe(true);
});

test('özel karakterler regex olarak yorumlanmaz', () => {
  const { $or } = ctrl._buildCertMatch({ q: 'A.Ş. (2)' });
  expect($or[0].yatirimciUnvan.test('ABC A.Ş. (2)')).toBe(true);
  expect($or[0].yatirimciUnvan.test('AXŞX 2')).toBe(false);
});
