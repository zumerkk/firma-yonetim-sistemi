// 🔔 NOTIFICATION CONTROLLER - ENTERPRISE EDITION
// Professional notification management with advanced operations

const Notification = require('../models/Notification');
const { validationResult } = require('express-validator');

// 📊 Kullanıcının tüm bildirimlerini getir (sayfalı)
const getNotifications = async (req, res) => {
  try {
    const userId = req.user.id;
    const {
      page = 1,
      limit = 20,
      type,
      category,
      isRead,
      priority,
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = req.query;

    // 🔍 Query validation
    const validSortOrders = ['asc', 'desc'];
    const sortOrderValue = validSortOrders.includes(sortOrder) ? (sortOrder === 'desc' ? -1 : 1) : -1;

    const options = {
      page: parseInt(page),
      limit: Math.min(parseInt(limit), 50), // Max 50 per page
      type: type || null,
      category: category || null,
      isRead: isRead === 'true' ? true : (isRead === 'false' ? false : null),
      priority: priority || null,
      sortBy,
      sortOrder: sortOrderValue
    };

    const result = await Notification.getUserNotifications(userId, options);

    res.status(200).json({
      success: true,
      message: 'Bildirimler başarıyla getirildi',
      data: result.notifications,
      pagination: result.pagination,
      filters: {
        type,
        category,
        isRead,
        priority,
        sortBy,
        sortOrder
      }
    });

  } catch (error) {
    console.error('❌ Bildirimler getirme hatası:', error);
    res.status(500).json({
      success: false,
      message: 'Bildirimler getirilirken hata oluştu',
      error: error.message
    });
  }
};

// 🔔 Okunmamış bildirim sayısını getir
const getUnreadCount = async (req, res) => {
  try {
    const userId = req.user.id;
    const count = await Notification.getUnreadCount(userId);

    res.status(200).json({
      success: true,
      message: 'Okunmamış bildirim sayısı getirildi',
      data: { unreadCount: count }
    });

  } catch (error) {
    console.error('❌ Okunmamış sayı getirme hatası:', error);
    res.status(500).json({
      success: false,
      message: 'Okunmamış bildirim sayısı alınamadı',
      error: error.message
    });
  }
};

// 📈 Kullanıcı bildirim istatistikleri
const getNotificationStats = async (req, res) => {
  try {
    const userId = req.user.id;
    const stats = await Notification.getUserStats(userId);

    // 📊 Tip bazında dağılım
    const typeStats = {};
    const priorityStats = {};

    stats.byType?.forEach(item => {
      if (!typeStats[item.type]) {
        typeStats[item.type] = { total: 0, unread: 0 };
      }
      typeStats[item.type].total++;
      if (!item.isRead) typeStats[item.type].unread++;
    });

    stats.byPriority?.forEach(item => {
      if (!priorityStats[item.priority]) {
        priorityStats[item.priority] = { total: 0, unread: 0 };
      }
      priorityStats[item.priority].total++;
      if (!item.isRead) priorityStats[item.priority].unread++;
    });

    res.status(200).json({
      success: true,
      message: 'Bildirim istatistikleri getirildi',
      data: {
        summary: {
          total: stats.total || 0,
          unread: stats.unread || 0,
          readPercentage: stats.total > 0 ? Math.round(((stats.total - stats.unread) / stats.total) * 100) : 0
        },
        byType: typeStats,
        byPriority: priorityStats
      }
    });

  } catch (error) {
    console.error('❌ İstatistik getirme hatası:', error);
    res.status(500).json({
      success: false,
      message: 'İstatistikler alınamadı',
      error: error.message
    });
  }
};

// ✅ Bildirimi okundu olarak işaretle
const markAsRead = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const notification = await Notification.findOne({ _id: id, userId });
    
    if (!notification) {
      return res.status(404).json({
        success: false,
        message: 'Bildirim bulunamadı veya erişim yetkiniz yok'
      });
    }

    await notification.markAsRead();

    res.status(200).json({
      success: true,
      message: 'Bildirim okundu olarak işaretlendi',
      data: notification.getDisplayData()
    });

  } catch (error) {
    console.error('❌ Okundu işaretleme hatası:', error);
    res.status(500).json({
      success: false,
      message: 'Bildirim güncellenirken hata oluştu',
      error: error.message
    });
  }
};

