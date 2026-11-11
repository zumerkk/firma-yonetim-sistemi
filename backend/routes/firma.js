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
  getFirmaDashboard,
  getFirmaStats,
  getExcelData,
  exportExcel,
  exportPDF,
  exportStatsExcel,
  getNextFirmaId
} = require('../controllers/firmaController');

// Middleware
const { authenticate, authorize, checkPermission, checkOwnership } = require('../middleware/auth');
const { validateCreateFirma, validateUpdateFirma } = require('../middleware/validation');

// 🔍 GET /api/firma/search - Genel Firma Arama
router.get('/search', authenticate, searchFirmalar);

// 🆔 GET /api/firma/next-id - Sonraki Firma ID'yi al
router.get('/next-id', authenticate, getNextFirmaId);

// 📊 GET /api/firma/stats - Firma istatistikleri (Admin)
router.get('/stats', authenticate, authorize('admin'), getFirmaStats);

router.get('/dashboard', authenticate, getFirmaDashboard);

// 📤 GET /api/firma/excel-data - Excel Export Data (Admin) - ESKİ VERSION
router.get('/excel-data', authenticate, authorize('admin'), getExcelData);

// 📊 GET /api/firma/export/excel - Premium Excel Export (Admin) - FİRMA LİSTESİ
router.get('/export/excel', authenticate, authorize('admin'), exportExcel);

// 📄 GET /api/firma/export/pdf - Premium PDF Export (Admin) - İSTATİSTİK RAPORU
router.get('/export/pdf', authenticate, authorize('admin'), exportPDF);

// 📈 GET /api/firma/export/stats-excel - Premium İstatistik Excel (Admin)
router.get('/export/stats-excel', authenticate, authorize('admin'), exportStatsExcel);

// 📋 GET /api/firma - Firma Listesi 
router.get('/', authenticate, getFirmalar);

// 📝 POST /api/firma - Yeni Firma Ekleme
router.post('/', 
  authenticate, 
  validateCreateFirma, 
  createFirma
);

// ⚠️ IMPORTANT: :id route'ları en sona koy - yoksa diğer route'ları yakalar
// 👁️ GET /api/firma/:id - Tekil Firma Detayı
router.get('/:id', authenticate, getFirma);

// ✏️ PUT /api/firma/:id - Firma Güncelleme
router.put('/:id', 
  authenticate, 
  validateUpdateFirma, 
  updateFirma
);

// 🗑️ DELETE /api/firma/:id - Firma Silme
router.delete('/:id', 
  authenticate, 
  deleteFirma
);

module.exports = router;
