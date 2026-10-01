// 🧪 Revizyon başlatma — vazgeçilen revizyon geçmişte kalmamalı
//
// Müşteri (01.10.2026): "Revizyon başlatıp, revizeyi kaydetmeden/vazgeçip çıkınca bile revizyon
// geçmişinde görünüyor." Eskiden "Revize Et" penceresi POST /:id/revizyon ile kaydı hemen
// yazıyordu. Artık sebep + not düzenleme formuyla birlikte PUT /:id içinde geliyor ve
// revizyon yalnızca kaydedince yazılıyor. Burada denetleyici gerçek Mongo'ya karşı çağrılıyor.

const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');

jest.setTimeout(60000);

// populate('firma' / 'olusturanKullanici') için şemalar kayıtlı olmalı
require('../../models/User');
require('../../models/Firma');
const Tesvik = require('../../models/Tesvik');
const YeniTesvik = require('../../models/YeniTesvik');
const tesvikController = require('../../controllers/tesvikController');
const yeniTesvikController = require('../../controllers/yeniTesvikController');

let mem;
beforeAll(async () => {
  mem = await MongoMemoryServer.create();
  await mongoose.connect(mem.getUri());
});
afterAll(async () => {
  await mongoose.disconnect();
  if (mem) await mem.stop();
});

const kullanici = { _id: new mongoose.Types.ObjectId(), adSoyad: 'Test Uzman', email: 'uzman@example.test', rol: 'admin' };

const belgeKur = (Model, ek = {}) => Model.create({
  gmId: `GM-${Math.random().toString(36).slice(2, 8)}`,
  firma: new mongoose.Types.ObjectId(),
  firmaId: 'A000001',
  yatirimciUnvan: 'TEST SANAYİ A.Ş.',
  olusturanKullanici: kullanici._id,
  belgeYonetimi: { belgeId: `B-${Date.now()}-${Math.random()}`, belgeNo: '578574', belgeTarihi: new Date('2025-03-26') },
  yatirimBilgileri: { yatirimKonusu: '1551', destekSinifi: 'GENEL', yerinIl: 'İZMİR', yerinIlce: 'MENDERES' },
  istihdam: { mevcutKisi: 159, ilaveKisi: 0 },
  ...ek
});

// Express'siz çağrı: res.status().json() zincirini yakalar
const cagir = async (fn, params, body) => {
  const req = {
    params, body, user: kullanici, ip: '127.0.0.1',
    connection: { remoteAddress: '127.0.0.1' }, get: () => 'jest', headers: {}
  };
  const res = { statusCode: 200, govde: null };
  res.status = (k) => { res.statusCode = k; return res; };
  res.json = (g) => { res.govde = g; return res; };
  await fn(req, res);
  return res;
};

describe.each([
  ['eski belge', Tesvik, tesvikController],
  ['yeni belge', YeniTesvik, yeniTesvikController]
])('%s', (_ad, Model, ctrl) => {
  test('pencereden vazgeçmek/kaydetmeden çıkmak hiçbir revizyon yazmaz', async () => {
    const belge = await belgeKur(Model);
    // Yeni akışta pencere ve form açılıp kapatılması sunucuya istek göndermez; kayıt sayısı sabit kalır.
    const taze = await Model.findById(belge._id).lean();
    expect(taze.revizyonlar || []).toHaveLength(0);
  });

  test('kaydedince sebep + not + değişen alanlar TEK revizyonda', async () => {
    const belge = await belgeKur(Model);
    const res = await cagir(ctrl.updateTesvik, { id: String(belge._id) }, {
      istihdam: { mevcutKisi: 159, ilaveKisi: 25 },
      revizyonBaslatma: { revizyonSebebi: 'Sonuç Revize', kullaniciNotu: 'İnşaat harcaması artırım revize talebi sonuç' }
    });
    expect(res.statusCode).toBe(200);

    const taze = await Model.findById(belge._id).lean();
    expect(taze.revizyonlar).toHaveLength(1);
    const rev = taze.revizyonlar[0];
    expect(rev.revizyonSebebi).toBe('Sonuç Revize');
    expect(rev.kullaniciNotu).toBe('İnşaat harcaması artırım revize talebi sonuç');
    expect(rev.degisikenAlanlar.map((a) => a.alan)).toContain('istihdam.ilaveKisi');
    // revizyonBaslatma belgeye alan olarak yazılmamalı
    expect(taze.revizyonBaslatma).toBeUndefined();
  });

  test('alan değişmese de bilerek kaydedilen revizyon yazılır', async () => {
    const belge = await belgeKur(Model);
    await cagir(ctrl.updateTesvik, { id: String(belge._id) }, {
      revizyonBaslatma: { revizyonSebebi: 'Müşavir Revize', kullaniciNotu: '' }
    });
    const taze = await Model.findById(belge._id).lean();
    expect(taze.revizyonlar).toHaveLength(1);
    expect(taze.revizyonlar[0].revizyonSebebi).toBe('Müşavir Revize');
  });

  test('revizyon başlatmadan yapılan normal düzenleme eskisi gibi "Otomatik Güncelleme"', async () => {
    const belge = await belgeKur(Model);
    await cagir(ctrl.updateTesvik, { id: String(belge._id) }, { istihdam: { mevcutKisi: 160, ilaveKisi: 0 } });
    const taze = await Model.findById(belge._id).lean();
    expect(taze.revizyonlar).toHaveLength(1);
    expect(taze.revizyonlar[0].revizyonSebebi).toBe('Otomatik Güncelleme');
  });

  test('değişiklik yoksa ve revizyon başlatılmadıysa kayıt oluşmaz', async () => {
    const belge = await belgeKur(Model);
    await cagir(ctrl.updateTesvik, { id: String(belge._id) }, {});
    const taze = await Model.findById(belge._id).lean();
    expect(taze.revizyonlar || []).toHaveLength(0);
  });

  test('Büyük Ölçekli artık kaydediliyor (şemada yoktu, sessizce düşüyordu)', async () => {
    const belge = await belgeKur(Model);
    await cagir(ctrl.updateTesvik, { id: String(belge._id) }, {
      yatirimBilgileri: { ...belge.toObject().yatirimBilgileri, buyukOlcekli: 'evet' }
    });
    const taze = await Model.findById(belge._id).lean();
    expect(taze.yatirimBilgileri.buyukOlcekli).toBe('evet');
  });
});
