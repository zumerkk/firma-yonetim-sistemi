import React from 'react';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import TesvikForm from './TesvikForm';
import YeniTesvikForm from '../YeniTesvik/YeniTesvikForm';
import api from '../../utils/axios';

jest.mock('../../utils/axios', () => ({
  __esModule: true,
  default: { get: jest.fn(), put: jest.fn(), post: jest.fn() }
}));
jest.mock('../../components/Layout/Header', () => () => null);
jest.mock('../../components/Layout/Sidebar', () => () => null);
jest.mock('../../components/EnhancedCitySelector.tsx', () => () => null);
jest.mock('../../components/NaceSuperSearch', () => () => null);
jest.mock('../../components/US97SuperSearch', () => () => null);
jest.mock('../../components/RevisionTimeline', () => () => null);

const firma = { _id: 'firma-1', firmaId: 'A000001', tamUnvan: 'Kapasite Test Firması' };

const templateData = {
  firmalar: [firma],
  durumlar: [],
  destekSiniflari: [],
  iller: [],
  dayandigiKanunlar: [],
  belgeDurumlari: [],
  yatirimTipleri: [],
  kapasiteBirimleri: [],
  osbOptions: [],
  yatirimKonusuKategorileri: [],
  u97Kodlari: [],
  destekUnsurlariOptions: [],
  destekSartlariOptions: [],
  ozelSartKisaltmalari: [],
  ozelSartNotlari: [],
  oecdKategorileri: []
};

const kayitliBelge = () => ({
  _id: 'belge-1',
  gmId: 'GM000001',
  tesvikId: 'YTB000001',
  firma,
  yatirimciUnvan: firma.tamUnvan,
  belgeYonetimi: { belgeNo: '568289', belgeDurumu: 'onaylandi' },
  kunyeBilgileri: {},
  yatirimBilgileri: {},
  maliHesaplamalar: {},
  istihdam: { mevcutKisi: 0, ilaveKisi: 0, toplamKisi: 0 },
  durumBilgileri: { genelDurum: 'onaylandi' },
  destekUnsurlari: [],
  ozelSartlar: [],
  makineListeleri: { yerli: [], ithal: [] },
  urunler: [{
    u97Kodu: '35.12',
    urunAdi: 'GES ELEKTRİK ENERJİSİ ÜRETİMİ',
    mevcutKapasite: 0.25,
    ilaveKapasite: 1.5,
    toplamKapasite: 1.75,
    kapasiteBirimi: 'MW'
  }]
});

const basariliYanit = (data) => ({ data: { success: true, data } });
const zamanlayiciKur = global.setTimeout;
let zamanlayicilar;

beforeEach(() => {
  jest.clearAllMocks();
  zamanlayicilar = [];
  global.setTimeout = (callback, delay, ...args) => {
    const timer = zamanlayiciKur(callback, delay, ...args);
    zamanlayicilar.push(timer);
    return timer;
  };
  jest.spyOn(console, 'log').mockImplementation(() => {});
  jest.spyOn(console, 'warn').mockImplementation(() => {});
  jest.spyOn(console, 'error').mockImplementation(() => {});
  api.get.mockImplementation((url) => {
    if (url.endsWith('/templates')) return Promise.resolve(basariliYanit(templateData));
    if (url.startsWith('/lookup/')) return Promise.resolve(basariliYanit([]));
    if (url.endsWith('/belge-1')) return Promise.resolve(basariliYanit(kayitliBelge()));
    return Promise.reject(new Error(`Beklenmeyen GET isteği: ${url}`));
  });
  api.put.mockResolvedValue(basariliYanit({ _id: 'belge-1' }));
});

afterEach(() => {
  cleanup();
  // Başarılı kayıttan sonraki gecikmeli yönlendirme sonraki teste taşınmasın.
  zamanlayicilar.forEach(clearTimeout);
  global.setTimeout = zamanlayiciKur;
  jest.restoreAllMocks();
});

test.each([
  ['eski teşvik', '/tesvik', TesvikForm],
  ['yeni teşvik', '/yeni-tesvik', YeniTesvikForm]
])('%s formu küsuratlı ürün kapasitesini yükler, düzenler ve yuvarlamadan kaydeder', async (_ad, endpoint, Form) => {
  render(
    <MemoryRouter initialEntries={[`${endpoint}/belge-1/duzenle`]}>
      <Routes>
        <Route path={`${endpoint}/:id/duzenle`} element={<Form />} />
      </Routes>
    </MemoryRouter>
  );

  fireEvent.click(await screen.findByRole('tab', { name: 'ÜRÜN BİLGİLERİ' }));
  const mevcut = await screen.findByLabelText('Mevcut kapasite 1');
  const ilave = screen.getByLabelText('İlave kapasite 1');
  const toplam = () => screen.getByLabelText('Toplam kapasite 1');

  // API'deki sayısal ondalıklar, düzenleme başlamadan önce de doğru yüklenmeli.
  expect(mevcut).toHaveValue('0,25');
  expect(ilave).toHaveValue('1,5');
  expect(toplam()).toHaveValue('1,75');

  fireEvent.focus(mevcut);
  fireEvent.change(mevcut, { target: { value: '0,' } });
  expect(mevcut).toHaveValue('0,');
  fireEvent.change(mevcut, { target: { value: '0,125' } });
  expect(mevcut).toHaveValue('0,125');
  fireEvent.blur(mevcut);

  fireEvent.focus(ilave);
  fireEvent.change(ilave, { target: { value: '4.' } });
  expect(ilave).toHaveValue('4.');
  fireEvent.change(ilave, { target: { value: '4.5' } });
  expect(ilave).toHaveValue('4.5');
  fireEvent.blur(ilave);
  expect(toplam()).toHaveValue('4,625');

  fireEvent.click(screen.getByRole('tab', { name: 'KÜNYE VE YATIRIM BİLGİLERİ' }));
  fireEvent.click(screen.getByRole('tab', { name: 'ÜRÜN BİLGİLERİ' }));
  expect(screen.getByLabelText('Mevcut kapasite 1')).toHaveValue('0,125');
  expect(screen.getByLabelText('İlave kapasite 1')).toHaveValue('4,5');
  expect(toplam()).toHaveValue('4,625');

  fireEvent.click(screen.getByRole('tab', { name: 'REVİZYON GEÇMİŞİ' }));
  fireEvent.click(screen.getByRole('button', { name: 'Güncelle' }));
  await waitFor(() => expect(api.put).toHaveBeenCalledTimes(1));
  expect(api.put).toHaveBeenCalledWith(`${endpoint}/belge-1`, expect.objectContaining({
    urunler: [expect.objectContaining({
      mevcutKapasite: 0.125,
      ilaveKapasite: 4.5,
      toplamKapasite: 4.625,
      kapasiteBirimi: 'MW'
    })]
  }));
});
