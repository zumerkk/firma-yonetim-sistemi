// 💳 Cari Hesap / Ödeme Takip rotaları
const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const cari = require('../controllers/cariController');

router.use(authenticate);

// Cari hesaplar listesi (firma başına bakiye)
router.get('/firmalar', cari.firmaOzetleri);
// Firmanın tüm carisi
router.get('/firma/:firmaId', cari.firmaDefteri);
// Belge Takip › Ödemeler sekmesindeki mini cari tablo
router.get('/talep/:talepId', cari.talepDefteri);

router.post('/', cari.hareketEkle);
router.put('/:id', cari.hareketGuncelle);
router.delete('/:id', cari.hareketSil);
router.get('/:id/dosya', cari.hareketDosyasi);

module.exports = router;
