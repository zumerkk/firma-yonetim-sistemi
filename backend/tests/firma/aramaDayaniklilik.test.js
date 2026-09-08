// 🧪 FİRMA ARAMASI — DAYANIKLILIK
// DB'siz çalışır: regex üreteci ve model statiğinin ürettiği sorgu doğrulanır.
//
// Kapsanan müşteri şikayeti (8 Eylül 2026, Ankara ofisi):
//   "Firma listesinde ROCA TR BANYO diye bir firma var ama arama butonundan
//    gelmiyor" ... "çıkıp girince oldu" ... "neden böyle olur?"
//
// Ölçülen iki sebep:
//   1) ÇİFT BOŞLUK. Terim olduğu gibi regex'e çevriliyordu; controller'daki
//      trim() yalnız baş/sonu kırpar, içerideki fazla boşluğu değil.
//         "ROCA TR BANYO" → 1 sonuç      "ROCA  TR" → 0 sonuç
//   2) `aktif: true` SABİT KODLUYDU. Liste ucu `aktif=all` kabul edip pasifleri
//      gösterebiliyordu, arama gösteremiyordu. Üretimde 1257 firmanın 66'sı
//      pasif: listede görünüp aramada hiç çıkmıyorlardı.

const { createTurkishInsensitiveRegex } = require('../../utils/turkishUtils');

const HEDEF = 'ROCA TR BANYO ANONİM ŞİRKETİ';

describe('Arama regexi — boşluk esnekliği', () => {
  test.each([
    ['tek boşluk',        'ROCA TR BANYO'],
    ['ÇİFT boşluk',       'ROCA  TR BANYO'],
    ['üç boşluk',         'ROCA   TR'],
    ['sekme',             'ROCA\tTR'],
    ['baş/son boşluk',    '  ROCA TR  '],
    ['küçük harf',        'roca tr banyo'],
    ['karışık boşluklar', 'ROCA  TR   BANYO']
  ])('%s ile bulunur', (_ad, terim) => {
    expect(createTurkishInsensitiveRegex(terim).test(HEDEF)).toBe(true);
  });

  test('Türkçe karakter duyarsızlığı korunuyor', () => {
    expect(createTurkishInsensitiveRegex('anonim sirketi').test(HEDEF)).toBe(true);
    expect(createTurkishInsensitiveRegex('ANONİM ŞİRKETİ').test(HEDEF)).toBe(true);
  });

  test('alakasız terim yine de eşleşmez — kural fazla geniş değil', () => {
    expect(createTurkishInsensitiveRegex('VESTEL').test(HEDEF)).toBe(false);
    // Boşluk esnek ama SIRA korunuyor: "BANYO ROCA" ters sırada, eşleşmemeli
    expect(createTurkishInsensitiveRegex('BANYO ROCA').test(HEDEF)).toBe(false);
  });

  test('regex metakarakterleri patlatmaz', () => {
    for (const terim of ['ROCA (TR)', 'a.b', 'C++', 'x[y]', 'a|b', '^$']) {
      expect(() => createTurkishInsensitiveRegex(terim)).not.toThrow();
    }
  });

  test('nokta joker değil — "a.b" gerçek noktayı arar', () => {
    expect(createTurkishInsensitiveRegex('a.b').test('axb')).toBe(false);
    expect(createTurkishInsensitiveRegex('a.b').test('a.b')).toBe(true);
  });
});

describe('Firma.searchFirmalar — aktif filtresi sözleşmesi', () => {
  // Model statiğini DB'siz sınamak için `this.find`'ı yakalıyoruz.
  const Firma = require('../../models/Firma');

  const yakala = (terim, aktifFiltresi) => {
    let yakalanan = null;
    const sahte = {
      find(sorgu) { yakalanan = sorgu; return { sort: () => ({}) }; }
    };
    if (aktifFiltresi === undefined) {
      Firma.searchFirmalar.call(sahte, terim);
    } else {
      Firma.searchFirmalar.call(sahte, terim, aktifFiltresi);
    }
    return yakalanan;
  };

  test('varsayılan YALNIZ aktifleri arar — eski davranış korunuyor', () => {
    expect(yakala('ROCA')).toMatchObject({ aktif: true });
  });

  test('boş filtre geçilince aktiflik kısıtı KALKAR (aktif=all)', () => {
    expect(yakala('ROCA', {})).not.toHaveProperty('aktif');
  });

  test('aktif:false geçilince yalnız pasifleri arar', () => {
    expect(yakala('ROCA', { aktif: false })).toMatchObject({ aktif: false });
  });

  test('aranan alanlar değişmedi', () => {
    const sorgu = yakala('ROCA');
    expect(sorgu.$or.map((k) => Object.keys(k)[0]))
      .toEqual(['tamUnvan', 'firmaId', 'vergiNoTC', 'ilkIrtibatKisi']);
  });
});
