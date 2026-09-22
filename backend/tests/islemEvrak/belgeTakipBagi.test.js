// 🧪 Belge Takip › Firma Maili'nden açılan İşlem & Evrak talebi
//
// Müşteri (22.09.2026): "'İşlem & Evrak' modülündeki yeni belge takibi mail kısmını, doğrudan 'Belge Takip'
// modülündeki mail gönderme kısmına da ekleyebilir miyiz bu 'mailde iste-evrak talebi kısmı da dahil (pop-up
// gibi olabilir ...)'? İki alanda da birebir aynı olsun isteniyor."
// Talep yine İşlem & Evrak talebi; Belge Takip talebine bağlanıyor ve firma oradan geliyor.

const express = require('express');
const request = require('supertest');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const { ObjectId } = mongoose.Types;

const ctrl = require('../../controllers/islemEvrakController');
const IslemTuru = require('../../models/IslemTuru');
const IslemTalebi = require('../../models/IslemTalebi');

jest.setTimeout(60000);

let mem;
let app;
const user = { _id: new ObjectId(), adSoyad: 'Seda Durak', email: 's@t.com', rol: 'admin' };
const firmaA = new ObjectId();
const firmaB = new ObjectId();
const dtBagli = new ObjectId();
const dtFirmasiz = new ObjectId();
let tur;

beforeAll(async () => {
  mem = await MongoMemoryServer.create();
  await mongoose.connect(mem.getUri());
  const db = mongoose.connection.db;
  // Adres yalnız yetkili kişide (canlıda 1259 firmanın 588'i böyle)
  await db.collection('firmas').insertMany([
    { _id: firmaA, tamUnvan: 'GLOBTEKS TEKSTİL A.Ş.', firmaEmail: '', yetkiliKisiler: [{ adSoyad: 'Ayşe Yılmaz', eposta1: 'ayse@globteks.com', eposta2: '' }] },
    { _id: firmaB, tamUnvan: 'BAŞKA FİRMA LTD.', firmaEmail: 'info@baska.com', yetkiliKisiler: [] }
  ]);
  await db.collection('dosyatakips').insertMany([
    { _id: dtBagli, firma: firmaA, takipId: 'DT2026301', talepTuru: 'Belge Başvuru Talebi', ytbNo: '568289',
      firmaMailleri: [{ alicilar: ['muhasebe@globteks.com'], cc: ['patron@globteks.com'], konu: 'Eksikler', govde: '-', tarih: new Date('2026-09-10') }] },
    { _id: dtFirmasiz, takipId: 'DT2026302', talepTuru: 'Belge Başvuru Talebi' }
  ]);
  tur = await IslemTuru.create({
    kod: 'yeni_belge_test', ad: 'Yeni Belge Talebi',
    mailKonusu: 'Evrak Talebi ({firmaAdi})', mailGovdesi: 'Sayın {firmaAdi},\n{evrakListesi}\n{uploadLink}',
    istenenEvraklar: [{ ad: 'Vergi Levhası', zorunlu: true }, { ad: 'İmza Sirküleri', zorunlu: true }, { ad: 'Kapasite Raporu', zorunlu: false }]
  });

  app = express();
  app.use(express.json());
  app.use((req, _res, next) => { req.user = user; next(); });
  app.post('/talepler', ctrl.talepOlustur);
  app.get('/talepler', ctrl.talepListe);
  app.get('/talepler/:id', ctrl.talepDetay);
});

afterAll(async () => {
  await mongoose.disconnect();
  if (mem) await mem.stop();
});

beforeEach(async () => { await IslemTalebi.deleteMany({}); });

const olustur = (govde) => request(app).post('/talepler').send({ islemTuruId: String(tur._id), ...govde });

