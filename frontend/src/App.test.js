// 🧪 UYGULAMA AÇILIŞ TESTİ
//
// Bu dosya uzun süre CRA'nın hazır şablonuydu ("renders learn react link") ve
// hiç çalışmıyordu:
//   · aradığı "learn react" bağlantısı bu uygulamada YOK — geçseydi bile
//     anlamsız olurdu,
//   · axios v1 ESM olarak dağıtıldığı için Jest App'i hiç yükleyemiyordu
//     ("Cannot use import statement outside a module"), yani paket suite
//     seviyesinde düşüyor ve 0 test çalıştırıyordu.
//
// İkisi de düzeltildi: package.json'daki transformIgnorePatterns axios'u
// dönüştürüyor, buradaki test de gerçekten işe yarayan bir şeyi ölçüyor —
// uygulama sağlayıcı zinciriyle birlikte HATA VERMEDEN kuruluyor mu.
//
// Sağlayıcılar (Auth/Firma/Notification/Tesvik/DosyaTakip) açılışta ağ isteği
// atıyor; testte gerçek istek atılmasın diye axios sarmalayıcısı mock'lanıyor.
// Aynı desen __duman__/ekranlar.test.js'te de kullanılıyor.

import { render } from '@testing-library/react';

jest.mock('./utils/axios', () => {
  const sahte = {
    get: jest.fn(() => Promise.resolve({ data: { success: true, data: [] } })),
    post: jest.fn(() => Promise.resolve({ data: { success: true, data: {} } })),
    put: jest.fn(() => Promise.resolve({ data: { success: true, data: {} } })),
    patch: jest.fn(() => Promise.resolve({ data: { success: true, data: {} } })),
    delete: jest.fn(() => Promise.resolve({ data: { success: true } })),
    interceptors: { request: { use: jest.fn() }, response: { use: jest.fn() } },
    defaults: { headers: { common: {} } }
  };
  return { __esModule: true, default: sahte, uploadPost: jest.fn(() => Promise.resolve({ data: {} })) };
});

// Sürüm uyarısı açılışta uzak bir dosyayı yoklıyor; testte gereksiz.
jest.mock('./components/common/SurumUyarisi', () => () => null);

describe('App - açılış', () => {
  test('sağlayıcı zinciriyle birlikte hatasız kurulur', () => {
    // eslint-disable-next-line global-require
    const App = require('./App').default;
    expect(() => render(<App />)).not.toThrow();
  });

  test('kurulum sırasında konsola hata basılmaz', () => {
    const hatalar = [];
    const orijinal = console.error;
    console.error = (...args) => hatalar.push(args.join(' '));
    try {
      // eslint-disable-next-line global-require
      const App = require('./App').default;
      render(<App />);
    } finally {
      console.error = orijinal;
    }
    // React'in "act(...)" uyarıları bu testin konusu değil; gerçek hataları arıyoruz
    const gercekHatalar = hatalar.filter((h) => !/not wrapped in act|ReactDOMTestUtils/i.test(h));
    expect(gercekHatalar).toEqual([]);
  });
});
