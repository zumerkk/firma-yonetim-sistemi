// ⚙️ MACHINE PROCESS SERVICE - Teşvik makine sürecinin çekirdek iş mantığı
// Durum geçişleri, barkod (bakanlık otomasyon kodu) akışı, mail orkestrasyonu (önizle/gönder/taslak),
// klasör & upload-link, evrak kaydı, hatırlatma planlama — hepsi audit log ile.

const MachineProcess = require('../../models/MachineProcess');
const MailLog = require('../../models/MailLog');
const MachineProcessLog = require('../../models/MachineProcessLog');
const ReminderJob = require('../../models/ReminderJob');
const DocumentFolder = require('../../models/DocumentFolder');
const UploadedDocument = require('../../models/UploadedDocument');

const status = require('../../constants/tesvikMakineStatus');
const {
  MAIL_TEMPLATE_CODE, MAIL_STATUS, PROCESS_ACTION, REMINDER_TYPE,
  DEFAULT_SIGNATURE, getDocumentTypeFolder, DOCUMENT_TYPES
} = require('../../constants/tesvikMakineMail');

const resolver = require('./certificateResolver');
const mailService = require('./mailService');
const engine = require('./mailTemplateEngine');
const storageService = require('./storageService');
const tokenService = require('./uploadTokenService');
const { resolveTemplate } = require('./mailTemplateProvider');

const { MACHINE_STATUS } = status;

// ───────────────────────── Yardımcılar ─────────────────────────
function reminderDays() {
  const d = Number(process.env.REMINDER_DAYS);
  return Number.isFinite(d) && d > 0 ? d : 7;
}

function getSignature() {
  const s = process.env.MAIL_SIGNATURE;
  if (s && s.trim()) return s.replace(/\\n/g, '\n');
  return DEFAULT_SIGNATURE;
}

function autoSendDefault() {
  return String(process.env.AUTO_SEND_ENABLED || '').toLowerCase() === 'true';
}

function parseEmails(input) {
  if (!input) return [];
  if (Array.isArray(input)) return input.map((s) => String(s).trim()).filter(Boolean);
  return String(input).split(/[;,\s]+/).map((s) => s.trim()).filter(Boolean);
}

// Hangi şablon kime gider
function audienceForTemplate(code) {
  switch (code) {
    case MAIL_TEMPLATE_CODE.CUSTOMER_DOCUMENT_REQUEST:
      return 'customer';
    case MAIL_TEMPLATE_CODE.REMINDER_NO_RESPONSE:
      return 'reminder';
    default:
      return 'supplier';
  }
}

function recipientsFor(proc, audience) {
  if (audience === 'customer') {
    return { to: proc.customerEmails || [], cc: [] };
  }
  return { to: proc.supplierEmails || [], cc: proc.supplierCcEmails || [] };
}

function templateNeedsUploadLink(tpl) {
  return /\{uploadLink\}/.test(tpl.subjectTemplate || '') || /\{uploadLink\}/.test(tpl.bodyTemplate || '');
}

// Audit log yaz
async function addLog({ proc, actionType, oldStatus = '', newStatus = '', note = '', meta = {}, user = null, performedByLabel = '' }) {
  return MachineProcessLog.create({
    machineProcessId: proc._id,
    rowId: proc.rowId,
    tesvikModel: proc.tesvikModel,
    tesvikId: proc.tesvikId,
    actionType,
    oldStatus,
    newStatus,
    note,
    meta,
    performedByUserId: user ? user._id : null,
    performedByLabel: performedByLabel || (user ? (user.adSoyad || user.email || '') : 'Sistem')
  });
}

// cert + identity + makine alanlarını birlikte yükle
async function buildContext(proc) {
  const cert = await resolver.loadCertificate(proc.tesvikModel, proc.tesvikId, { populateFirma: true });
  if (!cert) {
    const err = new Error('Bağlı teşvik belgesi bulunamadı.');
    err.code = 'CERT_NOT_FOUND';
    throw err;
  }
  const identity = resolver.extractCertIdentity(cert);
  const row = resolver.findMachineRow(cert, proc.listType, proc.rowId);
  const machineFields = resolver.extractMachineFields(row, proc.listType);
  return { cert, identity, machineFields, row };
}

