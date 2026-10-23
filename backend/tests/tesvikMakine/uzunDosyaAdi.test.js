// 🧪 Uzun adlı dosya Cloudinary'ye yüklenebilmeli (public_id ≤ 255 karakter).
// Müşteri (23.10.2026): "Firma böyle hata alıyor yükleme yaparken … Belgenin ismi çok uzun diye yüklenmemiş
// galiba ismini kısaltınca yükledi (645A2AA3-CAC7-4A3F-9E66-9460F6C0E724~24254915 ismi buydu)".
// Canlı ölçüm: aynı makinede "capakalmamakinesi.pdf" 233 karakterlik kimlikle yüklenmiş; bu ad 260'a çıkıyordu.

jest.mock('cloudinary', () => {
  const yuklenen = [];
  return {
    v2: {
      config: jest.fn(),
      uploader: {
        upload_stream: (secenek, cb) => ({
          end: () => {
            yuklenen.push(secenek.public_id);
            if (secenek.public_id.length > 255) cb(new Error('public_id too long'));
            else cb(null, { public_id: secenek.public_id, secure_url: `https://res.cloudinary.com/x/raw/upload/${secenek.public_id}` });
          }
        })
      },
      __yuklenen: yuklenen
    }
  };
});

process.env.CLOUDINARY_CLOUD_NAME = 'test'; process.env.CLOUDINARY_API_KEY = 'k'; process.env.CLOUDINARY_API_SECRET = 's';
process.env.CLOUDINARY_STORAGE_ENABLED = 'true'; process.env.STORAGE_PROVIDER = 'cloudinary';

const storage = require('../../services/tesvikMakine/storageService');
const cloudinary = require('cloudinary').v2;

const identity = { firmaName: 'ARMİN GRUP MAKİNA İMALATI SANAYİ VE TİCARET LİMİTED ŞİRKETİ', documentNo: '579846', documentId: '1099085' };
const makine = { siraNo: 4, machineName: 'Çapak Alma Makinesi{Aksesuarları ile birlikte komple}', gtipNo: '846090000019' };

test('müşterinin dosyası artık sınırı aşmıyor; klasör ve uzantı korunuyor', async () => {
  expect(storage.getProvider()).toBe('cloudinary');
  const folderRel = storage.machineFolderRel(identity, makine, 'local');
  const r = await storage.saveBuffer({ folderRel, documentTypeFolder: 'Fatura_Taslak', originalName: '645A2AA3-CAC7-4A3F-9E66-9460F6C0E724~24254915.pdf', buffer: Buffer.from('pdf') });
  expect(r.providerFileId.length).toBeLessThanOrEqual(storage.PUBLIC_ID_SINIRI);
  expect(r.providerFileId.endsWith('.pdf')).toBe(true);
  expect(r.providerFileId).toContain('Fatura_Taslak/645A2AA3');
  expect(cloudinary.__yuklenen.length).toBe(1);
});

test('publicIdKur: kısa kimliğe dokunmaz, uzunda önce dosya adını, yetmezse klasörü kısaltır', () => {
  expect(storage.publicIdKur('a/b', 'dosya', '_1.pdf')).toBe('a/b/dosya_1.pdf');
  const klasor = `tesvik-evrak/${storage.machineFolderRel(identity, makine, 'local')}/Fatura_Taslak`;
  const uzun = storage.publicIdKur(klasor, '645A2AA3-CAC7-4A3F-9E66-9460F6C0E72424254915', '_1792000000000.pdf');
  expect(uzun.length).toBeLessThanOrEqual(230);
  expect(uzun.startsWith(`${klasor}/645A2AA3`)).toBe(true); // klasör bütün kaldı
  const asiri = storage.publicIdKur('k'.repeat(400), 'x'.repeat(100), '_1.pdf');
  expect(asiri.length).toBeLessThanOrEqual(230);
  expect(asiri.endsWith('_1.pdf')).toBe(true);
});
