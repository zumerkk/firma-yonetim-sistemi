import React from 'react';
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter, Route, Routes, useLocation, useNavigate } from 'react-router-dom';
import ExcelJS from 'exceljs';
import FirmaList from './FirmaList';
import { FirmaProvider } from '../../contexts/FirmaContext';
import firmaService from '../../services/firmaService';
import { firmaListesineDon } from '../../utils/firmaListeDonusu';

jest.mock('../../components/Layout/Header', () => () => null);
jest.mock('../../components/Layout/Sidebar', () => () => null);
jest.mock('../../components/common/UstKaydirmaCubugu', () => ({ children }) => <>{children}</>);
jest.mock('../../services/firmaService', () => ({
  __esModule: true,
  default: {
    getFirmalar: jest.fn(), updateFirma: jest.fn()
  },
  importExcel: jest.fn(), downloadTemplate: jest.fn()
}));
// Sanal tablo yerine yalnız satırları ve gerçek işlem düğmelerini gösteririz;
// filtreler, Context ve sunucuya gönderilen parametreler gerçek akışta kalır.
jest.mock('@mui/x-data-grid', () => ({
  DataGrid: ({ rows, columns, paginationModel, onPaginationModelChange }) => <div data-testid="firma-satirlari" className="MuiDataGrid-virtualScroller">
    <button onClick={() => onPaginationModelChange({ ...paginationModel, page: 1 })}>Test sayfası {paginationModel.page + 1}</button>
    {rows.map((row) => <div key={row._id} data-testid={`firma-satiri-${row._id}`}>
      <span>{row.tamUnvan}</span>
      {['etuysYetkiBitisTarihi', 'dysYetkiBitisTarihi', 'aktif'].map((field) => (
        <div key={field}>{columns.find((column) => column.field === field).renderCell({ row, value: row[field] })}</div>
      ))}
      {columns.find(({ field }) => field === 'actions').renderCell({ row })}
    </div>)}
  </div>,
  useGridApiRef: () => ({ current: null }),
  GridToolbarContainer: () => null, GridToolbarFilterButton: () => null,
  GridToolbarDensitySelector: () => null, GridToolbarColumnsButton: () => null
}));

let firmalar;
const filtrele = (aktif) => firmalar.filter((firma) => aktif === 'all' || firma.aktif === (aktif === 'true'));
const listeSonucu = (firmalar) => ({ success: true, data: { firmalar } });
const sonFiltre = () => firmaService.getFirmalar.mock.calls.at(-1)[0];
const aramaIstekleri = () => firmaService.getFirmalar.mock.calls.filter(([params]) => params.arama);
const satirlar = () => within(screen.getByTestId('firma-satirlari'));
const tikla = async (element) => act(async () => { element.click(); });
const yenile = async () => {
  const dugme = screen.getByRole('button', { name: 'Yenile' });
  await waitFor(() => expect(dugme).toBeEnabled());
  await tikla(dugme);
};
const ac = () => render(<MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
  <FirmaProvider><FirmaList /></FirmaProvider>
</MemoryRouter>);
const durumSec = async (durum) => {
  fireEvent.mouseDown(screen.getByRole('combobox', { name: 'Durum' }));
  await tikla(await screen.findByRole('option', { name: durum }));
};

beforeEach(() => {
  jest.clearAllMocks();
  firmalar = [
    { _id: 'aktif', tamUnvan: 'ORTAK AKTİF FİRMA', aktif: true },
    { _id: 'pasif', tamUnvan: 'ORTAK PASİF FİRMA', aktif: false }
  ];
  firmaService.getFirmalar.mockImplementation(async ({ aktif, arama, yabanciSermayeli, firmaIl }) => listeSonucu(filtrele(aktif)
    .filter((firma) => !arama || firma.tamUnvan.includes(arama))
    .filter((firma) => !firmaIl || firma.firmaIl === firmaIl)
    .filter((firma) => !yabanciSermayeli || Boolean(firma.yabanciSermayeli) === (yabanciSermayeli === 'true'))));
  firmaService.updateFirma.mockImplementation(async (id, data) => {
    firmalar = firmalar.map((firma) => firma._id === id ? { ...firma, ...data } : firma);
    return { success: true, data: { firma: firmalar.find((firma) => firma._id === id) } };
  });
});

