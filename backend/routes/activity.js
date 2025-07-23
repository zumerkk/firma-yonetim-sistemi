// 📋 Activity Routes - Son İşlemler Rotaları
// Tüm aktivite log endpoint'lerini yönetir

const express = require('express');
const router = express.Router();

// Controllers
const {
  getActivities,
  getRecentActivities,
  getActivity,
  getActivityStats,
  getUserActivities,
  getFirmaActivities,
  cleanupOldActivities,
  getFilterOptions
} = require('../controllers/activityController');

// Middleware
const { authenticate, authorize } = require('../middleware/auth');

// 📋 GET /api/activities - Tüm Aktiviteleri Listele (Pagination + Filtering)
// Query params: sayfa, limit, kategori, aksiyon, durum, kullanici, firmaId, baslangicTarihi, bitisTarihi
router.get('/', authenticate, getActivities);

// 📊 GET /api/activities/recent - Dashboard için Son İşlemler (Widget)
// Query params: limit (default: 10)
router.get('/recent', authenticate, getRecentActivities);

// 📈 GET /api/activities/stats - Aktivite İstatistikleri ve Trendler
router.get('/stats', authenticate, getActivityStats);

// 🎛️ GET /api/activities/filter-options - Filtreleme Seçenekleri
router.get('/filter-options', authenticate, getFilterOptions);

// 🔍 GET /api/activities/user/:userId - Belirli Kullanıcının Aktiviteleri
// Query params: limit (default: 20)
router.get('/user/:userId', authenticate, getUserActivities);

// 🏢 GET /api/activities/firma/:firmaId - Belirli Firmaya Ait Aktiviteler
// Query params: limit (default: 20)
router.get('/firma/:firmaId', authenticate, getFirmaActivities);

// 👁️ GET /api/activities/:id - Tekil Aktivite Detayı
router.get('/:id', authenticate, getActivity);

// 🧹 DELETE /api/activities/cleanup - Eski Kayıtları Temizle (Sadece Admin)
// Body: { days: 30 } - kaç günden eski kayıtları silinecek
router.delete('/cleanup', authenticate, cleanupOldActivities);

module.exports = router; 