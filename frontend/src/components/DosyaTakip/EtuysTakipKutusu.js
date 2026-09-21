// ☑️ E-TUYS TAKİP KUTUSU — Belge Takip listesi ve talep detayı
//
// Müşteri (21.09.2026): "İlgili sekmeye 'E-TUYS Takip' onay kutusu ekleyebilir miyiz?
//  - Dosyanın içine girmeden, sağ taraftaki sekmeden bu kutuyu işaretlediğimizde o anın tarih ve
//    saatini sisteme kaydetsin - Son işlem tarihi/Son kontrol tarihi gibi.
//  - Farklı kullanıcılar da aynı alan üzerinden işaretleme/güncelleme yapabilsin.
//  - Aynı onay kutusu ve son işlem tarihi/son kontrol tarihi dosya detayının içinde de yer alsın.
//  - Bu onay kutusu sadece '2. Kurum Değerlendirme' aşamasındaki taleplerde görünsün."
//
// İşaretlemek "şimdi kontrol edildi" demek: tarih/saat ve işaretleyen sunucuda damgalanır. İşaret
// kaldırılınca son kontrol bilgisi silinmez (gri kalır); yeniden işaretlemek tarihi günceller.

import React, { useState } from 'react';
import { Box, Checkbox, CircularProgress, Tooltip, Typography } from '@mui/material';

// Sunucudaki DosyaTakip.ETUYS_TAKIP_ASAMALARI ile aynı (MURACAAT_SONRASI: migrasyon öncesi eski ad)
const ETUYS_TAKIP_ASAMALARI = ['KURUM_DEGERLENDIRME', 'MURACAAT_SONRASI'];

export const etuysTakipGorunur = (talep) => ETUYS_TAKIP_ASAMALARI.includes(talep?.anaAsama);

const tarihSaat = (d, kisa) => {
    if (!d) return '';
    const t = new Date(d);
    if (Number.isNaN(t.getTime())) return '';
    return t.toLocaleString('tr-TR', {
        day: '2-digit', month: '2-digit', year: kisa ? '2-digit' : 'numeric', hour: '2-digit', minute: '2-digit'
    });
};

/**
 * @param {object}   talep       etuysTakip ve _id taşıyan talep
 * @param {function} onDegistir  (talepId, isaretli) => Promise — hata fırlatırsa kutu eski haline döner
 * @param {boolean}  [kompakt]   liste hücresi için tek satırlık görünüm
 */
export default function EtuysTakipKutusu({ talep, onDegistir, kompakt = false }) {
    const [bekliyor, setBekliyor] = useState(false);
    const e = talep?.etuysTakip || {};
    const isaretli = !!e.isaretli;
    const tarih = tarihSaat(e.kontrolTarihi, kompakt);

    const degistir = async () => {
        if (bekliyor || !talep?._id) return;
        setBekliyor(true);
        try {
            await onDegistir(talep._id, !isaretli);
        } catch (_) {
            // Mesajı çağıran gösterir; kutu sunucudaki haliyle kalır
        } finally {
            setBekliyor(false);
        }
    };

    const ipucu = tarih
        ? `Son kontrol: ${tarihSaat(e.kontrolTarihi)}${e.kontrolEdenAdi ? ` · ${e.kontrolEdenAdi}` : ''}${isaretli ? '' : ' (işaret kaldırıldı)'}`
        : 'E-TUYS kontrol edilince işaretleyin — tarih ve saat kaydedilir';

    return (
        <Tooltip title={ipucu}>
            {/* Tıklama satıra geçmesin: listede satır tıklaması detaya götürüyor */}
            <Box
                onClick={(ev) => ev.stopPropagation()}
                sx={{ display: 'flex', alignItems: 'center', gap: 0.25, minWidth: 0 }}
            >
                {bekliyor
                    ? <Box sx={{ width: 34, display: 'flex', justifyContent: 'center' }}><CircularProgress size={16} /></Box>
                    : (
                        <Checkbox
                            size="small"
                            checked={isaretli}
                            onChange={degistir}
                            inputProps={{ 'aria-label': 'E-TUYS takip' }}
                            sx={{ p: 0.5, color: '#94a3b8', '&.Mui-checked': { color: '#059669' } }}
                        />
                    )}
                <Box sx={{ minWidth: 0 }}>
                    {!kompakt && (
                        <Typography variant="body2" sx={{ fontWeight: 600, lineHeight: 1.2 }}>E-TUYS Takip</Typography>
                    )}
                    <Typography
                        variant="caption"
                        noWrap
                        sx={{
                            display: 'block', fontSize: kompakt ? '0.72rem' : undefined,
                            color: isaretli ? '#047857' : '#94a3b8', fontWeight: isaretli ? 600 : 400
                        }}
                    >
                        {tarih ? (kompakt ? tarih : `Son kontrol: ${tarih}${e.kontrolEdenAdi ? ` · ${e.kontrolEdenAdi}` : ''}`) : 'Kontrol edilmedi'}
                    </Typography>
                </Box>
            </Box>
        </Tooltip>
    );
}
