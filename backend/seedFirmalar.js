// 🌱 Firma Verileri Seed Script
// Örnek firma verilerini sisteme ekler

const mongoose = require('mongoose');
const Firma = require('./models/Firma');
const User = require('./models/User');
require('dotenv').config();

// Resimden alınan örnek firma verileri
const firmalar = [
  {
    firmaId: 'A001162',
    vergiNoTC: '9810659856',
    tamUnvan: 'YNS REKSAN REKOR HİDROLİK MAKİNA İMALAT SANAYİ VE TİCARET LİMİTED ŞİRKETİ',
    adres: 'AHİ EVRANOSB MAHALLESİ ERKUNT CAD. NO: ANKARA',
    firmaIl: 'SİNCAN',
    firmaIlce: 'ANKARA',
    kepAdresi: '',
    yetkiliKisiler: [
      {
        adSoyad: 'Yetkili Kişi 1',
        telefon1: '0312 555 0001',
        telefon2: '',
        eposta1: 'yetkili1@ynsreksan.com',
        eposta2: ''
      }
    ]
  },
  {
    firmaId: 'A001163',
    vergiNoTC: '9820310139',
    tamUnvan: 'YONPAŞ ORMAN ÜRÜNLERİ SANAYİ VE TİCARET ANONİM ŞİRKETİ',
    adres: 'ORGANİZE SANAYİ BÖLGESİ 9.CAD.NO:24',
    firmaIl: 'KAYSERİ',
    firmaIlce: 'MELİKGAZİ',
    kepAdresi: '',
    yetkiliKisiler: [
      {
        adSoyad: 'Yetkili Kişi 2',
        telefon1: '0352 555 0002',
        telefon2: '',
        eposta1: 'yetkili2@yonpas.com',
        eposta2: ''
      }
    ]
  },
  {
    firmaId: 'A001164',
    vergiNoTC: '9460012197',
    tamUnvan: 'YPS OTOMOTİV SANAYİ VE TİCARET ANONİM ŞİRKETİ',
    adres: 'MİNARELİ ÇAVUŞ BURSA OSB MAH. 75. YIL BUL BURSA',
    firmaIl: 'NİLÜFER',
    firmaIlce: 'BURSA',
    kepAdresi: '',
    yetkiliKisiler: [
      {
        adSoyad: 'Yetkili Kişi 3',
        telefon1: '0224 555 0003',
        telefon2: '',
        eposta1: 'yetkili3@ypsotomotiv.com',
        eposta2: ''
      }
    ]
  },
  {
    firmaId: 'A001165',
    vergiNoTC: '9830433429',
    tamUnvan: 'YTY METAL SANAYİ DIŞ TİCARET ANONİM ŞİRKETİ',
    adres: 'AHİ EVRANOSB MAHALLESİ KIRIM HANLIĞI CAD ANKARA',
    firmaIl: 'SİNCAN',
    firmaIlce: 'ANKARA',
    kepAdresi: '',
    yetkiliKisiler: [
      {
        adSoyad: 'Yetkili Kişi 4',
        telefon1: '0312 555 0004',
        telefon2: '',
        eposta1: 'yetkili4@ytymetal.com',
        eposta2: ''
      }
    ]
  },
  {
    firmaId: 'A001166',
    vergiNoTC: '9830847628',
    tamUnvan: 'YUKA KALIP MAKİNA OTOMOTİV METAL SANAYİ VE TİCARET LİMİTED ŞİRKETİ',
    adres: 'SULUOVA ORHAN MAH. MASÖY SANAYİ SİTESİ 1 KOCAELİ',
    firmaIl: 'GEBZE',
    firmaIlce: 'KOCAELİ',
    kepAdresi: '',
    yetkiliKisiler: [
      {
        adSoyad: 'Yetkili Kişi 5',
        telefon1: '0262 555 0005',
        telefon2: '',
        eposta1: 'yetkili5@yukakalip.com',
        eposta2: ''
      }
    ]
  },
  {
    firmaId: 'A001167',
    vergiNoTC: '9840314478',
    tamUnvan: 'YUKON MAKİNE MÜHENDİSLİK MİMARLIK VE İNŞAAT SANAYİ DIŞ TİCARET LİMİTED ŞİRKETİ',
    adres: 'KARADENİZLİLER MAH. ALİ İSLAM CAD. NO: 94/ KOCAELİ',
    firmaIl: 'BAŞİSKELE',
    firmaIlce: 'KOCAELİ',
    kepAdresi: '',
    yetkiliKisiler: [
      {
        adSoyad: 'Yetkili Kişi 6',
        telefon1: '0262 555 0006',
        telefon2: '',
        eposta1: 'yetkili6@yukonmakine.com',
        eposta2: ''
      }
    ]
  },
  {
    firmaId: 'A001168',
    vergiNoTC: '2724146729',
    tamUnvan: 'YUNUS EMRE ÇELİKTEN',
    adres: 'İVEDİK OSB MAHALLESİ 1548 CAD. NO: 15',
    firmaIl: 'ANKARA',
    firmaIlce: 'YENİMAHALLE',
    kepAdresi: '',
    yetkiliKisiler: [
      {
        adSoyad: 'Yunus Emre Çelikten',
        telefon1: '0312 555 0007',
        telefon2: '',
        eposta1: 'yetkili7@yunusemre.com',
        eposta2: ''
      }
    ]
  },
  {
    firmaId: 'A001169',
    vergiNoTC: '67519011392',
    tamUnvan: 'YUSUF ALİ MEMİŞ',
    adres: 'EFENDİBEY MAH. UZUN SOK. NO:11/2',
    firmaIl: 'NİĞDE',
    firmaIlce: 'MERKEZ',
    kepAdresi: '',
    yetkiliKisiler: [
      {
        adSoyad: 'Yusuf Ali Memiş',
        telefon1: '0388 555 0008',
        telefon2: '',
        eposta1: 'yetkili8@yusufali.com',
        eposta2: ''
      }
    ]
  },
  {
    firmaId: 'A001170',
    vergiNoTC: '18833053292',
    tamUnvan: 'YUSUF YONDEMİR',
    adres: 'KAZIM KARABEKİR MAH. DİNAMİT SOK. NO:5/3 KOCAELİ',
    firmaIl: 'DARICA',
    firmaIlce: 'KOCAELİ',
    kepAdresi: '',
    yetkiliKisiler: [
      {
        adSoyad: 'Yusuf Yondemir',
        telefon1: '0262 555 0009',
        telefon2: '',
        eposta1: 'yetkili9@yusufyondemir.com',
        eposta2: ''
      }
    ]
  },
  {
    firmaId: 'A001171',
    vergiNoTC: '13960249600',
    tamUnvan: 'YUSUF ZENBİLCİ',
    adres: 'KIŞLA MAH.4525 SOK.NO:32 İÇ KAPI NO:20',
    firmaIl: 'ADANA',
    firmaIlce: 'YÜREĞİR',
    kepAdresi: '',
    yetkiliKisiler: [
      {
        adSoyad: 'Yusuf Zenbilci',
        telefon1: '0322 555 0010',
        telefon2: '',
        eposta1: 'yetkili10@yusufzenbilci.com',
        eposta2: ''
      }
    ]
  }
];

