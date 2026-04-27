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

function safeJsonExtract(text) {
  const m = String(text || '').match(/\{[\s\S]*\}/);
  if (!m) return null;
  try { return JSON.parse(m[0]); } catch { return null; }
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
DİKKAT: Portal bazen bir şartı iki satıra böler. Örneğin sol tarafta "Özel Şart" sağda "Söz konusu belge...", hemen altındaki satırda sol tarafta "Açıklama" sağda "Bakanlıkça..." yazar. 
Kesinlikle "Açıklama" diye yeni bir şart uydurmayın! Eğer solda "Açıklama" yazıyorsa, bu bir önceki şartın devamı veya detayıdır, onu önceki şartın açıklaması ile birleştirin.
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

function getGeminiKeys() {
  return [
    process.env.GEMINI_API_KEY_1 || process.env.GEMINI_API_KEY,
    process.env.GEMINI_API_KEY_2,
    process.env.GEMINI_API_KEY_3
  ].filter(Boolean);
}

async function callGemini(imageBuffer, prompt, mimeType, model, apiKey) {
  const providerId = `gemini-${model}-${apiKey.slice(-6)}`;
  const limits = model.includes('lite') ? { rpm: 15, rpd: 1000 } : { rpm: 10, rpd: 250 };
  
  if (!rateLimiter.canRequest(providerId, limits.rpm, limits.rpd)) return null;

  const base64 = imageBuffer.toString('base64');
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(apiKey)}`;
  
  const resp = await httpPost(url, {
    contents: [{ role: 'user', parts: [
      { inlineData: { mimeType, data: base64 } },
      { text: prompt },
    ]}],
    generationConfig: { temperature: 0.1, maxOutputTokens: 4096, responseMimeType: 'application/json' },
  });
  
  rateLimiter.record(providerId);
  const text = resp?.candidates?.[0]?.content?.parts?.map(p => p.text).join('\n') || '';
  const parsed = safeJsonExtract(text);
  return { raw: text, parsed, success: !!parsed, provider: providerId };
}

async function callGroq(imageBuffer, prompt, mimeType) {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) return null;
  
  const providerId = 'groq-llama4-scout';
  if (!rateLimiter.canRequest(providerId, 30, 1000)) return null;

  const base64 = imageBuffer.toString('base64');
  const resp = await httpPost('https://api.groq.com/openai/v1/chat/completions', {
    model: 'meta-llama/llama-4-scout-17b-16e-instruct',
    messages: [{ role: 'user', content: [
      { type: 'image_url', image_url: { url: `data:${mimeType};base64,${base64}` } },
      { type: 'text', text: prompt + '\n\nÖNEMLİ: SADECE JSON YANITI VER.' },
    ]}],
    temperature: 0.1, max_tokens: 4096, response_format: { type: 'json_object' },
  }, { Authorization: `Bearer ${apiKey}` });
  
  rateLimiter.record(providerId);
  const text = resp?.choices?.[0]?.message?.content || '';
  const parsed = safeJsonExtract(text);
  return { raw: text, parsed, success: !!parsed, provider: providerId };
}

async function callHuggingFace(imageBuffer, prompt, mimeType) {
  const apiKey = process.env.HUGGINGFACE_API_KEY;
  if (!apiKey) return null;
  
  const providerId = 'hf-qwen2.5-vl';
  if (!rateLimiter.canRequest(providerId, 8, 300)) return null;

  const base64 = imageBuffer.toString('base64');
  const resp = await httpPost('https://router.huggingface.co/hf-inference/models/Qwen/Qwen2.5-VL-7B-Instruct/v1/chat/completions', {
    model: 'Qwen/Qwen2.5-VL-7B-Instruct',
    messages: [{ role: 'user', content: [
      { type: 'image_url', image_url: { url: `data:${mimeType};base64,${base64}` } },
      { type: 'text', text: prompt + '\n\nÖNEMLİ: SADECE JSON YANITI VER.' },
    ]}],
    temperature: 0.1, max_tokens: 4096,
  }, { Authorization: `Bearer ${apiKey}` });
  
  rateLimiter.record(providerId);
  const text = resp?.choices?.[0]?.message?.content || '';
  const parsed = safeJsonExtract(text);
  return { raw: text, parsed, success: !!parsed, provider: providerId };
}

async function callVisionAPI(imageBuffer, prompt, mimeType = 'image/png') {
  const geminiKeys = getGeminiKeys();
  const providers = [];
  
  for (const key of geminiKeys) {
    providers.push({ name: `Gemini Flash-Lite [${key.slice(-4)}]`, fn: () => callGemini(imageBuffer, prompt, mimeType, 'gemini-2.5-flash-lite', key), retries: 1, delay: 1500 });
  }
  for (const key of geminiKeys) {
    providers.push({ name: `Gemini Flash [${key.slice(-4)}]`, fn: () => callGemini(imageBuffer, prompt, mimeType, 'gemini-2.5-flash', key), retries: 1, delay: 2000 });
  }
  if (process.env.GROQ_API_KEY) providers.push({ name: 'Groq Llama 4', fn: () => callGroq(imageBuffer, prompt, mimeType), retries: 2, delay: 2000 });
  if (process.env.HUGGINGFACE_API_KEY) providers.push({ name: 'HuggingFace Qwen', fn: () => callHuggingFace(imageBuffer, prompt, mimeType), retries: 2, delay: 3000 });

  let lastError = 'Bilinmeyen Hata';
  for (const provider of providers) {
    for (let attempt = 1; attempt <= provider.retries; attempt++) {
      try {
        const result = await provider.fn();
        if (result === null) break;
        if (result?.success) return result;
        lastError = 'JSON parse edilemedi';
      } catch (err) {
        lastError = err.message;
        if (err.message.includes('404') || err.message.includes('503')) break;
        if (attempt < provider.retries) await new Promise(r => setTimeout(r, provider.delay * attempt));
      }
    }
  }
  throw new Error(`API Hatası: ${lastError.slice(0, 150)}`);
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
      case TAB_TYPES.YATIRIM_CINSI: if (result.data.yatirimCinsleri) merged.yatirimCinsleri = result.data.yatirimCinsleri; break;
      case TAB_TYPES.URUN_BILGILERI: if (result.data.urunler) { merged.urunler = result.data.urunler; merged.kodTipi = result.data.kodTipi || null; } break;
      case TAB_TYPES.YERLI_LISTE: if (result.data.yerliMakineler) merged.yerliMakineler = result.data.yerliMakineler; break;
      case TAB_TYPES.ITHAL_LISTE: if (result.data.ithalMakineler) merged.ithalMakineler = result.data.ithalMakineler; break;
      case TAB_TYPES.FINANSAL_BILGILER: merged.finansal = result.data; break;
      case TAB_TYPES.OZEL_SARTLAR: if (result.data.ozelSartlar) merged.ozelSartlar = [...merged.ozelSartlar, ...result.data.ozelSartlar]; break;
      case TAB_TYPES.DESTEK_UNSURLARI: if (result.data.destekUnsurlari) merged.destekUnsurlari = result.data.destekUnsurlari; break;
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
