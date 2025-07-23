// 🔐 Authentication Controller
// Kullanıcı giriş, kayıt ve profil işlemlerini yönetir

const User = require('../models/User');
const { validationResult } = require('express-validator');

// 📝 Kullanıcı Kaydı
const register = async (req, res) => {
  try {
    // Validation kontrolü
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Girilen bilgilerde hatalar var',
        errors: errors.array()
      });
    }
    
    const { adSoyad, email, sifre, telefon, rol } = req.body;
    
    // Email kontrolü
    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'Bu e-posta adresi zaten kullanımda'
      });
    }
    
    // Yeni kullanıcı oluştur
    const user = new User({
      adSoyad,
      email: email.toLowerCase(),
      sifre,
      telefon,
      rol: rol || 'kullanici' // Default olarak kullanici rolü
    });
    
    await user.save();
    
    // Token oluştur
    const token = user.jwtTokenOlustur();
    
    res.status(201).json({
      success: true,
      message: 'Kullanıcı başarıyla oluşturuldu',
      data: {
        user: user.toPublicJSON(),
        token
      }
    });
    
  } catch (error) {
    console.error('🚨 Register Hatası:', error);
    res.status(500).json({
      success: false,
      message: 'Kullanıcı oluşturulurken hata oluştu',
      error: error.message
    });
  }
};

// 🔑 Kullanıcı Girişi
const login = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Girilen bilgilerde hatalar var',
        errors: errors.array()
      });
    }
    
    const { email, sifre } = req.body;
    
    // Kullanıcıyı bul (şifre dahil)
    const user = await User.findOne({ 
      email: email.toLowerCase() 
    }).select('+sifre');
    
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'E-posta veya şifre hatalı'
      });
    }
    
    if (!user.aktif) {
      return res.status(401).json({
        success: false,
        message: 'Hesabınız deaktive edilmiş. Lütfen yönetici ile iletişime geçin.'
      });
    }
    
    // Şifre kontrolü
    const isPasswordCorrect = await user.sifreKontrol(sifre);
    if (!isPasswordCorrect) {
      return res.status(401).json({
        success: false,
        message: 'E-posta veya şifre hatalı'
      });
    }
    
    // Son giriş tarihini güncelle
    user.sonGiris = new Date();
    await user.save();
    
    // Token oluştur
    const token = user.jwtTokenOlustur();
    
    res.json({
      success: true,
      message: 'Giriş başarılı',
      data: {
        user: user.toPublicJSON(),
        token
      }
    });
    
  } catch (error) {
    console.error('🚨 Login Hatası:', error);
    res.status(500).json({
      success: false,
      message: 'Giriş yapılırken hata oluştu',
      error: error.message
    });
  }
};

// 👤 Profil Bilgileri
const getProfile = async (req, res) => {
  try {
    // Middleware'den gelen kullanıcı bilgisi
    const user = await User.findById(req.user._id);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Kullanıcı bulunamadı'
      });
    }
    
    res.json({
      success: true,
      data: {
        user: user.toPublicJSON()
      }
    });
    
  } catch (error) {
    console.error('🚨 Get Profile Hatası:', error);
    res.status(500).json({
      success: false,
      message: 'Profil bilgileri alınırken hata oluştu',
      error: error.message
    });
  }
};

// ✏️ Profil Güncelleme
const updateProfile = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Girilen bilgilerde hatalar var',
        errors: errors.array()
      });
    }
    
    const { adSoyad, telefon, profilResmi, notlar } = req.body;
    
    const user = await User.findById(req.user._id);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Kullanıcı bulunamadı'
      });
    }
    
    // Güncellenebilir alanları güncelle
    if (adSoyad) user.adSoyad = adSoyad;
    if (telefon !== undefined) user.telefon = telefon;
    if (profilResmi !== undefined) user.profilResmi = profilResmi;
    if (notlar !== undefined) user.notlar = notlar;
    
    await user.save();
    
    res.json({
      success: true,
      message: 'Profil başarıyla güncellendi',
      data: {
        user: user.toPublicJSON()
      }
    });
    
  } catch (error) {
    console.error('🚨 Update Profile Hatası:', error);
    res.status(500).json({
      success: false,
      message: 'Profil güncellenirken hata oluştu',
      error: error.message
    });
  }
};

