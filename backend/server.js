// 🚀 GM Planlama Danışmanlık - Backend Server
// Bu dosya Ana server dosyamız. Express uygulamasını başlatır ve tüm rotaları yönetir.

const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const rateLimit = require('express-rate-limit');
const cron = require('node-cron');
require('dotenv').config();

// Models
const Activity = require('./models/Activity');
const Tesvik = require('./models/Tesvik');

// Services
const notificationService = require('./services/notificationService');

// Route import'ları
const authRoutes = require('./routes/auth');
const firmaRoutes = require('./routes/firma');
const importRoutes = require('./routes/import');
const activityRoutes = require('./routes/activity');
const notificationRoutes = require('./routes/notification');
const tesvikRoutes = require('./routes/tesvik'); // 🏆 Teşvik sistemi routes
const yeniTesvikRoutes = require('./routes/yeniTesvik'); // 🆕 Yeni Teşvik sistemi routes

const adminRoutes = require('./routes/admin'); // 🔐 Admin panel routes
const reportRoutes = require('./routes/reports'); // 📊 Report system routes
const fileRoutes = require('./routes/files'); // 📁 File management routes
const us97Routes = require('./routes/us97'); // 📦 US 97 Kodları sistemi
const gtipRoutes = require('./routes/gtip'); // 🏷️ GTIP Kodları API
const destekSartRoutes = require('./routes/destekSart'); // 🎯 Destek-Şart Eşleştirmesi sistemi
const destekSinifiRoutes = require('./routes/destekSinifi'); // 🎯 Destek Sınıfı sistemi
const oecdKategoriRoutes = require('./routes/oecdKategori'); // 🌍 OECD Kategori sistemi
const naceRoutes = require('./routes/nace'); // 🌐 NACE 6-lı Kodları API
const lookupRoutes = require('./routes/lookup'); // 🔎 Unit/Currency lookups
const dosyaTakipRoutes = require('./routes/dosyaTakip'); // 📋 Dosya İş Akış Takip Sistemi
const tesvikImportRoutes = require('./routes/tesvikImport'); // 📊 Excel/CSV Teşvik Import Sistemi
const eskiTesvikImportRoutes = require('./routes/eskiTesvikImport'); // 📊 Eski Teşvik Import Sistemi
const backupRoutes = require('./routes/backup'); // 💾 Sistem Yedekleme
const ingestRoutes = require('./routes/ingest'); // 🧠 Akıllı veri yükleme (preview/commit)
const screenshotImportRoutes = require('./routes/screenshotImport'); // 📸 Ekran görüntüsünden teşvik oluşturma
const tesvikMakineRoutes = require('./routes/tesvikMakine'); // 🛠️ Teşvik Makine Teçhizat Yönetimi (admin)
const tesvikEvrakUploadRoutes = require('./routes/tesvikEvrakUpload'); // 🌐 Teşvik Evrak Public Upload (token)
const tesvikReminderService = require('./services/tesvikMakine/reminderService'); // ⏰ Makine hatırlatma cron servisi

const app = express();
// Behind Render/Proxy: trust proxy so rate-limit & req.ip work correctly
app.set('trust proxy', 1);

// 🌐 CORS ayarlarını EN BAŞTA tanımla (middleware order çok önemli)
const allowedOrigins = [
  'http://localhost:3000', // Development
  'http://localhost:3001', // Development alternate
  'http://localhost:3002', // Development alternate 2
  'https://cahit-firma-frontend.onrender.com', // Eski Render frontend (geçiş döneminde çalışsın)
  'https://gmplansis.com', // Production custom domain (kök)
  'https://www.gmplansis.com', // Production custom domain (www)
  // FRONTEND_URL virgülle birden çok origin destekler (örn. "https://a.com,https://b.com")
  ...String(process.env.FRONTEND_URL || '').split(',').map(s => s.trim())
].filter(Boolean); // undefined/boş değerleri filtrele

app.use(cors({
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);

    if (allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      console.log('🚫 CORS blocked origin:', origin);
      callback(new Error('CORS policy violation'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  exposedHeaders: ['Access-Control-Allow-Origin'],
  preflightContinue: false,
  optionsSuccessStatus: 204
}));
const PORT = process.env.PORT || 5001;

// 🛡️ Güvenlik middleware'leri
app.use(helmet()); // Güvenlik başlıkları ekler
app.use(compression()); // Gzip sıkıştırması

// 📊 Rate limiting - DDoS koruması (Development için daha yüksek limit)
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 dakika
  max: 1000, // Development için daha yüksek limit (normalde 100)
  message: 'Çok fazla istek gönderdiniz, lütfen daha sonra tekrar deneyin.',
  standardHeaders: true, // "RateLimit-*" headerları ekle (draft) 
  legacyHeaders: false // "X-RateLimit-*" headerlarını devre dışı bırak
});
// API rotaları için rate limit
app.use('/api', limiter);

