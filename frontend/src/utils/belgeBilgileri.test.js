// Belge görünümü / PDF / Excel ortak tanımları — müşteri (01.10.2026) sorunları:
//  • "Genel belge görünümünü 1-1 aynı bilgiler görünecek şekilde ... destekleme sınıfı,
//    cazibe merkezi vs görünmüyor"
//  • "Finansal bilgilerde diğer harcamalar sola kayıyor galiba ya da montaj giderlerine
//    girdiğimiz sayılar yardımcı işl. mak. teç. kısmında görünüyor"
import { kunyeBolumleri, evetHayirYaz } from './belgeKunye';
import { finansalBolumleri, finansalDegerYaz } from './belgeFinansal';
import { digerHarcamalariForma, digerHarcamalariKayda, digerHarcamalariOku } from './digerHarcamalar';

// Müşterinin gönderdiği E-TUYS görüntüsündeki belge (DİSTİLE 578574) — değerler oradan
const distile = {
  yatirimciUnvan: 'DİSTİLE İÇKİ SANAYİ VE TİCARET ANONİM ŞİRKETİ',
  kunyeBilgileri: { sermayeTuru: 'Tamamı Yerli Firma' },
  istihdam: { mevcutKisi: 159, ilaveKisi: 0 },
  yatirimBilgileri: {
    yatirimKonusu: '1551 - ALKOLLÜ İÇECEKLERİN DAMITILMA',
    yerinIl: 'İZMİR', yerinIlce: 'Menderes',
    yatirimAdresi1: 'İTOB org. San. Bölg. Ekrem Demirtaş Cad. No:10-0',
    osbIseMudurluk: 'İTOB O.S.B.', ilBazliBolge: '1. Bölge', ilceBazliBolge: '1. Bölge',
    destekSinifi: 'GENEL',
    cazibeMerkeziMi: 'hayir', savunmaSanayiProjesi: 'hayir', cazibeMerkezi2018: 'hayir',
    cazibeMerkeziDeprem: 'hayir', hamleMi: 'hayir', vergiIndirimsizDestek: 'hayir'
  },
  belgeYonetimi: {
    belgeId: '1097540', belgeNo: '578574',
    belgeTarihi: '2025-03-26', belgeMuracaatTarihi: '2025-03-25', belgeMuracaatNo: '97459',
    belgeBaslamaTarihi: '2025-03-25', belgeBitisTarihi: '2028-03-25', uzatimTarihi: '2028-03-25',
    dayandigiKanun: '15.06.2012 tarih 2012-3305 sayılı',
    belgeMuracaatTalepTipi: 'YATIRIM TEŞVİK BELGESİ'
  }
};

const etiketler = (satirlar) => satirlar.map((s) => s.etiket);
const deger = (satirlar, etiket) => satirlar.find((s) => s.etiket === etiket)?.deger;

describe('kunyeBolumleri — E-TUYS künyesi birebir', () => {
  const { yatirimci, yatirim, belge } = kunyeBolumleri(distile, { tur: 'eski' });

  test('üç panel E-TUYS sırasıyla', () => {
    expect(etiketler(yatirimci)).toEqual(['Firma Adı', 'SGK Sicil No']);
    expect(etiketler(yatirim)).toEqual([
      'Sermaye Türü', 'Yatırımın Konusu(US97)', 'Kararname Tarih/Sayı', 'İli', 'İlçesi', 'Adres',
      'Osb Adı', 'SB Adı', 'İl Bazlı Bölgesi', 'İlçe Bazlı Bölgesi(01.01.2021 ve sonrası)',
      'Mevcut İstihdam', 'İlave İstihdam'
    ]);
    // E-TUYS: ... Süre Uzatım → OECD → Destekleme Sınıfı → Öncelikli → Büyük Ölçekli → Cazibe →
    // Savunma → Ada → Parsel → Talep Tipi → Enerji → Cazibe 2018 → Deprem → HAMLE → Vergi
    expect(etiketler(belge)).toEqual([
      'Belge Id', 'Belge No', 'Belge Tarihi', 'Müracaat Tarihi', 'Müracaat Sayısı',
      'Belge Başlama Tarihi', 'Belge Bitiş Tarihi', 'Süre Uzatım Tarihi', 'Mücbir Uzama Tarihi',
      'Kapanma Tarihi', 'Ekspertiz Tarihi',
      'OECD (Orta-Yüksek)', 'Destekleme Sınıfı', 'Öncelikli Yatırım', 'Büyük Ölçekli',
      'Cazibe Merkezi Mi', 'Savunma Sanayi Projesi Mi', 'Ada', 'Parsel', 'Belge Müracaat Talep Tipi',
      'Enerji Üretim Kaynağı', 'Cazibe Merkezi Mi? (2018/11201)', 'Cazibe Merkezi Deprem Nedeni',
      'HAMLE Mİ?', 'Vergi İndirimsiz Destek Talebi'
    ]);
  });

  test('müşterinin "görünmüyor" dediği alanlar değerleriyle geliyor', () => {
    expect(deger(belge, 'Destekleme Sınıfı')).toBe('GENEL');
    expect(deger(belge, 'Cazibe Merkezi Mi')).toBe('HAYIR');
    expect(deger(belge, 'HAMLE Mİ?')).toBe('HAYIR');
    expect(deger(belge, 'Vergi İndirimsiz Destek Talebi')).toBe('HAYIR');
    expect(deger(yatirim, 'Kararname Tarih/Sayı')).toBe('15.06.2012 tarih 2012-3305 sayılı');
    expect(deger(yatirim, 'Mevcut İstihdam')).toBe('159');
    expect(deger(yatirim, 'İlave İstihdam')).toBe('0');
    expect(deger(belge, 'Belge Bitiş Tarihi')).toBe('25.03.2028');
  });

  test('boş alan atlanmaz, "-" yazılır', () => {
    expect(deger(yatirimci, 'SGK Sicil No')).toBe('-');
    expect(deger(belge, 'Büyük Ölçekli')).toBe('-');
    expect(deger(yatirim, 'SB Adı')).toBe('-');
  });

  test('öncelikli yatırım türü yalnız "Evet" ise satır olur', () => {
    expect(etiketler(belge)).not.toContain('Öncelikli Yatırım Türü');
    const evet = kunyeBolumleri({ belgeYonetimi: { oncelikliYatirim: 'evet', oncelikliYatirimTuru: 'n' } });
    expect(deger(evet.belge, 'Öncelikli Yatırım')).toBe('EVET');
    expect(deger(evet.belge, 'Öncelikli Yatırım Türü')).toMatch(/^n - /);
  });

  test('yeni belge: NACE etiketi ve mücbir uzatma satırı', () => {
    const yeni = kunyeBolumleri(
      { yatirimBilgileri: { yatirimKonusu: '10.11.01' }, belgeYonetimi: { mucbirUzatma: 'evet', mucbirUzumaTarihi: '2027-01-02' } },
      { tur: 'yeni', konuGoster: (k) => `${k} — Et işleme` }
    );
    expect(deger(yeni.yatirim, 'Yatırımın Konusu(NACE)')).toBe('10.11.01 — Et işleme');
    expect(deger(yeni.belge, 'Mücbir Uzatma')).toBe('EVET — 02.01.2027');
  });

  test('evet/hayır yazımları', () => {
    expect(evetHayirYaz('hayır')).toBe('HAYIR');
    expect(evetHayirYaz('HAYIR')).toBe('HAYIR');
    expect(evetHayirYaz('evet')).toBe('EVET');
    expect(evetHayirYaz('')).toBe('-');
  });
});

