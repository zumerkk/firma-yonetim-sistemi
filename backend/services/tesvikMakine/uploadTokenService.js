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

// Belge no'yu URL-dostu önek tabanına çevir (özel karakterleri at)
function sanitizeBelgeNo(belgeNo) {
  return belgeNo ? String(belgeNo).trim().replace(/[^A-Za-z0-9]/g, '') : '';
}

// Public yükleme tokenı.
// Belge no verilirse okunaklı önek olarak eklenir: "568825-K7m2Pq9aB3".
// Arkadaki kısa kod tahmin edilemezliği sağlar (link herkese açık olduğundan şart).
// Belge no yoksa yalnızca kısa kod döner.
function generateToken(belgeNo) {
  const code = shortCode(10);
  const prefix = sanitizeBelgeNo(belgeNo);
  return prefix ? `${prefix}-${code}` : code;
}

// Elde geçerli bir token varsa KORUNUR — yenisi üretilmez.
//
// Müşteri (23.09.2026): "İçerikte bazı değişiklikler yapacağız … dosya takip sistemindeki
// linklerin ve gelen evrakların kaybolmaması gerekiyor."
// Eskiden token "okunaklı biçimde değilse" (belge no öneki tutmuyorsa) yenileniyordu.
// Belge no revizede değişebildiği ve işlem türü adı düzenlenebildiği için bu, FİRMAYA
// ÇOKTAN GİTMİŞ linkleri sessizce öldürüyordu: firma eski linkte "Bağlantı geçersiz" görüyordu.
// Önek artık yalnız YENİ token üretirken okunaklılık için kullanılır.
function korunmaliMi(token, expiresAt) {
  return Boolean(token) && !isExpired(expiresAt);
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
//
// routePrefix: token'ı çözecek FRONTEND sayfasının yolu. Varsayılan teşvik-makine
// evrak yükleme sayfasıdır. İşlem & Evrak modülü kendi sayfasını (/evrak) geçirir —
// aksi halde firma yanlış sayfaya düşüp "Bağlantı geçersiz" hatası alır
// (müşteri: "maildeki yükleme linkine Bağlantı bulunamadı veya geçersiz diyor").
const VARSAYILAN_ROUTE = '/upload/tesvik';

function buildUploadLink(token, routePrefix = VARSAYILAN_ROUTE) {
  const raw = process.env.UPLOAD_PUBLIC_BASE_URL || process.env.FRONTEND_URL || '';
  const base = String(raw).split(',')[0].trim().replace(/\/$/, '');
  const onek = String(routePrefix || VARSAYILAN_ROUTE).replace(/\/$/, '');
  const path = `${onek}/${token}`;
  return base ? `${base}${path}` : path;
}

module.exports = {
  generateToken, korunmaliMi, sanitizeBelgeNo, computeExpiry, isExpired,
  buildUploadLink, VARSAYILAN_ROUTE
};