// ───────────────────────── Süreç oluşturma / listeleme ─────────────────────────

// Bir makine satırı için süreç kaydını bul ya da oluştur (idempotent)
async function ensureProcess({ tesvikModel, tesvikId, listType, rowId, user }) {
  if (!['Tesvik', 'YeniTesvik'].includes(tesvikModel)) {
    const e = new Error('Geçersiz belge modeli.'); e.code = 'BAD_MODEL'; throw e;
  }
  let proc = await MachineProcess.findOne({ tesvikModel, tesvikId, rowId });
  if (proc) return proc;

  // Yeni: gömülü satırı doğrula + snapshot al
  const cert = await resolver.loadCertificate(tesvikModel, tesvikId, { populateFirma: true });
  if (!cert) { const e = new Error('Teşvik belgesi bulunamadı.'); e.code = 'CERT_NOT_FOUND'; throw e; }
  const row = resolver.findMachineRow(cert, listType, rowId);
  if (!row) {
    const e = new Error('Belirtilen makine satırı (rowId) bu belgede bulunamadı. Belge no/ID ve liste türünü kontrol edin.');
    e.code = 'ROW_NOT_FOUND'; throw e;
  }
  const identity = resolver.extractCertIdentity(cert);
  const machineFields = resolver.extractMachineFields(row, listType);
  const snapshot = resolver.buildSnapshot(identity, machineFields);

  proc = await MachineProcess.create({
    tesvikModel, tesvikId, rowId, listType,
    ...snapshot,
    status: MACHINE_STATUS.NOT_STARTED,
    autoSendEnabled: autoSendDefault(),
    createdByUserId: user ? user._id : null
  });
  await addLog({ proc, actionType: PROCESS_ACTION.CREATED, newStatus: proc.status, note: 'Makine süreci başlatıldı', user });
  return proc;
}

// /tesvikler/[id]/makineler → tüm makine satırları + (varsa) süreçleri birleşik
async function listForCertificate({ tesvikModel, tesvikId }) {
  await resolver.ensureRowIds(tesvikModel, tesvikId); // eski kayıtlarda eksik rowId'leri tamamla
  const cert = await resolver.loadCertificate(tesvikModel, tesvikId, { populateFirma: true });
  if (!cert) { const e = new Error('Teşvik belgesi bulunamadı.'); e.code = 'CERT_NOT_FOUND'; throw e; }
  const identity = resolver.extractCertIdentity(cert);
  const machines = resolver.listAllMachines(cert);
  const procs = await MachineProcess.find({ tesvikModel, tesvikId }).lean();
  const procByRow = new Map(procs.map((p) => [String(p.rowId), p]));

  const rows = machines.map((m) => {
    const p = procByRow.get(String(m.rowId)) || null;
    const st = p ? p.status : MACHINE_STATUS.NOT_STARTED;
    return {
      ...m,
      identity,
      process: p,
      status: st,
      statusBadge: status.getStatusBadge(st),
      lastMailAt: p ? p.lastMailAt : null,
      nextReminderAt: p ? p.nextReminderAt : null,
      documentCount: p ? p.documentCount : 0,
      supplierCompanyName: p ? p.supplierCompanyName : '',
      supplierTaxNumber: p ? p.supplierTaxNumber : '',
      supplierEmails: p ? p.supplierEmails : [],
      customerContactName: p ? p.customerContactName : '',
      customerEmails: p ? p.customerEmails : [],
      barcode: p ? p.barcode : '',
      // 🧾 Fatura gerçekleşme alanları (Yerli Liste düzenlenebilir kolonları)
      invoiceRealizedValue: p ? p.invoiceRealizedValue : 0,
      invoiceRealizedQty: p ? p.invoiceRealizedQty : 0,
      invoiceNo: p ? p.invoiceNo : '',
      invoiceDate: p ? p.invoiceDate : null
    };
  });
  return { certificate: { _id: cert._id, tesvikModel, ...identity }, rows };
}

// ───────────────────────── Alan & durum güncelleme ─────────────────────────

const EDITABLE_FIELDS = [
  'supplierCompanyName', 'supplierTaxNumber', 'customerContactName',
  'kdvExemptRequired', 'invoiceDescriptionAuto', 'autoSendEnabled', 'dueDate', 'notes',
  // 🧾 Fatura gerçekleşme alanları (Yerli Liste düzenlenebilir kolonları)
  'invoiceRealizedValue', 'invoiceRealizedQty', 'invoiceNo', 'invoiceDate'
];

