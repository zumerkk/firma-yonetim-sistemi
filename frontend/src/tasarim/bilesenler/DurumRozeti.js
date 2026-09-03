// 🔖 DURUM ROZETİ — onay / beklemede / red
// Anlam renkleri vurgu renginden AYRI tutulur: mavi "burası etkin", yeşil
// "onaylandı" demek. İkisi karışırsa ekranda hangi rengin ne söylediği belirsizleşir.

import React from 'react';
import { Box } from '@mui/material';
import { yazi, durumStili } from '../jetonlar';

const ETIKET = { onay: 'Onay', kismi_onay: 'Kısmi Onay', red: 'Red', beklemede: 'Beklemede' };
const TUR = { onay: 'onay', kismi_onay: 'bekle', red: 'red', beklemede: 'bekle' };

/**
 * @param {string} durum  'onay' | 'kismi_onay' | 'red' | 'beklemede'
 * @param {string} metin  etiketi elle vermek için (opsiyonel)
 */
const DurumRozeti = ({ durum, metin, sx = {} }) => {
  const tur = TUR[durum] || 'notr';
  const s = durumStili[tur];
  return (
    <Box
      component="span"
      sx={{
        display: 'inline-block',
        px: 0.9,
        py: '1px',
        borderRadius: '2px',
        fontSize: `${yazi.kucuk}px`,
        fontWeight: yazi.kalin,
        backgroundColor: s.bg,
        color: s.yazi,
        whiteSpace: 'nowrap',
        ...sx
      }}
    >
      {metin || ETIKET[durum] || '—'}
    </Box>
  );
};

export default DurumRozeti;
