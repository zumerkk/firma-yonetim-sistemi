// 🧪 Revize iptalinde talep/karar geri alma kararı
//
// Müşteri: "Listede işlemi iptal etsek bile yaptığımız değişiklikler kalıyor
// iptal olmuyor." Talep/karar anında sunucuya yazıldığı için İptal'in yeniden
// yüklemesi işe yaramıyordu. Burada "neyin geri yazılacağı" kararı test ediliyor.

import { geriAlinacaklar, anlikGoruntuAl } from './talepKararGeriAl';

const anlik = (satirlar) => anlikGoruntuAl(satirlar);

describe('anlikGoruntuAl', () => {
  test('yalnızca rowId taşıyan satırlar alınır', () => {
    const h = anlik([{ rowId: 'a', talep: { durum: 'x' } }, { talep: { durum: 'y' } }]);
    expect(h.size).toBe(1);
    expect(h.get('a').talep.durum).toBe('x');
  });

  test('kopya alınır — sonradan satır değişse anlık görüntü bozulmaz', () => {
    const satir = { rowId: 'a', talep: { durum: 'ilk' } };
    const h = anlik([satir]);
    satir.talep.durum = 'sonra';
    expect(h.get('a').talep.durum).toBe('ilk');
  });
});

describe('geriAlinacaklar - değişmeyene dokunulmaz', () => {
  test('hiçbir şey değişmediyse boş liste', () => {
    const satirlar = [{ rowId: 'a', talep: { durum: 'gonderildi' }, karar: { kararDurumu: 'onay' } }];
    expect(geriAlinacaklar(anlik(satirlar), satirlar, 'yerli')).toEqual([]);
  });

  // Sunucudan ISO metin, yerelde Date nesnesi gelir; yalnızca biçim farkı
  // yüzünden gereksiz geri yazma yapılmamalı
  test('Date ile ISO metin aynı sayılır', () => {
    const onceki = [{ rowId: 'a', talep: { talepTarihi: '2027-05-31T00:00:00.000Z' } }];
    const simdiki = [{ rowId: 'a', talep: { talepTarihi: new Date('2027-05-31T00:00:00.000Z') } }];
    expect(geriAlinacaklar(anlik(onceki), simdiki, 'yerli')).toEqual([]);
  });

  test('boş alanlar farkı bozmaz', () => {
    const onceki = [{ rowId: 'a', talep: { durum: 'x', istenenAdet: 0 } }];
    const simdiki = [{ rowId: 'a', talep: { durum: 'x', istenenAdet: 0, aciklama: '' } }];
    expect(geriAlinacaklar(anlik(onceki), simdiki, 'yerli')).toEqual([]);
  });
});

describe('geriAlinacaklar - değişeni yakalar', () => {
  test('tarih değiştiyse eski değer geri yazılır', () => {
    const onceki = [{ rowId: 'a', talep: { talepTarihi: '2027-01-01T00:00:00.000Z' } }];
    const simdiki = [{ rowId: 'a', talep: { talepTarihi: '2027-05-31T00:00:00.000Z' } }];
    const isler = geriAlinacaklar(anlik(onceki), simdiki, 'yerli');
    expect(isler).toHaveLength(1);
    expect(isler[0]).toMatchObject({ liste: 'yerli', rowId: 'a', alan: 'talep' });
    expect(isler[0].deger.talepTarihi).toBe('2027-01-01T00:00:00.000Z');
  });

  test('talep ve karar ayrı ayrı raporlanır', () => {
    const onceki = [{ rowId: 'a', talep: { durum: 'bos' }, karar: { kararDurumu: 'beklemede' } }];
    const simdiki = [{ rowId: 'a', talep: { durum: 'gonderildi' }, karar: { kararDurumu: 'onay' } }];
    const isler = geriAlinacaklar(anlik(onceki), simdiki, 'ithal');
    expect(isler.map((i) => i.alan).sort()).toEqual(['karar', 'talep']);
    expect(isler.every((i) => i.liste === 'ithal')).toBe(true);
  });

  // Eskiden hiç talep yokken revize sırasında girildiyse, geri alma onu TEMİZLEMELİ
  test('eskiden yoksa boş nesne geri yazılır (temizleme)', () => {
    const onceki = [{ rowId: 'a' }];
    const simdiki = [{ rowId: 'a', talep: { durum: 'gonderildi', talepTarihi: '2027-05-31' } }];
    const isler = geriAlinacaklar(anlik(onceki), simdiki, 'yerli');
    expect(isler).toHaveLength(1);
    expect(isler[0].deger).toEqual({});
  });
});

describe('geriAlinacaklar - kapsam dışı satırlar', () => {
  // Revize sırasında eklenen satırın anlık görüntüde karşılığı yok; ona dokunmuyoruz
  test('revize sırasında eklenen satır atlanır', () => {
    const onceki = [{ rowId: 'a', talep: { durum: 'x' } }];
    const simdiki = [
      { rowId: 'a', talep: { durum: 'x' } },
      { rowId: 'yeni', talep: { durum: 'gonderildi' } }
    ];
    expect(geriAlinacaklar(anlik(onceki), simdiki, 'yerli')).toEqual([]);
  });

  test('rowId olmayan satır atlanır', () => {
    const onceki = [{ rowId: 'a', talep: { durum: 'x' } }];
    expect(geriAlinacaklar(anlik(onceki), [{ talep: { durum: 'z' } }], 'yerli')).toEqual([]);
  });

  test('anlık görüntü yoksa hiçbir şey yapılmaz', () => {
    expect(geriAlinacaklar(null, [{ rowId: 'a', talep: { durum: 'z' } }], 'yerli')).toEqual([]);
  });
});
