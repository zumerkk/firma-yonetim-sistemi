// 🧪 Belge revizesi makine listesine dokunmamalı
//
// Müşteri (05.10.2026): "Belgede revize işlemi yapınca makine listesi kendi kendine değişiyor,
// fiyatlar, tarihler vs ya sıfırlanıyor ya ilk eklediğimiz hale dönüyor."
// Canlıda 16.09–02.10 arasında 4 yeni belgede 5 revize kaydı listeyi bozdu: yeni belge formu
// ekranda göstermediği makine listesinin eksik bir kopyasını PUT /:id ile geri yolluyordu
// (rowId, talep/karar tarihleri, finansal kiralama, makine tipi yok; kuruş kırpılmış).
// Sunucu artık PUT gövdesindeki makineListeleri'ni yok sayıyor.

const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');

jest.setTimeout(60000);

require('../../models/User');
require('../../models/Firma');
const Tesvik = require('../../models/Tesvik');
const YeniTesvik = require('../../models/YeniTesvik');
const tesvikController = require('../../controllers/tesvikController');
const yeniTesvikController = require('../../controllers/yeniTesvikController');

let mem;
beforeAll(async () => {
  mem = await MongoMemoryServer.create();
  await mongoose.connect(mem.getUri());
});
afterAll(async () => {
  await mongoose.disconnect();
  if (mem) await mem.stop();
});

const kullanici = { _id: new mongoose.Types.ObjectId(), adSoyad: 'Test Uzman', email: 'uzman@example.test', rol: 'admin' };

const cagir = async (fn, params, body) => {
  const req = {
    params, body, user: kullanici, ip: '127.0.0.1',
    connection: { remoteAddress: '127.0.0.1' }, get: () => 'jest', headers: {}
  };
  const res = { statusCode: 200, govde: null };
  res.status = (k) => { res.statusCode = k; return res; };
  res.json = (g) => { res.govde = g; return res; };
  await fn(req, res);
  return res;
};

const makineler = () => ({
  yerli: [{
    siraNo: 1, gtipKodu: '847989970000', adiVeOzelligi: 'DOLUM MAKİNESİ', miktar: 2, birim: 'C62',
    birimAciklamasi: 'ADET(UNIT)', birimFiyatiTl: 392051.89, toplamTutariTl: 784103.78,
    makineTechizatTipi: 'Ana Makine', finansalKiralamaMi: 'HAYIR', iadeDevirSatisVarMi: 'HAYIR',
    talep: { durum: 'taslak', istenenAdet: 0, talepTarihi: new Date('2026-08-31') },
    karar: { kararDurumu: 'onay', onaylananAdet: 2, kararTarihi: new Date('2026-09-25') }
  }],
  ithal: [{
    siraNo: 1, gtipKodu: '842240000000', adiVeOzelligi: 'PAKETLEME HATTI', miktar: 1, birim: 'SET',
    birimAciklamasi: 'SET', birimFiyatiFob: 4900000, gumrukDovizKodu: 'EUR', toplamTutarFobUsd: 4900000,
    toplamTutarFobTl: 210403544.62, kurManuel: true, kurManuelDeger: 42.94, finansalKiralamaMi: 'EVET',
    finansalKiralamaAdet: 1, finansalKiralamaSirket: 'XYZ LEASING', gerceklesenTutar: 7223450,
    kullanilmisMakineAciklama: 'HAYIR', makineTechizatTipi: 'Ana Makine'
  }]
});

const belgeKur = (Model) => Model.create({
  gmId: `GM-${Math.random().toString(36).slice(2, 8)}`,
  firma: new mongoose.Types.ObjectId(),
  firmaId: 'A000001',
  yatirimciUnvan: 'TEST SANAYİ A.Ş.',
  olusturanKullanici: kullanici._id,
  belgeYonetimi: { belgeId: `B-${Date.now()}-${Math.random()}`, belgeNo: '603070', belgeTarihi: new Date('2025-03-26') },
  yatirimBilgileri: { yatirimKonusu: '1551', destekSinifi: 'GENEL', yerinIl: 'İZMİR', yerinIlce: 'MENDERES' },
  istihdam: { mevcutKisi: 159, ilaveKisi: 0 },
  makineListeleri: makineler()
});

