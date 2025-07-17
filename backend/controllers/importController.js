// 📊 Import Controller
// Excel verilerini sisteme aktarma

const multer = require('multer');
const XLSX = require('xlsx');
const Firma = require('../models/Firma');
const path = require('path');

// 📂 Multer konfigürasyonu
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/');
  },
  filename: (req, file, cb) => {
    cb(null, `import-${Date.now()}${path.extname(file.originalname)}`);
  }
});

const upload = multer({ 
  storage,
  fileFilter: (req, file, cb) => {
    // Excel dosya formatları
    const allowedTypes = [
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'text/csv'
    ];
    
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Sadece Excel (.xlsx, .xls) veya CSV dosyaları kabul edilir'));
    }
  },
  limits: { fileSize: 10 * 1024 * 1024 } // 10MB limit
});

// 📥 Excel Import
const importExcel = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'Dosya bulunamadı'
      });
    }

    // Excel dosyasını oku
    const workbook = XLSX.readFile(req.file.path);
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    
    // JSON'a çevir
    const jsonData = XLSX.utils.sheet_to_json(worksheet);
    
    if (!jsonData || jsonData.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Excel dosyası boş veya geçersiz format'
      });
    }

    const results = {
      success: 0,
      failed: 0,
      errors: []
    };

    // Her satırı işle
    for (let i = 0; i < jsonData.length; i++) {
      try {
        const row = jsonData[i];
        
        // Excel sütunlarını model alanlarına map et
        const firmaData = mapExcelToFirma(row, i + 2); // +2 çünkü Excel 1'den başlar ve header var
        
        // Firma ID kontrolü
        const existingFirma = await Firma.findOne({ firmaId: firmaData.firmaId });
        if (existingFirma) {
          results.failed++;
          results.errors.push(`Satır ${i + 2}: Firma ID (${firmaData.firmaId}) zaten mevcut`);
          continue;
        }

        // Vergi No kontrolü
        const existingVergiNo = await Firma.findOne({ vergiNoTC: firmaData.vergiNoTC });
        if (existingVergiNo) {
          results.failed++;
          results.errors.push(`Satır ${i + 2}: Vergi No (${firmaData.vergiNoTC}) zaten mevcut`);
          continue;
        }

        // Yeni firma oluştur
        const firma = new Firma({
          ...firmaData,
          olusturanKullanici: req.user._id
        });

        await firma.save();
        results.success++;
        
      } catch (error) {
        results.failed++;
        results.errors.push(`Satır ${i + 2}: ${error.message}`);
      }
    }

    // Dosyayı sil
    const fs = require('fs');
    fs.unlinkSync(req.file.path);

    res.json({
      success: true,
      message: `İşlem tamamlandı: ${results.success} başarılı, ${results.failed} hatalı`,
      data: results
    });

  } catch (error) {
    console.error('❌ Import Excel error:', error);
    res.status(500).json({
      success: false,
      message: 'Excel dosyası işlenirken hata oluştu',
      error: error.message
    });
  }
};

