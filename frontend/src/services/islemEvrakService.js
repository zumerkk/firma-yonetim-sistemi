// 🧩 İşlem ve Evrak Yönetimi - Frontend API servisi
import api, { uploadPost } from '../utils/axios';

const base = '/islem-evrak';
const d = (r) => r.data?.data;

const islemEvrakService = {
  // İşlem türleri (şablonlar)
  turler: (params = {}) => api.get(`${base}/turler`, { params }).then(d),
  turDetay: (id) => api.get(`${base}/turler/${id}`).then(d),
  turOlustur: (body) => api.post(`${base}/turler`, body).then(d),
  turGuncelle: (id, body) => api.put(`${base}/turler/${id}`, body).then(d),
  turSil: (id) => api.delete(`${base}/turler/${id}`).then((r) => r.data),

  // Talepler
  talepler: (params = {}) => api.get(`${base}/talepler`, { params }).then((r) => r.data),
  talepDetay: (id) => api.get(`${base}/talepler/${id}`).then(d),
  talepOlustur: (body) => api.post(`${base}/talepler`, body).then(d),
  talepGuncelle: (id, body) => api.patch(`${base}/talepler/${id}`, body).then(d),
  talepSil: (id) => api.delete(`${base}/talepler/${id}`).then((r) => r.data),
  varyantUygula: (id, varyantKod) => api.post(`${base}/talepler/${id}/varyant`, { varyantKod }).then(d),
  mailOnizle: (id) => api.get(`${base}/talepler/${id}/mail-onizle`).then(d),
  mailGonder: (id, body) => api.post(`${base}/talepler/${id}/mail-gonder`, body).then(d),
  linkUret: (id, gun) => api.post(`${base}/talepler/${id}/link`, { gun }).then(d),
  // Yüklemeler uploadPost üzerinden: gerçek yüzde + uzun timeout (global 15 sn büyük dosyaya yetmiyor)
  ornekDosyaYukle: (id, evrakId, formData, onProgress) =>
    uploadPost(`${base}/talepler/${id}/evrak/${evrakId}/ornek`, formData, { onProgress }).then(d),
  yuklenenSil: (id, dosyaId) => api.delete(`${base}/talepler/${id}/yuklenen/${dosyaId}`).then(d),
  // Dosya indirme: blob olarak çekilir. Göreli fileUrl'i doğrudan href vermek işe yaramıyor —
  // tarayıcı onu frontend origin'ine göre çözüp SPA'nın index.html'ini indiriyordu.
  dosyaIndir: (id, dosyaId) =>
    api.get(`${base}/talepler/${id}/dosya/${dosyaId}/indir`, { responseType: 'blob' }),

  // Public (token — auth gerektirmez)
  publicBilgi: (token) => api.get(`${base}/public/${token}`).then(d),
  publicYukle: (token, formData, onProgress) =>
    uploadPost(`${base}/public/${token}`, formData, { onProgress }).then((r) => r.data)
};

export default islemEvrakService;
