// 📦 US 97 KODLARINI MONGODB'YE SEED ET
// GM Teşvik Sistemi - 2742 adet kod

const mongoose = require('mongoose');
const US97Code = require('./models/US97Code');
const fs = require('fs');
const path = require('path');

// 🔧 MongoDB Bağlantısı (.env'den okuyacak)
require('dotenv').config();

const connectDB = async () => {
  try {
    const mongoUri = process.env.MONGODB_URI;
    if (!mongoUri) {
      throw new Error('MONGODB_URI environment variable is not defined');
    }
    
    const conn = await mongoose.connect(mongoUri);
    console.log(`✅ MongoDB Bağlandı: ${conn.connection.host}`);
  } catch (error) {
    console.error('❌ MongoDB bağlantı hatası:', error);
    console.error('🔧 .env dosyasında MONGODB_URI kontrolü yapın');
    process.exit(1);
  }
};

// 📊 US 97 Kodlarını CSV'den oku ve MongoDB'ye ekle
const seedUS97Codes = async () => {
  try {
    console.log('🚀 US 97 kodları seed işlemi başlıyor...');
    
    // Mevcut kodları temizle
    const deletedCount = await US97Code.deleteMany({});
    console.log(`🗑️ ${deletedCount.deletedCount} adet mevcut kod silindi`);
    
    // CSV dosyasını oku
    const csvPath = path.join(__dirname, '..', 'csv', 'listeler gm teşvik sistemi - ikaplist.csv');
    const csvContent = fs.readFileSync(csvPath, 'utf-8');
    const lines = csvContent.split('\n');
    
    const us97Codes = [];
    let processedCount = 0;
    
    // İlk 2 satırı atla ve verileri işle
    for (let i = 2; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line || line === '%') continue;
      
      const parts = line.split(',');
      if (parts.length >= 2) {
        const kod = parts[0].trim();
        const aciklama = parts[1].trim().replace(/"/g, '');
        
        if (kod && aciklama) {
          // Kategori belirle
          let kategori = "Diğer";
          
          if (kod.startsWith('0111')) kategori = "Tarım";
          else if (kod.startsWith('0112')) kategori = "Sebze/Bitki";
          else if (kod.startsWith('0113')) kategori = "Meyve/Baharat";
          else if (kod.startsWith('0121')) kategori = "Hayvancılık";
          else if (kod.startsWith('0122')) kategori = "Hayvan Ürünleri";
          else if (kod.startsWith('0130')) kategori = "Karma Çiftçilik";
          else if (kod.startsWith('0140')) kategori = "Tarım Hizmetleri";
          else if (kod.startsWith('0150')) kategori = "Avcılık";
          else if (kod.startsWith('0200')) kategori = "Ormancılık";
          else if (kod.startsWith('0500')) kategori = "Su Ürünleri";
          else if (kod.startsWith('1')) kategori = "Madencilik/Enerji";
          else if (kod.startsWith('2')) kategori = "İmalat";
          else if (kod.startsWith('3')) kategori = "Elektrik/Su";
          else if (kod.startsWith('4')) kategori = "İnşaat";
          else if (kod.startsWith('5')) kategori = "Ticaret";
          else if (kod.startsWith('6')) kategori = "Ulaştırma/İletişim";
          else if (kod.startsWith('7')) kategori = "Mali/Hizmet";
          else if (kod.startsWith('8')) kategori = "Kamu/Eğitim";
          else if (kod.startsWith('9')) kategori = "Sosyal Hizmetler";
          
          us97Codes.push({
            kod: kod,
            aciklama: aciklama,
            kategori: kategori,
            aktif: true,
            kullanimSayisi: 0
          });
          
          processedCount++;
        }
      }
    }
    
    console.log(`📝 ${processedCount} adet kod işlendi`);
    
    // Batch olarak MongoDB'ye ekle
    if (us97Codes.length > 0) {
      const batchSize = 500;
      let insertedTotal = 0;
      
      for (let i = 0; i < us97Codes.length; i += batchSize) {
        const batch = us97Codes.slice(i, i + batchSize);
        const result = await US97Code.insertMany(batch, { ordered: false });
        insertedTotal += result.length;
        console.log(`✅ ${i + batch.length}/${us97Codes.length} kod eklendi`);
      }
      
      console.log(`🎉 Toplam ${insertedTotal} adet US 97 kodu başarıyla MongoDB'ye eklendi!`);
      
      // İstatistik göster
      const kategorileriCount = await US97Code.aggregate([
        { $group: { _id: '$kategori', count: { $sum: 1 } } },
        { $sort: { count: -1 } }
      ]);
      
      console.log('\n📊 Kategori İstatistikleri:');
      kategorileriCount.forEach(item => {
        console.log(`   ${item._id}: ${item.count} adet`);
      });
      
    } else {
      console.log('❌ Hiç kod bulunamadı!');
    }
    
  } catch (error) {
    console.error('❌ Seed işlemi hatası:', error);
  } finally {
    await mongoose.connection.close();
    console.log('🔌 MongoDB bağlantısı kapatıldı');
  }
};

// 🚀 Script'i çalıştır
const runSeed = async () => {
  await connectDB();
  await seedUS97Codes();
};

// Eğer script doğrudan çalıştırılıyorsa
if (require.main === module) {
  runSeed();
}

module.exports = { seedUS97Codes };