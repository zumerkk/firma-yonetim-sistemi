// 🧪 TALEP AÇARKEN EVRAK SEÇİMİ - birim testleri
//
// Müşteri (sorunlar ve revizeler → "işlem evrak"):
//   "Belge içinde İstenen evrakları seçebilelim seçtiklerimiz maile eklensin,
//    şimdilik sadece işlem türü yönetiminde görünüyor, işlem başlatınca da
//    böyle bir sekme gibi vs şeklinde seçebilirsek çok iyi olur."
//
// Eskiden şablondaki evrakların TAMAMI talebe kopyalanıyordu; listeyi daraltmanın
// tek yolu talebi açıp tek tek silmekti. Artık talep açılırken seçiliyor.
//
// DB'siz: secimUygula saf bir fonksiyon, doğrudan çağrılıyor.

const { secimUygula, sablonKlasoru } = require('../../services/islemEvrak/islemEvrakService');

const EVRAKLAR = [
  { ad: 'SGK Borcu Yoktur' },                                  // 0 — koşulsuz
  { ad: 'Vergi Levhası' },                                     // 1 — koşulsuz
  { ad: 'Kapasite Raporu', kosulSoruId: 's_gelistirme', kosulDeger: 'EVET' },  // 2
  { ad: 'İnşaat Ruhsatı', kosulSoruId: 's_insaat', kosulDeger: 'EVET' }        // 3
];

const adlari = (liste) => liste.map((e) => e.ad);

describe('secimUygula - seçim yapılmadığında eski davranış', () => {
  test('indeks verilmezse koşulsuz evraklar aynen döner', () => {
    expect(adlari(secimUygula(EVRAKLAR, []))).toEqual(['SGK Borcu Yoktur', 'Vergi Levhası']);
  });

  test('null da "seçim yok" sayılır — bu alanı göndermeyen eski çağrılar bozulmaz', () => {
    expect(secimUygula(EVRAKLAR, [], null).length).toBe(2);
  });

  test('cevap verilince koşullu evrak da listeye girer', () => {
    const cevaplar = [{ soruId: 's_gelistirme', deger: 'EVET' }];
    expect(adlari(secimUygula(EVRAKLAR, cevaplar))).toContain('Kapasite Raporu');
  });
});

describe('secimUygula - kullanıcı seçimi', () => {
  test('yalnızca işaretlenen satırlar talebe girer', () => {
    expect(adlari(secimUygula(EVRAKLAR, [], [1]))).toEqual(['Vergi Levhası']);
  });

  test('seçim şablon sırasını korur (indeks sırası karışık verilse de)', () => {
    expect(adlari(secimUygula(EVRAKLAR, [], [1, 0]))).toEqual(['SGK Borcu Yoktur', 'Vergi Levhası']);
  });

  test('aralık dışı ve sayı olmayan indeksler sessizce elenir', () => {
    expect(adlari(secimUygula(EVRAKLAR, [], [0, 99, -1, 'abc']))).toEqual(['SGK Borcu Yoktur']);
  });

  // Sıra önemli: önce koşul, sonra seçim. Aksi halde kullanıcı "hayır" dediği bir
  // yatırım için 55 kalemlik listeyi indeksle geri çağırabilirdi.
  test('koşul yüzünden elenmiş satır indeksle geri getirilemez', () => {
    const secilen = secimUygula(EVRAKLAR, [], [0, 2]);
    expect(adlari(secilen)).toEqual(['SGK Borcu Yoktur']);
    expect(adlari(secilen)).not.toContain('Kapasite Raporu');
  });

  test('koşulu sağlanan satır seçilirse gelir', () => {
    const cevaplar = [{ soruId: 's_insaat', deger: 'EVET' }];
    expect(adlari(secimUygula(EVRAKLAR, cevaplar, [3]))).toEqual(['İnşaat Ruhsatı']);
  });

  // Boş dizi "hiçbiri" demektir ve neredeyse her zaman arayüz hatasıdır.
  // Sessizce evraksız talep üretmek, sonradan "mail boş gitti" olarak dönerdi.
  test('hepsi kaldırılmışsa hata verir, sessizce boş talep üretmez', () => {
    expect(() => secimUygula(EVRAKLAR, [], [])).toThrow(/En az bir evrak/);
  });

  test('geçerli indeks kalmadığında da hata verir', () => {
    expect(() => secimUygula(EVRAKLAR, [], [42, 43])).toThrow(/En az bir evrak/);
  });

  test('boş şablonda seçim verilmezse boş liste döner (hata değil)', () => {
    expect(secimUygula([], [])).toEqual([]);
    expect(secimUygula(undefined, [])).toEqual([]);
  });
});

describe('sablonKlasoru - şablon örnekleri talep klasörlerinden ayrı durur', () => {
  // Örnek dosyalar tek bir talebe değil TÜRE ait; talep klasörüne yazılsalardı
  // o talep silindiğinde şablonun örneği de giderdi.
  test('_Sablonlar altında ve işlem adına göre ayrışır', () => {
    expect(sablonKlasoru('ETUYS Yetkilendirme')).toBe('Islem_Evrak/_Sablonlar/ETUYS_Yetkilendirme');
  });

  test('ad boşsa da geçerli bir yol üretir', () => {
    expect(sablonKlasoru('')).toBe('Islem_Evrak/_Sablonlar/Islem');
  });
});
