// ✉️ MAIL TEMPLATE - Düzenlenebilir mail şablonları
// code benzersizdir; servis şablonu code üzerinden çözer. DB boşsa seedMailTemplates ile doldurulur.

const mongoose = require('mongoose');

const mailTemplateSchema = new mongoose.Schema({
  code: { type: String, required: true, unique: true, trim: true, index: true },
  name: { type: String, required: true, trim: true },
  subjectTemplate: { type: String, required: true, trim: true },
  bodyTemplate: { type: String, required: true },
  description: { type: String, trim: true, default: '' },
  isActive: { type: Boolean, default: true },
  // Varsayılan şablon sürümü — seed sırasında elle düzenlenmemiş kayıtları yeni varsayılana taşımak için
  version: { type: Number, default: 1 },
  // Şablonda kullanılan placeholder'lar (otomatik tespit edilip kaydedilir — referans amaçlı)
  placeholders: { type: [String], default: [] },
  updatedByUserId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
}, {
  timestamps: true,
  collection: 'mailtemplates'
});

module.exports = mongoose.model('MailTemplate', mailTemplateSchema);
