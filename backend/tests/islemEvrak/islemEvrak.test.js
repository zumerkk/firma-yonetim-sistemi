// 🧪 İŞLEM VE EVRAK YÖNETİMİ - birim testleri
// DB'siz çalışır: model örnekleri bellekte kurulur, saf mantık doğrulanır.

const IslemTuru = require('../../models/IslemTuru');
const IslemTalebi = require('../../models/IslemTalebi');
const { VARSAYILAN_TURLER } = require('../../services/islemEvrak/seedIslemTurleri');

const talepKur = (evraklar) => new IslemTalebi({
  firma: '000000000000000000000001',
  islemTuru: '000000000000000000000002',
  istenenEvraklar: evraklar
});

describe('IslemTuru.varyantCoz - şahıs/şirket şablonu', () => {
  const tur = () => new IslemTuru(VARSAYILAN_TURLER[0]);

  test('şahıs varyantı kendi evrak listesini döndürür', () => {
    const v = tur().varyantCoz('sahis');
    expect(v.ad).toBe('Şahıs');
    expect(v.istenenEvraklar.length).toBe(4);
    expect(v.istenenEvraklar[0].ad).toMatch(/Şahıs/);
  });

  test('şirket varyantı daha fazla evrak ister (imza sirküleri, sicil gazetesi)', () => {
    const v = tur().varyantCoz('sirket');
    expect(v.ad).toBe('Şirket');
    const adlar = v.istenenEvraklar.map((e) => e.ad);
    expect(adlar).toContain('İmza Sirküleri');
    expect(adlar).toContain('Ticaret Sicil Gazetesi');
  });

  test('bilinmeyen varyant → işlem türünün kendi tanımına düşer', () => {
    const v = tur().varyantCoz('yok-boyle-bir-sey');
    expect(v.kod).toBe('');
    expect(v.mailKonusu).toBeTruthy(); // tür seviyesindeki konu kullanılır
  });
});

describe('IslemTalebi.durumTazele - evrak geldikçe durum ilerler', () => {
  test('hiç yükleme yoksa taslak kalır', () => {
    const t = talepKur([{ ad: 'A', zorunlu: true }]);
    t.durumTazele();
    expect(t.durum).toBe('taslak');
  });

  test('mail gönderilmişse ve yükleme yoksa mail_gonderildi', () => {
    const t = talepKur([{ ad: 'A', zorunlu: true }]);
    t.mailGonderimSayisi = 1;
    t.durumTazele();
    expect(t.durum).toBe('mail_gonderildi');
  });

  test('zorunluların bir kısmı geldiyse kismi_geldi', () => {
    const t = talepKur([{ ad: 'A', zorunlu: true }, { ad: 'B', zorunlu: true }]);
    t.yuklenenEvraklar.push({ istenenEvrakId: t.istenenEvraklar[0]._id, dosyaAdi: 'a.pdf' });
    t.durumTazele();
    expect(t.durum).toBe('kismi_geldi');
    expect(t.istenenEvraklar[0].geldiMi).toBe(true);
    expect(t.istenenEvraklar[1].geldiMi).toBe(false);
  });

  test('tüm zorunlular geldiyse tamamlandi (opsiyonel eksik olsa bile)', () => {
    const t = talepKur([
      { ad: 'A', zorunlu: true },
      { ad: 'B', zorunlu: true },
      { ad: 'C', zorunlu: false }
    ]);
    t.yuklenenEvraklar.push({ istenenEvrakId: t.istenenEvraklar[0]._id, dosyaAdi: 'a.pdf' });
    t.yuklenenEvraklar.push({ istenenEvrakId: t.istenenEvraklar[1]._id, dosyaAdi: 'b.pdf' });
    t.durumTazele();
    expect(t.durum).toBe('tamamlandi');
  });

  test('iptal edilmiş talebin durumu tazelemede korunur', () => {
    const t = talepKur([{ ad: 'A', zorunlu: true }]);
    t.durum = 'iptal';
    t.yuklenenEvraklar.push({ istenenEvrakId: t.istenenEvraklar[0]._id, dosyaAdi: 'a.pdf' });
    t.durumTazele();
    expect(t.durum).toBe('iptal');
  });

  test('dosya silinince ilgili evrak yeniden "bekleniyor" olur', () => {
    const t = talepKur([{ ad: 'A', zorunlu: true }]);
    t.yuklenenEvraklar.push({ istenenEvrakId: t.istenenEvraklar[0]._id, dosyaAdi: 'a.pdf' });
    t.durumTazele();
    expect(t.istenenEvraklar[0].geldiMi).toBe(true);

    t.yuklenenEvraklar = [];
    t.durumTazele();
    expect(t.istenenEvraklar[0].geldiMi).toBe(false);
    expect(t.durum).toBe('taslak');
  });
});

