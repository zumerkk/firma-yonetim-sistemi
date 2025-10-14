// 🔎 Generic Lookup Controller: Unit and Currency codes

const UnitCode = require('../models/UnitCode');
const CurrencyCode = require('../models/CurrencyCode');
const UsedMachineCode = require('../models/UsedMachineCode');
const MachineTypeCode = require('../models/MachineTypeCode');
const OecdKod4Haneli = require('../models/OecdKod4Haneli');

// 🆕 Dinamik Seçenekler - Öğrenen Sistem
const { 
  DestekUnsuru, 
  DestekSarti, 
  OzelSart, 
  OzelSartNotu 
} = require('../models/DynamicOptions');

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

// GET /api/lookup/oecd-4-haneli?search=...
// Yeni Teşvik Sistemi için OECD 4 Haneli Kodları (XX.XX formatı)
module.exports.searchOecdKod4Haneli = async (req, res) => {
  try {
    const { search = '', limit = 100 } = req.query;
    
    let data;
    if (search && search.trim()) {
      // Arama varsa searchCodes kullan
      data = await OecdKod4Haneli.searchCodes(search, parseInt(limit) || 100);
    } else {
      // Arama yoksa tüm aktif kodları getir
      data = await OecdKod4Haneli.getAllActive();
    }
    
    return res.json({ 
      success: true, 
      count: data.length, 
      data: data.map(item => ({
        _id: item._id,
        kod: item.kod,
        tanim: item.tanim,
        aktif: item.aktif,
        kullanimSayisi: item.kullanimSayisi
      }))
    });
  } catch (e) {
    console.error('❌ OECD 4 Haneli search error:', e);
    return res.status(500).json({ success: false, message: 'OECD 4 Haneli kod arama hatası' });
  }
};

// ========================================
// 🎯 DİNAMİK ÖĞRENEN SİSTEM - DESTEK UNSURLARI & ÖZEL ŞARTLAR
// ========================================

// 📚 GET /api/lookup/destek-unsuru - Destek Unsurlarını Getir (Arama + Öğrenme)
module.exports.getDestekUnsurlari = async (req, res) => {
  try {
    const { search = '', limit = 100, kategori } = req.query;
    
    const query = { aktif: true };
    
    // Kategori filtresi
    if (kategori) {
      query.kategori = kategori;
    }
    
    // Arama filtresi
    if (search && search.trim()) {
      query.$or = [
        { value: new RegExp(search, 'i') },
        { label: new RegExp(search, 'i') }
      ];
    }
    
    const data = await DestekUnsuru.find(query)
      .sort({ kullanimSayisi: -1, createdAt: -1 }) // En çok kullanılanlar önce
      .limit(parseInt(limit))
      .lean();
    
    return res.json({
      success: true,
      count: data.length,
      data: data.map(item => ({
        _id: item._id,
        value: item.value,
        label: item.label,
        kategori: item.kategori,
        renk: item.renk,
        kullanimSayisi: item.kullanimSayisi
      }))
    });
  } catch (e) {
    console.error('❌ Destek Unsuru arama hatası:', e);
    return res.status(500).json({ success: false, message: 'Destek unsurları alınırken hata oluştu' });
  }
};

// 📝 POST /api/lookup/destek-unsuru - Yeni Destek Unsuru Ekle (Öğrenme)
module.exports.addDestekUnsuru = async (req, res) => {
  try {
    const { value, label, kategori = 'Diğer', renk = '#6B7280' } = req.body;
    
    if (!value || !label) {
      return res.status(400).json({
        success: false,
        message: 'Destek unsuru bilgileri eksik'
      });
    }
    
    // Aynı value zaten var mı kontrol et
    const existing = await DestekUnsuru.findOne({ value: value.trim() });
    if (existing) {
      // Varsa kullanım sayısını artır
      await existing.incrementUsage();
      return res.json({
        success: true,
        message: 'Mevcut destek unsuru kullanıldı',
        data: existing,
        isNew: false
      });
    }
    
    // Yeni ekle
    const newDestekUnsuru = new DestekUnsuru({
      value: value.trim(),
      label: label.trim(),
      kategori,
      renk,
      ekleyenKullanici: req.user._id,
      kullanimSayisi: 1 // İlk kullanım
    });
    
    await newDestekUnsuru.save();
    
    console.log(`✅ Yeni destek unsuru öğrenildi: ${value} (${req.user.adSoyad})`);
    
    return res.status(201).json({
      success: true,
      message: 'Yeni destek unsuru sisteme kaydedildi',
      data: newDestekUnsuru,
      isNew: true
    });
  } catch (e) {
    console.error('❌ Destek unsuru ekleme hatası:', e);
    
    // Duplicate key hatası
    if (e.code === 11000) {
      return res.status(400).json({
        success: false,
        message: 'Bu destek unsuru zaten mevcut'
      });
    }
    
    return res.status(500).json({ 
      success: false, 
      message: 'Destek unsuru eklenirken hata oluştu' 
    });
  }
};

