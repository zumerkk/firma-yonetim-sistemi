const mongoose = require('mongoose');

const schema = new mongoose.Schema({
  _id: { type: String },
  icerik: { type: String, required: true },
  durum: { type: String, enum: ['bekliyor', 'belirsiz', 'gonderildi'], required: true },
  sonuc: mongoose.Schema.Types.Mixed,
  sonKullanma: { type: Date, expires: 0 }
}, { versionKey: false });

module.exports = mongoose.model('MailGonderim', schema);
