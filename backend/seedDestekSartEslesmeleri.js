// 🎯 Destek-Şart Eşleştirmelerini Veritabanına Yükleyen Script
// CSV'deki desteklenmiş destek-şart ilişkilerini sisteme ekler

const mongoose = require('mongoose');
const DestekSartEslesmesi = require('./models/DestekSartEslesmesi');
require('dotenv').config();

// CSV'den çıkarılan destek-şart eşleştirmeleri
const destekSartVerileri = [
  {
    destekTuru: "Sigorta Primi İşveren Hissesi",
    sartlar: [
      "2 Yıl ve En Fazla Yatırım Tutarının %10'lu (1. Bölge)",
      "3 Yıl ve En Fazla Yatırım Tutarının %15'i (2. Bölge)",
      "5 Yıl ve En Fazla Yatırım Tutarının %20'si (3. Bölge)",
      "6 Yıl ve En Fazla Yatırım Tutarının %25'i (4. Bölge)",
      "7 Yıl ve En Fazla Yatırım Tutarının %35'i (5. Bölge)",
      "10 Yıl  (6. Bölge)",
      "7 Yıl ve En Fazla Yatırım Tutarının %15'i (Stratejik)",
      "7 Yıl (Hamle)"
    ],
    aciklama: "Sigorta primi işveren hissesi destekleri - bölge ve programa göre farklı şartlar"
  },
  {
    destekTuru: "Gelir Vergisi Stopaj Desteği",
    sartlar: [
      "10 Yıl"
    ],
    aciklama: "Gelir vergisi stopaj desteği - sabit süre"
  },
  {
    destekTuru: "Sigorta Prim Desteği",
    sartlar: [
      "10 Yıl 6. Bölge",
      "7 Yıl (Hamle Yüksek Teknoloji)",
      "5 Yıl (Hamle)"
    ],
    aciklama: "Sigorta prim destekleri - program türüne göre farklı süreler"
  },
  {
    destekTuru: "Vergi İndirimi",
    sartlar: [
      "Yatırıma Katkı Oranı:%15 - Vergi İndirim %50 (1. Bölge)",
      "Yatırıma Katkı Oranı:%20 - Vergi İndirim %55 (2. Bölge)",
      "Yatırıma Katkı Oranı:%25 - Vergi İndirim %60 (3. Bölge)",
      "Yatırıma Katkı Oranı:%30 - Vergi İndirim %70 (4. Bölge)",
      "Yatırıma Katkı Oranı:%40 - Vergi İndirim %80 (5. Bölge)",
      "Yatırıma Katkı Oranı:%50 - Vergi İndirim %90 (6. Bölge)",
      "Yatırıma Katkı Oranı:%50 - Vergi İndirim %90 (Stratejik)"
    ],
    aciklama: "Vergi indirimi destekleri - bölgeye göre farklı katkı ve indirim oranları"
  },
  {
    destekTuru: "Gümrük Vergisi Muafiyeti",
    sartlar: [
      "Var - Ayrıca İthal Listeye Bakınız",
      "Yok"
    ],
    aciklama: "Gümrük vergisi muafiyeti - var/yok durumu"
  },
  {
    destekTuru: "KDV İstisnası",
    sartlar: [
      "Var (Yerli ve İthal Liste - Tamamı)"
    ],
    aciklama: "KDV istisnası desteği"
  },
  {
    destekTuru: "Yatırım Yeri Tahsisi",
    sartlar: [
      "Yok",
      "Var"
    ],
    aciklama: "Yatırım yeri tahsisi desteği - var/yok durumu"
  },
  {
    destekTuru: "Faiz Desteği",
    sartlar: [
      "TL 3 Puan - Döviz 1 Puan (En Fazla 1 Milyon TL yararlanılır)(3. Bölge)",
      "TL 4 Puan - Döviz 1 Puan (En Fazla 1.2 Milyon TL yararlanılır)(4. Bölge)",
      "TL 5 Puan - Döviz 2 Puan (En Fazla 1.4 Milyon TL yararlanılır)(5. Bölge)",
      "TL 7 Puan - Döviz 2 Puan (En Fazla 1.8 Milyon TL yararlanılır) (6. Bölge)",
      "TL 10 Puan - Döviz 2 Puan (En Fazla Yatırımın %20'si ve 75 Milyon TL yararlanılır) (Hamle Yüksek TEknoloji)",
      "TL 8 Puan - Döviz 2 Puan (En Fazla Yatırımın %20'si ve 75 Milyon TL yararlanılır) (Hamle)",
      "TL 5 Puan - Döviz 2 Puan (En Fazla Yatırımın %10'u ve 5 Milyon TL yararlanılır)(Stratejik)",
      "TL 5 Puan - Döviz 2 Puan (En Fazla Yatırımın %10'u ve 10 Milyon TL yararlanılır)(Bölgesel Öncelik 17-1- aa) ve bb))",
      "TL 7 Puan - Döviz 3 Puan (En az 1.8 Milyon, En Fazla Yatırımın %10 yararlanılır) (Bölgesel Öncelik 17-1-t)"
    ],
    aciklama: "Faiz destekleri - bölge ve programa göre farklı puan ve limit değerleri"
  },
  {
    destekTuru: "KDV İadesi",
    sartlar: [
      "Var"
    ],
    aciklama: "KDV iadesi desteği"
  }
];

// Veritabanı bağlantısı
const connectDB = async () => {
  try {
    const mongoURI = process.env.MONGODB_URI || 'mongodb://localhost:27017/firma-yonetim';
    await mongoose.connect(mongoURI);
    console.log('✅ MongoDB Bağlandı');
  } catch (error) {
    console.error('❌ MongoDB Bağlantı Hatası:', error);
    process.exit(1);
  }
};

// Verileri yükle
const seedDestekSartEslesmeleri = async () => {
  try {
    console.log('🚀 Destek-Şart Eşleştirmeleri yükleniyor...');
    
    // Mevcut verileri temizle
    await DestekSartEslesmesi.deleteMany({});
    console.log('🗑️ Mevcut eşleştirmeler temizlendi');
    
    // Yeni verileri ekle
    const insertedData = await DestekSartEslesmesi.insertMany(destekSartVerileri);
    console.log(`✅ ${insertedData.length} destek-şart eşleştirmesi yüklendi`);
    
    // Özet bilgi
    for (const esleme of insertedData) {
      console.log(`📋 ${esleme.destekTuru}: ${esleme.sartlar.length} şart`);
    }
    
    console.log('🎯 Destek-Şart Eşleştirmeleri başarıyla yüklendi!');
    
  } catch (error) {
    console.error('❌ Seed Hatası:', error);
  }
};

// Script çalıştır
const runSeed = async () => {
  await connectDB();
  await seedDestekSartEslesmeleri();
  
  console.log('\n📊 Yüklenen veri özeti:');
  const tumEslesmeler = await DestekSartEslesmesi.getTumAktifEslesmeler();
  
  tumEslesmeler.forEach(esleme => {
    console.log(`\n🎯 ${esleme.destekTuru}:`);
    esleme.sartlar.forEach((sart, index) => {
      console.log(`   ${index + 1}. ${sart}`);
    });
  });
  
  mongoose.connection.close();
  console.log('\n✅ İşlem tamamlandı - Veritabanı bağlantısı kapatıldı');
};

// Eğer script doğrudan çalıştırılırsa
if (require.main === module) {
  runSeed();
}

module.exports = { destekSartVerileri, seedDestekSartEslesmeleri };
