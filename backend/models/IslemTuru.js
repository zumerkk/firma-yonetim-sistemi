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
  // Varyanta özel form; boşsa işlem türündeki kullanılır
  googleFormUrl: { type: String, trim: true, default: '' },
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
  // 🔗 Google Form: firmadan bilgi toplamak için maile eklenen bağlantı.
  // Müşteri: "Google Forms linkini koyabilirsek ek gibi çok iyi olur ... otomatik
  // olarak ilişkin firmaya ait olsun." Google Forms'ta firma bazlı ayrı form açmak
  // yerine TEK form kullanılır; link her firma için ön-doldurulmuş üretilir, böylece
  // e-tabloda gelen her satır hangi firmaya ait olduğu belli olur.
  // googleFormAlanlari: Forms'un "Ön doldurulmuş bağlantı al" ekranından alınan
  // entry.<id> anahtarlarını hangi firma bilgisiyle dolduracağımızı söyler.
  googleFormUrl: { type: String, trim: true, default: '' },
  googleFormAlanlari: {
    type: [{
      entryId: { type: String, trim: true, required: true },   // ör. "entry.1234567890"
      kaynak: { type: String, trim: true, enum: ['firmaAdi', 'vergiNoTC', 'firmaEmail', 'islemAdi'], default: 'firmaAdi' }
    }],
    default: []
  },
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
        // Form varyanta özel tanımlanmadıysa işlem türününki kullanılır
        googleFormUrl: v.googleFormUrl || this.googleFormUrl || '',
        googleFormAlanlari: this.googleFormAlanlari || [],
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
    googleFormUrl: this.googleFormUrl || '',
    googleFormAlanlari: this.googleFormAlanlari || [],
    istenenEvraklar: this.istenenEvraklar || [],
    sorular: this.sorular || []
  };
};

module.exports = mongoose.model('IslemTuru', islemTuruSchema);
