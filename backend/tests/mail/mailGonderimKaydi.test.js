const MailGonderim = require('../../models/MailGonderim');
const { gonderimiYurut } = require('../../services/mailGonderimKaydi');

jest.mock('../../models/MailGonderim', () => ({
  create: jest.fn(), findById: jest.fn(), updateOne: jest.fn(), deleteOne: jest.fn()
}));

beforeEach(() => {
  const kayitlar = new Map();
  MailGonderim.create.mockImplementation(async (kayit) => {
    if (kayitlar.has(kayit._id)) throw Object.assign(new Error('duplicate'), { code: 11000 });
    kayitlar.set(kayit._id, structuredClone(kayit));
  });
  MailGonderim.findById.mockImplementation((_id) => ({ lean: async () => structuredClone(kayitlar.get(_id)) }));
  MailGonderim.updateOne.mockImplementation(async ({ _id }, degisiklik) => {
    Object.assign(kayitlar.get(_id), structuredClone(degisiklik));
  });
  MailGonderim.deleteOne.mockImplementation(async ({ _id, sonKullanma }) => {
    if (!sonKullanma || kayitlar.get(_id)?.sonKullanma <= sonKullanma.$lte) kayitlar.delete(_id);
  });
});

const senaryo = (ek = {}) => ({
  kapsam: 'belge-takip',
  talepId: 'ornek-talep',
  istekId: 'ornek-istek-01',
  icerik: { konu: 'Sentetik taslak' },
  hazirla: jest.fn().mockResolvedValue({}),
  gonder: jest.fn().mockResolvedValue({ sonuc: { kabulEdilenler: ['ornek@example.test'] } }),
  kaydet: jest.fn().mockResolvedValue({}),
  ...ek
});

test('eşzamanlı aynı gönderim, tek SMTP çağrısı yapar ve tamamlanınca önceki sonucu döner', async () => {
  let teslimEt;
  let basladi;
  const smtpBasladi = new Promise((resolve) => { basladi = resolve; });
  const args = senaryo({ gonder: jest.fn(() => new Promise((resolve) => { teslimEt = resolve; basladi(); })) });

  const ilk = gonderimiYurut(args);
  await smtpBasladi;
  await expect(gonderimiYurut(args)).rejects.toMatchObject({ code: 'MAIL_GONDERIM_BEKLIYOR' });
  teslimEt({ sonuc: { kabulEdilenler: ['ornek@example.test'] } });
  const sonuc = await ilk;

  expect(sonuc).toMatchObject({ gecmisKaydedildi: true });
  await expect(gonderimiYurut(args)).resolves.toEqual(sonuc);
  expect(args.gonder).toHaveBeenCalledTimes(1);
});

test('SMTP kabulünden sonra geçmiş yazılamazsa tekrar aynı maili göndermez', async () => {
  const log = jest.spyOn(console, 'error').mockImplementation(() => {});
  try {
    const args = senaryo({ kaydet: jest.fn().mockRejectedValue(new Error('Mongo bağlantısı koptu')) });
    const sonuc = await gonderimiYurut(args);
    expect(sonuc).toMatchObject({ gecmisKaydedildi: false, kabulEdilenler: ['ornek@example.test'] });
    await expect(gonderimiYurut(args)).resolves.toEqual(sonuc);
    expect(args.gonder).toHaveBeenCalledTimes(1);
  } finally {
    log.mockRestore();
  }
});

test('aşaması bilinmeyen SMTP bağlantı kesintisi otomatik tekrar gönderilmez', async () => {
  const args = senaryo({ gonder: jest.fn().mockRejectedValue(Object.assign(new Error('Bağlantı koptu'), { code: 'ECONNECTION' })) });
  await expect(gonderimiYurut(args)).rejects.toMatchObject({ code: 'MAIL_GONDERIM_BELIRSIZ' });
  await expect(gonderimiYurut(args)).rejects.toMatchObject({ code: 'MAIL_GONDERIM_BELIRSIZ' });
  expect(args.gonder).toHaveBeenCalledTimes(1);
});

test('SMTP göndermeden kesin hata alınırsa aynı taslak tekrar denenebilir', async () => {
  const args = senaryo();
  args.gonder.mockRejectedValueOnce(Object.assign(new Error('SMTP oturumu açılamadı'), { code: 'EAUTH' }));
  await expect(gonderimiYurut(args)).rejects.toMatchObject({ code: 'EAUTH' });
  await expect(gonderimiYurut(args)).resolves.toMatchObject({ gecmisKaydedildi: true });
  expect(args.gonder).toHaveBeenCalledTimes(2);
});
