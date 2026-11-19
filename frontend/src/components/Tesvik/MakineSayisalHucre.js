import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { useGridApiContext } from '@mui/x-data-grid';
import { sayiCoz } from '../../utils/makineSablonu';

export default function MakineSayisalHucre({ id, field, value, hasFocus, colDef, onTaslak }) {
  const apiRef = useGridApiContext();
  const inputRef = useRef(null);
  const [metin, setMetin] = useState(String(value ?? ''));

  useLayoutEffect(() => {
    if (hasFocus) inputRef.current?.focus();
  }, [hasFocus]);

  useEffect(() => () => onTaslak?.(null), [onTaslak]);

  return (
    <input
      ref={inputRef}
      type="text"
      inputMode="decimal"
      aria-label={colDef.description || colDef.headerName}
      value={metin}
      onChange={(event) => {
        const yeniMetin = event.target.value;
        const sayi = sayiCoz(yeniMetin);
        setMetin(yeniMetin);
        apiRef.current.setEditCellValue({ id, field, value: sayi }, event);
        onTaslak?.({ id, field, value: sayi });
      }}
      style={{ width: '100%', height: '100%', boxSizing: 'border-box', border: 0, padding: '0 4px', textAlign: 'right', font: 'inherit' }}
    />
  );
}
