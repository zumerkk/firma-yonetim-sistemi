// 🌍 OECD KATEGORİ ROUTES
// OECD (Orta-Yüksek) kategori verilerini getirmek için API endpoint'leri

const express = require('express');
const router = express.Router();
const OecdKategori = require('../models/OecdKategori');
const { authenticate } = require('../middleware/auth');

// 📋 Tüm aktif OECD kategorilerini getir
router.get('/', authenticate, async (req, res) => {
  try {
    const oecdKategorileri = await OecdKategori.getAktifOecdKategorileri();
    
    res.json({
      success: true,
      data: oecdKategorileri,
      count: oecdKategorileri.length
    });
  } catch (error) {
    console.error('OECD kategorileri getirme hatası:', error);
    res.status(500).json({
      success: false,
      message: 'OECD kategorileri getirilirken hata oluştu',
      error: error.message
    });
  }
});

// 🔍 OECD kategorilerinde arama
router.get('/search/:searchTerm', authenticate, async (req, res) => {
  try {
    const { searchTerm } = req.params;
    const oecdKategorileri = await OecdKategori.searchByAciklama(searchTerm);
    
    res.json({
      success: true,
      data: oecdKategorileri,
      count: oecdKategorileri.length,
      searchTerm
    });
  } catch (error) {
    console.error('OECD kategorilerinde arama hatası:', error);
    res.status(500).json({
      success: false,
      message: 'OECD kategorilerinde arama yapılırken hata oluştu',
      error: error.message
    });
  }
});

// 📊 OECD istatistikleri
router.get('/stats', authenticate, async (req, res) => {
  try {
    const totalCount = await OecdKategori.countDocuments({ aktif: true });
    
    res.json({
      success: true,
      data: {
        totalCount,
        kategori: 'OECD (Orta-Yüksek)'
      }
    });
  } catch (error) {
    console.error('OECD istatistikleri getirme hatası:', error);
    res.status(500).json({
      success: false,
      message: 'OECD istatistikleri getirilirken hata oluştu',
      error: error.message
    });
  }
});

module.exports = router;