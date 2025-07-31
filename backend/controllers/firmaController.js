// 🏢 Firma Controller - Excel Formatına Uygun
// Excel sisteminin modern API karşılığı
// Otomatik firma ID, gelişmiş arama, tam Excel uyumu

const mongoose = require('mongoose');
const Firma = require('../models/Firma');
const User = require('../models/User');
const Activity = require('../models/Activity');
const { validationResult } = require('express-validator');
const XLSX = require('xlsx');
const PDFDocument = require('pdfkit');
const fs = require('fs-extra');
const path = require('path');

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

// 📋 Activity Log Helper - Her işlemi kayıt altına al
const logActivity = async (options, req) => {
  try {
    // IP adresini normalize et (IPv6 localhost -> IPv4)
    let clientIp = req.ip || req.connection.remoteAddress || '127.0.0.1';
    if (clientIp === '::1' || clientIp === '::ffff:127.0.0.1') {
      clientIp = '127.0.0.1';
    }

    const baseOptions = {
      ...options,
      user: {
        id: req.user?.id || req.user?._id || null,
        name: req.user?.adSoyad || req.user?.email || 'system',
        email: req.user?.email || 'system',
        rol: req.user?.rol || 'system'
      },
      metadata: {
        ip: clientIp,
        userAgent: req.get('user-agent') || 'Unknown',
        timestamp: new Date(),
        ...(options.metadata || {})
      }
    };

    await Activity.logActivity(baseOptions);
  } catch (error) {
    // Activity logging hataları ana işlemi etkilemez, sadece log'a yazılır
    console.warn('🚨 Activity logging error:', error);
  }
};

// 🔄 Değişiklik Analiz Helper
const analyzeChanges = (oldData, newData, excludeFields = ['updatedAt', '__v', 'sonGuncelleyen']) => {
  const changes = {
    before: {},
    after: {},
    fields: []
  };
  
  // Karşılaştırılacak alanları belirle
  const allFields = new Set([...Object.keys(oldData || {}), ...Object.keys(newData || {})]);
  
  allFields.forEach(field => {
    if (excludeFields.includes(field)) return;
    
    const oldValue = oldData?.[field];
    const newValue = newData?.[field];
    
    // Değer değişti mi kontrolü
    if (JSON.stringify(oldValue) !== JSON.stringify(newValue)) {
      changes.before[field] = oldValue;
      changes.after[field] = newValue;
      changes.fields.push({
        field,
        oldValue,
        newValue
      });
    }
  });
  
  return changes;
};

// 📝 Yeni Firma Oluştur
const createFirma = async (req, res) => {
  try {
    console.log('🔥 CREATE FIRMA CALLED');
    console.log('📥 Request Body:', JSON.stringify(req.body, null, 2));
    console.log('👤 Request User:', req.user);
    
    // Validation kontrolü
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      console.log('❌ VALIDATION ERRORS:', errors.array());
      return sendError(res, 'Girilen bilgilerde hatalar var', 400, errors.array());
    }

    const {
      vergiNoTC,
      tamUnvan,
      adres,
      firmaIl,
      firmaIlce,
      kepAdresi,
      firmaTelefon,
      firmaEmail,
      firmaWebsite,
      yabanciSermayeli,
      anaFaaliyetKonusu,
      etuysYetkiBitisTarihi,
      dysYetkiBitisTarihi,
      ilkIrtibatKisi,
      yetkiliKisiler,
      notlar
    } = req.body;

    console.log('🔍 Extracted Fields:', {
      vergiNoTC,
      tamUnvan,
      adres,
      firmaIl,
      ilkIrtibatKisi,
      yetkiliKisiler: yetkiliKisiler?.length
    });

    // Vergi No/TC benzersizlik kontrolü
    const existingFirma = await Firma.findOne({ vergiNoTC });
    if (existingFirma) {
      console.log('❌ DUPLICATE VERGI NO:', vergiNoTC);
      return sendError(res, `Bu Vergi No/TC (${vergiNoTC}) zaten kayıtlı`, 400);
    }

    // Yetkili kişiler kontrolü
    if (!yetkiliKisiler || yetkiliKisiler.length === 0) {
      console.log('❌ NO YETKILI KISILER');
      return sendError(res, 'En az bir yetkili kişi bilgisi gereklidir', 400);
    }

    // Birinci yetkili kişi zorunlu alanları
    const birincYetkili = yetkiliKisiler[0];
    console.log('👤 First Yetkili:', birincYetkili);
    
    if (!birincYetkili.adSoyad) {
      console.log('❌ YETKILI VALIDATION FAILED:', {
        adSoyad: birincYetkili.adSoyad
      });
      return sendError(res, 'Birinci yetkili kişinin Ad Soyad alanı zorunludur', 400);
    }

    console.log('✅ All validations passed, creating firma...');

    // Firma oluştur
    const firma = new Firma({
      vergiNoTC: vergiNoTC.trim(),
      tamUnvan: tamUnvan.trim(),
      adres: adres.trim(),
      firmaIl: firmaIl.toUpperCase(),
      firmaIlce: firmaIlce ? firmaIlce.toUpperCase() : '',
      kepAdresi: kepAdresi ? kepAdresi.toLowerCase() : '',
      firmaTelefon: firmaTelefon || '',
      firmaEmail: firmaEmail ? firmaEmail.toLowerCase() : '',
      firmaWebsite: firmaWebsite || '',
      yabanciSermayeli: Boolean(yabanciSermayeli),
      anaFaaliyetKonusu: anaFaaliyetKonusu || '',
      etuysYetkiBitisTarihi: etuysYetkiBitisTarihi || null,
      dysYetkiBitisTarihi: dysYetkiBitisTarihi || null,
      ilkIrtibatKisi: ilkIrtibatKisi.trim(),
      yetkiliKisiler: yetkiliKisiler.map(kisi => ({
        adSoyad: kisi.adSoyad.trim(),
        telefon1: kisi.telefon1.trim(),
        telefon2: kisi.telefon2?.trim() || '',
        eposta1: kisi.eposta1.toLowerCase().trim(),
        eposta2: kisi.eposta2?.toLowerCase().trim() || ''
      })),
      notlar: notlar || '',
      olusturanKullanici: req.user._id
    });

    console.log('💾 Saving firma to database...');
    const savedFirma = await firma.save();
    console.log('✅ Firma saved successfully:', savedFirma.firmaId);

    // Activity log
    await logActivity({
      action: 'create',
      category: 'firma',
      title: 'Yeni Firma Eklendi',
      description: `${savedFirma.tamUnvan} firması sisteme eklendi (${savedFirma.firmaId})`,
      status: 'success',
      targetResource: {
        type: 'firma',
        id: savedFirma._id,
        name: savedFirma.tamUnvan,
        firmaId: savedFirma.firmaId
      }
    }, req);

    // Response
    return sendSuccess(res, {
      firma: savedFirma
    }, 'Firma başarıyla oluşturuldu', 201);

  } catch (error) {
    console.error('💥 CREATE FIRMA ERROR:', error);
    sendError(res, 'Firma oluşturulurken hata oluştu', 500);
  }
};

