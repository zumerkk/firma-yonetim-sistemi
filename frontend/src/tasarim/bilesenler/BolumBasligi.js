// 📑 BÖLÜM BAŞLIĞI — form içindeki alan gruplarını ayırır
// ETUYS: gri şerit + koyu mavi kalın metin. ("Yatırımcı ile ilgili bilgiler")

import React from 'react';
import { Box } from '@mui/material';
import { renk, yazi, kenar } from '../jetonlar';

const BolumBasligi = ({ children, sx = {} }) => (
  <Box
    sx={{
      backgroundColor: renk.yuzeyAlt,
      color: renk.baslikYazi,
      fontWeight: yazi.cokKalin,
      fontSize: `${yazi.baslik}px`,
      border: kenar.ince,
      borderLeft: `3px solid ${renk.ana}`,
      px: 1.1,
      py: 0.4,
      mb: 0.9,
      ...sx
    }}
  >
    {children}
  </Box>
);

export default BolumBasligi;
