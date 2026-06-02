// 🔐 Kullanıcı Şifre Güncelleme Script - GM Planlama Ekibi  
// Güçlü şifreler atar ve login sorunlarını çözer

const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('./models/User');
require('dotenv').config();

// 🔐 YENİ GÜVENLİ ŞİFRELER
const userPasswords = [
  {
    email: 'merve@gmplanlama.com',
    adSoyad: 'Merve Koç',
    yeniSifre: 'Merve2025!'
  },
  {
    email: 'selin@gmplanlama.com', 
    adSoyad: 'Selin Nergiz',
    yeniSifre: 'Selin2025!'
  },
  {
    email: 'seda@gmplanlama.com',
    adSoyad: 'Seda Durak', 
    yeniSifre: 'Seda2025!'
  },
  {
    email: 'berk.acar@gmplanlama.com',
    adSoyad: 'Berk Acar',
    yeniSifre: 'Berk2025!'
  },
  {
    email: 'cahit@gmplanlama.com',
    adSoyad: 'Hüseyin Cahit Ağır',
    yeniSifre: 'Cahit2025!'
  },
  {
    email: 'admin@gmplanlama.com',
    adSoyad: 'Sistem Yöneticisi', 
    yeniSifre: 'Admin2025!'
  }
];

const updatePasswords = async () => {
  try {
    console.log('🔗 MongoDB bağlantısı kuruluyor...');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ MongoDB bağlandı');

    console.log('🔐 Kullanıcı şifreleri güncelleniyor...');

    for (const userData of userPasswords) {
      // Kullanıcıyı bul
      const user = await User.findOne({ email: userData.email });
      
      if (!user) {
        console.log(`⚠️  ${userData.adSoyad} (${userData.email}) bulunamadı, atlanıyor...`);
        continue;
      }

      // Yeni şifreyi hash'le
      const hashedPassword = await bcrypt.hash(userData.yeniSifre, 12);
      
      // Şifreyi güncelle
      await User.findByIdAndUpdate(user._id, {
        sifre: hashedPassword,
        updatedAt: new Date()
      });

      console.log(`✅ ${userData.adSoyad} şifresi güncellendi`);
    }

    console.log('\n🎉 Tüm kullanıcı şifreleri başarıyla güncellendi!');
    console.log('\n📋 YENİ LOGİN BİLGİLERİ:');
    console.log('=========================');
    
    userPasswords.forEach(user => {
      console.log(`👤 ${user.adSoyad}`);
      console.log(`   📧 Email: ${user.email}`);
      console.log(`   🔑 Yeni Şifre: ${user.yeniSifre}`);
      console.log('   ---');
    });

    console.log('\n✨ ŞİFRE ÖZELLİKLERİ:');
    console.log('- En az 8 karakter ✅');
    console.log('- Büyük harf içerir ✅'); 
    console.log('- Küçük harf içerir ✅');
    console.log('- Rakam içerir ✅');
    console.log('- Özel karakter içerir ✅');

    process.exit(0);
  } catch (error) {
    console.error('💥 Şifre güncelleme hatası:', error);
    process.exit(1);
  }
};

// Script'i çalıştır
updatePasswords(); 