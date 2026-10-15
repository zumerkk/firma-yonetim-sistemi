import { kapasiteCoz, kapasiteYaz, kapasiteToplami, urunuKaydaCevir } from './urunKapasite';

describe('kapasiteCoz', () => {
  test.each([
    ['4,125', 4.125], ['4.125', 4.125], ['4,', 4], ['4.', 4],
    ['0,12567', 0.12567], [',5', 0.5], ['.5', 0.5],
    ['1.234.567,8912', 1234567.8912], ['1,234,567.8912', 1234567.8912],
    ['500.000.000', 500000000], ['500,000,000', 500000000],
    [' 1 234,567 ', 1234.567], [4.125, 4.125], [0, 0]
  ])('%p kapasitesi %p olarak çözülür', (deger, beklenen) => {
    expect(kapasiteCoz(deger)).toBe(beklenen);
  });

  test.each(['', ' ', null, undefined, '-', '.', ',', '4..125', '4,12,5', 'foo', Infinity, NaN])(
    'boş veya geçersiz kapasite %p boş kalır', (deger) => expect(kapasiteCoz(deger)).toBe('')
  );
});

test('Türkçe gösterim, üçten fazla ondalığı ve gruplamasız düzenlemeyi korur', () => {
  expect(kapasiteYaz(1234.12567)).toBe('1.234,12567');
  expect(kapasiteYaz(1234.12567, { gruplama: false })).toBe('1234,12567');
  expect(kapasiteYaz(0.0000001, { gruplama: false })).toBe('0,0000001');
  expect(kapasiteYaz('')).toBe('');
});

test.each([
  ['4,125', '0.875', 5], [4.12567, 0.00001, 4.12568],
  [0.1, 0.2, 0.3], [0.0000001, 0.0000002, 0.0000003],
  [999999999.1, 0.2, 999999999.3], [1e-101, 0, 1e-101], ['', '', 0], [4.125, '', 4.125]
])('kapasite toplamı %p + %p = %p', (a, b, beklenen) => {
  expect(kapasiteToplami(a, b)).toBe(beklenen);
});

test('API kaydında mevcut, ilave ve yeniden hesaplanan toplamın küsuratları korunur', () => {
  expect(urunuKaydaCevir({
    kod: '35.12', aciklama: 'GES', mevcut: '4.125', ilave: '0,00067', toplam: 999,
    kapasite_birimi: 'MW'
  })).toEqual({
    u97Kodu: '35.12', urunAdi: 'GES', mevcutKapasite: 4.125, ilaveKapasite: 0.00067,
    toplamKapasite: 4.12567, kapasiteBirimi: 'MW'
  });
  expect(urunuKaydaCevir({}).toplamKapasite).toBe(0);
});
