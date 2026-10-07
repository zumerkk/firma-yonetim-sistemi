const mongoose = require('mongoose');
const { MongoMemoryReplSet } = require('mongodb-memory-server');
const ExcelJS = require('exceljs');
require('../../models/User');
const Firma = require('../../models/Firma');
const Tesvik = require('../../models/Tesvik');
const YeniTesvik = require('../../models/YeniTesvik');
const Kayit = require('../../models/MakineRevizyonKaydi');
const ctrlEski = require('../../controllers/tesvikController');
const ctrlYeni = require('../../controllers/yeniTesvikController');
const { upsertTesvik, upsertYeniTesvik } = require('../../services/ingest/ingestors/TesvikIngestor');

jest.setTimeout(60000);
let mem;
const user = { _id: new mongoose.Types.ObjectId(), adSoyad: 'Revizyon Test Kullanıcısı', email: 'test@example.com', rol: 'admin' };
const tarih = new Date('2026-09-25T07:30:00Z');
beforeAll(async () => {
  mem = await MongoMemoryReplSet.create({ replSet: { count: 1, storageEngine: 'wiredTiger' } });
  await mongoose.connect(mem.getUri());
  await Kayit.init();
  await mongoose.connection.collection('users').insertOne({ _id: user._id, adSoyad: 'Revizyon Test Kullanıcısı', email: 'test@example.com' });
});
afterAll(async () => { await mongoose.disconnect(); if (mem) await mem.stop(); });
afterEach(() => jest.restoreAllMocks());

async function cagir(fn, id, body = {}, query = {}) {
  const res = { statusCode: 200, headers: {} };
  res.status = code => { res.statusCode = code; return res; };
  res.json = data => { res.body = data; return res; };
  res.send = data => { res.buffer = data; return res; };
  res.setHeader = (key, value) => { res.headers[key] = value; };
  await fn({ params: { id: String(id) }, body, query, user }, res);
  return res;
}

async function belgeKur(Model, ayri = true) {
  const base = new Model({
    tesvikId: `DEPO-${new mongoose.Types.ObjectId()}`, gmId: `GM-${new mongoose.Types.ObjectId()}`,
    firma: new mongoose.Types.ObjectId(), firmaId: 'A000001',
    yatirimciUnvan: 'DEPO TEST FİRMASI', olusturanKullanici: user._id,
    makineListeleri: {
      yerli: [{ rowId: 'yerli-sabit', makineId: '1001', siraNo: 1, gtipKodu: '847989970000',
        adiVeOzelligi: 'YERLİ TEST MAKİNESİ', miktar: 2, birim: 'ADET', birimFiyatiTl: 123.45,
        toplamTutariTl: 246.9, finansalKiralamaSirket: 'LEASING',
        talep: { durum: 'bakanliga_gonderildi', istenenAdet: 2, talepTarihi: tarih },
        karar: { kararDurumu: 'onay', onaylananAdet: 2, kararTarihi: tarih } }],
      ithal: [{ rowId: 'ithal-sabit', makineId: '2001', siraNo: 1, gtipKodu: '847989970000',
        adiVeOzelligi: 'İTHAL TEST MAKİNESİ', miktar: 3, birim: 'ADET', birimFiyatiFob: 987.65,
        toplamTutarFobUsd: 2962.95, toplamTutarFobTl: 127229.073, gumrukDovizKodu: 'USD',
        kurManuel: true, kurManuelDeger: 42.94 }]
    }
  }).toObject();
  const snapshot = {
    revizeId: new mongoose.Types.ObjectId().toString(), revizeTarihi: tarih, revizeTuru: 'final',
    yapanKullanici: user._id, aciklama: 'GÖÇ ÖNCESİ REVİZYON', belgeId: 'ETUYS-BELGE-123',
    ekTarih: tarih, bilinmeyenEskiAlan: { objectId: new mongoose.Types.ObjectId(), sayi: 12.34 },
    ...base.makineListeleri
  };
  if (ayri) {
    delete base.makineRevizyonlari;
    base.makineRevizyonDeposu = 'ayri';
    base.makineRevizyonSayaci = 1;
    await Kayit.collection.insertOne({ tesvik: base._id, tesvikModeli: Model.modelName, sira: 0, snapshot });
  } else base.makineRevizyonlari = [snapshot];
  await Model.collection.insertOne(base);
  return { base, snapshot };
}

