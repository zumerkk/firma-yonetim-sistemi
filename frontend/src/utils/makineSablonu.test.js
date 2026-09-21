// 🧪 Makine listesi Excel şablonu — içe aktarma sözlüğü
//
// Müşteri: "Etuys'dan gerçekleşme dosyasını direkt yüklediğimizde tutarları
// getirmiyor veya dışa aktardığımız dosyayı düzenleyip içe aktarınca yine
// getirmiyor... En önemlisi tarihler."
//
// Kök sebep: dışa aktarma "Gerç. Adet" yazıyordu, içe aktarma "Gerçekleşen Adet"
// arıyordu. Tarihler ise hiç okunmuyordu. Aşağıdaki testler her iki adın da
// tanındığını ve tarihlerin çözüldüğünü sabitliyor.

import {
  gerceklesmeCoz, sayiCoz, tarihCoz, SABLON_BASLIKLARI, SABLON_SUTUNLARI, GERCEKLESME_SUTUNLARI,
  basligiNormallestir, baslikAlani, makineSatiriCoz, iceAktarimBirlestir, sayfaBul, dizilerdenSatirlar,
  csvSatirlariniOku, evetHayirCoz, birimCoz, dovizCoz, kullanilmisCoz
} from './makineSablonu';

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
  test('şablondaki her başlık içe aktarmada kendi alanına gidiyor', () => {
    for (const tur of ['yerli', 'ithal']) {
      for (const sutun of SABLON_SUTUNLARI[tur]) {
        expect([tur, sutun.baslik, baslikAlani(sutun.baslik, tur)]).toEqual([tur, sutun.baslik, sutun.alan]);
      }
    }
  });

  test('gerçekleşme ve tarih sütunları iki sayfada da var', () => {
    for (const liste of Object.values(SABLON_BASLIKLARI)) {
      expect(liste).toEqual(expect.arrayContaining(['G. ADET', 'G. TUTAR', 'TALEP TARİH', 'SONUÇ TARİH']));
    }
  });

  test('eski şablonun başlıkları da hâlâ tanınıyor', () => {
    for (const sutun of GERCEKLESME_SUTUNLARI) {
      expect(sutun.adlar).toContain(sutun.baslik);
      expect(baslikAlani(sutun.baslik, 'yerli')).toBe(sutun.alan);
    }
  });

  test('başlıklar benzersiz (Excel aynı adı iki kez kaldırmaz)', () => {
    for (const liste of Object.values(SABLON_BASLIKLARI)) {
      expect(new Set(liste.map(basligiNormallestir)).size).toBe(liste.length);
    }
  });
});

// Müşterinin gönderdiği mak_list_sablon.xlsx'in başlıkları — yazım hataları ve sondaki boşluk dahil
const MUSTERI_YERLI = {
  'SIRA NO': 5, 'MAKINE ID ': 2339380, 'ADI VE ÖZELLİİĞİ': '900 LİTRE/Saat KAPASİTELİ SU ARITMA', 'MİKTARI': 1,
  'BİRİM': 'ADET(UNIT)', 'BİRİM FİYATI': 50000, 'TOPLAM TUTARI': 50000, 'KDV İSTİNASI': 'EVET',
  'FİNANSAL KİRALAMA': 'HAYIR', 'F.K. MİKTAR': '', 'F.K. ŞİRKETİ': '', 'G. ADET': 1, 'G. TUTAR': '48.500,00',
  'TALEP TARİH': '26.05.2022', 'SONUÇ TARİH': 44707
};
const MUSTERI_ITHAL = {
  'SIRA NO': 1, 'GTIP NO': 847989979019, 'ADI VE ÖZELLİĞİ': 'SABUN ÜRETİM HATTI', 'MİKTARI': 1, 'BİRİM': 'ADET(UNIT)',
  'MENŞEİ ÜLKE DÖVİZ BİRİM FİYATI': 165000, 'DÖVİZ CİNSİ': 'EUR', 'TOPLAM TUTAR $': 179000, 'TOPLAM TUTAR TL': '5.768.630,85',
  'GÜMRÜK VERGİSİ İSTİNASI': 'Evet', 'KDV İSTİNASI': 'Evet', 'KULLANILMIŞ MI': 'Yeni Makine', 'CKD Mİ?': 'HAYIR', 'ARAÇ MI?': 'EVET',
  'F.K. MİKTAR': 1, 'F.K. ŞİRKETİ': 'ABC LEASING', 'G. ADET': '', 'G. TUTAR': '', 'TALEP TARİH': '', 'SONUÇ TARİH': ''
};

