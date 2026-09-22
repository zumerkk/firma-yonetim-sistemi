// 🧪 Ekipman Takip — toplu link yüklemesi tek "ortak" satır, toplu mail her makinede
//
// Müşteri (21.09.2026, ekipman takip):
//  · "Toplu link üzerinden dosya yükleyince bütün makineler için ayrı ayrı yüklenmiş gibi görünüyor.
//     Bunu istenen makineler için tek/ortak bir yükleme gibi gösterme şansımız var mı?"
//  · "Toplu mail gönderirken 'son mail' kısmı sadece ilk seçtiğimiz kayıtta çıkıyor ve hepsinde
//     evrak sayısı 0 görünüyor."
// Canlıda ölçüldü (17.09, belge ..2817): 3 makinelik toplu mail yalnız 1. makinede kayıtlı; linke
// yüklenen 3 dosya 9 ayrı evrak satırı olmuş.

const os = require('os');
const path = require('path');
const fs = require('fs-extra');

const TMP = path.join(os.tmpdir(), 'ortak-yukleme-jest-' + Date.now());
process.env.TESVIK_UPLOAD_DIR = TMP;
delete process.env.SMTP_HOST;
delete process.env.SMTP_USER;
delete process.env.CLOUDINARY_STORAGE_ENABLED;

const express = require('express');
const request = require('supertest');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const { ObjectId } = mongoose.Types;

const mps = require('../../services/tesvikMakine/machineProcessService');
const mailService = require('../../services/tesvikMakine/mailService');
const toplu = require('../../services/tesvikMakine/topluYuklemeService');
const { kopyaGruplari, evraklariGrupla } = require('../../services/tesvikMakine/ortakYukleme');
const ctrl = require('../../controllers/tesvikMakineController');
const MachineProcess = require('../../models/MachineProcess');
const MachineProcessLog = require('../../models/MachineProcessLog');
const MailLog = require('../../models/MailLog');
const UploadedDocument = require('../../models/UploadedDocument');
const DocumentFolder = require('../../models/DocumentFolder');
const TopluYuklemeBaglantisi = require('../../models/TopluYuklemeBaglantisi');

jest.setTimeout(60000);

let mem;
let app;
const tesvikId = new ObjectId();
const user = { _id: new ObjectId(), adSoyad: 'Test Danışman', email: 't@t.com', rol: 'admin' };
const hedef = (rowId) => ({ tesvikModel: 'Tesvik', tesvikId, listType: 'local', rowId });

const satir = (rowId, siraNo, makineId, adi) => ({
  rowId, siraNo, makineId, gtipKodu: '901812000000', adiVeOzelligi: adi, miktar: 1, birim: 'ADET',
  birimFiyatiTl: 1000, toplamTutariTl: 1000, kdvIstisnasi: 'EVET'
});

beforeAll(async () => {
  mem = await MongoMemoryServer.create();
  await mongoose.connect(mem.getUri());
  await mongoose.connection.collection('tesviks').insertOne({
    _id: tesvikId,
    tesvikId: 'TES-568289', gmId: 'GM1', firmaId: 'F1',
    yatirimciUnvan: 'GLOBTEKS TEKSTİL A.Ş.',
    belgeYonetimi: { belgeNo: '568289', belgeId: '1047603', belgeTarihi: new Date('2026-01-15') },
    makineListeleri: {
      yerli: [
        satir('r1', 1, '2339380', 'SU ARITMA'),
        satir('r2', 2, '2339381', 'ISITMA FIRINI'),
        satir('r3', 3, '2339382', 'VİDALI KOMPRESÖR')
      ],
      ithal: []
    }
  });

  app = express();
  app.use(express.json());
  app.use((req, _res, next) => { req.user = user; next(); });
  app.get('/docs/:tesvikModel/:tesvikId', ctrl.getCertificateDocuments);
  app.get('/mails/:tesvikModel/:tesvikId', ctrl.getCertificateMails);
  app.delete('/document/:id', ctrl.deleteDocument);
  app.post('/bulk/mail/send', ctrl.bulkMailSend);
  app.get('/process/:id', ctrl.getProcess);
  app.use('/api/tesvik-evrak', require('../../routes/tesvikEvrakUpload'));
});

afterAll(async () => {
  jest.restoreAllMocks();
  await mongoose.disconnect();
  if (mem) await mem.stop();
  await fs.remove(TMP);
});

beforeEach(async () => {
  await Promise.all([
    MachineProcess.deleteMany({}), MachineProcessLog.deleteMany({}), MailLog.deleteMany({}),
    UploadedDocument.deleteMany({}), DocumentFolder.deleteMany({}), TopluYuklemeBaglantisi.deleteMany({})
  ]);
});

