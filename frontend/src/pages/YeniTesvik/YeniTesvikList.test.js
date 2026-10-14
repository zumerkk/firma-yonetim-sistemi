import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import YeniTesvikList from './YeniTesvikList';
import api from '../../utils/axios';

jest.mock('../../utils/axios', () => ({ __esModule: true, default: { get: jest.fn() } }));
jest.mock('../../contexts/AuthContext', () => ({ useAuth: () => ({ user: { rol: 'admin', yetkiler: {} } }) }));
jest.mock('../../components/Layout/Header', () => () => null);
jest.mock('../../components/Layout/Sidebar', () => () => null);

test('yeni belge listesi varsayılan uzatım sırası ve başlıkla iki yönlü bitiş sırasını sunucuya iletir', async () => {
  api.get.mockResolvedValue({ data: { success: true, data: {
    tesvikler: [], pagination: { currentPage: 1, totalPages: 1, totalCount: 0 }
  } } });
  render(<MemoryRouter><YeniTesvikList /></MemoryRouter>);
  await waitFor(() => expect(api.get).toHaveBeenCalled());
  const params = () => new URLSearchParams(api.get.mock.calls.at(-1)[0].split('?')[1]);
  expect(params().get('siraBy')).toBe('belgeYonetimi.uzatimTarihi');
  expect(params().get('siraSekli')).toBe('asc');

  fireEvent.click(screen.getByText('Belge Bitiş Tarihi'));
  await waitFor(() => expect(params().get('siraBy')).toBe('belgeYonetimi.belgeBitisTarihi'));
  expect(params().get('siraSekli')).toBe('asc');
  fireEvent.click(screen.getByText('Belge Bitiş Tarihi'));
  await waitFor(() => expect(params().get('siraSekli')).toBe('desc'));
});
