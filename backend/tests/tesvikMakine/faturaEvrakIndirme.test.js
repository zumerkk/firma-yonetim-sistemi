const express = require('express');
const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');
const request = require('supertest');
const cloudinary = require('cloudinary').v2;
const { MongoMemoryServer } = require('mongodb-memory-server');
const MachineProcess = require('../../models/MachineProcess');
const User = require('../../models/User');
const Tesvik = require('../../models/Tesvik');
require('../../models/Firma');
const routes = require('../../routes/tesvikMakine');
const musteriRoutes = require('../../routes/musteriPortal');
const depo = require('../../services/tesvikMakine/faturaEvrakDeposu');
const { isCloudinaryConfigured } = require('../../services/tesvikMakine/storageService');

jest.mock('../../services/tesvikMakine/storageService', () => ({
  ...jest.requireActual('../../services/tesvikMakine/storageService'),
  isCloudinaryConfigured: jest.fn(() => false)
}));

jest.setTimeout(60_000);

const app = express();
app.use(express.json());
app.use('/api/tesvik-makine', routes);
app.use('/api/musteri-belge', musteriRoutes);

const icerik = Buffer.from('%PDF-1.4\nSentetik fatura\n%%EOF\n');
const kullanici = new mongoose.Types.ObjectId();
const editor = new mongoose.Types.ObjectId();
const tesvikId = new mongoose.Types.ObjectId();
const evrakYolu = (surec, kalemId, evrakId) =>
  `/api/tesvik-makine/process/${surec._id}/fatura-kalemleri/${kalemId}/evrak/${evrakId}`;

let mongo;
let token;
let editorToken;
let dosya;
let yerli;
let ithal;

beforeAll(async () => {
  process.env.JWT_SECRET = 'fatura-evrak-indirme-testi';
  mongo = await MongoMemoryServer.create();
  await mongoose.connect(mongo.getUri());
  await User.collection.insertMany([
    { _id: kullanici, email: 'personel@example.test', adSoyad: 'Test Personel', aktif: true, rol: 'readonly' },
    { _id: editor, email: 'editor@example.test', adSoyad: 'Test Editör', aktif: true, rol: 'kullanici' }
  ]);
  await Tesvik.collection.insertOne({
    _id: tesvikId, makineListeleri: { yerli: [{ rowId: 'local' }], ithal: [{ rowId: 'import' }] }
  });
  token = jwt.sign({ id: String(kullanici) }, process.env.JWT_SECRET);
  editorToken = jwt.sign({ id: String(editor) }, process.env.JWT_SECRET);
  dosya = await depo.kaydet({ buffer: icerik, mimeType: 'application/pdf' });

  for (const listType of ['local', 'import']) {
    const surec = await MachineProcess.create({
      tesvikId, tesvikModel: 'Tesvik', listType, rowId: listType,
      faturalar: [
        {
          no: 'F-1',
          evraklar: [{
            tur: listType === 'local' ? 'fatura_pdf' : 'beyanname_pdf', dosyaAdi: 'fatura.pdf',
            mimeType: 'application/pdf', fileSize: icerik.length,
            depo: dosya, istekId: 'yukleme-testi', istekOzeti: 'ozet'
          }]
        },
        { no: 'F-2' }
      ]
    });
    if (listType === 'local') yerli = surec;
    else ithal = surec;
  }
});

afterAll(async () => {
  if (dosya) await depo.sil(dosya);
  await mongoose.disconnect();
  if (mongo) await mongo.stop();
});

test('oturumlu personel yerli faturanın kendi dosyasını güvenli başlıklarla indirir', async () => {
  const kalem = yerli.faturalar[0];
  const adres = evrakYolu(yerli, kalem._id, kalem.evraklar[0]._id);
  await request(app).get(adres).expect(401);

  const yanit = await request(app).get(adres).auth(token, { type: 'bearer' }).expect(200);
  expect(yanit.headers['content-type']).toBe('application/pdf');
  expect(yanit.headers['content-disposition']).toContain('attachment; filename="fatura.pdf"');
  expect(yanit.headers['cache-control']).toBe('private, no-store');
  expect(yanit.headers['x-content-type-options']).toBe('nosniff');
  expect(yanit.body).toEqual(icerik);
});

