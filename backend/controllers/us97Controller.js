// 📦 US 97 KODLARI CONTROLLER
// GM Teşvik Sistemi - MongoDB based US 97 code management

const US97Code = require('../models/US97Code');

// 🔍 US 97 kodlarını ara
// GET /api/us97/search?q=query&kategori=category&limit=20
const searchUS97Codes = async (req, res) => {
  try {
    const { q, kategori, limit = 20 } = req.query;
    let query = { aktif: true };
    let sort = { kullanimSayisi: -1, kod: 1 };
    
    // Arama sorgusu var mı?
    if (q && q.trim()) {
      const searchTerm = q.trim();
      query.$or = [
        { kod: { $regex: searchTerm, $options: 'i' } },
        { aciklama: { $regex: searchTerm, $options: 'i' } }
      ];
      
      // Eğer kod ile başlıyorsa öncelik ver
      if (/^\d/.test(searchTerm)) {
        sort = { kod: 1 };
      }
    }
    
    // Kategori filtresi
    if (kategori && kategori !== 'all') {
      query.kategori = kategori;
    }
    
    const codes = await US97Code.find(query)
      .sort(sort)
      .limit(Math.min(parseInt(limit), 5000)) // 🚀 MAX 5000 KOD İZİN VER
      .select('kod aciklama kategori kullanimSayisi')
      .lean();
    
    res.json({
      success: true,
      count: codes.length,
      data: codes
    });
    
  } catch (error) {
    console.error('❌ US 97 arama hatası:', error);
    res.status(500).json({
      success: false,
      message: 'US 97 kodları aranırken hata oluştu',
      error: error.message
    });
  }
};

// 📊 Tüm kategorileri getir
// GET /api/us97/categories
const getUS97Categories = async (req, res) => {
  try {
    const categories = await US97Code.distinct('kategori', { aktif: true });
    
    // Kategori sayılarını da getir
    const categoryCounts = await US97Code.aggregate([
      { $match: { aktif: true } },
      { $group: { _id: '$kategori', count: { $sum: 1 } } },
      { $sort: { _id: 1 } }
    ]);
    
    const categoriesWithCounts = categoryCounts.map(item => ({
      kategori: item._id,
      count: item.count
    }));
    
    res.json({
      success: true,
      data: {
        categories: categories.sort(),
        categoriesWithCounts
      }
    });
    
  } catch (error) {
    console.error('❌ US 97 kategorileri hatası:', error);
    res.status(500).json({
      success: false,
      message: 'US 97 kategorileri getirilirken hata oluştu',
      error: error.message
    });
  }
};

// 🔥 Popüler kodları getir
// GET /api/us97/popular?limit=10
const getPopularUS97Codes = async (req, res) => {
  try {
    const { limit = 10 } = req.query;
    
    const popularCodes = await US97Code.find({ aktif: true })
      .sort({ kullanimSayisi: -1, kod: 1 })
      .limit(parseInt(limit))
      .select('kod aciklama kategori kullanimSayisi')
      .lean();
    
    res.json({
      success: true,
      count: popularCodes.length,
      data: popularCodes
    });
    
  } catch (error) {
    console.error('❌ Popüler US 97 kodları hatası:', error);
    res.status(500).json({
      success: false,
      message: 'Popüler US 97 kodları getirilirken hata oluştu',
      error: error.message
    });
  }
};

// 🎯 Belirli bir kodu getir ve kullanım sayısını artır
// GET /api/us97/code/:kod
const getUS97CodeByKod = async (req, res) => {
  try {
    const { kod } = req.params;
    
    const codeDoc = await US97Code.findOne({ kod: kod, aktif: true });
    
    if (!codeDoc) {
      return res.status(404).json({
        success: false,
        message: 'US 97 kodu bulunamadı'
      });
    }
    
    // Kullanım sayısını artır (async olarak, response'u bekletme)
    setImmediate(() => {
      codeDoc.incrementUsage().catch(err => {
        console.error('❌ Kullanım sayısı artırma hatası:', err);
      });
    });
    
    res.json({
      success: true,
      data: {
        kod: codeDoc.kod,
        aciklama: codeDoc.aciklama,
        kategori: codeDoc.kategori,
        kullanimSayisi: codeDoc.kullanimSayisi
      }
    });
    
  } catch (error) {
    console.error('❌ US 97 kod getirme hatası:', error);
    res.status(500).json({
      success: false,
      message: 'US 97 kodu getirilirken hata oluştu',
      error: error.message
    });
  }
};

// 📊 US 97 istatistikleri
// GET /api/us97/stats
const getUS97Stats = async (req, res) => {
  try {
    const totalCodes = await US97Code.countDocuments({ aktif: true });
    
    const categoryStats = await US97Code.aggregate([
      { $match: { aktif: true } },
      { $group: { 
        _id: '$kategori', 
        count: { $sum: 1 },
        avgUsage: { $avg: '$kullanimSayisi' }
      }},
      { $sort: { count: -1 } }
    ]);
    
    const topUsedCodes = await US97Code.find({ aktif: true, kullanimSayisi: { $gt: 0 } })
      .sort({ kullanimSayisi: -1 })
      .limit(5)
      .select('kod aciklama kullanimSayisi')
      .lean();
    
    res.json({
      success: true,
      data: {
        totalCodes,
        categoryStats,
        topUsedCodes
      }
    });
    
  } catch (error) {
    console.error('❌ US 97 istatistikleri hatası:', error);
    res.status(500).json({
      success: false,
      message: 'US 97 istatistikleri getirilirken hata oluştu',
      error: error.message
    });
  }
};

module.exports = {
  searchUS97Codes,
  getUS97Categories,
  getPopularUS97Codes,
  getUS97CodeByKod,
  getUS97Stats
};