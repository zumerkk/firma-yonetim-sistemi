// 🧪 "sorunlar ve revizeler" 07.10.2026 — genel sekmesi, ilk iki madde (müşteri: "acil")
//  1) "Bu kısma Kapama Talepli ve Pasife alındı ekleyebilir miyiz?" (belge durum menüsü)
//  2) "Firma pasif ise belgesi (varsa) o da pasife alındı olsun ve bundan sonra pasife alınan
//     firmaların da belgeleri otomatik olarak pasife alınsın."

const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const { validationResult } = require('express-validator');

require('../../models/User');
const Firma = require('../../models/Firma');
const Tesvik = require('../../models/Tesvik');
const YeniTesvik = require('../../models/YeniTesvik');
const durumlar = require('../../constants/belgeDurumlari');
const pasif = require('../../services/tesvik/firmaPasifBelgeleri');

const yeniId = () => new mongoose.Types.ObjectId();

// ─────────────────────────────────────────────────────────────────────────────
describe('1) Yeni durumlar her katmanda tanınıyor', () => {
  test('sabit listede Kapama Talepli ve Pasife Alındı var, Kapandı yerinde', () => {
    const etiketler = Object.fromEntries(durumlar.BELGE_DURUMLARI.map((d) => [d.value, d.label]));
    expect(etiketler.kapama_talepli).toBe('Kapama Talepli');
    expect(etiketler.pasife_alindi).toBe('Pasife Alındı');
    expect(etiketler.kapandi).toBe('Kapandı');
  });

  test.each([['Tesvik', Tesvik], ['YeniTesvik', YeniTesvik]])('%s şeması iki durumu da kabul eder', (_ad, Model) => {
    expect(Model.schema.path('durumBilgileri.genelDurum').enumValues).toEqual(durumlar.BELGE_DURUM_DEGERLERI);
    for (const genelDurum of ['kapama_talepli', 'pasife_alindi']) {
      const doc = new Model({ durumBilgileri: { genelDurum } });
      const hata = doc.validateSync();
      expect(hata?.errors?.['durumBilgileri.genelDurum']).toBeUndefined();
    }
  });

  test('ön yüz listesi arka uçla birebir aynı sırada (frontend/src/utils/belgeDurum.js)', () => {
    const kaynak = fs.readFileSync(path.join(__dirname, '../../../frontend/src/utils/belgeDurum.js'), 'utf8');
    const onyuz = [...kaynak.matchAll(/\{ value: '([^']+)', label: '([^']+)', renk: '([^']+)' \}/g)]
      .map(([, value, label, renk]) => ({ value, label, hex: renk }));
    expect(onyuz).toEqual(durumlar.BELGE_DURUMLARI.map(({ value, label, hex }) => ({ value, label, hex })));
  });

  test('PATCH /durum doğrulaması yeni durumları geçirir, uydurma durumu reddeder', async () => {
    const { validateDurumUpdate } = require('../../middleware/validation');
    const calistir = async (yeniDurum) => {
      const req = { body: { yeniDurum } };
      for (const kural of validateDurumUpdate) await kural.run(req);
      return validationResult(req).isEmpty();
    };
    expect(await calistir('kapama_talepli')).toBe(true);
    expect(await calistir('pasife_alindi')).toBe(true);
    expect(await calistir('kapali_gibi')).toBe(false);
  });

  test('revizyon geçmişinden durum türetme iki yeni durumu ezmez', () => {
    expect(durumlar.OTO_SENKRON_DISI_DURUMLAR).toEqual(expect.arrayContaining(['kapama_talepli', 'pasife_alindi', 'kapandi']));
  });

  test('renk: pasife alınan gri, kapama talepli şemadaki renk listesinde', () => {
    const renkler = Tesvik.schema.path('durumBilgileri.durumRengi').enumValues;
    for (const d of durumlar.BELGE_DURUMLARI) expect(renkler).toContain(d.renk);
    expect(durumlar.durumRengi('pasife_alindi')).toBe('gri');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe('2a) Pasife alma planı (saf)', () => {
  const b = (genelDurum) => ({ _id: yeniId(), durumBilgileri: genelDurum ? { genelDurum } : {} });

  test('sonuçlanmış belgeler (kapandı / iptal / reddedildi) dokunulmaz, diğerleri eski durumuna göre gruplanır', () => {
    const plan = pasif.pasifePlan([b('onaylandi'), b('taslak'), b('onaylandi'), b('kapandi'), b('iptal_edildi'), b('reddedildi'), b(undefined)]);
    expect(plan.dokunulmayacak.map((x) => x.durumBilgileri.genelDurum)).toEqual(['kapandi', 'iptal_edildi', 'reddedildi']);
    expect([...plan.pasifeAlinacak.keys()].sort()).toEqual(['onaylandi', 'taslak']);
    expect(plan.pasifeAlinacak.get('onaylandi')).toHaveLength(3); // durumu boş eski kayıt = şema varsayılanı
  });

  test('geri alma: yalnız hâlâ pasif ve önceki durumu bilinen belge döner', () => {
    const plan = pasif.geriAlmaPlani([
      { _id: 1, durumBilgileri: { genelDurum: 'pasife_alindi', pasifOncesiDurum: 'onaylandi' } },
      { _id: 2, durumBilgileri: { genelDurum: 'inceleniyor' } }, // arada elle değiştirilmiş
      { _id: 3, durumBilgileri: { genelDurum: 'kapandi' } } // hiç pasife alınmamıştı
    ]);
    expect([...plan.donecek.keys()]).toEqual(['onaylandi']);
    expect(plan.yalnizIsaret.map((x) => x._id)).toEqual([2, 3]);
  });

  test('elle başka duruma alınan belgenin geri dönüş hedefi silinir', () => {
    const d = { genelDurum: 'inceleniyor', pasifOncesiDurum: 'onaylandi', firmaPasif: true };
    pasif.elleSecimiIsle(d);
    expect(d.pasifOncesiDurum).toBeUndefined();
    expect(d.firmaPasif).toBe(true); // açılış göçü yeniden pasife almasın
    const p = { genelDurum: 'pasife_alindi', pasifOncesiDurum: 'onaylandi' };
    pasif.elleSecimiIsle(p);
    expect(p.pasifOncesiDurum).toBe('onaylandi');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe('2b) Firma pasif/aktif → belgeler (bellek içi Mongo)', () => {
  jest.setTimeout(60000);
  let mem;
  const kullanici = { _id: yeniId(), adSoyad: 'Test Uzman', email: 'uzman@example.test', rol: 'admin' };

  beforeAll(async () => {
    mem = await MongoMemoryServer.create();
    await mongoose.connect(mem.getUri());
  });
  afterAll(async () => {
    await mongoose.disconnect();
    if (mem) await mem.stop();
  });
  beforeEach(async () => {
    await Promise.all([Firma.deleteMany({}), Tesvik.deleteMany({}), YeniTesvik.deleteMany({})]);
  });

  const firmaEkle = async (aktif = true) => {
    const _id = yeniId();
    await Firma.collection.insertOne({
      _id, firmaId: `A${String(Math.floor(Math.random() * 1e6)).padStart(6, '0')}`, tamUnvan: 'PASİF TEST A.Ş.',
      vergiNoTC: String(Math.floor(Math.random() * 1e10)).padStart(10, '1'), aktif, olusturanKullanici: kullanici._id
    });
    return _id;
  };
  // Ham ekleme: eski kayıtların zorunlu alanları eksik olabiliyor, kural yine çalışmalı
  const belgeEkle = (Model, firma, genelDurum, ek = {}) => Model.collection.insertOne({
    _id: yeniId(), firma, firmaId: 'A000001', aktif: true,
    durumBilgileri: genelDurum ? { genelDurum, durumRengi: durumlar.durumRengi(genelDurum) } : {}, ...ek
  }).then((r) => r.insertedId);
  const durumu = async (Model, id) => (await Model.findById(id).lean()).durumBilgileri;

  const firmaGuncelle = async (id, body) => {
    const { updateFirma } = require('../../controllers/firmaController');
    const req = { params: { id: String(id) }, body, user: kullanici, ip: '127.0.0.1', connection: {}, get: () => 'jest', headers: {} };
    const res = { statusCode: 200 };
    res.status = (c) => { res.statusCode = c; return res; };
    res.json = (d) => { res.body = d; return res; };
    await updateFirma(req, res);
    return res;
  };

  test('firma pasif yapılınca açık belgeler "Pasife Alındı", kapanmış belge aynen; aktif yapılınca geri döner', async () => {
    const firma = await firmaEkle(true);
    const baskaFirma = await firmaEkle(true);
    const onayli = await belgeEkle(Tesvik, firma, 'onaylandi');
    const taslak = await belgeEkle(Tesvik, firma, 'taslak');
    const kapali = await belgeEkle(Tesvik, firma, 'kapandi');
    const yeni = await belgeEkle(YeniTesvik, firma, 'kapama_talepli');
    const silinmis = await belgeEkle(Tesvik, firma, 'onaylandi', { aktif: false });
    const ilgisiz = await belgeEkle(Tesvik, baskaFirma, 'onaylandi');

    const pasifYanit = await firmaGuncelle(firma, { aktif: false });
    expect(pasifYanit.statusCode).toBe(200);
    expect(pasifYanit.body.message).toContain('3 belge "Pasife Alındı" yapıldı');

    expect(await durumu(Tesvik, onayli)).toMatchObject({ genelDurum: 'pasife_alindi', durumRengi: 'gri', pasifOncesiDurum: 'onaylandi', firmaPasif: true });
    expect(await durumu(Tesvik, taslak)).toMatchObject({ genelDurum: 'pasife_alindi', pasifOncesiDurum: 'taslak' });
    expect(await durumu(YeniTesvik, yeni)).toMatchObject({ genelDurum: 'pasife_alindi', pasifOncesiDurum: 'kapama_talepli' });
    expect(await durumu(Tesvik, kapali)).toMatchObject({ genelDurum: 'kapandi', firmaPasif: true });
    expect((await durumu(Tesvik, kapali)).pasifOncesiDurum).toBeUndefined();
    expect((await durumu(Tesvik, silinmis)).genelDurum).toBe('onaylandi');
    expect((await durumu(Tesvik, ilgisiz)).genelDurum).toBe('onaylandi');

    const aktifYanit = await firmaGuncelle(firma, { aktif: true });
    expect(aktifYanit.body.message).toContain('3 belge önceki durumuna döndü');
    const geri = await durumu(Tesvik, onayli);
    expect(geri).toMatchObject({ genelDurum: 'onaylandi', durumRengi: 'yesil' });
    expect(geri.firmaPasif).toBeUndefined();
    expect(geri.pasifOncesiDurum).toBeUndefined();
    expect((await durumu(Tesvik, taslak)).genelDurum).toBe('taslak');
    expect((await durumu(YeniTesvik, yeni)).genelDurum).toBe('kapama_talepli');
    expect((await durumu(Tesvik, kapali)).firmaPasif).toBeUndefined();
  });

  test('aktiflik değişmeyen güncelleme belgelere dokunmaz', async () => {
    const firma = await firmaEkle(true);
    const belge = await belgeEkle(Tesvik, firma, 'onaylandi');
    const yanit = await firmaGuncelle(firma, { notlar: 'yalnız not' });
    expect(yanit.body.message).not.toContain('belge');
    expect((await durumu(Tesvik, belge)).genelDurum).toBe('onaylandi');
  });

  test('açılış göçü: pasif firmaların belgeleri bir kez işlenir, elle değiştirilen tekrar ezilmez', async () => {
    const pasifFirma = await firmaEkle(false);
    const aktifFirma = await firmaEkle(true);
    const b1 = await belgeEkle(Tesvik, pasifFirma, 'onaylandi');
    const b2 = await belgeEkle(Tesvik, pasifFirma, undefined); // durumu yazılmamış eski kayıt
    const b3 = await belgeEkle(Tesvik, aktifFirma, 'onaylandi');

    expect(await pasif.pasifFirmalarinBelgeleriniIsle()).toEqual({ pasifeAlinan: 2, korunan: 0 });
    expect((await durumu(Tesvik, b1)).genelDurum).toBe('pasife_alindi');
    expect(await durumu(Tesvik, b2)).toMatchObject({ genelDurum: 'pasife_alindi', pasifOncesiDurum: 'onaylandi' });
    expect((await durumu(Tesvik, b3)).genelDurum).toBe('onaylandi');

    // Kullanıcı pasif firmanın belgesini elle "İnceleniyor" yaptı (durum menüsü ucu)
    const { updateTesvikDurum } = require('../../controllers/tesvikController');
    const res = { statusCode: 200, status(c) { this.statusCode = c; return this; }, json(d) { this.body = d; return this; } };
    await updateTesvikDurum({ params: { id: String(b1) }, body: { yeniDurum: 'inceleniyor' }, user: kullanici }, res);
    expect(res.statusCode).toBe(200);
    expect(await durumu(Tesvik, b1)).toMatchObject({ genelDurum: 'inceleniyor', firmaPasif: true });
    expect((await durumu(Tesvik, b1)).pasifOncesiDurum).toBeUndefined();

    // Sunucu yeniden başladı: göç ikinci kez hiçbir şeye dokunmaz
    expect(await pasif.pasifFirmalarinBelgeleriniIsle()).toEqual({ pasifeAlinan: 0, korunan: 0 });
    expect((await durumu(Tesvik, b1)).genelDurum).toBe('inceleniyor');

    // Firma aktif oldu: elle seçilen kalır, diğeri eski durumuna döner
    expect(await pasif.belgeleriGeriAl([pasifFirma])).toEqual({ geriAlinan: 1 });
    expect((await durumu(Tesvik, b1)).genelDurum).toBe('inceleniyor');
    expect((await durumu(Tesvik, b2)).genelDurum).toBe('onaylandi');
  });

  test('durum menüsünden "Kapama Talepli" seçilebiliyor ve renk yazılıyor', async () => {
    const firma = await firmaEkle(true);
    const belge = await belgeEkle(YeniTesvik, firma, 'onaylandi');
    const { updateTesvikDurum } = require('../../controllers/yeniTesvikController');
    const res = { statusCode: 200, status(c) { this.statusCode = c; return this; }, json(d) { this.body = d; return this; } };
    await updateTesvikDurum({ params: { id: String(belge) }, body: { yeniDurum: 'kapama_talepli' }, user: kullanici }, res);
    expect(res.statusCode).toBe(200);
    expect(await durumu(YeniTesvik, belge)).toMatchObject({ genelDurum: 'kapama_talepli', durumRengi: 'mavi', durumManuelSecildi: true });
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Müşteri (09.10.2026): "Belge takipdeki Arşiv gibi Kapalı belgeler için de bir arşiv kısmı yapabilir
// miyiz Teşvik belgesinde?"
describe('3) Teşvik listesi arşivi', () => {
  test('kural: açık durum kazanır; arsiv yalnız açıkça gelirse uygulanır', () => {
    const { listeDurumKosulu } = durumlar;
    expect(listeDurumKosulu({ arsiv: '0' })).toEqual({ 'durumBilgileri.genelDurum': { $nin: ['kapandi'] } });
    expect(listeDurumKosulu({ arsiv: '1' })).toEqual({ 'durumBilgileri.genelDurum': { $in: ['kapandi'] } });
    expect(listeDurumKosulu({ arsiv: '0', durum: 'kapandi' })).toEqual({ 'durumBilgileri.genelDurum': 'kapandi' });
    expect(listeDurumKosulu({})).toEqual({}); // başka ekranların belge seçicileri eskisi gibi her şeyi alır
  });

  describe('liste ucu (bellek içi Mongo)', () => {
    jest.setTimeout(60000);
    let mem;
    const kullanici = { _id: yeniId(), adSoyad: 'Test', email: 't@example.test', rol: 'admin' };
    beforeAll(async () => { mem = await MongoMemoryServer.create(); await mongoose.connect(mem.getUri()); });
    afterAll(async () => { await mongoose.disconnect(); if (mem) await mem.stop(); });

    const liste = async (Model, ctrlYolu, query) => {
      await Model.deleteMany({});
      await Model.collection.insertMany(['onaylandi', 'kapandi', 'pasife_alindi', 'kapama_talepli'].map((genelDurum, i) => ({
        _id: yeniId(), tesvikId: `TES2026900${i}`, firma: yeniId(), firmaId: 'A1', yatirimciUnvan: `FİRMA ${i}`,
        aktif: true, durumBilgileri: { genelDurum }, createdAt: new Date(2026, 9, i + 1)
      })));
      const res = { statusCode: 200, status(c) { this.statusCode = c; return this; }, json(d) { this.body = d; return this; } };
      await require(ctrlYolu).getTesvikler({ query, user: kullanici }, res);
      return res.body.data.tesvikler.map((t) => t.durumBilgileri.genelDurum).sort();
    };

    test.each([
      ['Tesvik', Tesvik, '../../controllers/tesvikController'],
      ['YeniTesvik', YeniTesvik, '../../controllers/yeniTesvikController']
    ])('%s: ana liste kapananları göstermez, arşiv yalnız onları, "Kapandı" süzgeci her yerde çalışır', async (_ad, Model, yol) => {
      expect(await liste(Model, yol, { arsiv: '0' })).toEqual(['kapama_talepli', 'onaylandi', 'pasife_alindi']);
      expect(await liste(Model, yol, { arsiv: '1' })).toEqual(['kapandi']);
      expect(await liste(Model, yol, { arsiv: '0', durum: 'kapandi' })).toEqual(['kapandi']);
      expect(await liste(Model, yol, {})).toHaveLength(4);
    });
  });
});
