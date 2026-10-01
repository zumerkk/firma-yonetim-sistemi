// Belge Takip listesi — sürükle-bırak sütun sırası (müşteri 01.10.2026: "mesela kontrol panelini
// öne almak istiyorum bazen")
import { sutunlariSirala, sutunTasi } from './useSutunSirasi';

const kolonlar = ['firmaUnvan', 'talepTuru', 'anaAsama', 'durum', 'actions'].map((field) => ({ field }));
const alanlar = (dizi) => dizi.map((c) => c.field);

describe('sutunTasi', () => {
  test('en sondaki İşlemler sütunu en başa taşınır', () => {
    expect(sutunTasi(alanlar(kolonlar), 'actions', 'firmaUnvan'))
      .toEqual(['actions', 'firmaUnvan', 'talepTuru', 'anaAsama', 'durum']);
  });
  test('sağa taşıma hedefin yerine geçer', () => {
    expect(sutunTasi(['a', 'b', 'c', 'd'], 'a', 'c')).toEqual(['b', 'c', 'a', 'd']);
  });
  test('kendi üstüne bırakmak ya da bilinmeyen alan sırayı değiştirmez', () => {
    expect(sutunTasi(['a', 'b'], 'a', 'a')).toEqual(['a', 'b']);
    expect(sutunTasi(['a', 'b'], 'x', 'a')).toEqual(['a', 'b']);
  });
});

describe('sutunlariSirala', () => {
  test('kayıt yoksa varsayılan sıra', () => {
    expect(alanlar(sutunlariSirala(kolonlar, null))).toEqual(alanlar(kolonlar));
  });
  test('kayıtlı sıra uygulanır', () => {
    const sira = ['actions', 'firmaUnvan', 'talepTuru', 'anaAsama', 'durum'];
    expect(alanlar(sutunlariSirala(kolonlar, sira))).toEqual(sira);
  });
  test('sonradan eklenen sütun varsayılan komşusunun ardına girer, kaldırılan alan yok sayılır', () => {
    const sira = ['actions', 'firmaUnvan', 'anaAsama', 'durum', 'eskiSutun']; // talepTuru kayıtta yok
    expect(alanlar(sutunlariSirala(kolonlar, sira)))
      .toEqual(['actions', 'firmaUnvan', 'talepTuru', 'anaAsama', 'durum']);
  });
});
