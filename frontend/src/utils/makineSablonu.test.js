// 🧪 Makine listesi Excel şablonu — içe aktarma sözlüğü
//
// Müşteri: "Etuys'dan gerçekleşme dosyasını direkt yüklediğimizde tutarları
// getirmiyor veya dışa aktardığımız dosyayı düzenleyip içe aktarınca yine
// getirmiyor... En önemlisi tarihler."
//
// Kök sebep: dışa aktarma "Gerç. Adet" yazıyordu, içe aktarma "Gerçekleşen Adet"
// arıyordu. Tarihler ise hiç okunmuyordu. Aşağıdaki testler her iki adın da
// tanındığını ve tarihlerin çözüldüğünü sabitliyor.

import { gerceklesmeCoz, sayiCoz, tarihCoz, SABLON_BASLIKLARI, GERCEKLESME_SUTUNLARI } from './makineSablonu';

describe('sayiCoz - TR biçimli tutarlar', () => {
  test('TR binlik/ondalık', () => {
    expect(sayiCoz('1.234,56')).toBeCloseTo(1234.56);
    expect(sayiCoz('1.234.567')).toBe(1234567);
  });

  test('EN biçim', () => {
    expect(sayiCoz('1,234.56')).toBeCloseTo(1234.56);
  });

  test('düz sayı ve gerçek sayı tipi', () => {
    expect(sayiCoz('1234')).toBe(1234);
    expect(sayiCoz(1234.5)).toBe(1234.5);
  });

  test('boş ve bozuk girdi 0 döner', () => {
    expect(sayiCoz('')).toBe(0);
    expect(sayiCoz(null)).toBe(0);
    expect(sayiCoz('abc')).toBe(0);
  });

  test('para birimi eki temizlenir', () => {
    expect(sayiCoz('1.500,00 TL')).toBeCloseTo(1500);
  });
});

describe('tarihCoz - Excel üç farklı biçimde veriyor', () => {
  test('TR metin', () => {
    expect(tarihCoz('31.05.2027')).toBe('2027-05-31');
    expect(tarihCoz('1/6/2027')).toBe('2027-06-01');
  });

  test('ISO metin', () => {
    expect(tarihCoz('2027-05-31')).toBe('2027-05-31');
  });

  test('Date nesnesi', () => {
    expect(tarihCoz(new Date('2027-05-31T00:00:00Z'))).toBe('2027-05-31');
  });

  // Excel hücresi tarih biçimliyse seri numarası olarak gelir
  test('Excel seri numarası', () => {
    expect(tarihCoz(46538)).toBe('2027-05-31');
  });

  test('tarih olmayan girdi boş döner', () => {
    expect(tarihCoz('merhaba')).toBe('');
    expect(tarihCoz('')).toBe('');
    expect(tarihCoz(null)).toBe('');
    // Küçük sayılar seri numarası sayılmamalı (adet sütunu yanlışlıkla tarih olmasın)
    expect(tarihCoz(5)).toBe('');
  });
});

describe('gerceklesmeCoz - kendi çıktımız geri yüklenebilmeli', () => {
  // Asıl kırılma: dışa aktarımın kısaltılmış başlıkları
  test('dışa aktarım başlıkları tanınır (Gerç. Adet / Gerç. Tutar)', () => {
    const c = gerceklesmeCoz({ 'Gerç. Adet': 5, 'Gerç. Tutar': '12.500,50' });
    expect(c.gerceklesenAdet).toBe(5);
    expect(c.gerceklesenTutar).toBeCloseTo(12500.5);
  });

  test('uzun başlıklar da tanınır', () => {
    const c = gerceklesmeCoz({ 'Gerçekleşen Adet': 3, 'Gerçekleşen Tutar': 100 });
    expect(c.gerceklesenAdet).toBe(3);
    expect(c.gerceklesenTutar).toBe(100);
  });

  // Eski dosyalarda başlık sonunda boşluk var
  test('sondaki boşluklu eski başlık tanınır', () => {
    expect(gerceklesmeCoz({ 'Gerçekleşen Tutar ': 77 }).gerceklesenTutar).toBe(77);
  });

  test('ETUYS dosyasının kendi başlıkları tanınır', () => {
    const c = gerceklesmeCoz({ 'Fatura Gerçekleşen Miktar': 9, 'Fatura Gerçekleşen Değer': 1000 });
    expect(c.gerceklesenAdet).toBe(9);
    expect(c.gerceklesenTutar).toBe(1000);
  });

  // "En önemlisi tarihler"
  test('talep ve karar tarihleri okunur', () => {
    const c = gerceklesmeCoz({ 'Müracaat Tar.': '31.05.2027', 'Onay Tarihi': '01.06.2027' });
    expect(c.talepTarihi).toBe('2027-05-31');
    expect(c.kararTarihi).toBe('2027-06-01');
  });

  test('şablonun kendi tarih başlıkları da okunur', () => {
    const c = gerceklesmeCoz({ 'Talep Tarihi': '2027-01-02', 'Karar Tarihi': '2027-03-04' });
    expect(c.talepTarihi).toBe('2027-01-02');
    expect(c.kararTarihi).toBe('2027-03-04');
  });

  test('talep/onay adetleri okunur', () => {
    const c = gerceklesmeCoz({ 'Talep Ad.': 4, 'Onay. Adet': 3 });
    expect(c.talepAdedi).toBe(4);
    expect(c.onaylananAdet).toBe(3);
  });

  // Boş hücre mevcut veriyi EZMEMELİ — kısmi doldurulmuş şablon yüklenebilsin
  test('boş hücreler çıktıya girmez', () => {
    const c = gerceklesmeCoz({ 'Gerç. Adet': '', 'Gerç. Tutar': 50 });
    expect(c).not.toHaveProperty('gerceklesenAdet');
    expect(c.gerceklesenTutar).toBe(50);
  });

  test('ilgisiz sütunlar yok sayılır', () => {
    expect(gerceklesmeCoz({ 'Adı ve Özelliği': 'Torna' })).toEqual({});
  });

  test('boş satır çökmez', () => {
    expect(gerceklesmeCoz({})).toEqual({});
    expect(gerceklesmeCoz(undefined)).toEqual({});
  });
});

describe('SABLON_BASLIKLARI - boş şablon içe aktarmayla uyumlu olmalı', () => {
  // Şablonu indirip doldurup yüklemek çalışmazsa tüm özellik anlamsız
  test('şablondaki her gerçekleşme başlığı içe aktarmada tanınıyor', () => {
    for (const sutun of GERCEKLESME_SUTUNLARI) {
      expect(sutun.adlar).toContain(sutun.baslik);
    }
  });

  test('yerli ve ithal şablonları gerçekleşme sütunlarını içeriyor', () => {
    for (const sutun of GERCEKLESME_SUTUNLARI) {
      expect(SABLON_BASLIKLARI.yerli).toContain(sutun.baslik);
      expect(SABLON_BASLIKLARI.ithal).toContain(sutun.baslik);
    }
  });

  test('başlıklar benzersiz (Excel aynı adı iki kez kaldırmaz)', () => {
    for (const liste of Object.values(SABLON_BASLIKLARI)) {
      expect(new Set(liste).size).toBe(liste.length);
    }
  });
});
