// 🧪 Toplu yükleme linki, canlı makine bilgisi ve hatırlatma varsayılanı — entegrasyon
//
// Müşteri (15.09.2026, ekipman takip):
//  · "Toplu mailde makine'idler ve belge yükleme linki gelmiyor '{makineId}' ve '(uploadLink)' olarak geliyor."
//  · "Hatırlatmalar da otomatik olarak kapalı gelsin biz manuel açabilelim istersek"

const os = require('os');
const path = require('path');
const fs = require('fs-extra');

// Servisleri require ETMEDEN önce: yerel disk geçici klasöre, SMTP ve Cloudinary kapalı
const TMP = path.join(os.tmpdir(), 'toplu-yukleme-jest-' + Date.now());
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
const toplu = require('../../services/tesvikMakine/topluYuklemeService');
const { hatirlatmalariVarsayilanKapat } = require('../../services/tesvikMakine/hatirlatmaVarsayilan');
const MachineProcess = require('../../models/MachineProcess');
const MachineProcessLog = require('../../models/MachineProcessLog');
const MailLog = require('../../models/MailLog');
const ReminderJob = require('../../models/ReminderJob');
const UploadedDocument = require('../../models/UploadedDocument');
const DocumentFolder = require('../../models/DocumentFolder');
const TopluYuklemeBaglantisi = require('../../models/TopluYuklemeBaglantisi');

jest.setTimeout(60000);

let mem;
let app;
const tesvikId = new ObjectId();
const digerTesvikId = new ObjectId();
const user = { _id: new ObjectId(), adSoyad: 'Test Danışman', email: 't@t.com' };
const hedef = (rowId, listType = 'local', id = tesvikId) => ({ tesvikModel: 'Tesvik', tesvikId: id, listType, rowId, user });

const belge = (_id, belgeNo) => ({
  _id,
  tesvikId: `TES-${belgeNo}`, gmId: 'GM1', firmaId: 'F1',
  yatirimciUnvan: 'ÖRNEK GIDA SANAYİ A.Ş.',
  belgeYonetimi: { belgeNo, belgeId: '1023736', belgeTarihi: new Date('2026-01-15') },
  makineListeleri: {
    yerli: [
      { rowId: 'row-913', siraNo: 913, makineId: '4743905', gtipKodu: '901812000000', adiVeOzelligi: 'NST CİHAZI', miktar: 1, birim: 'ADET', birimFiyatiTl: 1000, toplamTutariTl: 1000, kdvIstisnasi: 'EVET' },
      { rowId: 'row-917', siraNo: 917, makineId: '', gtipKodu: '901812000000', adiVeOzelligi: 'EKG CİHAZI', miktar: 1, birim: 'ADET', birimFiyatiTl: 2000, toplamTutariTl: 2000, kdvIstisnasi: 'EVET' }
    ],
    ithal: [
      { rowId: 'row-ithal', siraNo: 920, makineId: 'M200', gtipKodu: '847130000000', adiVeOzelligi: 'İTHAL MAKİNE', miktar: 1, birim: 'ADET', gumrukDovizKodu: 'EUR', birimFiyatiFob: 5000, toplamTutarFobUsd: 5000, kdvMuafiyeti: 'EVET' }
    ]
  }
});

beforeAll(async () => {
  mem = await MongoMemoryServer.create();
  await mongoose.connect(mem.getUri());
  await mongoose.connection.collection('tesviks').insertMany([belge(tesvikId, '568825'), belge(digerTesvikId, '600001')]);

  app = express();
  app.use(express.json());
  app.use('/api/tesvik-evrak', require('../../routes/tesvikEvrakUpload'));
});

afterAll(async () => {
  await mongoose.disconnect();
  if (mem) await mem.stop();
  await fs.remove(TMP);
});

beforeEach(async () => {
  await Promise.all([
    MachineProcess.deleteMany({}), MachineProcessLog.deleteMany({}), MailLog.deleteMany({}),
    ReminderJob.deleteMany({}), UploadedDocument.deleteMany({}), DocumentFolder.deleteMany({}),
    TopluYuklemeBaglantisi.deleteMany({})
  ]);
});

const ikiYerli = async () => [await mps.ensureProcess(hedef('row-913')), await mps.ensureProcess(hedef('row-917'))];

