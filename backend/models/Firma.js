const mongoose = require('mongoose');

// 👥 Yetkili Kişi Schema - Enterprise Format
const yetkiliKisiSchema = new mongoose.Schema({
  adSoyad: {
    type: String,
    required: [true, 'Yetkili kişi adı soyadı zorunludur'],
    trim: true,
    maxlength: [100, 'Ad Soyad 100 karakterden fazla olamaz']
  },
  telefon1: {
    type: String,
    required: [true, 'Birinci telefon zorunludur'],
    trim: true,
    validate: {
      validator: function(v) {
        return /^[0-9+\s\-\(\)]{10,20}$/.test(v);
      },
      message: 'Geçerli bir telefon numarası giriniz'
    }
  },
  telefon2: {
    type: String,
    trim: true,
    default: '',
    validate: {
      validator: function(v) {
        return !v || /^[0-9+\s\-\(\)]{10,20}$/.test(v);
      },
      message: 'Geçerli bir telefon numarası giriniz'
    }
  },
  eposta1: {
    type: String,
    required: [true, 'Birinci e-posta zorunludur'],
    trim: true,
    lowercase: true,
    validate: {
      validator: function(v) {
        return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
      },
      message: 'Geçerli bir e-posta adresi giriniz'
    }
  },
  eposta2: {
    type: String,
    trim: true,
    lowercase: true,
    default: '',
    validate: {
      validator: function(v) {
        return !v || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
      },
      message: 'Geçerli bir e-posta adresi giriniz'
    }
  }
}, { _id: false });

