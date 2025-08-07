// 🎯 Destek-Şart Eşleştirmesi Routes
// Destek unsurları ve şartları arasındaki ilişkileri yöneten API endpoint'leri

const express = require('express');
const router = express.Router();
const {
  getTumEslesmeler,
  getShartlarByDestekTuru,
  sartEkle,
  sartKaldir,
  eslesmeOlustur,
  getDestekTurleri
} = require('../controllers/destekSartController');
const { authenticate } = require('../middleware/auth');

// Tüm route'lar korumalı (giriş yapmış kullanıcılar)
router.use(authenticate);

// @route   GET /api/destek-sart/eslesmeler
// @desc    Tüm destek-şart eşleştirmelerini getir
// @access  Private
router.get('/eslesmeler', getTumEslesmeler);

// @route   GET /api/destek-sart/destek-turleri
// @desc    Destek türleri listesini getir (otomatik tamamlama için)
// @access  Private
router.get('/destek-turleri', getDestekTurleri);

// @route   GET /api/destek-sart/sartlar/:destekTuru
// @desc    Belirli bir destek türü için şartları getir
// @access  Private
router.get('/sartlar/:destekTuru', getShartlarByDestekTuru);

// @route   POST /api/destek-sart/esleme-olustur
// @desc    Yeni destek-şart eşleştirmesi oluştur
// @access  Private (Admin)
router.post('/esleme-olustur', eslesmeOlustur);

// @route   POST /api/destek-sart/sart-ekle
// @desc    Destek türüne şart ekle
// @access  Private (Admin)
router.post('/sart-ekle', sartEkle);

// @route   DELETE /api/destek-sart/sart-kaldir
// @desc    Destek türünden şart kaldır
// @access  Private (Admin)
router.delete('/sart-kaldir', sartKaldir);

module.exports = router;
