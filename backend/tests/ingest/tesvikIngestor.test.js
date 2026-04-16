const { normalizeTesvik, validateTesvik, normalizeYeniTesvik, validateYeniTesvik } = require('../../services/ingest/ingestors/TesvikIngestor');

describe('Tesvik/YeniTesvik ingestor (phase-2)', () => {
  test('validates required fields for Tesvik (eski) including belgeYonetimi', () => {
    const n = normalizeTesvik({
      gmId: 'GM123',
      firmaId: 'A001162',
      yatirimciUnvan: 'Örnek A.Ş.',
      yatirimKonusu: 'Üretim yatırımı',
      destekSinifi: '1',
      yerinIl: 'İSTANBUL',
      belgeId: 'B-1',
      belgeNo: 'YTB-1',
      belgeTarihi: '2026-01-01',
    });

    expect(validateTesvik(n)).toEqual([]);
    expect(n.gmId).toBe('GM123');
    expect(n.yatirimBilgileri.yatirimKonusu).toBe('Üretim yatırımı');
    expect(n.belgeYonetimi.belgeNo).toBe('YTB-1');
  });

  test('fails Tesvik validation when belge fields missing', () => {
    const n = normalizeTesvik({
      gmId: 'GM123',
      firmaId: 'A001162',
      yatirimciUnvan: 'Örnek A.Ş.',
      yatirimKonusu: 'Üretim yatırımı',
      destekSinifi: '1',
      yerinIl: 'İSTANBUL',
    });
    expect(validateTesvik(n)).toEqual(expect.arrayContaining(['belgeYonetimi.belgeId required']));
    expect(validateTesvik(n)).toEqual(expect.arrayContaining(['belgeYonetimi.belgeNo required']));
    expect(validateTesvik(n)).toEqual(expect.arrayContaining(['belgeYonetimi.belgeTarihi required']));
  });

  test('validates YeniTesvik without belge fields (taslak destek)', () => {
    const n = normalizeYeniTesvik({
      gmId: 'GM123',
      firmaId: 'A001162',
      yatirimciUnvan: 'Örnek A.Ş.',
      yatirimKonusu: 'Üretim yatırımı',
      destekSinifi: '1',
      yerinIl: 'İSTANBUL',
      bonusOrani: '5',
    });

    expect(validateYeniTesvik(n)).toEqual([]);
    expect(n.gmId).toBe('GM123');
    expect(n.maliHesaplamalar?.bonusHesaplamalari).toBeUndefined(); // phase-2 minimal
  });
});

