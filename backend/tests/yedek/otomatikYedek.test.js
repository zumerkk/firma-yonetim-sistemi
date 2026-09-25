// 🧪 Otomatik yedek — veritabanı + evraklar Google Drive'a
//
// Müşteri (25.09.2026): "verilerimizin yedeklenmesi ile ilgili nasıl tedbir alabiliriz,
// oto yedekleme vs gibi ne yapabiliriz?"
//
// Drive'a gerçekten bağlanılmaz: istemci taklit edilir. Burada kanıtlanan şeyler,
// yedeğin SESSİZCE bozulabileceği yerler: eksik dosya, iki kez yükleme, bütçe aşımı,
// saklama süresi ve "yedek hiç çalışmadı" durumunun kayda geçmesi.

const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const { ObjectId } = mongoose.Types;

const yedekIsi = require('../../services/yedek/yedekIsi');
const { envanter } = require('../../services/yedek/evrakEnvanteri');
const YedekDosya = require('../../models/YedekDosya');
const YedekCalismasi = require('../../models/YedekCalismasi');
const DosyaTakip = require('../../models/DosyaTakip');
const UploadedDocument = require('../../models/UploadedDocument');

jest.setTimeout(60000);

let mem;
const sessiz = () => {};
const firma = new ObjectId();
const kullanici = new ObjectId();

// ── Drive taklidi: yüklenenleri bellekte tutar
function sahteDrive({ yapilandirildi = true, yuklemeHatasi = null } = {}) {
  const yuklenenler = [];
  const klasorler = {};
  return {
    yuklenenler,
    klasorler,
    yapilandirildiMi: () => yapilandirildi,
    kimlikYolu: () => 'oauth',
    klasorSagla: async (ad, ust) => { klasorler[ad] = `id-${ad}-${ust}`; return klasorler[ad]; },
    dosyaYukle: async ({ ad, mimeType, akis, klasorId }) => {
      if (yuklemeHatasi) throw new Error(yuklemeHatasi);
      const parcalar = [];
      for await (const p of akis) parcalar.push(Buffer.from(p));
      const icerik = Buffer.concat(parcalar);
      const kayit = { id: `drive-${yuklenenler.length + 1}`, name: ad, size: icerik.length, mimeType, klasorId, icerik };
      yuklenenler.push(kayit);
      return kayit;
    },
    listele: async () => [],
    sil: async () => {}
  };
}

beforeAll(async () => {
  mem = await MongoMemoryServer.create();
  await mongoose.connect(mem.getUri());
  process.env.YEDEK_DRIVE_KLASOR_ID = 'kok-klasor';
});
afterAll(async () => { await mongoose.disconnect(); if (mem) await mem.stop(); delete process.env.YEDEK_DRIVE_KLASOR_ID; });
beforeEach(async () => {
  await Promise.all([YedekDosya.deleteMany({}), YedekCalismasi.deleteMany({}), DosyaTakip.deleteMany({}), UploadedDocument.deleteMany({})]);
});

describe('veritabanı yedeği', () => {
  test('ZIP üretir ve Drive\'a akıtır; içinde koleksiyon dosyaları vardır', async () => {
    await mongoose.connection.db.collection('firmas').insertOne({ tamUnvan: 'GLOBTEKS TEKSTİL A.Ş.', firmaId: 'A000001' });
    const istemci = sahteDrive();
    const sonuc = await yedekIsi.veritabaniniYedekle({ klasorId: 'vt', baslatan: 'Test', gunluk: sessiz, istemci });

    expect(sonuc.dosyaAdi).toMatch(/^GM_Veritabani_.*\.zip$/);
    expect(sonuc.driveId).toBeTruthy();
    expect(sonuc.boyut).toBeGreaterThan(0);
    const icerik = istemci.yuklenenler[0].icerik;
    expect(icerik.slice(0, 2).toString()).toBe('PK');          // geçerli ZIP
    const metin = icerik.toString('latin1');
    expect(metin).toContain('firmalar.json');                   // dosya adları ZIP'te düz durur
    expect(metin).toContain('metadata.json');
    expect(metin).toContain('dosya_takip.json');
    expect(sonuc.eksikler).toEqual([]);
  });

  test('yeni eklenen koleksiyonlar da yedeğe girer (işlem talepleri, evrak künyeleri, mail geçmişi)', () => {
    const { KOLEKSIYONLAR } = require('../../services/yedek/veritabaniArsivi');
    const dosyalar = KOLEKSIYONLAR.map((k) => k.dosya);
    expect(dosyalar).toEqual(expect.arrayContaining([
      'islem_talepleri.json', 'yuklenen_evraklar.json', 'makine_surecleri.json', 'mail_gecmisi.json'
    ]));
  });
});

