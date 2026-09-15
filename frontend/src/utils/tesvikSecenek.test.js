// 🧪 Teşvik formu Autocomplete seçenekleri

import { secenekEtiketi, secenekleriTemizle } from './tesvikSecenek';

describe('secenekEtiketi', () => {
    test.each([
        ['7 Yıl', '7 Yıl'],
        [{ label: '10 Yıl (6. Bölge)', value: '10-yil' }, '10 Yıl (6. Bölge)'],
        [{ value: 'SGK' }, 'SGK'],
        [{}, ''],
        [null, ''],
        [undefined, '']
    ])('%p → %p', (girdi, beklenen) => {
        expect(secenekEtiketi(girdi)).toBe(beklenen);
    });
});

describe('secenekleriTemizle — açılır listedeki boş satırlar', () => {
    // Müşteri: "Destek unsurlarında böyle boşluklar var". Otomatik şart doldurma listeye düz metin
    // ekliyordu; liste yalnız nesneyi çizebildiği için bunlar boş satır olarak görünüyordu.
    test('düz metin ve nesne seçenekler birlikte kalır, boşlar atılır', () => {
        const sonuc = secenekleriTemizle(['7 Yıl', { label: '6 Yıl', kategori: 'Diğer' }, '', '   ', { label: '' }, null]);
        expect(sonuc.map(secenekEtiketi)).toEqual(['7 Yıl', '6 Yıl']);
    });

    test('aynı etiket iki kez listelenmez, ilki kalır', () => {
        const ilk = { label: 'SGK', kategori: 'SGK' };
        expect(secenekleriTemizle([ilk, 'SGK', { value: 'SGK', isDynamic: true }])).toEqual([ilk]);
    });

    test('dizi değilse boş liste', () => {
        expect(secenekleriTemizle(undefined)).toEqual([]);
        expect(secenekleriTemizle({})).toEqual([]);
    });
});
