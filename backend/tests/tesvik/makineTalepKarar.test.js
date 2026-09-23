// 🧪 Makine talep / karar — toplu uygulama ve durum kuralları
//
// Müşteri (15.09.2026): "Toplu işlem yapmak aşırı yavaş oluyor, 10 tane makineye talep tarihinin
// dolması bile 1dk sürüyor" ve "Toplu işlem yapınca otomatik olarak revizeyi bitiriyor".
// Kurallar tekil uçlarla (tesvikController.setMakineTalepDurumu / setMakineKararDurumu) aynı olmalı.

const {
  satirIndeksiBul, yeniTalep, yeniKarar, topluUygula, ozetMesaji
} = require('../../services/tesvik/makineTalepKarar');

const simdi = new Date('2026-09-15T10:00:00Z');

const belgeKur = (satirlar) => {
  const belge = { makineListeleri: { yerli: satirlar, ithal: [] }, degisen: [] };
  belge.markModified = (yol) => belge.degisen.push(yol);
  return belge;
};

describe('yeniTalep — tekil uçla aynı kural', () => {
  test('taslaktan bakanlığa gönderilince tarih verilmediyse bugün', () => {
    expect(yeniTalep({ durum: 'taslak' }, { durum: 'bakanliga_gonderildi', istenenAdet: 3 }, simdi))
      .toEqual({ durum: 'bakanliga_gonderildi', istenenAdet: 3, talepTarihi: simdi, talepNotu: '' });
  });

  test('verilen tarih korunur', () => {
    const t = new Date('2026-09-01');
    expect(yeniTalep({}, { durum: 'bakanliga_gonderildi', talepTarihi: t }, simdi).talepTarihi).toBe(t);
  });

  test('durum değişmiyorsa eski tarih kalır, adet verilmezse eskisi', () => {
    const eski = new Date('2026-08-01');
    expect(yeniTalep({ durum: 'bakanliga_gonderildi', talepTarihi: eski, istenenAdet: 5 }, { durum: 'bakanliga_gonderildi' }, simdi))
      .toMatchObject({ talepTarihi: eski, istenenAdet: 5 });
  });
});

describe('yeniKarar', () => {
  test('beklemede → onay tarih atar', () => {
    expect(yeniKarar({}, { kararDurumu: 'onay', onaylananAdet: 2 }, simdi))
      .toEqual({ kararDurumu: 'onay', onaylananAdet: 2, kararTarihi: simdi, kararNotu: '' });
  });

  test('0 adet de açıkça verilmiş sayılır (?? kuralı)', () => {
    expect(yeniKarar({ onaylananAdet: 4 }, { kararDurumu: 'red', onaylananAdet: 0 }, simdi).onaylananAdet).toBe(0);
  });
});

describe('satirIndeksiBul', () => {
  const satirlar = [
    { rowId: 'a', gtipKodu: '1', adiVeOzelligi: 'X', miktar: 2, birim: 'ADET' },
    { rowId: 'b', gtipKodu: '2', adiVeOzelligi: 'Y', miktar: 1, birim: 'ADET' }
  ];

  test('rowId ile', () => {
    expect(satirIndeksiBul(satirlar, { rowId: 'b' })).toBe(1);
  });

  test('rowId tutmazsa eşleşme alanlarıyla', () => {
    expect(satirIndeksiBul(satirlar, { rowId: 'yok', match: { gtipKodu: '1', miktar: 2 } })).toBe(0);
  });

  test('bulunamazsa -1', () => {
    expect(satirIndeksiBul(satirlar, { rowId: 'z' })).toBe(-1);
  });
});

