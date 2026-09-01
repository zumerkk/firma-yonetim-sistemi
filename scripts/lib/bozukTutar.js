// 🔬 BOZUK FİNANSAL TUTAR SINIFLANDIRMASI — ORTAK MANTIK
//
// Hem tarama (tara-bozuk-tutarlar.js) hem onarım (onar-bozuk-tutarlar.js) bu
// modülü kullanır. Ayrı ayrı kopyalanırsa ikisi zamanla ayrışır ve "tarama şunu
// dedi ama onarım başka şey yaptı" durumu doğar — bu projede tam olarak bu tür
// bir ayrışma (aynı sayı parse mantığının üç ayrı kopyası) sorunun kaynağıydı.

// ─────────────────────────── AYARLANABİLİR EŞİK ───────────────────────────
// Bir yatırım teşvik belgesinde toplam sabit yatırımın makul alt sınırı.
// Bunun altındaki dolu kayıtlar "1000'e bölünmüş olabilir" diye işaretlenir.
// ⚠️ Bu değeri kendi portföyünüze göre ayarlayın: gerçekten küçük yatırımlarınız
//    varsa düşürün, hepsi milyonlarsa yükseltin.
const MAKUL_ALT_SINIR_TL = 100000; // 100 bin TL

// Bileşenlerin toplamı ile kayıtlı toplam arasında kabul edilebilir sapma.
// 1000 kat fark net bir bozulma sinyali; küçük yuvarlama farkları normal.
const TUTARSIZLIK_ORANI = 100; // kat

// ─────────────────────────── ŞÜPHE + ONARIM ANALİZİ ───────────────────────────
// Bozulmanın imzası: bir BİNLİK GRUBU ondalık tarafa düşmüş.
//   10.978.972 TL  →  10978.972 olarak saklanmış
// Ters işlem 1000 ile çarpmak. Onarım yine de her kayıtta bileşenlerin
// toplamıyla ÇAPRAZ DOĞRULANIYOR — kapanmayan kayda dokunulmuyor.

/**
 * Bozulmuş tutarı onarır.
 *
 * ⚠️ Buradaki işlem "ondalık noktayı sil" DEĞİL, "1000 ile çarp". Fark kritik:
 * bozulan şey bir BİNLİK GRUBU, yani her zaman üç hane. Ama float gösterimi
 * sondaki sıfırları yutuyor ve nokta silme o vakalarda 10 veya 100 kat yanlış
 * sonuç veriyor:
 *
 *   188.21              nokta sil → 18.821          ✗   ×1000 → 188.210        ✓
 *   2621083.88          nokta sil → 262.108.388     ✗   ×1000 → 2.621.083.880  ✓
 *   107313.79699999999  nokta sil → 10 katrilyon    ✗   ×1000 → 107.313.797    ✓
 *
 * Son satır float artığı: string'e çevrilince kuyruk aynen geliyor. ×1000 +
 * yuvarlama her iki sorunu birden çözüyor.
 */
const onar = (n) => (Number.isFinite(n) ? Math.round(n * 1000) : n);

/**
 * Bozulma İMZASI taşıyan değerleri onarır, sağlamlara dokunmaz.
 *
 * Bozulma her zaman ondalık bırakır (binlik grubu virgülün sağına düşmüş).
 * Tam sayı olan alan bozulmamıştır — onu da çarpmak 1000 kat şişirir. Dizgi
 * sürümünde bu kendiliğinden doğruydu (tam sayıda nokta yok); ×1000'e geçince
 * açıkça yazılması gerekti.
 */
const onarGerekiyorsa = (n) => (Number.isFinite(n) && !Number.isInteger(n) ? onar(n) : n);

// Eski ad — dışarıdan çağıran kod kırılmasın diye korunuyor
const noktayiSil = onar;

const SAY = (v) => Number(v) || 0;

/** Kaydın mali bileşenlerini tek yerden okur (eski/yeni şema aynı). */
function bilesenleriOku(mali) {
  return {
    arazi: SAY(mali.maliyetlenen?.sn) || SAY(mali.araciArsaBedeli),
    bina: SAY(mali.binaInsaatGideri?.toplamBinaGideri),
    makine: SAY(mali.makinaTechizat?.toplamMakina),
    diger: SAY(mali.yatirimHesaplamalari?.ez),
    toplam: SAY(mali.toplamSabitYatirim)
  };
}

/**
 * Bir kaydı değerlendirir.
 * @returns {null | {sinif, ham, onarilmis, bilesenToplami, aciklama}}
 *   sinif: 'ONARILABILIR'  → nokta silindiğinde bileşenler toplamı = toplam (güvenli)
 *          'TOPLAM_BOZUK'  → bileşenler sağlam, sadece toplam tutmuyor (yeniden hesaplanabilir)
 *          'ELLE_INCELE'   → otomatik karar verilemez
 *   null  → kayıt temiz
 */
function degerlendir(mali) {
  if (!mali) return null;
  const ham = bilesenleriOku(mali);
  if (ham.toplam <= 0) return null;

  // Bozulma şüphesi: ya toplam absürt küçük ya da tam sayı olmayan bir TL tutarı var
  const ondalikVar = Object.values(ham).some((v) => v > 0 && !Number.isInteger(v));
  const kucukToplam = ham.toplam < MAKUL_ALT_SINIR_TL;
  if (!ondalikVar && !kucukToplam) return null;

  const onarilmis = {
    arazi: onarGerekiyorsa(ham.arazi), bina: onarGerekiyorsa(ham.bina),
    makine: onarGerekiyorsa(ham.makine), diger: onarGerekiyorsa(ham.diger),
    toplam: onarGerekiyorsa(ham.toplam)
  };
  const bilesenToplami = onarilmis.arazi + onarilmis.bina + onarilmis.makine + onarilmis.diger;

  // Tolerans: 1 TL ya da binde bir — hangisi büyükse
  const tolerans = Math.max(1, onarilmis.toplam * 0.001);

  if (bilesenToplami > 0 && Math.abs(bilesenToplami - onarilmis.toplam) <= tolerans) {
    return {
      sinif: 'ONARILABILIR', ham, onarilmis, bilesenToplami,
      aciklama: `Onarım sonrası bileşenler (${bilesenToplami.toLocaleString('tr-TR')}) toplamla birebir tutuyor`
    };
  }
  if (bilesenToplami > 0) {
    return {
      sinif: 'TOPLAM_BOZUK', ham, onarilmis, bilesenToplami,
      aciklama: `Bileşenler ${bilesenToplami.toLocaleString('tr-TR')} ₺ ama onarılmış toplam ${onarilmis.toplam.toLocaleString('tr-TR')} ₺ — toplam bileşenlerden yeniden hesaplanmalı`
    };
  }
  return {
    sinif: 'ELLE_INCELE', ham, onarilmis, bilesenToplami,
    aciklama: 'Bileşenler boş; kaynak Excel ile karşılaştırılmalı'
  };
}

module.exports = {
  MAKUL_ALT_SINIR_TL,
  onar,
  onarGerekiyorsa,
  TUTARSIZLIK_ORANI,
  noktayiSil,
  bilesenleriOku,
  degerlendir
};
