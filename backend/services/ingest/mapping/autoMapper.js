const { SYNONYMS, normalizeHeader } = require('./synonyms');

function autoMap({ module, headers }) {
  const dict = SYNONYMS[module] || {};
  const mapping = {};

  for (const h of headers || []) {
    const hn = normalizeHeader(h);

    let matched = null;
    for (const [targetField, syns] of Object.entries(dict)) {
      const synNorm = syns.map(normalizeHeader);
      if (synNorm.includes(hn)) {
        matched = targetField;
        break;
      }
    }

    if (matched) mapping[h] = matched;
  }

  return mapping;
}

module.exports = { autoMap };

