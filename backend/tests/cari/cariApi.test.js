// 🧪 Cari hesap API — uçtan uca (bellek içi MongoDB + supertest)
//
// Para verisi: bakiyenin, firma bağının ve hata mesajlarının gerçek HTTP akışında
// doğru çıktığını burada kanıtlıyoruz. Dosya yükleme (Cloudinary) bu testin dışında;
// JSON gövdede multer devreye girmiyor.

const express = require('express');
const request = require('supertest');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');

const mockKullanici = { _id: '0000000000000000000000aa', adSoyad: 'Test Danışman', rol: 'admin', yetkiler: {} };
jest.mock('../../middleware/auth', () => ({
  authenticate: (req, res, next) => {
    req.user = mockKullanici;
    next();
  }
}));

const cariRoutes = require('../../routes/cari');
const CariHareket = require('../../models/CariHareket');
const DosyaTakip = require('../../models/DosyaTakip');
const Firma = require('../../models/Firma');

jest.setTimeout(60000);

const { ObjectId } = mongoose.Types;
const firmaA = new ObjectId();
const firmaB = new ObjectId();
const talepA = new ObjectId();

let mem;
let app;

beforeAll(async () => {
  mem = await MongoMemoryServer.create();
  await mongoose.connect(mem.getUri());

  // Firma/talep modellerinin kancaları (otomatik kimlik vb.) bu testin konusu değil
  await Firma.collection.insertMany([
    { _id: firmaA, firmaId: 'A000001', tamUnvan: 'ÇINAR GIDA A.Ş.' },
    { _id: firmaB, firmaId: 'A000002', tamUnvan: 'CAN METAL LTD. ŞTİ.' }
  ]);
  await DosyaTakip.collection.insertOne({
    _id: talepA,
    takipId: 'DT2026999',
    firma: firmaA,
    firmaUnvan: 'ÇINAR GIDA A.Ş.',
    talepTuru: 'Belge Başvuru Talebi',
    aktif: true,
    createdAt: new Date()
  });

  app = express();
  app.use(express.json());
  app.use('/api/cari', cariRoutes);
});

afterAll(async () => {
  await mongoose.disconnect();
  if (mem) await mem.stop();
});

beforeEach(async () => {
  await CariHareket.deleteMany({});
});

const ekle = (govde) => request(app).post('/api/cari').send(govde);

describe('Ödemeler sekmesi (talebe bağlı mini cari)', () => {
  test('talepten girilen ödeme firmayı talepten alır, kullanıcı yazımını anlar', async () => {
    const r = await ekle({ dosyaTakip: String(talepA), tur: 'gelen', banka: 'Enpara', tarih: '15.09.2026', tutar: '24.000,50' });
    expect(r.status).toBe(201);
    expect(r.body.data).toMatchObject({
      firma: String(firmaA), firmaUnvan: 'ÇINAR GIDA A.Ş.', dosyaTakip: String(talepA),
      tutar: 24000.5, banka: 'Enpara', olusturanAdi: 'Test Danışman'
    });
    expect(r.body.data.tarih).toBe('2026-09-15T00:00:00.000Z');
  });

  test('istemcinin gönderdiği başka firma kabul edilmez', async () => {
    const r = await ekle({ dosyaTakip: String(talepA), firma: String(firmaB), tur: 'gelen', banka: 'Enpara', tarih: '2026-09-15', tutar: 10 });
    expect(r.status).toBe(400);
    expect(r.body.message).toMatch(/bu firmaya ait değil/);
  });

  test('defter: kayıtlar alta eklenir, fark = gelen − giden', async () => {
    await ekle({ dosyaTakip: String(talepA), tur: 'odenen', belgeAdi: 'Belge harcı', tarih: '2026-09-01', tutar: 2500 });
    await ekle({ dosyaTakip: String(talepA), tur: 'gelen', banka: 'Ziraat', tarih: '2026-09-10', tutar: 10000 });

    const r = await request(app).get(`/api/cari/talep/${talepA}`);
    expect(r.status).toBe(200);
    expect(r.body.data.ozet).toMatchObject({ toplamGelen: 10000, toplamOdenen: 2500, fark: 7500, adet: 2 });
    expect(r.body.data.hareketler.map((h) => h.tur)).toEqual(['odenen', 'gelen']);
  });

  test('olmayan talep 404', async () => {
    expect((await request(app).get(`/api/cari/talep/${new ObjectId()}`)).status).toBe(404);
  });
});

