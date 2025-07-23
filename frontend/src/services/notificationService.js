// 🔔 NOTIFICATION SERVICE - ENTERPRISE EDITION
// Professional notification management with real-time features

import axios from '../utils/axios';

class NotificationService {
  constructor() {
    this.socket = null;
    this.listeners = new Map();
  }

  // 🔄 Real-time connection initialization
  initializeSocket(userId) {
    // Socket.IO connection burada implement edilecek
    // Şimdilik placeholder
    console.log('🔌 Socket connection initialized for user:', userId);
  }

  // 📊 Bildirimler listesi (paginated & filtered)
  async getNotifications(params = {}) {
    try {
      const {
        page = 1,
        limit = 20,
        type = null,
        category = null,
        isRead = null,
        priority = null,
        sortBy = 'createdAt',
        sortOrder = 'desc'
      } = params;

      const queryParams = new URLSearchParams();
      queryParams.append('page', page);
      queryParams.append('limit', limit);
      queryParams.append('sortBy', sortBy);
      queryParams.append('sortOrder', sortOrder);

      if (type) queryParams.append('type', type);
      if (category) queryParams.append('category', category);
      if (isRead !== null) queryParams.append('isRead', isRead);
      if (priority) queryParams.append('priority', priority);

      const response = await axios.get(`/notifications?${queryParams.toString()}`);
      
      return {
        success: true,
        notifications: response.data.data || [],
        pagination: response.data.pagination || {},
        filters: response.data.filters || {}
      };

    } catch (error) {
      console.error('❌ Bildirimleri getirme hatası:', error);
      return {
        success: false,
        message: error.response?.data?.message || 'Bildirimler alınamadı',
        notifications: [],
        pagination: {}
      };
    }
  }

  // 🔔 Okunmamış bildirim sayısı
  async getUnreadCount() {
    try {
      const response = await axios.get('/notifications/unread-count');
      
      return {
        success: true,
        count: response.data.data?.unreadCount || 0
      };

    } catch (error) {
      console.error('❌ Okunmamış sayı hatası:', error);
      return {
        success: false,
        message: error.response?.data?.message || 'Sayı alınamadı',
        count: 0
      };
    }
  }

  // 📈 Bildirim istatistikleri
  async getStats() {
    try {
      const response = await axios.get('/notifications/stats');
      
      return {
        success: true,
        stats: response.data.data || {}
      };

    } catch (error) {
      console.error('❌ İstatistik hatası:', error);
      return {
        success: false,
        message: error.response?.data?.message || 'İstatistikler alınamadı',
        stats: {}
      };
    }
  }

  // ✅ Bildirimi okundu olarak işaretle
  async markAsRead(notificationId) {
    try {
      const response = await axios.patch(`/notifications/${notificationId}/read`);
      
      return {
        success: true,
        notification: response.data.data || {},
        message: 'Bildirim okundu olarak işaretlendi'
      };

    } catch (error) {
      console.error('❌ Okundu işaretleme hatası:', error);
      return {
        success: false,
        message: error.response?.data?.message || 'İşaretleme başarısız'
      };
    }
  }

  // ✅ Tüm bildirimleri okundu olarak işaretle
  async markAllAsRead(filters = {}) {
    try {
      const { category, type } = filters;
      const queryParams = new URLSearchParams();
      
      if (category) queryParams.append('category', category);
      if (type) queryParams.append('type', type);

      const response = await axios.patch(`/notifications/mark-all-read?${queryParams.toString()}`);
      
      return {
        success: true,
        updatedCount: response.data.data?.updatedCount || 0,
        message: response.data.message || 'Bildirimler okundu olarak işaretlendi'
      };

    } catch (error) {
      console.error('❌ Toplu okundu işaretleme hatası:', error);
      return {
        success: false,
        message: error.response?.data?.message || 'Toplu işaretleme başarısız'
      };
    }
  }

  // 🗑️ Bildirimi sil
  async deleteNotification(notificationId) {
    try {
      await axios.delete(`/notifications/${notificationId}`);
      
      return {
        success: true,
        message: 'Bildirim başarıyla silindi'
      };

    } catch (error) {
      console.error('❌ Bildirim silme hatası:', error);
      return {
        success: false,
        message: error.response?.data?.message || 'Silme işlemi başarısız'
      };
    }
  }

