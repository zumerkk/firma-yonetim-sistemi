// 📄 Belge bilgileri gösterim yardımcıları (eski + yeni teşvik detayları ortak kullanır)
//
// İki müşteri şikayetini kapatır:
//  • "Belge ile bilgilerde OECD (Orta-Yüksek) görünmüyor"
//    → Eski form açıklama metnini, yeni form 'OECD_001' gibi sentetik kodu aynı alana yazıyordu.
//      Detayda ham değer basıldığı için kullanıcı ya kodu görüyordu ya hiçbir şey.
//  • "Kararname Tarih/Sayı kısmı da boş görünüyor"
//    → Eski detay `kunyeBilgileri.dayandigiKanun` yolundan okuyordu; şemada böyle bir alan yok
//      (değer `belgeYonetimi.dayandigiKanun`'a yazılıyor), bu yüzden her zaman '-' çıkıyordu.

import { useEffect, useState, useCallback } from 'react';
import api from './axios';

// OECD kodu → açıklama haritasını bir kez çekip çözümleyici döndürür.
// Değer zaten açıklama metniyse olduğu gibi gösterilir (eski formdan gelen kayıtlar).
export const useOecdEtiket = () => {
  const [kodMap, setKodMap] = useState({});

  useEffect(() => {
    let iptal = false;
    api.get('/oecd-kategori')
      .then((res) => {
        if (iptal || !res.data?.success) return;
        const map = {};
        (res.data.data || []).forEach((k) => { if (k?.kod) map[String(k.kod)] = k.aciklama || ''; });
        setKodMap(map);
      })
      .catch(() => { /* lookup yoksa ham değer gösterilir */ });
    return () => { iptal = true; };
  }, []);

  return useCallback((deger) => {
    const ham = String(deger || '').trim();
    if (!ham) return '-';
    return kodMap[ham] || ham;
  }, [kodMap]);
};

// Kararname Tarih/Sayı: önce formların yazdığı alan, yoksa künyedeki tarih + sayı ikilisi.
export const kararnameGoster = (tesvik) => {
  const kanun = String(tesvik?.belgeYonetimi?.dayandigiKanun || '').trim();
  if (kanun) return kanun;

  const kunye = tesvik?.kunyeBilgileri || {};
  const tarih = kunye.kararTarihi ? new Date(kunye.kararTarihi).toLocaleDateString('tr-TR') : '';
  const sayi = String(kunye.kararSayisi || '').trim();
  const birlesik = [tarih, sayi].filter(Boolean).join(' - ');
  return birlesik || '-';
};
