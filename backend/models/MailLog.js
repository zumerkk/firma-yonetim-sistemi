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
  // Toplu mail TEK mail olarak gider ve tek kayıt tutulur (N kayıt "N mail gitti" izlenimi verirdi);
  // kapsanan bütün makineler (ilki dahil) burada — her makinenin mail geçmişinde görünsün diye.
  // Müşteri (21.09.2026): "toplu mail gönderirken 'son mail' kısmı sadece ilk seçtiğimiz kayıtta çıkıyor"
  kapsananSurecIds: { type: [mongoose.Schema.Types.ObjectId], ref: 'MachineProcess', default: [], index: true },
  // Maile eklenen dosyaların adları (ör. gümrükten alınan beyanname listesi); dosyanın kendisi saklanmaz
  ekDosyaAdlari: { type: [String], default: [] },

  templateCode: { type: String, trim: true, index: true },
  toEmails: { type: [String], default: [] },
  ccEmails: { type: [String], default: [] },
  subject: { type: String, trim: true, default: '' },
  body: { type: String, default: '' },

  smtpMessageId: { type: String, trim: true, default: '' },
  // Mail sunucusunun kabul cevabı (ör. "250 2.0.0 OK 1728… - gsmtp") ve reddettiği alıcılar — "gönderildi
  // diyor ama gelmiyor" sorularında maile sunucunun ne dediği buradan görülür (bkz. mailService.sendMail)
  smtpYaniti: { type: String, trim: true, default: '' },
  reddedilenler: { type: [String], default: [] },
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
