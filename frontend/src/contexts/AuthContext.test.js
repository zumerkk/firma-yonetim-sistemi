import React, { act } from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { AxiosError } from 'axios';
import { AuthProvider, useAuth } from './AuthContext';
import ProtectedRoute from '../components/Auth/ProtectedRoute';
import Login from '../pages/Auth/Login';
import api from '../utils/axios';
import { EXPIRED_MESSAGE, IDLE_MESSAGE, IDLE_TIMEOUT_MS, LAST_ACTIVITY_KEY, SESSION_MESSAGE_KEY } from '../utils/authSession';

const A = { adSoyad: 'Test Kullanıcı A' };
const B = { adSoyad: 'Test Kullanıcı B' };
const TOKEN_A = 'test-token-a';
const TOKEN_B = 'test-token-b';
const HOUR = IDLE_TIMEOUT_MS;
const MINUTE = 60_000;
const start = new Date('2026-01-01T09:00:00Z').getTime();
const adapter = api.defaults.adapter;

const ok = (config, data = {}) => ({ config, status: 200, data: { success: true, data } });
const httpError = (config, status) => new AxiosError(`HTTP ${status}`, 'ERR_BAD_REQUEST', config, undefined,
  { config, status, data: { message: 'İstek kabul edilmedi.' } });
const advance = async (ms) => act(async () => { jest.advanceTimersByTime(ms); });
const tabChange = async (key, value) => act(async () => {
  const oldValue = localStorage.getItem(key);
  if (value === null) localStorage.removeItem(key);
  else localStorage.setItem(key, value);
  window.dispatchEvent(new StorageEvent('storage', { key, oldValue, newValue: value, storageArea: localStorage }));
});

const PrivateScreen = () => {
  const { user, logout } = useAuth();
  return <><div>{user.adSoyad}</div><button onClick={logout}>Çıkış yap</button></>;
};

const open = (path = '/dashboard') => render(
  <MemoryRouter initialEntries={[path]} future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
    <AuthProvider>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/dashboard" element={<ProtectedRoute><PrivateScreen /></ProtectedRoute>} />
        <Route path="/evrak/test" element={<div>Müşteri yükleme ekranı</div>} />
      </Routes>
    </AuthProvider>
  </MemoryRouter>
);

beforeEach(() => {
  jest.useFakeTimers();
  jest.setSystemTime(start);
  localStorage.setItem('token', TOKEN_A);
  localStorage.setItem('user', JSON.stringify(A));
  localStorage.setItem(LAST_ACTIVITY_KEY, String(start));
  api.defaults.adapter = jest.fn(async (config) => {
    if (config.url === '/auth/profile') {
      return ok(config, { user: config.headers.get('Authorization') === `Bearer ${TOKEN_B}` ? B : A });
    }
    return ok(config);
  });
});

afterEach(() => {
  api.defaults.adapter = adapter;
  localStorage.clear();
  jest.useRealTimers();
});

test('bir saat hareketsizlikte girişe döner, odak ve arka plan istekleri süreyi uzatmaz', async () => {
  open();
  await screen.findByText(A.adSoyad);
  await advance(59 * MINUTE);
  await act(async () => {
    window.dispatchEvent(new Event('focus'));
    await api.get('/notifications/unread-count');
  });
  expect(localStorage.getItem(LAST_ACTIVITY_KEY)).toBe(String(start));
  expect(screen.getByText(A.adSoyad)).toBeInTheDocument();
  await advance(MINUTE);
  expect(await screen.findByText(IDLE_MESSAGE)).toBeInTheDocument();
  expect(screen.queryByText(A.adSoyad)).not.toBeInTheDocument();
  expect(localStorage.getItem('token')).toBeNull();
  expect(localStorage.getItem('user')).toBeNull();
  expect(localStorage.getItem(LAST_ACTIVITY_KEY)).toBeNull();
});

test('gerçek etkileşim süreyi uzatır, yoğun işaretçi hareketleri son zamanı tek yazıda paylaşır', async () => {
  open();
  await screen.findByText(A.adSoyad);
  await advance(59 * MINUTE);
  fireEvent.keyDown(window, { key: 'A' });
  const keyTime = Date.now();
  expect(localStorage.getItem(LAST_ACTIVITY_KEY)).toBe(String(keyTime));
  await advance(200);
  fireEvent.pointerMove(window);
  await advance(200);
  fireEvent.pointerMove(window);
  const moveTime = Date.now();
  expect(localStorage.getItem(LAST_ACTIVITY_KEY)).toBe(String(keyTime));
  await advance(600);
  expect(localStorage.getItem(LAST_ACTIVITY_KEY)).toBe(String(moveTime));
  await advance(HOUR - 601);
  expect(screen.getByText(A.adSoyad)).toBeInTheDocument();
  await advance(1);
  expect(await screen.findByText(IDLE_MESSAGE)).toBeInTheDocument();
});

