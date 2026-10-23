import { turkceKatla, turkceIcerir } from './turkceKatla';

test('İ/ı/I farkı ve Türkçe harfler eşleşir (müşteri 23.10.2026: armin/armın/ARMIN → ARMİN)', () => {
  ['armin', 'armın', 'ARMIN', 'ARMİN', 'Armin'].forEach((q) => expect(turkceIcerir('ARMİN GRUP MAKİNA', q)).toBe(true));
  expect(turkceIcerir('Çapak Alma Makinesi', 'capak  alma')).toBe(true);
  expect(turkceIcerir('ARMİN GRUP', 'armut')).toBe(false);
  expect(turkceKatla('  ŞİŞE  Ğ ')).toBe('sise g');
});
