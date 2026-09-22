// 🧪 Belge Takip → firma maili: alıcılar, konu, yükleme bağlantısı ve firmadan gelen dosyalar
//
// Müşteri (15.09.2026, belge takip):
//   "Firma maili gönderirken Konu kısmına belge no ve talep türü de ekleyebilir miyiz? bu - DT2026253-
//    kısmını kaldırabiliriz firmanın görmesine gerek yok."
//   "İlk defa açarken kayıtlı olan firma bilgilerindeki maili otomatik çekebilir mi? Yetkili kişileri
//    çekse olur. Sonrasında bizim yazdığımız mailleri kaydedebilir her seferinde tekrardan mail girmek
//    yerine."
//   "Birde firma mailine yükleme linki koyabilir miyiz, yüklenen belgeler belge takipde firma maili-
//    gelen gibi bir alt kısımda görünebilir"
//
// Bellek içi MongoDB + supertest. Cloudinary ve SMTP taklit: dosya akışı tüketilip sahte kayıt döner.

const express = require('express');
const request = require('supertest');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');

const mockKullanici = { _id: '0000000000000000000000aa', adSoyad: 'Test Danışman', rol: 'admin', yetkiler: {} };
jest.mock('../../middleware/auth', () => ({
  authenticate: (req, res, next) => {
    req.user = mockKullanici;
    next();
  }
}));

jest.mock('../../services/tesvikMakine/mailService', () => ({
  isConfigured: () => false,
  sendMail: jest.fn()
}));

// Yükleme utils/parcaliDosya motorundan geçiyor; ağa çıkmasın diye Cloudinary'nin kendisi taklit
jest.mock('cloudinary', () => {
  const v2 = {
    config: () => {},
    uploader: {
      upload_stream: (secenek, cb) => ({
        end: (buffer) => {
          const pid = secenek.folder ? `${secenek.folder}/${secenek.public_id}` : secenek.public_id;
          setImmediate(() => cb(null, {
            public_id: pid,
            secure_url: `https://res.cloudinary.com/test/raw/upload/v1/${pid}`,
            bytes: buffer.length
          }));
        }
      }),
      destroy: async () => ({ result: 'ok' })
    },
    utils: { private_download_url: () => '' },
    url: () => ''
  };
  return { v2 };
});

const dosyaTakipRoutes = require('../../routes/dosyaTakip');
const belgeTakipYuklemeRoutes = require('../../routes/belgeTakipYukleme');
const DosyaTakip = require('../../models/DosyaTakip');
const Firma = require('../../models/Firma');
const Notification = require('../../models/Notification');

jest.setTimeout(60000);

const { ObjectId } = mongoose.Types;
const firmaA = new ObjectId();
const firmaB = new ObjectId();
const talepA = new ObjectId();
const talepEski = new ObjectId(); // firmaA'nın, daha önce firmaya mail gönderilmiş başka talebi
const talepB = new ObjectId();
const takipci = new ObjectId();

let mem;
let app;

beforeAll(async () => {
  mem = await MongoMemoryServer.create();
  await mongoose.connect(mem.getUri());

  // Modellerin kancaları (otomatik kimlik, doğrulama) bu testin konusu değil: doğrudan koleksiyona
  await Firma.collection.insertMany([
    {
      _id: firmaA, firmaId: 'A000001', tamUnvan: 'ÇINAR GIDA A.Ş.', aktif: true, firmaEmail: '',
      yetkiliKisiler: [{ adSoyad: 'Ayşe Yılmaz', eposta1: 'ayse@cinar.com.tr', eposta2: '' }]
    },
    {
      _id: firmaB, firmaId: 'A000002', tamUnvan: 'CAN METAL LTD. ŞTİ.', aktif: true, firmaEmail: 'info@canmetal.com.tr',
      yetkiliKisiler: [{ adSoyad: 'Mehmet Kaya', eposta1: 'mehmet@canmetal.com.tr' }]
    }
  ]);
  await DosyaTakip.collection.insertMany([
    {
      _id: talepA, takipId: 'DT2026253', firma: firmaA, firmaUnvan: 'ÇINAR GIDA A.Ş.',
      talepTuru: 'Destek Unsuru Revize Talebi', ytbNo: '568825', belgeId: '1234567', aktif: true,
      muraacatSonrasi: {
        takibiYapanPersonel: takipci,
        kurumEksik: { firmadanBeklenen: { beklenenEksikler: [{ metin: 'Vergi levhası' }] } }
      },
      genelNotlar: [{ metin: 'İç not — firmaya gösterilmez' }],
      dosyalar: [],
      firmaMailleri: []
    },
    {
      _id: talepEski, takipId: 'DT2026100', firma: firmaA, firmaUnvan: 'ÇINAR GIDA A.Ş.',
      talepTuru: 'Belge Başvuru Talebi', ytbNo: '500001', aktif: true, dosyalar: [],
      firmaMailleri: [{
        alicilar: ['muhasebe@cinar.com.tr'], cc: ['ayse@cinar.com.tr'], konu: 'Eski', govde: 'x',
        gonderen: new ObjectId(), tarih: new Date('2026-09-01')
      }]
    },
    {
      _id: talepB, takipId: 'DT2026300', firma: firmaB, firmaUnvan: 'CAN METAL LTD. ŞTİ.',
      talepTuru: 'Süre Revize Talebi', ytbNo: '', aktif: true, dosyalar: [], firmaMailleri: [],
      // Artık geçersiz eski değer: tam doğrulamalı save() bu kayıtta düşerdi
      odeme: { faturaDurumu: 'odendi' }
    }
  ]);

  app = express();
  app.use(express.json());
  app.use('/api/dosya-takip', dosyaTakipRoutes);
  app.use('/api/belge-takip-yukleme', belgeTakipYuklemeRoutes);
});

