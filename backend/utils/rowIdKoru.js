// 🔗 Makine satırı kimliğini (rowId) koruma
//
// Müşteri (23.09.2026): "Biz bu değişiklikleri yaptığımızda … gelen evrakların kaybolmaması
// gerekiyor. … Bu değişiklikler sırasında geriye dönük veri kaybı yaşamayalım."
//
// Ekipman Takip'te her makinenin süreci (MachineProcess: evraklar, mail geçmişi, hatırlatmalar)
// makine satırına YALNIZ `rowId` ile bağlıdır. Tesvik şemasında rowId'nin varsayılanı yeni bir
// ObjectId; liste rowId'siz yeniden yazıldığında (Excel'den yeniden içe aktarma, revize finali)
// aynı makine yeni bir kimlik alır ve süreci yetim kalır — tabloda evrak sayısı ve son mail boş
// görünür. 22.09.2026 canlı ölçümünde 51 sürecin 7'si bu yüzden yetimdi.
//
// Bu yardımcı, gelen satırın rowId'si yoksa MAKİNE ID'si (E-TUYS makine kimliği) ile eşleşen eski
// satırın rowId'sini geri verir. Yalnız makineId ile eşleşir: sıra no yeniden numaralanabildiği,
// ad/GTİP ise tekrar edebildiği için onlarla eşleştirmek evrakı YANLIŞ makineye bağlayabilir —
// yetim kalmaktan daha kötüsü budur.

const anahtar = (v) => String(v ?? '').trim();

/** makineId → rowId (yalnız tek bir satırda geçen, boş olmayan makine ID'leri) */
function rowIdHaritasi(mevcut) {
  const sayim = new Map();
  for (const r of mevcut || []) {
    const mid = anahtar(r?.makineId);
    const rid = anahtar(r?.rowId);
    if (!mid || !rid) continue;
    const onceki = sayim.get(mid);
    if (onceki === undefined) sayim.set(mid, rid);
    else if (onceki !== rid) sayim.set(mid, null); // aynı makine ID iki satırda → güvenli değil
  }
  const harita = new Map();
  for (const [mid, rid] of sayim) if (rid) harita.set(mid, rid);
  return harita;
}

/**
 * Gelen listedeki rowId'siz satırlara, aynı makine ID'li eski satırın rowId'sini yazar.
 * Zaten rowId taşıyan satıra dokunulmaz. Aynı rowId iki satıra verilmez.
 *
 * @param {Array} gelen   istemciden gelen satırlar (yerinde DEĞİŞTİRİLMEZ)
 * @param {Array} mevcut  veritabanındaki mevcut satırlar
 * @returns {{ satirlar: Array, korunan: number }}
 */
function rowIdleriKoru(gelen, mevcut) {
  const liste = Array.isArray(gelen) ? gelen : [];
  const harita = rowIdHaritasi(mevcut);
  const kullanilan = new Set(liste.map((r) => anahtar(r?.rowId)).filter(Boolean));
  let korunan = 0;
  const satirlar = liste.map((r) => {
    if (anahtar(r?.rowId)) return r;
    const eski = harita.get(anahtar(r?.makineId));
    if (!eski || kullanilan.has(eski)) return r;
    kullanilan.add(eski);
    korunan += 1;
    return { ...r, rowId: eski };
  });
  return { satirlar, korunan };
}

module.exports = { rowIdleriKoru, rowIdHaritasi };
