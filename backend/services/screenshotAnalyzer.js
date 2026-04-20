/**
 * 📸 Screenshot Analyzer Service
 * 
 * Gemini Vision API kullanarak ETUYS/DYS devlet portalı ekran görüntülerinden
 * teşvik belgesi verilerini otomatik çıkarır.
 * 
 * Desteklenen Tab Türleri:
 * 1. Belge Künye Bilgileri
 * 2. Yatırım Cinsi
 * 3. Ürün Bilgileri
 * 4. Finansal Bilgiler
 * 5. Özel Şartlar
 * 6. Destek Unsurları
 */

const https = require('https');

// ─── Tab Tipi Sabitleri ─────────────────────────────────────────
const TAB_TYPES = {
  BELGE_KUNYE: 'belge_kunye',
  YATIRIM_CINSI: 'yatirim_cinsi',
  URUN_BILGILERI: 'urun_bilgileri',
  FINANSAL_BILGILER: 'finansal_bilgiler',
  OZEL_SARTLAR: 'ozel_sartlar',
  DESTEK_UNSURLARI: 'destek_unsurlari',
  UNKNOWN: 'unknown',
};

// ─── Tab-Specific Gemini Prompt Şablonları ──────────────────────

const PROMPTS = {
  // Genel: Tab tespiti
  DETECT_TAB: `Bu ekran görüntüsü bir Türk devlet teşvik portalından (ETUYS/DYS) alınmıştır.
Görüntüdeki aktif tab (sekme) hangisidir? Sadece aşağıdaki seçeneklerden birini JSON olarak döndür:
- "belge_kunye" (Belge Künye Bilgileri - firma adı, belge no, il gibi genel bilgiler)
- "yatirim_cinsi" (Yatırım Cinsi - KOMPLE YENİ YATIRIM, TEVSİ, MODERNİZASYON)
- "urun_bilgileri" (Ürün Bilgileri - ürün kodu, ürün adı, kapasite tablosu)
- "finansal_bilgiler" (Finansal Bilgiler - arazi, bina, makine teçhizat, finansman)  
- "ozel_sartlar" (Özel Şartlar - şart listesi tablosu)
- "destek_unsurlari" (Destek Unsurları - destek unsuru adı ve oranı tablosu)
- "unknown" (tanınamadı)

Yanıt formatı (sadece JSON, açıklama yok): {"tabType": "...", "confidence": 0.0-1.0}`,

  // Tab 1: Belge Künye Bilgileri
  [TAB_TYPES.BELGE_KUNYE]: `Bu ekran görüntüsü bir ETUYS/DYS teşvik belgesi portalının "Belge Künye Bilgileri" sekmesini göstermektedir.

Lütfen görüntüdeki TÜM alanları dikkatlice oku ve aşağıdaki JSON yapısında döndür. Boş veya okunamayan alanlar için null kullan.

{
  "firmaAdi": "string",
  "sgkSicilNo": "string|null",
  "sermayeTuru": "string (ör: Tamamı Yerli Firma)",
  "yatirimKonusu": "string (ör: 2930 - B.Y.S. EV ALETLERİ İMALATI veya 22.26 - Diğer plastik ürünlerin imalatı)",
  "kararnameNo": "string (tarih ve sayılı kararname)",
  "il": "string",
  "ilce": "string",
  "adres": "string|null",
  "osbAdi": "string|null",
  "sbAdi": "string|null",
  "ilBazliBolge": "string (ör: 2. Bölge, 5. Bölge)",
  "ilceBazliBolge": "string|null",
  "mevcutIstihdam": number,
  "ilaveIstihdam": number,
  "belgeId": "string",
  "belgeNo": "string",
  "belgeTarihi": "string (DD/MM/YYYY)",
  "muracaatTarihi": "string (DD/MM/YYYY)|null",
  "muracaatSayisi": "string|null",
  "belgeBaslamaTarihi": "string (DD/MM/YYYY)|null",
  "belgeBitisTarihi": "string (DD/MM/YYYY)|null",
  "sureUzatimTarihi": "string (DD/MM/YYYY)|null",
  "oecdKategori": "string|null",
  "destekSinifi": "string (ör: BÖLGESEL, HEDEF YATIRIMLAR - ALT BÖLGE)",
  "oncelikliYatirim": "string|null",
  "buyukOlcekli": "string|null",
  "cazibeMerkezliMi": "string (EVET/HAYIR)",
  "savunmaSanayiProjesi": "string (EVET/HAYIR)|null",
  "belgeMuracaatTalepTipi": "string (ör: YATIRIM TEŞVİK BELGESİ)",
  "enerjiUretimKaynagi": "string|null",
  "cazibeMerkezi2018": "string (EVET/HAYIR)|null",
  "cazibeMerkeziDeprem": "string (EVET/HAYIR)|null",
  "hamleMi": "string (EVET/HAYIR)",
  "vergiIndirimsizDestek": "string (EVET/HAYIR)",
  "belgeFormati": "eski|yeni"
}

ÖNEMLI KURALLAR:
- \"belgeFormati\" alanını tespit et. BU ÇOK KRİTİK:
  * \"eski\" → Yatırım konusu kodu US97 formatındadır. US97 kodları 4 HANELİ SAYIYLA BAŞLAR: ör: \"2930\", \"2899\", \"1520\", \"2610\". Ürün kodları \"2930.1.15\" gibi 4haneli.1haneli.2haneli formattadır. Yatırım konusu satırında \"2930 - B.Y.S. EV ALETLERİ İMALATI\" gibi yazılır.
  * \"yeni\" → Yatırım konusu kodu NACE Rev.2 formatındadır. NACE kodları 2 HANELİ SAYIYLA BAŞLAR ve nokta ile ayrılır: ör: \"22.26\", \"10.71\", \"28.99\". Ürün kodları \"22.26.01\" gibi 2haneli.2haneli.2haneli formattadır.
  * AYIRT ETME KURALI: Yatırım konusu kodunun İLK SAYISI kaç hanelidir?
    - 4 haneli başlangıç (2930, 2899, 1520) → \"eski\" (US97)
    - 2 haneli başlangıç (22.26, 10.71) → \"yeni\" (NACE)
    - DİKKAT: US97 kodları da nokta içerebilir (2930.1.15) — bu NACE değildir!
- Tarihleri DD/MM/YYYY formatında döndür.
- Sayısal değerleri number olarak döndür (string değil).
- Sadece JSON döndür, açıklama metni ekleme.`,

  // Tab 2: Yatırım Cinsi
  [TAB_TYPES.YATIRIM_CINSI]: `Bu ekran görüntüsü ETUYS/DYS portalının "Yatırım Cinsi" sekmesini göstermektedir.
Tablodaki yatırım cinsi değerlerini oku.

Yanıt formatı (sadece JSON):
{
  "yatirimCinsleri": ["string"] 
}

Örnek: {"yatirimCinsleri": ["KOMPLE YENİ YATIRIM"]} veya {"yatirimCinsleri": ["TEVSİ"]}`,

  // Tab 3: Ürün Bilgileri
  [TAB_TYPES.URUN_BILGILERI]: `Bu ekran görüntüsü ETUYS/DYS portalının "Ürün Bilgileri" sekmesini göstermektedir.
Tablodaki tüm ürün satırlarını oku.

Yanıt formatı (sadece JSON):
{
  "kodTipi": "US97|NACE6",
  "urunler": [
    {
      "urunKodu": "string (ör: 2930.1.15 veya 22.26.01)",
      "urunAdi": "string",
      "mevcutKapasite": number,
      "ilaveKapasite": number,
      "toplamKapasite": number,
      "birim": "string (ör: KG/YIL, ADET/YIL)"
    }
  ]
}

ÖNEMLI:
- kodTipi belirleme: 
  * Kolon başlığında "Ürün Kodu (Nace6)" veya "NACE" yazıyorsa → kodTipi: "NACE6"
  * Kolon başlığında "Ürün Kodu" (NACE ifadesi YOKSA) → kodTipi: "US97"
  * Ürün kodu formatından da belirlenebilir: 2930.1.15 (4 haneli başlangıç) → US97, 22.26.01 (2 haneli başlangıç) → NACE6
- Sayıları number olarak döndür.`,

  // Tab 4: Finansal Bilgiler
  [TAB_TYPES.FINANSAL_BILGILER]: `Bu ekran görüntüsü ETUYS/DYS portalının "Finansal Bilgiler" sekmesini göstermektedir.
Tüm finansal değerleri dikkatlice oku. Noktalı sayıları (ör: 3.058.667) doğru parse et.

Yanıt formatı (sadece JSON):
{
  "araziArsaBedeli": {
    "aciklama": "string|null",
    "metrekare": number|null,
    "birimFiyat": number|null,
    "toplam": number
  },
  "binaInsaatGiderleri": {
    "aciklama": "string|null",
    "anaBina": number,
    "yardimciBina": number,
    "idareBinalari": number,
    "toplam": number
  },
  "digerYatirimHarcamalari": {
    "yardimciIsletmeMakine": number,
    "ithalatGumrukleme": number,
    "tasimaSigorta": number,
    "montaj": number,
    "etudProje": number,
    "faizKarPayi": number|null,
    "kurFarki": number|null,
    "maddiOlmayanVarlik": number|null,
    "digerGiderler": number,
    "toplam": number
  },
  "toplamSabitYatirimTutari": number,
  "makinaTechizatGiderleri": {
    "ithal": number,
    "yerli": number,
    "toplamMakine": number
  },
  "ithalMakineDolar": {
    "yeniMakine": number,
    "kullanilmisMakine": number,
    "toplam": number
  },
  "yabanciKaynaklar": {
    "toplamYabanciKaynak": number
  },
  "ozkaynaklar": {
    "ozkaynakToplam": number
  },
  "toplamFinansman": number
}

ÖNEMLI: Türk sayı formatını doğru oku: 3.058.667 = 3058667 (nokta binlik ayracı). Boş alanlar için 0 kullan.`,

  // Tab 5: Özel Şartlar
  [TAB_TYPES.OZEL_SARTLAR]: `Bu ekran görüntüsü ETUYS/DYS portalının "Özel Şartlar" sekmesini göstermektedir.
Tablodaki tüm özel şart satırlarını oku.

Yanıt formatı (sadece JSON):
{
  "ozelSartlar": [
    {
      "sartAdi": "string",
      "sartAciklamasi": "string (mümkünse tam metin, kısaltılmışsa görünen kadar)"
    }
  ]
}`,

  // Tab 6: Destek Unsurları
  [TAB_TYPES.DESTEK_UNSURLARI]: `Bu ekran görüntüsü ETUYS/DYS portalının "Destek Unsurları" sekmesini göstermektedir.
Tablodaki tüm destek unsurlarını ve oranlarını oku.

Yanıt formatı (sadece JSON):
{
  "destekUnsurlari": [
    {
      "destekUnsuru": "string (ör: Vergi İndirimi, Sigorta Primi İşveren Hissesi)",
      "destekOrani": "string (ör: %55, YKO %20, 3 Yıl, boş)"
    }
  ]
}`,
};

