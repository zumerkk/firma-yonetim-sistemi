// ☁️ Google Drive istemcisi — bağımlılıksız (https + crypto)
//
// Yedek dosyalarını Drive'a koyar. `googleapis` paketi eklenmedi: onlarca MB'lık bir
// bağımlılık için burada yalnız 4 çağrı gerekiyor (token, yükle, listele, sil).
//
// İKİ KİMLİK YOLU — hangisi yapılandırıldıysa o kullanılır:
//
// 1) KULLANICI YETKİSİ (önerilen, ücretsiz Gmail hesaplarında da çalışır)
//    GOOGLE_OAUTH_CLIENT_ID / GOOGLE_OAUTH_CLIENT_SECRET / GOOGLE_OAUTH_REFRESH_TOKEN
//    Dosyalar kullanıcının 15 GB'lık alanına yazılır. Tek seferlik onay için
//    `node scripts/driveYetkiAl.js` çalıştırılır.
//
// 2) SERVİS HESABI (yalnız Google Workspace + Ortak Drive)
//    GOOGLE_SERVICE_ACCOUNT_JSON (ham JSON ya da base64)
//    ⚠️ Servis hesabının KENDİ depolama kotası YOKTUR: kişisel bir Drive klasörüne
//    yüklemeye çalışırsa "Service Accounts do not have storage quota" hatası alır.
//    Bu yüzden yalnız Ortak Drive (Shared Drive) ile kullanılmalıdır.

const https = require('https');
const crypto = require('crypto');

const TOKEN_UCU = 'https://oauth2.googleapis.com/token';
const KAPSAM = 'https://www.googleapis.com/auth/drive';

// ───────────────────────── küçük HTTP yardımcıları ─────────────────────────

function istek(secenekler, govde) {
  return new Promise((resolve, reject) => {
    const req = https.request(secenekler, (res) => {
      const parcalar = [];
      res.on('data', (p) => parcalar.push(p));
      res.on('end', () => resolve({ kod: res.statusCode, basliklar: res.headers, metin: Buffer.concat(parcalar).toString('utf8') }));
    });
    req.on('error', reject);
    if (govde && typeof govde.pipe === 'function') govde.pipe(req);
    else { if (govde) req.write(govde); req.end(); }
  });
}

async function json(secenekler, govde) {
  const y = await istek(secenekler, govde);
  let veri = null;
  try { veri = y.metin ? JSON.parse(y.metin) : null; } catch (_) { /* metin olabilir */ }
  if (y.kod >= 400) {
    const mesaj = veri?.error?.message || veri?.error_description || y.metin?.slice(0, 200) || `HTTP ${y.kod}`;
    const e = new Error(`Drive: ${mesaj}`);
    e.kod = y.kod;
    throw e;
  }
  return { veri, basliklar: y.basliklar };
}

const b64url = (b) => Buffer.from(b).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

// ───────────────────────── yapılandırma ─────────────────────────

function servisHesabi() {
  const ham = process.env.GOOGLE_SERVICE_ACCOUNT_JSON;
  if (!ham) return null;
  const metin = ham.trim().startsWith('{') ? ham : Buffer.from(ham, 'base64').toString('utf8');
  try {
    const k = JSON.parse(metin);
    return k.client_email && k.private_key ? k : null;
  } catch (_) { return null; }
}

function oauthBilgisi() {
  const { GOOGLE_OAUTH_CLIENT_ID: id, GOOGLE_OAUTH_CLIENT_SECRET: sir, GOOGLE_OAUTH_REFRESH_TOKEN: tazeleme } = process.env;
  return id && sir && tazeleme ? { id, sir, tazeleme } : null;
}

/** Drive yedeği yapılandırılmış mı? */
const yapilandirildiMi = () => Boolean((oauthBilgisi() || servisHesabi()) && process.env.YEDEK_DRIVE_KLASOR_ID);

/** Hangi yol kullanılıyor: 'oauth' | 'servis-hesabi' | null */
const kimlikYolu = () => (oauthBilgisi() ? 'oauth' : (servisHesabi() ? 'servis-hesabi' : null));

// ───────────────────────── erişim tokenı ─────────────────────────

let _token = null;   // { deger, bitis }

