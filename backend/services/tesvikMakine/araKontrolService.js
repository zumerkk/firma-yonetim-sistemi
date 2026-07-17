// 📮 ARA KONTROL SERVİSİ — Belge geneli firma maili (Makine Listesi + Fatura Talebi)
// Tedarikçi akışından (makine süreci bazlı) farkı: alıcı FİRMA, kapsam belgenin TAMAMI.
// Public yükleme linki teşvik dokümanının üzerinde yaşar (araKontrol.uploadToken);
// tesvikEvrakUploadController token'ı önce makine süreçlerinde, sonra burada arar.

const ExcelJS = require('exceljs');
const Tesvik = require('../../models/Tesvik');
const YeniTesvik = require('../../models/YeniTesvik');
const MailLog = require('../../models/MailLog');
const UploadedDocument = require('../../models/UploadedDocument');
const {
  MAIL_TEMPLATE_CODE, MAIL_STATUS, DEFAULT_SIGNATURE, DOCUMENT_TYPES
} = require('../../constants/tesvikMakineMail');
const tokenService = require('./uploadTokenService');
const resolver = require('./certificateResolver');
const { resolveTemplate } = require('./mailTemplateProvider');
const engine = require('./mailTemplateEngine');
const mailService = require('./mailService');

function getModel(tesvikModel) {
  if (tesvikModel === 'YeniTesvik') return YeniTesvik;
  if (tesvikModel === 'Tesvik') return Tesvik;
  const e = new Error(`Geçersiz tesvikModel: ${tesvikModel}`); e.code = 'BAD_MODEL'; throw e;
}

// machineProcessService.getSignature ile aynı kural (env override → varsayılan imza)
function getSignature() {
  const s = process.env.MAIL_SIGNATURE;
  if (s && s.trim()) return s.replace(/\\n/g, '\n');
  return DEFAULT_SIGNATURE;
}

async function loadCert(tesvikModel, tesvikId) {
  const cert = await resolver.loadCertificate(tesvikModel, tesvikId, { populateFirma: true });
  if (!cert) { const e = new Error('Teşvik belgesi bulunamadı.'); e.code = 'CERT_NOT_FOUND'; throw e; }
  return cert;
}

// 🔗 Belge geneli public yükleme linki — makine linkleriyle aynı biçim/yükseltme kuralları
// ("<belgeNo>-<kısa kod>"). updateOne kullanılır: kısmi select edilmiş dokümanı save etmek
// diğer alanların validasyonunu tetikleyebilir, $set bundan kaçınır.
async function ensureBelgeUploadLink(tesvikModel, tesvikId, { days } = {}) {
  const Model = getModel(tesvikModel);
  const doc = await Model.findById(tesvikId).select('araKontrol belgeYonetimi.belgeNo').lean();
  if (!doc) { const e = new Error('Teşvik belgesi bulunamadı.'); e.code = 'CERT_NOT_FOUND'; throw e; }
  const belgeNo = doc.belgeYonetimi?.belgeNo || '';
  const mevcut = doc.araKontrol?.uploadToken || '';
  const gecerli = mevcut && !tokenService.isExpired(doc.araKontrol?.uploadTokenExpiresAt);
  if (gecerli && tokenService.isPreferredToken(mevcut, belgeNo)) {
    return tokenService.buildUploadLink(mevcut);
  }
  const token = tokenService.generateToken(belgeNo);
  const expiresAt = tokenService.computeExpiry(days);
  await Model.updateOne(
    { _id: tesvikId },
    { $set: { 'araKontrol.uploadToken': token, 'araKontrol.uploadTokenExpiresAt': expiresAt } }
  );
  return tokenService.buildUploadLink(token);
}

// 🔎 Public yükleme: token → belge (Tesvik → YeniTesvik sırasıyla aranır)
async function resolveBelgeByToken(token) {
  if (!token) return null;
  for (const [name, Model] of [['Tesvik', Tesvik], ['YeniTesvik', YeniTesvik]]) {
    const doc = await Model.findOne({ 'araKontrol.uploadToken': token });
    if (doc) {
      if (tokenService.isExpired(doc.araKontrol?.uploadTokenExpiresAt)) return { expired: true };
      return { tesvikModel: name, doc };
    }
  }
  return null;
}

