// 🔐 UPLOAD TOKEN SERVICE - Tahmin edilemez public yükleme tokenları
// crypto.randomBytes ile 256-bit token. Süre opsiyonel (UPLOAD_TOKEN_DAYS env veya parametre).

const crypto = require('crypto');

// URL-dostu kısa kod (base62) — tahmin edilemez güvenlik parçası
// 10 karakter ≈ 62^10 ≈ 8.4×10^17 olasılık (public link için fazlasıyla yeterli)
function shortCode(len = 10) {
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  const bytes = crypto.randomBytes(len);
  let out = '';
  for (let i = 0; i < len; i++) out += alphabet[bytes[i] % 62];
  return out;
}

// Public yükleme tokenı.
// Belge no verilirse okunaklı önek olarak eklenir: "568825-K7m2Pq9aB3".
// Arkadaki kısa kod tahmin edilemezliği sağlar (link herkese açık olduğundan şart).
// Belge no yoksa yalnızca kısa kod döner.
function generateToken(belgeNo) {
  const code = shortCode(10);
  const prefix = belgeNo ? String(belgeNo).trim().replace(/[^A-Za-z0-9]/g, '') : '';
  return prefix ? `${prefix}-${code}` : code;
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
