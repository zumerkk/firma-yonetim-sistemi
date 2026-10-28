import React from 'react';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import BelgeTakipEvrakTalepleri from './BelgeTakipEvrakTalepleri';
import svc from '../../services/islemEvrakService';

jest.mock('../../services/islemEvrakService', () => ({
  __esModule: true, default: { talepler: jest.fn(), turler: jest.fn(), talepOlustur: jest.fn(), talepSil: jest.fn() }
}));
// Talep ekranının kendisi bu testin konusu değil; hangi talebin açıldığını göstermesi yeter
jest.mock('./IslemEvrakTalepPaneli', () => ({ talepId }) => <div>Talep ekranı {talepId}</div>);

const firma = { _id: 'f1', tamUnvan: 'ÇINAR GIDA A.Ş.' };
const turler = [
  { _id: 'tur-vize', ad: 'Teşvik Kapama Tamamlama Vizesi', istenenEvraklar: [{ ad: 'Kapama dilekçesi' }] },
  { _id: 'tur-yeni', ad: 'Yeni Belge Talebi', istenenEvraklar: [{ ad: 'Vergi levhası' }, { ad: 'İmza sirküleri' }] },
  { _id: 'tur-sgk', ad: 'SGK Desteği Yararlanıcı Bilgileri', istenenEvraklar: [{ ad: 'SGK listesi' }] }
];

beforeEach(() => {
  jest.clearAllMocks();
  svc.talepler.mockResolvedValue({ data: [] });
  svc.turler.mockResolvedValue(turler);
});

test('Yeni Evrak Talebi işlem türünü sorar; seçilen türle bu Belge Takip talebine bağlı talep açılır', async () => {
  const olusan = { _id: 'it1', islemTuruAdi: 'SGK Desteği Yararlanıcı Bilgileri', durum: 'taslak', istenenSayisi: 1, gelenSayisi: 0 };
  svc.talepOlustur.mockResolvedValue(olusan);
  render(<BelgeTakipEvrakTalepleri dosyaTakipId="dt1" firma={firma} />);
  expect(await screen.findByText('Bu talepten açılmış evrak talebi yok.')).toBeInTheDocument();

  fireEvent.click(screen.getByRole('button', { name: 'Yeni Evrak Talebi' }));
  // Sormadan talep açılmaz (23.09–28.10 arası düğme doğrudan "Yeni Belge Talebi" açıyordu)
  expect(svc.talepOlustur).not.toHaveBeenCalled();
  const pencere = await screen.findByRole('dialog');
  expect(within(pencere).getByLabelText('Firma')).toHaveValue('ÇINAR GIDA A.Ş.');
  await waitFor(() => expect(svc.turler).toHaveBeenCalled());

  fireEvent.mouseDown(within(pencere).getByLabelText('İşlem Türü'));
  const secenekler = screen.getAllByRole('option').map((o) => o.textContent);
  expect(secenekler).toEqual(turler.map((t) => t.ad));
  fireEvent.click(screen.getByRole('option', { name: 'SGK Desteği Yararlanıcı Bilgileri' }));

  svc.talepler.mockResolvedValue({ data: [olusan] });
  fireEvent.click(within(pencere).getByRole('button', { name: 'Talebi Oluştur' }));
  await waitFor(() => expect(svc.talepOlustur).toHaveBeenCalledWith(expect.objectContaining({
    firmaId: 'f1', islemTuruId: 'tur-sgk', dosyaTakipId: 'dt1'
  })));
  // Oluşan talebin ekranı (istenen evraklar, mail) hemen açılır
  expect(await screen.findByText('Talep ekranı it1')).toBeInTheDocument();
});

test('Vazgeç talep açmaz', async () => {
  render(<BelgeTakipEvrakTalepleri dosyaTakipId="dt1" firma={firma} />);
  fireEvent.click(await screen.findByRole('button', { name: 'Yeni Evrak Talebi' }));
  fireEvent.click(within(await screen.findByRole('dialog')).getByRole('button', { name: 'Vazgeç' }));
  await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
  expect(svc.talepOlustur).not.toHaveBeenCalled();
});

test('firmasız talepte düğme kapalı', async () => {
  render(<BelgeTakipEvrakTalepleri dosyaTakipId="dt1" firma={null} />);
  expect(await screen.findByRole('button', { name: 'Yeni Evrak Talebi' })).toBeDisabled();
});
