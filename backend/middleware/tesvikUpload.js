// 📎 TEŞVİK EVRAK UPLOAD MIDDLEWARE - multer (memory) + tür/boyut kontrolü
// İzinli türler: PDF, JPG, JPEG, PNG, XLSX, XLS, DOCX, DOC, XML, TXT, ZIP, RAR, 7Z. Maks boyut: MAX_UPLOAD_MB (varsayılan 100).
// XLS/DOC (22.09.2026): gümrük sisteminden alınan beyanname listesi eski Excel biçiminde geliyor
// (müşterinin örneği "Gümrük Beyannameler.xls"); toplu beyanname mailine ek olarak konuyor.

const multer = require('multer');
const path = require('path');

// TXT/ZIP/RAR/7Z (23.10.2026) — müşteri: "bu desteklenen dosya türlerine .txt, .zip, .rar gibi şeyleri de
// ekleyebilir miyiz?" Belge Takip yükleme listesinde zaten vardı (utils/cloudinaryYukleme IZINLI_UZANTILAR).
const ALLOWED_EXT = ['.pdf', '.jpg', '.jpeg', '.png', '.xlsx', '.xls', '.docx', '.doc', '.xml', '.txt', '.zip', '.rar', '.7z'];
const ALLOWED_MIME = new Set([
  'application/pdf',
  'image/jpeg',
  'image/png',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // xlsx
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // docx
  'application/vnd.ms-excel', // xls
  'application/msword', // doc
  'application/xml', 'text/xml', // xml (e-fatura XML)
  'text/plain', // txt
  'application/zip', 'application/x-zip-compressed', 'multipart/x-zip', // zip
  'application/vnd.rar', 'application/x-rar-compressed', 'application/x-rar', // rar
  'application/x-7z-compressed', // 7z
  'application/octet-stream', // bazı tarayıcılar xlsx/docx/xml/rar'ı böyle gönderir → uzantı ile doğrulanır
  '' // tarayıcı türünü bilmediği dosyada (çoğunlukla .rar) boş gönderir → yine uzantı belirleyici
]);

function maxBytes() {
  const mb = Number(process.env.MAX_UPLOAD_MB) || 100;
  return mb * 1024 * 1024;
}

function fileFilter(req, file, cb) {
  const ext = path.extname(file.originalname || '').toLowerCase();
  const extOk = ALLOWED_EXT.includes(ext);
  const mimeOk = ALLOWED_MIME.has(file.mimetype);
  if (extOk && mimeOk) return cb(null, true);
  const err = new Error(`Desteklenmeyen dosya türü. İzinli: ${ALLOWED_EXT.join(', ')}`);
  err.code = 'UNSUPPORTED_FILE_TYPE';
  return cb(err);
}

const MAX_FILES = Number(process.env.MAX_UPLOAD_FILES) || 10;

const uploadMemory = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: maxBytes(), files: 1 },
  fileFilter
});

// Çoklu dosya için ayrı instance (ör. XML + PDF aynı anda)
const uploadMemoryMulti = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: maxBytes(), files: MAX_FILES },
  fileFilter
});

function handleMulterError(err, res) {
  const mb = Number(process.env.MAX_UPLOAD_MB) || 100;
  if (err.code === 'LIMIT_FILE_SIZE') return res.status(413).json({ success: false, message: `Dosya çok büyük. En fazla ${mb} MB yükleyebilirsiniz.` });
  if (err.code === 'LIMIT_FILE_COUNT' || err.code === 'LIMIT_UNEXPECTED_FILE') return res.status(413).json({ success: false, message: `En fazla ${MAX_FILES} dosya yükleyebilirsiniz.` });
  if (err.code === 'UNSUPPORTED_FILE_TYPE') return res.status(415).json({ success: false, message: err.message });
  return res.status(400).json({ success: false, message: err.message || 'Dosya yüklenemedi.' });
}

// multer hatalarını sade JSON'a çeviren tek-dosya sarmalayıcı
function uploadSingle(field = 'file') {
  return (req, res, next) => {
    uploadMemory.single(field)(req, res, (err) => {
      if (!err) return next();
      return handleMulterError(err, res);
    });
  };
}

// Çoklu-dosya sarmalayıcı (req.files dizisi). Tekil 'file' alanını da kabul eder (geriye uyumluluk).
function uploadMultiple(field = 'files') {
  return (req, res, next) => {
    uploadMemoryMulti.fields([{ name: field, maxCount: MAX_FILES }, { name: 'file', maxCount: MAX_FILES }])(req, res, (err) => {
      if (err) return handleMulterError(err, res);
      // İki alanı tek diziye topla
      const f = req.files || {};
      req.uploadedFiles = [].concat(f[field] || [], f.file || []);
      next();
    });
  };
}

module.exports = { uploadMemory, uploadSingle, uploadMultiple, ALLOWED_EXT, maxBytes, MAX_FILES };
