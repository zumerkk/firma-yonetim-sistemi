import React, { act } from 'react';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import ExcelJS from 'exceljs';
import svc from '../../services/tesvikMakineService';
import GerceklesmeOzeti from './GerceklesmeOzeti';
import { formatMoney } from './helpers';

jest.mock('../../services/tesvikMakineService', () => ({ getGerceklesme: jest.fn() }));

const ozet = {
  gruplar: [{
    id: 'arazi',
    baslik: 'Arazi-Arsa Bedeli Gerçekleşme Bilgisi',
    toplamEtiketi: 'Toplam Arazi-Arsa Gerçekleşmesi',
    satirlar: [{ id: 'arazi', etiket: 'Arazi-Arsa Gerçekleşmesi', tutar: 500.50 }],
    toplam: 500.50
  }],
  kalemler: [{ grup: 'Arazi - Arsa', kategori: 'Arazi Giderleri', tarih: '2026-11-12',
    no: '0000123', icerik: 'Arsa alımı', adet: 2.5, tutar: 500.50 }],
  yerli: 1000,
  ithal: 2000,
  kurFarki: 80,
  toplam: 3580.50,
  cevrilmemisIthalKalemSayisi: 1
};

beforeEach(() => {
  svc.getGerceklesme.mockReset().mockResolvedValue(ozet);
});

test('finansal özeti TL olarak gösterir ve elle veya üst sekmeden yeniler', async () => {
  svc.getGerceklesme
    .mockResolvedValueOnce(ozet)
    .mockRejectedValueOnce(new Error('Bağlantı hatası'))
    .mockResolvedValueOnce({ ...ozet, toplam: 4200, cevrilmemisIthalKalemSayisi: 0 });

  const { rerender } = render(<GerceklesmeOzeti tesvikModel="Tesvik" tesvikId="belge" />);
  expect(screen.getByRole('progressbar', { name: 'Finansal tutarlar yükleniyor' })).toBeInTheDocument();
  const tablo = within(await screen.findByRole('table', { name: 'Gerçekleşme özeti' }));
  expect(tablo.getByRole('rowheader', { name: 'Toplam Arazi-Arsa Gerçekleşmesi' })).toBeInTheDocument();
  expect(tablo.getByRole('rowheader', { name: 'İthal Gerçekleşmesi' })).toBeInTheDocument();
  expect(tablo.getByRole('rowheader', { name: 'Kur Farkı Faturası Gerçekleşmesi' })).toBeInTheDocument();
  expect(tablo.getByText(formatMoney(3580.50))).toBeInTheDocument();
  expect(screen.getByRole('alert')).toHaveTextContent('TL karşılığı girilmemiş 1 ithal kalem');
  expect(svc.getGerceklesme).toHaveBeenCalledWith('Tesvik', 'belge', { signal: expect.any(AbortSignal) });

  await act(async () => { fireEvent.click(screen.getByRole('button', { name: 'Finansal Tutarları Getir' })); });
  expect(await screen.findByRole('alert')).toHaveTextContent('Finansal tutarlar getirilemedi.');
  expect(screen.getByRole('button', { name: 'Tüm Gerçekleşme Listesi' })).toBeDisabled();

  rerender(<GerceklesmeOzeti tesvikModel="Tesvik" tesvikId="belge" yenileme={1} />);
  expect(await screen.findByText(formatMoney(4200))).toBeInTheDocument();
  expect(screen.queryByRole('alert')).toBeNull();
  expect(svc.getGerceklesme).toHaveBeenCalledTimes(3);
});

test('Excel dosyasına özeti ve gerçekleşme kalemlerini sayısal tutarla yazar', async () => {
  const olustur = window.URL.createObjectURL;
  const kaldir = window.URL.revokeObjectURL;
  window.URL.createObjectURL = jest.fn(() => 'blob:excel');
  window.URL.revokeObjectURL = jest.fn();
  const tikla = jest.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});

  try {
    render(<GerceklesmeOzeti tesvikModel="Tesvik" tesvikId="belge" />);
    await screen.findByRole('table', { name: 'Gerçekleşme özeti' });
    await act(async () => { fireEvent.click(screen.getByRole('button', { name: 'Tüm Gerçekleşme Listesi' })); });
    await waitFor(() => expect(tikla).toHaveBeenCalledTimes(1));
    expect(tikla.mock.instances[0].download).toBe('Tüm Gerçekleşme Listesi.xlsx');
    const blob = window.URL.createObjectURL.mock.calls[0][0];
    const buffer = await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsArrayBuffer(blob);
    });
    const kitap = new ExcelJS.Workbook();
    await kitap.xlsx.load(buffer);
    const [ozetSayfasi, kalemler] = kitap.worksheets;
    expect(ozetSayfasi.name).toBe('Gerçekleşme Özeti');
    expect(ozetSayfasi.getRow(7).values.slice(1)).toEqual(['TOPLAM GERÇEKLEŞEN SON TUTAR', 'Tutar', 3580.50]);
    expect(ozetSayfasi.getCell('A8').value).toMatch(/TL karşılığı girilmemiş 1 ithal kalem/);
    expect(kalemler.name).toBe('Gerçekleşme Kalemleri');
    expect(kalemler.getRow(2).values.slice(1)).toEqual([
      'Arazi - Arsa', 'Arazi Giderleri', new Date('2026-11-12'), '0000123', 'Arsa alımı', 2.5, 500.50
    ]);
  } finally {
    tikla.mockRestore();
    window.URL.createObjectURL = olustur;
    window.URL.revokeObjectURL = kaldir;
  }
});
