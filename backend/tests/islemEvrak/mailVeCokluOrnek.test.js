const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const IslemTalebi = require('../../models/IslemTalebi');
const IslemTuru = require('../../models/IslemTuru');
const svc = require('../../services/islemEvrak/islemEvrakService');
const ctrl = require('../../controllers/islemEvrakController');
const storage = require('../../services/tesvikMakine/storageService');
const mail = require('../../services/tesvikMakine/mailService');

jest.setTimeout(60000);
let mem;
let sayac = 0;
const user = { _id: new mongoose.Types.ObjectId(), adSoyad: 'Danışman' };
const ornek = (ad) => ({ dosyaAdi: ad, fileUrl: `https://res.cloudinary.com/test/raw/upload/v1/${ad}` });
const cagir = async (fn, req) => {
  const res = { statusCode: 200, status(c) { this.statusCode = c; return this; }, json(body) { this.body = body; return this; } };
  await fn({ user, body: {}, query: {}, ...req }, res);
  return res;
};
const talepKur = async (ek = {}) => IslemTalebi.create({
  firma: new mongoose.Types.ObjectId(), islemTuru: new mongoose.Types.ObjectId(),
  firmaAdi: 'Firma', islemTuruAdi: 'İşlem', uploadToken: `coklu-ornek-${++sayac}`,
  istenenEvraklar: [{ ad: 'Taahhütname', ornekDosya: ornek('eski.docx') }], ...ek
});

beforeAll(async () => { mem = await MongoMemoryServer.create(); await mongoose.connect(mem.getUri()); });
afterAll(async () => { await mongoose.disconnect(); if (mem) await mem.stop(); });
afterEach(() => jest.restoreAllMocks());

test('gönderilen mail taslaktan bağımsızdır; devam maili aynı linkte son içeriği gösterir', async () => {
  jest.spyOn(mail, 'sendMail').mockResolvedValue({ response: '250 accepted' });
  const t = await talepKur();
  await svc.mailGonder(t, { to: ['firma@test.com'], subject: 'İlk mail', body: '<p>İlk <b>içerik</b></p>', user });
  await cagir(ctrl.talepGuncelle, { params: { id: t.id }, body: { mailKonusu: 'Gönderilmemiş taslak', mailGovdesi: 'Gizli taslak' } });
  const ilk = await cagir(ctrl.publicBilgi, { params: { token: t.uploadToken } });
  expect(ilk.body.data.gonderilenMail).toMatchObject({ konu: 'İlk mail', govde: '<p>İlk <b>içerik</b></p>' });
  expect(JSON.stringify(ilk.body.data)).not.toContain('Gizli taslak');
  expect(ilk.body.data.mailAlicilar).toBeUndefined();
  await svc.mailGonder(await IslemTalebi.findById(t._id), { to: ['firma@test.com'], subject: 'Devam maili', body: 'Yeni eksikler\nLütfen tekrar yükleyin.', user });
  const son = await cagir(ctrl.publicBilgi, { params: { token: t.uploadToken } });
  expect(son.body.data.gonderilenMail).toMatchObject({ konu: 'Devam maili', govde: 'Yeni eksikler\nLütfen tekrar yükleyin.' });
});

test('SMTP başarısızsa public mail değişmez; gönderilmemiş talebin taslağı açığa çıkmaz', async () => {
  const t = await talepKur({ mailKonusu: 'Taslak', mailGovdesi: 'Henüz gönderilmedi' });
  expect((await cagir(ctrl.publicBilgi, { params: { token: t.uploadToken } })).body.data.gonderilenMail).toBeNull();
  jest.spyOn(mail, 'sendMail').mockRejectedValue(new Error('SMTP unavailable'));
  await expect(svc.mailGonder(t, { to: ['firma@test.com'], subject: 'Yeni mail', body: 'Gönderilemedi', user })).rejects.toThrow('SMTP unavailable');
  expect((await IslemTalebi.findById(t._id)).sonGonderilenMail?.tarih).toBeUndefined();
});

