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
