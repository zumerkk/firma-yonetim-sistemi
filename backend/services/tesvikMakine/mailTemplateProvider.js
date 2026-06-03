// 🗂️ MAIL TEMPLATE PROVIDER - Şablon seed + çözümleme
// DB'de MailTemplate varsa onu, yoksa constants'taki varsayılanı kullanır.

const MailTemplate = require('../../models/MailTemplate');
const { DEFAULT_TEMPLATES } = require('../../constants/tesvikMakineMail');
const { extractPlaceholders } = require('./mailTemplateEngine');

// DB boşsa varsayılan şablonları ekler (admin düzenlemelerini EZMEZ — sadece eksik olanı ekler)
async function seedMailTemplates() {
  let created = 0;
  for (const t of DEFAULT_TEMPLATES) {
    const exists = await MailTemplate.findOne({ code: t.code }).lean();
    if (exists) continue;
    const placeholders = Array.from(new Set([
      ...extractPlaceholders(t.subjectTemplate),
      ...extractPlaceholders(t.bodyTemplate)
    ]));
    await MailTemplate.create({ ...t, placeholders, isActive: true });
    created += 1;
  }
  if (created > 0) console.log(`✉️  [tesvikMakine] ${created} varsayılan mail şablonu seed edildi`);
  return created;
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
