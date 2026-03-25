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
  exportRevizyonExcel, // 🆕 Revizyon Excel Export
  exportTesvikPDF,
  getTesvikTimeline,
  calculateMaliHesaplamalar,
  getDurumRenkleri,
  getDestekUnsurlari,
  getNextTesvikId,
  bulkUpdateDurum,
  saveMakineListeleri,
  setMakineTalepDurumu,
  setMakineKararDurumu,
  getTesvikAnalytics,
  getTesvikFormTemplate, // YENİ: Template verileri
  getNextGmId, // YENİ: GM ID generation
  addNewOption, // YENİ: Yeni seçenek ekleme
  getOptionsForType, // YENİ: Seçenekleri getirme
  getTesvikRevisions, // 🆕 Revizyon Geçmişi Getirme
  // 🆕 Makine revizyon akışı
  startMakineRevizyon,
  finalizeMakineRevizyon,
  listMakineRevizyonlari,
  revertMakineRevizyon,
  exportMakineRevizyonExcel,
  exportMakineRevizyonHistoryExcel,
  updateMakineRevizyonMeta,
  
  // 🎯 DİNAMİK VERİ YÖNETİMİ API'LERİ
  getDynamicDestekUnsurlari,
  addDestekUnsuru,
  getDynamicDestekSartlari,
  addDestekSarti,
  getDynamicOzelSartlar,
  addOzelSart,
  getDynamicOzelSartNotlari,
  addOzelSartNotu
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

// 📋 GET /api/tesvik/templates - Form Template Verileri
router.get('/templates', authenticate, getTesvikFormTemplate);

// 📊 GET /api/tesvik/stats - Teşvik İstatistikleri (Dashboard Widget)
router.get('/stats', authenticate, getTesvikStats);

// 📈 GET /api/tesvik/analytics - Detaylı Teşvik Analitiği (Admin)
router.get('/analytics', authenticate, authorize('admin'), getTesvikAnalytics);

