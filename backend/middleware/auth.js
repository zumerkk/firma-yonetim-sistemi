// 🔐 Authentication Middleware
// JWT token kontrolü ve kullanıcı yetkilendirmesi

const jwt = require('jsonwebtoken');
const User = require('../models/User');

// 🔑 JWT Token Doğrulama
const authenticate = async (req, res, next) => {
  try {
    // Token'ı header'dan al
    let token = req.header('Authorization');
    
    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Erişim reddedildi. Token bulunamadı.'
      });
    }
    
    // Bearer token formatını kontrol et
    if (token.startsWith('Bearer ')) {
      token = token.slice(7, token.length);
    }
    
    // Token'ı doğrula
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Kullanıcıyı veritabanından bul
    const user = await User.findById(decoded.id).select('-sifre');
    
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Token geçersiz. Kullanıcı bulunamadı.'
      });
    }
    
    if (!user.aktif) {
      return res.status(401).json({
        success: false,
        message: 'Hesabınız deaktive edilmiş.'
      });
    }
    
    // Kullanıcıyı request'e ekle
    req.user = user;
    next();
    
  } catch (error) {
    // JWT hatalarını logla ama detay verme (security)
    if (error.name === 'JsonWebTokenError') {
      console.log('🔒 JWT Token geçersiz (malformed token)');
      return res.status(401).json({
        success: false,
        message: 'Token geçersiz.'
      });
    }
    
    if (error.name === 'TokenExpiredError') {
      console.log('⏰ JWT Token süresi dolmuş');
      return res.status(401).json({
        success: false,
        message: 'Token süresi dolmuş. Lütfen tekrar giriş yapın.'
      });
    }
    
    console.error('🚨 Auth Middleware Hatası:', error.message);
    return res.status(500).json({
      success: false,
      message: 'Sunucu hatası'
    });
  }
};

// 🛡️ Rol Bazlı Yetkilendirme
const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Önce giriş yapmalısınız.'
      });
    }
    
    if (!roles.includes(req.user.rol)) {
      return res.status(403).json({
        success: false,
        message: `Bu işlem için ${roles.join(' veya ')} yetkisi gereklidir. Sizin rolünüz: ${req.user.rol}`
      });
    }
    
    next();
  };
};

// 🔐 Özel Yetki Kontrolü (granular permissions)
const checkPermission = (permission) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Önce giriş yapmalısınız.'
      });
    }
    
    // Admin her şeyi yapabilir
    if (req.user.rol === 'admin') {
      return next();
    }
    
    // Özel yetkiyi kontrol et
    if (!req.user.yetkiler[permission]) {
      return res.status(403).json({
        success: false,
        message: `Bu işlem için ${permission} yetkisi gereklidir.`
      });
    }
    
    next();
  };
};

// 📊 Kullanıcı Sahiplik Kontrolü (kendi kayıtlarını düzenleyebilir)
const checkOwnership = (resourceModel, userField = 'olusturanKullanici') => {
  return async (req, res, next) => {
    try {
      const resourceId = req.params.id;
      const Model = require(`../models/${resourceModel}`);
      
      const resource = await Model.findById(resourceId);
      
      if (!resource) {
        return res.status(404).json({
          success: false,
          message: 'Kaynak bulunamadı.'
        });
      }
      
      // Admin her şeyi yapabilir
      if (req.user.rol === 'admin') {
        return next();
      }
      
      // Sahiplik kontrolü
      if (resource[userField].toString() !== req.user._id.toString()) {
        return res.status(403).json({
          success: false,
          message: 'Bu kaynağı sadece oluşturan kişi düzenleyebilir.'
        });
      }
      
      next();
    } catch (error) {
      console.error('🚨 Ownership Check Hatası:', error);
      return res.status(500).json({
        success: false,
        message: 'Yetki kontrolü sırasında hata oluştu.'
      });
    }
  };
};

// 🚫 Opsiyonel Auth - Token varsa kullanıcıyı ekle, yoksa devam et
const optionalAuth = async (req, res, next) => {
  try {
    let token = req.header('Authorization');
    
    if (!token) {
      return next(); // Token yok, devam et
    }
    
    if (token.startsWith('Bearer ')) {
      token = token.slice(7, token.length);
    }
    
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id).select('-sifre');
    
    if (user && user.aktif) {
      req.user = user;
    }
    
    next();
  } catch (error) {
    // Token hatası olsa bile devam et
    next();
  }
};

// 🔐 Admin Only Middleware
const adminAuth = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      message: 'Önce giriş yapmalısınız.'
    });
  }
  
  if (req.user.rol !== 'admin') {
    return res.status(403).json({
      success: false,
      message: 'Bu işlem için admin yetkisi gereklidir.'
    });
  }
  
  next();
};

module.exports = {
  authenticate,
  authorize,
  checkPermission,
  checkOwnership,
  optionalAuth,
  adminAuth
};