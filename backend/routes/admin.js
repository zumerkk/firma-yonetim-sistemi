// 🔐 ADMIN ROUTES - ENTERPRISE MANAGEMENT SUITE
// Comprehensive admin routes for user management, system monitoring, settings

const express = require('express');
const router = express.Router();
const {
  getUsers,
  createUser,
  updateUser,
  deleteUser,
  getSystemMetrics,
  updateSystemSettings,
  createBackup,
  systemCleanup,
  systemOptimize
} = require('../controllers/adminController');
const { authenticate } = require('../middleware/auth');

// Middleware - Admin sadece erişir
const adminOnly = (req, res, next) => {
  if (req.user.rol !== 'admin') {
    return res.status(403).json({
      success: false,
      message: 'Bu işlem için admin yetkisi gereklidir'
    });
  }
  next();
};

// 👥 USER MANAGEMENT ROUTES
router.get('/users', authenticate, adminOnly, getUsers);
router.post('/users', authenticate, adminOnly, createUser);
router.put('/users/:id', authenticate, adminOnly, updateUser);
router.delete('/users/:id', authenticate, adminOnly, deleteUser);

// 📊 SYSTEM METRICS ROUTES
router.get('/system-metrics', authenticate, adminOnly, getSystemMetrics);

// ⚙️ SYSTEM SETTINGS ROUTES
router.put('/system-settings', authenticate, adminOnly, updateSystemSettings);

// 🔧 SYSTEM MAINTENANCE ROUTES
router.post('/backup', authenticate, adminOnly, createBackup);
router.post('/cleanup', authenticate, adminOnly, systemCleanup);
router.post('/optimize', authenticate, adminOnly, systemOptimize);

// 🔔 NOTIFICATION SETTINGS ROUTES
router.get('/notification-settings', authenticate, adminOnly, async (req, res) => {
  try {
    // Default notification settings
    const defaultSettings = {
      emailEnabled: true,
      smsEnabled: false,
      pushEnabled: true,
      smtpServer: process.env.SMTP_HOST || '',
      smtpPort: parseInt(process.env.SMTP_PORT) || 587,
      smtpUser: process.env.SMTP_USER || '',
      smtpPassword: process.env.SMTP_PASS || '',
      smsProvider: 'twilio',
      smsApiKey: process.env.TWILIO_AUTH_TOKEN || '',
      autoNotifications: {
        newFirma: true,
        tesvikStatusChange: true,
        systemAlerts: true,
        weeklyReports: false
      }
    };

    res.json({
      success: true,
      data: defaultSettings
    });
  } catch (error) {
    console.error('Notification settings get error:', error);
    res.status(500).json({
      success: false,
      message: 'Bildirim ayarları alınırken hata oluştu'
    });
  }
});

router.put('/notification-settings', authenticate, adminOnly, async (req, res) => {
  try {
    const settings = req.body;
    
    // Here you would typically save to database
    // For now, we'll just return success
    
    res.json({
      success: true,
      message: 'Bildirim ayarları başarıyla güncellendi',
      data: settings
    });
  } catch (error) {
    console.error('Notification settings update error:', error);
    res.status(500).json({
      success: false,
      message: 'Bildirim ayarları güncellenirken hata oluştu'
    });
  }
});

module.exports = router;