// 🎯 DESTEK SINIFI EKLEME SCRIPT
// Mevcut verileri silmeden yeni destek sınıfı ekler

const mongoose = require('mongoose');
const DestekSinifi = require('./models/DestekSinifi');
require('dotenv').config();

const yeniDestekSiniflari = [
  { kod: 'BOLGESEL', aciklama: 'BÖLGESEL', kategori: 'Bölgesel' },
  { kod: 'BOLGESEL_ONCELIKLI_YATIRIM', aciklama: 'BÖLGESEL - ÖNCELİKLİ YATIRIM', kategori: 'Bölgesel' },
  { kod: 'GENEL', aciklama: 'GENEL', kategori: 'Genel' }
];

async function addDestekSiniflari() {
  try {
    // MongoDB bağlantısı
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/firma-yonetim-sistemi');
    console.log('✅ MongoDB bağlantısı başarılı');

    for (const sinif of yeniDestekSiniflari) {
      // Mevcut mu kontrol et
      const mevcut = await DestekSinifi.findOne({ kod: sinif.kod });
      if (mevcut) {
        console.log(`ℹ️ "${sinif.aciklama}" zaten mevcut, atlanıyor...`);
        continue;
      }
      
      // Yeni ekle
      const yeni = new DestekSinifi(sinif);
      await yeni.save();
      console.log(`✅ "${sinif.aciklama}" eklendi`);
    }

    // Verileri kontrol et
    const count = await DestekSinifi.countDocuments();
    console.log(`📊 Toplam destek sınıfı sayısı: ${count}`);

    // Tüm destek sınıflarını listele
    const tumSiniflar = await DestekSinifi.find({ aktif: true }).sort({ kategori: 1, kod: 1 });
    console.log('\n📋 Mevcut Destek Sınıfları:');
    tumSiniflar.forEach(s => {
      console.log(`  [${s.kategori}] ${s.kod}: ${s.aciklama}`);
    });

    console.log('\n🎉 İşlem tamamlandı!');
    
  } catch (error) {
    console.error('❌ Hata:', error);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 MongoDB bağlantısı kapatıldı');
  }
}

// Script çalıştırılırsa
if (require.main === module) {
  addDestekSiniflari();
}

module.exports = { addDestekSiniflari };
