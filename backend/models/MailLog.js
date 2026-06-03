// 📨 MAIL LOG - Gönderilen/taslak/başarısız her mailin kaydı
// Hem manuel hem otomatik (barkod akışı, hatırlatma) mailler buraya yazılır.

const mongoose = require('mongoose');
const { MAIL_STATUS } = require('../constants/tesvikMakineMail');

const mailLogSchema = new mongoose.Schema({
  // Belge + makine bağı
  tesvikModel: { type: String, enum: ['Tesvik', 'YeniTesvik'] },
  tesvikId: { type: mongoose.Schema.Types.ObjectId, index: true },
  machineProcessId: { type: mongoose.Schema.Types.ObjectId, ref: 'MachineProcess', index: true },
  rowId: { type: String, trim: true },

  templateCode: { type: String, trim: true, index: true },
  toEmails: { type: [String], default: [] },
  ccEmails: { type: [String], default: [] },
  subject: { type: String, trim: true, default: '' },
  body: { type: String, default: '' },

  smtpMessageId: { type: String, trim: true, default: '' },
  status: { type: String, enum: Object.values(MAIL_STATUS), default: MAIL_STATUS.DRAFT, index: true },
  errorMessage: { type: String, trim: true, default: '' },

  isReminder: { type: Boolean, default: false },
  reminderJobId: { type: mongoose.Schema.Types.ObjectId, ref: 'ReminderJob' },

  sentAt: { type: Date },
  createdByUserId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
}, {
  timestamps: true,
  collection: 'maillogs'
});

mailLogSchema.index({ machineProcessId: 1, createdAt: -1 });

module.exports = mongoose.model('MailLog', mailLogSchema);
