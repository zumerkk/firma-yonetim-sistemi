// 🧪 Müşteri belge linki — firma belgeyi görür, makinelere fatura kalemi girer.
//
// Müşteri (13.10.2026): "Müşterinin sadece burayı görebileceği bir link … Evrak listesi hariç" +
// "müşteri buradan istediği makinaya istediği kalemi girebilsin, bir kere kalemi kaydedince silemesin
// veya düzenleyemesin - 'onaylandı' olsun, biz manuel olarak onaylandıyı silip-düzenleyebilelim."

const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const { ObjectId } = mongoose.Types;

const portal = require('../../services/musteriPortal/portalService');
const mps = require('../../services/tesvikMakine/machineProcessService');
const MachineProcess = require('../../models/MachineProcess');
const Tesvik = require('../../models/Tesvik');

jest.setTimeout(60000);

let mem;
let belge;
const personel = { _id: new ObjectId(), adSoyad: 'Berk Acar' };

beforeAll(async () => {
  mem = await MongoMemoryServer.create();
  await mongoose.connect(mem.getUri());
});
afterAll(async () => { await mongoose.disconnect(); if (mem) await mem.stop(); });

beforeEach(async () => {
  await Promise.all([MachineProcess.deleteMany({}), Tesvik.deleteMany({})]);
  belge = await Tesvik.create({
    tesvikId: 'TES-PRT-1', gmId: 'GM1', firma: new ObjectId(), firmaId: 'A1', yatirimciUnvan: 'ANTİMA MAKİNA',
    olusturanKullanici: personel._id,
    belgeYonetimi: { belgeId: '1056449', belgeNo: '544092', belgeTarihi: new Date('2022-11-17'), uzatimTarihi: new Date('2027-05-17') },
    yatirimBilgileri: { yatirimKonusu: '2929', destekSinifi: 'BÖLGESEL', yerinIl: 'ANTALYA' },
    istihdam: { mevcutKisi: 0, ilaveKisi: 22 },
    evrakListesi: [{ id: 'E1', tip: 'GİZLİ EVRAK', aciklama: 'firmaya gitmemeli' }],
    araKontrol: { uploadToken: 'GIZLI-ARA-KONTROL-TOKEN' },
    makineListeleri: {
      yerli: [
        { rowId: 'R1', siraNo: 1, makineId: '4622586', adiVeOzelligi: 'CAD-CAM YAZILIMI', miktar: 1, birim: 'ADET', toplamTutariTl: 1000000 },
        { rowId: 'R2', siraNo: 2, makineId: '4622587', adiVeOzelligi: '3D BASKI', miktar: 1, birim: 'ADET', toplamTutariTl: 500000 }
      ],
      ithal: [{ rowId: 'I1', siraNo: 1, gtipKodu: '8477.80', adiVeOzelligi: 'ENJEKSİYON', miktar: 1, toplamTutarFobUsd: 25000 }]
    }
  });
});

const linkUret = async () => {
  const bilgi = await portal.linkUret('Tesvik', belge._id, { user: personel });
  return bilgi.link.split('/belge/')[1];
};

test('link aynı kalır; yenilenince eskisi geçersiz olur', async () => {
  const t1 = await linkUret();
  expect(t1).toMatch(/^[A-Za-z0-9_-]{24}$/);
  expect(await linkUret()).toBe(t1);
  const yeni = await portal.linkUret('Tesvik', belge._id, { user: personel, yenile: true });
  const t2 = yeni.link.split('/belge/')[1];
  expect(t2).not.toBe(t1);
  await expect(portal.portalVerisi(t1)).rejects.toMatchObject({ status: 404 });
  expect((await portal.portalVerisi(t2)).belge.yatirimciUnvan).toBe('ANTİMA MAKİNA');
});

