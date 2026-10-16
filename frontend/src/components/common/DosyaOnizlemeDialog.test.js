import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { useMediaQuery } from '@mui/material';
import DosyaOnizlemeDialog, { onizlemeTuru } from './DosyaOnizlemeDialog';
import { blobVerisi, pdfKutuphaneAl } from '../../utils/pdfOnizleme';

jest.mock('@mui/material', () => ({ ...jest.requireActual('@mui/material'), useMediaQuery: jest.fn() }));
jest.mock('../../utils/pdfOnizleme', () => ({
  pdfVarlikYolu: '/pdfjs/test/',
  pdfKutuphaneAl: jest.fn(),
  blobVerisi: jest.fn(async () => new Uint8Array([37, 80, 68, 70]))
}));

const createObjectURL = URL.createObjectURL;
const revokeObjectURL = URL.revokeObjectURL;
let sayfa;
let destroy;
let getDocument;
let anchorClick;

beforeEach(() => {
  jest.clearAllMocks();
  jest.spyOn(console, 'error').mockImplementation(() => {});
  useMediaQuery.mockReturnValue(false);
  URL.createObjectURL = jest.fn(() => 'blob:yerel-evrak');
  URL.revokeObjectURL = jest.fn();
  anchorClick = jest.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
  jest.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue({});
  sayfa = {
    getViewport: ({ scale }) => ({ width: 600 * scale, height: 800 * scale }),
    render: jest.fn(() => ({ promise: Promise.resolve(), cancel: jest.fn() }))
  };
  destroy = jest.fn(async () => {});
  getDocument = jest.fn(() => ({
    promise: Promise.resolve({ numPages: 2, getPage: jest.fn(async () => sayfa) }), destroy
  }));
  pdfKutuphaneAl.mockResolvedValue({ getDocument });
  blobVerisi.mockResolvedValue(new Uint8Array([37, 80, 68, 70]));
});

afterEach(() => {
  jest.restoreAllMocks();
  URL.createObjectURL = createObjectURL;
  URL.revokeObjectURL = revokeObjectURL;
});

test('PDF yetkili yükleyiciden alınır, canvas sayfaları gezinilir ve kapatılınca kaynaklar bırakılır', async () => {
  const dosya = { ad: 'Başvuru.pdf', mimeType: 'application/pdf', yukle: jest.fn(async () => ({ data: new Blob(['%PDF'], { type: 'application/pdf' }) })) };
  const { rerender } = render(<DosyaOnizlemeDialog dosya={dosya} onClose={() => {}} />);
  expect(await screen.findByText('Sayfa 1 / 2')).toBeInTheDocument();
  await waitFor(() => expect(sayfa.render).toHaveBeenCalled());
  expect(dosya.yukle).toHaveBeenCalledWith(expect.any(AbortSignal), false);
  expect(getDocument).toHaveBeenCalledWith(expect.objectContaining({
    data: expect.any(Uint8Array), isEvalSupported: false,
    cMapUrl: '/pdfjs/test/cmaps/', standardFontDataUrl: '/pdfjs/test/standard_fonts/'
  }));
  fireEvent.click(screen.getByRole('button', { name: 'Sonraki' }));
  expect(await screen.findByText('Sayfa 2 / 2')).toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Sonraki' })).toBeDisabled();
  rerender(<DosyaOnizlemeDialog dosya={null} onClose={() => {}} />);
  await waitFor(() => expect(destroy).toHaveBeenCalled());
  expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:yerel-evrak');
  expect(dosya.yukle.mock.calls[0][0].aborted).toBe(true);
});

test('görsel mobilde tam ekran diyalogda gösterilir; indirme kendiliğinden başlamaz', async () => {
  useMediaQuery.mockReturnValue(true);
  const dosya = { ad: 'Fatura.png', mimeType: 'image/png', yukle: jest.fn(async () => ({ data: new Blob(['png'], { type: 'image/png' }) })) };
  render(<DosyaOnizlemeDialog dosya={dosya} onClose={() => {}} />);
  const img = await screen.findByRole('img', { name: 'Fatura.png' });
  expect(img).toHaveAttribute('src', 'blob:yerel-evrak');
  expect(screen.getByRole('dialog')).toHaveClass('MuiDialog-paperFullScreen');
  expect(anchorClick).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole('button', { name: 'İndir' }));
  expect(anchorClick).toHaveBeenCalledTimes(1);
  expect(dosya.yukle).toHaveBeenCalledTimes(1);
});