describe('toplu yükleme linki', () => {
  test('aynı seçim (sırası farklı da olsa) aynı link, farklı seçim farklı link', async () => {
    const [a, b] = await ikiYerli();
    const l1 = await toplu.ensureTopluYuklemeLinki([a, b], { user });
    const l2 = await toplu.ensureTopluYuklemeLinki([b, a], { user });
    expect(l2.token).toBe(l1.token);
    expect(l1.token).toMatch(/^568825-[A-Za-z0-9]{10}$/);
    const l3 = await toplu.ensureTopluYuklemeLinki([a], { user });
    expect(l3.token).not.toBe(l1.token);
  });

  test('farklı belgelerin makineleri tek linkte birleşmez', async () => {
    const a = await mps.ensureProcess(hedef('row-913'));
    const x = await mps.ensureProcess(hedef('row-913', 'local', digerTesvikId));
    await expect(toplu.ensureTopluYuklemeLinki([a, x], { user })).rejects.toMatchObject({ code: 'BAD_INPUT' });
  });

  test('public bilgi: kapsanan makineler sıra numarasıyla listelenir', async () => {
    const [a, b] = await ikiYerli();
    const { token } = await toplu.ensureTopluYuklemeLinki([b, a], { user });
    const r = await request(app).get(`/api/tesvik-evrak/${token}`);
    expect(r.status).toBe(200);
    expect(r.body.data.makineAdi).toBe('2 makine kalemi');
    expect(r.body.data.makineler.map((m) => m.siraNo)).toEqual([913, 917]);
    expect(r.body.data.documentTypes.map((t) => t.key)).toEqual(['fatura_taslak', 'fatura_onayli']);
  });

  test('yerli + ithal karışık seçimde beyanname de sunulur', async () => {
    const a = await mps.ensureProcess(hedef('row-913'));
    const i = await mps.ensureProcess(hedef('row-ithal', 'import'));
    const { token } = await toplu.ensureTopluYuklemeLinki([a, i], { user });
    const r = await request(app).get(`/api/tesvik-evrak/${token}`);
    expect(r.body.data.documentTypes.map((t) => t.key)).toContain('beyanname');
  });

  // Asıl ihtiyaç: tek fatura birden fazla makineyi kapsıyor
  test('yüklenen evrak kapsanan HER makineye işlenir', async () => {
    const [a, b] = await ikiYerli();
    await mps.changeStatus(a, 'waiting_invoice_draft', { user });
    const { token } = await toplu.ensureTopluYuklemeLinki([a, b], { user });

    const r = await request(app)
      .post(`/api/tesvik-evrak/${token}`)
      .field('documentType', 'fatura_taslak')
      .field('uploaderName', 'Tedarikçi A')
      .attach('files', Buffer.from('%PDF-1.4\n%test\n'), { filename: 'fatura.pdf', contentType: 'application/pdf' });
    expect(r.status).toBe(200);

    const belgeler = await UploadedDocument.find({}).lean();
    expect(belgeler).toHaveLength(2);
    expect(belgeler.map((d) => String(d.machineProcessId)).sort()).toEqual([String(a._id), String(b._id)].sort());

    const [a2, b2] = await Promise.all([MachineProcess.findById(a._id), MachineProcess.findById(b._id)]);
    expect(a2.documentCount).toBe(1);
    expect(b2.documentCount).toBe(1);
    expect(a2.status).toBe('invoice_draft_received'); // fatura taslağı bekleyen makine ilerler
  });

  test('süresi dolmuş toplu link 410', async () => {
    const [a, b] = await ikiYerli();
    const { token } = await toplu.ensureTopluYuklemeLinki([a, b], { user });
    await TopluYuklemeBaglantisi.updateOne({ token }, { $set: { expiresAt: new Date(Date.now() - 1000) } });
    expect((await request(app).get(`/api/tesvik-evrak/${token}`)).status).toBe(410);
  });

  test('makine başına link eskisi gibi çalışır', async () => {
    const a = await mps.ensureProcess(hedef('row-913'));
    const link = await mps.ensureUploadLink(a, { user });
    const r = await request(app).get(`/api/tesvik-evrak/${link.split('/').pop()}`);
    expect(r.status).toBe(200);
    expect(r.body.data.makineler).toBeUndefined();
    expect(r.body.data.siraNo).toBe(913);
  });
});

