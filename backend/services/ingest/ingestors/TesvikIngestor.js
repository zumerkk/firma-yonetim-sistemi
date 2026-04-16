const Tesvik = require('../../../models/Tesvik');
const YeniTesvik = require('../../../models/YeniTesvik');
const Firma = require('../../../models/Firma');

const toUpperTR = (s) => String(s || '').trim().toLocaleUpperCase('tr-TR');

const toDateOrNull = (v) => {
  if (!v) return null;
  const d = new Date(v);
  // Invalid Date check
  // eslint-disable-next-line no-restricted-globals
  if (isNaN(d.getTime())) return null;
  return d;
};

/**
 * Phase-2: Import aşamasında kolonlar düz (flat) map edilir,
 * burada Mongoose modelinin beklediği nested yapıya taşınır.
 */
function normalizeTesvik(row) {
  return {
    tesvikId: String(row.tesvikId || '').trim() || undefined,
    gmId: String(row.gmId || '').trim(),
    firmaId: String(row.firmaId || '').trim(),
    yatirimciUnvan: String(row.yatirimciUnvan || '').trim(),
    yatirimBilgileri: {
      yatirimKonusu: String(row.yatirimKonusu || '').trim(),
      destekSinifi: String(row.destekSinifi || '').trim(),
      yerinIl: toUpperTR(row.yerinIl),
      yerinIlce: toUpperTR(row.yerinIlce || ''),
    },
    belgeYonetimi: {
      belgeId: String(row.belgeId || '').trim(),
      belgeNo: String(row.belgeNo || '').trim(),
      belgeTarihi: toDateOrNull(row.belgeTarihi),
    },
  };
}

function validateTesvik(n) {
  const issues = [];
  if (!n.gmId) issues.push('gmId required');
  if (!n.firmaId) issues.push('firmaId required');
  if (!n.yatirimciUnvan) issues.push('yatirimciUnvan required');
  if (!n.yatirimBilgileri?.yatirimKonusu) issues.push('yatirimBilgileri.yatirimKonusu required');
  if (!n.yatirimBilgileri?.destekSinifi) issues.push('yatirimBilgileri.destekSinifi required');
  if (!n.yatirimBilgileri?.yerinIl) issues.push('yatirimBilgileri.yerinIl required');

  // Eski teşvikte belge alanları modelde required
  if (!n.belgeYonetimi?.belgeId) issues.push('belgeYonetimi.belgeId required');
  if (!n.belgeYonetimi?.belgeNo) issues.push('belgeYonetimi.belgeNo required');
  if (!n.belgeYonetimi?.belgeTarihi) issues.push('belgeYonetimi.belgeTarihi required');

  return issues;
}

function normalizeYeniTesvik(row) {
  const normalized = {
    tesvikId: String(row.tesvikId || '').trim() || undefined,
    gmId: String(row.gmId || '').trim(),
    firmaId: String(row.firmaId || '').trim(),
    yatirimciUnvan: String(row.yatirimciUnvan || '').trim(),
    yatirimBilgileri: {
      yatirimKonusu: String(row.yatirimKonusu || '').trim(),
      destekSinifi: String(row.destekSinifi || '').trim(),
      yerinIl: toUpperTR(row.yerinIl),
      yerinIlce: toUpperTR(row.yerinIlce || ''),
    },
  };

  // Yeni teşvikte belge alanları taslak için opsiyonel — sadece gelirse set et
  const belgeId = String(row.belgeId || '').trim();
  const belgeNo = String(row.belgeNo || '').trim();
  const belgeTarihi = toDateOrNull(row.belgeTarihi);
  if (belgeId || belgeNo || belgeTarihi) {
    normalized.belgeYonetimi = { belgeId, belgeNo, belgeTarihi };
  }

  // Phase-2: bonus alanlarını henüz nested yapıya doldurmuyoruz (sınıflandırma için sinyal yeterli)
  return normalized;
}

function validateYeniTesvik(n) {
  const issues = [];
  if (!n.gmId) issues.push('gmId required');
  if (!n.firmaId) issues.push('firmaId required');
  if (!n.yatirimciUnvan) issues.push('yatirimciUnvan required');
  if (!n.yatirimBilgileri?.yatirimKonusu) issues.push('yatirimBilgileri.yatirimKonusu required');
  if (!n.yatirimBilgileri?.destekSinifi) issues.push('yatirimBilgileri.destekSinifi required');
  if (!n.yatirimBilgileri?.yerinIl) issues.push('yatirimBilgileri.yerinIl required');
  return issues;
}

async function resolveFirmaRef({ firmaId, vergiNoTC }) {
  if (firmaId) {
    const firma = await Firma.findOne({ firmaId: String(firmaId).trim() }).select('_id firmaId vergiNoTC').lean();
    if (firma) return firma;
  }
  if (vergiNoTC) {
    const firma = await Firma.findOne({ vergiNoTC: String(vergiNoTC).replace(/\s/g, '') })
      .select('_id firmaId vergiNoTC')
      .lean();
    if (firma) return firma;
  }
  return null;
}

async function upsertTesvik(n, { userId, mode = 'upsert' }) {
  const firma = await resolveFirmaRef({ firmaId: n.firmaId, vergiNoTC: n.vergiNoTC });
  if (!firma) throw new Error(`firma not found (firmaId=${n.firmaId || ''})`);

  if (mode === 'create_only') {
    const created = await Tesvik.create({ ...n, firma: firma._id, olusturanKullanici: userId });
    return { action: 'created', id: created._id };
  }

  const query = n.tesvikId ? { tesvikId: n.tesvikId } : { gmId: n.gmId, firmaId: n.firmaId };
  const existing = await Tesvik.findOne(query);
  if (existing) {
    existing.set({ ...n, firma: firma._id, sonGuncelleyen: userId });
    const saved = await existing.save();
    return { action: 'updated', id: saved._id };
  }

  const created = await Tesvik.create({ ...n, firma: firma._id, olusturanKullanici: userId });
  return { action: 'created', id: created._id };
}

async function upsertYeniTesvik(n, { userId, mode = 'upsert' }) {
  const firma = await resolveFirmaRef({ firmaId: n.firmaId, vergiNoTC: n.vergiNoTC });
  if (!firma) throw new Error(`firma not found (firmaId=${n.firmaId || ''})`);

  if (mode === 'create_only') {
    const created = await YeniTesvik.create({ ...n, firma: firma._id, olusturanKullanici: userId });
    return { action: 'created', id: created._id };
  }

  const query = n.tesvikId ? { tesvikId: n.tesvikId } : { gmId: n.gmId, firmaId: n.firmaId };
  const existing = await YeniTesvik.findOne(query);
  if (existing) {
    existing.set({ ...n, firma: firma._id, sonGuncelleyen: userId });
    const saved = await existing.save();
    return { action: 'updated', id: saved._id };
  }

  const created = await YeniTesvik.create({ ...n, firma: firma._id, olusturanKullanici: userId });
  return { action: 'created', id: created._id };
}

module.exports = {
  normalizeTesvik,
  validateTesvik,
  normalizeYeniTesvik,
  validateYeniTesvik,
  upsertTesvik,
  upsertYeniTesvik,
};
