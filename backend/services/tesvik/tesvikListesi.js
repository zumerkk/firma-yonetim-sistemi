const Tesvik = require('../../models/Tesvik');
const YeniTesvik = require('../../models/YeniTesvik');
const { listeDurumKosulu } = require('../../constants/belgeDurumlari');
const { sureFiltresiEkle } = require('../../utils/belgeSureFiltresi');
const { createTurkishInsensitiveRegex } = require('../../utils/turkishUtils');
const { siralamaCoz, sayfaliListe, kayitlariSirala } = require('../../utils/tarihSiralama');

function tesvikListeFiltresi({ durum, arsiv, il, firma, destekSinifi, search, sureDurumu, tarihBaslangic, tarihBitis } = {}) {
  const filtre = { aktif: true, ...listeDurumKosulu({ durum, arsiv }) };
  sureFiltresiEkle(filtre, sureDurumu);
  if (il) filtre['yatirimBilgileri.yerinIl'] = String(il).toUpperCase();
  if (firma) filtre.firma = firma;
  if (destekSinifi) filtre['yatirimBilgileri.destekSinifi'] = destekSinifi;
  if (tarihBaslangic || tarihBitis) {
    filtre.createdAt = {};
    if (tarihBaslangic) filtre.createdAt.$gte = new Date(tarihBaslangic);
    if (tarihBitis) filtre.createdAt.$lte = new Date(tarihBitis);
  }
  if (search) {
    const terim = createTurkishInsensitiveRegex(search);
    filtre.$or = ['tesvikId', 'gmId', 'yatirimciUnvan', 'yatirimBilgileri.yatirimKonusu',
      'belgeYonetimi.belgeId', 'belgeYonetimi.belgeNo'].map((alan) => ({ [alan]: terim }));
  }
  return filtre;
}

const MODELLER = { Eski: Tesvik, Yeni: YeniTesvik };
const birlesikSistemler = (sistem) => Object.hasOwn(MODELLER, sistem) ? [sistem] : ['Eski', 'Yeni'];

// Önce yalnız kimlik ve sıralama değeri alınır. İki sistem aynı sıraya konduktan
// sonra sadece istenen sayfanın belgeleri yüklenir ve gerçek toplam korunur.
async function birlesikTesvikleriGetir(sistemler, filtre, { alan, yon, skip = 0, limit, sistemBasinaLimit, select, populate = [] }) {
  const kimlikler = await Promise.all(sistemler.map(async (sistem) => {
    const kayitlar = await MODELLER[sistem].find(filtre).select(`_id ${alan}`).lean();
    return kayitlar.map((kayit) => ({ ...kayit, sistem }));
  }));
  const toplam = kimlikler.reduce((sayi, sistem) => sayi + sistem.length, 0);
  const adaylar = sistemBasinaLimit
    ? kimlikler.flatMap((sistem) => kayitlariSirala(sistem, { alan, yon }).slice(0, sistemBasinaLimit))
    : kimlikler.flat();
  const sirali = kayitlariSirala(adaylar, { alan, yon });
  const sayfa = sirali.slice(skip, limit === undefined ? undefined : skip + limit);
  const belgeler = await Promise.all(sistemler.map(async (sistem) => {
    const ids = sayfa.filter((kayit) => kayit.sistem === sistem).map((kayit) => kayit._id);
    if (!ids.length) return [];
    const sorgu = MODELLER[sistem].find({ ...filtre, _id: { $in: ids } }).select(select);
    for (const [yol, alanlar] of populate) sorgu.populate(yol, alanlar);
    const bulunan = await sorgu.lean();
    return bulunan.map((kayit) => ({ ...kayit, sistem }));
  }));
  const anahtar = ({ sistem, _id }) => `${sistem}:${_id}`;
  const belgeHaritasi = new Map(belgeler.flat().map((kayit) => [anahtar(kayit), kayit]));
  return { tesvikler: sayfa.map((kayit) => belgeHaritasi.get(anahtar(kayit))).filter(Boolean), toplam };
}

const EXCEL_ALANLARI = 'firma yatirimciUnvan durumBilgileri.genelDurum belgeYonetimi yatirimBilgileri createdAt';
const EXCEL_POPULATE = [['firma', 'tamUnvan vergiNoTC firmaIl']];

async function excelTesvikleriniGetir(query, sistem) {
  const search = String(query.search || '').trim();
  const filtre = tesvikListeFiltresi({ ...query, search });
  const siralama = siralamaCoz(query.siraBy || 'belgeYonetimi.uzatimTarihi', query.siraSekli || 'asc');
  const secenekler = { ...siralama, select: EXCEL_ALANLARI, populate: EXCEL_POPULATE };

  if (search.length >= 2 && ['all', 'Eski', 'Yeni'].includes(query.sistem)) {
    const sistemler = sistem === 'Yeni' ? ['Yeni'] : birlesikSistemler(query.sistem);
    return (await birlesikTesvikleriGetir(sistemler, filtre, secenekler)).tesvikler;
  }

  const Model = MODELLER[sistem];
  const toplam = await Model.countDocuments(filtre);
  return toplam ? sayfaliListe(Model, filtre, { ...secenekler, skip: 0, limit: toplam }) : [];
}

module.exports = { tesvikListeFiltresi, birlesikSistemler, birlesikTesvikleriGetir, excelTesvikleriniGetir };
