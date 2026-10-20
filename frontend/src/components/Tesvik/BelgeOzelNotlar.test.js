import React from 'react';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import BelgeOzelNotlar from './BelgeOzelNotlar';
import api from '../../utils/axios';
import { useAuth } from '../../contexts/AuthContext';
jest.mock('../../utils/axios', () => ({ __esModule: true, default: { get: jest.fn(), post: jest.fn(), delete: jest.fn() } }));
jest.mock('../../contexts/AuthContext', () => ({ useAuth: jest.fn() }));

beforeEach(() => {
  jest.clearAllMocks();
  useAuth.mockReturnValue({ user: { rol: 'kullanici' } });
});

test('not yazarı ve tarihi görünür, ekleme yalnız not API’sine gider ve yazılan not kalıcı yanıtla gösterilir', async () => {
  api.get.mockResolvedValue({ data: { data: [{ _id: '1', metin: 'Önceki not', kullaniciAdi: 'Ayşe', createdAt: '2026-10-16T09:30:00Z' }] } });
  api.post.mockResolvedValue({ data: { data: { _id: '2', metin: 'Yeni özel not', kullaniciAdi: 'Berk', createdAt: '2026-10-17T09:00:00Z' } } });
  render(<BelgeOzelNotlar tesvikModel="YeniTesvik" tesvikId="belge1" />);
  expect(await screen.findByText('Önceki not')).toBeInTheDocument();
  expect(screen.getByText(/Ayşe/)).toHaveTextContent('12:30:00');
  fireEvent.change(screen.getByLabelText('Özel not'), { target: { value: 'Yeni özel not' } });
  fireEvent.click(screen.getByRole('button', { name: 'Not Ekle' }));
  expect(await screen.findByText('Yeni özel not')).toBeInTheDocument();
  await waitFor(() => expect(api.post).toHaveBeenCalledWith('/musteri-belge/yonetim/YeniTesvik/belge1/notlar', { metin: 'Yeni özel not' }));
  await waitFor(() => expect(screen.getByLabelText('Özel not')).toHaveValue(''));
});

test.each(['Tesvik', 'YeniTesvik'])('%s notu yalnızca onaydan ve başarılı API yanıtından sonra kaldırılır', async (tesvikModel) => {
  api.get.mockResolvedValue({ data: { data: [{ _id: 'not-1', metin: 'Silinecek özel not', kullaniciAdi: 'Ayşe', createdAt: '2026-10-16' }] } });
  let tamamla;
  api.delete.mockImplementation(() => new Promise((resolve) => { tamamla = resolve; }));
  render(<BelgeOzelNotlar tesvikModel={tesvikModel} tesvikId="belge1" />);
  await screen.findByText('Silinecek özel not');
  fireEvent.click(screen.getByRole('button', { name: 'Notu sil' }));
  expect(api.delete).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole('button', { name: 'Vazgeç' }));
  await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
  expect(screen.getByText('Silinecek özel not')).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Notu sil' }));
  fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Sil' }));
  expect(api.delete).toHaveBeenCalledWith(`/musteri-belge/yonetim/${tesvikModel}/belge1/notlar/not-1`);
  expect(screen.getByRole('button', { name: 'Siliniyor…' })).toBeDisabled();
  expect(screen.getAllByText('Silinecek özel not').length).toBeGreaterThan(0);
  tamamla({ data: { success: true } });
  expect(await screen.findByText('Henüz özel not yok.')).toBeInTheDocument();
});

test('silme hatasında not korunur ve kullanıcı tekrar deneyebilir', async () => {
  api.get.mockResolvedValue({ data: { data: [{ _id: 'not-1', metin: 'Korunacak not', createdAt: '2026-10-16' }] } });
  api.delete.mockRejectedValue({ response: { status: 403, data: { message: 'Silme yetkiniz yok.' } } });
  render(<BelgeOzelNotlar tesvikModel="Tesvik" tesvikId="belge1" />);
  fireEvent.click(await screen.findByRole('button', { name: 'Notu sil' }));
  fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Sil' }));
  expect(await screen.findByText('Silme yetkiniz yok.')).toBeInTheDocument();
  expect(within(screen.getByRole('dialog')).getByRole('button', { name: 'Sil' })).toBeEnabled();
  expect(screen.getAllByText('Korunacak not')).toHaveLength(2);
});

test('readonly kullanıcı notları görür, ekleme ve silme kontrollerini görmez', async () => {
  useAuth.mockReturnValue({ user: { rol: 'readonly' } });
  api.get.mockResolvedValue({ data: { data: [{ _id: 'not-1', metin: 'Okunabilir not', createdAt: '2026-10-16' }] } });
  render(<BelgeOzelNotlar tesvikModel="YeniTesvik" tesvikId="belge1" />);
  expect(await screen.findByText('Okunabilir not')).toBeInTheDocument();
  expect(screen.queryByRole('button', { name: 'Notu sil' })).not.toBeInTheDocument();
  expect(screen.queryByRole('button', { name: 'Not Ekle' })).not.toBeInTheDocument();
});

test('silme beklerken belge değişirse eski yanıt yeni belgenin notlarını değiştirmez', async () => {
  const eski = { _id: 'not-1', metin: 'Eski belge notu', createdAt: '2026-10-16' };
  const yeni = { _id: 'not-2', metin: 'Yeni belge notu', createdAt: '2026-10-17' };
  api.get.mockResolvedValueOnce({ data: { data: [eski] } }).mockResolvedValueOnce({ data: { data: [yeni] } });
  let tamamla;
  api.delete.mockImplementation(() => new Promise((resolve) => { tamamla = resolve; }));
  const { rerender } = render(<BelgeOzelNotlar tesvikModel="Tesvik" tesvikId="belge1" />);
  fireEvent.click(await screen.findByRole('button', { name: 'Notu sil' }));
  fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Sil' }));
  rerender(<BelgeOzelNotlar tesvikModel="Tesvik" tesvikId="belge2" />);
  expect(await screen.findByText('Yeni belge notu')).toBeInTheDocument();
  tamamla({});
  await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
  expect(screen.getByText('Yeni belge notu')).toBeInTheDocument();
});