describe('islemEvrakService.mailOlustur - evrak listesi metne dönüşür', () => {
  const svc = require('../../services/islemEvrak/islemEvrakService');

  test('placeholder\'lar doldurulur ve evraklar numaralanır', () => {
    const talep = talepKur([
      { ad: 'İmza Sirküleri', aciklama: 'Noter onaylı', zorunlu: true },
      { ad: 'Faaliyet Belgesi', zorunlu: false }
    ]);
    talep.firmaAdi = 'ÖRNEK A.Ş.';
    talep.islemTuruAdi = 'ETUYS Yetkilendirme';

    const { konu, govde } = svc.mailOlustur({
      talep,
      sablon: { mailKonusu: '{islemAdi} — {firmaAdi}', mailGovdesi: svc.VARSAYILAN_GOVDE },
      uploadLink: 'https://gmplansis.com/evrak/abc123'
    });

    expect(konu).toBe('ETUYS Yetkilendirme — ÖRNEK A.Ş.');
    expect(govde).toContain('1. İmza Sirküleri — Noter onaylı');
    expect(govde).toContain('2. Faaliyet Belgesi (opsiyonel)');
    expect(govde).toContain('https://gmplansis.com/evrak/abc123');
    expect(govde).not.toContain('{'); // doldurulmamış placeholder kalmamalı
  });
});

describe('Örnek taahhütname dosyaları - seed → yol çözümü → mail eki', () => {
  const fs = require('fs');
  const path = require('path');
  const storageService = require('../../services/tesvikMakine/storageService');
  const { ORNEK_TAAHHUTNAME } = require('../../services/islemEvrak/seedIslemTurleri');

  // mailGonder içindeki ek çözümlemesinin birebir aynısı
  const ekYolu = (o) => (path.isAbsolute(o.filePath)
    ? o.filePath
    : path.join(storageService.BASE_DIR, o.filePath));

  test.each([['sahis', 'Şahıs'], ['sirket', 'Şirket']])(
    '%s varyantının taahhütname kalemi örnek dosyayla gelir', (kod, etiket) => {
      const v = new IslemTuru(VARSAYILAN_TURLER[0]).varyantCoz(kod);
      const evrak = v.istenenEvraklar.find((e) => /taahh[üu]tname/i.test(e.ad));
      expect(evrak).toBeDefined();
      expect(evrak.ad).toContain(etiket);
      expect(evrak.ornekDosya.filePath).toBe(ORNEK_TAAHHUTNAME[kod].filePath);
      expect(evrak.ornekDosya.dosyaAdi).toContain(etiket);
    });

  test('örnek dosya yolları ASCII (macOS/Linux ad kayması olmasın)', () => {
    Object.values(ORNEK_TAAHHUTNAME).forEach((o) => {
      // eslint-disable-next-line no-control-regex
      expect(o.filePath).toMatch(/^[\x20-\x7E]+$/);
      expect(o.filePath).not.toMatch(/\s/); // boşluk da yok
    });
  });

  test('dosyalar repoda mevcut ve seed metadata boyutuyla uyumlu', () => {
    Object.values(ORNEK_TAAHHUTNAME).forEach((o) => {
      const yol = ekYolu(o);
      expect(fs.existsSync(yol)).toBe(true);
      expect(fs.statSync(yol).size).toBe(o.fileSize);
    });
  });

  test('talepOlustur şablondaki örnek dosyayı talebe kopyalar', () => {
    const v = new IslemTuru(VARSAYILAN_TURLER[0]).varyantCoz('sahis');
    // talepOlustur'un evrak kopyalama davranışı
    const talep = talepKur(v.istenenEvraklar.map((e) => ({
      ad: e.ad, aciklama: e.aciklama, zorunlu: e.zorunlu, ornekDosya: e.ornekDosya
    })));
    const kopya = talep.istenenEvraklar.find((e) => /taahh[üu]tname/i.test(e.ad));
    expect(kopya.ornekDosya.filePath).toBe(ORNEK_TAAHHUTNAME.sahis.filePath);
  });
});

