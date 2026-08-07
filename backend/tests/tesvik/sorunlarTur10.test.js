// 🧪 "sorunlar ve revizeler" tur-10 — müşteri bildirimleri (07.08)
// DB'siz çalışır: saf mantık ve model örnekleri bellekte doğrulanır.
//
// Kapsanan şikayetler:
//  1) "Müşteri Revize (excel) çıktısı alınca kullanılmamış makineleri kullanılmış
//     olarak gösteriyor" → 'HAYIR' kodu dolu bir string olduğu için kullanılmış sayılıyordu
//  2) "Bazı dosyalarda makinelere revize yapınca TASLAK haline geri dönüyor ve
//     Onaylandı yapamadım (ART MOLD)" → okuma sırasındaki auto-sync elle seçimi eziyordu
//  3) "Teşvik listesinde durum filtresinde kapandı seçeneği yok"
//  4) "Ekipman takipte kapanan belgeleri gizleyelim ya da filtreleyebilelim"
//  5) "Upload linkinde sadece fatura taslağı ve onaylı fatura kalabilir mi"

const mongoose = require('mongoose');
const Tesvik = require('../../models/Tesvik');
const YeniTesvik = require('../../models/YeniTesvik');
const { kullanilmisMi } = require('../../constants/makineKodlari');
const {
  DOCUMENT_TYPES, DOCUMENT_TYPE_KEYS, PUBLIC_DOCUMENT_TYPES
} = require('../../constants/tesvikMakineMail');

const yeniId = () => new mongoose.Types.ObjectId();

