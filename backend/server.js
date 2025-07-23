// 🚀 Firma Yönetim Sistemi - Backend Server
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

// Route import'ları
const authRoutes = require('./routes/auth');
const firmaRoutes = require('./routes/firma');
const importRoutes = require('./routes/import');
const activityRoutes = require('./routes/activity');
const notificationRoutes = require('./routes/notification');

const app = express();

// 🌐 CORS ayarlarını EN BAŞTA tanımla (middleware order çok önemli)
app.use(cors({
  origin: 'http://localhost:3000', // Development için sadece localhost
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

// 🌐 CORS ayarları - Frontend ile haberleşme için
// CORS middleware'ini en başta kullan!
app.use(cors({
  origin: 'http://localhost:3000', // Development için sadece bu origin
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  exposedHeaders: ['Access-Control-Allow-Origin'],
  preflightContinue: false,
  optionsSuccessStatus: 204
}));

// 📨 JSON ve URL parsing
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// 🗄️ MongoDB bağlantısı
const connectDB = async () => {
  try {
    // Modern Mongoose artık bu seçenekleri otomatik olarak kullanıyor
    const conn = await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/firma-yonetim');
    console.log(`✅ MongoDB Bağlandı: ${conn.connection.host}`);
  } catch (error) {
    console.error('❌ MongoDB bağlantı hatası:', error.message);
    process.exit(1);
  }
};

// 🎯 Ana rotalar
app.get('/', (req, res) => {
  res.json({
    message: '🚀 Firma Yönetim Sistemi API aktif!',
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

  console.log('⏰ Cron jobs configured - Activity cleanup scheduled for 02:00 daily');
};

// 🚀 Server'ı başlat
const startServer = async () => {
  await connectDB();
  
  // Cron job'larını başlat
  setupCronJobs();
  
  app.listen(PORT, () => {
    console.log(`\n🚀 Server çalışıyor: http://localhost:${PORT}`);
    console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log(`📊 API dokümantasyonu: http://localhost:${PORT}/`);
    console.log('🎯 Ctrl+C ile durdurabilirsiniz\n');
  });
};

// 💀 Graceful shutdown
process.on('SIGINT', () => {
  console.log('\n🛑 Server kapatılıyor...');
  process.exit(0);
});

process.on('unhandledRejection', (err) => {
  console.error('🚨 Unhandled Rejection:', err);
  process.exit(1);
});

startServer(); 