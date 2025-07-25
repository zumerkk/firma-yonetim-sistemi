// 🏆 TEŞVİK SİSTEMİ ROUTES - ENTERPRISE EDITION
// Excel + Word şablonu analizine göre tam kapsamlı API endpoint'leri
// Devlet standartları + renk kodlaması + durum takibi

const express = require('express');
const router = express.Router();

// Controllers
const {
  createTesvik,
  getTesvikler,
  getTesvik,
  updateTesvik,
  deleteTesvik,
  searchTesvikler,
  getTesvikStats,
  getTesvikByFirma,
  updateTesvikDurum,
  addTesvikRevizyon,
  exportTesvikExcel,
  exportTesvikPDF,
  getTesvikTimeline,
  calculateMaliHesaplamalar,
  getDurumRenkleri,
  getDestekUnsurlari,
  getNextTesvikId,
  bulkUpdateDurum,
  getTesvikAnalytics,
  getTesvikFormTemplate, // YENİ: Template verileri
  getNextGmId, // YENİ: GM ID generation
  addNewOption, // YENİ: Yeni seçenek ekleme
  getOptionsForType // YENİ: Seçenekleri getirme
} = require('../controllers/tesvikController');

// Middleware
const { authenticate, authorize, checkPermission } = require('../middleware/auth');
const { validateCreateTesvik, validateUpdateTesvik, validateDurumUpdate } = require('../middleware/validation');

// 🔍 GET /api/tesvik/search - Gelişmiş Teşvik Arama
// Query params: q, durum, il, firma, tarihBaslangic, tarihBitis, destekSinifi
router.get('/search', authenticate, searchTesvikler);

// 🆔 GET /api/tesvik/next-id - Sonraki Teşvik ID'yi al (TES2024001 format)
router.get('/next-id', authenticate, getNextTesvikId);

// 🆔 GET /api/tesvik/next-gm-id - Sonraki GM ID'yi al (GM2024001 format) - YENİ!
router.get('/next-gm-id', authenticate, getNextGmId);

// 📋 GET /api/tesvik/templates/yeni-tesvik - Form Template Verileri - YENİ!
router.get('/templates/yeni-tesvik', authenticate, getTesvikFormTemplate);

// 📊 GET /api/tesvik/stats - Teşvik İstatistikleri (Dashboard Widget)
router.get('/stats', authenticate, getTesvikStats);

// 📈 GET /api/tesvik/analytics - Detaylı Teşvik Analitiği (Admin)
router.get('/analytics', authenticate, authorize('admin'), getTesvikAnalytics);

// 🎨 GET /api/tesvik/durum-renkleri - Excel Renk Kodlama Sistemi
router.get('/durum-renkleri', authenticate, getDurumRenkleri);

// 🎯 GET /api/tesvik/destek-unsurlari - Mevcut Destek Unsurları Listesi
router.get('/destek-unsurlari', authenticate, getDestekUnsurlari);

// 💰 POST /api/tesvik/hesapla-mali - Mali Hesaplamalar Otomatik Hesaplama
// Body: { sl, sm, et, eu, ev, ew, ex, ey, fb, fc, fe, ff, fh, fi }
router.post('/hesapla-mali', authenticate, calculateMaliHesaplamalar);

// 📤 GET /api/tesvik/excel-export - Excel Export (Filtrelenebilir)
// Query params: durum, il, firma, tarihBaslangic, tarihBitis
router.get('/excel-export', authenticate, checkPermission('raporGoruntule'), exportTesvikExcel);

// 📄 GET /api/tesvik/pdf-export/:id - Tekil Teşvik PDF Export
router.get('/pdf-export/:id', authenticate, exportTesvikPDF);

// 🏢 GET /api/tesvik/firma/:firmaId - Firmaya Ait Teşvikler
router.get('/firma/:firmaId', authenticate, getTesvikByFirma);

// ⏰ GET /api/tesvik/timeline/:id - Teşvik Süreç Timeline'ı (Revizyon geçmişi)
router.get('/timeline/:id', authenticate, getTesvikTimeline);

// 📋 GET /api/tesvik - Teşvik Listesi (Pagination + Advanced Filtering)
// Query params: sayfa, limit, durum, il, firma, siraBy, siraSekli, tarihBaslangic, tarihBitis
router.get('/', authenticate, getTesvikler);

