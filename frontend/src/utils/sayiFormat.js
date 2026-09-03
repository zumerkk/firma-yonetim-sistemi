// 🔢 TÜRKÇE SAYI PARSE/FORMAT — TEK KAYNAK (frontend)
//
// backend/utils/sayiFormat.js'in aynası. CRA src/ dışından import edemediği
// için mantık iki yerde duruyor; birini değiştirirken diğerini de güncelleyin.
//
// Ekranda görünen her sayı buradan geçmeli. Daha önce üç farklı yol vardı:
//   toLocaleString('tr-TR')  → 18.000.000  (doğru)
//   toLocaleString('en-US')  → 18,000,000  (İthal/USD toplamlarında)
//   toLocaleString()         → tarayıcının diline göre değişiyor
// Son ikisi yüzünden aynı ekran farklı bilgisayarda farklı görünüyordu.

// Tek ayıracın binlik olup olmadığı: ayıraçtan sonrası tam 3 hane olmalı.
// "1.500" → binlik (1500), "10.5" / "1.23" → ondalık.
const TEK_AYRAC_BINLIK = /^-?\d{1,3}(?:[.,]\d{3})+$/;

/**
 * Türkçe veya İngilizce formatlı sayı metnini güvenle sayıya çevirir.
 * Ayıracın hangi karakter olduğuna değil, EN SONDA hangisinin geldiğine bakar:
 *   "1.234,56" → virgül sonda → TR → 1234.56
 *   "1,234.56" → nokta sonda  → EN → 1234.56
 */
export const sayiyaCevir = (deger, varsayilan = 0) => {
  if (deger === null || deger === undefined || deger === '') return varsayilan;
  if (typeof deger === 'number') return Number.isFinite(deger) ? deger : varsayilan;

  // ₺ $ boşluk NBSP gibi süsleri at; rakam/ayıraç/eksi kalsın
  let s = String(deger).trim().replace(/[^\d.,-]/g, '');
  if (s === '' || s === '-') return varsayilan;

  const sonVirgul = s.lastIndexOf(',');
  const sonNokta = s.lastIndexOf('.');

  if (sonVirgul !== -1 && sonNokta !== -1) {
    s = sonVirgul > sonNokta
      ? s.replace(/\./g, '').replace(/,/g, '.') // TR: 1.234.567,89
      : s.replace(/,/g, '');                    // EN: 1,234,567.89
  } else if (sonVirgul !== -1) {
    s = TEK_AYRAC_BINLIK.test(s) ? s.replace(/,/g, '') : s.replace(/,/g, '.');
  } else if (sonNokta !== -1) {
    if (TEK_AYRAC_BINLIK.test(s)) s = s.replace(/\./g, '');
  }

  const n = Number(s);
  return Number.isFinite(n) ? n : varsayilan;
};

/** Tam sayıya çevirir (kuruş atılır) — adet, kişi, m² gibi alanlar için. */
export const tamSayiyaCevir = (deger, varsayilan = 0) => {
  const n = sayiyaCevir(deger, varsayilan);
  return Number.isFinite(n) ? Math.round(n) : varsayilan;
};

/** Sayıyı tr-TR biçiminde yazar: binlik NOKTA, ondalık VİRGÜL. */
export const sayiYaz = (deger, { ondalik = 0 } = {}) => {
  const n = sayiyaCevir(deger, NaN);
  if (!Number.isFinite(n)) return '';
  return n.toLocaleString('tr-TR', {
    minimumFractionDigits: ondalik,
    maximumFractionDigits: ondalik
  });
};

/** Para: "18.000.000 ₺" / "18.000.000 $". Simge sonda, TR yazım kuralı. */
export const paraYaz = (deger, simge = '₺', { ondalik = 0 } = {}) => {
  const metin = sayiYaz(deger, { ondalik });
  return metin === '' ? '' : `${metin} ${simge}`.trim();
};

/**
 * Kullanıcı yazarken çalışan biçimleyici (controlled TextField `value`).
 * Rakam dışını atar, binlik noktaları koyar. Boş girdi boş kalır ki
 * alan "0" ile kilitlenmesin; 0 değeri ise "0" olarak görünür.
 */
export const yazarkenBicimle = (deger) => {
  if (deger === null || deger === undefined || deger === '') return '';
  if (deger === 0 || deger === '0') return '0';
  const rakamlar = String(deger).replace(/[^\d]/g, '');
  if (rakamlar === '') return '';
  return Number(rakamlar).toLocaleString('tr-TR');
};

/** Biçimlenmiş girdiden ham rakam dizisi ("18.000.000" → "18000000"). */
export const bicimiCoz = (bicimliDeger) => {
  if (bicimliDeger === null || bicimliDeger === undefined || bicimliDeger === '') return '';
  return String(bicimliDeger).replace(/[^\d]/g, '');
};
