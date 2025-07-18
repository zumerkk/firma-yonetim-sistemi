// 📊 Import Controller
// Excel ve CSV verilerini sisteme aktarma

const multer = require('multer');
const XLSX = require('xlsx');
const Firma = require('../models/Firma');
const path = require('path');
const fs = require('fs');
const csv = require('csv-parser');

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
    // Excel ve CSV dosya formatları
    const allowedTypes = [
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'text/csv',
      'application/csv'
    ];
    
    const ext = path.extname(file.originalname).toLowerCase();
    if (allowedTypes.includes(file.mimetype) || ext === '.csv' || ext === '.xlsx' || ext === '.xls') {
      cb(null, true);
    } else {
      cb(new Error('Sadece Excel (.xlsx, .xls) veya CSV dosyaları kabul edilir'));
    }
  },
  limits: { fileSize: 50 * 1024 * 1024 } // 50MB limit (büyük CSV dosyaları için)
});

// 📥 Excel/CSV Import
const importExcel = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'Dosya bulunamadı'
      });
    }

    console.log('📁 Import başladı:', req.file.originalname, 'Boyut:', req.file.size);

    const ext = path.extname(req.file.originalname).toLowerCase();
    let jsonData = [];

    // CSV dosyası ise
    if (ext === '.csv') {
      console.log('📄 CSV dosyası tespit edildi');
      jsonData = await parseCSV(req.file.path);
    } else {
      // Excel dosyası ise
      console.log('📊 Excel dosyası tespit edildi');
      const workbook = XLSX.readFile(req.file.path);
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      jsonData = XLSX.utils.sheet_to_json(worksheet);
    }
    
    console.log(`📋 Toplam ${jsonData.length} satır veri bulundu`);
    
    if (!jsonData || jsonData.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Dosya boş veya geçersiz format'
      });
    }

    const results = {
      success: 0,
      failed: 0,
      errors: [],
      skipped: 0,
      updated: 0
    };

    // Batch processing için
    const BATCH_SIZE = 100;
    const totalBatches = Math.ceil(jsonData.length / BATCH_SIZE);
    
    console.log(`🔄 ${totalBatches} batch halinde işlenecek (Batch boyutu: ${BATCH_SIZE})`);

    // Her satırı işle - batch processing
    for (let batchIndex = 0; batchIndex < totalBatches; batchIndex++) {
      const startIdx = batchIndex * BATCH_SIZE;
      const endIdx = Math.min(startIdx + BATCH_SIZE, jsonData.length);
      const batch = jsonData.slice(startIdx, endIdx);
      
      console.log(`📦 Batch ${batchIndex + 1}/${totalBatches} işleniyor (${startIdx + 1}-${endIdx})`);
      
      for (let i = 0; i < batch.length; i++) {
        const globalIndex = startIdx + i;
        try {
          const row = batch[i];
          
          // Excel sütunlarını model alanlarına map et
          const firmaData = mapExcelToFirma(row, globalIndex + 2); // +2 çünkü Excel 1'den başlar ve header var
          
          // Firma ID kontrolü - CSV'de belirtilmişse kullan, yoksa otomatik oluştur
          if (firmaData.firmaId) {
            const existingFirma = await Firma.findOne({ firmaId: firmaData.firmaId });
            if (existingFirma) {
              // Firma varsa güncelle
              Object.assign(existingFirma, {
                ...firmaData,
                sonGuncelleyen: req.user._id
              });
              await existingFirma.save();
              results.updated++;
              continue;
            }
          }

          // Vergi No kontrolü
          const existingVergiNo = await Firma.findOne({ vergiNoTC: firmaData.vergiNoTC });
          if (existingVergiNo) {
            // Vergi no ile firma varsa güncelle
            Object.assign(existingVergiNo, {
              ...firmaData,
              sonGuncelleyen: req.user._id
            });
            await existingVergiNo.save();
            results.updated++;
            continue;
          }

          // Yeni firma oluştur
          const firma = new Firma({
            ...firmaData,
            olusturanKullanici: req.user._id
          });

          await firma.save();
          results.success++;
          
          // Her 50 kayıtta bir log
          if ((results.success + results.updated) % 50 === 0) {
            console.log(`✅ İşlenen: ${results.success + results.updated} (Yeni: ${results.success}, Güncellenen: ${results.updated})`);
          }
          
        } catch (error) {
          results.failed++;
          // Sadece ilk 10 hatayı kaydet
          if (results.errors.length < 10) {
            results.errors.push(`Satır ${globalIndex + 2}: ${error.message}`);
          }
        }
      }
    }

    // Dosyayı sil
    fs.unlinkSync(req.file.path);

    console.log('✅ Import tamamlandı:', results);

    res.json({
      success: true,
      message: `İşlem tamamlandı: ${results.success} yeni, ${results.updated} güncellendi, ${results.failed} hatalı`,
      data: results
    });

  } catch (error) {
    console.error('❌ Import Excel/CSV error:', error);
    
    // Dosyayı temizle
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    
    res.status(500).json({
      success: false,
      message: 'Dosya işlenirken hata oluştu',
      error: error.message
    });
  }
};

