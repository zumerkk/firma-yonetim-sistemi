import { parseDateText, createDatePasteHandler } from './dateUtils';

test.each(['25/06/2026', '25.06.2026', '25-06-2026', '2026-06-25'])('yapıştırılan gün değişmez: %s', text => {
  expect(parseDateText(text)).toBe('2026-06-25');
});
test.each(['31/04/2026', '29/02/2026', '00/12/2026', '25/13/2026'])('geçersiz gün reddedilir: %s', text => {
  expect(parseDateText(text)).toBeNull();
});
test('artık yıl ve yapıştırma işlemi', () => {
  const setter = jest.fn();
  const e = { clipboardData: { getData: () => '29/02/2024' }, preventDefault: jest.fn() };
  createDatePasteHandler(setter)(e);
  expect(setter).toHaveBeenCalledWith('2024-02-29');
  expect(e.preventDefault).toHaveBeenCalled();
});
