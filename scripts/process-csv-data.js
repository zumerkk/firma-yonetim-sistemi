// 🔄 CSV Verilerini İşleme Script'i
// Eski Excel sistemindeki verileri modern sisteme entegre eder

const fs = require('fs');
const path = require('path');

// CSV dosyasını oku ve işle
function processCSVData() {
  console.log('📊 CSV verileri işleniyor...');
  
  const csvPath = path.join(__dirname, '..', 'belge ytb - admin.csv');
  const csvContent = fs.readFileSync(csvPath, 'utf8');
  const lines = csvContent.split('\n');
  
  // Veri yapıları
  const ilIlceData = {};
  const gtipKodlari = new Set();
  const yatirimKonulari = new Set();
  const destekTurleri = new Set();
  const osbBilgileri = new Set();
  const firmaSiniflari = new Set();
  const bolgeler = new Set();
  
  // CSV verilerini işle (ilk 2 satır header)
  for (let i = 2; i < lines.length; i++) {
    const row = lines[i].split(',');
    
    if (row.length > 10) {
      // İl-İlçe verileri
      const ilKod = row[6]?.trim();
      const ilAdi = row[7]?.trim();
      const ilceKod = row[8]?.trim();
      const ilceAdi = row[9]?.trim();
      
      if (ilKod && ilAdi && ilKod.match(/^\d+$/)) {
        if (!ilIlceData[ilAdi]) {
          ilIlceData[ilAdi] = {
            kod: parseInt(ilKod),
            ilceler: {}
          };
        }
        
        if (ilceAdi && ilceKod) {
          ilIlceData[ilAdi].ilceler[ilceAdi.toUpperCase()] = ilceKod;
        }
      }
      
      // GTIP kodları
      const gtip = row[39]?.trim();
      if (gtip && gtip !== 'GTIP No' && gtip.length > 5) {
        gtipKodlari.add(gtip);
      }
      
      // Yatırım konuları
      const yatirim = row[35]?.trim();
      if (yatirim && yatirim !== 'yatırım konusu' && yatirim.length > 3) {
        yatirimKonulari.add(yatirim);
      }
      
      // Destek türleri
      const destek = row[23]?.trim();
      if (destek && !destek.includes('Destek') && destek.length > 3) {
        destekTurleri.add(destek);
      }
      
      // OSB bilgileri
      const osb = row[13]?.trim();
      if (osb && osb !== 'OSB Ünvanı' && osb.length > 3) {
        osbBilgileri.add(osb);
      }
      
      // Firma sınıfları
      const sinif = row[2]?.trim();
      if (sinif && sinif !== 'cins' && sinif.length > 3) {
        firmaSiniflari.add(sinif);
      }
      
      // Bölgeler
      const bolge = row[3]?.trim();
      if (bolge && bolge !== 'sınıf' && bolge.length > 3) {
        bolgeler.add(bolge);
      }
    }
  }
  
  // Sonuçları kaydet
  const outputDir = path.join(__dirname, '..', 'frontend', 'src', 'data');
  
  // Güncellenmiş Türkiye verileri
  const turkeyData = {
    TURKEY_CITIES: Object.keys(ilIlceData).sort(),
    CITY_DISTRICTS: {},
    CITY_CODES: {},
    REGIONS: {
      'AKDENİZ': ['ADANA', 'ANTALYA', 'BURDUR', 'HATAY', 'ISPARTA', 'KAHRAMANMARAş', 'MERSİN', 'OSMANİYE'],
      'EGE': ['AFYONKARAHİSAR', 'AYDIN', 'DENİZLİ', 'İZMİR', 'KÜTAHYA', 'MANİSA', 'MUĞLA', 'UŞAK'],
      'İÇ ANADOLU': ['AKSARAY', 'ANKARA', 'ÇANKIRI', 'ESKİŞEHİR', 'KARAMAN', 'KAYSERİ', 'KIRIKKALE', 'KIRŞEHİR', 'KONYA', 'NEVŞEHİR', 'NİĞDE', 'SİVAS', 'YOZGAT'],
      'KARADENİZ': ['AMASYA', 'ARTVİN', 'BARTIN', 'BAYBURT', 'BOLU', 'ÇORUM', 'DÜZCE', 'GİRESUN', 'GÜMÜŞHANE', 'KASTAMONU', 'ORDU', 'RİZE', 'SAMSUN', 'SİNOP', 'TOKAT', 'TRABZON', 'ZONGULDAK'],
      'MARMARA': ['BALIKESİR', 'BİLECİK', 'BURSA', 'ÇANAKKALE', 'EDİRNE', 'İSTANBUL', 'KIRKLARELİ', 'KOCAELİ', 'SAKARYA', 'TEKİRDAĞ', 'YALOVA'],
      'DOĞU ANADOLU': ['AĞRI', 'ARDAHAN', 'BİNGÖL', 'BİTLİS', 'ELAZIĞ', 'ERZİNCAN', 'ERZURUM', 'HAKKARİ', 'IĞDIR', 'KARS', 'MALATYA', 'MUŞ', 'TUNCELİ', 'VAN'],
      'GÜNEYDOĞU ANADOLU': ['ADIYAMAN', 'BATMAN', 'DİYARBAKIR', 'GAZİANTEP', 'KİLİS', 'MARDİN', 'SİİRT', 'ŞANLIURFA', 'ŞIRNAK']
    }
  };
  
  // İl kodları ve ilçeleri ekle
  Object.keys(ilIlceData).forEach(il => {
    const ilUpper = il.toUpperCase();
    turkeyData.CITY_DISTRICTS[ilUpper] = Object.keys(ilIlceData[il].ilceler).sort();
    turkeyData.CITY_CODES[ilUpper] = ilIlceData[il].kod;
  });
  
  // GTIP kodları
  const gtipData = {
    GTIP_CODES: Array.from(gtipKodlari).sort(),
    searchGTIP: function(searchTerm) {
      if (!searchTerm) return this.GTIP_CODES.slice(0, 50);
      const term = searchTerm.toLowerCase();
      return this.GTIP_CODES.filter(code => 
        code.toLowerCase().includes(term)
      ).slice(0, 50);
    }
  };
  
  // Yatırım konuları
  const yatirimData = {
    YATIRIM_KONULARI: Array.from(yatirimKonulari).sort(),
    searchYatirim: function(searchTerm) {
      if (!searchTerm) return this.YATIRIM_KONULARI.slice(0, 20);
      const term = searchTerm.toLowerCase();
      return this.YATIRIM_KONULARI.filter(konu => 
        konu.toLowerCase().includes(term)
      ).slice(0, 20);
    }
  };
  
  // Destek türleri
  const destekData = {
    DESTEK_TURLERI: Array.from(destekTurleri).sort(),
    BOLGESEL_KATEGORILER: Array.from(bolgeler).sort(),
    FIRMA_SINIFLARI: Array.from(firmaSiniflari).sort(),
    OSB_BILGILERI: Array.from(osbBilgileri).sort()
  };
  
  // Dosyaları kaydet
  fs.writeFileSync(
    path.join(outputDir, 'turkeyDataEnhanced.js'),
    `// 🇹🇷 Gelişmiş Türkiye İl/İlçe Verileri\n// CSV verilerinden otomatik oluşturuldu\n\nexport const TURKEY_DATA = ${JSON.stringify(turkeyData, null, 2)};\n\nexport default TURKEY_DATA;`
  );
  
  fs.writeFileSync(
    path.join(outputDir, 'gtipData.js'),
    `// 📊 GTIP Kod Verileri\n// CSV verilerinden otomatik oluşturuldu\n\nexport const GTIP_DATA = ${JSON.stringify(gtipData, null, 2)};\n\nexport default GTIP_DATA;`
  );
  
  fs.writeFileSync(
    path.join(outputDir, 'yatirimData.js'),
    `// 🎯 Yatırım Konusu Verileri\n// CSV verilerinden otomatik oluşturuldu\n\nexport const YATIRIM_DATA = ${JSON.stringify(yatirimData, null, 2)};\n\nexport default YATIRIM_DATA;`
  );
  
  fs.writeFileSync(
    path.join(outputDir, 'destekData.js'),
    `// 🎁 Destek ve Teşvik Verileri\n// CSV verilerinden otomatik oluşturuldu\n\nexport const DESTEK_DATA = ${JSON.stringify(destekData, null, 2)};\n\nexport default DESTEK_DATA;`
  );
  
  // Rapor
  console.log('✅ CSV verileri başarıyla işlendi!');
  console.log(`📍 ${Object.keys(ilIlceData).length} il için ilçe verileri`);
  console.log(`🏷️  ${gtipKodlari.size} GTIP kodu`);
  console.log(`🎯 ${yatirimKonulari.size} yatırım konusu`);
  console.log(`🎁 ${destekTurleri.size} destek türü`);
  console.log(`🏭 ${osbBilgileri.size} OSB bilgisi`);
  console.log(`📋 ${firmaSiniflari.size} firma sınıfı`);
  console.log(`🗺️  ${bolgeler.size} bölgesel kategori`);
}

// Script'i çalıştır
if (require.main === module) {
  processCSVData();
}

module.exports = { processCSVData };