describe('evrak yedeği (artımlı)', () => {
  const liste = () => Promise.resolve([
    { anahtar: 'https://res.cloudinary.com/x/a.pdf', kaynak: 'dosyaTakip', ad: 'a.pdf', boyut: 10, mimeType: 'application/pdf' },
    { anahtar: 'https://res.cloudinary.com/x/b.pdf', kaynak: 'dosyaTakip', ad: 'b.pdf', boyut: 20, mimeType: 'application/pdf' }
  ]);
  const indir = async () => ({ buffer: Buffer.from('dosya içeriği'), contentType: 'application/pdf' });

  test('eksik dosyaları kopyalar ve kaydeder', async () => {
    const istemci = sahteDrive();
    const s = await yedekIsi.evraklariYedekle({ klasorId: 'ev', gunluk: sessiz, istemci, indir, liste });
    expect(s).toMatchObject({ envanter: 2, yedekliOnceden: 0, yuklenen: 2, hatali: 0 });
    expect(await YedekDosya.countDocuments()).toBe(2);
  });

  test('ikinci turda aynı dosyalar TEKRAR yüklenmez', async () => {
    const istemci = sahteDrive();
    await yedekIsi.evraklariYedekle({ klasorId: 'ev', gunluk: sessiz, istemci, indir, liste });
    const ikinci = await yedekIsi.evraklariYedekle({ klasorId: 'ev', gunluk: sessiz, istemci, indir, liste });
    expect(ikinci).toMatchObject({ yedekliOnceden: 2, yuklenen: 0 });
    expect(istemci.yuklenenler).toHaveLength(2);
  });

  test('bir dosya indirilemezse diğerleri yedeklenmeye devam eder', async () => {
    const istemci = sahteDrive();
    const kotuIndir = async (url) => (url.endsWith('a.pdf') ? null : { buffer: Buffer.from('x'), contentType: 'application/pdf' });
    const s = await yedekIsi.evraklariYedekle({ klasorId: 'ev', gunluk: sessiz, istemci, indir: kotuIndir, liste });
    expect(s.yuklenen).toBe(1);
    expect(s.hatali).toBe(1);
    expect(s.hatalar[0]).toContain('a.pdf');
    // Hatalı dosya KAYDEDİLMEZ: ertesi gece yeniden denenir
    expect(await YedekDosya.countDocuments()).toBe(1);
  });

  test('süre bütçesi dolunca durur ve kalanı ertesi güne bırakır', async () => {
    const istemci = sahteDrive();
    let t = 0;
    const simdi = () => { t += 700 * 1000; return t; };   // her kontrolde 700 sn ilerlet
    const s = await yedekIsi.evraklariYedekle({ klasorId: 'ev', gunluk: sessiz, istemci, indir, liste, simdi });
    expect(s.sureDoldu).toBe(true);
    expect(s.yuklenen).toBeLessThan(2);
  });

  test('adet bütçesi ortam değişkeniyle sınırlanır', async () => {
    const eski = process.env.YEDEK_EVRAK_ADET;
    process.env.YEDEK_EVRAK_ADET = '1';
    try {
      const s = await yedekIsi.evraklariYedekle({ klasorId: 'ev', gunluk: sessiz, istemci: sahteDrive(), indir, liste });
      expect(s.yuklenen).toBe(1);
      expect(s.sureDoldu).toBe(true);
    } finally { if (eski === undefined) delete process.env.YEDEK_EVRAK_ADET; else process.env.YEDEK_EVRAK_ADET = eski; }
  });
});