describe('makineSatiriCoz - müşterinin şablonu', () => {
  test('YERLİ satırı bütün alanlarıyla gelir', () => {
    const { kalem, bos, uyarilar } = makineSatiriCoz(MUSTERI_YERLI, 'yerli');
    expect(bos).toBe(false);
    expect(uyarilar).toEqual([]);
    expect(kalem).toMatchObject({
      siraNo: 5, makineId: '2339380', adi: '900 LİTRE/Saat KAPASİTELİ SU ARITMA', miktar: 1,
      birim: '142', birimAciklamasi: 'ADET(UNIT)', birimFiyatiTl: 50000, toplamTl: 50000,
      kdvIstisnasi: 'EVET', finansalKiralamaMi: 'HAYIR', gerceklesenAdet: 1, gerceklesenTutar: 48500
    });
    // Toplam = Miktar × Fiyat → elle girilmiş sayılmaz, ekran hesaplamaya devam eder
    expect(kalem.tlYerliManuel).toBeUndefined();
    expect(kalem.talep).toEqual({ talepTarihi: '2022-05-26', durum: 'bakanliga_gonderildi' });
    expect(kalem.karar).toEqual({ kararTarihi: '2022-05-26', kararDurumu: 'onay' });
  });

  test('İTHAL satırı: E-TUYS tutarları korunur, kullanılmış/CKD/araç okunur', () => {
    const { kalem, doluAlanlar } = makineSatiriCoz(MUSTERI_ITHAL, 'ithal', { gtipAciklamaBul: (k) => (k === '847989979019' ? 'DİĞERLERİ' : '') });
    expect(kalem).toMatchObject({
      gtipKodu: '847989979019', gtipAciklama: 'DİĞERLERİ', adi: 'SABUN ÜRETİM HATTI', birim: '142',
      birimFiyatiFob: 165000, doviz: 'EUR', toplamUsd: 179000, toplamTl: 5768630.85,
      gumrukVergisiMuafiyeti: 'EVET', kdvMuafiyeti: 'EVET', kullanilmisKod: '2', ckdSkd: 'HAYIR', aracMi: 'EVET',
      finansalKiralamaAdet: 1, finansalKiralamaSirket: 'ABC LEASING', finansalKiralamaMi: 'EVET'
    });
    // 1 × 165.000 EUR ≠ 179.000 $ → formül ezmesin
    expect(kalem.usdManuel).toBe(true);
    expect(kalem.tlManuel).toBe(true);
    // Boş gerçekleşme/tarih hücreleri güncellemede mevcut değeri silmesin
    expect(doluAlanlar).not.toContain('gerceklesenAdet');
    expect(kalem.talep).toBeUndefined();
  });

  test('toplam formülle tutmuyorsa yazılan toplam korunur (yerli)', () => {
    const { kalem } = makineSatiriCoz({ 'ADI VE ÖZELLİĞİ': 'Pres', 'MİKTARI': 2, 'BİRİM': 'ADET', 'BİRİM FİYATI': 100, 'TOPLAM TUTARI': 250 }, 'yerli');
    expect(kalem.tlYerliManuel).toBe(true);
    expect(kalem.toplamTl).toBe(250);
  });

  test('sıfır toplam elle girilmiş sayılmaz', () => {
    const { kalem, doluAlanlar } = makineSatiriCoz({ 'ADI VE ÖZELLİĞİ': 'Pres', 'TOPLAM TUTARI': 0 }, 'yerli');
    expect(doluAlanlar).not.toContain('toplamTl');
    expect(kalem.tlYerliManuel).toBeUndefined();
  });

  test('türü belirsiz kullanılmışlık sessizce HAYIR sayılmaz', () => {
    const { kalem, uyarilar } = makineSatiriCoz({ 'ADI VE ÖZELLİĞİ': 'Torna', 'KULLANILMIŞ MI': 'EVET', 'DÖVİZ CİNSİ': 'USD', 'MİKTARI': 1, 'BİRİM': 'SET' }, 'ithal');
    expect(uyarilar.join(' ')).toMatch(/Kullanılmış bilgisi anlaşılamadı/);
    expect(kalem._errors).toEqual(uyarilar);
  });

  test('eksik zorunlu alanlar uyarı olarak işaretlenir', () => {
    const { uyarilar } = makineSatiriCoz({ 'ADI VE ÖZELLİĞİ': 'Torna' }, 'ithal');
    expect(uyarilar).toEqual(['Birim boş', 'Miktar 0', 'Döviz boş']);
  });

  // Dışa aktarımın alttaki toplam satırı / boş satır makine olarak eklenmesin
  test('adı, ID\'si ve GTİP\'i olmayan satır boş sayılır', () => {
    expect(makineSatiriCoz({ 'TOPLAM TUTARI': 1250000 }, 'yerli').bos).toBe(true);
    expect(makineSatiriCoz({ 'Toplam ($)': 10, 'Toplam (TL)': 400 }, 'ithal').bos).toBe(true);
  });
});

