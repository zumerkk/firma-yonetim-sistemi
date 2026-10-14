// 📅 Teşvik listelerinde tarih sıralaması — BOŞ TARİHLER SONDA.
//
// Müşteri (13.10.2026): "Teşvik listesini açınca otomatik olarak süre uzatım tarihi eskiden yeniye
// göre sıralı olarak gelebilirse çok iyi olur." Mongo artan sıralamada tarihi olmayan belgeleri EN
// BAŞA koyar; uzatımı hiç olmayan belgeler listenin ilk sayfalarını kaplardı. Burada önce yalnız
// _id + sıralama alanı üzerinden sıralanıp sayfa kimlikleri bulunur (büyük belgeler bellekte
// sıralanmasın — makine listeli belge birkaç MB olabiliyor), sonra o sayfanın belgeleri çekilir.

const TARIH_ALANLARI = Object.freeze([
  'belgeYonetimi.belgeTarihi',
  'belgeYonetimi.belgeBitisTarihi',
  'belgeYonetimi.uzatimTarihi'
]);

const SIRALANABILIR = Object.freeze(['createdAt', 'updatedAt', 'tesvikId', 'yatirimciUnvan', ...TARIH_ALANLARI]);

/**
 * Sıralama isteğini güvenli hale getirir (istekten gelen anahtar doğrudan Mongo'ya gitmez).
 * @returns {{ alan: string, yon: 1|-1 }}
 */
function siralamaCoz(siraBy, siraSekli) {
  return {
    alan: SIRALANABILIR.includes(siraBy) ? siraBy : 'createdAt',
    yon: siraSekli === 'desc' ? -1 : 1
  };
}

/**
 * Sayfalı liste. Tarih alanında boşlar her iki yönde de en sonda; aynı tarihte _id ile sabit sıra
 * (sayfa geçişinde satır kaybolmasın/tekrarlanmasın).
 *
 * @param {import('mongoose').Model} Model
 * @param {object} filtre   Mongoose sorgu nesnesi (find'a verilecek hali)
 * @param {object} secenek  { alan, yon, skip, limit, select, populate: [[yol, alanlar], …] }
 */
async function sayfaliListe(Model, filtre, { alan, yon, skip, limit, select = '', populate = [] }) {
  const sorguKur = (q) => {
    let s = q.select(select);
    populate.forEach(([yol, alanlar]) => { s = s.populate(yol, alanlar); });
    return s.lean();
  };

  if (!TARIH_ALANLARI.includes(alan)) {
    return sorguKur(Model.find(filtre)).sort({ [alan]: yon, _id: yon }).skip(skip).limit(limit);
  }

  // aggregate tip dönüştürmez (ör. firma kimliği metin gelir) — mongoose'un find dönüşümünü kullan
  const eslesme = Model.find(filtre).cast(Model, filtre);
  const kimlikler = await Model.aggregate([
    { $match: eslesme },
    { $project: { _id: 1, t: `$${alan}` } },
    { $addFields: { bos: { $cond: [{ $eq: [{ $type: '$t' }, 'date'] }, 0, 1] } } },
    { $sort: { bos: 1, t: yon, _id: 1 } },
    { $skip: skip },
    { $limit: limit }
  ]);
  if (!kimlikler.length) return [];

  const belgeler = await sorguKur(Model.find({ _id: { $in: kimlikler.map((k) => k._id) } }));
  const sira = new Map(kimlikler.map((k, i) => [String(k._id), i]));
  return belgeler.sort((a, b) => sira.get(String(a._id)) - sira.get(String(b._id)));
}

// İki sistemden gelen arama sonuçları da listede seçilen sırayı korur.
function kayitlariSirala(kayitlar, { alan, yon }) {
  const tarih = TARIH_ALANLARI.includes(alan) || ['createdAt', 'updatedAt'].includes(alan);
  const oku = (b) => alan.split('.').reduce((v, k) => v?.[k], b);
  const deger = (b) => {
    const v = oku(b);
    if (v === null || v === undefined || v === '') return null;
    if (!tarih) return String(v);
    const t = new Date(v).getTime();
    return Number.isNaN(t) ? null : t;
  };
  return [...kayitlar].sort((a, b) => {
    const x = deger(a), y = deger(b);
    if (x === null || y === null) {
      if (x !== y) return x === null ? 1 : -1;
    } else {
      const fark = tarih ? x - y : x.localeCompare(y, 'tr');
      if (fark) return fark * yon;
    }
    return String(a._id).localeCompare(String(b._id));
  });
}

module.exports = { TARIH_ALANLARI, SIRALANABILIR, siralamaCoz, sayfaliListe, kayitlariSirala };
