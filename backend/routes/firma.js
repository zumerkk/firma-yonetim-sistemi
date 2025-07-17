// 🏢 Firma Routes - Excel Formatına Uygun
// Excel sisteminin modern API karşılığı rotaları
// Gelişmiş arama, Excel export, tam uyum

const express = require('express');
const router = express.Router();

// Controllers
const {
  createFirma,
  getFirmalar,
  getFirma,
  updateFirma,
  deleteFirma,
  searchFirmalar,
  searchByField,
  getFirmaStats,
  getIlIlceListesi,
  getExcelData
} = require('../controllers/firmaController');

// Middleware
const { authenticate, authorize, checkPermission, checkOwnership } = require('../middleware/auth');
const { validateCreateFirma, validateUpdateFirma } = require('../middleware/validation');

// 🔍 GET /api/firmalar/search - Genel Firma Arama (Auth gerekli)
// Bu route'u en üstte tanımlıyoruz çünkü :id parametresi ile çakışmaması için
router.get('/search', authenticate, searchFirmalar);

// 🔍 GET /api/firmalar/search/:field/:value - Tek Alan Araması (Excel panel formatı)
// Örnek: /api/firmalar/search/vergiNoTC/1234567890
router.get('/search/:field/:value', authenticate, searchByField);

// 📊 GET /api/firmalar/stats - Firma İstatistikleri (Auth gerekli)
router.get('/stats', authenticate, getFirmaStats);

// 📍 GET /api/firmalar/il-ilce - İl/İlçe/Faaliyet Listesi (Auth gerekli)
router.get('/il-ilce', authenticate, getIlIlceListesi);

// 📊 GET /api/firmalar/excel-data - Excel Format Export (Auth gerekli)
router.get('/excel-data', authenticate, getExcelData);

// 📋 GET /api/firmalar - Firma Listesi (Auth gerekli, sayfalama ve filtreleme ile)
router.get('/', authenticate, getFirmalar);

// 📝 POST /api/firmalar - Yeni Firma Ekleme (Auth + Yetki gerekli)
// Otomatik firma ID oluşturma ile
router.post('/', 
  authenticate, 
  checkPermission('firmaEkle'), 
  validateCreateFirma, 
  createFirma
);

// 👁️ GET /api/firmalar/:id - Tekil Firma Detayı (Auth gerekli)
router.get('/:id', authenticate, getFirma);

// ✏️ PUT /api/firmalar/:id - Firma Güncelleme (Auth + Yetki + Sahiplik gerekli)
router.put('/:id', 
  authenticate, 
  checkPermission('firmaDuzenle'), 
  checkOwnership('Firma'), 
  validateUpdateFirma, 
  updateFirma
);

// 🗑️ DELETE /api/firmalar/:id - Firma Silme (Auth + Yetki + Sahiplik gerekli)
router.delete('/:id', 
  authenticate, 
  checkPermission('firmaSil'), 
  checkOwnership('Firma'), 
  deleteFirma
);

module.exports = router; 