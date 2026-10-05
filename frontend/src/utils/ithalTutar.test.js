// 🧪 İthal makine tutarları — EUR'lu makinede $ ve TL
// Müşteri (05.10.2026): "Döviz cinsi EUR olsa bile onun birim fiyatını yazmıyor hepsini USD üzerinden alıyor"
import {
  dovizliToplam, usdHesapla, tlHesapla, usdEksik, tlEksik, usdCevrilmemis,
  ithalTutarlariniGuncelle, eksikTutarlariDoldur, kurKodu
} from './ithalTutar';

// E-TUYS örneği (müşteri şablonu, İthal Liste 1. satır): 165.000 EUR → 179.000 $ → 5.768.630,85 TL
const ETUYS_PARITE = 179000 / 165000;
const ETUYS_KUR = 5768630.85 / 165000;
const eur = (ek = {}) => ({ miktar: 1, birimFiyatiFob: 165000, doviz: 'EUR', toplamUsd: 0, toplamTl: 0, ...ek });

describe('usdHesapla', () => {
  test('EUR satırında $ pariteyle çevrilir (E-TUYS 165.000 EUR → 179.000 $)', () => {
    expect(usdHesapla(eur(), ETUYS_PARITE)).toBe(179000);
  });
  test('USD (ya da boş döviz) satırında miktar × birim fiyat', () => {
    expect(usdHesapla({ miktar: 2, birimFiyatiFob: 1500.5, doviz: 'USD' })).toBe(3001);
    expect(usdHesapla({ miktar: 2, birimFiyatiFob: 10, doviz: '' })).toBe(20);
  });
  test('parite bilinmiyorsa null (EUR tutarı dolar diye YAZILMAZ)', () => {
    expect(usdHesapla(eur())).toBeNull();
  });
  test('elle girilen $ korunur', () => {
    expect(usdHesapla(eur({ usdManuel: true, toplamUsd: 178500 }), ETUYS_PARITE)).toBe(178500);
  });
  test('TL dövizli makine: TL → $ paritesi', () => {
    expect(usdHesapla({ miktar: 1, birimFiyatiFob: 42000, doviz: 'TRY' }, 1 / 42)).toBe(1000);
  });
});

describe('tlHesapla', () => {
  test('EUR satırında TL dövizli toplam × EUR kuru (değişmedi)', () => {
    expect(tlHesapla(eur(), ETUYS_KUR)).toBe(5768631);
  });
  test('manuel kur dövizli toplama uygulanır, $ tutarına değil', () => {
    expect(tlHesapla(eur({ kurManuel: true, kurManuelDeger: 35, toplamUsd: 179000 }), 99)).toBe(5775000);
  });
  test('dolar satırında $ elle girildiyse TL o tutardan', () => {
    expect(tlHesapla({ miktar: 1, birimFiyatiFob: 100, doviz: 'USD', usdManuel: true, toplamUsd: 120 }, 40)).toBe(4800);
  });
  test('TL dövizi (eski kayıtlarda TRL) kur istemez; döviz yoksa hesaplanamaz', () => {
    expect(tlHesapla({ miktar: 2, birimFiyatiFob: 10.5, doviz: 'TRL' })).toBe(21);
    expect(tlHesapla({ miktar: 2, birimFiyatiFob: 10, doviz: '' }, 40)).toBeNull();
  });
  test('elle girilen TL korunur', () => {
    expect(tlHesapla(eur({ tlManuel: true, toplamTl: 5768630.85 }), 50)).toBe(5768630.85);
  });
});

