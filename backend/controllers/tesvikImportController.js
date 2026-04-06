// 📊 TEŞVİK IMPORT CONTROLLER - ENTERPRISE EDITION
// Bakanlık formatındaki Excel/CSV dosyalarından otomatik YeniTesvik kaydı oluşturma
// 156+ sütun mapping, firma auto-match, ürün/destek/şart parse

const multer = require('multer');
const XLSX = require('xlsx');
const path = require('path');
const fs = require('fs');
const YeniTesvik = require('../models/YeniTesvik');
const Firma = require('../models/Firma');
const Activity = require('../models/Activity');
const Notification = require('../models/Notification');
const { createTurkishInsensitiveRegex } = require('../utils/turkishUtils');

// ────────────────────────── MULTER CONFIG ──────────────────────────
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = path.join(__dirname, '..', 'uploads');
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    cb(null, `tesvik-import-${Date.now()}${path.extname(file.originalname)}`);
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

// ────────────────────────── TURKISH NUMBER UTILS ──────────────────────────
// Excel'deki Türkçe formatlı sayıları temizle: "114.384.036" → 114384036
const cleanTurkishNumber = (val) => {
  if (val === null || val === undefined || val === '') return 0;
  if (typeof val === 'number') return val;
  const str = String(val).trim();
  if (str === '' || str === '-') return 0;
  // Virgül ondalık ayırıcı ise: "1.234,56" → "1234.56"
  if (str.includes(',') && str.includes('.')) {
    return Number(str.replace(/\./g, '').replace(',', '.')) || 0;
  }
  // Sadece nokta var: binlik ayırıcı olabilir
  if (str.includes('.') && str.split('.').length > 2) {
    return Number(str.replace(/\./g, '')) || 0;
  }
  // Sadece virgül: ondalık
  if (str.includes(',')) {
    return Number(str.replace(',', '.')) || 0;
  }
  return Number(str) || 0;
};

// ────────────────────────── DATE PARSER ──────────────────────────
const parseDate = (val) => {
  if (!val || val === '' || val === '-') return null;
  
  const str = String(val).trim();
  
  // Excel serial date number
  if (typeof val === 'number' || /^\d{5}$/.test(str)) {
    const excelEpoch = new Date(1899, 11, 30);
    const d = new Date(excelEpoch.getTime() + Number(val) * 86400000);
    return isNaN(d.getTime()) ? null : d;
  }
  
  // M/D/YY or M/D/YYYY format (US): "4/1/26" → April 1, 2026
  const usMatch = str.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/);
  if (usMatch) {
    let [, m, d, y] = usMatch;
    y = parseInt(y);
    if (y < 100) y += 2000;
    const date = new Date(y, parseInt(m) - 1, parseInt(d));
    return isNaN(date.getTime()) ? null : date;
  }
  
  // DD.MM.YYYY format (TR)
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
// CSV/Excel 4. satırdaki başlık → Model alanı eşleştirmesi

const COLUMN_MAP = {
  // Künye / Yatırımcı
  'GM ID': 'gmId',
  'TALEP/SONUÇ': 'kunyeBilgileri.talepSonuc',
  'REVIZE ID': 'kunyeBilgileri.revizeId',
  'FIRMA ID': 'firmaIdExcel',
  'YATIRIMCI UNVAN': 'yatirimciUnvan',
  'SGK SİCİL NO': 'kunyeBilgileri.sgkSicilNo',
  
  // Belge Bilgileri
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
  
  // Yatırım Bilgileri
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
  
  // İstihdam
  'Mevcut Kişi': 'istihdam.mevcutKisi',
  'İlave Kişi': 'istihdam.ilaveKisi',
};

