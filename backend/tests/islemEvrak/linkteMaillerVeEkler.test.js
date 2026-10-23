// 🧪 İşlem & Evrak — 23.10.2026 müşteri maddeleri
//  • "Burada eklediklerimizi silemiyoruz" → firma/personel ek belge satırını kaldırabilir, dosyalar kalır
//  • "Dosya eklediğimizde yükleme linkinde görünmüyor … link'in içine dahil edebilir miyiz?"
//  • "eski/önceki gönderilen mailleri de kapalı bir şekilde gösterme … bir bütün olarak"

const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const IslemTalebi = require('../../models/IslemTalebi');
require('../../models/IslemTuru');
require('../../models/Firma');
require('../../models/User');
const mailService = require('../../services/tesvikMakine/mailService');
const storageService = require('../../services/tesvikMakine/storageService');
const ctrl = require('../../controllers/islemEvrakController');

jest.setTimeout(60000);
let mem;
const user = { _id: new mongoose.Types.ObjectId(), adSoyad: 'Yiğit Yıldırım', rol: 'admin' };
beforeAll(async () => { mem = await MongoMemoryServer.create(); await mongoose.connect(mem.getUri()); });
afterAll(async () => { await mongoose.disconnect(); if (mem) await mem.stop(); });
afterEach(() => jest.restoreAllMocks());

const cagir = async (fn, req) => {
  const res = {
    statusCode: 200, headers: {}, status(c) { this.statusCode = c; return this; }, json(d) { this.body = d; return this; },
    setHeader(k, v) { this.headers[k] = v; }, send(b) { this.gonderilen = b; return this; }, end(b) { this.gonderilen = b; return this; }
  };
  await fn({ user, query: {}, body: {}, ...req }, res);
  return res;
};
let sayac = 0;
const talep = async () => {
  sayac += 1;
  return IslemTalebi.create({
    firma: new mongoose.Types.ObjectId(), islemTuru: new mongoose.Types.ObjectId(),
    firmaAdi: 'YUSUF ALİ MEMİŞ', islemTuruAdi: 'Yeni Belge', uploadToken: `mail-tok-${sayac}`,
    istenenEvraklar: [{ ad: 'E-TUYS Taahhütnamesi' }]
  });
};
const dosya = (ad) => ({ originalname: ad, buffer: Buffer.from(`${ad} içeriği`), mimetype: 'application/pdf', size: 12 });

test('maile özel ek linkte o mailin altında; önceki mailler en yeni önce, içerikleriyle', async () => {
  jest.spyOn(mailService, 'sendMail').mockResolvedValue({ messageId: '<a@b>', response: '250 OK' });
  jest.spyOn(storageService, 'saveBuffer').mockImplementation(async ({ originalName }) => ({ fileName: originalName, fileUrl: '', relPath: `islem/${originalName}` }));
  const t = await talep();

  await cagir(ctrl.talepMailGonder, { params: { id: String(t._id) }, body: { to: 'a@firma.test', subject: 'İlk talep', body: '<p>Birinci <b>mail</b></p>' }, uploadedFiles: [dosya('Vekaletname.pdf')] });
  await cagir(ctrl.talepMailGonder, { params: { id: String(t._id) }, body: { to: 'a@firma.test', subject: 'Devam', body: 'İkinci mail\nsatır' } });

  const r = await cagir(ctrl.publicBilgi, { params: { token: t.uploadToken } });
  const mailler = r.body.data.gonderilenMailler;
  expect(mailler.map((m) => [m.konu, m.tur])).toEqual([['Devam', 'devam'], ['İlk talep', 'ilk']]);
  expect(mailler[1].govde).toBe('<p>Birinci <b>mail</b></p>');
  expect(mailler[1].ekler.map((e) => e.dosyaAdi)).toEqual(['Vekaletname.pdf']);
  expect(mailler[0].ekler).toEqual([]);
  expect(JSON.stringify(mailler)).not.toMatch(/a@firma\.test|250 OK|Yiğit/); // alıcı, SMTP, personel firmaya gitmez

  // ek linkten indirilebiliyor
  const servis = jest.spyOn(storageService, 'serveFile').mockImplementation(async (d, res) => res.json({ ad: d.originalName }));
  const indir = await cagir(ctrl.publicMailEkiIndir, { params: { token: t.uploadToken, ekId: String(mailler[1].ekler[0].id) } });
  expect(indir.body).toEqual({ ad: 'Vekaletname.pdf' });
  expect(servis).toHaveBeenCalledTimes(1);

  // personel linkten kaldırınca mailin altında görünmez
  await cagir(ctrl.talepMailEkiSil, { params: { id: String(t._id), ekId: String(mailler[1].ekler[0].id) } });
  const r2 = await cagir(ctrl.publicBilgi, { params: { token: t.uploadToken } });
  expect(r2.body.data.gonderilenMailler[1].ekler).toEqual([]);
});

