const express = require('express');
const request = require('supertest');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const DosyaTakip = require('../../models/DosyaTakip');
const IslemTalebi = require('../../models/IslemTalebi');
const Notification = require('../../models/Notification');
require('../../models/Firma');
require('../../models/User');
const ctrl = require('../../controllers/dosyaTakipController');
const islemCtrl = require('../../controllers/islemEvrakController');
const svc = require('../../services/islemEvrak/islemEvrakService');
const mail = require('../../services/tesvikMakine/mailService');
const { bildirimHedefleri } = require('../../services/dosyaTakip/firmaYukleme');

jest.setTimeout(60000);
const { ObjectId } = mongoose.Types;
const ben = new ObjectId(), ek = new ObjectId(), gonderen = new ObjectId(), firma = new ObjectId();
let mem, app;
const temel = (alanlar = {}) => ({ firma, firmaId: 'A1', firmaUnvan: 'Test Firma', talepTuru: 'Belge Başvuru Talebi',
  ytbNo: '568289', olusturanKullanici: ben, ...alanlar });
beforeAll(async () => {
  mem = await MongoMemoryServer.create(); await mongoose.connect(mem.getUri()); await DosyaTakip.init();
  app = express(); app.use(express.json());
  app.use((req, _res, next) => { req.user = { _id: ben, adSoyad: 'Test', email: 'test@example.test', rol: 'admin' }; next(); });
  app.post('/talepler', ctrl.yeniTalepOlustur); app.put('/talepler/:id', ctrl.talepGuncelle);
  app.patch('/talepler/:id/durum', ctrl.durumDegistir); app.delete('/talepler/:id/not', ctrl.notSil);
  app.get('/son', ctrl.sonIslemler);
  app.get('/benim', ctrl.benimIslerim);
});
afterAll(async () => { await mongoose.disconnect(); await mem?.stop(); });
beforeEach(async () => { await Promise.all([DosyaTakip.deleteMany({}), IslemTalebi.deleteMany({}), Notification.deleteMany({})]); });
afterEach(() => jest.restoreAllMocks());

test('atanan takipçiler önceliklidir; atama yoksa yalnız son maili gönderene gider', () => {
  const mailler = [{ gonderen: ben, tarih: '2026-10-10' }, { gonderen, tarih: '2026-10-01' }];
  expect(bildirimHedefleri({ muraacatSonrasi: { takibiYapanPersonel: ben, ekTakipEdenler: [ek, ben] }, firmaMailleri: mailler }))
    .toEqual([String(ben), String(ek)]);
  expect(bildirimHedefleri({ firmaMailleri: mailler })).toEqual([String(ben)]);
  expect(bildirimHedefleri({ olusturanKullanici: gonderen })).toEqual([String(gonderen)]);
});

test('SMTP kesintisinde dosya ve kişisel uygulama bildirimi yine kaydedilir', async () => {
  const takip = await DosyaTakip.create(temel({ muraacatSonrasi: { takibiYapanPersonel: ben } }));
  const talep = await IslemTalebi.create({ firma, islemTuru: new ObjectId(), dosyaTakip: takip._id,
    firmaAdi: 'Test', uploadToken: 'smtp-test', istenenEvraklar: [{ ad: 'Vergi Levhası' }] });
  jest.spyOn(svc, 'dosyaKaydet').mockResolvedValue({ dosyaAdi: 'vergi.pdf', filePath: 'fake' });
  jest.spyOn(svc, 'yuklemeBildirimAlicilari').mockResolvedValue({ kullaniciIdleri: [String(ben)], adresler: ['test@example.test'] });
  jest.spyOn(mail, 'isConfigured').mockReturnValue(true);
  jest.spyOn(mail, 'sendMail').mockRejectedValue(new Error('SMTP kesintisi'));
  jest.spyOn(console, 'error').mockImplementation(() => {});
  const res = { status(c) { this.code = c; return this; }, json(body) { this.body = body; return this; } };
  await islemCtrl.publicYukle({ params: { token: 'smtp-test' }, body: { istenenEvrakId: String(talep.istenenEvraklar[0]._id) },
    uploadedFiles: [{ originalname: 'vergi.pdf', buffer: Buffer.from('pdf') }] }, res);
  expect(res.body.success).toBe(true);
  expect((await IslemTalebi.findById(talep._id)).yuklenenEvraklar).toHaveLength(1);
  expect(await Notification.countDocuments({ userId: ben })).toBe(1);
});

