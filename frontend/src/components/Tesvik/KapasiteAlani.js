import React, { useState } from 'react';
import { TextField } from '@mui/material';
import { kapasiteCoz, kapasiteYaz } from '../../utils/urunKapasite';

/** Ham yazıyı odak boyunca korur; onDegis form değerini number | '' olarak alır. */
export default function KapasiteAlani({ value, onDegis, sifirGizle = false, ...props }) {
  const [yazi, setYazi] = useState(null);
  const sayi = kapasiteCoz(value);
  const gorunum = sifirGizle && sayi === 0 ? '' : kapasiteYaz(sayi);

  return (
    <TextField
      {...props}
      type="text"
      value={yazi !== null ? yazi : gorunum}
      onFocus={(e) => {
        // "1.234" odak dışında 1234'tür; odakta "1234" olur. Böylece tek
        // nokta her zaman ondalık anlamına gelir ve yeniden girişte sayı değişmez.
        setYazi(sayi === 0 ? '' : kapasiteYaz(sayi, { gruplama: false }));
        if (props.onFocus) props.onFocus(e);
      }}
      onChange={(e) => {
        setYazi(e.target.value);
        onDegis(kapasiteCoz(e.target.value));
      }}
      onBlur={(e) => {
        setYazi(null);
        if (props.onBlur) props.onBlur(e);
      }}
      inputProps={{ inputMode: 'decimal', ...(props.inputProps || {}) }}
    />
  );
}