afterAll(async () => {
  await mongoose.disconnect();
  if (mem) await mem.stop();
});

const taslakAl = (id) => request(app).get(`/api/dosya-takip/${id}/firma-mail-taslak`);
const tokenAl = async (id) => (await DosyaTakip.findById(id).select('firmaYukleme').lean())?.firmaYukleme?.token;

describe('firma maili taslağı', () => {
  test('konu: belge no + talep türü; takip no ve iç belge kimliği yok', async () => {
    const { data } = (await taslakAl(talepA).expect(200)).body;
    expect(data.konu).toBe('Belge No: 568825 — Destek Unsuru Revize Talebi — ÇINAR GIDA A.Ş.');
    expect(data.konu).not.toContain('DT2026253');
    expect(data.konu).not.toContain('1234567');
  });

  test('alıcılar: firmanın başka talebinden gönderilen son mail hatırlanır, yetkili kişi öneride', async () => {
    const { data } = (await taslakAl(talepA).expect(200)).body;
    expect(data.alici).toBe('muhasebe@cinar.com.tr');
    expect(data.cc).toBe('ayse@cinar.com.tr');
    expect(data.adresOnerileri).toEqual([
      { adres: 'ayse@cinar.com.tr', etiket: 'Ayşe Yılmaz' },
      { adres: 'muhasebe@cinar.com.tr', etiket: 'Daha önce kullanıldı' }
    ]);
  });

  test('hiç mail gönderilmemiş firmada kayıtlı adreslerin hepsi gelir', async () => {
    const { data } = (await taslakAl(talepB).expect(200)).body;
    expect(data.alici).toBe('info@canmetal.com.tr, mehmet@canmetal.com.tr');
    expect(data.cc).toBe('');
  });

  test('yükleme bağlantısı bir kez üretilir ve metne girer; eski/geçersiz kayıtta da çalışır', async () => {
    const ilk = (await taslakAl(talepA).expect(200)).body.data;
    expect(ilk.yuklemeLinki).toMatch(/\/belge-yukle\/568825-[A-Za-z0-9]{10}$/);
    expect(ilk.govde).toContain(ilk.yuklemeLinki);
    const ikinci = (await taslakAl(talepA).expect(200)).body.data;
    expect(ikinci.yuklemeLinki).toBe(ilk.yuklemeLinki);
    expect(ilk.yuklemeLinki.endsWith(`/${await tokenAl(talepA)}`)).toBe(true);

    // Belge no yok, kayıtta geçersiz eski değer var
    const b = (await taslakAl(talepB).expect(200)).body.data;
    expect(b.yuklemeLinki).toMatch(/\/belge-yukle\/[A-Za-z0-9]{10}$/);
  });
});