// ─── HTTP ve Parse Yardımcıları ─────────────────────────────────

function postJson(url, body, extraHeaders = {}) {
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
          ...extraHeaders,
        },
        timeout: 90000,
      },
      (res) => {
        let raw = '';
        res.setEncoding('utf8');
        res.on('data', (chunk) => (raw += chunk));
        res.on('end', () => {
          if (res.statusCode && res.statusCode >= 400) {
            return reject(new Error(`HTTP ${res.statusCode}: ${raw.slice(0, 500)}`));
          }
          try {
            resolve(JSON.parse(raw));
          } catch (e) {
            reject(new Error(`JSON parse error: ${e.message}`));
          }
        });
      }
    );

    req.on('error', reject);
    req.on('timeout', () => {
      req.destroy();
      reject(new Error('API timeout (90s)'));
    });
    req.write(data);
    req.end();
  });
}

function safeJsonExtract(text) {
  const m = String(text || '').match(/\{[\s\S]*\}/);
  if (!m) return null;
  try {
    return JSON.parse(m[0]);
  } catch {
    return null;
  }
}

// ─── Multi-Provider Vision API ──────────────────────────────────

/**
 * OpenAI GPT-4o-mini Vision API çağrısı
 */
async function callOpenAIVision(imageBuffer, prompt, mimeType = 'image/png') {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return null; // key yoksa skip

  const base64Image = imageBuffer.toString('base64');
  const dataUrl = `data:${mimeType};base64,${base64Image}`;

  const payload = {
    model: 'gpt-4o-mini',
    messages: [
      {
        role: 'user',
        content: [
          {
            type: 'image_url',
            image_url: { url: dataUrl, detail: 'high' },
          },
          {
            type: 'text',
            text: prompt,
          },
        ],
      },
    ],
    max_tokens: 4096,
    temperature: 0.1,
  };

  const resp = await postJson('https://api.openai.com/v1/chat/completions', payload, {
    Authorization: `Bearer ${apiKey}`,
  });

  const text = resp?.choices?.[0]?.message?.content || '';
  const parsed = safeJsonExtract(text);
  return { raw: text, parsed, success: !!parsed, provider: 'openai' };
}

