const { normalizeMakineKalemi, validateMakineKalemi, mergeMakineListesi } = require('../../services/ingest/ingestors/MakineListeIngestor');
const { classify } = require('../../services/ingest/classifier');

describe('Makine Listesi ingestor - sayı biçimi ayrıştırma (regresyon)', () => {
  // Kök bug: farklı kaynaklar farklı sayı biçimleri kullanır — ETUYS ham (düz
  // noktalı ondalık), sistem export'u (İngilizce, virgül=binlik/nokta=ondalık),
  // elle giriş (TR, nokta=binlik/virgül=ondalık). Tek bir formatı varsaymak
  // veri bozulmasına yol açar.
  test('ETUYS ham biçimi (düz noktalı ondalık) doğru ayrıştırılır', () => {
    const n = normalizeMakineKalemi(
      { 'Adı ve Özelliği': 'X', Miktarı: '1', 'Toplam Tutar (FOBTL)': '1866962.03' },
      'ithal'
    );
    expect(n.toplamTutarFobTl).toBeCloseTo(1866962.03, 2);
  });

  test('sistem export biçimi (İngilizce, virgül=binlik) doğru ayrıştırılır', () => {
    const n = normalizeMakineKalemi(
      { 'Adı ve Özelliği': 'X', Miktarı: '1', 'Toplam ($)': '66,430.00' },
      'ithal'
    );
    expect(n.toplamTutarFobUsd).toBe(66430);
  });

  test('TR biçimi (elle giriş, nokta=binlik/virgül=ondalık) doğru ayrıştırılır', () => {
    const n = normalizeMakineKalemi(
      { 'Adı ve Özelliği': 'X', Miktarı: '1', 'Toplam Tutarı': '1.866.962,03' },
      'yerli'
    );
    expect(n.toplamTutariTl).toBeCloseTo(1866962.03, 2);
  });

  test('toplam tutar boşsa birim fiyatı × miktar ile telafi edilir (kaynak veri eksikse)', () => {
    const n = normalizeMakineKalemi(
      { 'Adı ve Özelliği': 'X', Miktarı: '2', 'Birim Fiyatı (TL)': '450000' },
      'yerli'
    );
    expect(n.toplamTutariTl).toBe(900000);
  });
});

describe('Makine Listesi ingestor - normalize + validate', () => {
  test('üç farklı kaynak formatı aynı sonucu üretir (isim/miktar/tutar)', () => {
    const etuysHam = { 'Sıra No': '1', 'Adı ve Özelliği': 'BUHARLI STERİLİZATÖR', Miktarı: '2', Birim: 'ADET(UNIT)', 'Toplam Tutarı': '900000', 'KDV İstisnası': 'EVET' };
    const etuysDuzenlenmis = { 'Sıra No': '1', 'Makine ID': '3454688', 'Adı ve Özelliği': 'BUHARLI STERİLİZATÖR', Miktarı: '2', Birim: 'ADET(UNIT)', 'Toplam Tutarı': '900000', 'KDV İstisnası': 'EVET' };
    const sistemExport = { 'Sıra No': '1', 'Makine ID': '3454688', 'Adı ve Özelliği': 'BUHARLI STERİLİZATÖR', Miktarı: '2', Birimi: 'ADET(UNIT)', 'Birim Fiyatı (TL)': '450,000.00', 'KDV Muafiyeti': 'EVET' };

    const a = normalizeMakineKalemi(etuysHam, 'yerli');
    const b = normalizeMakineKalemi(etuysDuzenlenmis, 'yerli');
    const c = normalizeMakineKalemi(sistemExport, 'yerli');

    expect(a.toplamTutariTl).toBe(900000);
    expect(b.toplamTutariTl).toBe(900000);
    expect(c.toplamTutariTl).toBe(900000); // birim fiyatı × miktar fallback'i
    expect(b.makineId).toBe('3454688');
    expect(c.makineId).toBe('3454688');
  });

  test('isim veya miktar eksikse validate hata döner', () => {
    expect(validateMakineKalemi(normalizeMakineKalemi({ Miktarı: '1' }, 'yerli')).length).toBeGreaterThan(0);
    expect(validateMakineKalemi(normalizeMakineKalemi({ 'Adı ve Özelliği': 'X', Miktarı: '0' }, 'yerli')).length).toBeGreaterThan(0);
  });
});

describe('Makine Listesi ingestor - merge (ekle/güncelle/dokunma)', () => {
  test('isim eşleşen kalem güncellenir, eşleşmeyen yeni eklenir, dosyada olmayana dokunulmaz', () => {
    const existing = [
      { rowId: 'r1', siraNo: 1, adiVeOzelligi: 'Buharlı Sterilizatör', miktar: 2, toplamTutariTl: 100, talep: { durum: 'bakanliga_gonderildi' }, etuysSecili: true },
      { rowId: 'r2', siraNo: 2, adiVeOzelligi: 'Dosyada Geçmeyen Makine', miktar: 1, toplamTutariTl: 5000 },
    ];
    const yeni = [
      normalizeMakineKalemi({ 'Adı ve Özelliği': 'BUHARLI STERİLİZATÖR', Miktarı: '2', 'Toplam Tutarı': '900000' }, 'yerli'), // aynı isim, farklı yazım
      normalizeMakineKalemi({ 'Adı ve Özelliği': 'Yeni Makine', Miktarı: '1', 'Toplam Tutarı': '1000' }, 'yerli'),
    ];

    const { list, created, updated } = mergeMakineListesi(existing, yeni);

    expect(created).toBe(1);
    expect(updated).toBe(1);
    expect(list).toHaveLength(3);

    const guncellenen = list.find((x) => x.rowId === 'r1');
    expect(guncellenen.toplamTutariTl).toBe(900000); // güncellendi
    expect(guncellenen.talep.durum).toBe('bakanliga_gonderildi'); // korundu
    expect(guncellenen.etuysSecili).toBe(true); // korundu

    const dokunulmayan = list.find((x) => x.rowId === 'r2');
    expect(dokunulmayan.toplamTutariTl).toBe(5000); // dosyada yoktu, aynen kaldı

    const yeniEklenen = list.find((x) => x.adiVeOzelligi === 'Yeni Makine');
    expect(yeniEklenen.siraNo).toBe(3); // mevcut sıralarla çakışmadan devam etti
  });
});

describe('Makine Listesi classifier', () => {
  test('Adı ve Özelliği + Miktarı + tutar sinyali ile MAKINE_LIST olarak tanınır', () => {
    const c = classify({ headers: ['Sıra No', 'Adı ve Özelliği', 'Miktarı', 'Birim', 'Toplam Tutarı'] });
    expect(c.module).toBe('MAKINE_LIST');
  });

  test('makine sinyali yoksa diğer modülleri etkilemez (Firma)', () => {
    const c = classify({ headers: ['Vergi No', 'Tam Ünvan', 'Adres', 'İl', 'İlk İrtibat'] });
    expect(c.module).toBe('FIRMA');
  });
});
