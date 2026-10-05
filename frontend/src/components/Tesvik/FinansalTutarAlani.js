// 💰 Finansal tablo tutar alanı (belge ekleme / revize formları)
//
// Müşteri (05.10.2026): "revizelerde finansal tabloyu düzenlerken virgül koydurmuyor o yüzden
// tutarlar farklı yapışıyor" — "virgül olmayacaksa bile yukarıya yuvarlasın".
// Eskiden alan her tuşta rakam dışını atıyordu: E-TUYS'ten "76.588.704,44" yapıştırınca
// 7.658.870.444 oluyordu. Artık odaktayken yazılan metin olduğu gibi kalır (virgül yazılabilir),
// değer her değişimde kuruşu yukarı yuvarlanmış tam sayı olarak üst bileşene gider; odaktan
// çıkınca binlik noktalı gösterilir. Değerler tam sayı kaldığı için toplamlar, PDF ve E-TUYS
// karşılaştırması eskisi gibi çalışır.

import React, { useState } from 'react';
import { TextField } from '@mui/material';
import { tutarYukariYuvarla, yazarkenBicimle } from '../../utils/sayiFormat';

/**
 * @param value     formdaki ham değer (sayı, rakam dizisi ya da '')
 * @param onDegis   (v: number | '') => void
 * @param sifirGizle 0 değerini boş göster (İthal $ / Makine TL alanları böyleydi)
 */
export default function FinansalTutarAlani({ value, onDegis, sifirGizle = false, ...props }) {
  const [yazi, setYazi] = useState(null); // null = odakta değil

  const gorunum = (sifirGizle && Number(value) === 0) ? '' : yazarkenBicimle(value);

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
        onDegis(tutarYukariYuvarla(e.target.value));
      }}
      onBlur={(e) => {
        setYazi(null);
        if (props.onBlur) props.onBlur(e);
      }}
      inputProps={{ inputMode: 'decimal', ...(props.inputProps || {}) }}
    />
  );
}
