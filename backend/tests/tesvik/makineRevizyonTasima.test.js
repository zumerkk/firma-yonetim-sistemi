const fs = require('fs').promises;
const os = require('os');
const path = require('path');
const mongoose = require('mongoose');
const { MongoMemoryReplSet } = require('mongodb-memory-server');
const {
  DEPO_KOLEKSIYONU, BELGE_KOLEKSIYONLARI, veriHash, kaynaklariOku, indeksleriSagla, belgeyiTasi, belgeyiGeriAl
} = require('../../services/tesvikMakine/revizyonTasima');
const { yedekOlustur, yedektenOku, yedegiDogrula } = require('../../services/tesvikMakine/revizyonTasimaYedegi');
const { argumanlar } = require('../../scripts/migrateMakineRevizyonlari');

jest.setTimeout(90000);
let repl;
let client;
let db;
let dizin;
const collection = () => db.collection('tesviks');
const depo = () => db.collection(DEPO_KOLEKSIYONU);

function kaynakBelge() {
  const kimlik = new mongoose.Types.ObjectId();
  const snapshots = [
    {
      revizeId: 'revizyon-b', revizeTarihi: new Date('2026-09-20T09:00:00Z'),
      belgeId: 'ETUYS-7788', yapanKullanici: new mongoose.Types.ObjectId(),
      yerli: [{ _id: new mongoose.Types.ObjectId(), ad: 'DOKUMA', adet: 829, bilinmeyenEskiAlan: { kod: 'KORUNSUN' } }],
      ithal: [], eskiSerbestMetadata: new mongoose.mongo.BSON.Decimal128('10.25'),
      eskiDouble: new mongoose.mongo.BSON.Double(1),
      eskiBuyukLong: mongoose.mongo.BSON.Long.fromString('9007199254740993')
    },
    {
      // Date sırası array'den farklı: array sırası birebir korunmalı.
      revizeId: 'revizyon-a', revizeTarihi: new Date('2026-01-02T09:00:00Z'),
      yerli: [], ithal: [{ ad: 'MAKİNE', bilinmeyenEskiAlan: 'korunmalı' }]
    }
  ];
  return { _id: kimlik, firmaBilgileri: { unvan: 'ST TURKUAZ' }, makineRevizyonlari: snapshots, guncelAlan: 'korunmalı' };
}

async function kaydet(parent = kaynakBelge()) {
  await collection().insertOne(parent);
  return (await Array.fromAsync(kaynaklariOku(db, { modeller: ['Tesvik'], ids: [parent._id.toString()] })))[0];
}

beforeAll(async () => {
  repl = await MongoMemoryReplSet.create({ replSet: { count: 1 } });
  client = new mongoose.mongo.MongoClient(repl.getUri());
  await client.connect();
  db = client.db('migration-test');
  await indeksleriSagla(db);
  dizin = await fs.mkdtemp(path.join(os.tmpdir(), 'gm-revizyon-test-'));
});
afterAll(async () => {
  await client?.close();
  await repl?.stop();
  if (dizin) await fs.rm(dizin, { recursive: true, force: true });
});
beforeEach(async () => {
  await collection().deleteMany({});
  await depo().deleteMany({});
});

test('dry-run varsayılandır ve model/kimlik denetlenir', () => {
  expect(argumanlar([]).apply).toBe(false);
  expect(argumanlar(['--apply']).apply).toBe(true);
  expect(() => argumanlar(['--id', 'yanlis'])).toThrow();
  expect(() => argumanlar(['--model', 'yanlis'])).toThrow();
  expect(() => argumanlar(['--restore', '/yedek'])).toThrow();
});

test('koleksiyon eşlemesi gerçek uygulama modelleriyle aynıdır', () => {
  expect(BELGE_KOLEKSIYONLARI.Tesvik).toBe(require('../../models/Tesvik').collection.name);
  expect(BELGE_KOLEKSIYONLARI.YeniTesvik).toBe(require('../../models/YeniTesvik').collection.name);
  expect(DEPO_KOLEKSIYONU).toBe(require('../../models/MakineRevizyonKaydi').collection.name);
});

