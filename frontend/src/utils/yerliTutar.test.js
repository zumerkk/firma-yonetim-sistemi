import { yerliTutarlariniGuncelle } from './yerliTutar';

const satir = { miktar: 2, birimFiyatiTl: 400000, toplamTl: 950000, tlYerliManuel: true };

test.each(['miktar', 'birimFiyatiTl'])('%s değişince önceki manuel toplam yerine miktar × fiyat kullanılır', (alan) => {
  expect(yerliTutarlariniGuncelle(satir, [alan])).toMatchObject({ toplamTl: 800000, tlYerliManuel: false });
});

test('açıklama değişikliği, oturumda veya yeniden yüklenmiş manuel toplamı korur', () => {
  expect(yerliTutarlariniGuncelle(satir, ['adi']).toplamTl).toBe(950000);
  expect(yerliTutarlariniGuncelle({ ...satir, tlYerliManuel: undefined }, ['adi']).toplamTl).toBe(950000);
});

test('doğrudan toplam düzenleme değeri korunur; yeni satırın tutarı hesaplanır', () => {
  expect(yerliTutarlariniGuncelle({ ...satir, toplamTl: 12345.678 }, ['toplamTl']).toplamTl).toBe(12345.678);
  expect(yerliTutarlariniGuncelle({ miktar: 2, birimFiyatiTl: 400000, toplamTl: 0 }).toplamTl).toBe(800000);
});
