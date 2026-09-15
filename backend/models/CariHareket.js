// 💳 CARİ HAREKET — firma cari defterinin tek satırı
//
// Müşteri önce Belge Takip › Ödemeler sekmesine "ileride cari takip yapmak amacıyla
// başlangıcı olsun" diye mini bir cari tablo, ardından "Cari hesaplar/faturalar-ödeme
// takip" modülü istedi. İkisi AYNI defteri kullanır: talepten girilen hareket `dosyaTakip`
// bağıyla firmanın carisine de düşer; modülden girilen hareketin talep bağı opsiyoneldir.
// Böylece aynı ödeme iki yere ayrı ayrı yazılmaz, iki bakiye birbirini tutmaz hale gelmez.
//
// Hesap kuralları (bakiye, tutar ayrıştırma): services/cari/cariHesap.js

const mongoose = require('mongoose');
const { HAREKET_TURLERI, BANKALAR } = require('../services/cari/cariHesap');

const dosyaSchema = new mongoose.Schema({
  dosyaAdi: { type: String, trim: true },
  dosyaYolu: { type: String, trim: true },
  dosyaTipi: { type: String, trim: true },
  dosyaBoyutu: { type: Number },
  cloudinaryPublicId: { type: String, trim: true }
}, { _id: false });

const cariHareketSchema = new mongoose.Schema({
  firma: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Firma',
    required: [true, 'Firma seçimi zorunludur']
  },
  firmaUnvan: { type: String, trim: true, default: '' },
  // Hangi belge takip talebine ait (modülden girilenlerde boş olabilir)
  dosyaTakip: { type: mongoose.Schema.Types.ObjectId, ref: 'DosyaTakip', default: null },

  // fatura: firmaya kesilen fatura · odenen: firma adına ödenen belge ("giden") · gelen: bankaya gelen ödeme
  tur: {
    type: String,
    enum: { values: HAREKET_TURLERI, message: 'Geçersiz hareket türü' },
    required: [true, 'Hareket türü zorunludur']
  },
  tarih: { type: Date, required: [true, 'Tarih zorunludur'] },
  tutar: {
    type: Number,
    required: [true, 'Tutar zorunludur'],
    min: [0.01, 'Tutar sıfırdan büyük olmalıdır'],
    // Kuruştan küçük hane saklanmaz — bakiyeler kuruş üzerinden toplanıyor
    set: (v) => (typeof v === 'number' && Number.isFinite(v) ? Math.round(v * 100) / 100 : v)
  },

  // Türe göre anlamlı alanlar
  belgeAdi: { type: String, trim: true, maxlength: [300, 'Belge adı en fazla 300 karakter olabilir'], default: '' },
  faturaNo: { type: String, trim: true, maxlength: [60, 'Fatura numarası en fazla 60 karakter olabilir'], default: '' },
  banka: { type: String, enum: { values: ['', ...BANKALAR], message: 'Geçersiz banka' }, default: '' },
  aciklama: { type: String, trim: true, maxlength: [500, 'Not en fazla 500 karakter olabilir'], default: '' },
  dosya: { type: dosyaSchema, default: null },

  olusturan: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  olusturanAdi: { type: String, trim: true },
  sonGuncelleyen: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  sonGuncelleyenAdi: { type: String, trim: true }
}, { timestamps: true });

cariHareketSchema.index({ firma: 1, tarih: 1 });
cariHareketSchema.index({ dosyaTakip: 1, tarih: 1 });

// Türe bağlı zorunluluklar — enum/required tek başına ifade edemiyor
cariHareketSchema.pre('validate', function () {
  if (this.tur === 'odenen' && !String(this.belgeAdi || '').trim()) {
    this.invalidate('belgeAdi', 'Ödenen belge adı zorunludur');
  }
  if (this.tur === 'gelen' && !this.banka) {
    this.invalidate('banka', 'Banka seçimi zorunludur');
  }
  // Başka türe ait alan taşınmasın (fatura satırında banka görünmesin vb.)
  if (this.tur !== 'gelen') this.banka = '';
  if (this.tur !== 'fatura') this.faturaNo = '';
});

cariHareketSchema.statics.HAREKET_TURLERI = HAREKET_TURLERI;
cariHareketSchema.statics.BANKALAR = BANKALAR;

module.exports = mongoose.model('CariHareket', cariHareketSchema);
