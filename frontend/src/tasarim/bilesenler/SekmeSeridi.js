// 🗂️ SEKME ŞERİDİ — belge bölümleri arası gezinme
//
// ETUYS'ün 10 bölümü yatay sekme olarak duruyor; bizde bugün dikey akordeon.
// Sıra ETUYS'ünkiyle AYNI kalmalı (kullanıcı kararı): kullanıcılar bu sırayı
// bakanlık sisteminde ezberlemiş, değiştirmek kas hafızasını bozar.
//
// Klavye: ← → ile sekmeler arasında gezinir (WAI-ARIA tab deseni).

import React from 'react';
import { Box } from '@mui/material';
import { renk, yazi, kenar } from '../jetonlar';

/**
 * @param {Array}  sekmeler  [{ anahtar, baslik }]
 * @param {string} etkin     seçili sekmenin anahtarı
 * @param {func}   onDegis   (anahtar) => void
 */
const SekmeSeridi = ({ sekmeler = [], etkin, onDegis = () => {}, sx = {} }) => {
  const tusaBas = (e, i) => {
    if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
    e.preventDefault();
    const yon = e.key === 'ArrowRight' ? 1 : -1;
    const sonraki = sekmeler[(i + yon + sekmeler.length) % sekmeler.length];
    onDegis(sonraki.anahtar);
  };

  return (
    <Box
      role="tablist"
      aria-label="Bölümler"
      sx={{ display: 'flex', gap: '2px', flexWrap: 'wrap', borderBottom: kenar.vurgu, ...sx }}
    >
      {sekmeler.map((s, i) => {
        const secili = s.anahtar === etkin;
        return (
          <Box
            key={s.anahtar}
            component="button"
            type="button"
            role="tab"
            aria-selected={secili}
            tabIndex={secili ? 0 : -1}
            onClick={() => onDegis(s.anahtar)}
            onKeyDown={(e) => tusaBas(e, i)}
            sx={{
              border: kenar.ince,
              borderBottom: 'none',
              borderRadius: `${kenar.yaricapKucuk}px ${kenar.yaricapKucuk}px 0 0`,
              backgroundColor: secili ? renk.ana : renk.yuzeyAlt,
              color: secili ? '#fff' : renk.sessiz,
              fontWeight: secili ? yazi.kalin : yazi.orta,
              fontFamily: yazi.aile,
              fontSize: `${yazi.etiket}px`,
              px: 1.6, py: 0.8,
              cursor: 'pointer',
              whiteSpace: 'nowrap',
              '&:hover': { color: secili ? '#fff' : renk.murekkep },
              '&:focus-visible': { outline: `2px solid ${renk.ana}`, outlineOffset: 2 }
            }}
          >
            {s.baslik}
          </Box>
        );
      })}
    </Box>
  );
};

export default SekmeSeridi;
