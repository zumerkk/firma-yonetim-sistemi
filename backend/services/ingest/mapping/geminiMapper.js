/**
 * Gemini mapper (opsiyonel)
 *
 * Amaç: düşük güven durumunda kolon eşleştirmesi için "öneri" üretmek.
 * Kural: Gemini çıktısı otomatik commit ETMEZ; sadece preview ekranında gösterilir.
 *
 * Not:
 * - GEMINI_API_KEY yoksa sessizce devre dışı kalır.
 * - Hata olursa preview akışı asla bloklanmamalı (caller try/catch yapar).
 *
 * Güvenlik:
 * - Gemini'ye PII göndermemeye çalış: sadece başlıklar + maskeli örnekler.
 */

const https = require('https');

const { TARGET_FIELDS } = require('./targets');

function maskValue(v) {
  const s = String(v ?? '');
  if (!s) return s;

  // Çok uzun sayısal değerleri maskele (vergi no, telefon vs.)
  if (/^\d{7,}$/.test(s)) return `${s.slice(0, 3)}***${s.slice(-2)}`;
  // Email maskele
  if (s.includes('@')) {
    const [u, d] = s.split('@');
    if (!d) return '***';
    return `${u.slice(0, 2)}***@${d}`;
  }
  return s.length > 60 ? `${s.slice(0, 60)}…` : s;
}

function maskRows(rows = []) {
  return rows.slice(0, 5).map((r) => {
    const out = {};
    Object.entries(r || {}).forEach(([k, v]) => {
      out[k] = maskValue(v);
    });
    return out;
  });
}

function postJson(url, body) {
  return new Promise((resolve, reject) => {
    const data = Buffer.from(JSON.stringify(body), 'utf-8');
    const u = new URL(url);

    const req = https.request(
      {
        method: 'POST',
        hostname: u.hostname,
        path: u.pathname + u.search,
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': data.length,
        },
      },
      (res) => {
        let raw = '';
        res.setEncoding('utf8');
        res.on('data', (chunk) => (raw += chunk));
        res.on('end', () => {
          if (res.statusCode && res.statusCode >= 400) {
            return reject(new Error(`Gemini HTTP ${res.statusCode}: ${raw.slice(0, 500)}`));
          }
          try {
            resolve(JSON.parse(raw));
          } catch (e) {
            reject(new Error(`Gemini JSON parse error: ${e.message}`));
          }
        });
      }
    );

    req.on('error', reject);
    req.write(data);
    req.end();
  });
}

function safeJsonExtract(text) {
  // Gemini bazen JSON'u fenced code block içinde döndürebilir
  const m = String(text || '').match(/\{[\s\S]*\}/);
  if (!m) return null;
  try {
    return JSON.parse(m[0]);
  } catch {
    return null;
  }
}

async function suggestGeminiMapping({ module, headers, sampleRows, baseMapping }) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return null;

  const targetFields = TARGET_FIELDS[module] || [];
  if (!targetFields.length) return null;

  const masked = maskRows(sampleRows || []);

  const prompt = [
    `Görev: Bir Excel/CSV dosyasındaki kolon başlıklarını hedef alanlara eşleştir.`,
    `Kurallar:`,
    `- Sadece verilen hedef alanları kullan.`,
    `- Emin değilsen null bırak.`,
    `- Çıktıyı SADECE JSON olarak ver (açıklama metni yok).`,
    ``,
    `Modül: ${module}`,
    `Kolon başlıkları: ${JSON.stringify(headers)}`,
    `Hedef alanlar: ${JSON.stringify(targetFields)}`,
    `Örnek satırlar (maskeli): ${JSON.stringify(masked)}`,
    `Mevcut otomatik eşleştirme (baseMapping): ${JSON.stringify(baseMapping || {})}`,
    ``,
    `JSON formatı: { "mapping": { "<KaynakKolon>": "<hedefAlan|null>" }, "confidence": 0-1 }`,
  ].join('\n');

  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${encodeURIComponent(
    apiKey
  )}`;

  const payload = {
    contents: [{ role: 'user', parts: [{ text: prompt }] }],
    generationConfig: { temperature: 0.1, topP: 0.9, maxOutputTokens: 1024 },
  };

  const resp = await postJson(url, payload);
  const text =
    resp?.candidates?.[0]?.content?.parts?.map((p) => p.text).join('\n') ||
    resp?.candidates?.[0]?.content?.parts?.[0]?.text ||
    '';

  const parsed = safeJsonExtract(text);
  if (!parsed || typeof parsed !== 'object') {
    return { available: true, implemented: true, module, error: 'Gemini returned non-JSON output', raw: text.slice(0, 500) };
  }

  return {
    available: true,
    implemented: true,
    module,
    suggestedMapping: parsed.mapping || {},
    confidence: typeof parsed.confidence === 'number' ? parsed.confidence : null,
  };
}

module.exports = { suggestGeminiMapping };