describe('makineSatiriCoz - kendi dışa aktarımımız geri yüklenebilmeli', () => {
  test('yerli dışa aktarım başlıkları', () => {
    const { kalem } = makineSatiriCoz({
      'Sıra No': 3, 'Makine ID': '4350371', 'GTIP No': '8422.30', 'GTIP Açıklama': 'DOLUM', 'Adı ve Özelliği': 'Dolum Makinesi',
      'Miktarı': 2, 'Birimi': '142', 'Birim Açıklaması': 'ADET', 'Birim Fiyatı (TL)': 1000, 'Toplam Tutar (TL)': 2000,
      'Makine Tipi': 'Yardımcı Makine', 'KDV Muafiyeti': 'EVET', 'Finansal Kir.': 'EVET', 'F.K. Adet': 2, 'F.K. Şirket': 'XYZ',
      'Gerç. Adet': 2, 'Gerç. Tutar': 1900, 'İade/Devir/Satış': 'HAYIR', 'Müracaat Tar.': '01.02.2026', 'Onay Tarihi': '03.04.2026',
      'Talep Ad.': 2, 'Karar Kodu': 'onay', 'Onay. Adet': 2
    }, 'yerli');
    expect(kalem).toMatchObject({
      siraNo: 3, makineId: '4350371', gtipKodu: '8422.30', gtipAciklama: 'DOLUM', birim: '142', birimAciklamasi: 'ADET(UNIT)',
      birimFiyatiTl: 1000, toplamTl: 2000, makineTechizatTipi: 'Yardımcı Makine', kdvIstisnasi: 'EVET',
      finansalKiralamaMi: 'EVET', finansalKiralamaAdet: 2, finansalKiralamaSirket: 'XYZ', gerceklesenAdet: 2, gerceklesenTutar: 1900
    });
    expect(kalem.talep).toEqual({ talepTarihi: '2026-02-01', durum: 'bakanliga_gonderildi', istenenAdet: 2 });
    expect(kalem.karar).toEqual({ kararTarihi: '2026-04-03', kararDurumu: 'onay', onaylananAdet: 2 });
  });

  test('ithal dışa aktarım başlıkları (eskiden FOB, döviz, kullanılmış, muafiyetler kayboluyordu)', () => {
    const { kalem } = makineSatiriCoz({
      'Adı ve Özelliği': 'Kutulama', 'Miktarı': 2, 'Birimi': 'ADET(UNIT)', 'Birim Fiyatı (FOB)': '1.500,50', 'Döviz': 'USD',
      'Manuel Kur': 'EVET', 'Man. Kur Değ.': 32.5, 'Toplam ($)': 3001, 'Toplam (TL)': 97532.5, 'Kullanılmış': '3',
      'KDV Muaf.': 'HAYIR', 'G.V. Muaf.': 'HAYIR'
    }, 'ithal');
    expect(kalem).toMatchObject({
      birimFiyatiFob: 1500.5, doviz: 'USD', toplamUsd: 3001, toplamTl: 97532.5, kullanilmisKod: '3',
      kullanilmisAciklama: 'KULLANILMIŞ MÜNFERİT', kdvMuafiyeti: 'HAYIR', gumrukVergisiMuafiyeti: 'HAYIR',
      kurManuel: true, kurManuelDeger: 32.5
    });
    // 2 × 1.500,50 = 3.001 → FOB $ formülle tutuyor, elle işaretlenmez
    expect(kalem.usdManuel).toBeUndefined();
  });
});

