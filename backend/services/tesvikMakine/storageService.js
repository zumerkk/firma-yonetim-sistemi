// 🗄️ STORAGE SERVICE - Cloudinary + local disk (env-toggle)
// Spec klasör yapısı:
//   Tesvikler/{Firma}/{BelgeNo}-{BelgeId}/
//     01_Belge_Kunyesi · 02_Yerli_Makineler · 03_Ithal_Makineler · 04_Mail_Ekleri · 05_Genel_Evraklar
//     02|03/{SiraNo}_{MakineAdi}_{GTIP}/{KDV_Muafiyet, Proforma_Teklif, Fatura_Taslak, Fatura_Onayli, Sevk_Teslimat, Diger}
//
// Provider seçimi:
//   - CLOUDINARY_CLOUD_NAME + CLOUDINARY_API_KEY + CLOUDINARY_API_SECRET env varsa → cloudinary
//   - Yoksa → local disk (geliştirme ortamı / lokal test)
// Dışarıya verilen API aynı kalır; çağıran kodlar değişiklik gerektirmez.

const path = require('path');
const fs = require('fs-extra');
const cloudinary = require('cloudinary').v2;

const ROOT_LABEL = 'Tesvikler';

// ────────── Local disk ayarları (fallback) ──────────
const BASE_DIR = process.env.TESVIK_UPLOAD_DIR
  ? path.resolve(process.env.TESVIK_UPLOAD_DIR)
  : path.join(__dirname, '..', '..', 'uploads', 'tesvik-evrak');
const URL_BASE = '/uploads/tesvik-evrak';

const CERT_SUBFOLDERS = ['01_Belge_Kunyesi', '02_Yerli_Makineler', '03_Ithal_Makineler', '04_Mail_Ekleri', '05_Genel_Evraklar'];
const MACHINE_SUBFOLDERS = ['KDV_Muafiyet', 'Proforma_Teklif', 'Fatura_Taslak', 'Fatura_Onayli', 'Sevk_Teslimat', 'Diger'];

// ────────── Cloudinary yapılandırma ──────────
let _cloudinaryConfigured = false;

// Teşvik makine evrak depolama için Cloudinary aktif mi?
// CLOUDINARY_STORAGE_ENABLED=true olmalı + credentials tam olmalı.
// (dosyaTakip modülü kendi Cloudinary config'ini kullanır, bu toggle ona etki etmez)
function isCloudinaryConfigured() {
  return Boolean(
    envBool(process.env.CLOUDINARY_STORAGE_ENABLED, false) &&
    process.env.CLOUDINARY_CLOUD_NAME &&
    process.env.CLOUDINARY_API_KEY &&
    process.env.CLOUDINARY_API_SECRET
  );
}

function ensureCloudinaryInit() {
  if (_cloudinaryConfigured) return;
  if (!isCloudinaryConfigured()) return;
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
  });
  _cloudinaryConfigured = true;
  console.log('☁️  [storageService] Cloudinary yapılandırıldı (cloud:', process.env.CLOUDINARY_CLOUD_NAME + ')');
}

// ────────── Yardımcılar ──────────
function envBool(v, def = false) {
  if (v === undefined || v === null || v === '') return def;
  return String(v).toLowerCase() === 'true' || v === '1';
}

