// 🌍 OECD KATEGORİ MODEL
// CSV verilerinden oluşturulan OECD (Orta-Yüksek) kategorileri

const mongoose = require('mongoose');

const oecdKategoriSchema = new mongoose.Schema({
  kod: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    index: true
  },
  aciklama: {
    type: String,
    required: true,
    trim: true
  },
  kategori: {
    type: String,
    required: true,
    trim: true,
    default: 'OECD (Orta-Yüksek)',
    index: true
  },
  aktif: {
    type: Boolean,
    default: true,
    index: true
  }
}, {
  timestamps: true,
  collection: 'oecdKategorileri'
});

// Indexes
oecdKategoriSchema.index({ kod: 1, aktif: 1 });
oecdKategoriSchema.index({ kategori: 1, aktif: 1 });

// Static methods
oecdKategoriSchema.statics.getAktifOecdKategorileri = function() {
  return this.find({ aktif: true }).sort({ aciklama: 1 });
};

oecdKategoriSchema.statics.searchByAciklama = function(searchTerm) {
  return this.find({ 
    aktif: true,
    aciklama: { $regex: searchTerm, $options: 'i' }
  }).sort({ aciklama: 1 });
};

module.exports = mongoose.model('OecdKategori', oecdKategoriSchema);