// 🏢 Firma CSV Import Script - Yeni DB'ye toplu firma yükleme
const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

// Model'i direkt tanımla (validation bypass için)
const Firma = require('./models/Firma');
const User = require('./models/User');

function parseCSVLine(line) {
  const result = [];
  let current = '';
  let inQuotes = false;
  
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  result.push(current.trim());
  return result;
}

async function importFirmalar() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ DB bağlandı:', mongoose.connection.name);

    const adminUser = await User.findOne({ rol: 'admin' });
    if (!adminUser) {
      console.error('❌ Admin kullanıcı bulunamadı');
      process.exit(1);
    }
    console.log('👤 Admin:', adminUser.email);

    const csvPath = path.join(__dirname, 'firma tanımlama (1) - firmaliste.csv');
    const csvContent = fs.readFileSync(csvPath, 'utf-8');
    const lines = csvContent.split('\n').filter(l => l.trim());
    
    // İlk satır header
    const headers = parseCSVLine(lines[0]);
    console.log('📋 CSV headers:', headers.length, 'sütun');
    console.log('📊 Toplam satır:', lines.length - 1);

    let basarili = 0;
    let hatali = 0;
    let atlanan = 0;

    // Her 100'de log bas
    for (let i = 1; i < lines.length; i++) {
      try {
        const cols = parseCSVLine(lines[i]);
        if (cols.length < 6) continue;

        const firmaId = cols[0] || `AUTO_${String(i).padStart(6, '0')}`;
        const vergiNoTC = cols[1] || '';
        const tamUnvan = cols[2] || '';
        const adres = cols[3] || '';
        const firmaIl = cols[4] || '';
        const firmaIlce = cols[5] || '';
        const kepAdresi = cols[6] || '';
        const yabanciSermaye = (cols[7] || '').toUpperCase() === 'EVET';
        const anaFaaliyetKonusu = cols[8] || '';
        const ilkIrtibatKisi = cols[19] || cols[9] || 'Belirtilmemiş';

        if (!tamUnvan) continue;

        // Mevcut kontrolü
        const existing = await Firma.findOne({ firmaId });
        if (existing) { atlanan++; continue; }

        // Yetkili kişiler
        const yetkiliKisiler = [];
        if (cols[9]) {
          yetkiliKisiler.push({
            adSoyad: cols[9],
            telefon1: cols[10] || '',
            telefon2: cols[11] || '',
            eposta1: cols[12] || '',
            eposta2: cols[13] || ''
          });
        }
        if (cols[14]) {
          yetkiliKisiler.push({
            adSoyad: cols[14],
            telefon1: cols[15] || '',
            telefon2: cols[16] || '',
            eposta1: cols[17] || '',
            eposta2: cols[18] || ''
          });
        }

        // ETUYS ve DYS yetki bitiş tarihleri
        let etuysYetkiBitis = null;
        let dysYetkiBitis = null;
        if (cols[20]) {
          const d = new Date(cols[20]);
          if (!isNaN(d.getTime())) etuysYetkiBitis = d;
        }
        if (cols[21]) {
          const d = new Date(cols[21]);
          if (!isNaN(d.getTime())) dysYetkiBitis = d;
        }

        // insertOne ile validation bypass
        await mongoose.connection.db.collection('firmas').insertOne({
          firmaId,
          vergiNoTC,
          tamUnvan,
          adres,
          firmaIl,
          firmaIlce,
          kepAdresi,
          yabanciIsareti: yabanciSermaye,
          anaFaaliyetKonusu,
          ilkIrtibatKisi,
          yetkiliKisiler,
          etuysYetkiBitis,
          dysYetkiBitis,
          olusturanKullanici: adminUser._id,
          aktif: true,
          createdAt: new Date(),
          updatedAt: new Date()
        });

        basarili++;

        if (basarili % 100 === 0) {
          console.log(`  ✅ ${basarili} firma eklendi...`);
        }
      } catch (err) {
        hatali++;
        if (hatali <= 5) console.log(`  ❌ Satır ${i}: ${err.message}`);
      }
    }

    console.log('\n📊 SONUÇ:');
    console.log(`  ✅ Başarılı: ${basarili}`);
    console.log(`  ⏭️ Atlanan (mevcut): ${atlanan}`);
    console.log(`  ❌ Hatalı: ${hatali}`);
    console.log(`  📊 Toplam: ${basarili + atlanan + hatali}`);

  } catch (err) {
    console.error('💀 Genel hata:', err);
  } finally {
    await mongoose.disconnect();
    process.exit(0);
  }
}

importFirmalar();
