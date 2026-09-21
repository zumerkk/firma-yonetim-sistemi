// 🧪 Belge Takip — 21.09.2026 revizeleri, uçtan uca (bellek içi MongoDB + supertest)
//
// Müşteri istekleri:
//  - "Kapama taleplerini arşiv kısmının sol tarafına alabilir miyiz ayrı olarak?"
//  - "Sonuçlanma detaylarında 'Son İşlem Tarihi' görünmesin; sadece ... 'Sonuç Tarihi' ve işlemi
//    'Sonuçlandı' statüsüne aldığımız tarihler listelensin."
//  - "E-TUYS Takip" onay kutusu: işaretleyince o anın tarih/saati, yalnız 2. Kurum Değerlendirme.
//  - Durum geçmişi tarihleri düzeltilebilsin.
//  - İşlem & Evrak'taki mail şablonu Belge Takip firma mailinde de kullanılsın.

const express = require('express');
const request = require('supertest');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');

const mockKullanici = { _id: '0000000000000000000000aa', adSoyad: 'Seda Durak', rol: 'admin', yetkiler: {} };
jest.mock('../../middleware/auth', () => ({
  authenticate: (req, res, next) => {
    req.user = mockKullanici;
    next();
  }
}));

const dosyaTakipRoutes = require('../../routes/dosyaTakip');
const DosyaTakip = require('../../models/DosyaTakip');
const Firma = require('../../models/Firma');
const IslemTuru = require('../../models/IslemTuru');

jest.setTimeout(60000);

const { ObjectId } = mongoose.Types;
const firma = new ObjectId();
let mem;
let app;

const talep = (yama) => ({
  _id: new ObjectId(),
  firma,
  firmaUnvan: 'ÇINAR GIDA A.Ş.',
  talepTuru: 'Belge Başvuru Talebi',
  anaAsama: 'MURACAAT_ONCESI',
  durum: '2.1.1_GORUSULUYOR',
  aktif: true,
  createdAt: new Date('2026-09-01T08:00:00Z'),
  updatedAt: new Date('2026-09-20T08:00:00Z'),
  ...yama
});

const T = {
  anaListe: talep({ takipId: 'DT1' }),
  kapamaAktif: talep({ takipId: 'DT2', talepTuru: 'Belge Kapatma Revize Talebi', anaAsama: 'KURUM_DEGERLENDIRME', durum: '2.2.0_BASVURU_YAPILDI' }),
  kapamaSonuclanan: talep({ takipId: 'DT3', talepTuru: 'Belge Kapatma Revize Talebi', anaAsama: 'KURUM_SONUCLANMA', durum: '2.3.5_SONUCLANDI', sonuclanmaTarihi: new Date('2026-09-10T00:00:00Z') }),
  // Sonuçlanma tarihi damgası öncesinden kalma: tarih geçmişten okunmalı
  eskiSonuclanan: talep({
    takipId: 'DT4', anaAsama: 'KURUM_SONUCLANMA', durum: '2.3.6_BELGEYE_YANSITILDI',
    durumGecmisi: [
      { _id: new ObjectId(), yeniDurum: '2.3.5_SONUCLANDI', tarih: new Date('2026-08-05T10:00:00Z') },
      { _id: new ObjectId(), yeniDurum: '2.3.6_BELGEYE_YANSITILDI', tarih: new Date('2026-08-12T10:00:00Z') }
    ]
  }),
  // Firmaya iletildi, hiç Sonuçlandı'ya alınmadı: "son işlem" gösterilmemeli
  iletildi: talep({ takipId: 'DT5', anaAsama: 'KURUM_SONUCLANMA', durum: '2.3.1_SONUC_FIRMAYA_ILETILDI' }),
  degerlendirme: talep({ takipId: 'DT6', anaAsama: 'KURUM_DEGERLENDIRME', durum: '2.2.1.1_KURUM_BEKLENIYOR' })
};

beforeAll(async () => {
  mem = await MongoMemoryServer.create();
  await mongoose.connect(mem.getUri());
  await Firma.collection.insertOne({ _id: firma, firmaId: 'A000001', tamUnvan: 'ÇINAR GIDA A.Ş.', firmaEmail: 'info@cinar.test' });
  await DosyaTakip.collection.insertMany(Object.values(T));

  app = express();
  app.use(express.json());
  app.use('/api/dosya-takip', dosyaTakipRoutes);
});

afterAll(async () => {
  await mongoose.disconnect();
  if (mem) await mem.stop();
});

