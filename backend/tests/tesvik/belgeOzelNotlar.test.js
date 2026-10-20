const express = require('express');
const request = require('supertest');
const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const User = require('../../models/User');
require('../../models/Firma');
const Tesvik = require('../../models/Tesvik');
const YeniTesvik = require('../../models/YeniTesvik');
const BelgeOzelNot = require('../../models/BelgeOzelNot');
const routes = require('../../routes/musteriPortal');

jest.setTimeout(60000);
let mem, token, readonlyToken, adminToken;
const kullanici = new mongoose.Types.ObjectId();
const app = express();
app.use(express.json());
app.use('/api/musteri-belge', routes);

beforeAll(async () => {
  process.env.JWT_SECRET = 'belge-ozel-not-test';
  mem = await MongoMemoryServer.create();
  await mongoose.connect(mem.getUri());
  await User.collection.insertOne({ _id: kullanici, email: 'berk@not-test.local', adSoyad: 'Berk Acar', aktif: true, rol: 'kullanici' });
  token = jwt.sign({ id: String(kullanici) }, process.env.JWT_SECRET);
  for (const rol of ['readonly', 'admin']) {
    const _id = new mongoose.Types.ObjectId();
    await User.collection.insertOne({ _id, email: `${rol}@not-test.local`, adSoyad: rol, aktif: true, rol });
    const yeniToken = jwt.sign({ id: String(_id) }, process.env.JWT_SECRET);
    if (rol === 'readonly') readonlyToken = yeniToken;
    else adminToken = yeniToken;
  }
});
afterAll(async () => { await mongoose.disconnect(); if (mem) await mem.stop(); });

