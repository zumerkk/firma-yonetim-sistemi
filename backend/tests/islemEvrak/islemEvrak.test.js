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
    expect(govde).toContain('https://gmplansis.com/evrak/abc123');
    expect(govde).not.toContain('{'); // doldurulmamış placeholder kalmamalı
  });

  // Müşteri isteği (PR #90): "tikleri kaldırınca mailde otomatik silinsin,
  // (opsiyonel) yazmak yerine." Davranış değişti ama test güncellenmemişti.
  test('zorunlu tiki kaldırılan evrak maile HİÇ yazılmaz', () => {
    const talep = talepKur([
      { ad: 'İmza Sirküleri', aciklama: 'Noter onaylı', zorunlu: true },
      { ad: 'Faaliyet Belgesi', zorunlu: false }
    ]);
    talep.firmaAdi = 'ÖRNEK A.Ş.';
    talep.islemTuruAdi = 'ETUYS Yetkilendirme';

    const { govde } = svc.mailOlustur({
      talep,
      sablon: { mailGovdesi: svc.VARSAYILAN_GOVDE },
      uploadLink: 'https://gmplansis.com/evrak/abc123'
    });

    expect(govde).not.toContain('Faaliyet Belgesi');
    expect(govde).not.toContain('opsiyonel');
    // Tek işaretli evrak kaldığı için numaralandırma 1'de bitmeli
    expect(govde).toContain('1. İmza Sirküleri — Noter onaylı');
    expect(govde).not.toContain('2. ');
  });

  // Müşteri (madde 15): "Google Forms linkini koyabilirsek ek gibi çok iyi olur ...
  // otomatik olarak ilişkin firmaya ait olsun." Tek form + firma bazlı ön dolgu.
  describe('Google Form bağlantısı firmaya göre ön-doldurulur', () => {
    const FORM = 'https://docs.google.com/forms/d/e/ABC123/viewform';
    const ALANLAR = [
      { entryId: 'entry.111', kaynak: 'firmaAdi' },
      { entryId: 'entry.222', kaynak: 'vergiNoTC' }
    ];

    test('firma bilgileri ön dolgu parametresine yazılır', () => {
      const link = svc.formLinkiUret(
        { googleFormUrl: FORM, googleFormAlanlari: ALANLAR },
        { firmaAdi: 'ÖRNEK A.Ş.' },
        { vergiNoTC: '1234567890' }
      );
      expect(link).toContain('usp=pp_url');
      expect(link).toContain(`entry.111=${encodeURIComponent('ÖRNEK A.Ş.')}`);
      expect(link).toContain('entry.222=1234567890');
    });

    test('iki farklı firma iki farklı link alır', () => {
      const uret = (ad) => svc.formLinkiUret(
        { googleFormUrl: FORM, googleFormAlanlari: ALANLAR }, { firmaAdi: ad }, {});
      expect(uret('A FİRMASI')).not.toBe(uret('B FİRMASI'));
    });

    test('form tanımlı değilse boş döner ve mail gövdesinde satır bırakmaz', () => {
      expect(svc.formLinkiUret({}, { firmaAdi: 'X' }, {})).toBe('');

      const talep = talepKur([{ ad: 'İmza Sirküleri', zorunlu: true }]);
      talep.firmaAdi = 'ÖRNEK A.Ş.';
      talep.islemTuruAdi = 'ETUYS';
      const { govde } = svc.mailOlustur({
        talep, sablon: { mailGovdesi: svc.VARSAYILAN_GOVDE }, uploadLink: 'https://x/y'
      });
      expect(govde).not.toContain('{formLink}');
      expect(govde).not.toMatch(/\n{3,}/); // boş placeholder üç satır boşluk bırakmamalı
    });

    test('form tanımlıysa link gövdeye girer', () => {
      const talep = talepKur([{ ad: 'İmza Sirküleri', zorunlu: true }]);
      talep.firmaAdi = 'ÖRNEK A.Ş.';
      talep.islemTuruAdi = 'ETUYS';
      const { govde } = svc.mailOlustur({
        talep,
        sablon: { mailGovdesi: svc.VARSAYILAN_GOVDE, googleFormUrl: FORM, googleFormAlanlari: ALANLAR },
        uploadLink: 'https://x/y',
        firma: { vergiNoTC: '1234567890' }
      });
      expect(govde).toContain('docs.google.com/forms');
      expect(govde).toContain('entry.222=1234567890');
    });

    test('paylaşım linkindeki usp=sf_link temizlenir', () => {
      const link = svc.formLinkiUret(
        { googleFormUrl: `${FORM}?usp=sf_link`, googleFormAlanlari: ALANLAR },
        { firmaAdi: 'X' }, {}
      );
      expect(link).not.toContain('sf_link');
      expect((link.match(/usp=/g) || []).length).toBe(1);
    });
  });

  test('hiç işaretli evrak yoksa maili düzenleyen uyarılır', () => {
    const talep = talepKur([{ ad: 'İmza Sirküleri', zorunlu: false }]);
    talep.firmaAdi = 'ÖRNEK A.Ş.';
    talep.islemTuruAdi = 'ETUYS Yetkilendirme';

    const { govde } = svc.mailOlustur({
      talep,
      sablon: { mailGovdesi: svc.VARSAYILAN_GOVDE },
      uploadLink: 'https://gmplansis.com/evrak/abc123'
    });

    expect(govde).toContain('İşaretli evrak yok');
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

describe('Dosya indirme - talepDosyaIndir çözümlemesi', () => {
  // Müşteri: "Yüklediğimiz belgeler açılmıyor/indirilmiyor"
  // Kök neden: kayıttaki fileUrl göreli ("/uploads/tesvik-evrak/..."); arayüz onu <a href>
  // olarak veriyordu ve tarayıcı FRONTEND origin'ine göre çözüp SPA'nın index.html'ini
  // indiriyordu. Çözüm auth'lu indirme ucu — controller'ın kaynak çözümlemesi buradaki gibi.
  const cozumle = (talep, dosyaId) => {
    const yuklenen = talep.yuklenenEvraklar.id(dosyaId);
    if (yuklenen) {
      return { kaynak: 'yuklenen', fileUrl: yuklenen.fileUrl, filePath: yuklenen.filePath };
    }
    const istenen = talep.istenenEvraklar.id(dosyaId);
    if (istenen && istenen.ornekDosya && (istenen.ornekDosya.fileUrl || istenen.ornekDosya.filePath)) {
      return { kaynak: 'ornek', fileUrl: istenen.ornekDosya.fileUrl, filePath: istenen.ornekDosya.filePath };
    }
    return null;
  };

  const talepKurDosyali = () => {
    const t = talepKur([
      { ad: 'Taahhütname', zorunlu: true, ornekDosya: { dosyaAdi: 'ornek.docx', filePath: 'Islem_Evrak/_Ornekler/o.docx' } },
      { ad: 'Kimlik', zorunlu: true }
    ]);
    t.yuklenenEvraklar.push({ dosyaAdi: 'gelen.pdf', orijinalAd: 'hb.pdf', filePath: 'Islem_Evrak/T1/Gelen/gelen.pdf', fileUrl: '/uploads/tesvik-evrak/Islem_Evrak/T1/Gelen/gelen.pdf' });
    return t;
  };

  test('firmanın yüklediği evrak id ile bulunur', () => {
    const t = talepKurDosyali();
    const r = cozumle(t, String(t.yuklenenEvraklar[0]._id));
    expect(r.kaynak).toBe('yuklenen');
    expect(r.filePath).toContain('gelen.pdf');
  });

  test('istenen evrakın örnek dosyası da aynı uçtan indirilir', () => {
    const t = talepKurDosyali();
    const r = cozumle(t, String(t.istenenEvraklar[0]._id));
    expect(r.kaynak).toBe('ornek');
    expect(r.filePath).toContain('_Ornekler');
  });

  test('örnek dosyası olmayan istenen evrak indirilemez', () => {
    const t = talepKurDosyali();
    expect(cozumle(t, String(t.istenenEvraklar[1]._id))).toBeNull();
  });

  test('bilinmeyen id null döner (404 üretilir)', () => {
    const t = talepKurDosyali();
    expect(cozumle(t, '000000000000000000000009')).toBeNull();
  });

  test('kayıttaki fileUrl göreli — bu yüzden doğrudan href verilemez', () => {
    const t = talepKurDosyali();
    const url = t.yuklenenEvraklar[0].fileUrl;
    expect(url.startsWith('/')).toBe(true);
    expect(url.startsWith('http')).toBe(false);
  });
});

describe('Örnek dosya - kaydedilmemiş satırın indeks eşlemesi', () => {
  // Müşteri: "buraya sonradan satır ekleyince örnek yükleyemiyoruz"
  // Yeni satırın _id'si yok; önce liste kaydedilir. Kaydetmede adı boş satırlar
  // elendiği için hedef satırın TEMİZLENMİŞ listedeki konumu bulunmalı.
  const hedefKonum = (evraklar, index) => {
    const satir = evraklar[index];
    const temiz = evraklar.filter((x) => String(x.ad || '').trim());
    return { temiz, hedefIndex: temiz.indexOf(satir) };
  };

  test('araya boş satır varsa indeks kayması olmaz', () => {
    const evraklar = [
      { ad: 'A', _id: '1' },
      { ad: '' },            // kaydetmede elenecek
      { ad: 'C' }            // yeni satır — hedef bu
    ];
    const { temiz, hedefIndex } = hedefKonum(evraklar, 2);
    expect(temiz).toHaveLength(2);
    expect(hedefIndex).toBe(1);          // ham indeks 2 değil, temizde 1
    expect(temiz[hedefIndex].ad).toBe('C');
  });

  test('boş satır yoksa indeks aynı kalır', () => {
    const evraklar = [{ ad: 'A', _id: '1' }, { ad: 'B' }];
    const { hedefIndex, temiz } = hedefKonum(evraklar, 1);
    expect(hedefIndex).toBe(1);
    expect(temiz[hedefIndex].ad).toBe('B');
  });

  test('adı boş satır kaydedilemez — indeks -1 döner ve uyarı gerekir', () => {
    const evraklar = [{ ad: 'A', _id: '1' }, { ad: '   ' }];
    expect(hedefKonum(evraklar, 1).hedefIndex).toBe(-1);
  });
});
