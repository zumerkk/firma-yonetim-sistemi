/**
 * 📸 Screenshot Analyzer Service - v3.1 (Free-Only Multi-Provider + High Accuracy)
 * 
 * ETUYS/DYS devlet portalı ekran görüntülerinden teşvik belgesi verilerini
 * tamamen ücretsiz AI API'ler ile otomatik çıkarır.
 * 
 * v3.1: Doğruluk artırıldı (Tab tespiti ve veri çıkarma tekrar 2 aşamalı hale getirildi).
 */

const https = require('https');
const ScreenshotJob = require('../models/ScreenshotJob');

// ─── Tab Tipi Sabitleri ─────────────────────────────────────────
const TAB_TYPES = {
  BELGE_KUNYE: 'belge_kunye',
  YATIRIM_CINSI: 'yatirim_cinsi',
  URUN_BILGILERI: 'urun_bilgileri',
  YERLI_LISTE: 'yerli_liste',
  ITHAL_LISTE: 'ithal_liste',
  FINANSAL_BILGILER: 'finansal_bilgiler',
  OZEL_SARTLAR: 'ozel_sartlar',
  OZEL_SART_DETAY: 'ozel_sart_detay',
  DESTEK_UNSURLARI: 'destek_unsurlari',
  PROJE_TANITIMI: 'proje_tanitimi',
  EVRAK_LISTESI: 'evrak_listesi',
  UNKNOWN: 'unknown',
};

// ─── Rate Limiter ───────────────────────────────────────────────
class RateLimiter {
  constructor() {
    this.counters = {};
  }
  _getKey(providerId) {
    if (!this.counters[providerId]) this.counters[providerId] = { rpm: [], rpd: 0, rpdDate: '' };
    const today = new Date().toISOString().slice(0, 10);
    if (this.counters[providerId].rpdDate !== today) {
      this.counters[providerId].rpd = 0;
      this.counters[providerId].rpdDate = today;
    }
    return this.counters[providerId];
  }
  canRequest(providerId, maxRpm, maxRpd) {
    const c = this._getKey(providerId);
    const now = Date.now();
    c.rpm = c.rpm.filter(t => now - t < 60000);
    return c.rpm.length < maxRpm && c.rpd < maxRpd;
  }
  record(providerId) {
    const c = this._getKey(providerId);
    c.rpm.push(Date.now());
    c.rpd++;
  }
  getStats() {
    const stats = {};
    for (const [id, c] of Object.entries(this.counters)) {
      stats[id] = { rpmUsed: c.rpm.filter(t => Date.now() - t < 60000).length, rpdUsed: c.rpd };
    }
    return stats;
  }
}
const rateLimiter = new RateLimiter();

// ─── HTTP Helpers ───────────────────────────────────────────────
function httpPost(url, body, headers = {}) {
  return new Promise((resolve, reject) => {
    const data = Buffer.from(JSON.stringify(body), 'utf-8');
    const u = new URL(url);
    const req = https.request({
      method: 'POST', hostname: u.hostname, path: u.pathname + u.search,
      headers: { 'Content-Type': 'application/json', 'Content-Length': data.length, ...headers },
      timeout: 120000,
    }, (res) => {
      let raw = '';
      res.setEncoding('utf8');
      res.on('data', chunk => raw += chunk);
      res.on('end', () => {
        if (res.statusCode >= 400) return reject(new Error(`HTTP ${res.statusCode}: ${raw.slice(0, 300)}`));
        try { resolve(JSON.parse(raw)); } catch (e) { reject(new Error(`JSON parse: ${e.message}`)); }
      });
    });
    req.on('error', reject);
    req.on('timeout', () => { req.destroy(); reject(new Error('API timeout')); });
    req.write(data);
    req.end();
  });
}

/**
 * 🛡️ Çok Katmanlı JSON Onarma — AI çıktılarındaki tipik bozulmaları toparlar:
 *  - BOM / sıfır-genişlik karakterler
 *  - Markdown kod çitleri (üç ters tırnak)
 *  - Tek-satır ve blok yorumları
 *  - Akıllı tırnaklar (smart quotes)
 *  - Sondaki virgüller (trailing commas)
 *  - Tırnaksız anahtarlar
 *  - String içinde escape edilmemiş newline / tab / kontrol karakterleri
 *  - max_tokens'ta KESİLMİŞ JSON (eksik tırnak/küme/dizi otomatik kapatılır)
 */
