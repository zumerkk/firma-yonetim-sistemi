// 🔔 NOTIFICATION MODEL - ENTERPRISE EDITION
// Professional notification system with advanced features

const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
  // 🎯 Basic Info
  title: {
    type: String,
    required: [true, 'Bildirim başlığı gerekli'],
    trim: true,
    maxlength: [100, 'Başlık çok uzun']
  },
  message: {
    type: String,
    required: [true, 'Bildirim mesajı gerekli'],
    trim: true,
    maxlength: [500, 'Mesaj çok uzun']
  },
  
  // 🏷️ Notification Type & Category
  type: {
    type: String,
    enum: ['success', 'info', 'warning', 'error', 'system'],
    default: 'info',
    required: true
  },
  category: {
    type: String,
    enum: ['firma', 'user', 'system', 'security', 'etuys', 'general', 'tesvik'], // 🔧 tesvik eklendi
    default: 'general',
    required: true
  },
  
  // 🎨 Visual Properties  
  icon: {
    type: String,
    default: 'NotificationsIcon' // Material-UI icon name
  },
  color: {
    type: String,
    default: '#3b82f6' // Hex color code
  },
  
  // 🎖️ Priority System
  priority: {
    type: String,
    enum: ['low', 'medium', 'high', 'critical'],
    default: 'medium'
  },
  
  // 👤 User Targeting
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true // Performance için index
  },
  
  // 📊 Status & Tracking
  isRead: {
    type: Boolean,
    default: false,
    index: true
  },
  readAt: {
    type: Date,
    default: null
  },
  
  // 🔗 Related Entity (Optional)
  relatedEntity: {
    entityType: {
      type: String,
      enum: ['firma', 'user', 'activity', 'system', 'tesvik'], // 🔧 tesvik eklendi
      default: null
    },
    entityId: {
      type: mongoose.Schema.Types.ObjectId,
      default: null
    }
  },
  
  // 🎯 Action Button (Optional)
  actionButton: {
    text: {
      type: String,
      maxlength: [30, 'Aksiyon metni çok uzun']
    },
    url: {
      type: String,
      maxlength: [200, 'URL çok uzun']
    },
    action: {
      type: String, // 'navigate', 'api_call', 'download', etc.
      maxlength: [50, 'Aksiyon tipi çok uzun']
    }
  },
  
  // ⏰ Scheduling & Expiry
  scheduledFor: {
    type: Date,
    default: Date.now,
    index: true
  },
  expiresAt: {
    type: Date,
    default: () => new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 gün
    // index: true - KALDIRILDI: TTL index zaten var
  },
  
  // 🔄 Delivery Status
  deliveryStatus: {
    type: String,
    enum: ['pending', 'delivered', 'failed', 'expired'],
    default: 'delivered'
  },
  
  // 📱 Multi-channel Delivery
  channels: {
    web: { type: Boolean, default: true },
    email: { type: Boolean, default: false },
    push: { type: Boolean, default: false },
    sms: { type: Boolean, default: false }
  },
  
  // 🏢 Organization Context
  organizationData: {
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null
    },
    department: {
      type: String,
      maxlength: [50, 'Departman adı çok uzun']
    },
    tags: [{
      type: String,
      maxlength: [20, 'Tag çok uzun']
    }]
  }
}, {
  timestamps: true, // createdAt, updatedAt otomatik
  collection: 'notifications'
});

// 🚀 Advanced Indexes for Performance
notificationSchema.index({ userId: 1, createdAt: -1 }); // User notifications sorted by date
notificationSchema.index({ userId: 1, isRead: 1 }); // Unread notifications
notificationSchema.index({ priority: 1, createdAt: -1 }); // Priority notifications
notificationSchema.index({ category: 1, type: 1 }); // Category and type filtering
notificationSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 }); // Auto-delete expired

// 🎯 Instance Methods
notificationSchema.methods.markAsRead = function() {
  this.isRead = true;
  this.readAt = new Date();
  return this.save();
};

notificationSchema.methods.isExpired = function() {
  return this.expiresAt && this.expiresAt < new Date();
};

notificationSchema.methods.getDisplayData = function() {
  return {
    id: this._id,
    title: this.title,
    message: this.message,
    type: this.type,
    category: this.category,
    icon: this.icon,
    color: this.color,
    priority: this.priority,
    isRead: this.isRead,
    readAt: this.readAt,
    createdAt: this.createdAt,
    actionButton: this.actionButton,
    relatedEntity: this.relatedEntity
  };
};

// 🔧 Static Methods
notificationSchema.statics.createNotification = async function(data) {
  try {
    const notification = new this(data);
    await notification.save();
    
    // 🔔 Real-time emit (Socket.IO entegrasyonu için)
    // Bu kısım server.js'de socket implementasyonu ile birlikte çalışacak
    if (global.io) {
      global.io.to(`user_${data.userId}`).emit('newNotification', notification.getDisplayData());
    }
    
    return notification;
  } catch (error) {
    throw new Error(`Bildirim oluşturma hatası: ${error.message}`);
  }
};

notificationSchema.statics.getUnreadCount = async function(userId) {
  return await this.countDocuments({ userId, isRead: false });
};

notificationSchema.statics.getUserNotifications = async function(userId, options = {}) {
  const {
    page = 1,
    limit = 20,
    type = null,
    category = null,
    isRead = null,
    priority = null,
    sortBy = 'createdAt',
    sortOrder = -1
  } = options;

  const query = { userId };
  
  // 🔍 Dynamic filtering
  if (type) query.type = type;
  if (category) query.category = category;
  if (isRead !== null) query.isRead = isRead;
  if (priority) query.priority = priority;
  
  const notifications = await this.find(query)
    .sort({ [sortBy]: sortOrder })
    .skip((page - 1) * limit)
    .limit(limit)
    .populate('organizationData.createdBy', 'adSoyad email')
    .lean();

  const total = await this.countDocuments(query);
  
  return {
    notifications,
    pagination: {
      currentPage: page,
      totalPages: Math.ceil(total / limit),
      totalCount: total,
      hasNext: page < Math.ceil(total / limit),
      hasPrev: page > 1
    }
  };
};

// 🧹 Auto-cleanup expired notifications
notificationSchema.statics.cleanupExpired = async function() {
  const result = await this.deleteMany({
    expiresAt: { $lt: new Date() }
  });
  console.log(`🧹 ${result.deletedCount} expired notifications cleaned up`);
  return result;
};

// 📊 Analytics Methods
notificationSchema.statics.getUserStats = async function(userId) {
  const [stats] = await this.aggregate([
    { $match: { userId: mongoose.Types.ObjectId(userId) } },
    {
      $group: {
        _id: null,
        total: { $sum: 1 },
        unread: { $sum: { $cond: ['$isRead', 0, 1] } },
        byType: {
          $push: {
            type: '$type',
            isRead: '$isRead'
          }
        },
        byPriority: {
          $push: {
            priority: '$priority',
            isRead: '$isRead'
          }
        }
      }
    }
  ]);

  return stats || { total: 0, unread: 0, byType: [], byPriority: [] };
};

module.exports = mongoose.model('Notification', notificationSchema); 