describe.each([
  ['eski belge', Tesvik, ctrlEski], ['yeni belge', YeniTesvik, ctrlYeni]
])('%s — ayrı makine geçmişi', (_label, Model, ctrl) => {
  test('uygulamadan oluşturulan yeni belgelerin ilk revizyonu doğrudan ayrı depoya yazılır', async () => {
    const firma = new mongoose.Types.ObjectId();
    const firmaId = `TEST-${new mongoose.Types.ObjectId()}`;
    await Firma.collection.insertOne({ _id: firma, firmaId, vergiNoTC: new mongoose.Types.ObjectId().toString(), tamUnvan: 'YENİ BELGE TEST FİRMASI' });
    const create = await cagir(ctrl.createTesvik, undefined, {
      firma, gmId: `GM-${new mongoose.Types.ObjectId()}`,
      belgeYonetimi: { belgeId: `ETUYS-${new mongoose.Types.ObjectId()}`, belgeNo: '1234', belgeTarihi: tarih },
      yatirimBilgileri: { yatirimKonusu: '1551', destekSinifi: 'GENEL', yerinIl: 'İZMİR', yerinIlce: 'MENDERES' },
      makineRevizyonSayaci: 99
    });
    expect(create.statusCode).toBe(201);
    const id = create.body.data._id;
    expect((await Model.findById(id).lean()).makineRevizyonSayaci).toBe(0);
    expect((await cagir(ctrl.startMakineRevizyon, id)).body.success).toBe(true);
    const stored = await Model.collection.findOne({ _id: new mongoose.Types.ObjectId(id) });
    expect(stored.makineRevizyonDeposu).toBe('ayri');
    expect(stored.makineRevizyonSayaci).toBe(1);
    expect(stored.makineRevizyonlari || []).toHaveLength(0);
    expect(await Kayit.countDocuments({ tesvik: stored._id, tesvikModeli: Model.modelName })).toBe(1);
    const ingest = Model === Tesvik ? upsertTesvik : upsertYeniTesvik;
    const ingested = await ingest({
      firmaId, gmId: `INGEST-${new mongoose.Types.ObjectId()}`, yatirimciUnvan: 'INGEST TEST',
      belgeYonetimi: { belgeId: `INGEST-ETUYS-${new mongoose.Types.ObjectId()}`, belgeNo: '5678', belgeTarihi: tarih },
      yatirimBilgileri: { yatirimKonusu: '1551', destekSinifi: 'GENEL', yerinIl: 'İZMİR', yerinIlce: 'MENDERES' }
    }, { userId: user._id, mode: 'create_only' });
    expect((await Model.findById(ingested.id).lean()).makineRevizyonDeposu).toBe('ayri');
  });

  test('başlat/final/partial-final/geri dönüş/meta geçmişi ve veri tiplerini korur', async () => {
    const { base, snapshot } = await belgeKur(Model);
    const key = { tesvik: base._id, tesvikModeli: Model.modelName };
    expect((await cagir(ctrl.startMakineRevizyon, base._id)).body.success).toBe(true);
    const yerli = base.makineListeleri.yerli.map(({ rowId, ...r }) => ({ ...r, adiVeOzelligi: 'YENİ YERLİ MAKİNE', miktar: 5 }));
    expect((await cagir(ctrl.finalizeMakineRevizyon, base._id, { yerli })).body.success).toBe(true);
    expect((await cagir(ctrl.finalizeMakineRevizyon, base._id)).body.success).toBe(true);
    let list = (await cagir(ctrl.listMakineRevizyonlari, base._id)).body.data;
    expect(list).toHaveLength(4);
    expect(list[0]).toMatchObject({ revizeId: snapshot.revizeId, belgeId: 'ETUYS-BELGE-123', ekTarih: tarih, bilinmeyenEskiAlan: snapshot.bilinmeyenEskiAlan });
    expect(list[0].yapanKullanici.adSoyad).toBe('Revizyon Test Kullanıcısı');
    for (const revision of list) {
      expect(revision.yerli[0].rowId).toBe('yerli-sabit');
      expect(revision.yerli[0].talep.talepTarihi).toEqual(tarih);
      expect(revision.ithal[0]).toMatchObject({ rowId: 'ithal-sabit', toplamTutarFobTl: 127229.073, kurManuelDeger: 42.94 });
    }
    const changed = list.find(r => r.yerli[0].adiVeOzelligi === 'YENİ YERLİ MAKİNE');
    expect(changed).toBeDefined();
    const meta = await cagir(ctrl.updateMakineRevizyonMeta, base._id, {
      revizeId: changed.revizeId, meta: { talepNo: 'TALEP-7', belgeId: 'ETUYS-777', basvuruTarihi: '2026-10-01', yerli: [] }
    });
    expect(meta.body.data).toMatchObject({ talepNo: 'TALEP-7', belgeId: 'ETUYS-777', basvuruTarihi: new Date('2026-10-01') });
    expect(meta.body.data.yerli).toHaveLength(1);
    const revert = await cagir(ctrl.revertMakineRevizyon, base._id, { revizeId: snapshot.revizeId });
    expect(revert.body.success).toBe(true);
    expect(revert.body.makineListeleri.yerli).toEqual(base.makineListeleri.yerli);
    const stored = await Model.collection.findOne({ _id: base._id });
    expect(stored.makineRevizyonlari).toBeUndefined();
    expect(stored.makineRevizyonSayaci).toBe(5);
    expect(await Kayit.countDocuments(key)).toBe(5);
    expect((await Kayit.collection.findOne({ ...key, sira: 0 })).snapshot).toEqual(snapshot);
    const missing = await cagir(ctrl.revertMakineRevizyon, base._id, { revizeId: 'bulunmayan' });
    expect(missing.statusCode).toBe(404);
    expect(await Kayit.countDocuments(key)).toBe(5);
  });

  test('liste özeti yalnız metadata okur; tam geçmiş isteğe bağlı kalır', async () => {
    for (const ayri of [false, true]) {
      const { base, snapshot } = await belgeKur(Model, ayri);
      const summary = await cagir(ctrl.listMakineRevizyonlari, base._id, {}, { ozet: 'true' });
      expect(summary.body.data).toHaveLength(1);
      expect(summary.body.data[0]).toMatchObject({ revizeId: snapshot.revizeId, belgeId: 'ETUYS-BELGE-123' });
      expect(summary.body.data[0].yerli).toBeUndefined();
      expect(summary.body.data[0].ithal).toBeUndefined();
      expect((await cagir(ctrl.listMakineRevizyonlari, base._id)).body.data[0].yerli).toHaveLength(1);
    }
  });

  test('iki Excel çıktısı ayrı depodaki eski ve yeni kayıtları içerir', async () => {
    const { base } = await belgeKur(Model);
    await cagir(ctrl.finalizeMakineRevizyon, base._id, {
      yerli: base.makineListeleri.yerli.map(r => ({ ...r, adiVeOzelligi: 'EXCEL REVİZYON MAKİNESİ' }))
    });
    const currentRevision = await Kayit.findOne({ tesvik: base._id, tesvikModeli: Model.modelName, sira: 1 }).lean();
    await cagir(ctrl.updateMakineRevizyonMeta, base._id, { revizeId: currentRevision.snapshot.revizeId, meta: { talepNo: 'EXPORT-META-7' } });
    for (const fn of [ctrl.exportMakineRevizyonExcel, ctrl.exportMakineRevizyonHistoryExcel]) {
      const result = await cagir(fn, base._id);
      expect(result.statusCode).toBe(200);
      expect(result.headers['Content-Type']).toContain('spreadsheetml');
      const workbook = new ExcelJS.Workbook();
      await workbook.xlsx.load(result.buffer);
      const contents = JSON.stringify(workbook.worksheets.map(sheet => sheet.getSheetValues()));
      expect(contents).toContain('EXCEL REVİZYON MAKİNESİ');
      expect(contents).toContain('YERLİ TEST MAKİNESİ');
      expect(contents).toContain('EXPORT-META-7');
      if (fn === ctrl.exportMakineRevizyonExcel) expect(contents).toContain('ETUYS-BELGE-123');
    }
  });

  test('snapshot insert hatasında liste ve sayaç transaction ile geri alınır', async () => {
    const { base } = await belgeKur(Model);
    jest.spyOn(Kayit, 'create').mockRejectedValueOnce(new Error('Test için depo yazma hatası'));
    const result = await cagir(ctrl.finalizeMakineRevizyon, base._id, { yerli: [] });
    expect(result.statusCode).toBe(500);
    const stored = await Model.collection.findOne({ _id: base._id });
    expect(stored.makineListeleri).toEqual(base.makineListeleri);
    expect(stored.makineRevizyonSayaci).toBe(1);
    expect(await Kayit.countDocuments({ tesvik: base._id, tesvikModeli: Model.modelName })).toBe(1);
  });

  test('yeni satırın otomatik kimliği güncel listede ve snapshotta aynı kalır', async () => {
    const { base } = await belgeKur(Model);
    const { rowId, ...newRow } = base.makineListeleri.yerli[0];
    newRow.makineId = 'YENI-SATIR-999';
    const result = await cagir(ctrl.finalizeMakineRevizyon, base._id, { yerli: [newRow] });
    expect(result.statusCode).toBe(200);
    const current = await Model.collection.findOne({ _id: base._id });
    const revision = await Kayit.findOne({ tesvik: base._id, tesvikModeli: Model.modelName, sira: 1 }).lean();
    expect(current.makineListeleri.yerli[0].rowId).toBeTruthy();
    expect(current.makineListeleri.yerli).toEqual(revision.snapshot.yerli);
    expect(current.makineListeleri.yerli[0].rowId).not.toBe(rowId);
  });

  test('eşzamanlı başlat/finalize her snapshotı tek sırayla ve tutarlı listelerle kaydeder', async () => {
    const { base } = await belgeKur(Model);
    const responses = await Promise.all([
      cagir(ctrl.startMakineRevizyon, base._id),
      cagir(ctrl.finalizeMakineRevizyon, base._id, { yerli: base.makineListeleri.yerli.map(r => ({ ...r, adiVeOzelligi: 'EŞZAMANLI A' })) }),
      cagir(ctrl.startMakineRevizyon, base._id),
      cagir(ctrl.finalizeMakineRevizyon, base._id, { yerli: base.makineListeleri.yerli.map(r => ({ ...r, adiVeOzelligi: 'EŞZAMANLI B' })) })
    ]);
    expect(responses.every(r => r.statusCode === 200)).toBe(true);
    const records = await Kayit.find({ tesvik: base._id, tesvikModeli: Model.modelName }).sort({ sira: 1 }).lean();
    expect(records.map(r => r.sira)).toEqual([0, 1, 2, 3, 4]);
    const dates = records.map(r => r.snapshot.revizeTarihi.getTime());
    expect(dates).toEqual([...dates].sort((a, b) => a - b));
    expect(new Set(records.map(r => r.snapshot.revizeId)).size).toBe(5);
    const current = await Model.collection.findOne({ _id: base._id });
    expect(current.makineRevizyonSayaci).toBe(5);
    expect(records[4].snapshot.yerli).toEqual(current.makineListeleri.yerli);
    for (const r of records) expect(r.snapshot.ithal).toEqual(base.makineListeleri.ithal);
  });
});
