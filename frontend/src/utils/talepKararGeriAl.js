// ↩️ REVİZE İPTALİNDE TALEP/KARAR GERİ ALMA
//
// Müşteri (11 Eylül 2026): "Listede işlemi iptal etsek bile yaptığımız
// değişiklikler kalıyor iptal olmuyor."
//
// SEBEP — makine listesinde iki farklı kaydetme davranışı var:
//   · Hücre düzenlemeleri (adet, fiyat, GTİP…) yalnız yerel state'e yazılır ve
//     "Kaydet"i bekler. İptal sunucudan yeniden yükleyince bunlar doğru şekilde
//     kaybolur.
//   · Talep/Karar düzenlemeleri (tarih, durum) ANINDA sunucuya yazılır. Bu
//     bilinçliydi ("talep göndermeden tarihi girebilelim"), ama İptal'in bunları
//     geri alamaması demekti: yeniden yükleme zaten kaydedilmiş veriyi getiriyordu.
//
// ÇÖZÜM — Revize Başlat anında talep/karar'ın anlık görüntüsü alınır; İptal'de
// yalnızca DEĞİŞMİŞ satırlar eski hâline geri yazılır.
//
// Bu dosya yalnızca "neyin geri yazılacağı" kararını verir; ağ çağrılarını
// çağıran ekran yapar. Karar mantığı burada olduğu için test edilebiliyor.

// Karşılaştırmada tarih nesneleri ile ISO metinleri karışabiliyor (sunucudan
// metin, yerelde new Date()). İkisini de aynı biçime indiriyoruz ki yalnızca
// biçim farkı yüzünden gereksiz geri yazma yapılmasın.
const karsilastirilabilir = (deger) => {
  if (deger === undefined || deger === null) return null;
  if (deger instanceof Date) return Number.isNaN(deger.getTime()) ? null : deger.toISOString();
  if (typeof deger === 'object') {
    const cikti = {};
    for (const anahtar of Object.keys(deger).sort()) {
      const v = karsilastirilabilir(deger[anahtar]);
      if (v !== null && v !== undefined && v !== '') cikti[anahtar] = v;
    }
    return cikti;
  }
  // "2027-05-31T00:00:00.000Z" ile new Date(...) aynı sayılsın
  if (typeof deger === 'string') {
    const t = Date.parse(deger);
    if (!Number.isNaN(t) && /\d{4}-\d{2}-\d{2}/.test(deger)) return new Date(t).toISOString();
  }
  return deger;
};

const ayniMi = (a, b) => JSON.stringify(karsilastirilabilir(a)) === JSON.stringify(karsilastirilabilir(b));

/**
 * Revize sırasında talep/karar'ı değişmiş satırları bulur.
 *
 * @param {Map<string,{talep:object,karar:object}>} anlik  Revize başlarkenki görüntü
 * @param {Array} satirlar  Şu anki satırlar ({ rowId, talep, karar })
 * @param {string} liste    'yerli' | 'ithal' — geri yazma çağrısına gider
 * @returns {Array<{liste:string,rowId:string,alan:'talep'|'karar',deger:object}>}
 */
export function geriAlinacaklar(anlik, satirlar, liste) {
  const isler = [];
  if (!anlik || !Array.isArray(satirlar)) return isler;

  for (const satir of satirlar) {
    const rowId = satir && satir.rowId;
    if (!rowId) continue;                 // revize sırasında eklenmiş satır: anlık görüntüde yok
    const eski = anlik.get(String(rowId));
    if (!eski) continue;

    for (const alan of ['talep', 'karar']) {
      if (ayniMi(eski[alan], satir[alan])) continue;
      // Alan eskiden hiç yoksa boş nesne yazıyoruz: sunucudaki değeri temizlemenin yolu
      isler.push({ liste, rowId: String(rowId), alan, deger: eski[alan] || {} });
    }
  }
  return isler;
}

/**
 * Satır listesinden anlık görüntü üretir (yalnızca rowId'si olanlar).
 */
export function anlikGoruntuAl(satirlar) {
  const harita = new Map();
  for (const satir of satirlar || []) {
    if (!satir || !satir.rowId) continue;
    harita.set(String(satir.rowId), {
      talep: satir.talep ? { ...satir.talep } : undefined,
      karar: satir.karar ? { ...satir.karar } : undefined
    });
  }
  return harita;
}