// 🏢 Ana Firma Schema - Enterprise Edition
const firmaSchema = new mongoose.Schema({
  // 🆔 Otomatik oluşturulan unique ID
  firmaId: {
    type: String,
    unique: true,
    trim: true,
    uppercase: true,
    validate: {
      validator: function(v) {
        return /^A\d{6}$/.test(v);
      },
      message: 'Firma ID A000000 formatında olmalıdır'
    }
  },
  
  // 🎯 Temel Kimlik Bilgileri
  vergiNoTC: {
    type: String,
    required: [true, 'Vergi No/TC No zorunludur'],
    unique: true,
    trim: true,
    validate: {
      validator: function(v) {
        return /^\d{10}$/.test(v) || /^\d{11}$/.test(v);
      },
      message: 'Vergi No (10 hane) veya TC No (11 hane) olmalıdır'
    }
  },
  
  tamUnvan: {
    type: String,
    required: [true, 'Tam ünvan zorunludur'],
    trim: true,
    maxlength: [500, 'Tam ünvan 500 karakterden fazla olamaz'],
    index: true
  },
  
  // 📍 Lokasyon Bilgileri
  adres: {
    type: String,
    required: [true, 'Adres zorunludur'],
    trim: true,
    maxlength: [1000, 'Adres 1000 karakterden fazla olamaz']
  },
  
  firmaIl: {
    type: String,
    required: [true, 'Firma ili zorunludur'],
    trim: true,
    uppercase: true,
    index: true
  },
  
  firmaIlce: {
    type: String,
    trim: true,
    uppercase: true,
    default: '',
    index: true
  },
  
  // 📧 İletişim Bilgileri
  kepAdresi: {
    type: String,
    trim: true,
    lowercase: true,
    default: '',
    validate: {
      validator: function(v) {
        return !v || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
      },
      message: 'KEP adresi geçerli email formatında olmalıdır'
    }
  },
  
  firmaTelefon: {
    type: String,
    trim: true,
    default: '',
    validate: {
      validator: function(v) {
        return !v || /^[0-9+\s\-\(\)]{10,20}$/.test(v);
      },
      message: 'Geçerli bir telefon numarası giriniz'
    }
  },
  
  firmaEmail: {
    type: String,
    trim: true,
    lowercase: true,
    default: '',
    validate: {
      validator: function(v) {
        return !v || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
      },
      message: 'Geçerli bir e-posta adresi giriniz'
    }
  },
  
  firmaWebsite: {
    type: String,
    trim: true,
    default: '',
    validate: {
      validator: function(v) {
        return !v || /^https?:\/\/.+/.test(v);
      },
      message: 'Website http:// veya https:// ile başlamalıdır'
    }
  },
  
  // 🏭 İş Bilgileri
  yabanciSermayeli: {
    type: Boolean,
    default: false,
    index: true
  },
  
  anaFaaliyetKonusu: {
    type: String,
    trim: true,
    default: '',
    enum: {
      values: ['', 'İNŞAAT VE MÜHENDİSLİK', 'BİLİŞİM VE YAZILIM', 'DANIŞMANLIK HİZMETLERİ', 
               'GÜVENLIK HİZMETLERİ', 'TEMİZLİK HİZMETLERİ', 'GIDA VE İÇECEK', 
               'TEKSTİL VE KONFEKS.', 'OTOMOTİV VE YEDEK PARÇA', 'MAKİNE VE EKİPMAN', 'DİĞER'],
      message: 'Geçersiz faaliyet konusu'
    }
  },
  
  // 📅 Yetki Tarihleri
  etuysYetkiBitisTarihi: {
    type: Date,
    default: null,
    validate: {
      validator: function(v) {
        return !v || v > new Date();
      },
      message: 'ETUYS yetki bitiş tarihi gelecek bir tarih olmalıdır'
    }
  },
  
  dysYetkiBitisTarihi: {
    type: Date,
    default: null,
    validate: {
      validator: function(v) {
        return !v || v > new Date();
      },
      message: 'DYS yetki bitiş tarihi gelecek bir tarih olmalıdır'
    }
  },
  
  // 👤 İrtibat Kişisi
  ilkIrtibatKisi: {
    type: String,
    required: [true, 'İlk irtibat kişisi zorunludur'],
    trim: true,
    maxlength: [100, 'İrtibat kişisi 100 karakterden fazla olamaz']
  },
  
  // 👥 Yetkili Kişiler Array
  yetkiliKisiler: {
    type: [yetkiliKisiSchema],
    validate: {
      validator: function(v) {
        return v && v.length >= 1 && v.length <= 2;
      },
      message: 'En az 1, en fazla 2 yetkili kişi eklenmelidir'
    }
  },
  
  // 📝 Ek Bilgiler
  notlar: {
    type: String,
    trim: true,
    maxlength: [2000, 'Notlar 2000 karakterden fazla olamaz'],
    default: ''
  },
  
  // 📊 Sistem Bilgileri
  aktif: {
    type: Boolean,
    default: true,
    index: true
  },
  
  olusturanKullanici: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Oluşturan kullanıcı zorunludur']
  },
  
  sonGuncelleyen: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// 🔍 İndeksler - Performance Optimized
firmaSchema.index({ tamUnvan: 'text', firmaId: 'text' });
firmaSchema.index({ firmaIl: 1, firmaIlce: 1 });
firmaSchema.index({ createdAt: -1 });
firmaSchema.index({ etuysYetkiBitisTarihi: 1 });
firmaSchema.index({ anaFaaliyetKonusu: 1 });

// 📊 Virtual Fields
firmaSchema.virtual('yetkiliKisiSayisi').get(function() {
  return this.yetkiliKisiler ? this.yetkiliKisiler.length : 0;
});

firmaSchema.virtual('birincYetkili').get(function() {
  return this.yetkiliKisiler && this.yetkiliKisiler[0] ? this.yetkiliKisiler[0] : null;
});

firmaSchema.virtual('ikinciYetkili').get(function() {
  return this.yetkiliKisiler && this.yetkiliKisiler[1] ? this.yetkiliKisiler[1] : null;
});

// 🔄 Pre-save Middleware - Otomatik Firma ID
firmaSchema.pre('save', async function(next) {
  try {
    if (this.isNew && !this.firmaId) {
      const lastFirma = await this.constructor.findOne({}, { firmaId: 1 }, { sort: { firmaId: -1 } });
      
      let nextNumber = 1;
      if (lastFirma && lastFirma.firmaId) {
        const currentNumber = parseInt(lastFirma.firmaId.substring(1));
        nextNumber = currentNumber + 1;
      }
      
      this.firmaId = 'A' + nextNumber.toString().padStart(6, '0');
    }
    next();
  } catch (error) {
    next(error);
  }
});

// 📝 Instance Methods
firmaSchema.methods.toSafeJSON = function() {
  const obj = this.toObject();
  delete obj.__v;
  return obj;
};

firmaSchema.methods.toExcelFormat = function() {
  return {
    firmaId: this.firmaId,
    vergiNoTC: this.vergiNoTC,
    tamUnvan: this.tamUnvan,
    adres: this.adres,
    firmaIl: this.firmaIl,
    firmaIlce: this.firmaIlce,
    kepAdresi: this.kepAdresi,
    yabanciSermayeli: this.yabanciSermayeli ? 'EVET' : 'HAYIR',
    anaFaaliyetKonusu: this.anaFaaliyetKonusu,
    etuysYetkiBitisTarihi: this.etuysYetkiBitisTarihi,
    ilkIrtibatKisi: this.ilkIrtibatKisi,
    yetkiliKisiler: this.yetkiliKisiler,
    notlar: this.notlar,
    olusturmaTarihi: this.createdAt
  };
};

// 📊 Static Methods
firmaSchema.statics.findByVergiNoTC = function(vergiNoTC) {
  return this.findOne({ vergiNoTC, aktif: true });
};

firmaSchema.statics.findByFirmaId = function(firmaId) {
  return this.findOne({ firmaId: firmaId.toUpperCase(), aktif: true });
};

firmaSchema.statics.searchFirmalar = function(searchTerm) {
  const regex = new RegExp(searchTerm, 'i');
  return this.find({
    $or: [
      { tamUnvan: regex },
      { firmaId: regex },
      { vergiNoTC: regex },
      { ilkIrtibatKisi: regex }
    ],
    aktif: true
  }).sort({ tamUnvan: 1 });
};

firmaSchema.statics.getStatistics = async function() {
  const [
    toplamFirma,
    aktifFirma,
    yabanciSermayeli,
    etuysYetkili,
    dysYetkili
  ] = await Promise.all([
    this.countDocuments(),
    this.countDocuments({ aktif: true }),
    this.countDocuments({ aktif: true, yabanciSermayeli: true }),
    this.countDocuments({ 
      aktif: true, 
      etuysYetkiBitisTarihi: { $ne: null } 
    }),
    this.countDocuments({ 
      aktif: true, 
      dysYetkiBitisTarihi: { $ne: null } 
    })
  ]);
  
  return {
    toplamFirma,
    aktifFirma,
    pasifFirma: toplamFirma - aktifFirma,
    yabanciSermayeli,
    etuysYetkili,
    dysYetkili
  };
};

module.exports = mongoose.model('Firma', firmaSchema); 