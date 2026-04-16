const { IngestModule } = require('./types');
const { normalizeHeader } = require('./mapping/synonyms');

const scoreByPresence = (headersNorm, needles) =>
  needles.reduce((acc, n) => acc + (headersNorm.has(n) ? 1 : 0), 0);

function classify({ headers }) {
  const hs = (headers || []).map(normalizeHeader);
  const set = new Set(hs);

  // Phase-2: Teşvik / Yeni Teşvik
  // Not: normalizeHeader camelCase'i bölmez. Örn: gmId -> gmid
  const hasBonusSignal = hs.some(
    (h) =>
      h.includes('bonushesaplamalari') ||
      h.includes('surdurulebilirlikbonusu') ||
      h.includes('inovasyonbonusu') ||
      h.includes('dijitaldonusumbonusu') ||
      h.includes('bonusorani') ||
      h.includes('bonustutari')
  );

  const tesvikNeedlesCore = ['gmid', 'firmaid', 'yatirimciunvan', 'yatirimkonusu', 'desteksinifi', 'yerinil'];
  const tesvikNeedlesBelge = ['belgeid', 'belgeno', 'belgetarihi'];
  const tesvikCoreScore = scoreByPresence(set, tesvikNeedlesCore);
  const tesvikBelgeScore = scoreByPresence(set, tesvikNeedlesBelge);

  // Yeni teşvik: bonus sinyali varsa ve temel teşvik çekirdeği görünüyorsa
  if (hasBonusSignal && tesvikCoreScore >= 4) {
    return {
      module: IngestModule.YENI_TESVIK,
      confidence: Math.min(0.99, tesvikCoreScore / tesvikNeedlesCore.length + 0.35),
      reasons: ['bonus-signal', `tesvikCoreScore=${tesvikCoreScore}`],
    };
  }

  // Eski teşvik: belge alanları genelde zorunlu/var + core alanlar
  if (tesvikCoreScore >= 4) {
    const confidence = Math.min(
      0.99,
      tesvikCoreScore / tesvikNeedlesCore.length + (tesvikBelgeScore >= 2 ? 0.3 : 0.2)
    );
    return {
      module: IngestModule.TESVIK,
      confidence,
      reasons: [`tesvikCoreScore=${tesvikCoreScore}`, `tesvikBelgeScore=${tesvikBelgeScore}`],
    };
  }

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