function safeJsonExtract(text) {
  if (!text || typeof text !== 'string') return null;

  // ─── 1) Temel temizlik ───────────────────────────────────────
  let cleaned = text
    .replace(/^\uFEFF/, '')                  // BOM
    .replace(/[\u200B-\u200D\u2060]/g, '')   // sıfır genişlik
    .replace(/[\u201C\u201D]/g, '"')         // akıllı çift tırnak
    .replace(/[\u2018\u2019]/g, "'")         // akıllı tek tırnak
    .trim();

  // Markdown kod çitlerini sök (her durumda)
  cleaned = cleaned
    .replace(/^```(?:json|JSON|javascript|js)?\s*\r?\n?/i, '')
    .replace(/\r?\n?\s*```\s*$/i, '')
    .replace(/```/g, '')
    .trim();

  // Bazı modeller başa "Here is the JSON:" gibi metin ekliyor → ilk { veya [ öncesini at
  // (extractBalanced zaten ilk açılış parantezini buluyor; ama önce direkt parse şansı verelim)

  const tryParse = (s) => { try { return JSON.parse(s); } catch { return null; } };

  // Direkt deneme
  let r = tryParse(cleaned);
  if (r !== null) return r;

  // ─── 2) Yorumları temizle ────────────────────────────────────
  // (string içindeki // veya /* */ değerlerini bozmamak için string-aware)
  cleaned = stripCommentsRespectingStrings(cleaned);

  r = tryParse(cleaned);
  if (r !== null) return r;

  // ─── 3) Dengelemeli (string-aware) JSON aralığı çıkar ────────
  const candidate = extractBalancedJson(cleaned);
  if (!candidate) return null;

  // ─── 4) Artan agresiflikte onarım stratejileri ───────────────
  const strategies = [
    (s) => s,
    (s) => s.replace(/,\s*([}\]])/g, '$1'),                         // trailing comma
    (s) => s.replace(/,\s*([}\]])/g, '$1')
            .replace(/([\{,]\s*)([A-Za-z_$][\w$]*)\s*:/g, '$1"$2":'), // tırnaksız key
    (s) => escapeControlsInsideStrings(s.replace(/,\s*([}\]])/g, '$1')),
    (s) => escapeControlsInsideStrings(
             s.replace(/,\s*([}\]])/g, '$1')
              .replace(/([\{,]\s*)([A-Za-z_$][\w$]*)\s*:/g, '$1"$2":')
           ),
  ];

  for (const fix of strategies) {
    try {
      const repaired = fix(candidate);
      const parsed = JSON.parse(repaired);
      return parsed;
    } catch { /* sıradakini dene */ }
  }

  return null;
}

// Yardımcı: string içeriğini koruyarak yorumları çıkarır
function stripCommentsRespectingStrings(input) {
  let out = '';
  let i = 0, inStr = false, strCh = '"', esc = false;
  while (i < input.length) {
    const c = input[i];
    if (inStr) {
      out += c;
      if (esc) esc = false;
      else if (c === '\\') esc = true;
      else if (c === strCh) inStr = false;
      i++;
      continue;
    }
    if (c === '"' || c === "'") { inStr = true; strCh = c; out += c; i++; continue; }
    if (c === '/' && input[i + 1] === '/') {
      while (i < input.length && input[i] !== '\n') i++;
      continue;
    }
    if (c === '/' && input[i + 1] === '*') {
      i += 2;
      while (i < input.length && !(input[i] === '*' && input[i + 1] === '/')) i++;
      i += 2;
      continue;
    }
    out += c;
    i++;
  }
  return out;
}

// Yardımcı: ilk { veya [ ile başlayan dengeli JSON bloğunu çıkarır.
// Truncation varsa eksik kapanışları otomatik tamamlar.
function extractBalancedJson(input) {
  const a = input.indexOf('{');
  const b = input.indexOf('[');
  let start;
  if (a === -1 && b === -1) return null;
  else if (a === -1) start = b;
  else if (b === -1) start = a;
  else start = Math.min(a, b);

  const stack = [];
  let inStr = false, esc = false;
  let end = -1;

  for (let i = start; i < input.length; i++) {
    const c = input[i];
    if (esc) { esc = false; continue; }
    if (c === '\\') { esc = true; continue; }
    if (c === '"') { inStr = !inStr; continue; }
    if (inStr) continue;

    if (c === '{' || c === '[') stack.push(c);
    else if (c === '}' || c === ']') {
      stack.pop();
      if (stack.length === 0) { end = i; break; }
    }
  }

  if (end !== -1) return input.substring(start, end + 1);

  // ─── Truncation onarımı: kalan açık parantezleri otomatik kapat ───
  let repaired = input.substring(start);
  // Yarım kalmış string varsa kapat (son virgülü/tırnağı temizle)
  if (inStr) {
    // Eksik string'i sonlandır; sondaki kısmi içeriği ":null" gibi düşürmeyelim,
    // mevcut kısmi değeri olduğu gibi bırakıp kapatalım.
    repaired += '"';
  }
  // Sondaki yarım kalan ", veya : işaretlerini at
  repaired = repaired.replace(/[,:\s]+$/, '');
  // Kalan parantezleri kapat (LIFO)
  for (let i = stack.length - 1; i >= 0; i--) {
    repaired += stack[i] === '{' ? '}' : ']';
  }
  return repaired;
}

// Yardımcı: string DEĞERLERİ içindeki ham \n \r \t ve diğer kontrol karakterlerini escape eder
function escapeControlsInsideStrings(input) {
  let out = '';
  let inStr = false, esc = false;
  for (const c of input) {
    if (esc) { out += c; esc = false; continue; }
    if (c === '\\') { out += c; esc = true; continue; }
    if (c === '"') { out += c; inStr = !inStr; continue; }
    if (inStr) {
      const code = c.charCodeAt(0);
      if (c === '\n') out += '\\n';
      else if (c === '\r') out += '\\r';
      else if (c === '\t') out += '\\t';
      else if (code < 0x20) { /* diğer kontrol karakterlerini düşür */ }
      else out += c;
    } else {
      out += c;
    }
  }
  return out;
}

// ─── Tab-Specific AI Prompt Şablonları (Yüksek Doğruluk) ────────

const PROMPTS = {
  // Genel: Tab tespiti
  DETECT_TAB: `Bu ekran görüntüsü bir devlet teşvik portalından (ETUYS/DYS) alınmıştır. 
Lütfen ekrandaki aktif sekmeyi (üst menüdeki seçili butonları) veya açılmış olan popup pencerelerin başlıklarını çok dikkatli inceleyerek ne olduğunu tespit et.

İPUÇLARI:
- Eğer ekranın ortasında küçük bir popup/modal pencere varsa ve başlığı "Özel Şart Görüntüleme" ise → "ozel_sart_detay"
- Menü çubuğunda mavi (seçili) olan sekmeye veya direkt olarak büyük tablo başlıklarına bak.

GEÇERLİ KATEGORİLER (LÜTFEN SADECE AŞAĞIDAKİ DEĞERLERDEN BİRİNİ SEÇ):
- "belge_kunye": Belge Künye Bilgileri (Firma adı, SGK no, yatırım konusu vb. form)
- "yatirim_cinsi": Yatırım Cinsi (KOMPLE YENİ YATIRIM, TEVSİ, MODERNİZASYON kelimelerini içeren tablo)
- "urun_bilgileri": Ürün Bilgileri (Ürün kodu US-97/Nace6, Kapasite tablosu)
- "yerli_liste": Yerli Liste (Yerli makine/teçhizat listesi)
- "ithal_liste": İthal Liste (İthal makine/teçhizat listesi, $ işareti bulunur)
- "finansal_bilgiler": Finansal Bilgiler (Arazi, bina, toplam finansman değerleri)
- "ozel_sartlar": Özel Şartlar (Özel şartlar listesi tablosu)
- "destek_unsurlari": Destek Unsurları (Destek adı ve oranı listesi)
- "proje_tanitimi": Proje Tanıtımı (Düz açıklama metni)
- "evrak_listesi": Evrak Listesi (Belgelerin durumu listesi)
- "unknown": Görüntü çok bulanıksa veya bunlardan hiçbirine benzemiyorsa

SADECE JSON OLARAK YANIT VER:
{"tabType": "gecerli_kategori_adi", "confidence": 1.0}`,

  // Tab 1: Belge Künye Bilgileri
  [TAB_TYPES.BELGE_KUNYE]: `Bu ekran görüntüsü bir ETUYS/DYS teşvik belgesi portalının "Belge Künye Bilgileri" sekmesini göstermektedir.
Lütfen görüntüdeki TÜM alanları dikkatlice oku ve aşağıdaki JSON yapısında döndür. Boş veya okunamayan alanlar için null kullan.
{
  "firmaAdi": "string",
  "sgkSicilNo": "string|null",
  "sermayeTuru": "string",
  "yatirimKonusu": "string",
  "kararnameNo": "string",
  "il": "string",
  "ilce": "string",
  "adres": "string|null",
  "osbAdi": "string|null",
  "sbAdi": "string|null",
  "ilBazliBolge": "string",
  "ilceBazliBolge": "string|null",
  "mevcutIstihdam": 0,
  "ilaveIstihdam": 0,
  "belgeId": "string",
  "belgeNo": "string",
  "belgeTarihi": "string (DD/MM/YYYY)",
  "muracaatTarihi": "string (DD/MM/YYYY)|null",
  "muracaatSayisi": "string|null",
  "belgeBaslamaTarihi": "string (DD/MM/YYYY)|null",
  "belgeBitisTarihi": "string (DD/MM/YYYY)|null",
  "sureUzatimTarihi": "string (DD/MM/YYYY)|null",
  "oecdKategori": "string|null",
  "destekSinifi": "string",
  "oncelikliYatirim": "string|null",
  "buyukOlcekli": "string|null",
  "cazibeMerkezliMi": "EVET/HAYIR",
  "savunmaSanayiProjesi": "EVET/HAYIR|null",
  "ada": "string|null",
  "parsel": "string|null",
  "belgeMuracaatTalepTipi": "string",
  "enerjiUretimKaynagi": "string|null",
  "cazibeMerkezi2018": "EVET/HAYIR|null",
  "cazibeMerkeziDeprem": "EVET/HAYIR|null",
  "hamleMi": "EVET/HAYIR",
  "vergiIndirimsizDestek": "EVET/HAYIR",
  "belgeFormati": "eski|yeni"
}

BELGE FORMATI KURALLARI:
- "Yatırımın Konusu(US97):" varsa → "eski"
- "Yatırımın Konusu(Nace):" varsa → "yeni"
- Kod 4 hane başlıyorsa (2929) → "eski"
- Kod 2 hane.2 hane başlıyorsa (22.26) → "yeni"
Sadece JSON döndür.`,

  // Tab 2: Yatırım Cinsi
  [TAB_TYPES.YATIRIM_CINSI]: `Bu ekran görüntüsü ETUYS/DYS portalının "Yatırım Cinsi" sekmesidir.
DİKKAT: Sadece yatırım cinsinin KENDİSİNİ yazın (Örn: "TEVSİ", "KOMPLE YENİ YATIRIM", "MODERNİZASYON"). "Yatırım Cinsi," veya benzeri başlık/etiket metinlerini dahil ETMEYİN. Ekranda "Yatırım Cinsi, TEVSİ" yazıyorsa sadece "TEVSİ" alın.
Yanıt formatı (sadece JSON):
{"yatirimCinsleri": ["string"]}`,

  // Tab 3: Ürün Bilgileri
  [TAB_TYPES.URUN_BILGILERI]: `Bu ekran görüntüsü ETUYS/DYS portalının "Ürün Bilgileri" sekmesidir.
Yanıt formatı (sadece JSON):
{
  "kodTipi": "US97|NACE6",
  "urunler": [
    {
      "urunKodu": "string",
      "urunAdi": "string",
      "mevcutKapasite": number,
      "ilaveKapasite": number,
      "toplamKapasite": number,
      "birim": "string"
    }
  ]
}`,

  // Tab 4: Yerli Liste
  [TAB_TYPES.YERLI_LISTE]: `Bu ekran görüntüsü "Yerli Liste" sekmesidir.
Yanıt formatı (sadece JSON):
{
  "yerliMakineler": [
    {
      "siraNo": number,
      "makineCinsi": "string",
      "adedi": number,
      "tutarTL": number,
      "aciklama": "string|null"
    }
  ]
}
ÖNEMLI: Türk sayı formatı: 1.250.000 = 1250000`,

  // Tab 5: İthal Liste
  [TAB_TYPES.ITHAL_LISTE]: `Bu ekran görüntüsü "İthal Liste" sekmesidir.
Yanıt formatı (sadece JSON):
{
  "ithalMakineler": [
    {
      "siraNo": number,
      "makineCinsi": "string",
      "adedi": number,
      "tutarDolar": number,
      "tutarTL": number|null,
      "menseUlke": "string|null",
      "yeniKullanilmis": "string|null",
      "aciklama": "string|null"
    }
  ]
}`,

  // Tab 6: Finansal Bilgiler
  [TAB_TYPES.FINANSAL_BILGILER]: `Bu ekran görüntüsü "Finansal Bilgiler" sekmesidir.
Yanıt formatı (sadece JSON):
{
  "araziArsaBedeli": {"aciklama": "string|null", "metrekare": number|null, "birimFiyat": number|null, "toplam": number},
  "binaInsaatGiderleri": {"aciklama": "string|null", "anaBina": number, "yardimciBina": number, "idareBinalari": number, "toplam": number},
  "digerYatirimHarcamalari": {"yardimciIsletmeMakine": number, "ithalatGumrukleme": number, "tasimaSigorta": number, "montaj": number, "etudProje": number, "faizKarPayi": number|null, "kurFarki": number|null, "maddiOlmayanVarlik": number|null, "digerGiderler": number, "toplam": number},
  "toplamSabitYatirimTutari": number,
  "makinaTechizatGiderleri": {"ithal": number, "yerli": number, "toplamMakine": number},
  "ithalMakineDolar": {"yeniMakine": number, "kullanilmisMakine": number, "toplam": number},
  "yabanciKaynaklar": {"toplamYabanciKaynak": number},
  "ozkaynaklar": {"ozkaynakToplam": number},
  "toplamFinansman": number
}`,

  // Tab 7: Özel Şartlar
  [TAB_TYPES.OZEL_SARTLAR]: `Bu ekran görüntüsü "Özel Şartlar" sekmesidir.
DİKKAT: Tabloyu tam olarak ekranda gördüğün gibi satır satır JSON'a çevir. 
Sol kolondaki metni "sartAdi", sağ kolondaki metni "sartAciklamasi" yap. 
Kesinlikle satırları kendi kendine BİRLEŞTİRMEYE ÇALIŞMA! Eğer sol kolonda "Açıklama" yazıyorsa sartAdi olarak "Açıklama" yaz ve geç. Bizim sistemimiz onları arka planda düzeltecektir.
Yanıt formatı (sadece JSON):
{
  "ozelSartlar": [
    {"sartAdi": "string", "sartAciklamasi": "string"}
  ]
}`,

  // Tab 7b: Özel Şart Detay
  [TAB_TYPES.OZEL_SART_DETAY]: `Bu ekran görüntüsü "Özel Şart Görüntüleme" popup penceresidir. Açıklamayı TAM OLARAK oku.
Yanıt formatı (sadece JSON):
{
  "ozelSartDetay": {"sartAdi": "string", "sartAciklamasi": "string"}
}`,

  // Tab 8: Destek Unsurları
  [TAB_TYPES.DESTEK_UNSURLARI]: `Bu ekran görüntüsü "Destek Unsurları" sekmesidir.
Yanıt formatı (sadece JSON):
{
  "destekUnsurlari": [
    {"destekUnsuru": "string", "destekOrani": "string"}
  ]
}`,

  // Tab 9: Proje Tanıtımı
  [TAB_TYPES.PROJE_TANITIMI]: `Bu ekran görüntüsü "Proje Tanıtımı" sekmesidir.
Yanıt formatı (sadece JSON):
{"projeTanitimi": "string"}`,

  // Tab 10: Evrak Listesi
  [TAB_TYPES.EVRAK_LISTESI]: `Bu ekran görüntüsü "Evrak Listesi" sekmesidir.
Yanıt formatı (sadece JSON):
{
  "evrakListesi": [
    {"evrakAdi": "string", "evrakTarihi": "string|null", "evrakDurumu": "string|null", "aciklama": "string|null"}
  ]
}`,
};

// ─── Free-Only Provider Engine ──────────────────────────────────

// 🔧 Gemini key sağlık takibi — ardışık 429 alan key'leri geçici devre dışı bırak
const keyHealth = {}; // { keyHash: { failures: 0, disabledUntil: 0 } }
function isKeyHealthy(apiKey) {
  const h = keyHealth[apiKey.slice(-6)];
  if (!h) return true;
  if (h.disabledUntil && Date.now() < h.disabledUntil) return false;
  return true;
}
function markKeyFailure(apiKey) {
  const k = apiKey.slice(-6);
  if (!keyHealth[k]) keyHealth[k] = { failures: 0, disabledUntil: 0 };
  keyHealth[k].failures++;
  // 🔧 Daha akıllı: 5 ardışık 429 → 2dk devre dışı
  // (Önceki 3/10dk değeri batch işlerde keyleri çok hızlı disable ediyordu;
  //  Gemini RPM penceresi 1dk olduğundan 2dk yeterli ve 5 görsel sonrası
  //  diğer keylere geçişi sağlıyor.)
  if (keyHealth[k].failures >= 5) {
    keyHealth[k].disabledUntil = Date.now() + 2 * 60 * 1000;
    console.log(`  🚫 Gemini key [${k}] 2dk devre dışı (ardışık ${keyHealth[k].failures} hata)`);
  }
}
function markKeySuccess(apiKey) {
  const k = apiKey.slice(-6);
  if (keyHealth[k]) { keyHealth[k].failures = 0; keyHealth[k].disabledUntil = 0; }
}

function getGeminiKeys() {
  return [
    process.env.GEMINI_API_KEY_1 || process.env.GEMINI_API_KEY,
    process.env.GEMINI_API_KEY_2,
    process.env.GEMINI_API_KEY_3,
    process.env.GEMINI_API_KEY_4,
    process.env.GEMINI_API_KEY_5
  ].filter(Boolean);
}

async function callGemini(imageBuffer, prompt, mimeType, model, apiKey) {
  // Sağlıksız key'i atla
  if (!isKeyHealthy(apiKey)) return null;
  
  const providerId = `gemini-${model}-${apiKey.slice(-6)}`;
  const limits = model.includes('lite') ? { rpm: 15, rpd: 1000 } : { rpm: 10, rpd: 250 };
  
  if (!rateLimiter.canRequest(providerId, limits.rpm, limits.rpd)) return null;

  const base64 = imageBuffer.toString('base64');
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(apiKey)}`;
  
  try {
    const resp = await httpPost(url, {
      contents: [{ role: 'user', parts: [
        { inlineData: { mimeType, data: base64 } },
        { text: prompt },
      ]}],
      generationConfig: { temperature: 0.1, maxOutputTokens: 8192, responseMimeType: 'application/json' },
    });
    
    rateLimiter.record(providerId);
    markKeySuccess(apiKey);
    const candidate = resp?.candidates?.[0];
    const text = candidate?.content?.parts?.map(p => p.text).join('\n') || '';
    const finishReason = candidate?.finishReason || 'UNKNOWN';

    // 🆕 Boş yanıt = ayrı hata tipi (SAFETY filter, MAX_TOKENS, RECITATION, vs.)
    // Bu durum genelde retry ile düzelmez ama net loglayalım ki müşteriye sebep söyleyebilelim.
    if (!text || text.trim().length === 0) {
      const promptFeedback = resp?.promptFeedback?.blockReason || '';
      const detail = promptFeedback ? `prompt blocked: ${promptFeedback}` : `finishReason: ${finishReason}`;
      throw new Error(`Gemini boş yanıt (${detail})`);
    }

    const parsed = safeJsonExtract(text);
    return { raw: text, parsed, success: !!parsed, provider: providerId, finishReason };
  } catch (err) {
    if (err.message.includes('429') || err.message.includes('403')) {
      markKeyFailure(apiKey);
    }
    throw err;
  }
}

async function callGroqWithKey(imageBuffer, prompt, mimeType, apiKey, keyIndex) {
  const providerId = `groq-llama4-${keyIndex}`;
  if (!rateLimiter.canRequest(providerId, 25, 800)) return null;

  const base64 = imageBuffer.toString('base64');
  const resp = await httpPost('https://api.groq.com/openai/v1/chat/completions', {
    model: 'meta-llama/llama-4-scout-17b-16e-instruct',
    messages: [{ role: 'user', content: [
      { type: 'image_url', image_url: { url: `data:${mimeType};base64,${base64}` } },
      { type: 'text', text: prompt + '\n\nÖNEMLİ: SADECE JSON YANITI VER.' },
    ]}],
    temperature: 0.1, max_tokens: 8192, response_format: { type: 'json_object' },
  }, { Authorization: `Bearer ${apiKey}` });
  
  rateLimiter.record(providerId);
  const text = resp?.choices?.[0]?.message?.content || '';
  const parsed = safeJsonExtract(text);
  return { raw: text, parsed, success: !!parsed, provider: providerId };
}

function getGroqKeys() {
  return [
    process.env.GROQ_API_KEY,
    process.env.GROQ_API_KEY_1,
    process.env.GROQ_API_KEY_2,
    process.env.GROQ_API_KEY_3
  ].filter(Boolean);
}

// 🆕 OpenRouter — Ücretsiz vision modelleri her zaman çalışır (API key ile)
async function callOpenRouter(imageBuffer, prompt, mimeType) {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) return null;
  
  const providerId = 'openrouter-gemma4';
  if (!rateLimiter.canRequest(providerId, 20, 500)) return null;

  const base64 = imageBuffer.toString('base64');
  
  // Önce Gemma-4 Vision, olmazsa Nemotron
  const models = [
    'google/gemma-4-26b-a4b-it:free',
    'nvidia/nemotron-nano-12b-v2-vl:free'
  ];
  
  for (const model of models) {
    try {
      const resp = await httpPost('https://openrouter.ai/api/v1/chat/completions', {
        model,
        messages: [{ role: 'user', content: [
          { type: 'image_url', image_url: { url: `data:${mimeType};base64,${base64}` } },
          { type: 'text', text: prompt + '\n\nÖNEMLİ: SADECE JSON YANITI VER.' },
        ]}],
        temperature: 0.1, max_tokens: 8192,
      }, { 
        Authorization: `Bearer ${apiKey}`,
        'HTTP-Referer': 'https://cahit-firma-frontend.onrender.com',
        'X-Title': 'GM Planlama Tesvik Sistemi'
      });
      
      rateLimiter.record(providerId);
      const text = resp?.choices?.[0]?.message?.content || '';
      const parsed = safeJsonExtract(text);
      if (parsed) return { raw: text, parsed, success: true, provider: `openrouter-${model.split('/')[1].slice(0,10)}` };
    } catch (err) {
      console.log(`  ⚠️ OpenRouter ${model} hata: ${err.message.slice(0, 80)}`);
      continue;
    }
  }
  return { raw: '', parsed: null, success: false, provider: providerId };
}

