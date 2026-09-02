// 🏷️ ALAN SATIRI — etiket solda, kutulu değer sağda
//
// ETUYS'ün form omurgası. Kritik kural: SARI zemin = sistem hesapladı,
// kullanıcı yazamaz. Bugün sistemde bu ayrım hiç yok — kullanıcı hesaplanan
// alana yazmayı deniyor, alan kendi kendine değişiyor, "neden kaydedilmedi"
// diye soruyor. En sık gelen destek sorusu bu.

import React from 'react';
import { Box } from '@mui/material';
import { renk, yazi, aralik, stil } from '../jetonlar';

/**
 * @param {string}  etiket
 * @param {node}    children  değer (metin ya da girdi bileşeni)
 * @param {boolean} hesap     sistem hesaplıyor → sarı, yazılamaz
 * @param {boolean} sayi      sağa yasla + tabular-nums
 * @param {boolean} uzun      çok satırlı değer (adres, açıklama)
 * @param {number}  etiketGenislik  yüzde olarak etiket sütunu (varsayılan 44)
 */
const AlanSatiri = ({
  etiket,
  children,
  hesap = false,
  sayi = false,
  uzun = false,
  etiketGenislik = 44,
  sx = {}
}) => (
  <Box
    sx={{
      display: 'grid',
      gridTemplateColumns: `${etiketGenislik}% 1fr`,
      gap: 1,
      alignItems: uzun ? 'start' : 'center',
      mb: `${aralik.satir}px`,
      ...sx
    }}
  >
    <Box component="label" sx={{ color: renk.sessiz, fontSize: `${yazi.etiket}px` }}>
      {etiket}
    </Box>
    <Box
      sx={{
        ...stil.alan,
        ...(hesap ? stil.alanHesap : {}),
        ...(sayi ? { textAlign: 'right' } : {}),
        ...(uzun ? { minHeight: 52 } : {})
      }}
    >
      {children ?? <Box component="span" sx={{ color: renk.soluk }}>—</Box>}
    </Box>
  </Box>
);

export default AlanSatiri;
