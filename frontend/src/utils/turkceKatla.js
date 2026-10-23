// 🔤 Türkçe harf duyarsız karşılaştırma için metni katlar: "ARMİN", "armın", "ARMIN" → "armin".
// Müşteri (23.10.2026): Ekipman Takip aramasında İ/ı farkı yüzünden kayıt bulunmuyordu. Sunucudaki
// karşılığı utils/turkishUtils.createTurkishInsensitiveRegex (aynı harf grupları: c/ç g/ğ i/ı o/ö s/ş u/ü).
const KATLAMA = { ç: 'c', ğ: 'g', ı: 'i', ö: 'o', ş: 's', ü: 'u' };

export const turkceKatla = (metin) => String(metin ?? '')
  .toLocaleLowerCase('tr-TR')
  .replace(/[çğıöşü]/g, (h) => KATLAMA[h])
  .replace(/\s+/g, ' ')
  .trim();

export const turkceIcerir = (metin, aranan) => turkceKatla(metin).includes(turkceKatla(aranan));