// ────────────────────────── ÜRÜN PARSER ──────────────────────────
// CSV'deki 9 NACE+Ürün setini urunler[] array'ine dönüştür
const parseProducts = (row) => {
  const urunler = [];
  
  for (let i = 1; i <= 9; i++) {
    const suffix = i === 1 ? '(1)' : `(${i})`;
    const naceKey = `NACE ${suffix}`.replace('NACE (', 'NACE (');
    const urunKey = `Ürün${suffix}`;
    const mevcutKey = `Mevcut${suffix}`;
    const ilaveKey = `İlave${suffix}`;
    const toplamKey = `Toplam${suffix}`;
    const birimKey = `Kapsite Birimi${suffix}`;
    
    // Farklı header varyasyonlarını dene
    const nace = row[naceKey] || row[`NACE (${i})`] || '';
    const urun = row[urunKey] || row[`Ürün(${i})`] || '';
    const mevcut = row[mevcutKey] || row[`Mevcut(${i})`] || 0;
    const ilave = row[ilaveKey] || row[`İlave(${i})`] || 0;
    const toplam = row[toplamKey] || row[`Toplam(${i})`] || 0;
    const birim = row[birimKey] || row[`Kapsite Birimi(${i})`] || '';
    
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
      mevcutKapasite,
      ilaveKapasite,
      toplamKapasite,
      kapasiteBirimi: String(birim || '').trim(),
      aktif: true
    });
  }
  
  return urunler;
};

// ────────────────────────── DESTEK UNSURLARI PARSER ──────────────────────────
const parseDestekUnsurlari = (row) => {
  const destekler = [];
  
  for (let i = 1; i <= 8; i++) {
    const destekKey = `Destek Unusrları(${i})`;
    const sartKey = `Şartları(${i})`;
    
    // Alternatif key isimleri
    const destek = row[destekKey] || row[`Destek Unsurları(${i})`] || row[`Destek Unsurlari(${i})`] || '';
    const sart = row[sartKey] || row[`Şartları(${i})`] || '';
    
    const destekStr = String(destek || '').trim();
    if (!destekStr) continue;
    
    destekler.push({
      destekUnsuru: destekStr,
      sarti: String(sart || '').trim(),
      durum: 'beklemede'
    });
  }
  
  return destekler;
};

