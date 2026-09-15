// 💳 Cari Hesap / Ödeme Takip — API servisi

import axios, { uploadPost } from '../utils/axios';

const API_URL = '/cari';

// Tanımsız alan hiç gönderilmez: sunucuda "gönderilmedi" ile "boşaltıldı" farklı
// anlam taşıyor (ör. düzenlemede talep bağı).
const tanimli = (o) => Object.fromEntries(Object.entries(o).filter(([, v]) => v !== undefined && v !== null));

const formVerisi = (alanlar, dosya) => {
    const fd = new FormData();
    Object.entries(tanimli(alanlar)).forEach(([k, v]) => fd.append(k, v));
    fd.append('dosya', dosya);
    return fd;
};

const cariService = {
    // Hareketi olan firmalar ve bakiyeleri
    firmaOzetleri: async () => {
        const { data } = await axios.get(`${API_URL}/firmalar`);
        return data;
    },

    // Firmanın tüm carisi (+ hareket bağlanabilecek talepler)
    firmaDefteri: async (firmaId) => {
        const { data } = await axios.get(`${API_URL}/firma/${firmaId}`);
        return data;
    },

    // Belge Takip › Ödemeler sekmesindeki mini cari tablo
    talepDefteri: async (talepId) => {
        const { data } = await axios.get(`${API_URL}/talep/${talepId}`);
        return data;
    },

    // Dosya varsa multipart (yükleme göstergesi ve uzun zaman aşımıyla), yoksa JSON
    hareketEkle: async (alanlar, dosya, onProgress) => {
        const { data } = dosya
            ? await uploadPost(API_URL, formVerisi(alanlar, dosya), { onProgress })
            : await axios.post(API_URL, tanimli(alanlar));
        return data;
    },

    hareketGuncelle: async (id, alanlar, dosya) => {
        const { data } = dosya
            // Content-Type açıkça multipart olmalı: aksi halde axios FormData'yı JSON'a çeviriyor
            ? await axios.put(`${API_URL}/${id}`, formVerisi(alanlar, dosya), {
                headers: { 'Content-Type': 'multipart/form-data' },
                timeout: 5 * 60 * 1000
            })
            : await axios.put(`${API_URL}/${id}`, tanimli(alanlar));
        return data;
    },

    hareketSil: async (id) => {
        const { data } = await axios.delete(`${API_URL}/${id}`);
        return data;
    },

    // Dekont/makbuz sunucu üzerinden (Cloudinary PDF teslimat kısıtı)
    dosyaBlob: async (id, indir) => {
        const { data } = await axios.get(`${API_URL}/${id}/dosya`, {
            params: { dl: indir ? 1 : 0 },
            responseType: 'blob'
        });
        return data;
    }
};

export default cariService;
