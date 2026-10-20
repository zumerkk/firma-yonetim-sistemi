// 🧪 Cari hesap API — uçtan uca (bellek içi MongoDB + supertest)
//
// Para verisi: bakiyenin, firma bağının ve hata mesajlarının gerçek HTTP akışında
// doğru çıktığını burada kanıtlıyoruz. Dosya yükleme (Cloudinary) bu testin dışında;
// JSON gövdede multer devreye girmiyor.

const express = require('express');
const request = require('supertest');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');

const mockKullanici = { _id: '0000000000000000000000aa', adSoyad: 'Test Danışman', rol: 'admin', yetkiler: {} };
jest.mock('../../middleware/auth', () => ({
  ...jest.requireActual('../../middleware/auth'),
  authenticate: (req, res, next) => {
    req.user = mockKullanici;
    next();
  }
}));

const cariRoutes = require('../../routes/cari');
const CariHareket = require('../../models/CariHareket');
const DosyaTakip = require('../../models/DosyaTakip');
const Firma = require('../../models/Firma');

jest.setTimeout(60000);

const { ObjectId } = mongoose.Types;
const firmaA = new ObjectId();
const firmaB = new ObjectId();
const talepA = new ObjectId();

let mem;
let app;

beforeAll(async () => {
  mem = await MongoMemoryServer.create();
  await mongoose.connect(mem.getUri());

  // Firma/talep modellerinin kancaları (otomatik kimlik vb.) bu testin konusu değil
  await Firma.collection.insertMany([
    { _id: firmaA, firmaId: 'A000001', tamUnvan: 'ÇINAR GIDA A.Ş.' },
    { _id: firmaB, firmaId: 'A000002', tamUnvan: 'CAN METAL LTD. ŞTİ.' }
  ]);
  await DosyaTakip.collection.insertOne({
    _id: talepA,
    takipId: 'DT2026999',
    firma: firmaA,
    firmaUnvan: 'ÇINAR GIDA A.Ş.',
    talepTuru: 'Belge Başvuru Talebi',
    aktif: true,
    createdAt: new Date()
  });

  app = express();
  app.use(express.json());
  app.use('/api/cari', cariRoutes);
});

afterAll(async () => {
  await mongoose.disconnect();
  if (mem) await mem.stop();
});

beforeEach(async () => {
  await CariHareket.deleteMany({});
  await Firma.collection.updateMany({}, { $unset: { cariDurumu: '' } });
});

const ekle = (govde) => request(app).post('/api/cari').send(govde);

describe('Hizmete dahil ödemeler ve ortak firma cari durumu', () => {
  test('nominal tutar saklanır; talep, firma ve liste hesapları sıfır etkiyle tutarlıdır', async () => {
    const r = await ekle({ dosyaTakip: String(talepA), tur: 'odenen', belgeAdi: 'Harç',
      tarih: '2026-10-17', tutar: '1.500,75', hizmeteDahil: true });
    expect(r.status).toBe(201);
    expect(r.body.data).toMatchObject({ tutar: 1500.75, hizmeteDahil: true });
    const kimlik = r.body.data._id;
    const oku = async (beklenen) => {
      const talep = (await request(app).get(`/api/cari/talep/${talepA}`)).body.data;
      const firma = (await request(app).get(`/api/cari/firma/${firmaA}`)).body.data;
      const liste = (await request(app).get('/api/cari/firmalar')).body.data.find((f) => f.firma === String(firmaA));
      expect(talep.ozet.toplamOdenen).toBe(beklenen);
      expect(talep.ozet.fark).toBe(beklenen ? -beklenen : 0);
      expect(firma.ozet.bakiye).toBe(beklenen);
      expect(firma.hareketler[0]).toMatchObject({ tutar: 1500.75, cariyeEtki: beklenen, bakiye: beklenen });
      expect(liste).toMatchObject({ bakiye: beklenen, toplamOdenen: beklenen, adet: 1 });
    };
    await oku(0);
    // Multipart, belge düzenleme formuyla aynı boolean metin aktarımını kullanır.
    expect((await request(app).put(`/api/cari/${kimlik}`).field('hizmeteDahil', 'false')).status).toBe(200);
    await oku(1500.75);
    expect((await request(app).put(`/api/cari/${kimlik}`).send({ hizmeteDahil: true })).status).toBe(200);
    await oku(0);
    expect((await CariHareket.findById(kimlik).lean()).tutar).toBe(1500.75);
  });

  test('gelen ödeme hizmete dahil gönderilse bile cariden düşer; geçersiz seçim reddedilir', async () => {
    const r = await ekle({ firma: String(firmaA), tur: 'gelen', banka: 'Garanti',
      tarih: '2026-10-17', tutar: 100, hizmeteDahil: true });
    expect(r.status).toBe(201);
    expect(r.body.data.hizmeteDahil).toBe(false);
    expect((await request(app).get(`/api/cari/firma/${firmaA}`)).body.data.ozet.bakiye).toBe(-100);
    expect((await request(app).put(`/api/cari/${r.body.data._id}`).send({ hizmeteDahil: 'belki' })).status).toBe(400);
  });

  test('alanı olmayan eski firma açık; kapandı seçimi firma, talep ve listeye kalıcı yansır', async () => {
    const oku = async (durum) => {
      expect((await request(app).get(`/api/cari/firma/${firmaA}`)).body.data.firma.cariDurumu).toBe(durum);
      expect((await request(app).get(`/api/cari/talep/${talepA}`)).body.data.firma.cariDurumu).toBe(durum);
      const liste = (await request(app).get('/api/cari/firmalar')).body.data;
      expect(liste.find((f) => f.firma === String(firmaA)).cariDurumu).toBe(durum);
    };
    await oku('acik');
    const uri = `/api/cari/firma/${firmaA}/durum`;
    expect((await request(app).put(uri).send({ cariDurumu: 'kapandi' })).status).toBe(200);
    expect((await Firma.collection.findOne({ _id: firmaA })).cariDurumu).toBe('kapandi');
    await oku('kapandi');
    expect((await request(app).put(uri).send({ cariDurumu: 'acik' })).status).toBe(200);
    await oku('acik');
    expect((await request(app).put(uri).send({ cariDurumu: 'bilinmiyor' })).status).toBe(400);
    expect((await request(app).put(`/api/cari/firma/${new ObjectId()}/durum`).send({ cariDurumu: 'acik' })).status).toBe(404);
  });
});

