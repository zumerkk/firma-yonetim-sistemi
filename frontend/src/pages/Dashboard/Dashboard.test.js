import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, useLocation } from 'react-router-dom';
import api from '../../utils/axios';
import Dashboard from './Dashboard';

jest.mock('../../components/Layout/Header', () => () => null);
jest.mock('../../components/Layout/Sidebar', () => () => null);
jest.mock('../../components/Dashboard/SmartUpload', () => () => null);
jest.mock('../../contexts/AuthContext', () => ({ useAuth: () => ({ user: { rol: 'standard' } }) }));
jest.mock('../../utils/axios', () => ({ __esModule: true, default: { get: jest.fn() } }));

const basarili = (data) => ({ data: { success: true, data } });
const ozet = {
  toplamFirma: 28, aktifFirma: 22, yaklasanYetki: 14, suresiGecmisFirmaSayisi: 4,
  sonEklenenler: [{ _id: 'firma-1', firmaId: 'A1', tamUnvan: 'Örnek Firma', firmaIl: 'ANKARA' }],
  yetkiUyarilari: [{ yetkiTuru: 'dys', yetkiDurumu: 'expired', sayi: 4, firmalar: [] }]
};

function Konum() {
  const { pathname, search } = useLocation();
  return <output data-testid="konum">{pathname}{search}</output>;
}

test('firma özetini liste filtrelerinden bağımsız alır, yetki uyarısını ilgili listeye açar ve kişisel işleri yeniler', async () => {
  let kisiselIstek = 0;
  api.get.mockImplementation(async (url) => {
    if (url === '/firma/dashboard') return basarili(ozet);
    if (url === '/dosya-takip/son-islemler') return basarili([]);
    if (url === '/dosya-takip/benim') {
      kisiselIstek += 1;
      if (kisiselIstek === 1) throw new Error('Bağlantı koptu');
      return basarili({ takibimde: [{ _id: 'talep-1', firmaUnvan: 'Güncel talep firması' }], actiklarim: [], sonYuklemeler: [] });
    }
    throw new Error(`Beklenmeyen istek ${url}`);
  });
  render(<MemoryRouter initialEntries={['/dashboard']} future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
    <Konum /><Dashboard />
  </MemoryRouter>);
  expect(await screen.findByRole('button', { name: /Yetki Süresi Yaklaşan: 14/ })).toBeInTheDocument();
  expect(screen.getByText('Örnek Firma')).toBeInTheDocument();
  expect(await screen.findByText('Kişisel iş özeti yüklenemedi.')).toBeInTheDocument();
  expect(screen.queryByText('Üzerinize atanmış açık talep yok.')).not.toBeInTheDocument();

  fireEvent.click(screen.getByRole('button', { name: 'Yenile' }));
  expect(await screen.findByText('Güncel talep firması')).toBeInTheDocument();
  await waitFor(() => expect(api.get.mock.calls.filter(([url]) => url === '/firma/dashboard')).toHaveLength(2));
  fireEvent.click(screen.getByRole('button', { name: /DYS Yetki Süresi Geçmiş: 4/ }));
  expect(screen.getByTestId('konum')).toHaveTextContent('/firmalar?aktif=true&yetkiDurumu=expired&yetkiTuru=dys');
});
