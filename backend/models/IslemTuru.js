// 🗂️ İŞLEM TÜRÜ - "İşlem ve Evrak Yönetimi" modülünün şablon tanımı
// Bir işlem türü (ör. "ETUYS Yetkilendirme"): hangi evraklar istenir, mail metni nedir.
// Şahıs/Şirket gibi varyantlar farklı evrak listesi ve mail metni taşıyabilir
// (müşteri: "Şahıs/Firma durumuna göre mail içeriğini değiştirecek bir buton olacak").

const mongoose = require('mongoose');

// İşlem türünde istenen tek bir evrak kalemi
const istenenEvrakSchema = new mongoose.Schema({
  ad: { type: String, required: true, trim: true, maxlength: 200 },
  aciklama: { type: String, trim: true, maxlength: 500, default: '' },
  zorunlu: { type: Boolean, default: true },
  // 🔀 Koşullu görünürlük (müşteri Excel'i: "9. SATIR EVET tikine koşullu aktif").
  // Boş bırakılırsa evrak HER ZAMAN istenir — eski kayıtlar aynen çalışmaya devam eder.
  // İç içe obje yerine iki düz alan: eski dokümanlarda undefined kalması sorun çıkarmıyor.
  kosulSoruId: { type: String, trim: true, default: '' },
  kosulDeger: { type: String, enum: ['', 'EVET', 'HAYIR'], default: '' },
  // Firmaya gönderilecek örnek/şablon dosya (doldurup geri yükleyecekleri form)
  ornekDosya: {
    dosyaAdi: { type: String, trim: true },
    fileUrl: { type: String, trim: true },
    filePath: { type: String, trim: true },
    mimeType: { type: String, trim: true },
    fileSize: { type: Number, default: 0 }
  }
}, { _id: false });

// Varyant: aynı işlemin şahıs / şirket gibi farklı halleri
const varyantSchema = new mongoose.Schema({
  kod: { type: String, required: true, trim: true },   // 'sahis' | 'sirket' | serbest
  ad: { type: String, required: true, trim: true },    // "Şahıs", "Şirket"
  mailKonusu: { type: String, trim: true, default: '' },
  mailGovdesi: { type: String, default: '' },
  istenenEvraklar: { type: [istenenEvrakSchema], default: [] }
}, { _id: false });

// 🔀 EVET/HAYIR sorusu: talep açılırken sorulur, evrak listesini daraltır
const soruSchema = new mongoose.Schema({
  id: { type: String, required: true, trim: true },   // evrak koşulları buna bakar
  metin: { type: String, required: true, trim: true, maxlength: 500 },
  siraNo: { type: Number, default: 0 }
}, { _id: false });

const islemTuruSchema = new mongoose.Schema({
  kod: { type: String, required: true, unique: true, trim: true, index: true },
  ad: { type: String, required: true, trim: true, maxlength: 200 },
  aciklama: { type: String, trim: true, maxlength: 1000, default: '' },
  // Varyant yoksa bu liste/metin kullanılır
  mailKonusu: { type: String, trim: true, default: '' },
  mailGovdesi: { type: String, default: '' },
  istenenEvraklar: { type: [istenenEvrakSchema], default: [] },
  // Soru listesi BOŞSA sihirbaz hiç çıkmaz; talep bugünkü gibi düz listeyle açılır.
  // Bu, özelliği kod değiştirmeden kapatmanın yolu (bkz. geri alma kademesi 1).
  sorular: { type: [soruSchema], default: [] },
  varyantlar: { type: [varyantSchema], default: [] },
  aktif: { type: Boolean, default: true, index: true },
  siraNo: { type: Number, default: 0 },
  olusturanKullanici: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
}, {
  timestamps: true,
  collection: 'islemturleri'
});

// Varyant seçiliyse onun tanımını, değilse işlem türünün kendi tanımını döndürür
islemTuruSchema.methods.varyantCoz = function (varyantKod) {
  if (varyantKod && Array.isArray(this.varyantlar)) {
    const v = this.varyantlar.find((x) => x.kod === varyantKod);
    if (v) {
      return {
        kod: v.kod,
        ad: v.ad,
        mailKonusu: v.mailKonusu || this.mailKonusu || '',
        mailGovdesi: v.mailGovdesi || this.mailGovdesi || '',
        istenenEvraklar: (v.istenenEvraklar && v.istenenEvraklar.length) ? v.istenenEvraklar : this.istenenEvraklar,
        sorular: this.sorular || []   // sorular tür seviyesinde, varyanta göre değişmiyor
      };
    }
  }
  return {
    kod: '',
    ad: '',
    mailKonusu: this.mailKonusu || '',
    mailGovdesi: this.mailGovdesi || '',
    istenenEvraklar: this.istenenEvraklar || [],
    sorular: this.sorular || []
  };
};

module.exports = mongoose.model('IslemTuru', islemTuruSchema);
