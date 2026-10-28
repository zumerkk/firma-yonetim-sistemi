import React from 'react';
import cariService from '../../services/cariService';
import CariSecimKutusu from './CariSecimKutusu';
import { CARI_DURUMU_SECENEKLERI } from '../../utils/cariFormat';

/** Aynı firma alanını Cari ve Belge Takip ekranlarından düzenler. */
export default function CariDurumuSecimi({ firmaId, value, onDegis, disabled = false, kompakt = false }) {
    const kaydet = async (durum) => (await cariService.firmaDurumuGuncelle(firmaId, durum)).data.cariDurumu;
    return (
        <CariSecimKutusu etiket="Cari durumu" secenekler={CARI_DURUMU_SECENEKLERI}
            value={value === 'kapandi' ? 'kapandi' : 'acik'} kaydet={kaydet} onDegis={onDegis}
            disabled={disabled || !firmaId} kompakt={kompakt} />
    );
}
