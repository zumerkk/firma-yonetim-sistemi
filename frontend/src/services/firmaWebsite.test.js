import { validateFirmaData } from './firmaService';

test.each(['', '   ', 'www.ornek.com', 'ornek.com', '-', 'https://ornek.com'])('website %p isteğe bağlıdır ve kaydı engellemez', (firmaWebsite) => {
  expect(validateFirmaData({
    vergiNoTC: '1234567890', tamUnvan: 'TEST FİRMASI', adres: 'Örnek Mahallesi 1. Sokak',
    firmaIl: 'ANKARA', ilkIrtibatKisi: 'Test', yetkiliKisiler: [{ adSoyad: 'Test Kişi' }], firmaWebsite
  })).toEqual({ isValid: true, errors: [] });
});
