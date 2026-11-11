const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const ExcelJS = require('exceljs');
const Tesvik = require('../../models/Tesvik');
const YeniTesvik = require('../../models/YeniTesvik');
const eski = require('../../controllers/tesvikController');
const yeni = require('../../controllers/yeniTesvikController');
const eskiRouter = require('../../routes/tesvik');
const yeniRouter = require('../../routes/yeniTesvik');

jest.setTimeout(60000);
let mem;

const belge = (no, il, bitis, genelDurum = 'onaylandi') => ({
  tesvikId: `TES-${no}`, aktif: true, yatirimciUnvan: 'HÜNER YATIRIM A.Ş.',
  durumBilgileri: { genelDurum }, yatirimBilgileri: { yerinIl: il },
  belgeYonetimi: { belgeNo: no, belgeId: `ID-${no}`, belgeBitisTarihi: new Date(bitis) },
  createdAt: new Date('2020-01-01')
});

beforeAll(async () => {
  mem = await MongoMemoryServer.create();
  await mongoose.connect(mem.getUri());
  await Tesvik.collection.insertMany([
    belge('E-1', 'ANKARA', '2020-01-01'), belge('E-2', 'ANKARA', '2022-01-01'),
    belge('E-3', 'İZMİR', '2020-01-01'), belge('E-4', 'ANKARA', '2020-01-01', 'kapandi')
  ]);
  await YeniTesvik.collection.insertMany([
    belge('Y-1', 'ANKARA', '2021-01-01'), belge('Y-2', 'İZMİR', '2020-01-01'),
    belge('Y-3', 'ANKARA', '2020-01-01', 'kapandi')
  ]);
});

afterAll(async () => { await mongoose.disconnect(); if (mem) await mem.stop(); });

async function cagir(fn, query) {
  const res = { statusCode: 200, status(code) { this.statusCode = code; return this; }, setHeader() {},
    json(body) { this.body = body; return this; }, send(body) { this.body = body; return this; } };
  await fn({ query }, res);
  expect(res.statusCode).toBe(200);
  return res.body;
}

async function excelNumaralari(router, query) {
  const katman = router.stack.find(({ route }) => route?.path === '/bulk-excel-export');
  const buffer = await cagir(katman.route.stack.at(-1).handle, query);
  const dosya = new ExcelJS.Workbook();
  await dosya.xlsx.load(buffer);
  const sayfa = dosya.worksheets[0];
  const numaralar = sayfa.getColumn(1).values.slice(6);
  expect(sayfa.getCell('B3').value).toBe(numaralar.length);
  return numaralar;
}

const numaralar = (talepler) => talepler.map((t) => t.belgeYonetimi.belgeNo);
const filtreler = { il: 'ankara', arsiv: '0', sureDurumu: 'gecen', siraBy: 'belgeYonetimi.belgeBitisTarihi', siraSekli: 'desc' };

test.each([[eski, eskiRouter, ['E-2', 'E-1']], [yeni, yeniRouter, ['Y-1']]])(
  'liste ve Excel ünvan, belge numarası, belge ID ve il filtresinde aynı satırları döndürür',
  async (controller, router, beklenen) => {
    for (const [search, sonuc] of [['Huner', beklenen], [beklenen[0], [beklenen[0]]], [`ID-${beklenen[0]}`, [beklenen[0]]]]) {
      const query = { ...filtreler, search };
      expect(numaralar((await cagir(controller.getTesvikler, query)).data.tesvikler)).toEqual(sonuc);
      expect(await excelNumaralari(router, query)).toEqual(sonuc);
    }
  }
);

test('birleşik arama il/sistem süzer, sayfalar ve Tümü Excel iki sistemi aynı sırayla içerir', async () => {
  const query = { ...filtreler, q: 'Hüner', limit: '2' };
  const ilk = (await cagir(eski.birlesikFirmaArama, query)).data;
  const ikinci = (await cagir(eski.birlesikFirmaArama, { ...query, sayfa: '2' })).data;
  expect(ilk.pagination).toMatchObject({ totalCount: 3, totalPages: 2, hasNext: true });
  expect(numaralar(ilk.tesvikler)).toEqual(['E-2', 'Y-1']);
  expect(numaralar(ikinci.tesvikler)).toEqual(['E-1']);
  const yalnizYeni = (await cagir(eski.birlesikFirmaArama, { ...query, sistem: 'Yeni' })).data;
  expect(yalnizYeni.pagination.totalCount).toBe(1);
  expect(numaralar(yalnizYeni.tesvikler)).toEqual(['Y-1']);
  expect(await excelNumaralari(eskiRouter, { ...filtreler, search: 'Hüner', sistem: 'all' })).toEqual(['E-2', 'Y-1', 'E-1']);
  expect(await excelNumaralari(eskiRouter, { ...filtreler, search: 'Hüner', sistem: 'Eski' })).toEqual(['E-2', 'E-1']);
});
