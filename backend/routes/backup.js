// 💾 Backup Routes - Sistem Yedekleme API
// Admin-only erişim ile tam sistem yedeği

const express = require('express');
const router = express.Router();
const { authenticate, adminAuth } = require('../middleware/auth');
const { fullBackup, backupInfo } = require('../controllers/backupController');

// 📊 Yedekleme öncesi bilgi (kayıt sayıları, tahmini süre)
// GET /api/backup/info
router.get('/info', authenticate, adminAuth, backupInfo);

// 💾 Tam sistem yedeği (ZIP indirme)
// GET /api/backup/full
router.get('/full', authenticate, adminAuth, fullBackup);

module.exports = router;
