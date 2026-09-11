// 🖱️ SÜRÜKLE-BIRAK SIRALAMA
//
// Müşteri: "Birde bu sıralamada tutup sürükleyemez miyiz mesela yeni evrak
// ekleyince en alta ekliyor 30 kere yukarı oka tıklamamız gerekiyor."
//
// Yukarı/aşağı okları duruyor (klavye ve küçük düzeltmeler için iyiler), ama
// 35 kalemlik ETUYS listesinde bir satırı başa çekmek 34 tıklama demekti.
//
// Tarayıcının YERLEŞİK HTML5 sürükle-bırak API'si kullanılıyor; yeni bağımlılık
// eklenmedi. Dikey bir liste için fazlası gerekmiyor — react-beautiful-dnd gibi
// bir kütüphane ~30 KB ve kendi tuhaflıklarını getiriyor.

import { useCallback, useRef, useState } from 'react';
import { tasiKonuma } from '../utils/dizi';

/**
 * @param {Array} liste      sıralanacak dizi
 * @param {function} onChange yeni diziyi alan callback
 * @returns {{ satirProps: function, surukleniyor: number|null, hedef: number|null }}
 *
 * Kullanım:
 *   const { satirProps, surukleniyor, hedef } = useSurukleSirala(evraklar, onChange);
 *   <Box {...satirProps(i)}>…</Box>
 */
export default function useSurukleSirala(liste, onChange) {
  const [surukleniyor, setSurukleniyor] = useState(null);
  const [hedef, setHedef] = useState(null);
  // Bazı tarayıcılarda dataTransfer okuması dragover sırasında boş döner;
  // kaynak indeksi ref'te tutmak güvenilir.
  const kaynakRef = useRef(null);

  const bitir = useCallback(() => {
    kaynakRef.current = null;
    setSurukleniyor(null);
    setHedef(null);
  }, []);

  const satirProps = useCallback((index) => ({
    draggable: true,
    onDragStart: (e) => {
      kaynakRef.current = index;
      setSurukleniyor(index);
      // Firefox sürüklemeyi başlatmak için veri yazılmasını şart koşuyor
      try { e.dataTransfer.setData('text/plain', String(index)); } catch (_) { /* yoksay */ }
      e.dataTransfer.effectAllowed = 'move';
    },
    onDragOver: (e) => {
      // preventDefault olmadan tarayıcı bırakmaya izin vermez
      e.preventDefault();
      e.dataTransfer.dropEffect = 'move';
      if (hedef !== index) setHedef(index);
    },
    onDrop: (e) => {
      e.preventDefault();
      const kaynak = kaynakRef.current ?? Number(e.dataTransfer.getData('text/plain'));
      if (Number.isInteger(kaynak) && kaynak !== index) {
        onChange(tasiKonuma(liste, kaynak, index));
      }
      bitir();
    },
    onDragEnd: bitir,
    // Görsel geri bildirim: sürüklenen satır soluk, hedef satır çizgili
    style: {
      opacity: surukleniyor === index ? 0.4 : 1,
      borderTop: hedef === index && surukleniyor !== index ? '2px solid #2563eb' : '2px solid transparent',
      cursor: 'grab'
    }
  }), [liste, onChange, surukleniyor, hedef, bitir]);

  return { satirProps, surukleniyor, hedef };
}
