import { belgeYazimKuyruguOlustur } from './belgeYazimKuyrugu';

const beklet = () => {
  let resolve;
  let reject;
  const promise = new Promise((tamamla, hata) => { resolve = tamamla; reject = hata; });
  return { promise, resolve, reject };
};
const sonrakiAdim = async () => { await Promise.resolve(); await Promise.resolve(); };

test('yavaş kayıt sırasında sadece en son bekleyen liste yazılır', async () => {
  const ilk = beklet();
  const kaydet = jest.fn().mockImplementationOnce(() => ilk.promise).mockResolvedValue('son kayıt');
  const kuyruk = belgeYazimKuyruguOlustur(kaydet);
  const a = kuyruk.kaydet('belge', { sayi: 1 });
  const b = kuyruk.kaydet('belge', { sayi: 2 });
  const c = kuyruk.kaydet('belge', { sayi: 3 });
  expect(kaydet).toHaveBeenCalledTimes(1);
  ilk.resolve('ilk kayıt');
  await expect(a).resolves.toBe('ilk kayıt');
  await expect(b).resolves.toBe('son kayıt');
  await expect(c).resolves.toBe('son kayıt');
  expect(kaydet.mock.calls).toEqual([['belge', { sayi: 1 }], ['belge', { sayi: 3 }]]);
});

test('revize bitirme mevcut ve son bekleyen kaydı bekler; sonraki kayıt bitirmeyi geçmez', async () => {
  const ilk = beklet();
  const bitirme = beklet();
  const sira = [];
  const kuyruk = belgeYazimKuyruguOlustur(async (_, veri) => {
    sira.push(`kaydet ${veri}`);
    if (veri === 1) await ilk.promise;
  });
  const a = kuyruk.kaydet('belge', 1);
  const b = kuyruk.kaydet('belge', 2);
  const c = kuyruk.kaydet('belge', 3);
  const final = kuyruk.sirayla('belge', async () => { sira.push('bitir'); await bitirme.promise; });
  const sonra = kuyruk.kaydet('belge', 4);
  expect(sira).toEqual(['kaydet 1']);
  ilk.resolve();
  await a;
  await b;
  await c;
  await sonrakiAdim();
  expect(sira).toEqual(['kaydet 1', 'kaydet 3', 'bitir']);
  bitirme.resolve();
  await final;
  await sonra;
  expect(sira).toEqual(['kaydet 1', 'kaydet 3', 'bitir', 'kaydet 4']);
});

test('farklı belgeler birbirinin uzun kaydını beklemez', async () => {
  const ilk = beklet();
  const kaydet = jest.fn().mockImplementation((id) => id === 'a' ? ilk.promise : Promise.resolve('b kaydedildi'));
  const kuyruk = belgeYazimKuyruguOlustur(kaydet);
  const a = kuyruk.kaydet('a', 1);
  await expect(kuyruk.kaydet('b', 2)).resolves.toBe('b kaydedildi');
  expect(kaydet).toHaveBeenCalledTimes(2);
  ilk.resolve();
  await a;
});

test('başarısız kayıt kuyruğu kilitlemez ve son değişiklik kaydedilebilir', async () => {
  const ilk = beklet();
  const kaydet = jest.fn().mockImplementationOnce(() => ilk.promise).mockResolvedValue('yeniden kaydedildi');
  const kuyruk = belgeYazimKuyruguOlustur(kaydet);
  const a = kuyruk.kaydet('belge', 1);
  const hataBeklentisi = expect(a).rejects.toThrow('bağlantı kesildi');
  const b = kuyruk.kaydet('belge', 2);
  ilk.reject(new Error('bağlantı kesildi'));
  await hataBeklentisi;
  await expect(b).resolves.toBe('yeniden kaydedildi');
  await expect(kuyruk.kaydet('belge', 3)).resolves.toBe('yeniden kaydedildi');
  expect(kaydet).toHaveBeenCalledTimes(3);
});

test('başarısız revize işlemi sonraki kayıtları durdurmaz', async () => {
  const revize = beklet();
  const kuyruk = belgeYazimKuyruguOlustur(async () => 'kaydedildi');
  const final = kuyruk.sirayla('belge', () => revize.promise);
  const hataBeklentisi = expect(final).rejects.toThrow('revize hatası');
  const sonraki = kuyruk.kaydet('belge', 1);
  revize.reject(new Error('revize hatası'));
  await hataBeklentisi;
  await expect(sonraki).resolves.toBe('kaydedildi');
});