  // 🗑️ Toplu bildirim silme
  async bulkDelete(options = {}) {
    try {
      const response = await axios.delete('/notifications/bulk', {
        data: options
      });
      
      return {
        success: true,
        deletedCount: response.data.data?.deletedCount || 0,
        message: response.data.message || 'Bildirimler başarıyla silindi'
      };

    } catch (error) {
      console.error('❌ Toplu silme hatası:', error);
      return {
        success: false,
        message: error.response?.data?.message || 'Toplu silme başarısız'
      };
    }
  }

  // 🔔 Yeni bildirim oluştur (Admin only)
  async createNotification(notificationData) {
    try {
      const response = await axios.post('/notifications', notificationData);
      
      return {
        success: true,
        notifications: response.data.data || [],
        message: response.data.message || 'Bildirim oluşturuldu'
      };

    } catch (error) {
      console.error('❌ Bildirim oluşturma hatası:', error);
      return {
        success: false,
        message: error.response?.data?.message || 'Oluşturma başarısız',
        errors: error.response?.data?.errors || []
      };
    }
  }

  // 🔄 Son bildirimleri getir (dashboard için)
  async getRecentNotifications(limit = 5) {
    try {
      const response = await axios.get(`/notifications/recent?limit=${limit}`);
      
      return {
        success: true,
        notifications: response.data.data || []
      };

    } catch (error) {
      console.error('❌ Son bildirimler hatası:', error);
      return {
        success: false,
        message: error.response?.data?.message || 'Son bildirimler alınamadı',
        notifications: []
      };
    }
  }

  // 📊 Kategorileri getir
  async getCategories() {
    try {
      const response = await axios.get('/notifications/categories');
      
      return {
        success: true,
        categories: response.data.data || []
      };

    } catch (error) {
      console.error('❌ Kategori hatası:', error);
      return {
        success: false,
        message: error.response?.data?.message || 'Kategoriler alınamadı',
        categories: []
      };
    }
  }

  // 🎨 Bildirimi tiplerini getir
  async getTypes() {
    try {
      const response = await axios.get('/notifications/types');
      
      return {
        success: true,
        types: response.data.data || []
      };

    } catch (error) {
      console.error('❌ Tip hatası:', error);
      return {
        success: false,
        message: error.response?.data?.message || 'Tipler alınamadı',
        types: []
      };
    }
  }

  // 🎖️ Öncelik seviyelerini getir
  async getPriorities() {
    try {
      const response = await axios.get('/notifications/priorities');
      
      return {
        success: true,
        priorities: response.data.data || []
      };

    } catch (error) {
      console.error('❌ Öncelik hatası:', error);
      return {
        success: false,
        message: error.response?.data?.message || 'Öncelikler alınamadı',
        priorities: []
      };
    }
  }

  // 🔄 Event listener management
  addEventListener(event, callback) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event).add(callback);
  }

  removeEventListener(event, callback) {
    if (this.listeners.has(event)) {
      this.listeners.get(event).delete(callback);
    }
  }

  // 📢 Event emission (for real-time updates)
  emit(event, data) {
    if (this.listeners.has(event)) {
      this.listeners.get(event).forEach(callback => {
        try {
          callback(data);
        } catch (error) {
          console.error('❌ Event callback error:', error);
        }
      });
    }
  }

  // 🧹 Cleanup
  cleanup() {
    this.listeners.clear();
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
  }

  // 🎯 HELPER METHODS

  // Bildirim tipine göre renk döndür
  getTypeColor(type) {
    const colors = {
      success: '#10b981',
      info: '#3b82f6',
      warning: '#f59e0b',
      error: '#ef4444',
      system: '#6b7280'
    };
    return colors[type] || colors.info;
  }

  // Bildirim tipine göre icon döndür
  getTypeIcon(type) {
    const icons = {
      success: 'CheckCircleIcon',
      info: 'InfoIcon',
      warning: 'WarningIcon',
      error: 'ErrorIcon',
      system: 'SettingsIcon'
    };
    return icons[type] || icons.info;
  }

  // Öncelik seviyesine göre renk döndür
  getPriorityColor(priority) {
    const colors = {
      low: '#6b7280',
      medium: '#f59e0b',
      high: '#f97316',
      critical: '#ef4444'
    };
    return colors[priority] || colors.medium;
  }

  // Relatif zaman formatı
  formatRelativeTime(date) {
    const now = new Date();
    const diffInSeconds = Math.floor((now - new Date(date)) / 1000);

    if (diffInSeconds < 60) return 'Az önce';
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)} dakika önce`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)} saat önce`;
    if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)} gün önce`;
    
    return new Date(date).toLocaleDateString('tr-TR', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });
  }
}

// Singleton instance
const notificationService = new NotificationService();

export default notificationService; 