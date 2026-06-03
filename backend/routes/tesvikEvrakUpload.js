// 🌐 TEŞVİK EVRAK PUBLIC UPLOAD - Routes (AUTH YOK, token tabanlı)
// Müşteri/tedarikçi linkten dosya yükler. Yalnızca token'a bağlı makine klasörüne yazılır.

const express = require('express');
const router = express.Router();
const { uploadSingle } = require('../middleware/tesvikUpload');
const ctrl = require('../controllers/tesvikEvrakUploadController');

// Yükleme ekranı bilgisi
router.get('/:token', ctrl.getInfo);

// Dosya yükle
router.post('/:token', uploadSingle('file'), ctrl.upload);

module.exports = router;
