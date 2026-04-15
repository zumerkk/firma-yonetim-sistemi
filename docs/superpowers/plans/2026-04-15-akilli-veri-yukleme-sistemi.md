# Akıllı Veri Yükleme Sistemi (Excel/CSV/PDF) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Tek bir “Import Wizard” ile Excel/CSV (Faz-2: PDF) dosyalarını yükleyip otomatik sınıflandırma + kolon eşleştirme + preview/commit akışıyla firma/teşvik/dosya-takip/makine kayıtlarını oluşturmak.

**Architecture:** Frontend’te wizard UI → Backend’te `/api/ingest/preview` + `/api/ingest/commit` → modül bazlı Ingestor’lar (Firma/DosyaTakip/Tesvik/YeniTesvik/MakineList) → normalize+validate+write.

**Tech Stack:** Node.js (Express), MongoDB (Mongoose), frontend React + MUI, XLSX/csv-parser. Opsiyonel: Gemini mapping (yalnız backend, env var ile).

---

## 0) Dosya/klasör yapısı (planın kilit kararı)

### Backend (yeni / değişecek)
- Create: `backend/routes/ingest.js`
- Modify: `backend/server.js` (route register: `/api/ingest`)
- Create: `backend/controllers/ingestController.js`
- Create: `backend/services/ingest/index.js` (orchestrator)
- Create: `backend/services/ingest/types.js` (enum/contract)
- Create: `backend/services/ingest/parsers/xlsxParser.js`
- Create: `backend/services/ingest/parsers/csvParser.js`
- (Phase 2) Create: `backend/services/ingest/parsers/pdfParser.js`
- Create: `backend/services/ingest/classifier.js`
- Create: `backend/services/ingest/mapping/synonyms.js`
- Create: `backend/services/ingest/mapping/autoMapper.js`
- (Optional) Create: `backend/services/ingest/mapping/geminiMapper.js`
- Create: `backend/services/ingest/ingestors/FirmaIngestor.js`
- Create: `backend/services/ingest/ingestors/DosyaTakipIngestor.js`
- Create: `backend/services/ingest/ingestors/TesvikIngestor.js` (Phase 2-3)
- Create: `backend/services/ingest/ingestors/YeniTesvikIngestor.js` (Phase 2-3)
- Create: `backend/services/ingest/ingestors/MakineListIngestor.js` (Phase 3)
- Create: `backend/models/IngestSession.js`
- Modify: `backend/package.json` (devDependencies: jest, supertest, mongodb-memory-server)
- Create: `backend/tests/ingest/classifier.test.js`
- Create: `backend/tests/ingest/mapper.test.js`
- Create: `backend/tests/ingest/api.test.js`

### Frontend (yeni / değişecek)
- Create: `frontend/src/pages/Import/ImportWizard.js`
- Create: `frontend/src/services/ingestService.js`
- Modify: `frontend/src/components/AppRouter.js` (route: `/import`)
- Modify: `frontend/src/components/Layout/Sidebar.js` (menu item: “Akıllı Import”)

---

## 1) Phase plan (scope küçük parçalar)

**Phase 1 (MVP, 1-2 hafta):**
- Excel/CSV parse
- Sınıflandırma: Firma vs DosyaTakip (yüksek sinyalli)
- Auto-mapping (synonyms) + preview/commit
- Upsert: Firma (vergiNoTC), DosyaTakip (takipId)

**Phase 2 (1-2 hafta):**
- Teşvik / Yeni Teşvik sınıflandırma + temel mapping (kunye/durum temel alanlar)
- Opsiyonel Gemini mapping fallback (sadece düşük confidence)
- PDF parse (text-based) *preview-only* (commit yok veya sınırlı)

**Phase 3 (2-4 hafta):**
- Makine listesi import (yerli/ithal ayrımı) + belge bağlama
- Revizyon/import audit entegrasyonu

Bu plan dosyası **Phase 1’i** uçtan uca tamamlayacak şekilde detaylandırılmıştır; Phase 2-3 için de iskelet görevler eklenmiştir.

---

## Task 1: Backend test altyapısı (Jest + Supertest)

**Files:**
- Modify: `backend/package.json`
- Create: `backend/tests/ingest/classifier.test.js`
- Create: `backend/tests/ingest/mapper.test.js`

- [ ] **Step 1: Jest deps ekle**

`backend/package.json` içine (devDependencies):

