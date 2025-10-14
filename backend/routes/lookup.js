const express = require('express');
const router = express.Router();

const { 
  searchUnits, 
  searchCurrencies, 
  searchUsedMachines, 
  getCurrencyRate, 
  searchMachineTypes, 
  searchOecdKod4Haneli,
  // 🎯 Dinamik Öğrenen Sistem
  getDestekUnsurlari,
  addDestekUnsuru,
  getDestekSartlari,
  addDestekSarti,
  getOzelSartlar,
  addOzelSart
} = require('../controllers/lookupController');

// Auth middleware
const { authenticate } = require('../middleware/auth');

// Public endpoints (hızlı autocomplete için auth yok)
router.get('/unit', searchUnits);
router.get('/currency', searchCurrencies);
router.get('/used-machine', searchUsedMachines);
router.get('/machine-type', searchMachineTypes);
router.get('/rate', getCurrencyRate);

// 🆕 OECD 4 Haneli Kodları (Yeni Teşvik Sistemi için)
router.get('/oecd-4-haneli', searchOecdKod4Haneli);

// ========================================
// 🎯 DİNAMİK ÖĞRENEN SİSTEM
// ========================================

// 📚 Destek Unsurları - GET (Arama + Liste) ve POST (Yeni Ekleme)
router.get('/destek-unsuru', getDestekUnsurlari);
router.post('/destek-unsuru', authenticate, addDestekUnsuru);

// 📋 Destek Şartları - GET (Arama + Liste) ve POST (Yeni Ekleme)
router.get('/destek-sarti', getDestekSartlari);
router.post('/destek-sarti', authenticate, addDestekSarti);

// 🏷️ Özel Şartlar - GET (Arama + Liste) ve POST (Yeni Ekleme)
router.get('/ozel-sart', getOzelSartlar);
router.post('/ozel-sart', authenticate, addOzelSart);

module.exports = router;


