const express = require('express');
const request = require('supertest');
const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const User = require('../../models/User');
const Firma = require('../../models/Firma');
const DosyaTakip = require('../../models/DosyaTakip');
const CariHareket = require('../../models/CariHareket');
const routes = require('../../routes/cari');

jest.setTimeout(60000);
const id = () => new mongoose.Types.ObjectId();
const firma = id();
const talep = id();
const hareket = id();
const eskiSecret = process.env.JWT_SECRET;
const tokenlar = {};
let mem, app;

beforeAll(async () => {
  mem = await MongoMemoryServer.create();
  await mongoose.connect(mem.getUri());
  process.env.JWT_SECRET = 'cari-yetki-regresyon';
  for (const rol of ['admin', 'kullanici', 'readonly']) {
    const _id = id();
    await User.collection.insertOne({ _id, adSoyad: `Test ${rol}`, rol, aktif: true });
    tokenlar[rol] = jwt.sign({ id: String(_id) }, process.env.JWT_SECRET);
  }
  await Firma.collection.insertOne({ _id: firma, tamUnvan: 'YETKİ TEST', firmaId: 'A-YETKI', cariDurumu: 'acik' });
  await DosyaTakip.collection.insertOne({ _id: talep, firma, firmaUnvan: 'YETKİ TEST', aktif: true });
  app = express();
  app.use(express.json());
  app.use('/cari', routes);
});
afterAll(async () => {
  await mongoose.disconnect();
  if (mem) await mem.stop();
  if (eskiSecret === undefined) delete process.env.JWT_SECRET; else process.env.JWT_SECRET = eskiSecret;
});
beforeEach(async () => {
  await CariHareket.deleteMany({});
  await Firma.collection.updateOne({ _id: firma }, { $set: { cariDurumu: 'acik' } });
  await CariHareket.create({ _id: hareket, firma, dosyaTakip: talep, tur: 'odenen',
    belgeAdi: 'Harç', tarih: new Date('2026-10-17'), tutar: 250 });
});

test.each([
  ['post', '/cari', { firma, tur: 'odenen', belgeAdi: 'Yeni harç', tarih: '2026-10-17', tutar: 100 }],
  ['put', `/cari/${hareket}`, { hizmeteDahil: true, tutar: 999 }],
  ['delete', `/cari/${hareket}`, {}],
  ['put', `/cari/firma/${firma}/durum`, { cariDurumu: 'kapandi' }]
])('readonly %s %s yazımını engeller, veriyi korur', async (metot, yol, govde) => {
  const cevap = await request(app)[metot](yol).auth(tokenlar.readonly, { type: 'bearer' }).send(govde);
  expect(cevap.status).toBe(403);
  expect(await CariHareket.countDocuments({})).toBe(1);
  expect(await CariHareket.findById(hareket).lean()).toMatchObject({ tutar: 250, hizmeteDahil: false });
  expect((await Firma.findById(firma).lean()).cariDurumu).toBe('acik');
});

test('readonly listeleri ve defterleri okumaya devam eder, dosya ucu okuma olarak kalır', async () => {
  for (const yol of ['/cari/firmalar', `/cari/firma/${firma}`, `/cari/talep/${talep}`]) {
    expect((await request(app).get(yol).auth(tokenlar.readonly, { type: 'bearer' })).status).toBe(200);
  }
  // Dosya yokluğu 404'tür; salt okunur rolü nedeniyle 403 verilmez.
  expect((await request(app).get(`/cari/${hareket}/dosya`).auth(tokenlar.readonly, { type: 'bearer' })).status).toBe(404);
});

test.each(['admin', 'kullanici'])('%s cari durumunu ve hareketleri değiştirebilir', async (rol) => {
  const auth = (req) => req.auth(tokenlar[rol], { type: 'bearer' });
  expect((await auth(request(app).put(`/cari/firma/${firma}/durum`)).send({ cariDurumu: 'kapandi' })).status).toBe(200);
  const yeni = await auth(request(app).post('/cari')).send({ firma, tur: 'odenen', belgeAdi: 'Yeni harç', tarih: '2026-10-17', tutar: 100 });
  expect(yeni.status).toBe(201);
  expect((await auth(request(app).put(`/cari/${hareket}`)).send({ hizmeteDahil: true })).status).toBe(200);
  expect((await auth(request(app).delete(`/cari/${yeni.body.data._id}`))).status).toBe(200);
  expect((await Firma.findById(firma).lean()).cariDurumu).toBe('kapandi');
  expect(await CariHareket.findById(hareket).lean()).toMatchObject({ tutar: 250, hizmeteDahil: true });
});

test('oturumsuz istek cari durumunu değiştiremez', async () => {
  expect((await request(app).put(`/cari/firma/${firma}/durum`).send({ cariDurumu: 'kapandi' })).status).toBe(401);
});
