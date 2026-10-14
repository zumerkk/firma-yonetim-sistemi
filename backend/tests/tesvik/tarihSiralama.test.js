// 🧪 Teşvik listesi tarih sıralaması — boş tarihler sonda, sayfalar tutarlı.
//
// Müşteri (13.10.2026): "Teşvik listesini açınca otomatik olarak süre uzatım tarihi eskiden yeniye göre
// sıralı olarak gelebilirse çok iyi olur." Mongo artan sıralamada tarihsizleri başa koyuyordu.

const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const { sayfaliListe, siralamaCoz, kayitlariSirala } = require('../../utils/tarihSiralama');

jest.setTimeout(60000);

const g = (s) => new Date(`${s}T00:00:00.000Z`);
const Belge = mongoose.model('SiralamaBelge', new mongoose.Schema({
  ad: String,
  firma: mongoose.Schema.Types.ObjectId,
  belgeYonetimi: { uzatimTarihi: Date }
}, { collection: 'siralama_belge' }));

const firmaA = new mongoose.Types.ObjectId();
let mem;
beforeAll(async () => {
  mem = await MongoMemoryServer.create();
  await mongoose.connect(mem.getUri());
  await Belge.insertMany([
    { ad: 'bos1', firma: firmaA, belgeYonetimi: {} },
    { ad: '2027', firma: firmaA, belgeYonetimi: { uzatimTarihi: g('2027-05-17') } },
    { ad: '2025', firma: firmaA, belgeYonetimi: { uzatimTarihi: g('2025-01-10') } },
    { ad: 'bos2', belgeYonetimi: { uzatimTarihi: null } },
    { ad: '2026', firma: firmaA, belgeYonetimi: { uzatimTarihi: g('2026-10-13') } }
  ]);
});
afterAll(async () => {
  await mongoose.disconnect();
  if (mem) await mem.stop();
});

const adlar = (l) => l.map((b) => b.ad);
const liste = (filtre, alan, yon, skip = 0, limit = 10) => sayfaliListe(Belge, filtre, { alan, yon, skip, limit });

test('süre uzatım artan: eskiden yeniye, tarihsizler sonda', async () => {
  const { alan, yon } = siralamaCoz('belgeYonetimi.uzatimTarihi', 'asc');
  expect(adlar(await liste({}, alan, yon)).slice(0, 3)).toEqual(['2025', '2026', '2027']);
  expect(adlar(await liste({}, alan, yon)).slice(3).sort()).toEqual(['bos1', 'bos2']);
});

test('azalan yönde de tarihsizler sonda', async () => {
  const { alan, yon } = siralamaCoz('belgeYonetimi.uzatimTarihi', 'desc');
  expect(adlar(await liste({}, alan, yon)).slice(0, 3)).toEqual(['2027', '2026', '2025']);
});

test('sayfalar çakışmaz, hepsi bir kez gelir', async () => {
  const { alan, yon } = siralamaCoz('belgeYonetimi.uzatimTarihi', 'asc');
  const s1 = adlar(await liste({}, alan, yon, 0, 2));
  const s2 = adlar(await liste({}, alan, yon, 2, 2));
  const s3 = adlar(await liste({}, alan, yon, 4, 2));
  expect([...s1, ...s2, ...s3].sort()).toEqual(['2025', '2026', '2027', 'bos1', 'bos2']);
  expect(s1).toEqual(['2025', '2026']);
});

test('metin gelen firma kimliği aggregate içinde ObjectId\'ye çevrilir', async () => {
  const { alan, yon } = siralamaCoz('belgeYonetimi.uzatimTarihi', 'asc');
  expect(adlar(await liste({ firma: String(firmaA) }, alan, yon))).toEqual(['2025', '2026', '2027', 'bos1']);
});

test('bilinmeyen alan Mongo\'ya gitmez, createdAt\'e düşer', () => {
  expect(siralamaCoz('$where', 'asc')).toEqual({ alan: 'createdAt', yon: 1 });
});

test('birleşik eski/yeni arama seçilen tarihe göre sıralanır, boşlar her iki yönde sonda', () => {
  const liste = [
    { _id: '1', ad: 'eski', belgeYonetimi: { uzatimTarihi: '2027-01-01' } },
    { _id: '2', ad: 'bos', belgeYonetimi: {} },
    { _id: '3', ad: 'yeni', belgeYonetimi: { uzatimTarihi: '2026-01-01' } }
  ];
  const alan = 'belgeYonetimi.uzatimTarihi';
  expect(adlar(kayitlariSirala(liste, { alan, yon: 1 }))).toEqual(['yeni', 'eski', 'bos']);
  expect(adlar(kayitlariSirala(liste, { alan, yon: -1 }))).toEqual(['eski', 'yeni', 'bos']);
  expect(liste.map((x) => x.ad)).toEqual(['eski', 'bos', 'yeni']);
});

test('birleşik arama uçtan uca iki sistemde tarih sırasını limitten önce uygular', async () => {
  require('../../models/User');
  const Tesvik = require('../../models/Tesvik');
  const YeniTesvik = require('../../models/YeniTesvik');
  const { birlesikFirmaArama } = require('../../controllers/tesvikController');
  const kayit = (tesvikId, tarih) => ({
    tesvikId, aktif: true, yatirimciUnvan: 'SIRALAMA ORTAK',
    belgeYonetimi: tarih ? { uzatimTarihi: g(tarih) } : {}, createdAt: g('2026-01-01')
  });
  await Tesvik.collection.insertMany([kayit('ESKI-GEC', '2028-01-01'), kayit('ESKI-YAKIN', '2026-01-01'), kayit('ESKI-BOS')]);
  await YeniTesvik.collection.insertMany([kayit('YENI-YAKIN', '2027-01-01'), kayit('YENI-BOS')]);
  const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
  await birlesikFirmaArama({ query: { q: 'SIRALAMA', limit: '1', siraBy: 'belgeYonetimi.uzatimTarihi', siraSekli: 'asc' } }, res);
  expect(res.status).not.toHaveBeenCalled();
  expect(res.json.mock.calls[0][0].data.tesvikler.map((b) => b.tesvikId)).toEqual(['ESKI-YAKIN', 'YENI-YAKIN']);
});