// ✅ Tüm bildirimleri okundu olarak işaretle
const markAllAsRead = async (req, res) => {
  try {
    const userId = req.user.id;
    const { category, type } = req.query;

    // 🔍 Build query
    const query = { userId, isRead: false };
    if (category) query.category = category;
    if (type) query.type = type;

    const result = await Notification.updateMany(
      query,
      { 
        isRead: true, 
        readAt: new Date() 
      }
    );

    res.status(200).json({
      success: true,
      message: `${result.modifiedCount} bildirim okundu olarak işaretlendi`,
      data: { 
        updatedCount: result.modifiedCount,
        filters: { category, type }
      }
    });

  } catch (error) {
    console.error('❌ Toplu okundu işaretleme hatası:', error);
    res.status(500).json({
      success: false,
      message: 'Bildirimler güncellenirken hata oluştu',
      error: error.message
    });
  }
};

// 🗑️ Bildirimi sil
const deleteNotification = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const notification = await Notification.findOneAndDelete({ _id: id, userId });
    
    if (!notification) {
      return res.status(404).json({
        success: false,
        message: 'Bildirim bulunamadı veya erişim yetkiniz yok'
      });
    }

    res.status(200).json({
      success: true,
      message: 'Bildirim başarıyla silindi',
      data: { deletedId: id }
    });

  } catch (error) {
    console.error('❌ Bildirim silme hatası:', error);
    res.status(500).json({
      success: false,
      message: 'Bildirim silinirken hata oluştu',
      error: error.message
    });
  }
};

// 🗑️ Toplu bildirim silme
const bulkDeleteNotifications = async (req, res) => {
  try {
    const userId = req.user.id;
    const { ids, deleteRead, category, type, priority } = req.body;

    let query = { userId };

    // 🎯 Specific IDs
    if (ids && Array.isArray(ids) && ids.length > 0) {
      query._id = { $in: ids };
    }
    // 📚 Delete read notifications
    else if (deleteRead) {
      query.isRead = true;
    }
    // 🔍 Filter-based deletion
    else {
      if (category) query.category = category;
      if (type) query.type = type;
      if (priority) query.priority = priority;
    }

    const result = await Notification.deleteMany(query);

    res.status(200).json({
      success: true,
      message: `${result.deletedCount} bildirim başarıyla silindi`,
      data: { 
        deletedCount: result.deletedCount,
        filters: { deleteRead, category, type, priority }
      }
    });

  } catch (error) {
    console.error('❌ Toplu silme hatası:', error);
    res.status(500).json({
      success: false,
      message: 'Bildirimler silinirken hata oluştu',
      error: error.message
    });
  }
};

// 🔔 Yeni bildirim oluştur (Admin only)
const createNotification = async (req, res) => {
  try {
    // 🔐 Admin kontrolü
    if (req.user.rol !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Bu işlem için admin yetkisi gerekli'
      });
    }

    // ✅ Validation check
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation hatası',
        errors: errors.array()
      });
    }

    const {
      title,
      message,
      type = 'info',
      category = 'general',
      priority = 'medium',
      userId,
      userIds, // Toplu gönderim için
      icon,
      color,
      actionButton,
      expiresAt,
      channels,
      organizationData
    } = req.body;

    // 🎯 Single or multiple users
    const targetUserIds = userId ? [userId] : (userIds || []);
    
    if (targetUserIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'En az bir kullanıcı ID\'si gerekli'
      });
    }

    const notifications = [];
    const notificationData = {
      title,
      message,
      type,
      category,
      priority,
      icon,
      color,
      actionButton,
      expiresAt,
      channels,
      organizationData: {
        ...organizationData,
        createdBy: req.user.id
      }
    };

    // 🚀 Create notifications for each user
    for (const targetUserId of targetUserIds) {
      const notification = await Notification.createNotification({
        ...notificationData,
        userId: targetUserId
      });
      notifications.push(notification.getDisplayData());
    }

    res.status(201).json({
      success: true,
      message: `${notifications.length} bildirim başarıyla oluşturuldu`,
      data: notifications
    });

  } catch (error) {
    console.error('❌ Bildirim oluşturma hatası:', error);
    res.status(500).json({
      success: false,
      message: 'Bildirim oluşturulurken hata oluştu',
      error: error.message
    });
  }
};

