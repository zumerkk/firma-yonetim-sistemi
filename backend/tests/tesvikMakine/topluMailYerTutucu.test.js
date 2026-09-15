// 🧪 Toplu mail — yer tutucular, konu ve canlı makine bilgisi
//
// Müşteri (15.09.2026): "Toplu mailde makine'idler ve belge yükleme linki gelmiyor
// '{makineId}' ve '(uploadLink)' olarak geliyor. Birde mail konusunda makine ismi
// yazmasın sadece 'YTB 568825 Kapsamında Fatura Kesimi Hk.' gibi kalabilir."

const {
  topluKonuSablonu, makineIdEksikSiralar, cozulmemisYerTutucular, eksikAlanEtiketleri, topluPlaceholderVerisi
} = require('../../services/tesvikMakine/topluMailIcerik');
const { snapshotuCanliylaGuncelle } = require('../../services/tesvikMakine/certificateResolver');
const { topluBelgeTurleri, kapsamAnahtari } = require('../../services/tesvikMakine/topluYuklemeService');
const engine = require('../../services/tesvikMakine/mailTemplateEngine');

describe('topluKonuSablonu — toplu mailin konusunda makine adı olmaz', () => {
  test.each([
    ['{makineAdi} - YTB {belgeNo} Kapsamında Fatura Kesimi Hk.', 'YTB {belgeNo} Kapsamında Fatura Kesimi Hk.'],
    ['{makineAdi} - YTB {belgeNo} Kapsamında Gümrük Beyannamesi Hk.', 'YTB {belgeNo} Kapsamında Gümrük Beyannamesi Hk.'],
    ['Hatırlatma - {makineAdi} Teşvik Süreci Hk.', 'Hatırlatma Teşvik Süreci Hk.'],
    ['{makineAdi} - Fatura Taslağı Onayı', 'Fatura Taslağı Onayı'],
    ['YTB {belgeNo} - {makineAdi} - Fatura', 'YTB {belgeNo} - Fatura'],
    ["{belgeNo} no'lu Yatırım Teşvik Belgesi - Makine Listesi ve Fatura Talebi", "{belgeNo} no'lu Yatırım Teşvik Belgesi - Makine Listesi ve Fatura Talebi"],
    ['', '']
  ])('%p → %p', (girdi, beklenen) => {
    expect(topluKonuSablonu(girdi)).toBe(beklenen);
  });

  test('müşterinin istediği konu birebir çıkar', () => {
    const konu = engine.render(topluKonuSablonu('{makineAdi} - YTB {belgeNo} Kapsamında Fatura Kesimi Hk.'), { belgeNo: '568825' });
    expect(konu).toBe('YTB 568825 Kapsamında Fatura Kesimi Hk.');
  });
});

describe('makineIdEksikSiralar — kullanıcıya hangi makinede ID yok', () => {
  test('ID girilmemiş makinelerin sıra numaraları, sıralı', () => {
    expect(makineIdEksikSiralar([
      { siraNo: 917, makineId: '' }, { siraNo: 913, makineId: '4743905' }, { siraNo: 915 }
    ])).toEqual([915, 917]);
  });

  test('hepsi dolu → boş', () => {
    expect(makineIdEksikSiralar([{ siraNo: 1, makineId: 'X' }])).toEqual([]);
  });
});

describe('cozulmemisYerTutucular — gönderim öncesi son kontrol', () => {
  test('bilinen yer tutucuları tekrarsız bulur', () => {
    expect(cozulmemisYerTutucular('ID: {makineId}\nLink: {uploadLink}\n{makineId}')).toEqual(['makineId', 'uploadLink']);
  });

  // Firmaya yazılan sıradan süslü parantezli metin gönderimi engellememeli
  test('bilinmeyen süslü parantezli metne dokunmaz', () => {
    expect(cozulmemisYerTutucular('Not: {önemli} fiyat {x}')).toEqual([]);
  });

  test('boş/tanımsız metin', () => {
    expect(cozulmemisYerTutucular(undefined)).toEqual([]);
  });
});

describe('eksikAlanEtiketleri', () => {
  test('anahtarları kullanıcı diline çevirir', () => {
    expect(eksikAlanEtiketleri(['makineId', 'uploadLink', 'bilinmeyen'])).toEqual(['Makine ID', 'Yükleme linki', 'bilinmeyen']);
  });
});

describe('snapshotuCanliylaGuncelle — süreç kopyası eskiyse canlı makine satırı kazanır', () => {
  test('sonradan girilen makine ID ve güncel ad maile yansır', () => {
    const p = snapshotuCanliylaGuncelle(
      { makineId: '', siraNo: 913, machineName: 'ESKİ AD', supplierEmails: ['a@b.c'] },
      { makineId: '4743905', siraNo: 913, machineName: 'NST CİHAZI' }
    );
    expect(p).toMatchObject({ makineId: '4743905', machineName: 'NST CİHAZI', supplierEmails: ['a@b.c'] });
  });

  test('canlı satır yoksa kopya korunur', () => {
    expect(snapshotuCanliylaGuncelle({ makineId: 'X1', siraNo: 5, machineName: 'A' }, {})).toMatchObject({ makineId: 'X1', siraNo: 5, machineName: 'A' });
  });

  test('mongoose belgesi düz nesneye çevrilir', () => {
    const belge = { toObject: () => ({ makineId: '', rowId: 'r1' }) };
    expect(snapshotuCanliylaGuncelle(belge, { makineId: 'Y' })).toEqual(expect.objectContaining({ makineId: 'Y', rowId: 'r1' }));
  });
});

describe('topluPlaceholderVerisi — yükleme linki', () => {
  test('toplu link tekil verinin boş uploadLink alanını doldurur', () => {
    const v = topluPlaceholderVerisi(
      { uploadLink: 'https://gmplansis.com/upload/tesvik/568825-AbCdEfGhIj' },
      [{ siraNo: 913, makineId: '4743905' }]
    );
    expect(v.uploadLink).toBe('https://gmplansis.com/upload/tesvik/568825-AbCdEfGhIj');
    expect(v.makineId).toBe('4743905');
  });
});

describe('toplu yükleme linki yardımcıları', () => {
  test('kapsam anahtarı seçim sırasından bağımsız', () => {
    expect(kapsamAnahtari([{ _id: 'b' }, { _id: 'a' }])).toBe(kapsamAnahtari([{ _id: 'a' }, { _id: 'b' }]));
  });

  test('yerli seçimde fatura türleri, karışık seçimde beyanname de sunulur', () => {
    expect(topluBelgeTurleri(['local', 'local']).map((t) => t.key)).toEqual(['fatura_taslak', 'fatura_onayli']);
    expect(topluBelgeTurleri(['local', 'import']).map((t) => t.key)).toEqual(['fatura_taslak', 'fatura_onayli', 'beyanname']);
    expect(topluBelgeTurleri([]).map((t) => t.key)).toEqual(['fatura_taslak', 'fatura_onayli']);
  });
});