test('ithal beyanname indirilir; farklı süreç ve kalemden indirme yapılamaz', async () => {
  const evrakId = yerli.faturalar[0].evraklar[0]._id;
  const ithalKalem = ithal.faturalar[0];
  await request(app).get(evrakYolu(yerli, yerli.faturalar[1]._id, evrakId))
    .auth(token, { type: 'bearer' }).expect(404);
  await request(app).get(evrakYolu(ithal, yerli.faturalar[0]._id, evrakId))
    .auth(token, { type: 'bearer' }).expect(404);
  const yanit = await request(app).get(evrakYolu(ithal, ithalKalem._id, ithalKalem.evraklar[0]._id))
    .auth(token, { type: 'bearer' }).expect(200);
  expect(yanit.body).toEqual(icerik);
});

test('ithal beyannameye yalnız düzenleme yetkili personel ek yükler; personel kalemi de desteklenir', async () => {
  const kalemId = ithal.faturalar[1].id;
  const adres = `/api/tesvik-makine/process/${ithal._id}/fatura-kalemleri/${kalemId}/evrak`;
  const yerliAdres = `/api/tesvik-makine/process/${yerli._id}/fatura-kalemleri/${yerli.faturalar[1].id}/evrak`;
  const yukle = () => request(app).post(adres).field('istekId', 'personel-ithal-ek-1')
    .attach('yurtdisiFaturaPdf', icerik, 'yurtdisi.pdf');
  await yukle().expect(401);
  await yukle().auth(token, { type: 'bearer' }).expect(403);
  await request(app).post(yerliAdres).auth(editorToken, { type: 'bearer' })
    .attach('beyannamePdf', icerik, 'beyanname.pdf').expect(400);
  await request(app).post(adres).auth(editorToken, { type: 'bearer' })
    .attach('faturaPdf', icerik, 'yerli.pdf').expect(400);
  try {
    const yanit = await yukle().auth(editorToken, { type: 'bearer' }).expect(200);
    const kalem = yanit.body.data.faturalar.find((k) => k._id === kalemId);
    expect(kalem.kaynak).toBe('personel');
    expect(kalem.evraklar).toHaveLength(1);
    expect(kalem.evraklar[0]).toMatchObject({ tur: 'yurtdisi_fatura_pdf', dosyaAdi: 'yurtdisi.pdf' });
    expect(kalem.evraklar[0]).not.toHaveProperty('depo');
    expect(kalem.evraklar[0]).not.toHaveProperty('istekId');
    const tekrar = await yukle().auth(editorToken, { type: 'bearer' }).expect(200);
    expect(tekrar.body.data.faturalar.find((k) => k._id === kalemId).evraklar).toEqual(kalem.evraklar);
    const indirilen = await request(app).get(evrakYolu(ithal, kalemId, kalem.evraklar[0]._id))
      .auth(token, { type: 'bearer' }).expect(200);
    expect(indirilen.body).toEqual(icerik);
  } finally {
    const surec = await MachineProcess.findById(ithal._id).select('+faturalar.evraklar.depo');
    await Promise.all(surec.faturalar.id(kalemId).evraklar.map((ek) => depo.sil(ek.depo)));
  }
});

