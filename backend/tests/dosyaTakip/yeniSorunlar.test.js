// 🧪 29.09.2026 listesi — bildirim yönlendirmesi ve mükerrer talep uyarısı
//
// Müşteri: "belge yüklendi diye mail bilgi@gmplanlama.com'a düşüyor ya, onu takibi yapan'a
// düşürtebilir miyiz? Takibi yapan atanmamışsa, maili kim gönderdi ise ona düşsün."
// ve: "'daha önce sonuçlanan ve belgeye yansıtılan talep için açık talep var' diyor. Bu aynı
// talep uyarısına, sonuçlanma kısmına alınmış talepleri dahil etmeyelim."

const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const { ObjectId } = mongoose.Types;

const svc = require('../../services/islemEvrak/islemEvrakService');
const IslemTalebi = require('../../models/IslemTalebi');
const DosyaTakip = require('../../models/DosyaTakip');
const User = require('../../models/User');

jest.setTimeout(60000);

let mem;
const firma = new ObjectId();
let takipci, gonderen, acan;

const kullanici = (ad, eposta) => User.create({
  adSoyad: ad, email: eposta, sifre: 'Gecici123!', rol: 'kullanici'
});

beforeAll(async () => {
  mem = await MongoMemoryServer.create();
  await mongoose.connect(mem.getUri());
  [takipci, gonderen, acan] = await Promise.all([
    kullanici('Takip Eden', 'takip@gm.test'),
    kullanici('Mail Gönderen', 'gonderen@gm.test'),
    kullanici('Talebi Açan', 'acan@gm.test')
  ]);
  await mongoose.connection.db.collection('firmas').insertOne({ _id: firma, tamUnvan: 'GLOBTEKS A.Ş.' });
});
afterAll(async () => { await mongoose.disconnect(); if (mem) await mem.stop(); });
beforeEach(async () => { await Promise.all([IslemTalebi.deleteMany({}), DosyaTakip.deleteMany({})]); });

const talepKur = (ekler = {}) => IslemTalebi.create({
  firma, firmaAdi: 'GLOBTEKS', islemTuru: new ObjectId(), islemTuruAdi: 'Yeni Belge Talebi',
  olusturanKullanici: acan._id, istenenEvraklar: [{ ad: 'Vergi Levhası' }], ...ekler
});

const belgeTakipKur = (ekler = {}) => DosyaTakip.create({
  firma, firmaId: 'A1', firmaUnvan: 'GLOBTEKS A.Ş.', olusturanKullanici: acan._id, olusturanAdi: 'Talebi Açan',
  talepTuru: 'Belge Başvuru Talebi', ytbNo: '568289', ...ekler
});

describe('evrak yüklenince kime haber gidiyor', () => {
  test('Belge Takip\'te takibi yapan varsa ona gider', async () => {
    const takip = await belgeTakipKur({ muraacatSonrasi: { takibiYapanPersonel: takipci._id } });
    const talep = await talepKur({ dosyaTakip: takip._id, sonMailGonderen: gonderen._id });
    const { kullaniciIdleri, adresler } = await svc.yuklemeBildirimAlicilari(talep);
    expect(kullaniciIdleri).toEqual([String(takipci._id)]);
    expect(adresler).toEqual(['takip@gm.test']);
  });

  test('takibi yapan atanmamışsa maili gönderene gider', async () => {
    const takip = await belgeTakipKur();
    const talep = await talepKur({ dosyaTakip: takip._id, sonMailGonderen: gonderen._id });
    const { adresler } = await svc.yuklemeBildirimAlicilari(talep);
    expect(adresler).toEqual(['gonderen@gm.test']);
  });

  test('Belge Takip bağı yoksa da maili gönderen bulunur', async () => {
    const talep = await talepKur({ sonMailGonderen: gonderen._id });
    const { adresler } = await svc.yuklemeBildirimAlicilari(talep);
    expect(adresler).toEqual(['gonderen@gm.test']);
  });

  test('hiç mail gitmemişse talebi açana gider', async () => {
    const talep = await talepKur();
    const { adresler } = await svc.yuklemeBildirimAlicilari(talep);
    expect(adresler).toEqual(['acan@gm.test']);
  });

  test('kimse bulunamazsa ortak adrese düşer (haber tamamen kaybolmasın)', async () => {
    const eski = process.env.UPLOAD_NOTIFY_EMAIL;
    process.env.UPLOAD_NOTIFY_EMAIL = 'bilgi@gmplanlama.com';
    try {
      const talep = await IslemTalebi.create({
        firma, firmaAdi: 'GLOBTEKS', islemTuru: new ObjectId(), islemTuruAdi: 'Talep',
        istenenEvraklar: [{ ad: 'Vergi Levhası' }]
      });
      const { kullaniciIdleri, adresler } = await svc.yuklemeBildirimAlicilari(talep);
      expect(kullaniciIdleri).toEqual([]);
      expect(adresler).toEqual(['bilgi@gmplanlama.com']);
    } finally {
      if (eski === undefined) delete process.env.UPLOAD_NOTIFY_EMAIL; else process.env.UPLOAD_NOTIFY_EMAIL = eski;
    }
  });

  test('mail gönderilince "kim gönderdi" kaydedilir', async () => {
    const talep = await talepKur();
    const mailService = require('../../services/tesvikMakine/mailService');
    jest.spyOn(mailService, 'sendMail').mockResolvedValue({ messageId: 'm1' });
    await svc.mailGonder(talep, { to: ['firma@x.com'], subject: 'K', body: 'G', user: gonderen });
    expect(String(talep.sonMailGonderen)).toBe(String(gonderen._id));
    jest.restoreAllMocks();
  });
});

describe('mükerrer açık talep uyarısı', () => {
  const ara = () => DosyaTakip.acikMukerrerBul({ firma, talepTuru: 'Belge Başvuru Talebi', ytbNo: '568289' });

  test('devam eden talep uyarı üretir', async () => {
    await belgeTakipKur({ durum: '2.2.1.1_KURUM_BEKLENIYOR', anaAsama: 'KURUM_DEGERLENDIRME' });
    expect(await ara()).toBeTruthy();
  });

  test('sonuçlanan talep uyarı ÜRETMEZ', async () => {
    await belgeTakipKur({ durum: '2.3.5_SONUCLANDI', anaAsama: 'KURUM_SONUCLANMA' });
    expect(await ara()).toBeNull();
  });

  test('belgeye yansıtılan talep uyarı ÜRETMEZ', async () => {
    await belgeTakipKur({ durum: '2.3.6_BELGEYE_YANSITILDI', anaAsama: 'KURUM_SONUCLANMA' });
    expect(await ara()).toBeNull();
  });

  test('sonucu firmaya iletilen ve iptal edilen talepler de kapalı sayılır', async () => {
    await belgeTakipKur({ durum: '2.3.1_SONUC_FIRMAYA_ILETILDI', anaAsama: 'KURUM_SONUCLANMA' });
    await belgeTakipKur({ durum: '2.3.3_TALEP_FIRMA_IPTAL', anaAsama: 'KURUM_SONUCLANMA' });
    expect(await ara()).toBeNull();
  });

  test('bilerek bekletilen talep AÇIK sayılmaya devam eder', async () => {
    await belgeTakipKur({ durum: '2.3.2_SONUC_BEKLETILECEK', anaAsama: 'KURUM_SONUCLANMA' });
    expect(await ara()).toBeTruthy();
  });
});
