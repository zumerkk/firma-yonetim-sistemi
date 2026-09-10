// 🧪 UZUN EVRAK AÇIKLAMASI - üretim hatasının regresyon testi
//
// Gerçek vaka (9 Eylül 2026 akşamı, müşteri: "işlem&evrağa bakamadım böyle bir hata
// veriyor"): İşlem & Evrak modülü tamamen kullanılamaz hale geldi. Talep açmaya
// çalışınca:
//
//   IslemTalebi validation failed: istenenEvraklar.1.aciklama:
//   Path `aciklama` (`T.C. SANAYİ VE TEKNOLOJİ BAKANLIĞINA VERİLMEK ÜZERE - Sosyal
//   Güvenlik Kurumunun ...`) is longer than the maximum allowed length (500).
//
// Zincir şöyleydi:
//   1. Şablondaki SGK açıklaması zaten 484 karakterdi (mevzuat metni).
//   2. Kullanıcı başına "T.C. SANAYİ VE TEKNOLOJİ BAKANLIĞINA VERİLMEK ÜZERE - "
//      ekledi → 500 sınırı aşıldı.
//   3. turKaydet findByIdAndUpdate kullanıyordu ve runValidators VERİLMEMİŞTİ;
//      Mongoose bu durumda şema sınırlarını hiç kontrol etmez → metin şablona
//      sessizce yazıldı.
//   4. Hata ancak talep açılırken patladı: IslemTalebi.create doğrulama yapıyor.
//
// İki ucu birden kapatıyoruz: sınır yükseltildi (mevzuat metinleri uzun) ve iki
// şema aynı sınıra sahip; ayrıca şablon kaydında artık doğrulayıcı çalışıyor.

const IslemTuru = require('../../models/IslemTuru');
const IslemTalebi = require('../../models/IslemTalebi');

// Üretimde patlayan metnin kendisi (T.C. öneki + SGK mevzuat cümlesi)
const SGK_ACIKLAMA = 'T.C. SANAYİ VE TEKNOLOJİ BAKANLIĞINA VERİLMEK ÜZERE - Sosyal Güvenlik '
  + 'Kurumunun elektronik bilgi iletişim ortamından alınacak barkodlu belge VEYA 31/5/2006 '
  + 'tarihli ve 5510 sayılı Sosyal Sigortalar ve Genel Sağlık Sigortası Kanunu uyarınca '
  + 'Türkiye genelinde Sosyal Güvenlik Kurumuna muaccel olmuş prim ve idari para cezası '
  + 'borçlarının bulunmadığına veya tecil ve/veya taksitlendirildiğine ya da '
  + 'yapılandırıldığına ve yapılandırmanın bozulmadığına dair Sosyal Güvenlik Kurumunun '
  + 'ilgili birimlerinden alınacak yazı.';

const evrakSemasi = (Model) => Model.schema.path('istenenEvraklar').schema.path('aciklama');

describe('Uzun evrak açıklaması - üretimi kilitleyen hata', () => {
  test('hatayı tetikleyen metin 500 karakterden gerçekten uzun', () => {
    // Test verisi zamanla kısalırsa bu test sessizce anlamsızlaşırdı
    expect(SGK_ACIKLAMA.length).toBeGreaterThan(500);
  });

  test('şablona kaydedilebiliyor', () => {
    const tur = new IslemTuru({
      kod: 'etuys_test', ad: 'ETUYS Yetkilendirme',
      istenenEvraklar: [{ ad: 'SGK Borcu Yoktur Yazısı', aciklama: SGK_ACIKLAMA }]
    });
    expect(tur.validateSync()).toBeUndefined();
  });

  // Asıl kırılma noktası: şablondan talebe kopyalama
  test('talebe kopyalanabiliyor (üretimde burada patlıyordu)', () => {
    const talep = new IslemTalebi({
      firma: '000000000000000000000001',
      islemTuru: '000000000000000000000002',
      istenenEvraklar: [
        { ad: 'Vergi Levhası', aciklama: 'kısa' },
        { ad: 'SGK Borcu Yoktur Yazısı', aciklama: SGK_ACIKLAMA }
      ]
    });
    expect(talep.validateSync()).toBeUndefined();
  });
});

describe('İki şema aynı sınırı paylaşmalı', () => {
  // Sınırlar ayrıştığı için hata ortaya çıktı: şablon kabul ediyor, talep reddediyor.
  // Biri ileride değiştirilirse bu test uyarsın.
  test('IslemTuru ve IslemTalebi açıklama sınırı eşit', () => {
    const turSinir = evrakSemasi(IslemTuru).options.maxlength;
    const talepSinir = evrakSemasi(IslemTalebi).options.maxlength;
    expect(turSinir).toBe(talepSinir);
  });

  test('sınır mevzuat metinlerine yetecek kadar geniş', () => {
    expect(evrakSemasi(IslemTuru).options.maxlength).toBeGreaterThanOrEqual(1000);
  });
});

describe('Sınırı gerçekten aşan metin hâlâ reddedilir', () => {
  // Sınırı yükseltmek doğrulamayı büsbütün kapatmak değil
  test('2000 karakteri aşan açıklama kabul edilmez', () => {
    const talep = new IslemTalebi({
      firma: '000000000000000000000001',
      islemTuru: '000000000000000000000002',
      istenenEvraklar: [{ ad: 'Devasa', aciklama: 'x'.repeat(2001) }]
    });
    const hata = talep.validateSync();
    expect(hata).toBeDefined();
    expect(String(hata.message)).toMatch(/aciklama/);
  });
});
