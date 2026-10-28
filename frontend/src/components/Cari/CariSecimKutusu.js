// 🔽 Cari seçim kutusu — "Cari açık / kapandı" ve "Cari yazıldı / kesildi" aynı davranışı paylaşır:
// seçilince hemen sunucuya yazılır, kaydedilemezse eski değer kalır ve hata görünür.
//
// `kompakt`: Belge Takip arşiv tablosundaki satır içi kullanım (satır 40 px). Etiket yerine
// erişilebilir ad verilir, hata satırı büyütmesin diye kutunun ipucunda gösterilir.

import React, { useState } from 'react';
import { Box, MenuItem, TextField, Tooltip } from '@mui/material';

const KOMPAKT_FONT = '0.75rem';
const durdur = (e) => e.stopPropagation();

/**
 * @param {string} etiket  görünen ad / erişilebilir ad ("Cari durumu")
 * @param {{deger: string, etiket: string, renk?: string}[]} secenekler
 * @param {string} value  seçenekler içinde olmalı
 * @param {(deger: string) => Promise<string>} kaydet  sunucuya yazar, kaydedilen değeri döner
 * @param {(deger: string) => void} [onDegis]  kaydedildikten sonra
 */
export default function CariSecimKutusu({ etiket, secenekler, value, kaydet, onDegis, disabled = false, kompakt = false }) {
    const [kaydediliyor, setKaydediliyor] = useState(false);
    const [hata, setHata] = useState('');

    const degistir = async (e) => {
        const deger = e.target.value;
        if (deger === value) return;
        setKaydediliyor(true);
        setHata('');
        try {
            onDegis?.(await kaydet(deger));
        } catch (err) {
            setHata(err?.response?.data?.message || `${etiket} kaydedilemedi.`);
        } finally {
            setKaydediliyor(false);
        }
    };

    const secili = secenekler.find((s) => s.deger === value) || secenekler[0];
    const secenekOgeleri = secenekler.map((s) => (
        <MenuItem key={s.deger || 'bos'} value={s.deger}
            sx={{ color: s.renk, ...(kompakt ? { fontSize: KOMPAKT_FONT, minHeight: 32 } : {}) }}>
            {s.etiket}
        </MenuItem>
    ));

    return (
        // Satıra tıklayınca talep açılıyor; kutu ve menüsü (portal da olsa React ağacında buradan geçer)
        // satır tıklamasına ve tablonun klavye gezinmesine karışmasın. Fare basışı da durdurulur: tablo
        // basışta hücreye odak veriyor, açılan menünün odağıyla çekişip menüyü tıklama anında kapatabiliyor
        // ve tıklama alttaki satıra düşüp talebi açıyordu (önizlemede görüldü).
        <Box onClick={durdur} onMouseDown={durdur} onMouseUp={durdur} onFocus={durdur} onKeyDown={durdur}
            sx={{ minWidth: kompakt ? 0 : 150, width: kompakt ? '100%' : undefined }}>
            {kompakt ? (
                <Tooltip title={hata} open={!!hata} arrow placement="top">
                    <TextField select fullWidth size="small" value={secili.deger} onChange={degistir}
                        disabled={disabled || kaydediliyor} error={!!hata}
                        SelectProps={{
                            displayEmpty: true,
                            SelectDisplayProps: { 'aria-label': etiket, title: etiket }
                        }}
                        sx={{
                            '& .MuiOutlinedInput-root': { height: 28, fontSize: KOMPAKT_FONT, background: '#fff' },
                            '& .MuiSelect-select': { py: 0, pl: 1, color: secili.renk, fontWeight: secili.deger ? 600 : 400 }
                        }}>
                        {secenekOgeleri}
                    </TextField>
                </Tooltip>
            ) : (
                <TextField select fullWidth size="small" label={etiket} value={secili.deger} onChange={degistir}
                    disabled={disabled || kaydediliyor} error={!!hata} helperText={hata || undefined}
                    SelectProps={{ displayEmpty: true }} InputLabelProps={{ shrink: true }}
                    sx={{ '& .MuiSelect-select': { color: secili.renk } }}>
                    {secenekOgeleri}
                </TextField>
            )}
        </Box>
    );
}
