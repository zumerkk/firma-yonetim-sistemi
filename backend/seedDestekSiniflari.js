// 🎯 DESTEK SINIFI SEED SCRIPT
// CSV dosyasından destek sınıfı verilerini veritabanına yükler

const mongoose = require('mongoose');
const DestekSinifi = require('./models/DestekSinifi');
require('dotenv').config();

const fs = require('fs');
const path = require('path');

// CSV dosyasından destek sınıfı verilerini oku ve hazırla
function turkishToAscii(str = '') {
  return str
    .replace(/Ğ/g, 'G').replace(/ğ/g, 'g')
    .replace(/Ü/g, 'U').replace(/ü/g, 'u')
    .replace(/Ş/g, 'S').replace(/ş/g, 's')
    .replace(/İ/g, 'I').replace(/ı/g, 'i')
    .replace(/Ö/g, 'O').replace(/ö/g, 'o')
    .replace(/Ç/g, 'C').replace(/ç/g, 'c');
}

function deriveKategori(label) {
  if (!label) return 'Genel';
  const l = label.toUpperCase('tr-TR');
  if (l.includes('ÖNCELİKLİ')) return 'Öncelikli';
  if (l.includes('HEDEF')) return 'Hedef';
  if (l.includes('STRATEJ')) return 'Stratejik';
  return 'Genel';
}

function labelToKod(label) {
  const ascii = turkishToAscii(label).toUpperCase()
    .replace(/[^A-Z0-9]+/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_|_$/g, '');
  return ascii;
}

function readCsvDestekSiniflari() {
  try {
    const projectRoot = path.resolve(__dirname, '..');
    const candidates = [
      path.join(projectRoot, 'listeler 9903 (2)', 'DESTEK SINIFI-Tablo 1.csv'),
      path.join(projectRoot, 'csv', 'DESTEK SINIFI-Tablo 1.csv')
    ];
    let filePath = '';
    for (const p of candidates) {
      if (fs.existsSync(p)) { filePath = p; break; }
    }
    if (!filePath) {
      console.warn('⚠️ CSV dosyası bulunamadı, statik verilere düşülecek.');
      return null;
    }
    const raw = fs.readFileSync(filePath, 'utf8');
    const lines = raw.split(/\r?\n/)
      .map(l => l.replace(/;+/g, '').trim())
      .filter(Boolean);
    const uniq = Array.from(new Set(lines));
    return uniq.map(label => ({
      kod: labelToKod(label),
      aciklama: label,
      kategori: deriveKategori(label)
    }));
  } catch (e) {
    console.error('❌ CSV okuma hatası:', e.message);
    return null;
  }
}

// Fallback statik veriler (CSV bulunamazsa)
const fallbackVerileri = [
  { kod: 'ONCELIKLI_YATIRIMLAR', aciklama: 'ÖNCELİKLİ YATIRIMLAR', kategori: 'Öncelikli' },
  { kod: 'ONCELIKLI_YATIRIMLAR_ALT_BOLGE', aciklama: 'ÖNCELİKLİ YATIRIMLAR-Alt Bölge', kategori: 'Öncelikli' },
  { kod: 'HEDEF_YATIRIMLAR', aciklama: 'HEDEF YATIRIMLAR', kategori: 'Hedef' },
  { kod: 'HEDEF_YATIRIMLAR_ALT_BOLGE', aciklama: 'HEDEF YATIRIMLAR-Alt Bölge', kategori: 'Hedef' },
  { kod: 'STRATEJIK_HAMLE', aciklama: 'STRATEJİK HAMLE', kategori: 'Stratejik' },
  { kod: 'STRATEJIK_HAMLE_ALT_BOLGE', aciklama: 'STRATEJİK HAMLE-Alt Bölge', kategori: 'Stratejik' }
];

async function seedDestekSiniflari() {
  try {
    // MongoDB bağlantısı
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/firma-yonetim-sistemi');
    console.log('✅ MongoDB bağlantısı başarılı');

    // CSV oku
    const destekSinifiVerileri = readCsvDestekSiniflari() || fallbackVerileri;

    // Mevcut verileri temizle
    await DestekSinifi.deleteMany({});
    console.log('🗑️ Mevcut destek sınıfı verileri temizlendi');

    // Yeni verileri ekle
    const result = await DestekSinifi.insertMany(destekSinifiVerileri);
    console.log(`✅ ${result.length} destek sınıfı verisi eklendi`);

    // Verileri kontrol et
    const count = await DestekSinifi.countDocuments();
    console.log(`📊 Toplam destek sınıfı sayısı: ${count}`);

    // Kategorilere göre grupla
    const kategoriler = await DestekSinifi.aggregate([
      { $group: { _id: '$kategori', count: { $sum: 1 } } },
      { $sort: { _id: 1 } }
    ]);
    
    console.log('📋 Kategoriler:');
    kategoriler.forEach(kat => {
      console.log(`  - ${kat._id}: ${kat.count} adet`);
    });

    console.log('🎉 Destek sınıfı seed işlemi tamamlandı!');
    
  } catch (error) {
    console.error('❌ Seed işlemi sırasında hata:', error);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 MongoDB bağlantısı kapatıldı');
  }
}

// Script çalıştırılırsa seed işlemini başlat
if (require.main === module) {
  seedDestekSiniflari();
}

module.exports = { seedDestekSiniflari };