// 📨 JSON ve URL parsing
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// 📁 Static file serving for uploads
app.use('/uploads', express.static('uploads'));

// 🗄️ MongoDB bağlantısı (Render free tier cold-start dayanıklılığı)
const connectDB = async () => {
  const MAX_RETRIES = 5;
  const RETRY_DELAY_MS = 5000; // 5 saniye bekle her denemede

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      console.log(`🔄 MongoDB bağlantı denemesi ${attempt}/${MAX_RETRIES}...`);

      const conn = await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/firma-yonetim', {
        // Render free tier cold-start için artırılmış timeout'lar
        connectTimeoutMS: 60000,        // 60 saniye (default 30s)
        serverSelectionTimeoutMS: 60000, // 60 saniye 
        socketTimeoutMS: 90000,          // 90 saniye
        heartbeatFrequencyMS: 15000,     // 15 saniye
        maxPoolSize: 10,
        minPoolSize: 2,
        retryWrites: true,
        retryReads: true,
      });
      console.log(`✅ MongoDB Bağlandı: ${conn.connection.host} (deneme ${attempt})`);

      // Bağlantı event listener'ları
      mongoose.connection.on('disconnected', () => {
        console.warn('⚠️ MongoDB bağlantısı kesildi, yeniden bağlanmaya çalışılıyor...');
      });
      mongoose.connection.on('reconnected', () => {
        console.log('✅ MongoDB yeniden bağlandı!');
      });
      mongoose.connection.on('error', (err) => {
        console.error('❌ MongoDB connection error:', err.message);
      });

      // 🔧 FIX: Problematik unique index'leri temizle
      await cleanupProblematicIndexes(conn);
      return; // Başarılı bağlantı, döngüden çık

    } catch (error) {
      console.error(`❌ MongoDB bağlantı hatası (deneme ${attempt}/${MAX_RETRIES}):`, error.message);

      if (attempt < MAX_RETRIES) {
        console.log(`⏳ ${RETRY_DELAY_MS / 1000} saniye sonra tekrar denenecek...`);
        await new Promise(resolve => setTimeout(resolve, RETRY_DELAY_MS));
      } else {
        console.error('💀 MongoDB bağlantısı tüm denemelerde başarısız oldu.');
        throw new Error('MongoDB bağlantısı kurulamadı');
      }
    }
  }
};

// 🔧 Problematik Index Temizleme - belgeYonetimi.belgeId unique index'i kaldır
const cleanupProblematicIndexes = async (conn) => {
  const db = conn.connection.db;

  // 🔧 Hem tesviks hem de yenitesvik collection'larını temizle
  const collections = ['tesviks', 'yenitesvik'];

  for (const collectionName of collections) {
    try {
      const collection = db.collection(collectionName);

      // Mevcut index'leri al
      const indexes = await collection.indexes();

      // belgeYonetimi.belgeId_1 unique index'ini ara
      const problematicIndex = indexes.find(idx =>
        idx.key && idx.key['belgeYonetimi.belgeId'] && idx.unique === true
      );

      if (problematicIndex) {
        console.log(`🔧 [${collectionName}] Problematik index bulundu: ${problematicIndex.name}`);
        await collection.dropIndex(problematicIndex.name);
        console.log(`✅ [${collectionName}] Index başarıyla kaldırıldı: ${problematicIndex.name}`);
      } else {
        console.log(`✅ [${collectionName}] Problematik index bulunamadı - temiz`);
      }
    } catch (error) {
      // Index yoksa veya zaten kaldırılmışsa hata vermesin
      if (error.code !== 27) { // 27 = IndexNotFound
        console.log(`⚠️ [${collectionName}] Index temizleme sırasında hata (yoksayıldı):`, error.message);
      }
    }
  }
};

