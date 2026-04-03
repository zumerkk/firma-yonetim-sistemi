// 📊 Teşvik Import Routes
// Excel/CSV'den otomatik teşvik oluşturma rotaları

const express = require('express');
const router = express.Router();

// Controllers
const { upload, uploadAndPreview, confirmImport } = require('../controllers/tesvikImportController');

// Middleware
const { authenticate, checkPermission } = require('../middleware/auth');

// 📤 POST /api/tesvik-import/upload-preview
// Excel/CSV yükle → parse et → önizleme döndür
router.post('/upload-preview',
  authenticate,
  checkPermission('belgeEkle'),
  upload.single('file'),
  uploadAndPreview
);

// ✅ POST /api/tesvik-import/confirm
// Önizleme onaylandıktan sonra teşvik kayıtlarını oluştur
router.post('/confirm',
  authenticate,
  checkPermission('belgeEkle'),
  confirmImport
);

module.exports = router;
