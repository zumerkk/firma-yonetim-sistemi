const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');

require('../../models/User');
const Firma = require('../../models/Firma');
const Tesvik = require('../../models/Tesvik');
const YeniTesvik = require('../../models/YeniTesvik');
const tesvikController = require('../../controllers/tesvikController');
const yeniTesvikController = require('../../controllers/yeniTesvikController');

jest.setTimeout(60000);

let mem;
let firma;
let sira = 0;
const kullanici = { _id: new mongoose.Types.ObjectId(), adSoyad: 'Test Uzman', email: 'uzman@example.test', rol: 'admin' };

beforeAll(async () => {
  mem = await MongoMemoryServer.create();
  await mongoose.connect(mem.getUri());
  firma = new mongoose.Types.ObjectId();
  await Firma.collection.insertOne({
    _id: firma, firmaId: 'A000001', tamUnvan: 'KAPASİTE TEST A.Ş.', vergiNoTC: '1234567890', aktif: true
  });
});

afterAll(async () => {
  await mongoose.disconnect();
  if (mem) await mem.stop();
});

const belgeVerisi = (urunler = []) => ({
  gmId: `GM-KAPASITE-${++sira}`,
  firma,
  firmaId: 'A000001',
  yatirimciUnvan: 'KAPASİTE TEST A.Ş.',
  olusturanKullanici: kullanici._id,
  belgeYonetimi: { belgeId: `KAPASITE-${sira}`, belgeNo: String(sira), belgeTarihi: new Date('2026-10-15') },
  yatirimBilgileri: { yatirimKonusu: '3512', destekSinifi: 'GENEL', yerinIl: 'İZMİR', yerinIlce: 'MENDERES' },
  urunler
});

const urun = (mevcutKapasite, ilaveKapasite) => ({
  u97Kodu: '35.12', urunAdi: 'GES ELEKTRİK ENERJİSİ ÜRETİMİ',
  mevcutKapasite, ilaveKapasite, kapasiteBirimi: 'MW'
});

const cagir = async (fn, body, params = {}) => {
  const req = {
    body, params, user: kullanici, ip: '127.0.0.1',
    connection: { remoteAddress: '127.0.0.1' }, get: () => 'jest', headers: {}
  };
  const res = { statusCode: 200 };
  res.status = (kod) => { res.statusCode = kod; return res; };
  res.json = (govde) => { res.govde = govde; return res; };
  await fn(req, res);
  return res;
};

const kapasiteyiDogrula = async (Model, id, mevcut, ilave, toplam) => {
  // Yanıt nesnesi yerine yeniden okuyarak normalizasyon + şema + save hook'unu doğrula.
  const kayit = await Model.findById(id).lean();
  expect(kayit.urunler).toHaveLength(1);
  expect(kayit.urunler[0]).toMatchObject({
    mevcutKapasite: mevcut,
    ilaveKapasite: ilave,
    kapasiteBirimi: 'MW'
  });
  expect(kayit.urunler[0].toplamKapasite).toBe(toplam);
};

describe.each([
  ['eski belge', Tesvik, tesvikController],
  ['yeni belge', YeniTesvik, yeniTesvikController]
])('%s ondalıklı ürün kapasitesi', (_ad, Model, ctrl) => {
  const ornekler = [
    ['sayısal JSON', 0.125, 4.5, 0.125, 4.5, 4.625],
    ['Türkçe virgül', '1.234,56', '4,5', 1234.56, 4.5, 1239.06],
    ['üç basamaklı ondalık metin', '0,125', '4.125', 0.125, 4.125, 4.25],
    ['ondalık nokta', '1250.5', '2.25', 1250.5, 2.25, 1252.75],
    ['kayan nokta artığı', 0.1, 0.2, 0.1, 0.2, 0.3],
    ['beş basamaklı küsurat', 4.12567, 0.00001, 4.12567, 0.00001, 4.12568],
    ['bilimsel gösterimli küçük değer', 0.0000001, 0.0000002, 0.0000001, 0.0000002, 0.0000003],
    ['100 ondalıktan küçük değer', 1e-101, 0, 1e-101, 0, 1e-101]
  ];

  test.each(ornekler)('oluşturmada %s ondalıkları korunur', async (_bicim, mevcut, ilave, beklenenMevcut, beklenenIlave, beklenenToplam) => {
    const yanit = await cagir(ctrl.createTesvik, belgeVerisi([urun(mevcut, ilave)]));
    expect(yanit.statusCode).toBe(201);
    await kapasiteyiDogrula(Model, yanit.govde.data._id, beklenenMevcut, beklenenIlave, beklenenToplam);
  });

  test.each(ornekler)('güncellemede %s ondalıkları korunur', async (_bicim, mevcut, ilave, beklenenMevcut, beklenenIlave, beklenenToplam) => {
    const belge = await Model.create(belgeVerisi([urun(0, 4)]));
    const yanit = await cagir(ctrl.updateTesvik, { urunler: [urun(mevcut, ilave)] }, { id: String(belge._id) });
    expect(yanit.statusCode).toBe(200);
    await kapasiteyiDogrula(Model, belge._id, beklenenMevcut, beklenenIlave, beklenenToplam);
  });
});
