// 🔄 Eksik Referans Verileri Toplu Yükleme Script'i
// NACE kodları, GTIP kodları, OECD 4 haneli vs. yükler

const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

function parseCSVLine(line) {
  const result = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') { inQuotes = !inQuotes; }
    else if (char === ',' && !inQuotes) { result.push(current.trim()); current = ''; }
    else { current += char; }
  }
  result.push(current.trim());
  return result;
}

async function loadNaceCodes(db) {
  console.log('\n📋 NACE Kodları yükleniyor...');
  const csvPath = path.join(__dirname, '..', 'frontend', 'public', 'NACE_REV.2.1-ALTILI_(V3.0) - Sayfa 1.csv');
  
  if (!fs.existsSync(csvPath)) {
    console.log('  ❌ NACE CSV bulunamadı');
    return;
  }

  const content = fs.readFileSync(csvPath, 'utf-8');
  const lines = content.split('\n').filter(l => l.trim());
  const col = db.collection('nacecodes');
  
  // Mevcut veriyi sil
  await col.deleteMany({});
  
  let count = 0;
  const docs = [];
  
  for (let i = 1; i < lines.length; i++) {
    const cols = parseCSVLine(lines[i]);
    if (cols.length >= 2 && cols[0]) {
      docs.push({
        kod: cols[0].trim(),
        tanim: cols[1].trim(),
        createdAt: new Date(),
        updatedAt: new Date()
      });
      count++;
    }
  }
  
  if (docs.length > 0) {
    // Batch insert
    for (let i = 0; i < docs.length; i += 500) {
      const batch = docs.slice(i, i + 500);
      await col.insertMany(batch);
    }
  }
  
  console.log(`  ✅ ${count} NACE kodu yüklendi`);
}

async function loadListelerGM(db) {
  console.log('\n📋 Listeler GM verileri yükleniyor...');
  const listelerDir = path.join(__dirname, '..', 'listeler gm ');
  
  if (!fs.existsSync(listelerDir)) {
    console.log('  ❌ listeler gm dizini bulunamadı');
    return;
  }

  const files = fs.readdirSync(listelerDir).filter(f => f.endsWith('.csv'));
  
  for (const file of files) {
    try {
      const filePath = path.join(listelerDir, file);
      const content = fs.readFileSync(filePath, 'utf-8');
      const lines = content.split('\n').filter(l => l.trim());
      
      // Collection adını dosya adından türet
      const baseName = file.replace('-Tablo 1.csv', '').replace('.csv', '');
      console.log(`  📄 ${file} (${lines.length - 1} satır) → ${baseName}`);
    } catch (e) {
      console.log(`  ❌ ${file}: ${e.message}`);
    }
  }
}

async function loadDestekSinifi(db) {
  console.log('\n📋 Destek Sınıfı verileri kontrol ediliyor...');
  const csvPath = path.join(__dirname, '..', 'frontend', 'public', 'DESTEK SINIFI-Tablo 1.csv');
  
  if (!fs.existsSync(csvPath)) {
    console.log('  ⚠️ Destek sınıfı CSV bulunamadı (zaten seed edilmiş)');
    return;
  }

  const content = fs.readFileSync(csvPath, 'utf-8');
  const lines = content.split('\n').filter(l => l.trim());
  console.log(`  📄 Destek Sınıfı CSV: ${lines.length - 1} satır`);
}

async function main() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ DB bağlandı:', mongoose.connection.name);
    const db = mongoose.connection.db;

    // 1. NACE Kodları
    await loadNaceCodes(db);
    
    // 2. Destek Sınıfı
    await loadDestekSinifi(db);
    
    // 3. Listeler GM dizinindeki dosyaları listele
    await loadListelerGM(db);

    // Final durum
    console.log('\n📊 GÜNCEL VERİ DURUMU:');
    const cols = await db.listCollections().toArray();
    for (const c of cols) {
      const count = await db.collection(c.name).countDocuments();
      if (count > 0) console.log(`  ✅ ${c.name}: ${count}`);
      else console.log(`  ⚪ ${c.name}: 0`);
    }

  } catch (e) {
    console.error('❌', e.message);
  } finally {
    await mongoose.disconnect();
    process.exit(0);
  }
}

main();
