const IslemTalebi = require('../../models/IslemTalebi');
const svc = require('../../services/islemEvrak/islemEvrakService');
const ctrl = require('../../controllers/islemEvrakController');

const talepKur = () => new IslemTalebi({ istenenEvraklar: [{ ad: 'Vergi Levhası' }, { ad: 'İmza Sirküleri' }] });
const response = () => { const res = { status: jest.fn(), json: jest.fn() }; res.status.mockReturnValue(res); return res; };
afterEach(() => jest.restoreAllMocks());
test('neden yanıt sayılır, başka evrak beklenmeye devam eder ve yenilemede korunur', () => {
  const t = talepKur();
  t.istenenEvraklar[0].yuklenememeNedeni = 'Bu belge firmamızda bulunmuyor.';
  t.durumTazele();
  expect(t.durum).toBe('kismi_geldi');
  expect(t.istenenEvraklar[0].geldiMi).toBe(true);
  expect(t.istenenEvraklar[1].geldiMi).toBe(false);
  const date = t.istenenEvraklar[0].gelisTarihi;
  t.durumTazele();
  expect(t.istenenEvraklar[0].gelisTarihi).toEqual(date);
  t.istenenEvraklar[1].yuklenememeNedeni = 'Uygulanmıyor';
  t.durumTazele();
  expect(t.durum).toBe('tamamlandi');
});
test.each([null, { expired: true }])('geçersiz/süresi dolmuş bağlantı kayıt yapamaz', async resolved => {
  jest.spyOn(svc, 'resolveByToken').mockResolvedValue(resolved);
  const res = response();
  await ctrl.publicNedenKaydet({ params: { token: 't' }, body: { neden: 'Yok' } }, res);
  expect(res.status).toHaveBeenCalledWith(resolved ? 410 : 404);
});
test('neden yalnızca bağlantının istediği evraka kaydedilir', async () => {
  const t = talepKur();
  t.save = jest.fn().mockResolvedValue(t);
  jest.spyOn(svc, 'resolveByToken').mockResolvedValue({ talep: t });
  const req = { params: { token: 't' }, body: { istenenEvrakId: String(t.istenenEvraklar[0]._id), neden: '  Bulunmuyor  ' } };
  await ctrl.publicNedenKaydet(req, response());
  expect(t.save).toHaveBeenCalledTimes(1);
  expect(t.istenenEvraklar[0].yuklenememeNedeni).toBe('Bulunmuyor');
  expect(t.istenenEvraklar[0].nedenBildirimTarihi).toBeInstanceOf(Date);
  const res = response();
  await ctrl.publicNedenKaydet({ ...req, body: { ...req.body, istenenEvrakId: 'baska' } }, res);
  expect(res.status).toHaveBeenCalledWith(400);
  expect(t.save).toHaveBeenCalledTimes(1);
});
test.each(['', '   ', 'x'.repeat(2001)])('boş/uzun neden kabul edilmez', async neden => {
  jest.spyOn(svc, 'resolveByToken').mockResolvedValue({ talep: talepKur() });
  const res = response();
  await ctrl.publicNedenKaydet({ params: { token: 't' }, body: { neden } }, res);
  expect(res.status).toHaveBeenCalledWith(400);
});
