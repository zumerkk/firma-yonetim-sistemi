// 🌱 GTIP Kodları Seed Script
// Büyük CSV: "belge ytb - GTIP KODLARI.csv" dosyasını MongoDB'ye yükler

require('dotenv').config({ path: require('path').join(__dirname, '.env') });
require('dotenv').config({ path: require('path').join(__dirname) + '/.env' });
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');
const readline = require('readline');
const GTIPCode = require('./models/GTIPCode');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/firma-yonetim';

async function connectDB() {
  const conn = await mongoose.connect(MONGODB_URI);
  console.log(`✅ MongoDB Bağlandı: ${conn.connection.host}`);
}

async function seed() {
  try {
    await connectDB();

    const csvPath = path.join(__dirname, '..', 'belge ytb - GTIP KODLARI.csv');
    if (!fs.existsSync(csvPath)) {
      throw new Error(`CSV bulunamadı: ${csvPath}`);
    }

    console.log('🗑️ Eski GTIP kayıtları siliniyor...');
    await GTIPCode.deleteMany({});

    console.log('📥 CSV okunuyor:', path.basename(csvPath));
    const rl = readline.createInterface({
      input: fs.createReadStream(csvPath, { encoding: 'utf8' })
    });

    let lineNo = 0;
    const batch = [];
    const BATCH_SIZE = 1000; // hızlı import için batch

    for await (const raw of rl) {
      lineNo += 1;
      if (lineNo === 1) continue; // Header atla: GTIP KODU,AÇIKLAMASI
      const line = raw.trim();
      if (!line) continue;

      // Basit CSV ayrıştırma: İlk virgüle kadar GTIP, kalan açıklama
      const firstComma = line.indexOf(',');
      if (firstComma <= 0) continue;
      let kod = line.slice(0, firstComma).replace(/"/g, '').trim();
      let aciklama = line.slice(firstComma + 1).trim();
      if (aciklama.startsWith('"') && aciklama.endsWith('"')) {
        aciklama = aciklama.slice(1, -1);
      }

      if (!kod || !/^[0-9]{6,}$/.test(kod)) {
        continue;
      }

      batch.push({ kod, gtipKodu: kod, aciklama });

      if (batch.length >= BATCH_SIZE) {
        try {
          const res = await GTIPCode.insertMany(batch, { ordered: false });
          console.log(`✅ ${lineNo.toLocaleString('tr-TR')} satır işlendi... (+${res.length})`);
        } catch (e) {
          console.log(`⚠️ Batch insert hatası (devam): ${e.message}`);
        }
        batch.length = 0;
      }
    }

    if (batch.length) {
      try {
        const res = await GTIPCode.insertMany(batch, { ordered: false });
        console.log(`✅ Son batch işlendi (+${res.length})`);
      } catch (e) {
        console.log(`⚠️ Son batch hatası (devam): ${e.message}`);
      }
    }

    const total = await GTIPCode.countDocuments();
    console.log(`🎉 GTIP seed tamamlandı. Toplam kayıt: ${total.toLocaleString('tr-TR')}`);
  } catch (err) {
    console.error('❌ Seed hatası:', err.message);
  } finally {
    await mongoose.connection.close();
    console.log('🔌 MongoDB bağlantısı kapatıldı.');
  }
}

if (require.main === module) {
  seed();
}

module.exports = { seed };


