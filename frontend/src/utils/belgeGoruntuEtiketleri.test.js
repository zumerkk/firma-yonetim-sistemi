// 🧪 Belge görüntüleme etiketleri
//
// Müşteri (15.09.2026): "Destekleme sınıfı BOLGESEL_ONCELIKLI_YATIRIM olarak görünüyor" ve
// "öncelikli yatırım türü sadece 'n' olarak görünüyor ve pdf görünümünde öncelikli yatırım türü görünmüyor".

import { destekSinifiGoster } from './disaAktarimAdi';
import { oncelikliYatirimTuruEtiketi } from '../data/oncelikliYatirimData';

describe('destekSinifiGoster', () => {
    test.each([
        ['BOLGESEL_ONCELIKLI_YATIRIM', 'BÖLGESEL - ÖNCELİKLİ YATIRIM'],
        ['BOLGESEL_ALT_BOLGE', 'BÖLGESEL - ALT BÖLGE'],
        ['BOLGESEL', 'BÖLGESEL'],
        ['GENEL', 'GENEL'],
        ['HEDEF_YATIRIMLAR', 'HEDEF YATIRIMLAR'],
        ['STRATEJIK_HAMLE_ALT_BOLGE', 'STRATEJİK HAMLE - ALT BÖLGE'],
        ['ONCELIKLI_YATIRIMLAR', 'ÖNCELİKLİ YATIRIMLAR'],
        // Zaten okunur yazılmış değer olduğu gibi kalır
        ['BÖLGESEL - ÖNCELİKLİ YATIRIM', 'BÖLGESEL - ÖNCELİKLİ YATIRIM'],
        ['', ''],
        [null, '']
    ])('%p → %p', (girdi, beklenen) => {
        expect(destekSinifiGoster(girdi)).toBe(beklenen);
    });
});

describe('oncelikliYatirimTuruEtiketi', () => {
    test('harf kodu okunur etikete çevrilir', () => {
        expect(oncelikliYatirimTuruEtiketi('n')).toBe('n - Yüksek Teknolojili Sanayi Ürünleri');
    });

    test('kurum kodu (OY-017) ile de bulunur', () => {
        expect(oncelikliYatirimTuruEtiketi('OY-017')).toBe('n - Yüksek Teknolojili Sanayi Ürünleri');
    });

    test('tanınmayan değer olduğu gibi döner', () => {
        expect(oncelikliYatirimTuruEtiketi('n - Yüksek Teknolojili Sanayi Ürünleri')).toBe('n - Yüksek Teknolojili Sanayi Ürünleri');
    });

    test('boş değer', () => {
        expect(oncelikliYatirimTuruEtiketi('')).toBe('');
        expect(oncelikliYatirimTuruEtiketi(undefined)).toBe('');
    });
});
