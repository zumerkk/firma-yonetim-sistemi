// 🔒 "Cari açık / Cari kapandı"
//
// `talepId` verilirse TALEBİN seçimi (Belge Takip › Ödemeler ve arşiv tablosu), yoksa `firmaId` ile FİRMANIN
// seçimi (Cari / Ödeme Takip'teki firma listesi ve firma carisi). Müşteri (03.11.2026, acil): "Belge takip
// ekranında cari kapandı seçince o firmanın tüm işlemlerini kapatıyor" — Belge Takip artık firma alanını
// değiştirmez, yalnız o talebi.

import React from 'react';
import cariService from '../../services/cariService';
import CariSecimKutusu from './CariSecimKutusu';
import { CARI_DURUMU_SECENEKLERI } from '../../utils/cariFormat';

export default function CariDurumuSecimi({ talepId, firmaId, value, onDegis, disabled = false, kompakt = false }) {
    const kaydet = async (durum) => (talepId
        ? (await cariService.talepCariDurumuGuncelle(talepId, durum)).data.cariDurumu
        : (await cariService.firmaDurumuGuncelle(firmaId, durum)).data.cariDurumu);
    return (
        <CariSecimKutusu etiket="Cari durumu" secenekler={CARI_DURUMU_SECENEKLERI}
            value={value === 'kapandi' ? 'kapandi' : 'acik'} kaydet={kaydet} onDegis={onDegis}
            disabled={disabled || !(talepId || firmaId)} kompakt={kompakt} />
    );
}