describe('Ödemeler sekmesi (talebe bağlı mini cari)', () => {
  test('talepten girilen ödeme firmayı talepten alır, kullanıcı yazımını anlar', async () => {
    const r = await ekle({ dosyaTakip: String(talepA), tur: 'gelen', banka: 'Enpara', tarih: '15.09.2026', tutar: '24.000,50' });
    expect(r.status).toBe(201);
    expect(r.body.data).toMatchObject({
      firma: String(firmaA), firmaUnvan: 'ÇINAR GIDA A.Ş.', dosyaTakip: String(talepA),
      tutar: 24000.5, banka: 'Enpara', olusturanAdi: 'Test Danışman'
    });
    expect(r.body.data.tarih).toBe('2026-09-15T00:00:00.000Z');
  });

  test('istemcinin gönderdiği başka firma kabul edilmez', async () => {
    const r = await ekle({ dosyaTakip: String(talepA), firma: String(firmaB), tur: 'gelen', banka: 'Enpara', tarih: '2026-09-15', tutar: 10 });
    expect(r.status).toBe(400);
    expect(r.body.message).toMatch(/bu firmaya ait değil/);
  });

  test('defter: kayıtlar alta eklenir, fark = gelen − giden', async () => {
    await ekle({ dosyaTakip: String(talepA), tur: 'odenen', belgeAdi: 'Belge harcı', tarih: '2026-09-01', tutar: 2500 });
    await ekle({ dosyaTakip: String(talepA), tur: 'gelen', banka: 'Ziraat', tarih: '2026-09-10', tutar: 10000 });

    const r = await request(app).get(`/api/cari/talep/${talepA}`);
    expect(r.status).toBe(200);
    expect(r.body.data.ozet).toMatchObject({ toplamGelen: 10000, toplamOdenen: 2500, fark: 7500, adet: 2 });
    expect(r.body.data.hareketler.map((h) => h.tur)).toEqual(['odenen', 'gelen']);
  });

  test('olmayan talep 404', async () => {
    expect((await request(app).get(`/api/cari/talep/${new ObjectId()}`)).status).toBe(404);
  });
});

