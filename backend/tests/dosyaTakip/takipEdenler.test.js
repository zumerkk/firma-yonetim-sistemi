// 🧪 Belge Takip — birden fazla "Takibi Yapan" (müşteri, 13.10.2026)
const { takipEdenIdleri, takipEdenAdlari, ekListesiniDuzelt } = require('../../services/dosyaTakip/takipEdenler');

test('birincil önce, tekrarlar tek', () => {
  expect(takipEdenIdleri({ muraacatSonrasi: { takibiYapanPersonel: 'A', ekTakipEdenler: ['B', 'A', { _id: 'C' }] } })).toEqual(['A', 'B', 'C']);
  expect(takipEdenIdleri({})).toEqual([]);
});

test('adlar populate edilmiş kayıttan; birincilin adı yoksa kayıtlı ad', () => {
  expect(takipEdenAdlari({ muraacatSonrasi: { takibiYapanAdi: 'Yiğit', ekTakipEdenler: [{ adSoyad: 'Berk' }, { adSoyad: 'Yiğit' }] } }))
    .toEqual(['Yiğit', 'Berk']);
});

test('kaydetmeden önce ek listeden birincil ve tekrar çıkar', () => {
  const t = { muraacatSonrasi: { takibiYapanPersonel: 'A', ekTakipEdenler: ['A', 'B', 'B', '', 'C'] } };
  ekListesiniDuzelt(t);
  expect(t.muraacatSonrasi.ekTakipEdenler).toEqual(['B', 'C']);
});
