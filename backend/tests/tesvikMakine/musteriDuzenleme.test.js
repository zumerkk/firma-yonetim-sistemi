const express = require('express');
const mongoose = require('mongoose');
const request = require('supertest');
const { MongoMemoryServer } = require('mongodb-memory-server');
const Tesvik = require('../../models/Tesvik');
const YeniTesvik = require('../../models/YeniTesvik');
const MachineProcess = require('../../models/MachineProcess');
const MachineProcessLog = require('../../models/MachineProcessLog');
const HarcamaKalemi = require('../../models/HarcamaKalemi');
const portal = require('../../services/musteriPortal/portalService');
const harcama = require('../../services/tesvikMakine/harcamaService');
const mps = require('../../services/tesvikMakine/machineProcessService');
const router = require('../../routes/musteriPortal');

jest.setTimeout(60_000);
const app = express();
app.use(express.json());
app.use('/api/musteri-belge', router);
const belgeId = new mongoose.Types.ObjectId();
const baskaId = new mongoose.Types.ObjectId();
const personel = new mongoose.Types.ObjectId();
const modelMap = { Tesvik, YeniTesvik };
const makineListeleri = {
  yerli: [{ rowId: 'Y1', adiVeOzelligi: 'Pres' }, { rowId: 'Y2', adiVeOzelligi: 'Robot' }],
  ithal: [{ rowId: 'I1', gumrukDovizKodu: 'EUR', adiVeOzelligi: 'İthal Pres' }]
};
const temel = { tarih: new Date('2025-10-01'), no: 'FT-1', icerik: 'Kalem açıklaması', tutar: 100, adet: 1 };
const tarihler = { baslangicTarihi: '2000-01-01', bitisTarihi: '2099-12-31' };
const ek = {
  _id: new mongoose.Types.ObjectId(), tur: 'yevmiye_pdf', dosyaAdi: 'yevmiye.pdf', fileSize: 12, mimeType: 'application/pdf',
  depo: { provider: 'cloudinary', dosyaYolu: '12345678-1234-1234-1234-123456789012.pdf' },
  istekId: 'onceki-yukleme', istekOzeti: 'onceki-ozet'
};
let mongo;
let sunucu;
let tokenler;

const yol = (model = 'Tesvik') => `/api/musteri-belge/${tokenler[model]}`;
const makineYolu = (id, model) => `${yol(model)}/fatura-kalemi/${id}`;
const harcamaYolu = (id, model) => `${yol(model)}/harcamalar/${id}`;

beforeAll(async () => {
  mongo = await MongoMemoryServer.create({ instance: { launchTimeout: 30000 } });
  await mongoose.connect(mongo.getUri());
  await new Promise((resolve) => { sunucu = app.listen(0, resolve); });
});

afterAll(async () => {
  if (sunucu) await new Promise((resolve) => sunucu.close(resolve));
  await mongoose.disconnect();
  if (mongo) await mongo.stop();
});

beforeEach(async () => {
  await Promise.all([Tesvik.deleteMany({}), YeniTesvik.deleteMany({}), MachineProcess.deleteMany({}), HarcamaKalemi.deleteMany({}), MachineProcessLog.deleteMany({})]);
  await Promise.all(Object.values(modelMap).map((Model) => Model.collection.insertOne({ _id: belgeId, makineListeleri })));
  await Tesvik.collection.insertOne({ _id: baskaId, makineListeleri });
  tokenler = Object.fromEntries(await Promise.all(Object.keys(modelMap).map(async (model) => {
    const { link } = await portal.linkUret(model, belgeId, tarihler);
    return [model, link.split('/belge/')[1]];
  })));
});
afterEach(() => jest.restoreAllMocks());

async function makineOlustur({ model = 'Tesvik', listType = 'local', kaynak = 'personel', kapsam = {}, kalem = {} } = {}) {
  return MachineProcess.create({
    tesvikModel: model, tesvikId: belgeId, rowId: listType === 'local' ? 'Y1' : 'I1', listType, currency: listType === 'local' ? 'TRY' : 'EUR',
    notes: 'Özel süreç notu', updatedByUserId: personel, ...kapsam,
    faturalar: [{ ...temel, kaynak, girenAdi: 'İlk giren kişi', girisTarihi: new Date('2025-10-02'), tutarParaBirimi: 'TRY', evraklar: [ek], ...kalem }]
  });
}

