// 🛠️ TEŞVİK MAKİNE TEÇHİZAT YÖNETİMİ - Admin/Consultant Routes
// Yetki: read → tüm girişliler · write → admin+kullanici · ayar → admin

const express = require('express');
const router = express.Router();
const { authenticate, authorize, adminAuth } = require('../middleware/auth');
const { uploadSingle } = require('../middleware/tesvikUpload');
const ctrl = require('../controllers/tesvikMakineController');

// Consultant = kullanici. readonly yazamaz.
const editor = authorize('admin', 'kullanici');

// Tüm route'lar giriş gerektirir
router.use(authenticate);

// Meta & dashboard
router.get('/meta', ctrl.getMeta);
router.get('/dashboard', ctrl.getDashboard);

// Bildirimler (yeni yüklenen evraklar)
router.get('/notifications', ctrl.getNotifications);
router.post('/notifications/seen', editor, ctrl.markNotificationsSeen);

// Raporlar
router.get('/reports/:type', ctrl.reports);

// Mail şablonları
router.get('/templates', ctrl.listTemplates);
router.put('/templates/:code', adminAuth, ctrl.updateTemplate);

// SMTP test & hatırlatma tetikleme (admin)
router.post('/smtp/test', adminAuth, ctrl.testSmtp);
router.post('/reminders/run', adminAuth, ctrl.runReminders);

// Bakanlık mail parser (gelen "Makine Teçhizat Talebi" maillerini ayrıştır/eşleştir)
router.post('/parser/parse', editor, ctrl.parseMail);
router.post('/parser/ingest', editor, ctrl.ingestMail);
router.get('/parser/queue', ctrl.listParserQueue);
router.get('/parser/queue/:id/candidates', ctrl.parserCandidates);
router.post('/parser/queue/:id/link', editor, ctrl.linkParserQueue);
router.delete('/parser/queue/:id', editor, ctrl.deleteParserQueue);

// Toplu işlem
router.post('/bulk', editor, ctrl.bulk);

// Mail yeniden gönder
router.post('/mail/:mailLogId/resend', editor, ctrl.resendMail);

// Evrak indir (auth'lu proxy) & sil
router.get('/document/:id/download', ctrl.downloadDocument);
router.delete('/document/:id', editor, ctrl.deleteDocument);

// Sertifika (teşvik belgesi) listesi & detayları
router.get('/certificates', ctrl.listCertificates);
router.get('/certificates/:tesvikModel/:tesvikId', ctrl.getCertificate);
router.get('/certificates/:tesvikModel/:tesvikId/machines', ctrl.getCertificateMachines);
router.get('/certificates/:tesvikModel/:tesvikId/mails', ctrl.getCertificateMails);
router.get('/certificates/:tesvikModel/:tesvikId/documents', ctrl.getCertificateDocuments);
router.get('/certificates/:tesvikModel/:tesvikId/reminders', ctrl.getCertificateReminders);
router.get('/certificates/:tesvikModel/:tesvikId/timeline', ctrl.getCertificateTimeline);

// Süreç (makine) işlemleri
router.post('/process', editor, ctrl.ensureProcess);
router.get('/process/:id', ctrl.getProcess);
router.patch('/process/:id/fields', editor, ctrl.updateProcessFields);
router.patch('/process/:id/status', editor, ctrl.updateProcessStatus);
router.post('/process/:id/barcode', editor, ctrl.setBarcode);
router.post('/process/:id/mail/preview', editor, ctrl.previewMail);
router.post('/process/:id/mail/send', editor, ctrl.sendMail);
router.post('/process/:id/folders', editor, ctrl.ensureFolders);
router.post('/process/:id/upload-link', editor, ctrl.createUploadLink);
router.post('/process/:id/upload', editor, uploadSingle('file'), ctrl.adminUpload);
router.post('/process/:id/reminders/stop', editor, ctrl.stopReminders);
router.post('/process/:id/reminders/resume', editor, ctrl.resumeReminders);

module.exports = router;
