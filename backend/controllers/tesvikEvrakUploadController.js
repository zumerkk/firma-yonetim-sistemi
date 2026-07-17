// 🌐 TEŞVİK EVRAK UPLOAD CONTROLLER - Public (token tabanlı, AUTH YOK)
// Müşteri/tedarikçi yalnızca kendi makine klasörüne dosya yükler. Hassas veri (mail, vergi no) sızdırılmaz.

const MachineProcess = require('../models/MachineProcess');
const tokenService = require('../services/tesvikMakine/uploadTokenService');
const storageService = require('../services/tesvikMakine/storageService');
const mps = require('../services/tesvikMakine/machineProcessService');
const araKontrol = require('../services/tesvikMakine/araKontrolService');
const resolver = require('../services/tesvikMakine/certificateResolver');
const { DOCUMENT_TYPES, DOCUMENT_TYPE_KEYS, getDocumentTypeFolder } = require('../constants/tesvikMakineMail');
const { ALLOWED_EXT } = require('../middleware/tesvikUpload');

function fail(res, code, message) {
  return res.status(code).json({ success: false, message });
}

async function resolveByToken(token) {
  if (!token) return { error: [400, 'Geçersiz bağlantı.'] };
  const proc = await MachineProcess.findOne({ uploadToken: token });
  if (proc) {
    if (tokenService.isExpired(proc.uploadTokenExpiresAt)) return { error: [410, 'Bağlantının süresi dolmuş. Lütfen yetkiliyle iletişime geçin.'] };
    return { proc };
  }
  // Makine sürecinde yoksa: Ara Kontrol (belge geneli) linki — token teşvik dokümanında yaşar
  const belge = await araKontrol.resolveBelgeByToken(token);
  if (belge && belge.expired) return { error: [410, 'Bağlantının süresi dolmuş. Lütfen yetkiliyle iletişime geçin.'] };
  if (belge) return { belgeCtx: belge };
  return { error: [404, 'Bağlantı bulunamadı veya geçersiz.'] };
}

// GET /api/tesvik-evrak/:token → yükleme ekranı için sade bilgi
exports.getInfo = async (req, res) => {
  try {
    const { proc, belgeCtx, error } = await resolveByToken(req.params.token);
    if (error) return fail(res, error[0], error[1]);
    const ortak = {
      documentTypes: DOCUMENT_TYPES,
      allowedExtensions: ALLOWED_EXT,
      maxUploadMB: Number(process.env.MAX_UPLOAD_MB) || 20
    };
    if (belgeCtx) {
      // Belge geneli (Ara Kontrol) linki: makine yerine belge kimliği gösterilir
      const identity = resolver.extractCertIdentity(belgeCtx.doc);
      return res.json({
        success: true,
        data: {
          firmaAdi: identity.firmaName || '',
          belgeNo: identity.documentNo || '',
          makineAdi: 'Belge Geneli (Fatura / Evrak)',
          siraNo: 0,
          listType: 'local',
          ...ortak
        }
      });
    }
    return res.json({
      success: true,
      data: {
        firmaAdi: proc.firmaName || '',
        belgeNo: proc.documentNo || '',
        makineAdi: proc.machineName || '',
        siraNo: proc.siraNo || 0,
        listType: proc.listType,
        ...ortak
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
    const { proc, belgeCtx, error } = await resolveByToken(req.params.token);
    if (error) return fail(res, error[0], error[1]);
    const files = req.uploadedFiles || (req.file ? [req.file] : []);
    if (!files.length) return fail(res, 400, 'Lütfen en az bir dosya seçin.');

    let documentType = (req.body && req.body.documentType) || 'diger';
    if (!DOCUMENT_TYPE_KEYS.includes(documentType)) documentType = 'diger';

    let uploadedByType = (req.body && req.body.uploaderType) || 'customer';
    if (!['customer', 'supplier'].includes(uploadedByType)) uploadedByType = 'customer';
    const uploaderName = ((req.body && req.body.uploaderName) || '').toString().slice(0, 120);
    const note = ((req.body && req.body.note) || '').toString().slice(0, 1000);

    // 📮 Belge geneli (Ara Kontrol) yüklemesi: dosyalar belgenin "Belge_Geneli" klasörüne,
    // kayıt makine süreci OLMADAN (machineProcessId null) belge bağıyla yazılır
    if (belgeCtx) {
      const identity = resolver.extractCertIdentity(belgeCtx.doc);
      const folderRel = [storageService.certificateFolderRel(identity), 'Belge_Geneli'].join('/');
      await storageService.ensureCertificateStructure(identity);
      for (const file of files) {
        const saved = await storageService.saveBuffer({
          folderRel, documentTypeFolder: getDocumentTypeFolder(documentType),
          originalName: file.originalname, buffer: file.buffer
        });
        await araKontrol.recordBelgeUpload({
          tesvikModel: belgeCtx.tesvikModel, tesvikId: belgeCtx.doc._id,
          documentType, saved, fileSize: file.size, mimeType: file.mimetype,
          uploadedByType, uploaderName, note, originalName: file.originalname
        });
      }
      araKontrol.notifyBelgeUploadReceived({
        identity, count: files.length, documentType, uploaderName, note
      }).catch((e) => console.error('🚨 [tesvikEvrak] ara kontrol bildirimi:', e && e.message));
      const bMsg = files.length > 1
        ? `${files.length} dosyanız başarıyla yüklendi. Teşekkür ederiz.`
        : 'Dosyanız başarıyla yüklendi. Teşekkür ederiz.';
      return res.json({ success: true, message: bMsg, count: files.length });
    }

    const { identity, machineFields } = await mps.buildContext(proc);
    const folderRel = storageService.machineFolderRel(identity, machineFields, proc.listType);
    await storageService.ensureMachineStructure(identity, machineFields, proc.listType);

    for (const file of files) {
      const saved = await storageService.saveBuffer({
        folderRel, documentTypeFolder: getDocumentTypeFolder(documentType),
        originalName: file.originalname, buffer: file.buffer
      });
      await mps.recordUploadedDocument({
        proc, documentType, saved, fileSize: file.size, mimeType: file.mimetype,
        uploadedBy: null, uploadedByType, uploaderName, note, originalName: file.originalname
      });
    }

    // 🔔 Ekibe bilgilendirme maili (best-effort — yüklemeyi bloklamaz/etkilemez)
    mps.notifyUploadReceived(proc, {
      count: files.length, documentType, uploaderType: uploadedByType, uploaderName, note
    }).catch((e) => console.error('🚨 [tesvikEvrak] upload bildirimi:', e && e.message));

    const msg = files.length > 1
      ? `${files.length} dosyanız başarıyla yüklendi. Teşekkür ederiz.`
      : 'Dosyanız başarıyla yüklendi. Teşekkür ederiz.';
    return res.json({ success: true, message: msg, count: files.length });
  } catch (err) {
    if (err && err.code === 'UNSUPPORTED_FILE_TYPE') return fail(res, 415, err.message);
    console.error('🚨 [tesvikEvrak] upload:', err && (err.stack || err.message));
    return fail(res, 500, 'Dosya yüklenemedi. Lütfen tekrar deneyin.');
  }
};