```json
{
  "devDependencies": {
    "jest": "^30.0.0",
    "supertest": "^7.0.0",
    "mongodb-memory-server": "^10.0.0"
  },
  "scripts": {
    "test": "jest"
  }
}
```

- [ ] **Step 2: Basit classifier testi yaz (fail etmeli)**

`backend/tests/ingest/classifier.test.js`:

```js
const { classify } = require('../../services/ingest/classifier');

describe('ingest classifier', () => {
  test('classifies Firma with strong headers', () => {
    const headers = ['vergi no', 'tam ünvan', 'adres', 'il', 'ilk irtibat kişisi'];
    const result = classify({ headers });
    expect(result.module).toBe('FIRMA');
    expect(result.confidence).toBeGreaterThan(0.8);
  });

  test('classifies DosyaTakip with workflow headers', () => {
    const headers = ['takipId', 'talepTuru', 'durum', 'anaAsama', 'firmaUnvan'];
    const result = classify({ headers });
    expect(result.module).toBe('DOSYA_TAKIP');
    expect(result.confidence).toBeGreaterThan(0.8);
  });
});
```

- [ ] **Step 3: Auto-mapper testi yaz (fail etmeli)**

`backend/tests/ingest/mapper.test.js`:

```js
const { autoMap } = require('../../services/ingest/mapping/autoMapper');

describe('ingest autoMapper', () => {
  test('maps vergiNoTC and tamUnvan synonyms', () => {
    const headers = ['VKN', 'Ünvan', 'Şehir', 'Adres'];
    const mapping = autoMap({ module: 'FIRMA', headers });
    expect(mapping['VKN']).toBe('vergiNoTC');
    expect(mapping['Ünvan']).toBe('tamUnvan');
  });
});
```

- [ ] **Step 4: Testleri çalıştır (beklenen: FAIL - modüller yok)**

Run:
```bash
cd backend && npm test
```
Expected: FAIL (classifier/autoMapper dosyaları henüz yok).

- [ ] **Step 5: Commit**

> Not: repo’da git user.name/email ayarlı değilse commit atılamaz. Repo-local ayar yaparak ilerleyin:
```bash
git config user.name "SOLO"
git config user.email "solo@local"
```

---

## Task 2: Ingest sözleşmeleri + synonym sözlüğü + classifier (MVP)

**Files:**
- Create: `backend/services/ingest/types.js`
- Create: `backend/services/ingest/mapping/synonyms.js`
- Create: `backend/services/ingest/classifier.js`

- [ ] **Step 1: types.js oluştur**

`backend/services/ingest/types.js`:

```js
const IngestModule = Object.freeze({
  FIRMA: 'FIRMA',
  DOSYA_TAKIP: 'DOSYA_TAKIP',
  TESVIK: 'TESVIK',
  YENI_TESVIK: 'YENI_TESVIK',
  MAKINE_LIST: 'MAKINE_LIST',
  UNKNOWN: 'UNKNOWN',
});

module.exports = { IngestModule };
```

- [ ] **Step 2: synonyms.js oluştur (Phase-1 kapsamı)**

`backend/services/ingest/mapping/synonyms.js`:

```js
const normalizeHeader = (h) =>
  String(h || '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .replace(/[._-]+/g, ' ');

const SYNONYMS = {
  FIRMA: {
    vergiNoTC: ['vergi no', 'vergi no/tc', 'vkn', 'tckn', 'vergino', 'vergi no tc'],
    tamUnvan: ['tam ünvan', 'unvan', 'ünvan', 'firma ünvanı', 'firma unvani'],
    adres: ['adres', 'açık adres', 'acik adres'],
    firmaIl: ['il', 'şehir', 'sehir', 'firma il'],
    firmaIlce: ['ilçe', 'ilce', 'firma ilçe', 'firma ilce'],
    kepAdresi: ['kep', 'kep adresi', 'kepadresi'],
    ilkIrtibatKisi: ['ilk irtibat kişisi', 'ilk irtibat', 'irtibat', 'irtibat kişisi', 'irtibat kisisi'],
    etuysYetkiBitisTarihi: ['etuys bitiş', 'etuys bitis', 'etuys yetki bitiş', 'etuys yetki bitis', 'etuysYetkiBitisTarihi'],
    dysYetkiBitisTarihi: ['dys bitiş', 'dys bitis', 'dys yetki bitiş', 'dys yetki bitis', 'dysYetkiBitisTarihi'],
  },
  DOSYA_TAKIP: {
    takipId: ['takipid', 'takip id', 'id'],
    talepTuru: ['talepturu', 'talep türü', 'talep turu'],
    durum: ['durum', 'durum kodu', 'state'],
    anaAsama: ['ana aşama', 'ana asama', 'asama'],
    firmaUnvan: ['firma unvan', 'firma ünvan', 'unvan', 'ünvan'],
    ytbNo: ['ytb no', 'ytbno', 'belge no'],
    belgeId: ['belge id', 'belgeid'],
  },
};

module.exports = { SYNONYMS, normalizeHeader };
```

