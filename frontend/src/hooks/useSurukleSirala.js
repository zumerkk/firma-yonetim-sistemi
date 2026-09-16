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
//
// Performans (15.09.2026): İşlem & Evrak'ta 35 satırlık listede her tuş vuruşu ~120 ms
// sürüyordu (müşteri: "Maili düzenlerken donmalar yaşıyoruz ... yazdıklarımızın geç
// görünmesi"). Satırlar React.memo ile sarıldı; memo'nun işe yaraması için `satirProps(i)`
// aynı satıra AYNI nesneyi döndürmeli. Bu yüzden liste, geri çağrı ve hedef ref'te duruyor;
// bir satırın nesnesi yalnız o satırın sürükleme görünümü değişince yeniden üretiliyor.

import { useCallback, useLayoutEffect, useRef, useState } from 'react';
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
  // İşleyiciler her zaman GÜNCEL liste ve geri çağrıyla çalışır, ama kimlikleri değişmez
  const listeRef = useRef(liste);
  const onChangeRef = useRef(onChange);
  const hedefRef = useRef(hedef);
  useLayoutEffect(() => {
    listeRef.current = liste;
    onChangeRef.current = onChange;
    hedefRef.current = hedef;
  });
  // index → { anahtar, props }: anahtar satırın sürükleme görünümünü özetler
  const onbellekRef = useRef(new Map());

  const bitir = useCallback(() => {
    kaynakRef.current = null;
    setSurukleniyor(null);
    setHedef(null);
  }, []);

  const satirProps = useCallback((index) => {
    const soluk = surukleniyor === index;
    const hedefCizgisi = hedef === index && surukleniyor !== index;
    const anahtar = `${soluk ? 1 : 0}${hedefCizgisi ? 1 : 0}`;
    const kayitli = onbellekRef.current.get(index);
    if (kayitli && kayitli.anahtar === anahtar) return kayitli.props;

    const props = {
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
        if (hedefRef.current !== index) {
          hedefRef.current = index; // dragover saniyede onlarca kez gelir; render'ı beklemeden işaretle
          setHedef(index);
        }
      },
      onDrop: (e) => {
        e.preventDefault();
        const kaynak = kaynakRef.current ?? Number(e.dataTransfer.getData('text/plain'));
        if (Number.isInteger(kaynak) && kaynak !== index) {
          onChangeRef.current(tasiKonuma(listeRef.current, kaynak, index));
        }
        bitir();
      },
      onDragEnd: bitir,
      // Görsel geri bildirim: sürüklenen satır soluk, hedef satır çizgili
      style: {
        opacity: soluk ? 0.4 : 1,
        borderTop: hedefCizgisi ? '2px solid #2563eb' : '2px solid transparent',
        cursor: 'grab'
      }
    };
    onbellekRef.current.set(index, { anahtar, props });
    return props;
  }, [surukleniyor, hedef, bitir]);

  return { satirProps, surukleniyor, hedef };
}
