// 🧪 Finansal tablo tutar alanı — virgüllü yapıştırma yukarı yuvarlanır
// Müşteri (05.10.2026): "virgül koydurmuyor o yüzden tutarlar farklı yapışıyor" — "virgül
// olmayacaksa bile yukarıya yuvarlasın". Ekran görüntüsündeki "7.658.870.444" aslında
// E-TUYS'teki 76.588.704,44'ün virgülü atılmış haliydi.
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import FinansalTutarAlani from './FinansalTutarAlani';
import { tutarYukariYuvarla } from '../../utils/sayiFormat';

describe('tutarYukariYuvarla', () => {
  test.each([
    ['76.588.704,44', 76588705],
    ['7.384.403,99', 7384404],
    ['1.000,00', 1000],          // kuruşsuz tam değer bir üste taşmaz
    ['1.500', 1500],             // tek nokta + 3 hane → binlik
    ['7.658.870', 7658870],
    ['704,01', 705],
    ['76,588,704.44', 76588705], // İngilizce yapıştırma
    ['1,234,567', 1234567],
    ['1234.5', 1235],
    ['12.345.678 ₺', 12345678],
    ['0,1', 1],
    [' 250000 ', 250000],
    [76588704.44, 76588705],
    [0.30000000000000004, 1],
    [3.0000000000001, 3]          // kayan nokta artığı taşımaz
  ])('%p → %p', (girdi, beklenen) => {
    expect(tutarYukariYuvarla(girdi)).toBe(beklenen);
  });

  test('boş girdi boş kalır', () => {
    expect(tutarYukariYuvarla('')).toBe('');
    expect(tutarYukariYuvarla('  ')).toBe('');
    expect(tutarYukariYuvarla(null)).toBe('');
    expect(tutarYukariYuvarla('₺')).toBe('');
  });
});

const Sar = ({ baslangic = 0, sifirGizle }) => {
  const [v, setV] = React.useState(baslangic);
  return (
    <>
      <FinansalTutarAlani value={v} onDegis={setV} label="İthal" sifirGizle={sifirGizle} />
      <span data-testid="deger">{String(v)}</span>
    </>
  );
};

test('E-TUYS’ten kuruşlu yapıştırma yukarı yuvarlanıp binlik noktalı görünür', () => {
  render(<Sar />);
  const alan = screen.getByLabelText('İthal');
  fireEvent.focus(alan);
  fireEvent.change(alan, { target: { value: '76.588.704,44' } });
  expect(alan).toHaveValue('76.588.704,44'); // yazarken dokunulmaz
  expect(screen.getByTestId('deger')).toHaveTextContent('76588705');
  fireEvent.blur(alan);
  expect(alan).toHaveValue('76.588.705');
});

test('virgül elle yazılabiliyor (eskiden tuşa basar basmaz siliniyordu)', () => {
  render(<Sar />);
  const alan = screen.getByLabelText('İthal');
  fireEvent.focus(alan);
  fireEvent.change(alan, { target: { value: '1.250,' } });
  expect(alan).toHaveValue('1.250,');
  fireEvent.change(alan, { target: { value: '1.250,5' } });
  expect(screen.getByTestId('deger')).toHaveTextContent('1251');
});

test('kayıtlı değer odak dışında binlik noktalı, sıfır "0" görünür; odaklanınca 0 temizlenir', () => {
  const { unmount } = render(<Sar baslangic={7658870} />);
  expect(screen.getByLabelText('İthal')).toHaveValue('7.658.870');
  unmount();
  render(<Sar baslangic={0} />);
  const alan = screen.getByLabelText('İthal');
  expect(alan).toHaveValue('0');
  fireEvent.focus(alan);
  expect(alan).toHaveValue('');
  fireEvent.blur(alan);
  expect(alan).toHaveValue('0'); // yazmadan çıkınca değer değişmez
});

test('sifirGizle: 0 boş görünür, silinen alan boş değer gönderir', () => {
  render(<Sar baslangic={0} sifirGizle />);
  const alan = screen.getByLabelText('İthal');
  expect(alan).toHaveValue('');
  fireEvent.focus(alan);
  fireEvent.change(alan, { target: { value: '5' } });
  fireEvent.change(alan, { target: { value: '' } });
  expect(screen.getByTestId('deger')).toHaveTextContent('');
});
