// 🚀 Firma Yönetim Sistemi - Backend Server
// Bu dosya Ana server dosyamız. Express uygulamasını başlatır ve tüm rotaları yönetir.

const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const rateLimit = require('express-rate-limit');
require('dotenv').config();

// Route import'ları
const authRoutes = require('./routes/auth');
const firmaRoutes = require('./routes/firma');
const importRoutes = require('./routes/import');

const app = express();
const PORT = process.env.PORT || 5000;

// 🛡️ Güvenlik middleware'leri
app.use(helmet()); // Güvenlik başlıkları ekler
app.use(compression()); // Gzip sıkıştırması

// 📊 Rate limiting - DDoS koruması
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 dakika
  max: 100, // IP başına maksimum 100 istek
  message: 'Çok fazla istek gönderdiniz, lütfen daha sonra tekrar deneyin.'
});
app.use(limiter);

// 🌐 CORS ayarları - Frontend ile haberleşme için (Development + Production)
const allowedOrigins = [
  'http://localhost:3000', // Development
  'http://localhost:3001', // Development alternate
  process.env.FRONTEND_URL, // Environment'tan gelen URL
  'https://firma-yonetim-frontend.onrender.com', // Production URL
];

app.use(cors({
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    
    if (allowedOrigins.indexOf(origin) !== -1 || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      console.log('🚫 CORS blocked origin:', origin);
      callback(new Error('CORS policy violation'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// 📨 JSON ve URL parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

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
      'GET /api/firmalar - Firma listesi',
      'POST /api/firmalar - Yeni firma ekleme'
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
app.use('/api/firmalar', firmaRoutes);
app.use('/api/import', importRoutes);

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

// 🚀 Server'ı başlat
const startServer = async () => {
  await connectDB();
  
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