// ✉️ Şablonu belge verisiyle doldur (gönderim ÖNCESİ serbestçe düzenlenebilir taslak döner)
async function composeAraKontrol({ tesvikModel, tesvikId, ekVar = false }) {
  const cert = await loadCert(tesvikModel, tesvikId);
  const identity = resolver.extractCertIdentity(cert);
  const uploadLink = await ensureBelgeUploadLink(tesvikModel, tesvikId);
  const tpl = await resolveTemplate(MAIL_TEMPLATE_CODE.ARA_KONTROL_FATURA_TALEBI);
  const data = {
    firmaAdi: identity.firmaName || '',
    belgeNo: identity.documentNo || '',
    // {listeBilgisi}: ek seçildiyse "ekte", seçilmediyse ayrıca iletileceği bilgisi —
    // müşteri isteği: "henüz bütün firmaların makinelerini sisteme giremedim"
    listeBilgisi: ekVar ? 'ekte yer almaktadır' : 'tarafımızca hazırlanmakta olup ayrıca iletilecektir',
    uploadLink,
    imza: getSignature()
  };
  const rendered = engine.renderTemplate(tpl, data);
  const firma = cert.firma && typeof cert.firma === 'object' ? cert.firma : null;
  const firmaEmail = (firma && (firma.firmaEmail || firma.email)) || '';
  return {
    templateCode: MAIL_TEMPLATE_CODE.ARA_KONTROL_FATURA_TALEBI,
    subject: rendered.subject,
    body: rendered.body,
    missing: rendered.missing,
    to: firmaEmail ? [firmaEmail] : [],
    cc: [],
    uploadLink,
    firmaAdi: data.firmaAdi,
    belgeNo: data.belgeNo,
    yerliSayisi: resolver.listFor(cert, 'local').length,
    ithalSayisi: resolver.listFor(cert, 'import').length,
    smtpConfigured: mailService.isConfigured()
  };
}

// 📊 Belgenin makine listesini Excel eki olarak üret (Yerli + İthal sayfaları)
async function buildMakineListesiXlsx(tesvikModel, tesvikId) {
  const cert = await loadCert(tesvikModel, tesvikId);
  const identity = resolver.extractCertIdentity(cert);
  const yerli = resolver.listFor(cert, 'local').map((r) => resolver.extractMachineFields(r, 'local'));
  const ithal = resolver.listFor(cert, 'import').map((r) => resolver.extractMachineFields(r, 'import'));

  const wb = new ExcelJS.Workbook();
  wb.creator = 'GM Planlama';
  const addSheet = (ad, satirlar, tlMi) => {
    const ws = wb.addWorksheet(ad);
    ws.columns = [
      { header: 'Sıra No', key: 'siraNo', width: 8 },
      { header: 'GTIP No', key: 'gtipNo', width: 16 },
      { header: 'Adı ve Özelliği', key: 'machineName', width: 55 },
      { header: 'Miktar', key: 'quantity', width: 9 },
      { header: 'Birim', key: 'unit', width: 14 },
      { header: 'Birim Fiyat', key: 'unitPrice', width: 14 },
      { header: tlMi ? 'Toplam (TL)' : 'Toplam ($)', key: 'totalPrice', width: 16 }
    ];
    ws.getRow(1).font = { bold: true };
    satirlar.forEach((m) => ws.addRow({
      siraNo: m.siraNo || '', gtipNo: m.gtipNo || '', machineName: m.machineName || '',
      quantity: m.quantity || 0, unit: m.unit || '', unitPrice: m.unitPrice || 0, totalPrice: m.totalPrice || 0
    }));
    ws.getColumn('unitPrice').numFmt = '#,##0.00';
    ws.getColumn('totalPrice').numFmt = '#,##0.00';
  };
  addSheet('Yerli', yerli, true);
  addSheet('İthal', ithal, false);

  const raw = await wb.xlsx.writeBuffer();
  const stem = String(identity.documentNo || cert.tesvikId || 'belge').replace(/[^\w.-]+/g, '_');
  return { buffer: Buffer.from(raw), fileName: `Makine_Listesi_${stem}.xlsx` };
}

