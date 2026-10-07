// 📋 Activity Controller - Son İşlemler Yönetimi
// Tüm sistem aktivitelerini yönetir - profesyonel log sistemi
// Dashboard widget'ları ve raporlama için

const Activity = require('../models/Activity');
const { validationResult } = require('express-validator');

// 🎯 Success Response Helper
const sendSuccess = (res, data, message = 'İşlem başarılı', statusCode = 200) => {
  res.status(statusCode).json({
    success: true,
    message,
    data,
    timestamp: new Date().toISOString()
  });
};

// ❌ Error Response Helper
const sendError = (res, message = 'Bir hata oluştu', statusCode = 500, errors = null) => {
  res.status(statusCode).json({
    success: false,
    message,
    errors,
    timestamp: new Date().toISOString()
  });
};

// 📋 Son İşlemleri Listele
const getActivities = async (req, res) => {
  try {
    const {
      sayfa = 1,
      limit = 50,
      kategori = '',
      aksiyon = '',
      durum = '',
      kullanici = '',
      firmaId = '',
      baslangicTarihi = '',
      bitisTarihi = '',
      siralamaSekli = 'createdAt',
      siralamaYonu = 'desc'
    } = req.query;

    // Filtreleme kriterleri
    const filter = {};
    
    if (kategori) {
      filter.category = kategori;
    }
    
    if (aksiyon) {
      filter.action = aksiyon;
    }
    
    if (durum) {
      filter.status = durum;
    }
    
    if (kullanici) {
      filter['user.id'] = kullanici;
    }
    
    if (firmaId) {
      filter['targetResource.firmaId'] = firmaId;
    }
    
    // targetId parametresi ile filtreleme - TesvikDetail için
    if (req.query.targetId) {
      filter['targetResource.id'] = req.query.targetId;
    }

    // Tarih filtresi
    if (baslangicTarihi || bitisTarihi) {
      filter.createdAt = {};
      if (baslangicTarihi) {
        filter.createdAt.$gte = new Date(baslangicTarihi);
      }
      if (bitisTarihi) {
        filter.createdAt.$lte = new Date(bitisTarihi);
      }
    }

    // Sıralama
    const sort = {};
    sort[siralamaSekli] = siralamaYonu === 'desc' ? -1 : 1;

    // Sayfalama
    const skip = (parseInt(sayfa) - 1) * parseInt(limit);
    
    // Paralel sorgular
    const [activities, toplamSayisi] = await Promise.all([
      Activity.find(filter)
        // Liste geçmişi taşır; her kaydın içinde tekrar bütün makine geçmişini indirme.
        // Eski string alan yollarının before/after karşılıkları korunur.
        .select('-changes.before.makineRevizyonlari -changes.after.makineRevizyonlari -changes.before.revizyonlar.veriSnapshot -changes.after.revizyonlar.veriSnapshot')
        .sort(sort)
        .skip(skip)
        .limit(parseInt(limit))
        .lean(),
      Activity.countDocuments(filter)
    ]);

    const toplamSayfa = Math.ceil(toplamSayisi / parseInt(limit));

    sendSuccess(res, {
      activities: activities.map(activity => ({
        ...activity,
        // Hassas bilgileri temizle
        error: activity.error ? {
          code: activity.error.code,
          message: activity.error.message
          // stack trace'i kaldır
        } : undefined
      })),
      pagination: {
        mevcutSayfa: parseInt(sayfa),
        toplamSayfa,
        toplamSayisi,
        sayfaBasinaLimit: parseInt(limit),
        oncekiSayfa: parseInt(sayfa) > 1 ? parseInt(sayfa) - 1 : null,
        sonrakiSayfa: parseInt(sayfa) < toplamSayfa ? parseInt(sayfa) + 1 : null
      },
      filters: {
        kategori,
        aksiyon,
        durum,
        kullanici,
        firmaId,
        baslangicTarihi,
        bitisTarihi
      }
    });

  } catch (error) {
    console.error('🚨 Get Activities Hatası:', error);
    sendError(res, 'Aktivite listesi alınırken hata oluştu', 500);
  }
};

// 📊 Dashboard için Son İşlemler
const getRecentActivities = async (req, res) => {
  try {
    const { limit = 10 } = req.query;
    
    // Dashboard için view aktivitelerini hariç tut
    const activities = await Activity.getRecentActivitiesForDashboard(parseInt(limit));
    
    sendSuccess(res, {
      activities: activities.map(activity => ({
        _id: activity._id,
        action: activity.action,
        category: activity.category,
        title: activity.title,
        description: activity.description,
        status: activity.status,
        targetResource: activity.targetResource,
        user: {
          name: activity.user.name,
          role: activity.user.role
        },
        createdAt: activity.createdAt,
        isRecent: activity.isRecent
      })),
      count: activities.length
    });

  } catch (error) {
    console.error('🚨 Get Recent Activities Hatası:', error);
    sendError(res, 'Son işlemler alınırken hata oluştu', 500);
  }
};

// 👁️ Tekil Activity Detayı
const getActivity = async (req, res) => {
  try {
    const { id } = req.params;

    const activity = await Activity.findById(id).lean();

    if (!activity) {
      return sendError(res, 'Aktivite bulunamadı', 404);
    }

    // Hassas bilgileri temizle
    if (activity.error && activity.error.stack) {
      delete activity.error.stack;
    }

    sendSuccess(res, { activity });

  } catch (error) {
    console.error('🚨 Get Activity Hatası:', error);
    
    if (error.name === 'CastError') {
      return sendError(res, 'Geçersiz aktivite ID formatı', 400);
    }
    
    sendError(res, 'Aktivite detayı alınırken hata oluştu', 500);
  }
};

