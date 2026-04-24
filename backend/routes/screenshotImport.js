/**
 * 📸 Screenshot Import Routes
 * Ekran görüntüsünden teşvik belgesi oluşturma API
 */

const express = require('express');
const router = express.Router();
const multer = require('multer');
const screenshotImportController = require('../controllers/screenshotImportController');
const { authenticate } = require('../middleware/auth');

// Multer: memory storage, max 50 dosya, 10MB/dosya
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10 MB
    files: 50,
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
router.post('/analyze', upload.array('screenshots', 50), (req, res, next) => {
  req.setTimeout(1800000); // 30 dakika timeout
  res.setTimeout(1800000);
  next();
}, screenshotImportController.analyze);

// POST /api/screenshot-import/analyze-async - Arka plan (Queue) analizi başlatır
router.post('/analyze-async', authenticate, upload.array('screenshots', 50), screenshotImportController.analyzeAsync);

// GET /api/screenshot-import/job/:jobId - Arka plan analizi durumu (Polling)
router.get('/job/:jobId', authenticate, screenshotImportController.getJobStatus);

// POST /api/screenshot-import/commit - Onaylanan veriyi DB'ye kaydet (auth gerekli)
router.post('/commit', authenticate, express.json(), screenshotImportController.commit);

// POST /api/screenshot-import/merge - Analiz edilen tüm sonuçları harmanla
router.post('/merge', authenticate, express.json(), screenshotImportController.merge);

module.exports = router;