describe('Hatalar okunur, veri bozulmaz', () => {
  test('bankasız gelen ödeme', async () => {
    const r = await ekle({ firma: String(firmaA), tur: 'gelen', tarih: '2026-09-15', tutar: 5 });
    expect(r.status).toBe(400);
    expect(r.body.message).toBe('Banka seçimi zorunludur');
  });

  // "1234.567" binlik mi ondalık mı belli değil: 0'a ya da bin kat yanlış tutara çevrilmemeli
  test('anlaşılamayan tutar kaydedilmez', async () => {
    const r = await ekle({ firma: String(firmaA), tur: 'gelen', banka: 'Garanti', tarih: '2026-09-15', tutar: '1234.567' });
    expect(r.status).toBe(400);
    expect(r.body.message).toMatch(/Tutar anlaşılamadı/);
    expect(await CariHareket.countDocuments()).toBe(0);
  });

  test('31 Şubat gibi tarih reddedilir', async () => {
    const r = await ekle({ firma: String(firmaA), tur: 'gelen', banka: 'Garanti', tarih: '31.02.2026', tutar: 5 });
    expect(r.status).toBe(400);
    expect(r.body.message).toMatch(/Tarih anlaşılamadı/);
  });

  test('firma da talep de yoksa', async () => {
    const r = await ekle({ tur: 'gelen', banka: 'Garanti', tarih: '2026-09-15', tutar: 5 });
    expect(r.status).toBe(400);
    expect(r.body.message).toBe('Firma seçimi zorunludur');
  });

  test('bozuk kimlik 400 döner, 500 değil', async () => {
    expect((await request(app).get('/api/cari/firma/bozuk-id')).status).toBe(400);
  });
});

