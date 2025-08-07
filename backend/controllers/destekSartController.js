// 🎯 Destek-Şart Eşleştirmesi Controller
// Destek unsurları ve şartları arasındaki ilişkileri yönetir

const DestekSartEslesmesi = require('../models/DestekSartEslesmesi');

// @desc    Tüm destek-şart eşleştirmelerini getir
// @route   GET /api/destek-sart/eslesmeler
// @access  Private
const getTumEslesmeler = async (req, res) => {
  try {
    console.log('📋 Tüm destek-şart eşleştirmeleri isteniyor...');
    
    const eslesmeler = await DestekSartEslesmesi.getTumAktifEslesmeler();
    
    console.log(`✅ ${eslesmeler.length} eşleştirme bulundu`);
    
    res.status(200).json({
      success: true,
      count: eslesmeler.length,
      data: eslesmeler,
      message: 'Destek-şart eşleştirmeleri başarıyla getirildi'
    });
    
  } catch (error) {
    console.error('❌ Eşleştirme getirme hatası:', error);
    res.status(500).json({
      success: false,
      message: 'Destek-şart eşleştirmeleri getirilemedi',
      error: error.message
    });
  }
};

// @desc    Belirli bir destek türü için şartları getir
// @route   GET /api/destek-sart/sartlar/:destekTuru
// @access  Private
const getShartlarByDestekTuru = async (req, res) => {
  try {
    const { destekTuru } = req.params;
    
    console.log(`🔍 ${destekTuru} için şartlar aranıyor...`);
    
    if (!destekTuru) {
      return res.status(400).json({
        success: false,
        message: 'Destek türü belirtilmedi'
      });
    }
    
    const esleme = await DestekSartEslesmesi.getShartlarByDestekTuru(destekTuru);
    
    if (!esleme) {
      console.log(`⚠️ ${destekTuru} için eşleştirme bulunamadı`);
      return res.status(404).json({
        success: false,
        message: 'Bu destek türü için eşleştirme bulunamadı',
        data: { destekTuru, sartlar: [] }
      });
    }
    
    console.log(`✅ ${destekTuru} için ${esleme.sartlar.length} şart bulundu`);
    
    res.status(200).json({
      success: true,
      data: {
        destekTuru,
        sartlar: esleme.sartlar
      },
      message: 'Şartlar başarıyla getirildi'
    });
    
  } catch (error) {
    console.error('❌ Şart getirme hatası:', error);
    res.status(500).json({
      success: false,
      message: 'Şartlar getirilemedi',
      error: error.message
    });
  }
};

// @desc    Destek türüne şart ekle
// @route   POST /api/destek-sart/sart-ekle
// @access  Private (Admin)
const sartEkle = async (req, res) => {
  try {
    const { destekTuru, yeniSart } = req.body;
    
    console.log(`➕ ${destekTuru} için yeni şart ekleniyor: ${yeniSart}`);
    
    if (!destekTuru || !yeniSart) {
      return res.status(400).json({
        success: false,
        message: 'Destek türü ve yeni şart belirtilmeli'
      });
    }
    
    let esleme = await DestekSartEslesmesi.findOne({ destekTuru });
    
    if (!esleme) {
      // Yeni eşleştirme oluştur
      esleme = new DestekSartEslesmesi({
        destekTuru,
        sartlar: [yeniSart]
      });
      await esleme.save();
      console.log(`✅ Yeni eşleştirme oluşturuldu: ${destekTuru}`);
    } else {
      // Mevcut eşleştirmeye şart ekle
      await esleme.sartEkle(yeniSart);
      console.log(`✅ Şart eklendi: ${yeniSart}`);
    }
    
    res.status(200).json({
      success: true,
      data: esleme,
      message: 'Şart başarıyla eklendi'
    });
    
  } catch (error) {
    console.error('❌ Şart ekleme hatası:', error);
    res.status(500).json({
      success: false,
      message: 'Şart eklenemedi',
      error: error.message
    });
  }
};

