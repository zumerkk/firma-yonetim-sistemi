// 🧪 Firmaya mail metni kurucusu
//
// Müşteri: "sadece eksikler ve uzmanların paylaştığı notları göndermek için...
// örn: 'Sayın …., <istenenler>' vs gibi."
//
// Metin kullanıcıya ÖNERİ olarak geliyor ve düzenlenebiliyor; yine de yanlış
// toplanırsa firmaya yanlış eksik listesi gider. Toplama kuralları burada sabit.

const { konuOner, govdeOner, alicilariOner, firmadanBeklenenler, uzmanNotlari } = require('../../services/dosyaTakip/firmaMailMetni');

const not = (metin, tarih) => ({ metin, tarih: tarih || new Date('2026-01-01') });

const talepKur = (yama = {}) => ({
  takipId: 'DT-2026-0042',
  firmaUnvan: 'TEST FİRMA A.Ş.',
  ...yama
});

describe('firmadanBeklenenler - yalnızca firmayı ilgilendirenler', () => {
  test('firmadan beklenen eksikler alınır', () => {
    const t = talepKur({
      muraacatSonrasi: { kurumEksik: { firmadanBeklenen: { beklenenEksikler: [not('Vergi levhası'), not('İmza sirküleri')] } } }
    });
    expect(firmadanBeklenenler(t)).toEqual(['Vergi levhası', 'İmza sirküleri']);
  });

  test('"hem firma hem bizden" grubu da dahil edilir', () => {
    const t = talepKur({
      muraacatSonrasi: { kurumEksik: {
        firmadanBeklenen: { beklenenEksikler: [not('Vergi levhası')] },
        hemFirmaHemBizden: { beklenenEksikler: [not('Kapasite raporu')] }
      } }
    });
    expect(firmadanBeklenenler(t)).toEqual(['Vergi levhası', 'Kapasite raporu']);
  });

  // Bilinçli dışarıda: "bizden beklenen" bir eksiği firmaya sormak kafa karıştırır
  test('yalnızca BİZDEN beklenenler listeye girmez', () => {
    const t = talepKur({
      muraacatSonrasi: { kurumEksik: { bizdenBeklenen: { beklenenEksikler: [not('İç yazışma')] } } }
    });
    expect(firmadanBeklenenler(t)).toEqual([]);
  });

  test('boş metinli notlar elenir', () => {
    const t = talepKur({
      muraacatSonrasi: { kurumEksik: { firmadanBeklenen: { beklenenEksikler: [not('  '), not('Gerçek')] } } }
    });
    expect(firmadanBeklenenler(t)).toEqual(['Gerçek']);
  });

  test('hiç eksik yoksa boş dizi (çökmez)', () => {
    expect(firmadanBeklenenler(talepKur())).toEqual([]);
    expect(firmadanBeklenenler(undefined)).toEqual([]);
  });
});

describe('uzmanNotlari - en yeniden eskiye', () => {
  test('notlar tarihe göre sıralanır', () => {
    const t = talepKur({
      muraacatOncesi: { gorusmeNotlari: [not('Eski', new Date('2026-01-01')), not('Yeni', new Date('2026-06-01'))] }
    });
    expect(uzmanNotlari(t)).toEqual(['Yeni', 'Eski']);
  });

  test('farklı aşamalardaki notlar birleşir', () => {
    const t = talepKur({
      muraacatOncesi: { gorusmeNotlari: [not('Ön görüşme', new Date('2026-01-01'))] },
      kurumSonuclanma: { sonucNotlari: [not('Sonuç', new Date('2026-05-01'))] }
    });
    expect(uzmanNotlari(t)).toEqual(['Sonuç', 'Ön görüşme']);
  });

  // Firmaya 40 notluk bir duvar göndermek istemiyoruz
  test('en fazla 5 not alınır', () => {
    const cok = Array.from({ length: 9 }, (_, i) => not(`Not ${i}`, new Date(2026, i, 1)));
    const t = talepKur({ muraacatOncesi: { gorusmeNotlari: cok } });
    expect(uzmanNotlari(t)).toHaveLength(5);
  });
});

describe('govdeOner', () => {
  test('selamla başlar ve eksikleri numaralar', () => {
    const t = talepKur({
      muraacatSonrasi: { kurumEksik: { firmadanBeklenen: { beklenenEksikler: [not('Vergi levhası'), not('SGK yazısı')] } } }
    });
    const govde = govdeOner(t);
    expect(govde).toMatch(/^Sayın Yetkili,/);
    expect(govde).toContain('1. Vergi levhası');
    expect(govde).toContain('2. SGK yazısı');
  });

  test('notlar ayrı başlık altında listelenir', () => {
    const t = talepKur({ muraacatOncesi: { gorusmeNotlari: [not('Dosya hazır')] } });
    const govde = govdeOner(t);
    expect(govde).toContain('Notlar:');
    expect(govde).toContain('- Dosya hazır');
  });

  // Kullanıcı boş bir kutuya bakmasın; iskelet her zaman dönsün
  test('hiç içerik yoksa da kullanılabilir metin döner', () => {
    const govde = govdeOner(talepKur());
    expect(govde).toMatch(/Sayın Yetkili,/);
    expect(govde).toMatch(/Bilginize sunarız\./);
  });

  test('imza verilirse sona eklenir', () => {
    const govde = govdeOner(talepKur(), { imza: 'GM Planlama' });
    expect(govde.trimEnd().endsWith('GM Planlama')).toBe(true);
  });

  test('imza boşsa fazladan satır bırakmaz', () => {
    expect(govdeOner(talepKur(), { imza: '   ' })).not.toMatch(/\n\n$/);
  });
});

