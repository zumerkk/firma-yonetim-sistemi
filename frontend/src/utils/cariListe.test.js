import {
    faturaSuzgecindenGecer, suzgecSayilari, faturaSiraDegeri, firmalariSirala, siralamaDegistir
} from './cariListe';

const firma = (firmaUnvan, faturaDurumlari = {}, ek = {}) => ({
    firmaUnvan, faturaDurumlari: { kesildi: 0, kesilmedi: 0, avans: 0, bos: 0, ...faturaDurumlari }, ...ek
});

const KESILDI = firma('ALFA', { kesildi: 2 });
const AVANS = firma('BETA', { avans: 1 });
const KESILMEDI = firma('ÇELİK', { kesilmedi: 3 });
const KARISIK = firma('DELTA', { kesildi: 1, kesilmedi: 1 });
const GIRILMEMIS = firma('EPSİLON', { bos: 2 });
const TALEPSIZ = firma('ZETA');
const HEPSI = [KESILDI, AVANS, KESILMEDI, KARISIK, GIRILMEMIS, TALEPSIZ];
const adlar = (l) => l.map((f) => f.firmaUnvan);

describe('fatura durumu süzgeci', () => {
    test('"Kesildi" avanslıları da kapsar, avans ayrıca süzülebilir', () => {
        expect(adlar(HEPSI.filter((f) => faturaSuzgecindenGecer(f, 'kesildi')))).toEqual(['ALFA', 'BETA', 'DELTA']);
        expect(adlar(HEPSI.filter((f) => faturaSuzgecindenGecer(f, 'avans')))).toEqual(['BETA']);
    });

    test('hem kesilen hem kesilmeyen talebi olan firma iki süzgeçte de görünür', () => {
        expect(adlar(HEPSI.filter((f) => faturaSuzgecindenGecer(f, 'kesilmedi')))).toEqual(['ÇELİK', 'DELTA']);
    });

    test('girilmemiş ve tümü', () => {
        expect(adlar(HEPSI.filter((f) => faturaSuzgecindenGecer(f, 'girilmemis')))).toEqual(['EPSİLON']);
        expect(HEPSI.filter((f) => faturaSuzgecindenGecer(f, ''))).toHaveLength(6);
    });

    test('düğme sayıları', () => {
        expect(suzgecSayilari(HEPSI)).toEqual({ '': 6, kesildi: 3, avans: 1, kesilmedi: 2, girilmemis: 1 });
    });
});

describe('sıralama', () => {
    test('fatura durumu: azalan → kesilmemişler üstte, durumu olmayanlar her yönde sonda', () => {
        expect(adlar(firmalariSirala(HEPSI, { alan: 'faturaDurumu', yon: 'desc' })))
            .toEqual(['ÇELİK', 'DELTA', 'BETA', 'ALFA', 'EPSİLON', 'ZETA']);
        expect(adlar(firmalariSirala(HEPSI, { alan: 'faturaDurumu', yon: 'asc' })))
            .toEqual(['ALFA', 'BETA', 'DELTA', 'ÇELİK', 'EPSİLON', 'ZETA']);
    });

    test('avans, aynı oranda tam kesilmişten sonra gelir', () => {
        expect(faturaSiraDegeri(AVANS)).toBeGreaterThan(faturaSiraDegeri(KESILDI));
        expect(faturaSiraDegeri(AVANS)).toBeLessThan(faturaSiraDegeri(KARISIK));
        expect(faturaSiraDegeri(TALEPSIZ)).toBeNull();
    });

    test('bakiye / ödenen sayısal, Türkçe ad sırası', () => {
        const l = [firma('ÇAĞ', {}, { bakiye: 10 }), firma('CAN', {}, { bakiye: -5 }), firma('ÖZ', {}, { bakiye: 300 })];
        expect(adlar(firmalariSirala(l, { alan: 'bakiye', yon: 'desc' }))).toEqual(['ÖZ', 'ÇAĞ', 'CAN']);
        expect(adlar(firmalariSirala(l, { alan: 'firmaUnvan', yon: 'asc' }))).toEqual(['CAN', 'ÇAĞ', 'ÖZ']);
    });

    test('son hareket: tarihsiz firmalar sonda', () => {
        const l = [firma('A', {}, { sonHareketTarihi: null }), firma('B', {}, { sonHareketTarihi: '2026-09-01' }),
            firma('C', {}, { sonHareketTarihi: '2026-10-01' })];
        expect(adlar(firmalariSirala(l, { alan: 'sonHareketTarihi', yon: 'desc' }))).toEqual(['C', 'B', 'A']);
        expect(adlar(firmalariSirala(l, { alan: 'sonHareketTarihi', yon: 'asc' }))).toEqual(['B', 'C', 'A']);
    });

    test('başlık tıklaması: tutarlar önce büyükten, aynı başlıkta yön döner', () => {
        expect(siralamaDegistir({ alan: 'firmaUnvan', yon: 'asc' }, 'bakiye')).toEqual({ alan: 'bakiye', yon: 'desc' });
        expect(siralamaDegistir({ alan: 'bakiye', yon: 'desc' }, 'bakiye')).toEqual({ alan: 'bakiye', yon: 'asc' });
        expect(siralamaDegistir(null, 'firmaUnvan')).toEqual({ alan: 'firmaUnvan', yon: 'asc' });
    });

    test('girdi listesi değişmez', () => {
        const l = [...HEPSI];
        firmalariSirala(l, { alan: 'bakiye', yon: 'desc' });
        expect(l).toEqual(HEPSI);
    });
});
