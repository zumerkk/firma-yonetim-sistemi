// 🧪 Büyük dosyanın Cloudinary'de parçalı saklanması
//
// Müşteri (21.09.2026): "0 dosya yüklendi, 1 başarısız. (File size too large. Got 20231360. Maximum is
// 10485760.)" — sınır Cloudinary planının. Sahte Cloudinary aynı kuralı uygular: 10 MiB'ı aşan TEK
// yüklemeyi aynı mesajla reddeder. Testler gerçek hesaba dokunmaz.

const crypto = require('crypto');
const express = require('express');
const multer = require('multer');
const request = require('supertest');
const { PassThrough } = require('stream');
const { kur, manifestMi, TEK_DOSYA_SINIRI, PARCA_BOYUTU } = require('../../utils/parcaliDosya');

const CLOUDINARY_SINIRI = 10485760;

function sahteCloudinary({ bozukParca = null } = {}) {
  const depo = new Map(); // public_id → Buffer
  const yuklemeler = [];
  const adres = (pid) => `https://res.cloudinary.com/test/raw/upload/v1/${pid}`;
  const cloudinary = {
    uploader: {
      upload_stream: (secenek, cb) => ({
        end: (buffer) => {
          const pid = secenek.folder ? `${secenek.folder}/${secenek.public_id}` : secenek.public_id;
          yuklemeler.push({ pid, boyut: buffer.length, resource_type: secenek.resource_type });
          setImmediate(() => {
            if (buffer.length > CLOUDINARY_SINIRI) {
              return cb(new Error(`File size too large. Got ${buffer.length}. Maximum is ${CLOUDINARY_SINIRI}.`));
            }
            if (bozukParca && pid.endsWith(bozukParca)) return cb(new Error('ağ hatası'));
            depo.set(pid, Buffer.from(buffer));
            return cb(null, { public_id: pid, secure_url: adres(pid), bytes: buffer.length });
          });
        }
      }),
      destroy: async (pid) => { depo.delete(pid); return { result: 'ok' }; }
    },
    utils: { private_download_url: (pid) => `mem://indir/${pid}` },
    url: (pid) => `mem://imzali/${pid}`
  };
  // private_download_url yolu gerçekteki gibi ilk aday; yanıt depodan
  const getir = async (u) => {
    const pid = decodeURIComponent(String(u).replace(/^mem:\/\/(indir|imzali)\//, '').replace(/^https:\/\/res\.cloudinary\.com\/test\/raw\/upload\/v1\//, ''));
    const b = depo.get(pid);
    if (!b) return { ok: false, status: 404 };
    return { ok: true, status: 200, arrayBuffer: async () => b.buffer.slice(b.byteOffset, b.byteOffset + b.length), headers: { get: () => 'application/octet-stream' } };
  };
  return { cloudinary, getir, depo, yuklemeler };
}

const rastgele = (n) => crypto.randomBytes(n);
const ozet = (b) => crypto.createHash('sha1').update(b).digest('hex');
const MUSTERININ_DOSYASI = 20231360;

describe('parçalı yükleme', () => {
  test('sınırın altındaki dosya bugünkü gibi TEK parça yüklenir', async () => {
    const s = sahteCloudinary();
    const p = kur(s);
    const tekYukle = jest.fn(async (b) => ({ secure_url: 'https://x/tek.pdf', public_id: 'dosya-takip/tek.pdf', bytes: b.length }));
    const r = await p.bufferdanYukle(rastgele(3 * 1024 * 1024), { tabanPid: 'dosya-takip/tek.pdf', tekYukle });
    expect(tekYukle).toHaveBeenCalledTimes(1);
    expect(r).toEqual({ secure_url: 'https://x/tek.pdf', public_id: 'dosya-takip/tek.pdf', bytes: 3 * 1024 * 1024, parcali: false });
    expect(s.yuklemeler).toHaveLength(0);
  });

  test('müşterinin 20.231.360 baytlık dosyası 3 parça + manifest olarak saklanır, hiçbiri 10 MiB\'ı aşmaz', async () => {
    const s = sahteCloudinary();
    const p = kur(s);
    const veri = rastgele(MUSTERININ_DOSYASI);
    const tekYukle = jest.fn();
    const r = await p.bufferdanYukle(veri, { tabanPid: 'dosya-takip/1-rapor.pdf', tekYukle, mimeType: 'application/pdf', ad: 'Rapor.pdf' });

    expect(tekYukle).not.toHaveBeenCalled();
    expect(r.parcali).toBe(true);
    expect(r.bytes).toBe(MUSTERININ_DOSYASI);
    expect(manifestMi(r.public_id)).toBe(true);
    expect(s.yuklemeler.map((y) => y.pid)).toEqual([
      'dosya-takip/1-rapor.pdf.parca-001',
      'dosya-takip/1-rapor.pdf.parca-002',
      'dosya-takip/1-rapor.pdf.parca-003',
      'dosya-takip/1-rapor.pdf.parcali.json'
    ]);
    s.yuklemeler.forEach((y) => {
      expect(y.boyut).toBeLessThanOrEqual(CLOUDINARY_SINIRI);
      expect(y.resource_type).toBe('raw');
    });
  });

  test('indirince birebir aynı dosya çıkar', async () => {
    const s = sahteCloudinary();
    const p = kur(s);
    const veri = rastgele(MUSTERININ_DOSYASI);
    const r = await p.bufferdanYukle(veri, { tabanPid: 'k/a.pdf', tekYukle: jest.fn(), mimeType: 'application/pdf', ad: 'a.pdf' });
    const indirilen = await p.indir(r.public_id);
    expect(indirilen.contentType).toBe('application/pdf');
    expect(indirilen.buffer.length).toBe(MUSTERININ_DOSYASI);
    expect(ozet(indirilen.buffer)).toBe(ozet(veri));
  });

  test('yanıta akıtırken belleğe toplamadan parça parça yazar, başlıklar doğru', async () => {
    const s = sahteCloudinary();
    const p = kur(s);
    const veri = rastgele(PARCA_BOYUTU * 2 + 12345);
    const r = await p.bufferdanYukle(veri, { tabanPid: 'k/b.pdf', tekYukle: jest.fn(), mimeType: 'application/pdf', ad: 'b.pdf' });

    const res = new PassThrough();
    const basliklar = {};
    res.setHeader = (k, v) => { basliklar[k] = v; };
    const gelen = [];
    res.on('data', (c) => gelen.push(c));
    const bitti = new Promise((ok) => res.on('end', ok));
    const sonuc = await p.akit(r.public_id, res, { basliklar: () => ({ 'Content-Disposition': 'attachment' }) });
    await bitti;
    expect(sonuc).toBe(true);
    expect(basliklar['Content-Length']).toBe(veri.length);
    expect(basliklar['Content-Type']).toBe('application/pdf');
    expect(basliklar['Content-Disposition']).toBe('attachment');
    expect(ozet(Buffer.concat(gelen))).toBe(ozet(veri));
  });

  test('bir parça yüklenemezse yüklenmiş parçalar temizlenir, hata yukarı çıkar', async () => {
    const s = sahteCloudinary({ bozukParca: '.parca-002' });
    const p = kur(s);
    await expect(p.bufferdanYukle(rastgele(MUSTERININ_DOSYASI), { tabanPid: 'k/c.pdf', tekYukle: jest.fn() }))
      .rejects.toThrow('ağ hatası');
    expect([...s.depo.keys()]).toEqual([]);
  });

  test('silince parçalar ve manifest birlikte gider', async () => {
    const s = sahteCloudinary();
    const p = kur(s);
    const r = await p.bufferdanYukle(rastgele(MUSTERININ_DOSYASI), { tabanPid: 'k/d.pdf', tekYukle: jest.fn() });
    expect(s.depo.size).toBe(4);
    await p.sil(r.public_id);
    expect(s.depo.size).toBe(0);
  });

  test('manifest okunamıyorsa indirme null, akıtma yanıta hiçbir şey yazmadan false döner', async () => {
    const p = kur(sahteCloudinary());
    expect(await p.indir('yok/x.pdf.parcali.json')).toBeNull();
    const res = { setHeader: jest.fn(), write: jest.fn(), end: jest.fn() };
    expect(await p.akit('yok/x.pdf.parcali.json', res)).toBe(false);
    expect(res.setHeader).not.toHaveBeenCalled();
    expect(res.write).not.toHaveBeenCalled();
  });

  test('sınır tam kenarda: TEK_DOSYA_SINIRI bayt tek parça, bir bayt fazlası parçalı', async () => {
    const p = kur(sahteCloudinary());
    const tek = jest.fn(async (b) => ({ secure_url: 'u', public_id: 'p', bytes: b.length }));
    expect((await p.bufferdanYukle(rastgele(TEK_DOSYA_SINIRI), { tabanPid: 'k/e', tekYukle: tek })).parcali).toBe(false);
    expect((await p.bufferdanYukle(rastgele(TEK_DOSYA_SINIRI + 1), { tabanPid: 'k/f', tekYukle: tek })).parcali).toBe(true);
  });
});

describe('multer depolama motoru (Belge Takip / Cari yükleme yolu)', () => {
  const uygulama = (s) => {
    const p = kur(s);
    const yukle = multer({
      storage: p.depolama({
        params: (req, file) => ({ folder: 'dosya-takip', resource_type: 'raw', public_id: `123-${file.originalname}` })
      }),
      limits: { fileSize: 100 * 1024 * 1024 }
    });
    const app = express();
    app.post('/yukle', yukle.single('dosya'), (req, res) => res.json({
      path: req.file.path, filename: req.file.filename, size: req.file.size, parcali: req.file.parcali
    }));
    app.use((err, req, res, next) => res.status(400).json({ message: err.message })); // eslint-disable-line no-unused-vars
    return { app, p };
  };

  test('20 MB dosya multer üzerinden yüklenir; kayda manifest girer, indirilen aynı', async () => {
    const s = sahteCloudinary();
    const { app, p } = uygulama(s);
    const veri = rastgele(MUSTERININ_DOSYASI);
    const r = await request(app).post('/yukle').attach('dosya', veri, 'Rapor.pdf');
    expect(r.status).toBe(200);
    expect(r.body.size).toBe(MUSTERININ_DOSYASI);
    expect(r.body.parcali).toBe(true);
    expect(r.body.filename).toBe('dosya-takip/123-Rapor.pdf.parcali.json');
    expect(ozet((await p.indir(r.body.filename)).buffer)).toBe(ozet(veri));
  });

  test('küçük dosya tek parça, eski public_id biçimiyle', async () => {
    const s = sahteCloudinary();
    const { app } = uygulama(s);
    const r = await request(app).post('/yukle').attach('dosya', rastgele(500 * 1024), 'dekont.pdf');
    expect(r.status).toBe(200);
    expect(r.body).toMatchObject({ filename: 'dosya-takip/123-dekont.pdf', size: 500 * 1024 });
    expect(r.body.parcali).toBeFalsy();
  });
});
