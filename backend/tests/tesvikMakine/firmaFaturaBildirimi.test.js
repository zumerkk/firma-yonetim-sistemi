// 🧪 Firma yükleme linkinden fatura bildirimi
//
// Müşteri (29.09.2026): "firmaların onaylı faturalarını doldurmak için bu fatura listesine özel bir
// yükleme linki … Linki açınca 'Fatura Tarih - Fatura No - Kalem Tutarı' … Bu doldurdukları bilgiler
// de otomatik olarak uygun sıra numarasındaki makineye yansısın (ekipman takip için)."

const express = require('express');
const request = require('supertest');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const { ObjectId } = mongoose.Types;

const ctrl = require('../../controllers/tesvikEvrakUploadController');
const MachineProcess = require('../../models/MachineProcess');
const TopluYuklemeBaglantisi = require('../../models/TopluYuklemeBaglantisi');
const Tesvik = require('../../models/Tesvik');

jest.setTimeout(60000);

let mem, app, belge;
const kullanici = new ObjectId();

beforeAll(async () => {
  mem = await MongoMemoryServer.create();
  await mongoose.connect(mem.getUri());
  app = express();
  app.use(express.json());
  app.post('/:token/faturalar', ctrl.faturaBildir);
});
afterAll(async () => { await mongoose.disconnect(); if (mem) await mem.stop(); });

beforeEach(async () => {
  await Promise.all([MachineProcess.deleteMany({}), TopluYuklemeBaglantisi.deleteMany({}), Tesvik.deleteMany({})]);
  belge = await Tesvik.create({
    tesvikId: 'TES-FB-1', gmId: 'GM1', firma: new ObjectId(), firmaId: 'A1', yatirimciUnvan: 'GLOBTEKS',
    olusturanKullanici: kullanici,
    belgeYonetimi: { belgeId: '1', belgeNo: '568289', belgeTarihi: new Date('2026-01-01') },
    yatirimBilgileri: { yatirimKonusu: 'K', destekSinifi: 'BÖLGESEL', yerinIl: 'NİĞDE' },
    makineListeleri: {
      yerli: [
        { rowId: 'R1', siraNo: 913, makineId: '4743905', adiVeOzelligi: 'MAKİNE A', miktar: 1 },
        { rowId: 'R2', siraNo: 917, makineId: '4743906', adiVeOzelligi: 'MAKİNE B', miktar: 1 }
      ], ithal: []
    }
  });
});

const surec = (rowId, siraNo, token) => MachineProcess.create({
  tesvikModel: 'Tesvik', tesvikId: belge._id, listType: 'local', rowId, siraNo,
  machineName: `MAKİNE ${rowId}`, ...(token ? { uploadToken: token } : {})
});

describe('toplu link', () => {
  const kur = async () => {
    const [a, b] = await Promise.all([surec('R1', 913), surec('R2', 917)]);
    await TopluYuklemeBaglantisi.create({
      token: 'TOPLU-1', tesvikModel: 'Tesvik', tesvikId: belge._id,
      processIds: [a._id, b._id], kapsamAnahtari: `${a._id}|${b._id}`
    });
    return { a, b };
  };

  test('sıra numarasına göre doğru makineye işlenir', async () => {
    const { a, b } = await kur();
    const r = await request(app).post('/TOPLU-1/faturalar').send({
      bildiren: 'Firma Muhasebe',
      faturalar: [
        { siraNo: 917, tarih: '2026-05-01', no: 'F-100', tutar: 2500.75, adet: 1 },
        { siraNo: 913, tarih: '2026-05-02', no: 'F-101', tutar: 1000, adet: 2 }
      ]
    });
    expect(r.status).toBe(200);
    expect(r.body.data.islenen).toBe(2);

    const [s1, s2] = await Promise.all([MachineProcess.findById(a._id), MachineProcess.findById(b._id)]);
    expect(s1.faturalar[0].no).toBe('F-101');
    expect(s1.invoiceRealizedValue).toBe(1000);
    expect(s2.faturalar[0].no).toBe('F-100');
    expect(s2.invoiceRealizedValue).toBeCloseTo(2500.75);
  });

  test('bildirilen tutar makine ana listesine yansır', async () => {
    await kur();
    await request(app).post('/TOPLU-1/faturalar').send({ faturalar: [{ siraNo: 913, no: 'F-1', tutar: 750, adet: 3 }] });
    const sonra = await Tesvik.findById(belge._id).lean();
    const satir = sonra.makineListeleri.yerli.find((r) => r.siraNo === 913);
    expect(satir.gerceklesenTutar).toBe(750);
    expect(satir.gerceklesenAdet).toBe(3);
  });

  test('personelin girdiği kalemler SİLİNMEZ, üstüne eklenir', async () => {
    const { a } = await kur();
    const mps = require('../../services/tesvikMakine/machineProcessService');
    const proc = await MachineProcess.findById(a._id);
    await mps.faturalariGuncelle(proc, [{ no: 'PERSONEL-1', tutar: 500, adet: 1 }], { _id: kullanici });

    await request(app).post('/TOPLU-1/faturalar').send({ faturalar: [{ siraNo: 913, no: 'FIRMA-1', tutar: 250, adet: 1 }] });
    const sonra = await MachineProcess.findById(a._id);
    expect(sonra.faturalar.map((f) => f.no)).toEqual(['PERSONEL-1', 'FIRMA-1']);
    expect(sonra.invoiceRealizedValue).toBe(750);
  });

  test('kapsam dışı sıra no reddedilir', async () => {
    await kur();
    const r = await request(app).post('/TOPLU-1/faturalar').send({ faturalar: [{ siraNo: 9999, no: 'X', tutar: 1 }] });
    expect(r.status).toBe(400);
    expect(r.body.message).toMatch(/eşleşmedi/i);
  });

  test('bildirim işlem geçmişine firma adıyla yazılır', async () => {
    await kur();
    await request(app).post('/TOPLU-1/faturalar').send({ bildiren: 'Ayşe', faturalar: [{ siraNo: 913, no: 'F-1', tutar: 10 }] });
    const MachineProcessLog = require('../../models/MachineProcessLog');
    const kayitlar = await MachineProcessLog.find({}).lean();
    expect(kayitlar.some((k) => String(k.note).includes('Firma fatura bildirdi (Ayşe)'))).toBe(true);
    expect(kayitlar.some((k) => String(k.performedByLabel).includes('Firma'))).toBe(true);
  });
});

describe('tekil makine linki', () => {
  test('sıra no verilmese de o makineye işlenir', async () => {
    const a = await surec('R1', 913, 'TEKIL-1');
    const r = await request(app).post('/TEKIL-1/faturalar').send({ faturalar: [{ no: 'F-9', tutar: 99, adet: 1 }] });
    expect(r.status).toBe(200);
    const sonra = await MachineProcess.findById(a._id);
    expect(sonra.faturalar[0].no).toBe('F-9');
  });

  test('boş gönderim reddedilir', async () => {
    await surec('R1', 913, 'TEKIL-1');
    const r = await request(app).post('/TEKIL-1/faturalar').send({ faturalar: [] });
    expect(r.status).toBe(400);
  });

  test('geçersiz token 404', async () => {
    const r = await request(app).post('/YOK/faturalar').send({ faturalar: [{ no: 'F', tutar: 1 }] });
    expect(r.status).toBe(404);
  });
});
