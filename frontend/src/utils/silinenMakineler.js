// 🗑️ Müşteri görünümü (PDF + Excel) — revizyonlarda silinmiş makineler
//
// Müşteri (07.10.2026): "Makine listesinde silinenleri pdf çıktısından komple kaldırmak yerine kırmızı
// yazıyla 'Silindi' gibi bir şey yazabilir miyiz belli olsun?" Sunucu revizyon geçmişinden çıkarıyor
// (backend/services/tesvikMakine/silinenMakineler.js). Çıktılar güncel listenin altına kırmızı
// "SİLİNEN MAKİNELER" bölümü ekler; her satırın son sütununda "SİLİNDİ" yazar.

import api from './axios';

export const SILINDI = 'SİLİNDİ';
export const silinenBaslik = (adet) => `SİLİNEN MAKİNELER (${adet}) — revizyonlarda listeden çıkarıldı`;

/**
 * @param kaynak 'tesvik' | 'yeni-tesvik'
 * @returns {Promise<{ yerli: [], ithal: [] } | null>} okunamazsa null (çıktı yine de alınır)
 */
export async function silinenMakineleriGetir(kaynak, id) {
    try {
        // 830 makineli belgede geçmiş okuması birkaç saniye sürebiliyor; genel 15 sn sınırı dar
        const { data } = await api.get(`/${kaynak}/${id}/makine-revizyon/silinenler`, { timeout: 45000 });
        const v = data?.data || {};
        return { yerli: Array.isArray(v.yerli) ? v.yerli : [], ithal: Array.isArray(v.ithal) ? v.ithal : [] };
    } catch (hata) {
        console.warn('Silinen makineler alınamadı:', hata?.message);
        return null;
    }
}
