// 🗂️ MAIL TEMPLATE PROVIDER - Şablon seed + çözümleme
// DB'de MailTemplate varsa onu, yoksa constants'taki varsayılanı kullanır.

const MailTemplate = require('../../models/MailTemplate');
const { DEFAULT_TEMPLATES } = require('../../constants/tesvikMakineMail');
const { extractPlaceholders } = require('./mailTemplateEngine');

// DB boşsa varsayılan şablonları ekler. Mevcut şablonları KURAL ile günceller:
//   - Sadece elle düzenlenmemiş (updatedByUserId yok) ve sürümü eskimiş kayıtlar yeni varsayılana taşınır.
//   - Admin elle düzenlediyse (updatedByUserId dolu) ASLA ezilmez.
async function seedMailTemplates() {
  let created = 0;
  let updated = 0;
  for (const t of DEFAULT_TEMPLATES) {
    const placeholders = Array.from(new Set([
      ...extractPlaceholders(t.subjectTemplate),
      ...extractPlaceholders(t.bodyTemplate)
    ]));
    const defVersion = t.version || 1;
    const existing = await MailTemplate.findOne({ code: t.code });
    if (!existing) {
      await MailTemplate.create({ ...t, version: defVersion, placeholders, isActive: true });
      created += 1;
      continue;
    }
    const manuallyEdited = Boolean(existing.updatedByUserId);
    const outdated = (existing.version || 1) < defVersion;
    if (!manuallyEdited && outdated) {
      existing.name = t.name;
      existing.subjectTemplate = t.subjectTemplate;
      existing.bodyTemplate = t.bodyTemplate;
      existing.placeholders = placeholders;
      existing.version = defVersion;
      await existing.save();
      updated += 1;
    }
  }
  if (created > 0 || updated > 0) {
    console.log(`✉️  [tesvikMakine] mail şablonları: ${created} eklendi, ${updated} güncellendi`);
  }
  return { created, updated };
}

// code → şablon (DB öncelikli, sonra constants fallback)
async function resolveTemplate(code) {
  const dbT = await MailTemplate.findOne({ code, isActive: true }).lean();
  if (dbT) return dbT;
  const def = DEFAULT_TEMPLATES.find((t) => t.code === code);
  if (def) return { ...def, _fallback: true };
  const err = new Error(`Mail şablonu bulunamadı: ${code}`);
  err.code = 'TEMPLATE_NOT_FOUND';
  throw err;
}

module.exports = { seedMailTemplates, resolveTemplate };