// 🏷️ GET /api/lookup/ozel-sart - Özel Şartları Getir (Arama + Öğrenme)
module.exports.getOzelSartlar = async (req, res) => {
  try {
    const { search = '', limit = 100, kategori } = req.query;
    
    const query = { aktif: true };
    
    // Kategori filtresi
    if (kategori) {
      query.kategori = kategori;
    }
    
    // Arama filtresi
    if (search && search.trim()) {
      query.$or = [
        { kisaltma: new RegExp(search, 'i') },
        { aciklama: new RegExp(search, 'i') }
      ];
    }
    
    const data = await OzelSart.find(query)
      .sort({ kullanimSayisi: -1, createdAt: -1 }) // En çok kullanılanlar önce
      .limit(parseInt(limit))
      .lean();
    
    return res.json({
      success: true,
      count: data.length,
      data: data.map(item => ({
        _id: item._id,
        kisaltma: item.kisaltma,
        aciklama: item.aciklama,
        kategori: item.kategori,
        kullanimSayisi: item.kullanimSayisi
      }))
    });
  } catch (e) {
    console.error('❌ Özel Şart arama hatası:', e);
    return res.status(500).json({ success: false, message: 'Özel şartlar alınırken hata oluştu' });
  }
};

// 📋 GET /api/lookup/destek-sarti - Destek Şartlarını Getir (Arama + Öğrenme)
module.exports.getDestekSartlari = async (req, res) => {
  try {
    const { search = '', limit = 100, kategori } = req.query;
    
    const query = { aktif: true };
    
    // Kategori filtresi
    if (kategori) {
      query.kategori = kategori;
    }
    
    // Arama filtresi
    if (search && search.trim()) {
      query.$or = [
        { value: new RegExp(search, 'i') },
        { label: new RegExp(search, 'i') }
      ];
    }
    
    const data = await DestekSarti.find(query)
      .sort({ kullanimSayisi: -1, createdAt: -1 }) // En çok kullanılanlar önce
      .limit(parseInt(limit))
      .lean();
    
    return res.json({
      success: true,
      count: data.length,
      data: data.map(item => ({
        _id: item._id,
        value: item.value,
        label: item.label,
        kategori: item.kategori,
        yuzde: item.yuzde,
        yil: item.yil,
        kullanimSayisi: item.kullanimSayisi
      }))
    });
  } catch (e) {
    console.error('❌ Destek Şartı arama hatası:', e);
    return res.status(500).json({ success: false, message: 'Destek şartları alınırken hata oluştu' });
  }
};

// 📝 POST /api/lookup/destek-sarti - Yeni Destek Şartı Ekle (Öğrenme)
module.exports.addDestekSarti = async (req, res) => {
  try {
    const { value, label, kategori = 'Diğer', yuzde, yil } = req.body;
    
    if (!value || !label) {
      return res.status(400).json({
        success: false,
        message: 'Destek şartı bilgileri eksik'
      });
    }
    
    // Aynı value zaten var mı kontrol et
    const existing = await DestekSarti.findOne({ value: value.trim() });
    if (existing) {
      // Varsa kullanım sayısını artır
      await existing.incrementUsage();
      return res.json({
        success: true,
        message: 'Mevcut destek şartı kullanıldı',
        data: existing,
        isNew: false
      });
    }
    
    // Yeni ekle
    const newDestekSarti = new DestekSarti({
      value: value.trim(),
      label: label.trim(),
      kategori,
      yuzde: yuzde || undefined,
      yil: yil || undefined,
      ekleyenKullanici: req.user._id,
      kullanimSayisi: 1 // İlk kullanım
    });
    
    await newDestekSarti.save();
    
    console.log(`✅ Yeni destek şartı öğrenildi: ${value} (${req.user.adSoyad})`);
    
    return res.status(201).json({
      success: true,
      message: 'Yeni destek şartı sisteme kaydedildi',
      data: newDestekSarti,
      isNew: true
    });
  } catch (e) {
    console.error('❌ Destek şartı ekleme hatası:', e);
    
    // Duplicate key hatası
    if (e.code === 11000) {
      return res.status(400).json({
        success: false,
        message: 'Bu destek şartı zaten mevcut'
      });
    }
    
    return res.status(500).json({ 
      success: false, 
      message: 'Destek şartı eklenirken hata oluştu' 
    });
  }
};

// 📝 POST /api/lookup/ozel-sart - Yeni Özel Şart Ekle (Öğrenme)
module.exports.addOzelSart = async (req, res) => {
  try {
    const { kisaltma, aciklama, kategori = 'Diğer' } = req.body;
    
    if (!kisaltma || !aciklama) {
      return res.status(400).json({
        success: false,
        message: 'Özel şart bilgileri eksik'
      });
    }
    
    // Aynı kısaltma zaten var mı kontrol et
    const existing = await OzelSart.findOne({ kisaltma: kisaltma.trim().toUpperCase() });
    if (existing) {
      // Varsa kullanım sayısını artır
      await existing.incrementUsage();
      return res.json({
        success: true,
        message: 'Mevcut özel şart kullanıldı',
        data: existing,
        isNew: false
      });
    }
    
    // Yeni ekle
    const newOzelSart = new OzelSart({
      kisaltma: kisaltma.trim().toUpperCase(),
      aciklama: aciklama.trim(),
      kategori,
      ekleyenKullanici: req.user._id,
      kullanimSayisi: 1 // İlk kullanım
    });
    
    await newOzelSart.save();
    
    console.log(`✅ Yeni özel şart öğrenildi: ${kisaltma} (${req.user.adSoyad})`);
    
    return res.status(201).json({
      success: true,
      message: 'Yeni özel şart sisteme kaydedildi',
      data: newOzelSart,
      isNew: true
    });
  } catch (e) {
    console.error('❌ Özel şart ekleme hatası:', e);
    
    // Duplicate key hatası
    if (e.code === 11000) {
      return res.status(400).json({
        success: false,
        message: 'Bu özel şart zaten mevcut'
      });
    }
    
    return res.status(500).json({ 
      success: false, 
      message: 'Özel şart eklenirken hata oluştu' 
    });
  }
};


