// Büyük makine geçmişi yalnız ihtiyaç duyulduğunda okunmalı. Yazma sonucunda
// 800+ satırlı eski snapshot'ları hydrate etmek belleği ve tüm sunucuyu yoruyordu.
const { createHash } = require('crypto');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
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
afterEach(() => jest.restoreAllMocks());

const kullanici = { _id: new mongoose.Types.ObjectId() };
const ozet = (value) => createHash('sha256').update(JSON.stringify(value)).digest('hex');
const cagir = async (fn, id, body = {}) => {
  const res = { statusCode: 200, govde: null };
  res.status = (code) => { res.statusCode = code; return res; };
  res.json = (body) => { res.govde = body; return res; };
  await fn({ params: { id: String(id) }, body, user: kullanici }, res);
  expect(res.statusCode).toBe(200);
  expect(res.govde.success).toBe(true);
  return res;
};

const belgeKur = async (Model) => {
  const tarih = new Date('2026-09-25T00:00:00Z');
  const row = (i, ithal = false) => ({
    rowId: new mongoose.Types.ObjectId().toString(), siraNo: i + 1,
    makineId: String(1000000 + i + (ithal ? 1000 : 0)),
    gtipKodu: '847989970000', adiVeOzelligi: `TEST MAKİNE ${i + 1}`, miktar: 2, birim: 'ADET',
    birimAciklamasi: 'ADET(UNIT)', makineTechizatTipi: 'Ana Makine',
    finansalKiralamaMi: 'EVET', finansalKiralamaAdet: 1, finansalKiralamaSirket: 'TEST LEASING',
    gerceklesenAdet: 1, gerceklesenTutar: 500.25,
    ...(ithal
      ? { birimFiyatiFob: 123.45, toplamTutarFobUsd: 246.9, toplamTutarFobTl: 10599.886,
        gumrukDovizKodu: 'USD', kurManuel: true, kurManuelDeger: 42.94 }
      : { birimFiyatiTl: 392051.89, toplamTutariTl: 784103.78, kdvIstisnasi: 'EVET' }),
    talep: { durum: 'bakanliga_gonderildi', istenenAdet: 2, talepTarihi: tarih },
    karar: { kararDurumu: 'onay', onaylananAdet: 2, kararTarihi: tarih }
  });
  const belge = new Model({
    tesvikId: `PERF-${Model.modelName}`, gmId: `GM-${Model.modelName}`,
    firma: new mongoose.Types.ObjectId(), firmaId: 'A000001',
    yatirimciUnvan: 'PERFORMANS TEST FİRMASI', olusturanKullanici: kullanici._id,
    makineListeleri: {
      yerli: Array.from({ length: 800 }, (_, i) => row(i)),
      ithal: Array.from({ length: 29 }, (_, i) => row(i, true))
    }
  }).toObject();
  belge.makineRevizyonlari = Array.from({ length: 23 }, (_, i) => ({
    revizeId: new mongoose.Types.ObjectId().toString(), revizeTarihi: tarih,
    revizeTuru: i % 2 ? 'final' : 'start', aciklama: `Önceki revize ${i + 1}`,
    yapanKullanici: kullanici._id,
    yerli: belge.makineListeleri.yerli, ithal: belge.makineListeleri.ithal
  }));
  // Yalnız geçici test Mongo'suna yazılır; fixture kurulurken gereksiz history validasyonu yok.
  await Model.collection.insertOne(belge);
  return belge;
};

