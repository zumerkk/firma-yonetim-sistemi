// 🌱 Unit (Birim) Kodları Seed Script
// Kaynak CSV: csv/Ithal-Liste-Bilgileri.xls - BİRİM KODLARI.csv

// .env yükleme (hem backend klasörü hem proje kökü)
require('dotenv').config({ path: require('path').join(__dirname, '.env') });
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const fs = require('fs');
const path = require('path');
const readline = require('readline');
const mongoose = require('mongoose');
const UnitCode = require('./models/UnitCode');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/firma-yonetim';

async function connectDB() {
  const conn = await mongoose.connect(MONGODB_URI);
  console.log(`✅ MongoDB Bağlandı: ${conn.connection.host}`);
}

async function seed() {
  await connectDB();
  try {
    const csvPath = path.join(__dirname, '..', 'csv', 'Ithal-Liste-Bilgileri.xls - BİRİM KODLARI.csv');
    if (!fs.existsSync(csvPath)) throw new Error('CSV bulunamadı: ' + csvPath);

    console.log('🗑️ Eski UnitCode kayıtları siliniyor...');
    await UnitCode.deleteMany({});

    const rl = readline.createInterface({ input: fs.createReadStream(csvPath, { encoding: 'utf8' }) });
    let lineNo = 0; const batch = []; const BATCH_SIZE = 1000;

    for await (const raw of rl) {
      lineNo += 1; if (lineNo === 1) continue; // Header atla
      const line = raw.trim(); if (!line) continue;
      const firstComma = line.indexOf(','); if (firstComma <= 0) continue;
      const kod = line.slice(0, firstComma).replace(/"/g, '').trim();
      const aciklama = line.slice(firstComma + 1).replace(/"/g, '').trim();
      if (!kod || !aciklama) continue;
      batch.push({ kod, aciklama });
      if (batch.length >= BATCH_SIZE) { await UnitCode.insertMany(batch, { ordered: false }); batch.length = 0; }
    }
    if (batch.length) await UnitCode.insertMany(batch, { ordered: false });
    console.log('🎉 UnitCode seed tamam. Toplam:', await UnitCode.countDocuments());
  } catch (e) {
    console.error('❌ UnitCode seed hatası:', e.message);
  } finally {
    await mongoose.connection.close(); console.log('🔌 MongoDB bağlantısı kapatıldı.');
  }
}

if (require.main === module) seed();

module.exports = { seed };


