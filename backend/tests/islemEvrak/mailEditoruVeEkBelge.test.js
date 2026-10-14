// 🧪 İşlem & Evrak — 13.10.2026 müşteri maddeleri
//  • "Buraya mail düzenleme aparatı koyabilir miyiz?" → biçimli (HTML) gövde, sunucu süzer, düz metin karşılığı
//  • "mail taslağı hazırladığımız kısımdan da evrak ekleme … tek seferlik de olabilir" → saklanmayan ekler
//  • "yükleme linkinde en alt kısma + işareti ile Ek belge ekleme … sadece bir işlem için kayıtlı olsun"

const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const IslemTalebi = require('../../models/IslemTalebi');
require('../../models/IslemTuru');
require('../../models/Firma');
require('../../models/User');
const mailService = require('../../services/tesvikMakine/mailService');
const ctrl = require('../../controllers/islemEvrakController');
const { htmlTemizle, htmlMetneCevir, mailIcerigi } = require('../../utils/mailHtml');

describe('mail gövdesi HTML süzgeci', () => {
  test('betik, olay özniteliği, javascript: bağlantısı ve görsel ayıklanır; biçim kalır', () => {
    const kirli = '<p style="color:#c00000">Sayın <b>Yetkili</b></p><script>alert(1)</script>'
      + '<a href="javascript:alert(1)" onclick="x()">tıkla</a><img src=x onerror=alert(1)><iframe src="//kotu"></iframe>';
    const temiz = htmlTemizle(kirli);
    expect(temiz).toContain('<p style="color:#c00000">Sayın <b>Yetkili</b></p>');
    expect(temiz).not.toMatch(/script|onclick|onerror|javascript:|<img|iframe/i);
  });

  test('düz metin karşılığı: satırlar, liste ve bağlantı adresi korunur', () => {
    const metin = htmlMetneCevir('Merhaba,<br><br><ol><li>Vergi Levhası</li><li>İmza Sirküleri</li></ol>'
      + '<div>Bağlantı: <a href="https://gmplansis.com/evrak/abc">https://gmplansis.com/evrak/abc</a></div>&nbsp;İyi çalışmalar &amp; saygılar');
    expect(metin).toContain('Merhaba,\n\n');
    expect(metin).toContain('• Vergi Levhası\n• İmza Sirküleri');
    expect(metin).toContain('Bağlantı: https://gmplansis.com/evrak/abc');
    expect(metin).toContain('İyi çalışmalar & saygılar');
  });

  test('şablondan gelen düz metin HTML sayılmaz (eski davranış)', () => {
    expect(mailIcerigi('Sayın Yetkili,\n1 < 2 ise')).toEqual({ text: 'Sayın Yetkili,\n1 < 2 ise' });
  });
});

