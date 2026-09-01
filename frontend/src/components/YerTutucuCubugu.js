// 🏷️ Mail şablonu yer tutucu çubuğu
//
// Müşteri: "mail düzenlerken bunları manuel eklememiz gerekiyor ama arkadaşlara
// biraz kafa karıştırıcı geldi, daha kolay yükleme yolu bulabilir miyiz acaba?"
//
// Önceden yer tutucular yalnızca helperText'te LİSTELENİYORDU; kullanıcı
// "{firmaAdi}" yazmayı kendi hatırlamak, süslü parantezleri doğru yazmak ve
// hangisinin ne olduğunu bilmek zorundaydı. Artık tıklanabilir rozetler var:
// imleç neredeyse oraya ekliyor, üzerine gelince ne yaptığını söylüyor.

import React from 'react';
import { Box, Stack, Chip, Typography, Tooltip } from '@mui/material';

// Yer tutucu → insanın anlayacağı açıklama
export const YER_TUTUCU_ACIKLAMA = {
  '{firmaAdi}': 'Firmanın unvanı',
  '{islemAdi}': 'İşlem türünün adı (ör. ETUYS Yetkilendirme)',
  '{varyant}': 'Seçili varyant (Şahıs / Şirket)',
  '{evrakListesi}': 'İşaretli evrakların numaralı listesi',
  '{uploadLink}': 'Firmanın evrak yükleyeceği kişiye özel bağlantı',
  '{formLink}': 'Firmaya göre ön-doldurulmuş Google Form bağlantısı',
  '{imza}': 'Kurum imzası',
  '{tarih}': 'Bugünün tarihi'
};

/**
 * Metin alanının altına tıklanabilir yer tutucu rozetleri koyar.
 *
 * @param {string[]} placeholders  gösterilecek yer tutucular
 * @param {object}   inputRef      hedef TextField'ın inputRef'i (imleç konumu için)
 * @param {string}   deger         alanın güncel değeri
 * @param {Function} onChange      yeni değeri alan geri çağırım
 * @param {string}   etiket        soldaki kısa açıklama
 */
const YerTutucuCubugu = ({ placeholders = [], inputRef, deger = '', onChange, etiket = 'Ekle:' }) => {
  const ekle = (yerTutucu) => {
    const el = inputRef?.current;
    const metin = String(deger ?? '');
    // İmleç bilinmiyorsa (alana hiç tıklanmadıysa) sona ekle — sessizce başa
    // eklemek kullanıcıyı şaşırtıyor.
    const bas = el && typeof el.selectionStart === 'number' ? el.selectionStart : metin.length;
    const son = el && typeof el.selectionEnd === 'number' ? el.selectionEnd : metin.length;
    const yeni = metin.slice(0, bas) + yerTutucu + metin.slice(son);
    onChange(yeni);

    // React değeri yazdıktan sonra imleci eklenenin ardına al
    if (el) {
      const konum = bas + yerTutucu.length;
      requestAnimationFrame(() => {
        el.focus();
        try { el.setSelectionRange(konum, konum); } catch { /* eski tarayıcı */ }
      });
    }
  };

  if (!placeholders.length) return null;

  return (
    <Box sx={{ mt: 0.5 }}>
      <Stack direction="row" spacing={0.5} alignItems="center" flexWrap="wrap" useFlexGap>
        <Typography variant="caption" sx={{ color: '#64748b', mr: 0.5 }}>{etiket}</Typography>
        {placeholders.map((p) => (
          <Tooltip key={p} title={YER_TUTUCU_ACIKLAMA[p] || p} arrow>
            <Chip
              label={p}
              size="small"
              variant="outlined"
              onClick={() => ekle(p)}
              sx={{
                fontFamily: 'monospace', fontSize: '0.68rem', height: 22,
                cursor: 'pointer', borderColor: '#cbd5e1',
                '&:hover': { bgcolor: '#eff6ff', borderColor: '#3b82f6' }
              }}
            />
          </Tooltip>
        ))}
      </Stack>
    </Box>
  );
};

export default YerTutucuCubugu;