test('personel yerli kaleme her türden birden fazla evrak yükleyebilir', async () => {
  const kalemId = yerli.faturalar[1].id;
  const adres = `/api/tesvik-makine/process/${yerli._id}/fatura-kalemleri/${kalemId}/evrak`;
  const xml = Buffer.from('<?xml version="1.0"?><Invoice><ID>TEST-2</ID></Invoice>');
  const ekle = (istekId) => request(app).post(adres).auth(editorToken, { type: 'bearer' })
    .field('istekId', istekId);

  await request(app).post(`/api/tesvik-makine/process/${ithal._id}/fatura-kalemleri/${kalemId}/evrak`)
    .auth(editorToken, { type: 'bearer' }).attach('faturaPdf', icerik, 'fatura.pdf').expect(404);
  try {
    const yanit = await ekle('personel-yerli-ek-1')
      .attach('faturaPdf', icerik, 'fatura-1.pdf').attach('faturaPdf', icerik, 'fatura-2.pdf')
      .attach('faturaXml', xml, { filename: 'fatura-1.xml', contentType: 'application/xml' })
      .attach('faturaXml', xml, { filename: 'fatura-2.xml', contentType: 'application/xml' })
      .attach('yevmiyePdf', icerik, 'yevmiye-1.pdf').attach('yevmiyePdf', icerik, 'yevmiye-2.pdf').expect(200);
    const ekler = yanit.body.data.faturalar.find((k) => k._id === kalemId).evraklar;
    expect(ekler.map((ek) => ek.tur)).toEqual([
      'fatura_pdf', 'fatura_pdf', 'fatura_xml', 'fatura_xml', 'yevmiye_pdf', 'yevmiye_pdf'
    ]);
    const sonraki = await ekle('personel-yerli-ek-2').attach('yevmiyePdf', icerik, 'yevmiye-3.pdf').expect(200);
    expect(sonraki.body.data.faturalar.find((k) => k._id === kalemId).evraklar).toEqual([
      ...ekler, expect.objectContaining({ tur: 'yevmiye_pdf', dosyaAdi: 'yevmiye-3.pdf' })
    ]);
  } finally {
    const surec = await MachineProcess.findById(yerli._id).select('+faturalar.evraklar.depo');
    await Promise.all(surec.faturalar.id(kalemId).evraklar.map((ek) => depo.sil(ek.depo)));
  }
});

test('personel süreç detayında evrak bilgileri görünür ve depo bilgileri dönmez', async () => {
  const yanit = await request(app).get(`/api/tesvik-makine/process/${yerli._id}`)
    .auth(token, { type: 'bearer' }).expect(200);
  const evrak = yanit.body.data.process.faturalar[0].evraklar[0];
  expect(evrak).toMatchObject({ tur: 'fatura_pdf', dosyaAdi: 'fatura.pdf', fileSize: icerik.length });
  expect(evrak).not.toHaveProperty('depo');
  expect(evrak).not.toHaveProperty('istekId');
  expect(evrak).not.toHaveProperty('istekOzeti');
});

