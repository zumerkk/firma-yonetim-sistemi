// 🧪 Müşteri görünümü — silinen makineler
// Müşteri (07.10.2026): "silinenleri pdf çıktısından komple kaldırmak yerine kırmızı yazıyla 'Silindi'"
// Müşteri (09.10.2026): "Komple bütün revizyonları gösteriyor ... Sadece en son işlemde silinen makineler
// varsa onları ve silinme tarihlerini göstermesi yeterli."

const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const Tesvik = require('../../models/Tesvik');
const YeniTesvik = require('../../models/YeniTesvik');
const MakineRevizyonKaydi = require('../../models/MakineRevizyonKaydi');
const { silinenMakineleriBul, esasKayitIndeksi, silinenlerUcu } = require('../../services/tesvikMakine/silinenMakineler');

const m = (rowId, siraNo, adiVeOzelligi, ek = {}) => ({ rowId, siraNo, adiVeOzelligi, miktar: 1, ...ek });
const kayit = (revizeTuru, revizeTarihi, yerli = [], ithal = []) => ({ revizeTuru, revizeTarihi, yerli, ithal });
const adlar = (l) => l.map((r) => r.adiVeOzelligi);

describe('esas kayıt: son tamamlanan revizyonun başı', () => {
  test.each([
    ['s f', ['start', 'final'], 0],
    ['s f s f', ['start', 'final', 'start', 'final'], 2],
    ['s f s (süren / vazgeçilen)', ['start', 'final', 'start'], 0],
    ['s s f (vazgeçilen sonra yeni)', ['start', 'start', 'final'], 1],
    ['yalnız s', ['start'], 0],
    ['s f revert', ['start', 'final', 'revert'], 1],
    ['geçmiş yok', [], -1]
  ])('%s', (_ad, turler, beklenen) => {
    expect(esasKayitIndeksi(turler.map((t) => ({ revizeTuru: t })))).toBe(beklenen);
  });
});

describe('silinen makineleri bulma (saf)', () => {
  test('ESKİ revizyonlarda silinenler artık gelmez; yalnız son revizyonda silinen + silinme tarihi', () => {
    const gecmis = [
      kayit('start', '2026-08-01', [m('a', 1, 'PRES'), m('x', 2, 'ESKİ TORNA')]),
      kayit('final', '2026-08-02', [m('a', 1, 'PRES')]), // ESKİ TORNA ağustosta silindi
      kayit('start', '2026-10-09T08:00', [m('a', 1, 'PRES'), m('b', 2, 'FREZE', { miktar: 3 })]),
      kayit('final', '2026-10-09T08:05', [m('a', 1, 'PRES')]) // FREZE son revizyonda silindi
    ];
    const s = silinenMakineleriBul({ yerli: [m('a', 1, 'PRES')] }, gecmis);
    expect(adlar(s.yerli)).toEqual(['FREZE']);
    expect(s.yerli[0]).toMatchObject({ miktar: 3, silinmeTarihi: '2026-10-09T08:05' });
    expect(s.ithal).toEqual([]);
  });

  test('revizyonda eklenip aynı revizyonda silinen makine görünmez', () => {
    const gecmis = [
      kayit('start', '2026-10-09T08:00', [m('a', 1, 'PRES')]),
      kayit('final', '2026-10-09T08:05', [m('a', 1, 'PRES')]) // YANLIŞLIKLA EKLENEN arada eklendi/silindi
    ];
    expect(silinenMakineleriBul({ yerli: [m('a', 1, 'PRES')] }, gecmis).yerli).toEqual([]);
  });

  test('süren revizyonda silinen (henüz bitirilmemiş) tarihsiz gelir', () => {
    const gecmis = [kayit('start', '2026-10-09', [m('a', 1, 'PRES'), m('b', 2, 'FREZE')])];
    expect(silinenMakineleriBul({ yerli: [m('a', 1, 'PRES')] }, gecmis).yerli)
      .toEqual([expect.objectContaining({ adiVeOzelligi: 'FREZE', silinmeTarihi: null })]);
  });

  test('kimliği yeniden üretilmiş makine silinmiş SAYILMAZ (canlıdaki tuzak)', () => {
    const gecmis = [kayit('start', '2026-10-01', [m('eski-1', 1, 'Kompresör  Vidalı'), m('eski-2', 2, 'FORKLİFT', { makineId: 'M-77' })]),
      kayit('final', '2026-10-02', [m('yeni-1', 1, 'kompresör vidalı'), m('yeni-2', 2, 'FORKLİFT (elektrikli)', { makineId: 'M-77' })])];
    const guncel = { yerli: [m('yeni-1', 1, 'kompresör vidalı'), m('yeni-2', 2, 'FORKLİFT (elektrikli)', { makineId: 'M-77' })] };
    expect(silinenMakineleriBul(guncel, gecmis).yerli).toEqual([]);
  });

  test('ithalde GTİP de eşleşmeye girer; sıra no ile dizilir', () => {
    const gecmis = [kayit('start', '2026-10-01', [], [m('x', 5, 'CNC', { gtipKodu: '845710' }), m('y', 2, 'CNC', { gtipKodu: '845890' }), m('z', 3, 'ROBOT')]),
      kayit('final', '2026-10-02', [], [m('q', 1, 'CNC', { gtipKodu: '845710' })])];
    expect(silinenMakineleriBul({ ithal: [m('q', 1, 'CNC', { gtipKodu: '845710' })] }, gecmis).ithal
      .map((r) => [r.siraNo, r.gtipKodu || '', r.silinmeTarihi])).toEqual([[2, '845890', '2026-10-02'], [3, '', '2026-10-02']]);
  });

  test('geçmiş yoksa ya da adsız boş satırsa hiçbir şey dönmez', () => {
    expect(silinenMakineleriBul({ yerli: [m('a', 1, 'PRES')] }, [])).toEqual({ yerli: [], ithal: [] });
    expect(silinenMakineleriBul({ yerli: [] }, [kayit('start', 'x', [m('b', 1, '  ')])]).yerli).toEqual([]);
  });
});

