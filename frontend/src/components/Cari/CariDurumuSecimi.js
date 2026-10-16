import React, { useState } from 'react';
import { Box, MenuItem, TextField } from '@mui/material';
import cariService from '../../services/cariService';

/** Aynı firma alanını Cari ve Belge Takip ekranlarından düzenler. */
export default function CariDurumuSecimi({ firmaId, value, onDegis, disabled = false }) {
    const [kaydediliyor, setKaydediliyor] = useState(false);
    const [hata, setHata] = useState('');
    const degistir = async (e) => {
        const durum = e.target.value;
        setKaydediliyor(true);
        setHata('');
        try {
            const r = await cariService.firmaDurumuGuncelle(firmaId, durum);
            onDegis?.(r.data.cariDurumu);
        } catch (err) {
            setHata(err?.response?.data?.message || 'Cari durumu kaydedilemedi.');
        } finally {
            setKaydediliyor(false);
        }
    };
    return (
        <Box onClick={(e) => e.stopPropagation()} sx={{ minWidth: 150 }}>
            <TextField select fullWidth size="small" label="Cari durumu"
                value={value === 'kapandi' ? 'kapandi' : 'acik'} onChange={degistir}
                disabled={disabled || !firmaId || kaydediliyor} error={!!hata} helperText={hata || undefined}>
                <MenuItem value="acik">Cari açık</MenuItem>
                <MenuItem value="kapandi">Cari kapandı</MenuItem>
            </TextField>
        </Box>
    );
}
