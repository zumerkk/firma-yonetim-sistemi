// 🧠 MINISTRY MAIL PARSER - Bakanlık "Makine Teçhizat Talebi" maili ayrıştırıcı
// Büyük/küçük harf + Türkçe karakter (İ/ı) duyarsız. "Gtip/GTİP/G.T.İ.P" varyasyonlarını destekler.
// Etiketler arası değer çıkarımı → hem tek satır hem çok satırlı gövdeleri işler.
//
// Örnek gövdeler:
//   "Makine Adı: NST CİHAZI Gtip No: 901812000000 Barkod: 2wuhvj"
//   "Firma Adı : ADIYAMAN ÖZEL SEVGİ ... A.Ş."  /  "Belge No : 518097"  /  "Belge Id : 1023736"
//   "Adres: https://etuys.sanayi.gov.tr/etuysListeDogrulama"

const Tesvik = require('../../models/Tesvik');
const YeniTesvik = require('../../models/YeniTesvik');
const MachineProcess = require('../../models/MachineProcess');
const ParsedMinistryMail = require('../../models/ParsedMinistryMail');
const resolver = require('./certificateResolver');

// Etiket desenleri (Türkçe İ/ı varyantları açıkça yazıldı; /i tek başına TR'de yetersiz)
const LABELS = [
  { key: 'makineAdi', re: /Makine\s*Ad[ıiİI]/ },
  { key: 'gtipNo', re: /G\.?\s*T\.?\s*[İIıi]\.?\s*P\.?(?:\s*No)?/ },
  { key: 'barkod', re: /Barkod/ },
  { key: 'firmaAdi', re: /Firma\s*Ad[ıiİI]/ },
  { key: 'belgeId', re: /Belge\s*Id/ },     // belgeId, belgeNo'dan ÖNCE denensin (No, Id'yi kapsamaz ama net olsun)
  { key: 'belgeNo', re: /Belge\s*No/ },
  { key: 'adres', re: /Adres/ }
];

function onlyDigits(s) { return (s || '').replace(/\D+/g, ''); }
function collapse(s) { return (s || '').replace(/\s+/g, ' ').trim(); }

// Ham gövdeden alanları çıkar
function parse(text) {
  const body = String(text || '');
  const occ = [];
  for (const { key, re } of LABELS) {
    const g = new RegExp(re.source, 'gi');
    let m;
    while ((m = g.exec(body)) !== null) {
      occ.push({ key, start: m.index, end: m.index + m[0].length });
      if (m.index === g.lastIndex) g.lastIndex++; // sonsuz döngü koruması
    }
  }
  occ.sort((a, b) => a.start - b.start);

  const raw = {};
  for (let i = 0; i < occ.length; i++) {
    const cur = occ[i];
    if (raw[cur.key] !== undefined) continue; // ilk eşleşme kazanır
    const next = occ[i + 1];
    let val = body.slice(cur.end, next ? next.start : body.length);
    val = val.replace(/^[\s:：\-–—]+/, '').trim();
    raw[cur.key] = val;
  }

  return {
    makineAdi: collapse(raw.makineAdi || '').slice(0, 300),
    gtipNo: onlyDigits(raw.gtipNo || '').slice(0, 20),
    barkod: ((raw.barkod || '').match(/[A-Za-z0-9]+/) || [''])[0],
    firmaAdi: collapse(raw.firmaAdi || '').slice(0, 500),
    belgeNo: onlyDigits(raw.belgeNo || '').slice(0, 20),
    belgeId: onlyDigits(raw.belgeId || '').slice(0, 20),
    adres: ((raw.adres || '').match(/https?:\/\/\S+/) || [collapse(raw.adres || '')])[0]
  };
}

async function findCertificate(belgeNo, belgeId) {
  const m = {};
  if (belgeNo) m['belgeYonetimi.belgeNo'] = belgeNo;
  if (belgeId) m['belgeYonetimi.belgeId'] = belgeId;
  if (!Object.keys(m).length) return null;
  for (const [model, M] of [['Tesvik', Tesvik], ['YeniTesvik', YeniTesvik]]) {
    const cert = await M.findOne(m).lean();
    if (cert) return { tesvikModel: model, cert };
  }
  // belgeId tek başına da denensin (belgeNo eşleşmediyse)
  if (belgeId) {
    for (const [model, M] of [['Tesvik', Tesvik], ['YeniTesvik', YeniTesvik]]) {
      const cert = await M.findOne({ 'belgeYonetimi.belgeId': belgeId }).lean();
      if (cert) return { tesvikModel: model, cert };
    }
  }
  return null;
}

