import React, { act } from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import ExcelJS from 'exceljs';
import EskiMakine from './MakineYonetimi';
import YeniMakine from '../YeniTesvik/MakineYonetimi';
import api from '../../utils/axios';
import eskiService from '../../services/tesvikService';
import yeniService from '../../services/yeniTesvikService';

jest.mock('../../utils/axios', () => ({ __esModule: true, default: { get: jest.fn(), post: jest.fn() }, uploadPost: jest.fn() }));
jest.mock('../../services/tesvikService', () => ({ __esModule: true, default: {
  get: jest.fn(), listMakineRevizyonlari: jest.fn(), startMakineRevizyon: jest.fn(),
  cancelMakineRevizyon: jest.fn(), saveMakineListeleri: jest.fn(), finalizeMakineRevizyon: jest.fn()
} }));
jest.mock('../../services/yeniTesvikService', () => ({ __esModule: true, default: {
  get: jest.fn(), listMakineRevizyonlari: jest.fn(), startMakineRevizyon: jest.fn(),
  cancelMakineRevizyon: jest.fn(), saveMakineListeleri: jest.fn(), finalizeMakineRevizyon: jest.fn()
} }));
jest.mock('../../services/currencyService', () => ({ __esModule: true, default: { getRate: jest.fn().mockResolvedValue(40) } }));
jest.mock('../../components/Files/FileUpload', () => () => null);
jest.mock('../TesvikMakine/MakineDetailModal', () => () => null);
jest.mock('../../components/Tesvik/EkipmanSatiri', () => () => null);
jest.mock('../../components/common/UstKaydirmaCubugu', () => ({ children }) => <div>{children}</div>);
// Sayfa state'i, servis çağrıları ve gerçek Excel kitabı test edilir;
// tablo kütüphanesinin tarayıcı ölçüm/virtualization ayrıntıları kapsam dışıdır.
jest.mock('@mui/x-data-grid', () => ({ DataGrid: ({ rows, onRowSelectionModelChange }) => <div>
  <button onClick={() => onRowSelectionModelChange(rows.map(r => r.id))}>Test satırlarını seç</button>
  {rows.map(r => <span key={r.id}>{r.adi} TL:{r.toplamTl}</span>)}
</div> }));

const belge = {
  _id: 'belge-1', tesvikId: '568289', gmId: 'GM-1', yatirimciUnvan: 'TEST FİRMASI',
  firma: { tamUnvan: 'TEST FİRMASI' }, makineListeleri: { yerli: [], ithal: [
    { rowId: 'eur-1', siraNo: 1, adiVeOzelligi: 'EUR MAKİNE', miktar: 1, birim: '142',
      birimFiyatiFob: 165000, gumrukDovizKodu: 'EUR', toplamTutarFobUsd: 179000, toplamTutarFobTl: 5768630.85 },
    { rowId: 'usd-2', siraNo: 2, adiVeOzelligi: 'MANUEL USD MAKİNE', miktar: 2, birim: '142',
      birimFiyatiFob: 10, gumrukDovizKodu: 'USD', toplamTutarFobUsd: 35.75,
      usdManuel: true, toplamTutarFobTl: 1400 }
  ] }
};
jest.setTimeout(30000);
let workbook;
beforeEach(() => {
  jest.clearAllMocks();
  localStorage.clear();
  window.confirm = jest.fn(() => true);
  window.URL.createObjectURL = jest.fn(() => 'blob:test');
  window.URL.revokeObjectURL = jest.fn();
  jest.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
  jest.spyOn(ExcelJS.Workbook.prototype, 'xlsx', 'get').mockImplementation(function () {
    workbook = this;
    return { writeBuffer: async () => new ArrayBuffer(0) };
  });
  api.get.mockImplementation(async url => url === '/tesvik' || url === '/yeni-tesvik'
    ? { data: { data: { tesvikler: [belge] } } } : { data: { data: [] } });
  for (const service of [eskiService, yeniService]) {
    service.get.mockResolvedValue(belge);
    service.listMakineRevizyonlari.mockResolvedValue([]);
    service.startMakineRevizyon.mockResolvedValue({ success: true, data: { revizeId: 'baslangic-1' } });
    service.cancelMakineRevizyon.mockResolvedValue({ success: true, makineListeleri: belge.makineListeleri });
    service.saveMakineListeleri.mockResolvedValue({ success: true });
  }
});
afterEach(() => jest.restoreAllMocks());

async function ac(Component, bos = false) {
  await act(async () => {
    render(<MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }} initialEntries={[{ pathname: '/makine', state: { autoSelectBelgeId: 'belge-1' } }]}><Component /></MemoryRouter>);
  });
  await waitFor(() => expect(screen.getByText('Revize').closest('button')).toBeEnabled(), { timeout: 5000 });
  fireEvent.click(screen.getByText(/^İthal \(/).closest('button'));
  if (!bos) await screen.findByText(/EUR MAKİNE TL:/);
}

