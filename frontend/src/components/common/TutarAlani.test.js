// 🧪 Tutar alanı — Türkçe biçim ve ayrıştırma
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import TutarAlani from './TutarAlani';

const Sar = ({ baslangic = 0 }) => {
  const [v, setV] = React.useState(baslangic);
  return <><TutarAlani value={v} onChange={setV} label="Tutar" /><span data-testid="deger">{v}</span></>;
};

test('değer odak dışında Türkçe biçimde görünür', () => {
  render(<Sar baslangic={1234.5} />);
  expect(screen.getByLabelText('Tutar')).toHaveValue('1.234,50');
});

test('yazarken kullanıcının yazdığı kalır, sayı çözülür', () => {
  render(<Sar />);
  const alan = screen.getByLabelText('Tutar');
  fireEvent.focus(alan);
  fireEvent.change(alan, { target: { value: '1.234,56' } });
  expect(alan).toHaveValue('1.234,56');
  expect(screen.getByTestId('deger')).toHaveTextContent('1234.56');
});

test('nokta ondalıklı yazım da kabul edilir', () => {
  render(<Sar />);
  const alan = screen.getByLabelText('Tutar');
  fireEvent.focus(alan);
  fireEvent.change(alan, { target: { value: '1234.56' } });
  expect(screen.getByTestId('deger')).toHaveTextContent('1234.56');
});

test('odaktan çıkınca biçimlenir', () => {
  render(<Sar />);
  const alan = screen.getByLabelText('Tutar');
  fireEvent.focus(alan);
  fireEvent.change(alan, { target: { value: '2500' } });
  fireEvent.blur(alan);
  expect(alan).toHaveValue('2.500,00');
});

test('boş değer boş görünür (0 yazmaz)', () => {
  render(<Sar />);
  expect(screen.getByLabelText('Tutar')).toHaveValue('');
});
