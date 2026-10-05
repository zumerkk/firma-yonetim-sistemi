// 🧪 Belge görüntüleme etiketleri
//
// Müşteri (15.09.2026): "Destekleme sınıfı BOLGESEL_ONCELIKLI_YATIRIM olarak görünüyor" ve
// "öncelikli yatırım türü sadece 'n' olarak görünüyor ve pdf görünümünde öncelikli yatırım türü görünmüyor".

import { destekSinifiGoster } from './disaAktarimAdi';
import { oncelikliYatirimTuruEtiketi } from '../data/oncelikliYatirimData';
import { eskiOncelikliYatirimTurleri } from '../data/eskiOncelikliYatirimData';

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

    // Müşteri (05.10.2026): eski belgede kendi yüklediği 2012/3305 md. 17 listesi çıksın
    test('eski belge kendi listesinden okunur (aynı harf başka anlam)', () => {
        expect(oncelikliYatirimTuruEtiketi('a', 'eski')).toBe('a - Demiryolu, Denizyolu, Havayolu Taşımacılığı');
        expect(oncelikliYatirimTuruEtiketi('a', 'yeni')).toBe('a - Dijital Dönüşüm Programı veya Yeşil Dönüşüm');
        expect(oncelikliYatirimTuruEtiketi('n', 'eski')).toBe('n - OECD Yüksek Teknolojili Ürün Üretimi');
        expect(oncelikliYatirimTuruEtiketi('ff', 'eski')).toBe('ff - Yeşil Dönüşüm Destek Programı');
        // yeni listenin kurum kodu eski belgede anlamsız — ham döner
        expect(oncelikliYatirimTuruEtiketi('OY-017', 'eski')).toBe('OY-017');
    });

    test('eski liste müşterinin dosyasındaki 35 bendin tamamı, sırası korunmuş', () => {
        const harfler = eskiOncelikliYatirimTurleri.map((t) => t.id);
        expect(harfler).toHaveLength(35);
        expect(harfler.slice(0, 6)).toEqual(['a', 'b', 'c', 'ç', 'd', 'e']);
        expect(harfler.slice(-6)).toEqual(['aa', 'bb', 'cc', 'dd', 'ee', 'ff']);
        expect(new Set(harfler).size).toBe(35);
        expect(eskiOncelikliYatirimTurleri.filter((t) => t.mulga).map((t) => t.id)).toEqual(['b', 'd', 'e', 'u']);
        eskiOncelikliYatirimTurleri.filter((t) => !t.mulga).forEach((t) => {
            expect(t.baslik).toBeTruthy();
            expect(t.aciklama).not.toMatch(/Değişik|RG-/);
        });
    });
});
