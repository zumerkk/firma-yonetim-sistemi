// 🌐 NACE 6-lı Kodları Seed Script
// CSV: listeler 9903 (2)/OECD 6 lı-Tablo 1.csv (Kod;Tanım)

const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');
const NaceCode = require('./models/NaceCode');
require('dotenv').config();

function readCsvLines(filePath) {
  try {
    const raw = fs.readFileSync(filePath, 'utf8');
    return raw.split(/\r?\n/).map(l => l.replace(/;+/g, ';').trim());
  } catch (e) {
    return null;
  }
}

function parseNaceCsv(lines) {
  const result = [];
  let currentKategori = '';
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (!line) continue;
    // Expect format: Kod;Tanım;...
    const parts = line.split(';');
    const kod = (parts[0] || '').trim();
    const tanim = (parts[1] || '').trim();

    if (!kod || kod.toLowerCase() === 'kod') {
      // header
      continue;
    }

    // Section header like 'A' 'B' 'C' etc.
    if (/^[A-Z]$/.test(kod) && tanim) {
      currentKategori = `${kod} - ${tanim}`;
      continue;
    }

    // Numeric codes (with dots) or plain numbers
    if (/^[0-9]+(\.[0-9]+)*$/.test(kod) && tanim) {
      result.push({ kod, aciklama: tanim, kategori: currentKategori });
    }
  }
  return result;
}

async function seedNaceCodes() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/firma-yonetim-sistemi');
    console.log('✅ MongoDB bağlantısı başarılı');

    const projectRoot = path.resolve(__dirname, '..');
    const candidates = [
      path.join(projectRoot, 'listeler 9903 (2)', 'OECD 6 lı-Tablo 1.csv'),
      path.join(projectRoot, 'csv', 'OECD 6 lı-Tablo 1.csv')
    ];
    let lines = null;
    for (const p of candidates) {
      lines = readCsvLines(p);
      if (lines && lines.length) { console.log('📄 CSV bulundu:', p); break; }
    }
    if (!lines) throw new Error('CSV dosyası bulunamadı');

    const docs = parseNaceCsv(lines);
    console.log('📊 Parse edilen kayıt:', docs.length);

    await NaceCode.deleteMany({});
    const inserted = await NaceCode.insertMany(docs);
    console.log(`✅ ${inserted.length} NACE kodu eklendi`);

    const categories = await NaceCode.getCategories();
    console.log('📁 Kategoriler:', categories.length);
  } catch (e) {
    console.error('❌ NACE seed hatası:', e);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 MongoDB bağlantısı kapatıldı');
  }
}

if (require.main === module) {
  seedNaceCodes();
}

module.exports = { seedNaceCodes };