// Eski yeni-belge formunun gönderdiği kesik kopya (bkz. git geçmişi: YeniTesvikForm handleSubmit)
const formunKesikKopyasi = (b) => ({
  yerli: b.makineListeleri.yerli.map((r) => ({
    gtipKodu: r.gtipKodu, adiVeOzelligi: r.adiVeOzelligi, miktar: r.miktar, birim: r.birim,
    birimFiyatiTl: parseInt(r.birimFiyatiTl, 10), toplamTutariTl: parseInt(r.toplamTutariTl, 10), kdvIstisnasi: ''
  })),
  ithal: b.makineListeleri.ithal.map((r) => ({
    gtipKodu: r.gtipKodu, adiVeOzelligi: r.adiVeOzelligi, miktar: r.miktar, birim: r.birim,
    birimFiyatiFob: parseInt(r.birimFiyatiFob, 10), gumrukDovizKodu: r.gumrukDovizKodu,
    toplamTutarFobUsd: parseInt(r.toplamTutarFobUsd, 10), toplamTutarFobTl: parseInt(r.toplamTutarFobTl, 10)
  }))
});

describe.each([
  ['eski belge', Tesvik, tesvikController],
  ['yeni belge', YeniTesvik, yeniTesvikController]
])('%s', (_ad, Model, ctrl) => {
  test('revize kaydı makine listesini (kimlik, tarih, kuruş, kiralama) aynen bırakır', async () => {
    const belge = await belgeKur(Model);
    const once = await Model.findById(belge._id).lean();

    const res = await cagir(ctrl.updateTesvik, { id: String(belge._id) }, {
      istihdam: { mevcutKisi: 159, ilaveKisi: 12 },
      makineListeleri: formunKesikKopyasi(once),
      revizyonBaslatma: { revizyonSebebi: 'Sonuç Revize', kullaniciNotu: '' }
    });
    expect(res.statusCode).toBe(200);

    const sonra = await Model.findById(belge._id).lean();
    expect(sonra.istihdam.ilaveKisi).toBe(12); // belge alanı yine yazılıyor

    const [y0, y1] = [once.makineListeleri.yerli[0], sonra.makineListeleri.yerli[0]];
    expect(String(y1.rowId)).toBe(String(y0.rowId));
    expect(y1.birimFiyatiTl).toBe(392051.89);
    expect(y1.toplamTutariTl).toBe(784103.78);
    expect(y1.makineTechizatTipi).toBe('Ana Makine');
    expect(y1.finansalKiralamaMi).toBe('HAYIR');
    expect(new Date(y1.talep.talepTarihi).toISOString().slice(0, 10)).toBe('2026-08-31');
    expect(y1.karar.kararDurumu).toBe('onay');
    expect(new Date(y1.karar.kararTarihi).toISOString().slice(0, 10)).toBe('2026-09-25');

    const [i0, i1] = [once.makineListeleri.ithal[0], sonra.makineListeleri.ithal[0]];
    expect(String(i1.rowId)).toBe(String(i0.rowId));
    expect(i1.toplamTutarFobTl).toBe(210403544.62);
    expect(i1.kurManuel).toBe(true);
    expect(i1.kurManuelDeger).toBe(42.94);
    expect(i1.finansalKiralamaMi).toBe('EVET');
    expect(i1.finansalKiralamaSirket).toBe('XYZ LEASING');
    expect(i1.gerceklesenTutar).toBe(7223450);
  });

  test('makine listesini boş gönderen eski önyüz de listeyi silemez', async () => {
    const belge = await belgeKur(Model);
    await cagir(ctrl.updateTesvik, { id: String(belge._id) }, { makineListeleri: { yerli: [], ithal: [] } });
    const sonra = await Model.findById(belge._id).lean();
    expect(sonra.makineListeleri.yerli).toHaveLength(1);
    expect(sonra.makineListeleri.ithal).toHaveLength(1);
  });
});
