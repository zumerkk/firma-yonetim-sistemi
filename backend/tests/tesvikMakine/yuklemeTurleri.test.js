// 🧪 İzinli yükleme türleri — müşteri (23.10.2026): ".txt, .zip, .rar gibi şeyleri de ekleyebilir miyiz?"
const express = require('express');
const request = require('supertest');
const { uploadMultiple } = require('../../middleware/tesvikUpload');

const app = express();
app.post('/y', uploadMultiple('dosyalar'), (req, res) => res.json({ adlar: req.uploadedFiles.map((f) => f.originalname) }));

const yukle = (ad, tur) => request(app).post('/y').attach('dosyalar', Buffer.from('x'), { filename: ad, contentType: tur });

test.each([
  ['notlar.txt', 'text/plain'],
  ['evraklar.zip', 'application/zip'],
  ['evraklar.zip', 'application/x-zip-compressed'],
  ['evraklar.rar', 'application/octet-stream'],
  ['evraklar.rar', 'application/vnd.rar'],
  ['arsiv.7z', 'application/x-7z-compressed']
])('%s (%s) kabul edilir', async (ad, tur) => {
  const r = await yukle(ad, tur);
  expect(r.status).toBe(200);
  expect(r.body.adlar).toEqual([ad]);
});

test('çalıştırılabilir dosya yine reddedilir', async () => {
  const r = await yukle('kurulum.exe', 'application/octet-stream');
  expect(r.status).toBeGreaterThanOrEqual(400);
});
