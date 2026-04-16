const path = require('path');
const { classify } = require('./classifier');
const { autoMap } = require('./mapping/autoMapper');
const { IngestModule } = require('./types');
const { parseXlsx } = require('./parsers/xlsxParser');
const { parseCsv } = require('./parsers/csvParser');
const { suggestGeminiMapping } = require('./mapping/geminiMapper');
const { TARGET_FIELDS } = require('./mapping/targets');

const IngestSession = require('../../models/IngestSession');

function detectFileType(filename = '') {
  const ext = path.extname(filename).toLowerCase();
  if (ext === '.xlsx' || ext === '.xls') return 'XLSX';
  if (ext === '.csv') return 'CSV';
  if (ext === '.pdf') return 'PDF';
  return 'UNKNOWN';
}

async function previewIngest({ userId, filename, buffer, opts = {} }) {
  const fileType = detectFileType(filename);
  let parsed;

  if (fileType === 'XLSX') parsed = parseXlsx(buffer, opts);
  else if (fileType === 'CSV') parsed = await parseCsv(buffer, opts);
  else {
    return {
      fileType,
      classification: { module: IngestModule.UNKNOWN, confidence: 0, reasons: ['unsupported file type'] },
      mapping: {},
      rowPreview: [],
    };
  }

  const classification = classify({ headers: parsed.headers, sampleRows: parsed.rows.slice(0, 5) });
  const mapping = autoMap({ module: classification.module, headers: parsed.headers });

  const sampleRows = parsed.rows.slice(0, 20);
  const payloadRows = parsed.rows.slice(0, 2000);

  // Opsiyonel: Gemini ile sadece "öneri" mapping (fallback).
  let geminiSuggestion = null;
  try {
    const coverage = parsed.headers.length ? Object.keys(mapping).length / parsed.headers.length : 0;
    const shouldTryGemini = coverage < 0.4 || classification.confidence < 0.75;
    if (shouldTryGemini) {
      geminiSuggestion = await suggestGeminiMapping({
        module: classification.module,
        headers: parsed.headers,
        sampleRows: sampleRows.slice(0, 5),
        baseMapping: mapping,
      });
    }
  } catch (e) {
    // Gemini opsiyonel; hata durumunda preview bloklanmamalı.
    geminiSuggestion = { available: false, error: e.message };
  }

  const session = await IngestSession.create({
    createdBy: userId,
    module: classification.module,
    confidence: classification.confidence,
    mapping,
    headers: parsed.headers,
    sampleRows,
    payloadRows,
  });

  return {
    fileType,
    meta: parsed.meta,
    headers: parsed.headers,
    classification,
    mapping,
    geminiSuggestion,
    // UI tarafının "manuel mapping override" ekranında yardımcı olsun
    targetFields: TARGET_FIELDS[classification.module] || [],
    requiredFieldCheck: [], // Phase-1 minimal
    rowPreview: sampleRows,
    ingestSessionId: session._id.toString(),
  };
}

module.exports = { previewIngest, detectFileType };
