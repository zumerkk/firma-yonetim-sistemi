const DosyaTakip = require('../../../models/DosyaTakip');
const Firma = require('../../../models/Firma');
const { createTurkishInsensitiveRegex } = require('../../../utils/turkishUtils');

function normalizeDosyaTakip(row) {
  return {
    takipId: String(row.takipId || '').trim(),
    firmaUnvan: String(row.firmaUnvan || '').trim(),
    // Firma çözümleme için opsiyonel anahtarlar
    firmaId: String(row.firmaId || '').trim(),
    vergiNoTC: String(row.vergiNoTC || '').replace(/\s/g, ''),
    talepTuru: String(row.talepTuru || '').trim(),
    durum: String(row.durum || '').trim(),
    anaAsama: String(row.anaAsama || '').trim(),
    ytbNo: String(row.ytbNo || '').trim(),
    belgeId: String(row.belgeId || '').trim(),
    durumAciklamasi: String(row.durumAciklamasi || '').trim(),
  };
}

function validateDosyaTakip(n) {
  const issues = [];
  if (!n.talepTuru) issues.push('talepTuru required');
  if (!n.durum) issues.push('durum required');
  if (!n.anaAsama) issues.push('anaAsama required');
  if (!n.firmaId && !n.vergiNoTC && !n.firmaUnvan) issues.push('firma identifier missing (firmaId/vergiNoTC/firmaUnvan)');
  return issues;
}

async function resolveFirmaRef(n) {
  if (n.vergiNoTC && /^\d{9,11}$/.test(n.vergiNoTC)) {
    const f = await Firma.findOne({ vergiNoTC: n.vergiNoTC });
    if (f) return f;
  }

  if (n.firmaId) {
    const f = await Firma.findOne({ firmaId: n.firmaId });
    if (f) return f;
  }

  if (n.firmaUnvan) {
    const rx = createTurkishInsensitiveRegex(n.firmaUnvan);
    const f = await Firma.findOne({ tamUnvan: rx });
    if (f) return f;
  }

  return null;
}

async function upsertDosyaTakip(n, user, opts = {}) {
  const mode = opts.mode || 'upsert';

  const firma = await resolveFirmaRef(n);
  if (!firma) {
    const err = new Error('firma not found');
    err.code = 'FIRMA_NOT_FOUND';
    throw err;
  }

  const payload = {
    ...n,
    firma: firma._id,
    firmaId: firma.firmaId || n.firmaId,
    firmaUnvan: firma.tamUnvan || n.firmaUnvan,
  };

  if (!n.takipId) {
    const created = await DosyaTakip.create({
      ...payload,
      olusturanKullanici: user._id,
      olusturanAdi: user.adSoyad,
      aktif: true,
    });
    return { action: 'created', id: created._id };
  }

  const existing = await DosyaTakip.findOne({ takipId: n.takipId });
  if (existing) {
    if (mode === 'create_only') return { action: 'skipped', id: existing._id };
    existing.set({ ...payload, sonGuncelleyen: user._id, sonGuncelleyenAdi: user.adSoyad });
    const saved = await existing.save();
    return { action: 'updated', id: saved._id };
  }

  const created = await DosyaTakip.create({
    ...payload,
    olusturanKullanici: user._id,
    olusturanAdi: user.adSoyad,
    aktif: true,
  });
  return { action: 'created', id: created._id };
}

module.exports = { normalizeDosyaTakip, validateDosyaTakip, upsertDosyaTakip, resolveFirmaRef };