test('ilk açılışta hızlı sekme ve Durum gerçek Aktif filtresini gösterir', async () => {
  ac();
  await waitFor(() => expect(satirlar().getByText('ORTAK AKTİF FİRMA')).toBeInTheDocument());
  expect(screen.getByRole('button', { name: 'Aktif', pressed: true })).toBeInTheDocument();
  expect(screen.getByRole('combobox', { name: 'Durum' })).toHaveTextContent('Aktif');
  expect(sonFiltre().aktif).toBe('true');
  expect(satirlar().queryByText('ORTAK PASİF FİRMA')).not.toBeInTheDocument();
});

test.each([['Tümü', 'all'], ['Pasif', 'false'], ['Aktif', 'true']])(
  '%s hızlı sekmesi Durum alanını ve yenileme isteğini aynı seçimde tutar', async (etiket, aktif) => {
    ac();
    await waitFor(() => expect(firmaService.getFirmalar).toHaveBeenCalled());
    await tikla(screen.getByRole('button', { name: etiket }));
    await waitFor(() => expect(sonFiltre().aktif).toBe(aktif));
    expect(screen.getByRole('combobox', { name: 'Durum' })).toHaveTextContent(etiket);
    expect(screen.getByRole('button', { name: etiket, pressed: true })).toBeInTheDocument();
    const oncekiIstekSayisi = firmaService.getFirmalar.mock.calls.length;
    await yenile();
    await waitFor(() => expect(firmaService.getFirmalar.mock.calls.length).toBeGreaterThan(oncekiIstekSayisi));
    expect(sonFiltre().aktif).toBe(aktif);
    expect(sonFiltre().limit).toBe(2000);
  }
);

test.each([[/Yetkisi Biten/, 'expired'], ['7 Gün İçinde', 'expiring7'], ['30 Gün İçinde', 'expiring30']])(
  '%s yetki sekmesi yalnız aktif firmaları gösterir, Pasif seçilince tarih filtresi temizlenir', async (etiket, yetkiDurumu) => {
    ac();
    await waitFor(() => expect(firmaService.getFirmalar).toHaveBeenCalled());
    await tikla(screen.getByRole('button', { name: etiket }));
    await waitFor(() => expect(sonFiltre()).toMatchObject({ aktif: 'true', yetkiDurumu }));
    expect(screen.getByRole('combobox', { name: 'Durum' })).toHaveTextContent('Aktif');
    expect(satirlar().queryByText('ORTAK PASİF FİRMA')).not.toBeInTheDocument();
    const oncekiIstekSayisi = firmaService.getFirmalar.mock.calls.length;
    await yenile();
    await waitFor(() => expect(firmaService.getFirmalar.mock.calls.length).toBeGreaterThan(oncekiIstekSayisi));
    expect(sonFiltre()).toMatchObject({ aktif: 'true', yetkiDurumu });
    await durumSec('Pasif');
    await waitFor(() => expect(sonFiltre()).toMatchObject({ aktif: 'false', yetkiDurumu: '' }));
    expect(screen.getByRole('button', { name: 'Pasif', pressed: true })).toBeInTheDocument();
    expect(satirlar().getByText('ORTAK PASİF FİRMA')).toBeInTheDocument();
    expect(satirlar().queryByText('ORTAK AKTİF FİRMA')).not.toBeInTheDocument();
  }
);

test('yetki sekmesinde arama tarih filtresini korur, Pasif sekmesinde normal aramaya döner', async () => {
  firmalar.push({ _id: 'guncel', tamUnvan: 'ORTAK YETKİSİ GÜNCEL FİRMA', aktif: true });
  firmaService.getFirmalar.mockImplementation(async ({ aktif, yetkiDurumu }) =>
    listeSonucu(filtrele(aktif).filter((firma) => !yetkiDurumu || firma._id !== 'guncel')));
  ac();
  await tikla(screen.getByRole('button', { name: '7 Gün İçinde' }));
  fireEvent.change(screen.getByPlaceholderText('Vergi No, Tam Ünvan veya Firma ID ile ara...'), {
    target: { value: 'ORTAK' }
  });
  await waitFor(() => expect(sonFiltre()).toMatchObject({ arama: 'ORTAK', aktif: 'true', yetkiDurumu: 'expiring7' }));
  expect(satirlar().getByText('ORTAK AKTİF FİRMA')).toBeInTheDocument();
  expect(satirlar().queryByText('ORTAK YETKİSİ GÜNCEL FİRMA')).not.toBeInTheDocument();
  expect(satirlar().queryByText('ORTAK PASİF FİRMA')).not.toBeInTheDocument();

  await tikla(screen.getByRole('button', { name: 'Pasif' }));
  await waitFor(() => expect(sonFiltre()).toMatchObject({ arama: 'ORTAK', aktif: 'false', yetkiDurumu: '' }));
  expect(satirlar().getByText('ORTAK PASİF FİRMA')).toBeInTheDocument();
});

