// 📊 ESKİ TEŞVİK IMPORT CONTROLLER
// Bakanlık formatındaki Excel/CSV dosyalarından otomatik Tesvik (eski sistem) kaydı oluşturma
// YeniTesvik import controller ile aynı parse engine'i paylaşır

const multer = require('multer');
const XLSX = require('xlsx');
const path = require('path');
const fs = require('fs');
const Tesvik = require('../models/Tesvik');
const Firma = require('../models/Firma');
const { createTurkishInsensitiveRegex } = require('../utils/turkishUtils');

// ────────────────────────── MULTER CONFIG ──────────────────────────
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = path.join(__dirname, '..', 'uploads');
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    cb(null, `eski-tesvik-import-${Date.now()}${path.extname(file.originalname)}`);
  }
});

const upload = multer({
  storage,
  fileFilter: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (['.xlsx', '.xls', '.csv'].includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error('Sadece Excel (.xlsx, .xls) veya CSV dosyaları kabul edilir'));
    }
  },
  limits: { fileSize: 50 * 1024 * 1024 }
});

// ────────────────────────── SHARED UTILITIES ──────────────────────────
// (YeniTesvik import controller ile aynı parse mantığı)

const cleanTurkishNumber = (val) => {
  if (val === null || val === undefined || val === '') return 0;
  if (typeof val === 'number') return val;
  const str = String(val).trim();
  if (str === '' || str === '-') return 0;
  if (str.includes(',') && str.includes('.')) {
    return Number(str.replace(/\./g, '').replace(',', '.')) || 0;
  }
  if (str.includes('.') && str.split('.').length > 2) {
    return Number(str.replace(/\./g, '')) || 0;
  }
  if (str.includes(',')) {
    return Number(str.replace(',', '.')) || 0;
  }
  return Number(str) || 0;
};

const parseDate = (val) => {
  if (!val || val === '' || val === '-') return null;
  const str = String(val).trim();
  // Excel serial date
  if (typeof val === 'number' || /^\d{5}$/.test(str)) {
    const excelEpoch = new Date(1899, 11, 30);
    const d = new Date(excelEpoch.getTime() + Number(val) * 86400000);
    return isNaN(d.getTime()) ? null : d;
  }
  // US format
  const usMatch = str.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/);
  if (usMatch) {
    let [, m, d, y] = usMatch;
    y = parseInt(y);
    if (y < 100) y += 2000;
    const date = new Date(y, parseInt(m) - 1, parseInt(d));
    return isNaN(date.getTime()) ? null : date;
  }
  // TR format
  const trMatch = str.match(/^(\d{1,2})\.(\d{1,2})\.(\d{4})$/);
  if (trMatch) {
    const [, d, m, y] = trMatch;
    const date = new Date(parseInt(y), parseInt(m) - 1, parseInt(d));
    return isNaN(date.getTime()) ? null : date;
  }
  // ISO format
  const date = new Date(str);
  return isNaN(date.getTime()) ? null : date;
};

