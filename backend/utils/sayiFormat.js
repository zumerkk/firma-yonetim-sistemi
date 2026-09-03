// 🔢 TÜRKÇE SAYI PARSE/FORMAT — TEK KAYNAK
//
// Neden burada toplandı: aynı iş üç ayrı yerde üç ayrı şekilde yapılıyordu ve
// ikisi hatalıydı. tesvikImportController + eskiTesvikImportController'daki
// cleanTurkishNumber, "en az iki nokta varsa binlik ayıraçtır" varsayıyordu:
//
//   "250.000"    → 250        (1000 kat küçüldü — 18 milyon 18 bin görünüyordu)
//   "1.500"      → 1.5        (1000 kat küçüldü)
//   "18,000,000" → 0          (replace(',', '.') global değil → NaN)
//
// Doğru mantık MakineListeIngestor.toNumber'da zaten vardı: ayıracın hangi
// karakter olduğuna değil, EN SONDA hangisinin geldiğine bakılır.
//   "1.234,56" → virgül sonda → TR  (nokta binlik, virgül ondalık)
//   "1,234.56" → nokta sonda  → EN  (virgül binlik, nokta ondalık)
// Tek ayıraç varsa grup uzunluğuna bakılır: "1.234" (3 hane) binlik,
// "1.23" / "1.2345" ondalık.

// Tek başına bir ayıracın binlik olup olmadığı: ayıraçtan sonrası tam 3 hane
// ve birden fazla grup varsa ("1.234.567") kesin binlik. Tek grupta ("1.234")
// da binlik kabul edilir — para alanlarında "bir virgül iki üç dört" yazımı
// pratikte yok, "bin iki yüz otuz dört" var.
const TEK_AYRAC_BINLIK = /^-?\d{1,3}(?:[.,]\d{3})+$/;

/**
 * Türkçe veya İngilizce formatlı sayı metnini güvenle sayıya çevirir.
 * Zaten sayı olan değerler dokunulmadan döner.
 * Çevrilemeyen değerler için `varsayilan` (öntanımlı 0) döner.
 */
const sayiyaCevir = (deger, varsayilan = 0) => {
  if (deger === null || deger === undefined || deger === '') return varsayilan;
  if (typeof deger === 'number') return Number.isFinite(deger) ? deger : varsayilan;

  // Para birimi simgeleri, boşluk, NBSP gibi süsleri at; rakam/ayıraç/eksi kalsın
  let s = String(deger).trim().replace(/[^\d.,-]/g, '');
  if (s === '' || s === '-') return varsayilan;

  const sonVirgul = s.lastIndexOf(',');
  const sonNokta = s.lastIndexOf('.');

  if (sonVirgul !== -1 && sonNokta !== -1) {
    // İki ayıraç birden: sonda gelen ondalıktır
    s = sonVirgul > sonNokta
      ? s.replace(/\./g, '').replace(/,/g, '.') // TR: 1.234.567,89
      : s.replace(/,/g, '');                    // EN: 1,234,567.89
  } else if (sonVirgul !== -1) {
    // Yalnız virgül: "1,234,567" binlik / "10,5" ondalık
    s = TEK_AYRAC_BINLIK.test(s) ? s.replace(/,/g, '') : s.replace(/,/g, '.');
  } else if (sonNokta !== -1) {
    // Yalnız nokta: "1.234.567" ve "250.000" binlik / "10.5" ondalık
    if (TEK_AYRAC_BINLIK.test(s)) s = s.replace(/\./g, '');
  }

  const n = Number(s);
  return Number.isFinite(n) ? n : varsayilan;
};

/** Tam sayıya çevirir (kuruş atılır) — adet, kişi sayısı gibi alanlar için. */
const tamSayiyaCevir = (deger, varsayilan = 0) => {
  const n = sayiyaCevir(deger, varsayilan);
  return Number.isFinite(n) ? Math.round(n) : varsayilan;
};

/**
 * Sayıyı tr-TR biçiminde metne çevirir: binlik NOKTA, ondalık VİRGÜL.
 * Ekranda/Excel'de/PDF'te gösterilen her sayı buradan geçmeli — 'en-US' ya da
 * locale'siz toLocaleString() kullanılırsa çıktı tarayıcının diline göre
 * değişiyor ve aynı ekran farklı bilgisayarda virgüllü görünüyordu.
 */
const sayiYaz = (deger, { ondalik = 0 } = {}) => {
  const n = sayiyaCevir(deger, NaN);
  if (!Number.isFinite(n)) return '';
  return n.toLocaleString('tr-TR', {
    minimumFractionDigits: ondalik,
    maximumFractionDigits: ondalik
  });
};

module.exports = { sayiyaCevir, tamSayiyaCevir, sayiYaz };
