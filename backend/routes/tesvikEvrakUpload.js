// 🌐 TEŞVİK EVRAK PUBLIC UPLOAD - Routes (AUTH YOK, token tabanlı)
// Müşteri/tedarikçi linkten dosya yükler. Yalnızca token'a bağlı makine klasörüne yazılır.

const express = require('express');
const router = express.Router();
const { uploadMultiple } = require('../middleware/tesvikUpload');
const ctrl = require('../controllers/tesvikEvrakUploadController');

// Yükleme ekranı bilgisi
router.get('/:token', ctrl.getInfo);

// Dosya yükle (çoklu)
router.post('/:token', uploadMultiple('files'), ctrl.upload);

module.exports = router;