const createFirmalar = async () => {
  try {
    // MongoDB'ye bağlan (modern syntax)
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ MongoDB bağlantısı başarılı');

    // Admin kullanıcıyı bul
    const adminUser = await User.findOne({ email: 'admin@firma.com' });
    if (!adminUser) {
      console.log('❌ Admin kullanıcı bulunamadı. Önce admin kullanıcı oluşturun.');
      process.exit(1);
    }

    let başarılı = 0;
    let hatalı = 0;

    console.log('🚀 Firma verileri ekleniyor...\n');

    for (const firmaData of firmalar) {
      try {
        // Firma ID kontrolü
        const existingFirma = await Firma.findOne({ firmaId: firmaData.firmaId });
        if (existingFirma) {
          console.log(`⚠️ ${firmaData.firmaId} zaten mevcut, atlandı`);
          hatalı++;
          continue;
        }

        // Yeni firma oluştur
        const firma = new Firma({
          ...firmaData,
          olusturanKullanici: adminUser._id,
          yabanciIsareti: false,
          aktif: true
        });

        await firma.save();
        console.log(`✅ ${firmaData.firmaId} - ${firmaData.tamUnvan.substring(0, 50)}...`);
        başarılı++;

      } catch (error) {
        console.log(`❌ ${firmaData.firmaId} - Hata: ${error.message}`);
        hatalı++;
      }
    }

    console.log('\n📊 İşlem Tamamlandı:');
    console.log(`✅ Başarılı: ${başarılı}`);
    console.log(`❌ Hatalı: ${hatalı}`);
    console.log(`📊 Toplam: ${firmalar.length}`);

  } catch (error) {
    console.error('❌ Genel Hata:', error);
  } finally {
    await mongoose.disconnect();
    console.log('👋 MongoDB bağlantısı kapatıldı');
    process.exit(0);
  }
};

createFirmalar(); 