// 🔄 Fatura gerçekleşme bilgilerini ana teşvik belgesinin gömülü makine satırına geri yaz.
// MachineProcess'teki invoiceRealizedValue/Qty → YeniTesvik.makineListeleri.yerli[].gerceklesenTutar/Adet
// Pre-save hook'ları tetiklememek için doğrudan $set ile yazar.
async function syncInvoiceToMasterList(proc, { gerceklesenAdet, gerceklesenTutar }) {
  try {
    const M = resolver.modelFor(proc.tesvikModel);
    const lk = proc.listType === 'import' ? 'ithal' : 'yerli';

    const cert = await M.findById(proc.tesvikId).select('makineListeleri').lean();
    if (!cert || !cert.makineListeleri) return;

    const list = cert.makineListeleri[lk] || [];
    const idx = list.findIndex((r) => String(r.rowId) === String(proc.rowId));
    if (idx < 0) return;

    const update = {};
    update[`makineListeleri.${lk}.${idx}.gerceklesenAdet`] = gerceklesenAdet;
    update[`makineListeleri.${lk}.${idx}.gerceklesenTutar`] = gerceklesenTutar;

    await M.collection.updateOne({ _id: cert._id }, { $set: update });
  } catch (err) {
    console.warn('⚠️ [tesvikMakine] fatura→master sync atlandı:', err && err.message);
  }
}

async function updateFields(proc, fields = {}, user) {
  const changed = {};
  for (const f of EDITABLE_FIELDS) {
    if (fields[f] !== undefined) { proc[f] = fields[f]; changed[f] = fields[f]; }
  }
  if (fields.supplierEmails !== undefined) { proc.supplierEmails = parseEmails(fields.supplierEmails); changed.supplierEmails = proc.supplierEmails; }
  if (fields.supplierCcEmails !== undefined) { proc.supplierCcEmails = parseEmails(fields.supplierCcEmails); changed.supplierCcEmails = proc.supplierCcEmails; }
  if (fields.customerEmails !== undefined) { proc.customerEmails = parseEmails(fields.customerEmails); changed.customerEmails = proc.customerEmails; }
  // Barkod düzeltme/temizleme — durum akışını TETİKLEMEZ (akış için setBarcode kullanılır)
  if (fields.barcode !== undefined) {
    const code = String(fields.barcode || '').trim();
    if (code !== proc.barcode) { proc.barcode = code; changed.barcode = code || '(temizlendi)'; }
  }
  proc.updatedByUserId = user ? user._id : proc.updatedByUserId;
  await proc.save();

  // 🔄 Fatura gerçekleşme alanları değiştiyse ana belgenin gömülü makine satırını da güncelle
  if (changed.invoiceRealizedValue !== undefined || changed.invoiceRealizedQty !== undefined) {
    await syncInvoiceToMasterList(proc, {
      gerceklesenAdet: proc.invoiceRealizedQty || 0,
      gerceklesenTutar: proc.invoiceRealizedValue || 0
    });
  }

  if (Object.keys(changed).length) {
    await addLog({ proc, actionType: PROCESS_ACTION.FIELDS_UPDATED, note: 'Alanlar güncellendi', meta: { changed: Object.keys(changed) }, user });
  }
  return proc;
}

async function changeStatus(proc, newStatus, { note = '', user = null, actionType = PROCESS_ACTION.STATUS_CHANGE } = {}) {
  if (!status.isValidStatus(newStatus)) {
    const e = new Error(`Geçersiz durum: ${newStatus}`); e.code = 'BAD_STATUS'; throw e;
  }
  const oldStatus = proc.status;
  if (oldStatus === newStatus) return proc;
  proc.status = newStatus;
  if (newStatus === MACHINE_STATUS.COMPLETED || newStatus === MACHINE_STATUS.INVOICE_APPROVED) {
    if (newStatus === MACHINE_STATUS.COMPLETED) proc.completedAt = new Date();
  }
  // Hatırlatma bastırılan duruma geçildiyse bekleyen hatırlatmaları iptal et
  if (status.isReminderSuppressed(newStatus)) {
    proc.nextReminderAt = null;
    await ReminderJob.updateMany(
      { machineProcessId: proc._id, status: 'pending' },
      { $set: { status: 'skipped', skipReason: `status:${newStatus}` } }
    );
  }
  proc.updatedByUserId = user ? user._id : proc.updatedByUserId;
  await proc.save();
  await addLog({ proc, actionType, oldStatus, newStatus, note, user });
  return proc;
}

