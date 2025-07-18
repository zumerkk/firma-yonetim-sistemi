// 🏢 Firma Controller - Excel Formatına Uygun
// Excel sisteminin modern API karşılığı
// Otomatik firma ID, gelişmiş arama, tam Excel uyumu

const Firma = require('../models/Firma');
const User = require('../models/User');
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

// 📝 Yeni Firma Oluştur
const createFirma = async (req, res) => {
  try {
    // Validation kontrolü
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
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

    // Vergi No/TC benzersizlik kontrolü
    const existingFirma = await Firma.findOne({ vergiNoTC });
    if (existingFirma) {
      return sendError(res, `Bu Vergi No/TC (${vergiNoTC}) zaten kayıtlı`, 400);
    }

    // Yetkili kişiler kontrolü
    if (!yetkiliKisiler || yetkiliKisiler.length === 0) {
      return sendError(res, 'En az bir yetkili kişi bilgisi gereklidir', 400);
    }

    // Birinci yetkili kişi zorunlu alanları
    const birincYetkili = yetkiliKisiler[0];
    if (!birincYetkili.adSoyad || !birincYetkili.telefon1 || !birincYetkili.eposta1) {
      return sendError(res, 'Birinci yetkili kişinin Ad Soyad, Telefon 1 ve E-posta 1 alanları zorunludur', 400);
    }

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
        telefon2: kisi.telefon2 ? kisi.telefon2.trim() : '',
        eposta1: kisi.eposta1.toLowerCase().trim(),
        eposta2: kisi.eposta2 ? kisi.eposta2.toLowerCase().trim() : ''
      })),
      notlar: notlar || '',
      olusturanKullanici: req.user._id
    });

    await firma.save();
    
    // Kullanıcı bilgilerini populate et
    await firma.populate('olusturanKullanici', 'adSoyad email');

    sendSuccess(res, 
      { firma: firma.toSafeJSON() }, 
      `Firma başarıyla oluşturuldu (ID: ${firma.firmaId})`, 
      201
    );

  } catch (error) {
    console.error('🚨 Create Firma Hatası:', error);
    
    // Duplicate key hatası
    if (error.code === 11000) {
      const field = Object.keys(error.keyPattern)[0];
      const fieldNames = {
        firmaId: 'Firma ID',
        vergiNoTC: 'Vergi No/TC'
      };
      return sendError(res, `${fieldNames[field] || field} zaten kullanımda`, 400);
    }
    
    // Validation hatası
    if (error.name === 'ValidationError') {
      const validationErrors = Object.values(error.errors).map(err => ({
        field: err.path,
        message: err.message
      }));
      return sendError(res, 'Girilen bilgilerde hatalar var', 400, validationErrors);
    }

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

    const firma = await Firma.findById(id)
      .populate('olusturanKullanici', 'adSoyad email')
      .populate('sonGuncelleyen', 'adSoyad email')
      .lean();

    if (!firma) {
      return sendError(res, 'Firma bulunamadı', 404);
    }

    sendSuccess(res, { firma });

  } catch (error) {
    console.error('🚨 Get Firma Hatası:', error);
    
    if (error.name === 'CastError') {
      return sendError(res, 'Geçersiz firma ID formatı', 400);
    }
    
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

    const firma = await Firma.findByIdAndUpdate(
      id,
      updateData,
      { new: true, runValidators: true }
    ).populate('olusturanKullanici sonGuncelleyen', 'adSoyad email');

    if (!firma) {
      return sendError(res, 'Firma bulunamadı', 404);
    }

    sendSuccess(res, 
      { firma: firma.toSafeJSON() }, 
      `Firma başarıyla güncellendi (${firma.firmaId})`
    );

  } catch (error) {
    console.error('🚨 Update Firma Hatası:', error);

    if (error.name === 'CastError') {
      return sendError(res, 'Geçersiz firma ID formatı', 400);
    }
    
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

    const firma = await Firma.findByIdAndUpdate(
      id,
      { 
        aktif: false, 
        sonGuncelleyen: req.user._id 
      },
      { new: true }
    );

    if (!firma) {
      return sendError(res, 'Firma bulunamadı', 404);
    }

    sendSuccess(res, 
      { firma: { _id: firma._id, firmaId: firma.firmaId } }, 
      `Firma başarıyla silindi (${firma.firmaId})`
    );

  } catch (error) {
    console.error('🚨 Delete Firma Hatası:', error);
    
    if (error.name === 'CastError') {
      return sendError(res, 'Geçersiz firma ID formatı', 400);
    }
    
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

// 📊 Firma İstatistikleri
const getFirmaStats = async (req, res) => {
  try {
    const [
      basicStats,
      illereBolum,
      faaliyetlereBolum,
      sonEklenenler,
      yaklasanYetkiler
    ] = await Promise.all([
      Firma.getStatistics(),
      
      // İllere göre dağılım
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
      
      // ETUYS yetkileri yaklaşan firmalar
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
      .lean()
    ]);

    sendSuccess(res, {
      ...basicStats,
      yuzdesel: {
        yabanciSermayeliOrani: basicStats.aktifFirma > 0 ? 
          ((basicStats.yabanciSermayeli / basicStats.aktifFirma) * 100).toFixed(1) : 0,
        etuysYetkiliOrani: basicStats.aktifFirma > 0 ? 
          ((basicStats.etuysYetkili / basicStats.aktifFirma) * 100).toFixed(1) : 0,
        dysYetkiliOrani: basicStats.aktifFirma > 0 ? 
          ((basicStats.dysYetkili / basicStats.aktifFirma) * 100).toFixed(1) : 0
      },
      illereBolum,
      faaliyetlereBolum,
      sonEklenenler,
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
  getExcelData
}; 