// 📋 Firma Listesi
const getFirmalar = async (req, res) => {
  try {
    const {
      sayfa = 1,
      limit = 10,
      arama = '',
      firmaIl = '',
      firmaIlce = '',
      aktif = 'true',
      yabanciSermayeli = '',
      anaFaaliyetKonusu = '',
      siralamaSekli = 'createdAt',
      siralamaYonu = 'desc'
    } = req.query;

    // Filtreleme kriterleri
    const filter = {};
    
    if (aktif !== 'all') {
      filter.aktif = aktif === 'true';
    }
    
    if (firmaIl) {
      filter.firmaIl = firmaIl.toUpperCase();
    }
    
    if (firmaIlce) {
      filter.firmaIlce = firmaIlce.toUpperCase();
    }
    
    if (yabanciSermayeli !== '') {
      filter.yabanciSermayeli = yabanciSermayeli === 'true';
    }
    
    if (anaFaaliyetKonusu) {
      filter.anaFaaliyetKonusu = anaFaaliyetKonusu;
    }

    // Arama filtresi
    if (arama) {
      filter.$or = [
        { tamUnvan: { $regex: arama, $options: 'i' } },
        { vergiNoTC: { $regex: arama, $options: 'i' } },
        { firmaId: { $regex: arama, $options: 'i' } },
        { ilkIrtibatKisi: { $regex: arama, $options: 'i' } }
      ];
    }

    // Sıralama
    const sort = {};
    sort[siralamaSekli] = siralamaYonu === 'desc' ? -1 : 1;

    // Sayfalama
    const skip = (parseInt(sayfa) - 1) * parseInt(limit);
    
    // Paralel sorgular
    const [firmalar, toplamSayisi] = await Promise.all([
      Firma.find(filter)
        .populate('olusturanKullanici', 'adSoyad email')
        .populate('sonGuncelleyen', 'adSoyad email')
        .sort(sort)
        .skip(skip)
        .limit(parseInt(limit))
        .lean(),
      Firma.countDocuments(filter)
    ]);

    const toplamSayfa = Math.ceil(toplamSayisi / parseInt(limit));

    sendSuccess(res, {
      firmalar,
      pagination: {
        mevcutSayfa: parseInt(sayfa),
        toplamSayfa,
        toplamSayisi,
        sayfaBasinaLimit: parseInt(limit),
        oncekiSayfa: parseInt(sayfa) > 1 ? parseInt(sayfa) - 1 : null,
        sonrakiSayfa: parseInt(sayfa) < toplamSayfa ? parseInt(sayfa) + 1 : null
      }
    });

  } catch (error) {
    console.error('🚨 Get Firmalar Hatası:', error);
    sendError(res, 'Firma listesi alınırken hata oluştu', 500);
  }
};

// 👁️ Tekil Firma Detayı
const getFirma = async (req, res) => {
  try {
    const { id } = req.params;
    let firma;

    // MongoDB ObjectId formatında mı kontrol et
    if (mongoose.Types.ObjectId.isValid(id)) {
      // MongoDB ObjectId ile arama
      firma = await Firma.findById(id)
        .populate('olusturanKullanici', 'adSoyad email')
        .populate('sonGuncelleyen', 'adSoyad email')
        .lean();
    } else {
      // Custom firmaId ile arama (A001191 gibi)
      firma = await Firma.findOne({ firmaId: id })
        .populate('olusturanKullanici', 'adSoyad email')
        .populate('sonGuncelleyen', 'adSoyad email')
        .lean();
    }

    if (!firma) {
      return sendError(res, 'Firma bulunamadı', 404);
    }

    sendSuccess(res, { firma });

  } catch (error) {
    console.error('🚨 Get Firma Hatası:', error);
    sendError(res, 'Firma detayı alınırken hata oluştu', 500);
  }
};

// ✏️ Firma Güncelle
const updateFirma = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return sendError(res, 'Girilen bilgilerde hatalar var', 400, errors.array());
    }

    const { id } = req.params;
    const updateData = { ...req.body };

    // Önceki durumu kaydet (activity log için)
    let oldFirma;
    if (mongoose.Types.ObjectId.isValid(id)) {
      oldFirma = await Firma.findById(id).lean();
    } else {
      oldFirma = await Firma.findOne({ firmaId: id }).lean();
    }
    
    if (!oldFirma) {
      return sendError(res, 'Firma bulunamadı', 404);
    }

    // Güncelleme bilgilerini ekle
    updateData.sonGuncelleyen = req.user._id;

    // Büyük/küçük harf dönüşümleri
    if (updateData.firmaIl) {
      updateData.firmaIl = updateData.firmaIl.toUpperCase();
    }
    if (updateData.firmaIlce) {
      updateData.firmaIlce = updateData.firmaIlce.toUpperCase();
    }
    if (updateData.kepAdresi) {
      updateData.kepAdresi = updateData.kepAdresi.toLowerCase();
    }
    if (updateData.firmaEmail) {
      updateData.firmaEmail = updateData.firmaEmail.toLowerCase();
    }

    // Yetkili kişiler güncelleme
    if (updateData.yetkiliKisiler && updateData.yetkiliKisiler.length > 0) {
      updateData.yetkiliKisiler = updateData.yetkiliKisiler.map(kisi => ({
        adSoyad: kisi.adSoyad ? kisi.adSoyad.trim() : '',
        telefon1: kisi.telefon1 ? kisi.telefon1.trim() : '',
        telefon2: kisi.telefon2 ? kisi.telefon2.trim() : '',
        eposta1: kisi.eposta1 ? kisi.eposta1.toLowerCase().trim() : '',
        eposta2: kisi.eposta2 ? kisi.eposta2.toLowerCase().trim() : ''
      }));
    }

    let firma;
    if (mongoose.Types.ObjectId.isValid(id)) {
      firma = await Firma.findByIdAndUpdate(
        id,
        updateData,
        { new: true, runValidators: true }
      ).populate('olusturanKullanici sonGuncelleyen', 'adSoyad email');
    } else {
      firma = await Firma.findOneAndUpdate(
        { firmaId: id },
        updateData,
        { new: true, runValidators: true }
      ).populate('olusturanKullanici sonGuncelleyen', 'adSoyad email');
    }

    if (!firma) {
      return sendError(res, 'Firma bulunamadı', 404);
    }

    // 📋 Activity Log - Firma Güncelleme
    const changes = analyzeChanges(oldFirma, firma.toObject());
    const changedFields = changes.fields.map(f => f.field).join(', ');
    
    await logActivity({
      action: 'update',
      category: 'firma',
      title: 'Firma Bilgileri Güncellendi',
      description: `${firma.tamUnvan} firmasının ${changedFields || 'bilgileri'} güncellendi`,
      status: 'success',
      targetResource: {
        type: 'firma',
        id: firma._id,
        name: firma.tamUnvan,
        firmaId: firma.firmaId
      },
      changes,
      tags: ['firma-güncelle', 'düzenleme']
    }, req);

    sendSuccess(res, 
      { firma: firma.toSafeJSON() }, 
      `Firma başarıyla güncellendi (${firma.firmaId})`
    );

  } catch (error) {
    console.error('🚨 Update Firma Hatası:', error);
    
    if (error.code === 11000) {
      const field = Object.keys(error.keyPattern)[0];
      const fieldNames = {
        firmaId: 'Firma ID',
        vergiNoTC: 'Vergi No/TC'
      };
      return sendError(res, `${fieldNames[field] || field} zaten kullanımda`, 400);
    }
    
    if (error.name === 'ValidationError') {
      const validationErrors = Object.values(error.errors).map(err => ({
        field: err.path,
        message: err.message
      }));
      return sendError(res, 'Girilen bilgilerde hatalar var', 400, validationErrors);
    }

    sendError(res, 'Firma güncellenirken hata oluştu', 500);
  }
};