// ───────────────────────── Mail oluşturma / önizleme / gönderme ─────────────────────────

// Şablonu render et (DB yazmaz). uploadLink dışarıdan verilir.
async function composeMail(proc, templateCode, { uploadLink = '', toOverride, ccOverride } = {}) {
  const tpl = await resolveTemplate(templateCode);
  const { identity } = await buildContext(proc);
  const data = resolver.buildPlaceholderData({
    process: proc, identity, signature: getSignature(), uploadLink, mailDate: new Date()
  });
  const rendered = engine.renderTemplate(tpl, data);
  const audience = audienceForTemplate(templateCode);
  const def = recipientsFor(proc, audience);
  const to = toOverride !== undefined ? parseEmails(toOverride) : def.to;
  const cc = ccOverride !== undefined ? parseEmails(ccOverride) : def.cc;
  return { template: tpl, audience, subject: rendered.subject, body: rendered.body, to, cc, missing: rendered.missing, ok: rendered.ok && to.length > 0, needsUploadLink: templateNeedsUploadLink(tpl) };
}

// Önizleme: gerekirse upload link üretir (idempotent), MailLog YAZMAZ
async function previewMail(proc, templateCode, { user } = {}) {
  const tpl = await resolveTemplate(templateCode);
  let uploadLink = '';
  if (templateNeedsUploadLink(tpl)) uploadLink = await ensureUploadLink(proc, { user });
  const composed = await composeMail(proc, templateCode, { uploadLink });
  const missingRecipients = composed.to.length === 0;
  return {
    templateCode,
    subject: composed.subject,
    body: composed.body,
    to: composed.to,
    cc: composed.cc,
    missing: composed.missing,
    missingRecipients,
    canSend: composed.ok && mailService.isConfigured(),
    smtpConfigured: mailService.isConfigured()
  };
}

// MailLog oluştur (taslak) — autoSend kapalıyken kullanılır
async function createDraftMail(proc, templateCode, { user, uploadLink } = {}) {
  const composed = await composeMail(proc, templateCode, { uploadLink });
  const log = await MailLog.create({
    tesvikModel: proc.tesvikModel, tesvikId: proc.tesvikId, machineProcessId: proc._id, rowId: proc.rowId,
    templateCode, toEmails: composed.to, ccEmails: composed.cc,
    subject: composed.subject, body: composed.body,
    status: MAIL_STATUS.DRAFT, createdByUserId: user ? user._id : null
  });
  await addLog({ proc, actionType: PROCESS_ACTION.MAIL_DRAFT, note: `Taslak: ${templateCode}`, meta: { mailLogId: log._id, templateCode }, user });
  return log;
}

