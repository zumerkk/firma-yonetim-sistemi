// 🧪 Drive istemcisi — kimlik yolu seçimi ve JWT imzası
//
// `googleapis` paketi eklenmedi (onlarca MB), kimlik doğrulama elle yazıldı.
// Elle yazılan imza sessizce bozulursa yedek her gece "yetkisiz" hatası alır ve
// kimse fark etmez; bu yüzden imzanın gerçekten doğrulanabildiği test ediliyor.

const crypto = require('crypto');

const ESKI = { ...process.env };
const temizle = () => {
  ['GOOGLE_OAUTH_CLIENT_ID', 'GOOGLE_OAUTH_CLIENT_SECRET', 'GOOGLE_OAUTH_REFRESH_TOKEN',
    'GOOGLE_SERVICE_ACCOUNT_JSON', 'YEDEK_DRIVE_KLASOR_ID'].forEach((k) => { delete process.env[k]; });
};
beforeEach(() => { temizle(); jest.resetModules(); });
afterAll(() => { process.env = { ...ESKI }; });

const istemci = () => require('../../services/yedek/driveIstemcisi');

describe('yapılandırma', () => {
  test('hiçbir şey ayarlı değilse kapalı', () => {
    expect(istemci().yapilandirildiMi()).toBe(false);
    expect(istemci().kimlikYolu()).toBeNull();
  });

  test('klasör kimliği olmadan açılmaz (yedek nereye gideceğini bilmeli)', () => {
    Object.assign(process.env, { GOOGLE_OAUTH_CLIENT_ID: 'a', GOOGLE_OAUTH_CLIENT_SECRET: 'b', GOOGLE_OAUTH_REFRESH_TOKEN: 'c' });
    expect(istemci().yapilandirildiMi()).toBe(false);
  });

  test('OAuth üçlüsü + klasör → açık', () => {
    Object.assign(process.env, {
      GOOGLE_OAUTH_CLIENT_ID: 'a', GOOGLE_OAUTH_CLIENT_SECRET: 'b',
      GOOGLE_OAUTH_REFRESH_TOKEN: 'c', YEDEK_DRIVE_KLASOR_ID: 'k'
    });
    expect(istemci().yapilandirildiMi()).toBe(true);
    expect(istemci().kimlikYolu()).toBe('oauth');
  });

  test('servis hesabı JSON base64 olarak da verilebilir', () => {
    const anahtar = JSON.stringify({ client_email: 'x@y.iam.gserviceaccount.com', private_key: 'PEM' });
    process.env.GOOGLE_SERVICE_ACCOUNT_JSON = Buffer.from(anahtar).toString('base64');
    process.env.YEDEK_DRIVE_KLASOR_ID = 'k';
    expect(istemci().kimlikYolu()).toBe('servis-hesabi');
  });

  test('bozuk servis hesabı JSON\'ı çökertmez, kapalı sayılır', () => {
    process.env.GOOGLE_SERVICE_ACCOUNT_JSON = 'bu-json-degil';
    process.env.YEDEK_DRIVE_KLASOR_ID = 'k';
    expect(istemci().kimlikYolu()).toBeNull();
    expect(istemci().yapilandirildiMi()).toBe(false);
  });

  test('OAuth varsa servis hesabından önce gelir (kota tuzağı)', () => {
    // Servis hesaplarının kendi depolama kotası yok: kişisel klasöre yükleyemezler.
    Object.assign(process.env, {
      GOOGLE_OAUTH_CLIENT_ID: 'a', GOOGLE_OAUTH_CLIENT_SECRET: 'b', GOOGLE_OAUTH_REFRESH_TOKEN: 'c',
      GOOGLE_SERVICE_ACCOUNT_JSON: JSON.stringify({ client_email: 'x@y', private_key: 'PEM' }),
      YEDEK_DRIVE_KLASOR_ID: 'k'
    });
    expect(istemci().kimlikYolu()).toBe('oauth');
  });
});

describe('servis hesabı JWT imzası', () => {
  test('üretilen JWT, hesabın açık anahtarıyla doğrulanabiliyor', async () => {
    const { privateKey, publicKey } = crypto.generateKeyPairSync('rsa', { modulusLength: 2048 });
    const pem = privateKey.export({ type: 'pkcs8', format: 'pem' });
    process.env.GOOGLE_SERVICE_ACCOUNT_JSON = JSON.stringify({
      client_email: 'yedek@proje.iam.gserviceaccount.com', private_key: pem
    });
    process.env.YEDEK_DRIVE_KLASOR_ID = 'k';

    // Token ucuna giden gövdeyi yakala
    let gonderilen = null;
    jest.doMock('https', () => ({
      request: (secenekler, geriCagri) => {
        const yigin = [];
        return {
          on: () => {},
          write: (p) => yigin.push(p),
          end: () => {
            gonderilen = yigin.join('');
            geriCagri({
              statusCode: 200,
              headers: {},
              on: (olay, fn) => {
                // gerçek https 'data' olayında Buffer verir — taklit de öyle vermeli
                if (olay === 'data') fn(Buffer.from(JSON.stringify({ access_token: 'TOKEN-1', expires_in: 3600 })));
                if (olay === 'end') fn();
              }
            });
          }
        };
      }
    }));
    const d = require('../../services/yedek/driveIstemcisi');
    const token = await d.erisimTokeni();
    expect(token).toBe('TOKEN-1');

    const jwt = new URLSearchParams(gonderilen).get('assertion');
    const [baslik, iddia, imza] = jwt.split('.');
    const dogru = crypto.createVerify('RSA-SHA256').update(`${baslik}.${iddia}`).end()
      .verify(publicKey, Buffer.from(imza.replace(/-/g, '+').replace(/_/g, '/'), 'base64'));
    expect(dogru).toBe(true);

    const govde = JSON.parse(Buffer.from(iddia.replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString());
    expect(govde.iss).toBe('yedek@proje.iam.gserviceaccount.com');
    expect(govde.scope).toContain('drive');
    expect(govde.exp).toBeGreaterThan(govde.iat);
  });
});