// 🧹 Cleanup expired notifications (Cron job için)
const cleanupExpired = async (req, res) => {
  try {
    // 🔐 Admin kontrolü
    if (req.user?.rol !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Bu işlem için admin yetkisi gerekli'
      });
    }

    const result = await Notification.cleanupExpired();

    res.status(200).json({
      success: true,
      message: `${result.deletedCount} süresi geçmiş bildirim temizlendi`,
      data: { deletedCount: result.deletedCount }
    });

  } catch (error) {
    console.error('❌ Cleanup hatası:', error);
    res.status(500).json({
      success: false,
      message: 'Temizlik işlemi başarısız',
      error: error.message
    });
  }
};

// 🔔 SYSTEM NOTIFICATION HELPERS - Internal use
const createSystemNotification = async (userId, data) => {
  try {
    const notification = await Notification.createNotification({
      ...data,
      userId,
      category: 'system',
      type: data.type || 'info',
      organizationData: {
        createdBy: null, // System created
        department: 'System',
        tags: ['auto-generated']
      }
    });

    return notification;
  } catch (error) {
    console.error('❌ System notification error:', error);
    throw error;
  }
};

// 🏢 Firma related notification helper
const createFirmaNotification = async (userId, firmaData, action) => {
  const actionMessages = {
    created: { title: '🏢 Yeni Firma Eklendi', type: 'success', icon: 'BusinessIcon', color: '#10b981' },
    updated: { title: '✏️ Firma Güncellendi', type: 'info', icon: 'EditIcon', color: '#3b82f6' },
    deleted: { title: '🗑️ Firma Silindi', type: 'warning', icon: 'DeleteIcon', color: '#f59e0b' },
    etuys_warning: { title: '⚠️ ETUYS Uyarısı', type: 'warning', icon: 'WarningIcon', color: '#f59e0b' },
    etuys_expired: { title: '❌ ETUYS Süresi Geçti', type: 'error', icon: 'ErrorIcon', color: '#ef4444' }
  };

  const actionData = actionMessages[action] || actionMessages.updated;

  return await createSystemNotification(userId, {
    title: actionData.title,
    message: `${firmaData.firmaAdi} firma${action === 'created' ? 'sı sisteme eklendi' : action === 'updated' ? 'sı güncellendi' : action === 'deleted' ? 'sı sistemden silindi' : ' için işlem yapıldı'}`,
    type: actionData.type,
    category: 'firma',
    icon: actionData.icon,
    color: actionData.color,
    actionButton: action !== 'deleted' ? {
      text: 'Firma Detayı',
      url: `/firmalar/${firmaData._id || firmaData.id}`,
      action: 'navigate'
    } : null,
    relatedEntity: {
      entityType: 'firma',
      entityId: firmaData._id || firmaData.id
    }
  });
};

module.exports = {
  getNotifications,
  getUnreadCount,
  getNotificationStats,
  markAsRead,
  markAllAsRead,
  deleteNotification,
  bulkDeleteNotifications,
  createNotification,
  cleanupExpired,
  
  // Helper functions
  createSystemNotification,
  createFirmaNotification
}; 