// 🔄 Excel verilerini Firma modeline map et
const mapExcelToFirma = (row, rowNumber) => {
  // Excel sütun isimleri (yeni format)
  const firmaId = row['Firma ID'] || row['firmaId'] || row['FirmaID'];
  const vergiNoTC = row['Vergi No/TC No'] || row['vergiNoTC'] || row['VergiNo'];
  const tamUnvan = row['Tam Unvan (NOKTASIZ BÜYÜK)'] || row['tamUnvan'] || row['Unvan'];
  const adres = row['Adres'] || row['adres'];
  const firmaIl = row['Firma İl'] || row['firmaIl'] || row['Il'];
  const firmaIlce = row['Firma İlçe'] || row['firmaIlce'] || row['Ilce'];
  const kepAdresi = row['KEP Adresi'] || row['kepAdresi'] || row['KEP'];
  const yabanciSermaye = row['Yabancı Sermayeli mi?'] || row['yabanciSermaye'];
  const anaFaaliyetKonusu = row['Ana Faaliyet Konusu'] || row['anaFaaliyetKonusu'] || '';
  const ilkIrtibatKisi = row['İlk İrtibat Kişisi'] || row['ilkIrtibatKisi'] || '';
  const etuysYetki = row['ETUYS YETKİ BİTİŞ'] || row['etuysYetki'];
  const dysYetki = row['DYS YETKİ BİTİŞ'] || row['dysYetki'];
  
  // Yetkili kişi bilgileri - Yeni format
  const yetkili1Ad = row['Yetkili Kişi1'] || row['YetkiliAd1'] || '';
  const yetkili1Tel1 = row['Yetkili Kişi1 Tel'] || row['YetkiliTel1'] || '';
  const yetkili1Tel2 = row['Yetkili Kişi1 Tel2'] || row['YetkiliTel2'] || '';
  const yetkili1Email1 = row['Yetkili Kişi1 Mail'] || row['YetkiliEmail1'] || '';
  const yetkili1Email2 = row['Yetkili Kişi1 Mail2'] || row['YetkiliEmail2'] || '';

  const yetkili2Ad = row['Yetkili Kişi2'] || row['YetkiliAd2'] || '';
  const yetkili2Tel1 = row['Yetkili Kişi2 Tel'] || row['YetkiliTel21'] || '';
  const yetkili2Tel2 = row['Yetkili Kişi2 Tel2'] || row['YetkiliTel22'] || '';
  const yetkili2Email1 = row['Yetkili Kişi2 Mail'] || row['YetkiliEmail21'] || '';
  const yetkili2Email2 = row['Yetkili Kişi2 Mail2'] || row['YetkiliEmail22'] || '';

  // Validasyon
  if (!firmaId) throw new Error('Firma ID zorunludur');
  if (!vergiNoTC) throw new Error('Vergi No/TC zorunludur');
  if (!tamUnvan) throw new Error('Tam ünvan zorunludur');
  if (!adres) throw new Error('Adres zorunludur');
  if (!firmaIl) throw new Error('Firma ili zorunludur');
  if (!firmaIlce) throw new Error('Firma ilçesi zorunludur');

  // Tarihleri parse et
  const parseDate = (dateStr) => {
    if (!dateStr || dateStr.trim() === '') return null;
    
    try {
      // Farklı tarih formatlarını dene
      const date = new Date(dateStr);
      return isNaN(date.getTime()) ? null : date;
    } catch (error) {
      return null;
    }
  };

  // Yetkili kişiler array'i
  const yetkiliKisiler = [];
  
  // Yetkili Kişi 1
  if (yetkili1Ad && yetkili1Ad.trim() !== '') {
    yetkiliKisiler.push({
      adSoyad: yetkili1Ad.trim(),
      telefon1: yetkili1Tel1 || '',
      telefon2: yetkili1Tel2 || '',
      eposta1: yetkili1Email1 || '',
      eposta2: yetkili1Email2 || ''
    });
  }

  // Yetkili Kişi 2
  if (yetkili2Ad && yetkili2Ad.trim() !== '') {
    yetkiliKisiler.push({
      adSoyad: yetkili2Ad.trim(),
      telefon1: yetkili2Tel1 || '',
      telefon2: yetkili2Tel2 || '',
      eposta1: yetkili2Email1 || '',
      eposta2: yetkili2Email2 || ''
    });
  }

  // Eğer hiç yetkili kişi yoksa varsayılan ekle
  if (yetkiliKisiler.length === 0) {
    yetkiliKisiler.push({
      adSoyad: 'Belirtilmemiş',
      telefon1: '0000000000',
      telefon2: '',
      eposta1: 'bilgi@example.com',
      eposta2: ''
    });
  }

  return {
    firmaId: firmaId.toString().toUpperCase(),
    vergiNoTC: vergiNoTC.toString(),
    tamUnvan: tamUnvan.toString(),
    adres: adres.toString(),
    firmaIl: firmaIl.toString().toUpperCase(),
    firmaIlce: firmaIlce.toString().toUpperCase(),
    kepAdresi: kepAdresi ? kepAdresi.toString().toLowerCase() : '',
    yabanciIsareti: yabanciSermaye === 'EVET' || yabanciSermaye === 'Evet' || yabanciSermaye === true,
    anaFaaliyetKonusu: anaFaaliyetKonusu || '',
    ilkIrtibatKisi: ilkIrtibatKisi || '',
    etuysYetkiBitis: parseDate(etuysYetki),
    dysYetkiBitis: parseDate(dysYetki),
    yetkiliKisiler,
    aktif: true
  };
};