// ────────────────────────── COLUMN MAP ──────────────────────────
const COLUMN_MAP = {
  'GM ID': 'gmId',
  'TALEP/SONUÇ': 'kunyeBilgileri.talepSonuc',
  'REVIZE ID': 'kunyeBilgileri.revizeId',
  'FIRMA ID': 'firmaIdExcel',
  'YATIRIMCI UNVAN': 'yatirimciUnvan',
  'SGK SİCİL NO': 'kunyeBilgileri.sgkSicilNo',
  'BELGE ID': 'belgeYonetimi.belgeId',
  'BELGE NO': 'belgeYonetimi.belgeNo',
  'BELGE TARIHI': 'belgeYonetimi.belgeTarihi',
  'BELGE MURACAAT TARIHI': 'belgeYonetimi.belgeMuracaatTarihi',
  'MÜRACAAT SAYISI': 'belgeYonetimi.belgeMuracaatNo',
  'BELGE BASLAMA TARIHI': 'belgeYonetimi.belgeBaslamaTarihi',
  'BELGE BITIS TARIHI': 'belgeYonetimi.belgeBitisTarihi',
  'SÜRE UZATIM TARİHİ': 'belgeYonetimi.uzatimTarihi',
  'ÖZELLİKLİ YATIRIM İSE': 'belgeYonetimi.oncelikliYatirim',
  'DAYANDIĞI KANUN': 'belgeYonetimi.dayandigiKanun',
  'BELGE DURUMU': 'belgeDurumuRaw',
  '2-YATIRIM KONUSU': 'yatirimBilgileri.yatirimKonusu',
  '3-CINSI(1)': 'yatirimBilgileri.sCinsi1',
  '3-CINSI(2)': 'yatirimBilgileri.tCinsi2',
  '3-CINSI(3)': 'yatirimBilgileri.uCinsi3',
  '3-CINSI(4)': 'yatirimBilgileri.vCinsi4',
  'DESTEK SINIFI': 'yatirimBilgileri.destekSinifi',
  'YERI IL': 'yatirimBilgileri.yerinIl',
  'YERI ILCE': 'yatirimBilgileri.yerinIlce',
  'ADA': 'yatirimBilgileri.ada',
  'PARSEL': 'yatirimBilgileri.parsel',
  'YATIRIM ADRESI(1)': 'yatirimBilgileri.yatirimAdresi1',
  'YATIRIM ADRESI(2)': 'yatirimBilgileri.yatirimAdresi2',
  'YATIRIM ADRESI(3)': 'yatirimBilgileri.yatirimAdresi3',
  'OSB ISE MUDURLUK': 'yatirimBilgileri.osbIseMudurluk',
  'İL BAZLI BÖLGE': 'yatirimBilgileri.ilBazliBolge',
  'İLÇE BAZLI BÖLGE': 'yatirimBilgileri.ilceBazliBolge',
  'SERBEST BÖLGE': 'yatirimBilgileri.serbsetBolge',
  'Mevcut Kişi': 'istihdam.mevcutKisi',
  'İlave Kişi': 'istihdam.ilaveKisi',
};

// ────────────────────────── PARSERS ──────────────────────────
const parseProducts = (row) => {
  const urunler = [];
  for (let i = 1; i <= 9; i++) {
    const nace = row[`NACE (${i})`] || '';
    const urun = row[`Ürün(${i})`] || '';
    const mevcut = row[`Mevcut(${i})`] || 0;
    const ilave = row[`İlave(${i})`] || 0;
    const toplam = row[`Toplam(${i})`] || 0;
    const birim = row[`Kapsite Birimi(${i})`] || '';
    const naceStr = String(nace || '').trim();
    const urunStr = String(urun || '').trim();
    if (!naceStr && !urunStr) continue;
    const mevcutKapasite = cleanTurkishNumber(mevcut);
    const ilaveKapasite = cleanTurkishNumber(ilave);
    const toplamKapasite = cleanTurkishNumber(toplam) || (mevcutKapasite + ilaveKapasite);
    if (mevcutKapasite === 0 && ilaveKapasite === 0 && toplamKapasite === 0 && !birim) continue;
    urunler.push({
      u97Kodu: naceStr,
      urunAdi: urunStr.length > 400 ? urunStr.slice(0, 400) : urunStr,
      mevcutKapasite, ilaveKapasite, toplamKapasite,
      kapasiteBirimi: String(birim || '').trim(),
      aktif: true
    });
  }
  return urunler;
};

const parseDestekUnsurlari = (row) => {
  const destekler = [];
  for (let i = 1; i <= 8; i++) {
    const destek = row[`Destek Unusrları(${i})`] || row[`Destek Unsurları(${i})`] || row[`Destek Unsurlari(${i})`] || '';
    const sart = row[`Şartları(${i})`] || '';
    const destekStr = String(destek || '').trim();
    if (!destekStr) continue;
    destekler.push({ destekUnsuru: destekStr, sarti: String(sart || '').trim(), durum: 'beklemede' });
  }
  return destekler;
};

