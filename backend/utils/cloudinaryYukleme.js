// ☁️ Cloudinary dosya yardımcıları — yükleme ara katmanı, güvenli çekme, silme
//
// Belge Takip'in dosya akışıyla (controllers/dosyaTakipController.js) aynı kurallar:
// PDF/Office 'raw' saklanır, izinli uzantılar ve boyut sınırı aynı, Cloudinary teslimat
// kısıtına takılmamak için dosya sunucu tarafında çekilip kendi domain'imizden verilir.
// Yeni modüller bunu kullanıyor; çalışan Belge Takip koduna bu değişiklikte dokunulmadı.
//
// cloudinary.config() burada bilerek ÇAĞRILMIYOR: yapılandırma küresel ve açılışta
// dosyaTakipController kuruyor. Burada tekrar çağırmak, ortam değişkeni eksik bir
// kurulumda oradaki varsayılan değeri undefined ile ezebilirdi.

const path = require('path');
const multer = require('multer');
const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');

const IZINLI_UZANTILAR = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp', '.pdf', '.doc', '.docx', '.xls', '.xlsx', '.csv', '.txt', '.zip', '.rar', '.ppt', '.pptx'];

const resimMi = (mime) => /^image\//.test(mime || '');
// destroy/indirme 'auto' kabul etmiyor: resim → image, diğerleri → raw
const kaynakTuru = (mime) => (resimMi(mime) ? 'image' : 'raw');

// Dosya adından güvenli public_id tabanı (Türkçe/özel karakter → ASCII)
const guvenliTaban = (ad) =>
    (path.parse(ad || '').name || 'dosya')
        .normalize('NFKD')
        .replace(/[^A-Za-z0-9._-]+/g, '_')
        .slice(0, 80) || 'dosya';

/** Tek dosyalık yükleme ara katmanı; multer/Cloudinary hatalarını JSON 400 olarak döner. */
function tekDosyaYukleyici(klasor, alan = 'dosya') {
    const depo = new CloudinaryStorage({
        cloudinary,
        params: (req, file) => {
            const ext = (path.extname(file.originalname || '') || '').toLowerCase();
            const taban = `${Date.now()}-${guvenliTaban(file.originalname)}`;
            return {
                folder: klasor,
                resource_type: kaynakTuru(file.mimetype),
                // raw dosyalarda uzantı public_id'de korunur (doğru içerik tipi + indirme adı)
                public_id: resimMi(file.mimetype) ? taban : `${taban}${ext}`
            };
        }
    });

    const yukle = multer({
        storage: depo,
        limits: { fileSize: (Number(process.env.MAX_UPLOAD_MB) || 100) * 1024 * 1024 },
        fileFilter: (req, file, cb) => {
            const ext = (path.extname(file.originalname || '') || '').toLowerCase();
            if (IZINLI_UZANTILAR.includes(ext)) return cb(null, true);
            cb(new Error(`Bu dosya türü desteklenmiyor (${ext || 'bilinmiyor'}). İzin verilenler: PDF, Word, Excel, resim, txt, zip.`));
        }
    });

    return (req, res, next) => {
        yukle.single(alan)(req, res, (err) => {
            if (err) return res.status(400).json({ success: false, message: err.message || 'Dosya yüklenemedi' });
            next();
        });
    };
}

/** multer dosyasından saklanacak bilgi */
function dosyaBilgisi(file) {
    // multer dosya adını latin1 olarak çözüyor → Türkçe karakterler için utf8'e çevir
    let ad = file.originalname || 'dosya';
    try { ad = Buffer.from(ad, 'latin1').toString('utf8'); } catch (_) { /* yoksay */ }
    return {
        dosyaAdi: ad,
        dosyaYolu: file.path,
        dosyaTipi: file.mimetype,
        dosyaBoyutu: file.size,
        cloudinaryPublicId: file.filename
    };
}

/** Cloudinary'den sil. Hata akışı bozmaz, yalnızca loglanır. */
async function dosyaSil(dosya) {
    if (!dosya?.cloudinaryPublicId) return;
    try {
        await cloudinary.uploader.destroy(dosya.cloudinaryPublicId, { resource_type: kaynakTuru(dosya.dosyaTipi) });
    } catch (err) {
        console.error('Cloudinary silme hatası (devam ediliyor):', err.message);
    }
}

/**
 * Dosyayı kaynaktan çek; hiçbir kaynak vermezse null.
 * Sıra dosyaTakipController.dosyaGetir ile aynı: yetkili indirme API'si (PDF/ZIP teslimat
 * kısıtını aşar) → imzalı URL → kayıtlı yol.
 */
async function dosyaCek(dosya) {
    const adaylar = [];
    const pid = dosya?.cloudinaryPublicId;
    const rt = kaynakTuru(dosya?.dosyaTipi);
    if (pid) {
        try { adaylar.push(cloudinary.utils.private_download_url(pid, '', { resource_type: rt, type: 'upload' })); } catch (_) { /* yoksay */ }
        try { adaylar.push(cloudinary.url(pid, { resource_type: rt, type: 'upload', secure: true, sign_url: true })); } catch (_) { /* yoksay */ }
    }
    if (typeof dosya?.dosyaYolu === 'string' && dosya.dosyaYolu.startsWith('http')) adaylar.push(dosya.dosyaYolu);

    for (const u of adaylar) {
        try {
            const r = await fetch(u);
            if (r.ok) return { buf: Buffer.from(await r.arrayBuffer()), tip: r.headers.get('content-type') };
        } catch (_) { /* sonraki adaya geç */ }
    }
    return null;
}

/** Çekilen dosyayı yanıt olarak gönder */
function dosyaGonder(res, dosya, icerik, indir) {
    res.setHeader('Content-Type', dosya.dosyaTipi || icerik.tip || 'application/octet-stream');
    res.setHeader('Content-Length', icerik.buf.length);
    const ad = encodeURIComponent(dosya.dosyaAdi || 'dosya');
    res.setHeader('Content-Disposition', `${indir ? 'attachment' : 'inline'}; filename*=UTF-8''${ad}`);
    res.send(icerik.buf);
}

module.exports = { IZINLI_UZANTILAR, tekDosyaYukleyici, dosyaBilgisi, dosyaSil, dosyaCek, dosyaGonder };
