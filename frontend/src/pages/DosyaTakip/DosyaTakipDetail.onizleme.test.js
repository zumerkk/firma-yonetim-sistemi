import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
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
jest.mock('../../utils/axios', () => ({ __esModule: true, default: { get: jest.fn() } }));

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
