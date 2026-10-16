// ⛔ Süresi dolmuş belge için Ekipman Takip maili gönderilmez.
//
// Müşteri (13.10.2026): "Mail gönderirken eğer tarih belgenin 'süre uzatımı tarihini' geçmiş ise maili
// gönderemesin uyarı/hata versin."
//
// Mail için süre uzatım tarihi önceliklidir. Daha ileri tarihli bitiş/mücbir alanı,
// geçmiş uzatım tarihini geçersiz kılamaz (müşteri, 17.10.2026: "denedim ama gönderdi").
// Uzatım boşsa bitiş/mücbir tarihlerinin en geç olanı esas alınır.
// Gün İstanbul takvimiyle sayılır: son gün hâlâ geçerlidir.

const { bugunBaslangici } = require('./belgeSureFiltresi');

const gecerliTarih = (v) => {
  if (!v) return null;
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? null : d;
};

/** @returns {Date|null} belgede hiç tarih yoksa null (kontrol yapılmaz) */
function sonGecerlilikTarihi(belge) {
  const by = (belge && belge.belgeYonetimi) || {};
  const uzatim = gecerliTarih(by.uzatimTarihi);
  if (uzatim) return uzatim;
  const tarihler = [by.belgeBitisTarihi, by.mucbirUzumaTarihi].map(gecerliTarih).filter(Boolean);
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
