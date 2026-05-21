const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const OecdKod4Haneli = require('./models/OecdKod4Haneli');

function parseCSVLine(line, sep = ';') {
  const result = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') { inQuotes = !inQuotes; }
    else if (char === sep && !inQuotes) { result.push(current.trim()); current = ''; }
    else { current += char; }
  }
  result.push(current.trim());
  return result;
}

async function main() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ DB bağlandı\n');

    const csvPath = path.join(__dirname, '..', 'nace6.csv');
    if (!fs.existsSync(csvPath)) {
      console.log('⚠️ nace6.csv bulunamadı!');
      process.exit(1);
    }

    const content = fs.readFileSync(csvPath, 'utf-8');
    const lines = content.split('\n').filter(l => l.trim());
    
    // Clear the collection first
    await OecdKod4Haneli.deleteMany({});
    console.log('🗑️ Eski kodlar temizlendi');

    const docs = [];
    const seen = new Set();

    for (let i = 1; i < lines.length; i++) { // Skip header
      const cols = parseCSVLine(lines[i]);
      if (cols.length >= 2 && cols[0] && cols[1]) {
        const rawKod = cols[0].trim();
        const tanim = cols[1].trim();

        // NACE format pattern: letters or numbers
        if (/^[a-zA-Z0-9\.]+$/.test(rawKod)) {
          if (!seen.has(rawKod)) {
            seen.add(rawKod);
            docs.push({
              kod: rawKod,
              tanim: tanim,
              aktif: true,
              kullanimSayisi: 0,
              createdAt: new Date(),
              updatedAt: new Date()
            });
          }
        }
      }
    }

    if (docs.length > 0) {
      // Batch insert
      for (let i = 0; i < docs.length; i += 1000) {
        const batch = docs.slice(i, i + 1000);
        await OecdKod4Haneli.insertMany(batch, { ordered: false }).catch(e => {
          if (e.code !== 11000) console.log(`⚠️ Batch hata:`, e.message.substring(0, 80));
        });
      }
      console.log(`✅ ${docs.length} NACE 6 kodu yüklendi`);
    } else {
      console.log('⚠️ Yüklenecek kod bulunamadı');
    }

  } catch (error) {
    console.error('❌ Hata:', error);
  } finally {
    await mongoose.disconnect();
    console.log('🛑 DB bağlantısı kapatıldı');
    process.exit(0);
  }
}

main();
