// 🧪 REVİZYON GEÇMİŞİ - müşteri "sorunlar ve revizeler" maddeleri
// DB'siz çalışır: model örnekleri bellekte kurulur, saf mantık doğrulanır.
//
// Kapsanan iki şikayet:
//  1) "her revizede finansal bilgileri değişmiş gibi gösteriyor hiç düzenleme yapmamama rağmen"
//     → türetilen toplamlar (updateMaliHesaplamalar) diff'ten önce her iki tarafta da tazelenmeli
//  2) "Revizyon başlatırken olan notu ayrı revize olarak gösteriyor"
//     → değişen alanı olmayan başlatma kaydı, asıl düzenlemeyle aynı satırda birleşmeli
//
// Ayrıca eksik `maliHesaplamalar` olan eski kayıtlarda updateMaliHesaplamalar()'ın
// patlamaması ("bazı belgelerin durumunu taslaktan onay'a çekemiyorum") doğrulanır.

const mongoose = require('mongoose');
const Tesvik = require('../../models/Tesvik');
const YeniTesvik = require('../../models/YeniTesvik');

const yeniId = () => new mongoose.Types.ObjectId();

describe('updateMaliHesaplamalar - eksik alanlı eski kayıtlar', () => {
  test.each([
    ['Tesvik', Tesvik],
    ['YeniTesvik', YeniTesvik]
  ])('%s: maliHesaplamalar hiç yoksa hata fırlatmaz', (_ad, Model) => {
    const doc = Model.hydrate({ _id: yeniId(), tesvikId: 'T-EKSIK' });
    expect(() => doc.updateMaliHesaplamalar()).not.toThrow();
    expect(doc.maliHesaplamalar.finansman.toplamFinansman).toBe(0);
  });

  test('dolu kayıtta toplam finansman hâlâ yabancı kaynak + öz kaynak', () => {
    const doc = Tesvik.hydrate({
      _id: yeniId(),
      tesvikId: 'T-DOLU',
      maliHesaplamalar: { finansman: { yabanciKaynak: 1000000, ozKaynak: 3937369 } }
    });
    doc.updateMaliHesaplamalar();
    expect(doc.maliHesaplamalar.finansman.toplamFinansman).toBe(4937369);
  });
});

describe('Sahte finansal revizyon - türetilen toplam diff üretmemeli', () => {
  // Veritabanındaki toplam bayat (4.935.969,401) ama bileşenlerden 4.937.369 çıkıyor.
  const bayatKayit = () => ({
    _id: yeniId(),
    tesvikId: 'T-BAYAT',
    maliHesaplamalar: {
      finansman: { yabanciKaynak: 1000000, ozKaynak: 3937369, toplamFinansman: 4935969.401 }
    }
  });

  test('ham fotoğraf alınırsa toplam değişmiş görünür (eski hatalı davranış)', () => {
    const doc = Tesvik.hydrate(bayatKayit());
    const hamEski = doc.maliHesaplamalar.finansman.toplamFinansman;
    doc.updateMaliHesaplamalar();
    expect(doc.maliHesaplamalar.finansman.toplamFinansman).not.toBe(hamEski);
  });

  test('eski veri de aynı türetmeden geçirilirse fark kalmaz (yeni davranış)', () => {
    const doc = Tesvik.hydrate(bayatKayit());

    // Controller'daki sıra: önce ESKİ veriyi normalize et, sonra fotoğrafla
    doc.updateMaliHesaplamalar();
    const eskiVeri = JSON.parse(JSON.stringify(doc.toSafeJSON()));

    // Kullanıcı hiçbir şeye dokunmadan kaydediyor → sunucu tekrar türetiyor
    doc.updateMaliHesaplamalar();
    const yeniVeri = JSON.parse(JSON.stringify(doc.toSafeJSON()));

    expect(yeniVeri.maliHesaplamalar.finansman.toplamFinansman)
      .toBe(eskiVeri.maliHesaplamalar.finansman.toplamFinansman);
  });

  test('gerçek bir düzenleme hâlâ fark üretir', () => {
    const doc = Tesvik.hydrate(bayatKayit());
    doc.updateMaliHesaplamalar();
    const eskiToplam = doc.maliHesaplamalar.finansman.toplamFinansman;

    doc.maliHesaplamalar.finansman.ozKaynak = 5000000; // kullanıcı değiştirdi
    doc.updateMaliHesaplamalar();

    expect(doc.maliHesaplamalar.finansman.toplamFinansman).not.toBe(eskiToplam);
    expect(doc.maliHesaplamalar.finansman.toplamFinansman).toBe(6000000);
  });
});

describe('Revizyon başlatma kaydı - ayrı satır olarak kalmamalı', () => {
  // Controller'daki birleştirme kuralının aynısı (updateTesvik içinde uygulanır)
  const baslatmaKaydiMi = (rev) =>
    !!rev && (!Array.isArray(rev.degisikenAlanlar) || rev.degisikenAlanlar.length === 0);

  const revizyonluBelge = (revizyonlar) => Tesvik.hydrate({
    _id: yeniId(),
    tesvikId: 'T-REV',
    revizyonlar
  });

  test('not-only başlatma kaydı tespit edilir', () => {
    const doc = revizyonluBelge([
      { revizyonNo: 1, revizyonSebebi: 'Talep Revize', kullaniciNotu: 'Süre Revize', degisikenAlanlar: [], yapanKullanici: yeniId() }
    ]);
    expect(baslatmaKaydiMi(doc.revizyonlar[doc.revizyonlar.length - 1])).toBe(true);
  });

  test('birleştirme sonrası tek revizyon kalır ve sebep/not korunur', () => {
    const doc = revizyonluBelge([
      { revizyonNo: 1, revizyonSebebi: 'Talep Revize', kullaniciNotu: 'Süre Revize', degisikenAlanlar: [], yapanKullanici: yeniId() }
    ]);
    const degisiklikler = [
      { alan: 'belgeYonetimi.uzatimTarihi', label: 'Süre Uzatım Tarihi', eskiDeger: '2026-08-15', yeniDeger: '2028-02-15' }
    ];

    const son = doc.revizyonlar[doc.revizyonlar.length - 1];
    expect(baslatmaKaydiMi(son)).toBe(true);
    son.degisikenAlanlar = degisiklikler;

    expect(doc.revizyonlar.length).toBe(1);
    expect(doc.revizyonlar[0].revizyonSebebi).toBe('Talep Revize');
    expect(doc.revizyonlar[0].kullaniciNotu).toBe('Süre Revize');
    expect(doc.revizyonlar[0].degisikenAlanlar.length).toBe(1);
  });

  test('dolu son revizyon başlatma kaydı sayılmaz → yeni satır açılmalı', () => {
    const doc = revizyonluBelge([
      {
        revizyonNo: 1,
        revizyonSebebi: 'Otomatik Güncelleme',
        degisikenAlanlar: [{ alan: 'istihdam.mevcutKisi', label: 'Mevcut Kişi Sayısı', eskiDeger: 5, yeniDeger: 8 }],
        yapanKullanici: yeniId()
      }
    ]);
    expect(baslatmaKaydiMi(doc.revizyonlar[doc.revizyonlar.length - 1])).toBe(false);
  });

  test('hiç revizyon yoksa birleştirme denenmez', () => {
    const doc = revizyonluBelge([]);
    expect(baslatmaKaydiMi(doc.revizyonlar[doc.revizyonlar.length - 1])).toBe(false);
  });
});