test('Tümü görünümünde pasif firmanın ETUYS ve DYS tarihleri uyarı rozetleri olmadan okunur', async () => {
  const etuys = '2020-11-05T12:00:00Z';
  const dys = '2020-11-06T12:00:00Z';
  firmalar = firmalar.map((firma) => ({ ...firma, etuysYetkiBitisTarihi: etuys, dysYetkiBitisTarihi: dys }));
  ac();
  await tikla(screen.getByRole('button', { name: 'Tümü' }));
  const pasifSatir = within(await screen.findByTestId('firma-satiri-pasif'));
  expect(pasifSatir.getByText(new Date(etuys).toLocaleDateString('tr-TR'))).toBeInTheDocument();
  expect(pasifSatir.getByText(new Date(dys).toLocaleDateString('tr-TR'))).toBeInTheDocument();
  expect(pasifSatir.queryByText('Doldu')).not.toBeInTheDocument();
  expect(pasifSatir.queryByText(/Yetki Bitti/)).not.toBeInTheDocument();
  const aktifSatir = within(screen.getByTestId('firma-satiri-aktif'));
  expect(aktifSatir.getByText('Doldu')).toBeInTheDocument();
  expect(aktifSatir.getByText(/Yetki Bitti/)).toBeInTheDocument();
});

test('hızlı sekme aramanın durum filtresini de değiştirir', async () => {
  ac();
  await waitFor(() => expect(firmaService.getFirmalar).toHaveBeenCalled());
  fireEvent.change(screen.getByPlaceholderText('Vergi No, Tam Ünvan veya Firma ID ile ara...'), {
    target: { value: 'ORTAK' }
  });
  await waitFor(() => expect(sonFiltre()).toMatchObject({ arama: 'ORTAK', aktif: 'true' }));
  await tikla(screen.getByRole('button', { name: 'Pasif' }));
  await waitFor(() => expect(sonFiltre()).toMatchObject({ arama: 'ORTAK', aktif: 'false' }));
  expect(satirlar().getByText('ORTAK PASİF FİRMA')).toBeInTheDocument();
  expect(satirlar().queryByText('ORTAK AKTİF FİRMA')).not.toBeInTheDocument();
});

test('arama açıkken seçili Pasif sekmesine tekrar basılması sonuçları boş bırakmaz', async () => {
  ac();
  await tikla(screen.getByRole('button', { name: 'Pasif' }));
  fireEvent.change(screen.getByPlaceholderText('Vergi No, Tam Ünvan veya Firma ID ile ara...'), {
    target: { value: 'ORTAK' }
  });
  await waitFor(() => expect(satirlar().getByText('ORTAK PASİF FİRMA')).toBeInTheDocument());
  await waitFor(() => expect(aramaIstekleri()).toHaveLength(1));
  await tikla(screen.getByRole('button', { name: 'Pasif' }));
  await waitFor(() => expect(aramaIstekleri()).toHaveLength(2));
  await waitFor(() => expect(satirlar().getByText('ORTAK PASİF FİRMA')).toBeInTheDocument());
});