const parseOzelSartlar = (row) => {
  const sartlar = [];
  for (let i = 1; i <= 14; i++) {
    const kisaltma = row[`Özel Şart Kısaltma ${i}`] || '';
    const notu = row[`Özelşart Notu ${i}`] || '';
    const kisaltmaStr = String(kisaltma || '').trim();
    const notStr = String(notu || '').trim();
    if (!kisaltmaStr && !notStr) continue;
    sartlar.push({
      koşulNo: i,
      koşulMetni: kisaltmaStr || `Özel Şart ${i}`,
      aciklamaNotu: notStr.length > 2000 ? notStr.slice(0, 2000) : notStr,
      durum: 'beklemede'
    });
  }
  return sartlar;
};

const parseMaliHesaplamalar = (row) => {
  const araziArsa = cleanTurkishNumber(row['ARAZİ ARSA BEDELİ']);
  const binaInsaat = cleanTurkishNumber(row['TOPLAM BİNA İNŞAAT GİDERİ']);
  const makinaToplam = cleanTurkishNumber(row['Toplam Makine Teçhizat']);
  const digerYatirim = cleanTurkishNumber(row['TOPLAM DİĞER YATIRIM HARCAMALARI']);
  const finansmanToplam = cleanTurkishNumber(row['TOPLAM FİNANSMAN']);
  let toplamSabit = cleanTurkishNumber(row['TOPLAM SABİT YATIRIM TUTARI TL']);
  if (!toplamSabit) toplamSabit = araziArsa + binaInsaat + makinaToplam + digerYatirim;
  if (!toplamSabit && finansmanToplam > 0) toplamSabit = finansmanToplam;
  return {
    maliyetlenen: {
      aciklama: String(row['Arazi-Arsa Bedeli Açıklama'] || '').trim(),
      sl: cleanTurkishNumber(row['Metrekaresi']),
      sm: cleanTurkishNumber(row['Birim Fiyatı TL']),
      sn: araziArsa
    },
    binaInsaatGideri: {
      aciklama: String(row['Bina İnşaat Gideri Açıklama'] || '').trim(),
      anaBinaGideri: cleanTurkishNumber(row['Ana Bina ve Tesisleri']),
      yardimciBinaGideri: cleanTurkishNumber(row['Yardımcı İş. Bina ve Tesisleri']),
      toplamBinaGideri: binaInsaat
    },
    yatirimHesaplamalari: {
      et: cleanTurkishNumber(row['Yardımcı İşl. Mak. Teç. Gid.']),
      eu: cleanTurkishNumber(row['İthalat ve Güm.Giderleri']),
      ev: cleanTurkishNumber(row['Taşıma ve Sigorta Giderleri']),
      ew: cleanTurkishNumber(row['Montaj Giderleri']),
      ex: cleanTurkishNumber(row['Etüd ve Proje Giderleri']),
      ey: cleanTurkishNumber(row['Diğer Giderleri']),
      ez: digerYatirim
    },
    makinaTechizat: {
      ithalMakina: cleanTurkishNumber(row['İthal']),
      yerliMakina: cleanTurkishNumber(row['Yerli']),
      toplamMakina: makinaToplam,
      yeniMakina: cleanTurkishNumber(row['Yeni Makine']),
      kullanimisMakina: cleanTurkishNumber(row['Kullanılmış Makine']),
      toplamYeniMakina: cleanTurkishNumber(row['TOPLAM İTHAL MAKİNE ($)'])
    },
    finansman: {
      yabanciKaynak: cleanTurkishNumber(row['Toplam Yabancı Kaynak']),
      ozKaynak: cleanTurkishNumber(row['Öz kaynak']),
      toplamFinansman: finansmanToplam
    },
    toplamSabitYatirim: toplamSabit,
    araciArsaBedeli: araziArsa,
    yatiriminTutari: toplamSabit,
    idareBindalari: cleanTurkishNumber(row['İdare Binaları'])
  };
};

