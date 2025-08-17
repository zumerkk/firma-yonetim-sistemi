import api from '../utils/axios';

const unitService = {
  async search(q = '', limit = 50) {
    const res = await api.get(`/lookup/unit`, { params: { search: q, limit } });
    return res.data?.data || [];
  },
  async searchMachineTypes(q = '', limit = 100) {
    const res = await api.get(`/lookup/machine-type`, { params: { search: q, limit } });
    return res.data?.data || [];
  }
};

export default unitService;