// Asıl gönderim. Doğrulama başarısızsa fırlatır (eksik placeholder/alıcı).
async function sendProcessMail(proc, templateCode, { user, toOverride, ccOverride, isReminder = false, reminderMailLogId = null } = {}) {
  const tpl = await resolveTemplate(templateCode);
  let uploadLink = '';
  if (templateNeedsUploadLink(tpl)) uploadLink = await ensureUploadLink(proc, { user });

  const composed = await composeMail(proc, templateCode, { uploadLink, toOverride, ccOverride });
  if (composed.to.length === 0) {
    const e = new Error('Gönderim için alıcı (to) e-posta adresi yok.'); e.code = 'NO_RECIPIENT'; throw e;
  }
  if (composed.missing.length) {
    const e = new Error(`Şablonda eksik bilgi var: ${composed.missing.join(', ')}`);
    e.code = 'TEMPLATE_INCOMPLETE'; e.missing = composed.missing; throw e;
  }

  // Önce taslak log
  const log = await MailLog.create({
    tesvikModel: proc.tesvikModel, tesvikId: proc.tesvikId, machineProcessId: proc._id, rowId: proc.rowId,
    templateCode, toEmails: composed.to, ccEmails: composed.cc,
    subject: composed.subject, body: composed.body,
    status: MAIL_STATUS.DRAFT, isReminder, reminderJobId: null,
    createdByUserId: user ? user._id : null
  });

  try {
    const res = await mailService.sendMail({ to: composed.to, cc: composed.cc, subject: composed.subject, text: composed.body });
    log.status = MAIL_STATUS.SENT;
    log.smtpMessageId = res.messageId || '';
    log.sentAt = new Date();
    await log.save();

    // Süreç bookkeeping
    proc.lastMailAt = log.sentAt;
    proc.lastMailTemplateCode = templateCode;
    await proc.save();
    await addLog({ proc, actionType: PROCESS_ACTION.MAIL_SENT, note: `Mail gönderildi: ${templateCode}`, meta: { mailLogId: log._id, templateCode, isReminder }, user });

    // Asıl mailse hatırlatma planla
    if (!isReminder) await scheduleReminder(proc, log);
    return { mailLog: log, sent: true };
  } catch (error) {
    log.status = MAIL_STATUS.FAILED;
    log.errorMessage = error.message || 'Gönderim hatası';
    await log.save();
    await addLog({ proc, actionType: PROCESS_ACTION.MAIL_FAILED, note: log.errorMessage, meta: { mailLogId: log._id, templateCode }, user });
    const e = new Error(error.message || 'Mail gönderilemedi');
    e.code = error.code || 'SMTP_SEND_FAILED'; e.mailLogId = log._id; throw e;
  }
}

// Başarısız/taslak maili yeniden gönder
async function resendMail(mailLogId, { user } = {}) {
  const log = await MailLog.findById(mailLogId);
  if (!log) { const e = new Error('Mail kaydı bulunamadı.'); e.code = 'MAILLOG_NOT_FOUND'; throw e; }
  const proc = await MachineProcess.findById(log.machineProcessId);
  if (!proc) { const e = new Error('Süreç bulunamadı.'); e.code = 'PROC_NOT_FOUND'; throw e; }
  try {
    const res = await mailService.sendMail({ to: log.toEmails, cc: log.ccEmails, subject: log.subject, text: log.body });
    log.status = MAIL_STATUS.SENT; log.smtpMessageId = res.messageId || ''; log.sentAt = new Date(); log.errorMessage = '';
    await log.save();
    proc.lastMailAt = log.sentAt; proc.lastMailTemplateCode = log.templateCode; await proc.save();
    await addLog({ proc, actionType: PROCESS_ACTION.MAIL_SENT, note: `Yeniden gönderildi: ${log.templateCode}`, meta: { mailLogId: log._id }, user });
    if (!log.isReminder) await scheduleReminder(proc, log);
    return { mailLog: log, sent: true };
  } catch (error) {
    log.status = MAIL_STATUS.FAILED; log.errorMessage = error.message || 'Gönderim hatası'; await log.save();
    const e = new Error(error.message || 'Mail gönderilemedi'); e.code = error.code || 'SMTP_SEND_FAILED'; throw e;
  }
}

