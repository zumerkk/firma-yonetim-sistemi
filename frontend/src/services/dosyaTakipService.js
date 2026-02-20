// 📋 Dosya İş Akış Takip Sistemi - API Service
// Axios tabanlı API çağrıları

import axios from '../utils/axios';

const API_URL = '/api/dosya-takip';

const dosyaTakipService = {
    // 📊 Dashboard İstatistikleri
    getDashboardStats: async () => {
        const { data } = await axios.get(`${API_URL}/dashboard`);
        return data;
    },

    // 📦 Enum Değerleri (Talep Türleri, Durumlar)
    getEnumDegerleri: async () => {
        const { data } = await axios.get(`${API_URL}/enums`);
        return data;
    },

    // 📋 Tüm Talepler (sayfalı + filtreleme)
    getTalepler: async (params = {}) => {
        const { data } = await axios.get(API_URL, { params });
        return data;
    },

    // 🔍 Tekil Talep
    getTalepById: async (id) => {
        const { data } = await axios.get(`${API_URL}/${id}`);
        return data;
    },

    // ➕ Yeni Talep
    yeniTalep: async (talepData) => {
        const { data } = await axios.post(API_URL, talepData);
        return data;
    },

    // ✏️ Güncelle
    talepGuncelle: async (id, talepData) => {
        const { data } = await axios.put(`${API_URL}/${id}`, talepData);
        return data;
    },

    // 🔄 Durum Değiştir
    durumDegistir: async (id, yeniDurum, aciklama = '') => {
        const { data } = await axios.patch(`${API_URL}/${id}/durum`, { yeniDurum, aciklama });
        return data;
    },

    // 📝 Not Ekle
    notEkle: async (id, metin, alan = 'genelNotlar') => {
        const { data } = await axios.post(`${API_URL}/${id}/not`, { metin, alan });
        return data;
    },

    // 📁 Dosya Ekle
    dosyaEkle: async (id, file, alan = 'dosyalar') => {
        const formData = new FormData();
        formData.append('dosya', file);
        formData.append('alan', alan);
        const { data } = await axios.post(`${API_URL}/${id}/dosya`, formData, {
            headers: { 'Content-Type': 'multipart/form-data' }
        });
        return data;
    },

    // 🗑️ Sil
    talepSil: async (id) => {
        const { data } = await axios.delete(`${API_URL}/${id}`);
        return data;
    }
};

export default dosyaTakipService;
