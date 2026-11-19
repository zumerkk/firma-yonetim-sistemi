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

jest.setTimeout(20000);

beforeEach(() => {
  jest.clearAllMocks();
  localStorage.clear();
  jest.spyOn(window, 'confirm').mockReturnValue(true);
  api.get.mockImplementation(async (url) => (url === '/tesvik' || url === '/yeni-tesvik'
    ? { data: { data: { tesvikler: [belge] } } }
    : { data: { data: [] } }));
  for (const service of [tesvikService, yeniTesvikService]) {
    service.get.mockResolvedValue(belge);
    service.listMakineRevizyonlari.mockResolvedValue([]);
    service.startMakineRevizyon.mockResolvedValue({ success: true, data: { revizeId: 'baslangic-1' } });
    service.saveMakineListeleri.mockResolvedValue({ success: true });
    service.finalizeMakineRevizyon.mockResolvedValue({ success: true });
  }
});

afterEach(() => jest.restoreAllMocks());

let Component;
let service;

async function revizeyiAc() {
  render(
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
  return screen.findByRole('button', { name: 'Bitir' });
}

function hucre(satir, alan) {
  return screen.getByRole('grid').querySelector(`[role="row"][data-rowindex="${satir}"] [data-field="${alan}"]`);
}

function sayisalHucreyiDuzenle(satir, alan, deger) {
  const hedef = hucre(satir, alan);
  fireEvent.doubleClick(hedef);
  const girdi = within(hedef).queryByRole('spinbutton') || within(hedef).getByRole('textbox');
  expect(girdi).toHaveFocus();
  fireEvent.change(girdi, { target: { value: deger } });
  return girdi;
}

async function sonYerliFiyatiniDuzenle() {
  await revizeyiAc();
  fireEvent.click(within(screen.getByLabelText('Satır Ekle')).getByRole('button'));
  await screen.findByText('Yerli (2)');
  const miktar = sayisalHucreyiDuzenle(1, 'miktar', '2');
  fireEvent.keyDown(miktar, { key: 'Enter', code: 'Enter' });
  await waitFor(() => expect(hucre(1, 'miktar')).toHaveTextContent('2'));
  return sayisalHucreyiDuzenle(1, 'birimFiyatiTl', '400000');
}

describe.each([
  ['eski belge', MakineYonetimi, tesvikService],
  ['yeni belge', YeniMakineYonetimi, yeniTesvikService],
])('%s', (_ad, Screen, apiService) => {
  beforeEach(() => { Component = Screen; service = apiService; });

test('son makinenin fiyatı hücreden doğrudan Bitir seçildiğinde toplamıyla kaydedilir', async () => {
  const birimFiyat = await sonYerliFiyatiniDuzenle();
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
  const birimFiyat = await sonYerliFiyatiniDuzenle();
  fireEvent.keyDown(birimFiyat, { key: 'Enter', code: 'Enter' });

  expect(await screen.findByText(/Yerli: 900\.000/)).toBeInTheDocument();
  expect(screen.getByText('Yerli (2)')).toBeInTheDocument();
});

test('Bitir, son ithal makinenin iki kur hesabı tamamlanınca kaydeder', async () => {
  let kurlariCoz;
  const kurlar = new Promise((resolve) => { kurlariCoz = resolve; });
  currencyService.getRate.mockImplementation(async (_kaynak, hedef) => (await kurlar)[hedef]);
  const bitir = await revizeyiAc();
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

test('fiyat yazılırken toplam güncellenir ve Escape son değişikliği geri alır', async () => {
  const fiyat = await sonYerliFiyatiniDuzenle();
  expect(await screen.findByText(/Yerli: 900\.000/)).toBeInTheDocument();
  expect(fiyat).toHaveFocus();
  fireEvent.keyDown(fiyat, { key: 'Escape', code: 'Escape' });
  expect(await screen.findByText(/Yerli: 100\.000/)).toBeInTheDocument();
  expect(screen.getByText('Yerli (2)')).toBeInTheDocument();
});

test('Türkçe binlik ve ondalık ayracıyla girilen son fiyat doğrudan kaydedilir', async () => {
  const fiyat = await sonYerliFiyatiniDuzenle();
  // eslint-disable-next-line testing-library/no-unnecessary-act
  await act(async () => { userEvent.clear(fiyat); userEvent.type(fiyat, '400.000,50'); });
  expect(await screen.findByText(/Yerli: 900\.001/)).toBeInTheDocument();
  expect(fiyat).toHaveValue('400.000,50');
  expect(fiyat).toHaveFocus();
  // eslint-disable-next-line testing-library/no-unnecessary-act
  await act(async () => { userEvent.click(screen.getByRole('button', { name: 'Bitir' })); });
  await waitFor(() => expect(service.finalizeMakineRevizyon).toHaveBeenCalledTimes(1));
  expect(service.finalizeMakineRevizyon).toHaveBeenCalledWith('belge-1', expect.objectContaining({
    yerli: expect.arrayContaining([
      expect.objectContaining({ miktar: 2, birimFiyatiTl: 400000.5, toplamTutariTl: 800001 }),
    ]),
  }));
});

test('ithal birim fiyatında Türkçe tutar kaydedilirken parite ve TL birlikte hesaplanır', async () => {
  currencyService.getRate.mockImplementation(async (_kaynak, hedef) => ({ USD: 1.1, TRY: 40 })[hedef]);
  const bitir = await revizeyiAc();
  fireEvent.click(screen.getByRole('button', { name: 'İthal (1)' }));
  sayisalHucreyiDuzenle(0, 'birimFiyatiFob', '1.300,50');
  fireEvent.click(bitir);
  await waitFor(() => expect(service.finalizeMakineRevizyon).toHaveBeenCalledTimes(1));
  expect(service.finalizeMakineRevizyon).toHaveBeenCalledWith('belge-1', expect.objectContaining({
    ithal: [expect.objectContaining({ rowId: 'ithal-1', miktar: 2, birimFiyatiFob: 1300.5, toplamTutarFobUsd: 2861.1, toplamTutarFobTl: 104040 })],
  }));
});
});
