const XLSX = require('xlsx');

function parseXlsx(buffer, opts = {}) {
  const wb = XLSX.read(buffer, { type: 'buffer' });
  const sheetName = opts.sheetName || wb.SheetNames[0];
  const ws = wb.Sheets[sheetName];
  const rows = XLSX.utils.sheet_to_json(ws, { defval: '', raw: false });
  const headers = rows.length ? Object.keys(rows[0]) : [];
  return { headers, rows, meta: { sheetName, sheetNames: wb.SheetNames } };
}

const stripAccents = (s) =>
  String(s || '')
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/ı/g, 'i')
    .trim();

// Makine listesi dosyaları (ETUYS ham/düzenlenmiş + sistem export'u) genelde
// "Yerli"/"İthal" adlı ayrı sayfalara bölünür. Var olan tek-sayfa parseXlsx bunu
// desteklemediği için ayrı bir fonksiyon: her iki sayfayı da okuyup satırları
// _liste alanıyla etiketleyip birleştirir. Ayrıca "Teşvik Belgesi" sayfası
// varsa (ETUYS ham formatı) belge kimlik bilgilerini meta olarak döndürür.
function parseMakineListesiXlsx(buffer) {
  const wb = XLSX.read(buffer, { type: 'buffer' });
  const findSheet = (needles) =>
    wb.SheetNames.find((n) => needles.some((needle) => stripAccents(n).includes(needle)));

  const yerliSheetName = findSheet(['yerli']);
  const ithalSheetName = findSheet(['ithal']);
  const belgeSheetName = findSheet(['tesvik belgesi']);

  let allRows = [];
  let headers = new Set();

  if (yerliSheetName) {
    const rows = XLSX.utils.sheet_to_json(wb.Sheets[yerliSheetName], { defval: '', raw: false });
    rows.forEach((r) => { headers = new Set([...headers, ...Object.keys(r)]); allRows.push({ ...r, _liste: 'yerli' }); });
  }
  if (ithalSheetName) {
    const rows = XLSX.utils.sheet_to_json(wb.Sheets[ithalSheetName], { defval: '', raw: false });
    rows.forEach((r) => { headers = new Set([...headers, ...Object.keys(r)]); allRows.push({ ...r, _liste: 'ithal' }); });
  }

  let belgeMeta = null;
  if (belgeSheetName) {
    const rows = XLSX.utils.sheet_to_json(wb.Sheets[belgeSheetName], { defval: '', raw: false });
    if (rows[0]) {
      const row = rows[0];
      const pick = (needles) => {
        const key = Object.keys(row).find((k) => needles.some((n) => stripAccents(k).includes(n)));
        return key ? row[key] : '';
      };
      belgeMeta = {
        belgeNumarasi: pick(['belge numarasi', 'belge no']),
        firmaAdi: pick(['firma adi']),
        belgeTarihi: pick(['belge tarihi']),
      };
    }
  }

  return {
    headers: Array.from(headers),
    rows: allRows,
    meta: {
      sheetNames: wb.SheetNames,
      isMakineListesi: Boolean(yerliSheetName || ithalSheetName),
      belge: belgeMeta,
    },
  };
}

function detectMakineListesiSheets(buffer) {
  const wb = XLSX.read(buffer, { type: 'buffer' });
  const stripped = wb.SheetNames.map(stripAccents);
  return stripped.some((n) => n.includes('yerli')) || stripped.some((n) => n.includes('ithal'));
}

module.exports = { parseXlsx, parseMakineListesiXlsx, detectMakineListesiSheets };

