// 17.10.2026: gelecekteki bitiş/mücbir tarihi, geçmiş uzatım tarihine rağmen maili açıyordu.
// Gerçek servisler + bellek içi Mongo; SMTP ağ çağrısı tamamen mock edilir.
jest.mock('../../services/tesvikMakine/mailService', () => ({
  sendMail: jest.fn().mockResolvedValue({ messageId: 'SMTP-MOCK' }),
  isConfigured: jest.fn().mockReturnValue(true)
}));

const express = require('express');
const request = require('supertest');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
require('../../models/Firma');
const Tesvik = require('../../models/Tesvik');
const YeniTesvik = require('../../models/YeniTesvik');
const MachineProcess = require('../../models/MachineProcess');
const MailLog = require('../../models/MailLog');
const ReminderJob = require('../../models/ReminderJob');
const MachineProcessLog = require('../../models/MachineProcessLog');
const mailService = require('../../services/tesvikMakine/mailService');
const mps = require('../../services/tesvikMakine/machineProcessService');
const reminderService = require('../../services/tesvikMakine/reminderService');
const araKontrol = require('../../services/tesvikMakine/araKontrolService');
const ctrl = require('../../controllers/tesvikMakineController');
const { MAIL_TEMPLATE_CODE: KOD } = require('../../constants/tesvikMakineMail');

jest.setTimeout(60000);
const id = () => new mongoose.Types.ObjectId();
let mem, app, surecler;

beforeAll(async () => {
  mem = await MongoMemoryServer.create();
  await mongoose.connect(mem.getUri());
  app = express();
  app.use(express.json());
  app.post('/process/:id/mail/preview', ctrl.previewMail);
  app.post('/process/:id/mail/send', ctrl.sendMail);
  app.post('/mail/:mailLogId/resend', ctrl.resendMail);
  app.post('/bulk/mail/send', ctrl.bulkMailSend);
});
afterAll(async () => { await mongoose.disconnect(); if (mem) await mem.stop(); });
beforeEach(async () => {
  jest.clearAllMocks();
  await Promise.all([Tesvik.deleteMany({}), YeniTesvik.deleteMany({}), MachineProcess.deleteMany({}),
    MailLog.deleteMany({}), ReminderJob.deleteMany({}), MachineProcessLog.deleteMany({})]);
  surecler = {};
  for (const [tesvikModel, Model] of [['Tesvik', Tesvik], ['YeniTesvik', YeniTesvik]]) {
    const tesvikId = id();
    await Model.collection.insertOne({
      _id: tesvikId, tesvikId: `${tesvikModel}-SURE`, yatirimciUnvan: 'SÜRE TEST',
      belgeYonetimi: { belgeNo: '12345', belgeTarihi: new Date('2020-01-01'), uzatimTarihi: new Date('2020-01-02'),
        belgeBitisTarihi: new Date('2100-01-01'), mucbirUzumaTarihi: new Date('2101-01-01') },
      makineListeleri: { yerli: [{ rowId: 'R1', siraNo: 1, makineId: 'M1', adiVeOzelligi: 'MAKİNE' }], ithal: [] }
    });
    surecler[tesvikModel] = await MachineProcess.create({
      tesvikModel, tesvikId, rowId: 'R1', listType: 'local', supplierEmails: ['firma@example.invalid'],
      uploadToken: `${tesvikModel}-SURE-TOKEN`, uploadTokenExpiresAt: new Date('2100-01-01'),
      reminderStopped: false
    });
  }
});

describe.each(['Tesvik', 'YeniTesvik'])('%s geçmiş uzatım tarihi', (model) => {
  test.each([KOD.SUPPLIER_VERIFICATION_INVOICE_INSTRUCTION, KOD.INVOICE_DRAFT_APPROVED])('%s önizlemesi uyarır ve gönderimi engeller', async (templateCode) => {
    const proc = surecler[model];
    const preview = await request(app).post(`/process/${proc._id}/mail/preview`).send({ templateCode });
    expect(preview.status).toBe(200);
    expect(preview.body.data).toMatchObject({ canSend: false, belgeSuresi: { doldu: true } });
    expect(preview.body.data.belgeSuresi.mesaj).toContain('02.01.2020');
    const cevap = await request(app).post(`/process/${proc._id}/mail/send`)
      .send({ templateCode, subject: 'Elle düzenlenen konu', body: 'Elle düzenlenen metin' });
    expect(cevap.status).toBe(409);
    expect(cevap.body).toMatchObject({ success: false, code: 'BELGE_SURESI_DOLDU' });
    expect(cevap.body.message).toContain('süre uzatım tarihi geçti');
    expect(mailService.sendMail).not.toHaveBeenCalled();
    expect(await MailLog.countDocuments({})).toBe(0);
  });

  test('toplu mail ve kayıtlı taslağı yeniden gönderme de aynı süreyi kontrol eder', async () => {
    const proc = surecler[model];
    const target = { tesvikModel: model, tesvikId: proc.tesvikId, rowId: 'R1', listType: 'local' };
    const toplu = await request(app).post('/bulk/mail/send')
      .send({ targets: [target], templateCode: KOD.INVOICE_DRAFT_APPROVED, subject: 'Toplu konu', body: 'Toplu metin' });
    expect(toplu.status).toBe(409);
    expect(toplu.body.code).toBe('BELGE_SURESI_DOLDU');
    const taslak = await mps.createDraftMail(proc, KOD.INVOICE_DRAFT_APPROVED);
    const tekrar = await request(app).post(`/mail/${taslak._id}/resend`).send({});
    expect(tekrar.status).toBe(409);
    expect(tekrar.body.code).toBe('BELGE_SURESI_DOLDU');
    expect((await MailLog.findById(taslak._id)).status).toBe('draft');
    expect(mailService.sendMail).not.toHaveBeenCalled();
  });

  test('ara kontrol maili ve zamanlanmış hatırlatma dışarı gönderilmez', async () => {
    const proc = surecler[model];
    await expect(araKontrol.sendAraKontrol({ tesvikModel: model, tesvikId: proc.tesvikId,
      to: ['firma@example.invalid'], subject: 'Konu', body: 'Metin' }))
      .rejects.toMatchObject({ code: 'BELGE_SURESI_DOLDU' });
    const job = await ReminderJob.create({ machineProcessId: proc._id, dueAt: new Date('2020-01-01') });
    const sonuc = await reminderService.processDueReminders();
    expect(sonuc).toEqual({ scanned: 1, sent: 0, skipped: 1, failed: 0 });
    expect((await ReminderJob.findById(job._id)).skipReason).toBe('belge_suresi_doldu');
    expect(mailService.sendMail).not.toHaveBeenCalled();
  });

  test('uzatım güncellenip geçerli olduğunda normal gönderime izin verilir', async () => {
    const proc = surecler[model];
    const Model = model === 'Tesvik' ? Tesvik : YeniTesvik;
    await Model.collection.updateOne({ _id: proc.tesvikId }, { $set: { 'belgeYonetimi.uzatimTarihi': new Date('2100-01-01') } });
    const cevap = await request(app).post(`/process/${proc._id}/mail/send`)
      .send({ templateCode: KOD.INVOICE_DRAFT_APPROVED, subject: 'Konu', body: 'Metin' });
    expect(cevap.status).toBe(200);
    expect(cevap.body.data.sent).toBe(true);
    expect(mailService.sendMail).toHaveBeenCalledTimes(1);
  });
});
