// ⏰ REMINDER JOB - Hatırlatma kuyruğu
// Bir mail gönderildiğinde dueAt = sentAt + REMINDER_DAYS ile pending bir job oluşur.
// Cron her gün pending & vadesi gelmiş jobları işler; cevap/güncelleme varsa skipped yapar.

const mongoose = require('mongoose');
const { REMINDER_TYPE } = require('../constants/tesvikMakineMail');

const reminderJobSchema = new mongoose.Schema({
  machineProcessId: { type: mongoose.Schema.Types.ObjectId, ref: 'MachineProcess', required: true, index: true },
  mailLogId: { type: mongoose.Schema.Types.ObjectId, ref: 'MailLog' }, // hatırlatılan asıl mail

  dueAt: { type: Date, required: true, index: true },
  status: { type: String, enum: ['pending', 'sent', 'skipped', 'failed'], default: 'pending', index: true },
  reminderType: { type: String, enum: Object.values(REMINDER_TYPE), default: REMINDER_TYPE.NO_RESPONSE },

  attemptCount: { type: Number, default: 0 },
  lastError: { type: String, trim: true, default: '' },
  skipReason: { type: String, trim: true, default: '' },
  sentAt: { type: Date }
}, {
  timestamps: true,
  collection: 'reminderjobs'
});

// Cron taraması: pending + vadesi gelmiş
reminderJobSchema.index({ status: 1, dueAt: 1 });

module.exports = mongoose.model('ReminderJob', reminderJobSchema);
