// 📦 US 97 KODLARI ROUTES
// GM Teşvik Sistemi - API endpoints for US 97 codes

const express = require('express');
const router = express.Router();
const { authenticate, checkPermission } = require('../middleware/auth');
const {
  searchUS97Codes,
  getUS97Categories,
  getPopularUS97Codes,
  getUS97CodeByKod,
  getUS97Stats
} = require('../controllers/us97Controller');

// 🔍 US 97 kodlarını ara (Auth removed for performance)
// GET /api/us97/search?q=query&kategori=category&limit=20
router.get('/search', searchUS97Codes);

// 📊 Kategorileri getir (Auth removed for performance)
// GET /api/us97/categories
router.get('/categories', getUS97Categories);

// 🔥 Popüler kodları getir (Auth removed for performance)
// GET /api/us97/popular?limit=10
router.get('/popular', getPopularUS97Codes);

// 📊 İstatistikleri getir (admin only)
// GET /api/us97/stats
router.get('/stats', authenticate, checkPermission('yonetici'), getUS97Stats);

// 🎯 Belirli bir kodu getir (Auth removed for performance)
// GET /api/us97/code/:kod
router.get('/code/:kod', getUS97CodeByKod);

module.exports = router;