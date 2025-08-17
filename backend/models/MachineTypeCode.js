// 🏷️ Makine Teçhizat Tipi Kodları Modeli
const mongoose = require('mongoose');

const machineTypeCodeSchema = new mongoose.Schema({
  kod: { type: String, required: true, unique: true, trim: true, index: true },
  aciklama: { type: String, required: true, trim: true },
  aktif: { type: Boolean, default: true, index: true }
}, { timestamps: true, collection: 'machinetypecodes' });

machineTypeCodeSchema.statics.search = function(q = '', limit = 100) {
  const filter = {};
  if (q) {
    filter.$or = [
      { kod: { $regex: q, $options: 'i' } },
      { aciklama: { $regex: q, $options: 'i' } }
    ];
  }
  return this.find(filter).sort({ kod: 1 }).limit(Math.min(limit, 1000)).select('kod aciklama').lean();
};

module.exports = mongoose.model('MachineTypeCode', machineTypeCodeSchema);


