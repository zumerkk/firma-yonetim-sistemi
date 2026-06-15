// 📎 TEŞVİK EVRAK UPLOAD MIDDLEWARE - multer (memory) + tür/boyut kontrolü
// İzinli türler: PDF, JPG, JPEG, PNG, XLSX, DOCX. Maks boyut: MAX_UPLOAD_MB (varsayılan 20).

const multer = require('multer');
const path = require('path');

const ALLOWED_EXT = ['.pdf', '.jpg', '.jpeg', '.png', '.xlsx', '.docx', '.xml'];
const ALLOWED_MIME = new Set([
  'application/pdf',
  'image/jpeg',
  'image/png',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // xlsx
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // docx
  'application/xml', 'text/xml', // xml (e-fatura XML)
  'application/octet-stream' // bazı tarayıcılar xlsx/docx/xml'i böyle gönderir → uzantı ile doğrulanır
]);

function maxBytes() {
  const mb = Number(process.env.MAX_UPLOAD_MB) || 20;
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

const uploadMemory = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: maxBytes(), files: 1 },
  fileFilter
});

// multer hatalarını sade JSON'a çeviren tek-dosya sarmalayıcı (hem admin hem public route kullanır)
function uploadSingle(field = 'file') {
  return (req, res, next) => {
    uploadMemory.single(field)(req, res, (err) => {
      if (!err) return next();
      const mb = Number(process.env.MAX_UPLOAD_MB) || 20;
      if (err.code === 'LIMIT_FILE_SIZE') return res.status(413).json({ success: false, message: `Dosya çok büyük. En fazla ${mb} MB yükleyebilirsiniz.` });
      if (err.code === 'UNSUPPORTED_FILE_TYPE') return res.status(415).json({ success: false, message: err.message });
      return res.status(400).json({ success: false, message: err.message || 'Dosya yüklenemedi.' });
    });
  };
}

module.exports = { uploadMemory, uploadSingle, ALLOWED_EXT, maxBytes };
