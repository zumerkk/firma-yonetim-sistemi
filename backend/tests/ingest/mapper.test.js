const { autoMap } = require('../../services/ingest/mapping/autoMapper');

describe('ingest autoMapper', () => {
  test('maps vergiNoTC and tamUnvan synonyms', () => {
    const headers = ['VKN', 'Ünvan', 'Şehir', 'Adres'];
    const mapping = autoMap({ module: 'FIRMA', headers });
    expect(mapping['VKN']).toBe('vergiNoTC');
    expect(mapping['Ünvan']).toBe('tamUnvan');
  });

  test('maps Tesvik core fields', () => {
    const headers = [
      'GM ID',
      'Firma ID',
      'Yatırımcı Ünvan',
      'Yatırım Konusu',
      'Destek Sınıfı',
      'Yerin İl',
      'Belge No',
      'Belge ID',
      'Belge Tarihi',
    ];
    const mapping = autoMap({ module: 'TESVIK', headers });
    expect(mapping['GM ID']).toBe('gmId');
    expect(mapping['Firma ID']).toBe('firmaId');
    expect(mapping['Yatırımcı Ünvan']).toBe('yatirimciUnvan');
    expect(mapping['Yatırım Konusu']).toBe('yatirimKonusu');
    expect(mapping['Destek Sınıfı']).toBe('destekSinifi');
    expect(mapping['Yerin İl']).toBe('yerinIl');
    expect(mapping['Belge No']).toBe('belgeNo');
    expect(mapping['Belge ID']).toBe('belgeId');
    expect(mapping['Belge Tarihi']).toBe('belgeTarihi');
  });
});
