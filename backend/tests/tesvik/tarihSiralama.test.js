// 🧪 Teşvik listesi tarih sıralaması — boş tarihler sonda, sayfalar tutarlı.
//
// Müşteri (13.10.2026): "Teşvik listesini açınca otomatik olarak süre uzatım tarihi eskiden yeniye göre
// sıralı olarak gelebilirse çok iyi olur." Mongo artan sıralamada tarihsizleri başa koyuyordu.

const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const { sayfaliListe, siralamaCoz } = require('../../utils/tarihSiralama');

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
