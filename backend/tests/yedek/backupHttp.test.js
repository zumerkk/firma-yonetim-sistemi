const express = require('express');
const request = require('supertest');
const { PassThrough } = require('stream');

jest.mock('../../services/yedek/veritabaniArsivi', () => ({
  KOLEKSIYONLAR: [], yeniArsiv: jest.fn(), arsiveYaz: jest.fn()
}));
const { yeniArsiv, arsiveYaz } = require('../../services/yedek/veritabaniArsivi');
const { fullBackup } = require('../../controllers/backupController');

let arsiv;
let app;
beforeEach(() => {
  arsiv = new PassThrough();
  arsiv.abort = jest.fn();
  arsiv.pointer = () => 4;
  yeniArsiv.mockReturnValue(arsiv);
  app = express();
  app.get('/backup', (req, res) => {
    req.user = { adSoyad: 'Test', email: 'test@example.test' };
    return fullBackup(req, res);
  });
});

afterEach(() => jest.clearAllMocks());

test('tamamlanan yedek ZIP yanıtı ve tarihli dosya adı döndürür', async () => {
  arsiveYaz.mockImplementationOnce(async () => { arsiv.end('ZIP'); });
  const res = await request(app).get('/backup').expect(200);
  expect(res.headers['content-type']).toMatch(/application\/zip/);
  expect(res.headers['content-disposition']).toMatch(/GM_Yedek_.*\.zip/);
});

test('ZIP başladıktan sonraki arşiv hatası yanıtı açık bırakmaz veya başarıyla sonlandırmaz', async () => {
  arsiveYaz.mockImplementationOnce(async () => {
    arsiv.write('PK');
    await new Promise((r) => setImmediate(r));
    arsiv.emit('error', new Error('ZIP sıkıştırma hatası'));
  });
  await expect(request(app).get('/backup')).rejects.toThrow();
  expect(arsiv.destroyed).toBe(true);
});

test('yanıt başlamadan hata oluşursa JSON hata döner, ZIP adı taşımaz', async () => {
  arsiveYaz.mockRejectedValueOnce(new Error('Veritabanına erişilemiyor'));
  const res = await request(app).get('/backup').expect(500);
  expect(res.body.message).toContain('Veritabanına erişilemiyor');
  expect(res.headers['content-type']).toMatch(/application\/json/);
  expect(res.headers['content-disposition']).toBeUndefined();
  expect(arsiv.abort).toHaveBeenCalled();
});