// 🔍 DEBUG ENDPOINTS - Sadece development ortamında aktif (production'da kapalı)
if (process.env.NODE_ENV !== 'production') {
  // 🔍 DEBUG ENDPOINT - VERİTABANI VERİSİ KONTROL
  app.get('/debug/tesvik/:tesvikId', async (req, res) => {
    try {
      const tesvik = await Tesvik.findOne({ tesvikId: req.params.tesvikId }).lean();
      if (!tesvik) {
        return res.json({ error: 'Teşvik bulunamadı!' });
      }

      const result = {
        tesvikId: tesvik.tesvikId,
        destekUnsurlari: {
          count: tesvik.destekUnsurlari?.length || 0,
          data: tesvik.destekUnsurlari?.map(d => ({
            destekUnsuru: d.destekUnsuru,
            sarti: d.sarti,
            sartlari: d.sartlari
          }))
        },
        ozelSartlar: {
          count: tesvik.ozelSartlar?.length || 0,
          data: tesvik.ozelSartlar?.map(s => ({
            kisaltma: s.kisaltma,
            koşulMetni: s.koşulMetni,
            notu: s.notu,
            aciklamaNotu: s.aciklamaNotu
          }))
        },
        urunler: {
          count: tesvik.urunler?.length || 0,
          data: tesvik.urunler?.map(u => ({
            us97Kodu: u.us97Kodu,
            urunAdi: u.urunAdi,
            mevcutKapasite: u.mevcutKapasite,
            ilaveKapasite: u.ilaveKapasite
          }))
        },
        maliHesaplamalar: {
          keys: Object.keys(tesvik.maliHesaplamalar || {}),
          araziArsaBedeli: tesvik.maliHesaplamalar?.araziArsaBedeli,
          araciArsaBedeli: tesvik.maliHesaplamalar?.araciArsaBedeli,
          toplamSabitYatirimTutari: tesvik.maliHesaplamalar?.toplamSabitYatirimTutari,
          toplamSabitYatirim: tesvik.maliHesaplamalar?.toplamSabitYatirim
        },
        revizyonlar: {
          count: tesvik.revizyonlar?.length || 0
        }
      };

      res.json(result);
    } catch (error) {
      res.json({ error: error.message });
    }
  });

  // 🧪 TEST CSV EXPORT (NO AUTH)
  app.get('/test/csv-export/:tesvikId', async (req, res) => {
    try {
      const tesvikController = require('./controllers/tesvikController');
      const mockReq = {
        params: { id: req.params.tesvikId },
        query: { format: 'csv' },
        user: { _id: 'test-user' }
      };
      const mockRes = {
        setHeader: (key, value) => res.setHeader(key, value),
        send: (data) => res.send(data),
        status: (code) => res.status(code),
        json: (data) => res.json(data)
      };
      await tesvikController.exportRevizyonExcel(mockReq, mockRes);
    } catch (error) {
      res.json({ error: error.message });
    }
  });

  console.log('🧪 Debug endpoint\'leri aktif (development mode)');
}

// 🎯 Ana rotalar
app.get('/', (req, res) => {
  res.json({
    message: '🚀 GM Planlama Danışmanlık API aktif!',
    version: '1.0.0',
    status: 'OK',
    endpoints: [
      'GET /api/health - Sistem durumu',
      'POST /api/auth/login - Kullanıcı girişi',
      'POST /api/auth/register - Kullanıcı kaydı',
      'GET /api/firma - Firma listesi',
      'POST /api/firma - Yeni firma ekleme'
    ]
  });
});

// 🏥 Sağlık kontrol endpoint'i
app.get('/api/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    memory: process.memoryUsage()
  });
});

// 🛣️ API rotaları
app.use('/api/auth', authRoutes);
app.use('/api/firma', firmaRoutes);  // /api/firmalar → /api/firma
app.use('/api/import', importRoutes);
app.use('/api/activity', activityRoutes);
app.use('/api/activities', activityRoutes); // Frontend compatibility
app.use('/api/notifications', notificationRoutes); // Bildirim sistemi
app.use('/api/tesvik', tesvikRoutes); // 🏆 Teşvik Belge Sistemi
app.use('/api/yeni-tesvik', yeniTesvikRoutes); // 🆕 Yeni Teşvik Belge Sistemi

