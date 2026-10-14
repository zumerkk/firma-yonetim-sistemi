// 🧪 Ana sayfa — Belge Takip son işlemleri (müşteri, 14.10.2026): "Firma ismi - Talep türü - Durum - Notlar
// - Dosyalar şeklinde, detaylarına gerek yok … sadece değişiklik yapıldığı bilgisi ve ne zaman … Herkeste görünsün."
const express = require('express');
const request = require('supertest');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const { ObjectId } = mongoose.Types;
const { talepSonIslemleri } = require('../../services/dosyaTakip/sonIslemler');
const ctrl = require('../../controllers/dosyaTakipController');
const DosyaTakip = require('../../models/DosyaTakip');

jest.setTimeout(60000);
const t = (s) => new Date(`2026-10-${s}:00.000Z`);

describe('talep başına son zamanlar', () => {
  test('not ve dosya her alt bölümden sayılır; durumda düzeltilmiş değil ilk yazılan an', () => {
    const s = talepSonIslemleri({
      createdAt: t('01T08:00'),
      genelNotlar: [{ metin: 'a', tarih: t('10T09:00'), yazanAdi: 'Berk' }],
      muraacatSonrasi: { kurumEksik: { firmadanBeklenen: { beklenenEksikler: [{ metin: 'b', tarih: t('12T10:00'), yazanAdi: 'Seda' }], gelenBelgeler: [{ dosyaAdi: 'x.pdf', yuklemeTarihi: t('13T11:00'), yukleyenAdi: 'Firma' }] } } },
      dosyalar: [{ dosyaAdi: 'y.pdf', yuklemeTarihi: t('05T11:00') }],
      durumGecmisi: [{ yeniDurum: 'X', tarih: t('02T08:00'), ilkTarih: t('11T08:00'), degistirenAdi: 'Yiğit' }],
      firmaMailleri: [{ konu: 'mail', tarih: t('14T08:00') }]
    });
    expect(s.not).toMatchObject({ zaman: t('12T10:00').getTime(), kim: 'Seda', sayi: 2 });
    expect(s.dosya).toMatchObject({ zaman: t('13T11:00').getTime(), sayi: 2 });
    expect(s.durum).toMatchObject({ zaman: t('11T08:00').getTime(), kim: 'Yiğit' });
    expect(s.son).toBe(t('13T11:00').getTime()); // firma maili sayılmaz (listede yok)
  });

  test('hiç işlem yoksa açılış zamanı', () => {
    const s = talepSonIslemleri({ createdAt: t('01T08:00') });
    expect(s).toMatchObject({ durum: null, not: null, dosya: null, son: t('01T08:00').getTime() });
  });
});

describe('uç', () => {
  let mem; let app;
  beforeAll(async () => {
    mem = await MongoMemoryServer.create(); await mongoose.connect(mem.getUri());
    app = express(); app.use((req, _r, next) => { req.user = { _id: new ObjectId() }; next(); });
    app.get('/son', ctrl.sonIslemler);
  });
  afterAll(async () => { await mongoose.disconnect(); if (mem) await mem.stop(); });

  test('herkesin talepleri, en son işlem üstte, not metni ve dosya adı yok', async () => {
    const firma = new ObjectId();
    const eski = { firma, firmaId: 'A1', talepTuru: 'Belge Başvuru Talebi', olusturanKullanici: new ObjectId() };
    await DosyaTakip.create({ ...eski, firmaUnvan: 'ESKİ A.Ş.', genelNotlar: [{ metin: 'GİZLİ NOT', tarih: t('01T09:00') }] });
    await DosyaTakip.create({ ...eski, firmaUnvan: 'YENİ A.Ş.', dosyalar: [{ dosyaAdi: 'GIZLI.pdf', dosyaYolu: 'x', yuklemeTarihi: new Date() }] });
    const r = await request(app).get('/son');
    expect(r.status).toBe(200);
    expect(r.body.data.map((x) => x.firmaUnvan)).toEqual(['YENİ A.Ş.', 'ESKİ A.Ş.']);
    expect(r.body.data[0]).toMatchObject({ talepTuru: 'Belge Başvuru Talebi', dosyaSayisi: 1 });
    expect(JSON.stringify(r.body)).not.toMatch(/GİZLİ NOT|GIZLI\.pdf/);
  });
});
