// 🎯 Destek Unsuru - Şart Eşleştirmesi Modeli
// Destek unsurları seçildiğinde otomatik olarak hangi şartların geleceğini belirler

const mongoose = require('mongoose');

const destekSartEslesmeSchema = new mongoose.Schema({
  // Destek unsuru türü (ana kategori)
  destekTuru: {
    type: String,
    required: true,
    index: true,
    // Örnek: "Sigorta Primi İşveren Hissesi", "Vergi İndirimi", "Faiz Desteği" vb.
  },
  
  // Bu destek türü için geçerli şartlar
  sartlar: [{
    type: String,
    required: true
    // Örnek: "2 Yıl ve En Fazla Yatırım Tutarının %10'lu (1. Bölge)"
  }],
  
  // Ek bilgiler
  aciklama: {
    type: String,
    default: ''
  },
  
  // Aktif durumu
  aktif: {
    type: Boolean,
    default: true
  },
  
  // Oluşturma ve güncelleme tarihleri
  olusturmaTarihi: {
    type: Date,
    default: Date.now
  },
  guncellemeTarihi: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true,
  versionKey: false
});

// Index'ler
destekSartEslesmeSchema.index({ destekTuru: 1 });
destekSartEslesmeSchema.index({ aktif: 1 });

// Güncelleme tarihini otomatik ayarla
destekSartEslesmeSchema.pre('save', function(next) {
  this.guncellemeTarihi = new Date();
  next();
});

// Static method: Destek türüne göre şartları getir
destekSartEslesmeSchema.statics.getShartlarByDestekTuru = function(destekTuru) {
  return this.findOne({ 
    destekTuru: destekTuru, 
    aktif: true 
  }).select('sartlar');
};

// Static method: Tüm aktif eşleştirmeleri getir
destekSartEslesmeSchema.statics.getTumAktifEslesmeler = function() {
  return this.find({ aktif: true })
    .select('destekTuru sartlar')
    .sort({ destekTuru: 1 });
};

// Instance method: Şart ekle
destekSartEslesmeSchema.methods.sartEkle = function(yeniSart) {
  if (!this.sartlar.includes(yeniSart)) {
    this.sartlar.push(yeniSart);
    return this.save();
  }
  return Promise.resolve(this);
};

// Instance method: Şart kaldır
destekSartEslesmeSchema.methods.sartKaldir = function(sart) {
  this.sartlar = this.sartlar.filter(s => s !== sart);
  return this.save();
};

const DestekSartEslesmesi = mongoose.model('DestekSartEslesmesi', destekSartEslesmeSchema);

module.exports = DestekSartEslesmesi;