describe.each([['Tesvik', Tesvik], ['YeniTesvik', YeniTesvik]])('%s özel notlar', (tesvikModel, Model) => {
  let id, baska, adres, publicToken;
  beforeEach(async () => {
    id = new mongoose.Types.ObjectId(); baska = new mongoose.Types.ObjectId();
    publicToken = `test-${id}`;
    await Model.collection.insertMany([
      { _id: id, yatirimciUnvan: 'Özel Not Test', musteriPortal: { token: publicToken }, makineListeleri: { yerli: [], ithal: [] } },
      { _id: baska, yatirimciUnvan: 'Başka Belge' }
    ]);
    adres = `/api/musteri-belge/yonetim/${tesvikModel}/${id}/notlar`;
  });

  test('oturumsuz ziyaretçi özel notları okuyamaz veya yazamaz', async () => {
    expect((await request(app).get(adres)).status).toBe(401);
    expect((await request(app).post(adres).send({ metin: 'Gizli' })).status).toBe(401);
    expect(await BelgeOzelNot.countDocuments({ tesvikModel, tesvikId: id })).toBe(0);
  });

  test('yazar ve zaman sunucudan gelir, eşzamanlı notlar korunur, belge ve müşteri çıktısı değişmez', async () => {
    const once = await Model.findById(id).lean();
    const yanitlar = await Promise.all(['Gizli inceleme notu', 'İkinci özel not'].map((metin) =>
      request(app).post(adres).auth(token, { type: 'bearer' }).send({ metin, kullaniciAdi: 'Sahte ad', createdAt: '1900-01-01' })));
    yanitlar.forEach((r) => {
      expect(r.status).toBe(200);
      expect(r.body.data.kullaniciAdi).toBe('Berk Acar');
      expect(new Date(r.body.data.createdAt).getFullYear()).toBeGreaterThan(2025);
    });
    const liste = await request(app).get(adres).auth(token, { type: 'bearer' });
    expect(liste.body.data).toHaveLength(2);
    expect(liste.body.data.map((n) => n.metin).sort()).toEqual(['Gizli inceleme notu', 'İkinci özel not'].sort());
    const diger = await request(app).get(adres.replace(String(id), String(baska))).auth(token, { type: 'bearer' });
    expect(diger.body.data).toEqual([]);
    expect(await Model.findById(id).lean()).toEqual(once);
    const musteri = await request(app).get(`/api/musteri-belge/${publicToken}`);
    expect(musteri.status).toBe(200);
    expect(JSON.stringify(musteri.body)).not.toMatch(/Gizli inceleme|İkinci özel not|kullaniciAdi|Berk Acar/);
  });

  test('boş veya aşırı uzun not reddedilir, metin kırpılarak kaydedilir', async () => {
    for (const metin of ['', '  ', 'a'.repeat(5001)]) {
      expect((await request(app).post(adres).auth(token, { type: 'bearer' }).send({ metin })).status).toBe(400);
    }
    const kayit = await request(app).post(adres).auth(token, { type: 'bearer' }).send({ metin: '  Bir not  ' });
    expect(kayit.body.data.metin).toBe('Bir not');
  });

  test('notu silme oturum ve düzenleyici rolü gerektirir; readonly yalnızca okuyabilir', async () => {
    const kayit = await request(app).post(adres).auth(token, { type: 'bearer' }).send({ metin: 'Korunacak not' });
    const silmeAdresi = `${adres}/${kayit.body.data._id}`;
    expect((await request(app).delete(silmeAdresi)).status).toBe(401);
    expect((await request(app).delete(silmeAdresi).auth(readonlyToken, { type: 'bearer' })).status).toBe(403);
    expect((await request(app).post(adres).auth(readonlyToken, { type: 'bearer' }).send({ metin: 'Yazamaz' })).status).toBe(403);
    expect((await request(app).get(adres).auth(readonlyToken, { type: 'bearer' })).body.data).toHaveLength(1);
    expect(await BelgeOzelNot.exists({ _id: kayit.body.data._id })).toBeTruthy();
  });

  test.each(['kullanici', 'admin'])('%s belge kapsamındaki notu siler; diğer belge/model korunur', async (rol) => {
    const once = await Model.findById(id).lean();
    const kayit = await request(app).post(adres).auth(token, { type: 'bearer' }).send({ metin: 'Silinecek not' });
    const notId = kayit.body.data._id;
    const authToken = rol === 'admin' ? adminToken : token;
    const sil = (yol) => request(app).delete(yol).auth(authToken, { type: 'bearer' });
    const digerModel = tesvikModel === 'Tesvik' ? 'YeniTesvik' : 'Tesvik';
    await (digerModel === 'Tesvik' ? Tesvik : YeniTesvik).collection.insertOne({ _id: id, yatirimciUnvan: 'Diğer model' });
    expect((await sil(`${adres.replace(String(id), String(baska))}/${notId}`)).status).toBe(404);
    expect((await sil(`${adres.replace(`/${tesvikModel}/`, `/${digerModel}/`)}/${notId}`)).status).toBe(404);
    expect((await sil(`${adres}/bozuk-id`)).status).toBe(400);
    expect(await BelgeOzelNot.exists({ _id: notId })).toBeTruthy();
    expect((await sil(`${adres}/${notId}`)).status).toBe(200);
    expect((await request(app).get(adres).auth(token, { type: 'bearer' })).body.data).toEqual([]);
    expect((await sil(`${adres}/${notId}`)).status).toBe(404);
    expect(await Model.findById(id).lean()).toEqual(once);
  });
});

test('geçersiz ve bulunmayan belge anlaşılır 400/404 döner', async () => {
  const temel = '/api/musteri-belge/yonetim';
  for (const yol of ['/Unknown/123', '/Tesvik/bozuk-id']) {
    expect((await request(app).get(`${temel}${yol}/notlar`).auth(token, { type: 'bearer' })).status).toBe(400);
  }
  expect((await request(app).get(`${temel}/Tesvik/${new mongoose.Types.ObjectId()}/notlar`).auth(token, { type: 'bearer' })).status).toBe(404);
});
