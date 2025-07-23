// 🔐 Authentication Routes
// Kullanıcı kimlik doğrulama rotaları

const express = require('express');
const router = express.Router();

// Controllers
const {
  register,
  login,
  getProfile,
  updateProfile,
  changePassword,
  getUserStats,
  logout,
  getSettings,
  updateSettings
} = require('../controllers/authController');

// Middleware
const { authenticate, authorize } = require('../middleware/auth');
const {
  validateRegister,
  validateLogin,
  validateUpdateProfile,
  validateChangePassword
} = require('../middleware/validation');

// 📝 POST /api/auth/register - Kullanıcı Kaydı
router.post('/register', validateRegister, register);

// 🔑 POST /api/auth/login - Kullanıcı Girişi
router.post('/login', validateLogin, login);

// 👤 GET /api/auth/profile - Profil Bilgileri (Auth gerekli)
router.get('/profile', authenticate, getProfile);

// ✏️ PUT /api/auth/profile - Profil Güncelleme (Auth gerekli)
router.put('/profile', authenticate, validateUpdateProfile, updateProfile);

// 🔒 PUT /api/auth/change-password - Şifre Değiştirme (Auth gerekli)
router.put('/change-password', authenticate, validateChangePassword, changePassword);

// 📊 GET /api/auth/stats - Kullanıcı İstatistikleri (Admin)
router.get('/stats', authenticate, authorize('admin'), getUserStats);

// ⚙️ GET /api/auth/settings - Kullanıcı Ayarları (Auth gerekli)
router.get('/settings', authenticate, getSettings);

// ⚙️ PUT /api/auth/settings - Kullanıcı Ayarlarını Güncelle (Auth gerekli)
router.put('/settings', authenticate, updateSettings);

// 🚪 POST /api/auth/logout - Çıkış yapma (client-side token cleanup)
router.post('/logout', logout);

// 🔍 GET /api/auth/verify - Token Doğrulama (Frontend için)
router.get('/verify', authenticate, (req, res) => {
  res.json({
    success: true,
    message: 'Token geçerli',
    data: {
      user: req.user.toPublicJSON()
    }
  });
});

module.exports = router; 