describe('değer çözücüler', () => {
  test('EVET/HAYIR', () => {
    expect(['Evet', 'e', 'VAR', 'x', true, 1].map(evetHayirCoz)).toEqual(Array(6).fill('EVET'));
    expect(['Hayır', 'hayir', 'YOK', 'h', false, 0].map(evetHayirCoz)).toEqual(Array(6).fill('HAYIR'));
    expect(['', '-', null].map(evetHayirCoz)).toEqual(['', '', '']);
  });

  test('birim adı → bakanlık kodu', () => {
    expect(birimCoz('ADET(UNIT)')).toEqual({ kod: '142', aciklama: 'ADET(UNIT)' });
    expect(birimCoz('Adet').kod).toBe('142');
    expect(birimCoz('kg').kod).toBe('151');
    expect(birimCoz('Set').kod).toBe('178');
    expect(birimCoz(142)).toEqual({ kod: '142', aciklama: 'ADET(UNIT)' });
    // Tanınmayan birim kaybolmaz
    expect(birimCoz('PALET')).toEqual({ kod: 'PALET', aciklama: '' });
    expect(birimCoz('')).toBeNull();
  });

  test('döviz', () => {
    expect(['EUR', 'Euro', '€', 'eur'].map(dovizCoz)).toEqual(Array(4).fill('EUR'));
    expect(dovizCoz('USD - ABD DOLARI')).toBe('USD');
    expect(dovizCoz('ABD Doları')).toBe('USD');
    expect(dovizCoz('')).toBe('');
  });

  test('kullanılmışlık', () => {
    expect(['Yeni Makine', 'HAYIR', '2', 'H'].map(kullanilmisCoz)).toEqual(['2', '2', '2', '2']);
    expect(kullanilmisCoz('KULLANILMIŞ KOMPLE')).toBe('1');
    expect(kullanilmisCoz('Kullanılmış Münferit')).toBe('3');
    expect(kullanilmisCoz('KM')).toBe('3');
    expect(kullanilmisCoz('EVET')).toBeNull();
    expect(kullanilmisCoz('')).toBe('');
  });

  test('E-TUYS saatli tarih ve geçersiz tarih', () => {
    expect(tarihCoz('26-05-2022 03:00:00')).toBe('2022-05-26');
    expect(tarihCoz('31.13.2027')).toBe('');
  });
});

describe('iceAktarimBirlestir', () => {
  const coz = (satirlar, tur = 'yerli') => satirlar.map((r, i) => makineSatiriCoz(r, tur, { sira: i + 1 }));
  const hesapla = (r) => ({ ...r, hesaplandi: true });

  test('boş hücre mevcut değeri silmez; yalnız dolu alanlar yazılır', () => {
    const mevcut = [{ id: 'a', rowId: 'r1', siraNo: 7, makineId: '100', adi: 'Torna', miktar: 3, birim: '142', birimFiyatiTl: 10, kdvIstisnasi: 'EVET', makineTechizatTipi: 'Yardımcı Makine', dosyalar: [{ ad: 'f.pdf' }], etuysSecili: true }];
    const { list, added, updated, untouched } = iceAktarimBirlestir(mevcut, coz([{ 'MAKİNE ID': '100', 'MİKTARI': 5, 'KDV İSTİSNASI': '' }]), hesapla);
    expect([added, updated, untouched]).toEqual([0, 1, 0]);
    expect(list[0]).toMatchObject({
      id: 'a', rowId: 'r1', siraNo: 7, makineId: '100', adi: 'Torna', miktar: 5, birim: '142', birimFiyatiTl: 10,
      kdvIstisnasi: 'EVET', makineTechizatTipi: 'Yardımcı Makine', dosyalar: [{ ad: 'f.pdf' }], etuysSecili: true, hesaplandi: true
    });
  });

  // Eskiden eşleşen satırın talep/karar'ı olduğu gibi bırakılıyor, dosyadaki tarihler yok sayılıyordu
  test('talep/karar tarihleri mevcut makineye de yazılır, mevcut durum korunur', () => {
    const mevcut = [{ id: 'a', makineId: '100', adi: 'Torna', talep: { durum: 'taslak', istenenAdet: 3 }, karar: null }];
    const { list } = iceAktarimBirlestir(mevcut, coz([{ 'MAKİNE ID': '100', 'TALEP TARİH': '01.02.2026', 'SONUÇ TARİH': '03.04.2026' }]));
    expect(list[0].talep).toEqual({ durum: 'taslak', istenenAdet: 3, talepTarihi: '2026-02-01' });
    expect(list[0].karar).toEqual({ kararTarihi: '2026-04-03', kararDurumu: 'onay' });
  });

  test('aynı adlı mevcut makineler sırayla eşleşir, fazlası eklenir', () => {
    const mevcut = [{ id: 'a', adi: 'Kutulama', miktar: 1 }, { id: 'b', adi: 'KUTULAMA', miktar: 1 }];
    const { list, added, updated } = iceAktarimBirlestir(mevcut, coz([
      { 'ADI VE ÖZELLİĞİ': 'kutulama', 'MİKTARI': 2 },
      { 'ADI VE ÖZELLİĞİ': 'Kutulama', 'MİKTARI': 3 },
      { 'ADI VE ÖZELLİĞİ': 'Kutulama', 'MİKTARI': 4 }
    ]));
    expect([added, updated]).toEqual([1, 2]);
    expect(list.map((r) => r.miktar)).toEqual([2, 3, 4]);
  });

  test('ID\'leri farklı aynı adlı makine üzerine yazılmaz', () => {
    const mevcut = [{ id: 'a', makineId: '100', adi: 'Dikiş Makinesi' }];
    const { list, added } = iceAktarimBirlestir(mevcut, coz([{ 'MAKİNE ID': '200', 'ADI VE ÖZELLİĞİ': 'Dikiş Makinesi', 'MİKTARI': 1 }]));
    expect(added).toBe(1);
    expect(list.map((r) => r.makineId)).toEqual(['100', '200']);
  });

  test('ID\'siz mevcut makine adıyla eşleşir ve ID\'sini alır', () => {
    const { list, updated } = iceAktarimBirlestir([{ id: 'a', adi: 'Pres' }], coz([{ 'MAKİNE ID': '300', 'ADI VE ÖZELLİĞİ': 'PRES' }]));
    expect(updated).toBe(1);
    expect(list[0]).toMatchObject({ id: 'a', makineId: '300' });
  });

  test('boş listeye aktarımda Excel sıra numaraları korunur, eksikler sonrakini alır', () => {
    const { list } = iceAktarimBirlestir([], coz([
      { 'SIRA NO': 913, 'ADI VE ÖZELLİĞİ': 'A' },
      { 'SIRA NO': 917, 'ADI VE ÖZELLİĞİ': 'B' },
      { 'ADI VE ÖZELLİĞİ': 'C' }
    ]));
    expect(list.map((r) => r.siraNo)).toEqual([913, 917, 918]);
  });

  test('dolu listeye yeni makine en büyük sıradan devam eder; boş satırlar atlanır', () => {
    const { list, skipped } = iceAktarimBirlestir([{ id: 'a', siraNo: 12, adi: 'X' }], coz([{ 'SIRA NO': 1, 'ADI VE ÖZELLİĞİ': 'Y' }, { 'TOPLAM TUTARI': 99 }]));
    expect(skipped).toBe(1);
    expect(list.map((r) => [r.adi, r.siraNo])).toEqual([['X', 12], ['Y', 13]]);
  });
});

