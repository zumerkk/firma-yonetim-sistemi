// 🧾 MACHINE PROCESS LOG - Audit / Timeline kaydı
// Durum değişiklikleri, mailler, evraklar, hatırlatmalar ve notlar bu tabloya işlenir.
// Makine detayındaki timeline bu kayıtlardan üretilir. (Spec: "Kritik işlemlerde audit log tut.")

const mongoose = require('mongoose');
const { PROCESS_ACTION } = require('../constants/tesvikMakineMail');

const machineProcessLogSchema = new mongoose.Schema({
  machineProcessId: { type: mongoose.Schema.Types.ObjectId, ref: 'MachineProcess', required: true, index: true },
  rowId: { type: String, trim: true },
  tesvikModel: { type: String, enum: ['Tesvik', 'YeniTesvik'] },
  tesvikId: { type: mongoose.Schema.Types.ObjectId },

  actionType: { type: String, enum: Object.values(PROCESS_ACTION), required: true, index: true },
  oldStatus: { type: String, trim: true, default: '' },
  newStatus: { type: String, trim: true, default: '' },
  note: { type: String, trim: true, default: '' },

  // Serbest ek bilgi (mailLogId, fileName, templateCode vb.)
  meta: { type: mongoose.Schema.Types.Mixed, default: {} },

  // Public/sistem işlemlerinde kullanıcı olmayabilir
  performedByUserId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  performedByLabel: { type: String, trim: true, default: '' } // ör: "Sistem", "Müşteri (token)"
}, {
  timestamps: true,
  collection: 'machineprocesslogs'
});

machineProcessLogSchema.index({ machineProcessId: 1, createdAt: -1 });

module.exports = mongoose.model('MachineProcessLog', machineProcessLogSchema);