describe('topluUygula — seçilen satırlar tek kayıtta', () => {
  test('hepsine uygular, seçilmeyene dokunmaz, bulunamayanı raporlar', () => {
    const belge = belgeKur([{ rowId: 'a', talep: { durum: 'taslak' } }, { rowId: 'b' }, { rowId: 'c', talep: { durum: 'taslak' } }]);
    const ozet = topluUygula(belge, {
      liste: 'yerli',
      alan: 'talep',
      simdi,
      islemler: [
        { rowId: 'a', talep: { durum: 'bakanliga_gonderildi', istenenAdet: 1 } },
        { rowId: 'c', talep: { durum: 'bakanliga_gonderildi', istenenAdet: 4, talepTarihi: new Date('2026-09-10') } },
        { rowId: 'yok', talep: { durum: 'bakanliga_gonderildi' } }
      ]
    });
    expect(ozet).toEqual({ guncellenen: ['a', 'c'], bulunamayan: ['yok'] });
    expect(belge.makineListeleri.yerli[0].talep).toMatchObject({ durum: 'bakanliga_gonderildi', talepTarihi: simdi });
    expect(belge.makineListeleri.yerli[1].talep).toBeUndefined();
    expect(belge.makineListeleri.yerli[2].talep.talepTarihi.toISOString()).toBe('2026-09-10T00:00:00.000Z');
    expect(belge.degisen).toEqual(['makineListeleri']);
  });

  test('karar alanı', () => {
    const belge = belgeKur([{ rowId: 'a' }]);
    topluUygula(belge, { liste: 'yerli', alan: 'karar', simdi, islemler: [{ rowId: 'a', karar: { kararDurumu: 'onay', onaylananAdet: 3 } }] });
    expect(belge.makineListeleri.yerli[0].karar).toMatchObject({ kararDurumu: 'onay', onaylananAdet: 3, kararTarihi: simdi });
  });

  test.each([
    [{ liste: 'baska', alan: 'talep', islemler: [{ rowId: 'a' }] }, 'Geçersiz liste'],
    [{ liste: 'yerli', alan: 'x', islemler: [{ rowId: 'a' }] }, 'Geçersiz alan'],
    [{ liste: 'yerli', alan: 'talep', islemler: [] }, 'Uygulanacak satır yok']
  ])('geçersiz istek 400 olarak işaretlenir: %p', (istek, mesaj) => {
    let hata;
    try { topluUygula(belgeKur([]), istek); } catch (e) { hata = e; }
    expect(hata && hata.message).toBe(mesaj);
    expect(hata.durum).toBe(400);
  });

  test('hiçbiri bulunamazsa değişiklik işaretlenmez', () => {
    const belge = belgeKur([{ rowId: 'a' }]);
    expect(topluUygula(belge, { liste: 'yerli', alan: 'talep', islemler: [{ rowId: 'z', talep: {} }] }))
      .toEqual({ guncellenen: [], bulunamayan: ['z'] });
    expect(belge.degisen).toEqual([]);
  });

  test('özet mesajı', () => {
    expect(ozetMesaji('talep', { guncellenen: ['a', 'b'], bulunamayan: [] })).toBe('2 makinenin talep durumu güncellendi');
    expect(ozetMesaji('karar', { guncellenen: ['a'], bulunamayan: ['z'] })).toBe('1 makinenin karar durumu güncellendi · 1 satır bulunamadı');
  });
});

describe('eski kimlikli makinelerde toplu tarih', () => {
  test('20 satırı sıra ve makine bilgileriyle bulur; mevcut tarih kaybolmaz', () => {
    const rows = Array.from({ length: 20 }, (_, i) => ({ rowId: `new-${i}`, siraNo: i + 1, adiVeOzelligi: 'Pres', miktar: 1, karar: { kararTarihi: '2026-06-25' } }));
    const belge = belgeKur(rows);
    const ozet = topluUygula(belge, { liste: 'yerli', alan: 'karar', islemler: rows.map((r, i) => ({ rowId: `old-${i}`, match: { siraNo: r.siraNo, adiVeOzelligi: 'Pres', miktar: 1 }, karar: { kararDurumu: 'onay', kararTarihi: '2026-06-25' } })) });
    expect(ozet.guncellenen).toHaveLength(20);
    expect(ozet.bulunamayan).toEqual([]);
    expect(rows.every(r => r.karar.kararTarihi === '2026-06-25')).toBe(true);
  });
  test('boş veya birden fazla satırla eşleşen koşul yanlış makineyi değiştirmez', () => {
    const rows = [{ adiVeOzelligi: 'Pres' }, { adiVeOzelligi: 'Pres' }];
    expect(satirIndeksiBul(rows, { match: {} })).toBe(-1);
    expect(satirIndeksiBul(rows, { match: { adiVeOzelligi: 'Pres' } })).toBe(-1);
  });
});
