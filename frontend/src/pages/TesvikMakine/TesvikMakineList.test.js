import React from 'react';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter, useLocation } from 'react-router-dom';
import svc from '../../services/tesvikMakineService';
import TesvikMakineList from './TesvikMakineList';

jest.mock('../../components/Layout/LayoutWrapper', () => ({ children }) => children);
jest.mock('../../services/tesvikMakineService', () => ({ dashboard: jest.fn(), listCertificates: jest.fn() }));
jest.mock('@mui/x-data-grid', () => ({
  DataGrid: ({ rows }) => rows.map((row) => <div key={row.id}>{row.firmaAdi}</div>)
}));

const sonuc = (firmaAdi) => ({
  data: [{ firmaAdi, tesvikId: firmaAdi, tesvikModel: 'Tesvik' }], pagination: { total: 1 }
});
const konum = () => new URLSearchParams(screen.getByTestId('konum').textContent);
function Konum() { return <output data-testid="konum">{useLocation().search}</output>; }
function ac() {
  render(<MemoryRouter initialEntries={['/tesvikler?model=Tesvik']} future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
    <Konum /><TesvikMakineList />
  </MemoryRouter>);
}
const ara = () => fireEvent.change(screen.getByRole('textbox', { name: /Firma.*Belge No/ }), { target: { value: 'Hüner' } });

beforeEach(() => { jest.useFakeTimers(); svc.dashboard.mockResolvedValue({}); });
afterEach(() => { jest.useRealTimers(); });

test('arama beklerken sonradan seçilen belge durumu korunur', async () => {
  svc.listCertificates.mockResolvedValue(sonuc('ÖRNEK'));
  ac();
  ara();
  fireEvent.mouseDown(screen.getByRole('combobox', { name: 'Belge Durumu' }));
  fireEvent.click(screen.getByRole('option', { name: 'Sadece: Kapandı' }));
  await act(async () => { jest.advanceTimersByTime(310); });
  expect(konum().get('q')).toBe('Hüner');
  expect(konum().get('durum')).toBe('kapandi');
  expect(svc.listCertificates).toHaveBeenLastCalledWith(expect.objectContaining({ q: 'Hüner', belgeDurum: 'kapandi' }));
});

test('geç gelen ilk yanıt son aramanın sonuçlarını değiştirmez', async () => {
  let eskiDon;
  let yeniDon;
  svc.listCertificates.mockImplementation(({ q }) => new Promise((resolve) => {
    if (q) yeniDon = resolve;
    else eskiDon = resolve;
  }));
  ac();
  ara();
  await act(async () => { jest.advanceTimersByTime(310); });
  await act(async () => { yeniDon(sonuc('YENİ ARAMA SONUCU')); });
  await act(async () => { eskiDon(sonuc('ESKİ ARAMA SONUCU')); });
  expect(konum().get('q')).toBe('Hüner');
  expect(screen.getByText('YENİ ARAMA SONUCU')).toBeInTheDocument();
  expect(screen.queryByText('ESKİ ARAMA SONUCU')).not.toBeInTheDocument();
});
