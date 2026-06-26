// 🔐 UPLOAD TOKEN SERVICE - Tahmin edilemez public yükleme tokenları
// crypto.randomBytes ile 256-bit token. Süre opsiyonel (UPLOAD_TOKEN_DAYS env veya parametre).

const crypto = require('crypto');

function generateToken() {
  // 32 byte → 43 karakter base64url (tahmin edilemez)
  return crypto.randomBytes(32).toString('base64url');
}

// days verilmezse env'e, o da yoksa null'a (süresiz) düşer
function computeExpiry(days) {
  const d = days !== undefined && days !== null && days !== ''
    ? Number(days)
    : (process.env.UPLOAD_TOKEN_DAYS ? Number(process.env.UPLOAD_TOKEN_DAYS) : null);
  if (!d || Number.isNaN(d) || d <= 0) return null; // süresiz
  const exp = new Date();
  exp.setDate(exp.getDate() + d);
  return exp;
}

function isExpired(expiresAt) {
  if (!expiresAt) return false; // süresiz
  return new Date(expiresAt).getTime() < Date.now();
}

// Public link (frontend route).
// Öncelik: UPLOAD_PUBLIC_BASE_URL (müşteriye gösterilecek özel/şık alan adı, ör. https://gmplanlama.com)
//          → yoksa FRONTEND_URL → yoksa göreli path.
// NOT: FRONTEND_URL CORS için virgülle birden çok origin içerebilir
// ("https://a.com,https://b.com"); link tabanı olarak yalnızca İLK adresi alırız,
// aksi halde link "https://a.com,https://b.com/upload/..." gibi bozuk çıkar.
function buildUploadLink(token) {
  const raw = process.env.UPLOAD_PUBLIC_BASE_URL || process.env.FRONTEND_URL || '';
  const base = String(raw).split(',')[0].trim().replace(/\/$/, '');
  const path = `/upload/tesvik/${token}`;
  return base ? `${base}${path}` : path;
}

module.exports = { generateToken, computeExpiry, isExpired, buildUploadLink };
