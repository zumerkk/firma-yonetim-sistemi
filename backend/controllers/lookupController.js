// 🔎 Generic Lookup Controller: Unit and Currency codes

const UnitCode = require('../models/UnitCode');
const CurrencyCode = require('../models/CurrencyCode');
const UsedMachineCode = require('../models/UsedMachineCode');

// GET /api/lookup/unit?search=SET&limit=50
const searchUnits = async (req, res) => {
  try {
    const { search = '', limit = 50 } = req.query;
    const data = await UnitCode.searchCodes(search, limit);
    return res.json({ success: true, count: data.length, data });
  } catch (e) {
    console.error('❌ Unit search error:', e);
    return res.status(500).json({ success: false, message: 'Birim arama sırasında hata oluştu' });
  }
};

// GET /api/lookup/currency?search=USD&limit=100
const searchCurrencies = async (req, res) => {
  try {
    const { search = '', limit = 100 } = req.query;
    const data = await CurrencyCode.searchCodes(search, limit);
    return res.json({ success: true, count: data.length, data });
  } catch (e) {
    console.error('❌ Currency search error:', e);
    return res.status(500).json({ success: false, message: 'Döviz arama sırasında hata oluştu' });
  }
};

module.exports = {
  searchUnits,
  searchCurrencies,
  // GET /api/lookup/used-machine?search=...
  async searchUsedMachines(req, res) {
    try {
      const { search = '', limit = 50 } = req.query;
      const data = await UsedMachineCode.search(search, limit);
      return res.json({ success: true, count: data.length, data });
    } catch (e) {
      console.error('❌ UsedMachine search error:', e);
      return res.status(500).json({ success: false, message: 'Kullanılmış makine arama hatası' });
    }
  }
};

// Ek: TCMB/ECB bazlı basit kur servisi (exchangerate.host ve open.er-api yedekli)
module.exports.getCurrencyRate = async (req, res) => {
  try {
    const { code = 'USD', target = 'TRY' } = req.query;
    const base = (code || 'USD').toUpperCase();
    const sym = (target || 'TRY').toUpperCase();

    const fetch = require('node-fetch');
    let rate = null;
    try {
      const r = await fetch(`https://api.exchangerate.host/latest?base=${base}&symbols=${sym}`);
      const j = await r.json();
      rate = j?.rates?.[sym] || null;
    } catch (e) {}

    if (!rate) {
      try {
        const r2 = await fetch(`https://open.er-api.com/v6/latest/${base}`);
        const j2 = await r2.json();
        rate = j2?.rates?.[sym] || null;
      } catch (e2) {}
    }

    if (!rate) return res.status(502).json({ success: false, message: 'Kur bilgisi alınamadı' });

    return res.json({ success: true, base, target: sym, rate });
  } catch (e) {
    return res.status(500).json({ success: false, message: 'Kur servis hatası' });
  }
};


