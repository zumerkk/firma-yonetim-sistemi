import React, { act } from 'react';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import MakineYonetimi from './MakineYonetimi';
import YeniMakineYonetimi from '../YeniTesvik/MakineYonetimi';
import api from '../../utils/axios';
import currencyService from '../../services/currencyService';
import tesvikService from '../../services/tesvikService';
import yeniTesvikService from '../../services/yeniTesvikService';

jest.mock('../../utils/axios', () => ({
  __esModule: true,
  default: { get: jest.fn(), post: jest.fn() },
  uploadPost: jest.fn(),
}));
jest.mock('../../services/tesvikService', () => ({
  __esModule: true,
  default: {
    get: jest.fn(),
    listMakineRevizyonlari: jest.fn(),
    startMakineRevizyon: jest.fn(),
    saveMakineListeleri: jest.fn(),
    finalizeMakineRevizyon: jest.fn(),
  },
}));
jest.mock('../../services/yeniTesvikService', () => ({
  __esModule: true,
  default: {
    get: jest.fn(),
    listMakineRevizyonlari: jest.fn(),
    startMakineRevizyon: jest.fn(),
    saveMakineListeleri: jest.fn(),
    finalizeMakineRevizyon: jest.fn(),
  },
}));
jest.mock('../../services/currencyService', () => ({ __esModule: true, default: { getRate: jest.fn() } }));
jest.mock('../../components/Files/FileUpload', () => () => null);
jest.mock('../TesvikMakine/MakineDetailModal', () => () => null);
jest.mock('../../components/Tesvik/EkipmanSatiri', () => () => null);
jest.mock('../../components/common/UstKaydirmaCubugu', () => ({ children }) => (
  <div style={{ width: 2400, height: 400 }}>{children}</div>
));
jest.mock('@mui/x-data-grid', () => {
  const modul = jest.requireActual('@mui/x-data-grid');
  return {
    ...modul,
    DataGrid: (props) => <modul.DataGrid {...props} disableVirtualization />,
  };
});

const belge = {
  _id: 'belge-1',
  tesvikId: '123456',
  gmId: 'GM-1',
  yatirimciUnvan: 'TEST FİRMASI',
  firma: { tamUnvan: 'TEST FİRMASI' },
  makineListeleri: {
    yerli: [
      { rowId: 'yerli-1', siraNo: 1, adiVeOzelligi: 'FORKLİFT', miktar: 1, birim: '142', birimFiyatiTl: 100000, toplamTutariTl: 100000, etuysSecili: true },
    ],
    ithal: [
      { rowId: 'ithal-1', siraNo: 1, adiVeOzelligi: 'İTHAL MAKİNE', miktar: 2, birim: '142', birimFiyatiFob: 100, gumrukDovizKodu: 'EUR', toplamTutarFobUsd: 220, toplamTutarFobTl: 8000 },
    ],
  },
};

jest.setTimeout(30000);
let kayitliBelge;

beforeEach(() => {
  jest.clearAllMocks();
  localStorage.clear();
  jest.spyOn(window, 'confirm').mockReturnValue(true);
  kayitliBelge = JSON.parse(JSON.stringify(belge));
  api.get.mockImplementation(async (url) => (url === '/tesvik' || url === '/yeni-tesvik'
    ? { data: { data: { tesvikler: [kayitliBelge] } } }
    : { data: { data: [] } }));
  currencyService.getRate.mockImplementation(async (_kaynak, hedef) => hedef === 'USD' ? 1.1 : 40);
  for (const service of [tesvikService, yeniTesvikService]) {
    service.get.mockImplementation(async () => kayitliBelge);
    service.listMakineRevizyonlari.mockResolvedValue([]);
    service.startMakineRevizyon.mockResolvedValue({ success: true, data: { revizeId: 'baslangic-1' } });
    service.saveMakineListeleri.mockResolvedValue({ success: true });
    service.finalizeMakineRevizyon.mockImplementation(async (_id, payload) => {
      kayitliBelge = { ...kayitliBelge, makineListeleri: { yerli: payload.yerli, ithal: payload.ithal } };
      return { success: true };
    });
  }
});

afterEach(() => jest.restoreAllMocks());

async function revizeyiAc(Component) {
  const gorunum = render(
    <MemoryRouter
      future={{ v7_startTransition: true, v7_relativeSplatPath: true }}
      initialEntries={[{ pathname: '/makine', state: { autoSelectBelgeId: 'belge-1' } }]}
    >
      <Component />
    </MemoryRouter>
  );
  const revize = screen.getByRole('button', { name: 'Revize' });
  await waitFor(() => expect(revize).toBeEnabled());
  fireEvent.click(revize);
  await screen.findByRole('button', { name: 'Bitir' });
  return gorunum;
}