// ────────────────────────── ÖZEL ŞARTLAR PARSER ──────────────────────────
const parseOzelSartlar = (row) => {
  const sartlar = [];
  
  for (let i = 1; i <= 14; i++) {
    const kisaltmaKey = `Özel Şart Kısaltma ${i}`;
    const notKey = `Özelşart Notu ${i}`;
    
    const kisaltma = row[kisaltmaKey] || '';
    const notu = row[notKey] || '';
    
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

// ────────────────────────── MALİ HESAPLAMALAR PARSER ──────────────────────────
const parseMaliHesaplamalar = (row) => {
  const araziArsa = cleanTurkishNumber(row['ARAZİ ARSA BEDELİ']);
  const binaInsaat = cleanTurkishNumber(row['TOPLAM BİNA İNŞAAT GİDERİ']);
  const makinaToplam = cleanTurkishNumber(row['Toplam Makine Teçhizat']);
  const digerYatirim = cleanTurkishNumber(row['TOPLAM DİĞER YATIRIM HARCAMALARI']);
  const finansmanToplam = cleanTurkishNumber(row['TOPLAM FİNANSMAN']);
  
  // 🔧 FIX: toplamSabitYatirim — Excel'den geliyorsa onu kullan,
  // yoksa alt bileşenlerden otomatik hesapla
  let toplamSabit = cleanTurkishNumber(row['TOPLAM SABİT YATIRIM TUTARI TL']);
  if (!toplamSabit) {
    // Alt bileşenlerden hesapla: arazi + bina + makine + diğer
    toplamSabit = araziArsa + binaInsaat + makinaToplam + digerYatirim;
  }
  // Hala 0 ise finansman toplamını kullan (çoğu durumda eşit)
  if (!toplamSabit && finansmanToplam > 0) {
    toplamSabit = finansmanToplam;
  }
  
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
    // 🔧 FIX: toplamSabitYatirim — alt bileşenlerden hesaplanmış veya Excel'den gelen
    toplamSabitYatirim: toplamSabit,
    // 🔧 FIX: araciArsaBedeli — frontend bu alanı okuyor, maliyetlenen.sn ile senkron
    araciArsaBedeli: araziArsa,
    yatiriminTutari: toplamSabit,
    idareBindalari: cleanTurkishNumber(row['İdare Binaları'])
  };
};

// ────────────────────────── BELGE DURUMU MAPPING ──────────────────────────
const mapBelgeDurumu = (raw) => {
  const str = String(raw || '').toUpperCase().trim();
  const map = {
    'AKTİF': 'onaylandi',
    'AKTIF': 'onaylandi',
    'KAPATILDI': 'iptal',
    'İPTAL': 'iptal',
    'IPTAL': 'iptal',
    'REVİZE': 'inceleniyor',
    'REVIZE': 'inceleniyor',
    'TAMAMLANDI': 'onaylandi',
    'BEKLEMEDe': 'başvuru_yapildi'
  };
  return map[str] || 'onaylandi';
};

// ────────────────────────── FİRMA EŞLEŞTIRME ──────────────────────────
const findOrCreateFirmaPreview = async (unvan) => {
  const cleanUnvan = String(unvan || '').trim().toUpperCase();
  if (!cleanUnvan) return { found: false, firma: null, willCreate: false, error: 'Firma ünvanı boş' };
  
  // 1. Tam ünvan ile ara
  let firma = await Firma.findOne({ tamUnvan: cleanUnvan, aktif: true });
  if (firma) return { found: true, firma, willCreate: false };
  
  // 2. Türkçe karakter duyarsız ara
  try {
    const turkishRegex = createTurkishInsensitiveRegex(cleanUnvan);
    firma = await Firma.findOne({ tamUnvan: turkishRegex, aktif: true });
    if (firma) return { found: true, firma, willCreate: false };
  } catch (e) { /* ignore regex errors */ }
  
  // 3. Kısmi eşleme — ünvandaki ilk 3 kelime ile ara
  const words = cleanUnvan.split(/\s+/).slice(0, 3).join(' ');
  if (words.length > 5) {
    try {
      const partialRegex = createTurkishInsensitiveRegex(words);
      firma = await Firma.findOne({ tamUnvan: partialRegex, aktif: true });
      if (firma) return { found: true, firma, willCreate: false, matchType: 'partial' };
    } catch (e) { /* ignore */ }
  }
  
  return { found: false, firma: null, willCreate: true, unvan: cleanUnvan };
};

const createFirmaFromImport = async (unvan, il, ilce, adres, userId) => {
  const firma = new Firma({
    vergiNoTC: '0000000000', // Placeholder — kullanıcı sonra güncelleyecek
    tamUnvan: String(unvan || '').trim().toUpperCase(),
    adres: String(adres || 'Belirtilmemiş').trim(),
    firmaIl: String(il || 'BELİRTİLMEMİŞ').trim().toUpperCase(),
    firmaIlce: String(ilce || '').trim().toUpperCase(),
    ilkIrtibatKisi: 'Excel Import',
    yetkiliKisiler: [{
      adSoyad: 'Excel Import',
      telefon1: '0000000000',
      eposta1: 'import@system.local'
    }],
    olusturanKullanici: userId,
    aktif: true,
    notlar: `Bu firma teşvik import sırasında otomatik oluşturulmuştur. Lütfen bilgileri güncelleyiniz.`
  });
  
  await firma.save();
  return firma;
};

// ────────────────────────── ANA MAP FONKSİYONU ──────────────────────────
// Tek bir Excel/CSV satırını YeniTesvik objesi yapısına dönüştür
const mapExcelRowToTesvik = (row) => {
  const result = {
    kunyeBilgileri: {},
    belgeYonetimi: {},
    yatirimBilgileri: {},
    istihdam: {},
    durumBilgileri: {}
  };
  
  // Basit alanları map'le
  for (const [excelKey, modelPath] of Object.entries(COLUMN_MAP)) {
    const val = row[excelKey];
    if (val === undefined || val === null || val === '') continue;
    
    const parts = modelPath.split('.');
    if (parts.length === 1) {
      result[parts[0]] = String(val).trim();
    } else if (parts.length === 2) {
      if (!result[parts[0]]) result[parts[0]] = {};
      result[parts[0]][parts[1]] = String(val).trim();
    }
  }
  
  // Tarih alanlarını parse et
  const dateFields = [
    ['belgeYonetimi', 'belgeTarihi'],
    ['belgeYonetimi', 'belgeMuracaatTarihi'],
    ['belgeYonetimi', 'belgeBaslamaTarihi'],
    ['belgeYonetimi', 'belgeBitisTarihi'],
    ['belgeYonetimi', 'uzatimTarihi'],
  ];
  
  for (const [parent, field] of dateFields) {
    if (result[parent] && result[parent][field]) {
      result[parent][field] = parseDate(result[parent][field]);
    }
  }
  
  // Revize tarihi ve talep/sonuç tarihleri
  result.revizeTarihi = parseDate(row['REVIZE TARIHI']);
  result.talepTarihi = parseDate(row['TALEP TARİHİ']);
  result.sonucTarihi = parseDate(row['SONUÇ TARİHİ']);
  
  // Sayısal alanları
  if (result.istihdam) {
    result.istihdam.mevcutKisi = cleanTurkishNumber(result.istihdam.mevcutKisi);
    result.istihdam.ilaveKisi = cleanTurkishNumber(result.istihdam.ilaveKisi);
    result.istihdam.toplamKisi = (result.istihdam.mevcutKisi || 0) + (result.istihdam.ilaveKisi || 0);
  }
  
  // Öncelikli yatırım normalize
  if (result.belgeYonetimi && result.belgeYonetimi.oncelikliYatirim) {
    const val = String(result.belgeYonetimi.oncelikliYatirim).toUpperCase().trim();
    result.belgeYonetimi.oncelikliYatirim = (val === 'EVET' || val === 'HAYIR') 
      ? val.toLowerCase().replace('ı', 'i').replace('ı', 'i')
      : '';
    if (val === 'HAYIR') result.belgeYonetimi.oncelikliYatirim = 'hayır';
    if (val === 'EVET') result.belgeYonetimi.oncelikliYatirim = 'evet';
  }
  
  // Belge durumu mapping
  result.durumBilgileri.genelDurum = mapBelgeDurumu(result.belgeDurumuRaw);
  result.belgeYonetimi.belgeDurumu = mapBelgeDurumu(result.belgeDurumuRaw);
  delete result.belgeDurumuRaw;
  delete result.firmaIdExcel;
  
  // Yatırım konusu — sayısal NACE kodu
  if (result.yatirimBilgileri && result.yatirimBilgileri.yatirimKonusu) {
    result.yatirimBilgileri.yatirimKonusu = String(result.yatirimBilgileri.yatirimKonusu).trim();
  }
  
  // Ürünler
  result.urunler = parseProducts(row);
  
  // Destek Unsurları
  result.destekUnsurlari = parseDestekUnsurlari(row);
  
  // Özel Şartlar
  result.ozelSartlar = parseOzelSartlar(row);
  
  // Mali Hesaplamalar
  result.maliHesaplamalar = parseMaliHesaplamalar(row);
  
  // 🔧 FALLBACK: Model'deki required alanlar için varsayılan değerler
  // Bu alanlar Excel'den boş gelebilir ama Mongoose validation geçmesi lazım
  if (!result.yatirimBilgileri.yatirimKonusu) {
    result.yatirimBilgileri.yatirimKonusu = 'Belirtilmemiş';
  }
  if (!result.yatirimBilgileri.destekSinifi) {
    result.yatirimBilgileri.destekSinifi = 'Belirtilmemiş';
  }
  if (!result.yatirimBilgileri.yerinIl) {
    result.yatirimBilgileri.yerinIl = 'BELİRTİLMEMİŞ';
  }
  
  return result;
};

// ────────────────────────── EXCEL/CSV PARSER ──────────────────────────
const parseExcelFile = (filePath) => {
  const ext = path.extname(filePath).toLowerCase();
  
  const workbook = XLSX.readFile(filePath, {
    type: 'file',
    cellDates: false,   // Tarihleri ham olarak al
    raw: true,          // Ham değerleri al
    codepage: 65001     // UTF-8
  });
  
  const sheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[sheetName];
  
  // Tüm verileri raw olarak al — header olmadan
  const allRows = XLSX.utils.sheet_to_json(worksheet, {
    header: 1,          // Array olarak al (header yok)
    defval: '',
    raw: true,
    blankrows: true     // 🔧 FIX: Boş satırları dahil et (Bakanlık formatı 3. satır boş)
  });
  
  if (!allRows || allRows.length < 5) {
    throw new Error('Dosya en az 5 satır içermelidir (3 header + 1 başlık + 1 veri)');
  }
  
  // Bakanlık formatında header yapısı:
  // Satır 0: Grup başlıkları (KÜNYE BİLGLERİ, YATIRIM BİLGLERİ, ...)
  // Satır 1: Alt grup başlıkları
  // Satır 2: Boş ayırıcı satır
  // Satır 3: Kolon isimleri ← BU BİZİM HEADER
  // Satır 4+: Veriler
  
  // Header satırını bul — en çok dolu hücreye sahip olan satırı seç (satır 3 = index 3)
  let headerRowIdx = 3;
  let maxCols = 0;
  for (let i = 0; i < Math.min(allRows.length, 6); i++) {
    const nonEmpty = (allRows[i] || []).filter(c => c !== '' && c !== undefined && c !== null).length;
    if (nonEmpty > maxCols) {
      maxCols = nonEmpty;
      headerRowIdx = i;
    }
  }
  
  const headerRow = allRows[headerRowIdx];
  
  // Veri satırlarını al (header'dan sonraki satırlar)
  const dataRows = allRows.slice(headerRowIdx + 1).filter(row => {
    // Tamamen boş satırları filtrele
    if (!Array.isArray(row)) return false;
    return row.some(cell => cell !== '' && cell !== undefined && cell !== null);
  });
  
  if (dataRows.length === 0) {
    throw new Error('Dosyada veri satırı bulunamadı');
  }
  
  // Header indexleri ile veri satırlarını obje haline getir
  const result = dataRows.map(dataRow => {
    const obj = {};
    headerRow.forEach((header, idx) => {
      const key = String(header || '').trim();
      if (key) {
        obj[key] = dataRow[idx] !== undefined ? dataRow[idx] : '';
      }
    });
    return obj;
  });
  
  console.log(`📊 Parse edilen: ${result.length} satır, ${headerRow.filter(h => h).length} kolon`);
  console.log(`📋 Header örnekleri: ${headerRow.filter(h => h).slice(0, 10).join(', ')}`);
  
  return { rows: result, headers: headerRow.filter(h => h) };
};

// ────────────────────────── UPLOAD & PREVIEW ──────────────────────────
const uploadAndPreview = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'Dosya bulunamadı. Lütfen bir Excel veya CSV dosyası yükleyin.'
      });
    }
    
    console.log('📁 Teşvik import başladı:', req.file.originalname, 'Boyut:', req.file.size);
    
    // Parse
    const { rows, headers } = parseExcelFile(req.file.path);
    
    console.log(`📋 ${rows.length} satır veri parse edildi`);
    
    // Her satır için preview oluştur
    const previews = [];
    const errors = [];
    
    for (let i = 0; i < rows.length; i++) {
      try {
        const row = rows[i];
        
        // Map et
        const tesvikData = mapExcelRowToTesvik(row);
        
        // Firma eşleştirme
        const firmaResult = await findOrCreateFirmaPreview(tesvikData.yatirimciUnvan);
        
        // Duplicate belge kontrolü
        let isDuplicate = false;
        let existingTesvikId = null;
        const belgeId = tesvikData.belgeYonetimi?.belgeId;
        if (belgeId) {
          const existing = await YeniTesvik.findOne({
            'belgeYonetimi.belgeId': String(belgeId).trim(),
            aktif: true
          }).select('tesvikId yatirimciUnvan').lean();
          
          if (existing) {
            isDuplicate = true;
            existingTesvikId = existing.tesvikId;
          }
        }
        
        // Validation
        const validation = validateTesvikData(tesvikData);
        
        previews.push({
          rowIndex: i + 5, // Excel satır numarası (1-indexed + 4 header)
          tesvikData,
          firma: {
            found: firmaResult.found,
            willCreate: firmaResult.willCreate,
            matchType: firmaResult.matchType || 'exact',
            existing: firmaResult.firma ? {
              _id: firmaResult.firma._id,
              firmaId: firmaResult.firma.firmaId,
              tamUnvan: firmaResult.firma.tamUnvan,
              firmaIl: firmaResult.firma.firmaIl
            } : null
          },
          isDuplicate,
          existingTesvikId,
          validation,
          canImport: validation.isValid && !isDuplicate
        });
        
      } catch (rowError) {
        errors.push({
          rowIndex: i + 5,
          message: rowError.message
        });
      }
    }
    
    // Dosyayı ve dosya yolunu session/temp olarak tut
    // (confirm aşamasında dosyayı silebiliriz)
    const importSessionId = `import-${Date.now()}-${Math.random().toString(36).substring(7)}`;
    
    // Temp dosyayı sakla (confirm için)
    const tempPath = path.join(__dirname, '..', 'uploads', `${importSessionId}.json`);
    fs.writeFileSync(tempPath, JSON.stringify({
      originalFile: req.file.originalname,
      filePath: req.file.path,
      previews,
      userId: req.user._id,
      timestamp: new Date().toISOString()
    }));
    
    console.log(`✅ Preview hazır: ${previews.length} kayıt, ${errors.length} hata`);
    
    res.json({
      success: true,
      message: `${previews.length} teşvik kaydı tespit edildi`,
      data: {
        importSessionId,
        originalFile: req.file.originalname,
        totalRows: rows.length,
        headers: headers.slice(0, 30), // İlk 30 header göster
        previews,
        errors,
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
    console.error('❌ Teşvik import preview hatası:', error);
    
    // Dosyayı temizle
    if (req.file && fs.existsSync(req.file.path)) {
      try { fs.unlinkSync(req.file.path); } catch (e) { /* ignore */ }
    }
    
    res.status(500).json({
      success: false,
      message: 'Dosya işlenirken hata oluştu',
      error: error.message
    });
  }
};

// ────────────────────────── VALIDATION ──────────────────────────
const validateTesvikData = (data) => {
  const errors = [];
  const warnings = [];
  
  // Zorunlu alanlar
  if (!data.gmId && !data.belgeYonetimi?.belgeId) {
    errors.push('GM ID veya Belge ID zorunludur');
  }
  
  if (!data.yatirimciUnvan) {
    errors.push('Yatırımcı Ünvanı zorunludur');
  }
  
  if (!data.yatirimBilgileri?.yatirimKonusu) {
    warnings.push('Yatırım konusu belirtilmemiş');
  }
  
  if (!data.yatirimBilgileri?.yerinIl) {
    warnings.push('Yatırım ili belirtilmemiş');
  }
  
  if (!data.yatirimBilgileri?.destekSinifi) {
    warnings.push('Destek sınıfı belirtilmemiş');
  }
  
  if (!data.urunler || data.urunler.length === 0) {
    warnings.push('Ürün bilgisi bulunamadı');
  }
  
  if (!data.destekUnsurlari || data.destekUnsurlari.length === 0) {
    warnings.push('Destek unsuru bulunamadı');
  }
  
  return {
    isValid: errors.length === 0,
    errors,
    warnings
  };
};

// ────────────────────────── CONFIRM IMPORT ──────────────────────────
const confirmImport = async (req, res) => {
  try {
    const { importSessionId, selectedRows } = req.body;
    
    if (!importSessionId) {
      return res.status(400).json({
        success: false,
        message: 'Import oturum ID bulunamadı. Lütfen dosyayı tekrar yükleyin.'
      });
    }
    
    // Session dosyasını oku
    const tempPath = path.join(__dirname, '..', 'uploads', `${importSessionId}.json`);
    if (!fs.existsSync(tempPath)) {
      return res.status(404).json({
        success: false,
        message: 'Import oturumu bulunamadı veya süresi doldu. Lütfen dosyayı tekrar yükleyin.'
      });
    }
    
    const sessionData = JSON.parse(fs.readFileSync(tempPath, 'utf8'));
    const { previews } = sessionData;
    
    // Seçili satırları filtrele (hepsi veya belirli index'ler)
    const rowsToImport = selectedRows 
      ? previews.filter((p, i) => selectedRows.includes(i) && p.canImport)
      : previews.filter(p => p.canImport);
    
    if (rowsToImport.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'İmport edilecek geçerli kayıt bulunamadı'
      });
    }
    
    const results = {
      success: 0,
      failed: 0,
      errors: [],
      created: []
    };
    
    for (const preview of rowsToImport) {
      try {
        const { tesvikData, firma: firmaInfo } = preview;
        
        // Firma oluştur veya eşleştir
        let firmaDoc;
        if (firmaInfo.found && firmaInfo.existing) {
          firmaDoc = await Firma.findById(firmaInfo.existing._id);
        } else if (firmaInfo.willCreate) {
          firmaDoc = await createFirmaFromImport(
            tesvikData.yatirimciUnvan,
            tesvikData.yatirimBilgileri?.yerinIl,
            tesvikData.yatirimBilgileri?.yerinIlce,
            [
              tesvikData.yatirimBilgileri?.yatirimAdresi1,
              tesvikData.yatirimBilgileri?.yatirimAdresi2,
              tesvikData.yatirimBilgileri?.yatirimAdresi3
            ].filter(Boolean).join(' ') || 'Belirtilmemiş',
            req.user._id
          );
          console.log(`🏢 Yeni firma oluşturuldu: ${firmaDoc.firmaId} - ${firmaDoc.tamUnvan}`);
        }
        
        if (!firmaDoc) {
          results.failed++;
          results.errors.push(`Satır ${preview.rowIndex}: Firma eşleştirilemedi`);
          continue;
        }
        
        // Temizlik: gereksiz alanları kaldır
        delete tesvikData.revizeTarihi;
        delete tesvikData.talepTarihi;
        delete tesvikData.sonucTarihi;
        
        // YeniTesvik oluştur
        const tesvik = new YeniTesvik({
          ...tesvikData,
          gmId: tesvikData.gmId || `IMP-${Date.now()}`,
          firma: firmaDoc._id,
          firmaId: firmaDoc.firmaId,
          yatirimciUnvan: tesvikData.yatirimciUnvan || firmaDoc.tamUnvan,
          olusturanKullanici: req.user._id,
          sonGuncelleyen: req.user._id,
          notlar: {
            dahiliNotlar: `Excel import ile oluşturuldu - ${sessionData.originalFile} - ${new Date().toLocaleString('tr-TR')}`,
          }
        });
        
        // Mali hesaplamaları otomatik güncelle
        if (typeof tesvik.updateMaliHesaplamalar === 'function') {
          tesvik.updateMaliHesaplamalar();
        }
        
        // Durum rengini güncelle
        if (typeof tesvik.updateDurumRengi === 'function') {
          tesvik.updateDurumRengi();
        }
        
        await tesvik.save();
        
        results.success++;
        results.created.push({
          tesvikId: tesvik.tesvikId,
          yatirimciUnvan: tesvik.yatirimciUnvan,
          firmaId: firmaDoc.firmaId,
          belgeId: tesvikData.belgeYonetimi?.belgeId
        });
        
        console.log(`✅ Teşvik oluşturuldu: ${tesvik.tesvikId} - ${tesvik.yatirimciUnvan}`);
        
        // Activity log
        await Activity.logActivity({
          action: 'create',
          category: 'tesvik',
          title: 'Excel Import İle Teşvik Oluşturuldu',
          description: `${tesvik.tesvikId} numaralı teşvik Excel import ile oluşturuldu (${sessionData.originalFile})`,
          targetResource: {
            type: 'tesvik',
            id: tesvik._id,
            name: tesvik.yatirimciUnvan,
            tesvikId: tesvik.tesvikId
          },
          user: {
            id: req.user._id,
            name: req.user.adSoyad,
            email: req.user.email,
            role: req.user.rol
          }
        });
        
      } catch (rowError) {
        results.failed++;
        results.errors.push(`Satır ${preview.rowIndex}: ${rowError.message}`);
        console.error(`❌ Satır ${preview.rowIndex} hatası:`, rowError.message);
      }
    }
    
    // Temizlik
    try {
      if (fs.existsSync(tempPath)) fs.unlinkSync(tempPath);
      if (sessionData.filePath && fs.existsSync(sessionData.filePath)) fs.unlinkSync(sessionData.filePath);
    } catch (e) { /* ignore cleanup errors */ }
    
    // Bildirim
    if (results.success > 0) {
      await Notification.createNotification({
        title: 'Excel Import Tamamlandı',
        message: `${results.success} teşvik kaydı başarıyla oluşturuldu (${sessionData.originalFile})`,
        type: results.failed > 0 ? 'warning' : 'success',
        category: 'tesvik',
        userId: req.user._id
      });
    }
    
    console.log('✅ Import tamamlandı:', results);
    
    res.json({
      success: true,
      message: `${results.success} teşvik başarıyla oluşturuldu${results.failed > 0 ? `, ${results.failed} hatalı` : ''}`,
      data: results
    });
    
  } catch (error) {
    console.error('❌ Confirm import hatası:', error);
    res.status(500).json({
      success: false,
      message: 'Import onaylama sırasında hata oluştu',
      error: error.message
    });
  }
};

// ────────────────────────── EXPORT ──────────────────────────
module.exports = {
  upload,
  uploadAndPreview,
  confirmImport
};