describe('Hatalar okunur, veri bozulmaz', () => {
  test('bankasız gelen ödeme', async () => {
    const r = await ekle({ firma: String(firmaA), tur: 'gelen', tarih: '2026-09-15', tutar: 5 });
    expect(r.status).toBe(400);
    expect(r.body.message).toBe('Banka seçimi zorunludur');
  });

  // "1234.567" binlik mi ondalık mı belli değil: 0'a ya da bin kat yanlış tutara çevrilmemeli
  test('anlaşılamayan tutar kaydedilmez', async () => {
    const r = await ekle({ firma: String(firmaA), tur: 'gelen', banka: 'Garanti', tarih: '2026-09-15', tutar: '1234.567' });
    expect(r.status).toBe(400);
    expect(r.body.message).toMatch(/Tutar anlaşılamadı/);
    expect(await CariHareket.countDocuments()).toBe(0);
  });

  test('31 Şubat gibi tarih reddedilir', async () => {
    const r = await ekle({ firma: String(firmaA), tur: 'gelen', banka: 'Garanti', tarih: '31.02.2026', tutar: 5 });
    expect(r.status).toBe(400);
    expect(r.body.message).toMatch(/Tarih anlaşılamadı/);
  });

  test('firma da talep de yoksa', async () => {
    const r = await ekle({ tur: 'gelen', banka: 'Garanti', tarih: '2026-09-15', tutar: 5 });
    expect(r.status).toBe(400);
    expect(r.body.message).toBe('Firma seçimi zorunludur');
  });

  test('bozuk kimlik 400 döner, 500 değil', async () => {
    expect((await request(app).get('/api/cari/firma/bozuk-id')).status).toBe(400);
  });
});

describe('Cari hesaplar modülü (firma bazlı)', () => {
  test('firma defteri talebe bağlı ve bağsız hareketleri birlikte, bakiyeyle gösterir', async () => {
    await ekle({ firma: String(firmaA), tur: 'fatura', faturaNo: 'GM2026-15', tarih: '2026-01-12', tutar: 24000 });
    await ekle({ dosyaTakip: String(talepA), tur: 'odenen', belgeAdi: 'Harç makbuzu', tarih: '2026-01-13', tutar: 1500 });
    await ekle({ firma: String(firmaA), tur: 'gelen', banka: 'Garanti', tarih: '2026-02-01', tutar: 25500 });

    const r = await request(app).get(`/api/cari/firma/${firmaA}`);
    expect(r.status).toBe(200);
    const { firma, hareketler, ozet, talepler } = r.body.data;
    expect(firma.tamUnvan).toBe('ÇINAR GIDA A.Ş.');
    // Müşterinin Excel formülü: TUTAR + MAKBUZ/DEKONT − ÖDEME GELEN
    expect(ozet).toMatchObject({ toplamFatura: 24000, toplamOdenen: 1500, toplamGelen: 25500, bakiye: 0 });
    expect(hareketler.map((h) => h.bakiye)).toEqual([24000, 25500, 0]);
    expect(hareketler[1].dosyaTakip.takipId).toBe('DT2026999');
    expect(talepler.map((t) => t.takipId)).toEqual(['DT2026999']);
  });

  test('cari hesaplar listesi firma başına bakiye, Türkçe sırayla', async () => {
    await ekle({ firma: String(firmaA), tur: 'fatura', tarih: '2026-01-12', tutar: 1000 });
    await ekle({ firma: String(firmaB), tur: 'fatura', tarih: '2026-01-12', tutar: 300 });
    await ekle({ firma: String(firmaB), tur: 'gelen', banka: 'Vakıf', tarih: '2026-03-01', tutar: 100 });

    const r = await request(app).get('/api/cari/firmalar');
    expect(r.status).toBe(200);
    expect(r.body.data.map((f) => [f.firmaUnvan, f.bakiye])).toEqual([
      ['CAN METAL LTD. ŞTİ.', 200],
      ['ÇINAR GIDA A.Ş.', 1000]
    ]);
  });

  test('düzeltme: tutar ve talep bağı değişir, tür değişmez', async () => {
    const { body } = await ekle({ firma: String(firmaA), tur: 'gelen', banka: 'Garanti', tarih: '2026-02-01', tutar: 100 });
    const r = await request(app).put(`/api/cari/${body.data._id}`)
      .send({ tutar: '150,75', dosyaTakip: String(talepA), tur: 'fatura' });
    expect(r.status).toBe(200);
    expect(r.body.data).toMatchObject({ tutar: 150.75, dosyaTakip: String(talepA), tur: 'gelen', sonGuncelleyenAdi: 'Test Danışman' });
  });

  test('başka firmanın talebine bağlanamaz', async () => {
    const { body } = await ekle({ firma: String(firmaB), tur: 'fatura', tarih: '2026-02-01', tutar: 100 });
    const r = await request(app).put(`/api/cari/${body.data._id}`).send({ dosyaTakip: String(talepA) });
    expect(r.status).toBe(400);
  });

  test('silme', async () => {
    const { body } = await ekle({ firma: String(firmaA), tur: 'fatura', tarih: '2026-02-01', tutar: 100 });
    expect((await request(app).delete(`/api/cari/${body.data._id}`)).status).toBe(200);
    expect(await CariHareket.countDocuments()).toBe(0);
    expect((await request(app).delete(`/api/cari/${body.data._id}`)).status).toBe(404);
  });
});
