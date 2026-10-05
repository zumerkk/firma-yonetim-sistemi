// 🧾 Fatura durumu etiketi (kesildi / kesilmedi / avans)
//
// Müşteri (05.10.2026): Cari takipte "Hizmet ve Yatırım ödemeleri'nin solunda Fatura durumu
// yazsın(kesildi-kesilmedi-avans)"; Belge Takip'te "sütunlarına Fatura Durumunu da ekleyebilir
// miyiz". Tek talep için `durum`, firma (birden çok talep) için `sayilar` verilir.

import React from 'react';
import { Box, Chip, Tooltip, Typography } from '@mui/material';
import { FATURA_DURUMU } from '../../utils/cariFormat';

const etiketSx = (m) => ({
    height: 20, fontSize: '0.7rem', fontWeight: 700, color: m.renk, background: m.zemin, border: `1px solid ${m.kenar}`,
    '& .MuiChip-label': { px: 0.75 }
});

const Bos = ({ ipucu }) => (
    <Tooltip title={ipucu} disableInteractive>
        <Typography component="span" variant="caption" sx={{ color: '#94a3b8' }}>—</Typography>
    </Tooltip>
);

/**
 * @param durum   'kesildi' | 'kesilmedi' | 'avans' | '' — tek talep
 * @param sayilar { kesildi, kesilmedi, avans, bos } — firmanın talepleri
 */
export default function FaturaDurumuEtiketi({ durum, sayilar }) {
    if (sayilar) {
        const dolu = Object.keys(FATURA_DURUMU).filter((d) => Number(sayilar[d]) > 0);
        const bos = Number(sayilar.bos) || 0;
        if (!dolu.length) return <Bos ipucu={bos ? `${bos} talepte fatura durumu girilmemiş` : 'Belge Takip\'te talebi yok'} />;
        return (
            <Tooltip title={bos ? `${bos} talepte fatura durumu girilmemiş` : ''} disableInteractive>
                <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
                    {dolu.map((d) => (
                        <Chip key={d} size="small" sx={etiketSx(FATURA_DURUMU[d])}
                            label={Number(sayilar[d]) > 1 ? `${FATURA_DURUMU[d].etiket} (${sayilar[d]})` : FATURA_DURUMU[d].etiket} />
                    ))}
                </Box>
            </Tooltip>
        );
    }
    const m = FATURA_DURUMU[durum];
    if (!m) return <Bos ipucu="Fatura durumu girilmemiş (talebin Ödemeler sekmesi)" />;
    return <Chip size="small" label={m.etiket} sx={etiketSx(m)} />;
}
