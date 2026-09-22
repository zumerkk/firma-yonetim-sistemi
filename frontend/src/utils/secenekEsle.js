// 🔎 Kayıtlı değeri seçenek listesinde bulma — yazım farkı gözetmeden
//
// Müşteri (22.09.2026): "Revize yaparken seçili olan kısımların bazıları görünmüyor ama destek sınıfı-cinsi vs."
// Canlıda ölçüldü: belgelerdeki değerler E-TUYS'tan büyük harfle geliyor, seçenekler başka yazımda:
//   il/ilçe     "BURSA", "NILÜFER", "MERKEZ"        ↔ "Bursa", "Nilüfer", "Niğde Merkez"
//   destek      "BÖLGESEL" (459), "BÖLGESEL - ALT BÖLGE" ↔ kod "BOLGESEL" / "BÖLGESEL-Alt Bölge"
//   J-CNS       "KOMPLE YENİ YATIRIM" (172), "TEVSİ"  ↔ "Komple Yeni", "Tevsi"
//   NACE        "2929 - DİĞER ÖZEL AMAÇLI…"          ↔ "2929"
//   bölge       "1. Bolge"                             ↔ "1. Bölge"
// Seçim kutusu değeri birebir bulamayınca BOŞ gösteriyordu; veri doğruydu, eşleşme yoktu.

/** Karşılaştırma anahtarı: Türkçe büyük harf, işaretsiz, yalnız harf/rakam ("Niğde Merkez" → "NIGDEMERKEZ") */
export const esleAnahtari = (deger) => String(deger ?? '')
  .toLocaleUpperCase('tr-TR')
  .normalize('NFKD')
  .replace(/[\u0300-\u036f]/g, '')
  .replace(/[^A-Z0-9]/g, '');

const ONEK_EN_AZ = 4;

/**
 * Kayıtlı değere karşılık gelen seçeneğin sırası; yoksa -1.
 * Önce yazım farkı gözetmeden birebir (değer ya da etiket), sonra önek: kayıtlı değer seçenekle
 * BAŞLIYORSA ("KOMPLE YENİ YATIRIM" → "Komple Yeni", "2929 - DİĞER…" → "2929"); birden çok aday varsa en
 * uzun olan. Ters yönde (kayıtlı daha kısa) eşleme yapılmaz: "BÖLGESEL" "BÖLGESEL-Alt Bölge" sanılmasın.
 *
 * @param {string} kayitli
 * @param {Array} secenekler
 * @param {{ deger?: Function, etiket?: Function }} [al]
 */
export function eslesenSecenek(kayitli, secenekler, { deger = (s) => s?.value ?? s, etiket = (s) => s?.label ?? s } = {}) {
  const k = esleAnahtari(kayitli);
  if (!k) return -1;
  const liste = Array.isArray(secenekler) ? secenekler : [];
  const anahtarlar = liste.map((s) => [esleAnahtari(deger(s)), esleAnahtari(etiket(s))]);

  const birebir = anahtarlar.findIndex(([d, e]) => d === k || e === k);
  if (birebir >= 0) return birebir;

  let enIyi = -1;
  let enUzun = ONEK_EN_AZ - 1;
  anahtarlar.forEach((adaylar, i) => {
    for (const a of adaylar) {
      if (a.length > enUzun && k.startsWith(a)) { enIyi = i; enUzun = a.length; }
    }
  });
  return enIyi;
}

/**
 * İlçe: E-TUYS merkez ilçeyi "MERKEZ" yazıyor, ilçe listesinde "Niğde Merkez" gibi duruyor.
 * @returns {number} eşleşen ilçenin sırası; yoksa -1
 */
export function eslesenIlce(kayitliIlce, ilceler, ilAdi, { ad = (d) => d?.ad ?? d } = {}) {
  const i = eslesenSecenek(kayitliIlce, ilceler, { deger: ad, etiket: ad });
  if (i >= 0) return i;
  if (esleAnahtari(kayitliIlce) !== 'MERKEZ') return -1;
  const il = esleAnahtari(ilAdi);
  const liste = Array.isArray(ilceler) ? ilceler : [];
  const merkez = liste.findIndex((d) => esleAnahtari(ad(d)) === `${il}MERKEZ`);
  return merkez >= 0 ? merkez : liste.findIndex((d) => esleAnahtari(ad(d)).endsWith('MERKEZ'));
}
