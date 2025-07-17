// 🌱 Admin Kullanıcı Seed Script
// İlk admin kullanıcısını oluşturur

const mongoose = require('mongoose');
const User = require('./models/User');
require('dotenv').config();

const createAdminUser = async () => {
  try {
    // MongoDB'ye bağlan (modern syntax)
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ MongoDB bağlantısı başarılı');

    // Admin kullanıcısının var olup olmadığını kontrol et
    const existingAdmin = await User.findOne({ email: 'admin@firma.com' });
    
    if (existingAdmin) {
      console.log('⚠️ Admin kullanıcı zaten mevcut');
      process.exit(0);
    }

    // Admin kullanıcı oluştur
    const adminUser = new User({
      adSoyad: 'Sistem Yöneticisi',
      email: 'admin@firma.com',
      sifre: '123456',
      telefon: '+90 555 123 4567',
      rol: 'admin',
      yetkiler: {
        firmaEkle: true,
        firmaDuzenle: true,
        firmaSil: true,
        belgeEkle: true,
        belgeDuzenle: true,
        belgeSil: true,
        raporGoruntule: true,
        yonetimPaneli: true
      }
    });

    await adminUser.save();
    console.log('🎉 Admin kullanıcı başarıyla oluşturuldu!');
    console.log('📧 E-posta: admin@firma.com');
    console.log('🔑 Şifre: 123456');

  } catch (error) {
    console.error('❌ Hata:', error);
  } finally {
    await mongoose.disconnect();
    console.log('👋 MongoDB bağlantısı kapatıldı');
    process.exit(0);
  }
};

createAdminUser(); 