describe('uç: iki depo türünden de okur', () => {
  jest.setTimeout(60000);
  let mem;
  const user = new mongoose.Types.ObjectId();
  beforeAll(async () => { mem = await MongoMemoryServer.create(); await mongoose.connect(mem.getUri()); });
  afterAll(async () => { await mongoose.disconnect(); if (mem) await mem.stop(); });

  const cagir = async (Model, id) => {
    const res = { statusCode: 200, status(c) { this.statusCode = c; return this; }, json(d) { this.body = d; return this; } };
    await silinenlerUcu(Model)({ params: { id: String(id) } }, res);
    return res;
  };
  const snap = (revizeId, revizeTuru, tarih, yerli) => ({ revizeId, revizeTuru, revizeTarihi: new Date(tarih), yapanKullanici: user, yerli, ithal: [] });

  test('ayrı depo (makinerevizyonkaydis): yalnız son revizyon, tarihiyle', async () => {
    const _id = new mongoose.Types.ObjectId();
    await Tesvik.collection.insertOne({ _id, makineRevizyonDeposu: 'ayri', makineListeleri: { yerli: [m('a', 1, 'PRES')], ithal: [] } });
    await MakineRevizyonKaydi.collection.insertMany([
      { tesvik: _id, tesvikModeli: 'Tesvik', sira: 0, snapshot: snap('r0', 'start', '2026-08-01', [m('a', 1, 'PRES'), m('x', 2, 'ESKİ TORNA')]) },
      { tesvik: _id, tesvikModeli: 'Tesvik', sira: 1, snapshot: snap('r1', 'final', '2026-08-02', [m('a', 1, 'PRES')]) },
      { tesvik: _id, tesvikModeli: 'Tesvik', sira: 2, snapshot: snap('r2', 'start', '2026-10-09T08:00:00Z', [m('a', 1, 'PRES'), m('b', 2, 'TORNA', { birimFiyatiTl: 500 })]) },
      { tesvik: _id, tesvikModeli: 'Tesvik', sira: 3, snapshot: snap('r3', 'final', '2026-10-09T08:05:00Z', [m('a', 1, 'PRES')]) },
      // Başka modelin aynı kimlikli kaydı karışmamalı
      { tesvik: _id, tesvikModeli: 'YeniTesvik', sira: 0, snapshot: snap('r0', 'start', '2026-10-01', [m('c', 3, 'BAŞKA')]) }
    ]);
    const r = await cagir(Tesvik, _id);
    expect(r.statusCode).toBe(200);
    expect(r.body.data.yerli).toEqual([expect.objectContaining({ adiVeOzelligi: 'TORNA', birimFiyatiTl: 500 })]);
    expect(new Date(r.body.data.yerli[0].silinmeTarihi).toISOString()).toBe('2026-10-09T08:05:00.000Z');
  });

  test('gömülü depo (eski belgeler)', async () => {
    const _id = new mongoose.Types.ObjectId();
    await YeniTesvik.collection.insertOne({ _id, makineListeleri: { yerli: [], ithal: [] },
      makineRevizyonlari: [{ revizeId: 'r0', revizeTuru: 'start', revizeTarihi: new Date('2026-09-01'), yerli: [], ithal: [m('i', 1, 'LAZER', { gtipKodu: '845611' })] }] });
    const r = await cagir(YeniTesvik, _id);
    expect(r.body.data.ithal).toEqual([expect.objectContaining({ adiVeOzelligi: 'LAZER', gtipKodu: '845611', silinmeTarihi: null })]);
  });

  test('olmayan belge 404', async () => {
    expect((await cagir(Tesvik, new mongoose.Types.ObjectId())).statusCode).toBe(404);
  });
});
