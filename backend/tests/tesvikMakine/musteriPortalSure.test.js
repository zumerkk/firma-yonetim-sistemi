const express = require('express');
const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');
const request = require('supertest');
const { MongoMemoryServer } = require('mongodb-memory-server');
const Tesvik = require('../../models/Tesvik');
const YeniTesvik = require('../../models/YeniTesvik');
const User = require('../../models/User');
const MachineProcess = require('../../models/MachineProcess');
const HarcamaKalemi = require('../../models/HarcamaKalemi');
const portal = require('../../services/musteriPortal/portalService');
const router = require('../../routes/musteriPortal');

jest.setTimeout(60_000);

const app = express();
app.use(express.json());
app.use('/api/musteri-belge', router);
const yol = '/api/musteri-belge';
const models = { Tesvik, YeniTesvik };
const belgeId = new mongoose.Types.ObjectId();
const editorId = new mongoose.Types.ObjectId();
const fixtureSecret = 'customer-link-authorization-fixture-only';
const eskiSecret = process.env.JWT_SECRET;
const gun = { baslangicTarihi: '2032-02-29', bitisTarihi: '2032-02-29' };
const legacyToken = 'legacy-customer-link-fixture';
const tokenAl = ({ link }) => link.split('/belge/')[1];
const yonetim = (model) => `${yol}/yonetim/${model}/${belgeId}`;
const editor = () => `Bearer ${jwt.sign({ id: String(editorId) }, fixtureSecret)}`;
let mongo;

beforeAll(async () => {
  process.env.JWT_SECRET = fixtureSecret;
  mongo = await MongoMemoryServer.create();
  await mongoose.connect(mongo.getUri());
  await User.collection.insertOne({ _id: editorId, aktif: true, rol: 'admin', adSoyad: 'Test Personel' });
});

beforeEach(async () => {
  await Promise.all([Tesvik.deleteMany({}), YeniTesvik.deleteMany({}), MachineProcess.deleteMany({}), HarcamaKalemi.deleteMany({})]);
  await Promise.all(Object.values(models).map(Model => Model.collection.insertOne({
    _id: belgeId, yatirimciUnvan: 'Bağlantı Testi', makineListeleri: { yerli: [], ithal: [] }
  })));
  jest.useFakeTimers({ doNotFake: ['nextTick', 'queueMicrotask', 'setImmediate', 'clearImmediate',
    'setTimeout', 'clearTimeout', 'setInterval', 'clearInterval', 'performance', 'hrtime'] });
  jest.setSystemTime(new Date('2032-02-28T20:59:59.999Z'));
});

afterEach(() => jest.useRealTimers());

afterAll(async () => {
  if (eskiSecret === undefined) delete process.env.JWT_SECRET;
  else process.env.JWT_SECRET = eskiSecret;
  await mongoose.disconnect();
  if (mongo) await mongo.stop();
});

test.each(Object.keys(models))('%s: yönetim durumu ve erişim İstanbul gece yarısı sınırlarında birlikte değişir', async model => {
  const adres = yonetim(model);
  await request(app).post(adres).send(gun).expect(401);
  const uretilen = await request(app).post(adres).set('Authorization', editor()).send(gun).expect(200);
  expect(uretilen.body.data).toMatchObject({ ...gun, durum: 'planlandi', olusturanAdi: 'Test Personel' });
  const token = tokenAl(uretilen.body.data);
  const musteri = `${yol}/${token}`;
  await request(app).get(musteri).expect('Cache-Control', 'private, no-store').expect(404);

  jest.setSystemTime(new Date('2032-02-28T21:00:00.000Z'));
  const acik = await request(app).get(musteri).expect('Cache-Control', 'private, no-store').expect(200);
  expect(acik.body.data.belge.yatirimciUnvan).toBe('Bağlantı Testi');
  const durum = () => request(app).get(adres).set('Authorization', editor()).expect(200);
  expect((await durum()).body.data).toMatchObject({ ...gun, durum: 'aktif' });
  jest.setSystemTime(new Date('2032-02-29T20:59:59.999Z'));
  await request(app).get(musteri).expect(200);

  jest.setSystemTime(new Date('2032-02-29T21:00:00.000Z'));
  await request(app).get(musteri).expect('Cache-Control', 'private, no-store').expect(404);
  expect((await durum()).body.data).toMatchObject({ ...gun, durum: 'suresi_doldu', link: uretilen.body.data.link });
});

test.each([
  {},
  { baslangicTarihi: '2032-02-29' },
  { baslangicTarihi: '2032-02-30', bitisTarihi: '2032-03-01' },
  { baslangicTarihi: '2032-02-29T00:00:00.000Z', bitisTarihi: '2032-02-29' },
  { baslangicTarihi: '2032-03-02', bitisTarihi: '2032-03-01' },
  { baslangicTarihi: '2032-02-01', bitisTarihi: '2032-02-27' },
  { baslangicTarihi: null, bitisTarihi: null }
])('geçersiz tarih girdisi yeni token oluşturmaz (%p)', async tarihler => {
  await request(app).post(yonetim('Tesvik')).set('Authorization', editor()).send(tarihler).expect(400);
  expect(await portal.linkGetir('Tesvik', belgeId)).toBeNull();
});