test('eski tekli örneğe çoklu yükleme eklenir; public bilgiler dosya yollarını paylaşmaz', async () => {
  const t = await talepKur();
  jest.spyOn(svc, 'dosyaKaydet').mockImplementation(async (_talep, f) => ({ orijinalAd: f.originalname, filePath: `ornek/${f.originalname}`, fileSize: 1 }));
  const r = await cagir(ctrl.talepOrnekDosyaYukle, {
    params: { id: t.id, evrakId: t.istenenEvraklar[0].id },
    uploadedFiles: [{ originalname: 'yeni1.pdf' }, { originalname: 'yeni2.docx' }]
  });
  expect(r.statusCode).toBe(200);
  expect(r.body.data.istenenEvraklar[0].ornekDosyalar.map((o) => o.dosyaAdi)).toEqual(['eski.docx', 'yeni1.pdf', 'yeni2.docx']);
  const bilgi = (await cagir(ctrl.publicBilgi, { params: { token: t.uploadToken } })).body.data;
  expect(bilgi.istenenEvraklar[0].ornekDosyalar).toEqual([
    { indeks: 0, dosyaAdi: 'eski.docx' }, { indeks: 1, dosyaAdi: 'yeni1.pdf' }, { indeks: 2, dosyaAdi: 'yeni2.docx' }
  ]);
  expect(JSON.stringify(bilgi)).not.toContain('filePath');
  const serve = jest.spyOn(storage, 'serveFile').mockResolvedValue();
  await cagir(ctrl.publicOrnekIndir, { params: { token: t.uploadToken, evrakId: t.istenenEvraklar[0].id }, query: { ornek: '2' } });
  expect(serve.mock.calls[0][0]).toMatchObject({ filePath: 'ornek/yeni2.docx', originalName: 'yeni2.docx' });
  serve.mockClear();
  const yok = await cagir(ctrl.publicOrnekIndir, { params: { token: t.uploadToken, evrakId: t.istenenEvraklar[0].id }, query: { ornek: '../private' } });
  expect(yok.statusCode).toBe(404);
  expect(serve).not.toHaveBeenCalled();
});

test('seçili evrakın tüm örnekleri maile eklenir; istenmeyen evrakın örnekleri paylaşılmaz', async () => {
  jest.spyOn(storage, 'bulutDosyasiniIndir').mockResolvedValue({ buffer: Buffer.from('dosya') });
  const send = jest.spyOn(mail, 'sendMail').mockResolvedValue({});
  const t = await talepKur({ istenenEvraklar: [
    { ad: 'Seçili', ornekDosyalar: [ornek('bir.pdf'), ornek('iki.docx')] },
    { ad: 'İstenmeyen', zorunlu: false, ornekDosyalar: [ornek('gizli.pdf')] },
    { ad: 'Ek çıkarılan', ornekDosya: ornek('haric.pdf') }
  ] });
  const secili = t.istenenEvraklar[0].id;
  const r = await cagir(ctrl.talepMailGonder, { params: { id: t.id }, body: {
    to: 'firma@test.com', subject: 'Evraklar', body: 'Merhaba', ekEvrakIdler: [secili, t.istenenEvraklar[1].id]
  } });
  expect(r.statusCode).toBe(200);
  expect(send.mock.calls[0][0].attachments.map((o) => o.filename)).toEqual(['bir.pdf', 'iki.docx']);
  const bilgi = (await cagir(ctrl.publicBilgi, { params: { token: t.uploadToken } })).body.data;
  expect(bilgi.istenenEvraklar.map((e) => e.ad)).toEqual(['Seçili', 'Ek çıkarılan']);
  expect((await cagir(ctrl.publicOrnekIndir, { params: { token: t.uploadToken, evrakId: t.istenenEvraklar[1].id } })).statusCode).toBe(404);
});

