// 🧪 Belge Takip listesi — sunucu tarafı sıralama
//
// Müşteri (05.10.2026): "Belge takip sütunlarına Fatura Durumunu da ekleyebilir miyiz sıralayabilelim
// yine durumuna göre." Tarayıcı yalnız ekrandaki 50 satırı diziyordu; sıralama artık tüm kümede.

const express = require('express');
const request = require('supertest');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const { ObjectId } = mongoose.Types;

const { siralamaCoz, talepleriSirala } = require('../../services/dosyaTakip/listeSiralama');

describe('talepleriSirala (saf)', () => {
  const t = (id, ek) => ({ _id: id, createdAt: new Date(2026, 0, Number(id)), ...ek });

  test('fatura durumu: kesildi → kesilmedi → avans, boşlar her yönde en sonda', () => {
    const liste = [t('1', {}), t('2', { odeme: { faturaDurumu: 'avans' } }), t('3', { odeme: { faturaDurumu: 'kesildi' } }),
      t('4', { odeme: { faturaDurumu: '' } }), t('5', { odeme: { faturaDurumu: 'kesilmedi' } })];
    expect(talepleriSirala(liste, { alan: 'faturaDurumu', yon: 1 }).map((x) => x._id)).toEqual(['3', '5', '2', '4', '1']);
    expect(talepleriSirala(liste, { alan: 'faturaDurumu', yon: -1 }).map((x) => x._id)).toEqual(['2', '5', '3', '4', '1']);
  });

  test('firma adı Türkçe alfabe (Ç C\'den sonra, İ I\'dan sonra)', () => {
    const liste = [t('1', { firmaUnvan: 'ÇINAR' }), t('2', { firmaUnvan: 'DENİZ' }), t('3', { firmaUnvan: 'CAN' }),
      t('4', { firmaUnvan: 'İPEK' }), t('5', { firmaUnvan: 'IŞIK' })];
    expect(talepleriSirala(liste, { alan: 'firmaUnvan', yon: 1 }).map((x) => x.firmaUnvan))
      .toEqual(['CAN', 'ÇINAR', 'DENİZ', 'IŞIK', 'İPEK']);
  });

  test('kişi sütunu kişinin adına göre, atanmamış en sonda', () => {
    const adlar = { a: 'Yiğit Yıldırım', b: 'Berk Acar', c: 'Seda Durak' };
    const liste = [t('1', { muraacatSonrasi: { takibiYapanPersonel: 'a' } }), t('2', {}),
      t('3', { muraacatSonrasi: { takibiYapanPersonel: 'b' } }), t('4', { muraacatSonrasi: { takibiYapanPersonel: 'c' } })];
    expect(talepleriSirala(liste, { alan: 'takibiYapan', yon: 1 }, { kisiAdi: (id) => adlar[id] }).map((x) => x._id))
      .toEqual(['3', '4', '1', '2']);
  });

  test('sonuçlanma: sonuç tarihi yoksa sonuca alınma tarihi', () => {
    const liste = [t('1', { sonuclanmaTarihi: new Date('2026-05-01') }), t('2', { gecmis: new Date('2026-03-01') }), t('3', {})];
    const r = talepleriSirala(liste, { alan: 'sonuclanmaTarihi', yon: -1 }, { sonucaAlinmaTarihi: (x) => x.gecmis || null });
    expect(r.map((x) => x._id)).toEqual(['1', '2', '3']);
  });

  test('eşitlikte en yeni talep üstte', () => {
    const liste = [t('1', { talepTuru: 'A' }), t('3', { talepTuru: 'A' }), t('2', { talepTuru: 'A' })];
    expect(talepleriSirala(liste, { alan: 'talepTuru', yon: 1 }).map((x) => x._id)).toEqual(['3', '2', '1']);
  });

  test('siralamaCoz yalnız tanınan alanları kabul eder', () => {
    expect(siralamaCoz('faturaDurumu:desc')).toEqual({ alan: 'faturaDurumu', yon: -1 });
    expect(siralamaCoz('createdAt:asc')).toEqual({ alan: 'createdAt', yon: 1 });
    expect(siralamaCoz('$where:asc')).toBeNull();
    expect(siralamaCoz('')).toBeNull();
    expect(siralamaCoz('__proto__:asc')).toBeNull();
  });
});

describe('GET /tum-talepler?siralama=', () => {
  // populate('firma' / kişiler) için şemalar kayıtlı olmalı
  require('../../models/User');
  require('../../models/Firma');
  const ctrl = require('../../controllers/dosyaTakipController');
  const DosyaTakip = require('../../models/DosyaTakip');
  jest.setTimeout(60000);
  let mem;
  let app;

  beforeAll(async () => {
    mem = await MongoMemoryServer.create();
    await mongoose.connect(mem.getUri());
    app = express();
    app.use((req, _res, next) => { req.user = { _id: new ObjectId() }; next(); });
    app.get('/liste', ctrl.getTumTalepler);
    const firma = new ObjectId();
    const durumlar = ['', 'avans', '', 'kesildi', '', 'kesilmedi', '', '', 'kesildi', ''];
    await DosyaTakip.collection.insertMany(durumlar.map((d, i) => ({
      takipId: `DT20269${String(i).padStart(2, '0')}`, firma, firmaUnvan: `FİRMA ${i}`, talepTuru: 'Belge Revize Talebi',
      aktif: true, anaAsama: 'MURACAAT_ONCESI', durum: '2.1.1_GORUSULUYOR', odeme: { faturaDurumu: d },
      createdAt: new Date(2026, 8, i + 1)
    })));
  });
  afterAll(async () => { await mongoose.disconnect(); if (mem) await mem.stop(); });

  test('fatura durumuna göre sıralama sayfalar boyunca geçerli', async () => {
    const s1 = await request(app).get('/liste').query({ siralama: 'faturaDurumu:asc', limit: 3, page: 1 });
    expect(s1.status).toBe(200);
    expect(s1.body.pagination.toplam).toBe(10);
    // 2. sayfadaki/ilerideki kayıtlar da öne geldi: kesildi ×2, kesilmedi
    expect(s1.body.data.map((t) => t.odeme.faturaDurumu)).toEqual(['kesildi', 'kesildi', 'kesilmedi']);
    const s2 = await request(app).get('/liste').query({ siralama: 'faturaDurumu:asc', limit: 3, page: 2 });
    expect(s2.body.data.map((t) => t.odeme.faturaDurumu)).toEqual(['avans', '', '']);
    // listede gereken alanlar ve sanal alanlar hâlâ geliyor
    expect(s2.body.data[0]).toHaveProperty('durumEtiketi');
  });

  test('sıralama verilmezse eskisi gibi en yeni üstte', async () => {
    const r = await request(app).get('/liste').query({ limit: 2 });
    expect(r.body.data.map((t) => t.firmaUnvan)).toEqual(['FİRMA 9', 'FİRMA 8']);
  });
});
