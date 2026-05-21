// 📦 OECD 4 HANELİ KODLARI MODELİ
// Yeni Teşvik Sistemi için OECD 4 haneli kodları (XX.XX formatı) veritabanı modeli

const mongoose = require('mongoose');

const oecdKod4HaneliSchema = new mongoose.Schema({
  kod: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    index: true,
    maxlength: 10,
    validate: {
      validator: function(v) {
        // Nace kodlarını (XX, XX.XX, XX.XX.XX vb.) destekle
        return /^[A-Z0-9\.]+$/.test(v);
      },
      message: props => `${props.value} geçerli bir kod formatı değil!`
    }
  },
  tanim: {
    type: String,
    required: true,
    trim: true,
    index: 'text',
    maxlength: 1000
  },
  aktif: {
    type: Boolean,
    default: true,
    index: true
  },
  kullanimSayisi: {
    type: Number,
    default: 0,
    min: 0
  }
}, {
  timestamps: true,
  collection: 'oecdkod4haneli'
});

// İndeksler
oecdKod4HaneliSchema.index({ kod: 1 });
oecdKod4HaneliSchema.index({ tanim: 'text' });

// Statics - Arama fonksiyonu
oecdKod4HaneliSchema.statics.searchCodes = function(query, limit = 50) {
  const q = (query || '').trim();
  const filter = {
    aktif: true,
    $or: [
      { kod: { $regex: q, $options: 'i' } },
      { tanim: { $regex: q, $options: 'i' } }
    ]
  };
  return this.find(filter).sort({ kullanimSayisi: -1, kod: 1 }).limit(limit);
};

// Statics - Koda göre bul
oecdKod4HaneliSchema.statics.findByKod = function(kod) {
  return this.findOne({ kod, aktif: true });
};

// Statics - Tüm aktif kodları getir
oecdKod4HaneliSchema.statics.getAllActive = function() {
  return this.find({ aktif: true }).sort({ kod: 1 });
};

// Statics - Kullanım sayısını artır
oecdKod4HaneliSchema.statics.incrementUsage = async function(kod) {
  return this.findOneAndUpdate(
    { kod, aktif: true },
    { $inc: { kullanimSayisi: 1 } },
    { new: true }
  );
};

module.exports = mongoose.model('OecdKod4Haneli', oecdKod4HaneliSchema);

