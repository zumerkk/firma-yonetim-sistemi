import React from 'react';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter, Route, Routes, useNavigate } from 'react-router-dom';
import YeniTesvikList from './YeniTesvikList';
import api from '../../utils/axios';

jest.mock('../../utils/axios', () => ({ __esModule: true, default: { get: jest.fn(), delete: jest.fn() } }));
jest.mock('../../contexts/AuthContext', () => ({ useAuth: () => ({ user: { rol: 'admin', yetkiler: {} } }) }));
jest.mock('../../components/Layout/Header', () => () => null);
jest.mock('../../components/Layout/Sidebar', () => () => null);

function BelgeDetayi() {
  const navigate = useNavigate();
  return <button onClick={() => navigate(-1)}>Geri Git</button>;
}

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

test('kapama aşamaları açık belge listesinde sıralı görünür ve filtreye iletilir', async () => {
  api.get.mockClear();
  api.get.mockResolvedValue({ data: { success: true, data: {
    tesvikler: [], pagination: { currentPage: 1, totalPages: 1, totalCount: 0 }
  } } });
  render(<MemoryRouter><YeniTesvikList /></MemoryRouter>);
  await waitFor(() => expect(api.get).toHaveBeenCalled());
  const params = () => new URLSearchParams(api.get.mock.calls.at(-1)[0].split('?')[1]);
  const menuAc = () => fireEvent.mouseDown(screen.getByRole('combobox', { name: 'Durum' }));

  menuAc();
  const kapamaSecenekleri = screen.getAllByRole('option').map((o) => o.textContent).filter((ad) => /^Kapa/.test(ad));
  expect(kapamaSecenekleri).toEqual(['Kapatma İrtibat', 'Kapama Çalışma', 'Kapama Talepli', 'Kapandı']);
  fireEvent.click(screen.getByRole('option', { name: 'Kapatma İrtibat' }));
  await waitFor(() => expect(params().get('durum')).toBe('kapatma_irtibat'));
  expect(params().get('arsiv')).toBe('0');

  menuAc();
  fireEvent.click(screen.getByRole('option', { name: 'Kapama Çalışma' }));
  await waitFor(() => expect(params().get('durum')).toBe('kapama_calisma'));
  expect(params().get('arsiv')).toBe('0');
});

test('Yeni Teşvik belgesinden dönünce Hüner araması, arşiv, filtreler, sıralama ve sayfa korunur', async () => {
  api.get.mockClear();
  api.get.mockImplementation(async (url) => {
    const params = new URL(url, 'http://localhost').searchParams;
    const sayfa = Number(params.get('sayfa')) || 1;
    const eslesti = params.get('search') === 'Hüner';
    return { data: { success: true, data: {
      tesvikler: eslesti ? [{ _id: `belge-${sayfa}`, yatirimciUnvan: `Hüner Yatırım (${sayfa})`,
        durumBilgileri: { genelDurum: 'kapandi' } }] : [],
      pagination: { currentPage: sayfa, totalPages: eslesti ? 3 : 1, totalCount: eslesti ? 41 : 0 }
    } } };
  });

  render(<MemoryRouter initialEntries={['/yeni-tesvik/liste']} future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
    <Routes>
      <Route path="/yeni-tesvik/liste" element={<YeniTesvikList />} />
      <Route path="/yeni-tesvik/:id" element={<BelgeDetayi />} />
    </Routes>
  </MemoryRouter>);

  fireEvent.click(screen.getByRole('button', { name: 'Arşiv' }));
  fireEvent.mouseDown(screen.getByRole('combobox', { name: 'Durum' }));
  fireEvent.click(screen.getByRole('option', { name: 'Kapandı' }));
  fireEvent.change(screen.getByLabelText('İl'), { target: { value: 'ANKARA' } });
  fireEvent.change(screen.getByRole('textbox', { name: 'Arama' }), { target: { value: 'Hüner' } });
  fireEvent.click(screen.getByText('Belge Bitiş Tarihi'));
  fireEvent.click(await screen.findByRole('button', { name: /go to page 2/i }));
  fireEvent.click(await screen.findByText('Hüner Yatırım (2)'));
  fireEvent.click(await screen.findByRole('button', { name: 'Geri Git' }));

  expect(await screen.findByText('Hüner Yatırım (2)')).toBeInTheDocument();
  expect(screen.getByRole('textbox', { name: 'Arama' })).toHaveValue('Hüner');
  expect(screen.getByRole('textbox', { name: 'İl' })).toHaveValue('ANKARA');
  expect(screen.getByRole('button', { name: 'Arşiv', pressed: true })).toBeInTheDocument();
  expect(screen.getByRole('combobox', { name: 'Durum' })).toHaveTextContent('Kapandı');
  const params = new URL(api.get.mock.calls.at(-1)[0], 'http://localhost').searchParams;
  expect(Object.fromEntries(params)).toMatchObject({
    search: 'Hüner', il: 'ANKARA', durum: 'kapandi', arsiv: '1', sayfa: '2',
    siraBy: 'belgeYonetimi.belgeBitisTarihi', siraSekli: 'asc'
  });
});

test('son sayfadaki tek belge silinince önceki dolu sayfa ve toplam yüklenir', async () => {
  let silindi = false;
  api.get.mockImplementation(async (url) => {
    const params = new URL(url, 'http://localhost').searchParams;
    const sayfa = Number(params.get('sayfa'));
    const tesvikler = sayfa === 1
      ? [{ _id: 'ilk-belge', yatirimciUnvan: 'İlk sayfadaki belge' }]
      : (silindi ? [] : [{ _id: 'son-belge', yatirimciUnvan: 'Son sayfadaki belge' }]);
    return { data: { success: true, data: {
      tesvikler, pagination: { currentPage: sayfa, totalPages: silindi ? 1 : 2, totalCount: silindi ? 20 : 21 }
    } } };
  });
  api.delete.mockImplementation(async () => {
    silindi = true;
    return { data: { success: true } };
  });
  render(<MemoryRouter><YeniTesvikList /></MemoryRouter>);
  fireEvent.click(await screen.findByRole('button', { name: /go to page 2/i }));
  const satir = await screen.findByText('Son sayfadaki belge');
  fireEvent.click(within(satir.closest('tr')).getByRole('button', { name: 'Sil' }));
  fireEvent.click(within(await screen.findByRole('dialog')).getByRole('button', { name: 'Sil' }));

  expect(await screen.findByText('İlk sayfadaki belge')).toBeInTheDocument();
  expect(screen.getByText(/Toplam 20 yeni kayıt/)).toBeInTheDocument();
  expect(api.delete).toHaveBeenCalledWith('/yeni-tesvik/son-belge');
  expect(new URL(api.get.mock.calls.at(-1)[0], 'http://localhost').searchParams.get('sayfa')).toBe('1');
});