async function callVisionAPI(imageBuffer, prompt, mimeType = 'image/png') {
  const geminiKeys = getGeminiKeys();
  const groqKeys = getGroqKeys();
  const providers = [];
  
  // ─── KATMAN 1: Gemini Flash-Lite (en hızlı, en yüksek kota) ───
  for (const key of geminiKeys) {
    providers.push({ name: `Gemini Flash-Lite [${key.slice(-4)}]`, fn: () => callGemini(imageBuffer, prompt, mimeType, 'gemini-2.5-flash-lite', key), retries: 2, delay: 1500 });
  }
  
  // ─── KATMAN 2: Groq (her key ayrı rate limit → 3 key = 3x kapasite) ───
  groqKeys.forEach((key, i) => {
    providers.push({ name: `Groq Llama-4 [Key ${i + 1}]`, fn: () => callGroqWithKey(imageBuffer, prompt, mimeType, key, i + 1), retries: 1, delay: 2000 });
  });
  
  // ─── KATMAN 3: Gemini Flash (daha güçlü model, daha düşük kota) ───
  for (const key of geminiKeys) {
    providers.push({ name: `Gemini Flash [${key.slice(-4)}]`, fn: () => callGemini(imageBuffer, prompt, mimeType, 'gemini-2.5-flash', key), retries: 2, delay: 2500 });
  }
  
  // ─── KATMAN 4: OpenRouter (garanti son çare, her zaman çalışır) ───
  if (process.env.OPENROUTER_API_KEY) {
    providers.push({ name: 'OpenRouter Vision', fn: () => callOpenRouter(imageBuffer, prompt, mimeType), retries: 2, delay: 3000 });
  }

  console.log(`  📊 Toplam ${providers.length} provider hazır (${geminiKeys.length} Gemini + ${groqKeys.length} Groq + ${process.env.OPENROUTER_API_KEY ? '1 OpenRouter' : '0 OpenRouter'})`);

  let lastError = 'Bilinmeyen Hata';
  let lastRawPreview = '';
  for (const provider of providers) {
    for (let attempt = 1; attempt <= provider.retries; attempt++) {
      try {
        console.log(`  🔄 ${provider.name} deneniyor... (deneme ${attempt})`);
        const result = await provider.fn();
        if (result === null) { console.log(`  ⏭️ ${provider.name} atlandı (rate limit / key yok / sağlıksız)`); break; }
        if (result?.success) { console.log(`  ✅ ${provider.name} başarılı!`); return result; }
        lastError = 'JSON parse edilemedi';
        lastRawPreview = (result?.raw || '').slice(0, 200);
        console.log(`  ⚠️ ${provider.name} JSON parse başarısız. RAW:`, (result?.raw || '').slice(0, 500));
      } catch (err) {
        lastError = err.message;
        const msg = err.message;
        console.log(`  ❌ ${provider.name} hata: ${msg.slice(0, 140)}`);

        // 🆕 Boş yanıt (SAFETY/MAX_TOKENS) — aynı key ile retry mantıklı değil,
        //    sıradaki provider'a geç (farklı model deneyelim).
        if (msg.includes('Gemini boş yanıt')) break;

        // 400/403/404/429 → kalıcı sorun (key/quota), sonraki provider'a geç
        if (msg.includes('400') || msg.includes('403') ||
            msg.includes('404') || msg.includes('429')) break;

        // 503 (overloaded) — aynı provider'da retry değerli, server tarafı geçici
        // diğer hatalar — exponential backoff ile retry
        if (attempt < provider.retries) await new Promise(r => setTimeout(r, provider.delay * attempt));
      }
    }
  }
  // Tüm provider'lar başarısız → kullanıcıya anlamlı sebep döndür
  let detail = lastError;
  if (lastError.includes('Gemini boş yanıt')) {
    detail = 'AI modeli görselden veri çıkaramadı (görsel kalitesi düşük veya içerik filtrelendi). Görseli yeniden çekip deneyin.';
  } else if (lastError === 'JSON parse edilemedi' && lastRawPreview) {
    detail = `${lastError} | Son yanıt önizleme: ${lastRawPreview.replace(/\s+/g, ' ').slice(0, 100)}`;
  } else if (lastError.includes('429')) {
    detail = 'Tüm AI sağlayıcıları geçici olarak limit aşımında. 1-2 dakika bekleyip yeniden deneyin.';
  }
  throw new Error(`API Hatası: ${detail.slice(0, 250)}`);
}