describe('Cari hesaplar modülü (firma bazlı)', () => {
  test('Ödemeler seçimi aktif ve arşiv tüm talepleri sınır olmadan getirir; silinen ve başka firmayı dışlar', async () => {
    const firmaC = new ObjectId();
    await Firma.collection.insertOne({ _id: firmaC, tamUnvan: 'TALEP SEÇİM FİRMASI' });
    const talepler = Array.from({ length: 302 }, (_, i) => ({
      _id: new ObjectId(), takipId: `SECIM-${i}`, firma: firmaC, aktif: true,
      anaAsama: i % 2 ? 'MURACAAT_ONCESI' : 'KURUM_SONUCLANMA',
      ytbNo: `YTB-${i}`, talepTuru: 'Belge Revize Talebi', createdAt: new Date(2026, 0, 1, 0, i)
    }));
    await DosyaTakip.collection.insertMany([...talepler, {
      firma: firmaC, takipId: 'SILINEN', aktif: false
    }]);
    try {
      const r = await request(app).get(`/api/cari/firma/${firmaC}/talepler`);
      expect(r.status).toBe(200);
      expect(r.body.data.firma.tamUnvan).toBe('TALEP SEÇİM FİRMASI');
      expect(r.body.data.talepler).toHaveLength(302);
      expect(r.body.data.talepler[0]).toMatchObject({ takipId: 'SECIM-301', ytbNo: 'YTB-301' });
      expect(new Set(r.body.data.talepler.map((t) => t.anaAsama))).toEqual(new Set(['MURACAAT_ONCESI', 'KURUM_SONUCLANMA']));
      expect(r.body.data.talepler.every((t) => t.takipId.startsWith('SECIM-'))).toBe(true);
      expect((await request(app).get(`/api/cari/firma/${firmaB}/talepler`)).body.data.talepler).toEqual([]);
      expect((await request(app).get('/api/cari/firma/bozuk-id/talepler')).status).toBe(400);
      expect((await request(app).get(`/api/cari/firma/${new ObjectId()}/talepler`)).status).toBe(404);
    } finally {
      await DosyaTakip.collection.deleteMany({ firma: firmaC });
      await Firma.collection.deleteOne({ _id: firmaC });
    }
  });

  test('firma defteri talebe bağlı ve bağsız hareketleri birlikte, bakiyeyle gösterir', async () => {
    await ekle({ firma: String(firmaA), tur: 'fatura', faturaNo: 'GM2026-15', tarih: '2026-01-12', tutar: 24000 });
    await ekle({ dosyaTakip: String(talepA), tur: 'odenen', belgeAdi: 'Harç makbuzu', tarih: '2026-01-13', tutar: 1500 });
    await ekle({ firma: String(firmaA), tur: 'gelen', banka: 'Garanti', tarih: '2026-02-01', tutar: 25500 });

    const r = await request(app).get(`/api/cari/firma/${firmaA}`);
    expect(r.status).toBe(200);
    const { firma, hareketler, ozet, talepler } = r.body.data;
    expect(firma.tamUnvan).toBe('ÇINAR GIDA A.Ş.');
    // Müşterinin Excel formülü: TUTAR + MAKBUZ/DEKONT − ÖDEME GELEN
    expect(ozet).toMatchObject({ toplamFatura: 24000, toplamOdenen: 1500, toplamGelen: 25500, bakiye: 0 });
    expect(hareketler.map((h) => h.bakiye)).toEqual([24000, 25500, 0]);
    expect(hareketler[1].dosyaTakip.takipId).toBe('DT2026999');
    expect(talepler.map((t) => t.takipId)).toEqual(['DT2026999']);
  });

  test('cari hesaplar listesi firma başına bakiye, Türkçe sırayla', async () => {
    await ekle({ firma: String(firmaA), tur: 'fatura', tarih: '2026-01-12', tutar: 1000 });
    await ekle({ firma: String(firmaB), tur: 'fatura', tarih: '2026-01-12', tutar: 300 });
    await ekle({ firma: String(firmaB), tur: 'gelen', banka: 'Vakıf', tarih: '2026-03-01', tutar: 100 });

    const r = await request(app).get('/api/cari/firmalar');
    expect(r.status).toBe(200);
    expect(r.body.data.map((f) => [f.firmaUnvan, f.bakiye])).toEqual([
      ['CAN METAL LTD. ŞTİ.', 200],
      ['ÇINAR GIDA A.Ş.', 1000]
    ]);
  });

  // Müşteri (05.10.2026): "hareketi olan firmalar değil de Belge Takip'deki bütün firmalar gelsin
  // aktif-arşiv ikisi de" + fatura durumu
  test('hareketi olmayan ama Belge Takip\'te talebi olan firma da listede, fatura durumuyla', async () => {
    const firmaC = new ObjectId();
    await Firma.collection.insertOne({ _id: firmaC, firmaId: 'A000003', tamUnvan: 'DENİZ TEKSTİL A.Ş.' });
    await DosyaTakip.collection.insertMany([
      // arşivdeki (sonuçlanmış) talep de sayılır
      { takipId: 'DT2026901', firma: firmaC, firmaUnvan: 'DENİZ TEKSTİL A.Ş.', talepTuru: 'Belge Başvuru Talebi',
        aktif: true, anaAsama: 'KURUM_SONUCLANMA', odeme: { faturaDurumu: 'kesildi' }, createdAt: new Date() },
      { takipId: 'DT2026902', firma: firmaC, firmaUnvan: 'DENİZ TEKSTİL A.Ş.', talepTuru: 'Belge Revize Talebi',
        aktif: true, anaAsama: 'MURACAAT_ONCESI', odeme: { faturaDurumu: 'avans' }, createdAt: new Date() },
      // silinmiş talep sayılmaz
      { takipId: 'DT2026903', firma: firmaC, firmaUnvan: 'DENİZ TEKSTİL A.Ş.', talepTuru: 'Belge Revize Talebi',
        aktif: false, odeme: { faturaDurumu: 'kesilmedi' }, createdAt: new Date() }
    ]);
    try {
      const r = await request(app).get('/api/cari/firmalar');
      expect(r.status).toBe(200);
      const deniz = r.body.data.find((f) => f.firmaUnvan === 'DENİZ TEKSTİL A.Ş.');
      expect(deniz).toMatchObject({ bakiye: 0, toplamOdenen: 0, talepSayisi: 2,
        faturaDurumlari: { kesildi: 1, avans: 1, kesilmedi: 0, bos: 0 } });
      // hareketi olmayan ÇINAR da talebi (DT2026999) sayesinde listede
      expect(r.body.data.find((f) => f.firmaUnvan === 'ÇINAR GIDA A.Ş.')).toMatchObject({ talepSayisi: 1, bakiye: 0 });
    } finally {
      await DosyaTakip.collection.deleteMany({ firma: firmaC });
      await Firma.collection.deleteOne({ _id: firmaC });
    }
  });

  test('düzeltme: tutar ve talep bağı değişir, tür değişmez', async () => {
    const { body } = await ekle({ firma: String(firmaA), tur: 'gelen', banka: 'Garanti', tarih: '2026-02-01', tutar: 100 });
    const r = await request(app).put(`/api/cari/${body.data._id}`)
      .send({ tutar: '150,75', dosyaTakip: String(talepA), tur: 'fatura' });
    expect(r.status).toBe(200);
    expect(r.body.data).toMatchObject({ tutar: 150.75, dosyaTakip: String(talepA), tur: 'gelen', sonGuncelleyenAdi: 'Test Danışman' });
  });

  test('başka firmanın talebine bağlanamaz', async () => {
    const { body } = await ekle({ firma: String(firmaB), tur: 'fatura', tarih: '2026-02-01', tutar: 100 });
    const r = await request(app).put(`/api/cari/${body.data._id}`).send({ dosyaTakip: String(talepA) });
    expect(r.status).toBe(400);
  });

  test('silme', async () => {
    const { body } = await ekle({ firma: String(firmaA), tur: 'fatura', tarih: '2026-02-01', tutar: 100 });
    expect((await request(app).delete(`/api/cari/${body.data._id}`)).status).toBe(200);
    expect(await CariHareket.countDocuments()).toBe(0);
    expect((await request(app).delete(`/api/cari/${body.data._id}`)).status).toBe(404);
  });
});
