// 💰 Tutar girişi — Türkçe biçimde gösterir, sayı olarak döner
//
// Müşteri (29.09.2026): "sayı girme yeri gelsin otomatik noktaları-virgülleri düzgün ayırsın".
// Yazarken karışmasın diye biçimlendirme odaktan ÇIKINCA yapılır; kullanıcı yazarken ne
// yazdıysa onu görür. Hem "1.234,56" hem "1234.56" kabul edilir (sayiCoz).

import React, { useState } from 'react';
import { TextField, InputAdornment } from '@mui/material';
import { sayiCoz } from '../../utils/makineSablonu';

const bicimle = (v) => {
  const n = Number(v);
  if (!Number.isFinite(n) || n === 0) return '';
  return n.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

export default function TutarAlani({ value, onChange, label = 'Tutar', simge = '₺', ...props }) {
  const [yazi, setYazi] = useState(null);   // null = odakta değil, gösterim biçimli

  return (
    <TextField
      {...props}
      label={label}
      value={yazi !== null ? yazi : bicimle(value)}
      onFocus={() => setYazi(value ? String(value) : '')}
      onChange={(e) => {
        setYazi(e.target.value);
        onChange(sayiCoz(e.target.value) || 0);
      }}
      onBlur={() => setYazi(null)}
      inputProps={{ inputMode: 'decimal', ...(props.inputProps || {}) }}
      InputProps={{
        endAdornment: simge ? <InputAdornment position="end">{simge}</InputAdornment> : undefined,
        ...(props.InputProps || {})
      }}
    />
  );
}
