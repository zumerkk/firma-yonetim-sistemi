// 💾 Yedekleme API — hepsi admin yetkisi ister
const express = require('express');
const router = express.Router();
const { authenticate, adminAuth } = require('../middleware/auth');
const { fullBackup, backupInfo, yedekDurumu, yedegiCalistir } = require('../controllers/backupController');

// 📊 Yedekleme öncesi bilgi (kayıt sayıları, tahmini süre)
router.get('/info', authenticate, adminAuth, backupInfo);

// 💾 Tam sistem yedeği (ZIP indirme)
router.get('/full', authenticate, adminAuth, fullBackup);

// 📡 Otomatik (gece) yedeğin durumu — en son ne zaman, ne yedeklendi
router.get('/durum', authenticate, adminAuth, yedekDurumu);

// ▶️ Otomatik yedeği şimdi çalıştır (ilk kurulum / kontrol)
router.post('/drive', authenticate, adminAuth, yedegiCalistir);

module.exports = router;
