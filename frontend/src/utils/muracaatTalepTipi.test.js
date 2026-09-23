import { muracaatTalepTipi } from './muracaatTalepTipi';
test('yeni formun sakladığı Sonuç değeri görünen seçime çevrilir', () => {
  expect(muracaatTalepTipi({ kunyeBilgileri: { talepSonuc: 'Sonuç' } })).toBe('Yatırım Teşvik Belgesi');
});
test('açıkça girilmiş müracaat türü korunur', () => {
  expect(muracaatTalepTipi({ belgeYonetimi: { belgeMuracaatTalepTipi: 'SÜRE UZATIMI' }, kunyeBilgileri: { talepSonuc: 'Sonuç' } })).toBe('SÜRE UZATIMI');
});
