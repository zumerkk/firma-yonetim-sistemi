// 📨 İŞLEM TALEBİ - Bir firmadan belirli bir işlem için evrak istenmesi
// Akış (müşteri sheet'i): Firma seç → İstenenler listesi → Evraklar → Mail gönderme
// İstenen evraklar şablondan kopyalanır ama talep bazında serbestçe düzenlenebilir
// ("istenen belgelere ekleme çıkarma yapabilelim, tablolara müdahale edebilelim").

const mongoose = require('mongoose');

const ornekDosyaSchema = new mongoose.Schema({
  dosyaAdi: { type: String, trim: true },
  fileUrl: { type: String, trim: true },
  filePath: { type: String, trim: true },
  mimeType: { type: String, trim: true },
  fileSize: { type: Number, default: 0 }
}, { _id: false });

const DURUMLAR = ['taslak', 'mail_gonderildi', 'kismi_geldi', 'tamamlandi', 'iptal'];

// Talep bazındaki istenen evrak: şablondan gelir, kullanıcı ekler/çıkarır
const talepEvrakSchema = new mongoose.Schema({
  ad: { type: String, required: true, trim: true, maxlength: 200 },
  // ⚠️ IslemTuru.istenenEvraklar.aciklama ile AYNI sınır olmalı — metin oradan
  // buraya kopyalanıyor. Ayrıştıkları için üretimde talep açılamıyordu:
  // "istenenEvraklar.1.aciklama ... is longer than the maximum allowed length (500)".
  aciklama: { type: String, trim: true, maxlength: 2000, default: '' },
  zorunlu: { type: Boolean, default: true },
  // Firmaya gönderilen örnek/şablon dosya (varsa maile eklenir)
  // Eski tekli kayıt okunur; yeni dosyalar bu dizide tutulur.
  ornekDosyalar: { type: [ornekDosyaSchema], default: undefined },
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
  yuklenememeNedeni: { type: String, trim: true, maxlength: 2000, default: '' },
  nedenBildirimTarihi: { type: Date },
  geldiMi: { type: Boolean, default: false },
  gelisTarihi: { type: Date },
  // 🔁 Eksik / hatalı — tekrar iste. Müşteri (09.10.2026): "Firma evrak gönderince eksik veya yanlış yüklese
  // de işlem tamamlanıyor, biz aynı maili tekrar revize edip aynı link üzerinden gönderebilirsek iyi olur."
  // Personel gelen evrakı işaretler: bu tarihten ÖNCEKİ yüklemeler ve bildirilen neden evrakı artık "geldi"
  // saymaz (dosyalar silinmez, kayıtta kalır). Firma aynı linkten yeni dosya yükleyince evrak yeniden gelir.
  tekrarIstemeTarihi: { type: Date },
  tekrarIstemeNotu: { type: String, trim: true, maxlength: 1000, default: '' },
  tekrarIsteyenAdi: { type: String, trim: true, default: '' }
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

  // 📎 Belge Takip'ten açılan evrak talebi. Müşteri (22.09.2026): "İşlem & Evrak modülündeki yeni belge
  // takibi mail kısmını, doğrudan Belge Takip modülündeki mail gönderme kısmına da ekleyebilir miyiz bu
  // 'mailde iste-evrak talebi' kısmı da dahil (pop-up gibi olabilir) ... İki alanda da birebir aynı olsun."
  // Talep yine İşlem & Evrak talebidir (aynı ekran, aynı mail, aynı yükleme linki); yalnız hangi Belge Takip
  // talebinden açıldığı tutulur ki Belge Takip'in Firma Maili sekmesinde listelensin.
  dosyaTakip: { type: mongoose.Schema.Types.ObjectId, ref: 'DosyaTakip', default: null, index: true },

  istenenEvraklar: { type: [talepEvrakSchema], default: [] },
  yuklenenEvraklar: { type: [yuklenenEvrakSchema], default: [] },
  // ➕ Firmanın yükleme sayfasından kendi eklediği belgeler. Müşteri (13.10.2026): "Firma için yükleme
  // linkinde en alt kısma + işareti ile Ek belge ekleme koyalım firma isterse ekleyebilsin. Belge ismi yazıp
  // kaydetsin > sonra yüklesin, sadece bir işlem için kayıtlı olsun ama her işlemde kaydettiği ekler
  // görünmesin." Personelin düzenlediği istenenEvraklar'dan AYRI: personel ekranının otomatik kaydı listeyi
  // bütünüyle yazdığı için orada dursa firma eklediği anda açık ekran onu silerdi. Talebin tamamlanma
  // hesabına girmez; yüklenen dosya yuklenenEvraklar'a bu kaydın kimliğiyle düşer.
  firmaEkBelgeleri: {
    type: [new mongoose.Schema({
      ad: { type: String, required: true, trim: true, maxlength: 200 },
      ekleyenAdi: { type: String, trim: true, default: '', maxlength: 120 },
      eklemeTarihi: { type: Date, default: Date.now }
    }, { _id: true })],
    default: []
  },

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
  talepMetni: { type: String, default: '', maxlength: 3000 },
  mailGovdesi: { type: String, default: '' },
  mailAlicilar: { type: [String], default: [] },
  mailCc: { type: [String], default: [] },
  sonMailTarihi: { type: Date },
  // Taslak sonradan düzenlense de firma yalnız gönderilmiş içeriği görür.
  sonGonderilenMail: {
    konu: { type: String },
    govde: { type: String },
    tarih: { type: Date }
  },
  // Firmadan evrak gelince haber bu kişiye gider (takibi yapan atanmamışsa).
  // Müşteri (29.09.2026): "belge yüklendi diye mail bilgi@gmplanlama.com'a düşüyor ya, onu
  // takibi yapan'a düşürtebilir miyiz? Takibi yapan atanmamışsa, maili kim gönderdi ise ona düşsün."
  sonMailGonderen: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  mailGonderimSayisi: { type: Number, default: 0 },
  // Gönderilen her mailin izi — ilk talep ve aynı linkle giden devam mailleri ayrı görünsün
  mailGecmisi: {
    type: [new mongoose.Schema({
      tarih: { type: Date, default: Date.now },
      tur: { type: String, enum: ['ilk', 'devam'], default: 'ilk' },
      konu: { type: String, trim: true, default: '' },
      alicilar: { type: [String], default: [] },
      gonderenAdi: { type: String, trim: true, default: '' },
      smtpYaniti: { type: String, trim: true, default: '' }, // mail sunucusunun kabul cevabı (bkz. mailService)
      // Gönderilen içerik — müşteri (23.10.2026): "Devam maili hazırladığımızda linkte en güncel mail içeriği
      // görünüyor birde ama eski/önceki gönderilen mailleri de kapalı bir şekilde gösterme şansımız var mı
      // acaba bir bütün olarak?" Bu alandan önceki gönderimlerde içerik yoktur (yalnız son mail ayrı tutuluyordu).
      govde: { type: String, default: '', maxlength: 60000 },
      ekIdler: { type: [mongoose.Schema.Types.ObjectId], default: [] } // bu mailde giden mailEkleri
    }, { _id: false })],
    default: []
  },

  // 📎 Maile özel eklenen dosyalar (mail taslağındaki "Dosya Ekle") — gönderimden sonra saklanır ki yükleme
  // linkinde de indirilebilsin. Müşteri (23.10.2026): "Dosya eklediğimizde yükleme linkinde görünmüyor sadece
  // mailde ek olarak görünüyor, oraya eklediğimiz dosyaları da link'in içine dahil edebilir miyiz?"
  mailEkleri: {
    type: [new mongoose.Schema({
      dosyaAdi: { type: String, trim: true, default: '' },   // görünen (onarılmış) ad
      fileUrl: { type: String, trim: true, default: '' },
      filePath: { type: String, trim: true, default: '' },
      mimeType: { type: String, trim: true, default: '' },
      fileSize: { type: Number, default: 0 },
      tarih: { type: Date, default: Date.now }
    }, { _id: true })],
    default: []
  },

  // Firmanın evrak yükleyeceği public bağlantı
  uploadToken: { type: String, trim: true, index: true, sparse: true },
  uploadTokenExpiresAt: { type: Date },

  durum: { type: String, enum: DURUMLAR, default: 'taslak', index: true },
  notlar: { type: String, trim: true, maxlength: 2000, default: '' },
  sonDegisiklikler: { not: Date, dosya: Date },

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

// Silinen/yeniden istenen evrak ve değiştirilen açıklamalar da ortak Dashboard'da güncel kalır.
islemTalebiSchema.pre('save', function () {
  const simdi = new Date();
  const degisim = {};
  if (this.isModified('yuklenenEvraklar') || this.isModified('firmaEkBelgeleri') || this.isModified('aktif')) {
    degisim.dosya = simdi;
  }
  if (this.isModified('notlar') || this.isModified('istenenEvraklar')) degisim.not = simdi;
  this.$locals.dashboardDegisimi = this.isNew ? {} : degisim;
  if (!this.isNew) Object.entries(degisim).forEach(([alan, tarih]) => this.set(`sonDegisiklikler.${alan}`, tarih));
});
islemTalebiSchema.post('save', async function () {
  const degisim = this.$locals.dashboardDegisimi || {};
  if (!this.dosyaTakip || !Object.keys(degisim).length) return;
  try {
    await require('./DosyaTakip').updateOne({ _id: this.dosyaTakip }, {
      $max: Object.fromEntries(Object.entries(degisim).map(([a, t]) => [`sonDegisiklikler.${a}`, t]))
    });
  } catch (err) {
    console.error('İşlem evrak Dashboard özeti güncellenemedi:', err.message);
  }
});

// Yüklenen evraklara göre "geldi" işaretlerini ve genel durumu tazele
islemTalebiSchema.methods.durumTazele = function () {
  const istenen = this.istenenEvraklar || [];
  for (const ev of istenen) {
    // "Tekrar istendi" ise yalnız o andan SONRAKİ yükleme / neden bildirimi sayılır
    const esik = ev.tekrarIstemeTarihi ? new Date(ev.tekrarIstemeTarihi).getTime() : 0;
    const sonra = (t) => !esik || (!!t && new Date(t).getTime() > esik);
    const geldi = (!!ev.yuklenememeNedeni?.trim() && sonra(ev.nedenBildirimTarihi)) || (this.yuklenenEvraklar || []).some(
      (y) => String(y.istenenEvrakId || '') === String(ev._id) && sonra(y.yuklemeTarihi)
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
  else if (gelenSayisi || (this.yuklenenEvraklar || []).length) this.durum = 'kismi_geldi';
  else if (this.mailGonderimSayisi > 0) this.durum = 'mail_gonderildi';
  else this.durum = 'taslak';
  return this;
};

module.exports = mongoose.model('IslemTalebi', islemTalebiSchema);