- [ ] **Step 3: classifier.js (skor tabanlı)**

`backend/services/ingest/classifier.js`:

```js
const { IngestModule } = require('./types');
const { normalizeHeader } = require('./mapping/synonyms');

const scoreByPresence = (headersNorm, needles) =>
  needles.reduce((acc, n) => acc + (headersNorm.has(n) ? 1 : 0), 0);

function classify({ headers }) {
  const hs = (headers || []).map(normalizeHeader);
  const set = new Set(hs);

  // Phase-1: Firma vs DosyaTakip
  const firmaNeedles = ['vkn', 'vergi no', 'tam ünvan', 'adres', 'il', 'ilk irtibat'];
  const dosyaNeedles = ['talep türü', 'talepturu', 'durum', 'ana asama', 'ana aşama', 'takipid'];

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
```

- [ ] **Step 4: Testleri çalıştır (beklenen: PASS)**

Run:
```bash
cd backend && npm test
```
Expected: PASS (Task 1 testleri).

- [ ] **Step 5: Commit**

```bash
git add backend/services/ingest backend/tests/ingest
git commit -m "feat(ingest): add classifier and synonym mapping (phase 1)"
```

---

## Task 3: Auto-mapper (synonyms → target field)

**Files:**
- Create: `backend/services/ingest/mapping/autoMapper.js`
- Modify: `backend/tests/ingest/mapper.test.js` (gerekirse)

- [ ] **Step 1: autoMapper implementasyonu**

`backend/services/ingest/mapping/autoMapper.js`:

```js
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
```

- [ ] **Step 2: Testleri çalıştır**

Run:
```bash
cd backend && npm test
```
Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add backend/services/ingest/mapping/autoMapper.js
git commit -m "feat(ingest): add auto mapper for headers"
```

---

## Task 4: Excel/CSV parser’ları (Phase-1)

**Files:**
- Create: `backend/services/ingest/parsers/xlsxParser.js`
- Create: `backend/services/ingest/parsers/csvParser.js`

- [ ] **Step 1: xlsx parser**

`backend/services/ingest/parsers/xlsxParser.js`:

```js
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
```

- [ ] **Step 2: csv parser**

`backend/services/ingest/parsers/csvParser.js`:

```js
const csv = require('csv-parser');
const { Readable } = require('stream');

function parseCsv(buffer, opts = {}) {
  const rows = [];
  return new Promise((resolve, reject) => {
    const stream = Readable.from(buffer.toString('utf-8'));
    stream
      .pipe(csv({ separator: opts.delimiter || ',' }))
      .on('data', (data) => rows.push(data))
      .on('end', () => {
        const headers = rows.length ? Object.keys(rows[0]) : [];
        resolve({ headers, rows, meta: { delimiter: opts.delimiter || ',' } });
      })
      .on('error', reject);
  });
}

module.exports = { parseCsv };
```

- [ ] **Step 3: Unit test ekle (opsiyonel)**

İsterseniz minimal parse testi ekleyin; MVP’de bu adım atlanabilir.

- [ ] **Step 4: Commit**

```bash
git add backend/services/ingest/parsers
git commit -m "feat(ingest): add xlsx/csv parsers"
```

---

## Task 5: IngestSession modeli (preview/commit için)

**Files:**
- Create: `backend/models/IngestSession.js`

- [ ] **Step 1: Model**

`backend/models/IngestSession.js`:

```js
const mongoose = require('mongoose');