// 📤 Örnek Excel Template İndir
const downloadTemplate = (req, res) => {
  try {
    // Örnek veri - yeni format
    const templateData = [
      {
        'Firma ID': 'A000001',
        'Vergi No/TC No': '1234567890',
        'Tam Unvan (NOKTASIZ BÜYÜK)': 'ÖRNEK FİRMA LİMİTED ŞİRKETİ',
        'Adres': 'Örnek Mahallesi Örnek Caddesi No:1',
        'Firma İl': 'ANKARA',
        'Firma İlçe': 'ÇANKAYA',
        'KEP Adresi': 'ornek@firma.com.tr',
        'Yabancı Sermayeli mi?': 'HAYIR',
        'Ana Faaliyet Konusu': '2929',
        'Yetkili Kişi1': 'Ahmet Yılmaz',
        'Yetkili Kişi1 Tel': '05551234567',
        'Yetkili Kişi1 Tel2': '03121234567',
        'Yetkili Kişi1 Mail': 'ahmet@ornekfirma.com',
        'Yetkili Kişi1 Mail2': 'ahmet.yilmaz@ornekfirma.com',
        'Yetkili Kişi2': 'Ayşe Demir',
        'Yetkili Kişi2 Tel': '05559876543',
        'Yetkili Kişi2 Tel2': '03129876543',
        'Yetkili Kişi2 Mail': 'ayse@ornekfirma.com',
        'Yetkili Kişi2 Mail2': 'ayse.demir@ornekfirma.com',
        'İlk İrtibat Kişisi': 'Ahmet Yılmaz',
        'ETUYS YETKİ BİTİŞ': '31.12.2024',
        'DYS YETKİ BİTİŞ': '31.12.2024'
      },
      {
        'Firma ID': 'A000002',
        'Vergi No/TC No': '9876543210',
        'Tam Unvan (NOKTASIZ BÜYÜK)': 'TEST SANAYİ VE TİCARET ANONİM ŞİRKETİ',
        'Adres': 'Test Mahallesi Test Sokak No:2',
        'Firma İl': 'İSTANBUL',
        'Firma İlçe': 'KARTAL',
        'KEP Adresi': 'test@testsanayi.com.tr',
        'Yabancı Sermayeli mi?': 'EVET',
        'Ana Faaliyet Konusu': '1234',
        'Yetkili Kişi1': 'Mehmet Özkan',
        'Yetkili Kişi1 Tel': '05334455667',
        'Yetkili Kişi1 Tel2': '02164455667',
        'Yetkili Kişi1 Mail': 'mehmet@testsanayi.com',
        'Yetkili Kişi1 Mail2': 'mehmet.ozkan@testsanayi.com',
        'Yetkili Kişi2': 'Fatma Kaya',
        'Yetkili Kişi2 Tel': '05447788990',
        'Yetkili Kişi2 Tel2': '02167788990',
        'Yetkili Kişi2 Mail': 'fatma@testsanayi.com',
        'Yetkili Kişi2 Mail2': 'fatma.kaya@testsanayi.com',
        'İlk İrtibat Kişisi': 'Mehmet Özkan',
        'ETUYS YETKİ BİTİŞ': '15.06.2025',
        'DYS YETKİ BİTİŞ': '28.02.2025'
      }
    ];

    // Excel oluştur
    const ws = XLSX.utils.json_to_sheet(templateData);
    
    // Sütun genişliklerini ayarla
    const columnWidths = [
      { wch: 15 }, // Firma ID
      { wch: 15 }, // Vergi No
      { wch: 50 }, // Tam Unvan
      { wch: 40 }, // Adres
      { wch: 15 }, // İl
      { wch: 15 }, // İlçe
      { wch: 25 }, // KEP
      { wch: 15 }, // Yabancı
      { wch: 15 }, // Faaliyet
      { wch: 20 }, // Yetkili 1 Ad
      { wch: 15 }, // Yetkili 1 Tel
      { wch: 15 }, // Yetkili 1 Tel2
      { wch: 25 }, // Yetkili 1 Mail
      { wch: 25 }, // Yetkili 1 Mail2
      { wch: 20 }, // Yetkili 2 Ad
      { wch: 15 }, // Yetkili 2 Tel
      { wch: 15 }, // Yetkili 2 Tel2
      { wch: 25 }, // Yetkili 2 Mail
      { wch: 25 }, // Yetkili 2 Mail2
      { wch: 15 }, // İlk İrtibat
      { wch: 15 }, // ETUYS
      { wch: 15 }  // DYS
    ];
    
    ws['!cols'] = columnWidths;
    
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Firmalar');

    // Buffer'a çevir
    const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });

    res.setHeader('Content-Disposition', 'attachment; filename=firma-import-template-yeni.xlsx');
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.send(buffer);

  } catch (error) {
    console.error('❌ Download template error:', error);
    res.status(500).json({
      success: false,
      message: 'Template indirilemedi',
      error: error.message
    });
  }
};

module.exports = {
  upload,
  importExcel,
  downloadTemplate
}; 