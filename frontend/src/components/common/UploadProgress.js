// 📤 Ortak dosya yükleme göstergesi
// Müşteri: "Dosya yüklenirken bir yükleniyor olduğuna dair bir yükleme işareti vs.
// bir şey koyabilir miyiz, yükleniyor mu internette mi sorun var anlaşılmıyor."
//
// İki fazı ayırır — bu ayrım kritik: yüzde %100'e ulaştıktan sonra sunucu tarafı
// işleme (Cloudinary'e yazma, Excel parse, AI analizi) sürüyor. Tek fazlı bir bar
// %100'de "donmuş" görünür ve aynı şikayeti tekrar üretir.
//   1) Yükleniyor  → gerçek yüzde (onUploadProgress'ten)
//   2) İşleniyor   → belirsiz (indeterminate) bar + açıklayıcı metin

import React from 'react';
import { Box, LinearProgress, Typography } from '@mui/material';

const mb = (bayt) => (bayt / (1024 * 1024)).toFixed(1);

const UploadProgress = ({ active, pct, loaded, total, fileName, index, count, sx }) => {
  if (!active) return null;

  // pct null ise (total bilinmiyor) veya %100'e ulaştıysa → "işleniyor" fazı
  const yuzdeVar = typeof pct === 'number' && pct < 100;
  const sirali = count > 1 && index ? `${index}/${count} · ` : '';

  return (
    <Box sx={{ mt: 1.5, mb: 1, ...sx }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', mb: 0.5, gap: 1 }}>
        <Typography variant="caption" sx={{ color: '#475569', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {sirali}{yuzdeVar ? 'Yükleniyor' : 'Sunucuda işleniyor'}
          {fileName ? ` — ${fileName}` : ''}
        </Typography>
        {yuzdeVar && (
          <Typography variant="caption" sx={{ color: '#64748b', whiteSpace: 'nowrap' }}>
            %{pct}{total ? ` · ${mb(loaded)}/${mb(total)} MB` : ''}
          </Typography>
        )}
      </Box>
      <LinearProgress
        variant={yuzdeVar ? 'determinate' : 'indeterminate'}
        value={yuzdeVar ? pct : undefined}
        sx={{ height: 6, borderRadius: 3 }}
      />
    </Box>
  );
};

export default UploadProgress;