// ─── High-Level Analysis Functions ──────────────────────────────

async function detectTabType(imageBuffer, mimeType) {
  try {
    const result = await callVisionAPI(imageBuffer, PROMPTS.DETECT_TAB, mimeType);
    if (result.parsed?.tabType) {
      return { tabType: result.parsed.tabType, confidence: result.parsed.confidence || 0.5 };
    }
  } catch (err) {}
  return { tabType: TAB_TYPES.UNKNOWN, confidence: 0 };
}

async function extractTabData(imageBuffer, tabType, mimeType) {
  const prompt = PROMPTS[tabType];
  if (!prompt) return { success: false, error: 'Bilinmeyen tab', data: null };
  const result = await callVisionAPI(imageBuffer, prompt, mimeType);
  return { success: result.success, tabType, data: result.parsed, rawResponse: result.raw?.slice(0, 300), provider: result.provider };
}

async function analyzeScreenshot(imageBuffer, mimeType = 'image/png', tabHint = null) {
  if (tabHint && PROMPTS[tabHint]) {
    const data = await extractTabData(imageBuffer, tabHint, mimeType);
    return { ...data, detectedTab: tabHint, confidence: 1.0 };
  }

  const detection = await detectTabType(imageBuffer, mimeType);
  if (detection.tabType === TAB_TYPES.UNKNOWN) {
    return { success: false, detectedTab: TAB_TYPES.UNKNOWN, confidence: 0, error: 'Tab tipi algılanamadı', data: null };
  }

  // Rate Limit koruması için kısa delay
  await new Promise(r => setTimeout(r, 1000));
  
  const data = await extractTabData(imageBuffer, detection.tabType, mimeType);
  return { ...data, detectedTab: detection.tabType, confidence: detection.confidence };
}

