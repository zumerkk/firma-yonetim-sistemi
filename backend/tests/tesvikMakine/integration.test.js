// 🧪 Teşvik Makine - Entegrasyon testleri (mongodb-memory-server)
const os = require('os');
const path = require('path');
const fs = require('fs-extra');

// Servisleri require ETMEDEN önce env ayarla
const TMP = path.join(os.tmpdir(), 'tesvik-jest-' + Date.now());
process.env.TESVIK_UPLOAD_DIR = TMP;
process.env.REMINDER_DAYS = '7';
delete process.env.SMTP_HOST; // SMTP yapılandırılmamış → fail senaryosu
delete process.env.SMTP_USER;

const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const { ObjectId } = mongoose.Types;

const mps = require('../../services/tesvikMakine/machineProcessService');
const reminderService = require('../../services/tesvikMakine/reminderService');
const parser = require('../../services/tesvikMakine/ministryMailParser');
const storage = require('../../services/tesvikMakine/storageService');
const MachineProcess = require('../../models/MachineProcess');
const MailLog = require('../../models/MailLog');
const ReminderJob = require('../../models/ReminderJob');
const MachineProcessLog = require('../../models/MachineProcessLog');
const UploadedDocument = require('../../models/UploadedDocument');
const DocumentFolder = require('../../models/DocumentFolder');
const ParsedMinistryMail = require('../../models/ParsedMinistryMail');

jest.setTimeout(60000);

let mem;
const tesvikId = new ObjectId();
const user = { _id: new ObjectId(), adSoyad: 'Test Danışman', email: 't@t.com' };
const baseTarget = { tesvikModel: 'Tesvik', tesvikId, listType: 'local', rowId: 'row-local-1', user };

beforeAll(async () => {
  mem = await MongoMemoryServer.create();
  await mongoose.connect(mem.getUri());
  await mongoose.connection.collection('tesviks').insertOne({
    _id: tesvikId, tesvikId: 'TES2026TEST', gmId: 'GM1', firmaId: 'F1',
    yatirimciUnvan: 'ADIYAMAN ÖZEL SEVGİ SAĞLIK A.Ş.',
    belgeYonetimi: { belgeNo: '518097', belgeId: '1023736', belgeTarihi: new Date('2026-01-15') },
    yatirimBilgileri: { yatirimKonusu: 'Sağlık Yatırımı' },
    makineListeleri: {
      yerli: [{ rowId: 'row-local-1', siraNo: 1, makineId: 'M100', gtipKodu: '901812000000', adiVeOzelligi: 'NST CİHAZI', miktar: 2, birim: 'ADET', birimFiyatiTl: 1000, toplamTutariTl: 2000, kdvIstisnasi: 'EVET' }],
      ithal: [{ rowId: 'row-import-1', siraNo: 2, makineId: 'M200', gtipKodu: '847130000000', adiVeOzelligi: 'IMPORT MAKİNE', miktar: 1, birim: 'ADET', gumrukDovizKodu: 'EUR', birimFiyatiFob: 5000, toplamTutarFobUsd: 5000, kdvMuafiyeti: 'EVET' }]
    }
  });
});

afterAll(async () => {
  await mongoose.disconnect();
  if (mem) await mem.stop();
  await fs.remove(TMP);
});

beforeEach(async () => {
  await Promise.all([
    MachineProcess.deleteMany({}), MailLog.deleteMany({}), ReminderJob.deleteMany({}),
    MachineProcessLog.deleteMany({}), UploadedDocument.deleteMany({}), DocumentFolder.deleteMany({}),
    ParsedMinistryMail.deleteMany({})
  ]);
});

describe('ensureProcess', () => {
  test('snapshot doğru + idempotent', async () => {
    const p = await mps.ensureProcess(baseTarget);
    expect(p.machineName).toBe('NST CİHAZI');
    expect(p.currency).toBe('TRY');
    expect(p.kdvExempt).toBe(true);
    expect(p.documentNo).toBe('518097');
    const p2 = await mps.ensureProcess(baseTarget);
    expect(String(p2._id)).toBe(String(p._id));
  });

  test('geçersiz rowId hata verir (belge/satır eşleşmiyor)', async () => {
    await expect(mps.ensureProcess({ ...baseTarget, rowId: 'yok' })).rejects.toThrow(/satır/i);
  });
});

