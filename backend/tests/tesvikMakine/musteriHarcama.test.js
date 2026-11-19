const express = require('express');
const mongoose = require('mongoose');
const request = require('supertest');
const { MongoMemoryServer } = require('mongodb-memory-server');
const Tesvik = require('../../models/Tesvik');
const YeniTesvik = require('../../models/YeniTesvik');
const HarcamaKalemi = require('../../models/HarcamaKalemi');
const portal = require('../../services/musteriPortal/portalService');
const depo = require('../../services/tesvikMakine/faturaEvrakDeposu');
const harcama = require('../../services/tesvikMakine/harcamaService');
const router = require('../../routes/musteriPortal');

jest.setTimeout(60_000);

const app = express();
app.use(express.json());
app.use('/api/musteri-belge', router);
const belgeId = new mongoose.Types.ObjectId();
const personel = { _id: new mongoose.Types.ObjectId(), adSoyad: 'Özel Personel Adı' };
const belgeFiltresi = { tesvikModel: 'Tesvik', tesvikId: belgeId };
const veri = {
  kategori: 'arazi', altKategori: 'arazi', tarih: '2025-10-08', no: 'FT-1', icerik: 'Firma açıklaması',
  tutar: 125.25, adet: 2, giren: 'Firma Yetkilisi', istekId: 'firma-harcama-kaydi-1'
};
const pdf = Buffer.from('%PDF-1.4\nSentetik harcama\n%%EOF\n');
const xml = Buffer.from('<?xml version="1.0"?><Invoice><ID>TEST-1</ID></Invoice>');
const adres = (baglanti) => `/api/musteri-belge/${baglanti}/harcamalar`;

let mongo;
let sunucu;
let token;
let digerToken;

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
  await Promise.all([Tesvik.deleteMany({}), YeniTesvik.deleteMany({}), HarcamaKalemi.deleteMany({})]);
  await Promise.all([Tesvik.collection.insertOne({ _id: belgeId }), YeniTesvik.collection.insertOne({ _id: belgeId })]);
  const linkler = await Promise.all(['Tesvik', 'YeniTesvik'].map((model) => portal.linkUret(model, belgeId, {
    baslangicTarihi: '2000-01-01', bitisTarihi: '2099-12-31'
  })));
  [token, digerToken] = linkler.map(({ link }) => link.split('/belge/')[1]);
});

afterEach(() => jest.restoreAllMocks());

const kalemEkle = (baglanti, girdi = veri) => request(sunucu).post(adres(baglanti)).send(girdi);
const evrakYolu = (baglanti, id) => `${adres(baglanti)}/${id}/evrak`;
const ekYukle = (baglanti, id) => request(sunucu).post(evrakYolu(baglanti, id)).attach('faturaPdf', pdf, 'fatura.pdf');