// 🔒 Şifre Değiştirme
const changePassword = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Girilen bilgilerde hatalar var',
        errors: errors.array()
      });
    }
    
    const { eskiSifre, yeniSifre } = req.body;
    
    // Kullanıcıyı şifre ile beraber bul
    const user = await User.findById(req.user._id).select('+sifre');
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Kullanıcı bulunamadı'
      });
    }
    
    // Eski şifre kontrolü
    const isOldPasswordCorrect = await user.sifreKontrol(eskiSifre);
    if (!isOldPasswordCorrect) {
      return res.status(400).json({
        success: false,
        message: 'Mevcut şifre hatalı'
      });
    }
    
    // Yeni şifreyi güncelle
    user.sifre = yeniSifre;
    await user.save();
    
    res.json({
      success: true,
      message: 'Şifre başarıyla değiştirildi'
    });
    
  } catch (error) {
    console.error('🚨 Change Password Hatası:', error);
    res.status(500).json({
      success: false,
      message: 'Şifre değiştirilirken hata oluştu',
      error: error.message
    });
  }
};

// 📊 Kullanıcı İstatistikleri (Admin için)
const getUserStats = async (req, res) => {
  try {
    const totalUsers = await User.countDocuments({ aktif: true });
    const roleStats = await User.countByRole();
    const recentUsers = await User.find({ aktif: true })
      .sort({ createdAt: -1 })
      .limit(5)
      .select('adSoyad email rol createdAt');
    
    res.json({
      success: true,
      data: {
        totalUsers,
        roleStats,
        recentUsers
      }
    });
    
  } catch (error) {
    console.error('🚨 Get User Stats Hatası:', error);
    res.status(500).json({
      success: false,
      message: 'İstatistikler alınırken hata oluştu',
      error: error.message
    });
  }
};

// 🚪 Çıkış (Token'ı client tarafında silinir)
const logout = (req, res) => {
  res.json({
    success: true,
    message: 'Başarıyla çıkış yapıldı'
  });
};

// ⚙️ Kullanıcı Ayarlarını Getir
const getSettings = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Kullanıcı bulunamadı'
      });
    }
    
    // Default settings eğer yoksa
    const defaultSettings = {
      notifications: {
        email: true,
        push: false,
        sms: false,
        reminders: true
      },
      ui: {
        theme: 'light',
        language: 'tr',
        dateFormat: 'DD/MM/YYYY',
        currency: 'TRY'
      },
      data: {
        autoSave: true,
        backupFrequency: 'daily',
        dataRetention: 365,
        exportFormat: 'excel'
      },
      security: {
        twoFactorAuth: false,
        sessionTimeout: 30,
        passwordExpiry: 90,
        loginAlerts: true
      }
    };
    
    res.json({
      success: true,
      data: {
        settings: user.settings || defaultSettings
      }
    });
    
  } catch (error) {
    console.error('🚨 Get Settings Hatası:', error);
    res.status(500).json({
      success: false,
      message: 'Ayarlar alınırken hata oluştu',
      error: error.message
    });
  }
};

// ⚙️ Kullanıcı Ayarlarını Güncelle
const updateSettings = async (req, res) => {
  try {
    const { settings } = req.body;
    
    const user = await User.findById(req.user._id);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Kullanıcı bulunamadı'
      });
    }
    
    // Settings'i merge et (deep merge)
    user.settings = {
      notifications: {
        ...user.settings?.notifications,
        ...settings?.notifications
      },
      ui: {
        ...user.settings?.ui,
        ...settings?.ui
      },
      data: {
        ...user.settings?.data,
        ...settings?.data
      },
      security: {
        ...user.settings?.security,
        ...settings?.security
      }
    };
    
    await user.save();
    
    res.json({
      success: true,
      message: 'Ayarlar başarıyla güncellendi',
      data: {
        settings: user.settings
      }
    });
    
  } catch (error) {
    console.error('🚨 Update Settings Hatası:', error);
    res.status(500).json({
      success: false,
      message: 'Ayarlar güncellenirken hata oluştu',
      error: error.message
    });
  }
};

module.exports = {
  register,
  login,
  getProfile,
  updateProfile,
  changePassword,
  getUserStats,
  logout,
  getSettings,
  updateSettings
}; 