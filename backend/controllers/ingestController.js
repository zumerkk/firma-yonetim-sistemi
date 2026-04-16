const IngestSession = require('../models/IngestSession');
const { IngestModule } = require('../services/ingest/types');
const { previewIngest } = require('../services/ingest');
const { normalizeFirma, validateFirma, upsertFirma } = require('../services/ingest/ingestors/FirmaIngestor');
const { normalizeDosyaTakip, validateDosyaTakip, upsertDosyaTakip } = require('../services/ingest/ingestors/DosyaTakipIngestor');
const {
  normalizeTesvik,
  validateTesvik,
  normalizeYeniTesvik,
  validateYeniTesvik,
  upsertTesvik,
  upsertYeniTesvik,
} = require('../services/ingest/ingestors/TesvikIngestor');

exports.preview = async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ success: false, message: 'file required' });

    const result = await previewIngest({
      userId: req.user._id,
      filename: req.file.originalname,
      buffer: req.file.buffer,
      opts: req.body || {},
    });

    res.json({ success: true, data: result });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
};

exports.commit = async (req, res) => {
  try {
    const { ingestSessionId, mappingOverrides = {}, mode = 'upsert' } = req.body || {};
    if (!ingestSessionId) return res.status(400).json({ success: false, message: 'ingestSessionId required' });

    const session = await IngestSession.findById(ingestSessionId).lean();
    if (!session) return res.status(404).json({ success: false, message: 'session not found' });

    // Basit sahiplik kontrolü
    if (String(session.createdBy) !== String(req.user._id) && req.user.rol !== 'admin') {
      return res.status(403).json({ success: false, message: 'forbidden' });
    }

    const mapping = { ...(session.mapping || {}), ...(mappingOverrides || {}) };
    const rows = session.payloadRows || [];

    const results = [];
    const errors = [];

    const applyMapping = (row) => {
      const out = {};
      for (const [col, val] of Object.entries(row || {})) {
        const target = mapping[col];
        if (target) out[target] = val;
      }
      return out;
    };

    if (session.module === IngestModule.FIRMA) {
      for (let i = 0; i < rows.length; i++) {
        try {
          const mapped = applyMapping(rows[i]);
          const n = normalizeFirma(mapped);
          const issues = validateFirma(n);
          if (issues.length) {
            errors.push({ row: i + 1, issues, raw: rows[i] });
            continue;
          }
          const r = await upsertFirma(n, req.user._id, { mode });
          results.push(r);
        } catch (e) {
          errors.push({ row: i + 1, issues: [e.message], raw: rows[i] });
        }
      }
    } else if (session.module === IngestModule.DOSYA_TAKIP) {
      for (let i = 0; i < rows.length; i++) {
        try {
          const mapped = applyMapping(rows[i]);
          const n = normalizeDosyaTakip(mapped);
          const issues = validateDosyaTakip(n);
          if (issues.length) {
            errors.push({ row: i + 1, issues, raw: rows[i] });
            continue;
          }
          const r = await upsertDosyaTakip(n, req.user, { mode });
          results.push(r);
        } catch (e) {
          errors.push({ row: i + 1, issues: [e.message], raw: rows[i] });
        }
      }
    } else if (session.module === IngestModule.TESVIK) {
      for (let i = 0; i < rows.length; i++) {
        const mapped = applyMapping(rows[i]);
        const n = normalizeTesvik(mapped);
        const issues = validateTesvik(n);
        if (issues.length) {
          errors.push({ row: i + 1, issues, raw: rows[i] });
          continue;
        }
        const r = await upsertTesvik(n, { userId: req.user._id, mode });
        results.push(r);
      }
    } else if (session.module === IngestModule.YENI_TESVIK) {
      for (let i = 0; i < rows.length; i++) {
        const mapped = applyMapping(rows[i]);
        const n = normalizeYeniTesvik(mapped);
        const issues = validateYeniTesvik(n);
        if (issues.length) {
          errors.push({ row: i + 1, issues, raw: rows[i] });
          continue;
        }
        const r = await upsertYeniTesvik(n, { userId: req.user._id, mode });
        results.push(r);
      }
    } else {
      return res.status(400).json({
        success: false,
        message: `module not supported yet: ${session.module}`,
      });
    }

    res.json({
      success: true,
      data: {
        module: session.module,
        created: results.filter((x) => x.action === 'created').length,
        updated: results.filter((x) => x.action === 'updated').length,
        skipped: results.filter((x) => x.action === 'skipped').length,
        errorsCount: errors.length,
        errors,
        mode,
      },
    });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
};