describe('envanter', () => {
  test('bütün modüllerdeki dosyaları tek listede toplar, tekrarları ayıklar', async () => {
    const ayniAdres = 'https://res.cloudinary.com/x/ortak.pdf';
    await DosyaTakip.create({
      firma, firmaId: 'A1', firmaUnvan: 'GLOBTEKS', olusturanKullanici: kullanici, olusturanAdi: 'T',
      talepTuru: 'Belge Başvuru Talebi', ytbNo: '568289',
      dosyalar: [
        { dosyaAdi: 'vergi.pdf', dosyaYolu: ayniAdres, dosyaBoyutu: 100 },
        { dosyaAdi: 'imza.pdf', dosyaYolu: 'https://res.cloudinary.com/x/imza.pdf', dosyaBoyutu: 200 },
        { dosyaAdi: 'yerelde.pdf', dosyaYolu: '/opt/render/uploads/eski.pdf', dosyaBoyutu: 300 } // adres değil → atlanır
      ]
    });
    await UploadedDocument.create({
      tesvikModel: 'Tesvik', tesvikId: new ObjectId(), listType: 'local', rowId: 'r1',
      documentType: 'diger', fileName: 'f.pdf', originalName: 'fatura.pdf',
      fileUrl: ayniAdres, fileSize: 400   // aynı adres → tek kayıt olmalı
    });
    const liste = await envanter();
    const adresler = liste.map((x) => x.anahtar);
    expect(adresler).toContain(ayniAdres);
    expect(adresler).toContain('https://res.cloudinary.com/x/imza.pdf');
    expect(adresler.filter((a) => a === ayniAdres)).toHaveLength(1);       // tekrar yok
    expect(adresler.some((a) => a.startsWith('/opt'))).toBe(false);        // yerel yol yedeklenemez
  });
});

describe('saklama ve çalışma kaydı', () => {
  test('saklama süresi dolan veritabanı yedekleri silinir, yenileri kalır', async () => {
    const eski = new Date(Date.now() - 60 * 86400000).toISOString();
    const yeni = new Date().toISOString();
    const silinenler = [];
    const istemci = {
      ...sahteDrive(),
      listele: async () => ([
        { id: '1', name: 'GM_Veritabani_eski.zip', createdTime: eski },
        { id: '2', name: 'GM_Veritabani_yeni.zip', createdTime: yeni }
      ]),
      sil: async (id) => { silinenler.push(id); }
    };
    const s = await yedekIsi.eskileriTemizle({ klasorId: 'vt', gunluk: sessiz, istemci });
    expect(s.silinen).toBe(1);
    expect(silinenler).toEqual(['1']);
  });

  test('tam tur çalışma kaydı yazar', async () => {
    const istemci = sahteDrive();
    const sonuc = await yedekIsi.calistir({ tur: 'elle', baslatan: 'Seda', istemci, gunluk: sessiz, liste: () => Promise.resolve([]) });
    expect(sonuc.basarili).toBe(true);
    const kayit = await YedekCalismasi.findOne({}).lean();
    expect(kayit.baslatan).toBe('Seda');
    expect(kayit.veritabani.driveId).toBeTruthy();
    expect(kayit.bitti).toBeTruthy();
  });

  test('yükleme arşiv yazılırken patlarsa süreç düşmez, gerçek hata yüzeye çıkar', async () => {
    // Node 15+ ile sahipsiz reddedilen söz süreci öldürür: gece işi backend'i düşürmemeli.
    const sahipsiz = [];
    const dinleyici = (e) => sahipsiz.push(e);
    process.on('unhandledRejection', dinleyici);
    try {
      const istemci = { ...sahteDrive(), dosyaYukle: async () => { throw new Error('Drive 403: kota'); } };
      await expect(yedekIsi.veritabaniniYedekle({ klasorId: 'vt', baslatan: 'T', gunluk: sessiz, istemci }))
        .rejects.toThrow('Drive 403: kota');
      await new Promise((r) => setImmediate(r));
      expect(sahipsiz).toHaveLength(0);
    } finally { process.removeListener('unhandledRejection', dinleyici); }
  });

  test('yapılandırılmamışsa anlaşılır hata verir', async () => {
    const istemci = sahteDrive({ yapilandirildi: false });
    await expect(yedekIsi.calistir({ istemci, gunluk: sessiz })).rejects.toThrow(/yapılandırılmamış/i);
  });

  test('yedek ortasında patlarsa BAŞARISIZ olarak kaydedilir (sessizce kaybolmaz)', async () => {
    const istemci = sahteDrive({ yuklemeHatasi: 'Drive kotası doldu' });
    await expect(yedekIsi.calistir({ istemci, gunluk: sessiz, liste: () => Promise.resolve([]) })).rejects.toThrow('Drive kotası doldu');
    const kayit = await YedekCalismasi.findOne({}).lean();
    expect(kayit.basarili).toBe(false);
    expect(kayit.hata).toContain('Drive kotası doldu');
  });
});
