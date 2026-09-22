// 🧪 Ekipman Takip — ithal makineler: toplu beyanname maili (ekli, KDV linkisiz)
//
// Müşteri (22.09.2026, ekipman takip): "İthal Makine Gümrük Beyannameleri ve Yevmiye Fişleri Hk. ... Maili böyle
// düzenleyebiliriz, toplu mail atacağız yerli makineler gibi tek tek beyanname seçip göndermeyeceğiz genelde.
// Ek yükleyebilirsek yeter. KDV Muafiyet yazısı linkine de gerek yok, örnek yükledim eki yine Gümrük
// Beyannameler.xls" · "Birde ithal makineler görünmüyor ama sadece yerli makineler görünüyor"

const os = require('os');
const path = require('path');
const fs = require('fs-extra');

const TMP = path.join(os.tmpdir(), 'ithal-beyanname-jest-' + Date.now());
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
const ctrl = require('../../controllers/tesvikMakineController');
const { uploadMultiple, ALLOWED_EXT } = require('../../middleware/tesvikUpload');
const { MAIL_TEMPLATE_CODE } = require('../../constants/tesvikMakineMail');
const MachineProcess = require('../../models/MachineProcess');
const MailLog = require('../../models/MailLog');

jest.setTimeout(60000);

let mem;
let app;
const tesvikId = new ObjectId();
const user = { _id: new ObjectId(), adSoyad: 'Test Danışman', email: 't@t.com', rol: 'admin' };
const hedef = (rowId, listType) => ({ tesvikModel: 'Tesvik', tesvikId, listType, rowId });
const ithal = (rowId, siraNo, adi) => ({
  rowId, siraNo, makineId: '', gtipKodu: '847989979019', adiVeOzelligi: adi, miktar: 1, birim: 'ADET',
  gumrukDovizKodu: 'EUR', birimFiyatiFob: 165000, toplamTutarFobUsd: 179000, kdvMuafiyeti: 'EVET'
});

beforeAll(async () => {
  mem = await MongoMemoryServer.create();
  await mongoose.connect(mem.getUri());
  await mongoose.connection.collection('tesviks').insertOne({
    _id: tesvikId, tesvikId: 'TES-568289', gmId: 'GM1', firmaId: 'F1', yatirimciUnvan: 'SABUN SANAYİ A.Ş.',
    belgeYonetimi: { belgeNo: '568289', belgeId: '1047603', belgeTarihi: new Date('2022-05-26') },
    // Geçerli bir KDV muafiyet yazısı var — yerli maile link eklenir, ithal maile EKLENMEMELİ
    kdvMuafiyetYazisi: { dosyaYolu: 'kdv/yazi.pdf', dosyaAdi: 'yazi.pdf', indirmeToken: 'kdv-token-1' },
    makineListeleri: {
      yerli: [{ rowId: 'y1', siraNo: 5, makineId: '2339380', gtipKodu: '842290900011', adiVeOzelligi: 'SU ARITMA', miktar: 1, birim: 'ADET', birimFiyatiTl: 50000, toplamTutariTl: 50000, kdvIstisnasi: 'EVET' }],
      ithal: [ithal('i1', 1, 'SABUN ÜRETİM HATTI'), ithal('i2', 2, 'KUTULAMA MAKİNASI')]
    }
  });

  app = express();
  app.use(express.json());
  app.use((req, _res, next) => { req.user = user; next(); });
  app.post('/bulk/mail/preview', ctrl.bulkMailPreview);
  app.post('/bulk/mail/send', uploadMultiple('ekler'), ctrl.bulkMailSend);
});

afterAll(async () => {
  await mongoose.disconnect();
  if (mem) await mem.stop();
  await fs.remove(TMP);
});

beforeEach(async () => {
  await Promise.all([MachineProcess.deleteMany({}), MailLog.deleteMany({})]);
  jest.restoreAllMocks();
});

