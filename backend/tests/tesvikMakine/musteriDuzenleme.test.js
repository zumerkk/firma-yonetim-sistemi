const express = require('express');
const mongoose = require('mongoose');
const request = require('supertest');
const { MongoMemoryServer } = require('mongodb-memory-server');
const Tesvik = require('../../models/Tesvik');
const YeniTesvik = require('../../models/YeniTesvik');
const MachineProcess = require('../../models/MachineProcess');
const HarcamaKalemi = require('../../models/HarcamaKalemi');
const harcama = require('../../services/tesvikMakine/harcamaService');
const mps = require('../../services/tesvikMakine/machineProcessService');
const portal = require('../../services/musteriPortal/portalService');
const depo = require('../../services/tesvikMakine/faturaEvrakDeposu');
const router = require('../../routes/musteriPortal');

jest.setTimeout(60_000);
const app = express();
app.use(express.json());
app.use('/api/musteri-belge', router);
const personel = { _id: new mongoose.Types.ObjectId(), adSoyad: 'Özel Personel' };
const belgeId = new mongoose.Types.ObjectId();
const tarihler = { baslangicTarihi: '2000-01-01', bitisTarihi: '2099-12-31' };
const belge = { tesvikModel: 'Tesvik', tesvikId: belgeId };
const veri = { kategori: 'diger', altKategori: 'etutProje', tarih: '2026-11-17', no: 'FT-1', icerik: 'Danışmanlık', tutar: 100, adet: 1 };
const pdf = Buffer.from('%PDF-1.4\nSentetik evrak\n%%EOF\n');
let mongo;
let token;
let digerToken;
const yol = (baglanti = token) => `/api/musteri-belge/${baglanti}`;

beforeAll(async () => {
  mongo = await MongoMemoryServer.create();
  await mongoose.connect(mongo.getUri());
});
afterAll(async () => {
  await mongoose.disconnect();
  if (mongo) await mongo.stop();
});
beforeEach(async () => {
  await Promise.all([Tesvik.deleteMany({}), YeniTesvik.deleteMany({}), MachineProcess.deleteMany({}), HarcamaKalemi.deleteMany({})]);
  const makineListeleri = {
    yerli: [{ rowId: 'Y1', siraNo: 1, adiVeOzelligi: 'YERLİ MAKİNE' }],
    ithal: [{ rowId: 'I1', siraNo: 1, adiVeOzelligi: 'İTHAL MAKİNE', gumrukDovizKodu: 'EUR' }]
  };
  await Promise.all([Tesvik, YeniTesvik].map((Model) => Model.collection.insertOne({ _id: belgeId, makineListeleri })));
  [token, digerToken] = (await Promise.all(['Tesvik', 'YeniTesvik'].map((model) => portal.linkUret(model, belgeId, tarihler))))
    .map(({ link }) => link.split('/belge/')[1]);
  jest.spyOn(depo, 'kaydet').mockResolvedValue({ provider: 'local', dosyaYolu: 'sentetik-depo.pdf' });
  jest.spyOn(depo, 'oku').mockResolvedValue(pdf);
  jest.spyOn(depo, 'sil').mockResolvedValue();
});
afterEach(() => jest.restoreAllMocks());

test.each([['diger', 'etutProje'], ['bina', 'anaBina'], ['arazi', 'arazi']])(
  'firma %s grubunda personel ve firma kalemlerini düzenler; farklı belge modeli erişemez', async (kategori, altKategori) => {
    const staff = await harcama.ekle(belge, { ...veri, kategori, altKategori }, personel);
    const firma = (await request(app).post(`${yol()}/harcamalar`).send({ ...veri, kategori, altKategori, giren: 'Firma' }).expect(200)).body.data;
    for (const kayit of [staff, firma]) {
      const adres = `${yol()}/harcamalar/${kayit._id}`;
      await request(app).patch(`${yol(digerToken)}/harcamalar/${kayit._id}`).send({ tutar: 999 }).expect(404);
      await request(app).delete(`${yol(digerToken)}/harcamalar/${kayit._id}`).expect(404);
      const sonuc = await request(app).patch(adres).send({
        tutar: 250.75, adet: 2, no: 'FT-DUZELTILDI', icerik: 'Yeni açıklama',
        yevmiyeNo: '00042', yevmiyeTarihi: '2026-11-18',
        tesvikModel: 'YeniTesvik', tesvikId: new mongoose.Types.ObjectId(), kaynak: 'firma', olusturanKullanici: personel._id
      }).expect(200);
      expect(sonuc.body.data).toMatchObject({ tutar: 250.75, adet: 2, no: 'FT-DUZELTILDI', icerik: 'Yeni açıklama', yevmiyeNo: '00042', yevmiyeTarihi: '2026-11-18T00:00:00.000Z' });
      expect(await HarcamaKalemi.findById(kayit._id)).toMatchObject({ ...belge, kaynak: kayit.kaynak });
      await request(app).patch(adres).send({ tutar: -5 }).expect(400);
      await request(app).patch(adres).send({ yevmiyeTarihi: '2026-02-30' }).expect(400);
    }
    expect((await request(app).get(`${yol()}/gerceklesme`).expect(200)).body.data.toplam).toBe(501.5);
    await request(app).delete(`${yol()}/harcamalar/${staff._id}`).expect(200);
    expect((await request(app).get(`${yol()}/gerceklesme`).expect(200)).body.data.toplam).toBe(250.75);
  }
);

