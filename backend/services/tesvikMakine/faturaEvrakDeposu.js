const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const { randomUUID } = require('node:crypto');
const cloudinary = require('cloudinary').v2;
const { isCloudinaryConfigured } = require('./storageService');

const KLASOR = 'gm-fatura-evrak';
const YEREL_DEPO = path.join(os.tmpdir(), KLASOR);
const DOSYA_KIMLIGI = /^[a-f0-9-]{36}\.(pdf|xml)$/;
const BULUT_AYARLARI = { resource_type: 'raw', type: 'authenticated' };

function depoHatasi(status, message) {
  return Object.assign(new Error(message), { status });
}

function bulutuHazirla() {
  if (!isCloudinaryConfigured()) throw depoHatasi(503, 'Fatura evrakı deposuna şu anda erişilemiyor.');
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
  });
}

function kayitYolu(depo) {
  if (!DOSYA_KIMLIGI.test(depo?.dosyaYolu || '')) throw depoHatasi(404, 'Fatura evrakı bulunamadı.');
  return depo.dosyaYolu;
}

async function kaydet({ buffer, mimeType }) {
  const uzanti = mimeType === 'application/xml' ? 'xml' : 'pdf';
  const dosyaYolu = `${randomUUID()}.${uzanti}`;
  if (isCloudinaryConfigured()) {
    bulutuHazirla();
    const providerFileId = `${KLASOR}/${dosyaYolu}`;
    await new Promise((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream({
        ...BULUT_AYARLARI, public_id: providerFileId, overwrite: false, timeout: 60_000
      }, (error) => error ? reject(error) : resolve());
      stream.end(buffer);
    });
    return { provider: 'cloudinary', dosyaYolu, providerFileId };
  }
  // Render'ın geçici diski, kalıcı faturalar için kullanılmaz.
  if (process.env.NODE_ENV === 'production') throw depoHatasi(503, 'Fatura evrakı deposuna şu anda erişilemiyor.');
  await fs.mkdir(YEREL_DEPO, { recursive: true, mode: 0o700 });
  await fs.writeFile(path.join(YEREL_DEPO, dosyaYolu), buffer, { flag: 'wx', mode: 0o600 });
  return { provider: 'local', dosyaYolu };
}

async function oku(depo) {
  const dosyaYolu = kayitYolu(depo);
  if (depo.provider === 'cloudinary') {
    bulutuHazirla();
    const publicId = `${KLASOR}/${dosyaYolu}`;
    const imzaliIndirme = cloudinary.utils.private_download_url(publicId, '', {
      ...BULUT_AYARLARI, expires_at: Math.floor(Date.now() / 1000) + 120
    });
    const imzaliCdn = cloudinary.url(publicId, { ...BULUT_AYARLARI, secure: true, sign_url: true });
    const ilkYanit = await fetch(imzaliIndirme, { signal: AbortSignal.timeout(25_000) }).catch(() => null);
    if (ilkYanit?.ok) return Buffer.from(await ilkYanit.arrayBuffer());
    const cdnYanit = await fetch(imzaliCdn, { signal: AbortSignal.timeout(25_000) }).catch(() => null);
    if (cdnYanit?.ok) return Buffer.from(await cdnYanit.arrayBuffer());
    if (ilkYanit?.status === 404 && cdnYanit?.status === 404) throw depoHatasi(404, 'Fatura evrakı depoda bulunamadı.');
    throw depoHatasi(502, 'Fatura evrakı depodan alınamadı.');
  }
  if (depo.provider !== 'local') throw depoHatasi(404, 'Fatura evrakı bulunamadı.');
  try {
    return await fs.readFile(path.join(YEREL_DEPO, dosyaYolu));
  } catch (error) {
    if (error.code === 'ENOENT') throw depoHatasi(404, 'Fatura evrakı depoda bulunamadı.');
    throw error;
  }
}

async function sil(depo) {
  const dosyaYolu = kayitYolu(depo);
  if (depo.provider === 'cloudinary') {
    bulutuHazirla();
    await cloudinary.uploader.destroy(`${KLASOR}/${dosyaYolu}`, BULUT_AYARLARI);
  } else if (depo.provider === 'local') {
    await fs.unlink(path.join(YEREL_DEPO, dosyaYolu)).catch((error) => {
      if (error.code !== 'ENOENT') throw error;
    });
  }
}

module.exports = { kaydet, oku, sil };
