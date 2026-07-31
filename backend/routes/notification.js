// 🔔 NOTIFICATION ROUTES - ENTERPRISE API EDITION
// Professional RESTful notification management endpoints

const express = require('express');
const router = express.Router();
const { body, param, query } = require('express-validator');
const { authenticate, adminAuth } = require('../middleware/auth');
const {
  getNotifications,
  getUnreadCount,
  getNotificationStats,
  markAsRead,
  markAllAsRead,
  deleteNotification,
  bulkDeleteNotifications,
  createNotification
} = require('../controllers/notificationController');
const notificationService = require('../services/notificationService');

// 🔐 All routes require authentication
router.use(authenticate);

// 📊 GET /api/notifications - Kullanıcının bildirimlerini getir (paginated & filtered)
router.get('/', [
  query('page').optional().isInt({ min: 1 }).withMessage('Sayfa numarası geçerli değil'),
  query('limit').optional().isInt({ min: 1, max: 50 }).withMessage('Limit 1-50 arasında olmalı'),
  query('type').optional().isIn(['success', 'info', 'warning', 'error', 'system']).withMessage('Geçersiz bildirim tipi'),
  query('category').optional().isIn(['firma', 'user', 'system', 'security', 'etuys', 'general']).withMessage('Geçersiz kategori'),
  query('isRead').optional().isBoolean().withMessage('isRead boolean olmalı'),
  query('priority').optional().isIn(['low', 'medium', 'high', 'critical']).withMessage('Geçersiz öncelik'),
  query('sortBy').optional().isIn(['createdAt', 'readAt', 'priority', 'type']).withMessage('Geçersiz sıralama alanı'),
  query('sortOrder').optional().isIn(['asc', 'desc']).withMessage('Sıralama asc veya desc olmalı')
], getNotifications);

// 🔔 GET /api/notifications/unread-count - Okunmamış bildirim sayısı
router.get('/unread-count', getUnreadCount);

// 📈 GET /api/notifications/stats - Bildirim istatistikleri
router.get('/stats', getNotificationStats);

// ✅ PATCH /api/notifications/:id/read - Bildirimi okundu olarak işaretle
router.patch('/:id/read', [
  param('id').isMongoId().withMessage('Geçersiz bildirim ID\'si')
], markAsRead);

// ✅ PATCH /api/notifications/mark-all-read - Tüm bildirimleri okundu işaretle
router.patch('/mark-all-read', [
  query('category').optional().isIn(['firma', 'user', 'system', 'security', 'etuys', 'general']).withMessage('Geçersiz kategori'),
  query('type').optional().isIn(['success', 'info', 'warning', 'error', 'system']).withMessage('Geçersiz bildirim tipi')
], markAllAsRead);

// 🗑️ DELETE /api/notifications/:id - Bildirimi sil
router.delete('/:id', [
  param('id').isMongoId().withMessage('Geçersiz bildirim ID\'si')
], deleteNotification);

// 🗑️ DELETE /api/notifications/bulk - Toplu bildirim silme
router.delete('/bulk', [
  body('ids').optional().isArray().withMessage('IDs array olmalı'),
  body('ids.*').optional().isMongoId().withMessage('Geçersiz ID formatı'),
  body('deleteRead').optional().isBoolean().withMessage('deleteRead boolean olmalı'),
  body('category').optional().isIn(['firma', 'user', 'system', 'security', 'etuys', 'general']).withMessage('Geçersiz kategori'),
  body('type').optional().isIn(['success', 'info', 'warning', 'error', 'system']).withMessage('Geçersiz bildirim tipi'),
  body('priority').optional().isIn(['low', 'medium', 'high', 'critical']).withMessage('Geçersiz öncelik')
], bulkDeleteNotifications);

