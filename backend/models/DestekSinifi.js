// 🎯 DESTEK SINIFI MODEL
// CSV verilerinden oluşturulan destek sınıfı kategorileri

const mongoose = require('mongoose');

const destekSinifiSchema = new mongoose.Schema({
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
    index: true
  },
  aktif: {
    type: Boolean,
    default: true,
    index: true
  }
}, {
  timestamps: true,
  collection: 'destekSiniflari'
});

// Indexes
destekSinifiSchema.index({ kod: 1, aktif: 1 });
destekSinifiSchema.index({ kategori: 1, aktif: 1 });

// Static methods
destekSinifiSchema.statics.getAktifDestekSiniflari = function() {
  return this.find({ aktif: true }).sort({ kategori: 1, kod: 1 });
};

destekSinifiSchema.statics.getByKategori = function(kategori) {
  return this.find({ kategori, aktif: true }).sort({ kod: 1 });
};

module.exports = mongoose.model('DestekSinifi', destekSinifiSchema);