import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { MemoryRouter } from 'react-router-dom';
import Panel from './IslemEvrakTalepPaneli';
import svc from '../../services/islemEvrakService';

jest.mock('../../services/islemEvrakService', () => ({
  __esModule: true, default: { talepDetay: jest.fn(), turDetay: jest.fn(), talepGuncelle: jest.fn(), mailOnizle: jest.fn(), dosyaIndir: jest.fn() }
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
  // İçerik artık biçimli metin editörü (contentEditable, aria-label "İçerik") — müşteri 13.10.2026
  expect(await screen.findByLabelText('İçerik')).toHaveTextContent('Taslak metni');
  expect(svc.talepGuncelle).toHaveBeenCalledWith('t1', expect.objectContaining({ talepMetni: 'Belgeleri hazırlayınız.', istenenEvraklar: expect.any(Array) }));
  const editor = screen.getByLabelText('İçerik');
  editor.innerHTML = 'Elle <b>düzenlenen</b> mail';
  fireEvent.input(editor);
  fireEvent.blur(editor); // değer beklemeden üst bileşene geçer
  fireEvent.click(screen.getByRole('button', { name: 'Evraklara dön' }));
  await waitFor(() => expect(screen.queryByLabelText('İçerik')).not.toBeInTheDocument());
  fireEvent.click(screen.getByRole('button', { name: 'Mail Taslağı Hazırla' }));
  expect(await screen.findByLabelText('İçerik')).toHaveTextContent('Elle düzenlenen mail');
  expect(screen.getByLabelText('İçerik')).toContainHTML('<b>düzenlenen</b>');
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

test('gelen evrakın Aç düğmesi dosyayı indirmeden uygulama içinde gösterir', async () => {
  svc.talepDetay.mockResolvedValue({ ...talep, yuklenenEvraklar: [{
    _id: 'dosya1', orijinalAd: 'Fatura.png', mimeType: 'image/png', yuklemeTarihi: '2026-10-17T10:00:00Z'
  }] });
  svc.dosyaIndir.mockResolvedValue({ data: new Blob(['png'], { type: 'image/png' }) });
  const eskiOlustur = URL.createObjectURL;
  const eskiBirak = URL.revokeObjectURL;
  URL.createObjectURL = jest.fn(() => 'blob:guvenli-evrak');
  URL.revokeObjectURL = jest.fn();
  const indir = jest.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
  const pencere = jest.spyOn(window, 'open').mockImplementation(() => {});
  try {
    const { unmount } = render(<MemoryRouter><Panel talepId="t1" gomulu /></MemoryRouter>);
    fireEvent.click(await screen.findByRole('button', { name: 'Fatura.png önizle' }));
    expect(await screen.findByRole('img', { name: 'Fatura.png' })).toBeInTheDocument();
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(svc.dosyaIndir).toHaveBeenCalledWith('t1', 'dosya1', expect.any(AbortSignal));
    expect(indir).not.toHaveBeenCalled();
    expect(pencere).not.toHaveBeenCalled();
    unmount();
  } finally {
    indir.mockRestore(); pencere.mockRestore();
    URL.createObjectURL = eskiOlustur; URL.revokeObjectURL = eskiBirak;
  }
});