// 📤 Gönderim — düzenlenmiş konu/içerik + ekler ile; MailLog belge bağıyla yazılır
async function sendAraKontrol({ tesvikModel, tesvikId, to = [], cc = [], subject = '', body = '', attachments = [], user = null }) {
  if (!Array.isArray(to) || to.length === 0) {
    const e = new Error('Gönderim için alıcı (to) e-posta adresi yok.'); e.code = 'NO_RECIPIENT'; throw e;
  }
  if (!String(subject).trim() || !String(body).trim()) {
    const e = new Error('Konu ve içerik boş olamaz.'); e.code = 'EMPTY_CONTENT'; throw e;
  }

  const log = await MailLog.create({
    tesvikModel, tesvikId, machineProcessId: null,
    templateCode: MAIL_TEMPLATE_CODE.ARA_KONTROL_FATURA_TALEBI,
    toEmails: to, ccEmails: cc, subject, body,
    status: MAIL_STATUS.DRAFT, createdByUserId: user ? user._id : null
  });

  try {
    const res = await mailService.sendMail({ to, cc, subject, text: body, attachments });
    log.status = MAIL_STATUS.SENT;
    log.smtpMessageId = res.messageId || '';
    log.sentAt = new Date();
    await log.save();
    return { mailLog: log, sent: true, ekSayisi: attachments.length };
  } catch (error) {
    log.status = MAIL_STATUS.FAILED;
    log.errorMessage = error.message || 'Gönderim hatası';
    await log.save();
    const e = new Error(error.message || 'Mail gönderilemedi');
    e.code = error.code || 'SMTP_SEND_FAILED'; e.mailLogId = log._id; throw e;
  }
}

// 🗂️ Public belge-geneli yüklemenin evrak kaydı (makine süreci YOK → machineProcessId null)
async function recordBelgeUpload({ tesvikModel, tesvikId, documentType = 'diger', saved, fileSize = 0, mimeType = '', uploadedByType = 'customer', uploaderName = '', note = '', originalName = '' }) {
  return UploadedDocument.create({
    tesvikModel, tesvikId, machineProcessId: null, rowId: null, folderId: null,
    documentType,
    fileName: saved.fileName, originalName: originalName || saved.fileName,
    fileUrl: saved.fileUrl, filePath: saved.relPath, providerFileId: saved.providerFileId || '',
    fileSize: fileSize || 0, mimeType: mimeType || '',
    uploadedBy: null, uploadedByType, uploaderName, note, seenByAdmin: false
  });
}

// 🔔 Belge-geneli yükleme bildirimi (makine akışındaki notifyUploadReceived'ın belge sürümü)
async function notifyBelgeUploadReceived({ identity, count = 1, documentType = '', uploaderName = '', note = '' } = {}) {
  if (!mailService.isConfigured()) return false;
  const to = process.env.UPLOAD_NOTIFY_EMAIL || process.env.SMTP_FROM_EMAIL || process.env.SMTP_USER;
  if (!to) return false;
  const turLabel = (DOCUMENT_TYPES.find((d) => d.key === documentType) || {}).label || documentType || 'Diğer';
  const subject = `Yeni evrak yüklendi - ${identity.firmaName || 'Firma'} (Ara Kontrol)`;
  const lines = [
    'Ara Kontrol (belge geneli) yükleme bağlantısı üzerinden yeni evrak yüklendi:',
    '',
    `Firma: ${identity.firmaName || '-'}`,
    `Belge No: ${identity.documentNo || '-'}`,
    `Evrak Türü: ${turLabel}`,
    `Dosya Adedi: ${count}`,
    `Yükleyen: Firma${uploaderName ? ` - ${uploaderName}` : ''}`
  ];
  if (note) lines.push(`Not: ${note}`);
  lines.push('', 'Detay için Teşvik Makine Yönetimi ekranından ilgili belgeyi kontrol edebilirsiniz.');
  await mailService.sendMail({ to, subject, text: lines.join('\n') });
  return true;
}

module.exports = {
  ensureBelgeUploadLink,
  resolveBelgeByToken,
  composeAraKontrol,
  buildMakineListesiXlsx,
  sendAraKontrol,
  recordBelgeUpload,
  notifyBelgeUploadReceived
};
