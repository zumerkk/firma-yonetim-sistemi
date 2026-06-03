// 🧭 CERTIFICATE RESOLVER - Mevcut Tesvik/YeniTesvik gömülü verisini okur
// Süreç katmanı makine MASTER verisini buradan çözer (rowId ile). Tek doğruluk kaynağı = gömülü satır.

const Tesvik = require('../../models/Tesvik');
const YeniTesvik = require('../../models/YeniTesvik');
let Firma; try { Firma = require('../../models/Firma'); } catch (_) { Firma = null; }

const MODELS = { Tesvik, YeniTesvik };

function modelFor(tesvikModel) {
  const M = MODELS[tesvikModel];
  if (!M) throw new Error(`Bilinmeyen belge modeli: ${tesvikModel}`);
  return M;
}

// 📅 TR tarih (GG.AA.YYYY) — backend'de date lib yok, hafif formatlayıcı
function formatDateTR(date) {
  if (!date) return '';
  const d = new Date(date);
  if (Number.isNaN(d.getTime())) return '';
  const gg = String(d.getDate()).padStart(2, '0');
  const aa = String(d.getMonth() + 1).padStart(2, '0');
  return `${gg}.${aa}.${d.getFullYear()}`;
}

async function loadCertificate(tesvikModel, tesvikId, { populateFirma = false } = {}) {
  const M = modelFor(tesvikModel);
  let q = M.findById(tesvikId);
  if (populateFirma && Firma) q = q.populate('firma', 'tamUnvan vergiNoTC adres firmaEmail');
  const cert = await q.lean();
  return cert;
}

// Belge kimliği (snapshot + placeholder kaynağı)
function extractCertIdentity(cert) {
  if (!cert) return {};
  const firma = cert.firma && typeof cert.firma === 'object' ? cert.firma : null;
  const by = cert.belgeYonetimi || {};
  const yb = cert.yatirimBilgileri || {};
  return {
    firmaName: cert.yatirimciUnvan || (firma && firma.tamUnvan) || cert.kunyeBilgileri?.yatirimciUnvan || '',
    taxNumber: (firma && firma.vergiNoTC) || cert.vergiNoTC || '',
    documentNo: by.belgeNo || '',
    documentId: by.belgeId || '',
    documentDate: by.belgeTarihi || null,
    investmentSubject: yb.yatirimKonusu || '',
    city: yb.yatirimYeriIl || cert.city || '',
    district: yb.yatirimYeriIlce || cert.district || '',
    address: (firma && firma.adres) || cert.address || ''
  };
}

function listKey(listType) {
  return listType === 'import' ? 'ithal' : 'yerli';
}

function listFor(cert, listType) {
  const ml = (cert && cert.makineListeleri) || {};
  return Array.isArray(ml[listKey(listType)]) ? ml[listKey(listType)] : [];
}

function findMachineRow(cert, listType, rowId) {
  return listFor(cert, listType).find((r) => String(r.rowId) === String(rowId)) || null;
}

// Gömülü satırı süreç-katmanı alanlarına eşitle (yerli/ithal farkları normalize)
function extractMachineFields(row, listType) {
  if (!row) return {};
  const isImport = listType === 'import';
  return {
    rowId: row.rowId,
    listType,
    siraNo: Number(row.siraNo || 0),
    makineId: row.makineId || '',
    gtipNo: row.gtipKodu || '',
    machineName: row.adiVeOzelligi || '',
    quantity: Number(row.miktar || 0),
    unit: row.birim || '',
    currency: isImport ? (row.gumrukDovizKodu || 'USD') : 'TRY',
    unitPrice: Number(isImport ? (row.birimFiyatiFob || 0) : (row.birimFiyatiTl || 0)),
    totalPrice: Number(isImport ? (row.toplamTutarFobUsd || 0) : (row.toplamTutariTl || 0)),
    kdvExempt: isImport ? (row.kdvMuafiyeti === 'EVET') : (row.kdvIstisnasi === 'EVET')
  };
}

// Tablo için tüm makineler (yerli + ithal), listType + rowId etiketli
function listAllMachines(cert) {
  const out = [];
  for (const lt of ['local', 'import']) {
    for (const row of listFor(cert, lt)) {
      out.push(extractMachineFields(row, lt));
    }
  }
  return out.sort((a, b) => (a.siraNo - b.siraNo));
}

// MachineProcess snapshot'ı için birleşik nesne
function buildSnapshot(identity, machineFields) {
  return {
    firmaName: identity.firmaName || '',
    taxNumber: identity.taxNumber || '',
    documentNo: identity.documentNo || '',
    documentId: identity.documentId || '',
    documentDate: identity.documentDate || null,
    siraNo: machineFields.siraNo || 0,
    makineId: machineFields.makineId || '',
    gtipNo: machineFields.gtipNo || '',
    machineName: machineFields.machineName || '',
    quantity: machineFields.quantity || 0,
    unit: machineFields.unit || '',
    currency: machineFields.currency || '',
    unitPrice: machineFields.unitPrice || 0,
    totalPrice: machineFields.totalPrice || 0,
    kdvExempt: !!machineFields.kdvExempt,
    listType: machineFields.listType
  };
}

// 🧩 Mail şablonu için placeholder verisi (snapshot + süreç + imza + upload link)
function buildPlaceholderData({ process: proc, identity, signature, uploadLink, mailDate }) {
  const id = identity || {};
  const p = proc || {};
  return {
    firmaAdi: p.firmaName || id.firmaName || '',
    makineAdi: p.machineName || '',
    belgeNo: p.documentNo || id.documentNo || '',
    belgeId: p.documentId || id.documentId || '',
    belgeTarihi: formatDateTR(p.documentDate || id.documentDate),
    makineId: p.makineId || '',
    siraNo: p.siraNo != null ? String(p.siraNo) : '',
    tedarikciMail: (Array.isArray(p.supplierEmails) && p.supplierEmails[0]) || '',
    tedarikciVergiNo: p.supplierTaxNumber || '',
    uploadLink: uploadLink || '',
    mailTarihi: formatDateTR(mailDate || new Date()),
    imza: signature || ''
  };
}

module.exports = {
  modelFor,
  formatDateTR,
  loadCertificate,
  extractCertIdentity,
  listFor,
  findMachineRow,
  extractMachineFields,
  listAllMachines,
  buildSnapshot,
  buildPlaceholderData
};
