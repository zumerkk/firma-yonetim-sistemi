// 🎛️ TEŞVİK MAKİNE CONTROLLER - Admin/Consultant API
// Liste, dashboard, süreç CRUD, barkod akışı, mail önizle/gönder, klasör/upload-link, toplu işlem, raporlar.
// Yetki route katmanında uygulanır (read: herkes, write: admin+kullanici, ayar: admin).

const mongoose = require('mongoose');
const path = require('path');
const fs = require('fs-extra');
const Tesvik = require('../models/Tesvik');
const YeniTesvik = require('../models/YeniTesvik');
const MachineProcess = require('../models/MachineProcess');
const MailLog = require('../models/MailLog');
const MailTemplate = require('../models/MailTemplate');
const UploadedDocument = require('../models/UploadedDocument');
const DocumentFolder = require('../models/DocumentFolder');
const ReminderJob = require('../models/ReminderJob');
const MachineProcessLog = require('../models/MachineProcessLog');

const status = require('../constants/tesvikMakineStatus');
const { DOCUMENT_TYPES, getDocumentTypeFolder } = require('../constants/tesvikMakineMail');
const resolver = require('../services/tesvikMakine/certificateResolver');
const storageService = require('../services/tesvikMakine/storageService');
const mailService = require('../services/tesvikMakine/mailService');
const mps = require('../services/tesvikMakine/machineProcessService');
const reminderService = require('../services/tesvikMakine/reminderService');
const { resolveTemplate } = require('../services/tesvikMakine/mailTemplateProvider');
const { extractPlaceholders } = require('../services/tesvikMakine/mailTemplateEngine');
const ministryParser = require('../services/tesvikMakine/ministryMailParser');
const ParsedMinistryMail = require('../models/ParsedMinistryMail');

const { CLOSED_STATUSES, DOCUMENT_WAITING_STATUSES, MACHINE_STATUS } = status;

// ───────── küçük yardımcılar ─────────
const wrap = (fn) => (req, res) => Promise.resolve(fn(req, res)).catch((err) => fail(res, err));

function fail(res, err) {
  const codeMap = {
    CERT_NOT_FOUND: 404, ROW_NOT_FOUND: 404, PROC_NOT_FOUND: 404, MAILLOG_NOT_FOUND: 404,
    TEMPLATE_NOT_FOUND: 404, BAD_MODEL: 400, BAD_STATUS: 400, EMPTY_BARCODE: 400,
    NO_RECIPIENT: 400, TEMPLATE_INCOMPLETE: 422, SMTP_NOT_CONFIGURED: 503,
    UNSUPPORTED_FILE_TYPE: 415
  };
  const httpStatus = codeMap[err && err.code] || 500;
  if (httpStatus >= 500) console.error('🚨 [tesvikMakine] hata:', err && (err.stack || err.message));
  return res.status(httpStatus).json({
    success: false,
    message: err && err.message ? err.message : 'Beklenmeyen bir hata oluştu',
    code: err && err.code, missing: err && err.missing
  });
}

function getModel(tesvikModel) {
  if (tesvikModel === 'Tesvik') return Tesvik;
  if (tesvikModel === 'YeniTesvik') return YeniTesvik;
  const e = new Error('Geçersiz belge modeli (Tesvik|YeniTesvik).'); e.code = 'BAD_MODEL'; throw e;
}

async function loadProc(id) {
  const proc = await MachineProcess.findById(id);
  if (!proc) { const e = new Error('Makine süreci bulunamadı.'); e.code = 'PROC_NOT_FOUND'; throw e; }
  return proc;
}

function startOfToday() { const d = new Date(); d.setHours(0, 0, 0, 0); return d; }

// ───────── META ─────────
exports.getMeta = wrap(async (req, res) => {
  let templates = await MailTemplate.find({ isActive: true }).select('code name subjectTemplate placeholders').lean();
  if (!templates.length) {
    const { DEFAULT_TEMPLATES } = require('../constants/tesvikMakineMail');
    templates = DEFAULT_TEMPLATES.map((t) => ({ code: t.code, name: t.name }));
  }
  res.json({
    success: true,
    data: {
      statuses: status.statusOptions(),
      categories: status.STATUS_CATEGORY,
      documentTypes: DOCUMENT_TYPES,
      templates,
      smtpConfigured: mailService.isConfigured(),
      reminderDays: mps.reminderDays(),
      autoSendDefault: mps.autoSendDefault(),
      provider: storageService.getProvider()
    }
  });
});

