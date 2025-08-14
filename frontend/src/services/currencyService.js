import api from '../utils/axios';

const currencyService = {
  async search(q = '', limit = 100) {
    const res = await api.get(`/lookup/currency`, { params: { search: q, limit } });
    return res.data?.data || [];
  },
  async getRate(code = 'USD', target = 'TRY') {
    const res = await api.get(`/lookup/rate`, { params: { code, target } });
    return res.data?.rate;
  }
};

export default currencyService;


