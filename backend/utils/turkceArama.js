// 🔤 Türkçe duyarlı arama yardımcısı
//
// SORUN: MongoDB'nin { $options: 'i' } bayrağı pratikte yalnızca ASCII harflerde
// çalışıyor. Canlı veride ölçüldü (dosyatakips.firmaUnvan):
//     { $regex: 'PLASTİK', $options: 'i' } → 18 kayıt
//     { $regex: 'plastik', $options: 'i' } →  0 kayıt
//     { $regex: 'BAŞARI',  $options: 'i' } →  2 kayıt
//     { $regex: 'başarı',  $options: 'i' } →  0 kayıt
// Firma unvanları veritabanında BÜYÜK HARF Türkçe tutulduğu için kullanıcı
// küçük harfle yazınca hiçbir şey bulamıyordu.
//
// İKİNCİ SORUN: Türkçe'de i↔İ ve ı↔I eşleşir. JS'in varsayılan toUpperCase()'i
// 'i' harfini 'I' yapar, yani terimi sadece büyütmek de yetmez.
// Ayrıca 'İ'.toLowerCase() iki karakter üretir ('i' + U+0307 birleşik nokta) —
// bu yüzden aşağıda tek karakter olmayan varyantlar eleniyor.
//
// ÇÖZÜM: Terimi karakter karakter dolaşıp her harfi, o harfin Türkçe ve ASCII
// büyük/küçük varyantlarını içeren bir regex karakter sınıfına çeviriyoruz.
// Böylece kullanıcı ister "plastik", ister "PLASTİK", ister "Plastik" yazsın
// aynı sonucu alıyor. Aksan katlaması YAPILMAZ: 's' yazan 'ş' bulmaz,
// yalnızca büyük/küçük harf ayrımı kalkar.

// Regex'te özel anlamı olan karakterler (sınıf dışında kaçırılacaklar)
const REGEX_OZEL = /[.*+?^${}()|[\]\\]/g;
// Karakter sınıfı İÇİNDE özel anlamı olanlar
const SINIF_OZEL = /[\]\\^-]/g;

/**
 * Bir karakterin eşleşmesi gereken tüm büyük/küçük varyantları.
 * @param {string} ch tek karakter
 * @returns {string[]} tek karakterlik varyantlar
 */
const varyantlar = (ch) => {
  const set = new Set([
    ch,
    ch.toLocaleLowerCase('tr-TR'),
    ch.toLocaleUpperCase('tr-TR'),
    ch.toLowerCase(),
    ch.toUpperCase()
  ]);

  // Noktalı i ailesi: "istanbul" yazan "İSTANBUL"u, "ISTANBUL" yazan da
  // "İSTANBUL"u bulabilsin. (Türkçe klavye kullanmayan kullanıcılar için kritik.)
  if (set.has('i') || set.has('İ')) { set.add('i'); set.add('İ'); }
  // Noktasız ı ailesi: "ışık" ↔ "IŞIK"
  if (set.has('ı') || set.has('I')) { set.add('ı'); set.add('I'); }

  // 'İ'.toLowerCase() gibi çok karakterli sonuçları at
  return [...set].filter((c) => [...c].length === 1);
};

/**
 * Arama terimini Türkçe büyük/küçük harf duyarsız regex desenine çevirir.
 * @param {string} terim kullanıcının yazdığı ham metin
 * @returns {string} regex deseni
 */
const turkceRegexDeseni = (terim) => [...String(terim).trim()]
  .map((ch) => {
    const v = varyantlar(ch);
    // Harf değilse (rakam, boşluk, noktalama) tek varyant kalır → düz kaçırma
    if (v.length <= 1) return ch.replace(REGEX_OZEL, '\\$&');
    return `[${v.map((c) => c.replace(SINIF_OZEL, '\\$&')).join('')}]`;
  })
  .join('');

/**
 * Mongo sorgusuna doğrudan gömülebilen filtre üretir.
 *   filter.firmaUnvan = turkceArama('plastik');  // → "PLASTİK" kayıtlarını da bulur
 * @param {string} terim
 * @returns {{ $regex: string, $options: string }}
 */
const turkceArama = (terim) => ({
  $regex: turkceRegexDeseni(terim),
  // Karakter sınıfları zaten iki durumu da kapsıyor; 'i' bayrağı gözden kaçan
  // bir alfabe için ek güvenlik ağı olarak duruyor.
  $options: 'i'
});

module.exports = { turkceArama, turkceRegexDeseni };
