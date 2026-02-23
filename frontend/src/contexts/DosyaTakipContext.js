// 📋 Dosya İş Akış Takip Sistemi - React Context
// State yönetimi ve global actions

import React, { createContext, useContext, useState, useCallback } from 'react';
import dosyaTakipService from '../services/dosyaTakipService';

const DosyaTakipContext = createContext();

export const useDosyaTakip = () => {
    const context = useContext(DosyaTakipContext);
    if (!context) {
        throw new Error('useDosyaTakip must be used within a DosyaTakipProvider');
    }
    return context;
};

export const DosyaTakipProvider = ({ children }) => {
    const [talepler, setTalepler] = useState([]);
    const [seciliTalep, setSeciliTalep] = useState(null);
    const [dashboardStats, setDashboardStats] = useState(null);
    const [enumDegerleri, setEnumDegerleri] = useState(null);
    const [pagination, setPagination] = useState({ toplam: 0, sayfa: 1, limit: 50, toplamSayfa: 0 });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    // 📊 Dashboard
    const fetchDashboard = useCallback(async () => {
        try {
            setLoading(true);
            const result = await dosyaTakipService.getDashboardStats();
            if (result.success) setDashboardStats(result.data);
        } catch (err) {
            setError(err.response?.data?.message || 'Dashboard yüklenemedi');
        } finally {
            setLoading(false);
        }
    }, []);

    // 📦 Enum Değerleri
    const fetchEnums = useCallback(async () => {
        try {
            const result = await dosyaTakipService.getEnumDegerleri();
            if (result.success) setEnumDegerleri(result.data);
            return result.data;
        } catch (err) {
            setError(err.response?.data?.message || 'Enum değerleri yüklenemedi');
        }
    }, []);

    // 📋 Talepler Listesi
    const fetchTalepler = useCallback(async (params = {}) => {
        try {
            setLoading(true);
            const result = await dosyaTakipService.getTalepler(params);
            if (result.success) {
                setTalepler(result.data);
                setPagination(result.pagination);
            }
        } catch (err) {
            setError(err.response?.data?.message || 'Talepler yüklenemedi');
        } finally {
            setLoading(false);
        }
    }, []);

    // 🔍 Tekil Talep
    const fetchTalep = useCallback(async (id) => {
        try {
            setLoading(true);
            const result = await dosyaTakipService.getTalepById(id);
            if (result.success) setSeciliTalep(result.data);
            return result.data;
        } catch (err) {
            setError(err.response?.data?.message || 'Talep bulunamadı');
        } finally {
            setLoading(false);
        }
    }, []);

    // ➕ Yeni Talep
    const talepOlustur = useCallback(async (data) => {
        try {
            setLoading(true);
            const result = await dosyaTakipService.yeniTalep(data);
            return result;
        } catch (err) {
            setError(err.response?.data?.message || 'Talep oluşturulamadı');
            throw err;
        } finally {
            setLoading(false);
        }
    }, []);

    // ✏️ Güncelle
    const talepGuncelle = useCallback(async (id, data) => {
        try {
            setLoading(true);
            const result = await dosyaTakipService.talepGuncelle(id, data);
            if (result.success) setSeciliTalep(result.data);
            return result;
        } catch (err) {
            setError(err.response?.data?.message || 'Talep güncellenemedi');
            throw err;
        } finally {
            setLoading(false);
        }
    }, []);

    // 🔄 Durum Değiştir
    const durumDegistir = useCallback(async (id, yeniDurum, aciklama) => {
        try {
            setLoading(true);
            const result = await dosyaTakipService.durumDegistir(id, yeniDurum, aciklama);
            if (result.success) setSeciliTalep(result.data);
            return result;
        } catch (err) {
            setError(err.response?.data?.message || 'Durum değiştirilemedi');
            throw err;
        } finally {
            setLoading(false);
        }
    }, []);

    // 📝 Not Ekle
    const notEkle = useCallback(async (id, metin, alan) => {
        try {
            const result = await dosyaTakipService.notEkle(id, metin, alan);
            if (result.success) setSeciliTalep(result.data);
            return result;
        } catch (err) {
            setError(err.response?.data?.message || 'Not eklenemedi');
            throw err;
        }
    }, []);

    // 📁 Dosya Ekle
    const dosyaEkle = useCallback(async (id, file, alan) => {
        try {
            const result = await dosyaTakipService.dosyaEkle(id, file, alan);
            if (result.success) setSeciliTalep(result.data);
            return result;
        } catch (err) {
            setError(err.response?.data?.message || 'Dosya yüklenemedi');
            throw err;
        }
    }, []);

    // 🗑️ Not Sil
    const notSil = useCallback(async (id, notId, alan) => {
        try {
            const result = await dosyaTakipService.notSil(id, notId, alan);
            if (result.success) setSeciliTalep(result.data);
            return result;
        } catch (err) {
            setError(err.response?.data?.message || 'Not silinemedi');
            throw err;
        }
    }, []);

    // 🗑️ Dosya Sil
    const dosyaSil = useCallback(async (id, dosyaId, alan) => {
        try {
            const result = await dosyaTakipService.dosyaSil(id, dosyaId, alan);
            if (result.success) setSeciliTalep(result.data);
            return result;
        } catch (err) {
            setError(err.response?.data?.message || 'Dosya silinemedi');
            throw err;
        }
    }, []);

    // 🗑️ Sil
    const talepSil = useCallback(async (id) => {
        try {
            const result = await dosyaTakipService.talepSil(id);
            return result;
        } catch (err) {
            setError(err.response?.data?.message || 'Talep silinemedi');
            throw err;
        }
    }, []);

    const clearError = () => setError(null);

    const value = {
        talepler,
        seciliTalep,
        dashboardStats,
        enumDegerleri,
        pagination,
        loading,
        error,
        fetchDashboard,
        fetchEnums,
        fetchTalepler,
        fetchTalep,
        talepOlustur,
        talepGuncelle,
        durumDegistir,
        notEkle,
        notSil,
        dosyaEkle,
        dosyaSil,
        talepSil,
        clearError,
        setSeciliTalep
    };

    return (
        <DosyaTakipContext.Provider value={value}>
            {children}
        </DosyaTakipContext.Provider>
    );
};

export default DosyaTakipContext;
