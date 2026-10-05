// 🧪 Fatura durumu etiketi — cari listesi ve Belge Takip listesi
import React from 'react';
import { render, screen } from '@testing-library/react';
import FaturaDurumuEtiketi from './FaturaDurumuEtiketi';

test('tek talep: durum etiketi', () => {
  render(<FaturaDurumuEtiketi durum="kesilmedi" />);
  expect(screen.getByText('Kesilmedi')).toBeInTheDocument();
});

test('tek talep: girilmemiş durum tire', () => {
  render(<FaturaDurumuEtiketi durum="" />);
  expect(screen.getByText('—')).toBeInTheDocument();
});

test('firma: yalnız dolu durumlar, birden çoksa sayısıyla', () => {
  render(<FaturaDurumuEtiketi sayilar={{ kesildi: 2, kesilmedi: 0, avans: 1, bos: 3 }} />);
  expect(screen.getByText('Kesildi (2)')).toBeInTheDocument();
  expect(screen.getByText('Avans')).toBeInTheDocument();
  expect(screen.queryByText(/Kesilmedi/)).not.toBeInTheDocument();
});

test('firma: hiç girilmemişse tire', () => {
  render(<FaturaDurumuEtiketi sayilar={{ kesildi: 0, kesilmedi: 0, avans: 0, bos: 4 }} />);
  expect(screen.getByText('—')).toBeInTheDocument();
});
