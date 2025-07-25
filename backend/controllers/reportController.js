// 📊 REPORT CONTROLLER - ENTERPRISE REPORTING SUITE
// Comprehensive reporting system with PDF/Excel generation, custom reports, analytics

const User = require('../models/User');
const Firma = require('../models/Firma');
const Tesvik = require('../models/Tesvik');
const Activity = require('../models/Activity');
const PDFDocument = require('pdfkit');
const ExcelJS = require('exceljs');
const fs = require('fs');
const path = require('path');

// 📊 Report Template Model (için şimdilik basit schema)
const reportTemplateSchema = {
  name: String,
  description: String,
  config: Object,
  createdBy: String,
  createdAt: Date
};

// Geçici olarak memory'de saklayacağız
let savedTemplates = [];

// 📊 GET /api/reports/analytics - Get reporting analytics
const getReportAnalytics = async (req, res) => {
  try {
    console.log('📊 Report analytics istendi');

    // Get real analytics from database
    const [firmalarCount, tesviklerCount, activitiesCount] = await Promise.all([
      Firma.countDocuments({ aktif: { $ne: false } }),
      Tesvik.countDocuments({ aktif: true }),
      Activity.countDocuments({
        createdAt: { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) }
      })
    ]);

    const analytics = {
      totalReports: firmalarCount + tesviklerCount,
      monthlyReports: activitiesCount,
      mostUsedFormat: 'PDF',
      averageGenerationTime: '2.3s'
    };

    console.log('✅ Report analytics hazırlandı:', analytics);

    res.status(200).json({
      success: true,
      data: analytics
    });

  } catch (error) {
    console.error('🚨 Report analytics hatası:', error);
    res.status(500).json({
      success: false,
      message: 'Analytics verileri alınırken hata oluştu',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// 📋 GET /api/reports/saved - Get saved report templates
const getSavedReports = async (req, res) => {
  try {
    console.log('📋 Saved reports istendi');

    // Return saved templates
    res.status(200).json({
      success: true,
      data: savedTemplates
    });

  } catch (error) {
    console.error('🚨 Saved reports hatası:', error);
    res.status(500).json({
      success: false,
      message: 'Kaydedilmiş raporlar alınırken hata oluştu',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// 💾 POST /api/reports/templates - Save report template
const saveReportTemplate = async (req, res) => {
  try {
    const { name, description, config } = req.body;

    console.log('💾 Report template kaydediliyor:', name);

    const template = {
      _id: Date.now().toString(),
      name,
      description,
      config,
      createdBy: req.user.adSoyad,
      createdAt: new Date()
    };

    savedTemplates.push(template);

    // Log activity
    await Activity.logActivity({
      userId: req.user._id,
      action: 'create',
      category: 'system',
      details: `Rapor şablonu kaydedildi: ${name}`,
      metadata: {
        templateName: name,
        createdBy: req.user.adSoyad
      }
    });

    console.log('✅ Report template kaydedildi');

    res.status(201).json({
      success: true,
      message: 'Rapor şablonu başarıyla kaydedildi',
      data: template
    });

  } catch (error) {
    console.error('🚨 Save template hatası:', error);
    res.status(500).json({
      success: false,
      message: 'Şablon kaydedilirken hata oluştu',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// 📊 POST /api/reports/generate - Generate report
const generateReport = async (req, res) => {
  try {
    const { type, filters, format, config } = req.body;

    console.log('📊 Report oluşturuluyor:', { type, format });

    let reportData;
    let fileName;
    let filePath;

    // Get data based on report type
    switch (type) {
      case 'firma_summary':
        reportData = await generateFirmaSummaryData(filters);
        fileName = `firma_ozet_${Date.now()}.${format}`;
        break;
      case 'tesvik_summary':
        reportData = await generateTesvikSummaryData(filters);
        fileName = `tesvik_ozet_${Date.now()}.${format}`;
        break;
      case 'monthly_activity':
        reportData = await generateMonthlyActivityData(filters);
        fileName = `aylik_aktivite_${Date.now()}.${format}`;
        break;
      case 'user_activity':
        reportData = await generateUserActivityData(filters);
        fileName = `kullanici_aktivite_${Date.now()}.${format}`;
        break;
      case 'financial_summary':
        reportData = await generateFinancialSummaryData(filters);
        fileName = `mali_ozet_${Date.now()}.${format}`;
        break;
      default:
        return res.status(400).json({
          success: false,
          message: 'Geçersiz rapor türü'
        });
    }

    // Generate file based on format
    switch (format) {
      case 'pdf':
        filePath = await generatePDFReport(reportData, fileName, type);
        break;
      case 'excel':
        filePath = await generateExcelReport(reportData, fileName, type);
        break;
      case 'csv':
        filePath = await generateCSVReport(reportData, fileName, type);
        break;
      default:
        return res.status(400).json({
          success: false,
          message: 'Geçersiz dosya formatı'
        });
    }

    // Debug user object
    console.log('🔍 User Debug:', {
      id: req.user._id,
      adSoyad: req.user.adSoyad,
      email: req.user.email,
      rol: req.user.rol,
      userKeys: Object.keys(req.user)
    });

    // Log activity
    await Activity.logActivity({
      action: 'generate',
      category: 'system',
      title: 'Rapor Oluşturuldu',
      description: `${type} türünde rapor oluşturuldu: ${fileName}`,
      user: {
        id: req.user._id,
        name: req.user.adSoyad || 'Bilinmeyen Kullanıcı',
        email: req.user.email || 'email@bilinmiyor.com',
        role: req.user.rol || 'kullanici'
      },
      targetResource: {
        type: 'system',
        name: fileName
      },
      metadata: {
        reportType: type,
        format,
        fileName,
        generatedBy: req.user.adSoyad
      }
    });

    console.log('✅ Report oluşturuldu:', fileName);

    // Return download URL
    const downloadUrl = `/api/reports/download/${path.basename(filePath)}`;

    res.status(200).json({
      success: true,
      message: 'Rapor başarıyla oluşturuldu',
      data: {
        fileName,
        downloadUrl,
        fileSize: fs.statSync(filePath).size
      }
    });

  } catch (error) {
    console.error('🚨 Report generation hatası:', error);
    res.status(500).json({
      success: false,
      message: 'Rapor oluşturulurken hata oluştu',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// 📥 GET /api/reports/download/:filename - Download generated report
const downloadReport = async (req, res) => {
  try {
    const { filename } = req.params;
    const filePath = path.join(__dirname, '../uploads/reports', filename);

    if (!fs.existsSync(filePath)) {
      return res.status(404).json({
        success: false,
        message: 'Dosya bulunamadı'
      });
    }

    console.log('📥 Report download:', filename);

    // Set proper headers for file download
    const fileExtension = path.extname(filename).toLowerCase();
    let contentType = 'application/octet-stream';
    
    if (fileExtension === '.pdf') {
      contentType = 'application/pdf';
    } else if (fileExtension === '.xlsx') {
      contentType = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
    } else if (fileExtension === '.csv') {
      contentType = 'text/csv';
    }

    res.setHeader('Content-Type', contentType);
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');

    // Stream the file
    const fileStream = fs.createReadStream(filePath);
    fileStream.pipe(res);

    fileStream.on('end', () => {
      console.log('✅ File download completed:', filename);
      
      // Clean up file after download
      setTimeout(() => {
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
          console.log('🗑️ Temporary file deleted:', filename);
        }
      }, 30000); // Delete after 30 seconds
    });

    fileStream.on('error', (err) => {
      console.error('File stream error:', err);
      if (!res.headersSent) {
        res.status(500).json({
          success: false,
          message: 'Dosya okuma hatası'
        });
      }
    });

  } catch (error) {
    console.error('🚨 Download hatası:', error);
    if (!res.headersSent) {
      res.status(500).json({
        success: false,
        message: 'Dosya indirilemedi',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }
};

// 📊 DATA GENERATION FUNCTIONS

const generateFirmaSummaryData = async (filters) => {
  const query = {};
  
  if (filters.dateFrom && filters.dateTo) {
    query.createdAt = {
      $gte: new Date(filters.dateFrom),
      $lte: new Date(filters.dateTo)
    };
  }

  const firmalar = await Firma.find(query)
    .select('firmaId tamUnvan firmaIl firmaIlce aktif etuysYetkiBitis dysYetkiBitis createdAt')
    .sort({ createdAt: -1 })
    .lean();

  return {
    title: 'Firma Özet Raporu',
    subtitle: `Toplam ${firmalar.length} firma`,
    data: firmalar,
    summary: {
      total: firmalar.length,
      active: firmalar.filter(f => f.aktif !== false).length,
      inactive: firmalar.filter(f => f.aktif === false).length,
      cities: [...new Set(firmalar.map(f => f.firmaIl))].length
    }
  };
};

const generateTesvikSummaryData = async (filters) => {
  const query = { aktif: true };
  
  if (filters.dateFrom && filters.dateTo) {
    query.createdAt = {
      $gte: new Date(filters.dateFrom),
      $lte: new Date(filters.dateTo)
    };
  }

  const tesvikler = await Tesvik.find(query)
    .populate('firma', 'tamUnvan firmaIl')
    .select('tesvikId yatirimciUnvan yatirimBilgileri maliHesaplamalar durumBilgileri createdAt')
    .sort({ createdAt: -1 })
    .lean();

  return {
    title: 'Teşvik Özet Raporu',
    subtitle: `Toplam ${tesvikler.length} teşvik`,
    data: tesvikler,
    summary: {
      total: tesvikler.length,
      approved: tesvikler.filter(t => t.durumBilgileri?.genelDurum === 'onaylandi').length,
      pending: tesvikler.filter(t => t.durumBilgileri?.genelDurum === 'beklemede').length,
      totalInvestment: tesvikler.reduce((sum, t) => sum + (t.maliHesaplamalar?.toplamSabitYatirim || 0), 0)
    }
  };
};

const generateMonthlyActivityData = async (filters) => {
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const activities = await Activity.find({
    createdAt: { $gte: thirtyDaysAgo }
  })
    .sort({ createdAt: -1 })
    .lean();

  return {
    title: 'Aylık Aktivite Raporu',
    subtitle: `Son 30 günde ${activities.length} aktivite`,
    data: activities,
    summary: {
      total: activities.length,
      users: [...new Set(activities.map(a => a.userId?._id))].length,
      categories: [...new Set(activities.map(a => a.category))],
      dailyAverage: Math.round(activities.length / 30)
    }
  };
};

const generateUserActivityData = async (filters) => {
  const users = await User.find({ aktif: true })
    .select('adSoyad email rol sonGiris createdAt')
    .lean();

  // Get activity count for each user
  for (let user of users) {
    const activityCount = await Activity.countDocuments({ userId: user._id });
    user.activityCount = activityCount;
  }

  return {
    title: 'Kullanıcı Aktivite Raporu',
    subtitle: `${users.length} kullanıcı`,
    data: users,
    summary: {
      total: users.length,
      active: users.filter(u => u.aktif).length,
      admins: users.filter(u => u.rol === 'admin').length,
      totalActivities: users.reduce((sum, u) => sum + u.activityCount, 0)
    }
  };
};

const generateFinancialSummaryData = async (filters) => {
  const tesvikler = await Tesvik.find({ aktif: true })
    .select('tesvikId yatirimciUnvan maliHesaplamalar kunyeBilgileri')
    .lean();

  const financialData = tesvikler.map(t => ({
    tesvikId: t.tesvikId,
    yatirimciUnvan: t.yatirimciUnvan,
    toplamYatirim: t.maliHesaplamalar?.toplamSabitYatirim || 0,
    tesvikMiktari: t.kunyeBilgileri?.tesvikMiktari || 0,
    tesvikOrani: t.kunyeBilgileri?.tesvikOrani || 0
  }));

  return {
    title: 'Mali Özet Raporu',
    subtitle: `${financialData.length} teşvik mali verisi`,
    data: financialData,
    summary: {
      totalInvestment: financialData.reduce((sum, d) => sum + d.toplamYatirim, 0),
      totalIncentive: financialData.reduce((sum, d) => sum + d.tesvikMiktari, 0),
      averageRatio: financialData.length > 0 
        ? financialData.reduce((sum, d) => sum + d.tesvikOrani, 0) / financialData.length 
        : 0,
      count: financialData.length
    }
  };
};

// 📄 FILE GENERATION FUNCTIONS

const generatePDFReport = async (reportData, fileName, type) => {
  return new Promise((resolve, reject) => {
    try {
      const reportsDir = path.join(__dirname, '../uploads/reports');
      if (!fs.existsSync(reportsDir)) {
        fs.mkdirSync(reportsDir, { recursive: true });
      }

      const filePath = path.join(reportsDir, fileName);
      const doc = new PDFDocument({ bufferPages: true });
      const stream = fs.createWriteStream(filePath);
      
      doc.pipe(stream);

      // PDF Header with better formatting
      doc.fontSize(20).text(reportData.title || 'Rapor', 50, 50, { align: 'center' });
      doc.fontSize(12).text(reportData.subtitle || '', 50, 80, { align: 'center' });
      doc.text(`Oluşturma Tarihi: ${new Date().toLocaleDateString('tr-TR')}`, 50, 100, { align: 'center' });
      
      // Add a line separator
      doc.moveTo(50, 120).lineTo(550, 120).stroke();
      
      let y = 140;

      // Summary Section
      if (reportData.summary) {
        doc.fontSize(14).text('📊 Özet Bilgiler', 50, y, { underline: true });
        y += 25;
        
        Object.entries(reportData.summary).forEach(([key, value]) => {
          const displayKey = translateKey(key);
          const displayValue = typeof value === 'number' ? value.toLocaleString('tr-TR') : value;
          doc.fontSize(10).text(`• ${displayKey}: ${displayValue}`, 70, y);
          y += 15;
        });
        y += 15;
      }

      // Data Table
      if (reportData.data && reportData.data.length > 0) {
        doc.fontSize(14).text('📋 Detay Veriler', 50, y, { underline: true });
        y += 25;

        const sample = reportData.data[0];
        const headers = Object.keys(sample).slice(0, 4); // First 4 columns for better fit
        
        // Table headers with background
        doc.fontSize(9);
        headers.forEach((header, index) => {
          const translatedHeader = translateKey(header);
          doc.text(translatedHeader, 50 + (index * 120), y, { width: 115 });
        });
        y += 20;
        
        // Add header separator line
        doc.moveTo(50, y - 5).lineTo(530, y - 5).stroke();

        // Table data (first 25 rows)
        reportData.data.slice(0, 25).forEach((row, rowIndex) => {
          if (y > 720) { // New page
            doc.addPage();
            y = 50;
            
            // Repeat headers on new page
            doc.fontSize(9);
            headers.forEach((header, index) => {
              const translatedHeader = translateKey(header);
              doc.text(translatedHeader, 50 + (index * 120), y, { width: 115 });
            });
            y += 20;
            doc.moveTo(50, y - 5).lineTo(530, y - 5).stroke();
          }
          
          headers.forEach((header, index) => {
            let value = row[header] || '';
            
            // Format different data types
            if (typeof value === 'object' && value !== null) {
              if (value.tamUnvan) value = value.tamUnvan;
              else if (value.adSoyad) value = value.adSoyad;
              else value = JSON.stringify(value);
            }
            
            if (typeof value === 'number') {
              value = value.toLocaleString('tr-TR');
            }
            
            if (typeof value === 'string' && value.length > 25) {
              value = value.substring(0, 22) + '...';
            }
            
            doc.fontSize(8).text(String(value), 50 + (index * 120), y, { width: 115 });
          });
          y += 15;
          
          // Add subtle row separator every 5 rows
          if ((rowIndex + 1) % 5 === 0) {
            doc.moveTo(50, y - 2).lineTo(530, y - 2).stroke({ opacity: 0.3 });
          }
        });
        
        // Add total count if more data exists
        if (reportData.data.length > 25) {
          y += 10;
          doc.fontSize(10).text(`... ve ${reportData.data.length - 25} kayıt daha`, 50, y, { align: 'center' });
        }
      }

      // Add footer
      const pageCount = doc.bufferedPageRange().count;
      for (let i = 0; i < pageCount; i++) {
        doc.switchToPage(i);
        doc.fontSize(8).text(
          `Sayfa ${i + 1} / ${pageCount} - Cahit Şirket Yönetim Sistemi`,
          50, 750,
          { align: 'center' }
        );
      }

      doc.end();

      stream.on('finish', () => {
        console.log('✅ PDF oluşturuldu:', fileName);
        resolve(filePath);
      });

      stream.on('error', (error) => {
        console.error('❌ PDF oluşturma hatası:', error);
        reject(error);
      });

    } catch (error) {
      console.error('❌ PDF generation error:', error);
      reject(error);
    }
  });
};

// Helper function to translate keys to Turkish
const translateKey = (key) => {
  const translations = {
    'total': 'Toplam',
    'active': 'Aktif',
    'inactive': 'Pasif',
    'cities': 'Şehir Sayısı',
    'approved': 'Onaylı',
    'pending': 'Beklemede',
    'totalInvestment': 'Toplam Yatırım',
    'users': 'Kullanıcı Sayısı',
    'categories': 'Kategori Sayısı',
    'dailyAverage': 'Günlük Ortalama',
    'admins': 'Admin Sayısı',
    'totalActivities': 'Toplam Aktivite',
    'totalIncentive': 'Toplam Teşvik',
    'averageRatio': 'Ortalama Oran',
    'count': 'Adet',
    'firmaId': 'Firma ID',
    'tamUnvan': 'Firma Unvanı',
    'firmaIl': 'İl',
    'firmaIlce': 'İlçe',
    'aktif': 'Durum',
    'createdAt': 'Oluşturma Tarihi',
    'tesvikId': 'Teşvik ID',
    'yatirimciUnvan': 'Yatırımcı Unvanı',
    'adSoyad': 'Ad Soyad',
    'email': 'E-posta',
    'rol': 'Rol',
    'sonGiris': 'Son Giriş',
    'activityCount': 'Aktivite Sayısı'
  };
  
  return translations[key] || key;
};

const generateExcelReport = async (reportData, fileName, type) => {
  try {
    const reportsDir = path.join(__dirname, '../uploads/reports');
    if (!fs.existsSync(reportsDir)) {
      fs.mkdirSync(reportsDir, { recursive: true });
    }

    const filePath = path.join(reportsDir, fileName);
    const workbook = new ExcelJS.Workbook();
    
    // Set workbook properties
    workbook.creator = 'Cahit Şirket Yönetim Sistemi';
    workbook.created = new Date();
    
    const worksheet = workbook.addWorksheet(reportData.title || 'Rapor');

    // Header with better styling
    worksheet.mergeCells('A1:H1');
    const titleCell = worksheet.getCell('A1');
    titleCell.value = reportData.title || 'Rapor';
    titleCell.font = { size: 18, bold: true, color: { argb: 'FF2E4057' } };
    titleCell.alignment = { horizontal: 'center', vertical: 'middle' };
    titleCell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFF8F9FA' }
    };
    worksheet.getRow(1).height = 30;

    worksheet.mergeCells('A2:H2');
    const subtitleCell = worksheet.getCell('A2');
    subtitleCell.value = reportData.subtitle || '';
    subtitleCell.font = { size: 12, italic: true };
    subtitleCell.alignment = { horizontal: 'center' };

    worksheet.mergeCells('A3:H3');
    const dateCell = worksheet.getCell('A3');
    dateCell.value = `Oluşturma Tarihi: ${new Date().toLocaleDateString('tr-TR')}`;
    dateCell.font = { size: 10 };
    dateCell.alignment = { horizontal: 'center' };

    let currentRow = 5;

    // Summary with better formatting
    if (reportData.summary) {
      const summaryHeaderCell = worksheet.getCell(`A${currentRow}`);
      summaryHeaderCell.value = '📊 Özet Bilgiler';
      summaryHeaderCell.font = { bold: true, size: 14, color: { argb: 'FF2E4057' } };
      summaryHeaderCell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFE3F2FD' }
      };
      currentRow++;

      Object.entries(reportData.summary).forEach(([key, value]) => {
        const keyCell = worksheet.getCell(`A${currentRow}`);
        const valueCell = worksheet.getCell(`B${currentRow}`);
        
        keyCell.value = translateKey(key);
        keyCell.font = { bold: true };
        
        if (typeof value === 'number') {
          valueCell.value = value;
          valueCell.numFmt = '#,##0';
        } else {
          valueCell.value = value;
        }
        
        currentRow++;
      });
      currentRow += 2;
    }

    // Data with enhanced formatting
    if (reportData.data && reportData.data.length > 0) {
      const dataHeaderCell = worksheet.getCell(`A${currentRow}`);
      dataHeaderCell.value = '📋 Detay Veriler';
      dataHeaderCell.font = { bold: true, size: 14, color: { argb: 'FF2E4057' } };
      dataHeaderCell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFE8F5E8' }
      };
      currentRow += 2;

      const sample = reportData.data[0];
      const headers = Object.keys(sample);

      // Headers with styling
      headers.forEach((header, index) => {
        const cell = worksheet.getCell(currentRow, index + 1);
        cell.value = translateKey(header);
        cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
        cell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FF4A90E2' }
        };
        cell.alignment = { horizontal: 'center', vertical: 'middle' };
        cell.border = {
          top: { style: 'thin' },
          left: { style: 'thin' },
          bottom: { style: 'thin' },
          right: { style: 'thin' }
        };
      });
      worksheet.getRow(currentRow).height = 25;
      currentRow++;

      // Data rows with alternating colors
      reportData.data.forEach((row, rowIndex) => {
        headers.forEach((header, index) => {
          const cell = worksheet.getCell(currentRow, index + 1);
          let value = row[header];
          
          // Handle different data types
          if (typeof value === 'object' && value !== null) {
            if (value.tamUnvan) value = value.tamUnvan;
            else if (value.adSoyad) value = value.adSoyad;
            else if (value instanceof Date) value = value.toLocaleDateString('tr-TR');
            else value = JSON.stringify(value);
          }
          
          if (value instanceof Date) {
            cell.value = value;
            cell.numFmt = 'dd/mm/yyyy';
          } else if (typeof value === 'number') {
            cell.value = value;
            cell.numFmt = '#,##0';
          } else {
            cell.value = value || '';
          }
          
          // Alternating row colors
          if (rowIndex % 2 === 0) {
            cell.fill = {
              type: 'pattern',
              pattern: 'solid',
              fgColor: { argb: 'FFF8F9FA' }
            };
          }
          
          cell.border = {
            top: { style: 'thin', color: { argb: 'FFE0E0E0' } },
            left: { style: 'thin', color: { argb: 'FFE0E0E0' } },
            bottom: { style: 'thin', color: { argb: 'FFE0E0E0' } },
            right: { style: 'thin', color: { argb: 'FFE0E0E0' } }
          };
          
          cell.alignment = { vertical: 'middle' };
        });
        currentRow++;
      });

      // Auto-fit columns with limits
      worksheet.columns.forEach((column, index) => {
        let maxLength = 10;
        
        // Calculate optimal width based on content
        if (headers[index]) {
          const headerLength = translateKey(headers[index]).length;
          maxLength = Math.max(maxLength, headerLength + 2);
          
          reportData.data.slice(0, 100).forEach(row => {
            const value = row[headers[index]];
            if (value) {
              const valueLength = String(value).length;
              maxLength = Math.max(maxLength, Math.min(valueLength + 2, 50));
            }
          });
        }
        
        column.width = Math.min(maxLength, 30);
      });
    }

    // Add footer
    const footerRow = currentRow + 2;
    worksheet.mergeCells(`A${footerRow}:H${footerRow}`);
    const footerCell = worksheet.getCell(`A${footerRow}`);
    footerCell.value = 'Cahit Şirket Yönetim Sistemi tarafından oluşturulmuştur.';
    footerCell.font = { size: 9, italic: true };
    footerCell.alignment = { horizontal: 'center' };

    await workbook.xlsx.writeFile(filePath);
    console.log('✅ Excel oluşturuldu:', fileName);
    return filePath;

  } catch (error) {
    console.error('❌ Excel generation error:', error);
    throw error;
  }
};

const generateCSVReport = async (reportData, fileName, type) => {
  try {
    const reportsDir = path.join(__dirname, '../uploads/reports');
    if (!fs.existsSync(reportsDir)) {
      fs.mkdirSync(reportsDir, { recursive: true });
    }

    const filePath = path.join(reportsDir, fileName);
    
    if (!reportData.data || reportData.data.length === 0) {
      fs.writeFileSync(filePath, 'No data available');
      return filePath;
    }

    const headers = Object.keys(reportData.data[0]);
    let csvContent = headers.join(',') + '\n';

    reportData.data.forEach((row) => {
      const values = headers.map(header => {
        const value = row[header] || '';
        return `"${String(value).replace(/"/g, '""')}"`;
      });
      csvContent += values.join(',') + '\n';
    });

    fs.writeFileSync(filePath, csvContent, 'utf8');
    return filePath;

  } catch (error) {
    throw error;
  }
};

module.exports = {
  getReportAnalytics,
  getSavedReports,
  saveReportTemplate,
  generateReport,
  downloadReport
};