test('Tümü seçiliyken firma pasife alındığında seçim ve satır korunur', async () => {
  ac();
  await waitFor(() => expect(firmaService.getFirmalar).toHaveBeenCalled());
  await tikla(screen.getByRole('button', { name: 'Tümü' }));
  await waitFor(() => expect(satirlar().getByText('ORTAK PASİF FİRMA')).toBeInTheDocument());
  await tikla(screen.getByRole('button', { name: 'Pasif Yap' }));
  await waitFor(() => expect(firmaService.updateFirma).toHaveBeenCalledWith('aktif', { aktif: false }));
  await waitFor(() => expect(screen.getAllByRole('button', { name: 'Aktif Yap' })).toHaveLength(2));
  expect(sonFiltre().aktif).toBe('all');
  expect(screen.getByRole('button', { name: 'Tümü', pressed: true })).toBeInTheDocument();
  expect(satirlar().getByText('ORTAK AKTİF FİRMA')).toBeInTheDocument();
});

test('aktif arama sonucundaki firma pasife alındığında arama yeniden yüklenir', async () => {
  ac();
  fireEvent.change(screen.getByPlaceholderText('Vergi No, Tam Ünvan veya Firma ID ile ara...'), {
    target: { value: 'ORTAK' }
  });
  await waitFor(() => expect(aramaIstekleri()).toHaveLength(1));
  await tikla(await screen.findByRole('button', { name: 'Pasif Yap' }));
  await waitFor(() => expect(aramaIstekleri()).toHaveLength(2));
  expect(sonFiltre()).toMatchObject({ arama: 'ORTAK', aktif: 'true' });
  await waitFor(() => expect(satirlar().queryByText('ORTAK AKTİF FİRMA')).not.toBeInTheDocument());
});

test('geç dönen Aktif arama yanıtı daha yeni Pasif sekmesinin sonuçlarını ezmez', async () => {
  let aktifAramayiBitir;
  firmaService.getFirmalar.mockImplementation(async ({ arama, aktif }) => {
    if (arama && aktif === 'true') return new Promise((resolve) => { aktifAramayiBitir = resolve; });
    return listeSonucu(filtrele(aktif));
  });
  ac();
  fireEvent.change(screen.getByPlaceholderText('Vergi No, Tam Ünvan veya Firma ID ile ara...'), {
    target: { value: 'ORTAK' }
  });
  await waitFor(() => expect(aktifAramayiBitir).toBeDefined());
  await tikla(screen.getByRole('button', { name: 'Pasif' }));
  await waitFor(() => expect(satirlar().getByText('ORTAK PASİF FİRMA')).toBeInTheDocument());
  await act(async () => { aktifAramayiBitir(listeSonucu(filtrele('true'))); });
  expect(satirlar().getByText('ORTAK PASİF FİRMA')).toBeInTheDocument();
  expect(satirlar().queryByText('ORTAK AKTİF FİRMA')).not.toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Pasif', pressed: true })).toBeInTheDocument();
});

test('geç dönen ilk Aktif listesi yeni Pasif listesinin sonuçlarını ezmez', async () => {
  let aktifListeyiBitir;
  firmaService.getFirmalar.mockImplementation(async ({ aktif }) => {
    if (aktif === 'true') return new Promise((resolve) => { aktifListeyiBitir = resolve; });
    return { success: true, data: { firmalar: filtrele(aktif) } };
  });
  ac();
  await waitFor(() => expect(aktifListeyiBitir).toBeDefined());
  await tikla(screen.getByRole('button', { name: 'Pasif' }));
  await waitFor(() => expect(satirlar().getByText('ORTAK PASİF FİRMA')).toBeInTheDocument());
  await act(async () => { aktifListeyiBitir({ success: true, data: { firmalar: filtrele('true') } }); });
  expect(satirlar().getByText('ORTAK PASİF FİRMA')).toBeInTheDocument();
  expect(satirlar().queryByText('ORTAK AKTİF FİRMA')).not.toBeInTheDocument();
});

