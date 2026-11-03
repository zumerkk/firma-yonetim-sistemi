// 🧪 Belge Takip'ten açılan evrak talebinde mail metni şablondan gelir
//
// Müşteri (02.11.2026, Teşvik Kapama Tamamlama Vizesi şablonunun ekran görüntüsüyle): "1. deki metin nedense
// evrak hazırlık sırasında gelmiyor". Belge Takip'ten açılan HER türde 23.09'daki sabit düzen kullanılıyor,
// türün İşlem & Evrak'ta yazılmış mail metni yok sayılıyordu. Konu da "…Vizesi{varyant}" diye çıkıyordu.

const svc = require('../../services/islemEvrak/islemEvrakService');
const { sablonVerisi } = require('../../services/dosyaTakip/firmaMailMetni');

const TAMAMLAMA_GOVDESI = [
  'Sayın {firmaAdi} yetkilisi,',
  '',
  "         {belgeNo} No'lu Yatırım Teşvik Belgemizin  tamamlama vizesi için istenen bilgi ve belgelerin tamamlanması gerekmektedir.",
  'İstenen evraklar aşağıdaki gibidir.',
  '',
  '{evrakListesi}',
  '',
  'Hazırlanan evrakların taramalarını aşağıdaki bağlantı üzerinden tarafımıza iletmenizi rica ederiz:',
  '',
  '{uploadLink}',
  '',
  'TAMAMLAMA VİZESİ ÖNEMLİ HUSUSLAR',
  '',
  'İyi çalışmalar dileriz.',
  '',
  '{imza}'
].join('\n');

const TAMAMLAMA = {
  // Müşterinin şablonundaki gibi bitişik (rozetlere art arda basılmış)
  mailKonusu: 'Teşvik Kapama Tamamlama Vizesi için istenenler {firmaAdi}{islemAdi}{varyant}',
  mailGovdesi: TAMAMLAMA_GOVDESI
};
const DOSYA_TAKIP = { ytbNo: '539010', takipId: 'DT20260416' };
const LINK = 'https://gmplansis.com/evrak/TevikKapam-abc';

const talepKur = (ek = {}) => ({
  firmaAdi: 'KULE KALIP MAKİNE SANAYİ VE TİCARET A.Ş.',
  islemTuruAdi: 'Teşvik Kapama Tamamlama Vizesi',
  varyantAd: '',
  dosyaTakip: 'dt1',
  talepMetni: '',
  istenenEvraklar: [
    { ad: 'SGK Borcu Yoktur Yazısı', aciklama: 'Barkodlu belge', zorunlu: true },
    { ad: 'Kapasite Raporu', zorunlu: false },
    { ad: 'İmza Sirküleri Taraması', zorunlu: true }
  ],
  ...ek
});

const olustur = (talep, sablon = TAMAMLAMA, dosyaTakip = DOSYA_TAKIP) =>
  svc.mailOlustur({ talep, sablon, uploadLink: LINK, dosyaTakip });

describe("Belge Takip'ten açılan talep", () => {
  test('türün şablon metni gelir; belge no dolar, DT takip no ve sabit düzen yazılmaz', () => {
    const { konu, govde } = olustur(talepKur());
    expect(govde.startsWith('Sayın KULE KALIP MAKİNE SANAYİ VE TİCARET A.Ş. yetkilisi,')).toBe(true);
    expect(govde).toContain("539010 No'lu Yatırım Teşvik Belgemizin");
    expect(govde).toContain('TAMAMLAMA VİZESİ ÖNEMLİ HUSUSLAR');
    expect(govde).toContain('1. SGK Borcu Yoktur Yazısı — Barkodlu belge');
    expect(govde).toContain('2. İmza Sirküleri Taraması');
    expect(govde).not.toContain('Kapasite Raporu');
    expect(govde).toContain(LINK);
    expect(govde).not.toContain('Talebi ile ilgili olarak');
    expect(govde).not.toContain('DT20260416');
    expect(govde).not.toMatch(/\{[a-zA-Z]+\}/);
    // Varyantsız türde {varyant} konuda kalmaz; bitişik yazılmış firma ve işlem adı arasına boşluk girer
    expect(konu).toBe('Teşvik Kapama Tamamlama Vizesi için istenenler KULE KALIP MAKİNE SANAYİ VE TİCARET A.Ş. Teşvik Kapama Tamamlama Vizesi');
    expect(svc.konuyuIsle('{firmaAdi}{varyant}', { firmaAdi: 'A', varyant: 'Şirket' })).toBe('A Şirket');
  });

  test('talep metni hitabın altına girer, şablonun girintisi korunur', () => {
    const { govde } = olustur(talepKur({ talepMetni: 'Belgelerin aslı da istenecektir.' }));
    const satirlar = govde.split('\n');
    expect(satirlar.slice(0, 4)).toEqual([
      'Sayın KULE KALIP MAKİNE SANAYİ VE TİCARET A.Ş. yetkilisi,',
      '',
      'Belgelerin aslı da istenecektir.',
      ''
    ]);
    expect(satirlar[4].startsWith("         539010 No'lu")).toBe(true);
  });

  test('Yeni Belge Talebi müşterinin istediği sabit düzende kalır', () => {
    const { govde } = olustur(
      talepKur({ islemTuruAdi: 'Yeni Belge Talebi', talepMetni: 'Ek açıklama' }),
      { mailKonusu: 'Evrak Talebi ({firmaAdi})', mailGovdesi: 'Sayın {firmaAdi},\n{evrakListesi}\n{uploadLink}' }
    );
    expect(govde).toContain('Teşvik Belgesi 539010 / DT20260416 Talebi ile ilgili olarak');
    expect(govde.indexOf('Ek açıklama')).toBeLessThan(govde.indexOf(LINK));
    expect(govde.indexOf(LINK)).toBeLessThan(govde.indexOf('SGK Borcu Yoktur Yazısı'));
  });

  test('şablonunda mail metni olmayan tür sabit düzene düşer', () => {
    for (const mailGovdesi of ['', '   \n  ', undefined]) {
      const { govde } = olustur(talepKur(), { mailKonusu: '{islemAdi}', mailGovdesi });
      expect(govde).toContain('Talebi ile ilgili olarak talep edilen evraklar aşağıdaki gibidir.');
    }
  });

  test('belge numarası olmayan talepte {belgeNo} iz bırakmaz', () => {
    const { konu, govde } = olustur(talepKur(), { mailKonusu: 'Vize ({belgeNo}) {firmaAdi}', mailGovdesi: TAMAMLAMA_GOVDESI }, { takipId: 'DT1' });
    expect(konu).toBe('Vize KULE KALIP MAKİNE SANAYİ VE TİCARET A.Ş.');
    expect(govde).toContain("No'lu Yatırım Teşvik Belgemizin");
    expect(govde).not.toContain('{belgeNo}');
  });
});