// ───────── DASHBOARD ─────────
exports.getDashboard = wrap(async (req, res) => {
  const now = new Date();
  const [tesvikCount, yeniCount] = await Promise.all([
    Tesvik.countDocuments({}), YeniTesvik.countDocuments({})
  ]);
  const [openCount, docWaitingCount, kdvWaiting, invoiceDraftWaiting, overdue, sentToday, completed] = await Promise.all([
    MachineProcess.countDocuments({ status: { $nin: CLOSED_STATUSES } }),
    MachineProcess.countDocuments({ status: { $in: DOCUMENT_WAITING_STATUSES } }),
    MachineProcess.countDocuments({ status: MACHINE_STATUS.WAITING_KDV_EXEMPTION }),
    MachineProcess.countDocuments({ status: MACHINE_STATUS.WAITING_INVOICE_DRAFT }),
    MachineProcess.countDocuments({ reminderStopped: false, nextReminderAt: { $lt: now }, status: { $nin: status.REMINDER_SUPPRESSED_STATUSES } }),
    MailLog.countDocuments({ status: 'sent', sentAt: { $gte: startOfToday() } }),
    MachineProcess.countDocuments({ status: MACHINE_STATUS.COMPLETED })
  ]);
  res.json({
    success: true,
    data: {
      totalCertificates: tesvikCount + yeniCount,
      totalCertificatesByModel: { Tesvik: tesvikCount, YeniTesvik: yeniCount },
      openMachineProcesses: openCount,
      documentWaiting: docWaitingCount,
      kdvExemptionWaiting: kdvWaiting,
      invoiceDraftWaiting: invoiceDraftWaiting,
      overdueNoResponse: overdue,
      mailsSentToday: sentToday,
      completed
    }
  });
});

// ───────── SERTİFİKA (TEŞVİK) LİSTESİ ─────────
function certAggPipeline(match) {
  return [
    { $match: match },
    { $project: {
      tesvikId: 1, yatirimciUnvan: 1, createdAt: 1,
      belgeNo: '$belgeYonetimi.belgeNo', belgeId: '$belgeYonetimi.belgeId', belgeTarihi: '$belgeYonetimi.belgeTarihi',
      yatirimKonusu: '$yatirimBilgileri.yatirimKonusu',
      localCount: { $size: { $ifNull: ['$makineListeleri.yerli', []] } },
      importCount: { $size: { $ifNull: ['$makineListeleri.ithal', []] } },
      localTotal: { $sum: { $map: { input: { $ifNull: ['$makineListeleri.yerli', []] }, as: 'r', in: { $ifNull: ['$$r.toplamTutariTl', 0] } } } },
      importTotalUsd: { $sum: { $map: { input: { $ifNull: ['$makineListeleri.ithal', []] }, as: 'r', in: { $ifNull: ['$$r.toplamTutarFobUsd', 0] } } } }
    } }
  ];
}

