// 🗑️ Firma Veritabanı Temizlik Script - GM Planlama
// Aktif olmayan firmaları tamamen siler
// Sadece aktif firmalar kalır

const mongoose = require('mongoose');
const Firma = require('./models/Firma');
const Activity = require('./models/Activity');
require('dotenv').config();

const cleanInactiveFirmas = async () => {
  try {
    console.log('🔗 MongoDB bağlantısı kuruluyor...');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ MongoDB bağlandı');

    // 📊 Mevcut durum analizi
    console.log('\n📊 VERİTABANI ANALİZİ:');
    console.log('=====================');

    const totalFirmas = await Firma.countDocuments();
    const activeFirmas = await Firma.countDocuments({ 
      $or: [
        { aktif: true },
        { aktif: { $exists: false } } // aktif field'ı yoksa aktif sayılır
      ]
    });
    const inactiveFirmas = await Firma.countDocuments({ aktif: false });

    console.log(`📈 Toplam Firma: ${totalFirmas}`);
    console.log(`✅ Aktif Firma: ${activeFirmas}`);
    console.log(`❌ Pasif Firma: ${inactiveFirmas}`);

    // 📋 Silinecek firmaları listele
    if (inactiveFirmas > 0) {
      console.log('\n🗑️ SİLİNECEK PASİF FİRMALAR:');
      console.log('============================');
      
      const inactiveFirmaList = await Firma.find(
        { aktif: false },
        { firmaId: 1, tamUnvan: 1, createdAt: 1 }
      ).sort({ firmaId: 1 });

      inactiveFirmaList.forEach((firma, index) => {
        console.log(`${index + 1}. ${firma.firmaId} - ${firma.tamUnvan}`);
      });

      // Kullanıcıdan onay al
      console.log(`\n⚠️  UYARI: ${inactiveFirmas} adet pasif firma silinecek!`);
      console.log('Bu işlem GERİ ALINAMAZ!');
      
      // Otomatik silme işlemi (dikkatli ol!)
      const readline = require('readline');
      const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
      });

      rl.question('\n❓ Devam etmek istiyor musunuz? (EVET yazın): ', async (answer) => {
        if (answer.toUpperCase() === 'EVET') {
          try {
            // 🗑️ İlgili aktiviteleri sil
            console.log('\n🧹 İlgili aktiviteler siliniyor...');
            const inactiveFirmaIds = inactiveFirmaList.map(f => f._id);
            const deletedActivities = await Activity.deleteMany({
              'targetResource.id': { $in: inactiveFirmaIds }
            });
            console.log(`✅ ${deletedActivities.deletedCount} aktivite silindi`);

            // 🗑️ Pasif firmaları sil
            console.log('\n🗑️ Pasif firmalar siliniyor...');
            const deleteResult = await Firma.deleteMany({ aktif: false });
            console.log(`✅ ${deleteResult.deletedCount} pasif firma silindi`);

            // 📊 Yeni durum
            const remainingFirmas = await Firma.countDocuments();
            console.log(`\n🎉 Temizlik tamamlandı!`);
            console.log(`📊 Kalan aktif firma sayısı: ${remainingFirmas}`);

            // ID gap'leri göster
            const remainingFirmaIds = await Firma.find({}, { firmaId: 1 })
              .sort({ firmaId: 1 });
            
            console.log('\n📋 KALAN FİRMA ID\'LERİ:');
            console.log('======================');
            remainingFirmaIds.forEach((firma, index) => {
              if (index < 10) { // İlk 10'unu göster
                console.log(`${index + 1}. ${firma.firmaId}`);
              }
            });
            if (remainingFirmaIds.length > 10) {
              console.log(`... ve ${remainingFirmaIds.length - 10} tane daha`);
            }

          } catch (error) {
            console.error('💥 Silme işlemi hatası:', error);
          }
        } else {
          console.log('❌ İşlem iptal edildi');
        }
        
        rl.close();
        process.exit(0);
      });

    } else {
      console.log('\n✅ Silinecek pasif firma bulunamadı!');
      console.log('Tüm firmalar zaten aktif durumda.');
      process.exit(0);  
    }

  } catch (error) {
    console.error('💥 Temizlik script hatası:', error);
    process.exit(1);
  }
};

// Script'i çalıştır
cleanInactiveFirmas(); 