test.each([undefined, []])('geçmişi boş eski belge de ayrı depoya alınır ve orijinal alan varlığı geri yüklenir (%p)', async (gecmis) => {
  const parent = { _id: new mongoose.Types.ObjectId(), guncelAlan: 'koru' };
  if (gecmis) parent.makineRevizyonlari = gecmis;
  const kaynak = await kaydet(parent);
  await belgeyiTasi({ db, client, kaynak });
  expect((await collection().findOne({ _id: parent._id })).makineRevizyonSayaci).toBe(0);
  expect(await depo().countDocuments()).toBe(0);
  await belgeyiGeriAl({ db, client, kaynak, apply: true });
  const restored = await collection().findOne({ _id: parent._id });
  expect(Object.hasOwn(restored, 'makineRevizyonlari')).toBe(Object.hasOwn(parent, 'makineRevizyonlari'));
  expect(restored.makineRevizyonlari).toEqual(gecmis);
});

test('snapshot BSON alanlarını ve eski sıralamayı transaction ile birebir taşır; tekrar güvenlidir', async () => {
  const kaynak = await kaydet();
  const ilk = await belgeyiTasi({ db, client, kaynak });
  expect(ilk.durum).toBe('tasindi');
  const parent = await collection().findOne({ _id: kaynak.parent._id });
  expect(parent.makineRevizyonlari).toBeUndefined();
  expect(parent.makineRevizyonDeposu).toBe('ayri');
  expect(parent.makineRevizyonSayaci).toBe(2);
  const kayitlar = await depo().find({ tesvik: parent._id }, { promoteValues: false }).sort({ sira: 1 }).toArray();
  expect(kayitlar.map((r) => r.snapshot.revizeId)).toEqual(['revizyon-b', 'revizyon-a']);
  expect(veriHash(kayitlar.map((r) => r.snapshot))).toBe(veriHash(kaynak.parent.makineRevizyonlari));
  expect(kayitlar[0].snapshot.belgeId).toBe('ETUYS-7788');
  expect(kayitlar[0].snapshot.revizeTarihi).toBeInstanceOf(Date);
  expect(kayitlar[0].snapshot.yerli[0]._id).toBeInstanceOf(mongoose.Types.ObjectId);
  expect(kayitlar[0].snapshot.yerli[0].bilinmeyenEskiAlan.kod).toBe('KORUNSUN');
  expect(kayitlar[0].snapshot.eskiDouble).toBeInstanceOf(mongoose.mongo.BSON.Double);
  expect(kayitlar[0].snapshot.eskiBuyukLong.toString()).toBe('9007199254740993');
  expect((await belgeyiTasi({ db, client, kaynak })).durum).toBe('zaten_tasinmis');
  expect(await depo().countDocuments()).toBe(2);
});

test('önceden aynı içerikli kayıt varsa idempotent devam eder', async () => {
  const kaynak = await kaydet();
  await depo().insertOne({ tesvikModeli: kaynak.model, tesvik: kaynak.parent._id, sira: 0, snapshot: kaynak.parent.makineRevizyonlari[0] });
  await belgeyiTasi({ db, client, kaynak });
  expect(await depo().countDocuments()).toBe(2);
});

test('çelişen depo veya yedek sonrası revize güncellemesi varsa kaynak ve transaction korunur', async () => {
  const kaynak = await kaydet();
  await depo().insertOne({ tesvikModeli: kaynak.model, tesvik: kaynak.parent._id, sira: 1, snapshot: { ...kaynak.parent.makineRevizyonlari[1], aciklama: 'çelişki' } });
  await expect(belgeyiTasi({ db, client, kaynak })).rejects.toThrow('çelişen');
  expect(await depo().countDocuments()).toBe(1); // Önce yazılan index 0 transaction ile geri alındı.
  expect((await collection().findOne({ _id: kaynak.parent._id })).makineRevizyonlari).toHaveLength(2);
  await depo().deleteMany({});
  await collection().updateOne({ _id: kaynak.parent._id }, { $push: { makineRevizyonlari: { revizeId: 'yeni', yerli: [], ithal: [] } } });
  await expect(belgeyiTasi({ db, client, kaynak })).rejects.toThrow('Yedekten sonra');
  expect(await depo().countDocuments()).toBe(0);
  expect((await collection().findOne({ _id: kaynak.parent._id })).makineRevizyonlari).toHaveLength(3);
});

