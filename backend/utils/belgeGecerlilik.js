// ⛔ Süresi dolmuş belge için Ekipman Takip maili gönderilmez.
//
// Müşteri (13.10.2026): "Mail gönderirken eğer tarih belgenin 'süre uzatımı tarihini' geçmiş ise maili
// gönderemesin uyarı/hata versin."
//
// Son geçerlilik = süre uzatım, belge bitiş ve mücbir uzama tarihlerinin EN GEÇ olanı. Uzatım tarihi
// hemen her belgede dolu (uzatım yapılmadıysa bitişe eşit giriliyor — bkz. belgeSureFiltresi); boşsa
// bitiş tarihi esas alınır. Gün İstanbul takvimiyle sayılır: son gün hâlâ geçerlidir.

const { bugunBaslangici } = require('./belgeSureFiltresi');

const gecerliTarih = (v) => {
  if (!v) return null;
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? null : d;
};

/** @returns {Date|null} belgede hiç tarih yoksa null (kontrol yapılmaz) */
function sonGecerlilikTarihi(belge) {
  const by = (belge && belge.belgeYonetimi) || {};
  const tarihler = [by.uzatimTarihi, by.belgeBitisTarihi, by.mucbirUzumaTarihi].map(gecerliTarih).filter(Boolean);
  if (!tarihler.length) return null;
  return new Date(Math.max(...tarihler.map((t) => t.getTime())));
}

const trTarih = (d) => new Intl.DateTimeFormat('tr-TR', { timeZone: 'UTC' }).format(d);

/** @returns {{ doldu: boolean, tarih: Date|null, mesaj: string }} */
function belgeSuresiDurumu(belge, simdi = new Date()) {
  const tarih = sonGecerlilikTarihi(belge);
  const doldu = !!tarih && tarih < bugunBaslangici(simdi);
  return {
    doldu,
    tarih,
    mesaj: doldu
      ? `Belgenin süresi ${trTarih(tarih)} tarihinde doldu (süre uzatım tarihi geçti) — bu belge için mail gönderilemez.`
      : ''
  };
}

/** Süre dolduysa BELGE_SURESI_DOLDU koduyla hata fırlatır. */
function mailGonderilebilirMi(belge, simdi = new Date()) {
  const durum = belgeSuresiDurumu(belge, simdi);
  if (durum.doldu) {
    const e = new Error(durum.mesaj);
    e.code = 'BELGE_SURESI_DOLDU';
    throw e;
  }
  return durum;
}

module.exports = { sonGecerlilikTarihi, belgeSuresiDurumu, mailGonderilebilirMi };
