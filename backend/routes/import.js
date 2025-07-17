// 📊 Import Routes
// Excel dosyası import etme rotaları

const express = require('express');
const router = express.Router();

// Controllers
const { upload, importExcel, downloadTemplate } = require('../controllers/importController');

// Middleware
const { authenticate, checkPermission } = require('../middleware/auth');

// 📤 GET /api/import/template - Örnek Excel Template İndir
router.get('/template', authenticate, downloadTemplate);

// 📥 POST /api/import/excel - Excel Dosyası Import Et
router.post('/excel', 
  authenticate, 
  checkPermission('firmaEkle'),
  upload.single('file'), 
  importExcel
);

module.exports = router; 