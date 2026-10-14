const mongoose = require('mongoose');
const ExcelJS = require('exceljs');
const Tesvik = require('../../models/Tesvik');
const YeniTesvik = require('../../models/YeniTesvik');
const Activity = require('../../models/Activity');
const eskiController = require('../../controllers/tesvikController');
const yeniController = require('../../controllers/yeniTesvikController');

// Gerçek Excel endpointi ve XLSX serileştirmesi çalışır; yalnız veri okuma/log
// dış sınırları taklit edilir. Geçmiş snapshot ile güncel satır ayrı doğrulanır.
const query = value => ({
  populate() { return this; }, sort() { return this; }, lean: jest.fn().mockResolvedValue(value)
});
afterEach(() => jest.restoreAllMocks());

const alanlar = {
  'Metrekaresi': 1250.5, 'Birim Fiyatı TL': 2000.25, 'ARAZİ ARSA BEDELİ': 2501312.625,
  'Yardımcı İşl. Mak. Teç. Gid.': 11.11, 'İthalat ve Güm.Giderleri': 22.22,
  'Taşıma ve Sigorta Giderleri': 33.33, 'Montaj Giderleri': 44.44,
  'Etüd ve Proje Giderleri': 55.55, 'Diğer Giderleri': 66.66,
  'TOPLAM DİĞER YATIRIM HARCAMALARI': 233.31, 'TOPLAM SABİT YATIRIM TUTARI TL': 9000000.99
};

const finansal = (tur, ek = 0) => {
  const v = n => tur === 'metin' ? (n + ek).toLocaleString('tr-TR', { maximumFractionDigits: 3 }) : n + ek;
  return {
    maliyetlenen: { sl: v(1250.5), sm: v(2000.25), sn: v(2501312.625) },
    yatirimHesaplamalari: { et: v(11.11), eu: v(22.22), ev: v(33.33), ew: v(44.44), ex: v(55.55), ey: v(66.66), ez: v(233.31) },
    toplamSabitYatirim: v(9000000.99)
  };
};

describe.each([
  ['eski', Tesvik, eskiController], ['yeni', YeniTesvik, yeniController]
])('%s belge finansal revizyon Excel', (_ad, Model, ctrl) => {
  test.each(['sayi', 'metin'])('%s tutarlarda mevcut ve geçmiş kuruşlar XLSX içinde korunur', async tur => {
    const ilk = {
      _id: new mongoose.Types.ObjectId(), tesvikId: 'FIN-568289', gmId: 'GM-FIN', firmaId: 'A000001',
      yatirimciUnvan: 'FİNANSAL EXCEL TEST', createdAt: new Date('2026-10-01'),
      belgeYonetimi: { belgeNo: '568289' }, istihdam: { mevcutKisi: 12, ilaveKisi: 3 },
      maliHesaplamalar: finansal(tur)
    };
    const son = { ...ilk, maliHesaplamalar: finansal(tur, 1) };
    const belge = { ...son, revizyonlar: [{
      revizyonNo: 1, revizyonTarihi: new Date('2026-10-14'), revizyonSebebi: 'Sonuç Revize',
      degisikenAlanlar: [], veriSnapshot: { oncesi: ilk, sonrasi: son }
    }] };
    jest.spyOn(Model, 'findOne').mockReturnValue(query(belge));
    jest.spyOn(Activity, 'find').mockReturnValue(query([]));
    jest.spyOn(Activity, 'logActivity').mockResolvedValue({});
    const res = { statusCode: 200, headers: {} };
    res.status = code => { res.statusCode = code; return res; };
    res.json = data => { res.body = data; return res; };
    res.setHeader = (key, value) => { res.headers[key] = value; };
    res.send = data => { res.buffer = data; return res; };
    await ctrl.exportRevizyonExcel({ params: { id: String(ilk._id) }, query: {},
      user: { _id: new mongoose.Types.ObjectId(), adSoyad: 'Test', email: 'test@example.test', rol: 'admin' },
      ip: '127.0.0.1', get: () => 'jest' }, res);
    expect(res.statusCode).toBe(200);
    expect(res.headers['Content-Type']).toContain('spreadsheetml');
    const wb = new ExcelJS.Workbook();
    await wb.xlsx.load(res.buffer);
    const sheet = wb.worksheets[0];
    const headers = sheet.getRow(4).values;
    for (const [alan, tutar] of Object.entries(alanlar)) {
      const col = headers.indexOf(alan);
      expect(col).toBeGreaterThan(0);
      expect(sheet.getCell(5, col).value).toBe(tutar);
      expect(sheet.getCell(6, col).value).toBeCloseTo(tutar + 1, 8);
    }
    // Adet/kişi alanlarının eski tam sayı davranışı değişmez.
    expect(sheet.getCell(5, headers.indexOf('Mevcut Kişi')).value).toBe(12);
    expect(sheet.getCell(5, headers.indexOf('İlave Kişi')).value).toBe(3);
  });
});
