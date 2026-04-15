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
});