// CSV Parse Helper
const parseCSV = (filePath) => {
  return new Promise((resolve, reject) => {
    const results = [];
    fs.createReadStream(filePath)
      .pipe(csv({
        separator: ',',
        encoding: 'utf8',
        skipLinesWithError: true
      }))
      .on('data', (data) => results.push(data))
      .on('end', () => resolve(results))
      .on('error', reject);
  });
};

// 🔄 Excel/CSV verilerini Firma modeline map et
const mapExcelToFirma = (row, rowNumber) => {
  // Excel/CSV sütun isimleri (yeni format)
  const firmaId = row['Firma ID (Boş Bırak)'] || row['Firma ID'] || row['firmaId'] || '';
  const vergiNoTC = row['Vergi No/TC No'] || row['vergiNoTC'] || row['VergiNo'] || '';
  const tamUnvan = row['Tam Unvan (NOKTASIZ BÜYÜK)'] || row['tamUnvan'] || row['Unvan'] || '';
  const adres = row['Adres'] || row['adres'] || '';
  const firmaIl = row['Firma İl'] || row['firmaIl'] || row['Il'] || '';
  const firmaIlce = row['Firma İlçe'] || row['firmaIlce'] || row['Ilce'] || '';
  const kepAdresi = row['KEP Adresi'] || row['kepAdresi'] || row['KEP'] || '';
  const yabanciSermaye = row['Yabancı Sermayeli mi?'] || row['yabanciSermaye'] || '';
  const anaFaaliyetKonusu = row['Ana Faaliyet Konusu'] || row['anaFaaliyetKonusu'] || '';
  const ilkIrtibatKisi = row['İlk İrtibat Kişisi'] || row['ilkIrtibatKisi'] || '';
  const etuysYetki = row['ETUYS YETKİ BİTİŞ'] || row['etuysYetki'] || '';
  const dysYetki = row['DYS YETKİ BİTİŞ'] || row['dysYetki'] || '';
  
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
  const yetkili2Email2 = row['Yetkili Kişi,2 Mail2'] || row['Yetkili Kişi2 Mail2'] || row['YetkiliEmail22'] || '';

  // Boş değerleri kontrol et ve atla
  if (!vergiNoTC || !tamUnvan) {
    throw new Error('Vergi No/TC ve Tam ünvan zorunludur');
  }

  // Yetkili kişiler array'i
  const yetkiliKisiler = [];
  
  // Yetkili Kişi 1
  if (yetkili1Ad && yetkili1Ad.trim() !== '') {
    // Telefon numarası yoksa varsayılan ekle
    const tel1 = yetkili1Tel1 && yetkili1Tel1.trim() !== '' ? yetkili1Tel1.trim() : '0000000000';
    const email1 = yetkili1Email1 && yetkili1Email1.trim() !== '' ? yetkili1Email1.trim() : `${yetkili1Ad.toLowerCase().replace(/\s+/g, '.')}@example.com`;
    
    yetkiliKisiler.push({
      adSoyad: yetkili1Ad.trim(),
      telefon1: tel1,
      telefon2: yetkili1Tel2 || '',
      eposta1: email1,
      eposta2: yetkili1Email2 || ''
    });
  }

  // Yetkili Kişi 2
  if (yetkili2Ad && yetkili2Ad.trim() !== '') {
    // Telefon numarası yoksa varsayılan ekle
    const tel1 = yetkili2Tel1 && yetkili2Tel1.trim() !== '' ? yetkili2Tel1.trim() : '0000000000';
    const email1 = yetkili2Email1 && yetkili2Email1.trim() !== '' ? yetkili2Email1.trim() : `${yetkili2Ad.toLowerCase().replace(/\s+/g, '.')}@example.com`;
    
    yetkiliKisiler.push({
      adSoyad: yetkili2Ad.trim(),
      telefon1: tel1,
      telefon2: yetkili2Tel2 || '',
      eposta1: email1,
      eposta2: yetkili2Email2 || ''
    });
  }

  // Eğer hiç yetkili kişi yoksa varsayılan ekle
  if (yetkiliKisiler.length === 0) {
    const defaultName = ilkIrtibatKisi && ilkIrtibatKisi.trim() !== '' ? ilkIrtibatKisi.trim() : 'Belirtilmemiş';
    yetkiliKisiler.push({
      adSoyad: defaultName,
      telefon1: '0000000000',
      telefon2: '',
      eposta1: 'bilgi@example.com',
      eposta2: ''
    });
  }

  // Tarihleri parse et
  const parseDate = (dateStr) => {
    if (!dateStr || dateStr.toString().trim() === '') return null;
    
    try {
      const str = dateStr.toString().trim();
      
      // DD.MM.YYYY formatı
      if (str.match(/^\d{2}\.\d{2}\.\d{4}$/)) {
        const [day, month, year] = str.split('.');
        return new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
      }
      
      // Diğer formatlar
      const date = new Date(str);
      return isNaN(date.getTime()) ? null : date;
    } catch (error) {
      return null;
    }
  };

  const result = {
    vergiNoTC: vergiNoTC.toString().trim(),
    tamUnvan: tamUnvan.toString().trim(),
    adres: adres ? adres.toString().trim() : 'Belirtilmemiş',
    firmaIl: firmaIl ? firmaIl.toString().toUpperCase().trim() : 'İSTANBUL',
    firmaIlce: firmaIlce ? firmaIlce.toString().toUpperCase().trim() : 'MERKEZ',
    kepAdresi: kepAdresi ? kepAdresi.toString().toLowerCase().trim() : '',
    yabanciSermayeli: yabanciSermaye === 'EVET' || yabanciSermaye === 'Evet' || yabanciSermaye === true,
    anaFaaliyetKonusu: anaFaaliyetKonusu ? anaFaaliyetKonusu.toString().trim() : '',
    ilkIrtibatKisi: ilkIrtibatKisi ? ilkIrtibatKisi.toString().trim() : yetkiliKisiler[0].adSoyad,
    etuysYetkiBitisTarihi: parseDate(etuysYetki),
    dysYetkiBitisTarihi: parseDate(dysYetki),
    yetkiliKisiler,
    aktif: true
  };

  // Firma ID varsa ekle
  if (firmaId && firmaId.toString().trim() !== '') {
    result.firmaId = firmaId.toString().toUpperCase().trim();
  }

  return result;
};

// 📤 Örnek Excel Template İndir
const downloadTemplate = (req, res) => {
  try {
    // Örnek veri - yeni format
    const templateData = [
      {
        'Firma ID (Boş Bırak)': 'A000001',
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
      { wch: 20 }, // Faaliyet
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
      { wch: 20 }, // İlk İrtibat
      { wch: 15 }, // ETUYS
      { wch: 15 }  // DYS
    ];
    
    ws['!cols'] = columnWidths;
    
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Firmalar');

    // Buffer'a çevir
    const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });

    res.setHeader('Content-Disposition', 'attachment; filename=firma-import-template.xlsx');
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