describe('durum geçişleri', () => {
  test('geçerli geçiş + geçersiz durum reddi', async () => {
    const p = await mps.ensureProcess(baseTarget);
    await mps.changeStatus(p, 'inquiry_sent', { user });
    expect(p.status).toBe('inquiry_sent');
    await expect(mps.changeStatus(p, 'gecersiz_durum', { user })).rejects.toThrow();
  });

  test('hatırlatma bastıran duruma geçince pending joblar iptal edilir', async () => {
    const p = await mps.ensureProcess(baseTarget);
    await mps.changeStatus(p, 'inquiry_sent', { user });
    await mps.scheduleReminder(p, null);
    expect(await ReminderJob.countDocuments({ machineProcessId: p._id, status: 'pending' })).toBe(1);
    await mps.changeStatus(p, 'cancelled', { user });
    expect(await ReminderJob.countDocuments({ machineProcessId: p._id, status: 'pending' })).toBe(0);
    expect(p.nextReminderAt).toBeFalsy();
  });

  test('audit log durum değişiminde kayıt tutar', async () => {
    const p = await mps.ensureProcess(baseTarget);
    await mps.changeStatus(p, 'ordered', { user, note: 'sipariş' });
    const logs = await MachineProcessLog.find({ machineProcessId: p._id, actionType: 'status_change' });
    expect(logs.length).toBeGreaterThanOrEqual(1);
    expect(logs[logs.length - 1].newStatus).toBe('ordered');
  });
});

describe('barkod (bakanlık otomasyon kodu) akışı', () => {
  test('autoSend kapalı → ministry_code_received + taslak mail', async () => {
    const p = await mps.ensureProcess(baseTarget);
    const r = await mps.setBarcode(p, 'CODE123', { user, autoSend: false });
    expect(r.process.status).toBe('ministry_code_received');
    expect(r.autoSent).toBe(false);
    expect(r.draft).toBeTruthy();
    const draft = await MailLog.findOne({ machineProcessId: p._id, status: 'draft' });
    expect(draft).toBeTruthy();
  });

  test('aynı barkod ikinci makinede uyarı verir', async () => {
    const p1 = await mps.ensureProcess(baseTarget);
    await mps.setBarcode(p1, 'DUP1', { user, autoSend: false });
    const p2 = await mps.ensureProcess({ ...baseTarget, listType: 'import', rowId: 'row-import-1' });
    const r2 = await mps.setBarcode(p2, 'DUP1', { user, autoSend: false });
    expect(r2.warning).toMatch(/zaten/i);
  });
});

describe('SMTP fail senaryosu', () => {
  test('SMTP yokken gönderim MailLog status=failed olur ve hata fırlatır', async () => {
    const p = await mps.ensureProcess(baseTarget);
    await mps.updateFields(p, { supplierEmails: 's@x.com', supplierTaxNumber: '1234567890' }, user);
    await expect(mps.sendProcessMail(p, 'supplier_verification_invoice_instruction', { user })).rejects.toThrow();
    const failed = await MailLog.findOne({ machineProcessId: p._id, status: 'failed' });
    expect(failed).toBeTruthy();
    expect(failed.templateCode).toBe('supplier_verification_invoice_instruction');
  });

  test('alıcı yoksa gönderim öncesi yakalanır', async () => {
    const p = await mps.ensureProcess(baseTarget);
    // Tedarikçi mail girilmemiş → alıcı yok → NO_RECIPIENT (SMTP'ye hiç gitmez)
    await expect(mps.sendProcessMail(p, 'supplier_verification_invoice_instruction', { user })).rejects.toMatchObject({ code: expect.stringMatching(/INCOMPLETE|NO_RECIPIENT/) });
  });
});

describe('evrak yükleme → otomatik durum ilerletme', () => {
  test('KDV evrakı yüklenince waiting_kdv_exemption → kdv_exemption_uploaded', async () => {
    const p = await mps.ensureProcess(baseTarget);
    await mps.changeStatus(p, 'waiting_kdv_exemption', { user });
    const ctx = await mps.buildContext(p);
    const folderRel = storage.machineFolderRel(ctx.identity, ctx.machineFields, p.listType);
    await storage.ensureMachineStructure(ctx.identity, ctx.machineFields, p.listType);
    const saved = await storage.saveBuffer({ folderRel, documentTypeFolder: 'KDV_Muafiyet', originalName: 'kdv.pdf', buffer: Buffer.from('x') });
    await mps.recordUploadedDocument({ proc: p, documentType: 'kdv_muafiyet', saved, fileSize: 1, mimeType: 'application/pdf', uploadedByType: 'customer' });
    const reloaded = await MachineProcess.findById(p._id);
    expect(reloaded.status).toBe('kdv_exemption_uploaded');
    expect(reloaded.documentCount).toBe(1);
    expect(await fs.pathExists(saved.filePath)).toBe(true);
  });
});