test.each(Object.keys(modelMap))('%s yerli ve ithal kalemlerde tüm kaynakları düzenler, toplamları günceller ve özel alanları korur', async (model) => {
  for (const listType of ['local', 'import']) {
    for (const kaynak of ['personel', 'firma']) {
      const proc = await makineOlustur({ model, listType, kaynak });
      const id = proc.faturalar[0].id;
      const onceki = await MachineProcess.findById(proc._id).select(mps.FATURA_EVRAK_OZEL_ALANLARI).lean();
      const hedef = { rowId: proc.rowId, listType };
      const yanit = await request(sunucu).patch(makineYolu(id, model)).send({
        ...hedef, no: 'FT-DUZELEN', icerik: 'Yeni açıklama', tutar: 150.25, adet: 2,
        yevmiyeNo: '000007', yevmiyeTarihi: '2024-02-29', giren: 'Düzenleyen müşteri',
        kaynak: 'sahte', girenAdi: 'Sahte personel', tutarParaBirimi: 'EUR',
        evraklar: [], notes: '', tesvikId: baskaId, tesvikModel: 'Baska'
      }).expect(200);
      expect(yanit.body.data).toMatchObject({ rowId: proc.rowId, listType, faturaToplami: 150.25, faturaAdedi: 2 });
      expect(yanit.body.data.kalemler[0]).toMatchObject({
        _id: id, no: 'FT-DUZELEN', icerik: 'Yeni açıklama', tutar: 150.25, kaynak,
        tutarParaBirimi: 'TRY', yevmiyeNo: '000007', yevmiyeTarihi: '2024-02-29T00:00:00.000Z', duzenlenebilir: true
      });
      expect(yanit.text).not.toMatch(/Özel süreç notu|Sahte personel|cloudinary|onceki-ozet|sonFirmaDuzenlemesi|updatedByUserId/);
      const guncel = await MachineProcess.findById(proc._id).select(mps.FATURA_EVRAK_OZEL_ALANLARI).lean();
      expect(guncel.faturalar[0].evraklar).toEqual(onceki.faturalar[0].evraklar);
      expect(guncel.faturalar[0]).toMatchObject({ kaynak, girenAdi: 'İlk giren kişi', girisTarihi: onceki.faturalar[0].girisTarihi });
      expect(guncel).toMatchObject({ notes: 'Özel süreç notu', updatedByUserId: personel, tesvikId: belgeId, tesvikModel: model });
      expect((await MachineProcessLog.findOne({ machineProcessId: proc._id })).performedByLabel).toBe('Firma — Düzenleyen müşteri');
      const master = await modelMap[model].findById(belgeId).lean();
      const liste = listType === 'local' ? master.makineListeleri.yerli : master.makineListeleri.ithal;
      expect(liste[0]).toMatchObject({ gerceklesenTutar: 150.25, gerceklesenAdet: 2 });
      const ozet = await request(sunucu).get(`${yol(model)}/gerceklesme`).expect(200);
      expect(ozet.body.data[listType === 'local' ? 'yerli' : 'ithal']).toBe(150.25);
      await MachineProcess.deleteOne({ _id: proc._id });
    }
  }
});

