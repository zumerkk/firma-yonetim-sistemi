import React from 'react';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes, useLocation, useNavigate } from 'react-router-dom';
import DosyaTakipDetail from './DosyaTakipDetail';
import api from '../../utils/axios';

const mockTalep = {
  _id: 'talep1', takipId: 'DT2026001', firmaUnvan: 'Önizleme Test Firması',
  talepTuru: 'Belge Başvuru Talebi', durum: '2.1.1_GORUSULUYOR', anaAsama: 'MURACAAT_ONCESI',
  genelNotlar: [], durumGecmisi: [], dosyalar: [{
    _id: 'dosya1', dosyaAdi: 'Gelen Belge.png', dosyaTipi: 'image/png',
    dosyaYolu: '/uploads/gelen.png', aciklama: 'Firmadan gelen belge'
  }]
};
const mockFetch = jest.fn();
const mockContext = { seciliTalep: mockTalep, fetchTalep: mockFetch, loading: false };

jest.mock('../../contexts/DosyaTakipContext', () => ({ useDosyaTakip: () => mockContext }));
jest.mock('../../components/Layout/LayoutWrapper', () => ({ children }) => children);
jest.mock('../../components/Cari/TalepCariPaneli', () => () => null);
jest.mock('../../components/IslemEvrak/BelgeTakipEvrakTalepleri', () => () => null);
jest.mock('../../utils/axios', () => ({ __esModule: true, default: { get: jest.fn(), post: jest.fn() } }));

test('Belge Takip dosya Aç işlemi yerel dosyayı da yetkili API ile önizler', async () => {
  jest.spyOn(console, 'error').mockImplementation(() => {});
  jest.spyOn(console, 'warn').mockImplementation(() => {});
  const ac = jest.spyOn(window, 'open').mockImplementation(() => {});
  const indir = jest.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
  const eskiOlustur = URL.createObjectURL;
  const eskiBirak = URL.revokeObjectURL;
  URL.createObjectURL = jest.fn(() => 'blob:belge-takip');
  URL.revokeObjectURL = jest.fn();
  api.get.mockImplementation(async (url) => {
    if (url.includes('/dosya-getir/')) return { data: new Blob(['png'], { type: 'image/png' }) };
    return { data: { success: true, data: url.endsWith('/oneriler') ? { daireler: [], uzmanlar: [] } : [] } };
  });
  try {
    const { unmount } = render(
      <MemoryRouter initialEntries={['/dosya-takip/talep1?sekme=dosyalar']}>
        <Routes><Route path="/dosya-takip/:id" element={<DosyaTakipDetail />} /></Routes>
      </MemoryRouter>
    );
    fireEvent.click(await screen.findByRole('button', { name: 'Gelen Belge.png önizle' }));
    expect(await screen.findByRole('img', { name: 'Gelen Belge.png' })).toBeInTheDocument();
    expect(api.get).toHaveBeenCalledWith('/dosya-takip/talep1/dosya-getir/dosya1', expect.objectContaining({
      params: { alan: 'dosyalar', dl: 0 }, responseType: 'blob', signal: expect.any(AbortSignal)
    }));
    expect(ac).not.toHaveBeenCalled();
    expect(indir).not.toHaveBeenCalled();
    unmount();
  } finally {
    jest.restoreAllMocks();
    URL.createObjectURL = eskiOlustur; URL.revokeObjectURL = eskiBirak;
  }
});

test.each([
  [{ geriDon: { yol: '/cari-takip?firma=firma1', state: { cariListe: { filtre: 'FİRMA' } }, etiket: 'Cari Takip' } }, '/cari-takip?firma=firma1'],
  [{ listeQuery: '?arsiv=1&arama=TEST' }, '/dosya-takip/liste?arsiv=1&arama=TEST']
])('Ödemeler derin bağlantısı açılır ve Geri başlangıç konumunu korur (%j)', async (state, beklenen) => {
  api.get.mockResolvedValue({ data: { success: true, data: [] } });
  function Donus() {
    const konum = useLocation();
    return <output data-testid="donus-konumu">{konum.pathname}{konum.search}{JSON.stringify(konum.state)}</output>;
  }
  render(<MemoryRouter initialEntries={[{ pathname: '/dosya-takip/talep1', search: '?sekme=odemeler', state }]}>
    <Routes>
      <Route path="/dosya-takip/:id" element={<DosyaTakipDetail />} />
      <Route path="/cari-takip" element={<Donus />} />
      <Route path="/dosya-takip/liste" element={<Donus />} />
    </Routes>
  </MemoryRouter>);
  expect(screen.getByRole('tab', { name: 'Ödemeler' })).toHaveAttribute('aria-selected', 'true');
  fireEvent.click(screen.getByRole('button', { name: state.geriDon ? 'Cari Takip ekranına dön' : 'Talep listesine dön' }));
  expect(await screen.findByTestId('donus-konumu')).toHaveTextContent(beklenen);
  if (state.geriDon) expect(screen.getByTestId('donus-konumu')).toHaveTextContent('"filtre":"FİRMA"');
});

test('firma maili başka talebe taşınmaz ve geç gelen taslak yeni talebi açmaz', async () => {
  let eskiSablonuBitir;
  const eskiSablon = new Promise((resolve) => { eskiSablonuBitir = resolve; });
  const aTaslak = { alici: 'a@example.invalid', konu: 'A firması', govde: 'A metni', smtpHazir: true };
  api.get.mockImplementation(async (url, opts) => {
    if (url.endsWith('/firma-mail-taslak')) {
      if (opts.params.sablon === 'standart') return eskiSablon;
      return { data: { data: { ...aTaslak, sablonId: 'diger', sablonlar: [{ _id: 'diger', ad: 'Diğer' }] } } };
    }
    return { data: { data: [] } };
  });
  function DigerTalep() {
    const navigate = useNavigate();
    return <button onClick={() => {
      mockContext.seciliTalep = { ...mockTalep, _id: 'talep2', firmaUnvan: 'Diğer Firma' };
      navigate('/dosya-takip/talep2?sekme=mail');
    }}>Diğer talebe geç</button>;
  }
  localStorage.removeItem('belgeTakip.firmaMailSablonu');
  try {
    render(<MemoryRouter initialEntries={['/dosya-takip/talep1?sekme=mail']}>
      <DigerTalep />
      <Routes><Route path="/dosya-takip/:id" element={<DosyaTakipDetail />} /></Routes>
    </MemoryRouter>);
    fireEvent.click(screen.getByRole('button', { name: 'Mail Taslağı Hazırla' }));
    expect(await screen.findByDisplayValue('a@example.invalid')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Gönder', exact: true })).toBeEnabled();
    fireEvent.mouseDown(screen.getByRole('combobox', { name: 'Mail şablonu' }));
    fireEvent.click(await screen.findByRole('option', { name: 'Belge Takip standart metni' }));
    expect(screen.getByRole('button', { name: 'Gönder', exact: true })).toBeDisabled();
    fireEvent.click(screen.getByRole('button', { name: 'Diğer talebe geç' }));
    await act(async () => eskiSablonuBitir({ data: { data: { ...aTaslak, sablonId: 'standart' } } }));
    expect(screen.getByRole('button', { name: 'Mail Taslağı Hazırla' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Gönder', exact: true })).not.toBeInTheDocument();
    expect(screen.queryByDisplayValue('a@example.invalid')).not.toBeInTheDocument();
    expect(api.post).not.toHaveBeenCalled();
  } finally {
    mockContext.seciliTalep = mockTalep;
  }
});
