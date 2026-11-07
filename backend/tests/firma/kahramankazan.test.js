const express = require('express');
const request = require('supertest');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const Firma = require('../../models/Firma');
const Tesvik = require('../../models/Tesvik');
const YeniTesvik = require('../../models/YeniTesvik');
const firmaCtrl = require('../../controllers/firmaController');
const { eskiIlceKayitlariniGuncelle } = require('../../services/kahramankazanMigrasyonu');

jest.setTimeout(60000);
let mem;
beforeAll(async () => {
  mem = await MongoMemoryServer.create();
  await mongoose.connect(mem.getUri());
});
afterAll(async () => {
  await mongoose.disconnect();
  if (mem) await mem.stop();
});

test('mevcut Ankara/Kazan ilçe alanlarını taşır; adres, durum ve diğer iller korunur', async () => {
  const firma = { firmaId: 'A000001', firmaIl: 'Ankara', firmaIlce: ' Kazan ', aktif: false, adres: 'Kazan OSB',
    updatedAt: new Date('2026-10-01') };
  const baskaIl = { firmaId: 'A000002', firmaIl: 'BURSA', firmaIlce: 'KAZAN' };
  const farkliIlce = { firmaId: 'A000003', firmaIl: 'ANKARA', firmaIlce: 'KAZAN OSB' };
  const belge = { yatirimBilgileri: { yerinIl: 'ANKARA', yerinIlce: 'KAZAN', yatirimAdresi1: 'Kazan OSB' } };
  await Firma.collection.insertMany([firma, baskaIl, farkliIlce]);
  await Tesvik.collection.insertOne(belge);
  await YeniTesvik.collection.insertOne({ ...belge, _id: new mongoose.Types.ObjectId() });

  expect(await eskiIlceKayitlariniGuncelle()).toBe(3);
  expect(await Firma.collection.findOne({ firmaId: firma.firmaId })).toMatchObject({ ...firma, firmaIlce: 'KAHRAMANKAZAN' });
  expect(await Firma.collection.findOne({ firmaId: baskaIl.firmaId })).toMatchObject(baskaIl);
  expect(await Firma.collection.findOne({ firmaId: farkliIlce.firmaId })).toMatchObject(farkliIlce);
  for (const Model of [Tesvik, YeniTesvik]) {
    expect(await Model.collection.findOne({})).toMatchObject({
      yatirimBilgileri: { ...belge.yatirimBilgileri, yerinIlce: 'KAHRAMANKAZAN' }
    });
  }
  expect(await eskiIlceKayitlariniGuncelle()).toBe(0);
});

test.each([
  [Firma, { firmaIl: 'ANKARA', firmaIlce: 'Kazan' }, 'firmaIlce'],
  [Tesvik, { yatirimBilgileri: { yerinIl: 'Ankara', yerinIlce: 'Kazan' } }, 'yatirimBilgileri.yerinIlce'],
  [YeniTesvik, { yatirimBilgileri: { yerinIl: 'Ankara', yerinIlce: 'Kazan' } }, 'yatirimBilgileri.yerinIlce']
])('%p yeni kayıtta eski ilçe adını günceller', async (Model, data, alan) => {
  const kayit = new Model(data);
  await kayit.validate([alan]);
  expect(kayit.get(alan)).toBe('KAHRAMANKAZAN');
});

test('firma API kısmi güncellemede mevcut ili kullanır ve eski ilçe filtresini kabul eder', async () => {
  const app = express();
  app.use(express.json());
  app.use((req, _res, next) => {
    req.user = { _id: new mongoose.Types.ObjectId(), adSoyad: 'Test', rol: 'admin' };
    next();
  });
  app.put('/firma/:id', firmaCtrl.updateFirma);
  app.get('/firma', firmaCtrl.getFirmalar);
  const firma = await Firma.collection.insertOne({ firmaId: 'A000004', tamUnvan: 'Test A.Ş.', firmaIl: 'ANKARA', aktif: true });
  const duzenlenen = await request(app).put('/firma/A000004').send({ firmaIlce: 'kazan' });
  expect(duzenlenen.status).toBe(200);
  expect((await Firma.collection.findOne({ _id: firma.insertedId })).firmaIlce).toBe('KAHRAMANKAZAN');
  const liste = await request(app).get('/firma').query({ firmaIl: 'Ankara', firmaIlce: 'Kazan' });
  expect(liste.body.data.firmalar.map((f) => f.firmaId)).toEqual(['A000004']);
});
