const express = require('express');
const request = require('supertest');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
require('../../models/User');
const Firma = require('../../models/Firma');
const DosyaTakip = require('../../models/DosyaTakip');
const ctrl = require('../../controllers/dosyaTakipController');
const firmaCtrl = require('../../controllers/firmaController');

jest.setTimeout(60000);
let mem, app, hedef;
const id = () => new mongoose.Types.ObjectId();

beforeAll(async () => {
  mem = await MongoMemoryServer.create();
  await mongoose.connect(mem.getUri());
  app = express();
  app.get('/liste', ctrl.getTumTalepler);
  app.get('/firma', firmaCtrl.getFirmalar);
  hedef = { _id: id(), firmaId: 'A000001', tamUnvan: 'AHMET ÖLMEZ', vergiNoTC: '1000000000', aktif: true, createdAt: new Date('2000-01-01') };
  // Aynı adla 100'den fazla eşleşme: hedef en eski kayıt olduğu için ilk sayfada yok.
  await Firma.collection.insertMany([hedef, ...Array.from({ length: 101 }, (_, i) => ({
    _id: id(), firmaId: `A${i + 2}`, tamUnvan: `AHMET TEST ${i}`, vergiNoTC: String(1000000001 + i),
    aktif: true, createdAt: new Date(2026, 0, i + 1)
  }))]);
  await DosyaTakip.collection.insertOne({
    _id: id(), takipId: 'DT2026ARAMA', firma: hedef._id, firmaUnvan: 'ÖLMEZ',
    talepTuru: 'Belge Revize Talebi', aktif: true, anaAsama: 'MURACAAT_ONCESI', durum: '2.1.1_GORUSULUYOR'
  });
});
afterAll(async () => { await mongoose.disconnect(); if (mem) await mem.stop(); });

test.each(['Ahmet', 'AHMET', 'ahmet', 'Ölmez', 'ölmez', 'olmez', '  ahmet   ölmez  '])(
  'Belge Takip %p araması güncel firma adının her kısmını bulur', async (search) => {
    const cevap = await request(app).get('/liste').query({ search });
    expect(cevap.status).toBe(200);
    expect(cevap.body.data).toHaveLength(1);
    expect(cevap.body.data[0].firma.tamUnvan).toBe('AHMET ÖLMEZ');
  }
);

test('firma seçici araması AHMET ÖLMEZ dahil bütün eşleşmeleri sayfalı döndürür', async () => {
  const birinci = await request(app).get('/firma').query({ arama: 'Ahmet', limit: 100, sayfa: 1 });
  const ikinci = await request(app).get('/firma').query({ arama: 'Ahmet', limit: 100, sayfa: 2 });
  expect(birinci.body.data.pagination).toMatchObject({ toplamSayisi: 102, toplamSayfa: 2 });
  expect(birinci.body.data.firmalar).toHaveLength(100);
  expect(birinci.body.data.firmalar.some((f) => f.tamUnvan === 'AHMET ÖLMEZ')).toBe(false);
  expect(ikinci.body.data.firmalar.map((f) => f.tamUnvan)).toContain('AHMET ÖLMEZ');
  const soyad = await request(app).get('/firma').query({ arama: 'Ölmez', limit: 100 });
  expect(soyad.body.data.firmalar.map((f) => f.tamUnvan)).toEqual(['AHMET ÖLMEZ']);
});

test('talebin eski unvanı ve takip numarası aranmaya devam eder, alakasız ad eşleşmez', async () => {
  for (const search of ['ÖLMEZ', 'DT2026ARAMA']) {
    const cevap = await request(app).get('/liste').query({ search });
    expect(cevap.body.data).toHaveLength(1);
  }
  const bos = await request(app).get('/liste').query({ search: 'Mehmet' });
  expect(bos.body.data).toEqual([]);
});
