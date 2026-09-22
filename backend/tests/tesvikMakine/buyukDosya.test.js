// 🧪 Ekipman Takip / İşlem & Evrak depolaması — 10 MiB üstü dosya parçalı saklanır
//
// Müşteri (21.09.2026): "genel olarak sistemdeki herhangi bir yere yükleme limitini 50-100 mb yapabilir
// miyiz". Bu modüller dosyayı bellekte (buffer) alıp storageService.saveBuffer ile Cloudinary'ye yazıyor;
// Cloudinary planı tek dosyada 10 MiB'ı reddediyor. Sahte Cloudinary aynı kuralı uygular.

const crypto = require('crypto');

const mockDepo = new Map();
jest.mock('cloudinary', () => {
  const adres = (pid, tur) => `https://res.cloudinary.com/test/${tur}/upload/v1/${pid}`;
  return {
    v2: {
      config: () => {},
      uploader: {
        upload_stream: (secenek, cb) => ({
          end: (buffer) => setImmediate(() => {
            if (buffer.length > 10485760) return cb(new Error(`File size too large. Got ${buffer.length}. Maximum is 10485760.`));
            mockDepo.set(secenek.public_id, Buffer.from(buffer));
            return cb(null, { public_id: secenek.public_id, secure_url: adres(secenek.public_id, secenek.resource_type), bytes: buffer.length });
          })
        }),
        destroy: async (pid) => { mockDepo.delete(pid); return { result: 'ok' }; }
      },
      utils: { private_download_url: (pid) => `mem://${pid}` },
      url: (pid) => `mem://${pid}`
    }
  };
});

const eskiFetch = global.fetch;
beforeAll(() => {
  process.env.CLOUDINARY_STORAGE_ENABLED = 'true';
  process.env.CLOUDINARY_CLOUD_NAME = 'test';
  process.env.CLOUDINARY_API_KEY = 'k';
  process.env.CLOUDINARY_API_SECRET = 's';
  global.fetch = async (u) => {
    const pid = decodeURIComponent(String(u).replace(/^mem:\/\//, '').replace(/^https:\/\/res\.cloudinary\.com\/test\/\w+\/upload\/v1\//, ''));
    const b = mockDepo.get(pid);
    return b
      ? { ok: true, status: 200, arrayBuffer: async () => b.buffer.slice(b.byteOffset, b.byteOffset + b.length), headers: { get: () => null } }
      : { ok: false, status: 404 };
  };
});
afterAll(() => { global.fetch = eskiFetch; });

const storage = require('../../services/tesvikMakine/storageService');
const ozet = (b) => crypto.createHash('sha1').update(b).digest('hex');

test('20 MB evrak kaydedilir, indirilince birebir aynı, silinince parçalarıyla gider', async () => {
  const veri = crypto.randomBytes(20231360);
  const kayit = await storage.saveBuffer({
    folderRel: 'Islem_Evrak/Firma/T1', documentTypeFolder: 'Gelen', originalName: 'Kapasite Raporu.pdf', buffer: veri, mimeType: 'application/pdf'
  });
  expect(kayit.provider).toBe('cloudinary');
  expect(kayit.providerFileId).toMatch(/\.parcali\.json$/);
  expect(kayit.fileUrl).toMatch(/\.parcali\.json$/);
  expect(mockDepo.size).toBe(4); // 3 parça + manifest

  const indirilen = await storage.bulutDosyasiniIndir(kayit.fileUrl, 'application/pdf');
  expect(indirilen.contentType).toBe('application/pdf');
  expect(ozet(indirilen.buffer)).toBe(ozet(veri));

  await storage.deleteFile({ providerFileId: kayit.providerFileId, filePath: kayit.filePath });
  expect(mockDepo.size).toBe(0);
});

test('küçük evrak eskisi gibi tek parça, uzantılı public_id ile', async () => {
  const kayit = await storage.saveBuffer({
    folderRel: 'Islem_Evrak/Firma/T1', documentTypeFolder: 'Gelen', originalName: 'Vergi Levhası.pdf', buffer: crypto.randomBytes(200 * 1024)
  });
  expect(kayit.providerFileId).toMatch(/\.pdf$/);
  expect(kayit.fileUrl).toContain('/raw/upload/');
});