// ────────────────────────── MAP & HELPERS ──────────────────────────
const mapBelgeDurumu = (raw) => {
  const str = String(raw || '').toUpperCase().trim();
  const map = {
    'AKTİF': 'onaylandi', 'AKTIF': 'onaylandi',
    'KAPATILDI': 'iptal', 'İPTAL': 'iptal', 'IPTAL': 'iptal',
    'REVİZE': 'inceleniyor', 'REVIZE': 'inceleniyor',
    'TAMAMLANDI': 'onaylandi', 'TASLAK': 'hazirlaniyor',
  };
  return map[str] || 'onaylandi';
};

const findOrCreateFirmaPreview = async (unvan) => {
  const cleanUnvan = String(unvan || '').trim().toUpperCase();
  if (!cleanUnvan) return { found: false, firma: null, willCreate: false, error: 'Firma ünvanı boş' };
  let firma = await Firma.findOne({ tamUnvan: cleanUnvan, aktif: true });
  if (firma) return { found: true, firma, willCreate: false };
  try {
    const turkishRegex = createTurkishInsensitiveRegex(cleanUnvan);
    firma = await Firma.findOne({ tamUnvan: turkishRegex, aktif: true });
    if (firma) return { found: true, firma, willCreate: false };
  } catch (e) {}
  const words = cleanUnvan.split(/\s+/).slice(0, 3).join(' ');
  if (words.length > 5) {
    try {
      const partialRegex = createTurkishInsensitiveRegex(words);
      firma = await Firma.findOne({ tamUnvan: partialRegex, aktif: true });
      if (firma) return { found: true, firma, willCreate: false, matchType: 'partial' };
    } catch (e) {}
  }
  return { found: false, firma: null, willCreate: true, unvan: cleanUnvan };
};

const createFirmaFromImport = async (unvan, il, ilce, adres, userId) => {
  const firma = new Firma({
    vergiNoTC: '0000000000',
    tamUnvan: String(unvan || '').trim().toUpperCase(),
    adres: String(adres || 'Belirtilmemiş').trim(),
    firmaIl: String(il || 'BELİRTİLMEMİŞ').trim().toUpperCase(),
    firmaIlce: String(ilce || '').trim().toUpperCase(),
    ilkIrtibatKisi: 'Excel Import',
    yetkiliKisiler: [{ adSoyad: 'Excel Import', telefon1: '0000000000', eposta1: 'import@system.local' }],
    olusturanKullanici: userId,
    aktif: true,
    notlar: `Bu firma eski teşvik import sırasında otomatik oluşturulmuştur.`
  });
  await firma.save();
  return firma;
};

