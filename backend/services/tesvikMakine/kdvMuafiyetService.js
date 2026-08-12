// 🧾 KDV MUAFİYET YAZISI SERVİSİ — belge geneli tek dosya + geçerlilik aralığı
//
// Müşteri talebi (WhatsApp, 13:02 / 13:51):
//   1) "teşvik belgelerinde en alta KDV muafiyet yazısı yüklemek için küçük bir alan" +
//      "yükledikten sonra başlangıç ve bitiş tarihi de girebilelim"
//   2) "bu kdv muafiyet yazısı ekini biz sisteme yüklesek karşı tarafa
//      'kdv muafiyet yazısını bu linkten indirebilirsiniz' olarak güncelleyebilir miyiz ekten ziyade"
//
// Dosya, belgenin evrak klasöründe (01_Belge_Kunyesi/KDV_Muafiyet) saklanır; dışarıya
// yalnızca tahmin edilemez token üzerinden (public sayfa → stream proxy) sunulur.
// Doküman yazımı updateOne/$set ile yapılır: kısmi select edilmiş teşvik dokümanını
// save() etmek diğer alanların validasyonunu ve revizyon hook'larını tetikler
// (araKontrolService.ensureBelgeUploadLink ile aynı gerekçe).

const cloudinary = require('cloudinary').v2;
const Tesvik = require('../../models/Tesvik');
const YeniTesvik = require('../../models/YeniTesvik');
const tokenService = require('./uploadTokenService');
const storageService = require('./storageService');
const resolver = require('./certificateResolver');

// Public indirme sayfasının FRONTEND yolu (token'ı bu sayfa çözer)
const INDIRME_ROUTE = '/kdv-muafiyet';
// Belge klasörü içindeki alt klasör
const KDV_KLASOR = '01_Belge_Kunyesi/KDV_Muafiyet';
const SELECT_ALANLARI = 'kdvMuafiyetYazisi belgeYonetimi.belgeNo';

function getModel(tesvikModel) {
  if (tesvikModel === 'YeniTesvik') return YeniTesvik;
  if (tesvikModel === 'Tesvik') return Tesvik;
  const e = new Error(`Geçersiz tesvikModel: ${tesvikModel}`); e.code = 'BAD_MODEL'; throw e;
}

function notFound() {
  const e = new Error('Teşvik belgesi bulunamadı.'); e.code = 'CERT_NOT_FOUND'; return e;
}

// İmzalı Cloudinary URL'i üretebilmek için config şart. Modül yükleme sırasına
// güvenmemek adına indirme anında (idempotent) uygulanır.
function ensureCloudinary() {
  if (!process.env.CLOUDINARY_API_KEY || !process.env.CLOUDINARY_API_SECRET) return;
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
  });
}

// "2026-08-11" / Date / '' → Date | null (geçersiz girdi null'a düşer, throw etmez)
function parseTarih(v) {
  if (v === undefined || v === null || v === '') return null;
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? null : d;
}

// Gün bazlı karşılaştırma: bitiş tarihi "o günün sonuna kadar geçerli" sayılır,
// başlangıç tarihi "o günün başından itibaren". Saat farkı yüzünden yazının
// son gününde geçersiz görünmesini engeller.
function gunBasi(d) { const x = new Date(d); x.setHours(0, 0, 0, 0); return x; }
function gunSonu(d) { const x = new Date(d); x.setHours(23, 59, 59, 999); return x; }

// Geçerlilik durumu — tarih girilmemişse o yönden kısıt yoktur (süresiz).
function gecerlilikDurumu(kdv) {
  const simdi = new Date();
  const bas = kdv?.gecerlilikBaslangic ? gunBasi(kdv.gecerlilikBaslangic) : null;
  const bit = kdv?.gecerlilikBitis ? gunSonu(kdv.gecerlilikBitis) : null;
  const henuzBaslamadi = Boolean(bas && simdi < bas);
  const suresiDoldu = Boolean(bit && simdi > bit);
  return { henuzBaslamadi, suresiDoldu, gecerliMi: !henuzBaslamadi && !suresiDoldu };
}

function dosyaVarMi(kdv) {
  return Boolean(kdv && (kdv.dosyaUrl || kdv.dosyaYolu));
}

// Public indirme linki (frontend sayfası). Dosya/token yoksa boş string.
function buildIndirmeLinki(kdv) {
  if (!dosyaVarMi(kdv) || !kdv.indirmeToken) return '';
  return tokenService.buildUploadLink(kdv.indirmeToken, INDIRME_ROUTE);
}

