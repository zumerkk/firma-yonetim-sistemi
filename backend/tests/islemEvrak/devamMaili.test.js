// 🧪 İşlem & Evrak — eksik/hatalı evrakı tekrar iste + aynı linkle devam maili
// Müşteri (09.10.2026): "Firmaya mail gönderdiğimiz maili aynı link üzerinden 2. bir şekilde devam maili
// gibi devam edebileceğimiz bir sistem olarak geliştirmemiz mümkün mü acaba? Firma evrak gönderince eksik
// veya yanlış yüklese de işlem tamamlanıyor, biz aynı maili tekrar revize edip aynı link üzerinden
// gönderebilirsek iyi olur."

const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const IslemTalebi = require('../../models/IslemTalebi');
require('../../models/IslemTuru');
require('../../models/Firma');
require('../../models/User');
const svc = require('../../services/islemEvrak/islemEvrakService');
const mailService = require('../../services/tesvikMakine/mailService');
const ctrl = require('../../controllers/islemEvrakController');

const dk = (n) => new Date(Date.parse('2026-10-09T10:00:00Z') + n * 60000);
const talepKur = (ek = {}) => new IslemTalebi({
  firma: new mongoose.Types.ObjectId(), islemTuru: new mongoose.Types.ObjectId(),
  firmaAdi: 'GLOBTEKS A.Ş.', islemTuruAdi: 'E-TUYS Yetkilendirme',
  istenenEvraklar: [{ ad: 'Vergi Levhası' }, { ad: 'İmza Sirküleri' }, { ad: 'Opsiyonel', zorunlu: false }], ...ek
});
const yukle = (t, i, tarih) => t.yuklenenEvraklar.push({
  istenenEvrakId: t.istenenEvraklar[i]._id, istenenEvrakAdi: t.istenenEvraklar[i].ad, dosyaAdi: `d${i}.pdf`, yuklemeTarihi: tarih
});

describe('durum: tekrar istenen evrak yeni yükleme gelene kadar "gelmedi"', () => {
  test('tamamlanan talep tekrar isteyince kısmi olur; yeni dosya gelince yeniden tamamlanır', () => {
    const t = talepKur();
    yukle(t, 0, dk(0)); yukle(t, 1, dk(1));
    t.durumTazele();
    expect(t.durum).toBe('tamamlandi');

    t.istenenEvraklar[1].tekrarIstemeTarihi = dk(5); // imza sirküleri hatalı
    t.durumTazele();
    expect(t.durum).toBe('kismi_geldi');
    expect(t.istenenEvraklar[1].geldiMi).toBe(false);
    expect(t.istenenEvraklar[0].geldiMi).toBe(true);
    expect(t.yuklenenEvraklar).toHaveLength(2); // eski dosya silinmedi

    yukle(t, 1, dk(10)); // firma aynı linkten düzeltilmişini yükledi
    t.durumTazele();
    expect(t.durum).toBe('tamamlandi');
  });

  test('tekrar istemeden önce bildirilen "yükleyemiyorum" nedeni de artık yanıt sayılmaz', () => {
    const t = talepKur();
    yukle(t, 0, dk(0));
    Object.assign(t.istenenEvraklar[1], { yuklenememeNedeni: 'Bizde yok', nedenBildirimTarihi: dk(1) });
    t.durumTazele();
    expect(t.durum).toBe('tamamlandi');
    t.istenenEvraklar[1].tekrarIstemeTarihi = dk(2);
    t.durumTazele();
    expect(t.istenenEvraklar[1].geldiMi).toBe(false);
    Object.assign(t.istenenEvraklar[1], { yuklenememeNedeni: 'Noterden alınıyor', nedenBildirimTarihi: dk(3) });
    t.durumTazele();
    expect(t.istenenEvraklar[1].geldiMi).toBe(true);
  });
});