// @desc    Destek türünden şart kaldır
// @route   DELETE /api/destek-sart/sart-kaldir
// @access  Private (Admin)
const sartKaldir = async (req, res) => {
  try {
    const { destekTuru, sart } = req.body;
    
    console.log(`➖ ${destekTuru} için şart kaldırılıyor: ${sart}`);
    
    if (!destekTuru || !sart) {
      return res.status(400).json({
        success: false,
        message: 'Destek türü ve kaldırılacak şart belirtilmeli'
      });
    }
    
    const esleme = await DestekSartEslesmesi.findOne({ destekTuru });
    
    if (!esleme) {
      return res.status(404).json({
        success: false,
        message: 'Eşleştirme bulunamadı'
      });
    }
    
    await esleme.sartKaldir(sart);
    console.log(`✅ Şart kaldırıldı: ${sart}`);
    
    res.status(200).json({
      success: true,
      data: esleme,
      message: 'Şart başarıyla kaldırıldı'
    });
    
  } catch (error) {
    console.error('❌ Şart kaldırma hatası:', error);
    res.status(500).json({
      success: false,
      message: 'Şart kaldırılamadı',
      error: error.message
    });
  }
};

// @desc    Yeni destek-şart eşleştirmesi oluştur
// @route   POST /api/destek-sart/esleme-olustur
// @access  Private (Admin)
const eslesmeOlustur = async (req, res) => {
  try {
    const { destekTuru, sartlar, aciklama } = req.body;
    
    console.log(`🆕 Yeni eşleştirme oluşturuluyor: ${destekTuru}`);
    
    if (!destekTuru || !sartlar || !Array.isArray(sartlar)) {
      return res.status(400).json({
        success: false,
        message: 'Destek türü ve şartlar dizisi gerekli'
      });
    }
    
    // Mevcut eşleştirme var mı kontrol et
    const mevcutEsleme = await DestekSartEslesmesi.findOne({ destekTuru });
    if (mevcutEsleme) {
      return res.status(400).json({
        success: false,
        message: 'Bu destek türü için zaten eşleştirme mevcut'
      });
    }
    
    const yeniEsleme = new DestekSartEslesmesi({
      destekTuru,
      sartlar,
      aciklama: aciklama || ''
    });
    
    await yeniEsleme.save();
    console.log(`✅ Yeni eşleştirme oluşturuldu: ${destekTuru} (${sartlar.length} şart)`);
    
    res.status(201).json({
      success: true,
      data: yeniEsleme,
      message: 'Eşleştirme başarıyla oluşturuldu'
    });
    
  } catch (error) {
    console.error('❌ Eşleştirme oluşturma hatası:', error);
    res.status(500).json({
      success: false,
      message: 'Eşleştirme oluşturulamadı',
      error: error.message
    });
  }
};

// @desc    Destek türleri listesini getir (otomatik tamamlama için)
// @route   GET /api/destek-sart/destek-turleri
// @access  Private
const getDestekTurleri = async (req, res) => {
  try {
    console.log('📋 Destek türleri listesi isteniyor...');
    
    const eslesmeler = await DestekSartEslesmesi.find({ aktif: true })
      .select('destekTuru')
      .sort({ destekTuru: 1 });
    
    const destekTurleri = eslesmeler.map(e => e.destekTuru);
    
    console.log(`✅ ${destekTurleri.length} destek türü bulundu`);
    
    res.status(200).json({
      success: true,
      count: destekTurleri.length,
      data: destekTurleri,
      message: 'Destek türleri başarıyla getirildi'
    });
    
  } catch (error) {
    console.error('❌ Destek türleri getirme hatası:', error);
    res.status(500).json({
      success: false,
      message: 'Destek türleri getirilemedi',
      error: error.message
    });
  }
};

module.exports = {
  getTumEslesmeler,
  getShartlarByDestekTuru,
  sartEkle,
  sartKaldir,
  eslesmeOlustur,
  getDestekTurleri
};
