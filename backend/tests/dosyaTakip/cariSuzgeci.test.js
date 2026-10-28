// 🧪 Belge Takip arşivi — cari süzgeçleri (müşteri, 27.10.2026: "cari çekemedikleri için ödeme talep edemiyoruz")

const express = require('express');
const request = require('supertest');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const { ObjectId } = mongoose.Types;

const { cariSuzgecleriniCoz, cariKosullari } = require('../../services/dosyaTakip/cariSuzgeci');

describe('cariKosullari (saf)', () => {
  test('tanınmayan değer süzgeç sayılmaz', () => {
    expect(cariSuzgecleriniCoz({ cariKaydi: 'odendi', cariDurumu: '$ne' })).toEqual({ cariKaydi: '', cariDurumu: '' });
    expect(cariKosullari(cariSuzgecleriniCoz({}))).toEqual([]);
  });

  test('seçilmedi = boş ya da alan yok; açık = kapalı listesinde olmayan ve firması olan', () => {
    const k = new ObjectId();
    expect(cariKosullari({ cariKaydi: 'bos', cariDurumu: '' })).toEqual([{ 'odeme.cariKaydi': { $in: ['', null] } }]);
    expect(cariKosullari({ cariKaydi: 'yazildi', cariDurumu: 'kapandi' }, [k]))
      .toEqual([{ 'odeme.cariKaydi': 'yazildi' }, { firma: { $in: [k] } }]);
    expect(cariKosullari({ cariKaydi: '', cariDurumu: 'acik' }, [k])).toEqual([{ firma: { $nin: [k, null] } }]);
  });
});

describe('GET liste ?cariKaydi= &cariDurumu=', () => {
  require('../../models/User');
  const Firma = require('../../models/Firma');
  const ctrl = require('../../controllers/dosyaTakipController');
  const DosyaTakip = require('../../models/DosyaTakip');
  jest.setTimeout(60000);
  let mem;
  let app;
  const [kapali, acik, eski] = [new ObjectId(), new ObjectId(), new ObjectId()];

  beforeAll(async () => {
    mem = await MongoMemoryServer.create();
    await mongoose.connect(mem.getUri());
    app = express();
    app.use((req, _res, next) => { req.user = { _id: new ObjectId() }; next(); });
    app.get('/liste', ctrl.getTumTalepler);
    await Firma.collection.insertMany([
      { _id: kapali, firmaId: 'A900001', tamUnvan: 'KAPALI A.Ş.', cariDurumu: 'kapandi' },
      { _id: acik, firmaId: 'A900002', tamUnvan: 'AÇIK A.Ş.', cariDurumu: 'acik' },
      { _id: eski, firmaId: 'A900003', tamUnvan: 'ESKİ A.Ş.' } // alan yok → açık
    ]);
    const t = (no, firma, odeme, ek = {}) => ({
      takipId: `DT20267${no}`, firma, firmaUnvan: `T${no}`, talepTuru: 'Süre Revize Talebi', aktif: true,
      anaAsama: 'TAMAMLANDI', durum: '2.3.5_SONUCLANDI', createdAt: new Date(2026, 9, Number(no)),
      ...(odeme ? { odeme } : {}), ...ek
    });
    await DosyaTakip.collection.insertMany([
      t('01', kapali, { cariKaydi: 'yazildi' }),
      t('02', acik, { cariKaydi: 'kesildi' }),
      t('03', eski, null), // eski talep: odeme nesnesi yok
      t('04', acik, { cariKaydi: '' }),
      t('05', null, { cariKaydi: '' }), // firmasız
      t('06', kapali, { cariKaydi: '' }, { anaAsama: 'MURACAAT_ONCESI', durum: '1.1_GORUSULUYOR' }) // arşivde değil
    ]);
  });
  afterAll(async () => { await mongoose.disconnect(); if (mem) await mem.stop(); });

  const no = async (q) => (await request(app).get('/liste').query({ arsiv: '1', ...q })).body.data.map((x) => x.firmaUnvan).sort();

  test('cari kaydı: seçilmedi eski talepleri de kapsar; yazıldı / kesildi tek tek', async () => {
    expect(await no({ cariKaydi: 'bos' })).toEqual(['T03', 'T04', 'T05']);
    expect(await no({ cariKaydi: 'yazildi' })).toEqual(['T01']);
    expect(await no({ cariKaydi: 'kesildi' })).toEqual(['T02']);
  });

  test('cari durumu firmadan: alanı olmayan firma açık, firmasız talep hiçbirinde', async () => {
    expect(await no({ cariDurumu: 'kapandi' })).toEqual(['T01']);
    expect(await no({ cariDurumu: 'acik' })).toEqual(['T02', 'T03', 'T04']);
  });

  test('iki süzgeç ve arama birlikte; tanınmayan değer yok sayılır', async () => {
    expect(await no({ cariKaydi: 'bos', cariDurumu: 'acik' })).toEqual(['T03', 'T04']);
    expect(await no({ cariKaydi: 'bos', cariDurumu: 'acik', search: 'T04' })).toEqual(['T04']);
    expect(await no({ cariKaydi: 'odendi' })).toEqual(['T01', 'T02', 'T03', 'T04', 'T05']);
  });
});
