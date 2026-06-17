// 🛠️ MACHINE PROCESS - Teşvik Makine Süreç Takip Modeli
// Mevcut Tesvik/YeniTesvik içindeki gömülü makine satırlarına (rowId) referans verir.
// Makine MASTER verisi (ad, fiyat, adet) gömülü satırda kalır — burada yalnızca
// İŞ AKIŞI verisi (durum, tedarikçi/müşteri mail, hatırlatma) + hızlı listeleme için snapshot tutulur.

const mongoose = require('mongoose');
const { STATUS_VALUES, MACHINE_STATUS } = require('../constants/tesvikMakineStatus');

const machineProcessSchema = new mongoose.Schema({
  // 🔗 Polimorfik belge + gömülü makine satırı referansı
  tesvikModel: { type: String, enum: ['Tesvik', 'YeniTesvik'], required: true, index: true },
  tesvikId: { type: mongoose.Schema.Types.ObjectId, required: true, index: true },
  rowId: { type: String, required: true, trim: true }, // gömülü makine satırının kararlı kimliği
  listType: { type: String, enum: ['local', 'import'], required: true }, // yerli=local / ithal=import

  // 📸 Kimlik snapshot'ı (gömülü satır + belgeden denormalize — listeleme/eşleştirme/mail için)
  firmaName: { type: String, trim: true, default: '' },
  taxNumber: { type: String, trim: true, default: '' },
  documentNo: { type: String, trim: true, default: '', index: true },
  documentId: { type: String, trim: true, default: '', index: true },
  documentDate: { type: Date },
  siraNo: { type: Number, default: 0 },
  makineId: { type: String, trim: true, default: '' },
  gtipNo: { type: String, trim: true, default: '' },
  machineName: { type: String, trim: true, default: '' },
  quantity: { type: Number, default: 0 },
  unit: { type: String, trim: true, default: '' },
  currency: { type: String, trim: true, default: '' },
  unitPrice: { type: Number, default: 0 },
  totalPrice: { type: Number, default: 0 },
  kdvExempt: { type: Boolean, default: false },

  // 🔖 Bakanlık / Teşvik otomasyon kodu (barkod) — gömülü şemada YOK, burada tutulur
  barcode: { type: String, trim: true, default: '', index: true },

  // 🏭 Tedarikçi bilgileri
  supplierCompanyName: { type: String, trim: true, default: '' },
  supplierTaxNumber: { type: String, trim: true, default: '' },
  supplierEmails: { type: [String], default: [] },
  supplierCcEmails: { type: [String], default: [] },

  // 👤 Müşteri / firma yetkilisi
  customerContactName: { type: String, trim: true, default: '' },
  customerEmails: { type: [String], default: [] },

  // ⚙️ Süreç ayarları
  kdvExemptRequired: { type: Boolean, default: false }, // KDV muafiyet yazısı gerekli mi?
  invoiceDescriptionAuto: { type: Boolean, default: true }, // Fatura açıklaması otomatik üretilsin mi?
  autoSendEnabled: { type: Boolean, default: false }, // Kod girilince otomatik mail gönder
  dueDate: { type: Date }, // Beklenen dönüş / son tarih

  // 🧾 Fatura gerçekleşme bilgileri (müşteri talebi #4 — Yerli Liste'de düzenlenebilir)
  invoiceRealizedValue: { type: Number, default: 0 }, // Fatura gerçekleşen değer
  invoiceRealizedQty: { type: Number, default: 0 },   // Fatura gerçekleşen adet
  invoiceNo: { type: String, trim: true, default: '' }, // Fatura no
  invoiceDate: { type: Date },                          // Fatura tarihi

  // 🚦 Süreç durumu
  status: { type: String, enum: STATUS_VALUES, default: MACHINE_STATUS.NOT_STARTED, index: true },
  notes: { type: String, trim: true, default: '', maxlength: 4000 },

  // 📧 Mail & hatırlatma takibi
  lastMailAt: { type: Date },
  lastMailTemplateCode: { type: String, trim: true, default: '' },
  nextReminderAt: { type: Date, index: true },
  lastReminderAt: { type: Date },
  reminderCount: { type: Number, default: 0 },
  reminderStopped: { type: Boolean, default: false }, // Admin "Hatırlatmayı durdur"

  // 📁 Klasör & evrak
  folderId: { type: mongoose.Schema.Types.ObjectId, ref: 'DocumentFolder' },
  documentCount: { type: Number, default: 0 }, // yüklenen evrak sayısı (hızlı sayaç)

  // 🔐 Public upload linki
  uploadToken: { type: String, trim: true, index: true, sparse: true },
  uploadTokenExpiresAt: { type: Date },

  completedAt: { type: Date },

  // 👣 İz
  createdByUserId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  updatedByUserId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
}, {
  timestamps: true,
  collection: 'machineprocesses'
});

// Bir makine satırı için tek süreç kaydı
machineProcessSchema.index({ tesvikModel: 1, tesvikId: 1, rowId: 1 }, { unique: true });
// Açık işlem / hatırlatma taramaları için
machineProcessSchema.index({ status: 1, nextReminderAt: 1 });

// 🔎 İş akışı için kısa kategori (badge) — virtual
machineProcessSchema.virtual('statusMeta').get(function () {
  const { getStatusBadge } = require('../constants/tesvikMakineStatus');
  return getStatusBadge(this.status);
});

machineProcessSchema.set('toJSON', { virtuals: true });
machineProcessSchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('MachineProcess', machineProcessSchema);
