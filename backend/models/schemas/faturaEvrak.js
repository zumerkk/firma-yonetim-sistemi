const mongoose = require('mongoose');
const { EVRAK_BOYUTU, EVRAK_TURLERI } = require('../../constants/faturaEvrak');

const faturaEvrakSchema = new mongoose.Schema({
  tur: { type: String, enum: EVRAK_TURLERI, required: true },
  dosyaAdi: { type: String, required: true, maxlength: 180 },
  mimeType: { type: String, enum: ['application/pdf', 'application/xml'], required: true },
  fileSize: { type: Number, required: true, min: 1, max: EVRAK_BOYUTU },
  yuklemeTarihi: { type: Date, default: Date.now },
  depo: { type: mongoose.Schema.Types.Mixed, select: false, required: true },
  istekId: { type: String, select: false },
  istekOzeti: { type: String, select: false }
}, {
  toJSON: {
    transform: (_doc, ret) => {
      delete ret.depo;
      delete ret.istekId;
      delete ret.istekOzeti;
      return ret;
    }
  }
});

module.exports = faturaEvrakSchema;