// 🗑️ Firma Silme (Soft Delete)
const deleteFirma = async (req, res) => {
  try {
    const { id } = req.params;

    // Önce firmayı bul (activity log için bilgileri kaydet)
    let firma;
    if (mongoose.Types.ObjectId.isValid(id)) {
      firma = await Firma.findById(id);
    } else {
      firma = await Firma.findOne({ firmaId: id });
    }
    
    if (!firma) {
      return sendError(res, 'Firma bulunamadı', 404);
    }

    // Firmayı kalıcı olarak sil
    if (mongoose.Types.ObjectId.isValid(id)) {
      await Firma.findByIdAndDelete(id);
    } else {
      await Firma.findOneAndDelete({ firmaId: id });
    }

    // 📋 Activity Log - Firma Silme
    await logActivity({
      action: 'delete',
      category: 'firma',
      title: 'Firma Kalıcı Olarak Silindi',
      description: `${firma.tamUnvan} firması veritabanından kalıcı olarak silindi`,
      status: 'success',
      targetResource: {
        type: 'firma',
        id: firma._id,
        name: firma.tamUnvan,
        firmaId: firma.firmaId
      },
      changes: {
        before: { exists: true },
        after: { exists: false }
      },
      tags: ['firma-sil', 'hard-delete', 'kalici-silme']
    }, req);

    sendSuccess(res, 
      { firma: { _id: firma._id, firmaId: firma.firmaId } }, 
      `Firma kalıcı olarak silindi (${firma.firmaId})`
    );

  } catch (error) {
    console.error('🚨 Delete Firma Hatası:', error);
    sendError(res, 'Firma silinirken hata oluştu', 500);
  }
};

// 🔍 Firma Arama
const searchFirmalar = async (req, res) => {
  try {
    const { q, field } = req.query;

    if (!q || q.length < 2) {
      return sendError(res, 'Arama terimi en az 2 karakter olmalıdır', 400);
    }

    let firmalar = [];

    if (field) {
      // Belirli alanda arama
      const filter = { aktif: true };
      
      if (field === 'vergiNoTC') {
        filter.vergiNoTC = { $regex: q, $options: 'i' };
      } else if (field === 'tamUnvan') {
        filter.tamUnvan = { $regex: q, $options: 'i' };
      } else if (field === 'firmaId') {
        filter.firmaId = { $regex: q.toUpperCase(), $options: 'i' };
      } else {
        return sendError(res, 'Geçersiz arama alanı', 400);
      }

      firmalar = await Firma.find(filter)
        .select('firmaId tamUnvan vergiNoTC firmaIl firmaIlce ilkIrtibatKisi')
        .sort({ tamUnvan: 1 })
        .limit(20)
        .lean();
    } else {
      // Genel arama
      firmalar = await Firma.searchFirmalar(q)
        .select('firmaId tamUnvan vergiNoTC firmaIl firmaIlce ilkIrtibatKisi')
        .limit(20)
        .lean();
    }

    sendSuccess(res, {
      firmalar,
      sonucSayisi: firmalar.length,
      aramaTerimi: q,
      aramaAlani: field || 'tümü'
    });

  } catch (error) {
    console.error('🚨 Search Firmalar Hatası:', error);
    sendError(res, 'Arama yapılırken hata oluştu', 500);
  }
};

// 🔍 Tek Alan Araması
const searchByField = async (req, res) => {
  try {
    const { field, value } = req.params;

    if (!value) {
      return sendError(res, 'Arama değeri gereklidir', 400);
    }

    let filter = { aktif: true };

    switch (field) {
      case 'vergiNoTC':
        filter.vergiNoTC = value;
        break;
      case 'firmaId':
        filter.firmaId = value.toUpperCase();
        break;
      case 'tamUnvan':
        filter.tamUnvan = { $regex: value, $options: 'i' };
        break;
      default:
        return sendError(res, 'Geçersiz arama alanı', 400);
    }

    const firmalar = await Firma.find(filter)
      .populate('olusturanKullanici', 'adSoyad email')
      .sort({ tamUnvan: 1 })
      .limit(10)
      .lean();

    sendSuccess(res, {
      firmalar,
      sonucSayisi: firmalar.length,
      aramaAlani: field,
      aramaDegeri: value
    });

  } catch (error) {
    console.error('🚨 Search By Field Hatası:', error);
    sendError(res, 'Alan araması yapılırken hata oluştu', 500);
  }
};

