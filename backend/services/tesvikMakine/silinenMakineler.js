// 🗑️ Silinen makineler — müşteri görünümü çıktısında kırmızı "SİLİNDİ" satırları için
//
// Müşteri (07.10.2026): "Makine listesinde silinenleri pdf çıktısından komple kaldırmak yerine kırmızı
// yazıyla 'Silindi' gibi bir şey yazabilir miyiz belli olsun?"
// Müşteri (09.10.2026): "Komple bütün revizyonları gösteriyor ... liste çok kabaracak, birde yanlışlıkla
// revizyon ekleyip silsek vs de gösteriyor. Sadece en son işlemde silinen makineler varsa onları ve
// silinme tarihlerini göstermesi yeterli."
//
// Silinen satır makine listesinden fiziksel olarak çıkıyor; izi yalnız makine revizyon kayıtlarında kalıyor.
// Kayıtlar canlıda neredeyse hep "başlat → bitir" çifti (695 belgenin 550'si "sf", 94'ü "sfsf" ile bitiyor).
// ESAS LİSTE = son TAMAMLANAN revizyonun başındaki liste (son "final"dan önceki son "start"; son işlem
// geri dönüşse ondan önceki kayıt; hiç bitirilmemişse son "start"). Silinen = esas listede olup şu anki
// listede olmayan makine. Böylece revizyonda eklenip aynı revizyonda silinen makine hiç görünmez, eski
// revizyonlarda silinenler de birikmez. Silinme tarihi = makinenin listeden ilk kaybolduğu sonraki kaydın
// tarihi (genelde revizyonun "bitir" anı); henüz kayda geçmemişse (süren revizyon) tarih yok.
//
// ⚠️ rowId'ye GÜVENİLEMEZ: canlıda (07.10.2026, salt okuma) geçmişteki satır kimliklerinin büyük kısmı
// yeniden üretilmiş (art arda gelen 671 revizyon çiftinin 280'inde kimliklerin çoğu değişmiş). Bir satır
// şu üçünden BİRİ tutarsa "listede" sayılır: aynı rowId · aynı ad+GTİP · aynı makine ID.

const LISTELER = ['yerli', 'ithal'];

// Çıktıda gereken alanlar (yerli + ithal)
const ALANLAR = [
  'rowId', 'siraNo', 'makineId', 'gtipKodu', 'adiVeOzelligi', 'miktar', 'birim', 'birimAciklamasi',
  'birimFiyatiTl', 'toplamTutariTl', 'kdvIstisnasi', 'finansalKiralamaMi',
  'birimFiyatiFob', 'gumrukDovizKodu', 'toplamTutarFobUsd', 'toplamTutarFobTl',
  'kullanilmisMakine', 'kullanilmisMakineAciklama', 'gumrukVergisiMuafiyeti', 'kdvMuafiyeti'
];
const ESLEME_ALANLARI = ['rowId', 'adiVeOzelligi', 'gtipKodu', 'makineId'];

const metin = (s) => String(s ?? '').toLocaleLowerCase('tr').replace(/\s+/g, ' ').trim();
const adGtip = (r) => `${metin(r?.adiVeOzelligi)}|${String(r?.gtipKodu ?? '').trim()}`;
const makineId = (r) => String(r?.makineId ?? '').trim();

/** Bir listede satırın (rowId / ad+GTİP / makine ID ile) bulunup bulunmadığını söyleyen yoklayıcı */
function listedeMiYoklayicisi(liste = []) {
  const rowIdler = new Set(liste.map((r) => r?.rowId).filter(Boolean));
  const adlar = new Set(liste.map(adGtip));
  const idler = new Set(liste.map(makineId).filter(Boolean));
  return (r) => Boolean((r?.rowId && rowIdler.has(r.rowId)) || adlar.has(adGtip(r))
    || (makineId(r) && idler.has(makineId(r))));
}

/**
 * Esas alınacak revizyon kaydının indeksi (bkz. dosya başı). Kayıtlar eskiden yeniye.
 * @returns {number} -1 → geçmiş yok
 */
function esasKayitIndeksi(gecmis = []) {
  const tur = (i) => gecmis[i]?.revizeTuru || 'start';
  let son = -1;
  for (let i = gecmis.length - 1; i >= 0; i -= 1) {
    if (tur(i) === 'final' || tur(i) === 'revert') { son = i; break; }
  }
  if (son === -1) {
    for (let i = gecmis.length - 1; i >= 0; i -= 1) if (tur(i) === 'start') return i;
    return gecmis.length - 1;
  }
  if (tur(son) === 'revert') return Math.max(son - 1, 0);
  for (let i = son - 1; i >= 0; i -= 1) if (tur(i) === 'start') return i;
  return Math.max(son - 1, 0);
}

/**
 * 1. aşama (yalnız eşleme alanları yeterli): esas kayıttaki hangi makineler silinmiş, ne zaman.
 * @returns {{ esas: number, yerli: Map<adGtip, silinmeTarihi|null>, ithal: Map<...> }}
 */
