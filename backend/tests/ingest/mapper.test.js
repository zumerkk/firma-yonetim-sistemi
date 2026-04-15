const { autoMap } = require('../../services/ingest/mapping/autoMapper');

describe('ingest autoMapper', () => {
  test('maps vergiNoTC and tamUnvan synonyms', () => {
    const headers = ['VKN', 'Ünvan', 'Şehir', 'Adres'];
    const mapping = autoMap({ module: 'FIRMA', headers });
    expect(mapping['VKN']).toBe('vergiNoTC');
    expect(mapping['Ünvan']).toBe('tamUnvan');
  });
});