test.each(Object.keys(modelMap))('%s harcamalarında her gider grubunun firma ve personel kalemi düzeltilebilir', async (model) => {
  for (const [kategori, altKategori] of [['diger', 'montaj'], ['bina', 'anaBina'], ['arazi', 'arazi']]) {
    for (const kaynak of ['personel', 'firma']) {
      const kayit = await HarcamaKalemi.create({
        tesvikModel: model, tesvikId: belgeId, ...temel, kategori, altKategori, kaynak,
        girenAdi: 'İlk giren kişi', olusturanKullanici: personel, sonGuncelleyen: personel, evraklar: [ek]
      });
      const onceki = await HarcamaKalemi.findById(kayit._id).select('+evraklar.depo +evraklar.istekId +evraklar.istekOzeti').lean();
      const yanit = await request(sunucu).patch(harcamaYolu(kayit.id, model)).send({
        tutar: 123.45, icerik: 'Düzeltilen açıklama', yevmiyeNo: '0007', yevmiyeTarihi: '2025-10-03', giren: 'Düzenleyen müşteri',
        kaynak: 'baska', girenAdi: 'değişmesin', sonGuncelleyen: new mongoose.Types.ObjectId(), olusturanKullanici: null,
        evraklar: [], tesvikId: baskaId
      }).expect(200);
      expect(yanit.body.data).toMatchObject({ _id: kayit.id, kategori, altKategori, kaynak, tutar: 123.45, duzenlenebilir: true, icerik: 'Düzeltilen açıklama', yevmiyeNo: '0007' });
      expect(yanit.text).not.toMatch(/sonGuncelleyen|olusturanKullanici|sonFirmaDuzenlemesi|cloudinary|onceki-ozet/);
      const guncel = await HarcamaKalemi.findById(kayit._id).select('+evraklar.depo +evraklar.istekId +evraklar.istekOzeti').lean();
      expect(guncel.evraklar).toEqual(onceki.evraklar);
      expect(guncel).toMatchObject({ kaynak, girenAdi: 'İlk giren kişi', olusturanKullanici: personel, sonGuncelleyen: personel, sonFirmaDuzenlemesi: { ad: 'Düzenleyen müşteri', tarih: expect.any(Date) } });
      const liste = await request(sunucu).get(`${yol(model)}/harcamalar`).expect(200);
      expect(liste.body.data.kalemler.find((k) => k._id === kayit.id)).toMatchObject({ icerik: 'Düzeltilen açıklama', duzenlenebilir: true });
    }
  }
  const sonuc = await request(sunucu).get(`${yol(model)}/gerceklesme`).expect(200);
  expect(sonuc.body.data).toMatchObject({ toplam: 740.7 });
  expect(sonuc.body.data.kalemler.every((k) => k.icerik === 'Düzeltilen açıklama')).toBe(true);
});

test('aynı satır ve kalem kimliğine rağmen farklı belge veya belge türü düzenlenmez', async () => {
  const ayniKalemId = new mongoose.Types.ObjectId();
  const yabanci = await makineOlustur({ model: 'YeniTesvik', kalem: { _id: ayniKalemId } });
  await makineOlustur({ kapsam: { tesvikId: baskaId }, kalem: { _id: ayniKalemId } });
  const gider = await HarcamaKalemi.create({ tesvikModel: 'YeniTesvik', tesvikId: belgeId, ...temel, kategori: 'diger', altKategori: 'montaj' });
  await request(sunucu).patch(makineYolu(ayniKalemId)).send({ rowId: 'Y1', listType: 'local', tutar: 999 }).expect(404);
  await request(sunucu).patch(harcamaYolu(gider.id)).send({ tutar: 999, tesvikModel: 'YeniTesvik' }).expect(404);
  await request(sunucu).patch(makineYolu(ayniKalemId, 'YeniTesvik')).send({ rowId: 'Y2', tutar: 999 }).expect(404);
  await request(sunucu).patch(makineYolu(ayniKalemId, 'YeniTesvik')).send({ rowId: 'Y1', listType: 'import', tutar: 999 }).expect(404);
  expect((await MachineProcess.findById(yabanci._id)).faturalar[0].tutar).toBe(100);
  expect((await HarcamaKalemi.findById(gider._id)).tutar).toBe(100);
  const kendi = await makineOlustur({ kalem: { _id: ayniKalemId } });
  await request(sunucu).patch(makineYolu(ayniKalemId)).send({ rowId: 'Y1', listType: 'local', tutar: 175 }).expect(200);
  expect((await MachineProcess.findById(kendi._id)).faturalar[0].tutar).toBe(175);
  expect((await MachineProcess.findById(yabanci._id)).faturalar[0].tutar).toBe(100);
  expect((await MachineProcess.findOne({ tesvikModel: 'Tesvik', tesvikId: baskaId })).faturalar[0].tutar).toBe(100);
});