describe.each([
  ['eski belge', Tesvik, tesvikController],
  ['yeni belge', YeniTesvik, yeniTesvikController]
])('%s — ağır makine geçmişi', (_ad, Model, ctrl) => {
  test('belge okumak kullanılmayan tam _original kopyası oluşturmaz', () => {
    const belge = Model.hydrate({ _id: new mongoose.Types.ObjectId(), makineListeleri: { yerli: [], ithal: [] } });
    expect(belge._original).toBeUndefined();
  });

  test('başlat, kaydet ve iki finalize yolu geçmişi koruyarak küçük yazma sonucu döndürür', async () => {
    const once = await belgeKur(Model);
    const historyOzeti = ozet(once.makineRevizyonlari);
    const hydrate = jest.spyOn(Model.prototype, '$init');
    const yazma = jest.spyOn(Model.collection, 'findOneAndUpdate');
    const oku = () => Model.collection.findOne({ _id: once._id });

    await cagir(ctrl.startMakineRevizyon, once._id, { aciklama: 'Performans başlangıç' });
    let sonra = await oku();
    expect(sonra.makineRevizyonlari).toHaveLength(24);
    expect(ozet(sonra.makineRevizyonlari.slice(0, 23))).toBe(historyOzeti);
    expect(ozet(sonra.makineRevizyonlari[23].yerli)).toBe(ozet(once.makineListeleri.yerli));
    expect(ozet(sonra.makineRevizyonlari[23].ithal)).toBe(ozet(once.makineListeleri.ithal));

    // Excel'den kimliksiz yeniden gelen aynı makinenin rowId'si ve tarihleri korunur.
    const yerli = once.makineListeleri.yerli.map(({ rowId, ...r }) => r);
    const ithal = once.makineListeleri.ithal.map(({ rowId, ...r }) => r);
    yerli[0].adiVeOzelligi = 'GÜNCELLENEN TEST MAKİNE';
    await cagir(ctrl.saveMakineListeleri, once._id, { yerli, ithal });
    sonra = await oku();
    expect(sonra.makineListeleri.yerli).toHaveLength(800);
    expect(sonra.makineListeleri.ithal).toHaveLength(29);
    expect(sonra.makineListeleri.yerli[0]).toMatchObject({
      rowId: once.makineListeleri.yerli[0].rowId,
      adiVeOzelligi: 'GÜNCELLENEN TEST MAKİNE', toplamTutariTl: 784103.78,
      finansalKiralamaSirket: 'TEST LEASING',
      talep: { talepTarihi: new Date('2026-09-25T00:00:00Z') }
    });
    expect(sonra.makineListeleri.ithal[0]).toMatchObject({
      rowId: once.makineListeleri.ithal[0].rowId,
      kurManuel: true, kurManuelDeger: 42.94, toplamTutarFobTl: 10599.886
    });
    expect(sonra.makineRevizyonlari).toHaveLength(24);
    expect(ozet(sonra.makineRevizyonlari.slice(0, 23))).toBe(historyOzeti);

    await cagir(ctrl.finalizeMakineRevizyon, once._id, {
      aciklama: 'Yeni payload ile finalize', ...sonra.makineListeleri
    });
    sonra = await oku();
    expect(sonra.makineRevizyonlari).toHaveLength(25);
    expect(sonra.makineRevizyonlari[24].yerli).toHaveLength(800);
    expect(sonra.makineRevizyonlari[24].ithal).toHaveLength(29);
    expect(sonra.makineRevizyonlari[24].yerli[0].rowId).toBe(once.makineListeleri.yerli[0].rowId);
    expect(ozet(sonra.makineRevizyonlari.slice(0, 23))).toBe(historyOzeti);

    const listelerOzeti = ozet(sonra.makineListeleri);
    await cagir(ctrl.finalizeMakineRevizyon, once._id, { aciklama: 'Eski uyumluluk yolu' });
    sonra = await oku();
    expect(sonra.makineRevizyonlari).toHaveLength(26);
    expect(ozet(sonra.makineListeleri)).toBe(listelerOzeti);
    expect(ozet(sonra.makineRevizyonlari[25].yerli)).toBe(ozet(sonra.makineListeleri.yerli));
    expect(ozet(sonra.makineRevizyonlari[25].ithal)).toBe(ozet(sonra.makineListeleri.ithal));
    expect(ozet(sonra.makineRevizyonlari.slice(0, 23))).toBe(historyOzeti);

    // DB'nin döndürdüğü sonuç da küçük olmalı; sadece sonradan response'u kırpmak yetmez.
    expect(yazma).toHaveBeenCalledTimes(4);
    for (const result of yazma.mock.results) {
      expect(Object.keys(await result.value)).toEqual(['_id']);
    }
    expect(hydrate).not.toHaveBeenCalled();
  });
});