// 🔔 POST /api/notifications - Yeni bildirim oluştur (Admin only)
router.post('/', [
  body('title')
    .trim()
    .isLength({ min: 1, max: 100 })
    .withMessage('Başlık 1-100 karakter arasında olmalı'),
  body('message')
    .trim()
    .isLength({ min: 1, max: 500 })
    .withMessage('Mesaj 1-500 karakter arasında olmalı'),
  body('type')
    .optional()
    .isIn(['success', 'info', 'warning', 'error', 'system'])
    .withMessage('Geçersiz bildirim tipi'),
  body('category')
    .optional()
    .isIn(['firma', 'user', 'system', 'security', 'etuys', 'general'])
    .withMessage('Geçersiz kategori'),
  body('priority')
    .optional()
    .isIn(['low', 'medium', 'high', 'critical'])
    .withMessage('Geçersiz öncelik'),
  body('userId')
    .optional()
    .isMongoId()
    .withMessage('Geçersiz kullanıcı ID\'si'),
  body('userIds')
    .optional()
    .isArray()
    .withMessage('userIds array olmalı'),
  body('userIds.*')
    .optional()
    .isMongoId()
    .withMessage('Geçersiz kullanıcı ID formatı'),
  body('icon')
    .optional()
    .trim()
    .isLength({ max: 50 })
    .withMessage('Icon adı çok uzun'),
  body('color')
    .optional()
    .matches(/^#[0-9A-F]{6}$/i)
    .withMessage('Geçersiz hex renk kodu'),
  body('actionButton.text')
    .optional()
    .trim()
    .isLength({ max: 30 })
    .withMessage('Aksiyon metni çok uzun'),
  body('actionButton.url')
    .optional()
    .trim()
    .isLength({ max: 200 })
    .withMessage('URL çok uzun'),
  body('actionButton.action')
    .optional()
    .trim()
    .isLength({ max: 50 })
    .withMessage('Aksiyon tipi çok uzun'),
  body('expiresAt')
    .optional()
    .isISO8601()
    .withMessage('Geçersiz tarih formatı'),
  body('channels.web')
    .optional()
    .isBoolean()
    .withMessage('Web channel boolean olmalı'),
  body('channels.email')
    .optional()
    .isBoolean()
    .withMessage('Email channel boolean olmalı'),
  body('channels.push')
    .optional()
    .isBoolean()
    .withMessage('Push channel boolean olmalı'),
  body('channels.sms')
    .optional()
    .isBoolean()
    .withMessage('SMS channel boolean olmalı'),
  body('organizationData.department')
    .optional()
    .trim()
    .isLength({ max: 50 })
    .withMessage('Departman adı çok uzun'),
  body('organizationData.tags')
    .optional()
    .isArray()
    .withMessage('Tags array olmalı'),
  body('organizationData.tags.*')
    .optional()
    .trim()
    .isLength({ max: 20 })
    .withMessage('Tag çok uzun')
], createNotification);

// 🧹 DELETE /api/notifications/cleanup-expired - Süresi geçmiş bildirimleri temizle (Admin only)
router.delete('/cleanup-expired', adminAuth, async (req, res) => {
  try {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    const result = await require('../models/Notification').deleteMany({
      createdAt: { $lt: thirtyDaysAgo }
    });
    
    res.json({
      success: true,
      message: `${result.deletedCount} eski bildirim temizlendi`,
      data: { deletedCount: result.deletedCount }
    });
  } catch (error) {
    console.error('Cleanup error:', error);
    res.status(500).json({
      success: false,
      message: 'Temizleme işlemi başarısız'
    });
  }
});

// 🔔 ADVANCED NOTIFICATION ENDPOINTS

// Send bulk notification (admin only)
router.post('/send', adminAuth, async (req, res) => {
  try {
    const {
      type,
      recipients,
      subject,
      message,
      template,
      priority = 'normal',
      scheduled = false,
      scheduleDate = null
    } = req.body;

    if (!recipients || !recipients.length) {
      return res.status(400).json({
        success: false,
        message: 'En az bir alıcı seçmelisiniz'
      });
    }

    if (!subject || !message) {
      return res.status(400).json({
        success: false,
        message: 'Konu ve mesaj alanları zorunludur'
      });
    }

    const result = await notificationService.sendBulkNotification({
      type,
      recipients,
      subject,
      message,
      template,
      priority,
      scheduled,
      scheduleDate
    });

    res.json({
      success: true,
      data: result,
      message: result.message
    });
  } catch (error) {
    console.error('Send notification error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Bildirim gönderilirken hata oluştu'
    });
  }
});

// Send email notification
router.post('/email', adminAuth, async (req, res) => {
  try {
    const { to, subject, message, priority = 'normal' } = req.body;

    const result = await notificationService.sendEmail({
      to,
      subject,
      html: notificationService.generateEmailHTML(subject, message),
      priority
    });

    res.json({
      success: true,
      data: result,
      message: `E-posta ${result.recipients} alıcıya gönderildi`
    });
  } catch (error) {
    console.error('Email send error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'E-posta gönderilirken hata oluştu'
    });
  }
});

// Send SMS notification
router.post('/sms', adminAuth, async (req, res) => {
  try {
    const { to, message, priority = 'normal' } = req.body;

    const result = await notificationService.sendSMS({
      to,
      message,
      priority
    });

    res.json({
      success: true,
      data: result,
      message: `SMS ${result.recipients} alıcıya gönderildi`
    });
  } catch (error) {
    console.error('SMS send error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'SMS gönderilirken hata oluştu'
    });
  }
});