const liste = (sorgu = '') => request(app).get(`/api/dosya-takip${sorgu}`);
const takipIdleri = (r) => r.body.data.map((t) => t.takipId).sort();

describe('kapama talepleri ayrı görünüm', () => {
  test('ana liste kapama taleplerini göstermez', async () => {
    expect(takipIdleri(await liste())).toEqual(['DT1', 'DT6']);
  });

  test('kapama görünümü yalnız sonuçlanmamış kapama taleplerini gösterir', async () => {
    expect(takipIdleri(await liste('?kapama=1'))).toEqual(['DT2']);
  });

  test('arşiv sonuçlanan HER talebi gösterir (kapama dahil)', async () => {
    expect(takipIdleri(await liste('?arsiv=1'))).toEqual(['DT3', 'DT4', 'DT5']);
  });

  // Ana listede kapama türünü seçen boş liste görmesin
  test('talep türü seçilince o kazanır', async () => {
    expect(takipIdleri(await liste(`?talepTuru=${encodeURIComponent('Belge Kapatma Revize Talebi')}`))).toEqual(['DT2']);
  });

  // Dashboard kartı sayısıyla tutmalı
  test('dashboard "aktif" kapsamı türe bakmaz', async () => {
    expect(takipIdleri(await liste('?kapsam=aktif'))).toEqual(['DT1', 'DT2', 'DT3', 'DT4', 'DT5', 'DT6']);
  });
});

describe('Sonuçlanma sütunu', () => {
  test('sonuçlanma tarihi yoksa Sonuçlandı geçişinin tarihi gelir; son işlem tarihi gelmez', async () => {
    const r = await liste('?arsiv=1');
    const bul = (id) => r.body.data.find((t) => t.takipId === id);
    expect(bul('DT3').sonuclanmaTarihi).toBe('2026-09-10T00:00:00.000Z');
    // En son geçiş: Belgeye Yansıtıldı
    expect(bul('DT4').sonucaAlinmaTarihi).toBe('2026-08-12T10:00:00.000Z');
    expect(bul('DT5').sonuclanmaTarihi).toBeUndefined();
    expect(bul('DT5').sonucaAlinmaTarihi).toBeNull();
  });
});

describe('E-TUYS takip kutusu', () => {
  const isaretle = (id, isaretli) => request(app).patch(`/api/dosya-takip/${id}/etuys-takip`).send({ isaretli });

  test('işaretlenince o anın tarihi ve işaretleyen kaydedilir; updatedAt değişmez', async () => {
    const once = Date.now();
    const r = await isaretle(T.degerlendirme._id, true);
    expect(r.status).toBe(200);
    expect(r.body.data.isaretli).toBe(true);
    expect(r.body.data.kontrolEdenAdi).toBe('Seda Durak');
    expect(new Date(r.body.data.kontrolTarihi).getTime()).toBeGreaterThanOrEqual(once - 1000);
    const kayit = await DosyaTakip.findById(T.degerlendirme._id).lean();
    expect(kayit.updatedAt.toISOString()).toBe('2026-09-20T08:00:00.000Z');
  });

  test('işaret kaldırılınca son kontrol tarihi silinmez', async () => {
    const r = await isaretle(T.degerlendirme._id, false);
    expect(r.body.data.isaretli).toBe(false);
    expect(r.body.data.kontrolTarihi).toBeTruthy();
  });

  test('2. Kurum Değerlendirme dışındaki talepte reddedilir', async () => {
    const r = await isaretle(T.anaListe._id, true);
    expect(r.status).toBe(400);
    expect(r.body.message).toMatch(/Kurum Değerlendirme/);
  });
});