const ingestSessionSchema = new mongoose.Schema(
  {
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    module: { type: String, required: true },
    confidence: { type: Number, default: 0 },
    mapping: { type: Object, default: {} },
    // Raw parsed preview (keep small)
    headers: { type: [String], default: [] },
    sampleRows: { type: [Object], default: [] },
    // For commit
    payloadRows: { type: [Object], default: [] }, // optional: store all rows (careful with size)
    expiresAt: { type: Date, default: () => new Date(Date.now() + 6 * 60 * 60 * 1000) }, // 6h
  },
  { timestamps: true, collection: 'ingest_sessions' }
);

ingestSessionSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

module.exports = mongoose.model('IngestSession', ingestSessionSchema);
```

- [ ] **Step 2: Commit**

```bash
git add backend/models/IngestSession.js
git commit -m "feat(ingest): add ingest session model"
```

---

## Task 6: Ingestor’lar (Phase-1: Firma + DosyaTakip)

**Files:**
- Create: `backend/services/ingest/ingestors/FirmaIngestor.js`
- Create: `backend/services/ingest/ingestors/DosyaTakipIngestor.js`

- [ ] **Step 1: FirmaIngestor (normalize + validate + upsert)**

`backend/services/ingest/ingestors/FirmaIngestor.js`:

```js
const Firma = require('../../models/Firma');

const toUpperTR = (s) => String(s || '').trim().toLocaleUpperCase('tr-TR');

function normalizeFirma(row) {
  return {
    vergiNoTC: String(row.vergiNoTC || '').replace(/\s/g, ''),
    tamUnvan: String(row.tamUnvan || '').trim(),
    adres: String(row.adres || '').trim(),
    firmaIl: toUpperTR(row.firmaIl),
    firmaIlce: toUpperTR(row.firmaIlce || ''),
    kepAdresi: String(row.kepAdresi || '').trim().toLowerCase(),
    ilkIrtibatKisi: String(row.ilkIrtibatKisi || '').trim(),
    etuysYetkiBitisTarihi: row.etuysYetkiBitisTarihi ? new Date(row.etuysYetkiBitisTarihi) : null,
    dysYetkiBitisTarihi: row.dysYetkiBitisTarihi ? new Date(row.dysYetkiBitisTarihi) : null,
  };
}

function validateFirma(n) {
  const issues = [];
  if (!n.vergiNoTC || !/^\d{9,11}$/.test(n.vergiNoTC)) issues.push('vergiNoTC invalid');
  if (!n.tamUnvan || n.tamUnvan.length < 3) issues.push('tamUnvan required');
  if (!n.adres) issues.push('adres required');
  if (!n.firmaIl) issues.push('firmaIl required');
  if (!n.ilkIrtibatKisi) issues.push('ilkIrtibatKisi required');
  return issues;
}

async function upsertFirma(n, userId) {
  const existing = await Firma.findOne({ vergiNoTC: n.vergiNoTC });
  if (existing) {
    existing.set({ ...n, sonGuncelleyen: userId });
    const saved = await existing.save();
    return { action: 'updated', id: saved._id };
  }
  const created = await Firma.create({ ...n, olusturanKullanici: userId });
  return { action: 'created', id: created._id };
}

module.exports = { normalizeFirma, validateFirma, upsertFirma };
```

- [ ] **Step 2: DosyaTakipIngestor**

`backend/services/ingest/ingestors/DosyaTakipIngestor.js`:

```js
const DosyaTakip = require('../../models/DosyaTakip');

function normalizeDosyaTakip(row) {
  return {
    takipId: String(row.takipId || '').trim(),
    firmaUnvan: String(row.firmaUnvan || '').trim(),
    talepTuru: String(row.talepTuru || '').trim(),
    durum: String(row.durum || '').trim(),
    anaAsama: String(row.anaAsama || '').trim(),
    ytbNo: String(row.ytbNo || '').trim(),
    belgeId: String(row.belgeId || '').trim(),
    durumAciklamasi: String(row.durumAciklamasi || '').trim(),
  };
}

function validateDosyaTakip(n) {
  const issues = [];
  if (!n.talepTuru) issues.push('talepTuru required');
  if (!n.durum) issues.push('durum required');
  if (!n.anaAsama) issues.push('anaAsama required');
  return issues;
}

