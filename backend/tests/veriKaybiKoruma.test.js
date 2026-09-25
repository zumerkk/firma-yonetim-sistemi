// 🧪 Geriye dönük veri kaybı korumaları
//
// Müşteri (23.09.2026): "İçerikte bazı değişiklikler yapacağız … Biz bu değişiklikleri
// yaptığımızda, dosya takip sistemindeki linklerin ve gelen evrakların kaybolmaması
// gerekiyor. … Bu değişiklikler sırasında geriye dönük veri kaybı yaşamayalım."
//
// Burada üç kaybın da olmadığı kanıtlanıyor: (1) firmaya gitmiş yükleme linki ölmesin,
// (2) gelen evrakın istenen evrakla bağı kopmasın, (3) yüklenen dosya uçucu diske düşmesin.

const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const { ObjectId } = mongoose.Types;

const tokenService = require('./../services/tesvikMakine/uploadTokenService');
const svc = require('../services/islemEvrak/islemEvrakService');
const ctrl = require('../controllers/islemEvrakController');
const IslemTuru = require('../models/IslemTuru');
const IslemTalebi = require('../models/IslemTalebi');
const Tesvik = require('../models/Tesvik');
const ctrlTesvik = require('../controllers/tesvikController');

jest.setTimeout(60000);

let mem;
const user = { _id: new ObjectId(), adSoyad: 'Seda Durak' };
const firma = new ObjectId();

const yanit = () => { const r = {}; r.json = (g) => { r.govde = g; return r; }; r.status = () => r; return r; };
const cagir = async (fn, req) => { const r = yanit(); await fn(req, r, (e) => { throw e; }); return r.govde; };

beforeAll(async () => {
  mem = await MongoMemoryServer.create();
  await mongoose.connect(mem.getUri());
  await mongoose.connection.db.collection('firmas').insertOne({ _id: firma, tamUnvan: 'GLOBTEKS TEKSTİL A.Ş.', firmaEmail: 'info@globteks.com' });
});
afterAll(async () => { await mongoose.disconnect(); if (mem) await mem.stop(); });
beforeEach(async () => { await Promise.all([IslemTuru.deleteMany({}), IslemTalebi.deleteMany({})]); });

describe('1. Firmaya gitmiş yükleme linki', () => {
  test('işlem türü adı sonradan değişse de link AYNI kalır', async () => {
    const talep = await IslemTalebi.create({
      firma, firmaAdi: 'GLOBTEKS', islemTuru: new ObjectId(), islemTuruAdi: 'Yeni Belge Talebi',
      istenenEvraklar: [{ ad: 'Vergi Levhası' }]
    });
    const ilk = await svc.ensureUploadLink(talep);
    expect(ilk).toContain('/evrak/');

    talep.islemTuruAdi = 'Belge Kapama Talebi'; // müşteri içeriği değiştirdi
    const sonra = await svc.ensureUploadLink(talep);
    expect(sonra).toBe(ilk);
  });

  test('eski biçimli (öneksiz, uzun) token da yaşatılır', async () => {
    const talep = await IslemTalebi.create({
      firma, firmaAdi: 'GLOBTEKS', islemTuru: new ObjectId(), islemTuruAdi: 'Yeni Belge Talebi',
      istenenEvraklar: [{ ad: 'Vergi Levhası' }],
      uploadToken: 'MsDYUfnn12bUdJxJDo_BmwpDqgi89E47JOknlUOJRQ0'
    });
    const link = await svc.ensureUploadLink(talep);
    expect(link).toContain('MsDYUfnn12bUdJxJDo_BmwpDqgi89E47JOknlUOJRQ0');
  });

  test('yalnız süresi dolan token yenilenir', async () => {
    const talep = await IslemTalebi.create({
      firma, firmaAdi: 'GLOBTEKS', islemTuru: new ObjectId(), islemTuruAdi: 'Yeni Belge',
      istenenEvraklar: [{ ad: 'Vergi Levhası' }],
      uploadToken: 'ESKI-Token123', uploadTokenExpiresAt: new Date(Date.now() - 86400000)
    });
    const link = await svc.ensureUploadLink(talep);
    expect(link).not.toContain('ESKI-Token123');
  });
});

