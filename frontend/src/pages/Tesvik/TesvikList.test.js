import React from 'react';
import { fireEvent, render, screen, within } from '@testing-library/react';
import { MemoryRouter, Route, Routes, useNavigate, useParams } from 'react-router-dom';
import TesvikList from './TesvikList';
import api from '../../utils/axios';

jest.mock('../../utils/axios', () => ({ __esModule: true, default: { get: jest.fn() } }));
jest.mock('../../contexts/AuthContext', () => ({ useAuth: () => ({ user: { rol: 'admin', yetkiler: {} } }) }));
jest.mock('../../components/Layout/Header', () => () => null);
jest.mock('../../components/Layout/Sidebar', () => () => null);
jest.mock('../../components/common/UstKaydirmaCubugu', () => ({ children }) => <>{children}</>);

function BelgeDetayi() {
  const navigate = useNavigate();
  const { id } = useParams();
  return <>
    <h1>Belge {id}</h1>
    <button onClick={() => navigate(-1)}>Geri Git</button>
  </>;
}

test('Teşvik birleşik aramasından yeni belgeyi açıp dönünce Hüner görünümü korunur', async () => {
  api.get.mockImplementation(async (url, config) => {
    const arama = url === '/tesvik/birlesik-arama' && config?.params?.q === 'Hüner';
    const tesvikler = arama ? [
      { _id: 'eski', sistem: 'Eski', yatirimciUnvan: 'Hüner Eski Yatırım', durumBilgileri: { genelDurum: 'kapandi' } },
      { _id: 'yeni', sistem: 'Yeni', yatirimciUnvan: 'Hüner Yeni Yatırım', durumBilgileri: { genelDurum: 'kapandi' } }
    ] : [];
    return { data: { success: true, data: {
      tesvikler, pagination: { currentPage: 1, totalPages: 1, totalCount: tesvikler.length }
    } } };
  });

  render(<MemoryRouter initialEntries={['/tesvik/liste']} future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
    <Routes>
      <Route path="/tesvik/liste" element={<TesvikList />} />
      <Route path="/yeni-tesvik/:id" element={<BelgeDetayi />} />
    </Routes>
  </MemoryRouter>);
  const sec = (alan, deger) => {
    fireEvent.mouseDown(screen.getByRole('combobox', { name: alan }));
    fireEvent.click(screen.getByRole('option', { name: deger }));
  };

  fireEvent.change(screen.getByRole('textbox', { name: 'Arama' }), { target: { value: 'Hüner' } });
  sec('Sistem', 'Yeni');
  fireEvent.click(screen.getByRole('button', { name: 'Arşiv' }));
  sec('Durum', 'Kapandı');
  sec('Süre Durumu', 'Belge bitiş tarihi geçenler');
  fireEvent.click(screen.getByText('Belge Bitiş Tarihi'));
  const belge = await screen.findByText('Hüner Yeni Yatırım');
  screen.getByRole('main').scrollTop = 180;
  screen.getByRole('table').parentElement.scrollLeft = 75;
  fireEvent.click(within(belge.closest('tr')).getByRole('button', { name: 'Görüntüle' }));
  expect(await screen.findByRole('heading', { name: 'Belge yeni' })).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Geri Git' }));

  expect(await screen.findByText('Hüner Yeni Yatırım')).toBeInTheDocument();
  expect(screen.queryByText('Hüner Eski Yatırım')).not.toBeInTheDocument();
  expect(screen.getByRole('textbox', { name: 'Arama' })).toHaveValue('Hüner');
  expect(screen.getByRole('combobox', { name: 'Sistem' })).toHaveTextContent('Yeni');
  expect(screen.getByRole('button', { name: 'Arşiv', pressed: true })).toBeInTheDocument();
  expect(screen.getByRole('main').scrollTop).toBe(180);
  expect(screen.getByRole('table').parentElement.scrollLeft).toBe(75);
  expect(api.get).toHaveBeenLastCalledWith('/tesvik/birlesik-arama', expect.objectContaining({
    params: expect.objectContaining({ q: 'Hüner', durum: 'kapandi', arsiv: '1', sureDurumu: 'gecen',
      siraBy: 'belgeYonetimi.belgeBitisTarihi', siraSekli: 'asc' })
  }));
});
