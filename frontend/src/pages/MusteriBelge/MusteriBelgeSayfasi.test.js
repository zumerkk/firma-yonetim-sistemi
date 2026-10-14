import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import MusteriBelgeSayfasi from './MusteriBelgeSayfasi';
import api from '../../utils/axios';

jest.mock('../../utils/axios', () => ({ __esModule: true, default: { get: jest.fn() } }));

test('müşteri ithal listede EUR birim fiyatını ve USD toplamı birbirine karıştırmadan görür', async () => {
  api.get.mockResolvedValue({ data: { data: {
    tur: 'eski', belge: { yatirimciUnvan: 'TEST FİRMA', belgeYonetimi: { belgeNo: '123' } }, etiketler: {},
    makineler: { yerli: [], ithal: [{
      rowId: 'I1', listType: 'import', siraNo: 1, adi: 'EUR MAKİNE', miktar: 1, birim: 'ADET',
      birimFiyat: 165000, birimParaBirimi: 'EUR', toplam: 179000, paraBirimi: 'USD',
      kalemler: [], faturaToplami: 0, faturaAdedi: 0
    }] }
  } } });
  render(<MemoryRouter initialEntries={['/belge/test-token']}><Routes>
    <Route path="/belge/:token" element={<MusteriBelgeSayfasi />} />
  </Routes></MemoryRouter>);
  fireEvent.click(await screen.findByText('İthal Liste (1)'));
  expect(await screen.findByText((165000).toLocaleString('tr-TR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 2 }))).toBeInTheDocument();
  expect(screen.getByText((179000).toLocaleString('tr-TR', { style: 'currency', currency: 'USD', maximumFractionDigits: 2 }))).toBeInTheDocument();
});