// Bir gömülü satırın parse sonucuyla benzerlik skoru
function scoreRow(row, parsed) {
  let score = 0;
  if (parsed.gtipNo && onlyDigits(row.gtipKodu) === parsed.gtipNo) score += 5;
  if (parsed.makineAdi) {
    const a = collapse(row.adiVeOzelligi).toLocaleLowerCase('tr');
    const b = collapse(parsed.makineAdi).toLocaleLowerCase('tr');
    if (a && b && (a === b || a.includes(b) || b.includes(a))) score += 3;
  }
  return score;
}

// Parse sonucunu mevcut makine satırına eşleştir
async function matchToMachine(parsed) {
  // 1) Barkod zaten bir süreçte varsa doğrudan eşleş
  if (parsed.barkod) {
    const proc = await MachineProcess.findOne({ barcode: parsed.barkod }).lean();
    if (proc) {
      return { tesvikModel: proc.tesvikModel, tesvikId: proc.tesvikId, listType: proc.listType, rowId: proc.rowId, machineProcessId: proc._id, score: 10, via: 'barcode' };
    }
  }
  // 2) Belge no/id ile sertifikayı bul, satırları skorla
  const found = await findCertificate(parsed.belgeNo, parsed.belgeId);
  if (!found) return null;
  const { tesvikModel, cert } = found;

  let best = null;
  for (const lt of ['local', 'import']) {
    for (const row of resolver.listFor(cert, lt)) {
      const score = scoreRow(row, parsed);
      if (score > 0 && (!best || score > best.score)) {
        best = { tesvikModel, tesvikId: cert._id, listType: lt, rowId: row.rowId, score, via: 'belge+gtip/ad' };
      }
    }
  }
  return best;
}

// Parse + eşleştir + kuyruğa kaydet. autoApply true ise eşleşene barkodu uygular (akışı tetikler).
async function ingest(text, { user = null, autoApply = false, sender = '', subject = '' } = {}) {
  const parsed = parse(text);
  const match = await matchToMachine(parsed);

  const record = await ParsedMinistryMail.create({
    raw: String(text || '').slice(0, 20000), sender, subject, parsed,
    status: match ? 'matched' : 'unmatched',
    matched: match ? { tesvikModel: match.tesvikModel, tesvikId: match.tesvikId, listType: match.listType, rowId: match.rowId, machineProcessId: match.machineProcessId, score: match.score } : {},
    createdByUserId: user ? user._id : null
  });

  let applied = null;
  if (match && autoApply && parsed.barkod) {
    applied = await applyToProcess({ match, barkod: parsed.barkod, record, user });
  }
  return { parsed, match, record, applied };
}

// Eşleşmeyi sürece uygula: süreç oluştur + barkod ver (mevcut barkod akışını tetikler)
async function applyToProcess({ match, barkod, record, user }) {
  const mps = require('./machineProcessService'); // döngüsel importtan kaçınmak için lazy
  const proc = await mps.ensureProcess({ tesvikModel: match.tesvikModel, tesvikId: match.tesvikId, listType: match.listType, rowId: match.rowId, user });
  const result = barkod ? await mps.setBarcode(proc, barkod, { user }) : null;
  if (record) {
    record.matched.machineProcessId = proc._id;
    record.appliedBarcode = !!barkod;
    record.status = 'applied';
    await record.save();
  }
  return { machineProcessId: proc._id, barcodeResult: result };
}

// Kuyruktaki bir kaydı elle bağla
async function linkQueueItem(id, { tesvikModel, tesvikId, listType, rowId, applyBarcode = true, user }) {
  const record = await ParsedMinistryMail.findById(id);
  if (!record) { const e = new Error('Kayıt bulunamadı.'); e.code = 'PROC_NOT_FOUND'; throw e; }
  const match = { tesvikModel, tesvikId, listType, rowId, score: record.matched.score || 0 };
  record.matched = { ...record.matched, tesvikModel, tesvikId, listType, rowId };
  record.status = 'manual_linked';
  await record.save();
  let applied = null;
  if (applyBarcode && record.parsed && record.parsed.barkod) {
    applied = await applyToProcess({ match, barkod: record.parsed.barkod, record, user });
  }
  return { record, applied };
}

module.exports = { parse, matchToMachine, findCertificate, scoreRow, ingest, applyToProcess, linkQueueItem };