// ───────────────────────── Barkod (Bakanlık otomasyon kodu) akışı ─────────────────────────
// Kod girilince: durum ministry_code_received → mail hazırla → autoSend ise gönder (verification_mail_sent)
// değilse taslak beklet. Aynı barkod başka süreçte varsa uyarı döner (bloklamaz).
async function setBarcode(proc, barcode, { user, autoSend } = {}) {
  const code = String(barcode || '').trim();
  if (!code) { const e = new Error('Barkod/otomasyon kodu boş olamaz.'); e.code = 'EMPTY_BARCODE'; throw e; }

  // Çakışma kontrolü (uyarı amaçlı)
  const dup = await MachineProcess.findOne({ _id: { $ne: proc._id }, barcode: code }).lean();
  const warning = dup ? `Bu barkod (${code}) zaten başka bir makineye atanmış (Sıra ${dup.siraNo || '-'}, ${dup.machineName || ''}).` : null;

  proc.barcode = code;
  await proc.save();
  await addLog({ proc, actionType: PROCESS_ACTION.BARCODE_ENTERED, note: `Otomasyon kodu girildi: ${code}`, meta: { barcode: code }, user });
  await changeStatus(proc, MACHINE_STATUS.MINISTRY_CODE_RECEIVED, { note: 'Bakanlık otomasyon kodu alındı', user });

  const effectiveAutoSend = autoSend !== undefined ? !!autoSend : (proc.autoSendEnabled || autoSendDefault());
  const templateCode = MAIL_TEMPLATE_CODE.SUPPLIER_VERIFICATION_INVOICE_INSTRUCTION;

  // Önizleme her durumda hazırlanır
  const preview = await composeMail(proc, templateCode, {});

  if (effectiveAutoSend && mailService.isConfigured() && preview.ok) {
    const sent = await sendProcessMail(proc, templateCode, { user });
    await changeStatus(proc, MACHINE_STATUS.VERIFICATION_MAIL_SENT, { note: 'Doğrulama maili otomatik gönderildi', user });
    return { process: proc, autoSent: true, mailLog: sent.mailLog, warning, preview };
  }

  // autoSend kapalı / SMTP yok / eksik bilgi → taslak beklet
  const draft = await createDraftMail(proc, templateCode, { user });
  return { process: proc, autoSent: false, draft, warning, preview, reason: !mailService.isConfigured() ? 'SMTP yapılandırılmadı' : (!preview.ok ? 'Şablon/alıcı eksik' : 'Otomatik gönderim kapalı') };
}

// ───────────────────────── Hatırlatma planlama ─────────────────────────
async function scheduleReminder(proc, mailLog) {
  if (proc.reminderStopped || status.isReminderSuppressed(proc.status)) return null;
  const due = new Date();
  due.setDate(due.getDate() + reminderDays());
  proc.nextReminderAt = due;
  await proc.save();
  const job = await ReminderJob.create({
    machineProcessId: proc._id,
    mailLogId: mailLog ? mailLog._id : null,
    dueAt: due,
    status: 'pending',
    reminderType: REMINDER_TYPE.NO_RESPONSE
  });
  return job;
}

async function stopReminders(proc, { user } = {}) {
  proc.reminderStopped = true;
  proc.nextReminderAt = null;
  await proc.save();
  await ReminderJob.updateMany({ machineProcessId: proc._id, status: 'pending' }, { $set: { status: 'skipped', skipReason: 'manual_stop' } });
  await addLog({ proc, actionType: PROCESS_ACTION.REMINDER_STOPPED, note: 'Hatırlatmalar durduruldu', user });
  return proc;
}

async function resumeReminders(proc, { user } = {}) {
  proc.reminderStopped = false;
  await proc.save();
  await addLog({ proc, actionType: PROCESS_ACTION.FIELDS_UPDATED, note: 'Hatırlatmalar yeniden etkinleştirildi', user });
  return proc;
}

// Cron tarafından çağrılır: bir hatırlatma jobunu gönder
async function sendReminderForJob(proc, originalMailLog, { user = null } = {}) {
  const tpl = await resolveTemplate(MAIL_TEMPLATE_CODE.REMINDER_NO_RESPONSE);
  let uploadLink = '';
  if (templateNeedsUploadLink(tpl)) uploadLink = await ensureUploadLink(proc, { user });

  // Hatırlatma, asıl mailin alıcılarına gider (varsa); yoksa süreç alıcıları
  const to = originalMailLog && originalMailLog.toEmails && originalMailLog.toEmails.length
    ? originalMailLog.toEmails
    : (proc.supplierEmails && proc.supplierEmails.length ? proc.supplierEmails : proc.customerEmails);
  const cc = originalMailLog ? (originalMailLog.ccEmails || []) : (proc.supplierCcEmails || []);

  const result = await sendProcessMail(proc, MAIL_TEMPLATE_CODE.REMINDER_NO_RESPONSE, {
    user, toOverride: to, ccOverride: cc, isReminder: true
  });
  proc.reminderCount = (proc.reminderCount || 0) + 1;
  proc.lastReminderAt = new Date();
  await proc.save();
  await addLog({ proc, actionType: PROCESS_ACTION.REMINDER_SENT, note: 'Hatırlatma maili gönderildi', meta: { mailLogId: result.mailLog._id }, user });
  return result.mailLog;
}

