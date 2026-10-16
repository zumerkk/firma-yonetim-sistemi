const mongoose = require('mongoose');

// Notlar belge snapshot'ından ve müşteri çıktılarından ayrı tutulur.
const schema = new mongoose.Schema({
  tesvikModel: { type: String, enum: ['Tesvik', 'YeniTesvik'], required: true },
  tesvikId: { type: mongoose.Schema.Types.ObjectId, required: true },
  metin: { type: String, trim: true, required: true, maxlength: 5000 },
  kullanici: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  kullaniciAdi: { type: String, required: true }
}, { timestamps: true });
schema.index({ tesvikModel: 1, tesvikId: 1, createdAt: -1 });

module.exports = mongoose.model('BelgeOzelNot', schema);
