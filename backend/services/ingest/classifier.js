const { IngestModule } = require('./types');
const { normalizeHeader } = require('./mapping/synonyms');

const scoreByPresence = (headersNorm, needles) =>
  needles.reduce((acc, n) => acc + (headersNorm.has(n) ? 1 : 0), 0);

const normalizeNeedles = (normalizeHeaderFn, needles) => needles.map((n) => normalizeHeaderFn(n));

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

  const tesvikNeedlesCore = normalizeNeedles(normalizeHeader, [
    'gmId',
    'firmaId',
    'yatirimciUnvan',
    'yatirimKonusu',
    'destekSinifi',
    'yerinIl',
  ]);
  const tesvikNeedlesBelge = normalizeNeedles(normalizeHeader, ['belgeId', 'belgeNo', 'belgeTarihi']);
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
  const firmaNeedles = normalizeNeedles(normalizeHeader, ['vkn', 'vergi no', 'tam ünvan', 'adres', 'il', 'ilk irtibat']);
  const dosyaNeedles = normalizeNeedles(normalizeHeader, ['talep türü', 'talepturu', 'durum', 'ana asama', 'ana aşama', 'takipid']);

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
