// 🧩 MAIL TEMPLATE ENGINE - Yeniden kullanılabilir placeholder motoru
// {anahtar} biçimindeki yer tutucuları data ile değiştirir, eksikleri raporlar.
// (Spec: "Mail şablon motorunu reusable yap." + "eksik placeholder varsa validasyon yap.")

const PLACEHOLDER_RE = /\{([a-zA-Z0-9_]+)\}/g;

// Şablon metnindeki benzersiz placeholder anahtarlarını döndürür
function extractPlaceholders(text = '') {
  const found = new Set();
  let m;
  PLACEHOLDER_RE.lastIndex = 0;
  while ((m = PLACEHOLDER_RE.exec(String(text))) !== null) {
    found.add(m[1]);
  }
  return Array.from(found);
}

// Bir değerin "dolu" sayılıp sayılmadığı (0 geçerlidir, boş string değildir)
function hasValue(v) {
  if (v === undefined || v === null) return false;
  if (typeof v === 'string') return v.trim() !== '';
  return true;
}

// {key} → data[key]. Bilinmeyen anahtarlar olduğu gibi bırakılır.
function render(template = '', data = {}) {
  return String(template).replace(PLACEHOLDER_RE, (full, key) => {
    return hasValue(data[key]) ? String(data[key]) : full;
  });
}

// Şablonda olup data'da karşılığı boş/eksik olan placeholder'ları bulur
function validate(template = '', data = {}) {
  const placeholders = extractPlaceholders(template);
  const missing = placeholders.filter((key) => !hasValue(data[key]));
  return { ok: missing.length === 0, missing, placeholders };
}

// subject + body birlikte render; eksikler tek listede toplanır
function renderTemplate(template, data = {}) {
  const subjectTemplate = template.subjectTemplate || '';
  const bodyTemplate = template.bodyTemplate || '';
  const subjectVal = validate(subjectTemplate, data);
  const bodyVal = validate(bodyTemplate, data);
  const missing = Array.from(new Set([...subjectVal.missing, ...bodyVal.missing]));
  return {
    subject: render(subjectTemplate, data),
    body: render(bodyTemplate, data),
    missing,
    ok: missing.length === 0
  };
}

module.exports = { extractPlaceholders, render, validate, renderTemplate, hasValue };
