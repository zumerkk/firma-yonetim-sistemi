const mongoose = require('mongoose');
const { HARCAMA_KATEGORILERI } = require('../constants/harcama');
const faturaEvrakSchema = require('./schemas/faturaEvrak');

const schema = new mongoose.Schema({
  tesvikModel: { type: String, enum: ['Tesvik', 'YeniTesvik'], required: true, immutable: true },
  tesvikId: { type: mongoose.Schema.Types.ObjectId, required: true, immutable: true },
  kategori: { type: String, enum: Object.keys(HARCAMA_KATEGORILERI), required: true },
  altKategori: { type: String, required: true },
  tarih: { type: Date, required: true },
  no: { type: String, required: true, maxlength: 100 },
  icerik: { type: String, default: '', maxlength: 500 },
  tutar: { type: Number, required: true, min: 0.01 },
  adet: { type: Number, min: 0, default: 0 },
  girenAdi: { type: String, default: '', maxlength: 120 },
  olusturanKullanici: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  sonGuncelleyen: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  istekId: { type: String, select: false, immutable: true },
  istekOzeti: { type: String, select: false, immutable: true },
  evraklar: { type: [faturaEvrakSchema], default: [] }
}, {
  timestamps: true,
  collection: 'harcamakalemleri',
  toJSON: {
    transform: (_doc, ret) => {
      delete ret.istekId;
      delete ret.istekOzeti;
      return ret;
    }
  }
});

schema.index({ tesvikModel: 1, tesvikId: 1, createdAt: 1, _id: 1 });
schema.index({ tesvikModel: 1, tesvikId: 1, olusturanKullanici: 1, istekId: 1 }, {
  unique: true, partialFilterExpression: { istekId: { $exists: true } }
});

module.exports = mongoose.model('HarcamaKalemi', schema);
