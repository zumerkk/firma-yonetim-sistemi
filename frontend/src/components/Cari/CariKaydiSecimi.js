// ✍️ "Cari yazıldı / Cari kesildi" — talep bazında
//
// Müşteri (27.10.2026): "belge takibin ödeme kısmına cari açık/kapalı seçeneğinin soluna, cari
// yazıldı / cari kesildi diye iki seçenekli bir sekme daha … sonrasında sadece belge takip kısmında
// arşiv bölümünde bu seçenekler görünsün". Ödemeler sekmesi ve arşiv tablosu aynı alanı düzenler.
// "Seçilmedi" eski talepler için başlangıç değeri; yanlış seçimi geri almaya da yarar.

import React from 'react';
import cariService from '../../services/cariService';
import CariSecimKutusu from './CariSecimKutusu';
import { CARI_KAYDI_SECENEKLERI } from '../../utils/cariFormat';

export default function CariKaydiSecimi({ talepId, value, onDegis, disabled = false, kompakt = false }) {
    const kaydet = async (deger) => (await cariService.talepCariKaydiGuncelle(talepId, deger)).data.cariKaydi;
    return (
        <CariSecimKutusu etiket="Cari kaydı" secenekler={CARI_KAYDI_SECENEKLERI}
            value={CARI_KAYDI_SECENEKLERI.some((s) => s.deger === value) ? value : ''} kaydet={kaydet} onDegis={onDegis}
            disabled={disabled || !talepId} kompakt={kompakt} />
    );
}
