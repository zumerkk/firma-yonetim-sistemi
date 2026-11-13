const express = require('express');
const request = require('supertest');
const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const router = require('../../routes/tesvikMakine');
const Tesvik = require('../../models/Tesvik');
const YeniTesvik = require('../../models/YeniTesvik');
const MachineProcess = require('../../models/MachineProcess');
const HarcamaKalemi = require('../../models/HarcamaKalemi');
const User = require('../../models/User');
const mps = require('../../services/tesvikMakine/machineProcessService');

jest.setTimeout(60000);

const app = express();
app.use(express.json());
app.use('/tesvik-makine', router);
const kullaniciId = new mongoose.Types.ObjectId();
const editorId = new mongoose.Types.ObjectId();
const belgeId = new mongoose.Types.ObjectId();
const model = 'Tesvik';
const tarih = new Date('2026-10-01');
const adres = (tesvikModel = model, tesvikId = belgeId) => `/tesvik-makine/certificates/${tesvikModel}/${tesvikId}/gerceklesme`;
const oku = (tesvikModel, tesvikId) => request(app).get(adres(tesvikModel, tesvikId)).set('Authorization', `Bearer ${token}`);
const harcama = (kategori, altKategori, tutar, no = altKategori) => ({ tesvikModel: model, tesvikId: belgeId, kategori, altKategori, tutar, no, tarih });
const surec = (rowId, listType, ek = {}) => ({ tesvikModel: model, tesvikId: belgeId, rowId, listType, ...ek });
let mongo;
let token;
let editorToken;

beforeAll(async () => {
  mongo = await MongoMemoryServer.create();
  await mongoose.connect(mongo.getUri());
  process.env.JWT_SECRET = 'yerel-gerceklesme-test-anahtari';
  await User.collection.insertMany([
    { _id: kullaniciId, email: 'okuyucu@example.test', aktif: true, rol: 'readonly' },
    { _id: editorId, email: 'editor@example.test', aktif: true, rol: 'kullanici' }
  ]);
  token = jwt.sign({ id: String(kullaniciId) }, process.env.JWT_SECRET);
  editorToken = jwt.sign({ id: String(editorId) }, process.env.JWT_SECRET);
});

beforeEach(async () => {
  await Promise.all([Tesvik.deleteMany({}), YeniTesvik.deleteMany({}), MachineProcess.deleteMany({}), HarcamaKalemi.deleteMany({})]);
});

afterAll(async () => {
  await mongoose.disconnect();
  if (mongo) await mongo.stop();
});

