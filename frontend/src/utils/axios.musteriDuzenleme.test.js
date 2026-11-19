import { AxiosError } from 'axios';
import api, { clearConnectionIssues } from './axios';
import { saveActivity, SESSION_EVENT } from './authSession';

beforeEach(() => {
  localStorage.clear();
  localStorage.setItem('token', 'test-personel-oturumu');
  saveActivity();
  clearConnectionIssues();
});

test.each([
  '/musteri-belge/test-baglantisi/fatura-kalemi/kalem-1',
  '/musteri-belge/test-baglantisi/harcamalar/kalem-1'
])('müşteri düzeltmesi personel oturumunu taşımaz ve ret yanıtı oturumu kapatmaz (%s)', async (url) => {
  const oturumOlayi = jest.fn();
  window.addEventListener(SESSION_EVENT, oturumOlayi);
  const adapter = jest.fn(async (config) => {
    expect(config.headers.has('Authorization')).toBe(false);
    const response = { status: 401, statusText: 'Unauthorized', data: { message: 'Bağlantı geçersiz.' }, config };
    throw new AxiosError('Bağlantı geçersiz.', 'ERR_BAD_REQUEST', config, {}, response);
  });
  try {
    await expect(api.patch(url, { no: 'F-2' }, {
      adapter, headers: { Authorization: 'Bearer test-personel-oturumu' }
    })).rejects.toMatchObject({ response: { status: 401 } });
    expect(adapter).toHaveBeenCalledTimes(1);
    expect(oturumOlayi).not.toHaveBeenCalled();
    expect(localStorage.getItem('token')).toBe('test-personel-oturumu');
  } finally {
    window.removeEventListener(SESSION_EVENT, oturumOlayi);
  }
});

test('personel belge yönetimi yetkilendirilmiş oturumla devam eder', async () => {
  const response = await api.post('/musteri-belge/yonetim/Tesvik/belge-1', {}, {
    adapter: async (config) => ({
      status: 200, statusText: 'OK', headers: {}, config,
      data: { authorization: config.headers.get('Authorization') }
    })
  });
  expect(response.data.authorization).toBe('Bearer test-personel-oturumu');
});
