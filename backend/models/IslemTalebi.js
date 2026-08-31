// 📨 İŞLEM TALEBİ - Bir firmadan belirli bir işlem için evrak istenmesi
// Akış (müşteri sheet'i): Firma seç → İstenenler listesi → Evraklar → Mail gönderme
// İstenen evraklar şablondan kopyalanır ama talep bazında serbestçe düzenlenebilir
// ("istenen belgelere ekleme çıkarma yapabilelim, tablolara müdahale edebilelim").

const mongoose = require('mongoose');

const DURUMLAR = ['taslak', 'mail_gonderildi', 'kismi_geldi', 'tamamlandi', 'iptal'];

// Talep bazındaki istenen evrak: şablondan gelir, kullanıcı ekler/çıkarır
const talepEvrakSchema = new mongoose.Schema({
  ad: { type: String, required: true, trim: true, maxlength: 200 },
  aciklama: { type: String, trim: true, maxlength: 500, default: '' },
  zorunlu: { type: Boolean, default: true },
  // Firmaya gönderilen örnek/şablon dosya (varsa maile eklenir)
  ornekDosya: {
    dosyaAdi: { type: String, trim: true },
    fileUrl: { type: String, trim: true },
    filePath: { type: String, trim: true },
    mimeType: { type: String, trim: true },
    fileSize: { type: Number, default: 0 }
  },
  // Kim istedi (müşteri: "firmadan istenen evraklar ve kimin istediği görünsün")
  isteyenKullanici: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  isteyenAdi: { type: String, trim: true, default: '' },
  istenmeTarihi: { type: Date, default: Date.now },
  // Firma bu evrakı yükledi mi? (yüklenen dosyalar ayrı dizide, burada özet durum)
  geldiMi: { type: Boolean, default: false },
  gelisTarihi: { type: Date }
}, { _id: true });

// Firmanın public linkten yüklediği dosyalar
const yuklenenEvrakSchema = new mongoose.Schema({
  // Hangi istenen evraka karşılık geldiği (opsiyonel — firma serbest de yükleyebilir)
  istenenEvrakId: { type: mongoose.Schema.Types.ObjectId },
  istenenEvrakAdi: { type: String, trim: true, default: '' },
  dosyaAdi: { type: String, required: true, trim: true },
  orijinalAd: { type: String, trim: true, default: '' },
  fileUrl: { type: String, trim: true, default: '' },
  filePath: { type: String, trim: true, default: '' },
  mimeType: { type: String, trim: true, default: '' },
  fileSize: { type: Number, default: 0 },
  yukleyenAdi: { type: String, trim: true, default: '' }, // firma tarafı serbest metin
  yuklemeTarihi: { type: Date, default: Date.now },
  gorulduMu: { type: Boolean, default: false }
}, { _id: true });

const islemTalebiSchema = new mongoose.Schema({
  firma: { type: mongoose.Schema.Types.ObjectId, ref: 'Firma', required: true, index: true },
  firmaAdi: { type: String, trim: true, default: '' },   // snapshot (liste hızlı okusun)
  firmaEmail: { type: String, trim: true, default: '' },

  islemTuru: { type: mongoose.Schema.Types.ObjectId, ref: 'IslemTuru', required: true, index: true },
  islemTuruAdi: { type: String, trim: true, default: '' }, // snapshot
  varyantKod: { type: String, trim: true, default: '' },   // 'sahis' | 'sirket' | ''
  varyantAd: { type: String, trim: true, default: '' },

  istenenEvraklar: { type: [talepEvrakSchema], default: [] },
  yuklenenEvraklar: { type: [yuklenenEvrakSchema], default: [] },

  // 🔀 Sihirbazda verilen EVET/HAYIR cevapları. Hem iz kaydı hem de varyant
  // değiştirilince listeyi aynı koşullarla yeniden süzebilmek için saklanır.
  cevaplar: {
    type: [new mongoose.Schema({
      soruId: { type: String, trim: true },
      metin: { type: String, trim: true, default: '' },   // soru metni anlık kopya
      deger: { type: String, enum: ['EVET', 'HAYIR'], required: true }
    }, { _id: false })],
    default: []
  },

  // Mail (düzenlenebilir; gönderim öncesi son hali saklanır)
  mailKonusu: { type: String, trim: true, default: '' },
  mailGovdesi: { type: String, default: '' },
  mailAlicilar: { type: [String], default: [] },
  mailCc: { type: [String], default: [] },
  sonMailTarihi: { type: Date },
  mailGonderimSayisi: { type: Number, default: 0 },

  // Firmanın evrak yükleyeceği public bağlantı
  uploadToken: { type: String, trim: true, index: true, sparse: true },
  uploadTokenExpiresAt: { type: Date },

  durum: { type: String, enum: DURUMLAR, default: 'taslak', index: true },
  notlar: { type: String, trim: true, maxlength: 2000, default: '' },

  olusturanKullanici: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  olusturanAdi: { type: String, trim: true, default: '' },
  sonGuncelleyen: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  aktif: { type: Boolean, default: true, index: true }
}, {
  timestamps: true,
  collection: 'islemtalepleri'
});

islemTalebiSchema.index({ firma: 1, createdAt: -1 });
islemTalebiSchema.index({ durum: 1, createdAt: -1 });

islemTalebiSchema.statics.DURUMLAR = DURUMLAR;

// Yüklenen evraklara göre "geldi" işaretlerini ve genel durumu tazele
islemTalebiSchema.methods.durumTazele = function () {
  const istenen = this.istenenEvraklar || [];
  for (const ev of istenen) {
    const geldi = (this.yuklenenEvraklar || []).some(
      (y) => String(y.istenenEvrakId || '') === String(ev._id)
    );
    if (geldi && !ev.geldiMi) { ev.geldiMi = true; ev.gelisTarihi = new Date(); }
    if (!geldi) { ev.geldiMi = false; ev.gelisTarihi = undefined; }
  }
  // İptal edilmiş talebin durumu korunur
  if (this.durum === 'iptal') return this;

  const zorunlular = istenen.filter((e) => e.zorunlu);
  const hedef = zorunlular.length ? zorunlular : istenen;
  const gelenSayisi = hedef.filter((e) => e.geldiMi).length;

  if (hedef.length && gelenSayisi === hedef.length) this.durum = 'tamamlandi';
  else if ((this.yuklenenEvraklar || []).length) this.durum = 'kismi_geldi';
  else if (this.mailGonderimSayisi > 0) this.durum = 'mail_gonderildi';
  else this.durum = 'taslak';
  return this;
};

module.exports = mongoose.model('IslemTalebi', islemTalebiSchema);
