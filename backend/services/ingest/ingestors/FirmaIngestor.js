const Firma = require('../../../models/Firma');

const toUpperTR = (s) => String(s || '').trim().toLocaleUpperCase('tr-TR');

function normalizeFirma(row) {
  const vergiNoTC = String(row.vergiNoTC || '').replace(/\s/g, '');
  const tamUnvan = String(row.tamUnvan || '').trim();
  const ilkIrtibatKisi = String(row.ilkIrtibatKisi || '').trim() || tamUnvan;

  // Firma modelinde yetkiliKisiler (min 1) zorunlu validasyon var.
  const yetkiliKisiler = [
    {
      adSoyad: ilkIrtibatKisi,
      telefon1: '',
      telefon2: '',
      eposta1: '',
      eposta2: '',
    },
  ];

  return {
    vergiNoTC,
    tamUnvan,
    adres: String(row.adres || '').trim(),
    firmaIl: toUpperTR(row.firmaIl),
    firmaIlce: toUpperTR(row.firmaIlce || ''),
    kepAdresi: String(row.kepAdresi || '').trim().toLowerCase(),
    ilkIrtibatKisi,
    yetkiliKisiler,
    etuysYetkiBitisTarihi: row.etuysYetkiBitisTarihi ? new Date(row.etuysYetkiBitisTarihi) : null,
    dysYetkiBitisTarihi: row.dysYetkiBitisTarihi ? new Date(row.dysYetkiBitisTarihi) : null,
  };
}

function validateFirma(n) {
  const issues = [];
  if (!n.vergiNoTC || !/^\d{9,11}$/.test(n.vergiNoTC)) issues.push('vergiNoTC invalid');
  if (!n.tamUnvan || n.tamUnvan.length < 3) issues.push('tamUnvan required');
  if (!n.adres) issues.push('adres required');
  if (!n.firmaIl) issues.push('firmaIl required');
  if (!n.ilkIrtibatKisi) issues.push('ilkIrtibatKisi required');
  if (!n.yetkiliKisiler || n.yetkiliKisiler.length === 0) issues.push('yetkiliKisiler required');
  if (n.etuysYetkiBitisTarihi && isNaN(n.etuysYetkiBitisTarihi.getTime())) issues.push('etuysYetkiBitisTarihi invalid');
  if (n.dysYetkiBitisTarihi && isNaN(n.dysYetkiBitisTarihi.getTime())) issues.push('dysYetkiBitisTarihi invalid');
  return issues;
}

async function upsertFirma(n, userId, opts = {}) {
  const mode = opts.mode || 'upsert';
  const existing = await Firma.findOne({ vergiNoTC: n.vergiNoTC });

  if (existing) {
    if (mode === 'create_only') return { action: 'skipped', id: existing._id };
    existing.set({ ...n, sonGuncelleyen: userId });
    const saved = await existing.save();
    return { action: 'updated', id: saved._id };
  }

  const created = await Firma.create({ ...n, olusturanKullanici: userId });
  return { action: 'created', id: created._id };
}

module.exports = { normalizeFirma, validateFirma, upsertFirma };