describe('hatırlatma cron', () => {
  test('reminderStopped → skip', async () => {
    const p = await mps.ensureProcess(baseTarget);
    p.reminderStopped = true; await p.save();
    await ReminderJob.create({ machineProcessId: p._id, dueAt: new Date(Date.now() - 86400000), status: 'pending' });
    const s = await reminderService.processDueReminders({ now: new Date() });
    expect(s.skipped).toBeGreaterThanOrEqual(1);
  });

  test('status completed/invoice_approved/cancelled → skip', async () => {
    const p = await mps.ensureProcess(baseTarget);
    p.status = 'completed'; await p.save();
    await ReminderJob.create({ machineProcessId: p._id, dueAt: new Date(Date.now() - 86400000), status: 'pending' });
    const s = await reminderService.processDueReminders({ now: new Date() });
    expect(s.skipped).toBeGreaterThanOrEqual(1);
    expect(s.sent).toBe(0);
  });

  test('cevap algılanırsa (evrak yüklendi) → skip', async () => {
    const p = await mps.ensureProcess(baseTarget);
    await mps.changeStatus(p, 'verification_mail_sent', { user });
    const job = await ReminderJob.create({ machineProcessId: p._id, dueAt: new Date(Date.now() - 86400000), status: 'pending', createdAt: new Date(Date.now() - 8 * 86400000) });
    // job'tan sonra evrak yüklenmiş gibi
    await UploadedDocument.create({ tesvikModel: 'Tesvik', tesvikId, machineProcessId: p._id, rowId: p.rowId, fileName: 'a.pdf' });
    const responded = await reminderService.hasResponseSince(p, job.createdAt);
    expect(responded).toBe(true);
  });
});

describe('rowId backfill (eski kayıtlar)', () => {
  test('rowId olmayan satırlar tamamlanır ve listelenir', async () => {
    const resolver = require('../../services/tesvikMakine/certificateResolver');
    const oldCertId = new ObjectId();
    // rowId ALANI OLMAYAN eski tarz satırlar
    await mongoose.connection.collection('tesviks').insertOne({
      _id: oldCertId, tesvikId: 'TESOLD', gmId: 'GM2', firmaId: 'F2',
      yatirimciUnvan: 'BAŞARI PLASTİK SAN. A.Ş.',
      belgeYonetimi: { belgeNo: '111222', belgeId: '333444', belgeTarihi: new Date('2025-05-01') },
      makineListeleri: {
        yerli: [{ siraNo: 1, adiVeOzelligi: 'ESKİ MAKİNE 1', miktar: 1, birimFiyatiTl: 10, toplamTutariTl: 10 }],
        ithal: [{ siraNo: 2, adiVeOzelligi: 'ESKİ MAKİNE 2', miktar: 1, birimFiyatiFob: 20, toplamTutarFobUsd: 20 }]
      }
    });
    const changed = await resolver.ensureRowIds('Tesvik', oldCertId);
    expect(changed).toBe(true);
    const { rows } = await mps.listForCertificate({ tesvikModel: 'Tesvik', tesvikId: oldCertId });
    expect(rows.length).toBe(2);
    expect(rows.every((r) => r.rowId && r.rowId.length > 0)).toBe(true);
    // İkinci çağrı no-op olmalı
    expect(await resolver.ensureRowIds('Tesvik', oldCertId)).toBe(false);
  });
});

describe('barkod temizleme (updateFields)', () => {
  test('barkod akış tetiklemeden düzeltilebilir/temizlenebilir', async () => {
    const p = await mps.ensureProcess(baseTarget);
    await mps.setBarcode(p, 'WRONG1', { user, autoSend: false });
    expect(p.barcode).toBe('WRONG1');
    const statusAfterFlow = p.status;
    await mps.updateFields(p, { barcode: '' }, user);
    expect(p.barcode).toBe('');
    expect(p.status).toBe(statusAfterFlow); // durum değişmedi
    await mps.updateFields(p, { barcode: 'RIGHT2' }, user);
    expect(p.barcode).toBe('RIGHT2');
  });
});

