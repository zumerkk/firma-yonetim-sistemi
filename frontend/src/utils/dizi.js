// 🔃 Dizi sıralama yardımcıları
//
// Müşteri: "Birde istenen evrakları sıralayabilelim önem sırasına vs göre."
// Ayrı bir siraNo alanına gerek yok: istenen evrak listesi baştan sona DİZİ
// SIRASINI koruyor — kosullaSuz filtreliyor ama sırayı bozmuyor, mailOlustur da
// `map((e, i) => `${i+1}. ...`)` ile diziyi numaralandırıyor. Dolayısıyla
// diziyi yeniden sıralamak yeterli; şema değişmiyor, eski kayıtlar etkilenmiyor.

/**
 * Bir elemanı dizide bir basamak yukarı/aşağı taşır.
 * Sınırların dışına çıkacaksa dizi aynen döner (buton pasif olmasa da veri bozulmaz).
 *
 * @param {Array} dizi   kaynak dizi (değiştirilmez, yenisi döner)
 * @param {number} index taşınacak elemanın konumu
 * @param {-1|1} yon     -1 yukarı, +1 aşağı
 */
export const tasi = (dizi, index, yon) => {
  const liste = Array.isArray(dizi) ? dizi : [];
  const hedef = index + yon;
  if (index < 0 || index >= liste.length || hedef < 0 || hedef >= liste.length) return liste;
  const kopya = [...liste];
  [kopya[index], kopya[hedef]] = [kopya[hedef], kopya[index]];
  return kopya;
};

/**
 * Bir elemanı dizide başka bir KONUMA taşır (sürükle-bırak için).
 *
 * Müşteri: "Birde bu sıralamada tutup sürükleyemez miyiz mesela yeni evrak
 * ekleyince en alta ekliyor 30 kere yukarı oka tıklamamız gerekiyor."
 *
 * `tasi` komşu takasla çalışır (tek basamak); burada eleman ÇIKARILIP hedefe
 * yerleştiriliyor — aradaki elemanların göreli sırası korunuyor. 35 kalemlik bir
 * listede ilk sıraya çekmek tek hareket.
 *
 * @param {Array} dizi
 * @param {number} kaynak  taşınacak elemanın konumu
 * @param {number} hedef   bırakılacağı konum
 */
export const tasiKonuma = (dizi, kaynak, hedef) => {
  const liste = Array.isArray(dizi) ? dizi : [];
  if (kaynak === hedef) return liste;
  if (kaynak < 0 || kaynak >= liste.length) return liste;
  if (hedef < 0 || hedef >= liste.length) return liste;
  const kopya = [...liste];
  const [eleman] = kopya.splice(kaynak, 1);
  kopya.splice(hedef, 0, eleman);
  return kopya;
};
