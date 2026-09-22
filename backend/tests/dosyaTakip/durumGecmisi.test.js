// 🧪 Durum geçmişi tarih düzeltme — saf kurallar
//
// Müşteri (21.09.2026): "Bu durum geçmişindeki tarihleri istediğimiz gibi revize edebilme şansımız
// var mıdır acaba?" Yanlış işlenen tarih "Sonuçlanma" sütununu da sessizce bozar; kurallar burada.

const { gecmisTarihiDuzelt } = require('../../services/dosyaTakip/durumGecmisi');

const SONUC = ['2.3.5_SONUCLANDI', '2.3.6_BELGEYE_YANSITILDI'];
const simdi = new Date('2026-09-21T12:00:00.000Z');
const kullanici = { _id: 'u1', adSoyad: 'Seda Durak' };

const talepKur = () => ({
  sonuclanmaTarihi: new Date('2026-09-16T09:29:05.300Z'), // Sonuçlandı geçişinin otomatik damgası
  durumGecmisi: [
    { _id: 'g1', yeniDurum: '2.2.0_BASVURU_YAPILDI', tarih: new Date('2026-09-09T09:29:05.000Z') },
    { _id: 'g2', yeniDurum: '2.3.5_SONUCLANDI', tarih: new Date('2026-09-16T09:29:05.000Z') }
  ]
});

const duzelt = (talep, id, tarih) => gecmisTarihiDuzelt(talep, id, tarih, { kullanici, sonucDurumlari: SONUC, simdi });

describe('gecmisTarihiDuzelt', () => {
  test('tarih düzelir, ilk tarih ve düzelten kişi iz olarak kalır', () => {
    const t = talepKur();
    const r = duzelt(t, 'g1', '2026-08-01T07:00:00.000Z');
    expect(r.hata).toBeUndefined();
    expect(t.durumGecmisi[0].tarih.toISOString()).toBe('2026-08-01T07:00:00.000Z');
    expect(t.durumGecmisi[0].ilkTarih.toISOString()).toBe('2026-09-09T09:29:05.000Z');
    expect(t.durumGecmisi[0].tarihDuzenleyenAdi).toBe('Seda Durak');
    expect(t.durumGecmisi[0].tarihDuzenlemeTarihi).toBe(simdi);
    // Başka bir geçiş düzeltildi: sonuçlanma tarihine dokunulmaz
    expect(t.sonuclanmaTarihi.toISOString()).toBe('2026-09-16T09:29:05.300Z');
  });

  test('ikinci düzeltme sistemin ilk yazdığı zamanı ezmez', () => {
    const t = talepKur();
    duzelt(t, 'g1', '2026-08-01T07:00:00.000Z');
    duzelt(t, 'g1', '2026-08-02T07:00:00.000Z');
    expect(t.durumGecmisi[0].ilkTarih.toISOString()).toBe('2026-09-09T09:29:05.000Z');
  });

  // Aksi halde liste "Sonuçlanma" sütunu veri giriş gününü göstermeye devam ederdi
  test('Sonuçlandı geçişi düzelince otomatik damgalı sonuçlanma tarihi de taşınır', () => {
    const t = talepKur();
    const r = duzelt(t, 'g2', '2026-09-10T08:00:00.000Z');
    expect(r.sonuclanmaTasindi).toBe(true);
    expect(t.sonuclanmaTarihi.toISOString()).toBe('2026-09-10T08:00:00.000Z');
    // Aynı kaydın ikinci düzeltmesinde de izler
    duzelt(t, 'g2', '2026-09-11T08:00:00.000Z');
    expect(t.sonuclanmaTarihi.toISOString()).toBe('2026-09-11T08:00:00.000Z');
  });

  test('elle girilmiş sonuçlanma tarihine dokunulmaz', () => {
    const t = talepKur();
    t.sonuclanmaTarihi = new Date('2026-09-05T00:00:00.000Z'); // Zamanlama sekmesinden elle
    const r = duzelt(t, 'g2', '2026-09-10T08:00:00.000Z');
    expect(r.sonuclanmaTasindi).toBe(false);
    expect(t.sonuclanmaTarihi.toISOString()).toBe('2026-09-05T00:00:00.000Z');
  });

  test.each([
    ['boş', '', 400],
    ['anlamsız', '31/31/2026', 400],
    ['ileri tarih', '2026-09-22T12:00:00.000Z', 400],
    ['çok eski', '2010-01-01T00:00:00.000Z', 400]
  ])('%s tarih reddedilir, kayıt değişmez', (_, tarih, kod) => {
    const t = talepKur();
    const r = duzelt(t, 'g1', tarih);
    expect(r.durumKodu).toBe(kod);
    expect(r.hata).toBeTruthy();
    expect(t.durumGecmisi[0].tarih.toISOString()).toBe('2026-09-09T09:29:05.000Z');
    expect(t.durumGecmisi[0].ilkTarih).toBeUndefined();
  });

  // İstemci saati birkaç dakika ileri olabilir: "şimdi" reddedilmemeli
  test('birkaç dakika ilerideki "şimdi" kabul edilir', () => {
    const r = duzelt(talepKur(), 'g1', new Date(simdi.getTime() + 2 * 60 * 1000).toISOString());
    expect(r.hata).toBeUndefined();
  });

  test('olmayan kayıt 404', () => {
    expect(duzelt(talepKur(), 'yok', '2026-09-01T00:00:00.000Z').durumKodu).toBe(404);
  });
});