async function upsertDosyaTakip(n, user) {
  if (!n.takipId) {
    // fallback: always create if takipId missing (Phase-1 basit)
    const created = await DosyaTakip.create({
      ...n,
      olusturanKullanici: user._id,
      olusturanAdi: user.adSoyad,
      aktif: true,
    });
    return { action: 'created', id: created._id };
  }

  const existing = await DosyaTakip.findOne({ takipId: n.takipId });
  if (existing) {
    existing.set({ ...n, sonGuncelleyen: user._id, sonGuncelleyenAdi: user.adSoyad });
    const saved = await existing.save();
    return { action: 'updated', id: saved._id };
  }

  const created = await DosyaTakip.create({
    ...n,
    olusturanKullanici: user._id,
    olusturanAdi: user.adSoyad,
    aktif: true,
  });
  return { action: 'created', id: created._id };
}

module.exports = { normalizeDosyaTakip, validateDosyaTakip, upsertDosyaTakip };
```

- [ ] **Step 3: Commit**

```bash
git add backend/services/ingest/ingestors
git commit -m "feat(ingest): add Firma and DosyaTakip ingestors (phase 1)"
```

---

## Task 7: Orchestrator + Controller + Routes (preview/commit)

**Files:**
- Create: `backend/services/ingest/index.js`
- Create: `backend/controllers/ingestController.js`
- Create: `backend/routes/ingest.js`
- Modify: `backend/server.js`
- Create: `backend/tests/ingest/api.test.js`

- [ ] **Step 1: Orchestrator (parse + classify + map + preview)**

`backend/services/ingest/index.js`:

```js
const path = require('path');
const { classify } = require('./classifier');
const { autoMap } = require('./mapping/autoMapper');
const { IngestModule } = require('./types');
const { parseXlsx } = require('./parsers/xlsxParser');
const { parseCsv } = require('./parsers/csvParser');

const IngestSession = require('../models/IngestSession');

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
  else return { fileType, module: IngestModule.UNKNOWN, confidence: 0, reasons: ['unsupported file type'] };

  const classification = classify({ headers: parsed.headers, sampleRows: parsed.rows.slice(0, 5) });
  const mapping = autoMap({ module: classification.module, headers: parsed.headers });

  const sampleRows = parsed.rows.slice(0, 20);
  const session = await IngestSession.create({
    createdBy: userId,
    module: classification.module,
    confidence: classification.confidence,
    mapping,
    headers: parsed.headers,
    sampleRows,
    // Phase-1: store payloadRows (limit 2000 satır koruması)
    payloadRows: parsed.rows.slice(0, 2000),
  });

  return {
    fileType,
    meta: parsed.meta,
    classification,
    mapping,
    requiredFieldCheck: [], // Phase-1 minimal
    rowPreview: sampleRows,
    ingestSessionId: session._id.toString(),
  };
}

module.exports = { previewIngest, detectFileType };
```

- [ ] **Step 2: Commit endpoint (MVP: Firma + DosyaTakip)**

`backend/controllers/ingestController.js`:

```js
const IngestSession = require('../models/IngestSession');
const { IngestModule } = require('../services/ingest/types');
const { previewIngest } = require('../services/ingest');
const { normalizeFirma, validateFirma, upsertFirma } = require('../services/ingest/ingestors/FirmaIngestor');
const { normalizeDosyaTakip, validateDosyaTakip, upsertDosyaTakip } = require('../services/ingest/ingestors/DosyaTakipIngestor');

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

    const mapping = { ...(session.mapping || {}), ...(mappingOverrides || {}) };
    const rows = session.payloadRows || [];

    const results = [];
    const errors = [];

    const applyMapping = (row) => {
      const out = {};
      for (const [col, val] of Object.entries(row)) {
        const target = mapping[col];
        if (target) out[target] = val;
      }
      return out;
    };

    if (session.module === IngestModule.FIRMA) {
      for (let i = 0; i < rows.length; i++) {
        const mapped = applyMapping(rows[i]);
        const n = normalizeFirma(mapped);
        const issues = validateFirma(n);
        if (issues.length) {
          errors.push({ row: i + 1, issues, raw: rows[i] });
          continue;
        }
        const r = await upsertFirma(n, req.user._id);
        results.push(r);
      }
    } else if (session.module === IngestModule.DOSYA_TAKIP) {
      for (let i = 0; i < rows.length; i++) {
        const mapped = applyMapping(rows[i]);
        const n = normalizeDosyaTakip(mapped);
        const issues = validateDosyaTakip(n);
        if (issues.length) {
          errors.push({ row: i + 1, issues, raw: rows[i] });
          continue;
        }
        const r = await upsertDosyaTakip(n, req.user);
        results.push(r);
      }
    } else {
      return res.status(400).json({ success: false, message: `module not supported in phase-1: ${session.module}` });
    }

    res.json({
      success: true,
      data: {
        module: session.module,
        created: results.filter((x) => x.action === 'created').length,
        updated: results.filter((x) => x.action === 'updated').length,
        errorsCount: errors.length,
        errors,
        mode,
      },
    });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
};
```

- [ ] **Step 3: Route + multer memory storage**

`backend/routes/ingest.js`:

```js
const express = require('express');
const router = express.Router();
const multer = require('multer');
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 50 * 1024 * 1024 } });