function buildCertMatch(q) {
  const m = {};
  if (q.q && q.q.trim()) {
    const rx = new RegExp(q.q.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
    m.$or = [{ yatirimciUnvan: rx }, { 'belgeYonetimi.belgeNo': rx }, { 'belgeYonetimi.belgeId': rx }];
  }
  if (q.belgeNo) m['belgeYonetimi.belgeNo'] = q.belgeNo;
  if (q.belgeId) m['belgeYonetimi.belgeId'] = q.belgeId;
  return m;
}

exports.listCertificates = wrap(async (req, res) => {
  const page = Math.max(1, parseInt(req.query.page) || 1);
  const limit = Math.min(200, Math.max(1, parseInt(req.query.limit) || 25));
  const match = buildCertMatch(req.query);
  const wantModel = req.query.tesvikModel;

  const tasks = [];
  if (!wantModel || wantModel === 'Tesvik') tasks.push(Tesvik.aggregate(certAggPipeline(match)).then((r) => r.map((x) => ({ ...x, tesvikModel: 'Tesvik' }))));
  if (!wantModel || wantModel === 'YeniTesvik') tasks.push(YeniTesvik.aggregate(certAggPipeline(match)).then((r) => r.map((x) => ({ ...x, tesvikModel: 'YeniTesvik' }))));
  // Aynı belgeNo+belgeId'ye sahip mükerrer kayıtlardan yalnızca kanonik olanı göster
  // (müşteri talebi: "Belge no olarak 1 tane olması yeterli")
  const merged = resolver.dedupeCertificateRows((await Promise.all(tasks)).flat());
  merged.sort((a, b) => new Date(b.belgeTarihi || 0) - new Date(a.belgeTarihi || 0));

  const total = merged.length;
  const pageRows = merged.slice((page - 1) * limit, (page - 1) * limit + limit);

  // Sayfa için süreç istatistikleri
  const ids = pageRows.map((r) => r._id);
  const stats = await MachineProcess.aggregate([
    { $match: { tesvikId: { $in: ids } } },
    { $group: {
      _id: { m: '$tesvikModel', t: '$tesvikId' },
      total: { $sum: 1 },
      closed: { $sum: { $cond: [{ $in: ['$status', CLOSED_STATUSES] }, 1, 0] } },
      blocked: { $sum: { $cond: [{ $eq: ['$status', MACHINE_STATUS.BLOCKED] }, 1, 0] } },
      docWaiting: { $sum: { $cond: [{ $in: ['$status', DOCUMENT_WAITING_STATUSES] }, 1, 0] } },
      lastMailAt: { $max: '$lastMailAt' },
      pendingDocs: { $sum: '$documentCount' }
    } }
  ]);
  const statMap = new Map(stats.map((s) => [`${s._id.m}:${s._id.t}`, s]));

  const data = pageRows.map((r) => {
    const s = statMap.get(`${r.tesvikModel}:${r._id}`) || { total: 0, closed: 0, blocked: 0, docWaiting: 0, lastMailAt: null };
    const open = s.total - s.closed;
    let cat = 'bekliyor';
    if (s.total === 0) cat = 'bekliyor';
    else if (s.blocked > 0) cat = 'sorunlu';
    else if (open === 0) cat = 'tamamlandi';
    else if (s.docWaiting > 0) cat = 'evrak';
    else cat = 'islemde';
    return {
      tesvikModel: r.tesvikModel, tesvikId: r._id, tesvikKodu: r.tesvikId,
      firmaAdi: r.yatirimciUnvan || '', belgeNo: r.belgeNo || '', belgeId: r.belgeId || '',
      belgeTarihi: r.belgeTarihi || null, yatirimKonusu: r.yatirimKonusu || '',
      localCount: r.localCount, importCount: r.importCount,
      localTotal: r.localTotal || 0, importTotalUsd: r.importTotalUsd || 0,
      openProcesses: open, documentWaiting: s.docWaiting, lastMailAt: s.lastMailAt || null,
      genelDurum: cat, genelDurumBadge: status.STATUS_CATEGORY[cat]
    };
  });

  res.json({ success: true, data, pagination: { page, limit, total, pages: Math.ceil(total / limit) } });
});

// ───────── SERTİFİKA DETAY ─────────
exports.getCertificate = wrap(async (req, res) => {
  const { tesvikModel, tesvikId } = req.params;
  getModel(tesvikModel);
  await resolver.ensureRowIds(tesvikModel, tesvikId); // eski kayıtlarda eksik rowId'leri tamamla
  const cert = await resolver.loadCertificate(tesvikModel, tesvikId, { populateFirma: true });
  if (!cert) { const e = new Error('Teşvik belgesi bulunamadı.'); e.code = 'CERT_NOT_FOUND'; throw e; }
  const identity = resolver.extractCertIdentity(cert);
  const yerli = resolver.listFor(cert, 'local').map((r) => resolver.extractMachineFields(r, 'local'));
  const ithal = resolver.listFor(cert, 'import').map((r) => resolver.extractMachineFields(r, 'import'));
  const localTotal = yerli.reduce((s, m) => s + (m.totalPrice || 0), 0);
  const importTotalUsd = ithal.reduce((s, m) => s + (m.totalPrice || 0), 0);
  res.json({
    success: true,
    data: {
      tesvikModel, tesvikId, tesvikKodu: cert.tesvikId,
      identity,
      totals: { localTotal, importTotalUsd, localCount: yerli.length, importCount: ithal.length },
      yerli, ithal
    }
  });
});

exports.getCertificateMachines = wrap(async (req, res) => {
  const { tesvikModel, tesvikId } = req.params;
  getModel(tesvikModel);
  const data = await mps.listForCertificate({ tesvikModel, tesvikId });
  res.json({ success: true, data });
});

exports.getCertificateMails = wrap(async (req, res) => {
  const { tesvikModel, tesvikId } = req.params;
  const mails = await MailLog.find({ tesvikModel, tesvikId }).sort({ createdAt: -1 }).limit(500).lean();
  res.json({ success: true, data: mails });
});

exports.getCertificateDocuments = wrap(async (req, res) => {
  const { tesvikModel, tesvikId } = req.params;
  const docs = await UploadedDocument.find({ tesvikModel, tesvikId }).sort({ createdAt: -1 }).limit(500).lean();
  res.json({ success: true, data: docs });
});

exports.getCertificateReminders = wrap(async (req, res) => {
  const { tesvikModel, tesvikId } = req.params;
  const procs = await MachineProcess.find({ tesvikModel, tesvikId }).select('_id machineName siraNo status nextReminderAt reminderStopped reminderCount').lean();
  const procIds = procs.map((p) => p._id);
  const jobs = await ReminderJob.find({ machineProcessId: { $in: procIds } }).sort({ dueAt: -1 }).limit(500).lean();
  res.json({ success: true, data: { processes: procs, jobs } });
});

exports.getCertificateTimeline = wrap(async (req, res) => {
  const { tesvikModel, tesvikId } = req.params;
  const logs = await MachineProcessLog.find({ tesvikModel, tesvikId }).sort({ createdAt: -1 }).limit(500).lean();
  res.json({ success: true, data: logs.map((l) => ({
    ...l,
    oldStatusLabel: l.oldStatus ? status.getStatusLabel(l.oldStatus) : '',
    newStatusLabel: l.newStatus ? status.getStatusLabel(l.newStatus) : ''
  })) });
});

// ───────── SÜREÇ ─────────
exports.ensureProcess = wrap(async (req, res) => {
  const { tesvikModel, tesvikId, listType, rowId } = req.body;
  const proc = await mps.ensureProcess({ tesvikModel, tesvikId, listType, rowId, user: req.user });
  res.json({ success: true, data: proc });
});

exports.getProcess = wrap(async (req, res) => {
  const proc = await loadProc(req.params.id);
  const [timeline, mails, docs, reminders, folder] = await Promise.all([
    mps.getTimeline(proc),
    MailLog.find({ machineProcessId: proc._id }).sort({ createdAt: -1 }).limit(200).lean(),
    UploadedDocument.find({ machineProcessId: proc._id }).sort({ createdAt: -1 }).limit(200).lean(),
    ReminderJob.find({ machineProcessId: proc._id }).sort({ dueAt: -1 }).limit(50).lean(),
    proc.folderId ? DocumentFolder.findById(proc.folderId).lean() : Promise.resolve(null)
  ]);
  res.json({ success: true, data: { process: proc, statusBadge: status.getStatusBadge(proc.status), timeline, mails, documents: docs, reminders, folder } });
});

exports.updateProcessFields = wrap(async (req, res) => {
  const proc = await loadProc(req.params.id);
  const updated = await mps.updateFields(proc, req.body || {}, req.user);
  res.json({ success: true, data: updated });
});

exports.updateProcessStatus = wrap(async (req, res) => {
  const proc = await loadProc(req.params.id);
  const { status: newStatus, note } = req.body || {};
  const updated = await mps.changeStatus(proc, newStatus, { note, user: req.user });
  res.json({ success: true, data: updated, statusBadge: status.getStatusBadge(updated.status) });
});

exports.setBarcode = wrap(async (req, res) => {
  const proc = await loadProc(req.params.id);
  const { barcode, autoSend } = req.body || {};
  const result = await mps.setBarcode(proc, barcode, { user: req.user, autoSend });
  res.json({ success: true, data: result });
});

exports.previewMail = wrap(async (req, res) => {
  const proc = await loadProc(req.params.id);
  const { templateCode } = req.body || {};
  const preview = await mps.previewMail(proc, templateCode, { user: req.user });
  res.json({ success: true, data: preview });
});

exports.sendMail = wrap(async (req, res) => {
  const proc = await loadProc(req.params.id);
  const { templateCode, toOverride, ccOverride } = req.body || {};
  const result = await mps.sendProcessMail(proc, templateCode, { user: req.user, toOverride, ccOverride });
  res.json({ success: true, data: result });
});

exports.resendMail = wrap(async (req, res) => {
  const result = await mps.resendMail(req.params.mailLogId, { user: req.user });
  res.json({ success: true, data: result });
});

exports.ensureFolders = wrap(async (req, res) => {
  const proc = await loadProc(req.params.id);
  const folder = await mps.ensureFolders(proc, { user: req.user });
  res.json({ success: true, data: folder });
});

exports.createUploadLink = wrap(async (req, res) => {
  const proc = await loadProc(req.params.id);
  const link = await mps.ensureUploadLink(proc, { days: req.body && req.body.days, user: req.user });
  res.json({ success: true, data: { uploadLink: link, token: proc.uploadToken, expiresAt: proc.uploadTokenExpiresAt } });
});

exports.stopReminders = wrap(async (req, res) => {
  const proc = await loadProc(req.params.id);
  await mps.stopReminders(proc, { user: req.user });
  res.json({ success: true, data: proc });
});

exports.resumeReminders = wrap(async (req, res) => {
  const proc = await loadProc(req.params.id);
  await mps.resumeReminders(proc, { user: req.user });
  res.json({ success: true, data: proc });
});

// Admin paneli üzerinden evrak yükleme
exports.adminUpload = wrap(async (req, res) => {
  const proc = await loadProc(req.params.id);
  if (!req.file) { const e = new Error('Dosya bulunamadı.'); e.code = 'NO_RECIPIENT'; throw e; }
  const documentType = (req.body && req.body.documentType) || 'diger';
  const { identity, machineFields } = await mps.buildContext(proc);
  const folderRel = storageService.machineFolderRel(identity, machineFields, proc.listType);
  await storageService.ensureMachineStructure(identity, machineFields, proc.listType);
  const saved = await storageService.saveBuffer({
    folderRel, documentTypeFolder: getDocumentTypeFolder(documentType),
    originalName: req.file.originalname, buffer: req.file.buffer
  });
  const doc = await mps.recordUploadedDocument({
    proc, documentType, saved, fileSize: req.file.size, mimeType: req.file.mimetype,
    uploadedBy: req.user._id, uploadedByType: 'admin', uploaderName: req.user.adSoyad || req.user.email,
    note: (req.body && req.body.note) || '', originalName: req.file.originalname
  });
  res.json({ success: true, data: doc });
});

// ───────── EVRAK İNDİR / SİL ─────────
// İndirme API üzerinden (auth'lu) yapılır. Cloudinary dosyaları redirect, local dosyalar sendFile ile servis edilir.
exports.downloadDocument = wrap(async (req, res) => {
  const doc = await UploadedDocument.findById(req.params.id).lean();
  if (!doc) { const e = new Error('Evrak kaydı bulunamadı.'); e.code = 'PROC_NOT_FOUND'; throw e; }
  return storageService.serveFile(doc, res);
});

exports.deleteDocument = wrap(async (req, res) => {
  const doc = await UploadedDocument.findById(req.params.id);
  if (!doc) { const e = new Error('Evrak kaydı bulunamadı.'); e.code = 'PROC_NOT_FOUND'; throw e; }
  // Depolama sağlayıcıdan sil (Cloudinary veya local disk)
  try {
    await storageService.deleteFile(doc);
  } catch (err) { console.warn('⚠️ [tesvikMakine] dosya silinemedi:', err && err.message); }

  await doc.deleteOne();
  if (doc.machineProcessId) {
    const proc = await MachineProcess.findById(doc.machineProcessId);
    if (proc) {
      proc.documentCount = Math.max(0, (proc.documentCount || 0) - 1);
      await proc.save();
      await mps.addLog({
        proc, actionType: 'fields_updated',
        note: `Evrak silindi: ${doc.originalName || doc.fileName}`,
        meta: { deletedDocumentId: doc._id, documentType: doc.documentType }, user: req.user
      });
    }
  }
  res.json({ success: true });
});

// ───────── TOPLU İŞLEM ─────────
// body: { targets:[{tesvikModel,tesvikId,listType,rowId}], action, payload }
exports.bulk = wrap(async (req, res) => {
  const { targets = [], action, payload = {} } = req.body || {};
  if (!Array.isArray(targets) || !targets.length) { const e = new Error('Hedef makine seçilmedi.'); e.code = 'BAD_MODEL'; throw e; }
  const results = [];
  for (const t of targets) {
    try {
      const proc = await mps.ensureProcess({ ...t, user: req.user });
      let out = { ok: true, rowId: t.rowId };
      if (action === 'set_status') { await mps.changeStatus(proc, payload.status, { note: payload.note, user: req.user }); out.status = payload.status; }
      else if (action === 'send_mail') { const r = await mps.sendProcessMail(proc, payload.templateCode, { user: req.user }); out.mailLogId = r.mailLog._id; }
      else if (action === 'create_folders') { const f = await mps.ensureFolders(proc, { user: req.user }); out.folderPath = f.folderPath; }
      else if (action === 'upload_link') { out.uploadLink = await mps.ensureUploadLink(proc, { user: req.user }); }
      else { out = { ok: false, rowId: t.rowId, error: 'Bilinmeyen aksiyon' }; }
      results.push(out);
    } catch (err) {
      results.push({ ok: false, rowId: t.rowId, error: err.message, code: err.code });
    }
  }
  res.json({ success: true, data: { action, results, total: targets.length, succeeded: results.filter((r) => r.ok).length } });
});

// ───────── BİLDİRİMLER (yeni yüklenen evraklar) ─────────
exports.getNotifications = wrap(async (req, res) => {
  const docs = await UploadedDocument.find({ seenByAdmin: false }).sort({ createdAt: -1 }).limit(100).lean();
  res.json({ success: true, data: docs, count: docs.length });
});

exports.markNotificationsSeen = wrap(async (req, res) => {
  const ids = (req.body && req.body.ids) || null;
  const filter = ids && ids.length ? { _id: { $in: ids } } : { seenByAdmin: false };
  await UploadedDocument.updateMany(filter, { $set: { seenByAdmin: true } });
  res.json({ success: true });
});

// ───────── RAPORLAR ─────────
exports.reports = wrap(async (req, res) => {
  const type = req.params.type;
  if (type === 'suppliers') {
    const data = await MachineProcess.aggregate([
      { $match: { status: { $nin: CLOSED_STATUSES }, supplierCompanyName: { $ne: '' } } },
      { $group: { _id: '$supplierCompanyName', open: { $sum: 1 }, lastMailAt: { $max: '$lastMailAt' } } },
      { $sort: { open: -1 } }, { $limit: 200 }
    ]);
    return res.json({ success: true, data });
  }
  if (type === 'kdv-waiting' || type === 'invoice-draft-waiting') {
    const st = type === 'kdv-waiting' ? MACHINE_STATUS.WAITING_KDV_EXEMPTION : MACHINE_STATUS.WAITING_INVOICE_DRAFT;
    const data = await MachineProcess.find({ status: st }).select('firmaName documentNo siraNo machineName supplierCompanyName lastMailAt nextReminderAt').sort({ nextReminderAt: 1 }).limit(500).lean();
    return res.json({ success: true, data });
  }
  if (type === 'firms') {
    const data = await MachineProcess.aggregate([
      { $group: { _id: '$firmaName', total: { $sum: 1 }, open: { $sum: { $cond: [{ $in: ['$status', CLOSED_STATUSES] }, 0, 1] } }, completed: { $sum: { $cond: [{ $eq: ['$status', MACHINE_STATUS.COMPLETED] }, 1, 0] } } } },
      { $sort: { open: -1 } }, { $limit: 300 }
    ]);
    return res.json({ success: true, data });
  }
  const e = new Error('Bilinmeyen rapor türü.'); e.code = 'BAD_MODEL'; throw e;
});

// ───────── MAİL ŞABLONLARI (admin) ─────────
exports.listTemplates = wrap(async (req, res) => {
  const { seedMailTemplates } = require('../services/tesvikMakine/mailTemplateProvider');
  await seedMailTemplates();
  const templates = await MailTemplate.find({}).sort({ code: 1 }).lean();
  res.json({ success: true, data: templates });
});

exports.updateTemplate = wrap(async (req, res) => {
  const { code } = req.params;
  const { name, subjectTemplate, bodyTemplate, isActive } = req.body || {};
  const tpl = await MailTemplate.findOne({ code });
  if (!tpl) { const e = new Error('Şablon bulunamadı.'); e.code = 'TEMPLATE_NOT_FOUND'; throw e; }
  if (name !== undefined) tpl.name = name;
  if (subjectTemplate !== undefined) tpl.subjectTemplate = subjectTemplate;
  if (bodyTemplate !== undefined) tpl.bodyTemplate = bodyTemplate;
  if (isActive !== undefined) tpl.isActive = isActive;
  tpl.placeholders = Array.from(new Set([...extractPlaceholders(tpl.subjectTemplate), ...extractPlaceholders(tpl.bodyTemplate)]));
  tpl.updatedByUserId = req.user._id;
  await tpl.save();
  res.json({ success: true, data: tpl });
});

// ───────── SMTP TEST & HATIRLATMA TETİKLE (admin) ─────────
exports.testSmtp = wrap(async (req, res) => {
  if (!mailService.isConfigured()) { const e = new Error('SMTP yapılandırılmadı (SMTP_HOST/SMTP_USER).'); e.code = 'SMTP_NOT_CONFIGURED'; throw e; }
  await mailService.verify();
  const to = (req.body && req.body.to) || req.user.email;
  await mailService.sendMail({ to, subject: 'SMTP Test - Teşvik Makine Modülü', text: 'Bu bir SMTP test mailidir. Ayarlarınız çalışıyor.\n\n' + mps.getSignature() });
  res.json({ success: true, message: `Test maili gönderildi: ${to}` });
});

exports.runReminders = wrap(async (req, res) => {
  const summary = await reminderService.processDueReminders({ now: new Date() });
  res.json({ success: true, data: summary });
});

// ───────── BAKANLIK MAİL PARSER ─────────
exports.parseMail = wrap(async (req, res) => {
  const text = (req.body && req.body.text) || '';
  const parsed = ministryParser.parse(text);
  const match = await ministryParser.matchToMachine(parsed);
  res.json({ success: true, data: { parsed, match } });
});

exports.ingestMail = wrap(async (req, res) => {
  const { text, autoApply, sender, subject } = req.body || {};
  const result = await ministryParser.ingest(text, { user: req.user, autoApply: !!autoApply, sender, subject });
  res.json({ success: true, data: result });
});

exports.listParserQueue = wrap(async (req, res) => {
  const filter = {};
  if (req.query.status) filter.status = req.query.status;
  const items = await ParsedMinistryMail.find(filter).sort({ createdAt: -1 }).limit(300).lean();
  res.json({ success: true, data: items });
});

exports.linkParserQueue = wrap(async (req, res) => {
  const { tesvikModel, tesvikId, listType, rowId, applyBarcode } = req.body || {};
  const result = await ministryParser.linkQueueItem(req.params.id, { tesvikModel, tesvikId, listType, rowId, applyBarcode: applyBarcode !== false, user: req.user });
  res.json({ success: true, data: result });
});

// Eşleşmeyen kayıt için aday makineleri getir (parse edilen belge no/id'den) → elle bağlama UI'ı
exports.parserCandidates = wrap(async (req, res) => {
  const rec = await ParsedMinistryMail.findById(req.params.id).lean();
  if (!rec) { const e = new Error('Kayıt bulunamadı.'); e.code = 'PROC_NOT_FOUND'; throw e; }
  const found = await ministryParser.findCertificate(rec.parsed?.belgeNo, rec.parsed?.belgeId);
  if (!found) return res.json({ success: true, data: { found: false, machines: [] } });
  const identity = resolver.extractCertIdentity(found.cert);
  const machines = resolver.listAllMachines(found.cert);
  res.json({ success: true, data: { found: true, tesvikModel: found.tesvikModel, tesvikId: found.cert._id, firmaName: identity.firmaName, machines } });
});

exports.deleteParserQueue = wrap(async (req, res) => {
  await ParsedMinistryMail.findByIdAndDelete(req.params.id);
  res.json({ success: true });
});