test('gerçekleşme tablosu aktif TL kalemleri toplar ve kur farkını genel toplama bir kez ekler', async () => {
  await Tesvik.collection.insertOne({ _id: belgeId, makineListeleri: {
    yerli: [
      { rowId: 'Y1', adiVeOzelligi: 'Pres', gerceklesenTutar: 999 },
      { rowId: 'Y2', adiVeOzelligi: 'Ölçüm', gerceklesenTutar: 10.10 },
      { adiVeOzelligi: 'Eski makine', gerceklesenTutar: 1.20 }
    ],
    ithal: [
      { rowId: 'I1', adiVeOzelligi: 'Robot', gerceklesenTutar: 888, toplamTutarFobTl: 99999 },
      { rowId: 'I2', adiVeOzelligi: 'Eski beyanname', gerceklesenTutar: 777 },
      { rowId: 'S1', silinmeTarihi: tarih, gerceklesenTutar: 9000 },
      { rowId: 'I3', adiVeOzelligi: 'Eski TL gerçekleşmesi', gerceklesenTutar: 2.25 }
    ]
  } });
  await YeniTesvik.collection.insertOne({ _id: belgeId, makineListeleri: { yerli: [], ithal: [] } });
  await MachineProcess.create([
    surec('Y1', 'local', { faturalar: [{ tarih, no: 'F-1', icerik: 'Ana gövde', tutar: 100.15, adet: 2 }] }),
    surec('Y2', 'local'),
    surec('I1', 'import', { currency: 'EUR', faturalar: [
      { tarih, no: 'B-1', tutar: 200.25, tutarParaBirimi: 'TRY' },
      { tarih, no: 'B-2', tutar: 600, kaynak: 'firma' },
      { tarih, no: 'B-3', tutar: 0, tutarParaBirimi: 'EUR' }
    ] }),
    surec('I2', 'import', { currency: 'EUR', invoiceNo: 'B-ESKI', invoiceRealizedValue: 700 }),
    surec('S1', 'import', { faturalar: [{ no: 'B-SILINDI', tutar: 8000, tutarParaBirimi: 'TRY' }] }),
    surec('Y1', 'local', { tesvikModel: 'YeniTesvik', faturalar: [{ no: 'BASKA-MODEL', tutar: 5000 }] }),
    surec('S2', 'local', { faturalar: [{ no: 'BASKA-SATIR', tutar: 4000 }] })
  ]);
  await HarcamaKalemi.create([
    harcama('arazi', 'arazi', 12.50), harcama('arazi', 'faizKarPayi', 0.20), harcama('arazi', 'kurFarki', 2.50),
    harcama('bina', 'anaBina', 50.25), harcama('bina', 'yerAltiGalerileri', 3.30), harcama('bina', 'kurFarki', 1.50),
    harcama('diger', 'montaj', 10.10), harcama('diger', 'montaj', 0.20, 'montaj-2'), harcama('diger', 'harcamaBelgesi', 10),
    harcama('diger', 'maddiOlmayanVarlik', 1.23), harcama('diger', 'kurFarki', 0.50),
    { ...harcama('arazi', 'arazi', 10000, 'BASKA-MODEL'), tesvikModel: 'YeniTesvik' },
    { ...harcama('arazi', 'arazi', 10000, 'BASKA-BELGE'), tesvikId: new mongoose.Types.ObjectId() }
  ]);

  const { body: { data } } = await oku().expect(200);
  const [arazi, bina, diger] = data.gruplar;
  expect(data.gruplar.map(({ id, toplam }) => [id, toplam])).toEqual([['arazi', 12.70], ['bina', 53.55], ['diger', 21.53]]);
  expect(arazi.satirlar.find((satir) => satir.id === 'faizKarPayi').tutar).toBe(0.20);
  expect(bina.satirlar.find((satir) => satir.id === 'yerAltiGalerileri').tutar).toBe(3.30);
  expect(diger.satirlar.find((satir) => satir.id === 'montaj').tutar).toBe(10.30);
  expect(diger.satirlar.find((satir) => satir.id === 'ithalatGumrukleme').tutar).toBe(0);
  expect(data.gruplar.flatMap(({ satirlar }) => satirlar).some(({ id }) => id === 'kurFarki')).toBe(false);
  expect(data).toMatchObject({ yerli: 111.45, ithal: 202.50, kurFarki: 4.50, toplam: 406.23, cevrilmemisIthalKalemSayisi: 2 });
  expect(data.kalemler.reduce((toplam, { tutar }) => toplam + Math.round(tutar * 100), 0)).toBe(40623);
  expect(data.kalemler).toContainEqual({
    grup: 'Yerli Liste', kategori: 'Fatura', tarih: tarih.toISOString(), no: 'F-1', icerik: 'Pres · Ana gövde', adet: 2, tutar: 100.15
  });
  expect(data.kalemler).toContainEqual({
    grup: 'İthal Liste', kategori: 'Beyanname', tarih: null, no: '', icerik: 'Eski TL gerçekleşmesi', adet: null, tutar: 2.25
  });
  expect(data.kalemler.filter(({ no }) => ['B-2', 'B-ESKI', 'B-SILINDI'].includes(no))).toEqual([]);
  expect(await oku('YeniTesvik').expect(200)).toMatchObject({ body: { data: { yerli: 0, ithal: 0, toplam: 10000 } } });
});

