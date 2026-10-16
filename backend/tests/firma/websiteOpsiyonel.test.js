const { validationResult } = require('express-validator');
const { validateCreateFirma, validateUpdateFirma } = require('../../middleware/validation');
const Firma = require('../../models/Firma');

describe.each([['oluşturma', validateCreateFirma], ['güncelleme', validateUpdateFirma]])('%s website alanı', (_ad, kurallar) => {
  test.each(['', '   ', 'www.ornek.com', 'ornek.com', '-', 'https://ornek.com'])('%p firma kaydını engellemez', async (firmaWebsite) => {
    const req = { body: { firmaWebsite }, query: {}, params: {}, headers: {} };
    for (const k of kurallar) if (k.run) await k.run(req);
    expect(validationResult(req).array().filter((e) => e.path === 'firmaWebsite')).toEqual([]);
    const firma = new Firma({ firmaWebsite });
    expect(firma.validateSync()?.errors.firmaWebsite).toBeUndefined();
  });
});