test('firma kalemleri yalnız linkin belge modelinde oluşturulur ve personel alanları gizlenir', async () => {
  const staff = await harcama.ekle(belgeFiltresi, { ...veri, icerik: 'Özel personel açıklaması' }, personel);
  await HarcamaKalemi.collection.updateOne({ _id: staff._id }, { $unset: { kaynak: 1 }, $set: { evraklar: [{
    _id: new mongoose.Types.ObjectId(), dosyaAdi: 'ozel-personel.pdf', tur: 'fatura_pdf',
    depo: { provider: 'cloudinary', dosyaYolu: 'depo-kimligi' }
  }] } });
  const eklenen = await kalemEkle(token, { ...veri, tesvikModel: 'YeniTesvik', tesvikId: new mongoose.Types.ObjectId(),
    kaynak: 'personel', olusturanKullanici: personel._id, girenAdi: 'Sahte personel', evraklar: [{ tur: 'fatura_pdf' }] }).expect(200);
  expect(eklenen.body.data).toMatchObject({ kaynak: 'firma', girenAdi: veri.giren, icerik: veri.icerik, evraklar: [], evrakEklenebilir: true });
  const ayni = await kalemEkle(token).expect(200);
  expect(ayni.body.data._id).toBe(eklenen.body.data._id);
  await kalemEkle(token, { ...veri, giren: 'Farklı kişi' }).expect(409);
  const doc = await HarcamaKalemi.findById(ayni.body.data._id).lean();
  expect(doc).toMatchObject({ ...belgeFiltresi, kaynak: 'firma', girenAdi: veri.giren });
  expect(doc.olusturanKullanici).toBeUndefined();

  const yanit = await request(sunucu).get(adres(token)).expect('Cache-Control', 'private, no-store').expect(200);
  expect(Object.keys(yanit.body.data.kategoriler)).toEqual(expect.arrayContaining(['arazi', 'bina', 'diger']));
  expect(yanit.body.data.kalemler).toEqual(expect.arrayContaining([
    expect.objectContaining({ _id: String(staff._id), kaynak: 'personel', girenAdi: '', icerik: 'Özel personel açıklaması', evraklar: [], evrakEklenebilir: false, duzenlenebilir: true }),
    expect.objectContaining({ _id: ayni.body.data._id, kaynak: 'firma', girenAdi: veri.giren, icerik: veri.icerik, evrakEklenebilir: true })
  ]));
  expect(yanit.text).not.toMatch(/Özel Personel Adı|ozel-personel|depo-kimligi|tesvikId|tesvikModel|olusturanKullanici|sonGuncelleyen|istekOzeti|istekId/);
  expect((await request(sunucu).get(adres(digerToken)).expect(200)).body.data.kalemler).toEqual([]);
  expect((await kalemEkle(digerToken).expect(200)).body.data._id).not.toBe(ayni.body.data._id);

  await kalemEkle(token, { ...veri, giren: '' }).expect(400);
  await kalemEkle(token, { ...veri, altKategori: 'anaBina' }).expect(400);
  await kalemEkle('gecersiz', veri).expect(404);
  await request(sunucu).patch(`${adres(token)}/${ayni.body.data._id}`).send({ tutar: 200 }).expect(200);
  await request(sunucu).delete(`${adres(token)}/${ayni.body.data._id}`).expect(404);
  const guncel = await harcama.guncelle({ ...belgeFiltresi, _id: ayni.body.data._id }, { tutar: 200, kaynak: 'personel' }, personel);
  expect(guncel).toMatchObject({ kaynak: 'firma', tutar: 200, sonGuncelleyen: personel._id });
  const ozet = await request(sunucu).get(`/api/musteri-belge/${token}/gerceklesme`).expect(200);
  expect(ozet.body.data.toplam).toBe(325.25);
  expect(ozet.body.data.kalemler.map(({ tutar, icerik }) => ({ tutar, icerik }))).toEqual([
    { tutar: 125.25, icerik: 'Özel personel açıklaması' }, { tutar: 200, icerik: veri.icerik }
  ]);
});

