const os = require('os');
const path = require('path');
const fs = require('fs-extra');
const tmp = path.join(os.tmpdir(), `mail-yukleme-guvenligi-${process.pid}-${Date.now()}`);
process.env.TESVIK_UPLOAD_DIR = tmp;
delete process.env.SMTP_HOST;
delete process.env.SMTP_USER;
delete process.env.CLOUDINARY_STORAGE_ENABLED;

const express = require('express');
const request = require('supertest');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const MachineProcess = require('../../models/MachineProcess');
const MailLog = require('../../models/MailLog');
const Tesvik = require('../../models/Tesvik');
const mps = require('../../services/tesvikMakine/machineProcessService');
const mailService = require('../../services/tesvikMakine/mailService');
const ctrl = require('../../controllers/tesvikMakineController');
const { MAIL_TEMPLATE_CODE: KOD } = require('../../constants/tesvikMakineMail');

jest.setTimeout(60000);
let mem, app, gecerli, dolmus, send;
const id = () => new mongoose.Types.ObjectId();

beforeAll(async () => {
  mem = await MongoMemoryServer.create();
  await mongoose.connect(mem.getUri());
  app = express(); app.use(express.json());
  app.post('/bulk/preview', ctrl.bulkMailPreview);
  app.post('/bulk/send', ctrl.bulkMailSend);
  app.use('/upload', require('../../routes/tesvikEvrakUpload'));
});
afterAll(async () => { await mongoose.disconnect(); if (mem) await mem.stop(); await fs.remove(tmp); });
afterEach(() => jest.restoreAllMocks());
beforeEach(async () => {
  await Promise.all([MachineProcess.deleteMany({}), MailLog.deleteMany({}), Tesvik.deleteMany({})]);
  const belgeler = [false, true].map((eski, i) => ({
    _id: id(), tesvikId: `MAIL-${i}`, yatirimciUnvan: 'Denetim',
    belgeYonetimi: { belgeNo: `MAIL-${i}`, belgeTarihi: new Date('2026-01-01'),
      ...(eski ? { uzatimTarihi: new Date('2020-01-01') } : {}) },
    makineListeleri: { yerli: [{ rowId: 'R1', siraNo: 1, makineId: 'M1', adiVeOzelligi: 'Makine' }], ithal: [] }
  }));
  await Tesvik.collection.insertMany(belgeler);
  [gecerli, dolmus] = await Promise.all(belgeler.map((b, i) => MachineProcess.create({
    tesvikModel: 'Tesvik', tesvikId: b._id, rowId: 'R1', listType: 'local', siraNo: 1,
    supplierEmails: ['test@example.invalid'], uploadToken: `TOKEN-${i}`, lastMailTemplateCode: KOD.REMINDER_NO_RESPONSE
  })));
  send = jest.spyOn(mailService, 'sendMail').mockResolvedValue({ messageId: 'AG-KAPALI' });
  jest.spyOn(mailService, 'isConfigured').mockReturnValue(true);
});

test('süresi geçmiş belgenin önizlemesi uyarır; serbest metin gönderimi ve yeniden gönderim engellenir', async () => {
  const onizleme = await mps.previewMail(dolmus, KOD.INVOICE_DRAFT_APPROVED);
  expect(onizleme.belgeSuresi.doldu).toBe(true);
  expect(onizleme.canSend).toBe(false);
  await expect(mps.sendProcessMail(dolmus, KOD.INVOICE_DRAFT_APPROVED, { bodyOverride: 'Elle yazıldı' }))
    .rejects.toMatchObject({ code: 'BELGE_SURESI_DOLDU' });
  const log = await MailLog.create({ machineProcessId: dolmus._id, templateCode: KOD.INVOICE_DRAFT_APPROVED,
    status: 'failed', toEmails: ['test@example.invalid'], body: 'Eski mail' });
  await expect(mps.resendMail(log._id)).rejects.toMatchObject({ code: 'BELGE_SURESI_DOLDU' });
  expect(send).not.toHaveBeenCalled();
});

