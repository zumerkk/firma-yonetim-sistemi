import { getDistrictCode, getDistrictName, getDistrictsByCity } from './cityDataComplete';

test('Ankara seçicisinde Kahramankazan görünür, eski kayıtlar aynı ilçe koduna eşleşir', () => {
  const ankara = getDistrictsByCity('ANKARA');
  expect(ankara).toContainEqual({ kod: 1815, ad: 'Kahramankazan' });
  expect(ankara.some(({ ad }) => ad === 'Kazan')).toBe(false);
  expect(getDistrictName(1815)).toBe('Kahramankazan');
  expect(getDistrictCode('Ankara', ' KAZAN ')).toBe(1815);
  expect(getDistrictCode('Ankara', 'Kahramankazan')).toBe(1815);
  expect(getDistrictCode('Bursa', 'Kazan')).toBeNull();
});