describe.each([
  ['eski', EskiMakine, eskiService], ['yeni', YeniMakine, yeniService]
])('%s makine ekranı', (_ad, Component, service) => {
  test('Excel gerçek USD tutarını ve elle girilmiş FOB$ değerini aynen içerir', async () => {
    await ac(Component);
    fireEvent.click(screen.getByLabelText('Dışa Aktar'));
    await waitFor(() => expect(window.URL.createObjectURL).toHaveBeenCalled());
    const sheet = workbook.worksheets.find(ws => ws.name.toLocaleLowerCase('tr').includes('ithal'));
    expect(sheet.getRow(2).getCell('toplamUsd').value).toBe(179000);
    expect(sheet.getRow(3).getCell('toplamUsd').value).toBe(35.75);
  });

  test('İptal başlangıç kimliğini geri yollar; hata olursa revize açık kalır ve tekrar denenebilir', async () => {
    await ac(Component);
    fireEvent.click(screen.getByText('Revize').closest('button'));
    await screen.findByText('Bitir');
    service.cancelMakineRevizyon.mockRejectedValueOnce(new Error('Ağ hatası'));
    fireEvent.click(screen.getByText('İptal').closest('button'));
    await screen.findByText(/Revizyon iptal edilemedi/);
    expect(screen.getByText('Bitir').closest('button')).toBeInTheDocument();
    fireEvent.click(screen.getByText('İptal').closest('button'));
    await screen.findByText('Revize');
    expect(service.cancelMakineRevizyon).toHaveBeenNthCalledWith(2, 'belge-1', 'baslangic-1');
  });

  test.each([false, true])('iptal beklerken Ctrl+S yazmaz; boş başlangıç eski önbellekten geri gelmez (boş=%s)', async bos => {
    if (bos) service.get.mockResolvedValue({ ...belge, makineListeleri: { yerli: [], ithal: [] } });
    await ac(Component, bos);
    fireEvent.click(screen.getByText('Revize').closest('button'));
    await screen.findByText('Bitir');
    fireEvent.click(screen.getByLabelText('Satır Ekle'));
    // Gecikmeli önbellekte revize sırasında eklenen satır bulunabilir.
    localStorage.setItem('mk_belge-1_ithal', JSON.stringify([{ id: 'stale', adi: 'İPTAL EDİLEN SATIR' }]));
    let tamamla;
    service.cancelMakineRevizyon.mockImplementationOnce(() => new Promise(resolve => { tamamla = resolve; }));
    service.saveMakineListeleri.mockClear();
    fireEvent.click(screen.getByText('İptal').closest('button'));
    expect(service.cancelMakineRevizyon).toHaveBeenCalledTimes(1);
    fireEvent.keyDown(window, { key: 's', ctrlKey: true });
    expect(service.saveMakineListeleri).not.toHaveBeenCalled();
    expect(screen.getByText('İptal').closest('button')).toBeDisabled();
    const listeler = bos ? { yerli: [], ithal: [] } : belge.makineListeleri;
    await act(async () => { tamamla({ success: true, makineListeleri: listeler }); });
    await screen.findByText('Revize');
    expect(screen.queryByText(/İPTAL EDİLEN SATIR/)).not.toBeInTheDocument();
    if (bos) {
      expect(screen.queryByText(/EUR MAKİNE TL:/)).not.toBeInTheDocument();
      expect(JSON.parse(localStorage.getItem('mk_belge-1_ithal'))).toEqual([]);
    }
  });

});

test('yeni belgede toplu manuel kur seçili ithal satırlara uygulanır, mevcut FOB$ korunur', async () => {
  await ac(YeniMakine);
  fireEvent.click(screen.getByText('Revize').closest('button'));
  await screen.findByText('Bitir');
  fireEvent.click(screen.getByText('Test satırlarını seç').closest('button'));
  fireEvent.click(screen.getByText(/Toplu İşlem/).closest('button'));
  fireEvent.click(screen.getByText(/Toplu Manuel Kur Gir/));
  fireEvent.change(screen.getByLabelText('Kur (1 döviz = ? TL)'), { target: { value: '35' } });
  fireEvent.click(screen.getByText('Uygula (2)').closest('button'));
  await screen.findByText('EUR MAKİNE TL:5775000');
  await waitFor(() => expect(document.querySelector('[role=dialog]')).not.toBeInTheDocument());
  fireEvent.click(screen.getByLabelText('Dışa Aktar'));
  await waitFor(() => expect(window.URL.createObjectURL).toHaveBeenCalled());
  const sheet = workbook.worksheets.find(ws => ws.name.toLocaleLowerCase('tr').includes('ithal'));
  expect(sheet.getRow(2).getCell('toplamUsd').value).toBe(179000);
  expect(sheet.getRow(2).getCell('toplamTl').value).toBe(5775000);
});