// Arayüz/mail için sadeleştirilmiş özet (hassas alan içermez: dosyaYolu/publicId dışarı çıkmaz)
function ozet(kdv) {
  if (!dosyaVarMi(kdv)) {
    return { varMi: false, gecerliMi: false, henuzBaslamadi: false, suresiDoldu: false, indirmeLinki: '' };
  }
  const durum = gecerlilikDurumu(kdv);
  return {
    varMi: true,
    dosyaAdi: kdv.orijinalAd || kdv.dosyaAdi || '',
    boyut: kdv.boyut || 0,
    mimeType: kdv.mimeType || '',
    gecerlilikBaslangic: kdv.gecerlilikBaslangic || null,
    gecerlilikBitis: kdv.gecerlilikBitis || null,
    yuklenmeTarihi: kdv.yuklenmeTarihi || null,
    indirmeLinki: buildIndirmeLinki(kdv),
    ...durum
  };
}

// ───────────────────────── Okuma ─────────────────────────

async function getOzet(tesvikModel, tesvikId) {
  const Model = getModel(tesvikModel);
  const doc = await Model.findById(tesvikId).select(SELECT_ALANLARI).lean();
  if (!doc) throw notFound();
  return ozet(doc.kdvMuafiyetYazisi);
}

// 🔎 Public indirme: token → belge (Tesvik → YeniTesvik sırasıyla aranır)
async function resolveByToken(token) {
  if (!token) return null;
  for (const [name, Model] of [['Tesvik', Tesvik], ['YeniTesvik', YeniTesvik]]) {
    const doc = await Model.findOne({ 'kdvMuafiyetYazisi.indirmeToken': token })
      .select('kdvMuafiyetYazisi belgeYonetimi yatirimciUnvan kunyeBilgileri firma')
      .lean();
    if (doc && dosyaVarMi(doc.kdvMuafiyetYazisi)) return { tesvikModel: name, doc, kdv: doc.kdvMuafiyetYazisi };
  }
  return null;
}

// ───────────────────────── Yazma ─────────────────────────

// Dosya + tarihler kaydeder. Eskisi varsa depodan silinir (belge başına TEK yazı tutulur).
async function saveDosya({ tesvikModel, tesvikId, file, gecerlilikBaslangic, gecerlilikBitis, user }) {
  if (!file || !file.buffer) { const e = new Error('Dosya bulunamadı.'); e.code = 'NO_FILE'; throw e; }
  const Model = getModel(tesvikModel);
  const cert = await resolver.loadCertificate(tesvikModel, tesvikId, { populateFirma: true });
  if (!cert) throw notFound();

  const identity = resolver.extractCertIdentity(cert);
  await storageService.ensureCertificateStructure(identity);
  const saved = await storageService.saveBuffer({
    folderRel: storageService.certificateFolderRel(identity),
    documentTypeFolder: KDV_KLASOR,
    originalName: file.originalname,
    buffer: file.buffer
  });

  // Token: mevcut yazı değiştirilse bile eski link çalışmaya devam etsin diye korunur;
  // yoksa belge no önekli yeni token üretilir ("578589-K7m2Pq9aB3").
  const mevcut = cert.kdvMuafiyetYazisi || {};
  const token = mevcut.indirmeToken || tokenService.generateToken(identity.documentNo);

  const yeni = {
    dosyaAdi: saved.fileName,
    orijinalAd: file.originalname || saved.fileName,
    dosyaYolu: saved.filePath || saved.relPath || '',
    dosyaUrl: saved.fileUrl || '',
    providerFileId: saved.providerFileId || '',
    provider: saved.provider || '',
    mimeType: file.mimetype || '',
    boyut: file.size || (file.buffer ? file.buffer.length : 0),
    gecerlilikBaslangic: parseTarih(gecerlilikBaslangic),
    gecerlilikBitis: parseTarih(gecerlilikBitis),
    indirmeToken: token,
    yuklenmeTarihi: new Date(),
    yukleyenKullanici: user ? user._id : null
  };

  await Model.updateOne({ _id: tesvikId }, { $set: { kdvMuafiyetYazisi: yeni } });

  // Yeni kayıt DB'ye yazıldıktan SONRA eski dosyayı temizle: silme hatası yeni yüklemeyi
  // geçersiz kılmamalı (deleteFile zaten yutuyor, sıra yine de bilinçli).
  if (dosyaVarMi(mevcut)) {
    await storageService.deleteFile({ providerFileId: mevcut.providerFileId, filePath: mevcut.dosyaYolu });
  }
  return ozet(yeni);
}