test('firmaya evrak listesi, başka linklerin token\'ları ve iç alanlar gitmez', async () => {
  const veri = await portal.portalVerisi(await linkUret());
  const metin = JSON.stringify(veri);
  expect(metin).not.toContain('GİZLİ EVRAK');
  expect(metin).not.toContain('GIZLI-ARA-KONTROL-TOKEN');
  expect(metin).not.toContain('olusturanKullanici');
  expect(veri.belge.belgeYonetimi.belgeNo).toBe('544092');
  expect(veri.makineler.yerli.map((m) => m.makineId)).toEqual(['4622586', '4622587']);
  expect(veri.makineler.ithal[0]).toMatchObject({ gtipNo: '8477.80', toplam: 25000, paraBirimi: 'USD' });
});

test('geçersiz/bozuk token: 404, sorgu yapılmaz', async () => {
  await expect(portal.portalVerisi('kisa')).rejects.toMatchObject({ status: 404 });
  await expect(portal.portalVerisi({ $ne: null })).rejects.toMatchObject({ status: 404 });
});

test('firma kalemi girer → onaylı (firma) kalem, toplamlar ana listeye yansır', async () => {
  const token = await linkUret();
  const m = await portal.firmaKalemiEkle(token, {
    listType: 'local', rowId: 'R1', tarih: '2026-10-10', no: 'GMP2026000123', icerik: 'Lisans', tutar: 400000, adet: 1, giren: 'Ayşe Y.'
  });
  expect(m.kalemler).toHaveLength(1);
  expect(m.kalemler[0]).toMatchObject({ kaynak: 'firma', girenAdi: 'Ayşe Y.', no: 'GMP2026000123' });
  expect(m.faturaToplami).toBe(400000);

  const sonra = await Tesvik.findById(belge._id).lean();
  expect(sonra.makineListeleri.yerli[0].gerceklesenTutar).toBe(400000);

  // personel aynı makineye ekler; firmaya personel adı gitmez
  const proc = await MachineProcess.findOne({ tesvikId: belge._id, rowId: 'R1' });
  await mps.faturaKalemiEkle(proc, { no: 'P-1', tutar: 100, adet: 0 }, { user: personel });
  const veri = await portal.portalVerisi(token);
  const personelKalemi = veri.makineler.yerli[0].kalemler.find((k) => k.no === 'P-1');
  expect(personelKalemi).toMatchObject({ kaynak: 'personel', girenAdi: '' });
});

test('firma girişi sıkı doğrulanır (düzeltme şansı yok)', async () => {
  const token = await linkUret();
  const temel = { listType: 'local', rowId: 'R1', tarih: '2026-10-10', no: 'F-1', tutar: 10, giren: 'Ali' };
  await expect(portal.firmaKalemiEkle(token, { ...temel, tarih: '' })).rejects.toMatchObject({ status: 400 });
  await expect(portal.firmaKalemiEkle(token, { ...temel, no: '  ' })).rejects.toMatchObject({ status: 400 });
  await expect(portal.firmaKalemiEkle(token, { ...temel, tutar: 0 })).rejects.toMatchObject({ status: 400 });
  await expect(portal.firmaKalemiEkle(token, { ...temel, giren: '' })).rejects.toMatchObject({ status: 400 });
  await expect(portal.firmaKalemiEkle(token, { ...temel, tarih: '2099-01-01' })).rejects.toMatchObject({ status: 400 });
  await expect(portal.firmaKalemiEkle(token, { ...temel, rowId: 'BASKA-BELGENIN-SATIRI' })).rejects.toMatchObject({ status: 404 });
  expect(await MachineProcess.countDocuments({})).toBe(0);
});

test('link kapatılınca firma erişemez', async () => {
  const token = await linkUret();
  await portal.linkKapat('Tesvik', belge._id);
  await expect(portal.portalVerisi(token)).rejects.toMatchObject({ status: 404 });
  expect(await portal.linkGetir('Tesvik', belge._id)).toBeNull();
});
