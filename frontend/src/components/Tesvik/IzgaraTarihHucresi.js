// 📅 IZGARA TARİH HÜCRESİ - makine listelerindeki Talep/Karar tarihleri
//
// Müşteri (11 Eylül 2026):
//   "Tarih girerken sürekli başa atıyor yazamıyoruz niyeyse"
//   "talep ve karar tarihine kopyala yapıştır yapılmıyor"
//
// İKİ AYRI HATA VARDI, ikisi de aynı kalıptan geliyordu:
//
// 1) Hücre bileşeni DataGrid'in `renderCell` fonksiyonunun İÇİNDE tanımlanmıştı.
//    Her render'da yeni bir bileşen TİPİ üretiliyor; React bunu farklı bir bileşen
//    sayıp eskisini söküyor, yenisini kuruyor. Input'un DOM düğümü gittiği için
//    odak kayboluyor ve imleç başa dönüyordu — kullanıcı tarihi yazamıyordu.
//
// 2) `onChange` HER TUŞ VURUŞUNDA sunucuya yazıyordu. type="date" alanında bu,
//    yarım kalmış tarihlerle (ör. "0031-05-20") ard arda istek demek; her yanıt
//    yeni bir render tetikleyip 1. maddeyi besliyordu. Kısır döngü.
//
// Çözüm: bileşen modül düzeyinde (tipi sabit), yazarken yalnız yerel state
// güncelleniyor, sunucuya yazma ALANDAN ÇIKINCA (blur) veya Enter'da bir kez
// yapılıyor. Yapıştırma da aynı yerde çözülüyor.

import React, { useEffect, useRef, useState } from 'react';
import { TextField } from '@mui/material';
import { createDatePasteHandler } from '../../utils/dateUtils';

// ISO/Date → <input type="date"> biçimi (yyyy-mm-dd).
// new Date().toISOString() saat dilimine göre bir gün kaydırabildiği için
// zaten doğru biçimdeki metin olduğu gibi bırakılıyor.
export const tarihiGirdiyeCevir = (deger) => {
  if (!deger) return '';
  try {
    if (typeof deger === 'string' && deger.length === 10 && deger.includes('-')) return deger;
    return new Date(deger).toISOString().slice(0, 10);
  } catch {
    return '';
  }
};

/**
 * @param {string|Date} deger      Kayıttaki tarih
 * @param {function}    onKaydet   async (isoTarih) => void — yalnız DEĞİŞİKLİK varsa çağrılır
 * @param {boolean}     disabled
 */
export default function IzgaraTarihHucresi({ deger, onKaydet, disabled = false, sx }) {
  const dis = tarihiGirdiyeCevir(deger);
  const [yerel, setYerel] = useState(dis);
  // Son kaydedilen değer: gereksiz ağ isteği atmamak için kıyas noktası
  const sonKaydedilen = useRef(dis);

  // Dıştan gelen değer değişirse (ör. toplu işlem) yereli tazele.
  // Kullanıcı o an yazıyorsa yazdığını ezmemek için yalnızca gerçekten
  // farklıysa ve odak bizde değilse güncelliyoruz.
  const inputRef = useRef(null);
  useEffect(() => {
    if (document.activeElement === inputRef.current) return;
    setYerel(dis);
    sonKaydedilen.current = dis;
  }, [dis]);

  const kaydet = async (yeni) => {
    if (yeni === sonKaydedilen.current) return;   // değişmemiş, sunucuya gitme
    sonKaydedilen.current = yeni;
    await onKaydet(yeni);
  };

  return (
    <TextField
      type="date"
      size="small"
      sx={sx}
      inputRef={inputRef}
      InputLabelProps={{ shrink: true }}
      disabled={disabled}
      value={yerel}
      // Yazarken yalnız yerel state — sunucuya gitmiyoruz
      onChange={(e) => setYerel(e.target.value)}
      // Alandan çıkınca tek sefer yaz
      onBlur={() => kaydet(yerel)}
      onKeyDown={(e) => {
        if (e.key === 'Enter') { e.preventDefault(); e.target.blur(); }
        // Esc: yazılanı iptal et, son kaydedilene dön
        if (e.key === 'Escape') { setYerel(sonKaydedilen.current); e.target.blur(); }
      }}
      inputProps={{
        // "31.05.2027" gibi metin yapıştırılabilsin; type="date" bunu tek başına yutar
        onPaste: createDatePasteHandler((iso) => { setYerel(iso); kaydet(iso); })
      }}
    />
  );
}
