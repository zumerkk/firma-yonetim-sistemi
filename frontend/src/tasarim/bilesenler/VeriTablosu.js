// 📊 VERİ TABLOSU — ETUYS liste kalıbı
//
// Kurallar (etuys/ referansından):
//   • gri başlık, ince çizgi, ZEBRA YOK
//   • taşan metin kırpılır (…), satır yüksekliği sabit kalır
//   • sayılar sağa yaslı ve tabular-nums — sütunda hizalanır
//   • seçili satır SARI (hesaplanan alanla aynı sarı: "sistem işaretledi")
//   • geniş tablo kendi kabında yatay kayar, sayfa yana kaymaz

import React from 'react';
import { Box } from '@mui/material';
import { renk, yazi, stil } from '../jetonlar';

/**
 * @param {Array}  sutunlar  [{ anahtar, baslik, sayi?, genislik?, bicim? }]
 *   bicim: (deger, satir, index) => node — index, "Şart 3" gibi sıralı
 *   yedek metinler için gerekiyor (ham tablolarda kullanılıyordu).
 * @param {Array}  satirlar  veri dizisi
 * @param {func}   anahtarAl (satir, i) => benzersiz anahtar
 * @param {func}   seciliMi  (satir) => boolean
 * @param {func}   onSatirTik
 * @param {number} enAzGenislik  yatay kaydırma eşiği
 * @param {string} bosMetin
 */
const VeriTablosu = ({
  sutunlar = [],
  satirlar = [],
  anahtarAl = (s, i) => s?.id ?? s?._id ?? i,
  seciliMi = () => false,
  onSatirTik = null,
  enAzGenislik = 0,
  bosMetin = 'Gösterilecek kayıt yok'
}) => (
  <Box sx={{ overflowX: 'auto' }}>
    <Box
      component="table"
      sx={{
        width: '100%',
        borderCollapse: 'collapse',
        fontSize: `${yazi.govde}px`,
        ...(enAzGenislik ? { minWidth: enAzGenislik } : {})
      }}
    >
      <Box component="thead">
        <Box component="tr">
          {sutunlar.map((s) => (
            <Box
              key={s.anahtar}
              component="th"
              sx={{ ...stil.tabloBasligi, ...(s.sayi ? { textAlign: 'right' } : {}), ...(s.genislik ? { width: s.genislik } : {}) }}
            >
              {s.baslik}
            </Box>
          ))}
        </Box>
      </Box>

      <Box component="tbody">
        {satirlar.length === 0 && (
          <Box component="tr">
            <Box
              component="td"
              colSpan={sutunlar.length}
              sx={{ ...stil.tabloHucresi, textAlign: 'center', color: renk.sessiz, py: 3, maxWidth: 'none' }}
            >
              {bosMetin}
            </Box>
          </Box>
        )}

        {satirlar.map((satir, i) => {
          const secili = seciliMi(satir);
          return (
            <Box
              key={anahtarAl(satir, i)}
              component="tr"
              onClick={onSatirTik ? () => onSatirTik(satir) : undefined}
              sx={{
                cursor: onSatirTik ? 'pointer' : 'default',
                backgroundColor: secili ? renk.hesapZemin : 'transparent',
                '&:hover td': { backgroundColor: secili ? renk.hesapZemin : renk.yuzeyAlt }
              }}
            >
              {sutunlar.map((s) => (
                <Box
                  key={s.anahtar}
                  component="td"
                  sx={{
                    ...stil.tabloHucresi,
                    ...(s.sayi ? { textAlign: 'right', fontVariantNumeric: 'tabular-nums' } : {})
                  }}
                >
                  {s.bicim ? s.bicim(satir[s.anahtar], satir, i) : satir[s.anahtar]}
                </Box>
              ))}
            </Box>
          );
        })}
      </Box>
    </Box>
  </Box>
);

export default VeriTablosu;
