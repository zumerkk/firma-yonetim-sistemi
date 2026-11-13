const express = require('express');
const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');
const request = require('supertest');
const { MongoMemoryServer } = require('mongodb-memory-server');
const User = require('../../models/User');
const Tesvik = require('../../models/Tesvik');
const YeniTesvik = require('../../models/YeniTesvik');
const HarcamaKalemi = require('../../models/HarcamaKalemi');
const depo = require('../../services/tesvikMakine/faturaEvrakDeposu');
const routes = require('../../routes/tesvikMakine');

jest.mock('../../services/tesvikMakine/storageService', () => ({
  ...jest.requireActual('../../services/tesvikMakine/storageService'),
  isCloudinaryConfigured: () => false
}));

jest.setTimeout(60_000);

const app = express();
app.use(express.json());
app.use('/api/tesvik-makine', routes);

const belgeId = new mongoose.Types.ObjectId();
const digerBelgeId = new mongoose.Types.ObjectId();
const adres = (model = 'Tesvik', id = belgeId) => `/api/tesvik-makine/certificates/${model}/${id}/harcamalar`;
const pdf = Buffer.from('%PDF-1.4\nSentetik harcama\n%%EOF\n');
const xml = Buffer.from('<?xml version="1.0"?><Invoice><ID>TEST-1</ID></Invoice>');
const veri = { kategori: 'diger', altKategori: 'etutProje', tarih: '2026-11-01', no: 'FT-001', icerik: 'Proje', tutar: 1250.25, adet: 2 };

let mongo;
let editor;
let okuyucu;

beforeAll(async () => {
  process.env.JWT_SECRET = 'harcama-test-anahtari';
  mongo = await MongoMemoryServer.create();
  await mongoose.connect(mongo.getUri());
  const editId = new mongoose.Types.ObjectId();
  const okuId = new mongoose.Types.ObjectId();
  await User.collection.insertMany([
    { _id: editId, email: 'editor@example.test', adSoyad: 'Test Editör', aktif: true, rol: 'kullanici' },
    { _id: okuId, email: 'okuyucu@example.test', adSoyad: 'Test Okuyucu', aktif: true, rol: 'readonly' }
  ]);
  editor = jwt.sign({ id: String(editId) }, process.env.JWT_SECRET);
  okuyucu = jwt.sign({ id: String(okuId) }, process.env.JWT_SECRET);
  await Tesvik.collection.insertMany([{ _id: belgeId }, { _id: digerBelgeId }]);
  await YeniTesvik.collection.insertOne({ _id: belgeId });
});

afterAll(async () => {
  await mongoose.disconnect();
  if (mongo) await mongo.stop();
});

afterEach(async () => {
  const kalemler = await HarcamaKalemi.find().select('+evraklar.depo');
  for (const kalem of kalemler) {
    for (const evrak of kalem.evraklar) await depo.sil(evrak.depo);
  }
  await HarcamaKalemi.deleteMany({});
});

const ekle = (yol = adres(), govde = veri) => request(app).post(yol).auth(editor, { type: 'bearer' }).send(govde);

test('iki belge modeli ayrı harcama listeleri döndürür, kalemler giriş sırasına göre gelir', async () => {
  await request(app).get(adres()).expect(401);
  const bos = await request(app).get(adres()).auth(okuyucu, { type: 'bearer' }).expect(200);
  expect(bos.body.data.kalemler).toEqual([]);
  expect(Object.keys(bos.body.data.kategoriler)).toEqual(['diger', 'bina', 'arazi']);
  expect(bos.body.data.kategoriler.bina.altKategoriler).toEqual(expect.arrayContaining([
    { id: 'idareBinalari', etiket: 'İdare Binaları' }, { id: 'yerAltiGalerileri', etiket: 'Yeraltı Galerileri' }
  ]));
  await request(app).post(adres()).auth(okuyucu, { type: 'bearer' }).send(veri).expect(403);
  const ilk = (await ekle().expect(201)).body.data;
  const sonraki = (await ekle(adres(), { ...veri, kategori: 'arazi', altKategori: 'arazi', no: 'FT-002', tarih: '2026-10-01' }).expect(201)).body.data;
  expect(ilk).toMatchObject({ ...veri, tarih: '2026-11-01T00:00:00.000Z', girenAdi: 'Test Editör', evraklar: [] });
  await ekle(adres('YeniTesvik'), { ...veri, kategori: 'bina', altKategori: 'anaBina', no: 'FT-003' }).expect(201);
  const liste = await request(app).get(adres()).auth(okuyucu, { type: 'bearer' }).expect(200);
  expect(liste.body.data.kalemler.map((k) => k._id)).toEqual([ilk._id, sonraki._id]);
  const yeniListe = await request(app).get(adres('YeniTesvik')).auth(editor, { type: 'bearer' }).expect(200);
  expect(yeniListe.body.data.kalemler.map((k) => k.no)).toEqual(['FT-003']);
  await request(app).patch(`${adres('YeniTesvik')}/${ilk._id}`).auth(editor, { type: 'bearer' }).send({ tutar: 45 }).expect(404);
  await request(app).delete(`${adres('Tesvik', digerBelgeId)}/${ilk._id}`).auth(editor, { type: 'bearer' }).expect(404);
  await request(app).delete(`${adres()}/${ilk._id}`).auth(okuyucu, { type: 'bearer' }).expect(403);
  await request(app).get(adres('toString')).auth(editor, { type: 'bearer' }).expect(400);
  await request(app).get(adres('Tesvik', new mongoose.Types.ObjectId())).auth(editor, { type: 'bearer' }).expect(404);
});