app.use('/api/admin', adminRoutes); // 🔐 Admin Panel Sistemi
app.use('/api/reports', reportRoutes); // 📊 Report Sistemi
app.use('/api/files', fileRoutes); // 📁 File Management Sistemi
app.use('/api/us97', us97Routes); // 📦 US 97 Kodları API
app.use('/api/gtip', gtipRoutes); // 🏷️ GTIP Kodları API
app.use('/api/destek-sart', destekSartRoutes); // 🎯 Destek-Şart Eşleştirmesi API
app.use('/api/destek-sinifi', destekSinifiRoutes); // 🎯 Destek Sınıfı API
app.use('/api/oecd-kategori', oecdKategoriRoutes); // 🌍 OECD Kategori API
app.use('/api/lookup', lookupRoutes); // 🔎 Unit & Currency lookup API
app.use('/api/nace', naceRoutes); // 🌐 NACE 6-lı Kodları API
app.use('/api/dosya-takip', dosyaTakipRoutes); // 📋 Dosya İş Akış Takip Sistemi
app.use('/api/tesvik-import', tesvikImportRoutes); // 📊 Excel/CSV Teşvik Import Sistemi
app.use('/api/eski-tesvik-import', eskiTesvikImportRoutes); // 📊 Eski Teşvik Import Sistemi
app.use('/api/backup', backupRoutes); // 💾 Sistem Yedekleme API
app.use('/api/ingest', ingestRoutes); // 🧠 Akıllı veri yükleme (preview/commit)
app.use('/api/screenshot-import', screenshotImportRoutes); // 📸 Ekran görüntüsünden teşvik oluşturma
app.use('/api/tesvik-makine', tesvikMakineRoutes); // 🛠️ Teşvik Makine Teçhizat Yönetimi (admin/consultant)
app.use('/api/tesvik-evrak', tesvikEvrakUploadRoutes); // 🌐 Teşvik Evrak Public Upload (token tabanlı)

// 🚫 404 handler - Bulunamayan endpoint'ler için
app.use('*', (req, res) => {
  res.status(404).json({
    error: 'Endpoint bulunamadı',
    message: `${req.originalUrl} rotası mevcut değil`,
    suggestion: 'GET / endpoint\'ini kullanarak mevcut rotaları görebilirsiniz'
  });
});

// 🚨 Global error handler - Tüm hatalar için
app.use((error, req, res, next) => {
  console.error('🚨 Sunucu Hatası:', error);

  res.status(error.statusCode || 500).json({
    error: 'Sunucu hatası',
    message: error.message || 'Bilinmeyen bir hata oluştu',
    ...(process.env.NODE_ENV === 'development' && { stack: error.stack })
  });
});

// 🧹 Activity Cleanup Cron Job - Her gece saat 02:00'da çalışır
const setupCronJobs = () => {
  // Her gece saat 02:00'da eski activity kayıtlarını temizle (30 günden eski)
  cron.schedule('0 2 * * *', async () => {
    try {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const result = await Activity.deleteMany({
        createdAt: { $lt: thirtyDaysAgo }
      });

      console.log(`🧹 [${new Date().toLocaleString('tr-TR')}] Activity Cleanup: ${result.deletedCount} eski kayıt temizlendi`);
    } catch (error) {
      console.error('🚨 Activity cleanup error:', error);
    }
  }, {
    timezone: 'Europe/Istanbul'
  });

  // 🔥 Backend Warm-up - Her 10 dakikada kendini ping'le (Render.com sleep mode engellemek için)
  cron.schedule('*/10 * * * *', async () => {
    try {
      const https = require('https');
      const backendUrl = process.env.BACKEND_URL || 'https://cahit-firma-backend.onrender.com';

      https.get(`${backendUrl}/api/health`, (res) => {
        console.log(`💓 [${new Date().toLocaleTimeString('tr-TR')}] Backend warm-up ping: ${res.statusCode}`);
      }).on('error', (err) => {
        console.log(`⚠️ Warm-up ping error:`, err.message);
      });
    } catch (error) {
      console.error('🚨 Warm-up cron error:', error);
    }
  });

  // ⏰ Teşvik Makine Hatırlatma Cron - Her gün 08:00'de vadesi gelmiş hatırlatmaları işler
  //    (7 gün cevap/durum/dosya yoksa tedarikçi/müşteriye hatırlatma maili gönderir)
  cron.schedule('0 8 * * *', async () => {
    try {
      const summary = await tesvikReminderService.processDueReminders({ now: new Date() });
      console.log(`⏰ [${new Date().toLocaleString('tr-TR')}] Teşvik hatırlatma: tarandı=${summary.scanned} gönderildi=${summary.sent} atlandı=${summary.skipped} hata=${summary.failed}`);
    } catch (error) {
      console.error('🚨 Teşvik hatırlatma cron hatası:', error.message);
    }
  }, {
    timezone: 'Europe/Istanbul'
  });

  console.log('⏰ Cron jobs configured - Activity cleanup (02:00), Backend warm-up (*/10min) & Teşvik hatırlatma (08:00)');
};

