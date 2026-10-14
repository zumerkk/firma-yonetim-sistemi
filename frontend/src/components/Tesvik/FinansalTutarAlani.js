// Finansal tutarlar yazılırken ve kaydedilirken kuruşları korunur.
import React, { useState } from 'react';
import { TextField } from '@mui/material';
import { finansalTutarCoz, finansalTutarYaz } from '../../utils/sayiFormat';

/**
 * @param value     formdaki ham değer (sayı, rakam dizisi ya da '')
 * @param onDegis   (v: number | '') => void
 * @param sifirGizle 0 değerini boş göster (İthal $ / Makine TL alanları böyleydi)
 */
export default function FinansalTutarAlani({ value, onDegis, sifirGizle = false, ...props }) {
  const [yazi, setYazi] = useState(null); // null = odakta değil

  const gorunum = (sifirGizle && Number(value) === 0) ? '' : finansalTutarYaz(value);

  return (
    <TextField
      type="text"
      {...props}
      value={yazi !== null ? yazi : gorunum}
      onFocus={(e) => {
        setYazi(gorunum === '0' ? '' : gorunum);
        if (props.onFocus) props.onFocus(e);
      }}
      onChange={(e) => {
        setYazi(e.target.value);
        onDegis(finansalTutarCoz(e.target.value));
      }}
      onBlur={(e) => {
        setYazi(null);
        if (props.onBlur) props.onBlur(e);
      }}
      inputProps={{ inputMode: 'decimal', ...(props.inputProps || {}) }}
    />
  );
}
