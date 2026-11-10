const express = require('express');
const request = require('supertest');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const Firma = require('../../models/Firma');
const { getFirmalar, searchFirmalar, getFirmaStats } = require('../../controllers/firmaController');

jest.setTimeout(60000);

const app = express();
app.get('/firma', getFirmalar);
app.get('/firma/search', searchFirmalar);
app.get('/firma/stats', getFirmaStats);

const tarihte = (gun) => {
  const tarih = new Date();
  tarih.setDate(tarih.getDate() + gun);
  tarih.setHours(12, 0, 0, 0);
  return tarih;
};

let mem;
beforeAll(async () => {
  mem = await MongoMemoryServer.create();
  await mongoose.connect(mem.getUri());
  await Firma.collection.insertMany([
    { firmaId: 'A1', tamUnvan: 'Ortak Aktif Eski', aktif: true, etuysYetkiBitisTarihi: tarihte(-10), dysYetkiBitisTarihi: tarihte(-3) },
    { firmaId: 'A2', tamUnvan: 'Ortak Pasif Eski', aktif: false, etuysYetkiBitisTarihi: tarihte(-10) },
    { firmaId: 'A3', tamUnvan: 'Ortak Aktif Yakın', aktif: true, dysYetkiBitisTarihi: tarihte(3) },
    { firmaId: 'A4', tamUnvan: 'Ortak Pasif Yakın', aktif: false, dysYetkiBitisTarihi: tarihte(3) },
    { firmaId: 'A5', tamUnvan: 'Ortak Aktif Bu Ay', aktif: true, etuysYetkiBitisTarihi: tarihte(15) },
    { firmaId: 'A6', tamUnvan: 'Ortak Pasif Bu Ay', aktif: false, etuysYetkiBitisTarihi: tarihte(15) },
    { firmaId: 'A7', tamUnvan: 'Başka Aktif Eski', aktif: true, dysYetkiBitisTarihi: tarihte(-10) },
    { firmaId: 'A8', tamUnvan: 'Ortak Aktif Tarihsiz', aktif: true }
  ]);
});

afterAll(async () => {
  await mongoose.disconnect();
  if (mem) await mem.stop();
});

const idler = (yanit) => yanit.body.data.firmalar.map(({ firmaId }) => firmaId).sort();

test.each([
  ['expired', ['A1', 'A7'], ['A1']],
  ['expiring7', ['A3'], ['A3']],
  ['expiring30', ['A3', 'A5'], ['A3', 'A5']]
])('%s uyarısında aktiflik, yetki tarihi ve arama birlikte çalışır', async (yetkiDurumu, listedekiler, arananlar) => {
  const filtre = { aktif: 'all', yetkiDurumu };
  const liste = await request(app).get('/firma').query(filtre).expect(200);
  expect(idler(liste)).toEqual(listedekiler);
  expect(liste.body.data.pagination.toplamSayisi).toBe(listedekiler.length);

  const aramaliListe = await request(app).get('/firma').query({ ...filtre, arama: 'ortak' }).expect(200);
  expect(idler(aramaliListe)).toEqual(arananlar);
  expect(aramaliListe.body.data.pagination.toplamSayisi).toBe(arananlar.length);

  const arama = await request(app).get('/firma/search').query({ ...filtre, q: 'ortak' }).expect(200);
  expect(idler(arama)).toEqual(arananlar);
});

test('Pasif sekmesinde firma ve tarih bulunur; Yetkisi Biten ile birleşince gösterilmez', async () => {
  const pasifler = await request(app).get('/firma').query({ aktif: 'false' }).expect(200);
  expect(idler(pasifler)).toEqual(['A2', 'A4', 'A6']);
  expect(pasifler.body.data.firmalar.find((f) => f.firmaId === 'A2').etuysYetkiBitisTarihi).toBe(tarihte(-10).toISOString());

  const uyari = await request(app).get('/firma').query({ aktif: 'false', yetkiDurumu: 'expired' }).expect(200);
  expect(idler(uyari)).toEqual([]);
});

test('ana panel, birden fazla süresi geçmiş yetkisi olsa da aktif firmayı bir kez sayar', async () => {
  const stats = await request(app).get('/firma/stats').expect(200);
  expect(stats.body.data.suresiGecmisFirmaSayisi).toBe(2);
});