test('firma sadece aynı belgedeki firma kalemine üç türden birden fazla dosya yükleyebilir', async () => {
  const sahteKaydet = jest.spyOn(depo, 'kaydet').mockImplementation(async () => ({ provider: 'cloudinary', dosyaYolu: 'ozel-depo.pdf' }));
  const { _id } = (await kalemEkle(token).expect(200)).body.data;
  const staff = await harcama.ekle(belgeFiltresi, veri, personel);
  await ekYukle(token, staff._id).expect(404);
  await ekYukle(digerToken, _id).expect(404);
  await ekYukle('gecersiz', _id).expect(404);
  await request(sunucu).post(evrakYolu(token, _id)).attach('beyannamePdf', pdf, 'beyanname.pdf').expect(400);
  expect(sahteKaydet).not.toHaveBeenCalled();

  const yukle = () => request(sunucu).post(evrakYolu(token, _id)).field('istekId', 'firma-harcama-evrak-1')
    .attach('faturaPdf', pdf, 'fatura-1.pdf').attach('faturaPdf', pdf, 'fatura-2.pdf')
    .attach('faturaXml', xml, { filename: 'fatura-1.xml', contentType: 'application/xml' })
    .attach('faturaXml', xml, { filename: 'fatura-2.xml', contentType: 'application/xml' })
    .attach('yevmiyePdf', pdf, 'yevmiye-1.pdf').attach('yevmiyePdf', pdf, 'yevmiye-2.pdf');
  const yanit = await yukle().expect(200);
  const ekler = yanit.body.data.evraklar;
  expect(ekler.map((ek) => ek.tur)).toEqual(['fatura_pdf', 'fatura_pdf', 'fatura_xml', 'fatura_xml', 'yevmiye_pdf', 'yevmiye_pdf']);
  expect(yanit.text).not.toMatch(/ozel-depo|cloudinary|istekOzeti|istekId|sonGuncelleyen/);
  expect((await yukle().expect(200)).body.data.evraklar).toEqual(ekler);
  expect(sahteKaydet).toHaveBeenCalledTimes(6);
  await request(sunucu).get(`${evrakYolu(token, _id)}/${ekler[0]._id}`).expect(404);

  const yeni = await portal.linkUret('Tesvik', belgeId, { yenile: true });
  const yeniToken = yeni.link.split('/belge/')[1];
  await request(sunucu).get(adres(token)).expect(404);
  await kalemEkle(token).expect(404);
  await ekYukle(token, _id).expect(404);
  expect((await ekYukle(yeniToken, _id).expect(200)).body.data.evraklar).toHaveLength(7);
});

test('dosya kaydedilirken kapatılan firma bağlantısı eki kaleme işlemez ve depo kopyasını siler', async () => {
  const { _id } = (await kalemEkle(token).expect(200)).body.data;
  const depoKaydi = { provider: 'cloudinary', dosyaYolu: 'kapatilan-firma-ek.pdf' };
  jest.spyOn(depo, 'kaydet').mockImplementationOnce(async () => {
    await portal.linkKapat('Tesvik', belgeId);
    return depoKaydi;
  });
  const temizle = jest.spyOn(depo, 'sil').mockResolvedValue();
  await ekYukle(token, _id).expect(404);
  expect(temizle).toHaveBeenCalledWith(depoKaydi);
  expect((await HarcamaKalemi.findById(_id)).evraklar).toHaveLength(0);
});

test('müşteri harcamaya yevmiye tarihi ve başında sıfır olan numara girebilir', async () => {
  const staff = await harcama.ekle(belgeFiltresi, {
    ...veri, no: 'PERSONEL', icerik: 'Gizli açıklama', yevmiyeNo: '00017', yevmiyeTarihi: '2025-10-10'
  }, personel);
  const create = { ...veri, yevmiyeNo: '00018', yevmiyeTarihi: '2025-10-11' };
  const ilk = await kalemEkle(token, create).expect(200);
  expect(ilk.body.data).toMatchObject({ yevmiyeNo: '00018', yevmiyeTarihi: '2025-10-11T00:00:00.000Z' });
  await kalemEkle(token, { ...create, yevmiyeNo: 18 }).expect(400);
  await kalemEkle(token, { ...create, yevmiyeTarihi: '2025-10-32' }).expect(400);
  await kalemEkle(token, { ...create, yevmiyeNo: '00019' }).expect(409);
  const liste = (await request(sunucu).get(adres(token)).expect(200)).body.data.kalemler;
  expect(liste).toEqual(expect.arrayContaining([
    expect.objectContaining({ _id: String(staff._id), icerik: 'Gizli açıklama', girenAdi: '', yevmiyeNo: '00017', yevmiyeTarihi: '2025-10-10T00:00:00.000Z' }),
    expect.objectContaining({ _id: ilk.body.data._id, yevmiyeNo: '00018', yevmiyeTarihi: '2025-10-11T00:00:00.000Z' })
  ]));
});