describe('firma yükleme sayfası (herkese açık)', () => {
  let token;
  beforeAll(async () => {
    await taslakAl(talepA).expect(200);
    token = await tokenAl(talepA);
  });

  test('bilgi: firma, talep türü, belge no ve beklenen evraklar; iç bilgi sızmaz', async () => {
    const r = await request(app).get(`/api/belge-takip-yukleme/${token}`).expect(200);
    expect(r.body.data).toMatchObject({
      firmaUnvan: 'ÇINAR GIDA A.Ş.',
      talepTuru: 'Destek Unsuru Revize Talebi',
      belgeNo: '568825',
      beklenenler: ['Vergi levhası'],
      yuklenenler: []
    });
    const metin = JSON.stringify(r.body);
    expect(metin).not.toContain('DT2026253');
    expect(metin).not.toContain('İç not');
    expect(metin).not.toContain('@');
  });

  test('geçersiz bağlantı 404, süresi dolmuş bağlantı 410', async () => {
    await request(app).get('/api/belge-takip-yukleme/568825-YokBoyleBir').expect(404);
    await request(app).get('/api/belge-takip-yukleme/..%2F..%2Fetc').expect(404);
    const bToken = await tokenAl(talepB);
    await DosyaTakip.updateOne({ _id: talepB }, { $set: { 'firmaYukleme.sonKullanma': new Date('2020-01-01') } });
    await request(app).get(`/api/belge-takip-yukleme/${bToken}`).expect(410);
  });

  test('dosyasız istek ve desteklenmeyen tür 400', async () => {
    await request(app).post(`/api/belge-takip-yukleme/${token}`).field('yukleyenAdi', 'Ali').expect(400);
    const r = await request(app)
      .post(`/api/belge-takip-yukleme/${token}`)
      .attach('dosyalar', Buffer.from('MZ'), 'kurulum.exe')
      .expect(400);
    expect(r.body.message).toMatch(/desteklenmiyor/);
    expect((await DosyaTakip.findById(talepA).lean()).dosyalar).toHaveLength(0);
  });

  test('yükleme: dosyalar talebe firmaYukledi ile eklenir, Türkçe adlar bozulmaz, takip eden personele bildirim düşer', async () => {
    const r = await request(app)
      .post(`/api/belge-takip-yukleme/${token}`)
      .field('yukleyenAdi', 'Ali Çınar')
      .field('aciklama', 'Vergi levhası')
      .attach('dosyalar', Buffer.from('%PDF-1.4 a'), 'Vergi Levhası 2026.pdf')
      .attach('dosyalar', Buffer.from('%PDF-1.4 bb'), 'İmza sirküleri.pdf')
      .expect(200);
    expect(r.body.count).toBe(2);

    const talep = await DosyaTakip.findById(talepA).lean();
    expect(talep.dosyalar.map((d) => d.dosyaAdi)).toEqual(['Vergi Levhası 2026.pdf', 'İmza sirküleri.pdf']);
    talep.dosyalar.forEach((d) => {
      expect(d._id).toBeDefined();
      expect(d).toMatchObject({
        firmaYukledi: true,
        aciklama: 'Vergi levhası',
        yukleyenAdi: 'Firma — Ali Çınar',
        dosyaTipi: 'application/pdf'
      });
      expect(d.dosyaYolu).toMatch(/^https:\/\/res\.cloudinary\.com\//);
      expect(d.cloudinaryPublicId).toMatch(/^dosya-takip\//);
    });

    const bildirimler = await Notification.find({ userId: takipci }).lean();
    expect(bildirimler).toHaveLength(1);
    expect(bildirimler[0].title).toBe('Firmadan belge geldi — ÇINAR GIDA A.Ş.');
    expect(bildirimler[0].message).toContain('Vergi Levhası 2026.pdf');

    // Firma kendi gönderdiklerini sayfada görür
    const bilgi = await request(app).get(`/api/belge-takip-yukleme/${token}`).expect(200);
    expect(bilgi.body.data.yuklenenler.map((y) => y.ad)).toEqual(['Vergi Levhası 2026.pdf', 'İmza sirküleri.pdf']);
  });

  test('açıklama yazılmazsa kaynak yazılır; personel dosyası firmadan gelmiş sayılmaz', async () => {
    await request(app)
      .post(`/api/belge-takip-yukleme/${token}`)
      .attach('dosyalar', Buffer.from('\x89PNG'), 'foto.png')
      .expect(200);
    const son = (await DosyaTakip.findById(talepA).lean()).dosyalar.pop();
    expect(son).toMatchObject({
      aciklama: 'Firma yükleme bağlantısından gönderildi',
      yukleyenAdi: 'Firma (yükleme bağlantısı)',
      firmaYukledi: true
    });

    // Şemaya eklenen alan varsayılanı: eski/personel dosyaları "firmadan" görünmez
    const personelDosyasi = new DosyaTakip({ firma: firmaA, talepTuru: 'Belge Başvuru Talebi', dosyalar: [{ dosyaAdi: 'a.pdf', dosyaYolu: 'x' }] });
    expect(personelDosyasi.dosyalar[0].firmaYukledi).toBe(false);
  });
});
