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

module.exports = { TARIH_ALANLARI, SIRALANABILIR, siralamaCoz, sayfaliListe };