function silinenAnahtarlari(guncel = {}, gecmis = []) {
  const esas = esasKayitIndeksi(gecmis);
  const sonuc = { esas };
  for (const liste of LISTELER) {
    const silinen = new Map();
    if (esas >= 0) {
      const simdiVar = listedeMiYoklayicisi(guncel?.[liste] || []);
      const sonrakiler = gecmis.slice(esas + 1).map((k) => ({
        tarih: k?.revizeTarihi || null, varMi: listedeMiYoklayicisi(k?.[liste] || [])
      }));
      for (const r of gecmis[esas]?.[liste] || []) {
        if (!r || !metin(r.adiVeOzelligi) || simdiVar(r) || silinen.has(adGtip(r))) continue;
        const kayboldugu = sonrakiler.find((k) => !k.varMi(r));
        silinen.set(adGtip(r), kayboldugu ? kayboldugu.tarih : null);
      }
    }
    sonuc[liste] = silinen;
  }
  return sonuc;
}

/** 2. aşama: silinen makinelerin esas kayıttaki tam hali + silinme tarihi, sıra no'ya göre */
function silinenSatirlari(anahtarlar, esasKayit = {}) {
  const sonuc = {};
  for (const liste of LISTELER) {
    const satirlar = esasKayit?.[liste] || [];
    sonuc[liste] = [...(anahtarlar[liste] || new Map())].map(([anahtar, silinmeTarihi]) => {
      const satir = satirlar.find((r) => adGtip(r) === anahtar);
      return satir ? { ...satir, silinmeTarihi } : null;
    }).filter(Boolean).sort((a, b) => (Number(a.siraNo) || 0) - (Number(b.siraNo) || 0));
  }
  return sonuc;
}

/**
 * @param guncel  { yerli: [], ithal: [] } — belgenin şu anki makine listeleri
 * @param gecmis  revizyon kayıtları (her biri { revizeTuru, revizeTarihi, yerli, ithal }), eskiden yeniye
 * @returns { yerli: [], ithal: [] } — son revizyonda silinen makineler + `silinmeTarihi`
 */
function silinenMakineleriBul(guncel = {}, gecmis = []) {
  const anahtarlar = silinenAnahtarlari(guncel, gecmis);
  return silinenSatirlari(anahtarlar, gecmis[anahtarlar.esas]);
}

const projeksiyon = (onEk, alanlar) => Object.fromEntries([
  [`${onEk}revizeTarihi`, 1],
  [`${onEk}revizeTuru`, 1],
  ...LISTELER.flatMap((l) => alanlar.map((a) => [`${onEk}${l}.${a}`, 1]))
]);

/**
 * Bir belgenin son revizyonda silinen makineleri. 830 makine × 23 revizyonluk belgede (ST Turkuaz)
 * geçmişin tamamını çıktı alanlarıyla okumak canlıda ~6 sn sürdü; önce yalnız eşleme alanları okunur,
 * tam satırlar yalnız esas kayıttan.
 */
async function silinenleriOku(Model, id) {
  const MakineRevizyonKaydi = require('../../models/MakineRevizyonKaydi');
  const belge = await Model.findById(id).select('makineRevizyonDeposu makineListeleri').lean();
  if (!belge) return null;
  const guncel = belge.makineListeleri || {};

  if (belge.makineRevizyonDeposu !== 'ayri') {
    // Gömülü geçmiş (göç öncesi belgeler): tek okuma
    const eski = await Model.findById(id).select(projeksiyon('makineRevizyonlari.', ALANLAR)).lean();
    const gecmis = [...(eski?.makineRevizyonlari || [])]
      .sort((a, b) => new Date(a.revizeTarihi || 0) - new Date(b.revizeTarihi || 0));
    return silinenMakineleriBul(guncel, gecmis);
  }

  const anahtar = { tesvik: belge._id, tesvikModeli: Model.modelName };
  const kayitlar = await MakineRevizyonKaydi.find(anahtar)
    .select({ sira: 1, ...projeksiyon('snapshot.', ESLEME_ALANLARI) }).sort({ sira: 1 }).lean();
  const anahtarlar = silinenAnahtarlari(guncel, kayitlar.map((k) => k.snapshot || {}));
  if (anahtarlar.esas < 0 || !LISTELER.some((l) => anahtarlar[l].size)) return { yerli: [], ithal: [] };

  const esas = await MakineRevizyonKaydi.findOne({ ...anahtar, sira: kayitlar[anahtarlar.esas].sira })
    .select(projeksiyon('snapshot.', ALANLAR)).lean();
  return silinenSatirlari(anahtarlar, esas?.snapshot || {});
}

/** GET /:id/makine-revizyon/silinenler */
const silinenlerUcu = (Model) => async (req, res) => {
  try {
    const veri = await silinenleriOku(Model, req.params.id);
    if (!veri) return res.status(404).json({ success: false, message: 'Teşvik bulunamadı' });
    res.json({ success: true, data: veri });
  } catch (error) {
    console.error('silinen makineler hatası:', error);
    res.status(500).json({ success: false, message: 'Silinen makineler okunamadı' });
  }
};

module.exports = { silinenMakineleriBul, esasKayitIndeksi, silinenleriOku, silinenlerUcu };
