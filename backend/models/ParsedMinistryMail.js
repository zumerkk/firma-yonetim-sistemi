// 📥 PARSED MINISTRY MAIL - Bakanlık mail parse kuyruğu
// Gelen bakanlık maillerinden çıkarılan alanlar + eşleşme durumu. Eşleşmeyenler elle bağlanır.

const mongoose = require('mongoose');

const parsedMinistryMailSchema = new mongoose.Schema({
  raw: { type: String, default: '' },
  sender: { type: String, trim: true, default: '' },
  subject: { type: String, trim: true, default: '' },

  parsed: {
    makineAdi: { type: String, trim: true, default: '' },
    gtipNo: { type: String, trim: true, default: '' },
    barkod: { type: String, trim: true, default: '' },
    firmaAdi: { type: String, trim: true, default: '' },
    belgeNo: { type: String, trim: true, default: '' },
    belgeId: { type: String, trim: true, default: '' },
    adres: { type: String, trim: true, default: '' }
  },

  status: { type: String, enum: ['matched', 'unmatched', 'manual_linked', 'applied'], default: 'unmatched', index: true },
  matched: {
    tesvikModel: { type: String, enum: ['Tesvik', 'YeniTesvik', ''], default: '' },
    tesvikId: { type: mongoose.Schema.Types.ObjectId },
    listType: { type: String, enum: ['local', 'import', ''], default: '' },
    rowId: { type: String, default: '' },
    machineProcessId: { type: mongoose.Schema.Types.ObjectId, ref: 'MachineProcess' },
    score: { type: Number, default: 0 }
  },
  appliedBarcode: { type: Boolean, default: false },
  note: { type: String, trim: true, default: '' },
  createdByUserId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
}, {
  timestamps: true,
  collection: 'parsedministrymails'
});

module.exports = mongoose.model('ParsedMinistryMail', parsedMinistryMailSchema);
