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
