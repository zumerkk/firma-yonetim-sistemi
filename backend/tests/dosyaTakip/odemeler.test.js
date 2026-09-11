// 🧪 ÖDEMELER MODÜLÜ - model sözleşmesi
//
// Müşteri: "Ödemeler modülü birde zamanlama kısmının sağ tarafına yine,
//   1. Faturası ödendi-ödenmedi-kısmi ödendi seçeneği,
//   2. Harcı kim ödedi firma-biz seçimli ve süzmeli olsun ileride hangilerinin
//      harcını ödemişiz faturasını ödemiş mi ödememiş mi görebilelim.
//   Birde bunlara yine notlu dosya ekleyebilelim."
//
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
  // Varsayılan BOŞ olmalı: "henüz işaretlenmedi" ile "ödenmedi" farklı şeyler.
  // Varsayılanı 'odenmedi' yapmak, hiç dokunulmamış binlerce eski kaydı
  // "ödenmemiş" gibi raporlardı.
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
  test.each(['odendi', 'odenmedi', 'kismi_odendi'])('fatura durumu %s kabul edilir', (deger) => {
    const t = talepKur({ odeme: { faturaDurumu: deger } });
    expect(t.validateSync()?.errors?.['odeme.faturaDurumu']).toBeUndefined();
    expect(t.odeme.faturaDurumu).toBe(deger);
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

describe('odeme notları', () => {
  // "Kısmi ödendi" durumunun ayrıntısı buraya yazılıyor; tutar alanı bilinçli yok
  test('not yazılabilir', () => {
    const t = talepKur({ odeme: { faturaDurumu: 'kismi_odendi', notlar: 'Yarısı peşin alındı' } });
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
