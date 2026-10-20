import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import '@testing-library/jest-dom';
import { MemoryRouter } from 'react-router-dom';
import Yonetim from './IslemTuruYonetimi';
import svc from '../../services/islemEvrakService';

jest.mock('../../components/Layout/LayoutWrapper', () => ({ children }) => <div>{children}</div>);
jest.mock('../../services/islemEvrakService', () => ({ __esModule: true, default: {
  turler: jest.fn(), turDetay: jest.fn(), turGuncelle: jest.fn(), turOrnekYukle: jest.fn(), turOrnekIndir: jest.fn()
} }));

beforeEach(() => jest.clearAllMocks());

test('şablonda çoklu örnek ekleme eski örneği korur, tek dosya kaldırılabilir ve liste kaydedilir', async () => {
  const tur = { _id: 'tur1', ad: 'ETUYS', istenenEvraklar: [{ ad: 'Taahhütname', ornekDosya: { dosyaAdi: 'eski.docx', filePath: 'eski.docx' } }] };
  svc.turler.mockResolvedValue([tur]);
  svc.turDetay.mockResolvedValue(tur);
  svc.turGuncelle.mockResolvedValue(tur);
  svc.turOrnekYukle.mockImplementation(async (form) => ({ dosyaAdi: form.get('dosyalar').name, filePath: form.get('dosyalar').name }));
  render(<MemoryRouter><Yonetim /></MemoryRouter>);
  const input = await screen.findByLabelText('Taahhütname örnek ekle');
  expect(input).toHaveAttribute('multiple');
  fireEvent.change(input, { target: { files: [new File(['a'], 'bir.pdf'), new File(['b'], 'iki.pdf')] } });
  expect(await screen.findByText('iki.pdf')).toBeInTheDocument();
  expect(screen.getByText('eski.docx')).toBeInTheDocument();
  expect(screen.getByText('bir.pdf')).toBeInTheDocument();
  expect(svc.turOrnekYukle).toHaveBeenCalledTimes(2);
  fireEvent.click(screen.getByLabelText('bir.pdf örneğini kaldır'));
  expect(screen.queryByText('bir.pdf')).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Kaydet' }));
  await waitFor(() => expect(svc.turGuncelle).toHaveBeenCalledWith('tur1', expect.objectContaining({
    istenenEvraklar: [expect.objectContaining({ ornekDosyalar: [
      { dosyaAdi: 'eski.docx', filePath: 'eski.docx' }, { dosyaAdi: 'iki.pdf', filePath: 'iki.pdf' }
    ] })]
  })));
  await screen.findByText('İşlem türü güncellendi');
});


test('geciken örnek yüklemesi boyunca düzenleme, tür seçimi ve kaydetme kilitlidir', async () => {
  let bitir;
  const bekleyen = new Promise((resolve) => { bitir = resolve; });
  const a = { _id: 'turA', ad: 'İşlem A', istenenEvraklar: [{ ad: 'Belge A' }] };
  const b = { _id: 'turB', ad: 'İşlem B', istenenEvraklar: [{ ad: 'Belge B' }] };
  svc.turler.mockResolvedValue([a, b]); svc.turDetay.mockResolvedValue(a);
  svc.turGuncelle.mockResolvedValue(a); svc.turOrnekYukle.mockReturnValue(bekleyen);
  render(<MemoryRouter><Yonetim /></MemoryRouter>);
  fireEvent.change(await screen.findByLabelText('Belge A örnek ekle'), { target: { files: [new File(['x'], 'geciken.pdf')] } });
  expect(screen.getByRole('button', { name: 'Kaydet' })).toBeDisabled();
  expect(screen.getByLabelText('Evrak adı')).toBeDisabled();
  expect(screen.getByLabelText(/İşlem Adı/)).toBeDisabled();
  expect(screen.getByRole('button', { name: /İşlem B/ })).toHaveAttribute('aria-disabled', 'true');
  expect(screen.getByLabelText('Evrak adı').closest('fieldset')).toHaveAttribute('inert');
  fireEvent.click(screen.getByRole('button', { name: 'Kaydet' }));
  fireEvent.click(screen.getByRole('button', { name: /İşlem B/ }));
  expect(svc.turGuncelle).not.toHaveBeenCalled();
  expect(svc.turDetay).toHaveBeenCalledTimes(1);
  await act(async () => { bitir({ dosyaAdi: 'geciken.pdf', filePath: 'geciken.pdf' }); await bekleyen; });
  expect(await screen.findByText('geciken.pdf')).toBeInTheDocument();
  expect(screen.getByLabelText('Evrak adı')).toHaveValue('Belge A');
  expect(screen.getByRole('button', { name: 'Kaydet' })).toBeEnabled();
  fireEvent.click(screen.getByRole('button', { name: 'Kaydet' }));
  await waitFor(() => expect(svc.turGuncelle).toHaveBeenCalledWith('turA', expect.objectContaining({
    istenenEvraklar: [expect.objectContaining({ ad: 'Belge A', ornekDosyalar: [{ dosyaAdi: 'geciken.pdf', filePath: 'geciken.pdf' }] })]
  })));
  await screen.findByText('İşlem türü güncellendi');
});