test('saklanan tarihsiz bağlantı çalışır, süresiz rotasyon yerine açık tarih gerekir', async () => {
  await Tesvik.collection.updateOne({ _id: belgeId }, { $set: { 'musteriPortal.token': legacyToken } });
  const eski = await portal.linkGetir('Tesvik', belgeId);
  expect(eski).toMatchObject({ durum: 'aktif', baslangicTarihi: null, bitisTarihi: null });
  expect(await portal.linkUret('Tesvik', belgeId)).toEqual(eski);
  await request(app).get(`${yol}/${legacyToken}`).expect(200);
  await expect(portal.linkUret('Tesvik', belgeId, { yenile: true })).rejects.toMatchObject({ status: 400 });
  const yeni = await portal.linkUret('Tesvik', belgeId, { yenile: true, ...gun });
  await request(app).get(`${yol}/${legacyToken}`).expect(404);
  expect(yeni).toMatchObject({ ...gun, durum: 'planlandi' });
});

test('tarihsiz yenileme geçerli pencereyi korur ve süresi dolanı canlandırmaz', async () => {
  const ilk = await portal.linkUret('Tesvik', belgeId, gun);
  const yenilenen = await portal.linkUret('Tesvik', belgeId, { yenile: true, beklenenSurum: ilk.surum });
  expect(yenilenen).toMatchObject({ ...gun, durum: 'planlandi' });
  expect(yenilenen.link).not.toBe(ilk.link);
  jest.setSystemTime(new Date('2032-02-29T21:00:00.000Z'));
  expect((await portal.linkUret('Tesvik', belgeId)).durum).toBe('suresi_doldu');
  await expect(portal.linkUret('Tesvik', belgeId, { yenile: true })).rejects.toMatchObject({ status: 400 });
  await portal.linkKapat('Tesvik', belgeId);
  await expect(portal.linkUret('Tesvik', belgeId)).rejects.toMatchObject({ status: 400 });
  expect(await portal.linkGetir('Tesvik', belgeId)).toBeNull();
  const yenisi = await portal.linkUret('Tesvik', belgeId, { baslangicTarihi: '2032-03-01', bitisTarihi: '2032-03-02' });
  expect(yenisi.durum).toBe('aktif');
  await request(app).get(`${yol}/${tokenAl(yenilenen)}`).expect(404);
  await request(app).get(`${yol}/${tokenAl(yenisi)}`).expect(200);
});

test('hem açılıştan önce hem bitişten sonra bütün token yolları aynı 404 ile kapanır', async () => {
  const token = tokenAl(await portal.linkUret('Tesvik', belgeId, gun));
  const musteri = `${yol}/${token}`;
  const kalemId = new mongoose.Types.ObjectId();
  const yollar = [
    ['get', musteri],
    ['get', `${musteri}/gerceklesme`],
    ['post', `${musteri}/fatura-kalemi`],
    ['patch', `${musteri}/fatura-kalemi/${kalemId}`],
    ['delete', `${musteri}/fatura-kalemi/${kalemId}`],
    ['post', `${musteri}/fatura-kalemi/${kalemId}/evrak`],
    ['get', `${musteri}/fatura-kalemi/${kalemId}/evrak/${kalemId}`],
    ['delete', `${musteri}/fatura-kalemi/${kalemId}/evrak/${kalemId}`],
    ['get', `${musteri}/harcamalar`],
    ['post', `${musteri}/harcamalar`],
    ['patch', `${musteri}/harcamalar/${kalemId}`],
    ['delete', `${musteri}/harcamalar/${kalemId}`],
    ['post', `${musteri}/harcamalar/${kalemId}/evrak`],
    ['get', `${musteri}/harcamalar/${kalemId}/evrak/${kalemId}`],
    ['delete', `${musteri}/harcamalar/${kalemId}/evrak/${kalemId}`]
  ];
  for (const saat of ['2032-02-28T20:59:59.999Z', '2032-02-29T21:00:00.000Z']) {
    jest.setSystemTime(new Date(saat));
    for (const [method, adres] of yollar) {
      const yanit = await request(app)[method](adres).expect('Cache-Control', 'private, no-store').expect(404);
      expect(yanit.body).toEqual({ success: false, message: 'Bağlantı bulunamadı veya geçersiz. Lütfen danışmanınızla iletişime geçin.' });
    }
  }
  expect(await MachineProcess.countDocuments()).toBe(0);
  expect(await HarcamaKalemi.countDocuments()).toBe(0);
});

test('eksik tarihli bozuk kayıt süresiz bağlantı olarak açılmaz', async () => {
  await Tesvik.collection.updateOne({ _id: belgeId }, { $set: {
    'musteriPortal.token': legacyToken,
    'musteriPortal.baslangicTarihi': new Date('2032-02-01')
  } });
  await request(app).get(`${yol}/${legacyToken}`).expect(404);
  expect((await portal.linkGetir('Tesvik', belgeId)).durum).toBe('suresi_doldu');
});