// ────────────────────────── MAP FUNCTION ──────────────────────────
const mapExcelRowToTesvik = (row) => {
  const result = { kunyeBilgileri: {}, belgeYonetimi: {}, yatirimBilgileri: {}, istihdam: {}, durumBilgileri: {} };
  for (const [excelKey, modelPath] of Object.entries(COLUMN_MAP)) {
    const val = row[excelKey];
    if (val === undefined || val === null || val === '') continue;
    const parts = modelPath.split('.');
    if (parts.length === 1) { result[parts[0]] = String(val).trim(); }
    else if (parts.length === 2) {
      if (!result[parts[0]]) result[parts[0]] = {};
      result[parts[0]][parts[1]] = String(val).trim();
    }
  }
  // Tarih parse
  ['belgeTarihi','belgeMuracaatTarihi','belgeBaslamaTarihi','belgeBitisTarihi','uzatimTarihi'].forEach(f => {
    if (result.belgeYonetimi?.[f]) result.belgeYonetimi[f] = parseDate(result.belgeYonetimi[f]);
  });
  // Sayısal
  if (result.istihdam) {
    result.istihdam.mevcutKisi = cleanTurkishNumber(result.istihdam.mevcutKisi);
    result.istihdam.ilaveKisi = cleanTurkishNumber(result.istihdam.ilaveKisi);
    result.istihdam.toplamKisi = (result.istihdam.mevcutKisi || 0) + (result.istihdam.ilaveKisi || 0);
  }
  // Öncelikli yatırım
  if (result.belgeYonetimi?.oncelikliYatirim) {
    const val = String(result.belgeYonetimi.oncelikliYatirim).toUpperCase().trim();
    if (val === 'HAYIR') result.belgeYonetimi.oncelikliYatirim = 'hayır';
    else if (val === 'EVET') result.belgeYonetimi.oncelikliYatirim = 'evet';
    else result.belgeYonetimi.oncelikliYatirim = '';
  }
  // Durum mapping
  result.durumBilgileri.genelDurum = mapBelgeDurumu(result.belgeDurumuRaw);
  result.belgeYonetimi.belgeDurumu = mapBelgeDurumu(result.belgeDurumuRaw);
  delete result.belgeDurumuRaw;
  delete result.firmaIdExcel;
  // Fallback
  if (!result.yatirimBilgileri.yatirimKonusu) result.yatirimBilgileri.yatirimKonusu = 'Belirtilmemiş';
  if (!result.yatirimBilgileri.destekSinifi) result.yatirimBilgileri.destekSinifi = 'Belirtilmemiş';
  if (!result.yatirimBilgileri.yerinIl) result.yatirimBilgileri.yerinIl = 'BELİRTİLMEMİŞ';
  // Sub-parsers
  result.urunler = parseProducts(row);
  result.destekUnsurlari = parseDestekUnsurlari(row);
  result.ozelSartlar = parseOzelSartlar(row);
  result.maliHesaplamalar = parseMaliHesaplamalar(row);
  return result;
};

// ────────────────────────── EXCEL PARSER ──────────────────────────
const parseExcelFile = (filePath) => {
  const workbook = XLSX.readFile(filePath, { type: 'file', cellDates: false, raw: true, codepage: 65001 });
  const sheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[sheetName];
  const allRows = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '', raw: true, blankrows: true });
  if (!allRows || allRows.length < 5) throw new Error('Dosya en az 5 satır içermelidir');
  // Header auto-detect
  let headerRowIdx = 3, maxCols = 0;
  for (let i = 0; i < Math.min(allRows.length, 6); i++) {
    const nonEmpty = (allRows[i] || []).filter(c => c !== '' && c !== undefined && c !== null).length;
    if (nonEmpty > maxCols) { maxCols = nonEmpty; headerRowIdx = i; }
  }
  const headerRow = allRows[headerRowIdx];
  const dataRows = allRows.slice(headerRowIdx + 1).filter(row => Array.isArray(row) && row.some(cell => cell !== '' && cell !== undefined && cell !== null));
  if (dataRows.length === 0) throw new Error('Dosyada veri satırı bulunamadı');
  const result = dataRows.map(dataRow => {
    const obj = {};
    headerRow.forEach((header, idx) => { const key = String(header || '').trim(); if (key) obj[key] = dataRow[idx] !== undefined ? dataRow[idx] : ''; });
    return obj;
  });
  console.log(`📊 [Eski Teşvik] Parse: ${result.length} satır, ${headerRow.filter(h => h).length} kolon`);
  return { rows: result, headers: headerRow.filter(h => h) };
};

// ────────────────────────── VALIDATION ──────────────────────────
const validateTesvikData = (data) => {
  const errors = [], warnings = [];
  if (!data.gmId && !data.belgeYonetimi?.belgeId) errors.push('GM ID veya Belge ID zorunludur');
  if (!data.yatirimciUnvan) errors.push('Yatırımcı Ünvanı zorunludur');
  if (!data.yatirimBilgileri?.yatirimKonusu) warnings.push('Yatırım konusu belirtilmemiş');
  if (!data.yatirimBilgileri?.yerinIl) warnings.push('Yatırım ili belirtilmemiş');
  if (!data.urunler || data.urunler.length === 0) warnings.push('Ürün bilgisi bulunamadı');
  return { isValid: errors.length === 0, errors, warnings };
};

