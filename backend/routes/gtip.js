// 📦 GTIP KODLARI ROUTES

const express = require('express');
const router = express.Router();
const { authenticate, checkPermission } = require('../middleware/auth');
const { searchGTIPCodes, getGTIPByKod, getGTIPStats } = require('../controllers/gtipController');

// GTIP arama - public (performans için auth yok)
router.get('/search', searchGTIPCodes);

// Kod detay - public
router.get('/code/:kod', getGTIPByKod);

// Stats - admin/yonetici
router.get('/stats', authenticate, checkPermission('yonetici'), getGTIPStats);

module.exports = router;


