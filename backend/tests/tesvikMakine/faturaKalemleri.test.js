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

describe('kalem bazlı kayıt (13.10.2026)', () => {
  test('kalem eklenince makine satırındaki gerçekleşen adet/tutar güncellenir', async () => {
    const proc = await surecKur();
    await mps.faturaKalemiEkle(proc, { tarih: '2026-03-10', no: 'A-1', icerik: 'Pompa', tutar: 1500, adet: 2 }, { user });
    await mps.faturaKalemiEkle(proc, { tarih: '2026-04-11', no: 'A-2', tutar: 500, adet: 1 }, { user });

    const sonra = await Tesvik.findById(belge._id).lean();
    const satir = sonra.makineListeleri.yerli[0];
    expect(satir.gerceklesenTutar).toBe(2000);
    expect(satir.gerceklesenAdet).toBe(3);
    expect(satir.rowId).toBe('R1'); // kimlik korunur
    expect(proc.faturalar[0].icerik).toBe('Pompa');
    expect(proc.faturalar[0].kaynak).toBe('personel');
    expect(proc.faturalar[0].girenAdi).toBe('Test');
  });

  test('düzeltme ve silme toplamları yeniden hesaplar; kaynak/giren değişmez', async () => {
    const proc = await surecKur();
    await mps.faturaKalemiEkle(proc, { no: 'F-1', tutar: 100, adet: 1 }, { kaynak: 'firma', girenAdi: 'Ayşe' });
    await mps.faturaKalemiEkle(proc, { no: 'P-1', tutar: 900, adet: 1 }, { user });
    const firmaKalemi = proc.faturalar.find((k) => k.no === 'F-1');

    await mps.faturaKalemiGuncelle(proc, firmaKalemi._id, { tutar: 250, kaynak: 'personel', girenAdi: 'Sahte' }, { user });
    expect(proc.invoiceRealizedValue).toBe(1150);
    expect(proc.faturalar.id(firmaKalemi._id).kaynak).toBe('firma');
    expect(proc.faturalar.id(firmaKalemi._id).girenAdi).toBe('Ayşe');

    await mps.faturaKalemiSil(proc, firmaKalemi._id, { user });
    const taze = await MachineProcess.findById(proc._id).lean();
    expect(taze.faturalar).toHaveLength(1);
    expect(taze.invoiceRealizedValue).toBe(900);
    expect(taze.invoiceNo).toBe('P-1');
  });

  test('boş ve eksi kalem reddedilir', async () => {
    const proc = await surecKur();
    await expect(mps.faturaKalemiEkle(proc, { no: '', tutar: 0 }, { user })).rejects.toMatchObject({ code: 'FATURA_GECERSIZ' });
    await expect(mps.faturaKalemiEkle(proc, { no: 'X', tutar: -5 }, { user })).rejects.toMatchObject({ code: 'FATURA_GECERSIZ' });
    await expect(mps.faturaKalemiSil(proc, new ObjectId(), { user })).rejects.toMatchObject({ code: 'FATURA_YOK' });
  });

  test('yalnız içerik girilmiş kalem de kaydedilir', async () => {
    const proc = await surecKur();
    await mps.faturaKalemiEkle(proc, { icerik: 'Montaj bedeli' }, { user });
    expect(proc.faturalar).toHaveLength(1);
  });

  test('işlem geçmişine yazılır', async () => {
    const proc = await surecKur();
    await mps.faturaKalemiEkle(proc, { no: 'A-1', tutar: 100, adet: 1 }, { kaynak: 'firma', girenAdi: 'Ali' });
    const MachineProcessLog = require('../../models/MachineProcessLog');
    const kayitlar = await MachineProcessLog.find({ machineProcessId: proc._id }).lean();
    expect(kayitlar.some((k) => String(k.note).includes('Fatura kalemi eklendi: A-1 (Firma — Ali)'))).toBe(true);
  });
});

describe('eski doğrudan girilmiş özetler (açılış göçü)', () => {
  test('kalemi olmayan süreçteki özet tek kaleme çevrilir, ikinci çalıştırma bir şey yapmaz', async () => {
    const eski = await MachineProcess.create({
      tesvikModel: 'Tesvik', tesvikId: belge._id, listType: 'local', rowId: 'R1',
      invoiceRealizedValue: 4200, invoiceRealizedQty: 2, invoiceNo: 'ESK-9', invoiceDate: new Date('2026-05-05')
    });
    const bos = await MachineProcess.create({ tesvikModel: 'Tesvik', tesvikId: belge._id, listType: 'local', rowId: 'R2' });

    expect(await mps.eskiFaturaOzetleriniKalemeCevir()).toBe(1);
    expect(await mps.eskiFaturaOzetleriniKalemeCevir()).toBe(0);

    const taze = await MachineProcess.findById(eski._id).lean();
    expect(taze.faturalar).toHaveLength(1);
    expect(taze.faturalar[0]).toMatchObject({ no: 'ESK-9', tutar: 4200, adet: 2, girenAdi: 'Önceki kayıt' });
    expect((await MachineProcess.findById(bos._id).lean()).faturalar).toHaveLength(0);
  });
});
