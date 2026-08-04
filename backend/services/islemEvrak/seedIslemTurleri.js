// 🌱 İŞLEM TÜRÜ SEED - modül ilk açıldığında boş ekran görünmesin diye
// örnek bir işlem türü oluşturulur. Var olan kayıtlar ASLA ezilmez
// (kullanıcı düzenlemeleri korunur); yalnızca hiç kayıt yoksa eklenir.

const IslemTuru = require('../../models/IslemTuru');

const ETUYS_GOVDE = [
  'Sayın {firmaAdi} Yetkilisi,',
  '',
  'E-TUYS (Elektronik Teşvik Uygulama ve Yabancı Sermaye Bilgi Sistemi) yetkilendirme işleminiz için aşağıdaki evraklara ihtiyaç duyulmaktadır:',
  '',
  '{evrakListesi}',
  '',
  'Hazırlanan evrakları aşağıdaki bağlantı üzerinden tarafımıza iletmenizi rica ederiz:',
  '',
  '{uploadLink}',
  '',
  'İyi çalışmalar dileriz.',
  '',
  '{imza}'
].join('\n');

const VARSAYILAN_TURLER = [
  {
    kod: 'etuys_yetkilendirme',
    ad: 'ETUYS Yetkilendirme',
    aciklama: 'E-TUYS kullanıcı yetkilendirme başvurusu için firmadan evrak talebi',
    mailKonusu: 'E-TUYS Yetkilendirme — Evrak Talebi ({firmaAdi})',
    mailGovdesi: ETUYS_GOVDE,
    siraNo: 1,
    // Şahıs / Şirket varyantları: taahhütname metni ve istenen evraklar farklılaşır
    varyantlar: [
      {
        kod: 'sahis',
        ad: 'Şahıs',
        mailKonusu: 'E-TUYS Yetkilendirme (Şahıs) — Evrak Talebi ({firmaAdi})',
        mailGovdesi: ETUYS_GOVDE,
        istenenEvraklar: [
          { ad: 'E-TUYS Taahhütnamesi (Şahıs)', aciklama: 'Ekteki örneğe göre doldurulup noter onaylı olarak iletilmelidir', zorunlu: true },
          { ad: 'Kimlik Fotokopisi', aciklama: 'Yetkilendirilecek kişinin T.C. kimlik kartı önlü arkalı', zorunlu: true },
          { ad: 'İmza Beyannamesi', aciklama: 'Noter onaylı', zorunlu: true },
          { ad: 'Vergi Levhası', aciklama: 'Güncel tarihli', zorunlu: true }
        ]
      },
      {
        kod: 'sirket',
        ad: 'Şirket',
        mailKonusu: 'E-TUYS Yetkilendirme (Şirket) — Evrak Talebi ({firmaAdi})',
        mailGovdesi: ETUYS_GOVDE,
        istenenEvraklar: [
          { ad: 'E-TUYS Taahhütnamesi (Şirket)', aciklama: 'Ekteki örneğe göre doldurulup noter onaylı olarak iletilmelidir', zorunlu: true },
          { ad: 'İmza Sirküleri', aciklama: 'Temsil ve ilzama yetkili kişileri gösterir, noter onaylı', zorunlu: true },
          { ad: 'Kimlik Fotokopisi', aciklama: 'Yetkilendirilecek kişinin T.C. kimlik kartı önlü arkalı', zorunlu: true },
          { ad: 'Ticaret Sicil Gazetesi', aciklama: 'Şirket kuruluş ve son değişiklikleri içeren', zorunlu: true },
          { ad: 'Vergi Levhası', aciklama: 'Güncel tarihli', zorunlu: true },
          { ad: 'Faaliyet Belgesi', aciklama: 'Ticaret/Sanayi Odasından alınmış güncel belge', zorunlu: false }
        ]
      }
    ],
    istenenEvraklar: []
  }
];

async function seedIslemTurleri() {
  const mevcut = await IslemTuru.countDocuments();
  if (mevcut > 0) return { eklenen: 0, mevcut };

  await IslemTuru.insertMany(VARSAYILAN_TURLER);
  return { eklenen: VARSAYILAN_TURLER.length, mevcut: 0 };
}

module.exports = { seedIslemTurleri, VARSAYILAN_TURLER };