// 📝 POST /api/tesvik - Yeni Teşvik Başvurusu Oluştur
router.post('/', 
  authenticate, 
  checkPermission('belgeEkle'),
  validateCreateTesvik, 
  createTesvik
);

// 🔄 PATCH /api/tesvik/bulk-durum - Toplu Durum Güncelleme (Excel batch işlemi)
// Body: { tesvikIds: [], yeniDurum: '', aciklama: '' }
router.patch('/bulk-durum', 
  authenticate, 
  checkPermission('belgeDuzenle'),
  bulkUpdateDurum
);

// 🎯 YENİ SEÇENEK EKLEME ROUTES
router.post('/add-option/:type', addNewOption);
router.get('/options/:type', getOptionsForType);

// 👁️ GET /api/tesvik/:id - Tekil Teşvik Detayı (ID veya TesvikId ile)
router.get('/:id', authenticate, getTesvik);

// ✏️ PUT /api/tesvik/:id - Teşvik Güncelleme (Tam güncelleme)
router.put('/:id', 
  authenticate, 
  checkPermission('belgeDuzenle'),
  validateUpdateTesvik, 
  updateTesvik
);

// 🎯 PATCH /api/tesvik/:id/durum - Sadece Durum Güncelleme (Excel renk değişimi)
// Body: { yeniDurum, aciklama, kullaniciNotu }
router.patch('/:id/durum', 
  authenticate, 
  checkPermission('belgeDuzenle'),
  validateDurumUpdate,
  updateTesvikDurum
);

// 📝 POST /api/tesvik/:id/revizyon - Revizyon Ekleme (Excel revizyon sistemi)
// Body: { revizyonSebebi, degisikenAlanlar, yeniDurum?, kullaniciNotu }
router.post('/:id/revizyon', 
  authenticate, 
  checkPermission('belgeDuzenle'),
  addTesvikRevizyon
);

// 🗑️ DELETE /api/tesvik/:id - Teşvik Silme (Soft delete)
router.delete('/:id', 
  authenticate, 
  checkPermission('belgeSil'),
  deleteTesvik
);

// 🔄 PATCH /api/tesvik/:id/restore - Silinen Teşvik Geri Getirme
router.patch('/:id/restore', 
  authenticate, 
  checkPermission('belgeDuzenle'),
  async (req, res) => {
    try {
      const Tesvik = require('../models/Tesvik');
      const tesvik = await Tesvik.findByIdAndUpdate(
        req.params.id,
        { aktif: true, sonGuncelleyen: req.user._id },
        { new: true }
      );

      if (!tesvik) {
        return res.status(404).json({
          success: false,
          message: 'Teşvik bulunamadı'
        });
      }

      res.json({
        success: true,
        message: 'Teşvik başarıyla geri getirildi',
        data: tesvik
      });
    } catch (error) {
      console.error('🚨 Teşvik restore hatası:', error);
      res.status(500).json({
        success: false,
        message: 'Teşvik geri getirilirken hata oluştu'
      });
    }
  }
);

// 📊 ADVANCED ENDPOINTS - Enterprise Features

