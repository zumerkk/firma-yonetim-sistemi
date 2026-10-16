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
  await mongoose.connect(mem.getUri(), { monitorCommands: true });
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

test('eşzamanlı ilk üretimler aynı geçerli linki döndürür', async () => {
  const sonuclar = await Promise.all(Array.from({ length: 8 }, (_, i) =>
    portal.linkUret('Tesvik', belge._id, { user: personel, istekId: `ilk-istek-${i}` })));
  expect(new Set(sonuclar.map((r) => r.link)).size).toBe(1);
  expect((await portal.linkGetir('Tesvik', belge._id)).link).toBe(sonuclar[0].link);
});

test('yenileme aynı istekle güvenle tekrarlanır; eski tekrar daha yeni linki veya kapatmayı ezmez', async () => {
  const ilk = await portal.linkUret('Tesvik', belge._id);
  const islem = { user: personel, yenile: true, istekId: 'yenile-istek-1', beklenenSurum: ilk.surum };
  const sonuclar = await Promise.all(Array.from({ length: 5 }, () => portal.linkUret('Tesvik', belge._id, islem)));
  const yenilenen = sonuclar[0];
  expect(new Set(sonuclar.map((r) => r.link)).size).toBe(1);
  expect(yenilenen.link).not.toBe(ilk.link);
  expect((await portal.linkUret('Tesvik', belge._id, islem)).link).toBe(yenilenen.link);
  const dahaYeni = await portal.linkUret('Tesvik', belge._id, {
    ...islem, istekId: 'yenile-istek-2', beklenenSurum: yenilenen.surum
  });
  expect(dahaYeni.link).not.toBe(yenilenen.link);
  expect((await portal.linkUret('Tesvik', belge._id, islem)).link).toBe(dahaYeni.link);
  await portal.linkKapat('Tesvik', belge._id);
  expect(await portal.linkUret('Tesvik', belge._id, islem)).toBeNull();
  expect(await portal.linkGetir('Tesvik', belge._id)).toBeNull();
});

test('ilk üretim yanıtı kaybolup link kapatılırsa aynı istek açmaz; yeni bilinçli üretim açabilir', async () => {
  const islem = { user: personel, istekId: 'ilk-istek-kayip-yanit' };
  const ilk = await portal.linkUret('Tesvik', belge._id, islem);
  await portal.linkKapat('Tesvik', belge._id);
  expect(await portal.linkGetir('Tesvik', belge._id)).toBeNull();
  expect(await portal.linkUret('Tesvik', belge._id, islem)).toBeNull();
  const kapali = await Tesvik.findById(belge._id).select('musteriPortal').lean();
  expect(kapali.musteriPortal.istekId).toBe(islem.istekId);
  expect(kapali.musteriPortal.token).toBeUndefined();
  const yeni = await portal.linkUret('Tesvik', belge._id, { user: personel, istekId: 'yeni-bilincli-istek' });
  expect(yeni.link).not.toBe(ilk.link);
  expect((await portal.linkGetir('Tesvik', belge._id)).link).toBe(yeni.link);
});

test.each(['Tesvik', 'YeniTesvik'])('%s: hatalı iş kodu ObjectId sanılmaz; geçerli ama eksik belge 404 olur', async (model) => {
  await expect(portal.linkGetir(model, 'TES202600001')).rejects.toMatchObject({ status: 400, code: 'BAD_CERT_ID' });
  await expect(portal.linkUret(model, { $ne: null })).rejects.toMatchObject({ status: 400, code: 'BAD_CERT_ID' });
  await expect(portal.linkKapat(model, 'undefined')).rejects.toMatchObject({ status: 400, code: 'BAD_CERT_ID' });
  await expect(portal.linkGetir(model, new ObjectId())).rejects.toMatchObject({ status: 404 });
});

test.each(['YanlisModel', 'toString', '__proto__'])('geçersiz model %s anlamlı 400 döner', async (model) => {
  await expect(portal.linkGetir(model, belge._id)).rejects.toMatchObject({ status: 400, code: 'BAD_MODEL' });
});

test('link okumak/üretmek büyük geçmişi MongoDB’den getirmez ve onu yeniden kaydetmez', async () => {
  const gecmis = Array.from({ length: 3000 }, (_, i) => ({ sira: i, snapshot: 'x'.repeat(512) }));
  await Tesvik.collection.updateOne({ _id: belge._id }, { $set: { makineRevizyonlari: gecmis } });
  const projeksiyonlar = [];
  const dinle = (olay) => {
    if (olay.commandName === 'find' && olay.command.find === Tesvik.collection.name) {
      projeksiyonlar.push(olay.command.projection);
    }
  };
  const istemci = mongoose.connection.getClient();
  istemci.on('commandStarted', dinle);
  try {
    expect(await portal.linkGetir('Tesvik', belge._id)).toBeNull();
    const uretilen = await portal.linkUret('Tesvik', belge._id, { istekId: 'buyuk-belge-istegi' });
    expect((await portal.linkGetir('Tesvik', belge._id)).link).toBe(uretilen.link);
    expect(projeksiyonlar).toHaveLength(3);
    expect(projeksiyonlar.every((p) => p?.musteriPortal === 1 && Object.keys(p).length === 1)).toBe(true);
  } finally {
    istemci.off('commandStarted', dinle);
  }
  const saklanan = await Tesvik.collection.findOne({ _id: belge._id }, { projection: { makineRevizyonlari: 1 } });
  expect(saklanan.makineRevizyonlari).toEqual(gecmis);
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

test('ithal birim fiyatı menşe döviziyle, toplam kayıtlı USD değeriyle görünür', async () => {
  await Tesvik.updateOne({ _id: belge._id }, { $set: {
    'makineListeleri.ithal.0.birimFiyatiFob': 165000,
    'makineListeleri.ithal.0.gumrukDovizKodu': 'EUR',
    'makineListeleri.ithal.0.toplamTutarFobUsd': 179000
  } });
  const veri = await portal.portalVerisi(await linkUret());
  expect(veri.makineler.ithal[0]).toMatchObject({
    birimFiyat: 165000, birimParaBirimi: 'EUR', toplam: 179000, paraBirimi: 'USD'
  });
});

test('eski fatura özeti açılış göçü beklemeden müşteriye görünür', async () => {
  const proc = await mps.ensureProcess({ tesvikModel: 'Tesvik', tesvikId: belge._id, listType: 'local', rowId: 'R1' });
  await MachineProcess.updateOne({ _id: proc._id }, { $set: {
    faturalar: [], invoiceRealizedValue: 1000, invoiceRealizedQty: 2,
    invoiceNo: 'ESKI-1', invoiceDate: new Date('2026-10-01')
  } });
  const veri = await portal.portalVerisi(await linkUret());
  expect(veri.makineler.yerli[0]).toMatchObject({ faturaToplami: 1000, faturaAdedi: 2 });
  expect(veri.makineler.yerli[0].kalemler[0].no).toBe('ESKI-1');
});