const ucMakine = async () => Promise.all(['r1', 'r2', 'r3'].map((r) => mps.ensureProcess({ ...hedef(r), user })));

const linkeYukle = async (token, dosyalar) => {
  let istek = request(app).post(`/api/tesvik-evrak/${token}`)
    .field('documentType', 'fatura_taslak').field('uploaderName', 'Tedarikçi A');
  for (const ad of dosyalar) istek = istek.attach('files', Buffer.from(`%PDF-1.4\n%${ad}\n`), { filename: ad, contentType: 'application/pdf' });
  return istek;
};

describe('toplu link yüklemesi tek ortak satır', () => {
  test('3 makinelik linke 2 dosya: 6 kopya kaydı, Evraklar sekmesinde 2 satır', async () => {
    const surecler = await ucMakine();
    const { token } = await toplu.ensureTopluYuklemeLinki(surecler, { user });
    expect((await linkeYukle(token, ['fatura-1.pdf', 'fatura-2.pdf'])).status).toBe(200);

    // Makine klasörleri ve sayaçları eskisi gibi: her makinede 2 evrak
    const kopyalar = await UploadedDocument.find({}).lean();
    expect(kopyalar).toHaveLength(6);
    expect(new Set(kopyalar.map((d) => d.ortakYuklemeId)).size).toBe(2);
    const sayaclar = await MachineProcess.find({}).lean();
    expect(sayaclar.map((p) => p.documentCount)).toEqual([2, 2, 2]);

    const r = await request(app).get(`/docs/Tesvik/${tesvikId}`);
    expect(r.status).toBe(200);
    expect(r.body.data).toHaveLength(2);
    for (const s of r.body.data) {
      expect(s.ortak).toBe(true);
      expect(s.ids).toHaveLength(3);
      expect(s.makineler.map((m) => m.siraNo)).toEqual([1, 2, 3]);
      expect(s.makineler.map((m) => m.machineName)).toEqual(['SU ARITMA', 'ISITMA FIRINI', 'VİDALI KOMPRESÖR']);
    }
    expect(r.body.data.map((s) => s.originalName).sort()).toEqual(['fatura-1.pdf', 'fatura-2.pdf']);
  });

  test('ortak satırı silmek bütün makinelerdeki kopyaları siler, sayaçlar düşer', async () => {
    const surecler = await ucMakine();
    const { token } = await toplu.ensureTopluYuklemeLinki(surecler, { user });
    await linkeYukle(token, ['fatura-1.pdf', 'fatura-2.pdf']);
    const [satir1] = (await request(app).get(`/docs/Tesvik/${tesvikId}`)).body.data;

    const r = await request(app).delete(`/document/${satir1._id}?ortak=1`);
    expect(r.status).toBe(200);
    expect(r.body.silinen).toBe(3);
    expect(await UploadedDocument.countDocuments({ originalName: satir1.originalName })).toBe(0);
    expect(await UploadedDocument.countDocuments()).toBe(3);
    expect((await MachineProcess.find({}).lean()).map((p) => p.documentCount)).toEqual([1, 1, 1]);
  });

  test('ortak=1 olmadan yalnız o kopya silinir', async () => {
    const surecler = await ucMakine();
    const { token } = await toplu.ensureTopluYuklemeLinki(surecler, { user });
    await linkeYukle(token, ['fatura-1.pdf']);
    const bir = await UploadedDocument.findOne({});
    expect((await request(app).delete(`/document/${bir._id}`)).body.silinen).toBe(1);
    expect(await UploadedDocument.countDocuments()).toBe(2);
  });

  test('makine linkiyle tek makineye yükleme tekil satır kalır', async () => {
    const [a] = await ucMakine();
    const link = await mps.ensureUploadLink(a, { user });
    await linkeYukle(link.split('/').pop(), ['teklif.pdf']);
    const [s] = (await request(app).get(`/docs/Tesvik/${tesvikId}`)).body.data;
    expect(s.ortak).toBeUndefined();
    expect(s.ortakYuklemeId).toBeNull();
    expect(s.machineSiraNo).toBe(1);
    expect(s.machineName).toBe('SU ARITMA');
  });
});