describe('devam maili metni', () => {
  test('yalnız bekleyenler (notlarıyla), AYNI bağlantı, konu ilk mailinkine ek', () => {
    const t = talepKur({ mailGecmisi: [{ tur: 'ilk', konu: 'E-TUYS Yetkilendirme — Evrak Talebi (GLOBTEKS A.Ş.)', tarih: dk(-60) }] });
    yukle(t, 0, dk(0)); yukle(t, 1, dk(1));
    Object.assign(t.istenenEvraklar[1], { tekrarIstemeTarihi: dk(5), tekrarIstemeNotu: 'Kaşe ve imza eksik' });
    t.durumTazele();
    const { konu, govde, bekleyenSayisi } = svc.devamMailiOlustur({ talep: t, uploadLink: 'https://gmplansis.com/evrak/abc' });
    expect(bekleyenSayisi).toBe(1);
    expect(konu).toBe('E-TUYS Yetkilendirme — Evrak Talebi (GLOBTEKS A.Ş.) — Eksik / Hatalı Evraklar');
    expect(govde).toContain('1. İmza Sirküleri (eksik / hatalı iletildi) — Kaşe ve imza eksik');
    expect(govde).not.toContain('Vergi Levhası'); // gelen evrak yeniden istenmez
    expect(govde).not.toContain('Opsiyonel'); // mailde istenmeyen yazılmaz
    expect(govde).toContain('https://gmplansis.com/evrak/abc');
    expect(govde).toContain('09.10.2026 tarihli mailimizle');
    // İkinci devam mailinde ek iki kez yazılmaz
    t.mailGecmisi = [{ tur: 'ilk', konu }];
    expect(svc.devamMailiOlustur({ talep: t, uploadLink: 'x' }).konu).toBe(konu);
  });

  test('bekleyen evrak yoksa metin bunu söyler (sessiz boş mail gitmesin)', () => {
    const t = talepKur();
    yukle(t, 0, dk(0)); yukle(t, 1, dk(1)); t.durumTazele();
    expect(svc.devamMailiOlustur({ talep: t, uploadLink: 'x' }).govde).toContain('Bekleyen evrak yok');
  });
});