const { authenticate } = require('../middleware/auth');
const ingestController = require('../controllers/ingestController');

router.post('/preview', authenticate, upload.single('file'), ingestController.preview);
router.post('/commit', authenticate, ingestController.commit);

module.exports = router;
```

- [ ] **Step 4: server.js’e route ekle**

`backend/server.js` içinde route import listesine ekleyin:

```js
const ingestRoutes = require('./routes/ingest');
```

ve route register kısmına:

```js
app.use('/api/ingest', ingestRoutes);
```

- [ ] **Step 5: API testi (Supertest)**

`backend/tests/ingest/api.test.js` (minimum smoke):

```js
const request = require('supertest');
const express = require('express');

// Bu test MVP: gerçek auth bypass için test-only app kuruyoruz
const ingestRoutes = require('../../routes/ingest');

describe('ingest api (smoke)', () => {
  test('preview requires auth', async () => {
    const app = express();
    app.use('/api/ingest', ingestRoutes);
    const res = await request(app).post('/api/ingest/preview');
    expect([401, 500]).toContain(res.statusCode);
  });
});
```

> Not: En iyi pratik: auth için test user + JWT üretimi + mongodb-memory-server ile gerçek entegrasyon testidir. Bu smoke test Phase-1 başlangıcıdır.

- [ ] **Step 6: Testleri çalıştır**

Run:
```bash
cd backend && npm test
```
Expected: PASS

- [ ] **Step 7: Commit**

```bash
git add backend/routes/ingest.js backend/controllers/ingestController.js backend/services/ingest backend/tests/ingest/api.test.js backend/server.js
git commit -m "feat(ingest): add preview/commit endpoints (phase 1)"
```

---

## Task 8: Frontend Import Wizard (MVP)

**Files:**
- Create: `frontend/src/services/ingestService.js`
- Create: `frontend/src/pages/Import/ImportWizard.js`
- Modify: `frontend/src/components/AppRouter.js`
- Modify: `frontend/src/components/Layout/Sidebar.js`

- [ ] **Step 1: ingestService**

`frontend/src/services/ingestService.js`:

```js
import api from '../utils/axios';

export async function ingestPreview(file) {
  const form = new FormData();
  form.append('file', file);
  const res = await api.post('/ingest/preview', form, { headers: { 'Content-Type': 'multipart/form-data' } });
  return res.data;
}

export async function ingestCommit(ingestSessionId, mappingOverrides = {}, mode = 'upsert') {
  const res = await api.post('/ingest/commit', { ingestSessionId, mappingOverrides, mode });
  return res.data;
}
```

- [ ] **Step 2: ImportWizard sayfası (basit)**

`frontend/src/pages/Import/ImportWizard.js`:

```jsx
import React, { useState } from 'react';
import { Box, Container, Typography, Button, Paper, Alert } from '@mui/material';
import Header from '../../components/Layout/Header';
import Sidebar from '../../components/Layout/Sidebar';
import { ingestPreview, ingestCommit } from '../../services/ingestService';