test('aynı açık talep eşzamanlı istek veya override ile ikinci kez açılamaz', async () => {
  const yanitlar = await Promise.all([request(app).post('/talepler').send(temel()), request(app).post('/talepler').send(temel({ mukerrereIzinVer: true }))]);
  expect(yanitlar.map((r) => r.status).sort()).toEqual([201, 409]);
  const r = await request(app).post('/talepler').send(temel({ mukerrereIzinVer: true }));
  expect(r.status).toBe(409); expect(r.body.kod).toBe('MUKERRER_ACIK_TALEP');
  expect(await DosyaTakip.countDocuments()).toBe(1);
});

test('unique anahtar, takip numaraları farklı eşzamanlı model kayıtlarını da engeller', async () => {
  const sonuclar = await Promise.allSettled([DosyaTakip.create(temel({ takipId: 'ESZAMANLI1' })),
    DosyaTakip.create(temel({ takipId: 'ESZAMANLI2' }))]);
  expect(sonuclar.filter((s) => s.status === 'fulfilled')).toHaveLength(1);
  expect(sonuclar.find((s) => s.status === 'rejected').reason).toMatchObject({ code: 11000, keyPattern: { acikTalepAnahtari: 1 } });
});

test('atama yokken maili gönderenin Dashboardında doğrudan firma linkinden gelen dosya görünür', async () => {
  await DosyaTakip.create(temel({ olusturanKullanici: gonderen,
    firmaMailleri: [{ gonderen: ben, konu: 'Talep', govde: 'Evrak', tarih: new Date() }],
    dosyalar: [{ dosyaAdi: 'gelen.pdf', dosyaYolu: 'fake', firmaYukledi: true }] }));
  const r = await request(app).get('/benim');
  expect(r.status).toBe(200);
  expect(r.body.data.sonYuklemeler.map((d) => d.dosyaAdi)).toEqual(['gelen.pdf']);
});

test('sonuçlanan talep yeni başvuruyu engellemez; açık kopya varken tekrar açılamaz', async () => {
  const eski = await DosyaTakip.create(temel({ durum: '2.3.6_BELGEYE_YANSITILDI', anaAsama: 'KURUM_SONUCLANMA' }));
  expect((await request(app).post('/talepler').send(temel())).status).toBe(201);
  expect((await request(app).patch(`/talepler/${eski._id}/durum`).send({ yeniDurum: '2.1.1_GORUSULUYOR' })).status).toBe(409);
  expect((await DosyaTakip.findById(eski._id)).durum).toBe('2.3.6_BELGEYE_YANSITILDI');
});

test('eski anahtarsız açık kayıt da engellenir; başka talep aynı belgeye çevrilemez', async () => {
  await DosyaTakip.collection.insertOne({ ...temel(), takipId: 'ESKI', durum: '2.1.1_GORUSULUYOR', anaAsama: 'MURACAAT_ONCESI', aktif: true });
  expect((await request(app).post('/talepler').send(temel())).status).toBe(409);
  const diger = await DosyaTakip.create(temel({ ytbNo: '999' }));
  expect((await request(app).put(`/talepler/${diger._id}`).send({ ytbNo: '568289' })).status).toBe(409);
  expect((await DosyaTakip.findById(diger._id)).ytbNo).toBe('999');
});

