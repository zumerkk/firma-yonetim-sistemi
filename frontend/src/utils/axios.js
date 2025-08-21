import axios from 'axios';

// 🚨 Backend API base URL - /api PATH İLE birlikte (çift /api sorununu çöz)
const BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5001/api';

// Axios instance oluştur
const api = axios.create({
  baseURL: BASE_URL,
  timeout: 15000, // 15 saniye timeout (daha uzun)
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor - her istekte token kontrol et
api.interceptors.request.use(
  (config) => {
    // Eğer Authorization header zaten set edilmişse, tekrar ekleme
    if (!config.headers.Authorization) {
      const token = localStorage.getItem('token');
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    }
    
    // 🚨 ENHANCED Debug log for US97 issue troubleshooting
    console.log('🔍 API Request:', {
      url: config.url,
      baseURL: config.baseURL,
      fullURL: `${config.baseURL}${config.url}`, // 🎯 FULL URL ÇIKARIMI
      method: config.method,
      hasAuth: !!config.headers.Authorization
    });
    
    return config;
  },
  (error) => {
    console.error('❌ Request interceptor error:', error);
    return Promise.reject(error);
  }
);

// Response interceptor - gelişmiş hata yönetimi
api.interceptors.response.use(
  (response) => {
    console.log('✅ API Response Success:', {
      url: response.config.url,
      status: response.status,
      data: response.data?.success
    });
    return response;
  },
  (error) => {
    // Konsol gürültüsünü azalt: object dump yerine kısa satır
    const msg = error.response?.data?.message || error.message;
    if (process.env.NODE_ENV === 'development') {
      console.error('❌ API Error', error.config?.url, error.response?.status || '-', msg);
    }
    
    // 401 Unauthorized - token geçersiz veya süresi dolmuş
    if (error.response?.status === 401) {
      const shouldClearToken = error.response?.data?.clearToken;
      
      if (shouldClearToken) {
        console.log('🧹 Geçersiz token temizleniyor...');
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        
        // Header'dan da temizle
        delete api.defaults.headers.common['Authorization'];
        
        // Sadece login olmayan sayfalarda yönlendir
        if (!window.location.pathname.includes('/login')) {
          console.log('↩️ Login sayfasına yönlendiriliyor...');
          setTimeout(() => {
            window.location.href = '/login';
          }, 1500);
        }
      }
    }
    
    return Promise.reject(error);
  }
);

export default api; 