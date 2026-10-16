import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import BelgeOzelNotlar from './BelgeOzelNotlar';
import api from '../../utils/axios';
jest.mock('../../utils/axios', () => ({ __esModule: true, default: { get: jest.fn(), post: jest.fn() } }));

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
