// 🌐 BELGE TAKİP — FİRMA YÜKLEME BAĞLANTISI (AUTH YOK, token tabanlı)
//
// Müşteri (15.09.2026): "Birde firma mailine yükleme linki koyabilir miyiz, yüklenen belgeler belge
// takipde firma maili- gelen gibi bir alt kısımda görünebilir"
//
// routes/dosyaTakip.js tamamen router.use(authenticate) arkasında; firmanın açtığı sayfa bu yüzden
// ayrı önekte (/api/belge-takip-yukleme). Token dosyalar depolamaya gitmeden önce doğrulanır.

const express = require('express');
const router = express.Router();
const dosyaTakipController = require('../controllers/dosyaTakipController');

// Sayfa bilgisi: firma, talep türü, belge no, beklenen evraklar, firmanın yükledikleri
router.get('/:token', dosyaTakipController.firmaYuklemeBilgi);

// Dosya yükle (çoklu, alan adı: dosyalar)
router.post('/:token', dosyaTakipController.firmaYuklemeYap);

module.exports = router;