test('geri alma güncel belge alanlarını korur ve yeni revizyon varsa üzerine yazmaz', async () => {
  const kaynak = await kaydet();
  await belgeyiTasi({ db, client, kaynak });
  await collection().updateOne({ _id: kaynak.parent._id }, { $set: { guncelAlan: 'sonradan değişti' } });
  expect((await belgeyiGeriAl({ db, client, kaynak })).durum).toBe('geri_alma_dogrulandi');
  expect((await collection().findOne({ _id: kaynak.parent._id })).makineRevizyonDeposu).toBe('ayri');
  await depo().insertOne({ tesvik: kaynak.parent._id, tesvikModeli: kaynak.model, sira: 2, snapshot: { revizeId: 'sonradan-yeni' } });
  await expect(belgeyiGeriAl({ db, client, kaynak, apply: true })).rejects.toThrow('adedi');
  await depo().deleteOne({ 'snapshot.revizeId': 'sonradan-yeni' });
  await belgeyiGeriAl({ db, client, kaynak, apply: true });
  const parent = await collection().findOne({ _id: kaynak.parent._id }, { promoteValues: false });
  expect(parent.guncelAlan).toBe('sonradan değişti');
  expect(parent.makineRevizyonDeposu).toBeUndefined();
  expect(parent.makineRevizyonSayaci).toBeUndefined();
  expect(veriHash(parent.makineRevizyonlari)).toBe(veriHash(kaynak.parent.makineRevizyonlari));
  expect(await depo().countDocuments()).toBe(0);
});

test('şifreli sıkıştırılmış yedek 0600/0700 izinlidir; geri okununca BSON hash eşleşir', async () => {
  const kaynak = await kaydet();
  const yedek = await yedekOlustur({ kaynaklar: kaynaklariOku(db, { modeller: ['Tesvik'] }), dizin });
  expect(yedek.count).toBe(1);
  expect((await fs.stat(yedek.arsivPath)).mode & 0o777).toBe(0o600);
  expect((await fs.stat(yedek.anahtarPath)).mode & 0o777).toBe(0o600);
  expect((await fs.stat(path.dirname(yedek.arsivPath))).mode & 0o777).toBe(0o700);
  const ham = await fs.readFile(yedek.arsivPath);
  expect(ham.toString('utf8')).not.toContain('TURKUAZ');
  const okunmus = await Array.fromAsync(yedektenOku(yedek));
  expect(veriHash(okunmus[0].parent)).toBe(veriHash(kaynak.parent));
  await belgeyiTasi({ db, client, kaynak: okunmus[0] });
  await belgeyiGeriAl({ db, client, kaynak: okunmus[0], apply: true });
  expect(veriHash((await collection().findOne({ _id: kaynak.parent._id }, { promoteValues: false })).makineRevizyonlari)).toBe(veriHash(kaynak.parent.makineRevizyonlari));
});

test('bozuk şifreli yedek doğrulanmaz', async () => {
  await kaydet();
  const yedek = await yedekOlustur({ kaynaklar: kaynaklariOku(db, { modeller: ['Tesvik'] }), dizin });
  const ham = await fs.readFile(yedek.arsivPath);
  ham[ham.length - 1] ^= 1;
  await fs.writeFile(yedek.arsivPath, ham);
  await expect(yedegiDogrula(yedek)).rejects.toThrow();
});

test('taşıma erken durduğunda büyük yedek akışı kilitlenmeden kapanır', async () => {
  await kaydet();
  const buyuk = kaynakBelge();
  buyuk.makineRevizyonlari[0].uzunAciklama = require('crypto').randomBytes(300000).toString('base64');
  await kaydet(buyuk);
  const yedek = await yedekOlustur({ kaynaklar: kaynaklariOku(db, { modeller: ['Tesvik'] }), dizin });
  const iterator = yedektenOku(yedek);
  expect((await iterator.next()).done).toBe(false);
  expect((await iterator.return()).done).toBe(true);
}, 10000);