describe('2. Gelen evrakın istenen evrakla bağı', () => {
  const kur = async () => {
    const tur = await IslemTuru.create({
      kod: 'kapama', ad: 'Kapama Talebi',
      istenenEvraklar: [{ ad: 'Vergi Levhası' }, { ad: 'İmza Sirküleri' }],
      varyantlar: [
        { kod: 'sahis', ad: 'Şahıs', istenenEvraklar: [{ ad: 'Vergi Levhası' }, { ad: 'Nüfus Cüzdanı' }] },
        { kod: 'sirket', ad: 'Şirket', istenenEvraklar: [{ ad: 'vergi levhası' }, { ad: 'İmza Sirküleri' }] }
      ]
    });
    const talep = await IslemTalebi.create({
      firma, firmaAdi: 'GLOBTEKS', islemTuru: tur._id, islemTuruAdi: tur.ad,
      istenenEvraklar: [{ ad: 'Vergi Levhası' }, { ad: 'İmza Sirküleri' }]
    });
    // Firma "Vergi Levhası"nı yükledi
    const hedef = talep.istenenEvraklar[0];
    talep.yuklenenEvraklar.push({ istenenEvrakId: hedef._id, istenenEvrakAdi: hedef.ad, dosyaAdi: 'vergi.pdf', fileUrl: 'https://res.cloudinary.com/x/vergi.pdf' });
    talep.durumTazele();
    await talep.save();
    return { tur, talep, evrakId: String(hedef._id) };
  };

  test('varyant değişince aynı evrakın kimliği ve "geldi" işareti korunur', async () => {
    const { talep, evrakId } = await kur();
    expect(talep.istenenEvraklar[0].geldiMi).toBe(true);

    await cagir(ctrl.talepVaryantUygula, { params: { id: String(talep._id) }, body: { varyantKod: 'sirket' }, user });

    const sonra = await IslemTalebi.findById(talep._id);
    const vergi = sonra.istenenEvraklar.find((e) => svc.evrakAnahtari(e.ad) === svc.evrakAnahtari('Vergi Levhası'));
    expect(String(vergi._id)).toBe(evrakId);           // kimlik korundu (yazım farkına rağmen)
    expect(vergi.geldiMi).toBe(true);                   // "geldi" işareti duruyor
    expect(sonra.yuklenenEvraklar).toHaveLength(1);     // dosya duruyor
    expect(sonra.durum).not.toBe('taslak');
  });

  test('varyantta olmayan evrak çıkarılsa bile yüklenen dosya silinmez', async () => {
    const { talep } = await kur();
    await cagir(ctrl.talepVaryantUygula, { params: { id: String(talep._id) }, body: { varyantKod: 'sahis' }, user });
    const sonra = await IslemTalebi.findById(talep._id);
    expect(sonra.istenenEvraklar.map((e) => e.ad)).toContain('Nüfus Cüzdanı');
    expect(sonra.yuklenenEvraklar).toHaveLength(1);
    expect(sonra.yuklenenEvraklar[0].dosyaAdi).toBe('vergi.pdf');
  });

  test('istenen evrak listesi kaydedilince mevcut satırların kimliği değişmez', async () => {
    const { talep, evrakId } = await kur();
    const gonderilen = talep.istenenEvraklar.map((e) => ({ _id: String(e._id), ad: e.ad, zorunlu: e.zorunlu }));
    gonderilen.push({ ad: 'Kapasite Raporu', zorunlu: false }); // kullanıcı yeni satır ekledi
    await cagir(ctrl.talepGuncelle, { params: { id: String(talep._id) }, body: { istenenEvraklar: gonderilen }, user });

    const sonra = await IslemTalebi.findById(talep._id);
    expect(String(sonra.istenenEvraklar[0]._id)).toBe(evrakId);
    expect(sonra.istenenEvraklar[0].geldiMi).toBe(true);
    expect(sonra.istenenEvraklar).toHaveLength(3);
  });
});

