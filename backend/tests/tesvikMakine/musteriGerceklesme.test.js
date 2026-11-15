const express = require('express');
const mongoose = require('mongoose');
const request = require('supertest');
const { MongoMemoryServer } = require('mongodb-memory-server');
const router = require('../../routes/musteriPortal');
const Tesvik = require('../../models/Tesvik');
const YeniTesvik = require('../../models/YeniTesvik');
const MachineProcess = require('../../models/MachineProcess');
const HarcamaKalemi = require('../../models/HarcamaKalemi');
const portal = require('../../services/musteriPortal/portalService');
const gerceklesmeService = require('../../services/tesvikMakine/gerceklesmeService');

jest.setTimeout(60000);
const app = express();
app.use('/musteri-belge', router);
const belgeId = new mongoose.Types.ObjectId();
const baskaBelgeId = new mongoose.Types.ObjectId();
const tarih = new Date('2026-11-12');
const token = 'musteri-gerceklesme-token';
const baskaToken = 'baska-belgenin-gecerli-tokeni';
const adres = (baglanti = token) => `/musteri-belge/${baglanti}/gerceklesme`;
let mongo;

beforeAll(async () => {
  mongo = await MongoMemoryServer.create({ instance: { launchTimeout: 30000 } });
  await mongoose.connect(mongo.getUri());
});

beforeEach(async () => {
  await Promise.all([Tesvik.deleteMany({}), YeniTesvik.deleteMany({}), MachineProcess.deleteMany({}), HarcamaKalemi.deleteMany({})]);
});

afterEach(() => jest.restoreAllMocks());
afterAll(async () => {
  await mongoose.disconnect();
  if (mongo) await mongo.stop();
});

