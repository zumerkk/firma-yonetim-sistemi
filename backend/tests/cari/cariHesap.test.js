// 🧪 CARİ HESAP — saf hesap kuralları
//
// Müşteri: "gelen(banka tutar)-gideni(ödenen tutar) yeşil/kırmızı" ve
// "Firma seçince ödeme takip listesi gelsin ödenen tutar-kalan vs gibi klasik cari tablo".
// Bakiye formülü müşterinin kendi Excel'inden: TUTAR + MAKBUZ/DEKONT − ÖDEME GELEN.

const {
  HAREKET_TURLERI, BANKALAR, tutarCoz, tarihCoz,
  ozetHesapla, defterOlustur, firmaOzetleriniKatla
} = require('../../services/cari/cariHesap');

describe('sabitler', () => {
  test('bankalar müşterinin saydığı sırayla', () => {
    expect(BANKALAR).toEqual(['Enpara', 'Garanti', 'Vakıf', 'Ziraat', 'Diğer']);
  });

  test('üç hareket türü var', () => {
    expect(HAREKET_TURLERI).toEqual(['fatura', 'odenen', 'gelen']);
  });
});

describe('tutarCoz - kullanıcının yazdığı tutar', () => {
  test.each([
    ['24000', 24000],
    ['24.000', 24000], // müşterinin Excel notundaki yazım: "24.000 FATURA İPTAL"
    ['24.000,50', 24000.5],
    ['1.234.567,89', 1234567.89],
    ['1,234.56', 1234.56], // İngilizce biçimli Excel'den yapıştırma
    ['24,000', 24000],
    ['12,5', 12.5],
    ['12,50', 12.5],
    ['12.5', 12.5],
    ['1.500 TL', 1500],
    ['₺ 750,25', 750.25],
    [' 99 ', 99],
    [1250.456, 1250.46],
    [300, 300]
  ])('%p → %p', (girdi, beklenen) => {
    expect(tutarCoz(girdi)).toBe(beklenen);
  });

  // Belirsiz yazım TAHMİN EDİLMEZ: "1234.567" binlik mi ondalık mı bilinemez;
  // yanlış tahmin bin kat hatalı bakiye demek
  test.each([
    [''], ['   '], [null], [undefined], ['abc'], ['1.23.4'], ['12,3,4'],
    ['1234.567'], ['12.34,56'], ['12,'], ['--5'], [NaN], [Infinity]
  ])('%p anlaşılamaz → null', (girdi) => {
    expect(tutarCoz(girdi)).toBeNull();
  });
});

describe('tarihCoz', () => {
  const beklenen = Date.UTC(2026, 8, 15);

  test.each(['2026-09-15', '15.09.2026', '15/09/2026', '2026-09-15T00:00:00.000Z'])('%p → 15 Eylül 2026', (girdi) => {
    expect(tarihCoz(girdi).getTime()).toBe(beklenen);
  });

  // Date 31 Şubat'ı sessizce 3 Mart yapar; kayıt yanlış güne düşmesin
  test.each(['31.02.2026', '2026-13-01', '15.09.1850', 'abc', '', null])('%p geçersiz → null', (girdi) => {
    expect(tarihCoz(girdi)).toBeNull();
  });

  test('Date nesnesi olduğu gibi kabul edilir', () => {
    const d = new Date(beklenen);
    expect(tarihCoz(d)).toBe(d);
  });
});

