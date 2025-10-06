// 🔤 TÜRKÇE KARAKTER NORMALIZASYON UTILS
// İ/i, I/ı, Ü/ü, Ğ/ğ gibi Türkçe karakterleri normalize eder

/**
 * Türkçe karakterleri normalize ederek arama için uygun hale getirir
 * Örnek: "İSTANBUL" -> "istanbul", "Şirket" -> "sirket"
 */
export const normalizeTurkish = (text) => {
  if (!text) return '';
  
  const turkishMap = {
    'Ç': 'c', 'ç': 'c',
    'Ğ': 'g', 'ğ': 'g',
    'İ': 'i', 'I': 'i', 'i': 'i', 'ı': 'i',
    'Ö': 'o', 'ö': 'o',
    'Ş': 's', 'ş': 's',
    'Ü': 'u', 'ü': 'u'
  };
  
  return text
    .split('')
    .map(char => turkishMap[char] || char.toLowerCase())
    .join('');
};

/**
 * İki metni Türkçe karakterleri dikkate almadan karşılaştırır
 */
export const turkishIncludes = (text, searchTerm) => {
  if (!text || !searchTerm) return false;
  
  const normalizedText = normalizeTurkish(text);
  const normalizedSearch = normalizeTurkish(searchTerm);
  
  return normalizedText.includes(normalizedSearch);
};

/**
 * Türkçe karakter duyarsız string eşitliği kontrolü
 */
export const turkishEquals = (text1, text2) => {
  if (!text1 || !text2) return false;
  return normalizeTurkish(text1) === normalizeTurkish(text2);
};

/**
 * Türkçe karakter duyarsız string başlangıç kontrolü
 */
export const turkishStartsWith = (text, searchTerm) => {
  if (!text || !searchTerm) return false;
  
  const normalizedText = normalizeTurkish(text);
  const normalizedSearch = normalizeTurkish(searchTerm);
  
  return normalizedText.startsWith(normalizedSearch);
};

/**
 * Array içinde Türkçe karakter duyarsız filtreleme
 */
export const turkishFilter = (array, searchTerm, getTextFn) => {
  if (!array || !searchTerm) return array;
  
  const normalizedSearch = normalizeTurkish(searchTerm);
  
  return array.filter(item => {
    const text = getTextFn ? getTextFn(item) : String(item);
    const normalizedText = normalizeTurkish(text);
    return normalizedText.includes(normalizedSearch);
  });
};

/**
 * Türkçe karakter duyarsız sıralama
 */
export const turkishSort = (array, getTextFn) => {
  return [...array].sort((a, b) => {
    const textA = getTextFn ? getTextFn(a) : String(a);
    const textB = getTextFn ? getTextFn(b) : String(b);
    return normalizeTurkish(textA).localeCompare(normalizeTurkish(textB));
  });
};