test('kaydedilmemiş örnek silme işleminden sonra kalan dosya yanlış indeksle indirilmez', async () => {
  let tur = { _id: 'tur1', ad: 'İşlem', istenenEvraklar: [{ ad: 'Belge', ornekDosyalar: [
    { dosyaAdi: 'A.pdf', filePath: 'A.pdf' }, { dosyaAdi: 'B.pdf', filePath: 'B.pdf' }
  ] }] };
  svc.turler.mockImplementation(async () => [tur]); svc.turDetay.mockImplementation(async () => tur);
  svc.turGuncelle.mockImplementation(async (_id, body) => { tur = { ...tur, ...body }; return tur; });
  render(<MemoryRouter><Yonetim /></MemoryRouter>);
  fireEvent.click(await screen.findByLabelText('A.pdf örneğini kaldır'));
  fireEvent.click(screen.getByText('B.pdf'));
  expect(svc.turOrnekIndir).not.toHaveBeenCalled();
  expect(screen.getByText('B.pdf').parentElement).toHaveAttribute('title', 'İndirmek için önce değişiklikleri kaydedin.');
  fireEvent.click(screen.getByRole('button', { name: 'Kaydet' }));
  await screen.findByText('İşlem türü güncellendi');
  await waitFor(() => expect(screen.getByText('B.pdf').parentElement).toHaveAttribute('title', 'Örneği indir'));
});


test.each(['yükleme sırasında', 'yüklemeden sonra'])('önceden istenen tür yanıtı %s örnek eklenen formu değiştiremez', async (zaman) => {
  let turuBitir; let dosyayiBitir;
  const turBekliyor = new Promise((resolve) => { turuBitir = resolve; });
  const dosyaBekliyor = new Promise((resolve) => { dosyayiBitir = resolve; });
  const a = { _id: 'A', ad: 'İşlem A', istenenEvraklar: [{ ad: 'Belge A' }] };
  const b = { _id: 'B', ad: 'İşlem B', istenenEvraklar: [{ ad: 'Belge B' }] };
  svc.turler.mockResolvedValue([a, b]); svc.turDetay.mockImplementation((id) => id === 'A' ? Promise.resolve(a) : turBekliyor);
  svc.turOrnekYukle.mockReturnValue(dosyaBekliyor);
  render(<MemoryRouter><Yonetim /></MemoryRouter>);
  await screen.findByLabelText('Belge A örnek ekle');
  fireEvent.click(screen.getByRole('button', { name: /İşlem B/ }));
  fireEvent.change(screen.getByLabelText('Belge A örnek ekle'), { target: { files: [new File(['x'], 'A-ornek.pdf')] } });
  if (zaman === 'yükleme sırasında') {
    await act(async () => { turuBitir(b); await turBekliyor; });
    expect(screen.getByLabelText('Evrak adı')).toHaveValue('Belge A');
  }
  await act(async () => { dosyayiBitir({ dosyaAdi: 'A-ornek.pdf', filePath: 'A-ornek.pdf' }); await dosyaBekliyor; });
  if (zaman === 'yüklemeden sonra') await act(async () => { turuBitir(b); await turBekliyor; });
  expect(screen.getByLabelText('Evrak adı')).toHaveValue('Belge A');
  expect(screen.getByText('A-ornek.pdf')).toBeInTheDocument();
});


test('geciken şablon kaydı sırasında yeni örnek yüklenerek kayıttaki formun ezilmesi önlenir', async () => {
  let bitir;
  const bekliyor = new Promise((resolve) => { bitir = resolve; });
  const tur = { _id: 'A', ad: 'İşlem A', istenenEvraklar: [{ ad: 'Belge A' }] };
  svc.turler.mockResolvedValue([tur]); svc.turDetay.mockResolvedValue(tur); svc.turGuncelle.mockReturnValue(bekliyor);
  render(<MemoryRouter><Yonetim /></MemoryRouter>);
  await screen.findByLabelText('Belge A örnek ekle');
  fireEvent.click(screen.getByRole('button', { name: 'Kaydet' }));
  expect(screen.getByLabelText('Belge A örnek ekle')).toBeDisabled();
  expect(screen.getByLabelText('Evrak adı')).toBeDisabled();
  expect(screen.getByRole('button', { name: /İşlem A/ })).toHaveAttribute('aria-disabled', 'true');
  await act(async () => { bitir(tur); await bekliyor; });
  await waitFor(() => expect(screen.getByLabelText('Belge A örnek ekle')).toBeEnabled());
});
