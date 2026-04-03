import api from '../utils/axios';

const yeniTesvikService = {
  async search(q = '', params = {}) {
    const res = await api.get('/yeni-tesvik/search', { params: { q, ...params } });
    return res.data?.data || [];
  },
  async list(params = {}) {
    const res = await api.get('/yeni-tesvik', { params });
    return res.data?.data || [];
  },
  async get(id) {
    const res = await api.get(`/yeni-tesvik/${id}`);
    return res.data?.data;
  },
  async setMakineTalep(id, payload) {
    const res = await api.post(`/yeni-tesvik/${id}/makine-talep`, payload);
    return res.data;
  },
  async setMakineKarar(id, payload) {
    const res = await api.post(`/yeni-tesvik/${id}/makine-karar`, payload);
    return res.data;
  },
  async saveMakineListeleri(id, payload) {
    // payload: { yerli:[], ithal:[] }
    const res = await api.post(`/yeni-tesvik/${id}/makine-listeleri`, payload);
    return res.data;
  },
  async exportMakineExcel(id) {
    // Tek belge makine listeleri için excel (mevcut export endpointini kullanıyoruz)
    const res = await api.get(`/yeni-tesvik/${id}/excel-export`, { responseType: 'blob', params: { includeColors: true } });
    return res;
  }
  ,
  // 🆕 Makine Revizyon Servisleri
  async startMakineRevizyon(id, payload = {}) {
    const res = await api.post(`/yeni-tesvik/${id}/makine-revizyon/start`, payload);
    return res.data;
  },
  async finalizeMakineRevizyon(id, payload = {}) {
    const res = await api.post(`/yeni-tesvik/${id}/makine-revizyon/finalize`, payload);
    return res.data;
  },
  async listMakineRevizyonlari(id) {
    const res = await api.get(`/yeni-tesvik/${id}/makine-revizyon/list`);
    return res.data?.data || [];
  },
  async revertMakineRevizyon(id, revizeId, aciklama) {
    const res = await api.post(`/yeni-tesvik/${id}/makine-revizyon/revert`, { revizeId, aciklama });
    return res.data;
  },
  async exportMakineRevizyonExcel(id) {
    return api.get(`/yeni-tesvik/${id}/makine-revizyon/excel-export`, { responseType: 'blob' });
  },
  async exportMakineRevizyonHistoryExcel(id) {
    return api.get(`/yeni-tesvik/${id}/makine-revizyon/history-excel`, { responseType: 'blob' });
  },
  async updateMakineRevizyonMeta(id, revizeId, meta) {
    const res = await api.patch(`/yeni-tesvik/${id}/makine-revizyon/meta`, { revizeId, meta });
    return res.data;
  },

  // 📊 Excel/CSV Teşvik Import Servisleri
  async uploadPreview(file) {
    const formData = new FormData();
    formData.append('file', file);
    const res = await api.post('/tesvik-import/upload-preview', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
      timeout: 60000 // 60s timeout (büyük dosyalar için)
    });
    return res.data;
  },
  async confirmImport(importSessionId, selectedRows = null) {
    const res = await api.post('/tesvik-import/confirm', { importSessionId, selectedRows });
    return res.data;
  }
};

export default yeniTesvikService;