test('şablon ve varyanttaki çoklu örnekler yeni talebe kopyalanır ve ayrı ayrı indirilir', async () => {
  const firmaId = new mongoose.Types.ObjectId();
  await mongoose.connection.db.collection('firmas').insertOne({ _id: firmaId, tamUnvan: 'Test Firma', firmaEmail: 'firma@test.com' });
  const tur = await IslemTuru.create({ kod: `ornek_${++sayac}`, ad: 'Test İşlem',
    istenenEvraklar: [{ ad: 'Ana', ornekDosyalar: [ornek('ana1.pdf'), ornek('ana2.pdf')] }],
    varyantlar: [{ kod: 'v', ad: 'Varyant', istenenEvraklar: [{ ad: 'Varyant belge', ornekDosyalar: [ornek('v1.pdf'), ornek('v2.pdf')] }] }]
  });
  const t = await svc.talepOlustur({ firmaId, islemTuruId: tur.id, user });
  expect(t.istenenEvraklar[0].ornekDosyalar.map((o) => o.dosyaAdi)).toEqual(['ana1.pdf', 'ana2.pdf']);
  const degisen = await cagir(ctrl.talepVaryantUygula, { params: { id: t.id }, body: { varyantKod: 'v' } });
  expect(degisen.body.data.istenenEvraklar[0].ornekDosyalar.map((o) => o.dosyaAdi)).toEqual(['v1.pdf', 'v2.pdf']);
  const serve = jest.spyOn(storage, 'serveFile').mockResolvedValue();
  await cagir(ctrl.turOrnekDosyaIndir, { params: { id: tur.id }, query: { varyant: 'v', i: '0', ornek: '1' } });
  expect(serve.mock.calls[0][0]).toMatchObject({ originalName: 'v2.pdf' });
  await cagir(ctrl.talepDosyaIndir, { params: { id: t.id, dosyaId: degisen.body.data.istenenEvraklar[0].id }, query: { ornek: '1' } });
  expect(serve.mock.calls[1][0]).toMatchObject({ originalName: 'v2.pdf' });
});

test('son örnek kaldırıldığında eski tekli künye yeniden görünmez', () => {
  expect(svc.ornekDosyalari(new IslemTalebi({ istenenEvraklar: [{ ad: 'Belge', ornekDosya: ornek('eski.pdf'), ornekDosyalar: [] }] }).istenenEvraklar[0])).toEqual([]);
});


test('eski gönderim tarihli kayıt düzenlenirse doğrulanamayan taslak public yanıta eklenmez', async () => {
  const t = await talepKur({ sonMailTarihi: new Date(), mailGonderimSayisi: 1, mailKonusu: 'Eski mail', mailGovdesi: 'Eski kayıt' });
  await cagir(ctrl.talepGuncelle, { params: { id: t.id }, body: { mailKonusu: 'İç taslak', mailGovdesi: 'Gönderilmemiş çalışma notları' } });
  const bilgi = (await cagir(ctrl.publicBilgi, { params: { token: t.uploadToken } })).body.data;
  expect(bilgi.gonderilenMail).toBeNull();
  expect(JSON.stringify(bilgi)).not.toContain('Gönderilmemiş çalışma notları');
});

test('dosya yedeği tüm örnekleri tür, varyant ve talepten toplar; kaldırılmış örneği geri almaz', async () => {
  const { envanter } = require('../../services/yedek/evrakEnvanteri');
  await talepKur({ istenenEvraklar: [
    { ad: 'Çoklu', ornekDosyalar: [ornek('yedek-a.pdf'), ornek('yedek-b.pdf')] },
    { ad: 'Eski', ornekDosya: ornek('yedek-eski.pdf') },
    { ad: 'Kaldırılmış', ornekDosya: ornek('yedek-silindi.pdf'), ornekDosyalar: [] }
  ] });
  await IslemTuru.create({ kod: `yedek_${++sayac}`, ad: 'Yedek testi', istenenEvraklar: [
    { ad: 'Tür', ornekDosyalar: [ornek('yedek-a.pdf'), ornek('yedek-tur.pdf')] }
  ], varyantlar: [{ kod: 'v', ad: 'Varyant', istenenEvraklar: [{ ad: 'Varyant', ornekDosyalar: [ornek('yedek-v.pdf')] }] }] });
  const dosyalar = await envanter();
  for (const ad of ['yedek-a.pdf', 'yedek-b.pdf', 'yedek-eski.pdf', 'yedek-tur.pdf', 'yedek-v.pdf']) {
    expect(dosyalar.filter((d) => d.anahtar === ornek(ad).fileUrl)).toHaveLength(1);
  }
  expect(dosyalar.find((d) => d.anahtar === ornek('yedek-silindi.pdf').fileUrl)).toBeUndefined();
});
