// 🗂️ PANEL — ETUYS'ün her liste/form bloğunu saran kalıp
//
// ETUYS'te her içerik bloğu aynı üç parçadan oluşur:
//   başlık şeridi (ikon + ad + katlama)  →  içerik  →  (varsa) sayfalama
//
// Bugün sistemde bu kalıp her ekranda elle, farklı boşluk ve renklerle
// yeniden yazılıyor. Buradan geçince hepsi aynı olur.

import React, { useState } from 'react';
import { Box, Collapse, IconButton, Tooltip } from '@mui/material';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import { renk, kenar, aralik, stil } from '../jetonlar';

/**
 * @param {string}  baslik      panel adı
 * @param {node}    ikon        başlıktaki küçük ikon (opsiyonel)
 * @param {node}    sagUnsur    başlığın sağına konacak içerik (sayaç, düğme…)
 * @param {boolean} katlanabilir  başlıkta aç/kapa düğmesi göster
 * @param {boolean} baslangicAcik varsayılan açık mı (katlanabilir ise)
 * @param {boolean} bosluksuz   içeriğe iç boşluk verme (tablo için)
 */
const Panel = ({
  baslik,
  ikon = null,
  sagUnsur = null,
  katlanabilir = false,
  baslangicAcik = true,
  bosluksuz = false,
  children,
  sx = {}
}) => {
  const [acik, setAcik] = useState(baslangicAcik);

  return (
    <Box sx={{ mb: `${aralik.grup}px`, ...sx }}>
      <Box sx={stil.panelBasligi}>
        {ikon}
        <Box component="span">{baslik}</Box>
        <Box sx={{ flex: 1 }} />
        {sagUnsur}
        {katlanabilir && (
          <Tooltip title={acik ? 'Daralt' : 'Genişlet'}>
            <IconButton
              size="small"
              onClick={() => setAcik((a) => !a)}
              sx={{ p: 0.15, color: renk.sessiz }}
              aria-label={acik ? 'Daralt' : 'Genişlet'}
            >
              {acik ? <ExpandLessIcon sx={{ fontSize: 16 }} /> : <ExpandMoreIcon sx={{ fontSize: 16 }} />}
            </IconButton>
          </Tooltip>
        )}
      </Box>

      <Collapse in={acik} timeout="auto" unmountOnExit>
        <Box
          sx={{
            border: kenar.ince,
            borderTop: 'none',
            backgroundColor: renk.yuzey,
            p: bosluksuz ? 0 : `${aralik.panelIc}px`
          }}
        >
          {children}
        </Box>
      </Collapse>
    </Box>
  );
};

export default Panel;