test('eski fatura özeti ve dövizli ithal kalem para birimi değişmeden düzenlenir', async () => {
  const eski = await MachineProcess.create({ tesvikModel: 'Tesvik', tesvikId: belgeId, rowId: 'Y1', listType: 'local', invoiceNo: 'ESKI', invoiceRealizedValue: 25 });
  const sonuc = await request(sunucu).patch(makineYolu(eski.id)).send({ rowId: 'Y1', tutar: 50 }).expect(200);
  expect(sonuc.body.data.kalemler).toEqual([expect.objectContaining({ _id: eski.id, no: 'ESKI', tutar: 50, duzenlenebilir: true })]);
  const ithal = await makineOlustur({ listType: 'import', kalem: { tutarParaBirimi: 'EUR', malBedeliTl: 350 } });
  const yol = makineYolu(ithal.faturalar[0].id);
  const degisiklik = await request(sunucu).patch(yol).send({ rowId: 'I1', tutar: 125.5, malBedeliTl: 500.25, tutarParaBirimi: 'TRY' }).expect(200);
  expect(degisiklik.body.data).toMatchObject({ faturaTutarToplamlari: { EUR: 125.5, TRY: 500.25 } });
  expect(degisiklik.body.data.kalemler[0]).toMatchObject({ tutarParaBirimi: 'EUR', malBedeliTl: 500.25 });
});

test('doğrulama hataları, silme isteği ve süresi kapatılan bağlantı kalemleri değiştirmez', async () => {
  const proc = await makineOlustur();
  const id = proc.faturalar[0].id;
  const endpoint = makineYolu(id);
  for (const degisiklik of [{ tutar: 0 }, { tutar: true }, { tutar: 'abc' }, { adet: -1 }, { tarih: '2025-02-30' }, { no: '' }, { yevmiyeNo: 7 }, { kaynak: 'firma' }]) {
    await request(sunucu).patch(endpoint).send({ rowId: 'Y1', ...degisiklik }).expect(400);
  }
  await request(sunucu).delete(endpoint).send({ rowId: 'Y1' }).expect(404);
  const gider = await HarcamaKalemi.create({ tesvikModel: 'Tesvik', tesvikId: belgeId, ...temel, kategori: 'arazi', altKategori: 'arazi' });
  await request(sunucu).delete(harcamaYolu(gider.id)).expect(404);
  await portal.linkKapat('Tesvik', belgeId);
  for (const adres of [endpoint, harcamaYolu(gider.id)]) {
    const yanit = await request(sunucu).patch(adres).send({ rowId: 'Y1', tutar: 999 }).expect(404);
    expect(yanit.body).not.toHaveProperty('data');
  }
  expect((await MachineProcess.findById(proc._id)).faturalar[0].tutar).toBe(100);
  expect((await HarcamaKalemi.findById(gider._id)).tutar).toBe(100);
});

test('makine güncellemesindeki eşzamanlı retry bağlantı yetkisini yeniden kontrol eder', async () => {
  const proc = await makineOlustur();
  jest.spyOn(MachineProcess, 'findOneAndUpdate').mockImplementationOnce(async () => {
    await portal.linkKapat('Tesvik', belgeId);
    return null;
  });
  await request(sunucu).patch(makineYolu(proc.faturalar[0].id)).send({ rowId: 'Y1', tutar: 999 }).expect(404);
  expect((await MachineProcess.findById(proc._id)).faturalar[0].tutar).toBe(100);
});

test('harcama okunduktan sonra kapatılan bağlantı yazımdan önce yeniden denetlenir', async () => {
  const gider = await HarcamaKalemi.create({ tesvikModel: 'Tesvik', tesvikId: belgeId, ...temel, kategori: 'arazi', altKategori: 'arazi' });
  const findOne = HarcamaKalemi.findOne.bind(HarcamaKalemi);
  jest.spyOn(HarcamaKalemi, 'findOne').mockImplementationOnce((filtre) => ({
    select: async (alanlar) => {
      const mevcut = await findOne(filtre).select(alanlar);
      await portal.linkKapat('Tesvik', belgeId);
      return mevcut;
    }
  }));
  await request(sunucu).patch(harcamaYolu(gider.id)).send({ tutar: 999 }).expect(404);
  expect((await HarcamaKalemi.findById(gider._id)).tutar).toBe(100);
});
