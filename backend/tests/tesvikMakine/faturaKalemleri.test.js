// 🧪 Ekipman Takip — çoklu fatura kalemi
//
// Müşteri (29.09.2026): "İşleme tıklayınca her fatura için 'Fatura Tarih - Fatura No - Kalem
// Tutarı' alt kısma birden fazla kalem veya fatura girilebilecek şekilde giriş satırları açılacak
// (manuel satır ekleme çıkarma yapabilelim), oraya girilen veriler makine ana listesinde toplam
// miktar ve toplam tutar kısmına yansısın."

const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const { ObjectId } = mongoose.Types;

const mps = require('../../services/tesvikMakine/machineProcessService');
const MachineProcess = require('../../models/MachineProcess');
const Tesvik = require('../../models/Tesvik');

jest.setTimeout(60000);

let mem;
const user = { _id: new ObjectId(), adSoyad: 'Test' };
let belge;

beforeAll(async () => {
  mem = await MongoMemoryServer.create();
  await mongoose.connect(mem.getUri());
});
afterAll(async () => { await mongoose.disconnect(); if (mem) await mem.stop(); });

beforeEach(async () => {
  await Promise.all([MachineProcess.deleteMany({}), Tesvik.deleteMany({})]);
  belge = await Tesvik.create({
    tesvikId: 'TES-FTR-1', gmId: 'GM1', firma: new ObjectId(), firmaId: 'A1', yatirimciUnvan: 'GLOBTEKS',
    olusturanKullanici: user._id,
    belgeYonetimi: { belgeId: '1', belgeNo: '568289', belgeTarihi: new Date('2026-01-01') },
    yatirimBilgileri: { yatirimKonusu: 'K', destekSinifi: 'BÖLGESEL', yerinIl: 'NİĞDE' },
    makineListeleri: { yerli: [{ rowId: 'R1', siraNo: 1, makineId: '2339380', adiVeOzelligi: 'SU ARITMA', miktar: 5 }], ithal: [] }
  });
});

const surecKur = () => MachineProcess.create({
  tesvikModel: 'Tesvik', tesvikId: belge._id, listType: 'local', rowId: 'R1',
  siraNo: 1, makineId: '2339380', machineName: 'SU ARITMA'
});

describe('toplamlar', () => {
  test('kalemlerin tutarı ve adedi toplanır', () => {
    const proc = new MachineProcess({ tesvikModel: 'Tesvik', tesvikId: new ObjectId(), listType: 'local', rowId: 'R1' });
    mps.faturaToplamlariniHesapla(proc, [
      { tarih: '2026-03-10', no: 'A-1', tutar: 1000.5, adet: 2 },
      { tarih: '2026-02-01', no: 'A-2', tutar: 2000, adet: 3 }
    ]);
    expect(proc.invoiceRealizedValue).toBeCloseTo(3000.5);
    expect(proc.invoiceRealizedQty).toBe(5);
    expect(proc.invoiceNo).toBe('A-1, A-2');
    expect(proc.invoiceDate.toISOString().slice(0, 10)).toBe('2026-02-01'); // en erken kalem
  });

  test('tamamen boş satır kaydedilmez', () => {
    const proc = new MachineProcess({ tesvikModel: 'Tesvik', tesvikId: new ObjectId(), listType: 'local', rowId: 'R1' });
    mps.faturaToplamlariniHesapla(proc, [{ no: 'A-1', tutar: 100, adet: 1 }, { no: '', tutar: 0, adet: 0 }]);
    expect(proc.faturalar).toHaveLength(1);
  });

  test('çok kalemde fatura no özeti kısalır', () => {
    const proc = new MachineProcess({ tesvikModel: 'Tesvik', tesvikId: new ObjectId(), listType: 'local', rowId: 'R1' });
    mps.faturaToplamlariniHesapla(proc, [1, 2, 3, 4, 5].map((n) => ({ no: `F-${n}`, tutar: 10, adet: 1 })));
    expect(proc.invoiceNo).toBe('F-1, F-2, F-3 +2');
    expect(proc.invoiceRealizedQty).toBe(5);
  });

  test('sayı olmayan değer toplamı bozmaz', () => {
    const proc = new MachineProcess({ tesvikModel: 'Tesvik', tesvikId: new ObjectId(), listType: 'local', rowId: 'R1' });
    mps.faturaToplamlariniHesapla(proc, [{ no: 'A', tutar: 'abc', adet: null }, { no: 'B', tutar: 50, adet: 1 }]);
    expect(proc.invoiceRealizedValue).toBe(50);
    expect(proc.invoiceRealizedQty).toBe(1);
  });
});

describe('ana listeye yansıma', () => {
  test('kalemler kaydedilince makine satırındaki gerçekleşen adet/tutar güncellenir', async () => {
    const proc = await surecKur();
    await mps.faturalariGuncelle(proc, [
      { tarih: '2026-03-10', no: 'A-1', tutar: 1500, adet: 2 },
      { tarih: '2026-04-11', no: 'A-2', tutar: 500, adet: 1 }
    ], user);

    const sonra = await Tesvik.findById(belge._id).lean();
    const satir = sonra.makineListeleri.yerli[0];
    expect(satir.gerceklesenTutar).toBe(2000);
    expect(satir.gerceklesenAdet).toBe(3);
    expect(satir.rowId).toBe('R1');    // kimlik korunur
  });

  test('kalemler silinince toplamlar sıfırlanır', async () => {
    const proc = await surecKur();
    await mps.faturalariGuncelle(proc, [{ no: 'A-1', tutar: 1500, adet: 2 }], user);
    await mps.faturalariGuncelle(proc, [], user);

    const sonra = await Tesvik.findById(belge._id).lean();
    expect(sonra.makineListeleri.yerli[0].gerceklesenTutar).toBe(0);
    expect(proc.faturalar).toHaveLength(0);
    expect(proc.invoiceNo).toBe('');
  });

  test('kaydetme işlem geçmişine yazılır', async () => {
    const proc = await surecKur();
    await mps.faturalariGuncelle(proc, [{ no: 'A-1', tutar: 100, adet: 1 }], user);
    const MachineProcessLog = require('../../models/MachineProcessLog');
    const kayitlar = await MachineProcessLog.find({ machineProcessId: proc._id }).lean();
    expect(kayitlar.some((k) => String(k.note).includes('Fatura kalemleri güncellendi'))).toBe(true);
  });
});
