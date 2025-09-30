// 🎯 DESTEK SINIFI ROUTES
// Destek sınıfı verilerini getirmek için API endpoint'leri

const express = require('express');
const router = express.Router();
const DestekSinifi = require('../models/DestekSinifi');
const { authenticate } = require('../middleware/auth');

// 📋 Tüm aktif destek sınıflarını getir
router.get('/', authenticate, async (req, res) => {
  try {
    const destekSiniflari = await DestekSinifi.getAktifDestekSiniflari();
    
    res.json({
      success: true,
      data: destekSiniflari,
      count: destekSiniflari.length
    });
  } catch (error) {
    console.error('Destek sınıfları getirme hatası:', error);
    res.status(500).json({
      success: false,
      message: 'Destek sınıfları getirilirken hata oluştu',
      error: error.message
    });
  }
});

// 📋 Kategoriye göre destek sınıflarını getir
router.get('/kategori/:kategori', authenticate, async (req, res) => {
  try {
    const { kategori } = req.params;
    const destekSiniflari = await DestekSinifi.getByKategori(kategori);
    
    res.json({
      success: true,
      data: destekSiniflari,
      count: destekSiniflari.length,
      kategori
    });
  } catch (error) {
    console.error('Kategoriye göre destek sınıfları getirme hatası:', error);
    res.status(500).json({
      success: false,
      message: 'Kategoriye göre destek sınıfları getirilirken hata oluştu',
      error: error.message
    });
  }
});

// 📊 Kategorileri getir
router.get('/kategoriler', authenticate, async (req, res) => {
  try {
    const kategoriler = await DestekSinifi.aggregate([
      { $match: { aktif: true } },
      { $group: { _id: '$kategori', count: { $sum: 1 } } },
      { $sort: { _id: 1 } },
      { $project: { kategori: '$_id', count: 1, _id: 0 } }
    ]);
    
    res.json({
      success: true,
      data: kategoriler
    });
  } catch (error) {
    console.error('Kategoriler getirme hatası:', error);
    res.status(500).json({
      success: false,
      message: 'Kategoriler getirilirken hata oluştu',
      error: error.message
    });
  }
});

module.exports = router;