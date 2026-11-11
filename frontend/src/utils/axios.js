import axios from 'axios';
import { EXPIRED_MESSAGE, IDLE_MESSAGE, isSessionIdle, notifySession } from './authSession';

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

// Müşteri bağlantıları kendi URL anahtarıyla çalışır. Bu istekler personel
// oturumunu taşımaz ve bir bağlantı hatası açık personel oturumunu etkilemez.
const isPublicRequest = (url = '') => {
  const path = new URL(url, window.location.origin).pathname.replace(/^\/api(?=\/)/, '');
  return /^\/(?:auth\/(?:login|logout|register)|tesvik-evrak|belge-takip-yukleme|islem-evrak\/public)(?:\/|$)/.test(path)
    || /^\/musteri-belge\/[^/]+(?:\/fatura-kalemi)?\/?$/.test(path);
};

let baglantiOturumu;
const basarisizIslemler = new Map();

export const clearConnectionIssues = () => {
  basarisizIslemler.clear();
  baglantiOturumu = undefined;
};

const baglantiSonucu = (config, message = '') => {
  const token = config?.sessionToken;
  if (!token || token !== localStorage.getItem('token')) return;
  if (baglantiOturumu !== token) {
    clearConnectionIssues();
    baglantiOturumu = token;
  }
  const yol = new URL(config.url, window.location.origin).pathname.replace(/^\/api(?=\/)/, '');
  const anahtar = `${config.method}:${yol}`;
  const silindi = basarisizIslemler.delete(anahtar);
  if (message) basarisizIslemler.set(anahtar, message);
  if (message || silindi) {
    notifySession('connection', token, [...basarisizIslemler.values()].at(-1) || '');
  }
};

api.interceptors.request.use(
  (config) => {
    const publicRequest = isPublicRequest(config.url);
    const token = publicRequest ? null : localStorage.getItem('token');
    if (token && isSessionIdle()) {
      notifySession('idle', token);
      throw new axios.CanceledError(IDLE_MESSAGE, config);
    }
    if (publicRequest) config.headers.delete('Authorization');
    else if (token && !config.headers.has('Authorization')) config.headers.set('Authorization', `Bearer ${token}`);
    // Yanıt geldiğinde başka bir oturum açılmışsa eski isteğin 401'i etkisiz kalır.
    config.sessionToken = token && config.headers.get('Authorization') === `Bearer ${token}` ? token : null;

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
  (response) => {
    baglantiSonucu(response.config);
    return response;
  },
  (error) => {
    // Konsol gürültüsünü azalt: object dump yerine kısa satır
    const msg = error.response?.data?.message || error.message;
    if (process.env.NODE_ENV === 'development') {
      console.error('❌ API Error', error.config?.url, error.response?.status || '-', msg);
    }

    const status = error.response?.status;
    const token = error.config?.sessionToken;
    if (status === 401 && token) {
      error.kullaniciMesaji = EXPIRED_MESSAGE;
      notifySession('expired', token);
    }

    // ⏱️ Zaman aşımı ayırt edilebilsin: ekranlar "Dosya yüklenemedi" yerine
    // gerçek sebebi gösterebilsin (müşteri: "yükleniyor mu internette mi sorun var anlaşılmıyor")
    if (error.code === 'ECONNABORTED') {
      error.kullaniciMesaji = 'Bağlantı yavaş olduğu için işlem zaman aşımına uğradı. Lütfen tekrar deneyin.';
    }

    if (!axios.isCancel(error) && (status >= 500 || error.code === 'ERR_NETWORK' || error.code === 'ECONNABORTED' || error.code === 'ETIMEDOUT')) {
      const message = error.kullaniciMesaji || (status >= 500
        ? 'Sunucu işlemi tamamlayamadı. Lütfen tekrar deneyin.'
        : 'Sunucuya ulaşılamadı. Bağlantınızı kontrol edip tekrar deneyin.');
      if (!status) error.kullaniciMesaji = message;
      baglantiSonucu(error.config, message);
    }

    // 📦 Çok büyük dosya: sunucunun kendi mesajı varsa o (multer sınırı), yoksa (Cloudflare'in 100 MB
    // kapısı HTML sayfa döner) anlaşılır bir cümle — "Request failed with status code 413" değil.
    if (error.response?.status === 413) {
      error.kullaniciMesaji = error.response?.data?.message
        || 'Dosya çok büyük — tek seferde en fazla 100 MB yüklenebilir. Dosyayı küçültüp ya da bölüp tekrar deneyin.';
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
