// 🧪 Ana sayfa kişisel özeti
//
// Müşteri (29.09.2026): "dashboarda/ana sayfaya girince, mevcut kendi açtığı talepler,
// belgelerden mail geldiyse mailler vs tarzı bir arayüz düşünüyoruz."

const express = require('express');
const request = require('supertest');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const { ObjectId } = mongoose.Types;

const ctrl = require('../../controllers/dosyaTakipController');
const DosyaTakip = require('../../models/DosyaTakip');

jest.setTimeout(60000);

let mem, app;
const ben = new ObjectId();
const baskasi = new ObjectId();
const firma = new ObjectId();

beforeAll(async () => {
  mem = await MongoMemoryServer.create();
  await mongoose.connect(mem.getUri());
  app = express();
  app.use(express.json());
  app.use((req, _res, next) => { req.user = { _id: ben }; next(); });
  app.get('/benim', ctrl.benimIslerim);
});
afterAll(async () => { await mongoose.disconnect(); if (mem) await mem.stop(); });
beforeEach(async () => { await DosyaTakip.deleteMany({}); });

const talep = (ekler = {}) => DosyaTakip.create({
  firma, firmaId: 'A1', firmaUnvan: 'GLOBTEKS A.Ş.', olusturanKullanici: ben, olusturanAdi: 'Ben',
  talepTuru: 'Belge Başvuru Talebi', ytbNo: '568289', ...ekler
});

test('takibi bende olan açık talepler gelir', async () => {
  await talep({ olusturanKullanici: baskasi, muraacatSonrasi: { takibiYapanPersonel: ben } });
  const r = await request(app).get('/benim');
  expect(r.body.data.takibimde).toHaveLength(1);
  expect(r.body.data.actiklarim).toHaveLength(0);
});

test('kendi açtığım açık talepler gelir', async () => {
  await talep();
  const r = await request(app).get('/benim');
  expect(r.body.data.actiklarim).toHaveLength(1);
  expect(r.body.data.actiklarim[0].firmaUnvan).toBe('GLOBTEKS A.Ş.');
});

test('sonuçlanmış talepler listede görünmez', async () => {
  await talep({ durum: '2.3.6_BELGEYE_YANSITILDI', anaAsama: 'KURUM_SONUCLANMA' });
  const r = await request(app).get('/benim');
  expect(r.body.data.actiklarim).toHaveLength(0);
});

test('başkasının talebi listeye girmez', async () => {
  await talep({ olusturanKullanici: baskasi });
  const r = await request(app).get('/benim');
  expect(r.body.data.actiklarim).toHaveLength(0);
  expect(r.body.data.takibimde).toHaveLength(0);
});

test('firmadan gelen dosyalar en yeniden eskiye listelenir', async () => {
  await talep({
    dosyalar: [
      { dosyaAdi: 'eski.pdf', dosyaYolu: 'https://x/e.pdf', firmaYukledi: true, yuklemeTarihi: new Date('2026-09-01') },
      { dosyaAdi: 'yeni.pdf', dosyaYolu: 'https://x/y.pdf', firmaYukledi: true, yuklemeTarihi: new Date('2026-09-20') },
      { dosyaAdi: 'bizim.pdf', dosyaYolu: 'https://x/b.pdf', firmaYukledi: false, yuklemeTarihi: new Date('2026-09-25') }
    ]
  });
  const r = await request(app).get('/benim');
  const gelenler = r.body.data.sonYuklemeler;
  expect(gelenler.map((g) => g.dosyaAdi)).toEqual(['yeni.pdf', 'eski.pdf']);  // bizim yüklediğimiz yok
  expect(gelenler[0].firmaUnvan).toBe('GLOBTEKS A.Ş.');
});

// Müşteri (05.10.2026): "Burada talepleri vs. aşağıya kaydırmalı liste yapma şansımız var mı sadece
// 10 adet görünüyor"
test('10 kayıt sınırı yok: tüm açık talepler gelir', async () => {
  // takipId sırayla üretiliyor; paralel create çakışır
  for (let i = 0; i < 14; i += 1) await talep({ ytbNo: String(600000 + i) });
  for (let i = 0; i < 12; i += 1) {
    await talep({ olusturanKullanici: baskasi, ytbNo: String(700000 + i), muraacatSonrasi: { takibiYapanPersonel: ben } });
  }
  const r = await request(app).get('/benim');
  expect(r.body.data.actiklarim).toHaveLength(14);
  expect(r.body.data.takibimde).toHaveLength(12);
});

test('firmadan gelenler de 10 ile sınırlı değil', async () => {
  await talep({
    dosyalar: Array.from({ length: 15 }, (_, i) => ({
      dosyaAdi: `f${i}.pdf`, dosyaYolu: `https://x/${i}.pdf`, firmaYukledi: true, yuklemeTarihi: new Date(2026, 8, i + 1)
    }))
  });
  const r = await request(app).get('/benim');
  expect(r.body.data.sonYuklemeler).toHaveLength(15);
  expect(r.body.data.sonYuklemeler[0].dosyaAdi).toBe('f14.pdf');
});