// 📊 GET /api/tesvik/dashboard - Dashboard Verileri (Excel Benzeri Özet Tablolar)
router.get('/dashboard', authenticate, async (req, res) => {
  try {
    const { period = '2024' } = req.query;
    const Tesvik = require('../models/Tesvik');
    
    // Tarih filtresi
    let dateFilter = {};
    if (period !== 'all') {
      const year = parseInt(period);
      dateFilter = {
        olusturmaTarihi: {
          $gte: new Date(`${year}-01-01`),
          $lte: new Date(`${year}-12-31`)
        }
      };
    }
    
    // Temel istatistikler
    const totalIncentives = await Tesvik.countDocuments({ aktif: true, ...dateFilter });
    const activeIncentives = await Tesvik.countDocuments({ 
      aktif: true, 
      'durumBilgileri.durum': { $in: ['onaylandi', 'inceleniyor'] },
      ...dateFilter 
    });
    
    // Toplam tutar hesaplama
    const totalAmountResult = await Tesvik.aggregate([
      { $match: { aktif: true, ...dateFilter } },
      { $group: { _id: null, total: { $sum: '$kunyeBilgileri.tesvikMiktari' } } }
    ]);
    const totalAmount = totalAmountResult[0]?.total || 0;
    
    // Onay oranı
    const approvedCount = await Tesvik.countDocuments({ 
      aktif: true, 
      'durumBilgileri.durum': 'onaylandi',
      ...dateFilter 
    });
    const approvalRate = totalIncentives > 0 ? ((approvedCount / totalIncentives) * 100).toFixed(1) : 0;
    
    // Durum dağılımı
    const statusDistribution = await Tesvik.aggregate([
      { $match: { aktif: true, ...dateFilter } },
      { $group: { _id: '$durumBilgileri.durum', count: { $sum: 1 } } },
      { $project: { name: '$_id', value: '$count', _id: 0 } }
    ]);
    
    // Aylık trend
    const monthlyTrends = await Tesvik.aggregate([
      { $match: { aktif: true, ...dateFilter } },
      {
        $group: {
          _id: { $month: '$olusturmaTarihi' },
          count: { $sum: 1 },
          amount: { $sum: '$kunyeBilgileri.tesvikMiktari' }
        }
      },
      {
        $project: {
          month: {
            $switch: {
              branches: [
                { case: { $eq: ['$_id', 1] }, then: 'Ocak' },
                { case: { $eq: ['$_id', 2] }, then: 'Şubat' },
                { case: { $eq: ['$_id', 3] }, then: 'Mart' },
                { case: { $eq: ['$_id', 4] }, then: 'Nisan' },
                { case: { $eq: ['$_id', 5] }, then: 'Mayıs' },
                { case: { $eq: ['$_id', 6] }, then: 'Haziran' },
                { case: { $eq: ['$_id', 7] }, then: 'Temmuz' },
                { case: { $eq: ['$_id', 8] }, then: 'Ağustos' },
                { case: { $eq: ['$_id', 9] }, then: 'Eylül' },
                { case: { $eq: ['$_id', 10] }, then: 'Ekim' },
                { case: { $eq: ['$_id', 11] }, then: 'Kasım' },
                { case: { $eq: ['$_id', 12] }, then: 'Aralık' }
              ],
              default: 'Bilinmeyen'
            }
          },
          count: 1,
          amount: 1,
          _id: 0
        }
      },
      { $sort: { '_id': 1 } }
    ]);
    
    // En çok teşvik alan firmalar
    const topCompanies = await Tesvik.aggregate([
      { $match: { aktif: true, ...dateFilter } },
      { $lookup: { from: 'firmas', localField: 'firma', foreignField: '_id', as: 'firmaInfo' } },
      { $unwind: '$firmaInfo' },
      {
        $group: {
          _id: '$firma',
          name: { $first: '$firmaInfo.unvan' },
          count: { $sum: 1 },
          amount: { $sum: '$kunyeBilgileri.tesvikMiktari' }
        }
      },
      { $sort: { amount: -1 } },
      { $limit: 10 },
      { $project: { name: 1, count: 1, amount: 1, _id: 0 } }
    ]);
    
    // Kategori dağılımı (destek sınıfına göre)
    const categoryBreakdown = await Tesvik.aggregate([
      { $match: { aktif: true, ...dateFilter } },
      { $group: { _id: '$yatirimBilgileri1.destekSinifi', count: { $sum: 1 } } },
      { $project: { category: '$_id', count: 1, _id: 0 } },
      { $sort: { count: -1 } }
    ]);
    
    // Son aktiviteler
    const recentActivities = await Tesvik.find({ aktif: true, ...dateFilter })
      .populate('firma', 'unvan')
      .sort({ guncellenmeTarihi: -1 })
      .limit(10)
      .select('gmId tesvikId firma durumBilgileri kunyeBilgileri guncellenmeTarihi')
      .lean();
    
    const formattedActivities = recentActivities.map(activity => ({
      date: activity.guncellenmeTarihi,
      company: activity.firma?.unvan || 'Bilinmeyen',
      action: 'Teşvik Güncellendi',
      status: activity.durumBilgileri?.durum || 'taslak',
      amount: activity.kunyeBilgileri?.tesvikMiktari || 0
    }));
    
    res.json({
      success: true,
      data: {
        summary: {
          totalIncentives,
          totalAmount,
          activeIncentives,
          approvalRate
        },
        statusDistribution,
        monthlyTrends,
        topCompanies,
        categoryBreakdown,
        recentActivities: formattedActivities
      }
    });
    
  } catch (error) {
    console.error('Dashboard veri hatası:', error);
    res.status(500).json({ success: false, message: 'Dashboard verileri alınırken hata oluştu' });
  }
});

// 🎨 GET /api/tesvik/durum-renkleri - Excel Renk Kodlama Sistemi
router.get('/durum-renkleri', authenticate, getDurumRenkleri);

// 🎯 GET /api/tesvik/destek-unsurlari - Mevcut Destek Unsurları Listesi
router.get('/destek-unsurlari', authenticate, getDestekUnsurlari);

// 💰 POST /api/tesvik/hesapla-mali - Mali Hesaplamalar Otomatik Hesaplama
// Body: { sl, sm, et, eu, ev, ew, ex, ey, fb, fc, fe, ff, fh, fi }
router.post('/hesapla-mali', authenticate, calculateMaliHesaplamalar);

