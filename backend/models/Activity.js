// 📋 Activity Log Modeli - İşlem Geçmişi
// Tüm firma işlemlerini kayıt altına alan profesyonel log sistemi
// 30 günlük otomatik temizleme ile

const mongoose = require('mongoose');

// 🎯 Activity Schema - Enterprise Level
const activitySchema = new mongoose.Schema({
  // 🎬 İşlem Türü
  action: {
    type: String,
    required: [true, 'İşlem türü zorunludur'],
    enum: [
      'create', 'update', 'delete', 'view', 'export', 'import',
      'restore', 'bulk_delete', 'bulk_update', 'search', 'generate'
    ],
    index: true
  },
  
  // 📁 İşlem Kategorisi 
  category: {
    type: String,
    required: [true, 'Kategori zorunludur'],
    enum: ['firma', 'user', 'system', 'auth', 'tesvik'], // 🔧 tesvik eklendi
    default: 'firma',
    index: true
  },
  
  // 🎯 İşlem Detayları
  title: {
    type: String,
    required: [true, 'Başlık zorunludur'],
    trim: true,
    maxlength: [200, 'Başlık 200 karakterden fazla olamaz']
  },
  
  description: {
    type: String,
    required: [true, 'Açıklama zorunludur'],
    trim: true,
    maxlength: [500, 'Açıklama 500 karakterden fazla olamaz']
  },
  
  // 🎪 İşlem Sonucu
  status: {
    type: String,
    required: true,
    enum: ['success', 'error', 'warning', 'info'],
    default: 'success',
    index: true
  },
  
  // 🏢 Hedef Kaynak Bilgileri
  targetResource: {
    type: {
      type: String,
      required: true,
      enum: ['firma', 'user', 'system', 'tesvik'], // 🔧 tesvik eklendi
      default: 'firma'
    },
    id: {
      type: mongoose.Schema.Types.ObjectId,
      index: true
    },
    name: {
      type: String,
      trim: true,
      maxlength: 200
    },
    firmaId: {
      type: String,
      trim: true,
      index: true
    }
  },
  
  // 👤 Kullanıcı Bilgileri
  user: {
    id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Kullanıcı ID zorunludur'],
      index: true
    },
    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: 100
    },
    email: {
      type: String,
      required: true,
      trim: true,
      lowercase: true
    },
    role: {
      type: String,
      required: true,
      enum: ['admin', 'kullanici', 'readonly'],
      default: 'kullanici'
    }
  },
  
  // 📊 Değişiklik Detayları
  changes: {
    before: {
      type: mongoose.Schema.Types.Mixed
    },
    after: {
      type: mongoose.Schema.Types.Mixed
    },
    fields: [{
      field: String,
      oldValue: mongoose.Schema.Types.Mixed,
      newValue: mongoose.Schema.Types.Mixed
    }]
  },
  
  // 🌐 Sistem Bilgileri
  metadata: {
    ip: {
      type: String,
      validate: {
        validator: function(v) {
          if (!v) return true;
          
          // Localhost IP'leri (development için)
          if (v === '::1' || v === '127.0.0.1' || v === 'localhost') {
            return true;
          }
          
          // IPv4 validation
          const ipv4 = /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
          if (ipv4.test(v)) return true;
          
          // Basic IPv6 validation (simplified)
          const ipv6 = /^([0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}$|^::1$/;
          if (ipv6.test(v)) return true;
          
          return false;
        },
        message: 'Geçerli bir IP adresi giriniz'
      }
    },
    userAgent: {
      type: String,
      trim: true,
      maxlength: 500
    },
    sessionId: {
      type: String,
      trim: true
    },
    source: {
      type: String,
      enum: ['web', 'web_interface', 'api', 'import', 'system'],
      default: 'web'
    }
  },
  
  // ⏱️ Performans Bilgileri
  performance: {
    duration: {
      type: Number, // milliseconds
      min: 0
    },
    recordsAffected: {
      type: Number,
      default: 1,
      min: 0
    }
  },
  
  // 🏷️ Etiketler
  tags: [{
    type: String,
    trim: true,
    maxlength: 50
  }],
  
  // ⚠️ Hata Bilgileri (varsa)
  error: {
    code: String,
    message: String,
    stack: String
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// 📊 İndeksler - Performance Optimized
// 🔍 İndeksler - DUPLICATE'lar TEMİZLENDİ
// Specific query indexes
activitySchema.index({ 'user.id': 1, createdAt: -1 });
activitySchema.index({ 'targetResource.type': 1, 'targetResource.id': 1 });
activitySchema.index({ 'targetResource.firmaId': 1, createdAt: -1 });
activitySchema.index({ status: 1, createdAt: -1 });

// Main compound index (action, category, status, createdAt zaten burada)
activitySchema.index({ 
  category: 1, 
  action: 1, 
  status: 1, 
  createdAt: -1 
});

// TTL index for automatic cleanup (30 days)
activitySchema.index({ createdAt: 1 }, { expireAfterSeconds: 30 * 24 * 60 * 60 });

// 🔄 Virtual Fields
activitySchema.virtual('age').get(function() {
  return Date.now() - this.createdAt.getTime();
});

activitySchema.virtual('ageInDays').get(function() {
  return Math.floor(this.age / (1000 * 60 * 60 * 24));
});

activitySchema.virtual('isRecent').get(function() {
  return this.ageInDays <= 1;
});

// 📝 Instance Methods
activitySchema.methods.toSafeJSON = function() {
  const obj = this.toObject();
  delete obj.__v;
  
  // Remove sensitive information from error stack traces
  if (obj.error && obj.error.stack) {
    delete obj.error.stack;
  }
  
  return obj;
};

// 📊 Static Methods
activitySchema.statics.getRecentActivities = function(limit = 20) {
  return this.find()
    .sort({ createdAt: -1 })
    .limit(limit)
    .lean();
};

// 📊 Dashboard için Son İşlemler (view aktivitelerini hariç tut)
activitySchema.statics.getRecentActivitiesForDashboard = function(limit = 20) {
  return this.find({
    action: { $ne: 'view' } // "view" aktivitelerini dashboard'dan gizle
  })
    .sort({ createdAt: -1 })
    .limit(limit)
    .lean();
};

activitySchema.statics.getActivitiesByUser = function(userId, limit = 50) {
  return this.find({ 'user.id': userId })
    .sort({ createdAt: -1 })
    .limit(limit)
    .lean();
};

activitySchema.statics.getActivitiesByFirma = function(firmaId, limit = 50) {
  return this.find({ 'targetResource.firmaId': firmaId })
    .sort({ createdAt: -1 })
    .limit(limit)
    .lean();
};

activitySchema.statics.getStatistics = async function() {
  const [
    totalActivities,
    todayActivities,
    successfulActivities,
    errorActivities,
    topUsers,
    topActions
  ] = await Promise.all([
    this.countDocuments(),
    this.countDocuments({
      createdAt: {
        $gte: new Date(new Date().setHours(0, 0, 0, 0))
      }
    }),
    this.countDocuments({ status: 'success' }),
    this.countDocuments({ status: 'error' }),
    
    // Top 5 active users
    this.aggregate([
      { $group: { _id: '$user.id', count: { $sum: 1 }, name: { $first: '$user.name' } } },
      { $sort: { count: -1 } },
      { $limit: 5 }
    ]),
    
    // Top actions
    this.aggregate([
      { $group: { _id: '$action', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 10 }
    ])
  ]);
  
  return {
    totalActivities,
    todayActivities,
    successfulActivities,
    errorActivities,
    successRate: totalActivities > 0 ? ((successfulActivities / totalActivities) * 100).toFixed(1) : 0,
    topUsers,
    topActions
  };
};

// 🎯 Helper method to log activity
activitySchema.statics.logActivity = async function(options) {
  try {
    const activity = new this(options);
    await activity.save();
    return activity;
  } catch (error) {
    console.error('🚨 Activity logging error:', error);
    // Don't throw error to prevent disrupting main operations
    return null;
  }
};

module.exports = mongoose.model('Activity', activitySchema); 