const { suggestGeminiMapping } = require('../../services/ingest/mapping/geminiMapper');

describe('geminiMapper (optional)', () => {
  test('returns null when GEMINI_API_KEY missing', async () => {
    const prev = process.env.GEMINI_API_KEY;
    delete process.env.GEMINI_API_KEY;

    const res = await suggestGeminiMapping({
      module: 'FIRMA',
      headers: ['VKN', 'Ünvan'],
      sampleRows: [{ VKN: '1234567890', 'Ünvan': 'Örnek A.Ş.' }],
      baseMapping: {},
    });

    expect(res).toBeNull();
    if (prev) process.env.GEMINI_API_KEY = prev;
  });
});

