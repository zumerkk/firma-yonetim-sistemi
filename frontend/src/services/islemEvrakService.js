// 🧩 İşlem ve Evrak Yönetimi - Frontend API servisi
import api from '../utils/axios';

const base = '/islem-evrak';
const d = (r) => r.data?.data;
const form = { headers: { 'Content-Type': 'multipart/form-data' } };

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
  ornekDosyaYukle: (id, evrakId, formData) =>
    api.post(`${base}/talepler/${id}/evrak/${evrakId}/ornek`, formData, form).then(d),
  yuklenenSil: (id, dosyaId) => api.delete(`${base}/talepler/${id}/yuklenen/${dosyaId}`).then(d),

  // Public (token — auth gerektirmez)
  publicBilgi: (token) => api.get(`${base}/public/${token}`).then(d),
  publicYukle: (token, formData) => api.post(`${base}/public/${token}`, formData, form).then((r) => r.data)
};

export default islemEvrakService;