// ────────────────────────── UPLOAD & PREVIEW ──────────────────────────
const uploadAndPreview = async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ success: false, message: 'Dosya bulunamadı.' });
    console.log('📁 [Eski Teşvik] Import başladı:', req.file.originalname);
    const { rows, headers } = parseExcelFile(req.file.path);
    const previews = [], errors = [];
    for (let i = 0; i < rows.length; i++) {
      try {
        const row = rows[i];
        const tesvikData = mapExcelRowToTesvik(row);
        const firmaResult = await findOrCreateFirmaPreview(tesvikData.yatirimciUnvan);
        // Duplicate check
        let isDuplicate = false, existingTesvikId = null;
        const belgeId = tesvikData.belgeYonetimi?.belgeId;
        if (belgeId) {
          const existing = await Tesvik.findOne({ 'belgeYonetimi.belgeId': String(belgeId).trim(), aktif: true }).select('tesvikId yatirimciUnvan').lean();
          if (existing) { isDuplicate = true; existingTesvikId = existing.tesvikId; }
        }
        const validation = validateTesvikData(tesvikData);
        previews.push({
          rowIndex: i + 5,
          tesvikData,
          firma: {
            found: firmaResult.found, willCreate: firmaResult.willCreate,
            matchType: firmaResult.matchType || 'exact',
            existing: firmaResult.firma ? { _id: firmaResult.firma._id, firmaId: firmaResult.firma.firmaId, tamUnvan: firmaResult.firma.tamUnvan, firmaIl: firmaResult.firma.firmaIl } : null
          },
          isDuplicate, existingTesvikId, validation,
          canImport: validation.isValid && !isDuplicate
        });
      } catch (rowError) { errors.push({ rowIndex: i + 5, message: rowError.message }); }
    }
    const importSessionId = `eski-import-${Date.now()}-${Math.random().toString(36).substring(7)}`;
    const tempPath = path.join(__dirname, '..', 'uploads', `${importSessionId}.json`);
    fs.writeFileSync(tempPath, JSON.stringify({ originalFile: req.file.originalname, filePath: req.file.path, previews, userId: req.user._id, timestamp: new Date().toISOString() }));
    console.log(`✅ [Eski Teşvik] Preview: ${previews.length} kayıt, ${errors.length} hata`);
    res.json({
      success: true,
      message: `${previews.length} eski teşvik kaydı tespit edildi`,
      data: {
        importSessionId, originalFile: req.file.originalname, totalRows: rows.length,
        headers: headers.slice(0, 30), previews, errors,
        summary: {
          total: previews.length,
          canImport: previews.filter(p => p.canImport).length,
          duplicates: previews.filter(p => p.isDuplicate).length,
          firmaFound: previews.filter(p => p.firma.found).length,
          firmaWillCreate: previews.filter(p => p.firma.willCreate).length,
          validationErrors: previews.filter(p => !p.validation.isValid).length
        }
      }
    });
  } catch (error) {
    console.error('❌ [Eski Teşvik] Import preview hatası:', error);
    if (req.file && fs.existsSync(req.file.path)) { try { fs.unlinkSync(req.file.path); } catch (e) {} }
    res.status(500).json({ success: false, message: 'Dosya işlenirken hata oluştu', error: error.message });
  }
};

