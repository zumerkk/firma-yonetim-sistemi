// 🧪 DocumentFolder.provider ↔ storageService sözleşmesi
//
// Canlı hata (müşteri, 15.09.2026 — toplu mail gönderirken):
//   "DocumentFolder validation failed: provider: `cloudinary` is not a valid enum value
//    for path `provider`."
// CLOUDINARY_STORAGE_ENABLED açılınca storageService sağlayıcıyı 'cloudinary' döndürmeye
// başladı ama klasör modelinin enum'u yalnızca local/drive/s3 biliyordu. Klasör kaydı
// düşünce yükleme linki ve o linki isteyen her mail (toplu mail dahil) duruyordu.
// Bu test iki tarafı birbirine bağlıyor: servis ne döndürürse model kabul etmeli.

const os = require('os');
const path = require('path');

process.env.TESVIK_UPLOAD_DIR = process.env.TESVIK_UPLOAD_DIR || path.join(os.tmpdir(), 'tesvik-klasor-jest');

const storage = require('../../services/tesvikMakine/storageService');
const DocumentFolder = require('../../models/DocumentFolder');

const kimlik = { firmaName: 'ÖRNEK GIDA A.Ş.', documentNo: '568825', documentId: '1023736' };
const makine = { siraNo: 913, machineName: 'NST CİHAZI', gtipNo: '901812000000' };

const klasorKaydi = (sonuc) => new DocumentFolder({
  tesvikModel: 'Tesvik',
  tesvikId: '000000000000000000000001',
  rowId: 'row-1',
  provider: sonuc.provider,
  folderPath: sonuc.folderPath,
  shareUrl: sonuc.shareUrl
});

describe('Cloudinary depolama açıkken klasör kaydı', () => {
  const ANAHTARLAR = ['CLOUDINARY_STORAGE_ENABLED', 'CLOUDINARY_CLOUD_NAME', 'CLOUDINARY_API_KEY', 'CLOUDINARY_API_SECRET'];
  const eski = {};

  beforeAll(() => {
    ANAHTARLAR.forEach((k) => { eski[k] = process.env[k]; });
    Object.assign(process.env, {
      CLOUDINARY_STORAGE_ENABLED: 'true',
      CLOUDINARY_CLOUD_NAME: 'test-bulut',
      CLOUDINARY_API_KEY: 'test-anahtar',
      CLOUDINARY_API_SECRET: 'test-gizli'
    });
  });

  afterAll(() => {
    ANAHTARLAR.forEach((k) => {
      if (eski[k] === undefined) delete process.env[k];
      else process.env[k] = eski[k];
    });
  });

  test('makine klasörü: servis cloudinary döndürür, model kabul eder', async () => {
    const sonuc = await storage.ensureMachineStructure(kimlik, makine, 'local');
    expect(sonuc.provider).toBe('cloudinary');
    expect(klasorKaydi(sonuc).validateSync()).toBeUndefined();
  });

  test('belge klasörü: servis cloudinary döndürür, model kabul eder', async () => {
    const sonuc = await storage.ensureCertificateStructure(kimlik);
    expect(sonuc.provider).toBe('cloudinary');
    expect(klasorKaydi(sonuc).validateSync()).toBeUndefined();
  });
});

describe('DocumentFolder.provider değerleri', () => {
  const kur = (provider) => new DocumentFolder({
    tesvikModel: 'Tesvik', tesvikId: '000000000000000000000001', folderPath: 'Tesvikler/X', provider
  });

  test.each(['local', 'drive', 's3', 'cloudinary'])('%s kabul edilir', (provider) => {
    expect(kur(provider).validateSync()).toBeUndefined();
  });

  test('tanımsız sağlayıcı reddedilir', () => {
    expect(kur('ftp').validateSync()?.errors?.provider).toBeDefined();
  });

  test('varsayılan local', () => {
    expect(kur(undefined).provider).toBe('local');
  });
});
