// 📦 NACE 6-LI KODLARI MODELİ
// Yeni Teşvik Sistemi için NACE kodları (6 lı) veritabanı modeli

const mongoose = require('mongoose');

const naceCodeSchema = new mongoose.Schema({
  kod: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    index: true,
    maxlength: 32
  },
  aciklama: {
    type: String,
    required: true,
    trim: true,
    index: 'text',
    maxlength: 600
  },
  kategori: {
    // Ana bölüm: A, B, C ... gibi başlık satırları
    type: String,
    trim: true,
    index: true,
    default: ''
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
  collection: 'nacecodes'
});

naceCodeSchema.index({ kod: 1, kategori: 1 });

// Statics
naceCodeSchema.statics.searchCodes = function(query, limit = 50) {
  const q = (query || '').trim();
  const filter = {
    aktif: true,
    $or: [
      { kod: { $regex: q, $options: 'i' } },
      { aciklama: { $regex: q, $options: 'i' } }
    ]
  };
  return this.find(filter).sort({ kullanimSayisi: -1, kod: 1 }).limit(limit);
};

naceCodeSchema.statics.getCategories = function() {
  return this.distinct('kategori', { aktif: true });
};

naceCodeSchema.statics.findByKod = function(kod) {
  return this.findOne({ kod, aktif: true });
};

module.exports = mongoose.model('NaceCode', naceCodeSchema);