test('canlıdaki eski mükerrerler sparse index kurulmasını veya not düzenlemeyi engellemez', async () => {
  await DosyaTakip.collection.dropIndex('acikTalepAnahtari_1');
  try {
    await DosyaTakip.collection.insertMany([1, 2].map((i) => ({ ...temel(), takipId: `ESKI${i}`,
      durum: '2.1.1_GORUSULUYOR', anaAsama: 'MURACAAT_ONCESI', aktif: true })));
    await DosyaTakip.collection.createIndex({ acikTalepAnahtari: 1 }, { unique: true, sparse: true });
    const kayit = await DosyaTakip.findOne({ takipId: 'ESKI1' });
    kayit.genelNotlar.push({ metin: 'Mevcut kayıt düzenlenebilir' }); await kayit.save();
    expect(await DosyaTakip.countDocuments()).toBe(2);
    expect(await DosyaTakip.countDocuments({ acikTalepAnahtari: { $exists: true } })).toBe(0);
    expect((await request(app).post('/talepler').send(temel())).status).toBe(409);
  } finally {
    await DosyaTakip.collection.createIndex({ acikTalepAnahtari: 1 }, { unique: true, sparse: true });
  }
});

test('açık talep sonuçlanınca unique anahtarı bırakılır ve yeni talep açılabilir', async () => {
  const ilk = (await request(app).post('/talepler').send(temel())).body.data;
  expect(await DosyaTakip.countDocuments({ acikTalepAnahtari: { $exists: true } })).toBe(1);
  await request(app).patch(`/talepler/${ilk._id}/durum`).send({ yeniDurum: '2.3.6_BELGEYE_YANSITILDI' }).expect(200);
  expect(await DosyaTakip.countDocuments({ acikTalepAnahtari: { $exists: true } })).toBe(0);
  await request(app).post('/talepler').send(temel()).expect(201);
});

test('son not/dosya silinse de Dashboard değişiklik zamanı korunur ve sayaç sıfırlanır', async () => {
  const t = await DosyaTakip.create(temel({ genelNotlar: [{ metin: 'eski', tarih: new Date('2026-01-01') }],
    dosyalar: [{ dosyaAdi: 'x.pdf', dosyaYolu: 'fake', yuklemeTarihi: new Date('2026-01-01') }] }));
  const baslangic = Date.now();
  await request(app).delete(`/talepler/${t._id}/not`).send({ notId: String(t.genelNotlar[0]._id) }).expect(200);
  const guncel = await DosyaTakip.findById(t._id); guncel.dosyalar = []; await guncel.save();
  const son = (await request(app).get('/son')).body.data[0];
  expect(son.notSayisi).toBe(0); expect(son.dosyaSayisi).toBe(0);
  expect(new Date(son.notZamani).getTime()).toBeGreaterThanOrEqual(baslangic);
  expect(new Date(son.dosyaZamani).getTime()).toBeGreaterThanOrEqual(baslangic);
});

test('eski talebin bağlı İşlem & Evrak yüklemesi özeti ilk sıraya taşır, içeriği göstermez', async () => {
  const eski = await DosyaTakip.create(temel());
  await DosyaTakip.collection.updateOne({ _id: eski._id }, { $set: { createdAt: new Date('2020-01-01'), updatedAt: new Date('2020-01-01') } });
  for (let i = 0; i < 4; i += 1) await DosyaTakip.create(temel({ ytbNo: String(i + 1) }));
  await IslemTalebi.create({ firma, islemTuru: new ObjectId(), dosyaTakip: eski._id,
    yuklenenEvraklar: [{ dosyaAdi: 'gizli.pdf', yuklemeTarihi: new Date(Date.now() + 1000) }],
    istenenEvraklar: [{ ad: 'Vergi Levhası', yuklenememeNedeni: 'gizli neden', nedenBildirimTarihi: new Date() }] });
  const r = await request(app).get('/son?limit=1');
  expect(r.status).toBe(200); expect(r.body.data[0]._id).toBe(String(eski._id));
  expect(r.body.data[0]).toMatchObject({ dosyaSayisi: 1, notSayisi: 1 });
  expect(JSON.stringify(r.body)).not.toMatch(/gizli.pdf|gizli neden/);
});
