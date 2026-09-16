// 🔤 DOSYA ADI KODLAMASI — latin1 okunmuş UTF-8 adları onarır
//
// Müşteri (16.09.2026, İşlem & Evrak → Firmadan Gelen Evraklar): listede dosya adları
// "GÃ¼ncel Ä°mza SirkÃ¼leri.pdf" gibi görünüyor.
//
// Sebep: multer (busboy) çok parçalı istekteki dosya adını latin1 olarak çözüyor. Firmanın
// gönderdiği "Güncel İmza Sirküleri.pdf" adının UTF-8 baytları (C3 BC…) tek tek karaktere
// çevrildiği için ad bozuluyor. Baytlar kaybolmuyor; latin1'e geri yazıp UTF-8 okuyunca ad
// birebir geri geliyor.
//
// Onarım yalnızca GÜVENLİ olduğunda yapılır: çevrimden geçersiz karakter (U+FFFD) çıkarsa ya da
// metin zaten doğruysa ada dokunulmaz. Böylece "Güncel" gibi hâlihazırda düzgün adlar bozulmaz.

// Bozulmuş adların izi: Ã/Ä/Å ardından üst-aralık bir karakter ("Ã¼", "Ä°", "ÅŸ" …)
const BOZUK_IZ = /[ÃÄÅ][-¿‘’‚“”ŒœŠšŽžŸˆ˜…]/;

/**
 * @param {string} ad  Yüklemeden gelen (ya da kayıtta duran) dosya adı
 * @returns {string}   Onarılmış ad; onarım güvenli değilse adın kendisi
 */
function dosyaAdiDuzelt(ad) {
  const metin = String(ad == null ? '' : ad);
  if (!metin || !BOZUK_IZ.test(metin)) return metin;
  try {
    const onarilmis = Buffer.from(metin, 'latin1').toString('utf8');
    // Çevrim bozuk bayt üretmişse (U+FFFD) ya da hiç değişmemişse orijinali koru
    if (!onarilmis || onarilmis.includes('�') || onarilmis === metin) return metin;
    return onarilmis;
  } catch (_) {
    return metin;
  }
}

/** Kayıttaki adın onarıma ihtiyacı var mı (migrasyon ve testler için) */
const dosyaAdiBozukMu = (ad) => dosyaAdiDuzelt(ad) !== String(ad == null ? '' : ad);

module.exports = { dosyaAdiDuzelt, dosyaAdiBozukMu, BOZUK_IZ };
