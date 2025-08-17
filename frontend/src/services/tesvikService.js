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
};

export default tesvikService;