describe('diğer yatırım harcamaları — tek eşleme', () => {
  // İçe aktarıcılar (Excel, eski belge, ekran görüntüsü) E-TUYS sırasıyla yazıyor:
  // et=yardımcı, eu=ithalat, ev=taşıma, ew=montaj, ex=etüd, ey=diğer
  const iceAktarilan = { et: 1, eu: 20, ev: 300, ew: 4000, ex: 50000, ey: 600000, ez: 0 };

  test('görünüm her kalemi kendi yerinde okur (sola kayma yok)', () => {
    const { kalemler, toplam } = digerHarcamalariOku(iceAktarilan);
    const harita = Object.fromEntries(kalemler.map((k) => [k.etiket, k.tutar]));
    expect(harita['Yardımcı işletme makine teçhizat giderleri']).toBe(1);
    expect(harita['İthalat ve gümrükleme giderleri']).toBe(20);
    expect(harita['Taşıma ve sigorta giderleri']).toBe(300);
    expect(harita['Montaj giderleri']).toBe(4000);
    expect(harita['Etüd ve proje giderleri']).toBe(50000);
    expect(harita['Diğer giderler']).toBe(600000);
    expect(toplam).toBe(654321);
  });

  test('formda montaja yazılan tutar kayıtta montaj sütununa (EW) gider, yardımcıya (ET) değil', () => {
    const kayit = digerHarcamalariKayda({ montajGiderleri: 7500 });
    expect(kayit.ew).toBe(7500);
    expect(kayit.et).toBe(0);
    expect(kayit.ez).toBe(7500);
  });

  test('form → kayıt → form gidiş-dönüş kayıpsız', () => {
    const form = digerHarcamalariForma(iceAktarilan);
    expect(digerHarcamalariKayda(form)).toEqual({ ...iceAktarilan, ez: 654321 });
    expect(form.toplamDigerYatirimHarcamalari).toBe(654321);
  });
});

describe('finansalBolumleri', () => {
  const t = {
    maliHesaplamalar: {
      makinaTechizat: { ithalMakina: 100, yerliMakina: 50, toplamMakina: 150, yeniMakina: 12000, kullanimisMakina: 3000 },
      yatirimHesaplamalari: { ew: 4000 },
      finansman: { yabanciKaynak: 10, ozKaynak: 20 }
    }
  };
  const { sol, sag } = finansalBolumleri(t);
  const satirBul = (gruplar, etiket) => gruplar.flatMap((g) => g.satirlar).find((s) => s.etiket === etiket);

  test('ithal makine $ şemadaki adla (yeniMakina) okunur — eskiden hep $0 çıkıyordu', () => {
    expect(satirBul(sag, 'Yeni Makine').deger).toBe(12000);
    expect(satirBul(sag, 'Top. İthal. Mak. ($)').deger).toBe(15000);
    expect(finansalDegerYaz(satirBul(sag, 'Yeni Makine'))).toBe('$12.000');
  });

  test('montaj kendi satırında, toplam finansman hesaplanır', () => {
    expect(satirBul(sol, 'Montaj giderleri').deger).toBe(4000);
    expect(satirBul(sol, 'Yardımcı işletme makine teçhizat giderleri').deger).toBe(0);
    expect(satirBul(sag, 'Toplam Finansman').deger).toBe(30);
  });

  test('E-TUYS grup sırası', () => {
    expect(sol.map((g) => g.baslik)).toEqual(['Arazi-Arsa Gideri', 'Bina İnşaat Gideri', 'Diğer Yatırım Harcamaları', 'Toplam Sabit Yatırım']);
    expect(sag.map((g) => g.baslik)).toEqual(['Makina ve Teçhizat Giderleri', 'İthal Makine ($)', 'Yabancı Kaynaklar', 'Özkaynaklar', 'Toplam Finansman']);
  });
});
