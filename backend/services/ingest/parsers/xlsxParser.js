const XLSX = require('xlsx');

function parseXlsx(buffer, opts = {}) {
  const wb = XLSX.read(buffer, { type: 'buffer' });
  const sheetName = opts.sheetName || wb.SheetNames[0];
  const ws = wb.Sheets[sheetName];
  const rows = XLSX.utils.sheet_to_json(ws, { defval: '', raw: false });
  const headers = rows.length ? Object.keys(rows[0]) : [];
  return { headers, rows, meta: { sheetName, sheetNames: wb.SheetNames } };
}

module.exports = { parseXlsx };