describe('Mail ekleri - örnek dosyası olan evraklar varsayılan olarak eklenir', () => {
  // talepMailGonder'deki ek seçme mantığının birebir aynısı
  const ekleriSec = (istenenEvraklar, ekEvrakIdler) => {
    const secilen = Array.isArray(ekEvrakIdler) ? ekEvrakIdler.map(String) : null;
    return (istenenEvraklar || [])
      .filter((e) => e.ornekDosya && (e.ornekDosya.fileUrl || e.ornekDosya.filePath))
      .filter((e) => !secilen || secilen.includes(String(e._id)))
      .map((e) => e.ornekDosya);
  };

  const evrakla = () => talepKur([
    { ad: 'Taahhütname', zorunlu: true, ornekDosya: { dosyaAdi: 'a.docx', filePath: 'x/a.docx' } },
    { ad: 'Kimlik Fotokopisi', zorunlu: true } // örnek dosyası yok
  ]);

  test('id listesi verilmezse örnekli evrakların hepsi eklenir', () => {
    expect(ekleriSec(evrakla().istenenEvraklar, undefined)).toHaveLength(1);
  });

  test('BOŞ dizi "hiçbirini ekleme" demektir — frontend bunu asla göndermemeli', () => {
    // Eski hatanın kanıtı: frontend seçim listesini güncellemediği için boş dizi
    // gönderiyor ve tek ek de sessizce düşüyordu.
    expect(ekleriSec(evrakla().istenenEvraklar, [])).toHaveLength(0);
  });

  test('seçilen id gönderilirse yalnızca o ek gider', () => {
    const t = evrakla();
    const ekler = ekleriSec(t.istenenEvraklar, [String(t.istenenEvraklar[0]._id)]);
    expect(ekler).toHaveLength(1);
    expect(ekler[0].dosyaAdi).toBe('a.docx');
  });

  test('örnek dosyası olmayan evrak hiçbir koşulda ek üretmez', () => {
    const t = evrakla();
    expect(ekleriSec(t.istenenEvraklar, [String(t.istenenEvraklar[1]._id)])).toHaveLength(0);
  });

  test('frontend kuralı: kaldırılanlar dışındaki tüm örnekli evraklar gönderilir', () => {
    const t = evrakla();
    // IslemEvrakDetail'deki türetme: ekAdaylari - kaldirilanEkler
    const adaylar = t.istenenEvraklar.filter((e) => e.ornekDosya?.dosyaAdi).map((e) => String(e._id));

    expect(ekleriSec(t.istenenEvraklar, adaylar.filter((x) => ![].includes(x)))).toHaveLength(1);
    expect(ekleriSec(t.istenenEvraklar, adaylar.filter((x) => !adaylar.includes(x)))).toHaveLength(0);
  });
});
