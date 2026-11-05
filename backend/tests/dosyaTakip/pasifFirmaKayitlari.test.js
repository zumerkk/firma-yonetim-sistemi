// Firma pasifliği yatırımcı listesine aittir; Belge Takip'in açık/arşiv kayıtlarını silmez.
const express = require('express');
const request = require('supertest');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const User = require('../../models/User');
const Firma = require('../../models/Firma');
const DosyaTakip = require('../../models/DosyaTakip');
const firmaCtrl = require('../../controllers/firmaController');
const takipCtrl = require('../../controllers/dosyaTakipController');

jest.setTimeout(60000);
const id = () => new mongoose.Types.ObjectId();
let mem, app, firma, acikTalep, arsivTalep, kapamaTalep;
const kullanici = { _id: id(), adSoyad: 'Test Uzman', email: 'uzman@example.test', rol: 'admin' };

beforeAll(async () => {
  mem = await MongoMemoryServer.create();
  await mongoose.connect(mem.getUri());
  await User.collection.insertOne(kullanici);
  app = express();
  app.use(express.json());
  app.use((req, _res, next) => { req.user = kullanici; next(); });
  app.put('/firmalar/:id', firmaCtrl.updateFirma);
  app.get('/firmalar/ara', firmaCtrl.searchFirmalar);
  app.get('/firmalar', firmaCtrl.getFirmalar);
  app.get('/talepler', takipCtrl.getTumTalepler);
  app.get('/talepler/:id', takipCtrl.getTalepById);
});

afterAll(async () => {
  await mongoose.disconnect();
  if (mem) await mem.stop();
});

beforeEach(async () => {
  await Promise.all([Firma.deleteMany({}), DosyaTakip.deleteMany({})]);
  firma = { _id: id(), firmaId: 'A000033', tamUnvan: 'AGROMILLORA FİDAN ÜRETİM A.Ş.',
    vergiNoTC: '1234567890', firmaIl: 'İZMİR', aktif: true,
    yetkiliKisiler: [{ adSoyad: 'Firma Yetkilisi', eposta1: 'yetkili@example.test' }] };
  await Firma.collection.insertOne(firma);
  const temel = {
    firma: firma._id, firmaId: firma.firmaId, firmaUnvan: 'ESKİ ÜNVAN',
    talepTuru: 'Süre Revize Talebi', ytbNo: '568289', aktif: true,
    anaAsama: 'MURACAAT_ONCESI', durum: '2.1.1_GORUSULUYOR',
    olusturanKullanici: kullanici._id, createdAt: new Date('2026-11-01T12:00:00Z'),
    genelNotlar: [{ _id: id(), metin: 'Belge takip notu', tarih: new Date('2026-11-01') }],
    dosyalar: [{ _id: id(), dosyaAdi: 'basvuru.pdf', dosyaYolu: '/ornek/basvuru.pdf', dosyaTipi: 'application/pdf' }],
    durumGecmisi: [{ _id: id(), yeniDurum: '2.1.1_GORUSULUYOR', tarih: new Date('2026-11-01') }],
    odeme: { cariKaydi: 'yazildi', cariDurumu: 'acik', faturaDurumu: 'kesildi' }
  };
  acikTalep = { ...temel, _id: id(), takipId: 'DT2026PASIF01' };
  arsivTalep = { ...temel, _id: id(), takipId: 'DT2026PASIF02', anaAsama: 'TAMAMLANDI', durum: '2.3.5_SONUCLANDI' };
  kapamaTalep = { ...temel, _id: id(), takipId: 'DT2026PASIF03', talepTuru: 'Belge Kapatma Revize Talebi' };
  await DosyaTakip.collection.insertMany([acikTalep, arsivTalep, kapamaTalep,
    { ...temel, _id: id(), takipId: 'DT2026PASIF04', aktif: false }]);
});

const hamKayitlar = () => DosyaTakip.collection.find({}).sort({ takipId: 1 }).toArray();
const listedekiIdler = async (query) => {
  const yanit = await request(app).get('/talepler').query(query);
  expect(yanit.status).toBe(200);
  return yanit.body.data.map((t) => t._id);
};

test.each(['objectId', 'firmaId'])('%s ile firma pasife alınınca açık/arşiv/kapama talepleri ve tüm bilgileri korunur', async (adresTuru) => {
  const once = await hamKayitlar();
  const yanit = await request(app).put(`/firmalar/${adresTuru === 'objectId' ? firma._id : firma.firmaId}`).send({ aktif: false });
  expect(yanit.status).toBe(200);
  expect(yanit.body.data.firma.aktif).toBe(false);
  expect(await hamKayitlar()).toEqual(once);
  expect(await listedekiIdler({})).toEqual([String(acikTalep._id)]);
  expect(await listedekiIdler({ arsiv: '1' })).toEqual([String(arsivTalep._id)]);
  expect(await listedekiIdler({ kapama: '1' })).toEqual([String(kapamaTalep._id)]);
  expect(await listedekiIdler({ firma: String(firma._id), search: 'agromillora' })).toEqual([String(acikTalep._id)]);
  expect(await listedekiIdler({ arsiv: '1', firma: String(firma._id), search: 'agromillora' })).toEqual([String(arsivTalep._id)]);

  const detay = await request(app).get(`/talepler/${acikTalep._id}`);
  expect(detay.status).toBe(200);
  expect(detay.body.data.firma).toMatchObject({ firmaId: firma.firmaId, tamUnvan: firma.tamUnvan });
  expect(detay.body.data.firma.yetkiliKisiler[0].adSoyad).toBe('Firma Yetkilisi');
  expect(detay.body.data.genelNotlar[0].metin).toBe('Belge takip notu');
  expect(detay.body.data.dosyalar[0].dosyaAdi).toBe('basvuru.pdf');
  expect(detay.body.data.durumGecmisi[0].yeniDurum).toBe(acikTalep.durum);
  expect(detay.body.data.odeme).toMatchObject(acikTalep.odeme);
});

test('pasif firma aktif=all seçicilerinde ve pasif aramasında bulunur; tekrar aktifleştirmek takip verilerini değiştirmez', async () => {
  const once = await hamKayitlar();
  expect((await request(app).put(`/firmalar/${firma._id}`).send({ aktif: false })).status).toBe(200);
  for (const aktif of ['all', 'false']) {
    const liste = await request(app).get('/firmalar').query({ aktif, arama: 'agromillora' });
    expect(liste.status).toBe(200);
    expect(liste.body.data.firmalar.map((f) => f.firmaId)).toEqual([firma.firmaId]);
    const arama = await request(app).get('/firmalar/ara').query({ aktif, q: 'agromillora' });
    expect(arama.status).toBe(200);
    expect(arama.body.data.firmalar.map((f) => f.firmaId)).toEqual([firma.firmaId]);
  }
  const aktifYanit = await request(app).put(`/firmalar/${firma._id}`).send({ aktif: true });
  expect(aktifYanit.status).toBe(200);
  expect(await hamKayitlar()).toEqual(once);
  expect(await listedekiIdler({ firma: String(firma._id), kapsam: 'tumu' })).toHaveLength(3);
});
