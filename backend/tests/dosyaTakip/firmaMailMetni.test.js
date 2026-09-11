// 🧪 Firmaya mail metni kurucusu
//
// Müşteri: "sadece eksikler ve uzmanların paylaştığı notları göndermek için...
// örn: 'Sayın …., <istenenler>' vs gibi."
//
// Metin kullanıcıya ÖNERİ olarak geliyor ve düzenlenebiliyor; yine de yanlış
// toplanırsa firmaya yanlış eksik listesi gider. Toplama kuralları burada sabit.

const { konuOner, govdeOner, firmadanBeklenenler, uzmanNotlari } = require('../../services/dosyaTakip/firmaMailMetni');

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

describe('konuOner', () => {
  test('takip no ve firma unvanı konuya girer', () => {
    expect(konuOner(talepKur())).toBe('Belge Takip — DT-2026-0042 — TEST FİRMA A.Ş.');
  });

  test('eksik alanlar konuyu bozmaz', () => {
    expect(konuOner({})).toBe('Belge Takip');
  });
});
