// 🔤 TÜRKÇE KARAKTER NORMALIZASYON UTILS
// İ/i, I/ı, Ü/ü, Ğ/ğ gibi Türkçe karakterleri normalize eder

/**
 * Türkçe karakterleri normalize ederek arama için uygun hale getirir
 * Örnek: "İSTANBUL" -> "istanbul", "Şirket" -> "sirket"
 */
const normalizeTurkish = (text) => {
  if (!text) return '';
  
  const turkishMap = {
    'Ç': 'c', 'ç': 'c',
    'Ğ': 'g', 'ğ': 'g',
    'İ': 'i', 'i': 'i', 'I': 'i', 'ı': 'i',
    'Ö': 'o', 'ö': 'o',
    'Ş': 's', 'ş': 's',
    'Ü': 'u', 'ü': 'u'
  };
  
  return text
    .split('')
    .map(char => turkishMap[char] || char)
    .join('')
    .toLowerCase();
};

/**
 * Arama için gelişmiş regex pattern oluşturur
 * Her Türkçe karakter için olası tüm varyasyonları içeren pattern
 */
const createTurkishInsensitiveRegex = (searchTerm) => {
  if (!searchTerm) return new RegExp('', 'i');
  
  // Her Türkçe karakter için tüm varyasyonlar (hem küçük hem büyük harf)
  const charMap = {
    // C harfleri
    'c': '[cçÇC]',
    'ç': '[cçÇC]',
    'C': '[cçÇC]',
    'Ç': '[cçÇC]',
    // G harfleri
    'g': '[gğĞG]',
    'ğ': '[gğĞG]',
    'G': '[gğĞG]',
    'Ğ': '[gğĞG]',
    // I/İ harfleri - EN ÖNEMLİ KISIM!
    'i': '[iıİI]',
    'ı': '[iıİI]',
    'İ': '[iıİI]',
    'I': '[iıİI]',
    // O harfleri
    'o': '[oöÖO]',
    'ö': '[oöÖO]',
    'O': '[oöÖO]',
    'Ö': '[oöÖO]',
    // S harfleri
    's': '[sşŞS]',
    'ş': '[sşŞS]',
    'S': '[sşŞS]',
    'Ş': '[sşŞS]',
    // U harfleri
    'u': '[uüÜU]',
    'ü': '[uüÜU]',
    'U': '[uüÜU]',
    'Ü': '[uüÜU]'
  };
  
  // Arama terimini karakterlere böl ve her karakter için regex pattern oluştur
  const pattern = searchTerm
    .split('')
    .map(char => {
      // Eğer bu karakter için özel map varsa onu kullan
      if (charMap[char]) {
        return charMap[char];
      }
      // Değilse karakteri escape et ve olduğu gibi kullan
      return char.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    })
    .join('');
  
  return new RegExp(pattern, 'i');
};

/**
 * İki metni Türkçe karakterleri dikkate almadan karşılaştırır
 */
const turkishIncludes = (text, searchTerm) => {
  if (!text || !searchTerm) return false;
  
  const normalizedText = normalizeTurkish(text);
  const normalizedSearch = normalizeTurkish(searchTerm);
  
  return normalizedText.includes(normalizedSearch);
};

/**
 * MongoDB query için Türkçe duyarsız arama filtreleri oluşturur
 */
const createTurkishSearchFilter = (fields, searchTerm) => {
  if (!searchTerm || !fields || fields.length === 0) {
    return {};
  }
  
  const regex = createTurkishInsensitiveRegex(searchTerm);
  
  return {
    $or: fields.map(field => ({
      [field]: regex
    }))
  };
};

module.exports = {
  normalizeTurkish,
  createTurkishInsensitiveRegex,
  turkishIncludes,
  createTurkishSearchFilter
};

