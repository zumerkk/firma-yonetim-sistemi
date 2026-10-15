import React, { act } from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import KapasiteAlani from './KapasiteAlani';

const Sar = ({ baslangic = 0, ...props }) => {
  const [deger, setDeger] = React.useState(baslangic);
  return (
    <>
      <KapasiteAlani value={deger} onDegis={setDeger} label="İlave kapasite" {...props} />
      <span data-testid="deger">{String(deger)}</span>
    </>
  );
};

test.each([',', '.'])('%s tuşuyla ondalık adım adım yazılır; sondaki ayıraç silinmez', (ayrac) => {
  render(<Sar />);
  const alan = screen.getByLabelText('İlave kapasite');
  act(() => userEvent.click(alan));
  act(() => userEvent.type(alan, `4${ayrac}`));
  expect(alan).toHaveValue(`4${ayrac}`);
  expect(screen.getByTestId('deger')).toHaveTextContent('4');
  act(() => userEvent.type(alan, '12567'));
  expect(alan).toHaveValue(`4${ayrac}12567`);
  expect(screen.getByTestId('deger')).toHaveTextContent('4.12567');
  fireEvent.blur(alan);
  expect(alan).toHaveValue('4,12567');
  fireEvent.focus(alan);
  expect(alan).toHaveValue('4,12567');
});

test('kayıtlı binlik değer odakta gruplamasızdır; odak değişimi kaydı değiştirmez', () => {
  render(<Sar baslangic={1234.12567} />);
  const alan = screen.getByLabelText('İlave kapasite');
  expect(alan).toHaveValue('1.234,12567');
  fireEvent.focus(alan);
  expect(alan).toHaveValue('1234,12567');
  act(() => userEvent.type(alan, '8'));
  expect(screen.getByTestId('deger')).toHaveTextContent('1234.125678');
  fireEvent.blur(alan);
  expect(alan).toHaveValue('1.234,125678');
  fireEvent.focus(alan);
  fireEvent.blur(alan);
  expect(screen.getByTestId('deger')).toHaveTextContent('1234.125678');
});

test.each(['1.234.567,8912', '1,234,567.8912'])('gruplu yapıştırma %p küsuratı değiştirmez', (yazi) => {
  render(<Sar />);
  const alan = screen.getByLabelText('İlave kapasite');
  fireEvent.focus(alan);
  fireEvent.change(alan, { target: { value: yazi } });
  expect(alan).toHaveValue(yazi);
  expect(screen.getByTestId('deger')).toHaveTextContent('1234567.8912');
  fireEvent.blur(alan);
  expect(alan).toHaveValue('1.234.567,8912');
  fireEvent.focus(alan);
  expect(alan).toHaveValue('1234567,8912');
});

test('sıfırı yazmadan terk etmek değiştirmez; alan tamamen silinebilir', () => {
  render(<Sar />);
  const alan = screen.getByLabelText('İlave kapasite');
  expect(alan).toHaveValue('0');
  fireEvent.focus(alan);
  expect(alan).toHaveValue('');
  fireEvent.blur(alan);
  expect(alan).toHaveValue('0');
  act(() => userEvent.clear(alan));
  expect(screen.getByTestId('deger')).toBeEmptyDOMElement();
  fireEvent.blur(alan);
  expect(alan).toHaveValue('');
});
