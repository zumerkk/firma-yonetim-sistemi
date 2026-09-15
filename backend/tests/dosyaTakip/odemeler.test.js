// 🧪 ÖDEMELER MODÜLÜ - model sözleşmesi
//
// Müşteri (ilk istek): "Ödemeler modülü birde zamanlama kısmının sağ tarafına yine,
//   1. Faturası ödendi-ödenmedi-kısmi ödendi seçeneği,
//   2. Harcı kim ödedi firma-biz seçimli ve süzmeli olsun ileride hangilerinin
//      harcını ödemişiz faturasını ödemiş mi ödememiş mi görebilelim.
//   Birde bunlara yine notlu dosya ekleyebilelim."
// Müşteri (15.09.2026): "Ödemeler kısmında fatura durumunu ödendi-ödenmedi-kısmi ödendi
//   yerine 'kesildi-kesilmedi-avans' olarak güncelleyebilir miyiz."
//
// Tutar/tarih/banka taşıyan ödeme hareketleri ayrı defterde: models/CariHareket.js
// DB'siz: model örneği bellekte kurulup doğrulanıyor.

const DosyaTakip = require('../../models/DosyaTakip');

// Zorunlu alanlar gerçek değerlerle doldurulmalı: aksi halde validateSync()
// ödeme alanlarıyla ilgisiz hatalar döner ve test yanlış yerde patlar.
const talepKur = (yama = {}) => new DosyaTakip({
  firma: '000000000000000000000001',
  firmaUnvan: 'TEST FİRMA A.Ş.',
  talepTuru: 'Belge Başvuru Talebi',
  ...yama
});

describe('odeme bloğu - varsayılanlar', () => {
  // Varsayılan BOŞ olmalı: "henüz işaretlenmedi" ile "kesilmedi" farklı şeyler.
  // Varsayılanı 'kesilmedi' yapmak, hiç dokunulmamış yüzlerce eski kaydı
  // "faturası kesilmemiş" gibi raporlardı.
  test('yeni talepte fatura durumu ve harcı ödeyen boş gelir', () => {
    const t = talepKur();
    expect(t.odeme.faturaDurumu).toBe('');
    expect(t.odeme.harciOdeyen).toBe('');
    expect(t.odeme.notlar).toBe('');
  });

  test('boş değerler doğrulamadan geçer', () => {
    expect(talepKur().validateSync()?.errors?.['odeme.faturaDurumu']).toBeUndefined();
  });
});

describe('odeme bloğu - izinli değerler', () => {
  test.each(['kesildi', 'kesilmedi', 'avans'])('fatura durumu %s kabul edilir', (deger) => {
    const t = talepKur({ odeme: { faturaDurumu: deger } });
    expect(t.validateSync()?.errors?.['odeme.faturaDurumu']).toBeUndefined();
    expect(t.odeme.faturaDurumu).toBe(deger);
  });

  // Eski değerler yeni kayda yazılamaz; mevcut kayıtlar açılışta taşınıyor
  test.each(['odendi', 'odenmedi', 'kismi_odendi'])('eski fatura durumu %s artık reddedilir', (deger) => {
    const t = talepKur({ odeme: { faturaDurumu: deger } });
    expect(t.validateSync()?.errors?.['odeme.faturaDurumu']).toBeDefined();
  });

  test.each(['firma', 'biz'])('harcı ödeyen %s kabul edilir', (deger) => {
    const t = talepKur({ odeme: { harciOdeyen: deger } });
    expect(t.validateSync()?.errors?.['odeme.harciOdeyen']).toBeUndefined();
  });

  // Serbest metin girilirse rapor/süzme bozulur; enum bunu engelliyor
  test('tanımsız fatura durumu reddedilir', () => {
    const t = talepKur({ odeme: { faturaDurumu: 'belki' } });
    expect(t.validateSync()?.errors?.['odeme.faturaDurumu']).toBeDefined();
  });

  test('tanımsız ödeyen reddedilir', () => {
    const t = talepKur({ odeme: { harciOdeyen: 'baskasi' } });
    expect(t.validateSync()?.errors?.['odeme.harciOdeyen']).toBeDefined();
  });
});

describe('eski → yeni fatura durumu eşleştirmesi (açılış migrasyonu)', () => {
  // Eşleştirmede geçersiz bir hedef olsaydı migrasyon kayıtları yeniden
  // doğrulanamaz hale getirir, o talepler hiç kaydedilemezdi
  test('her eski değerin geçerli bir yeni karşılığı var', () => {
    const eslesme = DosyaTakip.FATURA_DURUMU_ESLESTIRME;
    expect(eslesme).toEqual({ odendi: 'kesildi', odenmedi: 'kesilmedi', kismi_odendi: 'avans' });
    Object.values(eslesme).forEach((yeni) => {
      const t = talepKur({ odeme: { faturaDurumu: yeni } });
      expect(t.validateSync()?.errors?.['odeme.faturaDurumu']).toBeUndefined();
    });
  });
});

describe('odeme notları', () => {
  test('not yazılabilir', () => {
    const t = talepKur({ odeme: { faturaDurumu: 'avans', notlar: 'Yarısı peşin alındı' } });
    expect(t.validateSync()).toBeUndefined();
    expect(t.odeme.notlar).toBe('Yarısı peşin alındı');
  });

  test('1000 karakteri aşan not reddedilir', () => {
    const t = talepKur({ odeme: { notlar: 'x'.repeat(1001) } });
    expect(t.validateSync()?.errors?.['odeme.notlar']).toBeDefined();
  });
});

describe('Ödeme Belgesi dosya türü', () => {
  // Müşteri: "Birde bunlara yine notlu dosya ekleyebilelim."
  // Dosya şemasındaki `aciklama` alanı not yazmaya zaten izin veriyor;
  // eksik olan tek şey ödeme evrakını ayırt edecek kategoriydi.
  test('dekont/fatura bu kategoriyle yüklenebilir', () => {
    const t = talepKur({
      dosyalar: [{
        dosyaAdi: 'dekont.pdf',
        dosyaYolu: '/x/dekont.pdf',
        kategori: 'Ödeme Belgesi',
        aciklama: 'Harç dekontu — firma ödedi'
      }]
    });
    expect(t.validateSync()).toBeUndefined();
    expect(t.dosyalar[0].kategori).toBe('Ödeme Belgesi');
    expect(t.dosyalar[0].aciklama).toMatch(/Harç dekontu/);
  });

  test('uydurma kategori hâlâ reddedilir', () => {
    const t = talepKur({
      dosyalar: [{ dosyaAdi: 'x.pdf', dosyaYolu: '/x.pdf', kategori: 'Uydurma Tür' }]
    });
    expect(t.validateSync()).toBeDefined();
  });
});
