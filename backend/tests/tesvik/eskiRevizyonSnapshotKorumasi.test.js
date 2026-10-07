// Projection ile okunmayan eski snapshot'lar belge revizesinde silinmemeli.
// Eski form tüm backend verisini PUT'a yaydığı için geçmiş server tarafından korunur.
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
require('../../models/User');
require('../../models/Firma');
const Tesvik = require('../../models/Tesvik');
const YeniTesvik = require('../../models/YeniTesvik');
const tesvikController = require('../../controllers/tesvikController');
const yeniTesvikController = require('../../controllers/yeniTesvikController');

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

const user = { _id: new mongoose.Types.ObjectId(), adSoyad: 'Test Uzman', email: 'uzman@example.test', rol: 'admin' };
const call = async (fn, id, body) => {
  const req = {
    params: { id: String(id) }, body, user, ip: '127.0.0.1',
    connection: { remoteAddress: '127.0.0.1' }, get: () => 'jest'
  };
  const res = { statusCode: 200 };
  res.status = (code) => { res.statusCode = code; return res; };
  res.json = (data) => { res.body = data; return res; };
  await fn(req, res);
  expect(res.statusCode).toBe(200);
  expect(res.body.success).toBe(true);
  return res;
};

const createLegacyDocument = async (Model, placeholder = false) => {
  const belge = await Model.create({
    gmId: `GM-${new mongoose.Types.ObjectId()}`, firma: new mongoose.Types.ObjectId(), firmaId: 'A000001',
    yatirimciUnvan: 'ESKİ SNAPSHOT TEST', olusturanKullanici: user._id,
    belgeYonetimi: { belgeId: `B-${new mongoose.Types.ObjectId()}`, belgeNo: '600001', belgeTarihi: new Date('2026-01-01') },
    yatirimBilgileri: { yatirimKonusu: '1551', destekSinifi: 'GENEL', yerinIl: 'İZMİR', yerinIlce: 'MENDERES' },
    istihdam: { mevcutKisi: 10, ilaveKisi: 1 }
  });
  const history = [{
    _id: new mongoose.Types.ObjectId(), revizyonNo: 1, revizyonTarihi: new Date('2026-09-01'),
    revizyonSebebi: 'Eski revize', yapanKullanici: user._id, kullaniciNotu: 'Korunacak önceki not',
    degisikenAlanlar: placeholder ? [] : [{ alan: 'istihdam.ilaveKisi', eskiDeger: 0, yeniDeger: 1 }],
    veriSnapshot: {
      oncesi: { istihdam: { ilaveKisi: 0 }, makineListeleri: { yerli: [{ rowId: 'legacy-row', toplamTutariTl: 123.45 }], ithal: [] } },
      sonrasi: { istihdam: { ilaveKisi: 1 }, makineListeleri: { yerli: [{ rowId: 'legacy-row', toplamTutariTl: 234.56 }], ithal: [] } }
    }
  }];
  // Eski şemalardan kalmış alanları temsil etmek için yalnız geçici test DB'sine ham yazma.
  await Model.collection.updateOne({ _id: belge._id }, { $set: { revizyonlar: history } });
  return { id: belge._id, history };
};

describe.each([
  ['eski belge', Tesvik, tesvikController], ['yeni belge', YeniTesvik, yeniTesvikController]
])('%s — legacy revizyon snapshot korunması', (_name, Model, ctrl) => {
  test('kısmi güncelleme ve formun boş geçmişi eski revizyonu silmez', async () => {
    const { id, history } = await createLegacyDocument(Model);
    await call(ctrl.updateTesvik, id, { istihdam: { mevcutKisi: 10, ilaveKisi: 5 }, revizyonlar: [] });
    const stored = await Model.collection.findOne({ _id: id });
    expect(stored.revizyonlar).toHaveLength(2);
    expect(stored.revizyonlar[0]).toEqual(history[0]);
    expect(stored.revizyonlar[1].degisikenAlanlar.map((field) => field.alan)).toContain('istihdam.ilaveKisi');
    expect(stored.istihdam.ilaveKisi).toBe(5);
  });

  test('başlatma kaydı birleştirilirken dışlanan snapshot ve önceki not korunur', async () => {
    const { id, history } = await createLegacyDocument(Model, true);
    const projected = await call(ctrl.getTesvik, id, {});
    expect(projected.body.data.revizyonlar[0].veriSnapshot).toBeUndefined();
    await call(ctrl.updateTesvik, id, {
      istihdam: { mevcutKisi: 10, ilaveKisi: 7 },
      revizyonlar: projected.body.data.revizyonlar
    });
    const stored = await Model.collection.findOne({ _id: id });
    expect(stored.revizyonlar).toHaveLength(1);
    expect(stored.revizyonlar[0]._id).toEqual(history[0]._id);
    expect(stored.revizyonlar[0].veriSnapshot).toEqual(history[0].veriSnapshot);
    expect(stored.revizyonlar[0].kullaniciNotu).toBe(history[0].kullaniciNotu);
    expect(stored.revizyonlar[0].degisikenAlanlar.map((field) => field.alan)).toContain('istihdam.ilaveKisi');
    expect(stored.istihdam.ilaveKisi).toBe(7);
  });
});
