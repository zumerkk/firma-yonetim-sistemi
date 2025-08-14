// 📦 BİRİM KODLARI VERİTABANI MODELİ
// İthal Liste için kullanılan birim kodlarını hızlı arama/lookup amaçlı saklar

const mongoose = require('mongoose');

const unitCodeSchema = new mongoose.Schema({
  // Örn: "151" , "SET", "KG" vs. CSV'de "BİRİM ID" sütunu
  kod: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    index: true,
    maxlength: 20
  },

  // CSV'de "AÇIKLAMASI" sütunu
  aciklama: {
    type: String,
    required: true,
    trim: true,
    index: 'text',
    maxlength: 200
  },

  aktif: {
    type: Boolean,
    default: true,
    index: true
  },

  kullanimSayisi: { type: Number, default: 0 }
}, {
  timestamps: true,
  collection: 'unitcodes'
});

// 🔎 Basit arama (kod veya açıklama içinde)
unitCodeSchema.statics.searchCodes = function(query, limit = 50) {
  const q = (query || '').trim();
  const filter = {}; // aktif filtresi kaldırıldı (eksik alanlar için)
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

module.exports = mongoose.model('UnitCode', unitCodeSchema);