describe('mail metni canlı makine satırını kullanır', () => {
  const yerliSatirIdYaz = (rowId, makineId) => mongoose.connection.collection('tesviks').updateOne(
    { _id: tesvikId, 'makineListeleri.yerli.rowId': rowId },
    { $set: { 'makineListeleri.yerli.$.makineId': makineId } }
  );

  test('süreç açıldıktan sonra girilen makine ID maile yansır', async () => {
    const b = await mps.ensureProcess(hedef('row-917')); // süreç kopyasında ID boş
    expect(b.makineId).toBe('');
    await yerliSatirIdYaz('row-917', '4743906');
    try {
      const mail = await mps.composeMail(b, 'supplier_verification_invoice_instruction', {});
      expect(mail.data.makineId).toBe('4743906');
    } finally {
      await yerliSatirIdYaz('row-917', '');
    }
  });
});

describe('hatırlatmalar varsayılan kapalı', () => {
  test('yeni süreçte kapalı başlar ve hatırlatma planlanmaz', async () => {
    const a = await mps.ensureProcess(hedef('row-913'));
    expect(a.reminderStopped).toBe(true);
    expect(await mps.scheduleReminder(a, null)).toBeNull();
    expect(await ReminderJob.countDocuments()).toBe(0);
  });

  // Kapalı başladığı için mail çoğu zaman önce gidiyor; açınca hatırlatma kurulmalı
  test('elle açılınca, daha önce mail gittiyse hatırlatma planlanır', async () => {
    const a = await mps.ensureProcess(hedef('row-913'));
    const log = await MailLog.create({
      tesvikModel: 'Tesvik', tesvikId, machineProcessId: a._id, rowId: a.rowId,
      templateCode: 'supplier_verification_invoice_instruction', toEmails: ['s@x.com'],
      subject: 'Konu', body: 'Metin', status: 'sent', sentAt: new Date()
    });
    a.lastMailAt = log.sentAt;
    await a.save();

    await mps.resumeReminders(a, { user });
    expect(a.reminderStopped).toBe(false);
    expect(a.reminderManuallyEnabledAt).toBeInstanceOf(Date);
    expect(a.nextReminderAt).toBeTruthy();
    expect(await ReminderJob.countDocuments({ machineProcessId: a._id, status: 'pending' })).toBe(1);

    // İkinci kez açmak ikinci hatırlatma işi üretmez
    await mps.resumeReminders(a, { user });
    expect(await ReminderJob.countDocuments({ machineProcessId: a._id, status: 'pending' })).toBe(1);
  });

  test('açılış migrasyonu elle açılmamış eski süreçleri kapatır, elle açılanlara dokunmaz', async () => {
    const eski = await mps.ensureProcess(hedef('row-913'));
    const elle = await mps.ensureProcess(hedef('row-917'));
    const gecmisteElle = await mps.ensureProcess(hedef('row-ithal', 'import'));
    // Eski davranışı taklit et: hatırlatma kendiliğinden açık + bekleyen iş
    await MachineProcess.updateMany({}, { $set: { reminderStopped: false } });
    await ReminderJob.create({ machineProcessId: eski._id, dueAt: new Date(), status: 'pending', reminderType: 'no_response' });
    await MachineProcess.updateOne({ _id: elle._id }, { $set: { reminderManuallyEnabledAt: new Date() } });
    await MachineProcessLog.create({
      machineProcessId: gecmisteElle._id, rowId: gecmisteElle.rowId,
      actionType: 'fields_updated', note: 'Hatırlatmalar yeniden etkinleştirildi'
    });

    expect(await hatirlatmalariVarsayilanKapat()).toEqual({ kapatilan: 1 });

    const [e2, l2, g2] = await Promise.all([eski, elle, gecmisteElle].map((p) => MachineProcess.findById(p._id).lean()));
    expect(e2.reminderStopped).toBe(true);
    expect(l2.reminderStopped).toBe(false);
    expect(g2.reminderStopped).toBe(false);
    expect(await ReminderJob.countDocuments({ machineProcessId: eski._id, status: 'skipped', skipReason: 'varsayilan_kapali' })).toBe(1);

    // Her açılışta çalışıyor: ikinci tur hiçbir şeyi değiştirmemeli
    expect(await hatirlatmalariVarsayilanKapat()).toEqual({ kapatilan: 0 });
  });
});