test('firma personelin harcama ekini indirir ve değiştirir; belge ve kalem bağı korunur', async () => {
  const staff = await harcama.ekle(belge, veri, personel);
  const adres = `${yol()}/harcamalar/${staff._id}/evrak`;
  const yuklenen = await request(app).post(adres).attach('faturaPdf', pdf, 'fatura.pdf').expect(200);
  const evrakId = yuklenen.body.data.evraklar[0]._id;
  expect(yuklenen.text).not.toMatch(/sentetik-depo|olusturanKullanici|Özel Personel/);
  const indir = await request(app).get(`${adres}/${evrakId}`).expect('Cache-Control', 'private, no-store').expect(200);
  expect(indir.headers['content-type']).toBe('application/pdf');
  expect(indir.body).toEqual(pdf);
  for (const method of ['get', 'delete']) {
    await request(app)[method](`${yol(digerToken)}/harcamalar/${staff._id}/evrak/${evrakId}`).expect(404);
  }
  const silinen = await request(app).delete(`${adres}/${evrakId}`).expect(200);
  expect(silinen.body.data.evraklar).toEqual([]);
  expect(depo.sil).toHaveBeenCalledWith({ provider: 'local', dosyaYolu: 'sentetik-depo.pdf' });
  await request(app).get(`${adres}/${evrakId}`).expect(404);
});

test.each([['local', 'yerli', 'Y1'], ['import', 'ithal', 'I1']])(
  'firma %s personel ve müşteri kalemlerini düzeltir; gerçekleşen toplamı günceller', async (listType, liste, rowId) => {
    const proc = await mps.ensureProcess({ ...belge, listType, rowId });
    await mps.faturaKalemiEkle(proc, { tarih: '2026-11-17', no: 'PERSONEL', tutar: 100, adet: 1 }, { user: personel });
    const firma = await portal.firmaKalemiEkle(token, { listType, rowId, tarih: '2026-11-17', no: 'FIRMA', tutar: 100, tutarParaBirimi: 'TRY', giren: 'Firma' });
    const hedef = { rowId, listType };
    for (const kalem of firma.kalemler) {
      const adres = `${yol()}/fatura-kalemi/${kalem._id}`;
      await request(app).patch(`${yol(digerToken)}/fatura-kalemi/${kalem._id}`).send({ ...hedef, tutar: 999 }).expect(404);
      await request(app).patch(adres).send({ ...hedef, rowId: 'BASKA-SATIR', tutar: 999 }).expect(404);
      await request(app).patch(adres).send({ ...hedef, tutar: 'NaN' }).expect(400);
      const yanit = await request(app).patch(adres).send({ ...hedef, tutar: 225.5, adet: 2, no: 'DUZELTILDI',
        yevmiyeNo: '00051', yevmiyeTarihi: '2026-11-18', kaynak: 'firma', girenAdi: 'SAHTE' }).expect(200);
      expect(yanit.body.data.kalemler.find((k) => k._id === String(kalem._id))).toMatchObject({
        tutar: 225.5, adet: 2, yevmiyeNo: '00051', yevmiyeTarihi: '2026-11-18T00:00:00.000Z', kaynak: kalem.kaynak, girenAdi: kalem.girenAdi
      });
    }
    const guncel = await Tesvik.findById(belgeId).lean();
    expect(guncel.makineListeleri[liste][0]).toMatchObject({ gerceklesenTutar: 451, gerceklesenAdet: 4 });
    await request(app).delete(`${yol()}/fatura-kalemi/${firma.kalemler[0]._id}`).send(hedef).expect(200);
    const son = await request(app).get(yol()).expect(200);
    expect(son.body.data.makineler[liste][0]).toMatchObject({ faturaToplami: 225.5, faturaAdedi: 2 });
  }
);

