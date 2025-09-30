// 🎯 NACE Kodları Controller

const NaceCode = require('../models/NaceCode');

// 🔍 Arama
const searchNaceCodes = async (req, res) => {
  try {
    const { q = '', limit = 100 } = req.query;
    const codes = await NaceCode.searchCodes(q, Math.min(Number(limit) || 100, 5000));
    res.json({ success: true, count: codes.length, data: codes });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
};

// 📁 Kategoriler
const getNaceCategories = async (req, res) => {
  try {
    const cats = await NaceCode.getCategories();
    res.json({ success: true, data: cats });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
};

// 🔎 Kod ile getirme
const getNaceCodeByKod = async (req, res) => {
  try {
    const { kod } = req.params;
    const code = await NaceCode.findByKod(kod);
    if (!code) return res.status(404).json({ success: false, message: 'Kod bulunamadı' });
    res.json({ success: true, data: code });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
};

module.exports = {
  searchNaceCodes,
  getNaceCategories,
  getNaceCodeByKod
};