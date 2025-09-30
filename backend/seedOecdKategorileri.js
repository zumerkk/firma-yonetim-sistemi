// 🌍 OECD KATEGORİLERİ SEED SCRIPT
// CSV dosyasından OECD (Orta-Yüksek) verilerini veritabanına yükler

const mongoose = require('mongoose');
const OecdKategori = require('./models/OecdKategori');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

// CSV okuma yardımcıları
function readCsvLines(filePath) {
  try {
    const raw = fs.readFileSync(filePath, 'utf8');
    return raw.split(/\r?\n/)
      .map(l => l.replace(/;+/g, '').trim())
      .filter(Boolean)
      .filter(l => !/^OECD\s*\(Orta-?Yüksek\)/i.test(l)); // başlık satırını atla
  } catch (e) {
    return null;
  }
}

function getOecdVerileriFromCsv() {
  const projectRoot = path.resolve(__dirname, '..');
  const candidates = [
    path.join(projectRoot, 'listeler 9903 (2)', 'OECD Orta Yüksek-Tablo 1.csv'),
    path.join(projectRoot, 'csv', 'OECD Orta Yüksek-Tablo 1.csv')
  ];
  for (const p of candidates) {
    const lines = readCsvLines(p);
    if (lines && lines.length) return lines;
  }
  return null;
}

async function seedOecdKategorileri() {
  try {
    // MongoDB bağlantısı
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/firma-yonetim-sistemi');
    console.log('✅ MongoDB bağlantısı başarılı');

    // Mevcut verileri temizle
    await OecdKategori.deleteMany({});
    console.log('🗑️ Mevcut OECD kategori verileri temizlendi');

    // CSV'den oku; yoksa fallback olarak birkaç örnek kullan
    const lines = getOecdVerileriFromCsv() || [
      'Akışkan gücü ile çalışan ekipmanların imalatı',
      'Akümülatör ve pil imalatı',
      'Bilgisayar ve bilgisayar çevre birimleri imalatı'
    ];

    // Yeni verileri hazırla
    const oecdKategorileri = lines.map((aciklama, index) => ({
      kod: `OECD_${String(index + 1).padStart(3, '0')}`,
      aciklama: aciklama.trim(),
      kategori: 'OECD (Orta-Yüksek)'
    }));

    // Yeni verileri ekle
    const result = await OecdKategori.insertMany(oecdKategorileri);
    console.log(`✅ ${result.length} OECD kategori verisi eklendi`);

    // Verileri kontrol et
    const count = await OecdKategori.countDocuments();
    console.log(`📊 Toplam OECD kategori sayısı: ${count}`);

    // İlk 5 veriyi göster
    const samples = await OecdKategori.find().limit(5);
    console.log('📋 Örnek veriler:');
    samples.forEach(sample => {
      console.log(`  - ${sample.kod}: ${sample.aciklama.substring(0, 50)}...`);
    });

    console.log('🎉 OECD kategori seed işlemi tamamlandı!');
    
  } catch (error) {
    console.error('❌ Seed işlemi sırasında hata:', error);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 MongoDB bağlantısı kapatıldı');
  }
}

// Script çalıştırılırsa seed işlemini başlat
if (require.main === module) {
  seedOecdKategorileri();
}

module.exports = { seedOecdKategorileri };