function getProvider() {
  if (isCloudinaryConfigured()) return 'cloudinary';
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

// ────────── Cloudinary folder prefix ──────────
// Cloudinary'de "klasör" fiziksel değil, public_id prefix'idir.
// Prefix: tesvik-evrak/{folderRel} (ROOT_LABEL zaten folderRel içinde)
const CLOUDINARY_ROOT_PREFIX = 'tesvik-evrak';

function cloudinaryFolder(folderRel) {
  return `${CLOUDINARY_ROOT_PREFIX}/${folderRel}`;
}

// ════════════════════════════════════════════════════════════════
// 📁 Belge klasör yapısını oluştur (idempotent)
// ════════════════════════════════════════════════════════════════
async function ensureCertificateStructure(identity) {
  const rel = certificateFolderRel(identity);
  const provider = getProvider();

  if (provider === 'cloudinary') {
    // Cloudinary'de fiziksel klasör oluşturmaya gerek yok — sadece meta döndür
    return {
      folderPath: rel,
      absPath: null,
      provider: 'cloudinary',
      shareUrl: null // Cloudinary'de folder-seviye share URL yok
    };
  }

  // Local fallback
  const abs = absOf(rel);
  await fs.ensureDir(abs);
  for (const sub of CERT_SUBFOLDERS) {
    await fs.ensureDir(path.join(abs, sub));
  }
  return { folderPath: rel, absPath: abs, provider: 'local', shareUrl: urlOf(rel) };
}

// ════════════════════════════════════════════════════════════════
// 📁 Makine klasör yapısını oluştur (belge yapısı yoksa onu da kurar)
// ════════════════════════════════════════════════════════════════
async function ensureMachineStructure(identity, machine, listType) {
  await ensureCertificateStructure(identity);
  const rel = machineFolderRel(identity, machine, listType);
  const provider = getProvider();

  if (provider === 'cloudinary') {
    return {
      folderPath: rel,
      absPath: null,
      provider: 'cloudinary',
      shareUrl: null
    };
  }

  // Local fallback
  const abs = absOf(rel);
  await fs.ensureDir(abs);
  for (const sub of MACHINE_SUBFOLDERS) {
    await fs.ensureDir(path.join(abs, sub));
  }
  return { folderPath: rel, absPath: abs, provider: 'local', shareUrl: urlOf(rel) };
}

// ════════════════════════════════════════════════════════════════
// 💾 Buffer'ı kaydet — Cloudinary veya local disk
// ════════════════════════════════════════════════════════════════
async function saveBuffer({ folderRel, documentTypeFolder = 'Diger', originalName, buffer }) {
  const provider = getProvider();

  if (provider === 'cloudinary') {
    return _saveToCloudinary({ folderRel, documentTypeFolder, originalName, buffer });
  }

  return _saveToLocal({ folderRel, documentTypeFolder, originalName, buffer });
}

// ─── Cloudinary upload ───
async function _saveToCloudinary({ folderRel, documentTypeFolder, originalName, buffer }) {
  ensureCloudinaryInit();

  const fileName = normalizeFileName(originalName);
  const ext = path.extname(fileName);
  const stem = path.basename(fileName, ext);
  const folder = cloudinaryFolder([folderRel, documentTypeFolder].join('/'));

  // Cloudinary upload (buffer → stream)
  const result = await new Promise((resolve, reject) => {
    const timestamp = Date.now();
    const publicId = `${folder}/${stem}_${timestamp}`;

    const uploadStream = cloudinary.uploader.upload_stream(
      {
        public_id: publicId,
        resource_type: 'auto', // jpg/pdf/docx otomatik algıla
        overwrite: false,
        folder: undefined, // public_id içinde zaten folder var
        use_filename: true,
        unique_filename: true
      },
      (error, result) => {
        if (error) {
          console.error('🚨 [storageService] Cloudinary upload hatası:', error.message);
          reject(error);
        } else {
          resolve(result);
        }
      }
    );

    uploadStream.end(buffer);
  });

  const relPath = [folderRel, documentTypeFolder, fileName].join('/');

  return {
    fileName,
    filePath: relPath, // DB'de saklanan göreli yol (uyumluluk)
    relPath,
    fileUrl: result.secure_url, // ✅ Cloudinary tam URL
    providerFileId: result.public_id, // Cloudinary public_id (silme için)
    provider: 'cloudinary'
  };
}

// ─── Local disk upload (orijinal mantık) ───
async function _saveToLocal({ folderRel, documentTypeFolder, originalName, buffer }) {
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
    providerFileId: '',
    provider: 'local'
  };
}

// ════════════════════════════════════════════════════════════════
// 🗑️ Dosya sil — Cloudinary veya local
// ════════════════════════════════════════════════════════════════
async function deleteFile(doc) {
  const provider = getProvider();

  if (provider === 'cloudinary' || doc.providerFileId) {
    // Cloudinary'den sil (providerFileId = public_id)
    if (doc.providerFileId) {
      try {
        ensureCloudinaryInit();
        await cloudinary.uploader.destroy(doc.providerFileId, { resource_type: 'auto' });
        console.log('☁️  [storageService] Cloudinary dosya silindi:', doc.providerFileId);
      } catch (err) {
        console.warn('⚠️ [storageService] Cloudinary silme hatası (devam ediliyor):', err.message);
      }
    }
    return;
  }

  // Local disk'ten sil
  if (doc.filePath) {
    try {
      const abs = path.isAbsolute(doc.filePath) ? doc.filePath : absOf(doc.filePath);
      const base = path.resolve(BASE_DIR);
      if (abs && path.resolve(abs).startsWith(base) && (await fs.pathExists(abs))) {
        await fs.remove(abs);
      }
    } catch (err) {
      console.warn('⚠️ [storageService] Dosya silinemedi:', err.message);
    }
  }
}

// ════════════════════════════════════════════════════════════════
// 📥 Dosya indir/serve — Cloudinary ise redirect, local ise sendFile
// ════════════════════════════════════════════════════════════════
function isCloudinaryUrl(url) {
  return url && (url.includes('res.cloudinary.com') || url.includes('cloudinary.com'));
}

async function serveFile(doc, res) {
  // Cloudinary dosyası → redirect
  if (isCloudinaryUrl(doc.fileUrl)) {
    return res.redirect(doc.fileUrl);
  }

  // Local disk dosyası
  const abs = doc.filePath
    ? (path.isAbsolute(doc.filePath) ? doc.filePath : absOf(doc.filePath))
    : '';
  const base = path.resolve(BASE_DIR);

  if (!abs || !path.resolve(abs).startsWith(base)) {
    return res.status(403).json({ success: false, message: 'Yetkisiz dosya erişimi.' });
  }
  if (!(await fs.pathExists(abs))) {
    return res.status(404).json({
      success: false,
      message: 'Dosya sunucuda bulunamadı. Sunucu yeniden başlatıldığında eski dosyalar silinmiş olabilir.'
    });
  }
  return res.download(abs, doc.originalName || doc.fileName);
}

module.exports = {
  BASE_DIR,
  URL_BASE,
  ROOT_LABEL,
  CERT_SUBFOLDERS,
  MACHINE_SUBFOLDERS,
  getProvider,
  isCloudinaryConfigured,
  isCloudinaryUrl,
  normalizeSegment,
  normalizeFileName,
  certificateFolderRel,
  machineListRoot,
  machineFolderName,
  machineFolderRel,
  ensureCertificateStructure,
  ensureMachineStructure,
  saveBuffer,
  deleteFile,
  serveFile,
  urlOf,
  absOf
};
