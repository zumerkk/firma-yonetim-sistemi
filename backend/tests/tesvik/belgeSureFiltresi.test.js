// 🧪 Teşvik listesi — "belge bitiş tarihi geçenler" ve süre uzatım hakkı süzgeci
//
// Müşteri (21.09.2026): "süresi dolan belgeleri listeleyip, kendi içinde 'süre uzatım hakkı var mı, yok
// mu?' diye filtreleyebilmek. (Süre uzatım tarihi belge bitiş tarihinden sonraysa hakkını zaten
// kullanmıştır, yani hakkı yoktur.)" Koşullar gerçek Mongo'da ($expr) sınanıyor.

const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const { sureFiltresi, sureFiltresiEkle, bugunBaslangici } = require('../../utils/belgeSureFiltresi');

jest.setTimeout(60000);

const simdi = new Date('2026-09-21T10:00:00.000Z'); // İstanbul 21.09.2026 13:00
const g = (s) => new Date(`${s}T00:00:00.000Z`);

const belgeler = [
  { _id: 'hakkiVar', belgeYonetimi: { belgeBitisTarihi: g('2026-03-01'), uzatimTarihi: g('2026-03-01') } }, // uzatım = bitiş
  { _id: 'uzatimBos', belgeYonetimi: { belgeBitisTarihi: g('2026-03-01') } },
  { _id: 'hakkiYok', belgeYonetimi: { belgeBitisTarihi: g('2025-12-31'), uzatimTarihi: g('2027-12-31') } }, // uzatıldı
  { _id: 'bugunBitiyor', belgeYonetimi: { belgeBitisTarihi: g('2026-09-21'), uzatimTarihi: g('2026-09-21') } },
  { _id: 'dunBitti', belgeYonetimi: { belgeBitisTarihi: g('2026-09-20'), uzatimTarihi: g('2026-09-20') } },
  { _id: 'suresiVar', belgeYonetimi: { belgeBitisTarihi: g('2028-01-01'), uzatimTarihi: g('2028-01-01') } },
  { _id: 'bitisYok', belgeYonetimi: {} }
];

let mem;
let koleksiyon;
beforeAll(async () => {
  mem = await MongoMemoryServer.create();
  await mongoose.connect(mem.getUri());
  koleksiyon = mongoose.connection.db.collection('sure_testi');
  await koleksiyon.insertMany(belgeler);
});
afterAll(async () => {
  await mongoose.disconnect();
  if (mem) await mem.stop();
});

const bul = async (durum) => (await koleksiyon.find(sureFiltresi(durum, simdi)).toArray()).map((b) => b._id).sort();

test('bitiş tarihi geçenler: bugün biten dahil değil, bitişi olmayan dahil değil', async () => {
  expect(await bul('gecen')).toEqual(['dunBitti', 'hakkiVar', 'hakkiYok', 'uzatimBos']);
});

test('hakkı var: uzatım tarihi bitişten sonra DEĞİL (eşit ya da boş)', async () => {
  expect(await bul('hakki_var')).toEqual(['dunBitti', 'hakkiVar', 'uzatimBos']);
});

test('hakkı yok: uzatım tarihi bitişten sonra (hak kullanılmış)', async () => {
  expect(await bul('hakki_yok')).toEqual(['hakkiYok']);
});

test('tanımsız değer süzgeç eklemez; mevcut $or/$and korunur', () => {
  expect(sureFiltresi('', simdi)).toBeNull();
  expect(sureFiltresi('baska', simdi)).toBeNull();
  const sorgu = { aktif: true, $or: [{ a: 1 }] };
  sureFiltresiEkle(sorgu, 'gecen', simdi);
  expect(sorgu.$or).toEqual([{ a: 1 }]);
  expect(sorgu.$and).toHaveLength(1);
});

test('"bugün" İstanbul takvimine göre (gece yarısından sonra UTC hâlâ dünken)', () => {
  // İstanbul 21.09.2026 01:30 = UTC 20.09.2026 22:30
  expect(bugunBaslangici(new Date('2026-09-20T22:30:00.000Z')).toISOString()).toBe('2026-09-21T00:00:00.000Z');
});
