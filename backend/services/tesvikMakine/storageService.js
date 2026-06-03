// 🗄️ STORAGE SERVICE - Klasör/dosya yönetimi (local disk varsayılan)
// Spec klasör yapısı:
//   Tesvikler/{Firma}/{BelgeNo}-{BelgeId}/
//     01_Belge_Kunyesi · 02_Yerli_Makineler · 03_Ithal_Makineler · 04_Mail_Ekleri · 05_Genel_Evraklar
//     02|03/{SiraNo}_{MakineAdi}_{GTIP}/{KDV_Muafiyet, Proforma_Teklif, Fatura_Taslak, Fatura_Onayli, Sevk_Teslimat, Diger}
// Drive/S3 env ile açılabilir; implement yoksa local'e güvenli fallback yapar.

const path = require('path');
const fs = require('fs-extra');

const ROOT_LABEL = 'Tesvikler';
// backend/uploads/tesvik-evrak → /uploads ile statik servis edilir
const BASE_DIR = process.env.TESVIK_UPLOAD_DIR
  ? path.resolve(process.env.TESVIK_UPLOAD_DIR)
  : path.join(__dirname, '..', '..', 'uploads', 'tesvik-evrak');
const URL_BASE = '/uploads/tesvik-evrak';

const CERT_SUBFOLDERS = ['01_Belge_Kunyesi', '02_Yerli_Makineler', '03_Ithal_Makineler', '04_Mail_Ekleri', '05_Genel_Evraklar'];
const MACHINE_SUBFOLDERS = ['KDV_Muafiyet', 'Proforma_Teklif', 'Fatura_Taslak', 'Fatura_Onayli', 'Sevk_Teslimat', 'Diger'];

function envBool(v, def = false) {
  if (v === undefined || v === null || v === '') return def;
  return String(v).toLowerCase() === 'true' || v === '1';
}

// Hangi provider aktif? (şu an yalnızca local implement; diğerleri fallback)
function getProvider() {
  if (envBool(process.env.DRIVE_ENABLED)) return 'drive';
  if (envBool(process.env.S3_ENABLED)) return 's3';
  return 'local';
}

// 🔤 Path-güvenli segment. Türkçe harfler korunur; boşluk → _; tehlikeli karakterler atılır.
function normalizeSegment(input, maxLen = 80) {
  let s = String(input == null ? '' : input).trim();
  if (!s) return '_';
  s = s.replace(/\s+/g, '_');
  // İzinli: harf/rakam (Türkçe dahil), _ . -  → gerisi silinir
  s = s.replace(/[^A-Za-z0-9çğıöşüÇĞİÖŞÜ._-]/g, '');
  s = s.replace(/_+/g, '_').replace(/^[._-]+|[._-]+$/g, '');
  if (!s) return '_';
  if (s.length > maxLen) s = s.slice(0, maxLen).replace(/[._-]+$/g, '');
  return s || '_';
}

// Dosya adı normalize (uzantı korunur, stem kısaltılır)
function normalizeFileName(name, maxStem = 120) {
  const ext = path.extname(String(name || '')).toLowerCase().slice(0, 10);
  const stem = path.basename(String(name || ''), path.extname(String(name || '')));
  return `${normalizeSegment(stem, maxStem)}${ext}`;
}

// Belge klasörü göreli yolu
function certificateFolderRel(identity) {
  const firma = normalizeSegment(identity.firmaName || 'FIRMA', 80);
  const belge = `${normalizeSegment(identity.documentNo || 'BELGENO', 40)}-${normalizeSegment(identity.documentId || 'BELGEID', 40)}`;
  return [ROOT_LABEL, firma, belge].join('/');
}

function machineListRoot(listType) {
  return listType === 'import' ? '03_Ithal_Makineler' : '02_Yerli_Makineler';
}

function machineFolderName(machine) {
  const sira = normalizeSegment(String(machine.siraNo || 0), 6);
  const ad = normalizeSegment(machine.machineName || 'MAKINE', 80);
  const gtip = normalizeSegment(machine.gtipNo || '', 20);
  return [sira, ad, gtip].filter(Boolean).join('_');
}

function machineFolderRel(identity, machine, listType) {
  return [certificateFolderRel(identity), machineListRoot(listType), machineFolderName(machine)].join('/');
}

function absOf(relPath) {
  return path.join(BASE_DIR, relPath);
}

function urlOf(relPath) {
  return `${URL_BASE}/${relPath.split('/').map(encodeURIComponent).join('/')}`;
}

// 📁 Belge klasör yapısını oluştur (idempotent)
async function ensureCertificateStructure(identity) {
  const rel = certificateFolderRel(identity);
  const abs = absOf(rel);
  await fs.ensureDir(abs);
  for (const sub of CERT_SUBFOLDERS) {
    await fs.ensureDir(path.join(abs, sub));
  }
  return { folderPath: rel, absPath: abs, provider: getProvider(), shareUrl: urlOf(rel) };
}

// 📁 Makine klasör yapısını oluştur (belge yapısı yoksa onu da kurar)
async function ensureMachineStructure(identity, machine, listType) {
  await ensureCertificateStructure(identity);
  const rel = machineFolderRel(identity, machine, listType);
  const abs = absOf(rel);
  await fs.ensureDir(abs);
  for (const sub of MACHINE_SUBFOLDERS) {
    await fs.ensureDir(path.join(abs, sub));
  }
  return { folderPath: rel, absPath: abs, provider: getProvider(), shareUrl: urlOf(rel) };
}

// 💾 Buffer'ı ilgili evrak-türü alt klasörüne yaz (çakışma olursa _N ekler)
async function saveBuffer({ folderRel, documentTypeFolder = 'Diger', originalName, buffer }) {
  const targetDirRel = [folderRel, documentTypeFolder].join('/');
  const targetDirAbs = absOf(targetDirRel);
  await fs.ensureDir(targetDirAbs);

  let fileName = normalizeFileName(originalName);
  const ext = path.extname(fileName);
  const stem = path.basename(fileName, ext);
  let counter = 1;
  while (await fs.pathExists(path.join(targetDirAbs, fileName))) {
    counter += 1;
    fileName = `${stem}_${counter}${ext}`;
  }

  const fileAbs = path.join(targetDirAbs, fileName);
  await fs.writeFile(fileAbs, buffer);
  const relPath = [targetDirRel, fileName].join('/');
  return {
    fileName,
    filePath: fileAbs,
    relPath,
    fileUrl: urlOf(relPath),
    provider: getProvider()
  };
}

module.exports = {
  BASE_DIR,
  URL_BASE,
  ROOT_LABEL,
  CERT_SUBFOLDERS,
  MACHINE_SUBFOLDERS,
  getProvider,
  normalizeSegment,
  normalizeFileName,
  certificateFolderRel,
  machineListRoot,
  machineFolderName,
  machineFolderRel,
  ensureCertificateStructure,
  ensureMachineStructure,
  saveBuffer,
  urlOf,
  absOf
};
