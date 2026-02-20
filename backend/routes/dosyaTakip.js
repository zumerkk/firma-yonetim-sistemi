// 📋 Dosya İş Akış Takip Sistemi - Routes
// RESTful API endpoint'leri

const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const dosyaTakipController = require('../controllers/dosyaTakipController');

// Tüm route'lar authentication gerektirir
router.use(protect);

// 📊 Dashboard İstatistikleri
router.get('/dashboard', dosyaTakipController.getDashboardIstatistikleri);

// 📦 Enum Değerleri (Talep Türleri, Durumlar)
router.get('/enums', dosyaTakipController.getEnumDegerleri);

// 📋 Tüm Talepleri Listele (sayfalı + filtreleme)
router.get('/', dosyaTakipController.getTumTalepler);

// 🔍 Tekil Talep Detayı
router.get('/:id', dosyaTakipController.getTalepById);

// ➕ Yeni Talep Oluştur
router.post('/', dosyaTakipController.yeniTalepOlustur);

// ✏️ Talep Güncelle
router.put('/:id', dosyaTakipController.talepGuncelle);

// 🔄 Durum Değiştir (State Machine geçişi)
router.patch('/:id/durum', dosyaTakipController.durumDegistir);

// 📝 Not Ekle
router.post('/:id/not', dosyaTakipController.notEkle);

// 📁 Dosya Ekle
router.post('/:id/dosya', dosyaTakipController.dosyaEkle);

// 🗑️ Talep Sil (Soft Delete)
router.delete('/:id', dosyaTakipController.talepSil);

module.exports = router;