test('bekleyen Yenile tamamlanınca yeni Pasif aramasını eski Aktif aramasıyla ezmez', async () => {
  ac();
  fireEvent.change(screen.getByPlaceholderText('Vergi No, Tam Ünvan veya Firma ID ile ara...'), {
    target: { value: 'ORTAK' }
  });
  await waitFor(() => expect(aramaIstekleri()).toHaveLength(1));
  let yenilemeyiBitir;
  firmaService.getFirmalar.mockImplementationOnce(() => new Promise((resolve) => { yenilemeyiBitir = resolve; }));
  await yenile();
  await waitFor(() => expect(yenilemeyiBitir).toBeDefined());
  await tikla(screen.getByRole('button', { name: 'Pasif' }));
  await waitFor(() => expect(sonFiltre()).toMatchObject({ arama: 'ORTAK', aktif: 'false' }));
  await waitFor(() => expect(satirlar().getByText('ORTAK PASİF FİRMA')).toBeInTheDocument());
  await act(async () => { yenilemeyiBitir({ success: true, data: { firmalar: filtrele('true') } }); });
  expect(aramaIstekleri()).toHaveLength(3);
  expect(satirlar().getByText('ORTAK PASİF FİRMA')).toBeInTheDocument();
  expect(satirlar().queryByText('ORTAK AKTİF FİRMA')).not.toBeInTheDocument();
});

test('bekleyen durum güncellemesi yeni seçilen Pasif sekmesinin güncel filtresiyle yeniler', async () => {
  ac();
  await waitFor(() => expect(satirlar().getByText('ORTAK AKTİF FİRMA')).toBeInTheDocument());
  let durumGuncellemeyiBitir;
  firmaService.updateFirma.mockImplementationOnce(() => new Promise((resolve) => { durumGuncellemeyiBitir = resolve; }));
  await tikla(screen.getByRole('button', { name: 'Pasif Yap' }));
  await waitFor(() => expect(durumGuncellemeyiBitir).toBeDefined());
  await tikla(screen.getByRole('button', { name: 'Pasif' }));
  await waitFor(() => expect(satirlar().getByText('ORTAK PASİF FİRMA')).toBeInTheDocument());
  await act(async () => {
    firmalar = firmalar.map((firma) => firma._id === 'aktif' ? { ...firma, aktif: false } : firma);
    durumGuncellemeyiBitir({ success: true, data: { firma: firmalar[0] } });
  });
  expect(sonFiltre().aktif).toBe('false');
  expect(screen.getByRole('button', { name: 'Pasif', pressed: true })).toBeInTheDocument();
  expect(satirlar().getByText('ORTAK PASİF FİRMA')).toBeInTheDocument();
  expect(satirlar().getByText('ORTAK AKTİF FİRMA')).toBeInTheDocument();
});

test('arama ve sermaye filtresi birlikte çalışır; Tümü yabancı firmayı geri getirir', async () => {
  firmalar = [{ ...firmalar[0], yabanciSermayeli: true }, { ...firmalar[1], aktif: true }];
  ac();
  fireEvent.change(screen.getByPlaceholderText('Vergi No, Tam Ünvan veya Firma ID ile ara...'), { target: { value: 'ORTAK' } });
  const sermayeSec = async (secenek) => {
    fireEvent.mouseDown(screen.getByRole('combobox', { name: 'Yabancı Sermaye' }));
    await tikla(await screen.findByRole('option', { name: secenek }));
  };
  await sermayeSec('Hayır');
  expect(await satirlar().findByText('ORTAK PASİF FİRMA')).toBeInTheDocument();
  expect(satirlar().queryByText('ORTAK AKTİF FİRMA')).not.toBeInTheDocument();
  expect(sonFiltre()).toMatchObject({ arama: 'ORTAK', yabanciSermayeli: 'false' });
  await sermayeSec('Tümü');
  expect(await satirlar().findByText('ORTAK AKTİF FİRMA')).toBeInTheDocument();
  expect(sonFiltre()).toMatchObject({ arama: 'ORTAK', yabanciSermayeli: '' });
});

test('yenileme başarısızlığında eski sonuçla birlikte hata görünür', async () => {
  ac();
  await satirlar().findByText('ORTAK AKTİF FİRMA');
  firmaService.getFirmalar.mockResolvedValueOnce({ success: false, message: 'Firma sunucusuna ulaşılamadı.' });
  await yenile();
  expect((await screen.findAllByText('Firma sunucusuna ulaşılamadı.')).length).toBeGreaterThan(0);
  expect(screen.queryByText('Veriler yenilendi')).not.toBeInTheDocument();
  expect(satirlar().getByText('ORTAK AKTİF FİRMA')).toBeInTheDocument();
});