test('ek linke kaydedilemese de mail gider, hangisi eklenemedi söylenir', async () => {
  jest.spyOn(mailService, 'sendMail').mockResolvedValue({ messageId: '<a@b>' });
  jest.spyOn(storageService, 'saveBuffer').mockRejectedValue(new Error('depo kapalı'));
  jest.spyOn(console, 'error').mockImplementation(() => {});
  const t = await talep();
  const r = await cagir(ctrl.talepMailGonder, { params: { id: String(t._id) }, body: { to: 'a@firma.test', subject: 'K', body: 'Metin' }, uploadedFiles: [dosya('Kira.pdf')] });
  expect(r.statusCode).toBe(200);
  expect(r.body.data.linkeEklenemeyen).toEqual(['Kira.pdf']);
  expect(mailService.sendMail).toHaveBeenCalledTimes(1);
});

test('içerik saklanmamış eski talepte linkte yalnız son gönderilen mail görünür', async () => {
  const t = await talep();
  t.mailGecmisi = [{ tur: 'ilk', konu: 'Eski', tarih: new Date('2026-10-01') }];
  t.sonGonderilenMail = { konu: 'Eski', govde: 'Eski içerik', tarih: new Date('2026-10-01') };
  await t.save();
  const r = await cagir(ctrl.publicBilgi, { params: { token: t.uploadToken } });
  expect(r.body.data.gonderilenMailler).toEqual([expect.objectContaining({ konu: 'Eski', govde: 'Eski içerik', ekler: [] })]);
});

test('firma eklediği belgeyi kaldırır; yüklediği dosya personelde kalır', async () => {
  const t = await talep();
  const ekle = await cagir(ctrl.publicEkBelgeEkle, { params: { token: t.uploadToken }, body: { ad: 'Test belgesi' } });
  const ekId = String(ekle.body.data.id);
  const taze = await IslemTalebi.findById(t._id);
  taze.yuklenenEvraklar.push({ istenenEvrakId: ekId, istenenEvrakAdi: 'Test belgesi', dosyaAdi: 't.pdf' });
  await taze.save();

  const sil = await cagir(ctrl.publicEkBelgeSil, { params: { token: t.uploadToken, ekId } });
  expect(sil.statusCode).toBe(200);
  const sonra = await IslemTalebi.findById(t._id).lean();
  expect(sonra.firmaEkBelgeleri).toHaveLength(0);
  expect(sonra.yuklenenEvraklar.map((y) => y.istenenEvrakAdi)).toEqual(['Test belgesi']);

  const yok = await cagir(ctrl.publicEkBelgeSil, { params: { token: t.uploadToken, ekId } });
  expect(yok.statusCode).toBe(404);
  // başka talebin linkiyle silinemez
  const baska = await talep();
  const e2 = await cagir(ctrl.publicEkBelgeEkle, { params: { token: t.uploadToken }, body: { ad: 'Kira' } });
  const capraz = await cagir(ctrl.publicEkBelgeSil, { params: { token: baska.uploadToken, ekId: String(e2.body.data.id) } });
  expect(capraz.statusCode).toBe(404);
});

test('personel firmanın eklediği belgeyi kaldırabilir', async () => {
  const t = await talep();
  const ekle = await cagir(ctrl.publicEkBelgeEkle, { params: { token: t.uploadToken }, body: { ad: 'örnek' } });
  const r = await cagir(ctrl.talepFirmaEkiSil, { params: { id: String(t._id), ekId: String(ekle.body.data.id) } });
  expect(r.statusCode).toBe(200);
  expect(r.body.data.firmaEkBelgeleri).toHaveLength(0);
});
