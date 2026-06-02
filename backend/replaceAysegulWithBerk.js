// 🔄 Ayşegül Gezer → Berk Acar Değişiklik Script
// Ayşegül Gezer'i veritabanından siler ve yerine Berk Acar'ı ekler

const mongoose = require('mongoose');
const User = require('./models/User');
require('dotenv').config();

const replaceUser = async () => {
  try {
    console.log('🔗 MongoDB bağlantısı kuruluyor...');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ MongoDB bağlandı');

    // 1️⃣ Ayşegül Gezer'i bul ve sil
    const aysegul = await User.findOne({ email: 'aysegul@gmplanlama.com' });
    if (aysegul) {
      await User.deleteOne({ email: 'aysegul@gmplanlama.com' });
      console.log('🗑️  Ayşegül Gezer (aysegul@gmplanlama.com) silindi');
    } else {
      console.log('⚠️  Ayşegül Gezer bulunamadı, atlanıyor...');
    }

    // 2️⃣ Berk Acar'ın zaten var olup olmadığını kontrol et
    const existingBerk = await User.findOne({ email: 'berk.acar@gmplanlama.com' });
    if (existingBerk) {
      console.log('⚠️  Berk Acar (berk.acar@gmplanlama.com) zaten mevcut, atlanıyor...');
    } else {
      // 3️⃣ Berk Acar'ı ekle
      const berk = new User({
        adSoyad: 'Berk Acar',
        email: 'berk.acar@gmplanlama.com',
        sifre: 'Berk2025!',
        telefon: '+90 555 567 8901',
        rol: 'kullanici',
        aktif: true
      });

      await berk.save();
      console.log('✅ Berk Acar (berk.acar@gmplanlama.com) başarıyla eklendi');
    }

    console.log('\n🎉 İşlem tamamlandı!');
    console.log('\n📋 BERK ACAR LOGIN BİLGİLERİ:');
    console.log('==============================');
    console.log('👤 Ad Soyad: Berk Acar');
    console.log('📧 Email: berk.acar@gmplanlama.com');
    console.log('🔑 Şifre: Berk2025!');
    console.log('🎭 Rol: kullanici');

    process.exit(0);
  } catch (error) {
    console.error('💥 Hata:', error);
    process.exit(1);
  }
};

replaceUser();