test.each([
  ['local', 'yerli', 'faturaPdf', 'faturaXml', 'fatura.xml'],
  ['import', 'ithal', 'beyannamePdf', 'yurtdisiFaturaPdf', 'yurtdisi.pdf']
])('müşterinin %s kaleme yüklediği dosyalar personel ekranından okunur', async (listType, liste, pdfAlan, ucuncuAlan, ucuncuAd) => {
  const belgeId = new mongoose.Types.ObjectId();
  const musteriToken = `sentetik-evrak-yukleme-${listType}`;
  const rowId = 'MAKINE-1';
  const musteriYolu = `/api/musteri-belge/${musteriToken}`;
  await Tesvik.collection.insertOne({
    _id: belgeId, yatirimciUnvan: 'Sentetik Firma', musteriPortal: { token: musteriToken },
    makineListeleri: { [liste]: [{ rowId, makineId: '1', adiVeOzelligi: 'Test Makinesi', gumrukDovizKodu: 'EUR' }] }
  });
  const kalem = await request(app).post(`${musteriYolu}/fatura-kalemi`)
    .send({ rowId, listType, tarih: '2026-11-11', no: 'TEST-1', tutar: 123, tutarParaBirimi: 'TRY', adet: 1, giren: 'Test Müşteri' })
    .expect(200);
  const kalemId = kalem.body.data.yeniKalemId;
  const xml = Buffer.from('<?xml version="1.0"?><Invoice><ID>TEST-1</ID></Invoice>');
  const ithalMi = listType === 'import';
  expect(kalem.body.data).toMatchObject({ faturaTutarToplamlari: { TRY: 123 }, faturaToplami: 123 });
  try {
    const yukleme = await request(app).post(`${musteriYolu}/fatura-kalemi/${kalemId}/evrak`)
      .field('rowId', rowId).field('istekId', 'sentetik-yukleme-1')
      .attach(pdfAlan, icerik, { filename: 'ek-1.pdf', contentType: 'application/pdf' })
      .attach(pdfAlan, icerik, { filename: 'ek-2.pdf', contentType: 'application/pdf' })
      .attach(ucuncuAlan, ithalMi ? icerik : xml, { filename: ucuncuAd, contentType: ithalMi ? 'application/pdf' : 'application/xml' })
      .attach('yevmiyePdf', icerik, { filename: 'yevmiye.pdf', contentType: 'application/pdf' })
      .expect(200);
    const ekler = yukleme.body.data.kalemler.find((k) => k._id === kalemId).evraklar;
    expect(ekler.map((e) => e.dosyaAdi)).toEqual(['ek-1.pdf', 'ek-2.pdf', ucuncuAd, 'yevmiye.pdf']);
    const surec = await MachineProcess.findOne({ tesvikId: belgeId, rowId });
    for (const ek of ekler) {
      const yanit = await request(app).get(evrakYolu(surec, kalemId, ek._id)).auth(token, { type: 'bearer' })
        .buffer(true).parse((res, done) => {
          const parcalar = [];
          res.on('data', (parca) => parcalar.push(parca));
          res.on('end', () => done(null, Buffer.concat(parcalar)));
        }).expect(200);
      expect(yanit.headers['content-type']).toBe(ek.mimeType);
      expect(yanit.body).toEqual(ek.tur === 'fatura_xml' ? xml : icerik);
    }
  } finally {
    const surec = await MachineProcess.findOne({ tesvikId: belgeId, rowId }).select('+faturalar.evraklar.depo');
    await Promise.all((surec?.faturalar.id(kalemId)?.evraklar || []).map((ek) => depo.sil(ek.depo)));
  }
});

test('bulut deposu dosyayı kimlik doğrulamalı kaydeder ve sunucudan imzalı olarak okur', async () => {
  isCloudinaryConfigured.mockReturnValue(true);
  jest.spyOn(cloudinary, 'config').mockImplementation(() => {});
  const yukleme = jest.spyOn(cloudinary.uploader, 'upload_stream').mockImplementation((_ayarlar, done) => ({
    end: () => done(null)
  }));
  const imzaliIndirme = jest.spyOn(cloudinary.utils, 'private_download_url').mockReturnValue('https://example.test/indirme');
  const imzaliCdn = jest.spyOn(cloudinary, 'url').mockReturnValue('https://example.test/cdn');
  const silme = jest.spyOn(cloudinary.uploader, 'destroy').mockResolvedValue({ result: 'ok' });
  const getir = jest.spyOn(global, 'fetch')
    .mockResolvedValueOnce({ ok: false, status: 404 })
    .mockResolvedValueOnce({ ok: true, arrayBuffer: async () => icerik });
  const ayarlar = { resource_type: 'raw', type: 'authenticated' };

  try {
    const kayit = await depo.kaydet({ buffer: icerik, mimeType: 'application/xml' });
    expect(kayit.providerFileId).toMatch(/^gm-fatura-evrak\/[a-f0-9-]+\.xml$/);
    expect(yukleme).toHaveBeenCalledWith({ ...ayarlar, public_id: kayit.providerFileId, overwrite: false, timeout: 60_000 }, expect.any(Function));
    expect(await depo.oku(kayit)).toEqual(icerik);
    expect(imzaliIndirme).toHaveBeenCalledWith(kayit.providerFileId, '', { ...ayarlar, expires_at: expect.any(Number) });
    expect(imzaliCdn).toHaveBeenCalledWith(kayit.providerFileId, { ...ayarlar, secure: true, sign_url: true });
    expect(getir.mock.calls.map(([url]) => url)).toEqual(['https://example.test/indirme', 'https://example.test/cdn']);
    await depo.sil(kayit);
    expect(silme).toHaveBeenCalledWith(kayit.providerFileId, ayarlar);
  } finally {
    jest.restoreAllMocks();
    isCloudinaryConfigured.mockReturnValue(false);
  }
});
