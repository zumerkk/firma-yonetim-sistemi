// 🔎 Generic Lookup Controller: Unit and Currency codes

const UnitCode = require('../models/UnitCode');
const CurrencyCode = require('../models/CurrencyCode');
const UsedMachineCode = require('../models/UsedMachineCode');
const MachineTypeCode = require('../models/MachineTypeCode');

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

    // TRY -> TRY
    if (base === sym) return res.json({ success: true, base, target: sym, rate: 1 });

    const fetch = (typeof global.fetch === 'function') ? global.fetch : require('node-fetch');
    let rate = null;

    // 1) TCMB today.xml öncelikli (USD/EUR başta olmak üzere TRY karşılığı)
    try {
      const resp = await fetch('https://www.tcmb.gov.tr/kurlar/today.xml', { timeout: 4000 });
      const xml = await resp.text();
      const parseTcmb = (xmlText, currencyCode) => {
        // XML attribute is CurrencyCode="USD" not "Currency Code"
        const idx = xmlText.indexOf(`CurrencyCode="${currencyCode}"`);
        if (idx === -1) return null;
        const slice = xmlText.slice(idx, idx + 1200);
        const unitMatch = slice.match(/<Unit>(\d+)<\/Unit>/);
        const fsMatch = slice.match(/<ForexSelling>([\d.,]+)<\/ForexSelling>/);
        const bsMatch = slice.match(/<BanknoteSelling>([\d.,]+)<\/BanknoteSelling>/);
        const num = (s) => {
          const v = (s || '').trim();
          if (!v) return NaN;
          // Eğer virgül içeriyorsa binlik ayırıcıları (.) kaldır ve , => .
          if (v.includes(',')) return Number(v.replace(/\./g, '').replace(/,/g, '.'));
          return Number(v); // 40.8047 gibi değerler
        };
        const unit = num(unitMatch && unitMatch[1]);
        const val = num((fsMatch && fsMatch[1]) || (bsMatch && bsMatch[1]));
        if (!val || !unit) return null;
        return val / unit; // 1 birim döviz kaç TL
      };

      // TCMB sadece TRY bazlı kurları verir. base != TRY ve target == TRY ise direkt al.
      if (sym === 'TRY' && base !== 'TRY') {
        const tcmbRate = parseTcmb(xml, base);
        if (tcmbRate) rate = tcmbRate; // base->TRY
      }
      // TRY -> USD/EUR istenirse tersini hesapla
      if (!rate && base === 'TRY' && sym !== 'TRY') {
        const tcmbRate = parseTcmb(xml, sym);
        if (tcmbRate) rate = 1 / tcmbRate; // TRY->sym
      }
      // USD->EUR gibi çapraz kur istenirse TRY üzerinden hesapla
      if (!rate && base !== 'TRY' && sym !== 'TRY') {
        const rBaseTry = parseTcmb(xml, base);
        const rSymTry = parseTcmb(xml, sym);
        if (rBaseTry && rSymTry) rate = rBaseTry / rSymTry; // base->TRY / sym->TRY
      }
    } catch (e) {}

    // 2) Fallback: exchangerate.host
    if (!rate) {
      try {
        const r = await fetch(`https://api.exchangerate.host/latest?base=${base}&symbols=${sym}`);
        const j = await r.json();
        rate = j?.rates?.[sym] || null;
      } catch (e) {}
    }

    // 3) Fallback: open.er-api.com
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

// GET /api/lookup/machine-type?search=...
module.exports.searchMachineTypes = async (req, res) => {
  try {
    const { search = '', limit = 100 } = req.query;
    const data = await MachineTypeCode.search(search, limit);
    return res.json({ success: true, count: data.length, data });
  } catch (e) {
    console.error('❌ MachineType search error:', e);
    return res.status(500).json({ success: false, message: 'Makine tipi arama hatası' });
  }
};