// 📊 Firma İstatistikleri - ENHANCED VERSION
const getFirmaStats = async (req, res) => {
  try {
    const [
      basicStats,
      illereBolum,
      faaliyetlereBolum,
      sonEklenenler,
      yaklasanYetkiler,
      buAyEklenenler,
      ilSayilari
    ] = await Promise.all([
      Firma.getStatistics(),
      
      // İllere göre dağılım - TOP 10
      Firma.aggregate([
        { $match: { aktif: true } },
        { $group: { _id: '$firmaIl', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 10 }
      ]),
      
      // Faaliyet konularına göre dağılım
      Firma.aggregate([
        { $match: { aktif: true, anaFaaliyetKonusu: { $ne: '' } } },
        { $group: { _id: '$anaFaaliyetKonusu', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 10 }
      ]),
      
      // Son eklenen firmalar
      Firma.find({ aktif: true })
        .select('firmaId tamUnvan firmaIl ilkIrtibatKisi createdAt')
        .sort({ createdAt: -1 })
        .limit(5)
        .lean(),
      
      // ETUYS yetkileri yaklaşan firmalar (30 gün içinde)
      Firma.find({
        aktif: true,
        etuysYetkiBitisTarihi: {
          $gte: new Date(),
          $lte: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
        }
      })
      .select('firmaId tamUnvan etuysYetkiBitisTarihi')
      .sort({ etuysYetkiBitisTarihi: 1 })
      .limit(10)
      .lean(),

      // Bu ay eklenen firmalar
      Firma.countDocuments({
        aktif: true,
        createdAt: {
          $gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1)
        }
      }),

      // Toplam il sayısı
      Firma.distinct('firmaIl', { aktif: true })
    ]);

    // 🏆 İl bazında özel istatistikler
    const topIller = illereBolum.slice(0, 3);
    const istanbul = topIller.find(il => il._id === 'İSTANBUL')?.count || 0;
    const ankara = topIller.find(il => il._id === 'ANKARA')?.count || 0;
    const izmir = topIller.find(il => il._id === 'İZMİR')?.count || 0;

    // 📈 Yabancı sermaye detay analizi
    const yabanciSermayeliCount = basicStats.yabanciSermayeli || 0;

    // 🎯 Performans skoru (örnek hesaplama)
    const performansSkoru = Math.round(
      (basicStats.aktifFirma / Math.max(basicStats.toplamFirma, 1)) * 100
    );

    sendSuccess(res, {
      // Temel istatistikler
      ...basicStats,
      
      // Frontend için uyumlu isimler
      yabanciSermaye: yabanciSermayeliCount, // Frontend bunu bekliyor
      aktifFirmalar: basicStats.aktifFirma, // Frontend için
      ilSayisi: ilSayilari.length, // Toplam il sayısı
      buAyEklenen: buAyEklenenler, // Bu ay eklenen

      // Yüzdesel oranlar
      yuzdesel: {
        yabanciSermayeliOrani: basicStats.aktifFirma > 0 ? 
          ((yabanciSermayeliCount / basicStats.aktifFirma) * 100).toFixed(1) : 0,
        etuysYetkiliOrani: basicStats.aktifFirma > 0 ? 
          ((basicStats.etuysYetkili / basicStats.aktifFirma) * 100).toFixed(1) : 0,
        dysYetkiliOrani: basicStats.aktifFirma > 0 ? 
          ((basicStats.dysYetkili / basicStats.aktifFirma) * 100).toFixed(1) : 0
      },

      // Şehir istatistikleri
      istanbul,
      ankara,
      izmir,

      // Performans
      performansSkoru,

      // Detay veriler
      illereBolum,
      faaliyetlereBolum,
      sonEklenenler,
      
      // ETUYS uyarıları
      etuysUyarilari: {
        yaklaşanSüreler: yaklasanYetkiler,
        count: yaklasanYetkiler.length
      }
    });

  } catch (error) {
    console.error('🚨 Get Firma Stats Hatası:', error);
    sendError(res, 'İstatistikler alınırken hata oluştu', 500);
  }
};

// 📍 İl/İlçe/Faaliyet Listesi
const getIlIlceListesi = async (req, res) => {
  try {
    const [iller, ilceler, anaFaaliyetler] = await Promise.all([
      Firma.distinct('firmaIl', { aktif: true }),
      Firma.distinct('firmaIlce', { aktif: true }),
      Firma.distinct('anaFaaliyetKonusu', { aktif: true, anaFaaliyetKonusu: { $ne: '' } })
    ]);

    sendSuccess(res, {
      iller: iller.sort(),
      ilceler: ilceler.sort(),
      anaFaaliyetler: anaFaaliyetler.sort()
    });

  } catch (error) {
    console.error('🚨 Get İl İlçe Listesi Hatası:', error);
    sendError(res, 'İl/İlçe listesi alınırken hata oluştu', 500);
  }
};

// 📊 Excel Export Data
const getExcelData = async (req, res) => {
  try {
    const { filter = {} } = req.query;

    const firmalar = await Firma.find({ aktif: true, ...filter })
      .populate('olusturanKullanici', 'adSoyad email')
      .sort({ firmaId: 1 })
      .lean();

    const excelData = firmalar.map(firma => ({
      firmaId: firma.firmaId,
      vergiNoTC: firma.vergiNoTC,
      tamUnvan: firma.tamUnvan,
      adres: firma.adres,
      firmaIl: firma.firmaIl,
      firmaIlce: firma.firmaIlce,
      kepAdresi: firma.kepAdresi,
      firmaTelefon: firma.firmaTelefon,
      firmaEmail: firma.firmaEmail,
      firmaWebsite: firma.firmaWebsite,
      yabanciSermayeli: firma.yabanciSermayeli,
      anaFaaliyetKonusu: firma.anaFaaliyetKonusu,
      etuysYetkiBitisTarihi: firma.etuysYetkiBitisTarihi,
      dysYetkiBitisTarihi: firma.dysYetkiBitisTarihi,
      ilkIrtibatKisi: firma.ilkIrtibatKisi,
      yetkiliKisiler: firma.yetkiliKisiler,
      notlar: firma.notlar,
      aktif: firma.aktif,
      olusturmaTarihi: firma.createdAt,
      createdAt: firma.createdAt
    }));

    sendSuccess(res, {
      firmalar: excelData,
      toplamSayisi: excelData.length,
      exportTarihi: new Date().toISOString()
    });

  } catch (error) {
    console.error('🚨 Get Excel Data Hatası:', error);
    sendError(res, 'Excel verileri alınırken hata oluştu', 500);
  }
};

// 📊 Premium Excel Export - REAL XLSX FORMAT
const exportExcel = async (req, res) => {
  try {
    console.log('🚀 Premium Excel Export başlatıldı...');

    const firmalar = await Firma.find({ aktif: true })
      .populate('olusturanKullanici', 'adSoyad email')
      .sort({ firmaId: 1 })
      .lean();

    // 📋 Excel için formatlanmış data
    const excelData = firmalar.map(firma => ({
      'Firma ID': firma.firmaId,
      'Vergi No/TC': firma.vergiNoTC,
      'Tam Ünvan': firma.tamUnvan,
      'Adres': firma.adres,
      'İl': firma.firmaIl,
      'İlçe': firma.firmaIlce,
      'KEP Adresi': firma.kepAdresi,
      'Telefon': firma.firmaTelefon,
      'E-posta': firma.firmaEmail,
      'Website': firma.firmaWebsite,
      'Yabancı Sermayeli': firma.yabanciSermayeli ? 'EVET' : 'HAYIR',
      'Ana Faaliyet Konusu': firma.anaFaaliyetKonusu,
      'ETUYS Bitiş': firma.etuysYetkiBitisTarihi ? new Date(firma.etuysYetkiBitisTarihi).toLocaleDateString('tr-TR') : '',
      'DYS Bitiş': firma.dysYetkiBitisTarihi ? new Date(firma.dysYetkiBitisTarihi).toLocaleDateString('tr-TR') : '',
      'İlk İrtibat Kişisi': firma.ilkIrtibatKisi,
      'Yetkili 1 - Ad Soyad': firma.yetkiliKisiler[0]?.adSoyad || '',
      'Yetkili 1 - Telefon': firma.yetkiliKisiler[0]?.telefon1 || '',
      'Yetkili 1 - E-posta': firma.yetkiliKisiler[0]?.eposta1 || '',
      'Yetkili 2 - Ad Soyad': firma.yetkiliKisiler[1]?.adSoyad || '',
      'Yetkili 2 - Telefon': firma.yetkiliKisiler[1]?.telefon1 || '',
      'Yetkili 2 - E-posta': firma.yetkiliKisiler[1]?.eposta1 || '',
      'Notlar': firma.notlar,
      'Oluşturma Tarihi': new Date(firma.createdAt).toLocaleDateString('tr-TR'),
      'Oluşturan': firma.olusturanKullanici?.adSoyad || 'System'
    }));

    // 📊 Excel workbook oluştur
    const workbook = XLSX.utils.book_new();
    const worksheet = XLSX.utils.json_to_sheet(excelData);

    // 🎨 Column widths - Professional formatting
    const columnWidths = [
      { wch: 12 }, // Firma ID
      { wch: 15 }, // Vergi No
      { wch: 40 }, // Tam Ünvan
      { wch: 50 }, // Adres
      { wch: 15 }, // İl
      { wch: 20 }, // İlçe
      { wch: 30 }, // KEP
      { wch: 15 }, // Telefon
      { wch: 25 }, // E-posta
      { wch: 25 }, // Website
      { wch: 12 }, // Yabancı Sermaye
      { wch: 25 }, // Faaliyet
      { wch: 12 }, // ETUYS
      { wch: 12 }, // DYS
      { wch: 25 }, // İrtibat
      { wch: 25 }, // Yetkili 1 Ad
      { wch: 15 }, // Yetkili 1 Tel
      { wch: 25 }, // Yetkili 1 Mail
      { wch: 25 }, // Yetkili 2 Ad
      { wch: 15 }, // Yetkili 2 Tel
      { wch: 25 }, // Yetkili 2 Mail
      { wch: 30 }, // Notlar
      { wch: 12 }, // Tarih
      { wch: 20 }  // Oluşturan
    ];
    worksheet['!cols'] = columnWidths;

    // 📝 Worksheet'i workbook'a ekle
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Firma Listesi');

    // 📈 İstatistik sayfası ekle
    const statsData = await getStatsForExport();
    const statsSheet = XLSX.utils.json_to_sheet(statsData);
    XLSX.utils.book_append_sheet(workbook, statsSheet, 'İstatistikler');

    // 📊 Excel buffer oluştur
    const excelBuffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });

    // 📤 Response headers
    const fileName = `Firma-Listesi-${new Date().toISOString().split('T')[0]}.xlsx`;
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
    res.setHeader('Content-Length', excelBuffer.length);

    console.log('✅ Excel export completed:', fileName);
    res.end(excelBuffer);

  } catch (error) {
    console.error('🚨 Excel Export Hatası:', error);
    sendError(res, 'Excel dışa aktarma sırasında hata oluştu', 500);
  }
};