async function analyzeMultipleScreenshots(images, jobId = null) {
  const results = [];
  const errors = [];
  const providerStats = {};

  for (let i = 0; i < images.length; i++) {
    const { buffer, mimeType, originalName } = images[i];
    try {
      console.log(`📸 [${i + 1}/${images.length}] Analiz ediliyor: ${originalName}`);
      const result = await analyzeScreenshot(buffer, mimeType || 'image/png');
      results.push({ index: i, filename: originalName, ...result });
      
      if (result.provider) providerStats[result.provider] = (providerStats[result.provider] || 0) + 1;
      console.log(`  ✅ Tab: ${result.detectedTab} (${Math.round((result.confidence || 0) * 100)}%)`);
      
      if (jobId) {
        const progress = Math.round(((i + 1) / images.length) * 100);
        await ScreenshotJob.findByIdAndUpdate(jobId, { processedImages: i + 1, progress }).catch(() => {});
      }
      
      if (i < images.length - 1) await new Promise(r => setTimeout(r, 3000));
    } catch (err) {
      console.error(`  ❌ Hata: ${err.message}`);
      errors.push({ index: i, filename: originalName, error: err.message });
    }
  }

  const merged = mergeResults(results);
  return { screenshots: results, errors, merged, belgeFormati: merged.belgeFormati || 'eski', totalAnalyzed: results.length, totalErrors: errors.length, providerStats, rateLimiterStats: rateLimiter.getStats() };
}