describe('toplu beyanname maili', () => {
  test('ithal seçimde müşterinin metni gelir, KDV muafiyet linki eklenmez', async () => {
    const r = await request(app).post('/bulk/mail/preview').send({
      targets: [hedef('i1', 'import'), hedef('i2', 'import')],
      templateCode: MAIL_TEMPLATE_CODE.SUPPLIER_BEYANNAME_REQUEST
    });
    expect(r.status).toBe(200);
    expect(r.body.data.subject).toBe('YTB 568289 Kapsamında İthal Makine Gümrük Beyannameleri ve Yevmiye Fişleri Hk.');
    expect(r.body.data.body).toContain('Ekte ithal makinelere ilişkin beyanname listesi paylaşılmıştır.');
    expect(r.body.data.body).not.toMatch(/KDV muafiyet/i);
    expect(r.body.data.body).not.toContain('kdv-token-1');
  });

  test('yerli fatura mailinde KDV linki eskisi gibi eklenir', async () => {
    const r = await request(app).post('/bulk/mail/preview').send({
      targets: [hedef('y1', 'local')],
      templateCode: MAIL_TEMPLATE_CODE.SUPPLIER_VERIFICATION_INVOICE_INSTRUCTION
    });
    expect(r.body.data.body).toMatch(/KDV muafiyet yazısını/);
  });

  test('ekli gönderim: dosya maile gider, adı Türkçe karakterleriyle kayda geçer', async () => {
    const gonder = jest.spyOn(mailService, 'sendMail').mockResolvedValue({ messageId: 'm1' });
    const r = await request(app).post('/bulk/mail/send')
      .field('targets', JSON.stringify([hedef('i1', 'import'), hedef('i2', 'import')]))
      .field('templateCode', MAIL_TEMPLATE_CODE.SUPPLIER_BEYANNAME_REQUEST)
      .field('to', 'ithalatci@ornek.com')
      .field('subject', 'YTB 568289 Kapsamında İthal Makine Gümrük Beyannameleri ve Yevmiye Fişleri Hk.')
      .field('body', 'Sayın İlgili,\n\nEkte ithal makinelere ilişkin beyanname listesi paylaşılmıştır.')
      .attach('ekler', Buffer.from('beyanname listesi'), { filename: 'Gümrük Beyannameler.xls', contentType: 'application/vnd.ms-excel' });
    expect(r.status).toBe(200);
    expect(gonder).toHaveBeenCalledTimes(1);
    const { attachments, to } = gonder.mock.calls[0][0];
    expect(to).toEqual(['ithalatci@ornek.com']);
    expect(attachments).toHaveLength(1);
    expect(attachments[0].filename).toBe('Gümrük Beyannameler.xls');
    expect(attachments[0].content.toString()).toBe('beyanname listesi');

    const [log] = await MailLog.find({}).lean();
    expect(log.ekDosyaAdlari).toEqual(['Gümrük Beyannameler.xls']);
    expect(log.kapsananSurecIds).toHaveLength(2);
    expect((await MachineProcess.find({}).lean()).every((p) => p.lastMailAt)).toBe(true);
  });

  test('eksiz JSON gönderim eskisi gibi çalışır', async () => {
    const gonder = jest.spyOn(mailService, 'sendMail').mockResolvedValue({ messageId: 'm2' });
    const r = await request(app).post('/bulk/mail/send').send({
      targets: [hedef('i1', 'import')], templateCode: MAIL_TEMPLATE_CODE.SUPPLIER_BEYANNAME_REQUEST,
      to: 'ithalatci@ornek.com', subject: 'Konu', body: 'Metin'
    });
    expect(r.status).toBe(200);
    expect(gonder.mock.calls[0][0].attachments).toEqual([]);
  });

  test('KDV linki kuralı', () => {
    expect(mps.kdvLinkiUygun(MAIL_TEMPLATE_CODE.SUPPLIER_BEYANNAME_REQUEST, [{ listType: 'local' }])).toBe(false);
    expect(mps.kdvLinkiUygun(MAIL_TEMPLATE_CODE.REMINDER_NO_RESPONSE, [{ listType: 'import' }])).toBe(false);
    expect(mps.kdvLinkiUygun(MAIL_TEMPLATE_CODE.SUPPLIER_VERIFICATION_INVOICE_INSTRUCTION, [{ listType: 'local' }])).toBe(true);
  });

  // Gümrükten alınan liste eski Excel biçiminde geliyor
  test('xls ve doc eki kabul edilir', () => {
    expect(ALLOWED_EXT).toEqual(expect.arrayContaining(['.xls', '.doc']));
  });
});
