const { createHash } = require('crypto');
const MailGonderim = require('../models/MailGonderim');

const ozet = (deger) => createHash('sha256').update(Buffer.isBuffer(deger) ? deger : JSON.stringify(deger)).digest('hex');
const hata = (code, message, status = 409) => Object.assign(new Error(message), { code, status });

const adres = (deger) => String(deger?.address || deger).trim();
const adresAnahtari = (deger) => (adres(deger).match(/<([^<>]+)>$/)?.[1] || adres(deger)).toLowerCase();

function smtpSonucu(gonderim, to, cc) {
  const kabulEdilenler = (gonderim?.accepted || [...to, ...cc]).map(adres);
  const reddedilenler = (gonderim?.rejected || []).map(adres);
  const kabul = new Set(kabulEdilenler.map(adresAnahtari));
  return {
    kabulEdilenler,
    reddedilenler,
    alicilar: to.filter((a) => kabul.has(adresAnahtari(a))),
    cc: cc.filter((a) => kabul.has(adresAnahtari(a)))
  };
}

const kesinGonderilmedi = (error) => error?.kesinGonderilmedi || [
  'NO_RECIPIENT', 'SMTP_NOT_CONFIGURED', 'EAUTH', 'EENVELOPE', 'EDNS', 'ETLS'
].includes(error?.code);

async function kaydiGuncelle(_id, degisiklik) {
  try { await MailGonderim.updateOne({ _id }, degisiklik); }
  catch (error) { console.error('Mail gönderim kaydı güncellenemedi:', error.message); }
}

async function gonderimiYurut({ kapsam, talepId, istekId, icerik, hazirla, gonder, kaydet }) {
  if (istekId !== undefined && (typeof istekId !== 'string' || !/^[A-Za-z0-9_-]{8,100}$/.test(istekId))) {
    throw hata('BAD_INPUT', 'Geçersiz gönderim kimliği.', 400);
  }
  const parmakIzi = ozet(icerik);
  const _id = `${kapsam}:${talepId}:${istekId ? `istek:${istekId}` : `icerik:${parmakIzi}`}`;
  // Eski istemcilerde kısa süre aynı içeriği tekrar göndermeyi engelle. Sonucu bilinmeyen
  // kayıtları otomatik silme; süreç SMTP kabulünün hemen ardından durmuş olabilir.
  if (!istekId) await MailGonderim.deleteOne({ _id, sonKullanma: { $lte: new Date() } });
  try {
    await MailGonderim.create({ _id, icerik: parmakIzi, durum: 'bekliyor' });
  } catch (error) {
    if (error.code !== 11000) throw error;
    const mevcut = await MailGonderim.findById(_id).lean();
    if (mevcut && mevcut.icerik !== parmakIzi) {
      throw hata('MAIL_ISTEK_CAKISMASI', 'Gönderim kimliği farklı bir mail için kullanılmış.');
    }
    if (mevcut?.durum === 'gonderildi') return mevcut.sonuc;
    if (mevcut?.durum === 'belirsiz') {
      throw hata('MAIL_GONDERIM_BELIRSIZ', 'SMTP sonucu doğrulanamadı. Tekrar göndermeden önce mail kutunuzu kontrol edin.');
    }
    throw hata('MAIL_GONDERIM_BEKLIYOR', 'Bu mailin gönderimi henüz doğrulanmadı. Sonucu öğrenmek için aynı taslakla tekrar deneyin.');
  }

  let hazir;
  try { hazir = await hazirla(); }
  catch (error) {
    await MailGonderim.deleteOne({ _id });
    throw error;
  }
  let teslim;
  try { teslim = await gonder(hazir); }
  catch (error) {
    if (kesinGonderilmedi(error)) {
      await MailGonderim.deleteOne({ _id });
      throw error;
    }
    await kaydiGuncelle(_id, { durum: 'belirsiz' });
    throw hata('MAIL_GONDERIM_BELIRSIZ', `SMTP sonucu doğrulanamadı. Tekrar göndermeden önce mail kutunuzu kontrol edin. ${error.message}`);
  }

  // SMTP kabulünden sonra geçmiş kaydı başarısız olsa bile aynı istek tekrar gönderilmez.
  const sonuc = { ...teslim.sonuc, gecmisKaydedildi: false };
  await kaydiGuncelle(_id, { durum: 'gonderildi', sonuc });
  try {
    Object.assign(sonuc, await kaydet(teslim, hazir), { gecmisKaydedildi: true });
  } catch (error) {
    console.error('SMTP kabul etti ancak mail geçmişi kaydedilemedi:', error.message);
    if (error.linkeEklenemeyen) sonuc.linkeEklenemeyen = error.linkeEklenemeyen;
  }
  await kaydiGuncelle(_id, {
    durum: 'gonderildi', sonuc,
    sonKullanma: new Date(Date.now() + (istekId ? 30 * 24 * 60 : 10) * 60 * 1000)
  });
  return sonuc;
}

module.exports = { gonderimiYurut, smtpSonucu, ozet };