// 🚀 Server'ı başlat
const startServer = async () => {
  // 🚀 ÖNCELİKLE Express server'ı başlat (Render port timeout'unu önle)
  app.listen(PORT, () => {
    console.log(`\n🚀 Server çalışıyor: http://localhost:${PORT}`);
    console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log(`📊 API dokümantasyonu: http://localhost:${PORT}/`);
    console.log('🎯 Ctrl+C ile durdurabilirsiniz\n');
  });

  // Cron job'larını başlat
  setupCronJobs();

  // 🗄️ MongoDB'ye arka planda bağlan (server port açıldıktan sonra)
  try {
    await connectDB();

    // ✉️ Teşvik Makine mail şablonlarını seed et (DB boşsa varsayılanları ekler)
    try {
      const { seedMailTemplates } = require('./services/tesvikMakine/mailTemplateProvider');
      await seedMailTemplates();
    } catch (err) {
      console.error('⚠️ Mail şablonu seed hatası (kritik değil):', err.message);
    }

    // 🌍 OECD kategorileri: yanlış/eksik fallback verisi varsa CSV'den yeniden yükle
    // (elle script çalıştırma gereksin istemiyoruz — idempotent, yalnızca <=3 kayıtta tetiklenir)
    try {
      const OecdKategori = require('./models/OecdKategori');
      const fs = require('fs');
      const path = require('path');
      const csvPath = path.join(__dirname, '..', 'csv', 'OECD Orta Yüksek-Tablo 1.csv');
      if (fs.existsSync(csvPath)) {
        const lines = fs.readFileSync(csvPath, 'utf8')
          .split(/\r?\n/)
          .map((l) => l.replace(/;+/g, '').trim())
          .filter(Boolean)
          .filter((l) => !/^OECD\s*\(Orta-?Yüksek\)/i.test(l));
        const adet = await OecdKategori.countDocuments({});
        // CSV ile kayıt sayısı uyuşmuyorsa (liste güncellendi / yanlış fallback yüklü) yeniden yükle
        if (lines.length && adet !== lines.length) {
          await OecdKategori.deleteMany({});
          await OecdKategori.insertMany(lines.map((aciklama, i) => ({
            kod: `OECD_${String(i + 1).padStart(3, '0')}`,
            aciklama,
            kategori: 'OECD (Orta-Yüksek)'
          })));
          console.log(`✅ OECD kategorileri CSV'den yeniden yüklendi (${lines.length} kayıt)`);
        }
      }
    } catch (err) {
      console.error('⚠️ OECD seed hatası (kritik değil):', err.message);
    }

    // 🔄 Dosya Takip ana aşama migrasyonu (yeni 4 aşamalı iş akışı) — idempotent
    try {
      const DosyaTakip = require('./models/DosyaTakip');
      const eksik = await DosyaTakip.updateMany(
        { durum: { $regex: '^2\\.2\\.3' }, anaAsama: { $ne: 'KURUM_EKSIK' } },
        { $set: { anaAsama: 'KURUM_EKSIK' } }
      );
      const degerlendirme = await DosyaTakip.updateMany(
        { durum: { $regex: '^2\\.2(?!\\.3)' }, anaAsama: { $ne: 'KURUM_DEGERLENDIRME' } },
        { $set: { anaAsama: 'KURUM_DEGERLENDIRME' } }
      );
      const toplam = (eksik.modifiedCount || 0) + (degerlendirme.modifiedCount || 0);
      if (toplam > 0) console.log(`✅ Dosya Takip aşama migrasyonu: ${toplam} kayıt güncellendi`);
    } catch (err) {
      console.error('⚠️ Dosya Takip aşama migrasyonu hatası (kritik değil):', err.message);
    }

    // 🔧 Destek sınıfı verilerini düzelt (one-time migration)
    try {
      const { fixDestekSiniflari } = require('./fixDestekSiniflari');
      await fixDestekSiniflari(true);
      console.log('✅ Destek sınıfı verileri kontrol edildi/düzeltildi');
    } catch (err) {
      console.error('⚠️ Destek sınıfı düzeltme hatası (kritik değil):', err.message);
    }
  } catch (dbError) {
    console.error('❌ MongoDB bağlantısı kurulamadı ama server çalışmaya devam ediyor:', dbError.message);
  }
};

// 💀 Graceful shutdown
process.on('SIGINT', () => {
  console.log('\n🛑 Server kapatılıyor...');
  process.exit(0);
});

process.on('unhandledRejection', (err) => {
  console.error('🚨 Unhandled Rejection:', err);
  // Render'da process.exit yapmak yerine sadece logla
  // process.exit(1);
});

startServer();