test('liste ikinci sunucu sayfasını da getirir ve toplamı tüm eşleşmelerle gösterir', async () => {
  firmaService.getFirmalar.mockResolvedValueOnce({
    success: true, data: { firmalar: [firmalar[0]], pagination: { toplamSayfa: 2 } }
  }).mockResolvedValueOnce({
    success: true, data: { firmalar: [firmalar[1]], pagination: { toplamSayfa: 2 } }
  });
  ac();
  expect(await screen.findByText('Toplam 2 firma kayıtlı')).toBeInTheDocument();
  expect(firmaService.getFirmalar.mock.calls.map(([params]) => params.sayfa)).toEqual([1, 2]);
});

test('arama sonucunu Excel’e aktarırken 20 kayıtla sınırlamaz ve sermaye/iletişim alanlarını korur', async () => {
  firmalar = Array.from({ length: 21 }, (_, i) => ({
    _id: String(i), firmaId: `A${i}`, tamUnvan: `ORTAK FİRMA ${i}`, aktif: true,
    yabanciSermayeli: true, firmaWebsite: 'https://example.test'
  }));
  const olustur = window.URL.createObjectURL;
  const kaldir = window.URL.revokeObjectURL;
  window.URL.createObjectURL = jest.fn(() => 'blob:excel');
  window.URL.revokeObjectURL = jest.fn();
  const indir = jest.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
  try {
    ac();
    fireEvent.change(screen.getByPlaceholderText('Vergi No, Tam Ünvan veya Firma ID ile ara...'), { target: { value: 'ORTAK' } });
    expect(await screen.findByText('Toplam 21 firma kayıtlı (arama sonucu)')).toBeInTheDocument();
    await tikla(screen.getByRole('button', { name: 'Excel' }));
    await waitFor(() => expect(window.URL.createObjectURL).toHaveBeenCalled());
    const blob = window.URL.createObjectURL.mock.calls[0][0];
    const buffer = await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsArrayBuffer(blob);
    });
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(buffer);
    const satirlar = workbook.worksheets[0].getSheetValues().filter((row) => row?.[3]?.startsWith?.('ORTAK FİRMA '));
    expect(satirlar).toHaveLength(21);
    expect(satirlar.every((row) => row[10] === 'https://example.test' && row[11] === 'EVET')).toBe(true);
  } finally {
    indir.mockRestore();
    window.URL.createObjectURL = olustur;
    window.URL.revokeObjectURL = kaldir;
  }
});

function FirmaDetayi() {
  const navigate = useNavigate();
  const location = useLocation();
  return <button onClick={() => firmaListesineDon(navigate, location.state)}>Listeye dön</button>;
}

test('firma detayından dönüş arama, kart filtresi, sayfa ve kaydırma konumunu korur', async () => {
  firmalar[0].firmaIl = 'ANKARA';
  render(<MemoryRouter initialEntries={['/firmalar?arama=ORTAK&firmaIl=ANKARA&yetkiDurumu=expired&yetkiTuru=etuys']}
    future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
    <FirmaProvider><Routes>
      <Route path="/firmalar" element={<FirmaList />} />
      <Route path="/firmalar/:id" element={<FirmaDetayi />} />
    </Routes></FirmaProvider>
  </MemoryRouter>);
  await satirlar().findByText('ORTAK AKTİF FİRMA');
  await tikla(screen.getByRole('button', { name: 'Test sayfası 1' }));
  screen.getByRole('main').scrollTop = 90;
  screen.getByTestId('firma-satirlari').scrollLeft = 120;
  await tikla(screen.getByRole('button', { name: 'Görüntüle' }));
  await tikla(await screen.findByRole('button', { name: 'Listeye dön' }));
  expect(await satirlar().findByText('ORTAK AKTİF FİRMA')).toBeInTheDocument();
  expect(screen.getByPlaceholderText('Vergi No, Tam Ünvan veya Firma ID ile ara...')).toHaveValue('ORTAK');
  expect(screen.getByRole('button', { name: 'Test sayfası 2' })).toBeInTheDocument();
  expect(screen.getByRole('main').scrollTop).toBe(90);
  expect(screen.getByTestId('firma-satirlari').scrollLeft).toBe(120);
  expect(sonFiltre()).toMatchObject({ arama: 'ORTAK', firmaIl: 'ANKARA', yetkiDurumu: 'expired', yetkiTuru: 'etuys' });
});