describe('Belge Takip talebinden evrak talebi', () => {
  test('firma Belge Takip talebinden gelir, talep ona bağlanır, alıcılar son firma mailinden', async () => {
    const r = await olustur({ dosyaTakipId: String(dtBagli) });
    expect(r.status).toBe(200);
    const t = r.body.data;
    expect(String(t.firma)).toBe(String(firmaA));
    expect(String(t.dosyaTakip)).toBe(String(dtBagli));
    expect(t.firmaAdi).toBe('GLOBTEKS TEKSTİL A.Ş.');
    // Belge Takip'in firma mailindeki kuralla aynı: en son gönderilen maildeki alıcı + CC
    expect(t.mailAlicilar).toEqual(['muhasebe@globteks.com']);
    expect(t.mailCc).toEqual(['patron@globteks.com']);
    // Evrak listesi İşlem & Evrak şablonundan, "Mailde iste" işaretleriyle
    expect(t.istenenEvraklar.map((e) => [e.ad, e.zorunlu])).toEqual([['Vergi Levhası', true], ['İmza Sirküleri', true], ['Kapasite Raporu', false]]);
  });

  test('başka firmayla açılmaya çalışılırsa reddedilir', async () => {
    const r = await olustur({ dosyaTakipId: String(dtBagli), firmaId: String(firmaB) });
    expect(r.status).toBe(400);
    expect(await IslemTalebi.countDocuments()).toBe(0);
  });

  test('firması olmayan Belge Takip talebi 400, olmayan talep 404', async () => {
    expect((await olustur({ dosyaTakipId: String(dtFirmasiz) })).status).toBe(400);
    expect((await olustur({ dosyaTakipId: String(new ObjectId()) })).status).toBe(404);
  });

  test('Belge Takip sekmesi yalnız o talepten açılanları listeler', async () => {
    await olustur({ dosyaTakipId: String(dtBagli) });
    await olustur({ firmaId: String(firmaB) });
    const r = await request(app).get('/talepler').query({ dosyaTakip: String(dtBagli) });
    expect(r.body.data).toHaveLength(1);
    expect(r.body.data[0]).toMatchObject({ istenenSayisi: 2, gelenSayisi: 0 });
    expect((await request(app).get('/talepler')).body.data).toHaveLength(2);
    expect((await request(app).get('/talepler').query({ dosyaTakip: 'bozuk' })).body.data).toEqual([]);
  });

  test('talep detayı hangi Belge Takip talebinden açıldığını söyler', async () => {
    const { body } = await olustur({ dosyaTakipId: String(dtBagli) });
    const d = await request(app).get(`/talepler/${body.data._id}`);
    expect(d.body.data.dosyaTakipOzet).toMatchObject({ takipId: 'DT2026301', talepTuru: 'Belge Başvuru Talebi' });
  });
});

describe('İşlem & Evrak varsayılan alıcıları', () => {
  // Eskiden yetkili kişilerde olmayan `email` alanı okunuyordu: adresi yalnız yetkili kişide duran
  // firmada "Kime" boş geliyordu
  test('firma e-postası yoksa yetkili kişinin e-postası gelir', async () => {
    await mongoose.connection.db.collection('dosyatakips').updateOne({ _id: dtBagli }, { $set: { firmaMailleri: [] } });
    try {
      const r = await olustur({ firmaId: String(firmaA) });
      expect(r.body.data.mailAlicilar).toEqual(['ayse@globteks.com']);
      expect(r.body.data.firmaEmail).toBe('ayse@globteks.com');
    } finally {
      await mongoose.connection.db.collection('dosyatakips').updateOne({ _id: dtBagli }, {
        $set: { firmaMailleri: [{ alicilar: ['muhasebe@globteks.com'], cc: ['patron@globteks.com'], konu: 'Eksikler', govde: '-', tarih: new Date('2026-09-10') }] }
      });
    }
  });

  test('daha önce bu firmaya İşlem & Evrak maili gittiyse o alıcılar', async () => {
    await IslemTalebi.create({
      firma: firmaB, islemTuru: tur._id, mailAlicilar: ['yeni@baska.com'], mailCc: [],
      mailGonderimSayisi: 1, sonMailTarihi: new Date('2026-09-20')
    });
    const r = await olustur({ firmaId: String(firmaB) });
    expect(r.body.data.mailAlicilar).toEqual(['yeni@baska.com']);
  });
});
