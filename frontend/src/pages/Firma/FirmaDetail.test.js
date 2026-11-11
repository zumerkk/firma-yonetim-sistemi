import React from 'react';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes, useNavigate } from 'react-router-dom';
import { FirmaProvider } from '../../contexts/FirmaContext';
import firmaService from '../../services/firmaService';
import api from '../../utils/axios';
import FirmaDetail from './FirmaDetail';

jest.mock('../../services/firmaService', () => ({ __esModule: true, default: { getFirma: jest.fn() } }));
jest.mock('../../utils/axios', () => ({ __esModule: true, default: { put: jest.fn() } }));
jest.mock('../../components/Layout/Header', () => () => null);
jest.mock('../../components/Layout/Sidebar', () => () => null);

function Gorunum() {
  const navigate = useNavigate();
  return <>
    <button onClick={() => navigate('/firmalar/B')}>B firmasını aç</button>
    <Routes><Route path="/firmalar/:id" element={<FirmaDetail />} /></Routes>
  </>;
}

const cevap = (id) => ({ success: true, data: { firma: { _id: id, firmaId: id, tamUnvan: `Test Firması ${id}` } } });

test('geç dönen A kaydı B detayını veya kaydedilen unvanı değiştiremez', async () => {
  const tamamla = {};
  firmaService.getFirma.mockImplementation((id) => new Promise((resolve) => { tamamla[id] = resolve; }));
  api.put.mockResolvedValue({ data: { success: false } });
  render(<MemoryRouter initialEntries={['/firmalar/A']} future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
    <FirmaProvider><Gorunum /></FirmaProvider>
  </MemoryRouter>);
  await waitFor(() => expect(tamamla.A).toBeDefined());
  fireEvent.click(screen.getByRole('button', { name: 'B firmasını aç' }));
  await waitFor(() => expect(tamamla.B).toBeDefined());
  await act(async () => { tamamla.B(cevap('B')); });
  expect(screen.getByRole('heading', { name: 'Test Firması B' })).toBeInTheDocument();
  await act(async () => { tamamla.A(cevap('A')); });
  expect(screen.getByRole('heading', { name: 'Test Firması B' })).toBeInTheDocument();
  expect(screen.queryByRole('heading', { name: 'Test Firması A' })).not.toBeInTheDocument();

  fireEvent.click(screen.getByRole('button', { name: 'Tam Ünvan düzenle' }));
  fireEvent.click(screen.getByRole('button', { name: 'Tam Ünvan kaydet' }));
  expect(await screen.findByText('Firma güncellenemedi.')).toBeInTheDocument();
  expect(api.put).toHaveBeenCalledWith('/firma/B', { tamUnvan: 'Test Firması B' });
});
