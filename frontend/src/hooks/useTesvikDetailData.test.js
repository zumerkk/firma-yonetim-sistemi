import { act, renderHook, waitFor } from '@testing-library/react';
import useTesvikDetailData from './useTesvikDetailData';
import api from '../utils/axios';

jest.mock('../utils/axios', () => ({ __esModule: true, default: { get: jest.fn() } }));

const response = (data) => ({ data: { data } });
const deferred = () => {
  let resolve, reject;
  const promise = new Promise((res, rej) => { resolve = res; reject = rej; });
  return { promise, resolve, reject };
};

beforeEach(() => { api.get.mockReset(); });

test.each(['tesvik', 'yeni-tesvik'])('%s: geçmiş yavaş veya erişilemez olsa da belge açılır', async (resource) => {
  const history = deferred();
  const belge = { _id: 'belge1', yatirimciUnvan: 'ST Turkuaz' };
  api.get.mockImplementation((url) => url === '/activities' ? history.promise : Promise.resolve(response(belge)));
  const { result } = renderHook(() => useTesvikDetailData(resource, 'belge1'));

  await waitFor(() => expect(result.current.loading).toBe(false));
  expect(result.current.tesvik).toEqual(belge);
  expect(result.current.activitiesLoading).toBe(true);
  expect(api.get).toHaveBeenCalledWith(`/${resource}/belge1`);
  expect(api.get).toHaveBeenCalledWith('/activities', { params: { targetId: 'belge1' } });

  await act(async () => { history.reject(new Error('Network Error')); });
  expect(result.current.tesvik).toEqual(belge);
  expect(result.current.error).toBeNull();
  expect(result.current.activitiesError).toBe('İşlem geçmişi şu anda yüklenemedi.');
  expect(result.current.activitiesLoading).toBe(false);
});

test.each(['tesvik', 'yeni-tesvik'])('%s: tekrar deneme belge hatasını temizler ve güncel veriyi yükler', async (resource) => {
  let retry = false;
  const belge = { _id: 'belge1' };
  api.get.mockImplementation((url) => {
    if (url === '/activities') return Promise.resolve(response({ activities: [] }));
    return retry ? Promise.resolve(response(belge)) : Promise.reject({ kullaniciMesaji: 'Bağlantı kesildi.' });
  });
  const { result } = renderHook(() => useTesvikDetailData(resource, 'belge1'));
  await waitFor(() => expect(result.current.error).toBe('Veri yüklenemedi: Bağlantı kesildi.'));

  retry = true;
  await act(async () => { await result.current.loadData(); });
  expect(result.current.error).toBeNull();
  expect(result.current.tesvik).toEqual(belge);
  expect(result.current.loading).toBe(false);
});

test('belge değişince önceki belge ve geçmişin geç yanıtı yeni ekranı değiştirmez', async () => {
  const oldDocument = deferred();
  const oldHistory = deferred();
  api.get.mockImplementation((url, config) => {
    if (url === '/tesvik/eski') return oldDocument.promise;
    if (url === '/activities' && config.params.targetId === 'eski') return oldHistory.promise;
    return Promise.resolve(response(url === '/activities' ? { activities: [{ _id: 'yeni-islem' }] } : { _id: 'yeni' }));
  });
  const { result, rerender } = renderHook(({ id }) => useTesvikDetailData('tesvik', id), {
    initialProps: { id: 'eski' }
  });
  rerender({ id: 'yeni' });
  await waitFor(() => expect(result.current.tesvik?._id).toBe('yeni'));

  await act(async () => {
    oldDocument.resolve(response({ _id: 'eski' }));
    oldHistory.resolve(response({ activities: [{ _id: 'eski-islem' }] }));
  });
  expect(result.current.tesvik._id).toBe('yeni');
  expect(result.current.activities).toEqual([{ _id: 'yeni-islem' }]);
  expect(result.current.error).toBeNull();
});

test('önceki belgenin yakalanmış callback’i yeni belge yüklenirken çağrı başlatamaz', async () => {
  const newDocument = deferred();
  const newHistory = deferred();
  api.get.mockImplementation((url, config) => {
    if (url === '/tesvik/yeni') return newDocument.promise;
    if (url === '/activities' && config.params.targetId === 'yeni') return newHistory.promise;
    return Promise.resolve(response(url === '/activities' ? { activities: [] } : { _id: 'eski' }));
  });
  const { result, rerender } = renderHook(({ id }) => useTesvikDetailData('tesvik', id), {
    initialProps: { id: 'eski' }
  });
  await waitFor(() => expect(result.current.loading).toBe(false));
  const capturedOldLoadData = result.current.loadData;

  rerender({ id: 'yeni' });
  // Eski durum PATCH'i burada tamamlanmış ve kendi render'ından loadData'yı çağırmış gibi.
  await act(async () => { await capturedOldLoadData(); });
  expect(api.get.mock.calls.filter(([url]) => url === '/tesvik/eski')).toHaveLength(1);
  expect(result.current.loading).toBe(true);

  await act(async () => {
    newDocument.resolve(response({ _id: 'yeni' }));
    newHistory.resolve(response({ activities: [{ _id: 'yeni-islem' }] }));
  });
  expect(result.current.tesvik._id).toBe('yeni');
  expect(result.current.activities).toEqual([{ _id: 'yeni-islem' }]);
  expect(result.current.loading).toBe(false);
});