test.each([
  ['Tesvik', Tesvik, YeniTesvik], ['YeniTesvik', YeniTesvik, Tesvik]
])('%s özeti yalnız bağlantının belgesini toplar ve Excel satırlarından özel alanları çıkarır', async (tesvikModel, Model, DigerModel) => {
  const digerModel = DigerModel.modelName;
  const makineListeleri = {
    yerli: [{ rowId: 'Y1', adiVeOzelligi: 'Pres' }], ithal: [{ rowId: 'I1', adiVeOzelligi: 'Robot' }]
  };
  await Model.collection.insertOne({ _id: belgeId, musteriPortal: { token }, makineListeleri, notlar: 'özel belge notu' });
  await DigerModel.collection.insertOne({ _id: belgeId, musteriPortal: { token: baskaToken }, makineListeleri });
  await Model.collection.insertOne({ _id: baskaBelgeId, makineListeleri });
  const makine = (rowId, listType, faturalar, kapsam = {}) => MachineProcess.collection.insertOne({ tesvikModel, tesvikId: belgeId, rowId, listType, faturalar, ...kapsam });
  const fatura = (no, tutar, ek = {}) => ({ _id: new mongoose.Types.ObjectId(), tarih, no, tutar, adet: 1, ...ek });
  const harcama = (no, tutar, ek = {}) => HarcamaKalemi.collection.insertOne({
    tesvikModel, tesvikId: belgeId, kategori: 'diger', altKategori: 'montaj', tarih, no, tutar, adet: 2, ...ek
  });
  await Promise.all([
    makine('Y1', 'local', [
      fatura('F-1', 10.25, { kaynak: 'firma', icerik: 'firma fatura açıklaması', girenAdi: 'özel müşteri adı' }),
      fatura('F-2', 15, { kaynak: 'personel', icerik: 'özel fatura açıklaması', girenAdi: 'özel danışman adı' })
    ]),
    makine('I1', 'import', [
      fatura('B-1', 100, { tutarParaBirimi: 'USD', malBedeliTl: 300.5 }),
      fatura('B-2', 200, { tutarParaBirimi: 'EUR' })
    ]),
    makine('Y1', 'local', [fatura('MODELE AİT', 5000)], { tesvikModel: digerModel }),
    harcama('H-1', 5.1, { kaynak: 'firma', icerik: 'firma harcama açıklaması', girenAdi: 'özel yetkili adı' }),
    harcama('H-2', 10, { icerik: 'özel harcama açıklaması', evraklar: [{ depo: { dosyaYolu: 'gizli.pdf' } }] }),
    harcama('H-3', 12, { altKategori: 'kurFarki', kaynak: 'personel' }),
    harcama('BAŞKA BELGE', 9000, { tesvikId: baskaBelgeId })
  ]);

  const sonuc = await request(app).get(adres()).query({ tesvikModel: digerModel, tesvikId: baskaBelgeId.toString() }).expect(200);
  expect(sonuc.headers['cache-control']).toBe('private, no-store');
  const { data } = sonuc.body;
  expect(data).toMatchObject({ yerli: 25.25, ithal: 300.5, kurFarki: 12, toplam: 352.85, cevrilmemisIthalKalemSayisi: 1 });
  expect(data.gruplar.find((grup) => grup.id === 'diger').toplam).toBe(15.1);
  expect(data.kalemler.reduce((toplam, { tutar }) => toplam + Math.round(tutar * 100), 0)).toBe(35285);
  expect(data.kalemler).toHaveLength(6);
  expect(data.kalemler.map(({ no, icerik }) => [no, icerik])).toEqual(expect.arrayContaining([
    ['F-1', 'Pres · firma fatura açıklaması'], ['F-2', 'Pres'], ['B-1', 'Robot'],
    ['H-1', 'firma harcama açıklaması'], ['H-2', ''], ['H-3', '']
  ]));
  for (const kalem of data.kalemler) {
    expect(Object.keys(kalem).sort()).toEqual(['adet', 'grup', 'icerik', 'kategori', 'no', 'tarih', 'tutar']);
  }
  expect(JSON.stringify(data)).not.toMatch(/özel|gizli\.pdf|BAŞKA BELGE|MODELE AİT|B-2/);

  const personelOzeti = await gerceklesmeService.belgeGerceklesmesi(tesvikModel, belgeId);
  expect(personelOzeti.kalemler.find((kalem) => kalem.no === 'H-2').icerik).toBe('özel harcama açıklaması');
  expect((await request(app).get(adres(baskaToken)).expect(200)).body.data.toplam).toBe(5000);
});

test('bozuk, yenilenmiş veya kapanmış bağlantı özet döndürmez', async () => {
  await Tesvik.collection.insertOne({ _id: belgeId, musteriPortal: { token } });
  await request(app).get(adres('kisa')).expect(404);
  await request(app).get(adres(baskaToken)).expect(404);

  const yeni = await portal.linkUret('Tesvik', belgeId, { yenile: true });
  const yeniToken = yeni.link.split('/belge/')[1];
  await request(app).get(adres()).expect(404);
  await request(app).get(adres(yeniToken)).expect(200);
  await portal.linkKapat('Tesvik', belgeId);
  const sonuc = await request(app).get(adres(yeniToken)).expect(404);
  expect(sonuc.headers['cache-control']).toBe('private, no-store');
  expect(sonuc.body).not.toHaveProperty('data');
});

test('özet okunurken kapatılan bağlantı hesaplanmış veriyi döndürmez', async () => {
  await Tesvik.collection.insertOne({ _id: belgeId, musteriPortal: { token } });
  const gerceklesmeOku = gerceklesmeService.belgeGerceklesmesi;
  jest.spyOn(gerceklesmeService, 'belgeGerceklesmesi').mockImplementationOnce(async (...args) => {
    const ozet = await gerceklesmeOku(...args);
    await portal.linkKapat('Tesvik', belgeId);
    return ozet;
  });
  expect((await request(app).get(adres()).expect(404)).body).not.toHaveProperty('data');
});