// 📤 GET /api/tesvik/:id/excel-export - Tekil Teşvik Excel Export
// Query params: format (xlsx/csv), includeColors (true/false)
router.get('/:id/excel-export', authenticate, checkPermission('raporGoruntule'), exportTesvikExcel);

// 📄 GET /api/tesvik/:id/pdf-export - Tekil Teşvik PDF Export
// Query params: includeColors (true/false)
router.get('/:id/pdf-export', authenticate, exportTesvikPDF);

// 📋 GET /api/tesvik/:id/revizyon-excel-export - Revizyon Geçmişi Excel Export
// Query params: includeColors (true/false)
router.get('/:id/revizyon-excel-export', authenticate, checkPermission('raporGoruntule'), exportRevizyonExcel);

// 📊 GET /api/tesvik/bulk-excel-export - Toplu Excel Export (Filtrelenebilir, Renk Kodlamalı)
// Query params: durum, il, firma, tarihBaslangic, tarihBitis
router.get('/bulk-excel-export', authenticate, checkPermission('raporGoruntule'), async (req, res) => {
  try {
    const { durum, il, firma, tarihBaslangic, tarihBitis, search } = req.query;
    
    // Filtreleme kriterlerini oluştur
    let filter = { aktif: true };
    
    if (durum) filter['durumBilgileri.durum'] = durum;
    if (il) filter['firma.il'] = il;
    if (firma) filter.firma = firma;
    if (search) {
      filter.$or = [
        { gmId: { $regex: search, $options: 'i' } },
        { tesvikId: { $regex: search, $options: 'i' } }
      ];
    }
    if (tarihBaslangic || tarihBitis) {
      filter.olusturmaTarihi = {};
      if (tarihBaslangic) filter.olusturmaTarihi.$gte = new Date(tarihBaslangic);
      if (tarihBitis) filter.olusturmaTarihi.$lte = new Date(tarihBitis);
    }
    
    const Tesvik = require('../models/Tesvik');
    const ExcelJS = require('exceljs');
    
    // Filtrelenmiş teşvikleri getir
    const tesvikler = await Tesvik.find(filter)
      .populate('firma', 'unvan vergiNo il')
      .lean()
      .limit(1000); // Performans için limit
    
    if (tesvikler.length === 0) {
      return res.status(404).json({ success: false, message: 'Filtreye uygun teşvik bulunamadı' });
    }
    
    // ExcelJS workbook oluştur
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Teşvik Listesi');
    
    // Stil tanımlamaları
    const headerStyle = {
      font: { bold: true, color: { argb: 'FFFFFFFF' }, size: 14 },
      fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF4F81BD' } },
      alignment: { horizontal: 'center', vertical: 'middle' },
      border: {
        top: { style: 'thin' },
        left: { style: 'thin' },
        bottom: { style: 'thin' },
        right: { style: 'thin' }
      }
    };
    
    const subHeaderStyle = {
      font: { bold: true, color: { argb: 'FF000000' }, size: 12 },
      fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE6F3FF' } },
      alignment: { horizontal: 'center', vertical: 'middle' },
      border: {
        top: { style: 'thin' },
        left: { style: 'thin' },
        bottom: { style: 'thin' },
        right: { style: 'thin' }
      }
    };
    
    const dataStyle = {
      font: { color: { argb: 'FF000000' }, size: 11 },
      alignment: { horizontal: 'left', vertical: 'middle' },
      border: {
        top: { style: 'thin' },
        left: { style: 'thin' },
        bottom: { style: 'thin' },
        right: { style: 'thin' }
      }
    };
    
    // Durum renk kodlaması
    const durumRenkleri = {
      'taslak': 'FFFFD700',        // Altın
      'hazirlaniyor': 'FFFF8C00',  // Turuncu
      'inceleniyor': 'FF4169E1',   // Mavi
      'onaylandi': 'FF32CD32',     // Yeşil
      'reddedildi': 'FFDC143C',    // Kırmızı
      'beklemede': 'FF9370DB',     // Mor
      'tamamlandi': 'FF228B22'     // Koyu yeşil
    };
    
    // Ana başlık
    worksheet.mergeCells('A1:H1');
    worksheet.getCell('A1').value = 'TEŞVİK LİSTESİ ÖZET RAPORU';
    worksheet.getCell('A1').style = headerStyle;
    
    // Özet bilgiler
    worksheet.getCell('A3').value = 'Toplam Kayıt:';
    worksheet.getCell('A3').style = subHeaderStyle;
    worksheet.getCell('B3').value = tesvikler.length;
    worksheet.getCell('B3').style = dataStyle;
    
    worksheet.getCell('D3').value = 'Rapor Tarihi:';
    worksheet.getCell('D3').style = subHeaderStyle;
    worksheet.getCell('E3').value = new Date().toLocaleDateString('tr-TR');
    worksheet.getCell('E3').style = dataStyle;
    
    // Tablo başlıkları
    const headers = ['GM ID', 'Teşvik ID', 'Firma', 'Durum', 'İl', 'Proje Bedeli', 'Teşvik Miktarı', 'Oluşturma Tarihi'];
    headers.forEach((header, index) => {
      const cell = worksheet.getCell(5, index + 1);
      cell.value = header;
      cell.style = subHeaderStyle;
    });
    
    // Veri satırları
    tesvikler.forEach((tesvik, index) => {
      const rowIndex = index + 6;
      const durum = tesvik.durumBilgileri?.durum || 'taslak';
      
      const rowData = [
        tesvik.gmId || '',
        tesvik.tesvikId || '',
        tesvik.firma?.unvan || tesvik.yatirimciUnvan || '',
        durum,
        tesvik.firma?.il || tesvik.yatirimBilgileri?.yerinIl || '',
        tesvik.kunyeBilgileri?.projeBedeli || 0,
        tesvik.kunyeBilgileri?.tesvikMiktari || 0,
        tesvik.olusturmaTarihi ? new Date(tesvik.olusturmaTarihi).toLocaleDateString('tr-TR') : ''
      ];
      
      rowData.forEach((value, colIndex) => {
        const cell = worksheet.getCell(rowIndex, colIndex + 1);
        cell.value = value;
        
        // Durum sütunu için renk kodlaması
        if (colIndex === 3) { // Durum sütunu
          cell.style = {
            ...dataStyle,
            fill: { 
              type: 'pattern', 
              pattern: 'solid', 
              fgColor: { argb: durumRenkleri[durum] || 'FFFFFFFF' } 
            },
            font: { 
              ...dataStyle.font,
              bold: true,
              color: { argb: durum === 'onaylandi' || durum === 'tamamlandi' ? 'FFFFFFFF' : 'FF000000' }
            }
          };
        } else {
          cell.style = dataStyle;
        }
      });
    });
    
    // Sütun genişlikleri
    worksheet.columns = [
      { width: 15 }, // GM ID
      { width: 15 }, // Teşvik ID
      { width: 40 }, // Firma
      { width: 15 }, // Durum
      { width: 12 }, // İl
      { width: 15 }, // Proje Bedeli
      { width: 15 }, // Teşvik Miktarı
      { width: 15 }  // Oluşturma Tarihi
    ];
    
    // Excel dosyasını buffer olarak oluştur
    const excelBuffer = await workbook.xlsx.writeBuffer();
    
    // Response headers ayarla
    const fileName = `tesvik_listesi_${new Date().toISOString().split('T')[0]}.xlsx`;
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
    res.setHeader('Content-Length', excelBuffer.length);
    
    // Excel dosyasını gönder
    res.send(excelBuffer);
    
    console.log(`✅ Toplu Excel export tamamlandı: ${fileName}`);
    
  } catch (error) {
    console.error('❌ Toplu Excel export hatası:', error);
    res.status(500).json({
      success: false,
      message: 'Toplu Excel export sırasında hata oluştu',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

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

// 🆕 Makine Talep/Karar Yönetimi
// Body: { liste:'yerli'|'ithal', rowId, talep:{ durum, istenenAdet, talepTarihi?, talepNotu? } }
router.post('/:id/makine-talep', authenticate, checkPermission('belgeDuzenle'), setMakineTalepDurumu);
// Body: { liste:'yerli'|'ithal', rowId, karar:{ kararDurumu:'onay|kismi_onay|red|revize', onaylananAdet, kararTarihi?, kararNotu? } }
router.post('/:id/makine-karar', authenticate, checkPermission('belgeDuzenle'), setMakineKararDurumu);
// 🆕 Makine Listeleri Kaydet (tam liste)
router.post('/:id/makine-listeleri', authenticate, checkPermission('belgeDuzenle'), saveMakineListeleri);

// 🆕 Makine Revizyon Akışı
// Revizyon başlat: pre-snapshot al, düzenleme izni ver
router.post('/:id/makine-revizyon/start', authenticate, checkPermission('belgeDuzenle'), startMakineRevizyon);
// Revizyon finalize: post-snapshot al
router.post('/:id/makine-revizyon/finalize', authenticate, checkPermission('belgeDuzenle'), finalizeMakineRevizyon);
// Revizyon geçmişi: listele
router.get('/:id/makine-revizyon/list', authenticate, checkPermission('raporGoruntule'), listMakineRevizyonlari);
// Revizyon geri al: seçilen revizeId snapshot'ına dön ve yeni revert snapshot oluştur
router.post('/:id/makine-revizyon/revert', authenticate, checkPermission('belgeDuzenle'), revertMakineRevizyon);
// Revizyon Excel export: hücre değişiklikleri kırmızı
router.get('/:id/makine-revizyon/excel-export', authenticate, checkPermission('raporGoruntule'), exportMakineRevizyonExcel);
// Revizyon işlem geçmişi Excel export: alan bazlı değişiklik listesi
router.get('/:id/makine-revizyon/history-excel', authenticate, checkPermission('raporGoruntule'), exportMakineRevizyonHistoryExcel);
// Revize meta güncelle (ETUYS alanları)
router.patch('/:id/makine-revizyon/meta', authenticate, checkPermission('belgeDuzenle'), updateMakineRevizyonMeta);

// 📊 GET /api/tesvik/:id/revisions - Revizyon Geçmişi Getirme
router.get('/:id/revisions', 
  authenticate, 
  checkPermission('raporGoruntule'),
  getTesvikRevisions
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
      
      // 3. Bekleyen teşvik sayısı (sadece aktif olanlar)
      Tesvik.countDocuments({ 
        aktif: true,
        'durumBilgileri.genelDurum': { 
          $in: ['inceleniyor', 'onay_bekliyor', 'ek_belge_istendi'] 
        } 
      }).then(count => {
        console.log('⏳ Bekleyen teşvik:', count);
        return count;
      }),
      
      // 4. Onaylanan teşvik sayısı (sadece aktif olanlar)
      Tesvik.countDocuments({ 
        aktif: true,
        'durumBilgileri.genelDurum': 'onaylandi' 
      }).then(count => {
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

// 🎯 ======== DİNAMİK VERİ YÖNETİMİ API'LERİ ========

// 📋 Dinamik Destek Unsurları
router.get('/dynamic/destek-unsurlari', authenticate, checkPermission('belgeOkuma'), getDynamicDestekUnsurlari);
router.post('/dynamic/destek-unsuru', authenticate, checkPermission('belgeEkleme'), addDestekUnsuru);

// 📋 Dinamik Destek Şartları  
router.get('/dynamic/destek-sartlari', authenticate, checkPermission('belgeOkuma'), getDynamicDestekSartlari);
router.post('/dynamic/destek-sarti', authenticate, checkPermission('belgeEkleme'), addDestekSarti);

// 📋 Dinamik Özel Şartlar
router.get('/dynamic/ozel-sartlar', authenticate, checkPermission('belgeOkuma'), getDynamicOzelSartlar);
router.post('/dynamic/ozel-sart', authenticate, checkPermission('belgeEkleme'), addOzelSart);

// 📋 Dinamik Özel Şart Notları
router.get('/dynamic/ozel-sart-notlari', authenticate, checkPermission('belgeOkuma'), getDynamicOzelSartNotlari);
router.post('/dynamic/ozel-sart-notu', authenticate, checkPermission('belgeEkleme'), addOzelSartNotu);

module.exports = router;