// ─────────────────────────────────────────────────────────────────────────────
describe('1) Kullanılmış makine kodu — "HAYIR" yeni makinedir', () => {
  // Bakanlık listesi (csv/Ithal-Liste-Bilgileri … KULLANILMIŞ MAKİNE KODLARI.csv)
  test.each([
    ['', false],
    [null, false],
    [undefined, false],
    ['0', false],
    ['HAYIR', false],
    ['hayır', false],
    ['KULLANILMIŞ KOMPLE', true],
    ['KULLANILMIŞ MÜNFERİT', true]
  ])('%s → kullanılmış: %s', (kod, beklenen) => {
    expect(kullanilmisMi(kod)).toBe(beklenen);
  });

  test('kalem listesinde yalnızca gerçek kullanılmış makineler ayrışır', () => {
    const ithal = [
      { rowId: 'r1', kullanilmisMakine: 'HAYIR', toplamTutarFobUsd: 1000 },
      { rowId: 'r2', kullanilmisMakine: '', toplamTutarFobUsd: 500 },
      { rowId: 'r3', kullanilmisMakine: 'KULLANILMIŞ MÜNFERİT', toplamTutarFobUsd: 250 }
    ];
    const topla = (secici) => ithal.filter(secici).reduce((s, r) => s + r.toplamTutarFobUsd, 0);
    expect(topla((r) => !kullanilmisMi(r.kullanilmisMakine))).toBe(1500); // yeni
    expect(topla((r) => kullanilmisMi(r.kullanilmisMakine))).toBe(250);   // kullanılmış
  });

  test.each([
    ['Tesvik', Tesvik],
    ['YeniTesvik', YeniTesvik]
  ])('%s: mali hesaplama makine listesinden türetmez, manuel değerleri korur', (_ad, Model) => {
    // Bu alanlar ETUYS/Excel kaynaklı manuel girdilerdir; hatalı türetme bloğu kaldırıldı.
    const doc = Model.hydrate({
      _id: yeniId(),
      tesvikId: 'T-KULLANILMIS',
      maliHesaplamalar: { makinaTechizat: { yeniMakina: 1500, kullanimisMakina: 250 } },
      makineListeleri: {
        yerli: [],
        ithal: [{ rowId: 'r1', kullanilmisMakine: 'HAYIR', toplamTutarFobUsd: 99999 }]
      }
    });
    doc.updateMaliHesaplamalar();
    const mt = doc.maliHesaplamalar.makinaTechizat;
    expect(mt.yeniMakina).toBe(1500);
    expect(mt.kullanimisMakina).toBe(250);
    expect(mt.toplamYeniMakina).toBe(1750);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe('2) Elle seçilen durum revizyon geçmişinden türetilenle ezilmemeli', () => {
  // Controller'daki auto-sync kapısıyla aynı koşul (tesvikController/yeniTesvikController)
  const OTO_SENKRON_DISI = ['kapandi', 'iptal_edildi'];
  const senkronCalisirMi = (doc) =>
    !doc.durumBilgileri?.durumManuelSecildi &&
    !OTO_SENKRON_DISI.includes(doc.durumBilgileri?.genelDurum);

  test.each([
    ['Tesvik', Tesvik],
    ['YeniTesvik', YeniTesvik]
  ])('%s: durumManuelSecildi alanı vardır ve varsayılanı false', (_ad, Model) => {
    const doc = new Model({ tesvikId: 'T-YENI', yatirimciUnvan: 'X', firmaId: 'F1' });
    expect(doc.durumBilgileri.durumManuelSecildi).toBe(false);
  });

  test('elle seçilmemiş kayıtta auto-sync çalışır (eski kayıtları doldurma davranışı korunur)', () => {
    const doc = Tesvik.hydrate({
      _id: yeniId(), tesvikId: 'T-OTO',
      durumBilgileri: { genelDurum: 'taslak', durumManuelSecildi: false }
    });
    expect(senkronCalisirMi(doc)).toBe(true);
  });

  test('ART MOLD senaryosu: elle "onaylandi" seçildiyse auto-sync devre dışı', () => {
    const doc = Tesvik.hydrate({
      _id: yeniId(), tesvikId: 'T-ARTMOLD',
      // geçmişte 'taslak' yeniDurum'lu bir revizyon var; türetme bunu geri yazardı
      revizyonlar: [{ revizyonNo: 1, revizyonSebebi: 'Otomatik Güncelleme', yeniDurum: 'taslak' }],
      durumBilgileri: { genelDurum: 'onaylandi', durumManuelSecildi: true }
    });
    expect(senkronCalisirMi(doc)).toBe(false);
  });

  test.each(OTO_SENKRON_DISI)('"%s" durumu türetmeyle asla ezilmez', (durum) => {
    const doc = Tesvik.hydrate({
      _id: yeniId(), tesvikId: 'T-KORUNAN',
      durumBilgileri: { genelDurum: durum, durumManuelSecildi: false }
    });
    expect(senkronCalisirMi(doc)).toBe(false);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe('3) Belge durumu enum ve seçenek listeleri "kapandi" içerir', () => {
  test.each([
    ['Tesvik', Tesvik],
    ['YeniTesvik', YeniTesvik]
  ])('%s: genelDurum enum kapandi kabul eder', (_ad, Model) => {
    const enumDegerleri = Model.schema.path('durumBilgileri.genelDurum').enumValues;
    expect(enumDegerleri).toContain('kapandi');
  });

  test.each([
    ['tesvikController', '../../controllers/tesvikController'],
    ['yeniTesvikController', '../../controllers/yeniTesvikController']
  ])('%s: durum seçenekleri kapandi içerir', (_ad, yol) => {
    // getDurumOptions dışa aktarılmıyor; şablon ucunun beslendiği kaynağı dosyadan doğrula
    const kaynak = require('fs').readFileSync(require.resolve(yol), 'utf8');
    expect(kaynak).toContain("{ value: 'kapandi', label: 'Kapandı'");
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe('4) Ekipman takip listesi — kapanan belge filtresi', () => {
  // buildCertMatch dışa aktarılmadığı için aynı kuralı burada doğruluyoruz;
  // davranış sözleşmesi: boş → kapananlar hariç, all → hepsi, değer → yalnızca o durum.
  const KAPALI = 'kapandi';
  const belgeDurumFiltresi = (belgeDurum) => {
    const m = {};
    const d = (belgeDurum || '').trim();
    if (!d) m['durumBilgileri.genelDurum'] = { $ne: KAPALI };
    else if (d !== 'all') m['durumBilgileri.genelDurum'] = d;
    return m;
  };

  test('varsayılan (parametresiz) kapananları hariç tutar', () => {
    expect(belgeDurumFiltresi('')).toEqual({ 'durumBilgileri.genelDurum': { $ne: 'kapandi' } });
    expect(belgeDurumFiltresi(undefined)).toEqual({ 'durumBilgileri.genelDurum': { $ne: 'kapandi' } });
  });

  test('all → hiç durum filtresi uygulanmaz', () => {
    expect(belgeDurumFiltresi('all')).toEqual({});
  });

  test('belirli durum → yalnızca o durum', () => {
    expect(belgeDurumFiltresi('kapandi')).toEqual({ 'durumBilgileri.genelDurum': 'kapandi' });
    expect(belgeDurumFiltresi('onaylandi')).toEqual({ 'durumBilgileri.genelDurum': 'onaylandi' });
  });

  test('controller aynı varsayılanı uygular', () => {
    const kaynak = require('fs').readFileSync(
      require.resolve('../../controllers/tesvikMakineController'), 'utf8'
    );
    expect(kaynak).toContain("m['durumBilgileri.genelDurum'] = { $ne: KAPALI_BELGE_DURUMU }");
    expect(kaynak).toContain("belgeDurum: '$durumBilgileri.genelDurum'");
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe('5) Public yükleme linki yalnızca fatura türlerini gösterir', () => {
  test('sadece fatura taslağı ve onaylı fatura sunulur', () => {
    expect(PUBLIC_DOCUMENT_TYPES.map((d) => d.key)).toEqual(['fatura_taslak', 'fatura_onayli']);
  });

  test('etiketler tam listeden gelir (klasör eşlemesi bozulmaz)', () => {
    PUBLIC_DOCUMENT_TYPES.forEach((d) => {
      expect(DOCUMENT_TYPES).toContainEqual(d);
      expect(d.folder).toBeTruthy();
    });
  });

  test('yükleme doğrulaması tüm türleri kabul etmeye devam eder (eski linkler/kayıtlar)', () => {
    ['kdv_muafiyet', 'proforma_teklif', 'sevk_teslimat', 'diger'].forEach((k) => {
      expect(DOCUMENT_TYPE_KEYS).toContain(k);
    });
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe('7) Dosya takip — dosyaya serbest açıklama alanı', () => {
  const DosyaTakip = require('../../models/DosyaTakip');

  test('dosya şemasında aciklama alanı vardır', () => {
    const talep = new DosyaTakip({
      firma: yeniId(), firmaUnvan: 'X A.Ş.',
      dosyalar: [{ dosyaAdi: 'tarama.pdf', dosyaYolu: '/uploads/x.pdf', aciklama: 'Kapasite raporu' }]
    });
    expect(talep.dosyalar[0].aciklama).toBe('Kapasite raporu');
  });

  test('aciklama zorunlu değildir ve varsayılanı boştur', () => {
    const talep = new DosyaTakip({
      firma: yeniId(), firmaUnvan: 'X A.Ş.',
      dosyalar: [{ dosyaAdi: 'a.pdf', dosyaYolu: '/uploads/a.pdf' }]
    });
    expect(talep.dosyalar[0].aciklama).toBe('');
    expect(talep.validateSync()?.errors?.['dosyalar.0.aciklama']).toBeUndefined();
  });

  test('300 karakteri aşan açıklama şemada reddedilir (controller kırpar)', () => {
    const talep = new DosyaTakip({
      firma: yeniId(), firmaUnvan: 'X A.Ş.',
      dosyalar: [{ dosyaAdi: 'a.pdf', dosyaYolu: '/uploads/a.pdf', aciklama: 'x'.repeat(301) }]
    });
    expect(talep.validateSync()?.errors?.['dosyalar.0.aciklama']).toBeDefined();
  });
});
