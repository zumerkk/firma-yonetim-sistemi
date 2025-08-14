import api from '../utils/axios';

const usedMachineService = {
  async search(q = '', limit = 50) {
    const res = await api.get(`/lookup/used-machine`, { params: { search: q, limit } });
    return res.data?.data || [];
  }
};

export default usedMachineService;


