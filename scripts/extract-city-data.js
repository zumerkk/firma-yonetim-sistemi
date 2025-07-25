const fs = require('fs');
const path = require('path');

// CSV dosyasını okuma ve il-ilçe verilerini çıkarma
function extractCityDataFromCSV() {
  const csvPath = path.join(__dirname, '..', 'belge ytb - admin.csv');
  
  try {
    const csvContent = fs.readFileSync(csvPath, 'utf-8');
    const lines = csvContent.split('\n');
    
    const cityData = new Map();
    const uniqueCities = new Set();
    const uniqueDistricts = new Set();
    
    // Header satırını atla (ilk 2 satır)
    for (let i = 2; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;
      
      const columns = line.split(',');
      
      // İl kodu (6. sütun), İl adı (7. sütun), İlçe kodu (8. sütun), İlçe adı (9. sütun)
      const ilKod = columns[6]?.trim();
      const ilAdi = columns[7]?.trim();
      const ilceKod = columns[8]?.trim();
      const ilceAdi = columns[9]?.trim();
      
      // Geçerli veri kontrolü
      if (ilKod && ilAdi && ilceKod && ilceAdi && 
          ilKod !== 'İL KOD' && ilAdi !== 'İLADI' && 
          ilceKod !== 'İLCEKOD' && ilceAdi !== 'İLCEADI' &&
          !isNaN(ilKod) && !isNaN(ilceKod)) {
        
        const cityKey = `${ilKod}-${ilAdi}`;
        uniqueCities.add(cityKey);
        
        if (!cityData.has(ilKod)) {
          cityData.set(ilKod, {
            kod: parseInt(ilKod),
            ad: ilAdi,
            ilceler: new Map()
          });
        }
        
        const city = cityData.get(ilKod);
        if (!city.ilceler.has(ilceKod)) {
          city.ilceler.set(ilceKod, {
            kod: parseInt(ilceKod),
            ad: ilceAdi
          });
          uniqueDistricts.add(`${ilceKod}-${ilceAdi}`);
        }
      }
    }
    
    // Map'leri array'e çevir
    const result = {
      iller: Array.from(cityData.values()).map(city => ({
        kod: city.kod,
        ad: city.ad,
        ilceler: Array.from(city.ilceler.values())
      })),
      istatistikler: {
        toplamIl: cityData.size,
        toplamIlce: uniqueDistricts.size,
        benzersizIller: uniqueCities.size
      }
    };
    
    // Sonuçları sırala
    result.iller.sort((a, b) => a.kod - b.kod);
    result.iller.forEach(il => {
      il.ilceler.sort((a, b) => a.kod - b.kod);
    });
    
    console.log('CSV verisi başarıyla işlendi:');
    console.log(`- Toplam İl: ${result.istatistikler.toplamIl}`);
    console.log(`- Toplam İlçe: ${result.istatistikler.toplamIlce}`);
    
    return result;
    
  } catch (error) {
    console.error('CSV okuma hatası:', error.message);
    return null;
  }
}

// Çıkarılan verileri JSON dosyasına kaydetme
function saveCityDataToJSON(cityData) {
  if (!cityData) return false;
  
  const outputPath = path.join(__dirname, '..', 'frontend', 'src', 'data', 'extracted-city-data.json');
  
  try {
    // Data klasörünü oluştur
    const dataDir = path.dirname(outputPath);
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }
    
    fs.writeFileSync(outputPath, JSON.stringify(cityData, null, 2), 'utf-8');
    console.log(`Veriler başarıyla kaydedildi: ${outputPath}`);
    return true;
  } catch (error) {
    console.error('JSON kaydetme hatası:', error.message);
    return false;
  }
}

// Mevcut city data ile karşılaştırma
function compareWithExistingData(newData) {
  const existingDataPath = path.join(__dirname, '..', 'frontend', 'src', 'data', 'city-data.js');
  
  try {
    if (fs.existsSync(existingDataPath)) {
      console.log('\nMevcut city-data.js dosyası bulundu.');
      console.log('Yeni çıkarılan veriler extracted-city-data.json olarak kaydedildi.');
      console.log('İki veri setini karşılaştırabilirsiniz.');
    } else {
      console.log('\nMevcut city-data.js dosyası bulunamadı.');
      console.log('Yeni veriler extracted-city-data.json olarak kaydedildi.');
    }
  } catch (error) {
    console.error('Karşılaştırma hatası:', error.message);
  }
}

// Ana fonksiyon
function main() {
  console.log('CSV dosyasından il-ilçe verileri çıkarılıyor...');
  
  const cityData = extractCityDataFromCSV();
  
  if (cityData) {
    const saved = saveCityDataToJSON(cityData);
    if (saved) {
      compareWithExistingData(cityData);
      
      // İlk 5 ili örnek olarak göster
      console.log('\nÖrnek veriler (ilk 5 il):');
      cityData.iller.slice(0, 5).forEach(il => {
        console.log(`${il.kod} - ${il.ad} (${il.ilceler.length} ilçe)`);
        il.ilceler.slice(0, 3).forEach(ilce => {
          console.log(`  ${ilce.kod} - ${ilce.ad}`);
        });
        if (il.ilceler.length > 3) {
          console.log(`  ... ve ${il.ilceler.length - 3} ilçe daha`);
        }
      });
    }
  }
}

// Script çalıştırıldığında
if (require.main === module) {
  main();
}

module.exports = {
  extractCityDataFromCSV,
  saveCityDataToJSON,
  compareWithExistingData
};