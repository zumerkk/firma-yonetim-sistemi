// 🧪 Süresi dolmuş belgeye Ekipman Takip maili gönderilmez.
//
// Müşteri (13.10.2026): "Mail gönderirken eğer tarih belgenin 'süre uzatımı tarihini' geçmiş ise maili
// gönderemesin uyarı/hata versin."

const { sonGecerlilikTarihi, belgeSuresiDurumu, mailGonderilebilirMi } = require('../../utils/belgeGecerlilik');

const g = (s) => new Date(`${s}T00:00:00.000Z`);
const simdi = new Date('2026-10-13T09:00:00.000Z'); // İstanbul 13.10.2026 12:00
const belge = (by) => ({ belgeYonetimi: by });

test('uzatım öncelikli; uzatım yoksa bitiş ve mücbir uzamanın en geç olanı', () => {
  expect(sonGecerlilikTarihi(belge({ belgeBitisTarihi: g('2025-11-15'), uzatimTarihi: g('2027-05-17') }))).toEqual(g('2027-05-17'));
  // uzatım yapılmamışsa bitişe eşit giriliyor
  expect(sonGecerlilikTarihi(belge({ belgeBitisTarihi: g('2026-01-01'), uzatimTarihi: g('2026-01-01') }))).toEqual(g('2026-01-01'));
  expect(sonGecerlilikTarihi(belge({ belgeBitisTarihi: g('2026-01-01'), mucbirUzumaTarihi: g('2026-12-01') }))).toEqual(g('2026-12-01'));
  expect(sonGecerlilikTarihi(belge({ belgeBitisTarihi: g('2026-01-01') }))).toEqual(g('2026-01-01'));
  expect(sonGecerlilikTarihi(belge({}))).toBeNull();
  expect(sonGecerlilikTarihi(belge({ uzatimTarihi: g('2026-10-12'), belgeBitisTarihi: g('2027-01-01'), mucbirUzumaTarihi: g('2028-01-01') })))
    .toEqual(g('2026-10-12'));
});

test('süre uzatım tarihi geçmişse dolmuş, son gün hâlâ geçerli', () => {
  expect(belgeSuresiDurumu(belge({ uzatimTarihi: g('2026-10-12') }), simdi).doldu).toBe(true);
  expect(belgeSuresiDurumu(belge({ uzatimTarihi: g('2026-10-13') }), simdi).doldu).toBe(false);
  expect(belgeSuresiDurumu(belge({ uzatimTarihi: g('2027-05-17') }), simdi).doldu).toBe(false);
});

test('tarihi hiç olmayan belge engellenmez (veri eksik diye iş durmasın)', () => {
  expect(belgeSuresiDurumu(belge({}), simdi).doldu).toBe(false);
  expect(() => mailGonderilebilirMi(belge({}), simdi)).not.toThrow();
});

test('dolmuşsa anlaşılır mesajla BELGE_SURESI_DOLDU', () => {
  expect(() => mailGonderilebilirMi(belge({ belgeBitisTarihi: g('2025-11-15'), uzatimTarihi: g('2026-05-17') }), simdi))
    .toThrow(expect.objectContaining({ code: 'BELGE_SURESI_DOLDU', message: expect.stringContaining('17.05.2026') }));
});

test('gelecek bitiş/mücbir tarihi geçmiş uzatımı açmaz; İstanbul günü esas alınır', () => {
  const b = belge({ uzatimTarihi: g('2026-10-12'), belgeBitisTarihi: g('2028-01-01'), mucbirUzumaTarihi: g('2029-01-01') });
  expect(belgeSuresiDurumu(b, new Date('2026-10-12T20:59:59Z')).doldu).toBe(false);
  expect(() => mailGonderilebilirMi(b, new Date('2026-10-12T21:00:00Z')))
    .toThrow(expect.objectContaining({ code: 'BELGE_SURESI_DOLDU', message: expect.stringContaining('12.10.2026') }));
});