// ───────────────────────── Klasör & Upload Link ─────────────────────────
async function ensureFolders(proc, { user } = {}) {
  const { identity, machineFields } = await buildContext(proc);
  const res = await storageService.ensureMachineStructure(identity, machineFields, proc.listType);
  let folder = await DocumentFolder.findOne({ tesvikModel: proc.tesvikModel, tesvikId: proc.tesvikId, rowId: proc.rowId, folderPath: res.folderPath });
  if (!folder) {
    folder = await DocumentFolder.create({
      tesvikModel: proc.tesvikModel, tesvikId: proc.tesvikId, machineProcessId: proc._id, rowId: proc.rowId,
      provider: res.provider, folderPath: res.folderPath, shareUrl: res.shareUrl
    });
    await addLog({ proc, actionType: PROCESS_ACTION.FOLDER_CREATED, note: `Klasör oluşturuldu: ${res.folderPath}`, meta: { folderPath: res.folderPath }, user });
  }
  if (!proc.folderId || String(proc.folderId) !== String(folder._id)) {
    proc.folderId = folder._id;
    await proc.save();
  }
  return folder;
}

async function ensureUploadLink(proc, { days, user } = {}) {
  await ensureFolders(proc, { user });

  // Belge no'yu okunaklı önek olarak ekle (varsa): "568825-K7m2Pq9aB3"
  let belgeNo = '';
  try {
    const TesvikModel = proc.tesvikModel === 'YeniTesvik'
      ? require('../../models/YeniTesvik')
      : require('../../models/Tesvik');
    const doc = await TesvikModel.findById(proc.tesvikId).select('belgeYonetimi.belgeNo').lean();
    belgeNo = doc?.belgeYonetimi?.belgeNo || '';
  } catch (_) { /* belge no alınamazsa sadece kısa kod kullanılır */ }

  // Geçerli + zaten istenen biçimdeyse aynen kullan; değilse (eski uzun token ya da
  // belge no öneki eksikse) okunaklı yeni biçime YÜKSELT.
  const gecerli = proc.uploadToken && !tokenService.isExpired(proc.uploadTokenExpiresAt);
  if (gecerli && tokenService.isPreferredToken(proc.uploadToken, belgeNo)) {
    return tokenService.buildUploadLink(proc.uploadToken);
  }

  proc.uploadToken = tokenService.generateToken(belgeNo);
  proc.uploadTokenExpiresAt = tokenService.computeExpiry(days);
  await proc.save();
  await addLog({ proc, actionType: PROCESS_ACTION.UPLOAD_LINK_CREATED, note: 'Public yükleme linki üretildi', meta: { expiresAt: proc.uploadTokenExpiresAt }, user });
  return tokenService.buildUploadLink(proc.uploadToken);
}

// 🔔 Firma/tedarikçi public link üzerinden evrak yükleyince ekibe bilgilendirme maili.
// Alıcı: UPLOAD_NOTIFY_EMAIL → yoksa SMTP_FROM_EMAIL → yoksa SMTP_USER (kendi gelen kutunuz).
// Best-effort: hata yüklemeyi etkilemez (controller'da .catch ile çağrılır).
async function notifyUploadReceived(proc, { count = 1, documentType = '', uploaderType = '', uploaderName = '', note = '' } = {}) {
  if (!mailService.isConfigured()) return false;
  const to = process.env.UPLOAD_NOTIFY_EMAIL || process.env.SMTP_FROM_EMAIL || process.env.SMTP_USER;
  if (!to) return false;

  const turLabel = (DOCUMENT_TYPES.find((d) => d.key === documentType) || {}).label || documentType || 'Diğer';
  const kim = uploaderType === 'supplier' ? 'Tedarikçi' : 'Firma';
  const subject = `Yeni evrak yüklendi - ${proc.firmaName || 'Firma'}${proc.machineName ? ` - ${proc.machineName}` : ''}`;
  const lines = [
    'Public yükleme bağlantısı üzerinden yeni evrak yüklendi:',
    '',
    `Firma: ${proc.firmaName || '-'}`,
    `Belge No: ${proc.documentNo || '-'}`,
    `Makine: ${proc.machineName || '-'}${proc.siraNo ? ` (${proc.siraNo}. sıra)` : ''}`,
    `Evrak Türü: ${turLabel}`,
    `Dosya Adedi: ${count}`,
    `Yükleyen: ${kim}${uploaderName ? ` - ${uploaderName}` : ''}`
  ];
  if (note) lines.push(`Not: ${note}`);
  lines.push('', 'Detay için Teşvik Makine Yönetimi ekranından ilgili süreci kontrol edebilirsiniz.');

  await mailService.sendMail({ to, subject, text: lines.join('\n') });
  return true;
}

