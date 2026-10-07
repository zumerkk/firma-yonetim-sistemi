const mongoose = require('mongoose');

// Snapshot Mixed tutulur: eski kayıtlardaki bilinmeyen alanlar, Date ve ObjectId
// değerleri göç sırasında yeniden cast edilip değişmez. Yeni kayıtlar service'te
// ilgili teşvik modelinin kendi makine revizyonu şemasıyla doğrulanır.
const schema = new mongoose.Schema({
  tesvik: { type: mongoose.Schema.Types.ObjectId, required: true },
  tesvikModeli: { type: String, enum: ['Tesvik', 'YeniTesvik'], required: true },
  sira: { type: Number, required: true, min: 0 },
  snapshot: { type: mongoose.Schema.Types.Mixed, required: true }
}, { collection: 'makinerevizyonkaydis', versionKey: false });

schema.index({ tesvikModeli: 1, tesvik: 1, 'snapshot.revizeId': 1 }, { unique: true });
schema.index({ tesvikModeli: 1, tesvik: 1, sira: 1 }, { unique: true });

module.exports = mongoose.model('MakineRevizyonKaydi', schema);