test('Office belgesi dış sağlayıcıya gönderilmez; sadece açık İndir eylemi dosyayı alır', async () => {
  const dosya = { ad: 'Makine.xlsx', mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', yukle: jest.fn(async () => new Blob(['excel'])) };
  render(<DosyaOnizlemeDialog dosya={dosya} onClose={() => {}} />);
  expect(await screen.findByText(/Bu dosya türü uygulama içinde görüntülenemiyor/)).toBeInTheDocument();
  expect(dosya.yukle).not.toHaveBeenCalled();
  expect(pdfKutuphaneAl).not.toHaveBeenCalled();
  expect(document.querySelector('iframe')).toBeNull();
  fireEvent.click(screen.getByRole('button', { name: 'İndir' }));
  await waitFor(() => expect(anchorClick).toHaveBeenCalledTimes(1));
  expect(dosya.yukle).toHaveBeenCalledWith(expect.any(AbortSignal), true);
});

test('başarısız dosya isteği görünür hata ve yeniden deneme sunar', async () => {
  const dosya = { ad: 'Belge.png', mimeType: 'image/png', yukle: jest.fn().mockRejectedValueOnce(new Error('401')).mockResolvedValueOnce(new Blob(['png'], { type: 'image/png' })) };
  render(<DosyaOnizlemeDialog dosya={dosya} onClose={() => {}} />);
  expect(await screen.findByText(/Dosya alınamadı/)).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Yeniden dene' }));
  expect(await screen.findByRole('img', { name: 'Belge.png' })).toBeInTheDocument();
});

test('parolalı PDF için anlaşılır mesaj ve indirerek açma seçeneği kalır', async () => {
  getDocument.mockImplementation(() => ({ promise: Promise.reject({ name: 'PasswordException' }), destroy }));
  const dosya = { ad: 'Korumalı.pdf', mimeType: 'application/pdf', yukle: jest.fn(async () => new Blob(['pdf'], { type: 'application/pdf' })) };
  render(<DosyaOnizlemeDialog dosya={dosya} onClose={() => {}} />);
  expect(await screen.findByText(/Bu PDF parola korumalı/)).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'İndir' }));
  expect(anchorClick).toHaveBeenCalledTimes(1);
});

test('geç dönen yanıt kapatılan dosyayı yeniden açmaz veya blob kaynağı oluşturmaz', async () => {
  let bitir;
  const dosya = { ad: 'Belge.png', mimeType: 'image/png', yukle: jest.fn(() => new Promise((resolve) => { bitir = resolve; })) };
  const { rerender } = render(<DosyaOnizlemeDialog dosya={dosya} onClose={() => {}} />);
  rerender(<DosyaOnizlemeDialog dosya={null} onClose={() => {}} />);
  bitir(new Blob(['png'], { type: 'image/png' }));
  await waitFor(() => expect(dosya.yukle.mock.calls[0][0].aborted).toBe(true));
  expect(URL.createObjectURL).not.toHaveBeenCalled();
});

test('SVG ve HTML görüntülenmez; genel MIME kayıtlı PDF türünü kaybettirmez', () => {
  expect(onizlemeTuru({ ad: 'foto.svg', mimeType: 'image/svg+xml' })).toBe('');
  expect(onizlemeTuru({ ad: 'belge.pdf', mimeType: 'text/html' })).toBe('');
  expect(onizlemeTuru({ ad: 'Belge 17.10.2026', mimeType: 'application/pdf' }, new Blob(['pdf']))).toBe('pdf');
  expect(onizlemeTuru({ ad: 'belge.pdf' })).toBe('pdf');
});
