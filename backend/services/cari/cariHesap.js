// 💳 CARİ HESAP — saf hesap kuralları
//
// Müşteri (Belge Takip › Ödemeler): "2 sütun olarak SOL tarafta, Ödenen Belge (biz
// yazabilelim içine), Tarih, Tutar, Belge Yükleme. SAĞ tarafta, Banka (Enpara, Garanti,
// Vakıf, Ziraat, Diğer - seçmeli), Tarih, Tutar ... gelen(banka tutar)-gideni(ödenen
// tutar) yeşil/kırmızı yapabiliriz."
// Taslak modül: "Firma seçince ödeme takip listesi gelsin ödenen tutar-kalan vs gibi
// klasik cari tablo" — müşterinin örnek Excel'indeki bakiye formülü:
//   TUTAR (KDV dahil) + MAKBUZ/DEKONT TUTARI − ÖDEME GELEN TUTAR
//
// Tek defter var: talep sekmesinden girilen hareketler de firmanın carisine düşer.
// Bu dosyada DB/HTTP yok. Para hesabındaki bir hata sessizce yanlış bakiye olarak
// ekrana çıkar; o yüzden kuralların tamamı birim testle korunuyor.

// Hareket türleri ve firmanın borcuna etkisi:
//   fatura → firmaya kesilen fatura (KDV dahil)          → borç artar
//   odenen → firma adına ödenen belge (harç, makbuz...)  → borç artar  ("giden")
//   gelen  → firmadan bankaya gelen ödeme                → borç azalır ("gelen")
const HAREKET_TURLERI = ['fatura', 'odenen', 'gelen'];
const YON = { fatura: 1, odenen: 1, gelen: -1 };

const BANKALAR = ['Enpara', 'Garanti', 'Vakıf', 'Ziraat', 'Diğer'];

// Toplamalar kuruş (tamsayı) üzerinden yapılır: 0.1 + 0.2 gibi toplamlar aksi halde
// 0.30000000000000004 çıkar ve bakiyesi sıfır olması gereken firma kuruşluk borçlu görünür.
const kurus = (tl) => Math.round((Number(tl) || 0) * 100);
const tl = (k) => k / 100;
const yuvarla = (n) => Math.round(n * 100) / 100;

const gecerliTur = (tur) => HAREKET_TURLERI.includes(tur);

// "1.234.567" → "1234567"; gruplar 3'lü değilse null ("12.34" binlik olamaz)
const binlikCoz = (s, ayrac) => {
  const [bas, ...digerleri] = s.split(ayrac);
  if (!digerleri.length) return s;
  const gecerli = /^-?\d{1,3}$/.test(bas) && digerleri.every((g) => /^\d{3}$/.test(g));
  return gecerli ? [bas, ...digerleri].join('') : null;
};

/**
 * Kullanıcının yazdığı tutarı sayıya çevirir; anlaşılamıyorsa null.
 *   "24.000" → 24000 · "24.000,50" → 24000.5 · "1,234.56" → 1234.56 (Excel'den yapıştırma)
 *   "12,5" → 12.5 · "12.50" → 12.5 · "1.500 TL" → 1500
 * Belirsiz yazımlar ("1234.567", "12.34,5") tahmin edilmez, null döner: yanlış tahmin
 * edilen bir tutar bin kat hatalı bakiye demek, reddedip yeniden yazdırmak daha güvenli.
 */
function tutarCoz(deger) {
  if (deger === null || deger === undefined || deger === '') return null;
  if (typeof deger === 'number') return Number.isFinite(deger) ? yuvarla(deger) : null;

  const s = String(deger).replace(/[^0-9.,-]/g, '');
  if (!/\d/.test(s)) return null;

  let normal;
  const sonVirgul = s.lastIndexOf(',');
  const sonNokta = s.lastIndexOf('.');
  if (sonVirgul >= 0 && sonNokta >= 0) {
    // İki ayraç birden: SONDAKİ ondalıktır — "1.234,56" (TR) · "1,234.56" (EN)
    const ondalik = sonVirgul > sonNokta ? ',' : '.';
    const i = s.lastIndexOf(ondalik);
    const tam = binlikCoz(s.slice(0, i), ondalik === ',' ? '.' : ',');
    const kusurat = s.slice(i + 1);
    normal = tam !== null && /^\d{1,2}$/.test(kusurat) ? `${tam}.${kusurat}` : null;
  } else if (sonVirgul >= 0 || sonNokta >= 0) {
    const ayrac = sonVirgul >= 0 ? ',' : '.';
    const parcalar = s.split(ayrac);
    // Tek ayraç + 1-2 hane → ondalık ("12,5"); 3'lü gruplar → binlik ("24.000")
    normal = parcalar.length === 2 && /^\d{1,2}$/.test(parcalar[1])
      ? `${parcalar[0]}.${parcalar[1]}`
      : binlikCoz(s, ayrac);
  } else {
    normal = s;
  }

  if (normal === null || !/^-?\d+(\.\d{1,2})?$/.test(normal)) return null;
  return yuvarla(Number(normal));
}