// ─── Merge Results ──────────────────────────────────────────────

function mergeResults(results) {
  const merged = {
    firmaAdi: null, sgkSicilNo: null, sermayeTuru: null, yatirimKonusu: null,
    kararnameNo: null, il: null, ilce: null, adres: null, osbAdi: null,
    ilBazliBolge: null, ilceBazliBolge: null, mevcutIstihdam: 0, ilaveIstihdam: 0,
    belgeId: null, belgeNo: null, belgeTarihi: null, muracaatTarihi: null,
    muracaatSayisi: null, belgeBaslamaTarihi: null, belgeBitisTarihi: null,
    sureUzatimTarihi: null, destekSinifi: null, oecdKategori: null,
    oncelikliYatirim: null, buyukOlcekli: null, cazibeMerkezliMi: null,
    savunmaSanayiProjesi: null, ada: null, parsel: null, hamleMi: null,
    vergiIndirimsizDestek: null, belgeMuracaatTalepTipi: null,
    enerjiUretimKaynagi: null, cazibeMerkezi2018: null, cazibeMerkeziDeprem: null,
    belgeFormati: 'eski',
    yatirimCinsleri: [], kodTipi: null, urunler: [],
    yerliMakineler: [], ithalMakineler: [],
    finansal: null, ozelSartlar: [], destekUnsurlari: [],
    projeTanitimi: null, evrakListesi: [],
  };

  for (const result of results) {
    if (!result.success || !result.data) continue;

    switch (result.detectedTab) {
      case TAB_TYPES.BELGE_KUNYE: Object.assign(merged, result.data); break;
      case TAB_TYPES.YATIRIM_CINSI:
        if (result.data.yatirimCinsleri) {
          merged.yatirimCinsleri = result.data.yatirimCinsleri.map(c => c.replace(/^Yatırım Cinsi[,\:\s]*/i, '').trim());
        }
        break;
      case TAB_TYPES.URUN_BILGILERI: if (result.data.urunler) { merged.urunler = result.data.urunler; merged.kodTipi = result.data.kodTipi || null; } break;
      case TAB_TYPES.YERLI_LISTE: if (result.data.yerliMakineler) merged.yerliMakineler = result.data.yerliMakineler; break;
      case TAB_TYPES.ITHAL_LISTE: if (result.data.ithalMakineler) merged.ithalMakineler = result.data.ithalMakineler; break;
      case TAB_TYPES.FINANSAL_BILGILER: merged.finansal = result.data; break;
      case TAB_TYPES.OZEL_SARTLAR:
        if (result.data.ozelSartlar) {
          const cleanedSartlar = [];
          for (const current of result.data.ozelSartlar) {
            let name = (current.sartAdi || '').trim().toUpperCase();
            name = name.replace(/[:]/g, '').trim(); // Temizlik
            
            if (name === 'AÇIKLAMA' || name === 'ACIKLAMA') {
              if (cleanedSartlar.length > 0) {
                const prev = cleanedSartlar[cleanedSartlar.length - 1];
                const prevNameUpper = (prev.sartAdi || '').trim().toUpperCase().replace(/[:]/g, '');
                
                // Eğer bir önceki şartın adı "Özel Şart" ise, aslında "sartAciklamasi" alanındaki metin gerçek şart adıdır.
                // Çünkü ETUYS tablosu [Özel Şart] | [BÖL - SGK NO] şeklinde gösteriyor.
                if (prevNameUpper === 'ÖZEL ŞART' || prevNameUpper === 'OZEL SART') {
                  prev.sartAdi = prev.sartAciklamasi || 'Özel Şart';
                  prev.sartAciklamasi = current.sartAciklamasi || '';
                } else {
                  prev.sartAciklamasi += '\n' + (current.sartAciklamasi || '');
                }
              }
            } else if (name) {
              cleanedSartlar.push(current);
            }
          }
          
          // Son bir kontrol: Eğer hala adı "Özel Şart" olan kaldıysa ve açıklaması newline içeriyorsa böl
          for (const s of cleanedSartlar) {
             const n = (s.sartAdi || '').trim().toUpperCase().replace(/[:]/g, '');
             if (n === 'ÖZEL ŞART' || n === 'OZEL SART') {
                 const parts = (s.sartAciklamasi || '').split('\n');
                 if (parts.length > 1) {
                     s.sartAdi = parts[0].trim();
                     s.sartAciklamasi = parts.slice(1).join('\n').trim();
                 }
             }
          }
          
          merged.ozelSartlar = [...merged.ozelSartlar, ...cleanedSartlar];
        }
        break;
      case TAB_TYPES.DESTEK_UNSURLARI:
        if (result.data.destekUnsurlari) {
          merged.destekUnsurlari = result.data.destekUnsurlari.filter(d => {
            let name = (d.destekUnsuru || '').trim().toUpperCase();
            if (!name) return false;
            
            const excludeKeywords = [
              'DESTEK UNSURLARI LİSTESİ', 
              'DESTEK UNSURLARI LISTESI', 
              'DESTEK UNSURU', 
              'DESTEK UNSURLARI ADI'
            ];
            
            for (const keyword of excludeKeywords) {
                if (name.includes(keyword)) return false;
            }
            
            return true;
          });
        }
        break;
      case TAB_TYPES.PROJE_TANITIMI: if (result.data.projeTanitimi) merged.projeTanitimi = result.data.projeTanitimi; break;
      case TAB_TYPES.EVRAK_LISTESI: if (result.data.evrakListesi) merged.evrakListesi = result.data.evrakListesi; break;
      case TAB_TYPES.OZEL_SART_DETAY:
        if (result.data.ozelSartDetay) {
          const detay = result.data.ozelSartDetay;
          const existing = merged.ozelSartlar.find(s => s.sartAdi && detay.sartAdi && s.sartAdi.includes(detay.sartAdi.slice(0, 15)) && !s._isUpdated);
          if (existing) { existing.sartAciklamasi = detay.sartAciklamasi; existing._isUpdated = true; }
          else merged.ozelSartlar.push({ sartAdi: detay.sartAdi, sartAciklamasi: detay.sartAciklamasi, _isUpdated: true });
        }
        break;
    }
  }

  if (merged.kodTipi === 'NACE6' || merged.belgeFormati === 'yeni') merged.belgeFormati = 'yeni';
  return merged;
}

module.exports = {
  TAB_TYPES, PROMPTS, analyzeScreenshot, analyzeMultipleScreenshots, detectTabType, extractTabData, mergeResults
};