describe('ozetHesapla', () => {
  test('boş defter sıfır', () => {
    expect(ozetHesapla([])).toEqual({
      toplamFatura: 0, toplamOdenen: 0, toplamGelen: 0, bakiye: 0, fark: 0, adet: 0
    });
  });

  test('klasik cari bakiye: fatura + ödenen − gelen', () => {
    const o = ozetHesapla([
      { tur: 'fatura', tutar: 24000 },
      { tur: 'odenen', tutar: 1500.25 },
      { tur: 'gelen', tutar: 20000 },
      { tur: 'gelen', tutar: 5500.25 }
    ]);
    expect(o.toplamFatura).toBe(24000);
    expect(o.toplamOdenen).toBe(1500.25);
    expect(o.toplamGelen).toBe(25500.25);
    expect(o.bakiye).toBe(0); // hesap kapandı
    expect(o.adet).toBe(4);
  });

  test('talep sekmesindeki fark: gelen − giden', () => {
    const o = ozetHesapla([{ tur: 'gelen', tutar: 10000 }, { tur: 'odenen', tutar: 2500 }]);
    expect(o.fark).toBe(7500);
  });

  test('borçlu firma pozitif, fazla ödeme negatif bakiye', () => {
    expect(ozetHesapla([{ tur: 'fatura', tutar: 1000 }, { tur: 'gelen', tutar: 400 }]).bakiye).toBe(600);
    expect(ozetHesapla([{ tur: 'gelen', tutar: 1000 }]).bakiye).toBe(-1000);
  });

  // Kuruş hesabı olmasa 0.1 + 0.2 = 0.30000000000000004 çıkar ve kapanmış hesap
  // ekranda "0,00 borç" yerine kuruşluk artıkla görünürdü
  test('kayan nokta artığı bırakmaz', () => {
    const on = Array.from({ length: 10 }, () => ({ tur: 'gelen', tutar: 0.1 }));
    expect(ozetHesapla(on).toplamGelen).toBe(1);
    const o = ozetHesapla([{ tur: 'odenen', tutar: 0.3 }, { tur: 'gelen', tutar: 0.1 }, { tur: 'gelen', tutar: 0.2 }]);
    expect(o.bakiye).toBe(0);
  });

  test('tanınmayan tür sayılmaz (prototip adları dahil)', () => {
    const o = ozetHesapla([{ tur: 'toString', tutar: 5 }, { tur: 'x', tutar: 5 }, null, { tur: 'gelen', tutar: 5 }]);
    expect(o.adet).toBe(1);
    expect(o.toplamGelen).toBe(5);
  });
});

describe('defterOlustur', () => {
  const hareketler = [
    { _id: 'c', tur: 'gelen', tutar: 1200, tarih: '2026-03-01', createdAt: '2026-03-01T10:00:00Z' },
    { _id: 'a', tur: 'fatura', tutar: 1000, tarih: '2026-01-10', createdAt: '2026-01-10T09:00:00Z' },
    { _id: 'b', tur: 'odenen', tutar: 200, tarih: '2026-01-10', createdAt: '2026-01-10T12:00:00Z' }
  ];

  test('tarihe, aynı günde giriş sırasına göre dizer', () => {
    expect(defterOlustur(hareketler).map((h) => h._id)).toEqual(['a', 'b', 'c']);
  });

  test('her satır o ana kadarki bakiyeyi taşır', () => {
    expect(defterOlustur(hareketler).map((h) => h.bakiye)).toEqual([1000, 1200, 0]);
  });

  test('girdiyi değiştirmez', () => {
    const kopya = JSON.parse(JSON.stringify(hareketler));
    defterOlustur(hareketler);
    expect(hareketler).toEqual(kopya);
  });
});

describe('firmaOzetleriniKatla', () => {
  const g = (firma, tur, toplam, extra = {}) => ({ _id: { firma, tur }, toplam, adet: 1, ...extra });

  test('firma başına toplar ve Türkçe alfabeye göre dizer', () => {
    const sonuc = firmaOzetleriniKatla([
      g('f2', 'fatura', 5000, { firmaUnvan: 'ÇINAR A.Ş.' }),
      g('f1', 'fatura', 1000, { firmaUnvan: 'CAN LTD.' }),
      g('f1', 'gelen', 400, { firmaUnvan: 'CAN LTD.' }),
      g('f3', 'odenen', 50, { firmaUnvan: 'DEMİR A.Ş.' })
    ]);
    expect(sonuc.map((f) => f.firmaUnvan)).toEqual(['CAN LTD.', 'ÇINAR A.Ş.', 'DEMİR A.Ş.']);
    expect(sonuc[0]).toMatchObject({ firma: 'f1', toplamFatura: 1000, toplamGelen: 400, bakiye: 600, adet: 2 });
  });

  test('son hareket tarihi en yenisi', () => {
    const [f] = firmaOzetleriniKatla([
      g('f1', 'fatura', 1, { firmaUnvan: 'A', sonTarih: new Date('2026-01-01') }),
      g('f1', 'gelen', 1, { firmaUnvan: 'A', sonTarih: new Date('2026-05-01') })
    ]);
    expect(f.sonHareketTarihi.toISOString()).toBe('2026-05-01T00:00:00.000Z');
  });

  test('bozuk grupları atlar', () => {
    expect(firmaOzetleriniKatla([null, { _id: {} }, g('f1', 'bilinmeyen', 5)])).toEqual([]);
  });
});