describe('dosya okuma', () => {
  test('sayfa adları: müşteri şablonu, eski adlar; E-TUYS görüntü sayfaları eşleşmez', () => {
    const adlar = ['ETUYS Y. MAK. ÖRN. GÖRÜNTÜ', 'YERLİ', 'İTHAL', 'ETUYS İTL. MAK. ÖRN. GÖRÜNTÜ'];
    expect(sayfaBul(adlar, 'yerli')).toBe('YERLİ');
    expect(sayfaBul(adlar, 'ithal')).toBe('İTHAL');
    expect(sayfaBul(['Özet', 'Yerli', 'İthal'], 'ithal')).toBe('İthal');
    expect(sayfaBul(['YERLI LISTE'], 'yerli')).toBe('YERLI LISTE');
    expect(sayfaBul(['Sayfa1'], 'yerli')).toBeNull();
  });

  test('başlığın üstünde not satırı olsa da başlık satırı bulunur', () => {
    const satirlar = dizilerdenSatirlar([
      ['GLOBTEKS 568289 — yerli makine listesi', '', ''],
      ['', '', ''],
      ['SIRA NO', 'ADI VE ÖZELLİĞİ', 'MİKTARI'],
      [1, 'Torna', 2],
      ['', '', ''],
      [2, 'Freze', 1]
    ], 'yerli');
    expect(satirlar).toEqual([
      { 'SIRA NO': 1, 'ADI VE ÖZELLİĞİ': 'Torna', 'MİKTARI': 2 },
      { 'SIRA NO': 2, 'ADI VE ÖZELLİĞİ': 'Freze', 'MİKTARI': 1 }
    ]);
  });

  test('CSV: tür başlıklardan anlaşılır', () => {
    const { yerli, ithal } = csvSatirlariniOku('SIRA NO;ADI VE ÖZELLİĞİ;DÖVİZ CİNSİ\n1;Torna;EUR', 'liste.csv');
    expect(yerli).toEqual([]);
    expect(ithal).toEqual([{ 'SIRA NO': '1', 'ADI VE ÖZELLİĞİ': 'Torna', 'DÖVİZ CİNSİ': 'EUR' }]);
    expect(csvSatirlariniOku('SIRA NO,ADI VE ÖZELLİĞİ\n1,Torna', 'x.csv').yerli).toHaveLength(1);
  });
});
