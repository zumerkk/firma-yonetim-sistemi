// 🏷️ Kullanılmış Makine Kodları Modeli
const mongoose = require('mongoose');

const usedMachineCodeSchema = new mongoose.Schema({
  kod: { type: String, required: true, unique: true, trim: true, index: true },
  aciklama: { type: String, required: true, trim: true },
  aktif: { type: Boolean, default: true, index: true }
}, { timestamps: true, collection: 'usedmachinecodes' });

usedMachineCodeSchema.statics.search = function(q = '', limit = 50) {
  const filter = {};
  if (q) {
    filter.$or = [
      { kod: { $regex: q, $options: 'i' } },
      { aciklama: { $regex: q, $options: 'i' } }
    ];
  }
  return this.find(filter).sort({ kod: 1 }).limit(Math.min(limit, 200)).select('kod aciklama').lean();
};

module.exports = mongoose.model('UsedMachineCode', usedMachineCodeSchema);


