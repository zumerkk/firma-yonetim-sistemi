import api from '../utils/axios';
import tesvikService from './tesvikService';
import yeniTesvikService from './yeniTesvikService';

jest.mock('../utils/axios', () => ({
  __esModule: true,
  default: { post: jest.fn(), get: jest.fn() },
  uploadPost: jest.fn()
}));

const beklet = () => {
  let resolve;
  const promise = new Promise(tamamla => { resolve = tamamla; });
  return { promise, resolve };
};

beforeEach(() => jest.clearAllMocks());

describe.each([
  ['tesvik', tesvikService],
  ['yeni-tesvik', yeniTesvikService]
])('%s makine servisi', (rota, service) => {
  test.each([
    ['start', (s, id) => s.startMakineRevizyon(id, { aciklama: 'Yeni revize' })],
    ['finalize', (s, id) => s.finalizeMakineRevizyon(id, { yerli: [], ithal: [] })],
    ['revert', (s, id) => s.revertMakineRevizyon(id, 'revize-1', 'Geri dön')]
  ])('%s uzun otomatik kayıt ve son bekleyen liste tamamlandıktan sonra başlar', async (islem, calistir) => {
    const ilk = beklet();
    api.post.mockImplementationOnce(() => ilk.promise).mockResolvedValue({ data: { success: true } });
    const ilkKayit = service.saveMakineListeleri('belge-1', { yerli: [1], ithal: [] });
    const araKayit = service.saveMakineListeleri('belge-1', { yerli: [2], ithal: [] });
    const sonKayit = service.saveMakineListeleri('belge-1', { yerli: [3], ithal: [] });
    const revizeIslemi = calistir(service, 'belge-1');
    expect(api.post).toHaveBeenCalledTimes(1);
    ilk.resolve({ data: { success: true } });
    await Promise.all([ilkKayit, araKayit, sonKayit, revizeIslemi]);
    expect(api.post.mock.calls.map(([url]) => url)).toEqual([
      `/${rota}/belge-1/makine-listeleri`,
      `/${rota}/belge-1/makine-listeleri`,
      `/${rota}/belge-1/makine-revizyon/${islem}`
    ]);
    expect(api.post.mock.calls[1][1]).toEqual({ yerli: [3], ithal: [] });
  });

  test('özet listesini ayrı parametreyle ister, gerektiğinde tam geçmişi okuyabilir', async () => {
    const meta = [{ revizeId: 'revize-1' }];
    api.get.mockResolvedValue({ data: { data: meta } });
    await expect(service.listMakineRevizyonlari('belge-1', { ozet: true })).resolves.toEqual(meta);
    expect(api.get).toHaveBeenLastCalledWith(`/${rota}/belge-1/makine-revizyon/list`, { params: { ozet: true } });
    await service.listMakineRevizyonlari('belge-1');
    expect(api.get).toHaveBeenLastCalledWith(`/${rota}/belge-1/makine-revizyon/list`, { params: {} });
  });
});
