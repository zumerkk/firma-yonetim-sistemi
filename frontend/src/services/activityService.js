// 📋 Activity Service - Son İşlemler API Servisi
// Tüm aktivite log API çağrılarını yönetir

import axios from '../utils/axios';

const activityService = {
  // 📋 Tüm Aktiviteleri Listele (Pagination + Filtering)
  getActivities: async (params = {}) => {
    try {
      const queryString = new URLSearchParams({
        sayfa: params.sayfa || 1,
        limit: params.limit || 50,
        siralamaSekli: params.siralamaSekli || 'createdAt',
        siralamaYonu: params.siralamaYonu || 'desc',
        ...(params.kategori && { kategori: params.kategori }),
        ...(params.aksiyon && { aksiyon: params.aksiyon }),
        ...(params.durum && { durum: params.durum }),
        ...(params.kullanici && { kullanici: params.kullanici }),
        ...(params.firmaId && { firmaId: params.firmaId }),
        ...(params.baslangicTarihi && { baslangicTarihi: params.baslangicTarihi }),
        ...(params.bitisTarihi && { bitisTarihi: params.bitisTarihi })
      }).toString();

      const response = await axios.get(`/activities?${queryString}`);
      return {
        success: true,
        data: response.data.data,
        message: response.data.message
      };
    } catch (error) {
      console.error('🚨 Get Activities Error:', error);
      return {
        success: false,
        message: error.response?.data?.message || 'Aktivite listesi alınırken hata oluştu',
        error: error.response?.data
      };
    }
  },

  // 📊 Dashboard için Son İşlemler
  getRecentActivities: async (limit = 10) => {
    try {
      const response = await axios.get(`/activities/recent?limit=${limit}`);
      return {
        success: true,
        data: response.data.data,
        message: response.data.message
      };
    } catch (error) {
      console.error('🚨 Get Recent Activities Error:', error);
      return {
        success: false,
        message: error.response?.data?.message || 'Son işlemler alınırken hata oluştu',
        error: error.response?.data
      };
    }
  },

  // 📈 Aktivite İstatistikleri
  getActivityStats: async () => {
    try {
      const response = await axios.get('/activities/stats');
      return {
        success: true,
        data: response.data.data,
        message: response.data.message
      };
    } catch (error) {
      console.error('🚨 Get Activity Stats Error:', error);
      return {
        success: false,
        message: error.response?.data?.message || 'Aktivite istatistikleri alınırken hata oluştu',
        error: error.response?.data
      };
    }
  },

  // 👁️ Tekil Aktivite Detayı
  getActivity: async (id) => {
    try {
      const response = await axios.get(`/activities/${id}`);
      return {
        success: true,
        data: response.data.data,
        message: response.data.message
      };
    } catch (error) {
      console.error('🚨 Get Activity Error:', error);
      return {
        success: false,
        message: error.response?.data?.message || 'Aktivite detayı alınırken hata oluştu',
        error: error.response?.data
      };
    }
  },

  // 🔍 Kullanıcıya Ait Aktiviteler
  getUserActivities: async (userId, limit = 20) => {
    try {
      const response = await axios.get(`/activities/user/${userId}?limit=${limit}`);
      return {
        success: true,
        data: response.data.data,
        message: response.data.message
      };
    } catch (error) {
      console.error('🚨 Get User Activities Error:', error);
      return {
        success: false,
        message: error.response?.data?.message || 'Kullanıcı aktiviteleri alınırken hata oluştu',
        error: error.response?.data
      };
    }
  },

  // 🏢 Firmaya Ait Aktiviteler
  getFirmaActivities: async (firmaId, limit = 20) => {
    try {
      const response = await axios.get(`/activities/firma/${firmaId}?limit=${limit}`);
      return {
        success: true,
        data: response.data.data,
        message: response.data.message
      };
    } catch (error) {
      console.error('🚨 Get Firma Activities Error:', error);
      return {
        success: false,
        message: error.response?.data?.message || 'Firma aktiviteleri alınırken hata oluştu',
        error: error.response?.data
      };
    }
  },

  // 🎛️ Filtreleme Seçenekleri
  getFilterOptions: async () => {
    try {
      const response = await axios.get('/activities/filter-options');
      return {
        success: true,
        data: response.data.data,
        message: response.data.message
      };
    } catch (error) {
      console.error('🚨 Get Filter Options Error:', error);
      return {
        success: false,
        message: error.response?.data?.message || 'Filtre seçenekleri alınırken hata oluştu',
        error: error.response?.data
      };
    }
  },

  // 🧹 Eski Kayıtları Temizle (Sadece Admin)
  cleanupOldActivities: async (days = 30) => {
    try {
      const response = await axios.delete('/activities/cleanup', {
        data: { days }
      });
      return {
        success: true,
        data: response.data.data,
        message: response.data.message
      };
    } catch (error) {
      console.error('🚨 Cleanup Activities Error:', error);
      return {
        success: false,
        message: error.response?.data?.message || 'Temizlik işlemi sırasında hata oluştu',
        error: error.response?.data
      };
    }
  },

  // 🔄 Activity Helpers
  
  // Action türlerini Türkçeleştir
  getActionDisplayName: (action) => {
    const actionNames = {
      'create': 'Oluştur',
      'update': 'Güncelle',
      'delete': 'Sil',
      'view': 'Görüntüle',
      'export': 'Dışa Aktar',
      'import': 'İçe Aktar',
      'restore': 'Geri Yükle',
      'bulk_delete': 'Toplu Sil',
      'bulk_update': 'Toplu Güncelle',
      'search': 'Ara'
    };
    return actionNames[action] || action;
  },

  // Kategori türlerini Türkçeleştir
  getCategoryDisplayName: (category) => {
    const categoryNames = {
      'firma': 'Firma',
      'user': 'Kullanıcı',
      'system': 'Sistem',
      'auth': 'Kimlik Doğrulama'
    };
    return categoryNames[category] || category;
  },

  // Status türlerini Türkçeleştir
  getStatusDisplayName: (status) => {
    const statusNames = {
      'success': 'Başarılı',
      'error': 'Hata',
      'warning': 'Uyarı',
      'info': 'Bilgi'
    };
    return statusNames[status] || status;
  },

  // Status renk kodları
  getStatusColor: (status) => {
    const statusColors = {
      'success': 'success',
      'error': 'error',
      'warning': 'warning',
      'info': 'info'
    };
    return statusColors[status] || 'default';
  },

  // Action icon'ları
  getActionIcon: (action) => {
    const actionIcons = {
      'create': 'AddCircleOutline',
      'update': 'EditOutlined',
      'delete': 'DeleteOutline',
      'view': 'VisibilityOutlined',
      'export': 'GetAppOutlined',
      'import': 'CloudUploadOutlined',
      'restore': 'RestoreOutlined',
      'bulk_delete': 'DeleteSweepOutlined',
      'bulk_update': 'EditNotifications',
      'search': 'SearchOutlined'
    };
    return actionIcons[action] || 'InfoOutlined';
  },

  // Tarih formatları
  formatDate: (dateString, format = 'full') => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInMinutes = Math.floor((now - date) / (1000 * 60));
    
    if (format === 'relative') {
      if (diffInMinutes < 1) return 'Az önce';
      if (diffInMinutes < 60) return `${diffInMinutes} dakika önce`;
      if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)} saat önce`;
      if (diffInMinutes < 43200) return `${Math.floor(diffInMinutes / 1440)} gün önce`;
    }
    
    if (format === 'short') {
      return date.toLocaleDateString('tr-TR', {
        day: '2-digit',
        month: '2-digit',
        year: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
      });
    }
    
    return date.toLocaleDateString('tr-TR', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  }
};

export default activityService; 