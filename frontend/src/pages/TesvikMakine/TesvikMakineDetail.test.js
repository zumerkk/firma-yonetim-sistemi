import React from 'react';
import { fireEvent, render, screen, within } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import EkipmanSatiri from '../../components/Tesvik/EkipmanSatiri';
import { useAuth } from '../../contexts/AuthContext';
import svc from '../../services/tesvikMakineService';
import TesvikMakineDetail from './TesvikMakineDetail';
import { formatMoney } from './helpers';

jest.mock('../../components/Layout/LayoutWrapper', () => ({ children }) => children);
jest.mock('../../components/Tesvik/MusteriLinkiDugmesi', () => () => null);
jest.mock('../../contexts/AuthContext', () => ({ useAuth: jest.fn() }));
jest.mock('../../services/tesvikMakineService', () => ({ getCertificate: jest.fn(), getMachines: jest.fn(), meta: jest.fn() }));
jest.mock('./MakineDetailModal', () => () => null);
jest.mock('./FaturaKalemleriDialog', () => ({ open, duzenlenebilir }) => open && (
  <div role="dialog">{duzenlenebilir ? 'Düzenleme açık' : 'Sadece okuma'}</div>
));
jest.mock('@mui/x-data-grid', () => ({ DataGrid: ({ rows, columns, onRowClick }) => (
  <table>
    <thead><tr>{columns.map((col) => <th key={col.field}>{col.headerName}</th>)}</tr></thead>
    <tbody>{rows.map((row) => (
      <tr key={row.rowId} onClick={() => onRowClick?.({ row })}>
        {columns.map((col) => {
          const value = col.valueGetter ? col.valueGetter({ row }) : row[col.field];
          return <td key={col.field}>{col.valueFormatter ? col.valueFormatter({ value }) : value}</td>;
        })}
      </tr>
    ))}</tbody>
  </table>
) }));

const yerli = { rowId: 'yerli', listType: 'local', machineName: 'Yerli makine', quantity: 2, unit: '142' };
const ithal = {
  rowId: 'ithal', listType: 'import', machineName: 'İthal makine', quantity: 3, unit: 151,
  totalPrice: 150, currency: 'EUR', invoiceRealizedValue: 1250, faturaTutarToplamlari: { EUR: 100, TRY: 1250 }
};
const ithalTutar = `${formatMoney(1250, 'TRY')} · ${formatMoney(100, 'EUR')}`;

beforeEach(() => {
  useAuth.mockReturnValue({ user: { rol: 'readonly' } });
  svc.getCertificate.mockResolvedValue({ identity: { firmaName: 'Deneme' }, totals: { localCount: 1, importCount: 1 } });
  svc.getMachines.mockResolvedValue({ rows: [yerli, ithal] });
  svc.meta.mockResolvedValue({});
});

function detayAc() {
  render(<MemoryRouter initialEntries={['/tesvikler/Tesvik/belge']} future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
    <Routes><Route path="/tesvikler/:tesvikModel/:tesvikId" element={<TesvikMakineDetail />} /></Routes>
  </MemoryRouter>);
}

test('makine talepleri, yerli ve ithal listeler miktar etiketini gösterir; ithal tutarlar kendi dövizinde görünür', async () => {
  detayAc();
  expect(await screen.findByText('2 ADET')).toBeInTheDocument();
  fireEvent.click(screen.getByRole('tab', { name: /^Yerli Liste/ }));
  expect(screen.getByText('2 ADET')).toBeInTheDocument();
  fireEvent.click(screen.getByRole('tab', { name: /^İthal Liste/ }));
  const satir = within(screen.getByRole('row', { name: /İthal makine/ }));
  expect(satir.getByText('3 KİLOGRAM')).toBeInTheDocument();
  expect(satir.getByText(formatMoney(150, 'USD'))).toBeInTheDocument();
  expect(satir.getByText(ithalTutar)).toBeInTheDocument();
  expect(screen.getByRole('columnheader', { name: 'Gümrük Mal Bedeli' })).toBeInTheDocument();
});

test.each([['readonly', 'Sadece okuma'], ['kullanici', 'Düzenleme açık'], ['admin', 'Düzenleme açık']])(
  '%s rolü fatura penceresine aktarılır', async (rol, etiket) => {
    useAuth.mockReturnValue({ user: { rol } });
    detayAc();
    fireEvent.click(await screen.findByRole('tab', { name: /^İthal Liste/ }));
    fireEvent.click(screen.getByText('İthal makine'));
    expect(screen.getByRole('dialog')).toHaveTextContent(etiket);
  }
);

test('makine listesinden çift tıklanan ithal satır miktarı ve ayrı döviz tutarlarını gösterir', async () => {
  render(<EkipmanSatiri tesvikModel="Tesvik" tesvikId="belge" rowId="ithal" listType="import" />);
  expect(await screen.findByText('3 KİLOGRAM')).toBeInTheDocument();
  expect(screen.getByText(formatMoney(150, 'USD'))).toBeInTheDocument();
  expect(screen.getByText(`Gümrük Mal Bedeli: ${ithalTutar}`)).toBeInTheDocument();
});

test('ekipman özeti alınamazsa makine listesindeki miktar ve birim açıklaması görünür', async () => {
  svc.getMachines.mockRejectedValueOnce(new Error('Ağ hatası'));
  const machine = { adi: 'Koli makinesi', miktar: 4, birim: '901', birimAciklamasi: 'KOLİ' };
  render(<EkipmanSatiri tesvikModel="Tesvik" tesvikId="belge" rowId="yerli" listType="local" machine={machine} />);
  expect(await screen.findByText('4 KOLİ')).toBeInTheDocument();
});