test('eski dövizli beyannamenin girilen TL karşılığı özgün döviz kaydını korur ve bir kez gerçekleşir', async () => {
  await Tesvik.collection.insertOne({ _id: belgeId, makineListeleri: { ithal: [{ rowId: 'I1' }] } });
  const proc = await MachineProcess.create(surec('I1', 'import', { currency: 'EUR', faturalar: [
    { tarih, no: 'ESKI', tutar: 100, adet: 3, kaynak: 'firma' },
    { tarih, no: 'YENI', tutar: 250, tutarParaBirimi: 'TRY' }
  ] }));
  const [dovizli, tl] = proc.faturalar;
  const guncelle = (kalem, veri, yetki = editorToken) => request(app)
    .patch(`/tesvik-makine/process/${proc._id}/fatura-kalemleri/${kalem._id}`).auth(yetki, { type: 'bearer' }).send(veri);

  expect((await oku().expect(200)).body.data).toMatchObject({ ithal: 250, cevrilmemisIthalKalemSayisi: 1 });
  await guncelle(dovizli, { malBedeliTl: 3200 }, token).expect(403);
  await guncelle(dovizli, { malBedeliTl: 3200.125 }).expect(400);
  await guncelle(dovizli, { malBedeliTl: 0 }).expect(400);
  await guncelle(tl, { malBedeliTl: 3200 }).expect(400);
  const { body: { data } } = await guncelle(dovizli, { malBedeliTl: 3200.25 }).expect(200);
  expect(data).toMatchObject({ invoiceRealizedValue: 3450.25, faturaTutarToplamlari: { TRY: 3450.25, USD: 100 } });
  expect(data.faturalar[0]).toMatchObject({ tutar: 100, tutarParaBirimi: 'USD', malBedeliTl: 3200.25 });
  expect((await Tesvik.findById(belgeId).lean()).makineListeleri.ithal[0].gerceklesenTutar).toBe(3450.25);

  await guncelle(dovizli, { icerik: 'Bilgi güncellendi' }).expect(200);
  const { body: { data: ozet } } = await oku().expect(200);
  expect(ozet).toMatchObject({ ithal: 3450.25, toplam: 3450.25, cevrilmemisIthalKalemSayisi: 0 });
  expect(ozet.kalemler.map(({ no, tutar, adet }) => [no, tutar, adet])).toEqual([['ESKI', 3200.25, 3], ['YENI', 250, 0]]);

  await guncelle(dovizli, { malBedeliTl: null }).expect(200);
  expect((await MachineProcess.findById(proc._id).lean()).faturalar[0]).not.toHaveProperty('malBedeliTl');
  expect((await oku().expect(200)).body.data).toMatchObject({ ithal: 250, cevrilmemisIthalKalemSayisi: 1 });
});

test('son fatura silindikten sonra eski liste tutarı gerçekleşmeye geri dönmez', async () => {
  await Tesvik.collection.insertOne({ _id: belgeId, makineListeleri: { yerli: [{ rowId: 'Y1', gerceklesenTutar: 50 }], ithal: [] } });
  const proc = await MachineProcess.create(surec('Y1', 'local', { faturalar: [{ no: 'F-1', tutar: 50 }] }));
  expect((await oku().expect(200)).body.data.yerli).toBe(50);
  await mps.faturaKalemiSil(proc, proc.faturalar[0]._id);
  expect((await Tesvik.findById(belgeId).lean()).makineListeleri.yerli[0].gerceklesenTutar).toBe(0);
  // Liste başka bir işlemde eski kopyadan geri yazılsa bile gerçekleşme silinen faturayı göstermez.
  await Tesvik.collection.updateOne({ _id: belgeId }, { $set: { 'makineListeleri.yerli.0.gerceklesenTutar': 50 } });
  expect((await oku().expect(200)).body.data).toMatchObject({ yerli: 0, toplam: 0, kalemler: [] });
});

test('eski faturalardaki yarım kuruşlar makine toplamında ve gerçekleşmede aynı yuvarlanır', async () => {
  await Tesvik.collection.insertOne({ _id: belgeId, makineListeleri: { yerli: [{ rowId: 'Y1' }] } });
  const proc = await MachineProcess.create(surec('Y1', 'local', { faturalar: [{ no: 'F-1', tutar: 1.005 }] }));
  expect(mps.faturaTutarToplamlari(proc)).toEqual({ TRY: 1.01 });
  expect((await oku().expect(200)).body.data).toMatchObject({ yerli: 1.01, toplam: 1.01 });
});

test('özet oturum ister ve yanlış belge veya model için kayıt döndürmez', async () => {
  await request(app).get(adres()).expect(401);
  await oku('YanlisModel').expect(400);
  await oku(model, 'gecersiz').expect(404);
  await oku().expect(404);
});
