// 🔢 SAYI KUTUSU — panel ekranlarının tek istatistik kalıbı
//
// ⚠️ ETUYS'te bu kalıbın DOĞRUDAN karşılığı yok: ETUYS bir belge işleme
// portalı, KPI ekranı değil. Bu yüzden kutu, referanstaki genel kurallardan
// türetildi (etuys/README.md):
//
//   "Olmayanlar: Gradyan, gölge, yuvarlak köşeli kart, emoji"
//   "Sayı: binlik nokta, ondalık virgül"
//
// Yerini aldığı şey: dört panelin her biri kendi StatsCard'ını yazmıştı —
// 135° gradyan, 48px avatar, hover'da yukarı zıplama, 2rem rakam. Aynı fikrin
// dört ayrı kopyası, dördü de birbirinden biraz farklı.
//
// Rakam burada kahramandır: etiket küçük ve sessiz, sayı büyük ve tabular-nums
// (rakamlar sabit genişlikte, alt alta kutular hizalı durur).

import React from 'react';
import { Box, Skeleton } from '@mui/material';
import { renk, yazi, kenar, durumStili } from '../jetonlar';
import { sayiYaz } from '../../utils/sayiFormat';

/**
 * @param {string}  etiket    kutunun adı ("Toplam Firma")
 * @param {number|string} deger  sayı; number ise TR biçimine sokulur
 * @param {node}    ikon      küçük, sessiz ikon (opsiyonel)
 * @param {string}  alt       rakamın altına küçük açıklama (opsiyonel)
 * @param {'onay'|'bekle'|'red'|'notr'} vurgu  anlam rengi; yoksa nötr
 * @param {func}    onTik     tıklanabilir yapar
 * @param {boolean} yukleniyor iskelet göster
 * @param {string}  ariaEtiket ekran okuyucu metni; verilmezse "etiket: değer" üretilir
 */
const SayiKutusu = ({
  etiket,
  deger,
  ikon = null,
  alt = null,
  vurgu = null,
  onTik = null,
  yukleniyor = false,
  ariaEtiket = null,
  sx = {}
}) => {
  const anlam = vurgu ? durumStili[vurgu] : null;
  const tiklanabilir = typeof onTik === 'function';

  return (
    <Box
      onClick={tiklanabilir ? onTik : undefined}
      // Tıklanabilir kutu klavyeyle de erişilebilir olmalı; ETUYS sadeliği
      // erişilebilirlikten feragat etmek anlamına gelmiyor.
      role={tiklanabilir ? 'button' : undefined}
      tabIndex={tiklanabilir ? 0 : undefined}
      // Tıklanabilir kutuda ekran okuyucu tek başına rakamı duyar ("12"); neyin
      // 12'si olduğunu ve tıklayınca ne olacağını da söylemek gerekiyor.
      aria-label={tiklanabilir ? (ariaEtiket || `${etiket}: ${deger ?? '—'}`) : undefined}
      onKeyDown={tiklanabilir ? (e) => {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onTik(); }
      } : undefined}
      sx={{
        border: kenar.ince,
        borderLeft: `3px solid ${anlam ? anlam.yazi : renk.ana}`,
        borderRadius: kenar.yaricap,
        boxShadow: kenar.golge,
        backgroundColor: renk.yuzey,
        px: 1.2,
        py: 0.9,
        height: '100%',
        cursor: tiklanabilir ? 'pointer' : 'default',
        // Hover'da yalnız zemin değişir — kutu yerinden oynamaz.
        '&:hover': tiklanabilir ? { backgroundColor: renk.anaHafif } : {},
        '&:focus-visible': { outline: kenar.vurgu, outlineOffset: '-2px' },
        ...sx
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.6, mb: 0.3 }}>
        {ikon && (
          <Box sx={{ color: renk.sessiz, display: 'flex', '& svg': { fontSize: 14 } }}>
            {ikon}
          </Box>
        )}
        <Box
          component="span"
          sx={{ fontSize: `${yazi.etiket}px`, color: renk.sessiz, fontWeight: yazi.orta }}
        >
          {etiket}
        </Box>
      </Box>

      <Box
        sx={{
          fontSize: '22px',
          fontWeight: yazi.cokKalin,
          lineHeight: 1.15,
          color: anlam ? anlam.yazi : renk.murekkep,
          fontVariantNumeric: 'tabular-nums'
        }}
      >
        {yukleniyor
          ? <Skeleton width={70} height={26} />
          : (typeof deger === 'number' ? sayiYaz(deger) : (deger ?? '—'))}
      </Box>

      {alt && (
        <Box sx={{ fontSize: `${yazi.kucuk}px`, color: renk.sessiz, mt: 0.2 }}>
          {alt}
        </Box>
      )}
    </Box>
  );
};

export default SayiKutusu;
