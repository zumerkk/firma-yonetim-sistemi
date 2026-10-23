// Sunucu ile ön yüz izinli uzantı listeleri ayrışmasın (müşteri 23.10.2026: .txt/.zip/.rar)
import { EVRAK_UZANTILARI } from './yuklemeTurleri';

test('sunucudaki ALLOWED_EXT ile aynı', () => {
  // eslint-disable-next-line global-require
  const kaynak = require('fs').readFileSync(require('path').join(__dirname, '../../../backend/middleware/tesvikUpload.js'), 'utf8');
  const sunucu = JSON.parse(kaynak.match(/const ALLOWED_EXT = (\[[^\]]*\])/)[1].replace(/'/g, '"'));
  expect(EVRAK_UZANTILARI).toEqual(sunucu);
  expect(EVRAK_UZANTILARI).toEqual(expect.arrayContaining(['.txt', '.zip', '.rar']));
});