describe('uçlar (bellek içi Mongo)', () => {
  jest.setTimeout(60000);
  let mem;
  const user = { _id: new mongoose.Types.ObjectId(), adSoyad: 'Seda Durak', email: 's@gm.test', rol: 'admin' };
  beforeAll(async () => { mem = await MongoMemoryServer.create(); await mongoose.connect(mem.getUri()); });
  afterAll(async () => { await mongoose.disconnect(); if (mem) await mem.stop(); });
  afterEach(() => jest.restoreAllMocks());

  const cagir = async (fn, req) => {
    const res = { statusCode: 200, status(c) { this.statusCode = c; return this; }, json(d) { this.body = d; return this; } };
    await fn({ user, query: {}, body: {}, ...req }, res);
    return res;
  };
  let sayac = 0;
  const kayitliTalep = async () => {
    sayac += 1;
    const t = talepKur({ uploadToken: `tok-${sayac}`, mailAlicilar: ['firma@ornek.test'] });
    yukle(t, 0, dk(0)); yukle(t, 1, dk(1)); t.durumTazele();
    await t.save();
    return t;
  };

  test('tekrar iste → kısmi, not kaydedilir; geri al → yeniden tamam', async () => {
    const t = await kayitliTalep();
    const evrakId = String(t.istenenEvraklar[1]._id);
    const r = await cagir(ctrl.talepTekrarIste, { params: { id: String(t._id), evrakId }, body: { not: '  Kaşe eksik ' } });
    expect(r.statusCode).toBe(200);
    expect(r.body.data.durum).toBe('kismi_geldi');
    expect(r.body.data.istenenEvraklar[1]).toMatchObject({ tekrarIstemeNotu: 'Kaşe eksik', tekrarIsteyenAdi: 'Seda Durak', geldiMi: false });

    const g = await cagir(ctrl.talepTekrarIstemeGeriAl, { params: { id: String(t._id), evrakId } });
    expect(g.body.data.durum).toBe('tamamlandi');
    expect(g.body.data.istenenEvraklar[1].tekrarIstemeTarihi).toBeUndefined();
  });

  test('olmayan evrak 404', async () => {
    const t = await kayitliTalep();
    const r = await cagir(ctrl.talepTekrarIste, { params: { id: String(t._id), evrakId: String(new mongoose.Types.ObjectId()) } });
    expect(r.statusCode).toBe(404);
  });

  test('evrak listesini kaydetmek (eski ekran verisiyle) tekrar isteme işaretini silmez', async () => {
    const t = await kayitliTalep();
    const evrakId = String(t.istenenEvraklar[1]._id);
    await cagir(ctrl.talepTekrarIste, { params: { id: String(t._id), evrakId }, body: { not: 'Hatalı' } });
    const eskiEkran = t.istenenEvraklar.map((e) => ({ _id: String(e._id), ad: e.ad, zorunlu: e.zorunlu })); // işaretsiz
    const r = await cagir(ctrl.talepGuncelle, { params: { id: String(t._id) }, body: { istenenEvraklar: eskiEkran } });
    expect(r.body.data.istenenEvraklar[1].tekrarIstemeNotu).toBe('Hatalı');
    expect(r.body.data.durum).toBe('kismi_geldi');
  });

  test('devam maili önizlemesi aynı bağlantıyı kullanır; gönderim geçmişe "devam" diye yazılır', async () => {
    const t = await kayitliTalep();
    jest.spyOn(mailService, 'sendMail').mockResolvedValue({});
    jest.spyOn(mailService, 'isConfigured').mockReturnValue(true);
    // İlk mail
    await cagir(ctrl.talepMailGonder, { params: { id: String(t._id) }, body: { to: 'firma@ornek.test', subject: 'İlk talep', body: 'Evraklar...' } });
    await cagir(ctrl.talepTekrarIste, { params: { id: String(t._id), evrakId: String(t.istenenEvraklar[0]._id) }, body: { not: 'Okunmuyor' } });

    const on = await cagir(ctrl.talepMailOnizle, { params: { id: String(t._id) }, query: { devam: '1' } });
    expect(on.body.data).toMatchObject({ devam: true, bekleyenSayisi: 1, subject: 'İlk talep — Eksik / Hatalı Evraklar' });
    expect(on.body.data.uploadLink).toContain(t.uploadToken); // token yenilenmedi
    expect(on.body.data.body).toContain('Vergi Levhası (eksik / hatalı iletildi) — Okunmuyor');

    await cagir(ctrl.talepMailGonder, { params: { id: String(t._id) }, body: { to: 'firma@ornek.test', subject: on.body.data.subject, body: on.body.data.body } });
    const son = await IslemTalebi.findById(t._id).lean();
    expect(son.mailGecmisi.map((m) => m.tur)).toEqual(['ilk', 'devam']);
    expect(son.mailGecmisi[1]).toMatchObject({ konu: 'İlk talep — Eksik / Hatalı Evraklar', gonderenAdi: 'Seda Durak' });
    expect(son.uploadToken).toBe(t.uploadToken);
  });

  test('firma yükleme sayfası tekrar istenen evrakı notuyla görür', async () => {
    const t = await kayitliTalep();
    await cagir(ctrl.talepTekrarIste, { params: { id: String(t._id), evrakId: String(t.istenenEvraklar[1]._id) }, body: { not: 'Güncel tarihli olmalı' } });
    const r = await cagir(ctrl.publicBilgi, { params: { token: t.uploadToken } });
    expect(r.body.data.istenenEvraklar[1]).toMatchObject({ tekrarIstendi: true, tekrarIstemeNotu: 'Güncel tarihli olmalı', geldiMi: false });
    expect(r.body.data.istenenEvraklar[0]).toMatchObject({ tekrarIstendi: false, geldiMi: true });
  });
});