describe('durum geçmişi tarih düzeltme', () => {
  test('tarih düzelir ve otomatik damgalı sonuçlanma tarihi izler', async () => {
    // Gerçek akış: Sonuçlandı'ya geçiş damgayı aynı anda basar
    const gecisId = new ObjectId();
    const damga = new Date('2026-09-21T09:00:00.100Z');
    const id = new ObjectId();
    await DosyaTakip.collection.insertOne(talep({
      _id: id, takipId: 'DT7', anaAsama: 'KURUM_SONUCLANMA', durum: '2.3.5_SONUCLANDI', sonuclanmaTarihi: damga,
      durumGecmisi: [{ _id: gecisId, yeniDurum: '2.3.5_SONUCLANDI', tarih: new Date('2026-09-21T09:00:00.000Z') }]
    }));
    const r = await request(app).patch(`/api/dosya-takip/${id}/durum-gecmisi/${gecisId}`).send({ tarih: '2026-09-03T07:30:00.000Z' });
    expect(r.status).toBe(200);
    const g = r.body.data.durumGecmisi[0];
    expect(g.tarih).toBe('2026-09-03T07:30:00.000Z');
    expect(g.ilkTarih).toBe('2026-09-21T09:00:00.000Z');
    expect(g.tarihDuzenleyenAdi).toBe('Seda Durak');
    expect(r.body.data.sonuclanmaTarihi).toBe('2026-09-03T07:30:00.000Z');
  });

  test('geçersiz tarih okunur mesajla reddedilir', async () => {
    const id = T.eskiSonuclanan._id;
    const gid = T.eskiSonuclanan.durumGecmisi[0]._id;
    const r = await request(app).patch(`/api/dosya-takip/${id}/durum-gecmisi/${gid}`).send({ tarih: 'dün' });
    expect(r.status).toBe(400);
    expect(r.body.message).toMatch(/Geçerli bir tarih/);
  });
});

describe('firma maili — İşlem & Evrak şablonu', () => {
  beforeAll(async () => {
    await IslemTuru.collection.insertMany([
      {
        ad: 'SGK Desteği Yararlanıcı Bilgileri', kod: 'sgk', aktif: true, updatedAt: new Date('2026-09-19T00:00:00Z'),
        mailGovdesi: 'Sayın {firmaAdi} Yetkilisi,\n\nSGK bilgi notu ektedir.\n\n{imza}'
      },
      {
        ad: 'Yeni Belge Talebi', kod: 'yeni', aktif: true, updatedAt: new Date('2026-09-18T00:00:00Z'),
        mailGovdesi: 'Sayın {firmaAdi} Yetkilisi,\n\nİstediğimiz evraklar:\n\n{evrakListesi}\n\n{uploadLink}\n\n{imza}'
      },
      { ad: 'Pasif', kod: 'pasif', aktif: false, mailGovdesi: '{evrakListesi}' }
    ]);
    await DosyaTakip.updateOne({ _id: T.anaListe._id }, {
      $set: { 'muraacatSonrasi.kurumEksik.firmadanBeklenen.beklenenEksikler': [{ metin: 'Vergi levhası', tarih: new Date() }] }
    });
  });

  const taslak = (sorgu = '') => request(app).get(`/api/dosya-takip/${T.anaListe._id}/firma-mail-taslak${sorgu}`);

  test('varsayılan: evrak listesi içeren şablon; metin şablondan, konu Belge Takip kuralından', async () => {
    const r = await taslak();
    expect(r.status).toBe(200);
    expect(r.body.data.sablonlar.map((s) => s.ad)).toEqual(['SGK Desteği Yararlanıcı Bilgileri', 'Yeni Belge Talebi']);
    expect(r.body.data.sablonlar.find((s) => s._id === r.body.data.sablonId).ad).toBe('Yeni Belge Talebi');
    // Bağlantının kökü FRONTEND_URL'den gelir (testte tanımsız → göreli yol)
    expect(r.body.data.govde).toMatch(/^Sayın ÇINAR GIDA A\.Ş\. Yetkilisi,\n\nİstediğimiz evraklar:\n\n1\. Vergi levhası\n\n(https?:\/\/\S+)?\/belge-yukle\/\S+\n\n/);
    expect(r.body.data.konu).toBe('Belge Başvuru Talebi — ÇINAR GIDA A.Ş.');
  });

  test('"standart" eski Belge Takip metnini verir', async () => {
    const r = await taslak('?sablon=standart');
    expect(r.body.data.sablonId).toBe('standart');
    expect(r.body.data.govde).toMatch(/^Sayın Yetkili,/);
  });

  test('artık olmayan şablon istenirse varsayılana düşer', async () => {
    const r = await taslak(`?sablon=${new ObjectId()}`);
    expect(r.body.data.sablonlar.find((s) => s._id === r.body.data.sablonId).ad).toBe('Yeni Belge Talebi');
  });

  test('başka bir şablon seçilebilir', async () => {
    const sgk = (await taslak()).body.data.sablonlar[0];
    const r = await taslak(`?sablon=${sgk._id}`);
    expect(r.body.data.sablonId).toBe(sgk._id);
    expect(r.body.data.govde).toMatch(/SGK bilgi notu/);
  });
});