/**
 * Gemini Vision API çağrısı
 */
async function callGeminiVisionDirect(imageBuffer, prompt, mimeType = 'image/png') {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return null;

  const base64Image = imageBuffer.toString('base64');
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${encodeURIComponent(apiKey)}`;

  const payload = {
    contents: [
      {
        role: 'user',
        parts: [
          { inlineData: { mimeType, data: base64Image } },
          { text: prompt },
        ],
      },
    ],
    generationConfig: {
      temperature: 0.1,
      topP: 0.9,
      maxOutputTokens: 4096,
    },
  };

  const resp = await postJson(url, payload);
  const text =
    resp?.candidates?.[0]?.content?.parts?.map((p) => p.text).join('\n') ||
    resp?.candidates?.[0]?.content?.parts?.[0]?.text ||
    '';
  const parsed = safeJsonExtract(text);
  return { raw: text, parsed, success: !!parsed, provider: 'gemini' };
}

/**
 * Multi-provider Vision API — Retry + Fallback
 * OpenAI önce (2 deneme), sonra Gemini (3 deneme, aralıklı)
 */
async function callGeminiVision(imageBuffer, prompt, mimeType = 'image/png') {
  const providers = [
    { name: 'OpenAI GPT-4o-mini', fn: () => callOpenAIVision(imageBuffer, prompt, mimeType), retries: 2, delay: 1000 },
    { name: 'Gemini 2.5 Flash', fn: () => callGeminiVisionDirect(imageBuffer, prompt, mimeType), retries: 3, delay: 3000 },
  ];

  for (const provider of providers) {
    for (let attempt = 1; attempt <= provider.retries; attempt++) {
      try {
        const result = await provider.fn();
        if (result === null) break; // key yok, skip to next provider
        if (result && result.success) {
          console.log(`    🤖 ${provider.name} (deneme ${attempt}) ✅`);
          return result;
        }
        console.log(`    ⚠️ ${provider.name} (deneme ${attempt}): JSON parse başarısız`);
      } catch (err) {
        const msg = err.message.slice(0, 120);
        console.log(`    ⚠️ ${provider.name} (deneme ${attempt}/${provider.retries}): ${msg}`);
        if (attempt < provider.retries) {
          const wait = provider.delay * attempt;
          console.log(`    ⏳ ${wait}ms bekleniyor...`);
          await new Promise(r => setTimeout(r, wait));
        }
      }
    }
  }

  throw new Error('Tüm AI provider\'lar başarısız oldu (OpenAI, Gemini)');
}

// ─── Yüksek Seviye Fonksiyonlar ─────────────────────────────────

/**
 * Ekran görüntüsündeki tab tipini algıla
 */
async function detectTabType(imageBuffer, mimeType) {
  const result = await callGeminiVision(imageBuffer, PROMPTS.DETECT_TAB, mimeType);
  if (result.parsed?.tabType) {
    return {
      tabType: result.parsed.tabType,
      confidence: result.parsed.confidence || 0.5,
    };
  }
  return { tabType: TAB_TYPES.UNKNOWN, confidence: 0 };
}

/**
 * Bilinen tab tipine göre veri çıkar
 */
async function extractTabData(imageBuffer, tabType, mimeType) {
  const prompt = PROMPTS[tabType];
  if (!prompt) {
    return { success: false, error: `Bilinmeyen tab tipi: ${tabType}`, data: null };
  }

  const result = await callGeminiVision(imageBuffer, prompt, mimeType);
  return {
    success: result.success,
    tabType,
    data: result.parsed,
    rawResponse: result.raw?.slice(0, 500),
  };
}

/**
 * Tek bir ekran görüntüsünü tam analiz et (tab algıla + veri çıkar)
 */
async function analyzeScreenshot(imageBuffer, mimeType = 'image/png', tabHint = null) {
  // Tab zaten biliniyorsa direkt çıkar
  if (tabHint && PROMPTS[tabHint]) {
    const data = await extractTabData(imageBuffer, tabHint, mimeType);
    return { ...data, detectedTab: tabHint, confidence: 1.0 };
  }

  // Tab algıla
  const detection = await detectTabType(imageBuffer, mimeType);

  if (detection.tabType === TAB_TYPES.UNKNOWN) {
    return {
      success: false,
      detectedTab: TAB_TYPES.UNKNOWN,
      confidence: 0,
      error: 'Tab tipi algılanamadı',
      data: null,
    };
  }

  // Veri çıkar
  const data = await extractTabData(imageBuffer, detection.tabType, mimeType);
  return {
    ...data,
    detectedTab: detection.tabType,
    confidence: detection.confidence,
  };
}

/**
 * Çoklu ekran görüntüsünü analiz edip birleştirilmiş belge verisi üret
 */
async function analyzeMultipleScreenshots(images) {
  const results = [];
  const errors = [];

  for (let i = 0; i < images.length; i++) {
    const { buffer, mimeType, originalName } = images[i];
    try {
      console.log(`📸 [${i + 1}/${images.length}] Analiz ediliyor: ${originalName}`);
      const result = await analyzeScreenshot(buffer, mimeType || 'image/png');
      results.push({
        index: i,
        filename: originalName,
        ...result,
      });
      console.log(`  ✅ Tab: ${result.detectedTab} (${Math.round((result.confidence || 0) * 100)}%)`);
    } catch (err) {
      console.error(`  ❌ Hata: ${err.message}`);
      errors.push({
        index: i,
        filename: originalName,
        error: err.message,
      });
    }
  }

  // Birleştirilmiş belge verisi oluştur
  const merged = mergeResults(results);

  return {
    screenshots: results,
    errors,
    merged,
    belgeFormati: merged.belgeFormati || 'eski',
    totalAnalyzed: results.length,
    totalErrors: errors.length,
  };
}

/**
 * Analiz sonuçlarını tek bir belge yapısına birleştir
 */
function mergeResults(results) {
  const merged = {
    // Belge Künye
    firmaAdi: null,
    sgkSicilNo: null,
    sermayeTuru: null,
    yatirimKonusu: null,
    kararnameNo: null,
    il: null,
    ilce: null,
    adres: null,
    osbAdi: null,
    ilBazliBolge: null,
    ilceBazliBolge: null,
    mevcutIstihdam: 0,
    ilaveIstihdam: 0,
    belgeId: null,
    belgeNo: null,
    belgeTarihi: null,
    muracaatTarihi: null,
    muracaatSayisi: null,
    belgeBaslamaTarihi: null,
    belgeBitisTarihi: null,
    sureUzatimTarihi: null,
    destekSinifi: null,
    oecdKategori: null,
    cazibeMerkezliMi: null,
    hamleMi: null,
    vergiIndirimsizDestek: null,
    belgeMuracaatTalepTipi: null,
    belgeFormati: 'eski',

    // Yatırım Cinsi
    yatirimCinsleri: [],

    // Ürün Bilgileri
    kodTipi: null,
    urunler: [],

    // Finansal
    finansal: null,

    // Özel Şartlar
    ozelSartlar: [],

    // Destek Unsurları
    destekUnsurlari: [],
  };

  for (const result of results) {
    if (!result.success || !result.data) continue;

    switch (result.detectedTab) {
      case TAB_TYPES.BELGE_KUNYE:
        Object.assign(merged, result.data);
        break;

      case TAB_TYPES.YATIRIM_CINSI:
        if (result.data.yatirimCinsleri) {
          merged.yatirimCinsleri = result.data.yatirimCinsleri;
        }
        break;

      case TAB_TYPES.URUN_BILGILERI:
        if (result.data.urunler) {
          merged.urunler = result.data.urunler;
          merged.kodTipi = result.data.kodTipi || null;
        }
        break;

      case TAB_TYPES.FINANSAL_BILGILER:
        merged.finansal = result.data;
        break;

      case TAB_TYPES.OZEL_SARTLAR:
        if (result.data.ozelSartlar) {
          merged.ozelSartlar = result.data.ozelSartlar;
        }
        break;

      case TAB_TYPES.DESTEK_UNSURLARI:
        if (result.data.destekUnsurlari) {
          merged.destekUnsurlari = result.data.destekUnsurlari;
        }
        break;
    }
  }

  // Belge formatı finalize
  if (merged.kodTipi === 'NACE6' || merged.belgeFormati === 'yeni') {
    merged.belgeFormati = 'yeni';
  }

  return merged;
}

// ─── Export ─────────────────────────────────────────────────────

module.exports = {
  TAB_TYPES,
  analyzeScreenshot,
  analyzeMultipleScreenshots,
  detectTabType,
  extractTabData,
  mergeResults,
};