describe('kontrolcü', () => {
  jest.setTimeout(60000);
  let mem;
  const user = { _id: new mongoose.Types.ObjectId(), adSoyad: 'Yiğit Yıldırım', email: 'y@gm.test', rol: 'admin' };
  beforeAll(async () => { mem = await MongoMemoryServer.create(); await mongoose.connect(mem.getUri()); });
  afterAll(async () => { await mongoose.disconnect(); if (mem) await mem.stop(); });
  afterEach(() => jest.restoreAllMocks());

  const cagir = async (fn, req) => {
    const res = { statusCode: 200, status(c) { this.statusCode = c; return this; }, json(d) { this.body = d; return this; } };
    await fn({ user, query: {}, body: {}, ...req }, res);
    return res;
  };
  let sayac = 0;
  const talep = async () => {
    sayac += 1;
    return IslemTalebi.create({
      firma: new mongoose.Types.ObjectId(), islemTuru: new mongoose.Types.ObjectId(),
      firmaAdi: 'SAY HASSAS', islemTuruAdi: 'Yeni Belge', uploadToken: `ek-tok-${sayac}`,
      istenenEvraklar: [{ ad: 'E-TUYS Taahhütnamesi' }]
    });
  };

  test('biçimli mail: HTML + düz metin gider, tek seferlik ekler eklenir, taslak süzülmüş saklanır', async () => {
    const gonderilen = jest.spyOn(mailService, 'sendMail').mockResolvedValue({ messageId: '<x@y>' });
    jest.spyOn(mailService, 'isConfigured').mockReturnValue(true);
    const t = await talep();
    const r = await cagir(ctrl.talepMailGonder, {
      params: { id: String(t._id) },
      // çok parçalı istekte dizi alanı metin gelir
      body: { to: 'firma@ornek.test', subject: 'Evrak Talebi', body: '<p><b>Sayın</b> Yetkili</p><script>x</script>', ekEvrakIdler: '[]' },
      // multer adı latin1 çözüyor: UTF-8 baytları tek tek karaktere dönüşmüş hali
      uploadedFiles: [{ originalname: Buffer.from('Kira Sözleşmesi.pdf', 'utf8').toString('latin1'), buffer: Buffer.from('pdf') }]
    });
    expect(r.statusCode).toBe(200);
    const arg = gonderilen.mock.calls[0][0];
    expect(arg.html).toBe('<p><b>Sayın</b> Yetkili</p>');
    expect(arg.text).toBe('Sayın Yetkili');
    expect(arg.attachments.map((a) => a.filename)).toEqual(['Kira Sözleşmesi.pdf']);
    const taze = await IslemTalebi.findById(t._id).lean();
    expect(taze.mailGovdesi).toBe('<p><b>Sayın</b> Yetkili</p>');
  });

  test('yalnız biçimden oluşan boş gövde gönderilmez', async () => {
    jest.spyOn(mailService, 'sendMail').mockResolvedValue({});
    const t = await talep();
    const r = await cagir(ctrl.talepMailGonder, { params: { id: String(t._id) }, body: { to: 'a@b.test', subject: 'K', body: '<p><br></p>' } });
    expect(r.statusCode).toBe(400);
  });

  test('firma ek belge ekler → yalnız bu talepte görünür, dosyası yüklenince "geldi"; tamamlanmayı etkilemez', async () => {
    const t = await talep();
    const ekle = await cagir(ctrl.publicEkBelgeEkle, { params: { token: t.uploadToken }, body: { ad: '  Kira   sözleşmesi ', ekleyenAdi: 'Ali' } });
    expect(ekle.statusCode).toBe(200);
    expect(ekle.body.data.ad).toBe('Kira sözleşmesi');
    // aynı ad ikinci kez eklenmez
    const tekrar = await cagir(ctrl.publicEkBelgeEkle, { params: { token: t.uploadToken }, body: { ad: 'KİRA SÖZLEŞMESİ' } });
    expect(String(tekrar.body.data.id)).toBe(String(ekle.body.data.id));

    const baska = await talep();
    const bilgiBaska = await cagir(ctrl.publicBilgi, { params: { token: baska.uploadToken } });
    expect(bilgiBaska.body.data.ekBelgeler).toEqual([]); // başka işlemde görünmez

    // personel ekranının eski listeyle kaydı firmanın ekini silmez (ayrı alan)
    await cagir(ctrl.talepGuncelle, { params: { id: String(t._id) }, body: { istenenEvraklar: [{ ad: 'E-TUYS Taahhütnamesi' }] } });
    const bilgi = await cagir(ctrl.publicBilgi, { params: { token: t.uploadToken } });
    expect(bilgi.body.data.ekBelgeler).toEqual([expect.objectContaining({ ad: 'Kira sözleşmesi', geldiMi: false })]);

    const taze = await IslemTalebi.findById(t._id);
    expect(taze.firmaEkBelgeleri).toHaveLength(1);
    taze.yuklenenEvraklar.push({ istenenEvrakId: taze.firmaEkBelgeleri[0]._id, istenenEvrakAdi: 'Kira sözleşmesi', dosyaAdi: 'k.pdf' });
    taze.durumTazele();
    expect(taze.durum).not.toBe('tamamlandi'); // istenen evrak hâlâ gelmedi
  });

  test('ek belge adı doğrulanır', async () => {
    const t = await talep();
    const r = await cagir(ctrl.publicEkBelgeEkle, { params: { token: t.uploadToken }, body: { ad: 'x' } });
    expect(r.statusCode).toBe(400);
    const yok = await cagir(ctrl.publicEkBelgeEkle, { params: { token: 'olmayan' }, body: { ad: 'Kira' } });
    expect(yok.statusCode).toBe(404);
  });
});
