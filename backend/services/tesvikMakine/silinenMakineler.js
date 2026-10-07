// 🗑️ Silinen makineler — müşteri görünümü çıktısında kırmızı "SİLİNDİ" satırları için
//
// Müşteri (07.10.2026): "Makine listesinde silinenleri pdf çıktısından komple kaldırmak yerine kırmızı
// yazıyla 'Silindi' gibi bir şey yazabilir miyiz belli olsun?"
//
// Silinen satır makine listesinden fiziksel olarak çıkıyor; izi yalnız makine revizyon kayıtlarında
// (her revizyonun başı/sonundaki liste) kalıyor. "Silinmiş" = geçmiş bir revizyonda olup güncel listede
// OLMAYAN makine.
//
// ⚠️ rowId'ye GÜVENİLEMEZ: canlıda (07.10.2026, salt okuma) 612 belgenin geçmişinde rowId'ye göre
// 20.136 "silinmiş" satır çıktı; 19.604'ü güncel listede aynı ad+GTİP ile duruyordu — eski kayıt
// yolları satır kimliklerini yeniden üretmiş (art arda gelen 671 revizyon çiftinin 280'inde
// kimliklerin çoğu değişmiş). Bu yüzden bir geçmiş satır şu üçünden BİRİ tutarsa "hâlâ listede" sayılır:
// aynı rowId · aynı ad+GTİP · aynı makine ID. Bu kuralla canlıda 23 belgede toplam 198 silinmiş makine
// kalıyor. Adı değiştirilen makine eski adıyla "silinmiş" görünebilir; çıktı bunu tek satırla gösterir.

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

/**
 * 1. aşama: hangi makineler silinmiş ve en son hangi revizyon kaydında görülmüş.
 * Yalnız eşleme alanlarına bakar — geçmiş bu dört alanla okunabilir.
 * @returns { yerli: Map<adGtip, kayitIndeksi>, ithal: Map<...> }
 */
function silinenAnahtarlari(guncel = {}, gecmis = []) {
  const sonuc = {};
  for (const liste of LISTELER) {
    const simdi = guncel?.[liste] || [];
    const rowIdler = new Set(simdi.map((r) => r?.rowId).filter(Boolean));
    const adlar = new Set(simdi.map(adGtip));
    const idler = new Set(simdi.map(makineId).filter(Boolean));
    const halaListede = (r) => (r?.rowId && rowIdler.has(r.rowId)) || adlar.has(adGtip(r))
      || (makineId(r) && idler.has(makineId(r)));

    const silinen = new Map(); // aynı makine her revizyonda tekrar eder → en son görüldüğü kayıt kalır
    (gecmis || []).forEach((kayit, i) => {
      for (const r of kayit?.[liste] || []) {
        if (r && !halaListede(r) && metin(r.adiVeOzelligi)) silinen.set(adGtip(r), i);
      }
    });
    sonuc[liste] = silinen;
  }
  return sonuc;
}

/** 2. aşama: silinen makinelerin son görüldükleri kayıttaki tam hali, sıra no'ya göre */
function silinenSatirlari(anahtarlar, gecmis = []) {
  const sonuc = {};
  for (const liste of LISTELER) {
    sonuc[liste] = [...(anahtarlar[liste] || new Map())].map(([anahtar, i]) => {
      const satir = (gecmis[i]?.[liste] || []).find((r) => adGtip(r) === anahtar);
      return satir ? { ...satir, sonGorulme: gecmis[i].revizeTarihi || null } : null;
    }).filter(Boolean).sort((a, b) => (Number(a.siraNo) || 0) - (Number(b.siraNo) || 0));
  }
  return sonuc;
}

/**
 * @param guncel  { yerli: [], ithal: [] } — belgenin şu anki makine listeleri
 * @param gecmis  revizyon kayıtları (her biri { yerli, ithal, revizeTarihi }), eskiden yeniye
 * @returns { yerli: [], ithal: [] } — silinen makineler son görüldükleri haliyle + `sonGorulme`
 */
const silinenMakineleriBul = (guncel = {}, gecmis = []) => silinenSatirlari(silinenAnahtarlari(guncel, gecmis), gecmis);

const projeksiyon = (onEk, alanlar) => Object.fromEntries([
  [`${onEk}revizeTarihi`, 1],
  ...LISTELER.flatMap((l) => alanlar.map((a) => [`${onEk}${l}.${a}`, 1]))
]);

/**
 * Bir belgenin silinen makineleri. 830 makine × 23 revizyonluk belgede (ST Turkuaz) geçmişin tamamını
 * çıktı alanlarıyla okumak canlıda ~6 sn sürdü; önce yalnız eşleme alanları okunur (~1/3 süre), sonra
 * tam satırlar yalnız gereken revizyon kayıtlarından.
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
  const gerekli = [...new Set(LISTELER.flatMap((l) => [...anahtarlar[l].values()]))];
  if (!gerekli.length) return { yerli: [], ithal: [] };

  const tamlar = await MakineRevizyonKaydi.find({ ...anahtar, sira: { $in: gerekli.map((i) => kayitlar[i].sira) } })
    .select({ sira: 1, ...projeksiyon('snapshot.', ALANLAR) }).lean();
  const siraya = new Map(tamlar.map((k) => [k.sira, k.snapshot || {}]));
  return silinenSatirlari(anahtarlar, kayitlar.map((k) => siraya.get(k.sira)));
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

module.exports = { silinenMakineleriBul, silinenleriOku, silinenlerUcu };
