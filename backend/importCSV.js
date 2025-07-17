// 📊 CSV Import Script  
// CSV dosyasından firma verilerini MongoDB'ye aktarır

const fs = require('fs');
const csv = require('csv-parser');
const mongoose = require('mongoose');
const Firma = require('./models/Firma');
const User = require('./models/User');
require('dotenv').config();

const importCSV = async () => {
  try {
    // MongoDB'ye bağlan (modern syntax)
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ MongoDB bağlantısı başarılı');

    // Admin kullanıcıyı bul
    const adminUser = await User.findOne({ email: 'admin@firma.com' });
    if (!adminUser) {
      console.log('❌ Admin kullanıcı bulunamadı');
      process.exit(1);
    }

    const results = {
      success: 0,
      failed: 0,
      errors: []
    };

    console.log('🚀 CSV dosyası okunuyor...\n');

    let rowCount = 0;
    const allRows = [];

    // CSV dosyasını oku
    fs.createReadStream('./firma-tanimlama.csv')
      .pipe(csv({ 
        separator: ';',
        skipEmptyLines: true
        // Headers otomatik algılanacak
      }))
      .on('data', (row) => {
        rowCount++;
        
        // İlk satır column names olacak, ikinci satır da explanation, gerçek data 3. satirdan itibaren
        
        // Column'ları kontrol et
        const firmaIdKey = Object.keys(row).find(key => 
          key.includes('Firma ID') && !key.includes('Boş Bırak')
        );
        
        if (!firmaIdKey) {
          return;
        }

        const firmaId = row[firmaIdKey];
        
        // Header satırlarını atla
        if (firmaId === 'Firma ID' || firmaId === 'Firma ID (Boş Bırak)' || !firmaId || firmaId.trim() === '') {
          return;
        }

        // Bu satırı işlem için kaydet
        allRows.push({ row, rowCount, firmaIdKey, firmaId });
      })
      .on('end', async () => {
        console.log(`\n📊 CSV Okuma Tamamlandı: ${rowCount} satır okundu, ${allRows.length} satır işlenecek\n`);
        
        // Şimdi tüm satırları sırayla işle
        for (const { row, rowCount: itemRowCount, firmaIdKey, firmaId } of allRows) {
          let firmaData; // firmaData'yı try dışında tanımla
          try {
            // Sütun isimlerini dinamik olarak bul
            const vergiNoKey = Object.keys(row).find(key => key.includes('Vergi No'));
            const unvanKey = Object.keys(row).find(key => key.includes('Tam Unvan'));
            const adresKey = Object.keys(row).find(key => key.includes('Adres') && !key.includes('KEP'));
            const ilKey = Object.keys(row).find(key => key.includes('Firma İl'));
            const ilceKey = Object.keys(row).find(key => key.includes('Firma İlçe'));
            const kepKey = Object.keys(row).find(key => key.includes('KEP'));
            const yabanciKey = Object.keys(row).find(key => key.includes('Yabancı') || key.includes('Sermaye'));
            const faaliyetKey = Object.keys(row).find(key => key.includes('Faaliyet'));
            const yetkili1Key = Object.keys(row).find(key => key.includes('Yetkili Kişi1') && !key.includes('Tel') && !key.includes('Mail'));
            const yetkili1TelKey = Object.keys(row).find(key => key.includes('Yetkili Kişi1 Tel') && !key.includes('Tel2'));
            const yetkili1Tel2Key = Object.keys(row).find(key => key.includes('Yetkili Kişi1 Tel2'));
            const yetkili1MailKey = Object.keys(row).find(key => key.includes('Yetkili Kişi1 Mail') && !key.includes('Mail2'));
            const yetkili1Mail2Key = Object.keys(row).find(key => key.includes('Yetkili Kişi1 Mail2'));
            const yetkili2Key = Object.keys(row).find(key => key.includes('Yetkili Kişi2') && !key.includes('Tel') && !key.includes('Mail'));
            const yetkili2TelKey = Object.keys(row).find(key => key.includes('Yetkili Kişi2 Tel') && !key.includes('Tel2'));
            const yetkili2Tel2Key = Object.keys(row).find(key => key.includes('Yetkili Kişi2 Tel2'));
            const yetkili2MailKey = Object.keys(row).find(key => key.includes('Yetkili Kişi2 Mail') && !key.includes('Mail2'));
            const yetkili2Mail2Key = Object.keys(row).find(key => key.includes('Yetkili Kişi2 Mail2'));
            const ilkIrtibatKey = Object.keys(row).find(key => key.includes('İlk İrtibat'));
            const etuysKey = Object.keys(row).find(key => key.includes('ETUYS'));
            const dysKey = Object.keys(row).find(key => key.includes('DYS'));

            // Tarihleri parse et
            const parseDate = (dateStr) => {
              if (!dateStr || dateStr.trim() === '') return null;
              
              try {
                // Excel tarih formatlarını parse et
                const date = new Date(dateStr);
                return isNaN(date.getTime()) ? null : date;
              } catch (error) {
                return null;
              }
            };

            // Veri temizleme ve map etme
            firmaData = {
              firmaId: firmaId ? firmaId.toString().trim().toUpperCase() : '',
              vergiNoTC: row[vergiNoKey] ? row[vergiNoKey].toString().trim() : '',
              tamUnvan: row[unvanKey] ? row[unvanKey].toString().trim() : '',
              adres: row[adresKey] ? row[adresKey].toString().trim() : 'Adres Belirtilmemiş',
              firmaIl: row[ilKey] ? row[ilKey].toString().trim().toUpperCase() : 'DİĞER',
              firmaIlce: row[ilceKey] ? row[ilceKey].toString().trim().toUpperCase() : '',
              kepAdresi: row[kepKey] ? row[kepKey].toString().trim().toLowerCase() : '',
              yabanciIsareti: row[yabanciKey] === 'EVET' || row[yabanciKey] === 'Evet',
              anaFaaliyetKonusu: row[faaliyetKey] ? row[faaliyetKey].toString().trim() : '',
              ilkIrtibatKisi: row[ilkIrtibatKey] ? row[ilkIrtibatKey].toString().trim() : '',
              etuysYetkiBitis: parseDate(row[etuysKey]),
              dysYetkiBitis: parseDate(row[dysKey]),
              aktif: true,
              olusturanKullanici: adminUser._id
            };

            // Yetkili kişiler array'i
            const yetkiliKisiler = [];

            // Yetkili Kişi 1
            if (row[yetkili1Key] && row[yetkili1Key].trim() !== '') {
              yetkiliKisiler.push({
                adSoyad: row[yetkili1Key].toString().trim(),
                telefon1: row[yetkili1TelKey] ? row[yetkili1TelKey].toString().trim() : '',
                telefon2: row[yetkili1Tel2Key] ? row[yetkili1Tel2Key].toString().trim() : '',
                eposta1: row[yetkili1MailKey] ? row[yetkili1MailKey].toString().trim().toLowerCase() : '',
                eposta2: row[yetkili1Mail2Key] ? row[yetkili1Mail2Key].toString().trim().toLowerCase() : ''
              });
            }

            // Yetkili Kişi 2
            if (row[yetkili2Key] && row[yetkili2Key].trim() !== '') {
              yetkiliKisiler.push({
                adSoyad: row[yetkili2Key].toString().trim(),
                telefon1: row[yetkili2TelKey] ? row[yetkili2TelKey].toString().trim() : '',
                telefon2: row[yetkili2Tel2Key] ? row[yetkili2Tel2Key].toString().trim() : '',
                eposta1: row[yetkili2MailKey] ? row[yetkili2MailKey].toString().trim().toLowerCase() : '',
                eposta2: row[yetkili2Mail2Key] ? row[yetkili2Mail2Key].toString().trim().toLowerCase() : ''
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

            firmaData.yetkiliKisiler = yetkiliKisiler;

            // İlk irtibat kişisi boşsa ilk yetkili kişiyi kullan
            if (!firmaData.ilkIrtibatKisi || firmaData.ilkIrtibatKisi.trim() === '') {
              firmaData.ilkIrtibatKisi = yetkiliKisiler[0].adSoyad;
            }

            // Validasyon - Sadece firma ID zorunlu
            if (!firmaData.firmaId) {
              results.failed++;
              results.errors.push(`Firma ID boş: ${JSON.stringify(row)}`);
              return;
            }

            // Tam ünvan boşsa firma ID'yi kullan
            if (!firmaData.tamUnvan) {
              firmaData.tamUnvan = firmaData.firmaId;
            }

            // Duplicate kontrolü - sadece firma ID ile
            const existingFirma = await Firma.findOne({ 
              firmaId: firmaData.firmaId
            });

            if (existingFirma) {
              // Mevcut firmayı güncelle
              await Firma.findOneAndUpdate(
                { firmaId: firmaData.firmaId },
                { $set: firmaData },
                { new: true }
              );
              results.success++;
              if (results.success % 100 === 0) {
                console.log(`🔄 ${results.success} firma işlendi...`);
              }
            } else {
              // Yeni firma oluştur
              const firma = new Firma(firmaData);
              await firma.save();
              results.success++;
              if (results.success % 100 === 0) {
                console.log(`✅ ${results.success} firma işlendi...`);
              }
            }

          } catch (error) {
            results.failed++;
            results.errors.push(`${firmaData?.firmaId || 'Unknown'}: ${error.message}`);
            if (results.failed % 50 === 0) {
              console.log(`❌ ${results.failed} hata oluştu...`);
            }
          }
        }

        console.log('\n📊 CSV Import Tamamlandı:');
        console.log(`📝 Toplam Okunan Satır: ${rowCount}`);
        console.log(`✅ Başarılı: ${results.success}`);
        console.log(`❌ Hatalı: ${results.failed}`);
        console.log(`📝 Toplam Hata: ${results.errors.length}`);
        
        if (results.errors.length > 0) {
          console.log('\n🚨 İlk 10 Hata:');
          results.errors.slice(0, 10).forEach((error, index) => {
            console.log(`${index + 1}. ${error}`);
          });
        }

        mongoose.disconnect();
        process.exit(0);
      })
      .on('error', (error) => {
        console.error('❌ CSV okuma hatası:', error);
        mongoose.disconnect();
        process.exit(1);
      });

  } catch (error) {
    console.error('❌ Genel hata:', error);
    mongoose.disconnect();
    process.exit(1);
  }
};

importCSV(); 