describe('4. Makine satırının kimliği (Ekipman Takip süreci buna bağlı)', () => {
  const { rowIdleriKoru } = require('../utils/rowIdKoru');

  test('rowId\'siz gelen satır, aynı makine ID\'li eski satırın kimliğini alır', () => {
    const mevcut = [{ rowId: 'A1', makineId: '2339380' }, { rowId: 'B2', makineId: '2339381' }];
    const { satirlar, korunan } = rowIdleriKoru(
      [{ makineId: '2339381' }, { makineId: '2339380' }, { makineId: '9999999' }], mevcut);
    expect(satirlar.map((r) => r.rowId)).toEqual(['B2', 'A1', undefined]);
    expect(korunan).toBe(2);
  });

  test('gelen satırın kendi rowId\'si varsa dokunulmaz', () => {
    const { satirlar } = rowIdleriKoru([{ rowId: 'YENI', makineId: '2339380' }], [{ rowId: 'A1', makineId: '2339380' }]);
    expect(satirlar[0].rowId).toBe('YENI');
  });

  test('aynı makine ID iki eski satırdaysa eşleşme yapılmaz (yanlış makineye bağlamaktansa yetim)', () => {
    const mevcut = [{ rowId: 'A1', makineId: '111' }, { rowId: 'A2', makineId: '111' }];
    expect(rowIdleriKoru([{ makineId: '111' }], mevcut).satirlar[0].rowId).toBeUndefined();
  });

  test('aynı kimlik iki gelen satıra verilmez', () => {
    const mevcut = [{ rowId: 'A1', makineId: '111' }];
    const { satirlar } = rowIdleriKoru([{ makineId: '111' }, { makineId: '111' }], mevcut);
    expect(satirlar[0].rowId).toBe('A1');
    expect(satirlar[1].rowId).toBeUndefined();
  });

  test('makine ID boşsa eşleşme yapılmaz', () => {
    expect(rowIdleriKoru([{ makineId: '' }], [{ rowId: 'A1', makineId: '' }]).satirlar[0].rowId).toBeUndefined();
  });

  test('liste yeniden içe aktarılınca satır kimlikleri korunur (uçtan uca)', async () => {
    const belge = await Tesvik.create({
      tesvikId: 'TES-KORU-1', gmId: 'GM-KORU', firma: firma, firmaId: 'A1', yatirimciUnvan: 'GLOBTEKS',
      olusturanKullanici: user._id,
      belgeYonetimi: { belgeId: '1047603', belgeNo: '568289', belgeTarihi: new Date('2026-01-01') },
      yatirimBilgileri: { yatirimKonusu: '2929 - MAKİNE İMALATI', destekSinifi: 'BÖLGESEL', yerinIl: 'NİĞDE' },
      makineListeleri: {
        yerli: [
          { rowId: 'ROW-1', siraNo: 1, makineId: '2339380', adiVeOzelligi: 'SU ARITMA', miktar: 1 },
          { rowId: 'ROW-2', siraNo: 2, makineId: '2339381', adiVeOzelligi: 'FIRIN', miktar: 1 }
        ],
        ithal: []
      }
    });
    // Excel'den düzeltilmiş liste yeniden aktarıldı: rowId YOK, sıra değişti, yeni satır eklendi
    const govde = {
      yerli: [
        { siraNo: 1, makineId: '2339381', adiVeOzelligi: 'FIRIN', miktar: 1 },
        { siraNo: 2, makineId: '2339380', adiVeOzelligi: 'SU ARITMA (REVİZE)', miktar: 2 },
        { siraNo: 3, makineId: '4455667', adiVeOzelligi: 'YENİ MAKİNE', miktar: 1 }
      ],
      ithal: []
    };
    await cagir(ctrlTesvik.saveMakineListeleri, { params: { id: String(belge._id) }, body: govde, user });

    const sonra = await Tesvik.findById(belge._id).lean();
    const satir = (mid) => sonra.makineListeleri.yerli.find((r) => r.makineId === mid);
    expect(satir('2339381').rowId).toBe('ROW-2');   // süreci/evrakı duruyor
    expect(satir('2339380').rowId).toBe('ROW-1');
    expect(satir('4455667').rowId).toBeTruthy();    // yeni satır yeni kimlik alır
    expect([satir('2339380').rowId, satir('2339381').rowId]).not.toContain(satir('4455667').rowId);
  });
});