export default function ImportWizard() {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);

  const onSelect = (e) => setFile(e.target.files?.[0] || null);

  const doPreview = async () => {
    setBusy(true); setError(null);
    try {
      const res = await ingestPreview(file);
      if (!res.success) throw new Error(res.message || 'preview failed');
      setPreview(res.data);
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  };

  const doCommit = async () => {
    setBusy(true); setError(null);
    try {
      const res = await ingestCommit(preview.ingestSessionId);
      if (!res.success) throw new Error(res.message || 'commit failed');
      alert(`Tamamlandı. Created: ${res.data.created}, Updated: ${res.data.updated}, Errors: ${res.data.errorsCount}`);
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Box sx={{ display: 'grid', gridTemplateRows: '64px 1fr', height: '100vh' }}>
      <Header onSidebarToggle={() => setSidebarOpen(!sidebarOpen)} />
      <Box sx={{ display: 'flex' }}>
        <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
        <Container maxWidth="lg" sx={{ py: 3 }}>
          <Typography variant="h5" sx={{ mb: 2, fontWeight: 700 }}>Akıllı Veri Yükleme</Typography>
          {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

          <Paper sx={{ p: 2, mb: 2 }}>
            <input type="file" accept=".xlsx,.xls,.csv" onChange={onSelect} />
            <Box sx={{ mt: 2 }}>
              <Button variant="contained" disabled={!file || busy} onClick={doPreview}>Önizleme</Button>
            </Box>
          </Paper>

          {preview && (
            <Paper sx={{ p: 2 }}>
              <Typography sx={{ fontWeight: 700 }}>Tespit:</Typography>
              <Typography>Modül: {preview.classification?.module} (confidence: {preview.classification?.confidence?.toFixed?.(2)})</Typography>
              <Typography sx={{ mt: 1, fontWeight: 700 }}>Eşleştirme:</Typography>
              <pre style={{ whiteSpace: 'pre-wrap' }}>{JSON.stringify(preview.mapping, null, 2)}</pre>
              <Button variant="contained" color="success" disabled={busy} onClick={doCommit}>Onayla ve Kaydet</Button>
            </Paper>
          )}
        </Container>
      </Box>
    </Box>
  );
}
```

- [ ] **Step 3: Router’a ekle**

`frontend/src/components/AppRouter.js` içine:

```js
import ImportWizard from '../pages/Import/ImportWizard';
```

ve route:

```jsx
<Route path="/import" element={
  <ProtectedRoute>
    <ImportWizard />
  </ProtectedRoute>
} />
```

- [ ] **Step 4: Sidebar’a menü ekle**

`frontend/src/components/Layout/Sidebar.js` uygun yere:
- label: “Akıllı Import”
- path: `/import`

- [ ] **Step 5: Manuel test**

Run:
```bash
npm run dev
```
Senaryo:
1) Login
2) Menüden “Akıllı Import”
3) Firma CSV/XLSX seç → Preview → Commit
4) Firma listesinde kayıtların oluştuğunu doğrula

- [ ] **Step 6: Commit**

```bash
git add frontend/src/pages/Import/ImportWizard.js frontend/src/services/ingestService.js frontend/src/components/AppRouter.js frontend/src/components/Layout/Sidebar.js
git commit -m "feat(frontend): add ingest import wizard (phase 1)"
```

---

## Task 9: (Opsiyonel ama önerilir) Entegrasyon testi: JWT + gerçek DB memory

**Files:**
- Modify/Create: `backend/tests/ingest/api.test.js`

- [ ] **Step 1: mongodb-memory-server ile test DB kur**
- [ ] **Step 2: Test user seed + JWT üret**
- [ ] **Step 3: supertest ile /preview ve /commit çağır**

> Bu task Phase-1 sonunda kalite kapısı olarak yapılmalı.

---

## Task 10: Phase-2/3 iskelet (bu planda uygulanmayacak, sadece backlog)

- [ ] Teşvik/YeniTeşvik classifier sinyalleri + mapping sözlüğü
- [ ] Gemini fallback mapper (env var varsa, düşük confidence)
- [ ] PDF parser (text-based) preview
- [ ] Makine listesi import (yerli/ithal) + belge bağlama + revizyon entegrasyonu

---

## Self-review (plan kalitesi kontrol)

- Spec coverage: Phase-1 hedefleri (Firma + DosyaTakip) task’larla kapsandı.
- Placeholder taraması: “Phase-2/3 iskelet” dışında doğrudan TODO bırakılmadı; Phase-1 adımları çalışır kod içeriyor.
- Tutarlılık: `module` isimleri `IngestModule` ile uyumlu.

---

## Execution Handoff

Plan complete and saved to `docs/superpowers/plans/2026-04-15-akilli-veri-yukleme-sistemi.md`. Two execution options:

1. **Subagent-Driven (recommended)** - I dispatch a fresh subagent per task, review between tasks, fast iteration  
2. **Inline Execution** - Execute tasks in this session using executing-plans, batch execution with checkpoints

Which approach?