// ────────────────────────── CONFIRM IMPORT ──────────────────────────
const confirmImport = async (req, res) => {
  try {
    const { importSessionId, selectedRows } = req.body;
    if (!importSessionId) return res.status(400).json({ success: false, message: 'Import oturum ID bulunamadı.' });
    const tempPath = path.join(__dirname, '..', 'uploads', `${importSessionId}.json`);
    if (!fs.existsSync(tempPath)) return res.status(404).json({ success: false, message: 'Import oturumu bulunamadı veya süresi doldu.' });
    const sessionData = JSON.parse(fs.readFileSync(tempPath, 'utf8'));
    const { previews } = sessionData;
    const rowsToImport = selectedRows
      ? previews.filter((p, i) => selectedRows.includes(i) && p.canImport)
      : previews.filter(p => p.canImport);
    if (rowsToImport.length === 0) return res.status(400).json({ success: false, message: 'İmport edilecek geçerli kayıt bulunamadı' });
    const results = { success: 0, failed: 0, errors: [], created: [] };
    for (const preview of rowsToImport) {
      try {
        const { tesvikData, firma: firmaInfo } = preview;
        let firmaDoc;
        if (firmaInfo.found && firmaInfo.existing) {
          firmaDoc = await Firma.findById(firmaInfo.existing._id);
        } else if (firmaInfo.willCreate) {
          firmaDoc = await createFirmaFromImport(
            tesvikData.yatirimciUnvan, tesvikData.yatirimBilgileri?.yerinIl,
            tesvikData.yatirimBilgileri?.yerinIlce,
            [tesvikData.yatirimBilgileri?.yatirimAdresi1, tesvikData.yatirimBilgileri?.yatirimAdresi2, tesvikData.yatirimBilgileri?.yatirimAdresi3].filter(Boolean).join(' ') || 'Belirtilmemiş',
            req.user._id
          );
        }
        if (!firmaDoc) { results.failed++; results.errors.push(`Satır ${preview.rowIndex}: Firma eşleştirilemedi`); continue; }
        delete tesvikData.revizeTarihi; delete tesvikData.talepTarihi; delete tesvikData.sonucTarihi;
        // Eski Tesvik modeli ile kaydet
        const tesvik = new Tesvik({
          ...tesvikData,
          gmId: tesvikData.gmId || `IMP-${Date.now()}`,
          firma: firmaDoc._id,
          firmaId: firmaDoc.firmaId,
          yatirimciUnvan: tesvikData.yatirimciUnvan || firmaDoc.tamUnvan,
          olusturanKullanici: req.user._id,
          sonGuncelleyen: req.user._id,
          notlar: { dahiliNotlar: `Excel import (Eski Sistem) - ${sessionData.originalFile} - ${new Date().toLocaleString('tr-TR')}` }
        });
        if (typeof tesvik.updateMaliHesaplamalar === 'function') tesvik.updateMaliHesaplamalar();
        if (typeof tesvik.updateDurumRengi === 'function') tesvik.updateDurumRengi();
        await tesvik.save();
        results.success++;
        results.created.push({ tesvikId: tesvik.tesvikId, yatirimciUnvan: tesvik.yatirimciUnvan, firmaId: firmaDoc.firmaId, belgeId: tesvikData.belgeYonetimi?.belgeId });
      } catch (rowError) {
        results.failed++;
        results.errors.push(`Satır ${preview.rowIndex}: ${rowError.message}`);
        console.error(`❌ [Eski Teşvik] Satır ${preview.rowIndex}:`, rowError.message);
      }
    }
    // Cleanup
    try { fs.unlinkSync(tempPath); } catch (e) {}
    if (sessionData.filePath && fs.existsSync(sessionData.filePath)) { try { fs.unlinkSync(sessionData.filePath); } catch (e) {} }
    console.log(`✅ [Eski Teşvik] Import: ${results.success} başarılı, ${results.failed} hatalı`);
    res.json({ success: true, message: `${results.success} eski teşvik başarıyla import edildi`, data: results });
  } catch (error) {
    console.error('❌ [Eski Teşvik] Confirm hatası:', error);
    res.status(500).json({ success: false, message: 'Import onay sırasında hata oluştu', error: error.message });
  }
};

module.exports = { upload, uploadAndPreview, confirmImport };
