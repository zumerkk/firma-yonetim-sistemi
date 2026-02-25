// 📋 Dosya İş Akış Takip Sistemi - Routes
// RESTful API endpoint'leri

const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const dosyaTakipController = require('../controllers/dosyaTakipController');
const User = require('../models/User');
const path = require('path');
const fs = require('fs');

// Tüm route'lar authentication gerektirir
router.use(authenticate);

// 📊 Dashboard İstatistikleri
router.get('/dashboard', dosyaTakipController.getDashboardIstatistikleri);

// 📦 Enum Değerleri (Talep Türleri, Durumlar)
router.get('/enums', dosyaTakipController.getEnumDegerleri);

// 📋 Tüm Talepleri Listele (sayfalı + filtreleme)
router.get('/', dosyaTakipController.getTumTalepler);

// 👥 Personel Listesi (atama dropdown için - admin gerektirmez)
router.get('/personel-listesi', async (req, res) => {
    try {
        const users = await User.find({ aktif: { $ne: false } })
            .select('_id adSoyad email rol')
            .sort({ adSoyad: 1 })
            .lean();
        res.json({ success: true, data: users });
    } catch (error) {
        console.error('Personel listesi hatası:', error);
        res.status(500).json({ success: false, message: 'Personel listesi alınamadı' });
    }
});

// 📥 Dosya İndirme Proxy (uploads static path yerine API üzerinden)
router.get('/download/*', async (req, res) => {
    try {
        // /dosya-takip/download/uploads/dosya-takip/filename.jpg → uploads/dosya-takip/filename.jpg
        const filePath = req.params[0]; // wildcard match
        const absolutePath = path.resolve(filePath);

        // Güvenlik: sadece uploads dizini altındakilere izin ver
        const uploadsDir = path.resolve('uploads');
        if (!absolutePath.startsWith(uploadsDir)) {
            return res.status(403).json({ success: false, message: 'Yetkisiz dosya erişimi' });
        }

        if (!fs.existsSync(absolutePath)) {
            return res.status(404).json({ success: false, message: 'Dosya bulunamadı' });
        }

        res.download(absolutePath);
    } catch (error) {
        console.error('Dosya indirme hatası:', error);
        res.status(500).json({ success: false, message: 'Dosya indirilemedi' });
    }
});

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

// 🗑️ Not Sil
router.delete('/:id/not', dosyaTakipController.notSil);

// 🗑️ Dosya Sil
router.delete('/:id/dosya', dosyaTakipController.dosyaSil);

// 🗑️ Talep Sil (Soft Delete)
router.delete('/:id', dosyaTakipController.talepSil);

module.exports = router;
