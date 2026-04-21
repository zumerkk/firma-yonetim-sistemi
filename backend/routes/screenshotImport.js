/**
 * 📸 Screenshot Import Routes
 * Ekran görüntüsünden teşvik belgesi oluşturma API
 */

const express = require('express');
const router = express.Router();
const multer = require('multer');
const screenshotImportController = require('../controllers/screenshotImportController');
const { authenticate } = require('../middleware/auth');

// Multer: memory storage, max 30 dosya, 10MB/dosya
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10 MB
    files: 30,
  },
  fileFilter: (req, file, cb) => {
    const allowed = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp'];
    if (allowed.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error(`Desteklenmeyen dosya türü: ${file.mimetype}. PNG, JPEG veya WebP yükleyin.`));
    }
  },
});

// POST /api/screenshot-import/analyze - Çoklu ekran görüntüsü analizi
router.post('/analyze', upload.array('screenshots', 30), screenshotImportController.analyze);

// POST /api/screenshot-import/commit - Onaylanan veriyi DB'ye kaydet (auth gerekli)
router.post('/commit', authenticate, express.json(), screenshotImportController.commit);

module.exports = router;
