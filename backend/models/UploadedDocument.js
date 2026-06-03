// 📄 UPLOADED DOCUMENT - Yüklenen her evrakın kaydı
// Admin panelden veya public upload linkinden (müşteri/tedarikçi) yüklenenler buraya yazılır.

const mongoose = require('mongoose');
const { DOCUMENT_TYPE_KEYS, UPLOADER_TYPE } = require('../constants/tesvikMakineMail');

const uploadedDocumentSchema = new mongoose.Schema({
  tesvikModel: { type: String, enum: ['Tesvik', 'YeniTesvik'], required: true },
  tesvikId: { type: mongoose.Schema.Types.ObjectId, required: true, index: true },
  machineProcessId: { type: mongoose.Schema.Types.ObjectId, ref: 'MachineProcess', default: null, index: true },
  rowId: { type: String, trim: true, default: null },
  folderId: { type: mongoose.Schema.Types.ObjectId, ref: 'DocumentFolder' },

  documentType: { type: String, enum: DOCUMENT_TYPE_KEYS, default: 'diger' },

  fileName: { type: String, required: true, trim: true }, // diskteki (normalize) ad
  originalName: { type: String, trim: true, default: '' }, // kullanıcının yüklediği ad
  fileUrl: { type: String, trim: true, default: '' }, // erişim url'i (/uploads/...)
  filePath: { type: String, trim: true, default: '' }, // mutlak/göreli disk yolu
  providerFileId: { type: String, trim: true, default: '' }, // Drive/S3 id
  fileSize: { type: Number, default: 0 },
  mimeType: { type: String, trim: true, default: '' },

  uploadedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null }, // public ise null
  uploadedByType: { type: String, enum: Object.values(UPLOADER_TYPE), default: UPLOADER_TYPE.ADMIN },
  uploaderName: { type: String, trim: true, default: '' },
  note: { type: String, trim: true, default: '' },

  // Admin panelde "yeni evrak" bildirimi için
  seenByAdmin: { type: Boolean, default: false }
}, {
  timestamps: true,
  collection: 'uploadeddocuments'
});

uploadedDocumentSchema.index({ machineProcessId: 1, createdAt: -1 });

module.exports = mongoose.model('UploadedDocument', uploadedDocumentSchema);
