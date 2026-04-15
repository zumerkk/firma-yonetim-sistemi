const { IngestModule } = require('./types');
const { normalizeHeader } = require('./mapping/synonyms');

const scoreByPresence = (headersNorm, needles) =>
  needles.reduce((acc, n) => acc + (headersNorm.has(n) ? 1 : 0), 0);

function classify({ headers }) {
  const hs = (headers || []).map(normalizeHeader);
  const set = new Set(hs);

  // Phase-1: Firma vs DosyaTakip
  const firmaNeedles = ['vkn', 'vergi no', 'tam ünvan', 'adres', 'il', 'ilk irtibat'];
  const dosyaNeedles = ['talep türü', 'talepturu', 'durum', 'ana asama', 'ana aşama', 'takipid'];

  const firmaScore = scoreByPresence(set, firmaNeedles);
  const dosyaScore = scoreByPresence(set, dosyaNeedles);

  const maxPossible = 5;
  if (firmaScore === 0 && dosyaScore === 0) {
    return { module: IngestModule.UNKNOWN, confidence: 0, reasons: ['no strong fingerprint'] };
  }

  if (firmaScore >= dosyaScore) {
    return {
      module: IngestModule.FIRMA,
      confidence: Math.min(0.99, firmaScore / maxPossible + 0.3),
      reasons: [`firmaScore=${firmaScore}`, `dosyaScore=${dosyaScore}`],
    };
  }

  return {
    module: IngestModule.DOSYA_TAKIP,
    confidence: Math.min(0.99, dosyaScore / maxPossible + 0.3),
    reasons: [`dosyaScore=${dosyaScore}`, `firmaScore=${firmaScore}`],
  };
}

module.exports = { classify };