describe('açılışta doldurma — kayıtlı tutar günlük kurla EZİLMEZ', () => {
  test('dolu TL kurla yeniden hesaplanmaz (fiyatlar kendi kendine değişmesin)', () => {
    const r = eur({ toplamUsd: 179000, toplamTl: 5768630.85 });
    expect(tlEksik(r)).toBe(false);
    expect(eksikTutarlariDoldur(r, { parite: 1.2, kur: 55 })).toBe(r); // aynı nesne: değişiklik yok
  });
  test('EUR tutarı dolar yazılmış eski satırın yalnız $ tutarı düzeltilir', () => {
    const r = eur({ toplamUsd: 165000, toplamTl: 5768630.85 });
    expect(usdCevrilmemis(r)).toBe(true);
    expect(usdEksik(r)).toBe(true);
    const s = eksikTutarlariDoldur(r, { parite: ETUYS_PARITE, kur: 55 });
    expect(s.toplamUsd).toBe(179000);
    expect(s.toplamTl).toBe(5768630.85);
  });
  test('E-TUYS’ten gelen (çevrilmiş) $ korunur', () => {
    const r = eur({ toplamUsd: 179000 });
    expect(usdEksik(r)).toBe(false);
  });
  test('boş tutarlar doldurulur; kur gelmediyse dokunulmaz', () => {
    const r = eur();
    expect(eksikTutarlariDoldur(r, {})).toBe(r);
    expect(eksikTutarlariDoldur(r, { parite: ETUYS_PARITE, kur: ETUYS_KUR })).toMatchObject({ toplamUsd: 179000, toplamTl: 5768631 });
  });
  test('dolar satırında formülle tutmayan $ düzeltilir (eski davranış)', () => {
    expect(usdEksik({ miktar: 2, birimFiyatiFob: 50, doviz: 'USD', toplamUsd: 90 })).toBe(true);
    expect(usdEksik({ miktar: 2, birimFiyatiFob: 50, doviz: 'USD', toplamUsd: 100 })).toBe(false);
  });
});

describe('ithalTutarlariniGuncelle — yalnız girdisi değişen tutar', () => {
  const kurlar = { parite: ETUYS_PARITE, kur: ETUYS_KUR };
  test('miktar değişince $ ve TL birlikte hesaplanır', () => {
    const s = ithalTutarlariniGuncelle(eur({ miktar: 2, toplamUsd: 179000, toplamTl: 5768630.85 }), ['miktar'], kurlar);
    expect(s.toplamUsd).toBe(358000);
    expect(s.toplamTl).toBe(11537262);
  });
  test('ilgisiz alan (ör. kullanılmış kodu) tutara dokunmaz', () => {
    const r = eur({ toplamUsd: 179000, toplamTl: 5768630.85 });
    const s = ithalTutarlariniGuncelle({ ...r, kullanilmisKod: '2' }, ['kullanilmisKod'], { parite: 2, kur: 99 });
    expect(s.toplamUsd).toBe(179000);
    expect(s.toplamTl).toBe(5768630.85);
  });
  test('manuel kur: TL o kurdan, $ değişmez, TL manuel işaretlenir', () => {
    const r = eur({ toplamUsd: 179000, toplamTl: 1, kurManuel: true, kurManuelDeger: 35 });
    const s = ithalTutarlariniGuncelle(r, ['kurManuel', 'kurManuelDeger'], { kur: 99 });
    expect(s).toMatchObject({ toplamUsd: 179000, toplamTl: 5775000, tlManuel: true });
  });
  test('kur bilinmiyorsa tutar 0 (doldurma adımı tamamlar) — EUR tutarı dolar YAZILMAZ', () => {
    const s = ithalTutarlariniGuncelle(eur({ toplamUsd: 179000 }), ['birimFiyatiFob'], {});
    expect(s.toplamUsd).toBe(0);
    expect(s.toplamTl).toBe(0);
  });
  test('dövizli toplam ve kur kodu yardımcıları', () => {
    expect(dovizliToplam({ miktar: '3', birimFiyatiFob: '2.5' })).toBe(7.5);
    expect(kurKodu('TRL')).toBe('TRY');
    expect(kurKodu('EUR')).toBe('EUR');
  });
});