test('firma personelin makine kaleminin eklerini yönetir; link kapatıldığında bütün yazımlar kapanır', async () => {
  const hedef = { listType: 'local', rowId: 'Y1' };
  const proc = await mps.ensureProcess({ ...belge, ...hedef });
  await mps.faturaKalemiEkle(proc, { tarih: '2026-11-17', no: 'PERSONEL', tutar: 100 }, { user: personel });
  const kalemId = proc.faturalar[0].id;
  const adres = `${yol()}/fatura-kalemi/${kalemId}/evrak`;
  const yuklenen = await request(app).post(adres).field('rowId', 'Y1').attach('faturaPdf', pdf, 'fatura.pdf').expect(200);
  const evrakId = yuklenen.body.data.kalemler[0].evraklar[0]._id;
  await request(app).get(`${adres}/${evrakId}`).query(hedef).expect(200);
  await request(app).delete(`${adres}/${evrakId}`).query({ rowId: 'BASKA' }).expect(404);
  await request(app).delete(`${adres}/${evrakId}`).query(hedef).expect(200);
  expect((await MachineProcess.findById(proc._id)).faturalar[0].evraklar).toHaveLength(0);
  await portal.linkKapat('Tesvik', belgeId);
  await request(app).patch(`${yol()}/fatura-kalemi/${kalemId}`).send({ ...hedef, tutar: 5 }).expect(404);
  await request(app).delete(`${yol()}/fatura-kalemi/${kalemId}`).send(hedef).expect(404);
});

test('önceki özet fatura kaydı müşteri bağlantısından düzeltilebilir', async () => {
  const hedef = { listType: 'local', rowId: 'Y1' };
  const proc = await mps.ensureProcess({ ...belge, ...hedef });
  await MachineProcess.updateOne({ _id: proc._id }, { $set: { invoiceNo: 'ESKI', invoiceRealizedValue: 50, invoiceDate: new Date('2026-11-17') } });
  const yanit = await request(app).patch(`${yol()}/fatura-kalemi/${proc.id}`).send({ ...hedef, tutar: 75 }).expect(200);
  expect(yanit.body.data.kalemler).toEqual([expect.objectContaining({ _id: proc.id, no: 'ESKI', tutar: 75 })]);
});

test('aynı modeldeki başka belgenin kalemleri ve dosyaları erişilemez', async () => {
  const baskaId = new mongoose.Types.ObjectId();
  await Tesvik.collection.insertOne({ _id: baskaId, makineListeleri: { yerli: [{ rowId: 'Y1' }] } });
  const baskaToken = (await portal.linkUret('Tesvik', baskaId, tarihler)).link.split('/belge/')[1];
  const baskaBelge = { tesvikModel: 'Tesvik', tesvikId: baskaId };
  const harcamaKalemi = await harcama.ekle(baskaBelge, veri, personel);
  const proc = await mps.ensureProcess({ ...baskaBelge, listType: 'local', rowId: 'Y1' });
  await mps.faturaKalemiEkle(proc, { no: 'BASKA', tutar: 100 }, { user: personel });
  const kalemId = proc.faturalar[0].id;
  const ek = (await request(app).post(`${yol(baskaToken)}/harcamalar/${harcamaKalemi.id}/evrak`)
    .attach('faturaPdf', pdf, 'fatura.pdf').expect(200)).body.data.evraklar[0];
  const makineEki = (await request(app).post(`${yol(baskaToken)}/fatura-kalemi/${kalemId}/evrak`)
    .field('rowId', 'Y1').attach('faturaPdf', pdf, 'fatura.pdf').expect(200)).body.data.kalemler[0].evraklar[0];
  for (const method of ['patch', 'delete']) {
    await request(app)[method](`${yol()}/harcamalar/${harcamaKalemi.id}`).send({ tutar: 999 }).expect(404);
    await request(app)[method](`${yol()}/fatura-kalemi/${kalemId}`).send({ rowId: 'Y1', tutar: 999 }).expect(404);
  }
  for (const method of ['get', 'delete']) {
    await request(app)[method](`${yol()}/harcamalar/${harcamaKalemi.id}/evrak/${ek._id}`).expect(404);
    await request(app)[method](`${yol()}/fatura-kalemi/${kalemId}/evrak/${makineEki._id}`).query({ rowId: 'Y1' }).expect(404);
  }
  expect((await HarcamaKalemi.findById(harcamaKalemi.id)).tutar).toBe(100);
  expect((await MachineProcess.findById(proc.id)).faturalar[0].tutar).toBe(100);
  expect(depo.oku).not.toHaveBeenCalled();
  expect(depo.sil).not.toHaveBeenCalled();
});
