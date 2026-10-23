import React from 'react';
import { fireEvent, render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import Header from './Header';
import UstMenu from './UstMenu';
import { aktifMenuOgesi, ustMenuOgeleri } from './menuOgeleri';
import { useAuth } from '../../contexts/AuthContext';

jest.mock('../../contexts/AuthContext', () => ({ useAuth: jest.fn() }));
jest.mock('../Notifications/NotificationDropdown', () => () => null);

// Üst menü yalnız ≥1024px'te CSS medya sorgusuyla görünür; jsdom medya sorgusu işlemediği için
// sorgular gizli öğeleri de kapsar (hidden: true).
const H = { hidden: true };
const ciz = (dugum, yol = '/dashboard') => render(<MemoryRouter initialEntries={[yol]}>{dugum}</MemoryRouter>);

beforeEach(() => {
  useAuth.mockReturnValue({ user: { adSoyad: 'Ayşe Uzman', rol: 'kullanici', yetkiler: {} }, logout: jest.fn() });
});

test('aktif öğe en uzun yol önekiyle bulunur; Ekipman Takip Teşvik Listesi sayılmaz', () => {
  const ad = (yol) => aktifMenuOgesi(yol)?.text;
  expect(ad('/')).toBe('Dashboard');
  expect(ad('/tesvikler')).toBe('Ekipman Takip');
  expect(ad('/tesvikler/belge/123')).toBe('Ekipman Takip');
  expect(ad('/tesvik/abc')).toBe('Teşvik Listesi');
  expect(ad('/yeni-tesvik/makine-yonetimi')).toBe('Makine Listesi');
  expect(ad('/dosya-takip/65f0')).toBe('Belge Takip');
  expect(ad('/firmalar/12/duzenle')).toBe('Yatırımcı Bilgileri');
  expect(ad('/profil')).toBeUndefined();
});

test('üst menü tüm ana ekranlara bağlantı verir ve bulunulan sayfayı işaretler', () => {
  ciz(<UstMenu />, '/dosya-takip/liste');
  const menu = screen.getByLabelText('Ana menü');
  const baglantilar = within(menu).getAllByRole('link', H);
  expect(baglantilar.map((a) => a.textContent)).toEqual(ustMenuOgeleri.map((o) => o.kisaAd || o.text));
  expect(within(menu).getByRole('link', { ...H, name: 'Belge Takip' })).toHaveAttribute('aria-current', 'page');
  expect(within(menu).getByRole('link', { ...H, name: 'Belge Takip' })).toHaveAttribute('href', '/dosya-takip/liste');
  expect(within(menu).getByRole('link', { ...H, name: 'Ekipman Takip' })).not.toHaveAttribute('aria-current');
});

test('yetki isteyen öğe yetkisiz kullanıcıya gösterilmez', () => {
  const gizli = { text: 'Gizli', path: '/gizli', permission: 'yonetimPaneli' };
  ustMenuOgeleri.push(gizli);
  try {
    const { unmount } = ciz(<UstMenu />);
    expect(screen.queryByRole('link', { ...H, name: 'Gizli' })).not.toBeInTheDocument();
    unmount();
    useAuth.mockReturnValue({ user: { rol: 'admin' }, logout: jest.fn() });
    ciz(<UstMenu />);
    expect(screen.getByRole('link', { ...H, name: 'Gizli' })).toBeInTheDocument();
  } finally {
    ustMenuOgeleri.pop();
  }
});

test('Header üst menüyü içerir; mobil menü düğmesi çekmeceyi açar', () => {
  const ac = jest.fn();
  ciz(<Header onSidebarToggle={ac} />);
  expect(screen.getByLabelText('Ana menü')).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Menüyü aç' }));
  expect(ac).toHaveBeenCalledTimes(1);
});
