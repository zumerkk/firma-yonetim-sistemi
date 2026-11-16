import React from 'react';
import { fireEvent, render, screen, within } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import EkipmanSatiri from '../../components/Tesvik/EkipmanSatiri';
import { useAuth } from '../../contexts/AuthContext';
import svc from '../../services/tesvikMakineService';
import api from '../../utils/axios';
import TesvikMakineDetail from './TesvikMakineDetail';
import { formatMoney } from './helpers';

jest.mock('../../components/Layout/LayoutWrapper', () => ({ children }) => children);
jest.mock('../../components/Tesvik/MusteriLinkiDugmesi', () => () => null);
jest.mock('../../contexts/AuthContext', () => ({ useAuth: jest.fn() }));
jest.mock('../../services/tesvikMakineService', () => ({ getCertificate: jest.fn(), getMachines: jest.fn(), meta: jest.fn() }));
jest.mock('../../utils/axios', () => ({ __esModule: true, default: { get: jest.fn() } }));
jest.mock('./MakineDetailModal', () => () => null);
jest.mock('./Harcamalar', () => ({ kategori, duzenlenebilir }) => <div>{`${kategori}-${duzenlenebilir}`}</div>);
jest.mock('./GerceklesmeOzeti', () => ({ tesvikModel, tesvikId }) => <div>{`${tesvikModel}-${tesvikId}-gerçekleşme`}</div>);
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
const belge = { success: true, data: { makineListeleri: {
  yerli: [{ rowId: 'onayli-yerli', siraNo: 1, makineId: 'Y-1', adiVeOzelligi: 'Belgedeki yerli makine', miktar: 2,
    birim: '142', birimFiyatiTl: 1000, toplamTutariTl: 2000 }],
  ithal: [{ rowId: 'onayli-ithal', siraNo: 1, makineId: 'İ-1', adiVeOzelligi: 'Belgedeki ithal makine', miktar: 3,
    birim: '151', gtipKodu: '8477', birimFiyatiFob: 2500, gumrukDovizKodu: 'EUR', toplamTutarFobUsd: 8250, kullanilmisMakine: '3' }]
} } };

beforeEach(() => {
  useAuth.mockReturnValue({ user: { rol: 'readonly' } });
  svc.getCertificate.mockResolvedValue({ identity: { firmaName: 'Deneme' }, totals: { localCount: 1, importCount: 1 } });
  svc.getMachines.mockResolvedValue({ rows: [yerli, ithal] });
  svc.meta.mockResolvedValue({});
  api.get.mockReset().mockResolvedValue({ data: belge });
});

function detayAc(model = 'Tesvik') {
  render(<MemoryRouter initialEntries={[`/tesvikler/${model}/belge`]} future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
    <Routes><Route path="/tesvikler/:tesvikModel/:tesvikId" element={<TesvikMakineDetail />} /></Routes>
  </MemoryRouter>);
}

test('belge bilgilerini gerçekleşen listeler, diğer harcamalar ve özet izler', async () => {
  useAuth.mockReturnValue({ user: { rol: 'kullanici' } });
  detayAc();
  const sekmeler = await screen.findAllByRole('tab');
  expect(sekmeler.map((tab) => tab.textContent)).toEqual([
    'Belge Künyesi', 'Onaylı Yerli Liste (1)', 'Onaylı İthal Liste (1)',
    'Gerçekleşen Yerli Liste', 'Gerçekleşen İthal Liste',
    'Diğer Harcamalar', 'Bina İnşaat Harcamaları', 'Arazi-Arsa Harcamaları', 'Gerçekleşme Özeti',
    'Makine Talepleri', 'Evraklar', 'Mail Geçmişi', 'Hatırlatmalar', 'Notlar / Geçmiş'
  ]);
  expect(screen.getByRole('tab', { name: 'Makine Talepleri' })).toHaveAttribute('aria-selected', 'true');
  for (const [sekme, kategori] of [['Diğer Harcamalar', 'diger'], ['Bina İnşaat Harcamaları', 'bina'], ['Arazi-Arsa Harcamaları', 'arazi']]) {
    fireEvent.click(screen.getByRole('tab', { name: sekme }));
    expect(screen.getByText(`${kategori}-true`)).toBeInTheDocument();
  }
  fireEvent.click(screen.getByRole('tab', { name: 'Gerçekleşme Özeti' }));
  expect(screen.getByText('Tesvik-belge-gerçekleşme')).toBeInTheDocument();
  expect(api.get).not.toHaveBeenCalled();
});

