// 🌐 TEŞVİK EVRAK UPLOAD CONTROLLER - Public (token tabanlı, AUTH YOK)
// Müşteri/tedarikçi yalnızca kendi makine klasörüne dosya yükler. Hassas veri (mail, vergi no) sızdırılmaz.

const MachineProcess = require('../models/MachineProcess');
const tokenService = require('../services/tesvikMakine/uploadTokenService');
const storageService = require('../services/tesvikMakine/storageService');
const mps = require('../services/tesvikMakine/machineProcessService');
const { DOCUMENT_TYPES, DOCUMENT_TYPE_KEYS, getDocumentTypeFolder } = require('../constants/tesvikMakineMail');
const { ALLOWED_EXT } = require('../middleware/tesvikUpload');

function fail(res, code, message) {
  return res.status(code).json({ success: false, message });
}

async function resolveByToken(token) {
  if (!token) return { error: [400, 'Geçersiz bağlantı.'] };
  const proc = await MachineProcess.findOne({ uploadToken: token });
  if (!proc) return { error: [404, 'Bağlantı bulunamadı veya geçersiz.'] };
  if (tokenService.isExpired(proc.uploadTokenExpiresAt)) return { error: [410, 'Bağlantının süresi dolmuş. Lütfen yetkiliyle iletişime geçin.'] };
  return { proc };
}

// GET /api/tesvik-evrak/:token → yükleme ekranı için sade bilgi
exports.getInfo = async (req, res) => {
  try {
    const { proc, error } = await resolveByToken(req.params.token);
    if (error) return fail(res, error[0], error[1]);
    return res.json({
      success: true,
      data: {
        firmaAdi: proc.firmaName || '',
        belgeNo: proc.documentNo || '',
        makineAdi: proc.machineName || '',
        siraNo: proc.siraNo || 0,
        listType: proc.listType,
        documentTypes: DOCUMENT_TYPES,
        allowedExtensions: ALLOWED_EXT,
        maxUploadMB: Number(process.env.MAX_UPLOAD_MB) || 20
      }
    });
  } catch (err) {
    console.error('🚨 [tesvikEvrak] getInfo:', err && err.message);
    return fail(res, 500, 'Bilgi alınamadı.');
  }
};

// POST /api/tesvik-evrak/:token → dosya yükle
exports.upload = async (req, res) => {
  try {
    const { proc, error } = await resolveByToken(req.params.token);
    if (error) return fail(res, error[0], error[1]);
    if (!req.file) return fail(res, 400, 'Lütfen bir dosya seçin.');

    let documentType = (req.body && req.body.documentType) || 'diger';
    if (!DOCUMENT_TYPE_KEYS.includes(documentType)) documentType = 'diger';

    let uploadedByType = (req.body && req.body.uploaderType) || 'customer';
    if (!['customer', 'supplier'].includes(uploadedByType)) uploadedByType = 'customer';
    const uploaderName = ((req.body && req.body.uploaderName) || '').toString().slice(0, 120);
    const note = ((req.body && req.body.note) || '').toString().slice(0, 1000);

    const { identity, machineFields } = await mps.buildContext(proc);
    const folderRel = storageService.machineFolderRel(identity, machineFields, proc.listType);
    await storageService.ensureMachineStructure(identity, machineFields, proc.listType);
    const saved = await storageService.saveBuffer({
      folderRel, documentTypeFolder: getDocumentTypeFolder(documentType),
      originalName: req.file.originalname, buffer: req.file.buffer
    });
    await mps.recordUploadedDocument({
      proc, documentType, saved, fileSize: req.file.size, mimeType: req.file.mimetype,
      uploadedBy: null, uploadedByType, uploaderName, note, originalName: req.file.originalname
    });

    return res.json({ success: true, message: 'Dosyanız başarıyla yüklendi. Teşekkür ederiz.' });
  } catch (err) {
    if (err && err.code === 'UNSUPPORTED_FILE_TYPE') return fail(res, 415, err.message);
    console.error('🚨 [tesvikEvrak] upload:', err && (err.stack || err.message));
    return fail(res, 500, 'Dosya yüklenemedi. Lütfen tekrar deneyin.');
  }
};
