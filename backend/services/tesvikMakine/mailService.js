// 📮 MAIL SERVICE - Kurumsal SMTP gönderimi (nodemailer)
// NOT: Mevcut notificationService.js hatalı `createTransporter` kullanıyor (bozuk).
// Bu servis DOĞRU `createTransport` ile, spec'in SMTP_* env değişkenleriyle çalışır.
// Hatalar sunucu tarafında loglanır; çağırana sade mesaj döner (ham stack sızdırılmaz).

const nodemailer = require('nodemailer');

let cachedTransporter = null;
let cachedSignature = null;

function envBool(v, def = false) {
  if (v === undefined || v === null || v === '') return def;
  return String(v).toLowerCase() === 'true' || v === '1';
}

// SMTP yapılandırılmış mı?
function isConfigured() {
  return Boolean(process.env.SMTP_HOST && process.env.SMTP_USER);
}

function fromAddress() {
  const name = process.env.SMTP_FROM_NAME || process.env.APP_NAME || 'GM Planlama';
  const email = process.env.SMTP_FROM_EMAIL || process.env.SMTP_FROM || process.env.SMTP_USER;
  return `"${name}" <${email}>`;
}

function getTransporter() {
  if (cachedTransporter) return cachedTransporter;
  if (!isConfigured()) {
    const err = new Error('SMTP yapılandırması eksik. Lütfen SMTP_HOST ve SMTP_USER ayarlarını yapın.');
    err.code = 'SMTP_NOT_CONFIGURED';
    throw err;
  }
  cachedTransporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT) || 587,
    secure: envBool(process.env.SMTP_SECURE, false), // 465 için true, 587 için false
    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
    tls: { rejectUnauthorized: false }
  });
  return cachedTransporter;
}

// Test bağlantısı (admin "SMTP test" için)
async function verify() {
  const transporter = getTransporter();
  await transporter.verify();
  return true;
}

// Düz metni güvenli, sade kurumsal HTML'e çevirir (emoji/pazarlama yok)
function escapeHtml(s = '') {
  return String(s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

function textToHtml(text = '') {
  const safe = escapeHtml(text).replace(/\r\n|\r|\n/g, '<br>');
  return `<!DOCTYPE html><html lang="tr"><head><meta charset="utf-8">` +
    `<meta name="viewport" content="width=device-width, initial-scale=1.0"></head>` +
    `<body style="margin:0;padding:0;background:#f4f5f7;">` +
    `<div style="max-width:640px;margin:0 auto;padding:24px;font-family:Arial,Helvetica,sans-serif;` +
    `font-size:14px;line-height:1.6;color:#222;background:#ffffff;">${safe}</div></body></html>`;
}

function asList(v) {
  if (!v) return [];
  if (Array.isArray(v)) return v.filter(Boolean);
  return String(v).split(/[;,]/).map((s) => s.trim()).filter(Boolean);
}

// 📧 Mail gönder. Başarılıda { messageId } döner; başarısızda sade Error fırlatır.
async function sendMail({ to, cc, subject, text, html, attachments = [] }) {
  const toList = asList(to);
  const ccList = asList(cc);
  if (toList.length === 0) {
    const err = new Error('Alıcı (to) e-posta adresi boş.');
    err.code = 'NO_RECIPIENT';
    throw err;
  }

  const transporter = getTransporter();
  const mailOptions = {
    from: fromAddress(),
    to: toList.join(', '),
    cc: ccList.length ? ccList.join(', ') : undefined,
    subject: subject || '',
    text: text || '',
    html: html || textToHtml(text || ''),
    attachments
  };

  try {
    const result = await transporter.sendMail(mailOptions);
    return { messageId: result.messageId, accepted: result.accepted, rejected: result.rejected };
  } catch (error) {
    // Ham hatayı sunucuda logla, çağırana sade mesaj ver
    console.error('🚨 [mailService] SMTP gönderim hatası:', error && error.message);
    const friendly = new Error(humanizeSmtpError(error));
    friendly.code = error && error.code ? error.code : 'SMTP_SEND_FAILED';
    friendly.original = error && error.message;
    throw friendly;
  }
}

function humanizeSmtpError(error) {
  const code = error && error.code;
  switch (code) {
    case 'EAUTH': return 'SMTP kimlik doğrulama başarısız (kullanıcı adı/şifre). Ayarları kontrol edin.';
    case 'ECONNECTION':
    case 'ETIMEDOUT':
    case 'ESOCKET': return 'SMTP sunucusuna bağlanılamadı. Host/port/secure ayarlarını kontrol edin.';
    case 'EENVELOPE': return 'Gönderici/alıcı adresi reddedildi. E-posta adreslerini kontrol edin.';
    default: return 'Mail gönderilemedi. Lütfen SMTP ayarlarını ve internet bağlantısını kontrol edin.';
  }
}

// Test edilebilirlik için transporter cache'ini sıfırla
function _resetCache() { cachedTransporter = null; cachedSignature = null; }

module.exports = { isConfigured, getTransporter, verify, sendMail, fromAddress, textToHtml, asList, _resetCache };
