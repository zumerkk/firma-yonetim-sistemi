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

    // TODO: Real analytics from database
    // For now, simulate analytics data
    const analytics = {
      totalReports: Math.floor(Math.random() * 500) + 100,
      monthlyReports: Math.floor(Math.random() * 50) + 10,
      mostUsedFormat: 'PDF',
      averageGenerationTime: '2.3s'
    };

    console.log('✅ Report analytics hazırlandı');

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

    res.download(filePath, filename, (err) => {
      if (err) {
        console.error('Download error:', err);
        return res.status(500).json({
          success: false,
          message: 'Dosya indirilemedi'
        });
      }

      // Clean up file after download (optional)
      setTimeout(() => {
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
        }
      }, 60000); // Delete after 1 minute
    });

  } catch (error) {
    console.error('🚨 Download hatası:', error);
    res.status(500).json({
      success: false,
      message: 'Dosya indirilemedi',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
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
      const doc = new PDFDocument();
      const stream = fs.createWriteStream(filePath);
      
      doc.pipe(stream);

      // PDF Header
      doc.fontSize(20).text(reportData.title, 50, 50);
      doc.fontSize(12).text(reportData.subtitle, 50, 80);
      doc.text(`Oluşturma Tarihi: ${new Date().toLocaleDateString('tr-TR')}`, 50, 100);
      
      let y = 140;

      // Summary Section
      if (reportData.summary) {
        doc.fontSize(14).text('Özet Bilgiler:', 50, y);
        y += 20;
        
        Object.entries(reportData.summary).forEach(([key, value]) => {
          doc.fontSize(10).text(`${key}: ${value}`, 70, y);
          y += 15;
        });
        y += 10;
      }

      // Data Table
      doc.fontSize(14).text('Detay Veriler:', 50, y);
      y += 20;

      if (reportData.data && reportData.data.length > 0) {
        const sample = reportData.data[0];
        const headers = Object.keys(sample).slice(0, 5); // First 5 columns
        
        // Table headers
        doc.fontSize(8);
        headers.forEach((header, index) => {
          doc.text(header, 50 + (index * 100), y);
        });
        y += 15;

        // Table data (first 20 rows)
        reportData.data.slice(0, 20).forEach((row) => {
          headers.forEach((header, index) => {
            const value = row[header] || '';
            doc.text(String(value).substring(0, 20), 50 + (index * 100), y);
          });
          y += 12;
          
          if (y > 700) { // New page
            doc.addPage();
            y = 50;
          }
        });
      }

      doc.end();

      stream.on('finish', () => {
        resolve(filePath);
      });

      stream.on('error', reject);

    } catch (error) {
      reject(error);
    }
  });
};

const generateExcelReport = async (reportData, fileName, type) => {
  try {
    const reportsDir = path.join(__dirname, '../uploads/reports');
    if (!fs.existsSync(reportsDir)) {
      fs.mkdirSync(reportsDir, { recursive: true });
    }

    const filePath = path.join(reportsDir, fileName);
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet(reportData.title);

    // Header
    worksheet.mergeCells('A1:F1');
    worksheet.getCell('A1').value = reportData.title;
    worksheet.getCell('A1').font = { size: 16, bold: true };
    worksheet.getCell('A1').alignment = { horizontal: 'center' };

    worksheet.mergeCells('A2:F2');
    worksheet.getCell('A2').value = reportData.subtitle;
    worksheet.getCell('A2').font = { size: 12 };
    worksheet.getCell('A2').alignment = { horizontal: 'center' };

    let currentRow = 4;

    // Summary
    if (reportData.summary) {
      worksheet.getCell(`A${currentRow}`).value = 'Özet Bilgiler';
      worksheet.getCell(`A${currentRow}`).font = { bold: true };
      currentRow++;

      Object.entries(reportData.summary).forEach(([key, value]) => {
        worksheet.getCell(`A${currentRow}`).value = key;
        worksheet.getCell(`B${currentRow}`).value = value;
        currentRow++;
      });
      currentRow++;
    }

    // Data
    if (reportData.data && reportData.data.length > 0) {
      worksheet.getCell(`A${currentRow}`).value = 'Detay Veriler';
      worksheet.getCell(`A${currentRow}`).font = { bold: true };
      currentRow++;

      const sample = reportData.data[0];
      const headers = Object.keys(sample);

      // Headers
      headers.forEach((header, index) => {
        const cell = worksheet.getCell(currentRow, index + 1);
        cell.value = header;
        cell.font = { bold: true };
        cell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FFE6E6FA' }
        };
      });
      currentRow++;

      // Data rows
      reportData.data.forEach((row) => {
        headers.forEach((header, index) => {
          worksheet.getCell(currentRow, index + 1).value = row[header] || '';
        });
        currentRow++;
      });

      // Auto-fit columns
      worksheet.columns.forEach((column) => {
        column.width = 15;
      });
    }

    await workbook.xlsx.writeFile(filePath);
    return filePath;

  } catch (error) {
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