test('başka sekmedeki hareket storage olayı gecikse bile kapanmayı erteler', async () => {
  open();
  await screen.findByText(A.adSoyad);
  await advance(59 * MINUTE);
  localStorage.setItem(LAST_ACTIVITY_KEY, String(Date.now()));
  await advance(MINUTE);
  expect(screen.getByText(A.adSoyad)).toBeInTheDocument();
  await advance(59 * MINUTE);
  expect(await screen.findByText(IDLE_MESSAGE)).toBeInTheDocument();
});

test.each(['pageshow', 'pointerdown'])('uykudan sonra %s eski oturumu canlandırmaz', async (event) => {
  open();
  await screen.findByText(A.adSoyad);
  jest.setSystemTime(start + HOUR + 30_000);
  await act(async () => { window.dispatchEvent(new Event(event)); });
  expect(await screen.findByText(IDLE_MESSAGE)).toBeInTheDocument();
});

test('sayfa yenilenirken süresi geçmiş oturum profil isteği yapmadan kapanır', async () => {
  localStorage.setItem(LAST_ACTIVITY_KEY, String(start - HOUR));
  open();
  expect(await screen.findByText(IDLE_MESSAGE)).toBeInTheDocument();
  expect(api.defaults.adapter).not.toHaveBeenCalled();
});

test('uyanış olayı gelmeden başlayan korumalı istek süresi geçen tokenı göndermez', async () => {
  open();
  await screen.findByText(A.adSoyad);
  jest.setSystemTime(start + HOUR);
  const requests = api.defaults.adapter.mock.calls.length;
  await act(async () => { await expect(api.get('/firma')).rejects.toThrow(IDLE_MESSAGE); });
  expect(api.defaults.adapter).toHaveBeenCalledTimes(requests);
  expect(await screen.findByText(IDLE_MESSAGE)).toBeInTheDocument();
});

test('eski kullanıcı önbelleği token yoksa korumalı ekranı açmaz', async () => {
  localStorage.removeItem('token');
  open();
  expect(await screen.findByLabelText('E-posta Adresi')).toBeInTheDocument();
  expect(screen.queryByText(A.adSoyad)).not.toBeInTheDocument();
  expect(api.defaults.adapter).not.toHaveBeenCalled();
});

test('giriş formu yeni oturumu başlatır ve önceki kapanma nedenini temizler', async () => {
  localStorage.removeItem('token');
  localStorage.setItem(SESSION_MESSAGE_KEY, IDLE_MESSAGE);
  api.defaults.adapter.mockImplementationOnce(async (config) => {
    expect(config.url).toBe('/auth/login');
    expect(config.headers.has('Authorization')).toBe(false);
    return ok(config, { user: B, token: TOKEN_B });
  });
  open('/login');
  await screen.findByText(IDLE_MESSAGE);
  fireEvent.change(screen.getByLabelText('E-posta Adresi'), { target: { value: 'test@example.test' } });
  fireEvent.change(screen.getByLabelText('Şifre'), { target: { value: 'deneme123' } });
  fireEvent.click(screen.getByRole('button', { name: 'Giriş Yap' }));
  expect(await screen.findByText(B.adSoyad)).toBeInTheDocument();
  expect(localStorage.getItem('token')).toBe(TOKEN_B);
  expect(localStorage.getItem(SESSION_MESSAGE_KEY)).toBeNull();
  expect(Number(localStorage.getItem(LAST_ACTIVITY_KEY))).toBeGreaterThanOrEqual(start);
});

test('başka sekmeden çıkış, sebebiyle birlikte korumalı ekrandan girişe döndürür', async () => {
  open();
  await screen.findByText(A.adSoyad);
  localStorage.setItem(SESSION_MESSAGE_KEY, IDLE_MESSAGE);
  await tabChange('token', null);
  expect(await screen.findByText(IDLE_MESSAGE)).toBeInTheDocument();
});

test('çıkış sunucu yanıtını beklemeden tarayıcıdaki oturumu kapatır', async () => {
  open();
  await screen.findByText(A.adSoyad);
  api.defaults.adapter.mockImplementationOnce(() => new Promise(() => {}));
  fireEvent.click(screen.getByRole('button', { name: 'Çıkış yap' }));
  expect(localStorage.getItem('token')).toBeNull();
  expect(await screen.findByLabelText('E-posta Adresi')).toBeInTheDocument();
});

test('korumalı isteğin 401 yanıtı oturumu sonlandırır ve nedenini gösterir', async () => {
  open();
  await screen.findByText(A.adSoyad);
  api.defaults.adapter.mockImplementationOnce(async (config) => { throw httpError(config, 401); });
  await act(async () => { await expect(api.get('/firma')).rejects.toMatchObject({ kullaniciMesaji: EXPIRED_MESSAGE }); });
  expect(await screen.findByText(EXPIRED_MESSAGE)).toBeInTheDocument();
  expect(localStorage.getItem('token')).toBeNull();
});