test('tek geçerli alt kategori ve pozitif iki haneli TL tutarı doğrulanır, kayıt tekrarı yinelenmez', async () => {
  for (const degisiklik of [
    { kategori: '__proto__' }, { altKategori: 'anaBina' }, { altKategori: ['etutProje', 'diger'] },
    { tarih: '2026-02-30' }, { no: '' }, { tutar: '12abc' }, { tutar: true }, { tutar: 12.123 }, { tutar: 0 }, { adet: -1 }
  ]) {
    await ekle(adres(), { ...veri, ...degisiklik }).expect(400);
  }
  const tekrar = { ...veri, istekId: 'harcama-kayit-1' };
  const [ilk, ayni] = await Promise.all([ekle(adres(), tekrar).expect(201), ekle(adres(), tekrar).expect(201)]);
  expect(ayni.body.data._id).toBe(ilk.body.data._id);
  expect(ilk.body.data).not.toHaveProperty('istekId');
  expect(ayni.body.data).not.toHaveProperty('istekOzeti');
  await ekle(adres(), { ...tekrar, tutar: 12 }).expect(409);
  expect(await HarcamaKalemi.countDocuments()).toBe(1);
  const yol = `${adres()}/${ilk.body.data._id}`;
  await request(app).patch(yol).auth(editor, { type: 'bearer' }).send({ kategori: 'bina' }).expect(400);
  const guncel = await request(app).patch(yol).auth(editor, { type: 'bearer' })
    .send({ kategori: 'bina', altKategori: 'anaBina', tutar: 220.35 }).expect(200);
  expect(guncel.body.data).toMatchObject({ kategori: 'bina', altKategori: 'anaBina', tutar: 220.35, no: veri.no });
});

test('her türden birden çok evrak eklenir, yalnız yetkili aynı belge ve kalem üzerinden okunur', async () => {
  const { _id } = (await ekle().expect(201)).body.data;
  const kalemYolu = `${adres()}/${_id}`;
  const yol = `${kalemYolu}/evrak`;
  const yukle = () => request(app).post(yol).field('istekId', 'harcama-evrak-1')
    .attach('faturaPdf', pdf, 'fatura-1.pdf').attach('faturaPdf', pdf, 'fatura-2.pdf')
    .attach('faturaXml', xml, { filename: 'fatura-1.xml', contentType: 'application/xml' })
    .attach('faturaXml', xml, { filename: 'fatura-2.xml', contentType: 'application/xml' })
    .attach('yevmiyePdf', pdf, 'yevmiye-1.pdf').attach('yevmiyePdf', pdf, 'yevmiye-2.pdf');
  await yukle().auth(okuyucu, { type: 'bearer' }).expect(403);
  await request(app).post(yol).auth(editor, { type: 'bearer' }).attach('beyannamePdf', pdf, 'beyanname.pdf').expect(400);
  const yuklenen = await yukle().auth(editor, { type: 'bearer' }).expect(200);
  const ekler = yuklenen.body.data.evraklar;
  expect(ekler.map((e) => e.tur)).toEqual(['fatura_pdf', 'fatura_pdf', 'fatura_xml', 'fatura_xml', 'yevmiye_pdf', 'yevmiye_pdf']);
  for (const ek of ekler) {
    expect(ek).not.toHaveProperty('depo');
    expect(ek).not.toHaveProperty('istekId');
    expect(ek).not.toHaveProperty('istekOzeti');
  }
  expect((await yukle().auth(editor, { type: 'bearer' }).expect(200)).body.data.evraklar).toEqual(ekler);
  const ekId = ekler[0]._id;
  await request(app).get(`${yol}/${ekId}`).expect(401);
  await request(app).get(`${adres('YeniTesvik')}/${_id}/evrak/${ekId}`).auth(editor, { type: 'bearer' }).expect(404);
  const indirilen = await request(app).get(`${yol}/${ekId}`).auth(okuyucu, { type: 'bearer' }).expect(200);
  expect(indirilen.headers['cache-control']).toBe('private, no-store');
  expect(indirilen.headers['x-content-type-options']).toBe('nosniff');
  expect(indirilen.headers['content-type']).toBe('application/pdf');
  expect(indirilen.body).toEqual(pdf);
  const guncel = await request(app).patch(kalemYolu).auth(editor, { type: 'bearer' }).send({ no: 'FT-NEW' }).expect(200);
  expect(guncel.body.data.evraklar).toEqual(ekler);
  const kayitli = await HarcamaKalemi.findById(_id).select('+evraklar.depo');
  await request(app).delete(kalemYolu).auth(editor, { type: 'bearer' }).expect(200);
  await request(app).get(`${yol}/${ekId}`).auth(editor, { type: 'bearer' }).expect(404);
  for (const ek of kayitli.evraklar) await expect(depo.oku(ek.depo)).rejects.toMatchObject({ status: 404 });
});