describe('mail şablonu seed reconcile (invoice_draft_approved v2)', () => {
  const MailTemplate = require('../../models/MailTemplate');
  const { seedMailTemplates } = require('../../services/tesvikMakine/mailTemplateProvider');
  const CODE = 'invoice_draft_approved';

  beforeEach(async () => { await MailTemplate.deleteMany({}); });

  test('boş DB → v2 + uploadLink placeholder; KDV cümlesi yok', async () => {
    await seedMailTemplates();
    const t = await MailTemplate.findOne({ code: CODE }).lean();
    expect(t.version).toBe(2);
    expect(t.bodyTemplate).toContain('{uploadLink}');
    expect(t.bodyTemplate).toContain('XML ve PDF');
    expect(t.bodyTemplate).not.toContain('KDV istisna açıklamasının');
  });

  test('elle düzenlenmemiş eski sürüm → otomatik güncellenir', async () => {
    await MailTemplate.create({ code: CODE, name: 'eski', subjectTemplate: 'x', bodyTemplate: 'ESKİ İÇERİK', version: 1, isActive: true });
    const res = await seedMailTemplates();
    expect(res.updated).toBeGreaterThanOrEqual(1);
    const t = await MailTemplate.findOne({ code: CODE }).lean();
    expect(t.version).toBe(2);
    expect(t.bodyTemplate).toContain('{uploadLink}');
  });

  test('admin elle düzenlediyse (updatedByUserId) → EZİLMEZ', async () => {
    await MailTemplate.create({ code: CODE, name: 'özel', subjectTemplate: 'x', bodyTemplate: 'ADMIN ÖZEL METNİ', version: 1, isActive: true, updatedByUserId: new ObjectId() });
    await seedMailTemplates();
    const t = await MailTemplate.findOne({ code: CODE }).lean();
    expect(t.bodyTemplate).toBe('ADMIN ÖZEL METNİ');
    expect(t.version).toBe(1);
  });
});

describe('bakanlık mail parser eşleştirme', () => {
  test('eşleşen mail → match + doğru rowId', async () => {
    const body = 'Belge No: 518097 Belge Id: 1023736 Makine Adı: NST CİHAZI Gtip No: 901812000000 Barkod: zzz';
    const res = await parser.ingest(body, { user, autoApply: false });
    expect(res.match).toBeTruthy();
    expect(res.match.rowId).toBe('row-local-1');
    expect(res.record.status).toBe('matched');
  });

  test('eşleşmeyen mail → unmatched kuyruğu', async () => {
    const res = await parser.ingest('Belge No: 999999 Belge Id: 888888 Makine Adı: OLMAYAN', { user });
    expect(res.match).toBeNull();
    expect(res.record.status).toBe('unmatched');
  });

  test('autoApply → süreç oluşturur + barkod uygular', async () => {
    const body = 'Belge No: 518097 Belge Id: 1023736 Makine Adı: NST CİHAZI Gtip No: 901812000000 Barkod: AUTO99';
    const res = await parser.ingest(body, { user, autoApply: true });
    expect(res.applied).toBeTruthy();
    const proc = await MachineProcess.findById(res.applied.machineProcessId);
    expect(proc.barcode).toBe('AUTO99');
    expect(proc.status).toBe('ministry_code_received');
  });

  test('eşleşmeyen kayıt elle bağlanabilir (linkQueueItem)', async () => {
    // GTİP'i yanlış → otomatik eşleşmez ama belge bulunur
    const res = await parser.ingest('Belge No: 518097 Belge Id: 1023736 Makine Adı: BİLİNMEYEN Gtip No: 000000 Barkod: LINK1', { user });
    expect(res.record.status).toBe('unmatched');
    const linked = await parser.linkQueueItem(res.record._id, { tesvikModel: 'Tesvik', tesvikId, listType: 'local', rowId: 'row-local-1', applyBarcode: true, user });
    expect(linked.record.status).toBe('applied');
    const proc = await MachineProcess.findById(linked.applied.machineProcessId);
    expect(proc.rowId).toBe('row-local-1');
    expect(proc.barcode).toBe('LINK1');
  });
});
