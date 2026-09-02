// 💾 EYLEM ŞERİDİ — formun altındaki kaydet/güncelle şeridi
// ETUYS'te form bloğunun altında gri bir şerit içinde ikonlu eylemler durur
// ("Mersis Bilgileri Güncelle · Yatırımcı Bilgileri Kaydet").
// Eylemi sayfanın rastgele bir köşesine koymak yerine hep aynı yerde tutar.

import React from 'react';
import { Box } from '@mui/material';
import { renk, kenar } from '../jetonlar';

const EylemSeridi = ({ children, sx = {} }) => (
  <Box
    sx={{
      display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap',
      backgroundColor: renk.yuzeyAlt,
      border: kenar.ince,
      px: 1.2, py: 0.7,
      ...sx
    }}
  >
    {children}
  </Box>
);

export default EylemSeridi;
