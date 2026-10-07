// 🧪 Ana sayfa "Bana Gelen Notlar"
//
// Müşteri (07.10.2026): "Belge takip için bildirim gönderince maile gidiyor ya aynı şekilde
// Dashboard'ına da düşme şansı var mı acaba?"

const express = require('express');
const request = require('supertest');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const { ObjectId } = mongoose.Types;

const ctrl = require('../../controllers/dosyaTakipController');
const DosyaTakip = require('../../models/DosyaTakip');
const Notification = require('../../models/Notification');
const User = require('../../models/User');
require('../../models/Firma');
const { notBildirimiSatiri, notBildirimiBasligi, notBildirimiMesaji } = require('../../services/dosyaTakip/notBildirimi');

jest.setTimeout(60000);

let mem, app, seda, berk, ayse;
const firma = new ObjectId();
const kullanici = (ad, eposta) => User.create({ adSoyad: ad, email: eposta, sifre: 'Gecici123!', rol: 'kullanici' });

beforeAll(async () => {
  mem = await MongoMemoryServer.create();
  await mongoose.connect(mem.getUri());
  [seda, berk, ayse] = await Promise.all([
    kullanici('Seda Durak', 'seda@gm.test'), kullanici('Berk Acar', 'berk@gm.test'), kullanici('Ayşe Yılmaz', 'ayse@gm.test')
  ]);
  const kim = { seda, berk, ayse };
  app = express();
  app.use(express.json());
  app.use((req, _res, next) => { const u = kim[req.get('x-kim')]; req.user = { _id: u._id, adSoyad: u.adSoyad }; next(); });
  app.post('/:id/not', ctrl.notEkle);
  app.get('/benim', ctrl.benimIslerim);
});
afterAll(async () => { await mongoose.disconnect(); if (mem) await mem.stop(); });
beforeEach(async () => { await Promise.all([DosyaTakip.deleteMany({}), Notification.deleteMany({})]); });

const talepKur = () => DosyaTakip.create({
  firma, firmaId: 'A1', firmaUnvan: 'GLOBTEKS A.Ş.', olusturanKullanici: seda._id, olusturanAdi: seda.adSoyad,
  talepTuru: 'Belge Başvuru Talebi', ytbNo: '568289'
});

test('talep notunda seçilen personelin ana sayfasına düşer: firma, gönderen, not, talep bağlantısı', async () => {
  const t = await talepKur();
  const not = await request(app).post(`/${t._id}/not`).set('x-kim', 'berk').send({
    metin: 'Yapı ruhsatı eksik talep edilmiş.\nYarın firmayı arayalım.', alan: 'genelNotlar', bildirimKullanicilar: [String(seda._id)]
  });
  expect(not.status).toBe(200);

  const r = await request(app).get('/benim').set('x-kim', 'seda');
  expect(r.body.data.gelenNotlar).toHaveLength(1);
  expect(r.body.data.gelenNotlar[0]).toMatchObject({
    talepId: String(t._id), firmaUnvan: 'GLOBTEKS A.Ş.', gonderen: 'Berk Acar',
    not: 'Yapı ruhsatı eksik talep edilmiş.\nYarın firmayı arayalım.', okundu: false
  });

  // Bildirim gönderilmeyen kişi görmez
  const baskasi = await request(app).get('/benim').set('x-kim', 'ayse');
  expect(baskasi.body.data.gelenNotlar).toHaveLength(0);
});

test('firma yükleme bildirimi bu sütuna girmez (kendi sütunu var), en yeni not üstte', async () => {
  const t = await talepKur();
  await Notification.create({ title: 'Firmadan belge geldi — GLOBTEKS A.Ş.', message: 'x', userId: seda._id,
    actionButton: { text: 'Talebi Aç', url: `/dosya-takip/${t._id}`, action: 'navigate' } });
  await request(app).post(`/${t._id}/not`).set('x-kim', 'berk').send({ metin: 'ilk', alan: 'genelNotlar', bildirimKullanicilar: [String(seda._id)] });
  await request(app).post(`/${t._id}/not`).set('x-kim', 'ayse').send({ metin: 'ikinci', alan: 'genelNotlar', bildirimKullanicilar: [String(seda._id)] });
  const r = await request(app).get('/benim').set('x-kim', 'seda');
  expect(r.body.data.gelenNotlar.map((n) => n.not)).toEqual(['ikinci', 'ilk']);
});

test('biçim gidiş-dönüş: firma adında ayraç olsa da gönderen ve not doğru çözülür', () => {
  const firmaAdi = 'ALFA · BETA LTD.';
  const satir = notBildirimiSatiri({
    _id: 'n1', title: notBildirimiBasligi(firmaAdi), isRead: true, createdAt: '2026-10-07T10:00:00Z',
    message: notBildirimiMesaji({ firmaAdi, tarihStr: '07.10.2026 13:00:00', gonderen: 'Berk Acar', metin: 'kısa not' }),
    actionButton: { url: '/dosya-takip/0123456789abcdef01234567' }
  });
  expect(satir).toMatchObject({ firmaUnvan: firmaAdi, gonderen: 'Berk Acar', not: 'kısa not', okundu: true, talepId: '0123456789abcdef01234567' });
});