test('toplu gönderimde yalnız ilk belgenin tarihiyle yetinilmez', async () => {
  await expect(mps.sendProcessMail(gecerli, KOD.INVOICE_DRAFT_APPROVED, {
    bodyOverride: 'Toplu içerik', kapsananSurecler: [dolmus]
  })).rejects.toMatchObject({ code: 'BELGE_SURESI_DOLDU' });
  const log = await MailLog.create({ machineProcessId: gecerli._id, kapsananSurecIds: [gecerli._id, dolmus._id],
    templateCode: KOD.INVOICE_DRAFT_APPROVED, status: 'failed', toEmails: ['test@example.invalid'], body: 'Toplu' });
  await expect(mps.resendMail(log._id)).rejects.toMatchObject({ code: 'BELGE_SURESI_DOLDU' });
  expect(send).not.toHaveBeenCalled();
});

test('toplu API farklı belge hedeflerini önizlemeden doğrudan gönderimde de reddeder', async () => {
  const targets = [gecerli, dolmus].map((p) => ({ tesvikModel: p.tesvikModel, tesvikId: p.tesvikId, rowId: p.rowId, listType: p.listType }));
  for (const route of ['/bulk/preview', '/bulk/send']) {
    const cevap = await request(app).post(route).send({ targets, templateCode: KOD.INVOICE_DRAFT_APPROVED, subject: 'Konu', body: 'İçerik' });
    expect(cevap.status).toBe(400);
    expect(cevap.body.message).toContain('aynı belge');
  }
  expect(send).not.toHaveBeenCalled();
});

test('onay/taslak maili kendi bağlantısındaki türü korur; hatırlatma bunu değiştirmez', async () => {
  const link = mps.mailYuklemeLinki('/upload/tesvik/TOKEN-0', KOD.INVOICE_DRAFT_APPROVED);
  expect(link).toContain('evrakTuru=fatura_onayli');
  const onizleme = await mps.previewMail(gecerli, KOD.INVOICE_DRAFT_APPROVED);
  expect(onizleme.body).toContain('evrakTuru=fatura_onayli');
  const cevap = await request(app).get('/upload/TOKEN-0?evrakTuru=fatura_onayli');
  expect(cevap.status).toBe(200);
  expect(cevap.body.data.varsayilanEvrakTuru).toBe('fatura_onayli');
  const gecersiz = await request(app).get('/upload/TOKEN-0?evrakTuru=kdv_muafiyet');
  expect(gecersiz.body.data.varsayilanEvrakTuru).toBe('fatura_taslak');
  expect(mps.mailYuklemeLinki('/upload/tesvik/TOKEN-0', KOD.SUPPLIER_VERIFICATION_INVOICE_INSTRUCTION))
    .toContain('evrakTuru=fatura_taslak');
  await MailLog.create({ machineProcessId: gecerli._id, templateCode: KOD.INVOICE_DRAFT_APPROVED,
    status: 'sent', sentAt: new Date('2026-01-01'), toEmails: ['test@example.invalid'] });
  await MailLog.create({ machineProcessId: gecerli._id, templateCode: KOD.REMINDER_NO_RESPONSE,
    status: 'sent', sentAt: new Date('2026-01-02'), toEmails: ['test@example.invalid'] });
  const eskiLink = await request(app).get('/upload/TOKEN-0');
  expect(eskiLink.body.data.varsayilanEvrakTuru).toBe('fatura_onayli');
});

test('startup göçü çalışmamış eski fatura özeti public linkte miktar/tutarıyla görünür', async () => {
  await MachineProcess.updateOne({ _id: gecerli._id }, { $set: { invoiceNo: 'ESKI', invoiceRealizedValue: 1250, invoiceRealizedQty: 3 } });
  const cevap = await request(app).get('/upload/TOKEN-0');
  expect(cevap.status).toBe(200);
  expect(cevap.body.data.fatura).toMatchObject({ kalemSayisi: 1, toplamTutar: 1250, toplamAdet: 3 });
  expect(cevap.body.data.fatura.invoiceNo).toBeUndefined();
});
