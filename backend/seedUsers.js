// 👥 Kullanıcı Seed Script - GM Planlama Ekibi
// Tüm ekip üyelerini sisteme ekler
// Her kullanıcı kendi email'i ile login olabilir

const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('./models/User');
require('dotenv').config();

// 👥 GM Planlama Ekip Üyeleri
const users = [
  {
    adSoyad: 'Sistem Yöneticisi',
    email: 'admin@gmplanlama.com', // Admin email'i güncelle
    sifre: 'admin123',
    telefon: '+90 555 123 4567',
    rol: 'admin',
    aktif: true,
    // 🔧 Admin'e tüm yetkiler
    yetkiler: {
      firmaEkle: true,
      firmaDuzenle: true,
      firmaSil: true,
      belgeEkle: true,
      belgeDuzenle: true,
      belgeSil: true, // 🗑️ Silme yetkisi eklendi
      raporGoruntule: true,
      yonetimPaneli: true
    }
  },
  {
    adSoyad: 'Merve Koç',
    email: 'merve@gmplanlama.com',
    sifre: 'merve123',
    telefon: '+90 555 234 5678',
    rol: 'kullanici',
    aktif: true
  },
  {
    adSoyad: 'Selin Nergiz',
    email: 'selin@gmplanlama.com',
    sifre: 'selin123',
    telefon: '+90 555 345 6789',
    rol: 'kullanici', 
    aktif: true
  },
  {
    adSoyad: 'Seda Durak',
    email: 'seda@gmplanlama.com',
    sifre: 'seda1234',
    telefon: '+90 555 456 7890',
    rol: 'kullanici',
    aktif: true
  },
  {
    adSoyad: 'Ayşegül Gezer', 
    email: 'aysegul@gmplanlama.com',
    sifre: 'aysegul',
    telefon: '+90 555 567 8901',
    rol: 'kullanici',
    aktif: true
  },
  {
    adSoyad: 'Hüseyin Cahit Ağır',
    email: 'cahit@gmplanlama.com', 
    sifre: 'cahit123',
    telefon: '+90 555 678 9012',
    rol: 'admin', // Cahit de admin
    aktif: true
  }
];

const seedUsers = async () => {
  try {
    console.log('🔗 MongoDB bağlantısı kuruluyor...');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ MongoDB bağlandı');

    console.log('👥 Kullanıcılar seed ediliyor...');

    for (const userData of users) {
      // Mevcut kullanıcıyı kontrol et
      const existingUser = await User.findOne({ email: userData.email });
      
      if (existingUser) {
        console.log(`⚠️  ${userData.adSoyad} (${userData.email}) zaten mevcut, atlanıyor...`);
        continue;
      }

      // Kullanıcıyı oluştur (pre-save hook şifreyi kendi hashleyecek)
      const user = new User({
        ...userData
      });

      await user.save();
      console.log(`✅ ${userData.adSoyad} (${userData.email}) eklendi`);
    }

    console.log('\n🎉 Tüm kullanıcılar başarıyla seed edildi!');
    console.log('\n📋 LOGİN BİLGİLERİ:');
    console.log('==================');
    
    users.forEach(user => {
      console.log(`👤 ${user.adSoyad}`);
      console.log(`   📧 Email: ${user.email}`);
      console.log(`   🔑 Şifre: ${user.sifre}`);
      console.log(`   🎭 Rol: ${user.rol}`);
      console.log('   ---');
    });

    process.exit(0);
  } catch (error) {
    console.error('💥 Seed hatası:', error);
    process.exit(1);
  }
};

// Script'i çalıştır
seedUsers(); 