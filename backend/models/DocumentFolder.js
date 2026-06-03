// 📁 DOCUMENT FOLDER - Belge/makine klasör kayıtları
// provider: local (varsayılan) / drive / s3. Aynı (belge+makine) için tek klasör (idempotent).

const mongoose = require('mongoose');

const documentFolderSchema = new mongoose.Schema({
  tesvikModel: { type: String, enum: ['Tesvik', 'YeniTesvik'], required: true },
  tesvikId: { type: mongoose.Schema.Types.ObjectId, required: true, index: true },
  machineProcessId: { type: mongoose.Schema.Types.ObjectId, ref: 'MachineProcess', default: null },
  rowId: { type: String, trim: true, default: null }, // null → belge-seviyesi klasör

  provider: { type: String, enum: ['local', 'drive', 's3'], default: 'local' },
  folderPath: { type: String, required: true, trim: true }, // göreli yol (ör: Tesvikler/FIRMA/518097-1023736/...)
  providerFolderId: { type: String, trim: true, default: '' }, // Drive folder id / S3 prefix
  shareUrl: { type: String, trim: true, default: '' }
}, {
  timestamps: true,
  collection: 'documentfolders'
});

// Aynı belge+makine+yol için tek klasör
documentFolderSchema.index({ tesvikModel: 1, tesvikId: 1, rowId: 1, folderPath: 1 }, { unique: true });

module.exports = mongoose.model('DocumentFolder', documentFolderSchema);
