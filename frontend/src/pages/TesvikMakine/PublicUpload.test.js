import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import PublicUpload from './PublicUpload';
import svc from '../../services/tesvikMakineService';

jest.mock('../../services/tesvikMakineService', () => ({ __esModule: true, default: {
  publicInfo: jest.fn(), publicUpload: jest.fn()
} }));
jest.mock('../../services/islemEvrakService', () => ({ __esModule: true, default: { publicBilgi: jest.fn() } }));
jest.mock('../../hooks/usePanoDosyaYapistir', () => ({ __esModule: true, default: jest.fn() }));

const bilgi = {
  firmaAdi: 'Test Firma', belgeNo: '568825', siraNo: 913, makineAdi: 'Pompa', listType: 'local',
  documentTypes: [{ key: 'fatura_taslak', label: 'Fatura Taslağı' }, { key: 'fatura_onayli', label: 'Onaylı Fatura' }],
  varsayilanEvrakTuru: 'fatura_onayli', allowedExtensions: ['.pdf'], maxUploadMB: 100,
  fatura: { kalemSayisi: 1, toplamAdet: 3, toplamTutar: 1250, paraBirimi: 'TRY' }
};
const ac = (query = '') => render(<MemoryRouter initialEntries={[`/upload/tesvik/TOKEN${query}`]}>
  <Routes><Route path="/upload/tesvik/:token" element={<PublicUpload />} /></Routes>
</MemoryRouter>);

beforeEach(() => { jest.clearAllMocks(); svc.publicInfo.mockResolvedValue(bilgi); svc.publicUpload.mockResolvedValue({}); });

test('onay mailinin bağlantı türü sunucuya taşınır ve dosya onaylı fatura olarak gönderilir', async () => {
  const { container } = ac('?evrakTuru=fatura_onayli');
  await screen.findByText('Onaylı Fatura');
  expect(svc.publicInfo).toHaveBeenCalledWith('TOKEN', { evrakTuru: 'fatura_onayli' });
  expect(screen.getByText(/Kayıtlı fatura: 1 kalem · 3 adet/)).toBeInTheDocument();
  fireEvent.change(container.querySelector('input[type="file"]'), {
    target: { files: [new File(['fatura'], 'onayli.pdf', { type: 'application/pdf' })] }
  });
  fireEvent.click(screen.getByRole('button', { name: 'Gönder' }));
  await waitFor(() => expect(svc.publicUpload).toHaveBeenCalled());
  expect(svc.publicUpload.mock.calls[0][1].get('documentType')).toBe('fatura_onayli');
  await screen.findByText('Dosyanız başarıyla yüklendi');
});

test('eski sorgu parametresiz linkler sunucunun belirlediği türle açılır', async () => {
  ac();
  await screen.findByText('Onaylı Fatura');
  expect(svc.publicInfo).toHaveBeenCalledWith('TOKEN', {});
});
