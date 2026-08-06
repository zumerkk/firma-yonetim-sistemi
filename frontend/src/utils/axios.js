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

    // 🔍 Debug log – only in development
    if (process.env.NODE_ENV === 'development') {
      console.log('🔍 API Request:', config.method?.toUpperCase(), config.url);
    }

    return config;
  },
  (error) => {
    console.error('❌ Request interceptor error:', error);
    return Promise.reject(error);
  }
);

// Response interceptor - gelişmiş hata yönetimi
api.interceptors.response.use(
  (response) => response,
  (error) => {
    // Konsol gürültüsünü azalt: object dump yerine kısa satır
    const msg = error.response?.data?.message || error.message;
    if (process.env.NODE_ENV === 'development') {
      console.error('❌ API Error', error.config?.url, error.response?.status || '-', msg);
    }

    // 401 Unauthorized - sessiz hata yönetimi (kullanıcıyı atma)
    if (error.response?.status === 401) {
      // Token sorunu varsa sadece logla, kullanıcıyı login'e yönlendirme
      console.log('⚠️ 401 hatası alındı, oturum devam ediyor...');
    }

    // ⏱️ Zaman aşımı ayırt edilebilsin: ekranlar "Dosya yüklenemedi" yerine
    // gerçek sebebi gösterebilsin (müşteri: "yükleniyor mu internette mi sorun var anlaşılmıyor")
    if (error.code === 'ECONNABORTED') {
      error.kullaniciMesaji = 'Bağlantı yavaş olduğu için işlem zaman aşımına uğradı. Lütfen tekrar deneyin.';
    }

    return Promise.reject(error);
  }
);

// 📤 Dosya yükleme yardımcısı
// Neden ayrı: global timeout 15 sn (yavaş GET'lerde kullanıcıyı bekletmemek için bilinçli),
// ama backend 100 MB'a kadar dosya kabul ediyor — büyük yükleme 15 sn'ye sığmaz ve sessizce
// ECONNABORTED ile kesilirdi. Bu helper yalnızca upload'lara uzun timeout + gerçek yüzde verir.
export const UPLOAD_TIMEOUT = 10 * 60 * 1000; // 10 dk

export const uploadPost = (url, formData, { onProgress, timeout = UPLOAD_TIMEOUT, signal } = {}) =>
  api.post(url, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
    timeout,
    signal,
    onUploadProgress: (e) => {
      if (!onProgress) return;
      // e.total bazı proxy/sıkıştırma senaryolarında gelmez → yüzde yerine belirsiz mod
      const pct = e.total ? Math.round((e.loaded * 100) / e.total) : null;
      onProgress({ pct, loaded: e.loaded, total: e.total });
    }
  });

export default api;