// 📈 Activity İstatistikleri
const getActivityStats = async (req, res) => {
  try {
    const stats = await Activity.getStatistics();
    
    // Son 7 günün günlük aktivite sayıları
    const last7Days = [];
    const today = new Date();
    
    for (let i = 6; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      date.setHours(0, 0, 0, 0);
      
      const nextDate = new Date(date);
      nextDate.setDate(nextDate.getDate() + 1);
      
      const count = await Activity.countDocuments({
        createdAt: {
          $gte: date,
          $lt: nextDate
        }
      });
      
      last7Days.push({
        date: date.toISOString().split('T')[0],
        count,
        dayName: date.toLocaleDateString('tr-TR', { weekday: 'short' })
      });
    }
    
    // En aktif saatler (bugün için)
    const todayStart = new Date(today.setHours(0, 0, 0, 0));
    const todayEnd = new Date(today.setHours(23, 59, 59, 999));
    
    const hourlyStats = await Activity.aggregate([
      {
        $match: {
          createdAt: {
            $gte: todayStart,
            $lte: todayEnd
          }
        }
      },
      {
        $group: {
          _id: { $hour: '$createdAt' },
          count: { $sum: 1 }
        }
      },
      {
        $sort: { '_id': 1 }
      }
    ]);
    
    sendSuccess(res, {
      ...stats,
      trends: {
        last7Days,
        hourlyToday: hourlyStats.map(stat => ({
          hour: stat._id,
          count: stat.count,
          timeRange: `${stat._id}:00-${stat._id + 1}:00`
        }))
      }
    });

  } catch (error) {
    console.error('🚨 Get Activity Stats Hatası:', error);
    sendError(res, 'Aktivite istatistikleri alınırken hata oluştu', 500);
  }
};

// 🔍 Kullanıcıya Ait Aktiviteler
const getUserActivities = async (req, res) => {
  try {
    const { userId } = req.params;
    const { limit = 20 } = req.query;
    
    const activities = await Activity.getActivitiesByUser(userId, parseInt(limit));
    
    sendSuccess(res, {
      activities: activities.map(activity => ({
        ...activity,
        // Hassas bilgileri kaldır
        error: activity.error ? {
          code: activity.error.code,
          message: activity.error.message
        } : undefined
      })),
      count: activities.length,
      userId
    });

  } catch (error) {
    console.error('🚨 Get User Activities Hatası:', error);
    
    if (error.name === 'CastError') {
      return sendError(res, 'Geçersiz kullanıcı ID formatı', 400);
    }
    
    sendError(res, 'Kullanıcı aktiviteleri alınırken hata oluştu', 500);
  }
};

// 🏢 Firmaya Ait Aktiviteler
const getFirmaActivities = async (req, res) => {
  try {
    const { firmaId } = req.params;
    const { limit = 20 } = req.query;
    
    const activities = await Activity.getActivitiesByFirma(firmaId, parseInt(limit));
    
    sendSuccess(res, {
      activities: activities.map(activity => ({
        ...activity,
        // Hassas bilgileri kaldır
        error: activity.error ? {
          code: activity.error.code,
          message: activity.error.message
        } : undefined
      })),
      count: activities.length,
      firmaId
    });

  } catch (error) {
    console.error('🚨 Get Firma Activities Hatası:', error);
    sendError(res, 'Firma aktiviteleri alınırken hata oluştu', 500);
  }
};

// 🧹 Eski Kayıtları Temizle (Manuel - Admin)
const cleanupOldActivities = async (req, res) => {
  try {
    const { days = 30 } = req.body;
    
    // Sadece admin yapabilir
    if (req.user.rol !== 'admin') {
      return sendError(res, 'Bu işlem için admin yetkisi gereklidir', 403);
    }
    
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - parseInt(days));
    
    const result = await Activity.deleteMany({
      createdAt: { $lt: cutoffDate }
    });
    
    sendSuccess(res, {
      deletedCount: result.deletedCount,
      cutoffDate: cutoffDate.toISOString(),
      daysOld: parseInt(days)
    }, `${result.deletedCount} eski aktivite kaydı temizlendi`);

  } catch (error) {
    console.error('🚨 Cleanup Activities Hatası:', error);
    sendError(res, 'Temizlik işlemi sırasında hata oluştu', 500);
  }
};

// 📊 Filtreleme Seçenekleri
const getFilterOptions = async (req, res) => {
  try {
    const [
      categories,
      actions,
      statuses,
      users
    ] = await Promise.all([
      Activity.distinct('category'),
      Activity.distinct('action'),
      Activity.distinct('status'),
      Activity.aggregate([
        {
          $group: {
            _id: '$user.id',
            name: { $first: '$user.name' },
            role: { $first: '$user.role' },
            count: { $sum: 1 }
          }
        },
        { $sort: { count: -1 } },
        { $limit: 20 }
      ])
    ]);
    
    sendSuccess(res, {
      categories,
      actions,
      statuses,
      users: users.map(user => ({
        id: user._id,
        name: user.name,
        role: user.role,
        activityCount: user.count
      }))
    });

  } catch (error) {
    console.error('🚨 Get Filter Options Hatası:', error);
    sendError(res, 'Filtre seçenekleri alınırken hata oluştu', 500);
  }
};

module.exports = {
  getActivities,
  getRecentActivities,
  getActivity,
  getActivityStats,
  getUserActivities,
  getFirmaActivities,
  cleanupOldActivities,
  getFilterOptions
};
