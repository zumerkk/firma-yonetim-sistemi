// 🇹🇷 Kapsamlı Türkiye İl/İlçe Verileri
// CSV verilerinden çıkarılan gerçek il-ilçe kodları ve isimleri

import extractedData from './extracted-city-data.json';
import { esleAnahtari, eslesenIlce } from '../utils/secenekEsle';

// Belgelerde il/ilçe E-TUYS'tan büyük harfle geliyor ("NİĞDE", "NILÜFER"); veride "Niğde", "Nilüfer".
// Düz toLowerCase Türkçe İ'yi "i̇" yapıyor ("NİĞDE" ≠ "Niğde") — karşılaştırma ortak anahtarla.
const ilBul = (cityName) => {
  const k = esleAnahtari(cityName);
  return k ? extractedData.iller.find((il) => esleAnahtari(il.ad) === k) : undefined;
};

// İl kodları ve isimleri
export const TURKEY_CITIES_WITH_CODES = extractedData.iller.map(il => ({
  kod: il.kod,
  ad: il.ad,
  value: il.ad,
  label: `${il.kod} - ${il.ad}`
}));

// Sadece il isimleri (mevcut sistemle uyumluluk için)
export const TURKEY_CITIES = extractedData.iller.map(il => il.ad);

// İl kodları mapping
export const CITY_CODES = {};
extractedData.iller.forEach(il => {
  CITY_CODES[il.ad] = il.kod;
  CITY_CODES[il.ad.toUpperCase()] = il.kod;
});

// İlçe verileri mapping
export const CITY_DISTRICTS = {};
extractedData.iller.forEach(il => {
  CITY_DISTRICTS[il.ad] = il.ilceler.map(ilce => ilce.ad);
  CITY_DISTRICTS[il.ad.toUpperCase()] = il.ilceler.map(ilce => ilce.ad);
});

// İlçe kodları mapping
export const DISTRICT_CODES = {};
extractedData.iller.forEach(il => {
  il.ilceler.forEach(ilce => {
    const key = `${il.ad}-${ilce.ad}`;
    DISTRICT_CODES[key] = ilce.kod;
    DISTRICT_CODES[key.toUpperCase()] = ilce.kod;
  });
});

// İl kodu ile ilçeleri getirme
export const getDistrictsByCity = (cityName) => {
  const city = ilBul(cityName);
  return city ? city.ilceler : [];
};

// İl kodu ile ilçeleri getirme
export const getDistrictsByCityCode = (cityCode) => {
  const city = extractedData.iller.find(il => il.kod === parseInt(cityCode));
  return city ? city.ilceler : [];
};

// İl adı ile il kodunu getirme
export const getCityCode = (cityName) => {
  const city = ilBul(cityName);
  return city ? city.kod : null;
};

// İl kodu ile il adını getirme
export const getCityName = (cityCode) => {
  const city = extractedData.iller.find(il => il.kod === parseInt(cityCode));
  return city ? city.ad : null;
};

// İlçe kodu ile ilçe adını getirme
export const getDistrictName = (districtCode) => {
  for (const il of extractedData.iller) {
    const ilce = il.ilceler.find(ilce => ilce.kod === parseInt(districtCode));
    if (ilce) return ilce.ad;
  }
  return null;
};

// İlçe adı ile ilçe kodunu getirme
export const getDistrictCode = (cityName, districtName) => {
  const city = ilBul(cityName);
  if (!city) return null;
  const i = eslesenIlce(districtName, city.ilceler, city.ad);
  return i >= 0 ? city.ilceler[i].kod : null;
};

// Arama fonksiyonları
export const searchCities = (searchTerm) => {
  if (!searchTerm) return TURKEY_CITIES_WITH_CODES;
  
  const term = searchTerm.toLowerCase().trim();
  return TURKEY_CITIES_WITH_CODES.filter(city => 
    city.ad.toLowerCase().includes(term) ||
    city.kod.toString().includes(term)
  );
};

export const searchDistricts = (cityName, searchTerm) => {
  const districts = getDistrictsByCity(cityName);
  if (!searchTerm) return districts;
  
  const term = searchTerm.toLowerCase().trim();
  return districts.filter(district => 
    district.ad.toLowerCase().includes(term) ||
    district.kod.toString().includes(term)
  );
};

// İstatistikler
export const STATISTICS = {
  totalCities: extractedData.iller.length,
  totalDistricts: extractedData.iller.reduce((total, il) => total + il.ilceler.length, 0),
  averageDistrictsPerCity: Math.round(
    extractedData.iller.reduce((total, il) => total + il.ilceler.length, 0) / extractedData.iller.length
  )
};

// Bölgesel gruplandırma (mevcut sistemden)
export const REGIONAL_GROUPS = {
  'MARMARA': ['İstanbul', 'Ankara', 'Bursa', 'Kocaeli', 'Sakarya', 'Tekirdağ', 'Edirne', 'Kırklareli', 'Çanakkale', 'Balıkesir', 'Yalova', 'Bilecik'],
  'EGE': ['İzmir', 'Aydın', 'Denizli', 'Muğla', 'Manisa', 'Afyonkarahisar', 'Kütahya', 'Uşak'],
  'AKDENIZ': ['Antalya', 'Mersin', 'Adana', 'Hatay', 'Kahramanmaraş', 'Osmaniye', 'Isparta', 'Burdur'],
  'İÇ ANADOLU': ['Ankara', 'Konya', 'Kayseri', 'Sivas', 'Yozgat', 'Nevşehir', 'Kırıkkale', 'Aksaray', 'Karaman', 'Niğde', 'Kırşehir', 'Çankırı'],
  'KARADENİZ': ['Samsun', 'Trabzon', 'Ordu', 'Giresun', 'Rize', 'Artvin', 'Gümüşhane', 'Bayburt', 'Tokat', 'Amasya', 'Çorum', 'Sinop', 'Kastamonu', 'Bartın', 'Karabük', 'Bolu', 'Düzce', 'Zonguldak'],
  'DOĞU ANADOLU': ['Erzurum', 'Erzincan', 'Kars', 'Ağrı', 'Iğdır', 'Ardahan', 'Malatya', 'Elazığ', 'Tunceli', 'Bingöl', 'Van', 'Muş', 'Bitlis', 'Hakkari'],
  'GÜNEYDOĞU ANADOLU': ['Gaziantep', 'Şanlıurfa', 'Diyarbakır', 'Mardin', 'Batman', 'Şırnak', 'Siirt', 'Kilis', 'Adıyaman']
};

// Bölge ile illeri getirme
export const getCitiesByRegion = (region) => {
  return REGIONAL_GROUPS[region] || [];
};

// İl ile bölgeyi getirme
export const getRegionByCity = (cityName) => {
  for (const [region, cities] of Object.entries(REGIONAL_GROUPS)) {
    if (cities.some(city => city.toLowerCase() === cityName.toLowerCase())) {
      return region;
    }
  }
  return null;
};

// Varsayılan export - ESLint uyarısını gidermek için
const cityDataComplete = {
  TURKEY_CITIES,
  TURKEY_CITIES_WITH_CODES,
  CITY_CODES,
  CITY_DISTRICTS,
  DISTRICT_CODES,
  getDistrictsByCity,
  getDistrictsByCityCode,
  getCityCode,
  getCityName,
  getDistrictName,
  getDistrictCode,
  searchCities,
  searchDistricts,
  STATISTICS,
  REGIONAL_GROUPS,
  getCitiesByRegion,
  getRegionByCity
};

export default cityDataComplete;