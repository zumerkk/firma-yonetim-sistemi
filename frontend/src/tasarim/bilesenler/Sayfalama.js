// ⏭️ SAYFALAMA ŞERİDİ
// ETUYS: ⏮ ◀ Sayfa [1]/83 ▶ ⏭  ······  "Gösterilen Kayıtlar 1 – 10 / 830"
// Bugün sistemde her ekranda farklı bir sayfalama bileşeni var; buradan geçince
// hepsi aynı yerde, aynı biçimde.

import React from 'react';
import { Box, IconButton, Tooltip } from '@mui/material';
import FirstPageIcon from '@mui/icons-material/FirstPage';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import LastPageIcon from '@mui/icons-material/LastPage';
import RefreshIcon from '@mui/icons-material/Refresh';
import { renk, yazi, kenar } from '../jetonlar';

const sayiTr = (n) => Number(n || 0).toLocaleString('tr-TR');

const Sayfalama = ({
  sayfa = 1,
  toplamSayfa = 1,
  toplamKayit = 0,
  sayfaBoyutu = 10,
  onSayfa = () => {},
  onYenile = null
}) => {
  const gecerli = Math.min(Math.max(1, sayfa), Math.max(1, toplamSayfa));
  const ilkKayit = toplamKayit === 0 ? 0 : (gecerli - 1) * sayfaBoyutu + 1;
  const sonKayit = Math.min(gecerli * sayfaBoyutu, toplamKayit);

  const dugme = (baslik, Ikon, hedef, pasif) => (
    <Tooltip title={baslik}>
      <span>
        <IconButton size="small" disabled={pasif} onClick={() => onSayfa(hedef)} sx={{ p: 0.25 }} aria-label={baslik}>
          <Ikon sx={{ fontSize: 16 }} />
        </IconButton>
      </span>
    </Tooltip>
  );

  return (
    <Box
      sx={{
        display: 'flex', alignItems: 'center', gap: 0.6,
        border: kenar.ince, borderTop: 'none',
        px: 1.1, py: 0.4,
        fontSize: `${yazi.kucuk}px`, color: renk.sessiz
      }}
    >
      {dugme('İlk sayfa', FirstPageIcon, 1, gecerli <= 1)}
      {dugme('Önceki', ChevronLeftIcon, gecerli - 1, gecerli <= 1)}
      <Box component="span">Sayfa</Box>
      <Box
        sx={{
          border: kenar.alan, backgroundColor: renk.yuzey, color: renk.murekkep,
          px: 0.8, minWidth: 34, textAlign: 'center', fontVariantNumeric: 'tabular-nums'
        }}
      >
        {gecerli}
      </Box>
      <Box component="span">/ {toplamSayfa}</Box>
      {dugme('Sonraki', ChevronRightIcon, gecerli + 1, gecerli >= toplamSayfa)}
      {dugme('Son sayfa', LastPageIcon, toplamSayfa, gecerli >= toplamSayfa)}
      {onYenile && dugme('Yenile', RefreshIcon, gecerli, false)}

      <Box sx={{ flex: 1 }} />
      <Box component="span">
        {toplamKayit === 0
          ? 'Gösterilecek kayıt yok'
          : `Gösterilen Kayıtlar ${sayiTr(ilkKayit)} – ${sayiTr(sonKayit)} / ${sayiTr(toplamKayit)}`}
      </Box>
    </Box>
  );
};

export default Sayfalama;