test('eski oturumun geciken 401 yanıtı başka sekmedeki yeni kullanıcıyı çıkarmaz', async () => {
  open();
  await screen.findByText(A.adSoyad);
  let failOld;
  api.defaults.adapter.mockImplementationOnce((config) => new Promise((resolve, reject) => {
    failOld = () => reject(httpError(config, 401));
  }));
  const pending = api.get('/firma').catch((error) => error);
  await waitFor(() => expect(failOld).toBeDefined());
  await tabChange('token', TOKEN_B);
  await screen.findByText(B.adSoyad);
  await act(async () => { failOld(); await pending; });
  expect(screen.getByText(B.adSoyad)).toBeInTheDocument();
  expect(localStorage.getItem('token')).toBe(TOKEN_B);
});

test('müşteri bağlantısı 401 döndürdüğünde personel oturumu ve açık sayfa korunur', async () => {
  open('/evrak/test');
  await waitFor(() => expect(api.defaults.adapter).toHaveBeenCalledTimes(1));
  api.defaults.adapter.mockImplementationOnce(async (config) => {
    expect(config.headers.has('Authorization')).toBe(false);
    throw httpError(config, 401);
  });
  await act(async () => { await expect(api.get('/islem-evrak/public/test')).rejects.toMatchObject({ response: { status: 401 } }); });
  expect(screen.getByText('Müşteri yükleme ekranı')).toBeInTheDocument();
  expect(localStorage.getItem('token')).toBe(TOKEN_A);
});

test('müşteri belgesinin yönetim isteği personel tokenını gönderir', async () => {
  open();
  await screen.findByText(A.adSoyad);
  await act(async () => { await api.get('/musteri-belge/yonetim/eski/belge-id/notlar'); });
  const config = api.defaults.adapter.mock.calls.at(-1)[0];
  expect(config.headers.get('Authorization')).toBe(`Bearer ${TOKEN_A}`);
  await act(async () => { await api.get('/musteri-belge/link-token'); });
  expect(api.defaults.adapter.mock.calls.at(-1)[0].headers.has('Authorization')).toBe(false);
});

test.each([
  ['ERR_NETWORK', 'Sunucuya ulaşılamadı. Bağlantınızı kontrol edip tekrar deneyin.'],
  [500, 'Sunucu işlemi tamamlayamadı. Lütfen tekrar deneyin.']
])('%s hatasında uyarı gösterilir, oturum açık kalır ve istek düzelince uyarı kalkar', async (failure, message) => {
  open();
  await screen.findByText(A.adSoyad);
  api.defaults.adapter.mockImplementationOnce(async (config) => {
    throw typeof failure === 'number' ? httpError(config, failure) : new AxiosError('Network Error', failure, config);
  });
  await act(async () => { await expect(api.get('/firma')).rejects.toThrow(); });
  expect(await screen.findByText(message)).toBeInTheDocument();
  expect(screen.getByText(A.adSoyad)).toBeInTheDocument();
  expect(localStorage.getItem('token')).toBe(TOKEN_A);
  await act(async () => { await api.get('/firma'); });
  expect(screen.queryByText(message)).not.toBeInTheDocument();
});

test('bekleyen profil yanıtı başka sekmeden çıkıştan sonra oturumu geri açmaz', async () => {
  let finishProfile;
  api.defaults.adapter.mockImplementationOnce((config) => new Promise((resolve) => {
    finishProfile = () => resolve(ok(config, { user: A }));
  }));
  open();
  await waitFor(() => expect(finishProfile).toBeDefined());
  await tabChange('token', null);
  await screen.findByLabelText('E-posta Adresi');
  await act(async () => { finishProfile(); });
  expect(screen.queryByText(A.adSoyad)).not.toBeInTheDocument();
  expect(localStorage.getItem('token')).toBeNull();
});

test('önbelleksiz profil bağlantı hatası giriş ekranına geçilince görünür kalır', async () => {
  localStorage.removeItem('user');
  api.defaults.adapter.mockImplementationOnce(async (config) => { throw new AxiosError('Network Error', 'ERR_NETWORK', config); });
  open();
  expect(await screen.findByText('Sunucuya ulaşılamadı. Bağlantınızı kontrol edip tekrar deneyin.')).toBeInTheDocument();
  expect(screen.getByLabelText('E-posta Adresi')).toBeInTheDocument();
  expect(localStorage.getItem('token')).toBe(TOKEN_A);
});

test('başka sekmede açılan yeni oturum profil bağlantı hatasında yalnız eşleşen önbelleği kullanır', async () => {
  open();
  await screen.findByText(A.adSoyad);
  localStorage.setItem('user', JSON.stringify(B));
  localStorage.setItem('auth:cachedUserFor', TOKEN_B);
  api.defaults.adapter.mockImplementationOnce(async (config) => { throw new AxiosError('Network Error', 'ERR_NETWORK', config); });
  await tabChange('token', TOKEN_B);
  expect(await screen.findByText(B.adSoyad)).toBeInTheDocument();
  expect(screen.queryByText(A.adSoyad)).not.toBeInTheDocument();
  expect(await screen.findByText('Sunucuya ulaşılamadı. Bağlantınızı kontrol edip tekrar deneyin.')).toBeInTheDocument();
});
