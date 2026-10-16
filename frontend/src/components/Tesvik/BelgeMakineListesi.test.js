import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import BelgeMakineListesi from './BelgeMakineListesi';

test('830 makinenin yalnız görünen sayfası çizilir, sonraki sayfa okunur ve düzenleme yoktur', () => {
  const satirlar = Array.from({ length: 830 }, (_, i) => ({
    rowId: `r${i}`, siraNo: i + 1, adiVeOzelligi: `Makine ${i + 1}`, miktar: 1,
    birim: '142', birimFiyatiTl: 1234.5, toplamTutariTl: 1234.5
  }));
  render(<BelgeMakineListesi satirlar={satirlar} />);
  expect(screen.getByText('Makine 1')).toBeInTheDocument();
  expect(screen.queryByText('Makine 11')).not.toBeInTheDocument();
  expect(screen.getAllByRole('row')).toHaveLength(11);
  expect(screen.getAllByText('ADET')).toHaveLength(10);
  expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Sonraki sayfa' }));
  expect(screen.getByText('Makine 11')).toBeInTheDocument();
  expect(screen.queryByText('Makine 1')).not.toBeInTheDocument();
});

test('ithal liste GTİP ve kaynak dövizini gösterir', () => {
  render(<BelgeMakineListesi ithal satirlar={[{
    rowId: 'i', siraNo: 1, adiVeOzelligi: 'İthal makine', gtipKodu: '8477', miktar: 1,
    birimFiyatiFob: 2500, gumrukDovizKodu: 'EUR', toplamTutarFobUsd: 2750, kullanilmisMakine: '2'
  }]} />);
  expect(screen.getByText('8477')).toBeInTheDocument();
  expect(screen.getByText('2.500 EUR')).toBeInTheDocument();
  expect(screen.getByText('2.750 USD')).toBeInTheDocument();
  expect(screen.getByText('Yeni Makine')).toBeInTheDocument();
});