// Müşteri (15.09.2026): "Konu kısmına belge no ve talep türü de ekleyebilir miyiz? bu - DT2026253-
// kısmını kaldırabiliriz firmanın görmesine gerek yok."
describe('konuOner', () => {
  test('belge no ve talep türü konuya girer, takip no girmez', () => {
    const konu = konuOner(talepKur({ ytbNo: '568825', talepTuru: 'Destek Unsuru Revize Talebi' }));
    expect(konu).toBe('Belge No: 568825 — Destek Unsuru Revize Talebi — TEST FİRMA A.Ş.');
    expect(konu).not.toContain('DT-2026-0042');
  });

  // belgeId sistemin iç kimliği; firmaya "belge no" diye gösterilmemeli
  test('yalnız belgeId varsa belge no yazılmaz', () => {
    expect(konuOner(talepKur({ belgeId: '1234567', talepTuru: 'Süre Revize Talebi' })))
      .toBe('Süre Revize Talebi — TEST FİRMA A.Ş.');
  });

  test('eksik alanlar konuyu bozmaz', () => {
    expect(konuOner({})).toBe('Belge Takip');
  });
});

describe('govdeOner — yükleme bağlantısı', () => {
  test('bağlantı verilirse metne girer', () => {
    const govde = govdeOner(talepKur(), { yuklemeLinki: 'https://gmplansis.com/belge-yukle/568825-Ab12Cd34Ef' });
    expect(govde).toContain('Evrakları aşağıdaki bağlantıdan yükleyebilirsiniz:\nhttps://gmplansis.com/belge-yukle/568825-Ab12Cd34Ef');
    expect(govde).toMatch(/Bilginize sunarız\./);
  });

  test('bağlantı yoksa satırı da yok', () => {
    expect(govdeOner(talepKur())).not.toContain('bağlantıdan');
  });
});

describe('alicilariOner', () => {
  const firma = {
    firmaEmail: '',
    yetkiliKisiler: [
      { adSoyad: 'Ayşe Yılmaz', eposta1: 'ayse@cinar.com.tr', eposta2: '' },
      { adSoyad: 'Mehmet Kaya', eposta1: 'Mehmet@Cinar.com.tr', eposta2: 'gecersiz-adres' }
    ]
  };

  // Canlıda firmaların çoğunda adres yalnız yetkili kişilerde; eski taslak bu firmalarda boş geliyordu
  test('ilk mailde firma e-postası boşsa yetkili kişilerin adresleri gelir', () => {
    expect(alicilariOner({ firma })).toEqual({
      alici: 'ayse@cinar.com.tr, mehmet@cinar.com.tr',
      cc: '',
      oneriler: [
        { adres: 'ayse@cinar.com.tr', etiket: 'Ayşe Yılmaz' },
        { adres: 'mehmet@cinar.com.tr', etiket: 'Mehmet Kaya' }
      ]
    });
  });

  test('firma e-postası önce gelir, aynı adres iki kez önerilmez', () => {
    const sonuc = alicilariOner({ firma: { ...firma, firmaEmail: 'AYSE@cinar.com.tr' } });
    expect(sonuc.alici).toBe('ayse@cinar.com.tr, mehmet@cinar.com.tr');
    expect(sonuc.oneriler[0]).toEqual({ adres: 'ayse@cinar.com.tr', etiket: 'Firma e-postası' });
    expect(sonuc.oneriler).toHaveLength(2);
  });

  test('daha önce mail gönderildiyse en son kullanılan alıcılar ve CC hatırlanır', () => {
    const gecmis = [
      { alicilar: ['eski@cinar.com.tr'], cc: [], tarih: new Date('2026-08-01') },
      { alicilar: ['muhasebe@cinar.com.tr'], cc: ['ayse@cinar.com.tr'], tarih: new Date('2026-09-10') }
    ];
    const sonuc = alicilariOner({ firma, gecmis });
    expect(sonuc.alici).toBe('muhasebe@cinar.com.tr');
    expect(sonuc.cc).toBe('ayse@cinar.com.tr');
    expect(sonuc.oneriler.map((o) => o.adres)).toEqual([
      'ayse@cinar.com.tr', 'mehmet@cinar.com.tr', 'muhasebe@cinar.com.tr', 'eski@cinar.com.tr'
    ]);
    expect(sonuc.oneriler[2].etiket).toBe('Daha önce kullanıldı');
    expect(gecmis[0].alicilar).toEqual(['eski@cinar.com.tr']); // girdi sıralaması bozulmaz
  });

  test('hiç adres yoksa boş döner (çökmez)', () => {
    expect(alicilariOner({})).toEqual({ alici: '', cc: '', oneriler: [] });
    expect(alicilariOner({ firma: null, gecmis: [null] })).toEqual({ alici: '', cc: '', oneriler: [] });
  });
});
