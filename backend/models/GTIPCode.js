// 📦 GTIP KODLARI VERİTABANI MODELİ
// ETUYS/GM teşvik sistemi ile uyumlu GTIP arama ve eşleme için

const mongoose = require('mongoose');

const gtipCodeSchema = new mongoose.Schema({
  // 🔑 GTIP Kodu (örn: 842230000000) - iki ad alanı ile backward compatibility
  // kod: yeni alan, gtipKodu: eski koleksiyon indeks uyumu
  kod: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    index: true,
    maxlength: 20
  },

  // Eski şema ile uyum için aynı değeri tutar (Atlas'ta unique index gtipKodu_1 var)
  gtipKodu: {
    type: String,
    required: true,
    trim: true,
    index: true,
    maxlength: 20
  },

  // 📝 Açıklama/Tanım
  aciklama: {
    type: String,
    required: true,
    trim: true,
    index: 'text',
    maxlength: 1000
  },

  // 🎯 Aktif durumu
  aktif: {
    type: Boolean,
    default: true,
    index: true
  },

  // 📊 Kullanım sayısı (popüler kodlar için)
  kullanimSayisi: {
    type: Number,
    default: 0,
    min: 0
  }
}, {
  timestamps: true,
  collection: 'gtipcodes'
});

// 🔍 Text index - kod + açıklama birlikte
gtipCodeSchema.index({ kod: 'text', gtipKodu: 'text', aciklama: 'text' }, {
  weights: { kod: 10, aciklama: 5 },
  name: 'gtip_text_index'
});

// 🚀 Statics
gtipCodeSchema.statics.searchCodes = function(query, limit = 50) {
  const q = (query || '').trim();
  const filter = { aktif: true };
  let sort = { kullanimSayisi: -1, kod: 1 };

  if (q) {
    filter.$or = [
      { kod: { $regex: q, $options: 'i' } },
      { aciklama: { $regex: q, $options: 'i' } }
    ];
    if (/^\d/.test(q)) sort = { kod: 1 };
  }

  return this.find(filter)
    .sort(sort)
    .limit(Math.min(parseInt(limit, 10) || 50, 5000))
    .select('kod aciklama kullanimSayisi')
    .lean();
};

module.exports = mongoose.model('GTIPCode', gtipCodeSchema);


