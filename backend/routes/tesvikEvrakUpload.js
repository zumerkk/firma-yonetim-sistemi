// 🌐 TEŞVİK EVRAK PUBLIC UPLOAD - Routes (AUTH YOK, token tabanlı)
// Müşteri/tedarikçi linkten dosya yükler. Yalnızca token'a bağlı makine klasörüne yazılır.

const express = require('express');
const router = express.Router();
const { uploadMultiple } = require('../middleware/tesvikUpload');
const ctrl = require('../controllers/tesvikEvrakUploadController');

// 🧾 KDV muafiyet yazısı public indirme — /:token'dan ÖNCE tanımlanmalı,
// aksi halde "kdv-muafiyet" token sanılıp yükleme akışına düşer.
router.get('/kdv-muafiyet/:token', ctrl.kdvMuafiyetInfo);
router.get('/kdv-muafiyet/:token/download', ctrl.kdvMuafiyetDownload);

// Yükleme ekranı bilgisi
router.get('/:token', ctrl.getInfo);

// Dosya yükle (çoklu)
router.post('/:token', uploadMultiple('files'), ctrl.upload);

module.exports = router;
