// Küsuratlı finansal tutarların Türkçe/İngilizce yapıştırma, giriş ve gösterimi.
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import FinansalTutarAlani from './FinansalTutarAlani';
import { finansalTutarCoz } from '../../utils/sayiFormat';

describe('finansalTutarCoz', () => {
  test.each([
    ['76.588.704,44', 76588704.44],
    ['7.384.403,99', 7384403.99],
    ['1.000,00', 1000],          // kuruşsuz tam değer bir üste taşmaz
    ['1.500', 1500],             // tek nokta + 3 hane → binlik
    ['7.658.870', 7658870],
    ['704,01', 704.01],
    ['76,588,704.44', 76588704.44], // İngilizce yapıştırma
    ['1,234,567', 1234567],
    ['1234.5', 1234.5],
    ['12.345.678 ₺', 12345678],
    ['0,1', 0.1],
    [' 250000 ', 250000],
    [76588704.44, 76588704.44],
    [0.30000000000000004, 0.30000000000000004],
    [3.0000000000001, 3.0000000000001]          // kayan nokta artığı taşımaz
  ])('%p → %p', (girdi, beklenen) => {
    expect(finansalTutarCoz(girdi)).toBe(beklenen);
  });

  test('boş girdi boş kalır', () => {
    expect(finansalTutarCoz('')).toBe('');
    expect(finansalTutarCoz('  ')).toBe('');
    expect(finansalTutarCoz(null)).toBe('');
    expect(finansalTutarCoz('₺')).toBe('');
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

test('E-TUYS’ten kuruşlu yapıştırma kuruşları korunarak binlik noktalı görünür', () => {
  render(<Sar />);
  const alan = screen.getByLabelText('İthal');
  fireEvent.focus(alan);
  fireEvent.change(alan, { target: { value: '76.588.704,44' } });
  expect(alan).toHaveValue('76.588.704,44'); // yazarken dokunulmaz
  expect(screen.getByTestId('deger')).toHaveTextContent('76588704.44');
  fireEvent.blur(alan);
  expect(alan).toHaveValue('76.588.704,44');
});

test('virgül elle yazılabiliyor (eskiden tuşa basar basmaz siliniyordu)', () => {
  render(<Sar />);
  const alan = screen.getByLabelText('İthal');
  fireEvent.focus(alan);
  fireEvent.change(alan, { target: { value: '1.250,' } });
  expect(alan).toHaveValue('1.250,');
  fireEvent.change(alan, { target: { value: '1.250,5' } });
  expect(screen.getByTestId('deger')).toHaveTextContent('1250.5');
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


test('kayıtlı kuruşlu tutar açılışta ve odak değişiminde 100 katına dönüşmez', () => {
  render(<Sar baslangic={1234.56} />);
  const alan = screen.getByLabelText('İthal');
  expect(alan).toHaveValue('1.234,56');
  fireEvent.focus(alan);
  fireEvent.blur(alan);
  expect(screen.getByTestId('deger')).toHaveTextContent('1234.56');
  expect(alan).toHaveValue('1.234,56');
});
