import api from '../utils/axios';

const tesvikService = {
  async search(q = '', params = {}) {
    const res = await api.get('/tesvik/search', { params: { q, ...params } });
    return res.data?.data || [];
  },
  async list(params = {}) {
    const res = await api.get('/tesvik', { params });
    return res.data?.data || [];
  },
  async get(id) {
    const res = await api.get(`/tesvik/${id}`);
    return res.data?.data;
  },
  async setMakineTalep(id, payload) {
    const res = await api.post(`/tesvik/${id}/makine-talep`, payload);
    return res.data;
  },
  async setMakineKarar(id, payload) {
    const res = await api.post(`/tesvik/${id}/makine-karar`, payload);
    return res.data;
  },
  async saveMakineListeleri(id, payload) {
    // payload: { yerli:[], ithal:[] }
    const res = await api.post(`/tesvik/${id}/makine-listeleri`, payload);
    return res.data;
  },
  async exportMakineExcel(id) {
    // Tek belge makine listeleri için excel (mevcut export endpointini kullanıyoruz)
    const res = await api.get(`/tesvik/${id}/excel-export`, { responseType: 'blob', params: { includeColors: true } });
    return res;
  }
  ,
  // 🆕 Makine Revizyon Servisleri
  async startMakineRevizyon(id, payload = {}) {
    const res = await api.post(`/tesvik/${id}/makine-revizyon/start`, payload);
    return res.data;
  },
  async finalizeMakineRevizyon(id, payload = {}) {
    const res = await api.post(`/tesvik/${id}/makine-revizyon/finalize`, payload);
    return res.data;
  },
  async listMakineRevizyonlari(id) {
    const res = await api.get(`/tesvik/${id}/makine-revizyon/list`);
    return res.data?.data || [];
  },
  async revertMakineRevizyon(id, revizeId, aciklama) {
    const res = await api.post(`/tesvik/${id}/makine-revizyon/revert`, { revizeId, aciklama });
    return res.data;
  },
  async exportMakineRevizyonExcel(id) {
    return api.get(`/tesvik/${id}/makine-revizyon/excel-export`, { responseType: 'blob' });
  },
  async exportMakineRevizyonHistoryExcel(id) {
    return api.get(`/tesvik/${id}/makine-revizyon/history-excel`, { responseType: 'blob' });
  },
  async updateMakineRevizyonMeta(id, revizeId, meta) {
    const res = await api.patch(`/tesvik/${id}/makine-revizyon/meta`, { revizeId, meta });
    return res.data;
  },

  // 📊 Excel Import (Eski Teşvik Sistemi)
  async importUpload(formData) {
    const res = await api.post('/eski-tesvik-import/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
    return res.data;
  },
  async importConfirm(importSessionId, selectedRows) {
    const res = await api.post('/eski-tesvik-import/confirm', { importSessionId, selectedRows });
    return res.data;
  }
};

export default tesvikService;


