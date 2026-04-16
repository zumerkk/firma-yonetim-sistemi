const { classify } = require('../../services/ingest/classifier');

describe('ingest classifier', () => {
  test('classifies Firma with strong headers', () => {
    const headers = ['vergi no', 'tam ünvan', 'adres', 'il', 'ilk irtibat kişisi'];
    const result = classify({ headers });
    expect(result.module).toBe('FIRMA');
    expect(result.confidence).toBeGreaterThan(0.8);
  });

  test('classifies DosyaTakip with workflow headers', () => {
    const headers = ['takipId', 'talepTuru', 'durum', 'anaAsama', 'firmaUnvan'];
    const result = classify({ headers });
    expect(result.module).toBe('DOSYA_TAKIP');
    expect(result.confidence).toBeGreaterThan(0.8);
  });

  test('classifies Tesvik (eski) with core headers', () => {
    const headers = [
      'gmId',
      'firmaId',
      'yatirimciUnvan',
      'yatirimKonusu',
      'destekSinifi',
      'yerinIl',
      'belgeNo',
      'belgeId',
      'belgeTarihi',
    ];
    const result = classify({ headers });
    expect(result.module).toBe('TESVIK');
    expect(result.confidence).toBeGreaterThan(0.75);
  });

  test('classifies YeniTesvik when bonus headers exist', () => {
    const headers = [
      'gmId',
      'firmaId',
      'yatirimciUnvan',
      'yatirimKonusu',
      'destekSinifi',
      'yerinIl',
      'bonusHesaplamalari.surdurulebilirlikBonusu.bonusOrani',
    ];
    const result = classify({ headers });
    expect(result.module).toBe('YENI_TESVIK');
    expect(result.confidence).toBeGreaterThan(0.75);
  });
});
