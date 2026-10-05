// 💱 İthal makine tutarları — tek hesap kuralı (eski ve yeni belge makine ekranları ortak)
//
// Müşteri (05.10.2026): "Döviz cinsi EUR olsa bile onun birim fiyatını yazmıyor hepsini USD
// üzerinden alıyor." E-TUYS'te (müşterinin şablonundaki "ETUYS İTL. MAK. ÖRN. GÖRÜNTÜ"):
// 165.000 EUR birim fiyat → Toplam Tutarı(FOB $) 179.000 · Toplam Tutarı(FOB TL) 5.768.630,85.
// Bizde "$" sütunu miktar × birim fiyat yazıyordu — EUR tutarını dolar sayıyordu (canlıda EUR'lu
// 2.225 satırın ~%97'si). TL tarafı doğruydu (EUR→TL kuru ile).
//
// İkinci kusur: ekran her açılışta ve her satır değişiminde TÜM satırların TL'sini o günün kuruyla
// yeniden hesaplıyordu; liste kaydedilince eski makinelerin TL'si kendi kendine değişiyordu
// ("fiyatlar ... değişiyor"). Artık:
//   · tutarlar yalnız girdileri (miktar, birim fiyat, döviz, kur) değişince hesaplanır;
//   · açılışta yalnız BOŞ tutarlar ve dövizden hiç çevrilmemiş "$" (eski hata) doldurulur;
//   · elle girilen $ (usdManuel), TL (tlManuel) ve manuel kur her zaman korunur.
// Bu dosyada ağ/durum yok; kurlar çağıran ekranın önbelleğinden gelir.

const sayi = (v) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};
const kurusaYuvarla = (n) => Math.round(n * 100) / 100;

export const dovizKodu = (r) => String(r?.doviz || '').trim().toUpperCase();
const TL_KODU = new Set(['TRY', 'TRL', 'TL']);
const dolarGibi = (kod) => kod === '' || kod === 'USD';

/** Kur servisi için kod: eski kayıtlardaki TRL/TL → TRY */
export const kurKodu = (kod) => (TL_KODU.has(kod) ? 'TRY' : kod);

/** Menşe döviz cinsinden toplam (miktar × birim fiyat) */
export const dovizliToplam = (r) => sayi(r?.miktar) * sayi(r?.birimFiyatiFob);

/**
 * Toplam FOB $. Elle girildiyse o; döviz USD (ya da boş) ise dövizli toplam; değilse
 * parite (1 birim döviz = ? USD) gerekir — bilinmiyorsa null.
 */
export const usdHesapla = (r, parite) => {
  if (r?.usdManuel) return sayi(r.toplamUsd);
  const t = dovizliToplam(r);
  if (dolarGibi(dovizKodu(r))) return t;
  return parite > 0 ? kurusaYuvarla(t * parite) : null;
};

/**
 * Toplam FOB TL. Manuel kur (1 döviz = ? TL) varsa dövizli toplam × o kur; TL elle girildiyse o;
 * döviz TL ise dövizli toplam; değilse kur (1 döviz = ? TL) gerekir — bilinmiyorsa null.
 * Dolar satırında $ elle girildiyse (E-TUYS'teki tutar) TL o tutardan hesaplanır.
 */
export const tlHesapla = (r, kur) => {
  const kod = dovizKodu(r);
  const taban = dolarGibi(kod) && r?.usdManuel ? sayi(r.toplamUsd) : dovizliToplam(r);
  if (r?.kurManuel && sayi(r.kurManuelDeger) > 0) return Math.round(taban * sayi(r.kurManuelDeger));
  if (r?.tlManuel) return sayi(r.toplamTl);
  if (TL_KODU.has(kod)) return taban;
  if (!kod) return null;
  return kur > 0 ? Math.round(taban * kur) : null;
};

/** "$" dövizden hiç çevrilmemiş mi (eski hata: EUR tutarı dolar diye yazılmış) */
export const usdCevrilmemis = (r) => {
  const kod = dovizKodu(r);
  const t = dovizliToplam(r);
  return !r?.usdManuel && !dolarGibi(kod) && t > 0 && Math.abs(sayi(r.toplamUsd) - t) < 0.005;
};

/** Açılışta doldurulması gereken $: boş, çevrilmemiş ya da dolar satırında formülle tutmayan */
export const usdEksik = (r) => {
  if (r?.usdManuel || !(dovizliToplam(r) > 0)) return false;
  if (!(sayi(r.toplamUsd) > 0)) return true;
  if (dolarGibi(dovizKodu(r))) return Math.abs(sayi(r.toplamUsd) - dovizliToplam(r)) >= 0.005;
  return usdCevrilmemis(r);
};

/** Açılışta doldurulması gereken TL: yalnız BOŞ olan (dolu TL o günkü kurla korunur) */
export const tlEksik = (r) => !r?.tlManuel && dovizliToplam(r) > 0 && !(sayi(r.toplamTl) > 0);

// Hangi alan değişince hangi tutar yeniden hesaplanır
const USD_GIRDILERI = ['miktar', 'birimFiyatiFob', 'doviz', 'usdManuel', 'toplamUsd'];
const TL_GIRDILERI = ['miktar', 'birimFiyatiFob', 'doviz', 'kurManuel', 'kurManuelDeger', 'tlManuel', 'usdManuel', 'toplamUsd'];

/**
 * Satırın değişen alanlarına göre tutarları yeniden hesaplar (girdisi değişmeyen tutara dokunmaz).
 * Kur/parite bilinmiyorsa tutar 0'a çekilir; ekranın "eksikleri doldur" adımı kuru getirip yazar.
 * @param degisenler değişen alan adları (yeni satır için Object.keys(satir))
 * @param kurlar { parite: 1 döviz = ? USD, kur: 1 döviz = ? TL }
 */
export function ithalTutarlariniGuncelle(r, degisenler, { parite, kur } = {}) {
  const d = new Set(degisenler || []);
  const s = { ...r };
  if (!r.usdManuel && USD_GIRDILERI.some((k) => d.has(k))) {
    s.toplamUsd = usdHesapla(s, parite) ?? 0;
  }
  if (TL_GIRDILERI.some((k) => d.has(k))) {
    if (s.kurManuel && sayi(s.kurManuelDeger) > 0) {
      s.toplamTl = tlHesapla(s, kur);
      s.tlManuel = true; // manuel kurla hesaplanan TL günlük kurla ezilmesin (eski davranış)
    } else if (!s.tlManuel) {
      s.toplamTl = tlHesapla(s, kur) ?? 0;
    }
  }
  return s;
}

/** Açılışta / kur gelince: yalnız eksik tutarları doldurur; değişiklik yoksa AYNI nesneyi döner */
export function eksikTutarlariDoldur(r, { parite, kur } = {}) {
  let s = r;
  if (usdEksik(r)) {
    const u = usdHesapla(r, parite);
    if (u !== null && u !== sayi(r.toplamUsd)) s = { ...s, toplamUsd: u };
  }
  if (tlEksik(s)) {
    const t = tlHesapla(s, kur);
    if (t !== null && t !== sayi(s.toplamTl)) s = { ...s, toplamTl: t };
  }
  return s;
}
