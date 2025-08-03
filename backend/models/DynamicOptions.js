const mongoose = require('mongoose');

// 🎯 Dinamik Destek Unsuru Modeli
const destekUnsuruSchema = new mongoose.Schema({
  value: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  label: {
    type: String,
    required: true,
    trim: true
  },
  kategori: {
    type: String,
    required: true,
    enum: ['Sigorta', 'Vergi', 'Gümrük', 'Finansal', 'Yer', 'Zorunluluk', 'Diğer'],
    default: 'Diğer'
  },
  renk: {
    type: String,
    default: '#6B7280' // Varsayılan gri renk
  },
  aktif: {
    type: Boolean,
    default: true
  },
  ekleyenKullanici: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  kullanimSayisi: {
    type: Number,
    default: 0 // Kaç kez kullanıldığını takip etmek için
  }
}, {
  timestamps: true
});

// 🚀 Kullanım sayısını artıran metot
destekUnsuruSchema.methods.incrementUsage = function() {
  this.kullanimSayisi += 1;
  return this.save();
};

// 📋 Dinamik Destek Şartı Modeli
const destekSartiSchema = new mongoose.Schema({
  value: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  label: {
    type: String,
    required: true,
    trim: true
  },
  kategori: {
    type: String,
    required: true,
    enum: ['1. Bölge', '2. Bölge', '3. Bölge', '4. Bölge', '5. Bölge', '6. Bölge', 'Stratejik', 'Hamle', 'Liste', 'Diğer'],
    default: 'Diğer'
  },
  yuzde: {
    type: Number,
    min: 0,
    max: 100
  },
  yil: {
    type: Number,
    min: 1,
    max: 20
  },
  aktif: {
    type: Boolean,
    default: true
  },
  ekleyenKullanici: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  kullanimSayisi: {
    type: Number,
    default: 0
  }
}, {
  timestamps: true
});

destekSartiSchema.methods.incrementUsage = function() {
  this.kullanimSayisi += 1;
  return this.save();
};

// 🎯 Dinamik Özel Şart Modeli
const ozelSartSchema = new mongoose.Schema({
  kisaltma: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    uppercase: true
  },
  aciklama: {
    type: String,
    required: true,
    trim: true
  },
  kategori: {
    type: String,
    required: true,
    enum: ['SGK', '1. Bölge', '2. Bölge', '3. Bölge', '4. Bölge', '5. Bölge', 'Zorunluluk', 'Faiz', 'Sigorta', 'Yatırım', 'Makine', 'Genel', 'Ruhsat', 'Diğer'],
    default: 'Diğer'
  },
  aktif: {
    type: Boolean,
    default: true
  },
  ekleyenKullanici: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  kullanimSayisi: {
    type: Number,
    default: 0
  }
}, {
  timestamps: true
});

ozelSartSchema.methods.incrementUsage = function() {
  this.kullanimSayisi += 1;
  return this.save();
};

// 📝 Dinamik Özel Şart Notu Modeli
const ozelSartNotuSchema = new mongoose.Schema({
  value: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  label: {
    type: String,
    required: true,
    trim: true
  },
  kategori: {
    type: String,
    required: true,
    enum: ['Bölgesel teşvik kapsamında', 'SGK primleri için geçerli', 'Yatırım tutarı sınırlaması var', 'Faiz desteği süre sınırı: 5 yıl', 'Sigorta başlama tarihi önemli', 'Öncelikli yatırım listesinde', 'Finansal kiralama şartları uygulanır', 'Kullanılmış makine münferit', 'İşyeri açma ve çalışma ruhsatı zorunlu', 'Diğer özel şartlar için açıklama ekleyin', 'Diğer'],
    default: 'Diğer'
  },
  aktif: {
    type: Boolean,
    default: true
  },
  ekleyenKullanici: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  kullanimSayisi: {
    type: Number,
    default: 0
  }
}, {
  timestamps: true
});

ozelSartNotuSchema.methods.incrementUsage = function() {
  this.kullanimSayisi += 1;
  return this.save();
};

// 📊 İndeksler - Performans için
destekUnsuruSchema.index({ value: 1, aktif: 1 });
destekUnsuruSchema.index({ kategori: 1, kullanimSayisi: -1 });

destekSartiSchema.index({ value: 1, aktif: 1 });
destekSartiSchema.index({ kategori: 1, kullanimSayisi: -1 });

ozelSartSchema.index({ kisaltma: 1, aktif: 1 });
ozelSartSchema.index({ kategori: 1, kullanimSayisi: -1 });

ozelSartNotuSchema.index({ value: 1, aktif: 1 });
ozelSartNotuSchema.index({ kategori: 1, kullanimSayisi: -1 });

// 🔧 Modelleri dışa aktar
const DestekUnsuru = mongoose.model('DestekUnsuru', destekUnsuruSchema);
const DestekSarti = mongoose.model('DestekSarti', destekSartiSchema);
const OzelSart = mongoose.model('OzelSart', ozelSartSchema);
const OzelSartNotu = mongoose.model('OzelSartNotu', ozelSartNotuSchema);

module.exports = {
  DestekUnsuru,
  DestekSarti,
  OzelSart,
  OzelSartNotu
};