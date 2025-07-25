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

module.exports = router; 