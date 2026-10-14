// 🧪 SMTP yanıtı izi — müşteri (13.10.2026): "smtp ile gönderdiğimiz mailler gönderildi diyor ama mail
// gelmiyor". Uygulama yalnız sunucunun KABUL ettiğini bilebilir; bu kabul cevabı artık saklanıyor.
const nodemailer = require('nodemailer');
const mailService = require('../../services/tesvikMakine/mailService');

const ortam = { ...process.env };
beforeEach(() => {
  Object.assign(process.env, { SMTP_HOST: 'smtp.test', SMTP_USER: 'bilgi@gm.test', SMTP_PASS: 'x' });
  mailService._resetCache();
  jest.spyOn(console, 'log').mockImplementation(() => {});
});
afterEach(() => { process.env = { ...ortam }; jest.restoreAllMocks(); mailService._resetCache(); });

const sahteTasiyici = (cevap) => jest.spyOn(nodemailer, 'createTransport').mockReturnValue({ sendMail: jest.fn().mockResolvedValue(cevap) });

test('sunucu cevabı ve kabul/red döner; logda adres değil alan adı', async () => {
  sahteTasiyici({ messageId: '<a@gm.test>', accepted: ['firma@ornek.com'], rejected: [], response: '250 2.0.0 OK 1728 - gsmtp' });
  const r = await mailService.sendMail({ to: 'firma@ornek.com', subject: 'K', text: 'M' });
  expect(r.response).toBe('250 2.0.0 OK 1728 - gsmtp');
  const satir = console.log.mock.calls.map((c) => c[0]).find((l) => String(l).includes('[mailService] gönderildi'));
  expect(satir).toContain('kabul=1(ornek.com)');
  expect(satir).not.toContain('firma@');
});

test('bütün alıcılar reddedildiyse "gönderildi" denmez', async () => {
  sahteTasiyici({ messageId: '<a@gm.test>', accepted: [], rejected: ['yok@ornek.com'], response: '250 OK' });
  await expect(mailService.sendMail({ to: 'yok@ornek.com', subject: 'K', text: 'M' })).rejects.toMatchObject({ code: 'EENVELOPE' });
});

test('editör HTML\'i kurumsal kalıba sarılır, düz metin ayrıca gider', async () => {
  const gonder = jest.fn().mockResolvedValue({ messageId: '<b@gm.test>', accepted: ['a@b.com'], rejected: [] });
  jest.spyOn(nodemailer, 'createTransport').mockReturnValue({ sendMail: gonder });
  await mailService.sendMail({ to: 'a@b.com', subject: 'K', text: 'Sayın Yetkili', html: '<p><b>Sayın</b> Yetkili</p>' });
  const secenek = gonder.mock.calls[0][0];
  expect(secenek.text).toBe('Sayın Yetkili');
  expect(secenek.html).toContain('<p><b>Sayın</b> Yetkili</p>');
  expect(secenek.html).toContain('max-width:640px');
});
