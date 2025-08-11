// 📦 GTIP KODLARI CONTROLLER
// CSV'den gelen büyük GTIP datası için arama/lookup API

const GTIPCode = require('../models/GTIPCode');

// 🔍 GTIP kodlarını ara
// GET /api/gtip/search?q=8422&limit=50
const searchGTIPCodes = async (req, res) => {
  try {
    const { q = '', limit = 50 } = req.query;
    const codes = await GTIPCode.searchCodes(q, limit);
    res.json({ success: true, count: codes.length, data: codes });
  } catch (error) {
    console.error('❌ GTIP arama hatası:', error);
    res.status(500).json({ success: false, message: 'GTIP arama sırasında hata oluştu', error: error.message });
  }
};

// 🎯 Kod ile tek kayıt getir
// GET /api/gtip/code/:kod
const getGTIPByKod = async (req, res) => {
  try {
    const { kod } = req.params;
    const doc = await GTIPCode.findOne({ kod, aktif: true }).select('kod aciklama').lean();
    if (!doc) return res.status(404).json({ success: false, message: 'GTIP kodu bulunamadı' });
    res.json({ success: true, data: doc });
  } catch (error) {
    console.error('❌ GTIP getirme hatası:', error);
    res.status(500).json({ success: false, message: 'GTIP kodu getirilirken hata oluştu', error: error.message });
  }
};

// 📊 İstatistik
// GET /api/gtip/stats
const getGTIPStats = async (req, res) => {
  try {
    const total = await GTIPCode.countDocuments({ aktif: true });
    const top = await GTIPCode.find({ aktif: true, kullanimSayisi: { $gt: 0 } })
      .sort({ kullanimSayisi: -1, kod: 1 })
      .limit(10)
      .select('kod aciklama kullanimSayisi').lean();
    res.json({ success: true, data: { total, top } });
  } catch (error) {
    console.error('❌ GTIP stats hatası:', error);
    res.status(500).json({ success: false, message: 'GTIP istatistikleri alınamadı', error: error.message });
  }
};

module.exports = {
  searchGTIPCodes,
  getGTIPByKod,
  getGTIPStats
};


