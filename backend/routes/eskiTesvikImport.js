// 📊 ESKİ TEŞVİK IMPORT ROUTES
const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const { upload, uploadAndPreview, confirmImport } = require('../controllers/eskiTesvikImportController');

// POST /api/eski-tesvik-import/upload — Excel yükle + önizleme
router.post('/upload', authenticate, upload.single('file'), uploadAndPreview);

// POST /api/eski-tesvik-import/confirm — Onaylanmış kayıtları import et
router.post('/confirm', authenticate, confirmImport);

module.exports = router;
