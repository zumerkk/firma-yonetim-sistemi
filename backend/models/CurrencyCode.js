// 💱 DÖVİZ KODLARI VERİTABANI MODELİ
// İthal liste ve mali hesaplamalarda kullanılacak döviz cinslerini saklar

const mongoose = require('mongoose');

const currencyCodeSchema = new mongoose.Schema({
  // Örn: USD, EUR, TRY
  kod: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    uppercase: true,
    index: true,
    maxlength: 10
  },

  aciklama: {
    type: String,
    required: true,
    trim: true,
    index: 'text',
    maxlength: 200
  },

  aktif: { type: Boolean, default: true, index: true },
  kullanimSayisi: { type: Number, default: 0 }
}, {
  timestamps: true,
  collection: 'currencycodes'
});

currencyCodeSchema.statics.searchCodes = function(query, limit = 100) {
  const q = (query || '').trim();
  const filter = {}; // aktif filtresi kaldırıldı (csv verilerinde aktif olmayabilir)
  let sort = { kullanimSayisi: -1, kod: 1 };

  if (q) {
    filter.$or = [
      { kod: { $regex: q, $options: 'i' } },
      { aciklama: { $regex: q, $options: 'i' } }
    ];
    if (/^[A-Z]{2,4}$/.test(q)) sort = { kod: 1 };
  }

  return this.find(filter)
    .sort(sort)
    .limit(Math.min(parseInt(limit, 10) || 100, 2000))
    .select('kod aciklama kullanimSayisi')
    .lean();
};

module.exports = mongoose.model('CurrencyCode', currencyCodeSchema);


