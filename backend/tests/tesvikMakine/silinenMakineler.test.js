// 🧪 Müşteri görünümü — silinen makineler
// Müşteri (07.10.2026): "Makine listesinde silinenleri pdf çıktısından komple kaldırmak yerine kırmızı
// yazıyla 'Silindi' gibi bir şey yazabilir miyiz belli olsun?"

const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const Tesvik = require('../../models/Tesvik');
const YeniTesvik = require('../../models/YeniTesvik');
const MakineRevizyonKaydi = require('../../models/MakineRevizyonKaydi');
const { silinenMakineleriBul, silinenlerUcu } = require('../../services/tesvikMakine/silinenMakineler');

const m = (rowId, siraNo, adiVeOzelligi, ek = {}) => ({ rowId, siraNo, adiVeOzelligi, miktar: 1, ...ek });

describe('silinen makineleri bulma (saf)', () => {
  test('geçmişte olup güncel listede olmayan makine silinmiştir; son görüldüğü haliyle bir kez gelir', () => {
    const gecmis = [
      { revizeTarihi: '2026-09-01', yerli: [m('a', 1, 'PRES'), m('b', 2, 'TORNA', { miktar: 1 })] },
      { revizeTarihi: '2026-09-10', yerli: [m('a', 1, 'PRES'), m('b', 2, 'TORNA', { miktar: 3 })] }
    ];
    const sonuc = silinenMakineleriBul({ yerli: [m('a', 1, 'PRES')], ithal: [] }, gecmis);
    expect(sonuc.yerli).toHaveLength(1);
    expect(sonuc.yerli[0]).toMatchObject({ adiVeOzelligi: 'TORNA', miktar: 3, sonGorulme: '2026-09-10' });
    expect(sonuc.ithal).toEqual([]);
  });

  test('kimliği yeniden üretilmiş makine silinmiş SAYILMAZ (canlıdaki tuzak)', () => {
    const gecmis = [{ yerli: [m('eski-1', 1, 'Kompresör  Vidalı'), m('eski-2', 2, 'FORKLİFT', { makineId: 'M-77' })] }];
    const guncel = { yerli: [m('yeni-1', 1, 'kompresör vidalı'), m('yeni-2', 2, 'FORKLİFT (elektrikli)', { makineId: 'M-77' })] };
    expect(silinenMakineleriBul(guncel, gecmis).yerli).toEqual([]);
  });

  test('ithalde GTİP de eşleşmeye girer; sıra no ile dizilir', () => {
    const gecmis = [{ ithal: [m('x', 5, 'CNC', { gtipKodu: '845710' }), m('y', 2, 'CNC', { gtipKodu: '845890' }), m('z', 3, 'ROBOT')] }];
    const guncel = { ithal: [m('q', 1, 'CNC', { gtipKodu: '845710' })] };
    expect(silinenMakineleriBul(guncel, gecmis).ithal.map((r) => [r.siraNo, r.gtipKodu || ''])).toEqual([[2, '845890'], [3, '']]);
  });

  test('geçmiş yoksa ya da adsız boş satırsa hiçbir şey dönmez', () => {
    expect(silinenMakineleriBul({ yerli: [m('a', 1, 'PRES')] }, [])).toEqual({ yerli: [], ithal: [] });
    expect(silinenMakineleriBul({ yerli: [] }, [{ yerli: [m('b', 1, '  ')] }]).yerli).toEqual([]);
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

  test('ayrı depo (makinerevizyonkaydis)', async () => {
    const _id = new mongoose.Types.ObjectId();
    await Tesvik.collection.insertOne({ _id, makineRevizyonDeposu: 'ayri', makineListeleri: { yerli: [m('a', 1, 'PRES')], ithal: [] } });
    await MakineRevizyonKaydi.collection.insertMany([
      { tesvik: _id, tesvikModeli: 'Tesvik', sira: 0, snapshot: { revizeId: 'r0', revizeTarihi: new Date('2026-09-01'), yapanKullanici: user, yerli: [m('a', 1, 'PRES'), m('b', 2, 'TORNA', { birimFiyatiTl: 500 })], ithal: [] } },
      // Başka modelin aynı kimlikli kaydı karışmamalı
      { tesvik: _id, tesvikModeli: 'YeniTesvik', sira: 0, snapshot: { revizeId: 'r0', yerli: [m('c', 3, 'BAŞKA')], ithal: [] } }
    ]);
    const r = await cagir(Tesvik, _id);
    expect(r.statusCode).toBe(200);
    expect(r.body.data.yerli).toEqual([expect.objectContaining({ adiVeOzelligi: 'TORNA', birimFiyatiTl: 500 })]);
  });

  test('gömülü depo (eski belgeler)', async () => {
    const _id = new mongoose.Types.ObjectId();
    await YeniTesvik.collection.insertOne({ _id, makineListeleri: { yerli: [], ithal: [] },
      makineRevizyonlari: [{ revizeId: 'r0', revizeTarihi: new Date('2026-09-01'), yerli: [], ithal: [m('i', 1, 'LAZER', { gtipKodu: '845611' })] }] });
    const r = await cagir(YeniTesvik, _id);
    expect(r.body.data.ithal).toEqual([expect.objectContaining({ adiVeOzelligi: 'LAZER', gtipKodu: '845611' })]);
  });

  test('olmayan belge 404', async () => {
    expect((await cagir(Tesvik, new mongoose.Types.ObjectId())).statusCode).toBe(404);
  });
});
