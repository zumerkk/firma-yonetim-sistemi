// 🌐 OECD 4 Haneli Kodları Seed Script
// CSV: 4_haneliler.csv (Kod;Tanım) - XX.XX formatında 651 adet kod

const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');
const OecdKod4Haneli = require('./models/OecdKod4Haneli');
require('dotenv').config();

function readCsvLines(filePath) {
  try {
    const raw = fs.readFileSync(filePath, 'utf8');
    return raw.split(/\r?\n/).map(l => l.replace(/;+/g, ';').trim());
  } catch (e) {
    console.error('❌ CSV okuma hatası:', e.message);
    return null;
  }
}

function parseOecdKod4HaneliCsv(lines) {
  const result = [];
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (!line) continue;
    
    // Format: Kod;Tanım
    const parts = line.split(';');
    const kod = (parts[0] || '').trim();
    const tanim = (parts[1] || '').trim();

    // Header satırını atla
    if (!kod || kod.toLowerCase() === 'kod') {
      continue;
    }

    // Sadece XX.XX formatındaki kodları al (4 haneli)
    if (/^\d{2}\.\d{2}$/.test(kod) && tanim) {
      result.push({ 
        kod, 
        tanim,
        aktif: true,
        kullanimSayisi: 0
      });
    }
  }
  
  return result;
}

async function seedOecdKod4Haneli() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/firma-yonetim-sistemi');
    console.log('✅ MongoDB bağlantısı başarılı');

    const projectRoot = path.resolve(__dirname, '..');
    const csvPath = path.join(projectRoot, '4_haneliler.csv');
    
    console.log('📄 CSV dosyası aranıyor:', csvPath);
    
    if (!fs.existsSync(csvPath)) {
      throw new Error('4_haneliler.csv dosyası bulunamadı! Lütfen önce CSV dosyasını oluşturun.');
    }

    const lines = readCsvLines(csvPath);
    if (!lines || lines.length === 0) {
      throw new Error('CSV dosyası boş veya okunamadı');
    }

    const docs = parseOecdKod4HaneliCsv(lines);
    console.log('📊 Parse edilen kayıt sayısı:', docs.length);

    if (docs.length === 0) {
      throw new Error('CSV dosyasından veri parse edilemedi');
    }

    // Mevcut kayıtları temizle
    const deleteResult = await OecdKod4Haneli.deleteMany({});
    console.log(`🗑️  ${deleteResult.deletedCount} eski kayıt silindi`);

    // Yeni kayıtları ekle
    const inserted = await OecdKod4Haneli.insertMany(docs);
    console.log(`✅ ${inserted.length} OECD 4 haneli kod başarıyla eklendi`);

    // Örnek kayıtları göster
    console.log('\n📋 İlk 5 örnek kayıt:');
    const samples = await OecdKod4Haneli.find().limit(5);
    samples.forEach(s => {
      console.log(`   ${s.kod} - ${s.tanim.substring(0, 60)}...`);
    });

    // Toplam sayıyı kontrol et
    const total = await OecdKod4Haneli.countDocuments({ aktif: true });
    console.log(`\n📊 Veritabanında toplam ${total} aktif kod bulunuyor`);

  } catch (e) {
    console.error('❌ OECD 4 Haneli seed hatası:', e.message);
    console.error(e);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 MongoDB bağlantısı kapatıldı');
  }
}

// Script direkt çalıştırılırsa
if (require.main === module) {
  seedOecdKod4Haneli();
}

module.exports = { seedOecdKod4Haneli };

