// 🧪 30.09.2026 listesi — bildirim alıcısı notta görünsün, durum geçmişi silinebilsin
//
// Müşteri: "Bildirim gönderince kime gönderdiğimiz görünmüyor ama bu en son kısmı Genel not -
// tarih - >> bildirim gönderdiğimiz kişi gibi yapabilir miyiz" · "Birde Durum geçmişlerini
// silebilme ekleyebilir miyiz"

const express = require('express');
const request = require('supertest');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const { ObjectId } = mongoose.Types;

const ctrl = require('../../controllers/dosyaTakipController');
const DosyaTakip = require('../../models/DosyaTakip');
const User = require('../../models/User');
// populateTalep firma/kullanıcı referanslarını dolduruyor: modeller kayıtlı olmalı
require('../../models/Firma');

jest.setTimeout(60000);

let mem, app, ben, berk, ayse;
const firma = new ObjectId();

const kullanici = (ad, eposta) => User.create({ adSoyad: ad, email: eposta, sifre: 'Gecici123!', rol: 'kullanici' });

beforeAll(async () => {
  mem = await MongoMemoryServer.create();
  await mongoose.connect(mem.getUri());
  [ben, berk, ayse] = await Promise.all([
    kullanici('Seda Durak', 'seda@gm.test'),
    kullanici('Berk Acar', 'berk@gm.test'),
    kullanici('Ayşe Yılmaz', 'ayse@gm.test')
  ]);
  app = express();
  app.use(express.json());
  app.use((req, _res, next) => { req.user = { _id: ben._id, adSoyad: ben.adSoyad }; next(); });
  app.post('/:id/not', ctrl.notEkle);
  app.delete('/:id/durum-gecmisi/:gecmisId', ctrl.durumGecmisiSil);
});
afterAll(async () => { await mongoose.disconnect(); if (mem) await mem.stop(); });
beforeEach(async () => { await DosyaTakip.deleteMany({}); });

const talepKur = (ekler = {}) => DosyaTakip.create({
  firma, firmaId: 'A1', firmaUnvan: 'GLOBTEKS A.Ş.', olusturanKullanici: ben._id, olusturanAdi: ben.adSoyad,
  talepTuru: 'Belge Başvuru Talebi', ytbNo: '568289', ...ekler
});

describe('nota bildirim alıcıları', () => {
  test('bildirim gönderilen kişilerin adı notta saklanır', async () => {
    const t = await talepKur();
    const r = await request(app).post(`/${t._id}/not`).send({
      metin: 'Yapı ruhsatı eksik talep edilmiş.',
      alan: 'genelNotlar',
      bildirimKullanicilar: [String(berk._id), String(ayse._id)]
    });
    expect(r.status).toBe(200);
    const sonra = await DosyaTakip.findById(t._id).lean();
    expect(sonra.genelNotlar[0].bildirilenler).toEqual(['Berk Acar', 'Ayşe Yılmaz']);
  });

  test('bildirim gönderilmemişse alıcı listesi boş kalır', async () => {
    const t = await talepKur();
    await request(app).post(`/${t._id}/not`).send({ metin: 'İç not', alan: 'genelNotlar' });
    const sonra = await DosyaTakip.findById(t._id).lean();
    expect(sonra.genelNotlar[0].bildirilenler).toEqual([]);
  });

  test('kendine gönderilen bildirim alıcı sayılmaz', async () => {
    const t = await talepKur();
    await request(app).post(`/${t._id}/not`).send({
      metin: 'Not', alan: 'genelNotlar', bildirimKullanicilar: [String(ben._id)]
    });
    const sonra = await DosyaTakip.findById(t._id).lean();
    expect(sonra.genelNotlar[0].bildirilenler).toEqual([]);
  });
});

describe('durum geçmişi silme', () => {
  const gecmisliTalep = () => talepKur({
    durumGecmisi: [
      { oncekiDurum: '2.1.1_GORUSULUYOR', yeniDurum: '2.2.1_KURUM_DEGERLENDIRME', degistirenAdi: 'Seda', tarih: new Date('2026-09-01') },
      { oncekiDurum: '2.2.1_KURUM_DEGERLENDIRME', yeniDurum: '2.3.5_SONUCLANDI', degistirenAdi: 'Seda', tarih: new Date('2026-09-10') }
    ]
  });

  test('seçilen geçmiş kaydı silinir, diğeri kalır', async () => {
    const t = await gecmisliTalep();
    const silinecek = t.durumGecmisi[0]._id;
    const r = await request(app).delete(`/${t._id}/durum-gecmisi/${silinecek}`);
    expect(r.status).toBe(200);
    const sonra = await DosyaTakip.findById(t._id).lean();
    expect(sonra.durumGecmisi).toHaveLength(1);
    expect(sonra.durumGecmisi[0].yeniDurum).toBe('2.3.5_SONUCLANDI');
  });

  test('talebin GÜNCEL durumu değişmez', async () => {
    const t = await gecmisliTalep();
    const oncekiDurum = t.durum;
    await request(app).delete(`/${t._id}/durum-gecmisi/${t.durumGecmisi[1]._id}`);
    const sonra = await DosyaTakip.findById(t._id).lean();
    expect(sonra.durum).toBe(oncekiDurum);
  });

  test('olmayan kayıt 404 döner', async () => {
    const t = await gecmisliTalep();
    const r = await request(app).delete(`/${t._id}/durum-gecmisi/${new ObjectId()}`);
    expect(r.status).toBe(404);
  });
});