describe('İşlem & Evrak sayfasından açılan talep', () => {
  test('talep metni hitabın önüne değil altına yazılır', () => {
    const { govde } = olustur(
      talepKur({ dosyaTakip: null, talepMetni: 'Not: acil' }),
      { mailGovdesi: svc.VARSAYILAN_GOVDE }, null
    );
    expect(govde.startsWith('Sayın KULE KALIP MAKİNE SANAYİ VE TİCARET A.Ş. Yetkilisi,\n\nNot: acil\n\n')).toBe(true);
  });

  test('hitapla başlamayan şablonda talep metni en üstte', () => {
    expect(svc.talepMetniniEkle('{evrakListesi}\nbağlantı', 'Not')).toBe('Not\n\n{evrakListesi}\nbağlantı');
    expect(svc.talepMetniniEkle('SAYIN YETKİLİ,\nliste', 'Not')).toBe('SAYIN YETKİLİ,\n\nNot\n\nliste');
    expect(svc.talepMetniniEkle('Sayın Yetkili,', 'Not')).toBe('Sayın Yetkili,\n\nNot');
    expect(svc.talepMetniniEkle('Sayın Yetkili,\nliste', '  ')).toBe('Sayın Yetkili,\nliste');
  });

  test('seçili varyant konuya yazılır; boşsa parantezleriyle düşer', () => {
    const sablon = { mailKonusu: 'E-TUYS Yetkilendirme ({varyant}) — Evrak Talebi ({firmaAdi})', mailGovdesi: svc.VARSAYILAN_GOVDE };
    expect(olustur(talepKur({ dosyaTakip: null, varyantAd: 'Şirket' }), sablon, null).konu)
      .toBe('E-TUYS Yetkilendirme (Şirket) — Evrak Talebi (KULE KALIP MAKİNE SANAYİ VE TİCARET A.Ş.)');
    expect(olustur(talepKur({ dosyaTakip: null }), sablon, null).konu)
      .toBe('E-TUYS Yetkilendirme — Evrak Talebi (KULE KALIP MAKİNE SANAYİ VE TİCARET A.Ş.)');
  });

  test('devam mailinin konusu da boş varyantı yazmaz', () => {
    const { konu } = svc.devamMailiOlustur({
      talep: talepKur({ dosyaTakip: null, mailGecmisi: [] }), sablon: TAMAMLAMA, uploadLink: LINK
    });
    expect(konu).not.toContain('{varyant}');
  });
});

describe('Belge Takip › Firma Maili aynı şablonu doldurur', () => {
  test('{belgeNo} talebin belge numarasıyla dolar, {varyant} düşer', () => {
    const talep = { firmaUnvan: 'KULE KALIP A.Ş.', talepTuru: 'Kapama', ytbNo: '539010', takipId: 'DT1' };
    const govde = svc.sablonMetniniIsle('{belgeNo} nolu belge {varyant}\n{evrakListesi}', sablonVerisi(talep));
    expect(govde.split('\n')[0]).toBe('539010 nolu belge ');
    expect(govde).not.toContain('DT1');
  });
});
