// 🔽 MUI Select — kayıtlı değer seçeneklerle yazım farkıyla uyuşmasa da GÖRÜNÜR
//
// Müşteri (22.09.2026): "Revize yaparken seçili olan kısımların bazıları görünmüyor ama destek sınıfı-cinsi vs."
// MUI Select, değer hiçbir MenuItem'in değerine birebir eşit değilse kutuyu boş gösterir. Belgelerdeki
// değerler E-TUYS'tan farklı yazımla geliyor (bkz. utils/secenekEsle). Bu sarmalayıcı:
//   · birebir eşleşme varsa HİÇBİR ŞEY değiştirmez;
//   · yazım farkıyla eşleşen seçenek varsa onu kayıtlı değerle seçili gösterir (etiketi seçeneğin);
//   · hiç eşleşme yoksa kayıtlı değeri ayrı bir seçenek olarak ekler — değer asla gizlenmez.
// Kayıt DEĞİŞMEZ: kullanıcı başka bir seçenek seçmedikçe form aynı değeri geri yazar.

import React from 'react';
import { MenuItem, Select } from '@mui/material';
import { eslesenSecenek } from '../../utils/secenekEsle';

// MenuItem içeriğindeki düz metin ("2929 - DİĞER…" gibi etiketler Box/Typography içinde olabilir)
const metin = (dugum) => {
  if (dugum === null || dugum === undefined || typeof dugum === 'boolean') return '';
  if (typeof dugum === 'string' || typeof dugum === 'number') return String(dugum);
  if (Array.isArray(dugum)) return dugum.map(metin).join(' ');
  if (React.isValidElement(dugum)) return metin(dugum.props.children);
  return '';
};

/**
 * Kayıtlı değer seçeneklerde birebir yoksa seçenek listesini ona göre düzeltir.
 * TextField'ın select biçimi için de kullanılır (MUI içeride yine Select kullanır).
 * @returns {React.ReactNode} olduğu gibi ya da düzeltilmiş çocuklar
 */
export function kayitliSecenekler(value, children) {
  const deger = value === null || value === undefined ? '' : value;
  if (deger === '' || Array.isArray(deger)) return children;
  const ogeler = React.Children.toArray(children);
  const secenekler = ogeler.filter((o) => React.isValidElement(o) && o.props.value !== undefined && !o.props.disabled);
  if (secenekler.some((o) => o.props.value === deger)) return children;
  const i = eslesenSecenek(deger, secenekler, { deger: (o) => o.props.value, etiket: (o) => metin(o.props.children) });
  return i >= 0
    ? ogeler.map((o) => (o === secenekler[i] ? React.cloneElement(o, { value: deger }) : o))
    : [...ogeler, <MenuItem key="__kayitli-deger" value={deger}>{String(deger)}</MenuItem>];
}

const KayitliSecim = React.forwardRef(function KayitliSecim({ value, children, ...props }, ref) {
  const deger = value === null || value === undefined ? '' : value;
  return <Select ref={ref} value={deger} {...props}>{kayitliSecenekler(deger, children)}</Select>;
});

export default KayitliSecim;
