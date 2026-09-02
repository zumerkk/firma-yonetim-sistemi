// 🧰 ARAÇ ÇUBUĞU — panel başlığının hemen altındaki eylem şeridi
// ETUYS: "Ayrıntıları Görüntüle · Finansal Kiralama İşlemleri · Devir İşlemleri…"
// Sağ tarafa sayaç/özet konabilir (ör. "830 satır · Toplam 189.671.967 ₺").

import React from 'react';
import { Box } from '@mui/material';
import { renk, yazi, kenar } from '../jetonlar';

const AracCubugu = ({ children, sagUnsur = null, sx = {} }) => (
  <Box
    sx={{
      display: 'flex', alignItems: 'center', gap: 0.9, flexWrap: 'wrap',
      pb: 1, mb: 1, borderBottom: kenar.ince,
      ...sx
    }}
  >
    {children}
    {sagUnsur && (
      <>
        <Box sx={{ flex: 1 }} />
        <Box sx={{ color: renk.sessiz, fontSize: `${yazi.etiket}px` }}>{sagUnsur}</Box>
      </>
    )}
  </Box>
);

export default AracCubugu;
