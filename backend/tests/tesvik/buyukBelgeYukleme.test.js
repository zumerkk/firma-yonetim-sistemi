const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');

require('../../models/User');
require('../../models/Firma');
const Tesvik = require('../../models/Tesvik');
const YeniTesvik = require('../../models/YeniTesvik');
const Activity = require('../../models/Activity');
const tesvikController = require('../../controllers/tesvikController');
const yeniTesvikController = require('../../controllers/yeniTesvikController');
const activityController = require('../../controllers/activityController');

jest.setTimeout(60000);
let mem;
let log;
beforeAll(async () => {
  log = jest.spyOn(console, 'log').mockImplementation(() => {});
  mem = await MongoMemoryServer.create();
  await mongoose.connect(mem.getUri());
});
afterAll(async () => {
  await mongoose.disconnect();
  if (mem) await mem.stop();
  log.mockRestore();
});

const user = { _id: new mongoose.Types.ObjectId(), adSoyad: 'Test Uzman', email: 'uzman@example.test', rol: 'admin' };
const call = async (fn, { params = {}, query = {}, body = {} } = {}) => {
  const req = { params, query, body, user, ip: '127.0.0.1', connection: { remoteAddress: '127.0.0.1' }, get: () => 'jest' };
  const res = { statusCode: 200 };
  res.status = (code) => { res.statusCode = code; return res; };
  res.json = (data) => { res.body = data; return res; };
  await fn(req, res);
  return res;
};

const createLargeDocument = async (Model) => {
  const doc = await Model.create({
    gmId: `GM-${new mongoose.Types.ObjectId()}`,
    firma: new mongoose.Types.ObjectId(), firmaId: 'A000001', yatirimciUnvan: 'BÜYÜK MAKİNE LİSTESİ TEST',
    olusturanKullanici: user._id,
    belgeYonetimi: { belgeId: `B-${new mongoose.Types.ObjectId()}`, belgeNo: '600001', belgeTarihi: new Date('2026-01-01') },
    yatirimBilgileri: { yatirimKonusu: '1551', destekSinifi: 'GENEL', yerinIl: 'İZMİR', yerinIlce: 'MENDERES' },
    makineListeleri: { yerli: Array.from({ length: 829 }, (_, i) => ({
      rowId: `row-${i}`, siraNo: i + 1, makineId: `M-${i}`, gtipKodu: '847989970000',
      adiVeOzelligi: `MAKİNE ${i}`, miktar: 2, birim: 'C62', birimFiyatiTl: 12345.67, toplamTutariTl: 24691.34,
      talep: { durum: 'taslak', talepTarihi: new Date('2026-09-01') },
      karar: { kararDurumu: 'onay', onaylananAdet: 2, kararTarihi: new Date('2026-09-15') }
    })), ithal: [] }
  });
  const rows = doc.toObject().makineListeleri.yerli;
  const history = Array.from({ length: 23 }, (_, i) => ({
    revizeId: `history-${i}`, revizeTuru: i % 2 ? 'final' : 'start',
    revizeTarihi: new Date('2026-09-01'), yapanKullanici: user._id, yerli: rows, ithal: []
  }));
  // Test DB'sine ham geçmiş ekle; başlangıç hazırlığı ağır Mongoose save yolunu ölçmesin.
  await Model.collection.updateOne({ _id: doc._id }, { $set: { makineRevizyonlari: history } });
  return { id: doc._id, history };
};

describe.each([
  ['eski belge', Tesvik, tesvikController], ['yeni belge', YeniTesvik, yeniTesvikController]
])('%s büyük belge yükleme', (_name, Model, ctrl) => {
  test('detay/liste ve belge revizesi 23 makine geçmişini taşımaz, kayıtlar aynen korunur', async () => {
    const { id, history } = await createLargeDocument(Model);
    const params = { id: String(id) };
    const detail = await call(ctrl.getTesvik, { params });
    expect(detail.statusCode).toBe(200);
    expect(detail.body.data.makineRevizyonlari).toBeUndefined();
    expect(detail.body.data.makineListeleri.yerli).toHaveLength(829);

    const byCode = await call(ctrl.getTesvik, { params: { id: detail.body.data.tesvikId } });
    expect(byCode.body.data.makineRevizyonlari).toBeUndefined();
    const list = await call(ctrl.getTesvikler);
    expect(list.body.data.tesvikler.find((t) => String(t._id) === String(id)).makineRevizyonlari).toBeUndefined();

    const updated = await call(ctrl.updateTesvik, { params, body: {
      istihdam: { mevcutKisi: 10, ilaveKisi: 5 },
      revizyonBaslatma: { revizyonSebebi: 'Sonuç Revize', kullaniciNotu: 'Test' },
      makineRevizyonlari: [] // Eski açık formun gönderdiği geçmiş listesi bu uçtan yazılamaz.
    } });
    expect(updated.statusCode).toBe(200);
    const stored = await Model.findById(id).lean();
    expect(stored.makineRevizyonlari).toEqual(history);
    expect(stored.makineListeleri.yerli).toHaveLength(829);
    expect(stored.makineListeleri.yerli[0].birimFiyatiTl).toBe(12345.67);
    expect(stored.revizyonlar).toHaveLength(1);
    expect(stored.istihdam.ilaveKisi).toBe(5);
    const updateLog = await Activity.findOne({ 'targetResource.id': id, action: 'update' }).lean();
    expect(updateLog).not.toBeNull();
    expect(updateLog.changes.before.makineRevizyonlari).toBeUndefined();
    expect(updateLog.changes.after.makineRevizyonlari).toBeUndefined();
    expect(updateLog.changes.fields.some((f) => f.field === 'istihdam.ilaveKisi')).toBe(true);
  });
});

test('eski büyük aktivite listede hafifler, alan değerleri ve tekil geçmiş detayı korunur', async () => {
  const targetId = new mongoose.Types.ObjectId();
  const snapshot = { yerli: Array.from({ length: 829 }, (_, i) => ({ rowId: `r${i}`, adiVeOzelligi: `MAKİNE ${i}` })), ithal: [] };
  const before = { istihdam: { ilaveKisi: 1 }, makineRevizyonlari: [snapshot, snapshot], makineListeleri: snapshot };
  const after = { ...before, istihdam: { ilaveKisi: 2 } };
  const activity = await Activity.create({
    action: 'update', category: 'tesvik', title: 'Büyük aktivite', description: 'Test',
    targetResource: { type: 'tesvik', id: targetId }, user: { id: user._id, name: user.adSoyad, email: user.email, role: user.rol },
    changes: { before, after, fields: [{ field: 'istihdam.ilaveKisi', oldValue: 1, newValue: 2 }] }
  });
  const list = await call(activityController.getActivities, { query: { targetId: String(targetId) } });
  const item = list.body.data.activities[0];
  expect(item.changes.before.makineRevizyonlari).toBeUndefined();
  expect(item.changes.after.makineRevizyonlari).toBeUndefined();
  expect(item.changes.before.istihdam.ilaveKisi).toBe(1);
  expect(item.changes.after.istihdam.ilaveKisi).toBe(2);
  expect(item.changes.after.makineListeleri.yerli).toHaveLength(829);
  expect(item.changes.fields[0].newValue).toBe(2);
  const detail = await call(activityController.getActivity, { params: { id: String(activity._id) } });
  expect(detail.body.data.activity.changes.before.makineRevizyonlari).toHaveLength(2);
  const dashboard = await Activity.getRecentActivitiesForDashboard(1);
  expect(dashboard[0].changes.before).toBeUndefined();
  expect(dashboard[0].changes.after).toBeUndefined();
});