// Yalnızca geçerlilik tarihlerini günceller (dosya yeniden yüklenmeden)
async function updateTarihler({ tesvikModel, tesvikId, gecerlilikBaslangic, gecerlilikBitis }) {
  const Model = getModel(tesvikModel);
  const doc = await Model.findById(tesvikId).select(SELECT_ALANLARI).lean();
  if (!doc) throw notFound();
  if (!dosyaVarMi(doc.kdvMuafiyetYazisi)) {
    const e = new Error('Önce KDV muafiyet yazısını yükleyin.'); e.code = 'NO_FILE'; throw e;
  }
  const bas = parseTarih(gecerlilikBaslangic);
  const bit = parseTarih(gecerlilikBitis);
  if (bas && bit && bit < bas) {
    const e = new Error('Bitiş tarihi başlangıç tarihinden önce olamaz.'); e.code = 'BAD_RANGE'; throw e;
  }
  await Model.updateOne({ _id: tesvikId }, {
    $set: {
      'kdvMuafiyetYazisi.gecerlilikBaslangic': bas,
      'kdvMuafiyetYazisi.gecerlilikBitis': bit
    }
  });
  return ozet({ ...doc.kdvMuafiyetYazisi, gecerlilikBaslangic: bas, gecerlilikBitis: bit });
}

// Yazıyı kaldırır (depodaki dosya da silinir) — link artık çalışmaz
async function removeDosya({ tesvikModel, tesvikId }) {
  const Model = getModel(tesvikModel);
  const doc = await Model.findById(tesvikId).select(SELECT_ALANLARI).lean();
  if (!doc) throw notFound();
  const mevcut = doc.kdvMuafiyetYazisi || {};
  await Model.updateOne({ _id: tesvikId }, { $unset: { kdvMuafiyetYazisi: '' } });
  if (dosyaVarMi(mevcut)) {
    await storageService.deleteFile({ providerFileId: mevcut.providerFileId, filePath: mevcut.dosyaYolu });
  }
  return ozet(null);
}

// ───────────────────────── Dosya içeriği (public indirme) ─────────────────────────

// Cloudinary'de PDF/ZIP teslimatı hesap ayarıyla kapalı olabilir; imzasız delivery URL
// bloklanır. Bu yüzden sırayla denenir:
//   1) private_download_url → authenticated download API (delivery kısıtından etkilenmez)
//   2) imzalı delivery URL
//   3) kayıtlı URL (local/eski kayıtlar)
// İlk 200 dönen kaynak stream edilir. (bkz. dosyaTakipController.dosyaGetir)
async function fetchBuffer(kdv) {
  if (!dosyaVarMi(kdv)) return null;

  if (!storageService.isCloudinaryUrl(kdv.dosyaUrl) && !kdv.providerFileId) {
    // Local disk: storageService.serveFile mantığıyla aynı kök kontrolü
    const fs = require('fs-extra');
    const path = require('path');
    const abs = path.isAbsolute(kdv.dosyaYolu || '') ? kdv.dosyaYolu : storageService.absOf(kdv.dosyaYolu || '');
    const base = path.resolve(storageService.BASE_DIR);
    if (!abs || !path.resolve(abs).startsWith(base) || !(await fs.pathExists(abs))) return null;
    return { buffer: await fs.readFile(abs), contentType: kdv.mimeType || 'application/octet-stream' };
  }

  ensureCloudinary();
  const isImage = /^image\//.test(kdv.mimeType || '');
  const rt = isImage ? 'image' : 'raw';
  const adaylar = [];
  if (kdv.providerFileId) {
    try { adaylar.push(cloudinary.utils.private_download_url(kdv.providerFileId, '', { resource_type: rt, type: 'upload' })); } catch (_) { /* yoksay */ }
    try { adaylar.push(cloudinary.url(kdv.providerFileId, { resource_type: rt, type: 'upload', secure: true, sign_url: true })); } catch (_) { /* yoksay */ }
  }
  if (kdv.dosyaUrl && kdv.dosyaUrl.startsWith('http')) adaylar.push(kdv.dosyaUrl);

  for (const u of adaylar) {
    try {
      const r = await fetch(u);
      if (r.ok) {
        return {
          buffer: Buffer.from(await r.arrayBuffer()),
          contentType: kdv.mimeType || r.headers.get('content-type') || 'application/octet-stream'
        };
      }
    } catch (_) { /* sonraki adaya geç */ }
  }
  return null;
}

module.exports = {
  INDIRME_ROUTE,
  getModel,
  gecerlilikDurumu,
  dosyaVarMi,
  buildIndirmeLinki,
  ozet,
  getOzet,
  resolveByToken,
  saveDosya,
  updateTarihler,
  removeDosya,
  fetchBuffer
};
