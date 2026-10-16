// 💳 Cari Hesap / Ödeme Takip rotaları
const express = require('express');
const router = express.Router();
const { authenticate, authorize } = require('../middleware/auth');
const cari = require('../controllers/cariController');
const editor = authorize('admin', 'kullanici');

router.use(authenticate);

// Cari hesaplar listesi (firma başına bakiye)
router.get('/firmalar', cari.firmaOzetleri);
// Firmanın tüm carisi
router.get('/firma/:firmaId', cari.firmaDefteri);
router.put('/firma/:firmaId/durum', editor, cari.firmaDurumuGuncelle);
// Belge Takip › Ödemeler sekmesindeki mini cari tablo
router.get('/talep/:talepId', cari.talepDefteri);

router.post('/', editor, cari.hareketEkle);
router.put('/:id', editor, cari.hareketGuncelle);
router.delete('/:id', editor, cari.hareketSil);
router.get('/:id/dosya', cari.hareketDosyasi);

module.exports = router;