// 📄 PREMIUM İSTATİSTİK PDF RAPORU - ULTRA PROFESSIONAL
const exportPDF = async (req, res) => {
  try {
    console.log('🚀 Premium İstatistik PDF Export başlatıldı...');

    // 📊 Kapsamlı istatistik verilerini topla
    const [basicStats, illereBolum, faaliyetlereBolum, yaklasanYetkiler, aylikTrend] = await Promise.all([
      Firma.getStatistics(),
      
      // Top 10 İl
      Firma.aggregate([
        { $match: { aktif: true } },
        { $group: { _id: '$firmaIl', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 10 }
      ]),
      
      // Faaliyet konuları
      Firma.aggregate([
        { $match: { aktif: true, anaFaaliyetKonusu: { $ne: '' } } },
        { $group: { _id: '$anaFaaliyetKonusu', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 8 }
      ]),
      
      // Yaklaşan yetkiler
      Firma.find({
        aktif: true,
        etuysYetkiBitisTarihi: {
          $gte: new Date(),
          $lte: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
        }
      }).limit(10),
      
      // Aylık trend (son 12 ay)
      Firma.aggregate([
        { $match: { aktif: true } },
        {
          $group: {
            _id: {
              year: { $year: '$createdAt' },
              month: { $month: '$createdAt' }
            },
            count: { $sum: 1 }
          }
        },
        { $sort: { '_id.year': -1, '_id.month': -1 } },
        { $limit: 12 }
      ])
    ]);

    // 📄 Premium PDF oluştur
    const doc = new PDFDocument({ 
      size: 'A4', 
      margin: 40,
      info: {
        Title: 'GM Planlama Danışmanlık - Premium İstatistik Raporu',
        Author: 'GM Planlama Danışmanlık Firma Yönetim Sistemi',
        Subject: 'Detaylı İstatistik Analizi ve Trend Raporu',
        Keywords: 'firma, istatistik, analiz, trend, rapor, enterprise'
      }
    });

    // 📊 Response headers
    const fileName = `Premium-Istatistik-Raporu-${new Date().toISOString().split('T')[0]}.pdf`;
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);

    // 📄 PDF stream'i response'a bağla
    doc.pipe(res);

    // 🎨 Premium PDF İçeriği oluştur
    await generatePremiumStatsPDF(doc, basicStats, illereBolum, faaliyetlereBolum, yaklasanYetkiler, aylikTrend);

    // 📄 PDF'i finalize et
    doc.end();
    console.log('✅ Premium İstatistik PDF export completed:', fileName);

  } catch (error) {
    console.error('🚨 Premium PDF Export Hatası:', error);
    if (!res.headersSent) {
      sendError(res, 'Premium PDF dışa aktarma sırasında hata oluştu', 500);
    }
  }
};

// 🎨 PREMIUM İSTATİSTİK PDF İÇERİK OLUŞTURUCU
const generatePremiumStatsPDF = async (doc, basicStats, illereBolum, faaliyetlereBolum, yaklasanYetkiler, aylikTrend) => {
  let currentY = 40;

  // 🔤 Font registrations for Turkish characters
  try {
    // Built-in fonts that support Turkish characters
    doc.registerFont('Helvetica-Turkish', 'Helvetica');
    doc.registerFont('Helvetica-Bold-Turkish', 'Helvetica-Bold');
  } catch (error) {
    console.warn('Font registration warning:', error.message);
  }

  // 🏢 HEADER - Corporate Identity
  doc.rect(0, 0, doc.page.width, 120)
     .fill('#1e40af');

  doc.font('Helvetica-Bold')
     .fontSize(28)
     .fillColor('#ffffff')
     .text('FIRMA YONETIM SISTEMI', 40, 30);

  doc.fontSize(16)
     .fillColor('#e2e8f0')
     .text('Premium Istatistik Raporu & Analiz Merkezi', 40, 65);

  doc.fontSize(12)
     .fillColor('#cbd5e1')
     .text(`Rapor Tarihi: ${new Date().toLocaleDateString('tr-TR', { 
       year: 'numeric', 
       month: 'long', 
       day: 'numeric' 
     })}`, 40, 90);

  currentY = 150;

  // 📊 EXECUTIVE SUMMARY SECTION
  doc.rect(40, currentY - 10, 520, 40)
     .fill('#f8fafc')
     .stroke('#e2e8f0');

  doc.font('Helvetica-Bold')
     .fontSize(18)
     .fillColor('#1e40af')
     .text('YONETICI OZETI', 50, currentY + 5);

  currentY += 60;

  // 📈 ANA İSTATİSTİK KARTLARI - Premium Design
  const mainStats = [
    { label: 'Toplam Firma', value: basicStats.toplamFirma, color: '#1e40af', icon: 'TF' },
    { label: 'Aktif Firma', value: basicStats.aktifFirma, color: '#059669', icon: 'AF' },
    { label: 'Yabanci Sermayeli', value: basicStats.yabanciSermayeli, color: '#dc2626', icon: 'YS' },
    { label: 'ETUYS Yetkili', value: basicStats.etuysYetkili, color: '#7c3aed', icon: 'EY' }
  ];

  const cardWidth = 120;
  const cardHeight = 80;
  let cardX = 50;

  mainStats.forEach((stat, index) => {
    // Kart arka planı
    doc.rect(cardX, currentY, cardWidth, cardHeight)
       .fill('#ffffff')
       .stroke('#e5e7eb');

    // Renk çizgisi
    doc.rect(cardX, currentY, cardWidth, 4)
       .fill(stat.color);

    // İkon (text-based for compatibility)
    doc.font('Helvetica-Bold')
       .fontSize(16)
       .fillColor(stat.color)
       .text(stat.icon, cardX + 10, currentY + 15);

    // Değer
    doc.font('Helvetica-Bold')
       .fontSize(20)
       .fillColor(stat.color)
       .text(stat.value.toString(), cardX + 45, currentY + 20);

    // Label
    doc.font('Helvetica')
       .fontSize(10)
       .fillColor('#6b7280')
       .text(stat.label, cardX + 10, currentY + 50, { width: cardWidth - 20 });

    cardX += cardWidth + 20;
  });

  currentY += 120;

  // 🗺️ İL DAĞILIM TABLOSU - Premium Table
  doc.font('Helvetica-Bold')
     .fontSize(16)
     .fillColor('#1e40af')
     .text('IL BAZINDA DAGILIM ANALIZI', 40, currentY);

  currentY += 40;

  // Tablo başlık
  doc.rect(40, currentY - 5, 520, 25)
     .fill('#1e40af');

  doc.font('Helvetica-Bold')
     .fontSize(12)
     .fillColor('#ffffff')
     .text('SIRA', 50, currentY + 5)
     .text('IL ADI', 120, currentY + 5)
     .text('FIRMA SAYISI', 300, currentY + 5)
     .text('YUZDE ORAN', 420, currentY + 5);

  currentY += 30;

  // Tablo verileri
  const totalFirms = basicStats.aktifFirma;
  illereBolum.slice(0, 8).forEach((il, index) => {
    const rowColor = index % 2 === 0 ? '#f9fafb' : '#ffffff';
    const percentage = ((il.count / totalFirms) * 100).toFixed(1);
    
    // Satır arka planı
    doc.rect(40, currentY - 3, 520, 22)
       .fill(rowColor)
       .stroke('#e5e7eb');

    // Progress bar
    const barWidth = (il.count / Math.max(...illereBolum.map(i => i.count))) * 100;
    doc.rect(480, currentY + 5, barWidth, 8)
       .fill('#3b82f6');

    // İl adını ASCII'ye çevir
    const ilAdi = convertTurkishToAscii(il._id);

    doc.font('Helvetica')
       .fontSize(11)
       .fillColor('#374151')
       .text((index + 1).toString(), 50, currentY + 3)
       .text(ilAdi, 120, currentY + 3)
       .text(il.count.toString(), 300, currentY + 3)
       .text(`%${percentage}`, 420, currentY + 3);

    currentY += 25;
  });

  // 📄 Yeni sayfa
  doc.addPage();
  currentY = 40;

  // 🎯 FAALIYET KONULARI ANALİZİ
  doc.font('Helvetica-Bold')
     .fontSize(16)
     .fillColor('#1e40af')
     .text('FAALIYET KONULARI ANALIZI', 40, currentY);

  currentY += 40;

  faaliyetlereBolum.slice(0, 6).forEach((faaliyet, index) => {
    const barHeight = 25;
    const maxWidth = 400;
    const barWidth = (faaliyet.count / Math.max(...faaliyetlereBolum.map(f => f.count))) * maxWidth;
    
    // Faaliyet adı - ASCII'ye çevir
    const faaliyetAdi = convertTurkishToAscii(faaliyet._id);
    
    doc.font('Helvetica')
       .fontSize(10)
       .fillColor('#374151')
       .text(faaliyetAdi.substring(0, 40) + '...', 40, currentY + 5);

    // Progress bar
    doc.rect(40, currentY + 20, maxWidth, barHeight)
       .fill('#f3f4f6')
       .stroke('#e5e7eb');

    doc.rect(40, currentY + 20, barWidth, barHeight)
       .fill('#059669');

    // Sayı
    doc.font('Helvetica-Bold')
       .fontSize(12)
       .fillColor('#ffffff')
       .text(faaliyet.count.toString(), 45, currentY + 28);

    currentY += 50;
  });

  // ⚠️ YAKLAŞAN YETKİ BİTİŞLERİ
  if (yaklasanYetkiler.length > 0) {
    currentY += 30;
    
    doc.font('Helvetica-Bold')
       .fontSize(16)
       .fillColor('#dc2626')
       .text('DIKKAT: YAKLASAN YETKI BITISLERI', 40, currentY);

    currentY += 30;

    yaklasanYetkiler.slice(0, 5).forEach((firma, index) => {
      const daysLeft = Math.ceil((new Date(firma.etuysYetkiBitisTarihi) - new Date()) / (1000 * 60 * 60 * 24));
      
      doc.rect(40, currentY - 3, 520, 25)
         .fill('#fef2f2')
         .stroke('#fecaca');

      // Firma adını ASCII'ye çevir
      const firmaAdi = convertTurkishToAscii(firma.tamUnvan);

      doc.font('Helvetica')
         .fontSize(10)
         .fillColor('#dc2626')
         .text(firma.firmaId, 50, currentY + 5)
         .text(firmaAdi.substring(0, 40) + '...', 120, currentY + 5)
         .text(`${daysLeft} gun kaldi`, 400, currentY + 5);

      currentY += 30;
    });
  }

  // 📍 Footer
  doc.fontSize(10)
     .fillColor('#6b7280')
     .text('Bu rapor Firma Yonetim Sistemi tarafindan otomatik olarak olusturulmustur.', 
           40, doc.page.height - 60, { align: 'center' });

  doc.text(`Rapor ID: FYS-${Date.now()} | Sayfa: ${doc.bufferedPageRange().count}`, 
           40, doc.page.height - 40, { align: 'center' });
};

// 🔤 Turkish to ASCII converter helper
const convertTurkishToAscii = (text) => {
  if (!text) return '';
  
  const turkishChars = {
    'ç': 'c', 'Ç': 'C',
    'ğ': 'g', 'Ğ': 'G', 
    'ı': 'i', 'İ': 'I',
    'ö': 'o', 'Ö': 'O',
    'ş': 's', 'Ş': 'S',
    'ü': 'u', 'Ü': 'U'
  };
  
  return text.replace(/[çÇğĞıİöÖşŞüÜ]/g, (match) => turkishChars[match] || match);
};

// 📊 PREMIUM İSTATİSTİK EXCEL RAPORU
const exportStatsExcel = async (req, res) => {
  try {
    console.log('🚀 Premium İstatistik Excel Export başlatıldı...');

    // 📊 Kapsamlı veri toplama
    const [
      basicStats, 
      illereBolum, 
      faaliyetlereBolum, 
      yaklasanYetkiler,
      aylikStats,
      yetkiliStats
    ] = await Promise.all([
      Firma.getStatistics(),
      
      Firma.aggregate([
        { $match: { aktif: true } },
        { $group: { _id: '$firmaIl', count: { $sum: 1 } } },
        { $sort: { count: -1 } }
      ]),
      
      Firma.aggregate([
        { $match: { aktif: true, anaFaaliyetKonusu: { $ne: '' } } },
        { $group: { _id: '$anaFaaliyetKonusu', count: { $sum: 1 } } },
        { $sort: { count: -1 } }
      ]),
      
      Firma.find({
        aktif: true,
        etuysYetkiBitisTarihi: {
          $gte: new Date(),
          $lte: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000) // 60 gün
        }
      }).select('firmaId tamUnvan etuysYetkiBitisTarihi firmaIl'),
      
      // Aylık kayıt trendi
      Firma.aggregate([
        { $match: { aktif: true } },
        {
          $group: {
            _id: {
              year: { $year: '$createdAt' },
              month: { $month: '$createdAt' }
            },
            count: { $sum: 1 }
          }
        },
        { $sort: { '_id.year': -1, '_id.month': -1 } },
        { $limit: 12 }
      ]),

      // Yetkili kişi istatistikleri
      Firma.aggregate([
        { $match: { aktif: true } },
        { $project: { yetkiliSayisi: { $size: '$yetkiliKisiler' } } },
        { $group: { _id: '$yetkiliSayisi', count: { $sum: 1 } } }
      ])
    ]);

    // 📊 Excel workbook oluştur
    const workbook = XLSX.utils.book_new();

    // 📋 SAYFA 1: Genel İstatistikler
    const genelStats = [
      ['METRIK', 'DEGER', 'ACIKLAMA'],
      ['Toplam Firma', basicStats.toplamFirma, 'Sistemdeki tum firmalar'],
      ['Aktif Firma', basicStats.aktifFirma, 'Aktif durumda olan firmalar'],
      ['Pasif Firma', basicStats.pasifFirma, 'Pasif durumda olan firmalar'],
      ['Yabanci Sermayeli', basicStats.yabanciSermayeli, 'Yabanci sermayeli firmalar'],
      ['ETUYS Yetkili', basicStats.etuysYetkili, 'ETUYS yetkisi olan firmalar'],
      ['DYS Yetkili', basicStats.dysYetkili, 'DYS yetkisi olan firmalar'],
      [''],
      ['ORANLAR', '', ''],
      ['Yabanci Sermaye Orani', `%${((basicStats.yabanciSermayeli / basicStats.aktifFirma) * 100).toFixed(1)}`, 'Aktif firmalara oranla'],
      ['ETUYS Orani', `%${((basicStats.etuysYetkili / basicStats.aktifFirma) * 100).toFixed(1)}`, 'Aktif firmalara oranla'],
      ['DYS Orani', `%${((basicStats.dysYetkili / basicStats.aktifFirma) * 100).toFixed(1)}`, 'Aktif firmalara oranla'],
      [''],
      ['RAPOR BILGILERI', '', ''],
      ['Rapor Tarihi', new Date().toLocaleDateString('tr-TR'), 'Raporun olusturulma tarihi'],
      ['Rapor Saati', new Date().toLocaleTimeString('tr-TR'), 'Raporun olusturulma saati']
    ];

    const genelSheet = XLSX.utils.aoa_to_sheet(genelStats);
    XLSX.utils.book_append_sheet(workbook, genelSheet, 'Genel Istatistikler');

    // 📋 SAYFA 2: İl Dağılımı
    const ilData = [
      ['SIRA', 'IL ADI', 'FIRMA SAYISI', 'YUZDE ORAN']
    ];
    
    illereBolum.forEach((il, index) => {
      const percentage = ((il.count / basicStats.aktifFirma) * 100).toFixed(2);
      // İl adını ASCII'ye çevir
      const ilAdi = convertTurkishToAscii(il._id);
      ilData.push([index + 1, ilAdi, il.count, `%${percentage}`]);
    });

    const ilSheet = XLSX.utils.aoa_to_sheet(ilData);
    ilSheet['!cols'] = [
      { wch: 8 },   // Sıra
      { wch: 20 },  // İl Adı
      { wch: 15 },  // Firma Sayısı
      { wch: 15 }   // Yüzde
    ];
    XLSX.utils.book_append_sheet(workbook, ilSheet, 'Il Dagilimi');

    // 📋 SAYFA 3: Faaliyet Konuları
    const faaliyetData = [
      ['SIRA', 'FAALIYET KONUSU', 'FIRMA SAYISI', 'YUZDE ORAN']
    ];
    
    faaliyetlereBolum.forEach((faaliyet, index) => {
      const percentage = ((faaliyet.count / basicStats.aktifFirma) * 100).toFixed(2);
      // Faaliyet konusunu ASCII'ye çevir
      const faaliyetAdi = convertTurkishToAscii(faaliyet._id);
      faaliyetData.push([index + 1, faaliyetAdi, faaliyet.count, `%${percentage}`]);
    });

    const faaliyetSheet = XLSX.utils.aoa_to_sheet(faaliyetData);
    faaliyetSheet['!cols'] = [
      { wch: 8 },   // Sıra
      { wch: 40 },  // Faaliyet
      { wch: 15 },  // Sayı
      { wch: 15 }   // Yüzde
    ];
    XLSX.utils.book_append_sheet(workbook, faaliyetSheet, 'Faaliyet Konulari');

    // 📋 SAYFA 4: Yaklaşan Yetkiler
    const yetkiData = [
      ['FIRMA ID', 'FIRMA ADI', 'IL', 'BITIS TARIHI', 'KALAN GUN']
    ];
    
    yaklasanYetkiler.forEach(firma => {
      const daysLeft = Math.ceil((new Date(firma.etuysYetkiBitisTarihi) - new Date()) / (1000 * 60 * 60 * 24));
      // Firma adını ve il adını ASCII'ye çevir
      const firmaAdi = convertTurkishToAscii(firma.tamUnvan);
      const ilAdi = convertTurkishToAscii(firma.firmaIl);
      
      yetkiData.push([
        firma.firmaId,
        firmaAdi,
        ilAdi,
        new Date(firma.etuysYetkiBitisTarihi).toLocaleDateString('tr-TR'),
        daysLeft
      ]);
    });

    const yetkiSheet = XLSX.utils.aoa_to_sheet(yetkiData);
    yetkiSheet['!cols'] = [
      { wch: 12 },  // ID
      { wch: 40 },  // Ad
      { wch: 15 },  // İl
      { wch: 15 },  // Tarih
      { wch: 12 }   // Gün
    ];
    XLSX.utils.book_append_sheet(workbook, yetkiSheet, 'Yaklasan Yetkiler');

    // 📊 Excel buffer oluştur - UTF-8 encoding ile
    const excelBuffer = XLSX.write(workbook, { 
      type: 'buffer', 
      bookType: 'xlsx',
      cellStyles: true,
      sheetStubs: false
    });

    // 📤 Response headers - Turkish character support
    const fileName = `Premium-Istatistik-Raporu-${new Date().toISOString().split('T')[0]}.xlsx`;
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename*=UTF-8''${encodeURIComponent(fileName)}`);
    res.setHeader('Content-Length', excelBuffer.length);

    console.log('✅ Premium İstatistik Excel export completed:', fileName);
    res.end(excelBuffer);

  } catch (error) {
    console.error('🚨 Premium Excel Stats Export Hatası:', error);
    sendError(res, 'Premium Excel istatistik dışa aktarma sırasında hata oluştu', 500);
  }
};

// 🆔 Sonraki Firma ID'sini al - Smart Gap Filling
const getNextFirmaId = async (req, res) => {
  try {
    console.log('🔍 Finding next available Firma ID with gap filling...');
    
    // Tüm mevcut firma ID'lerini al ve sırala
    const existingFirmas = await Firma.find({}, { firmaId: 1 })
      .sort({ firmaId: 1 });
    
    const existingIds = existingFirmas.map(f => parseInt(f.firmaId.substring(1)));
    console.log('📋 Existing ID numbers:', existingIds);

    let nextNumber = 1001; // Default başlangıç: A001001
    
    if (existingIds.length === 0) {
      // İlk firma
      console.log('✨ First firma, using A001001');
      nextNumber = 1001;
    } else {
      // Sıralı boş ID ara (gap filling)
      const sortedIds = existingIds.sort((a, b) => a - b);
      console.log('🔢 Sorted existing IDs:', sortedIds);
      
      const minId = Math.min(...existingIds);
      const maxId = Math.max(...existingIds);
      console.log(`📊 ID Range: ${minId} - ${maxId}`);
      
      // Mevcut aralıkta boş slot ara
      let found = false;
      for (let i = minId; i <= maxId; i++) {
        if (!sortedIds.includes(i)) {
          nextNumber = i;
          console.log('🎯 Found available gap at:', i);
          found = true;
          break;
        }
      }
      
      // Eğer mevcut aralıkta gap yoksa, max + 1
      if (!found) {
        nextNumber = maxId + 1;
        console.log('➡️ No gaps in existing range, using next sequential:', nextNumber);
      }
    }

    const nextFirmaId = 'A' + nextNumber.toString().padStart(6, '0');
    console.log('✅ Next available Firma ID:', nextFirmaId);
    
    res.status(200).json({
      success: true,
      data: {
        nextFirmaId: nextFirmaId,
        availableSlots: existingIds.length === 0 ? 0 : Math.max(...existingIds) - 1000 - existingIds.length
      },
      message: 'Sonraki Firma ID başarıyla alındı'
    });
  } catch (error) {
    console.error('🚨 Next Firma ID error:', error);
    res.status(500).json({
      success: false,
      message: 'Sonraki Firma ID alınırken hata oluştu'
    });
  }
};

module.exports = {
  createFirma,
  getFirmalar,
  getFirma,
  updateFirma,
  deleteFirma,
  searchFirmalar,
  searchByField,
  getFirmaStats,
  getIlIlceListesi,
  getExcelData,
  exportExcel,
  exportPDF,
  exportStatsExcel,
  getNextFirmaId
};