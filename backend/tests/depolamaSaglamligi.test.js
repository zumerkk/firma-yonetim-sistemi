// 🧪 Yüklenen dosya kalıcı depoya mı gidiyor?
//
// Müşteri (23.09.2026): "gelen evrakların kaybolmaması gerekiyor … geriye dönük veri kaybı
// yaşamayalım." 8 Eylül 2026'da evraklar CLOUDINARY_STORAGE_ENABLED bayrağı olmadığı için
// sessizce Render'ın UÇUCU diskine yazılmış ve her yeniden başlatmada silinmişti (canlıda
// 7 makine evrakı + 1 KDV yazısı bu yüzden kayıp). Artık üretimde varsayılan buluttur.
//
// Ayrı dosyada: bu testler jest.resetModules() ile modül kaydını sıfırlıyor; aynı dosyadaki
// veritabanı testleri bundan etkileniyordu.

describe('3. Yüklenen dosyanın depolandığı yer', () => {
  const ESKI = { ...process.env };
  afterEach(() => { process.env = { ...ESKI }; jest.resetModules(); });

  const provider = () => {
    jest.resetModules();
    return require('../services/tesvikMakine/storageService').getProvider();
  };

  test('üretimde kimlik bilgileri varsa bayrak olmasa da BULUT kullanılır', () => {
    process.env.NODE_ENV = 'production';
    delete process.env.CLOUDINARY_STORAGE_ENABLED;
    Object.assign(process.env, { CLOUDINARY_CLOUD_NAME: 'x', CLOUDINARY_API_KEY: 'y', CLOUDINARY_API_SECRET: 'z' });
    expect(provider()).toBe('cloudinary');
  });

  test('bayrak açıkça kapatılırsa yerel diske düşer (bilinçli tercih)', () => {
    process.env.NODE_ENV = 'production';
    process.env.CLOUDINARY_STORAGE_ENABLED = 'false';
    Object.assign(process.env, { CLOUDINARY_CLOUD_NAME: 'x', CLOUDINARY_API_KEY: 'y', CLOUDINARY_API_SECRET: 'z' });
    expect(provider()).toBe('local');
  });

  test('kimlik bilgileri eksikse üretimde de yerel kalır', () => {
    process.env.NODE_ENV = 'production';
    delete process.env.CLOUDINARY_STORAGE_ENABLED;
    process.env.CLOUDINARY_CLOUD_NAME = 'x';
    delete process.env.CLOUDINARY_API_KEY; delete process.env.CLOUDINARY_API_SECRET;
    expect(provider()).toBe('local');
  });

  test('geliştirmede varsayılan yerel disktir', () => {
    process.env.NODE_ENV = 'development';
    delete process.env.CLOUDINARY_STORAGE_ENABLED;
    Object.assign(process.env, { CLOUDINARY_CLOUD_NAME: 'x', CLOUDINARY_API_KEY: 'y', CLOUDINARY_API_SECRET: 'z' });
    expect(provider()).toBe('local');
  });
});
