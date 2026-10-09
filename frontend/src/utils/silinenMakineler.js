// 🗑️ Müşteri görünümü (PDF + Excel) — revizyonlarda silinmiş makineler
//
// Müşteri (07.10.2026): "Makine listesinde silinenleri pdf çıktısından komple kaldırmak yerine kırmızı
// yazıyla 'Silindi' gibi bir şey yazabilir miyiz belli olsun?" Sunucu revizyon geçmişinden çıkarıyor
// (backend/services/tesvikMakine/silinenMakineler.js). Çıktılar güncel listenin altına kırmızı
// "SİLİNEN MAKİNELER" bölümü ekler; her satırın son sütununda "SİLİNDİ · silinme tarihi" yazar.

import api from './axios';

export const SILINDI = 'SİLİNDİ';
// Müşteri (09.10.2026): "Sadece en son işlemde silinen makineler varsa onları ve silinme tarihlerini
// göstermesi yeterli." Sunucu artık yalnız son revizyonda silinenleri ve silinme tarihini döner.
export const silinenBaslik = (adet) => `SİLİNEN MAKİNELER (${adet}) — son revizyonda listeden çıkarıldı`;
/** Son sütuna yazılan etiket: "SİLİNDİ · 09.10.2026" (süren revizyonda tarih yoksa yalnız "SİLİNDİ") */
export const silindiEtiketi = (m) => {
    const t = m?.silinmeTarihi ? new Date(m.silinmeTarihi) : null;
    return t && !Number.isNaN(t.getTime()) ? `${SILINDI} · ${t.toLocaleDateString('tr-TR')}` : SILINDI;
};

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
