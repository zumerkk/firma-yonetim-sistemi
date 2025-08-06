// 📦 US 97 KODLARI VERİTABANI MODELİ
// GM Teşvik Sistemi - MongoDB Collection

const mongoose = require('mongoose');

const us97CodeSchema = new mongoose.Schema({
  // 🔑 US 97 Kodu (örn: 0111.0.01)
  kod: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    index: true, // Hızlı arama için index
    maxlength: 20
  },
  
  // 📝 Açıklama/Tanım
  aciklama: {
    type: String,
    required: true,
    trim: true,
    index: 'text', // Text search için index
    maxlength: 500
  },
  
  // 🏷️ Kategori (Tarım, İmalat, vb.)
  kategori: {
    type: String,
    required: true,
    trim: true,
    index: true, // Kategoriye göre filtreleme
    maxlength: 50
  },
  
  // 🎯 Aktif durumu
  aktif: {
    type: Boolean,
    default: true,
    index: true
  },
  
  // 📊 Kullanım sayısı (popüler kodları üstte göstermek için)
  kullanimSayisi: {
    type: Number,
    default: 0,
    min: 0
  }
}, {
  timestamps: true, // createdAt, updatedAt
  collection: 'us97codes'
});

// 📊 Compound Index - Kod ve kategori ile hızlı arama
us97CodeSchema.index({ kod: 1, kategori: 1 });
us97CodeSchema.index({ kategori: 1, kullanimSayisi: -1 }); // Popüler kodlar

// 🔍 Text Index - Açıklama ve kod üzerinde full-text search
us97CodeSchema.index({ 
  kod: 'text', 
  aciklama: 'text' 
}, {
  weights: {
    kod: 10,      // Kod araması daha yüksek öncelikli
    aciklama: 5   // Açıklama araması daha düşük öncelikli
  },
  name: 'us97_text_index'
});

// 🚀 Static Methods

// Kod ile arama
us97CodeSchema.statics.findByKod = function(kod) {
  return this.findOne({ kod: kod, aktif: true });
};

// Kategori ile arama
us97CodeSchema.statics.findByKategori = function(kategori, limit = 50) {
  return this.find({ kategori: kategori, aktif: true })
    .sort({ kullanimSayisi: -1, kod: 1 })
    .limit(limit);
};

// Text search (kod veya açıklama)
us97CodeSchema.statics.searchCodes = function(query, limit = 20) {
  const searchQuery = {
    aktif: true,
    $or: [
      { kod: { $regex: query, $options: 'i' } },
      { aciklama: { $regex: query, $options: 'i' } }
    ]
  };
  
  return this.find(searchQuery)
    .sort({ kullanimSayisi: -1, kod: 1 })
    .limit(limit);
};

// Popüler kodlar
us97CodeSchema.statics.getPopularCodes = function(limit = 10) {
  return this.find({ aktif: true })
    .sort({ kullanimSayisi: -1, kod: 1 })
    .limit(limit);
};

// Kullanım sayısını artır
us97CodeSchema.methods.incrementUsage = function() {
  this.kullanimSayisi += 1;
  return this.save();
};

// 📊 Virtual - Tam görüntü metni
us97CodeSchema.virtual('fullText').get(function() {
  return `${this.kod} - ${this.aciklama}`;
});

// JSON çıktısında virtual alanları dahil et
us97CodeSchema.set('toJSON', { virtuals: true });

module.exports = mongoose.model('US97Code', us97CodeSchema);