describe('toplu mail kapsanan her makinede', () => {
  beforeEach(() => {
    jest.spyOn(mailService, 'sendMail').mockResolvedValue({ messageId: 'test-mesaj' });
  });
  afterEach(() => jest.restoreAllMocks());

  test('tek mail kaydı; son mail ve zaman çizelgesi üç makinede de', async () => {
    const surecler = await ucMakine();
    const r = await request(app).post('/bulk/mail/send').send({
      targets: ['r1', 'r2', 'r3'].map(hedef),
      templateCode: 'supplier_verification_invoice_instruction',
      to: 'tedarikci@ornek.com', cc: '',
      subject: 'YTB 568289 Kapsamında Fatura Kesimi Hk.',
      body: 'Sayın ilgili, 2339380, 2339381, 2339382 makine ID numaralı kalemler için fatura rica ederiz.'
    });
    expect(r.status).toBe(200);
    expect(mailService.sendMail).toHaveBeenCalledTimes(1);

    const loglar = await MailLog.find({}).lean();
    expect(loglar).toHaveLength(1);
    expect(loglar[0].kapsananSurecIds.map(String).sort()).toEqual(surecler.map((p) => String(p._id)).sort());

    const guncel = await MachineProcess.find({}).lean();
    expect(guncel.every((p) => p.lastMailAt)).toBe(true);
    for (const p of guncel) {
      expect(await MachineProcessLog.countDocuments({ machineProcessId: p._id, actionType: 'mail_sent' })).toBe(1);
    }

    // 3. makinenin detayında da mail görünür
    const detay = await request(app).get(`/process/${surecler[2]._id}`);
    expect(detay.body.data.mails).toHaveLength(1);

    // Mail geçmişinde toplu olduğu yazar
    const mailler = await request(app).get(`/mails/Tesvik/${tesvikId}`);
    expect(mailler.body.data[0].makine).toBe('Toplu · 3 makine (sıra 1, 2, 3)');
  });

  test('tekil mail eskisi gibi: kapsam boş, makine adı yazar', async () => {
    const [a] = await ucMakine();
    await mps.sendProcessMail(a, 'supplier_verification_invoice_instruction', {
      user, toOverride: 'x@ornek.com', subjectOverride: 'Konu', bodyOverride: 'Metin'
    });
    const [log] = await MailLog.find({}).lean();
    expect(log.kapsananSurecIds).toEqual([]);
    const mailler = await request(app).get(`/mails/Tesvik/${tesvikId}`);
    expect(mailler.body.data[0].makine).toBe('1. SU ARITMA');
  });
});

describe('ortak yükleme kimliğinden önceki kayıtlar', () => {
  const t0 = new Date('2026-09-17T06:02:13Z').getTime();
  const kopya = (id, surec, dk, ek = {}) => ({
    _id: id, tesvikId: 'b1', machineProcessId: surec, originalName: 'fatura.pdf', fileSize: 100,
    documentType: 'fatura_taslak', uploadedByType: 'customer', uploaderName: '', createdAt: new Date(t0 + dk * 60000), ...ek
  });

  // Canlıdaki 17.09 yüklemesi: aynı dosya ~1 sn arayla 3 makineye
  test('aynı dosya kısa aralıkla farklı makinelere → tek grup', () => {
    const g = kopyaGruplari([kopya('a', 'p1', 0), kopya('b', 'p2', 0.02), kopya('c', 'p3', 0.05)]);
    expect(g.map((x) => x.map((d) => d._id))).toEqual([['a', 'b', 'c']]);
  });

  test('aynı makineye ikinci yükleme ayrı kalır', () => {
    const g = kopyaGruplari([kopya('a', 'p1', 0), kopya('b', 'p1', 1)]);
    expect(g).toHaveLength(2);
  });

  test('10 dakikadan uzun ara, farklı dosya ya da admin yüklemesi gruplanmaz', () => {
    expect(kopyaGruplari([kopya('a', 'p1', 0), kopya('b', 'p2', 11)])).toHaveLength(2);
    expect(kopyaGruplari([kopya('a', 'p1', 0), kopya('b', 'p2', 0, { originalName: 'baska.pdf' })])).toHaveLength(2);
    expect(kopyaGruplari([kopya('a', 'p1', 0, { uploadedByType: 'admin' }), kopya('b', 'p2', 0, { uploadedByType: 'admin' })])).toHaveLength(2);
  });

  test('ortak satır en yeni kopyanın tarihiyle, en yeni üstte', () => {
    const satirlar = evraklariGrupla([
      kopya('eski', 'p9', -60, { originalName: 'eski.pdf' }),
      kopya('a', 'p1', 0), kopya('b', 'p2', 0.5)
    ]);
    expect(satirlar.map((s) => s._id)).toEqual(['a', 'eski']);
    expect(satirlar[0].ids).toEqual(['a', 'b']);
    expect(new Date(satirlar[0].createdAt).getTime()).toBe(t0 + 30000);
  });
});