// Yüklenen evrakı kaydet (admin veya public). storageService.saveBuffer çıktısı (saved) + boyut/mime ile çağrılır.
async function recordUploadedDocument({ proc, documentType = 'diger', saved, fileSize = 0, mimeType = '', uploadedBy = null, uploadedByType = 'admin', uploaderName = '', note = '', originalName = '' }) {
  const folder = proc.folderId ? await DocumentFolder.findById(proc.folderId) : await ensureFolders(proc);
  const doc = await UploadedDocument.create({
    tesvikModel: proc.tesvikModel, tesvikId: proc.tesvikId, machineProcessId: proc._id, rowId: proc.rowId,
    folderId: folder ? folder._id : null,
    documentType,
    fileName: saved.fileName, originalName: originalName || saved.fileName,
    fileUrl: saved.fileUrl, filePath: saved.relPath, providerFileId: saved.providerFileId || '',
    fileSize: fileSize || 0, mimeType: mimeType || '',
    uploadedBy, uploadedByType, uploaderName, note, seenByAdmin: uploadedByType === 'admin'
  });
  proc.documentCount = (proc.documentCount || 0) + 1;
  await proc.save();
  await addLog({
    proc, actionType: PROCESS_ACTION.DOCUMENT_UPLOADED,
    note: `Evrak yüklendi: ${doc.originalName} (${documentType})`,
    meta: { uploadedDocumentId: doc._id, documentType, uploadedByType },
    performedByLabel: uploadedByType === 'admin' ? (uploaderName || 'Admin') : `${uploadedByType} (link)`,
    user: uploadedBy ? { _id: uploadedBy, adSoyad: uploaderName } : null
  });

  // Konservatif otomatik durum ilerletme (asla geri almaz)
  await maybeAdvanceOnUpload(proc, documentType);
  return doc;
}

async function maybeAdvanceOnUpload(proc, documentType) {
  const map = {
    kdv_muafiyet: { from: [MACHINE_STATUS.WAITING_KDV_EXEMPTION], to: MACHINE_STATUS.KDV_EXEMPTION_UPLOADED },
    fatura_taslak: { from: [MACHINE_STATUS.WAITING_INVOICE_DRAFT], to: MACHINE_STATUS.INVOICE_DRAFT_RECEIVED }
  };
  const rule = map[documentType];
  if (rule && rule.from.includes(proc.status)) {
    await changeStatus(proc, rule.to, { note: 'Evrak yüklemesi ile otomatik ilerletildi', actionType: PROCESS_ACTION.STATUS_CHANGE });
  }
}

// ───────────────────────── Timeline ─────────────────────────
async function getTimeline(proc) {
  const logs = await MachineProcessLog.find({ machineProcessId: proc._id }).sort({ createdAt: -1 }).limit(500).lean();
  return logs.map((l) => ({
    id: l._id,
    at: l.createdAt,
    actionType: l.actionType,
    oldStatus: l.oldStatus,
    newStatus: l.newStatus,
    oldStatusLabel: l.oldStatus ? status.getStatusLabel(l.oldStatus) : '',
    newStatusLabel: l.newStatus ? status.getStatusLabel(l.newStatus) : '',
    note: l.note,
    meta: l.meta,
    by: l.performedByLabel || 'Sistem'
  }));
}

module.exports = {
  // helpers
  reminderDays, getSignature, autoSendDefault, parseEmails, audienceForTemplate, buildContext, addLog,
  // core
  ensureProcess, listForCertificate, updateFields, changeStatus,
  composeMail, previewMail, createDraftMail, sendProcessMail, resendMail,
  setBarcode,
  scheduleReminder, stopReminders, resumeReminders, sendReminderForJob,
  ensureFolders, ensureUploadLink, recordUploadedDocument, notifyUploadReceived, getTimeline
};