test.each([['Tesvik', '/tesvik/belge'], ['YeniTesvik', '/yeni-tesvik/belge']])(
  '%s onaylı listeler belge tablosunu ve gerçek onaylı değerleri salt okunur gösterir', async (model, yol) => {
    useAuth.mockReturnValue({ user: { rol: 'admin' } });
    detayAc(model);
    const yerliSekme = await screen.findByRole('tab', { name: /^Onaylı Yerli Liste/ });
    expect(api.get).not.toHaveBeenCalled();
    fireEvent.click(yerliSekme);
    const yerliSatir = await screen.findByRole('row', { name: /Belgedeki yerli makine/ });
    expect(within(yerliSatir).getByText('ADET')).toBeInTheDocument();
    expect(within(yerliSatir).getByText('2.000 TL')).toBeInTheDocument();
    const yerliListe = within(screen.getByRole('region', { name: 'Onaylı Yerli Liste' }));
    expect(yerliListe.getByRole('columnheader', { name: 'Adı ve Özelliği' })).toBeInTheDocument();
    expect(yerliListe.queryByRole('columnheader', { name: /Fatura|Beyanname/ })).not.toBeInTheDocument();
    fireEvent.click(yerliSatir);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('tab', { name: /^Onaylı İthal Liste/ }));
    const ithalSatir = within(screen.getByRole('row', { name: /Belgedeki ithal makine/ }));
    expect(ithalSatir.getByText('8477')).toBeInTheDocument();
    expect(ithalSatir.getByText('KİLOGRAM')).toBeInTheDocument();
    expect(ithalSatir.getByText('2.500 EUR')).toBeInTheDocument();
    expect(ithalSatir.getByText('8.250 USD')).toBeInTheDocument();
    expect(ithalSatir.getByText('KULLANILMIŞ MÜNFERİT')).toBeInTheDocument();
    expect(api.get).toHaveBeenCalledTimes(1);
    expect(api.get).toHaveBeenCalledWith(yol, expect.objectContaining({ signal: expect.any(AbortSignal) }));
  }
);

test('onaylı liste hatada boş liste göstermeden yeniden denenebilir', async () => {
  api.get.mockRejectedValueOnce(new Error('Ağ hatası'));
  detayAc();
  fireEvent.click(await screen.findByRole('tab', { name: /^Onaylı Yerli Liste/ }));
  expect(await screen.findByRole('alert')).toHaveTextContent('Onaylı makine listesi yüklenemedi.');
  expect(screen.queryByText('Bu belgede yerli makine yok.')).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Tekrar Dene' }));
  expect(await screen.findByText('Belgedeki yerli makine')).toBeInTheDocument();
});

test('makine talepleri ve gerçekleşen listeler miktar etiketini, ithal tutarlar kendi dövizini gösterir', async () => {
  detayAc();
  expect(await screen.findByText('2 ADET')).toBeInTheDocument();
  fireEvent.click(screen.getByRole('tab', { name: 'Gerçekleşen Yerli Liste' }));
  expect(screen.getByText('2 ADET')).toBeInTheDocument();
  fireEvent.click(screen.getByRole('tab', { name: 'Gerçekleşen İthal Liste' }));
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
    fireEvent.click(await screen.findByRole('tab', { name: 'Gerçekleşen İthal Liste' }));
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
