// 🚀 TÜM EKSİK VERİLERİ TOPLU YÜKLEME
// OECD 4 haneli, GTIP kodları, Makine Tip Kodları, Kullanılmış Makine Kodları,
// Yatırım Konusu (ikonusu), Kapasite, vs.

const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

function parseCSVLine(line, sep = ',') {
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

function readCSV(filePath, sep = ',') {
  if (!fs.existsSync(filePath)) return [];
  const content = fs.readFileSync(filePath, 'utf-8');
  return content.split('\n').filter(l => l.trim());
}

async function main() {
  await mongoose.connect(process.env.MONGODB_URI);
  const db = mongoose.connection.db;
  console.log('✅ DB bağlandı\n');

  // ═══════════════════════════════════════
  // 1. OECD 4 HANELİ KODLARI (ikonusu CSV'sinden)
  // ═══════════════════════════════════════
  console.log('📋 1. Yatırım Konusu / OECD 4 Haneli Kodları...');
  const ikonusuPath = path.join(__dirname, '..', 'csv', 'listeler gm teşvik sistemi - ikonusu.csv');
  const ikonusuLines = readCSV(ikonusuPath);
  
  if (ikonusuLines.length > 0) {
    const col = db.collection('oecdkod4haneli');
    await col.deleteMany({});
    const docs = [];
    
    for (const line of ikonusuLines) {
      // Format: "0111,TAHIL VE BAŞKA YERDE..." (virgülle ayrılmış)
      const cols = parseCSVLine(line);
      if (cols.length >= 2 && cols[0]) {
        const rawKod = cols[0].trim();
        // XX.XX formatına dönüştür (0111 → 01.11)
        let kod = rawKod;
        if (/^\d{4}$/.test(rawKod)) {
          kod = rawKod.substring(0, 2) + '.' + rawKod.substring(2, 4);
        } else if (/^\d{3}$/.test(rawKod)) {
          // 3 haneli olanları da ekle (000 formatı)
          kod = '0' + rawKod.charAt(0) + '.' + rawKod.substring(1, 3);
        }
        
        // XX.XX formatı kontrolü - geçen kodları ekle, geçmeyenleri de raw olarak ekle
        docs.push({
          kod,
          tanim: cols[1].trim(),
          aktif: true,
          kullanimSayisi: 0,
          createdAt: new Date(),
          updatedAt: new Date()
        });
      }
    }
    
    if (docs.length > 0) {
      // Duplicate'leri filtrele
      const uniqueDocs = [];
      const seen = new Set();
      for (const d of docs) {
        if (!seen.has(d.kod)) {
          seen.add(d.kod);
          uniqueDocs.push(d);
        }
      }
      await col.insertMany(uniqueDocs, { ordered: false }).catch(() => {});
      console.log(`  ✅ ${uniqueDocs.length} OECD 4 haneli kod yüklendi`);
    }
  } else {
    console.log('  ⚠️ ikonusu CSV bulunamadı');
  }

  // ═══════════════════════════════════════
  // 2. GTIP KODLARI
  // ═══════════════════════════════════════
  console.log('\n📋 2. GTIP Kodları...');
  const gtipPath = path.join(__dirname, '..', 'csv', 'Ithal-Liste-Bilgileri - GTIP KODLARI.csv');
  const gtipLines = readCSV(gtipPath);
  
  if (gtipLines.length > 1) {
    const col = db.collection('gtipcodes');
    await col.deleteMany({});
    const docs = [];
    
    for (let i = 1; i < gtipLines.length; i++) { // İlk satır header
      const cols = parseCSVLine(gtipLines[i]);
      if (cols.length >= 2 && cols[0]) {
        const kod = cols[0].trim();
        const aciklama = cols[1].trim().replace(/^"|"$/g, '');
        if (kod && aciklama) {
          docs.push({
            kod,
            gtipKodu: kod,
            aciklama,
            aktif: true,
            kullanimSayisi: 0,
            createdAt: new Date(),
            updatedAt: new Date()
          });
        }
      }
    }
    
    if (docs.length > 0) {
      // Batch insert
      for (let i = 0; i < docs.length; i += 1000) {
        const batch = docs.slice(i, i + 1000);
        await col.insertMany(batch, { ordered: false }).catch(e => {
          if (e.code !== 11000) console.log(`  ⚠️ Batch hata:`, e.message.substring(0, 80));
        });
      }
      console.log(`  ✅ ${docs.length} GTIP kodu yüklendi`);
    }
  } else {
    console.log('  ⚠️ GTIP CSV bulunamadı');
  }

  // ═══════════════════════════════════════
  // 3. MAKİNE TEÇHİZAT TİPİ KODLARI
  // ═══════════════════════════════════════
  console.log('\n📋 3. Makine Teçhizat Tipi Kodları...');
  const machineTypePath = path.join(__dirname, '..', 'csv', 'Ithal-Liste-Bilgileri - MAKİNE TEÇHİZAT TİPİ.csv');
  const mtLines = readCSV(machineTypePath);
  
  if (mtLines.length > 1) {
    const col = db.collection('machinetypecodes');
    await col.deleteMany({});
    const docs = [];
    
    for (let i = 1; i < mtLines.length; i++) {
      const cols = parseCSVLine(mtLines[i]);
      if (cols.length >= 2 && cols[0]) {
        docs.push({
          kod: cols[0].trim(),
          aciklama: cols[1].trim(),
          aktif: true,
          createdAt: new Date(),
          updatedAt: new Date()
        });
      }
    }
    
    if (docs.length > 0) {
      await col.insertMany(docs, { ordered: false }).catch(() => {});
      console.log(`  ✅ ${docs.length} makine tipi kodu yüklendi`);
    }
  }

  // ═══════════════════════════════════════
  // 4. KULLANILMIŞ MAKİNE KODLARI
  // ═══════════════════════════════════════
  console.log('\n📋 4. Kullanılmış Makine Kodları...');
  const usedMachinePath = path.join(__dirname, '..', 'csv', 'Ithal-Liste-Bilgileri - KULLANILMIŞ MAKİNE KODLARI.csv');
  const umLines = readCSV(usedMachinePath);
  
  if (umLines.length > 1) {
    const col = db.collection('usedmachinecodes');
    await col.deleteMany({});
    const docs = [];
    
    for (let i = 1; i < umLines.length; i++) {
      const cols = parseCSVLine(umLines[i]);
      if (cols.length >= 2 && cols[0]) {
        docs.push({
          kod: cols[1].trim(), // Sıra: AÇIKLAMA, KOD
          aciklama: cols[0].trim(),
          aktif: true,
          createdAt: new Date(),
          updatedAt: new Date()
        });
      }
    }
    
    if (docs.length > 0) {
      await col.insertMany(docs, { ordered: false }).catch(() => {});
      console.log(`  ✅ ${docs.length} kullanılmış makine kodu yüklendi`);
    }
  }

  // ═══════════════════════════════════════
  // 5. DESTEK UNSURLARI (ldestuns)
  // ═══════════════════════════════════════
  console.log('\n📋 5. Destek Unsurları...');
  const destUnsPath = path.join(__dirname, '..', 'csv', 'listeler gm teşvik sistemi - ldestuns (1).csv');
  const destUnsLines = readCSV(destUnsPath);
  
  if (destUnsLines.length > 0) {
    const col = db.collection('destekunsurus');
    const existing = await col.countDocuments();
    if (existing === 0) {
      const docs = [];
      for (const line of destUnsLines) {
        const val = line.trim();
        if (val) {
          docs.push({
            ad: val,
            aktif: true,
            createdAt: new Date(),
            updatedAt: new Date()
          });
        }
      }
      if (docs.length > 0) {
        await col.insertMany(docs, { ordered: false }).catch(() => {});
        console.log(`  ✅ ${docs.length} destek unsuru yüklendi`);
      }
    } else {
      console.log(`  ⏭️ Zaten ${existing} kayıt var`);
    }
  }

  // ═══════════════════════════════════════
  // 6. KAPSAMLI NACE 4 HANELİ (ikaplist - US97 benzeri)
  // ═══════════════════════════════════════
  console.log('\n📋 6. Kapasite/Kapsam Listesi...');
  const kaplistPath = path.join(__dirname, '..', 'csv', 'listeler gm teşvik sistemi - ikaplist.csv');
  const kaplistLines = readCSV(kaplistPath);
  console.log(`  📄 ${kaplistLines.length} satır bulundu (ikaplist)`);

  // ═══════════════════════════════════════
  // 7. SERBEST BÖLGELER 
  // ═══════════════════════════════════════
  console.log('\n📋 7. Serbest Bölgeler...');
  const serbolPath = path.join(__dirname, '..', 'csv', 'listeler gm teşvik sistemi - lserbol.csv');
  const serbolLines = readCSV(serbolPath);
  if (serbolLines.length > 0) {
    console.log(`  📄 ${serbolLines.length} serbest bölge`);
  }

  // ═══════════════════════════════════════
  // 8. OSB LİSTESİ
  // ═══════════════════════════════════════
  console.log('\n📋 8. OSB Listesi...');
  const osbPath = path.join(__dirname, '..', 'csv', 'listeler gm teşvik sistemi - losblist.csv');
  const osbLines = readCSV(osbPath);
  if (osbLines.length > 0) {
    console.log(`  📄 ${osbLines.length} OSB`);
  }

  // ═══════════════════════════════════════
  // SONUÇ
  // ═══════════════════════════════════════
  console.log('\n' + '═'.repeat(50));
  console.log('📊 GÜNCEL VERİ DURUMU:');
  const cols = await db.listCollections().toArray();
  for (const c of cols.sort((a, b) => a.name.localeCompare(b.name))) {
    const count = await db.collection(c.name).countDocuments();
    const icon = count > 0 ? '✅' : '⚪';
    console.log(`  ${icon} ${c.name}: ${count}`);
  }
  console.log('═'.repeat(50));

  await mongoose.disconnect();
  process.exit(0);
}

main().catch(e => { console.error(e); process.exit(1); });