// 💡 GET /api/tesvik/dashboard/widgets - Dashboard Widget Verileri
router.get('/dashboard/widgets', authenticate, async (req, res) => {
  try {
    console.log('📊 Dashboard widgets endpoint çağrıldı...');
    const Tesvik = require('../models/Tesvik');
    
    console.log('🔍 Tesvik model yüklendi, sorguları başlatıyorum...');
    
    const [
      toplamTesvik,
      aktifTesvik,
      bekleyenTesvik,
      onaylananTesvik,
      sonEklenenler,
      durumDagilimi,
      ilBazindaDagilim
    ] = await Promise.all([
      // 1. Toplam teşvik sayısı (sadece aktif olanlar)
      Tesvik.countDocuments({ aktif: true }).then(count => {
        console.log('📈 Toplam teşvik:', count);
        return count;
      }),
      
      // 2. Aktif teşvik sayısı  
      Tesvik.countDocuments({ aktif: true }).then(count => {
        console.log('✅ Aktif teşvik:', count);
        return count;
      }),
      
      // 3. Bekleyen teşvik sayısı
      Tesvik.countDocuments({ 
        'durumBilgileri.genelDurum': { 
          $in: ['inceleniyor', 'onay_bekliyor', 'ek_belge_istendi'] 
        } 
      }).then(count => {
        console.log('⏳ Bekleyen teşvik:', count);
        return count;
      }),
      
      // 4. Onaylanan teşvik sayısı
      Tesvik.countDocuments({ 'durumBilgileri.genelDurum': 'onaylandi' }).then(count => {
        console.log('🎯 Onaylanan teşvik:', count);
        return count;
      }),
      
      // 5. Son 5 teşvik (kullanıcı bilgileri ile)
      Tesvik.find({ aktif: true })
        .sort({ createdAt: -1 })
        .limit(5)
        .select('tesvikId yatirimciUnvan durumBilgileri createdAt firmaId olusturanKullanici')
        .populate('olusturanKullanici', 'adSoyad email rol') // 👤 Ekleyen kullanıcı bilgisi
        .populate('firma', 'tamUnvan firmaId') // 🏢 Firma bilgisi
        .then(result => {
          console.log('📋 Son eklenenler:', result?.length || 0);
          if (result?.length > 0) {
            console.log('👤 İlk teşviği ekleyen:', result[0]?.olusturanKullanici?.adSoyad || 'Bilinmiyor');
          }
          return result;
        }),
      
      // 6. Durum dağılımı
      Tesvik.aggregate([
        { $match: { aktif: true } },
        { $group: { _id: '$durumBilgileri.genelDurum', count: { $sum: 1 } } },
        { $sort: { count: -1 } }
      ]).then(result => {
        console.log('📊 Durum dağılımı:', result?.length || 0, 'adet');
        return result;
      }),
      
      // 7. İl bazında dağılım
      Tesvik.aggregate([
        { $match: { aktif: true } },
        { $group: { _id: '$yatirimBilgileri.yerinIl', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 10 }
      ]).then(result => {
        console.log('🌍 İl dağılımı:', result?.length || 0, 'adet');
        return result;
      })
    ]);

    res.json({
      success: true,
      message: 'Dashboard widget verileri getirildi',
      data: {
        ozet: {
          toplamTesvik,
          aktifTesvik,
          bekleyenTesvik,
          onaylananTesvik,
          basariOrani: toplamTesvik > 0 ? ((onaylananTesvik / toplamTesvik) * 100).toFixed(1) : 0
        },
        sonEklenenler,
        durumDagilimi,
        ilBazindaDagilim
      }
    });
    
    console.log('✅ Dashboard widget verileri başarıyla hazırlandı');
    
  } catch (error) {
    console.error('🚨 Dashboard widget hatası - DETAY:');
    console.error('Hata mesajı:', error.message);
    console.error('Hata stack:', error.stack);
    console.error('Hata adı:', error.name);
    
    res.status(500).json({
      success: false,
      message: 'Widget verileri alınırken hata oluştu',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// 🔔 GET /api/tesvik/alerts/süresi-dolacaklar - Süresi Dolacak Teşvikler
router.get('/alerts/suresi-dolacaklar', authenticate, async (req, res) => {
  try {
    const Tesvik = require('../models/Tesvik');
    const { gunSayisi = 30 } = req.query;
    
    const alertTarihi = new Date();
    alertTarihi.setDate(alertTarihi.getDate() + parseInt(gunSayisi));
    
    const suresiDolacaklar = await Tesvik.find({
      aktif: true,
      'belgeYonetimi.belgebitisTarihi': {
        $lte: alertTarihi,
        $gte: new Date()
      }
    })
    .populate('firma', 'tamUnvan firmaId')
    .select('tesvikId yatirimciUnvan belgeYonetimi.belgebitisTarihi durumBilgileri')
    .sort({ 'belgeYonetimi.belgebitisTarihi': 1 });

    res.json({
      success: true,
      message: `${gunSayisi} gün içinde süresi dolacak teşvikler`,
      data: suresiDolacaklar,
      count: suresiDolacaklar.length
    });
    
  } catch (error) {
    console.error('🚨 Süre alert hatası:', error);
    res.status(500).json({
      success: false,
      message: 'Süre uyarıları alınırken hata oluştu'
    });
  }
});

module.exports = router; 