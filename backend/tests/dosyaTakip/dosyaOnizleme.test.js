const express = require('express');
const request = require('supertest');
const path = require('path');
const fs = require('fs/promises');

jest.mock('../../middleware/auth', () => ({
  authenticate: (req, res, next) => req.headers.authorization === 'Bearer test'
    ? next() : res.status(401).json({ message: 'Oturum gerekli' })
}));

const DosyaTakip = require('../../models/DosyaTakip');
const routes = require('../../routes/dosyaTakip');
let dizin;
let bul;
let app;
const dosyaId = '000000000000000000000002';
const endpoint = `/api/dosya-takip/000000000000000000000001/dosya-getir/${dosyaId}`;

beforeAll(async () => {
  const kok = path.resolve(__dirname, '../../uploads');
  await fs.mkdir(kok, { recursive: true });
  dizin = await fs.mkdtemp(path.join(kok, 'onizleme-test-'));
  await fs.writeFile(path.join(dizin, 'belge.pdf'), '%PDF-1.4\npreview-test');
  app = express();
  app.use('/api/dosya-takip', routes);
  bul = jest.spyOn(DosyaTakip, 'findById');
});

afterAll(async () => { bul.mockRestore(); await fs.rm(dizin, { recursive: true, force: true }); });

beforeEach(() => {
  bul.mockResolvedValue({ dosyalar: [{
    _id: dosyaId, dosyaAdi: 'Başvuru.pdf', dosyaTipi: 'application/pdf',
    dosyaYolu: `/uploads/${path.basename(dizin)}/belge.pdf`
  }] });
});

test('önizleme dosya ucu oturum olmadan dosyayı vermez', async () => {
  const yanit = await request(app).get(endpoint);
  expect(yanit.status).toBe(401);
});

test('yerel PDF aynı yetkili API üzerinden inline MIME ve gerçek içerikle gelir', async () => {
  const yanit = await request(app).get(endpoint).set('Authorization', 'Bearer test');
  expect(yanit.status).toBe(200);
  expect(yanit.headers['content-type']).toContain('application/pdf');
  expect(yanit.headers['content-disposition']).toContain('inline;');
  expect(yanit.body.toString()).toContain('%PDF-1.4');
});

test('aynı uçtaki açık indirme davranışı ve Türkçe dosya adı korunur', async () => {
  const yanit = await request(app).get(`${endpoint}?dl=1`).set('Authorization', 'Bearer test');
  expect(yanit.status).toBe(200);
  expect(yanit.headers['content-disposition']).toContain('attachment;');
  expect(yanit.headers['content-disposition']).toContain(encodeURIComponent('Başvuru.pdf'));
});

test('uploads dışındaki yollar önizlemeyle okunamaz', async () => {
  bul.mockResolvedValue({ dosyalar: [{ _id: dosyaId, dosyaAdi: 'server.js', dosyaYolu: '/uploads/../server.js' }] });
  const yanit = await request(app).get(endpoint).set('Authorization', 'Bearer test');
  expect(yanit.status).toBe(403);
});

test('uploads içindeki eski mutlak yol okunabilir, dışarı çıkan sembolik bağlantı okunamaz', async () => {
  bul.mockResolvedValue({ dosyalar: [{ _id: dosyaId, dosyaAdi: 'belge.pdf', dosyaYolu: path.join(dizin, 'belge.pdf') }] });
  expect((await request(app).get(endpoint).set('Authorization', 'Bearer test')).status).toBe(200);
  await fs.symlink(path.resolve(__dirname, '../../package.json'), path.join(dizin, 'disari.json'));
  bul.mockResolvedValue({ dosyalar: [{ _id: dosyaId, dosyaAdi: 'disari.json', dosyaYolu: path.join(dizin, 'disari.json') }] });
  expect((await request(app).get(endpoint).set('Authorization', 'Bearer test')).status).toBe(403);
});

test('sunucuda bulunmayan eski yerel dosya anlaşılır 404 döndürür', async () => {
  bul.mockResolvedValue({ dosyalar: [{ _id: dosyaId, dosyaAdi: 'eksik.pdf', dosyaYolu: `/uploads/${path.basename(dizin)}/eksik.pdf` }] });
  const yanit = await request(app).get(endpoint).set('Authorization', 'Bearer test');
  expect(yanit.status).toBe(404);
  expect(yanit.body.message).toBe('Dosya sunucuda bulunamadı');
});
