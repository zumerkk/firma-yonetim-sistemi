// 📇 Sistemdeki bütün evrak dosyalarının envanteri
//
// Veritabanı yedeği yalnız KAYITLARI taşır; dosyaların kendisi Cloudinary'de durur.
// "Kayıt geri geldi ama evrak yok" durumuna düşmemek için dosyaların da ikinci bir
// kopyası alınır. Burası hangi dosyaların var olduğunu tek listede toplar.
//
// Kimlik olarak dosyanın adresi (Cloudinary URL) kullanılır: kayıt silinip yeniden
// eklense bile aynı dosya iki kez yüklenmez.

const DosyaTakip = require('../../models/DosyaTakip');
const UploadedDocument = require('../../models/UploadedDocument');
const IslemTalebi = require('../../models/IslemTalebi');
const IslemTuru = require('../../models/IslemTuru');
const Tesvik = require('../../models/Tesvik');
const YeniTesvik = require('../../models/YeniTesvik');

const adTemizle = (s) => String(s || 'dosya').replace(/[\\/:*?"<>|\u0000-\u001f]/g, '_').slice(0, 180);

const kayit = (kaynak, url, ad, boyut, mimeType) => (
  url && /^https?:\/\//.test(String(url))
    ? { anahtar: String(url), kaynak, ad: adTemizle(ad), boyut: Number(boyut) || 0, mimeType: mimeType || '' }
    : null
);

/**
 * Bütün dosyaları tek listede toplar (tekrarlar ayıklanır).
 * @returns {Promise<Array<{anahtar,kaynak,ad,boyut,mimeType}>>}
 */
async function envanter() {
  const hepsi = [];

  const takipler = await DosyaTakip.find({}, { dosyalar: 1, ytbNo: 1, firmaUnvan: 1 }).lean();
  for (const t of takipler) {
    for (const d of t.dosyalar || []) {
      hepsi.push(kayit('dosyaTakip', d.dosyaYolu, `${t.ytbNo || t.takipId || 'belge'}_${d.dosyaAdi}`, d.dosyaBoyutu, d.dosyaTipi));
    }
  }

  const evraklar = await UploadedDocument.find({}, { fileUrl: 1, originalName: 1, fileName: 1, fileSize: 1, mimeType: 1 }).lean();
  for (const e of evraklar) {
    hepsi.push(kayit('ekipmanTakip', e.fileUrl, e.originalName || e.fileName, e.fileSize, e.mimeType));
  }

  const talepler = await IslemTalebi.find({}, { yuklenenEvraklar: 1, istenenEvraklar: 1, firmaAdi: 1 }).lean();
  for (const t of talepler) {
    for (const y of t.yuklenenEvraklar || []) {
      hepsi.push(kayit('islemEvrak', y.fileUrl, `${t.firmaAdi || ''}_${y.orijinalAd || y.dosyaAdi}`, y.fileSize, y.mimeType));
    }
    for (const i of t.istenenEvraklar || []) {
      if (i.ornekDosya) hepsi.push(kayit('ornekDosya', i.ornekDosya.fileUrl, i.ornekDosya.dosyaAdi, i.ornekDosya.fileSize, i.ornekDosya.mimeType));
    }
  }

  const turler = await IslemTuru.find({}, { istenenEvraklar: 1, varyantlar: 1 }).lean();
  for (const t of turler) {
    const satirlar = [...(t.istenenEvraklar || []), ...(t.varyantlar || []).flatMap((v) => v.istenenEvraklar || [])];
    for (const i of satirlar) {
      if (i.ornekDosya) hepsi.push(kayit('ornekDosya', i.ornekDosya.fileUrl, i.ornekDosya.dosyaAdi, i.ornekDosya.fileSize, i.ornekDosya.mimeType));
    }
  }

  for (const Model of [Tesvik, YeniTesvik]) {
    const belgeler = await Model.find({ 'kdvMuafiyetYazisi.dosyaAdi': { $exists: true, $ne: null } },
      { kdvMuafiyetYazisi: 1, 'belgeYonetimi.belgeNo': 1 }).lean();
    for (const b of belgeler) {
      const k = b.kdvMuafiyetYazisi || {};
      hepsi.push(kayit('kdvMuafiyet', k.fileUrl || k.dosyaYolu, `KDV_${b.belgeYonetimi?.belgeNo || ''}_${k.dosyaAdi}`, k.dosyaBoyutu, k.mimeType));
    }
  }

  const gorulen = new Set();
  return hepsi.filter((x) => x && !gorulen.has(x.anahtar) && gorulen.add(x.anahtar));
}

module.exports = { envanter, adTemizle };