function hucre(satir, alan) {
  return screen.getByRole('grid').querySelector(`[role="row"][data-rowindex="${satir}"] [data-field="${alan}"]`);
}

function sayisalHucreyiDuzenle(satir, alan, deger) {
  const hedef = hucre(satir, alan);
  fireEvent.doubleClick(hedef);
  const girdi = within(hedef).getByRole('textbox');
  expect(girdi).toHaveFocus();
  fireEvent.change(girdi, { target: { value: deger } });
  return girdi;
}

async function sonYerliFiyatiniDuzenle(Component) {
  await revizeyiAc(Component);
  fireEvent.click(within(screen.getByLabelText('Satır Ekle')).getByRole('button'));
  await screen.findByText('Yerli (2)');
  const miktar = sayisalHucreyiDuzenle(1, 'miktar', '2');
  fireEvent.keyDown(miktar, { key: 'Enter', code: 'Enter' });
  await waitFor(() => expect(hucre(1, 'miktar')).toHaveTextContent('2'));
  return sayisalHucreyiDuzenle(1, 'birimFiyatiTl', '400000');
}

describe.each([
  ['eski', MakineYonetimi, tesvikService],
  ['yeni', YeniMakineYonetimi, yeniTesvikService],
])('%s belge makine fiyatı', (_ad, Component, service) => {
test('son makinenin fiyatı hücreden doğrudan Bitir seçildiğinde toplamıyla kaydedilir', async () => {
  const birimFiyat = await sonYerliFiyatiniDuzenle(Component);
  expect(birimFiyat).toHaveFocus();
  const bitir = screen.getByRole('button', { name: 'Bitir' });
  // user-event v13 tetiklediği MUI odak güncellemelerini act ile sarmalamıyor.
  // eslint-disable-next-line testing-library/no-unnecessary-act
  await act(async () => { userEvent.click(bitir); });

  await waitFor(() => expect(service.finalizeMakineRevizyon).toHaveBeenCalledTimes(1));
  expect(service.finalizeMakineRevizyon).toHaveBeenCalledWith('belge-1', expect.objectContaining({
    yerli: [
      expect.objectContaining({ rowId: 'yerli-1', toplamTutariTl: 100000, etuysSecili: true }),
      expect.objectContaining({ siraNo: 2, miktar: 2, birimFiyatiTl: 400000, toplamTutariTl: 800000 }),
    ],
  }));
});

test('son makinenin fiyatını Enter ile onaylamak başka satır eklemeden toplamı günceller', async () => {
  const birimFiyat = await sonYerliFiyatiniDuzenle(Component);
  fireEvent.keyDown(birimFiyat, { key: 'Enter', code: 'Enter' });

  expect(await screen.findByText(/Yerli: 900\.000/)).toBeInTheDocument();
  expect(screen.getByText('Yerli (2)')).toBeInTheDocument();
});

test('Bitir, son ithal makinenin iki kur hesabı tamamlanınca kaydeder', async () => {
  let kurlariCoz;
  const kurlar = new Promise((resolve) => { kurlariCoz = resolve; });
  currencyService.getRate.mockImplementation(async (_kaynak, hedef) => (await kurlar)[hedef]);
  await revizeyiAc(Component);
  const bitir = screen.getByRole('button', { name: 'Bitir' });
  fireEvent.click(screen.getByRole('button', { name: 'İthal (1)' }));
  sayisalHucreyiDuzenle(0, 'birimFiyatiFob', '150');
  fireEvent.click(bitir);

  await waitFor(() => expect(currencyService.getRate).toHaveBeenCalledTimes(2));
  expect(service.finalizeMakineRevizyon).not.toHaveBeenCalled();
  await act(async () => { kurlariCoz({ USD: 1.1, TRY: 40 }); });

  expect(service.finalizeMakineRevizyon).toHaveBeenCalledWith('belge-1', expect.objectContaining({
    ithal: [expect.objectContaining({ rowId: 'ithal-1', miktar: 2, birimFiyatiFob: 150, toplamTutarFobUsd: 330, toplamTutarFobTl: 12000 })],
  }));
});


test('Türkçe fiyat yapıştırılınca dördüncü satır ve genel toplam odaktayken güncellenir, Bitir sonrası yeniden açılır', async () => {
  kayitliBelge.makineListeleri.yerli = [
    { ...belge.makineListeleri.yerli[0], adiVeOzelligi: 'FORKLİFT' },
    { ...belge.makineListeleri.yerli[0], rowId: 'yerli-2', siraNo: 2, adiVeOzelligi: 'LİFT', miktar: 2, birimFiyatiTl: 650000, toplamTutariTl: 1300000 },
    { ...belge.makineListeleri.yerli[0], rowId: 'yerli-3', siraNo: 3, adiVeOzelligi: 'LİFT 2', miktar: 2, birimFiyatiTl: 350000, toplamTutariTl: 700000 },
  ];
  const gorunum = await revizeyiAc(Component);
  fireEvent.click(within(screen.getByLabelText('Satır Ekle')).getByRole('button'));
  await screen.findByText('Yerli (4)');
  const miktar = sayisalHucreyiDuzenle(3, 'miktar', '2');
  fireEvent.keyDown(miktar, { key: 'Enter', code: 'Enter' });
  await waitFor(() => expect(hucre(3, 'miktar')).toHaveTextContent('2'));
  const fiyat = sayisalHucreyiDuzenle(3, 'birimFiyatiTl', '');
  await act(async () => { userEvent.paste(fiyat, '400.000'); });
  expect(fiyat).toHaveFocus();
  expect(fiyat).toHaveValue('400.000');
  expect(screen.getByText(/Yerli: 2\.900\.000/)).toBeInTheDocument();
  expect(hucre(3, 'toplamTl')).toHaveTextContent('800.000');
  await act(async () => { userEvent.click(screen.getByRole('button', { name: 'Bitir' })); });
  await waitFor(() => expect(service.finalizeMakineRevizyon).toHaveBeenCalledTimes(1));
  expect(kayitliBelge.makineListeleri.yerli[3]).toMatchObject({ miktar: 2, birimFiyatiTl: 400000, toplamTutariTl: 800000 });
  expect(kayitliBelge.makineListeleri.yerli.reduce((toplam, satir) => toplam + satir.toplamTutariTl, 0)).toBe(2900000);
  gorunum.unmount();
  await revizeyiAc(Component);
  expect(screen.getByText(/Yerli: 2\.900\.000/)).toBeInTheDocument();
  expect(hucre(3, 'toplamTl')).toHaveTextContent('800.000');
});

test('Hızlı modda Türkçe ondalıklı fiyat odak ve girdi kimliği korunarak canlı hesaplanır ve kaydedilir', async () => {
  await revizeyiAc(Component);
  fireEvent.click(screen.getByRole('button', { name: 'Hızlı' }));
  const fiyat = screen.getByRole('textbox', { name: '1. B.Fiy' });
  await act(async () => { userEvent.click(fiyat); });
  fireEvent.change(fiyat, { target: { value: '400.000,25' } });
  expect(fiyat).toHaveFocus();
  expect(screen.getByRole('textbox', { name: '1. B.Fiy' })).toBe(fiyat);
  expect(screen.getByText(/Yerli: 400\.000,25/)).toBeInTheDocument();
  await act(async () => { userEvent.click(screen.getAllByRole('button', { name: 'Bitir' })[0]); });
  await waitFor(() => expect(service.finalizeMakineRevizyon).toHaveBeenCalledTimes(1));
  expect(kayitliBelge.makineListeleri.yerli[0]).toMatchObject({ birimFiyatiTl: 400000.25, toplamTutariTl: 400000.25 });
});

test('Escape odaktaki Türkçe ondalıklı fiyat taslağını geri alır', async () => {
  await revizeyiAc(Component);
  const fiyat = sayisalHucreyiDuzenle(0, 'birimFiyatiTl', '400.000,25');
  expect(screen.getByText(/Yerli: 400\.000,25/)).toBeInTheDocument();
  fireEvent.keyDown(fiyat, { key: 'Escape', code: 'Escape' });
  await waitFor(() => expect(screen.getByText(/Yerli: 100\.000/)).toBeInTheDocument());
  expect(hucre(0, 'toplamTl')).toHaveTextContent('100.000');
});
});

test('yeni belgede Ctrl+S odaktaki fiyatı kaydeder ve revize açık kalır', async () => {
  await revizeyiAc(YeniMakineYonetimi);
  const fiyat = sayisalHucreyiDuzenle(0, 'birimFiyatiTl', '400.000,25');
  fireEvent.keyDown(fiyat, { key: 's', code: 'KeyS', ctrlKey: true });
  await waitFor(() => expect(yeniTesvikService.saveMakineListeleri).toHaveBeenCalled());
  expect(yeniTesvikService.saveMakineListeleri).toHaveBeenLastCalledWith('belge-1', expect.objectContaining({
    yerli: [expect.objectContaining({ birimFiyatiTl: 400000.25, toplamTutariTl: 400000.25 })],
  }));
  expect(yeniTesvikService.finalizeMakineRevizyon).not.toHaveBeenCalled();
  expect(screen.getByRole('button', { name: 'Bitir' })).toBeInTheDocument();
});
