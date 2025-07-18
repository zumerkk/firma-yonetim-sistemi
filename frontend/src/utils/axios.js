import axios from 'axios';

// Backend API base URL - Environment variable ile production/development uyumlu
const BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5001/api';

// Axios instance oluştur
const api = axios.create({
  baseURL: BASE_URL,
  timeout: 10000, // 10 saniye timeout
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor - her istekte token ekle
api.interceptors.request.use(
  (config) => {
    // LocalStorage'dan token al
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor - hata yönetimi
api.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    // 401 Unauthorized - token geçersiz veya süresi dolmuş
    if (error.response?.status === 401) {
      const shouldClearToken = error.response?.data?.clearToken;
      
      if (shouldClearToken) {
        console.log('🧹 Geçersiz token temizleniyor...');
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        
        // Sadece login olmayan sayfalarda yönlendir
        if (!window.location.pathname.includes('/login')) {
          console.log('↩️ Login sayfasına yönlendiriliyor...');
          window.location.href = '/login';
        }
      }
    }
    
    // Hata mesajını konsola yazdır
    console.error('API Error:', error.response?.data || error.message);
    
    return Promise.reject(error);
  }
);

export default api; 