// Test notification service
router.post('/test', adminAuth, async (req, res) => {
  try {
    const { type = 'email', recipient } = req.body;
    
    if (type === 'email') {
      await notificationService.sendEmail({
        to: recipient,
        subject: 'Test E-posta',
        html: notificationService.generateEmailHTML(
          'Test E-posta',
          'Bu bir test e-postasıdır. Sistem düzgün çalışıyor.'
        )
      });
    } else if (type === 'sms') {
      await notificationService.sendSMS({
        to: recipient,
        message: 'Bu bir test SMS mesajıdır. Sistem düzgün çalışıyor.'
      });
    }

    res.json({
      success: true,
      message: `Test ${type} başarıyla gönderildi`
    });
  } catch (error) {
    console.error('Test notification error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Test bildirimi gönderilirken hata oluştu'
    });
  }
});

// 🎯 ADVANCED ENDPOINTS - Enterprise Features

// 📊 GET /api/notifications/categories - Mevcut kategorileri getir
router.get('/categories', async (req, res) => {
  try {
    const categories = [
      { value: 'firma', label: '🏢 Firma', description: 'Firma işlemleri bildirimleri' },
      { value: 'user', label: '👤 Kullanıcı', description: 'Kullanıcı hesap bildirimleri' },
      { value: 'system', label: '⚙️ Sistem', description: 'Sistem bildirimleri' },
      { value: 'security', label: '🔐 Güvenlik', description: 'Güvenlik uyarıları' },
      { value: 'etuys', label: '📋 ETUYS', description: 'ETUYS süreç bildirimleri' },
      { value: 'general', label: '📢 Genel', description: 'Genel bilgilendirmeler' }
    ];

    res.status(200).json({
      success: true,
      message: 'Bildirim kategorileri getirildi',
      data: categories
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Kategoriler getirilemedi',
      error: error.message
    });
  }
});

// 🎨 GET /api/notifications/types - Mevcut tipleri getir
router.get('/types', async (req, res) => {
  try {
    const types = [
      { value: 'success', label: '✅ Başarılı', color: '#10b981', description: 'İşlem başarılı' },
      { value: 'info', label: 'ℹ️ Bilgi', color: '#3b82f6', description: 'Bilgilendirme' },
      { value: 'warning', label: '⚠️ Uyarı', color: '#f59e0b', description: 'Dikkat gerektirir' },
      { value: 'error', label: '❌ Hata', color: '#ef4444', description: 'Hata bildirimi' },
      { value: 'system', label: '⚙️ Sistem', color: '#6b7280', description: 'Sistem mesajı' }
    ];

    res.status(200).json({
      success: true,
      message: 'Bildirim tipleri getirildi',
      data: types
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Tipler getirilemedi',
      error: error.message
    });
  }
});

// 🎖️ GET /api/notifications/priorities - Öncelik seviyeleri
router.get('/priorities', async (req, res) => {
  try {
    const priorities = [
      { value: 'low', label: '🔵 Düşük', description: 'Düşük öncelik' },
      { value: 'medium', label: '🟡 Orta', description: 'Orta öncelik' },
      { value: 'high', label: '🟠 Yüksek', description: 'Yüksek öncelik' },
      { value: 'critical', label: '🔴 Kritik', description: 'Kritik öncelik' }
    ];

    res.status(200).json({
      success: true,
      message: 'Öncelik seviyeleri getirildi',
      data: priorities
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Öncelikler getirilemedi',
      error: error.message
    });
  }
});

// 🔄 GET /api/notifications/recent - Son bildirimleri getir (dashboard için)
router.get('/recent', [
  query('limit').optional().isInt({ min: 1, max: 10 }).withMessage('Limit 1-10 arasında olmalı')
], async (req, res) => {
  try {
    const userId = req.user.id;
    const limit = parseInt(req.query.limit) || 5;

    const Notification = require('../models/Notification');
    const notifications = await Notification.find({ userId })
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean();

    const displayData = notifications.map(n => ({
      id: n._id,
      title: n.title,
      message: n.message,
      type: n.type,
      isRead: n.isRead,
      createdAt: n.createdAt,
      icon: n.icon,
      color: n.color,
      // 🔗 Bildirime tıklayınca ilgili kayda gidebilmek için (müşteri talebi)
      actionButton: n.actionButton || null,
      relatedEntity: n.relatedEntity || null
    }));

    res.status(200).json({
      success: true,
      message: 'Son bildirimler getirildi',
      data: displayData
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Son bildirimler getirilemedi',
      error: error.message
    });
  }
});

module.exports = router;