async function erisimTokeni() {
  if (_token && _token.bitis > Date.now() + 60000) return _token.deger;

  const oauth = oauthBilgisi();
  if (oauth) {
    const govde = new URLSearchParams({
      client_id: oauth.id, client_secret: oauth.sir,
      refresh_token: oauth.tazeleme, grant_type: 'refresh_token'
    }).toString();
    const { veri } = await json({
      method: 'POST', hostname: 'oauth2.googleapis.com', path: '/token',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'Content-Length': Buffer.byteLength(govde) }
    }, govde);
    _token = { deger: veri.access_token, bitis: Date.now() + (veri.expires_in || 3600) * 1000 };
    return _token.deger;
  }

  const sh = servisHesabi();
  if (!sh) { const e = new Error('Drive kimlik bilgisi yok (OAuth ya da servis hesabı gerekli).'); e.code = 'YEDEK_YAPILANDIRILMAMIS'; throw e; }

  const simdi = Math.floor(Date.now() / 1000);
  const baslik = b64url(JSON.stringify({ alg: 'RS256', typ: 'JWT' }));
  const iddia = b64url(JSON.stringify({
    iss: sh.client_email, scope: KAPSAM, aud: TOKEN_UCU, iat: simdi, exp: simdi + 3600
  }));
  const imza = crypto.createSign('RSA-SHA256').update(`${baslik}.${iddia}`).end()
    .sign(sh.private_key.replace(/\\n/g, '\n'));
  const jwt = `${baslik}.${iddia}.${b64url(imza)}`;

  const govde = new URLSearchParams({ grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer', assertion: jwt }).toString();
  const { veri } = await json({
    method: 'POST', hostname: 'oauth2.googleapis.com', path: '/token',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'Content-Length': Buffer.byteLength(govde) }
  }, govde);
  _token = { deger: veri.access_token, bitis: Date.now() + (veri.expires_in || 3600) * 1000 };
  return _token.deger;
}

const tokenSifirla = () => { _token = null; };   // testler ve kimlik değişimi için

// ───────────────────────── Drive işlemleri ─────────────────────────

const ORTAK = 'supportsAllDrives=true&includeItemsFromAllDrives=true';

/** Klasörü adıyla bulur, yoksa oluşturur. @returns {Promise<string>} klasör id */
async function klasorSagla(ad, ustId) {
  const token = await erisimTokeni();
  const sorgu = encodeURIComponent(`name='${String(ad).replace(/'/g, "\\'")}' and '${ustId}' in parents and mimeType='application/vnd.google-apps.folder' and trashed=false`);
  const { veri } = await json({
    method: 'GET', hostname: 'www.googleapis.com',
    path: `/drive/v3/files?q=${sorgu}&fields=files(id,name)&${ORTAK}`,
    headers: { Authorization: `Bearer ${token}` }
  });
  if (veri.files && veri.files.length) return veri.files[0].id;

  const govde = JSON.stringify({ name: ad, mimeType: 'application/vnd.google-apps.folder', parents: [ustId] });
  const { veri: yeni } = await json({
    method: 'POST', hostname: 'www.googleapis.com', path: `/drive/v3/files?fields=id&${ORTAK}`,
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(govde) }
  }, govde);
  return yeni.id;
}

/**
 * Dosyayı akıştan yükler (resumable): büyük ZIP ve evraklar bellekte tutulmaz.
 * @returns {Promise<{id:string, name:string, size:number}>}
 */
async function dosyaYukle({ ad, mimeType = 'application/octet-stream', akis, klasorId }) {
  const token = await erisimTokeni();
  const ustveri = JSON.stringify({ name: ad, parents: [klasorId] });

  const baslat = await istek({
    method: 'POST', hostname: 'www.googleapis.com',
    path: `/upload/drive/v3/files?uploadType=resumable&fields=id,name,size&${ORTAK}`,
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json; charset=UTF-8',
      'X-Upload-Content-Type': mimeType,
      'Content-Length': Buffer.byteLength(ustveri)
    }
  }, ustveri);
  if (baslat.kod >= 400) throw new Error(`Drive yükleme başlatılamadı: ${baslat.metin.slice(0, 200)}`);
  const konum = baslat.basliklar.location;
  if (!konum) throw new Error('Drive yükleme adresi (Location) dönmedi.');

  const u = new URL(konum);
  const { veri } = await json({
    method: 'PUT', hostname: u.hostname, path: u.pathname + u.search,
    headers: { 'Content-Type': mimeType }
  }, akis);
  return veri;
}

/** Klasördeki dosyalar (ada göre süzülebilir) */
async function listele(klasorId, { adOneki = '', enFazla = 1000 } = {}) {
  const token = await erisimTokeni();
  let sorgu = `'${klasorId}' in parents and trashed=false`;
  if (adOneki) sorgu += ` and name contains '${String(adOneki).replace(/'/g, "\\'")}'`;
  const dosyalar = [];
  let sayfa = '';
  do {
    const { veri } = await json({
      method: 'GET', hostname: 'www.googleapis.com',
      path: `/drive/v3/files?q=${encodeURIComponent(sorgu)}&fields=nextPageToken,files(id,name,size,createdTime)&pageSize=200&${ORTAK}${sayfa ? `&pageToken=${sayfa}` : ''}`,
      headers: { Authorization: `Bearer ${token}` }
    });
    dosyalar.push(...(veri.files || []));
    sayfa = veri.nextPageToken || '';
  } while (sayfa && dosyalar.length < enFazla);
  return dosyalar;
}

async function sil(dosyaId) {
  const token = await erisimTokeni();
  await json({
    method: 'DELETE', hostname: 'www.googleapis.com', path: `/drive/v3/files/${dosyaId}?${ORTAK}`,
    headers: { Authorization: `Bearer ${token}` }
  });
}

module.exports = { yapilandirildiMi, kimlikYolu, erisimTokeni, tokenSifirla, klasorSagla, dosyaYukle, listele, sil };