/**
 * "2026-09-15" · "15.09.2026" · "15/09/2026" → UTC gece yarısı; geçersizse null.
 * UTC gece yarısı: takvim günü sunucu/tarayıcı saat diliminden bağımsız kalsın.
 */
function tarihCoz(deger) {
  if (!deger) return null;
  if (deger instanceof Date) return Number.isNaN(deger.getTime()) ? null : deger;

  const s = String(deger).trim();
  let y; let m; let d;
  let r = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (r) [, y, m, d] = r;
  else if ((r = s.match(/^(\d{1,2})[./-](\d{1,2})[./-](\d{4})$/))) [, d, m, y] = r;
  else return null;

  y = Number(y); m = Number(m); d = Number(d);
  if (y < 1900 || y > 2100) return null;
  const t = new Date(Date.UTC(y, m - 1, d));
  // 31.02.2026 gibi taşan tarihleri Date sessizce Mart'a kaydırır — reddet
  if (t.getUTCFullYear() !== y || t.getUTCMonth() !== m - 1 || t.getUTCDate() !== d) return null;
  return t;
}

const toplamlar = (k) => ({
  toplamFatura: tl(k.fatura),
  toplamOdenen: tl(k.odenen),
  toplamGelen: tl(k.gelen),
  // Klasik cari bakiye (Excel'deki "ALACAK / BORÇ BAKİYESİ"): artıysa firma bize borçlu
  bakiye: tl(k.fatura + k.odenen - k.gelen),
  // Talep sekmesindeki mini tablo — müşterinin tarifi: "gelen − giden"
  fark: tl(k.gelen - k.odenen)
});

/** Hareket listesinin toplamları */
function ozetHesapla(hareketler = []) {
  const k = { fatura: 0, odenen: 0, gelen: 0 };
  let adet = 0;
  for (const h of hareketler || []) {
    if (!h || !gecerliTur(h.tur)) continue;
    k[h.tur] += kurus(h.tutar);
    adet += 1;
  }
  return { ...toplamlar(k), adet };
}

const zaman = (v) => {
  const t = v ? new Date(v).getTime() : NaN;
  return Number.isNaN(t) ? 0 : t;
};

// Kronolojik: müşteri "kaydettiklerimizi alt tarafa eklesin" dedi — yeni kayıt en altta.
// Aynı gün girilenler giriş sırasını korur.
const defterSirasi = (a, b) =>
  zaman(a.tarih) - zaman(b.tarih)
  || zaman(a.createdAt) - zaman(b.createdAt)
  || String(a._id || '').localeCompare(String(b._id || ''));

/** Sıralı defter + her satırda o ana kadarki bakiye. Girdiyi değiştirmez. */
function defterOlustur(hareketler = []) {
  let bakiye = 0;
  return (hareketler || [])
    .filter((h) => h && gecerliTur(h.tur))
    .slice()
    .sort(defterSirasi)
    .map((h) => {
      bakiye += kurus(h.tutar) * YON[h.tur];
      return { ...h, bakiye: tl(bakiye) };
    });
}

/**
 * Mongo'nun { _id: { firma, tur }, toplam, adet, sonTarih, firmaUnvan } gruplarını
 * firma başına tek özete katlar (cari hesaplar listesi).
 */
function firmaOzetleriniKatla(gruplar = []) {
  const firmalar = new Map();
  for (const g of gruplar || []) {
    const firma = g?._id?.firma ? String(g._id.firma) : '';
    const tur = g?._id?.tur;
    if (!firma || !gecerliTur(tur)) continue;

    if (!firmalar.has(firma)) {
      firmalar.set(firma, { firma, firmaUnvan: '', adet: 0, sonHareketTarihi: null, k: { fatura: 0, odenen: 0, gelen: 0 } });
    }
    const f = firmalar.get(firma);
    f.k[tur] += kurus(g.toplam);
    f.adet += Number(g.adet) || 0;
    if (!f.firmaUnvan && g.firmaUnvan) f.firmaUnvan = g.firmaUnvan;
    if (g.sonTarih && zaman(g.sonTarih) > zaman(f.sonHareketTarihi)) f.sonHareketTarihi = g.sonTarih;
  }

  return [...firmalar.values()]
    .map(({ k, ...f }) => ({ ...f, ...toplamlar(k) }))
    .sort((a, b) => a.firmaUnvan.localeCompare(b.firmaUnvan, 'tr'));
}

module.exports = {
  HAREKET_TURLERI,
  BANKALAR,
  YON,
  kurus,
  tutarCoz,
  tarihCoz,
  ozetHesapla,
  defterOlustur,
  firmaOzetleriniKatla
};
