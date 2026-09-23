import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { MemoryRouter } from 'react-router-dom';
import Panel from './IslemEvrakTalepPaneli';
import svc from '../../services/islemEvrakService';

jest.mock('../../services/islemEvrakService', () => ({
  __esModule: true, default: { talepDetay: jest.fn(), turDetay: jest.fn(), talepGuncelle: jest.fn(), mailOnizle: jest.fn() }
}));

const talep = { _id: 't1', firmaAdi: 'Firma', islemTuru: 'tur1', dosyaTakip: 'dt1',
  istenenEvraklar: [{ _id: 'e1', ad: 'Vergi Levhası', zorunlu: true }], yuklenenEvraklar: [], mailAlicilar: ['firma@test.com'] };

beforeEach(() => {
  jest.clearAllMocks();
  svc.talepDetay.mockResolvedValue(talep);
  svc.turDetay.mockResolvedValue({});
  svc.talepGuncelle.mockImplementation(async (_id, body) => ({ ...talep, ...body }));
  svc.mailOnizle.mockResolvedValue({ to: ['firma@test.com'], cc: [], subject: 'Evrak Talebi', body: 'Taslak metni', smtpConfigured: true });
});

test('açılışta mail üretmez; metin ve seçimler kaydedildikten sonra ayrı taslak ekranı açılır', async () => {
  render(<MemoryRouter><Panel talepId="t1" gomulu /></MemoryRouter>);
  const input = await screen.findByLabelText('Talep metni');
  expect(input).toHaveAttribute('maxlength', '3000');
  expect(svc.mailOnizle).not.toHaveBeenCalled();
  expect(screen.queryByLabelText('İçerik')).not.toBeInTheDocument();
  fireEvent.change(input, { target: { value: 'Belgeleri hazırlayınız.' } });
  fireEvent.click(screen.getByRole('button', { name: 'Mail Taslağı Hazırla' }));
  expect(await screen.findByLabelText('İçerik')).toHaveValue('Taslak metni');
  expect(svc.talepGuncelle).toHaveBeenCalledWith('t1', expect.objectContaining({ talepMetni: 'Belgeleri hazırlayınız.', istenenEvraklar: expect.any(Array) }));
  fireEvent.change(screen.getByLabelText('İçerik'), { target: { value: 'Elle düzenlenen mail' } });
  fireEvent.click(screen.getByRole('button', { name: 'Evraklara dön' }));
  await waitFor(() => expect(screen.queryByLabelText('İçerik')).not.toBeInTheDocument());
  fireEvent.click(screen.getByRole('button', { name: 'Mail Taslağı Hazırla' }));
  expect(await screen.findByLabelText('İçerik')).toHaveValue('Elle düzenlenen mail');
  expect(svc.mailOnizle).toHaveBeenCalledTimes(1);
});

test('kayıt başarısızsa taslak açılmaz, metin ekranda kalır', async () => {
  svc.talepGuncelle.mockRejectedValue(new Error('Kayıt başarısız'));
  render(<MemoryRouter><Panel talepId="t1" gomulu /></MemoryRouter>);
  fireEvent.change(await screen.findByLabelText('Talep metni'), { target: { value: 'Korunacak metin' } });
  fireEvent.click(screen.getByRole('button', { name: 'Mail Taslağı Hazırla' }));
  expect(await screen.findByText('Kayıt başarısız')).toBeInTheDocument();
  expect(screen.getByLabelText('Talep metni')).toHaveValue('Korunacak metin');
  expect(svc.mailOnizle).not.toHaveBeenCalled();
});
