const hata = (message) => Object.assign(new Error(message), { status: 400, code: 'FATURA_GECERSIZ' });

function yevmiyeKaydiniOku(girdi) {
  const kayit = {};
  if (Object.hasOwn(girdi, 'yevmiyeNo')) {
    const no = girdi.yevmiyeNo;
    if (no !== null && (typeof no !== 'string' || no.trim().length > 100)) {
      throw hata('Yevmiye no en fazla 100 karakterlik bir metin olmalıdır.');
    }
    kayit.yevmiyeNo = no?.trim() || null;
  }
  if (Object.hasOwn(girdi, 'yevmiyeTarihi')) {
    const tarih = girdi.yevmiyeTarihi;
    if (tarih === null || (typeof tarih === 'string' && !tarih.trim())) {
      kayit.yevmiyeTarihi = null;
    } else {
      if (typeof tarih !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(tarih) || tarih.startsWith('0000-')) {
        throw hata('Yevmiye tarihini YYYY-AA-GG biçiminde girin.');
      }
      const utc = new Date(`${tarih}T00:00:00.000Z`);
      if (!Number.isFinite(utc.getTime()) || utc.toISOString().slice(0, 10) !== tarih) {
        throw hata('Yevmiye tarihi geçersiz.');
      }
      kayit.yevmiyeTarihi = utc;
    }
  }
  return kayit;
}

module.exports = { yevmiyeKaydiniOku };
