// 🔎 GTIP Service - Backend API ile entegre arama ve getirme
import axios from '../utils/axios';

const gtipService = {
  async search(query, limit = 50) {
    const params = { q: query, limit };
    const { data } = await axios.get('/gtip/search', { params });
    return data?.data || [];
  },

  async getByKod(kod) {
    const { data } = await axios.get(`/gtip/code/${kod}`);
    return data?.data || null;
  },

  async stats() {
    const { data } = await axios.get('/gtip/stats');
    return data?.data || null;
  }
};

export default gtipService;


