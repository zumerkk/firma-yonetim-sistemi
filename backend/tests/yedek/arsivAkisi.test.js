const { EventEmitter } = require('events');
const { Readable } = require('stream');
const { koleksiyonAkisi, arsiveEkleVeBekle } = require('../../services/yedek/veritabaniArsivi');

function modelTaklidi(docs, ariza = false) {
  let index = 0;
  const cursor = {
    next: jest.fn(async () => {
      if (ariza && index === 1) throw new Error('Mongo bağlantısı kesildi');
      return docs[index++] || null;
    }),
    close: jest.fn(async () => {})
  };
  const query = { lean: () => query, cursor: jest.fn(() => cursor) };
  return { model: { find: jest.fn(() => query) }, query, cursor };
}

test('büyük kayıtları ve Türkçe metni geri basınç altında kayıpsız JSON olarak akıtır; tekli Mongo batch kullanmaz', async () => {
  const docs = Array.from({ length: 55 }, (_, i) => ({ _id: i, metin: 'Özel evrak — ı'.repeat(6000) }));
  const { model, query, cursor } = modelTaklidi(docs);
  const akis = koleksiyonAkisi(model, ['sifre']);
  const parcalar = [];
  for await (const chunk of akis) {
    parcalar.push(chunk);
    await new Promise((r) => setImmediate(r));
  }
  expect(JSON.parse(Buffer.concat(parcalar).toString())).toEqual(docs);
  expect(akis.kayitSayisi()).toBe(55);
  expect(akis.hataMesaji()).toBe(null);
  expect(query.cursor).toHaveBeenCalledWith({ batchSize: 50 });
  expect(model.find).toHaveBeenCalledWith({}, { sifre: 0 });
  expect(cursor.close).toHaveBeenCalled();
});

test('Mongo okuması yarıda kesilirse JSON kapanır ve eksiklik gizlenmez', async () => {
  const { model } = modelTaklidi([{ _id: 1 }, { _id: 2 }], true);
  const akis = koleksiyonAkisi(model);
  const parcalar = [];
  for await (const chunk of akis) parcalar.push(chunk);
  expect(JSON.parse(Buffer.concat(parcalar).toString())).toEqual([{ _id: 1 }]);
  expect(akis.hataMesaji()).toBe('Mongo bağlantısı kesildi');
});

test('indirme iptal edilince arşiv bekleyişi biter ve Mongo akışı kapatılır', async () => {
  const arsiv = new EventEmitter();
  arsiv.append = jest.fn();
  const akis = new Readable({ read() {} });
  const bekleme = arsiveEkleVeBekle(arsiv, akis, 'test.json');
  arsiv.emit('close');
  await expect(bekleme).rejects.toThrow('tamamlanmadan kapandı');
  expect(akis.destroyed).toBe(true);
  expect(arsiv.listenerCount('entry')).toBe(0);
  expect(arsiv.listenerCount('error')).toBe(0);
});
