// 🌱 İŞLEM TÜRÜ SEED - modül ilk açıldığında boş ekran görünmesin diye
// örnek bir işlem türü oluşturulur. Var olan kayıtlar ASLA ezilmez
// (kullanıcı düzenlemeleri korunur); yalnızca hiç kayıt yoksa eklenir.

const IslemTuru = require('../../models/IslemTuru');

// 📎 Örnek/şablon dosyaların kökü — storageService.BASE_DIR'e GÖRELİ verilir
// (islemEvrakService.mailGonder göreli yolu BASE_DIR ile birleştirip nodemailer'a path olarak geçer).
// Dosyalar repoda tutulur: her deploy'da yeniden oluşur, Render'ın geçici diskinden etkilenmez.
// ASCII ad şart — macOS (NFD, harf duyarsız) ile Render Linux (NFC, harf duyarlı) arasında ad kaymasın.
const ORNEK_DIR = 'Islem_Evrak/_Ornekler';
const DOCX_MIME = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';

const ORNEK_TAAHHUTNAME = {
  sahis: {
    dosyaAdi: 'E-TUYS Taahhütnamesi (Şahıs).docx', // firmaya giden mailde görünen ad
    fileUrl: '',
    filePath: `${ORNEK_DIR}/ETUYS_Taahhutnamesi_Sahis.docx`,
    mimeType: DOCX_MIME,
    fileSize: 733831
  },
  sirket: {
    dosyaAdi: 'E-TUYS Taahhütnamesi (Şirket).docx',
    fileUrl: '',
    filePath: `${ORNEK_DIR}/ETUYS_Taahhutnamesi_Sirket.docx`,
    mimeType: DOCX_MIME,
    fileSize: 733754
  }
};

// Taahhütname kaleminin adı varyanta göre değişiyor ("(Şahıs)" / "(Şirket)")
const TAAHHUTNAME_KALIBI = /taahh[üu]tname/i;

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
          { ad: 'E-TUYS Taahhütnamesi (Şahıs)', aciklama: 'Ekteki örneğe göre doldurulup noter onaylı olarak iletilmelidir', zorunlu: true, ornekDosya: ORNEK_TAAHHUTNAME.sahis },
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
          { ad: 'E-TUYS Taahhütnamesi (Şirket)', aciklama: 'Ekteki örneğe göre doldurulup noter onaylı olarak iletilmelidir', zorunlu: true, ornekDosya: ORNEK_TAAHHUTNAME.sirket },
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

// 🔁 Örnek taahhütname dosyalarını mevcut kayıtlara bağla (idempotent backfill).
// seedIslemTurleri() yalnızca koleksiyon boşken çalıştığı için, modül daha önce
// seed'lenmiş kurulumlarda taahhütname kalemleri örnek dosyasız kalıyordu.
// Yalnızca ornekDosya'sı BOŞ olan kalemler doldurulur — kullanıcının arayüzden
// yüklediği kendi örnek dosyası her açılışta ezilmez.
async function ornekDosyalariBagla() {
  const turler = await IslemTuru.find({ kod: 'etuys_yetkilendirme' });
  let guncellenen = 0;

  for (const tur of turler) {
    let degisti = false;

    for (const varyant of tur.varyantlar || []) {
      const ornek = ORNEK_TAAHHUTNAME[varyant.kod];
      if (!ornek) continue;

      for (const evrak of varyant.istenenEvraklar || []) {
        if (!TAAHHUTNAME_KALIBI.test(evrak.ad || '')) continue;
        if (evrak.ornekDosya && (evrak.ornekDosya.filePath || evrak.ornekDosya.fileUrl)) continue;
        evrak.ornekDosya = { ...ornek };
        degisti = true;
      }
    }

    if (degisti) {
      tur.markModified('varyantlar');
      await tur.save();
      guncellenen += 1;
    }
  }

  return { guncellenen };
}

module.exports = { seedIslemTurleri, ornekDosyalariBagla, VARSAYILAN_TURLER, ORNEK_DIR, ORNEK_TAAHHUTNAME };
