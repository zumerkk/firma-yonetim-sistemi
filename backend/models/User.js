// 👤 Kullanıcı Modeli - Kimlik Doğrulama ve Yetkilendirme
// Bu model sisteme giriş yapan kullanıcıları yönetir

const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const userSchema = new mongoose.Schema({
  // 👤 Kişisel Bilgiler
  adSoyad: {
    type: String,
    required: [true, 'Ad Soyad zorunludur'],
    trim: true,
    maxlength: [100, 'Ad Soyad 100 karakterden fazla olamaz']
  },
  
  email: {
    type: String,
    required: [true, 'E-posta adresi zorunludur'],
    unique: true,
    trim: true,
    lowercase: true,
    validate: {
      validator: function(v) {
        return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
      },
      message: 'Geçerli bir e-posta adresi giriniz'
    }
  },
  
  sifre: {
    type: String,
    required: [true, 'Şifre zorunludur'],
    minlength: [6, 'Şifre en az 6 karakter olmalıdır'],
    select: false // Query'lerde otomatik olarak gelmez
  },
  
  telefon: {
    type: String,
    trim: true,
    validate: {
      validator: function(v) {
        return !v || /^[0-9+\s-()]{10,20}$/.test(v);
      },
      message: 'Geçerli bir telefon numarası giriniz'
    }
  },
  
  // 🔐 Yetki ve Rol Sistemi
  rol: {
    type: String,
    enum: {
      values: ['admin', 'kullanici', 'readonly'],
      message: 'Rol admin, kullanici veya readonly olmalıdır'
    },
    default: 'kullanici'
  },
  
  yetkiler: {
    firmaEkle: { type: Boolean, default: true },
    firmaDuzenle: { type: Boolean, default: true },
    firmaSil: { type: Boolean, default: false },
    belgeEkle: { type: Boolean, default: true },
    belgeDuzenle: { type: Boolean, default: true },
    belgeSil: { type: Boolean, default: false },
    raporGoruntule: { type: Boolean, default: true },
    yonetimPaneli: { type: Boolean, default: false }
  },
  
  // 📊 Sistem Bilgileri
  aktif: {
    type: Boolean,
    default: true
  },
  
  sonGiris: {
    type: Date
  },
  
  sifreResetToken: String,
  sifreResetSonTarih: Date,
  
  profilResmi: {
    type: String,
    default: null
  },
  
  notlar: {
    type: String,
    trim: true,
    maxlength: [500, 'Notlar 500 karakterden fazla olamaz']
  }
  
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// 🔍 İndeksler
// email zaten unique olduğu için otomatik index'e sahip
userSchema.index({ aktif: 1 }); // Aktiflik filtreleme için
userSchema.index({ rol: 1 }); // Rol bazlı sorgular için

// 🛡️ Şifre hashleme middleware
userSchema.pre('save', async function(next) {
  // Şifre değişmediyse hashleme yapma
  if (!this.isModified('sifre')) return next();
  
  try {
    // Şifreyi hashle
    const salt = await bcrypt.genSalt(12);
    this.sifre = await bcrypt.hash(this.sifre, salt);
    next();
  } catch (error) {
    return next(error);
  }
});

// 📊 Virtual alanlar
userSchema.virtual('tamAdSoyad').get(function() {
  return this.adSoyad;
});

userSchema.virtual('rolAciklama').get(function() {
  const aciklamalar = {
    admin: 'Sistem Yöneticisi',
    kullanici: 'Standart Kullanıcı',
    readonly: 'Sadece Okuma'
  };
  return aciklamalar[this.rol] || 'Bilinmeyen Rol';
});

// 🔐 Instance metotları
userSchema.methods.sifreKontrol = async function(candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.sifre);
};

userSchema.methods.jwtTokenOlustur = function() {
  return jwt.sign(
    { 
      id: this._id,
      email: this.email,
      rol: this.rol 
    },
    process.env.JWT_SECRET,
    { 
      expiresIn: process.env.JWT_EXPIRE || '7d' 
    }
  );
};

userSchema.methods.toPublicJSON = function() {
  const user = this.toObject();
  delete user.sifre;
  delete user.sifreResetToken;
  delete user.sifreResetSonTarih;
  delete user.__v;
  return user;
};

// 📈 Static metotlar
userSchema.statics.findByEmail = function(email) {
  return this.findOne({ email: email.toLowerCase(), aktif: true });
};

userSchema.statics.findActiveUsers = function() {
  return this.find({ aktif: true }).select('-sifre');
};

userSchema.statics.countByRole = function() {
  return this.aggregate([
    { $match: { aktif: true } },
    { $group: { _id: '$rol', count: { $sum: 1 } } }
  ]);
};

// 🚫 Middleware - Kullanıcı silinmeden önce kontrol
userSchema.pre('remove', async function(next) {
  try {
    // Bu kullanıcının oluşturduğu firmaları kontrol et
    const Firma = mongoose.model('Firma');
    const firmaCount = await Firma.countDocuments({ olusturanKullanici: this._id });
    
    if (firmaCount > 0) {
      throw new Error(`Bu kullanıcının ${firmaCount} adet firma kaydı bulunmaktadır. Önce bu kayıtları başka bir kullanıcıya transfer edin.`);
    }
    
    console.log(`🗑️ Kullanıcı siliniyor: ${this.email}`);
    next();
  } catch (error) {
    next(error);
  }
});

module.exports = mongoose.model('User', userSchema); 