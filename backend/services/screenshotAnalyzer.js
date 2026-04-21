/**
 * 📸 Screenshot Analyzer Service - v2.0
 * 
 * AI Vision API kullanarak ETUYS/DYS devlet portalı ekran görüntülerinden
 * teşvik belgesi verilerini otomatik çıkarır.
 * 
 * Desteklenen Tab Türleri:
 * 1. Belge Künye Bilgileri
 * 2. Yatırım Cinsi
 * 3. Ürün Bilgileri
 * 4. Yerli Liste (makine/teçhizat)
 * 5. İthal Liste (makine/teçhizat)
 * 6. Finansal Bilgiler
 * 7. Özel Şartlar (liste + popup detay)
 * 8. Destek Unsurları
 * 9. Proje Tanıtımı
 * 10. Evrak Listesi
 */

const https = require('https');

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

// ─── Tab-Specific AI Prompt Şablonları ──────────────────────────

const PROMPTS = {
  // Genel: Tab tespiti
  DETECT_TAB: `Bu ekran görüntüsü bir Türk devlet teşvik portalından (ETUYS/DYS) alınmıştır.
Görüntüdeki aktif tab (sekme) veya pencere türünü tespit et.

POPUP/MODAL PENCERELER:
- Eğer görüntüde küçük bir popup/modal pencere açıksa (başlığında "Özel Şart Görüntüleme" yazıyorsa), bu bir özel şart detayıdır → "ozel_sart_detay"
- Popup pencerelerde genellikle "Özel Şart:", "Açıklama:" etiketleri ve "Kapat" butonu bulunur

ANA SEKMELER:
- "belge_kunye" → Belge Künye Bilgileri (firma adı, belge no, il, belge tarihi, sermaye türü gibi genel bilgiler)
- "yatirim_cinsi" → Yatırım Cinsi (KOMPLE YENİ YATIRIM, TEVSİ, MODERNİZASYON listesi)
- "urun_bilgileri" → Ürün Bilgileri (ürün kodu US-97/NACE, ürün adı, kapasite tablosu)
- "yerli_liste" → Yerli Liste (yerli makine/teçhizat listesi - sıra no, cinsi, adedi, tutarı)
- "ithal_liste" → İthal Liste (ithal makine/teçhizat listesi - sıra no, cinsi, adedi, tutarı)
- "finansal_bilgiler" → Finansal Bilgiler (arazi, bina, makine teçhizat, finansman tutarları)
- "ozel_sartlar" → Özel Şartlar (özel şart listesi tablosu - şart adı ve açıklama sütunları)
- "destek_unsurlari" → Destek Unsurları (destek unsuru adı ve oranı tablosu)
- "proje_tanitimi" → Proje Tanıtımı (proje açıklama metni)
- "evrak_listesi" → Evrak Listesi (belge/evrak tablosu)
- "unknown" → tanınamadı

Yanıt formatı (sadece JSON, açıklama yok): {"tabType": "...", "confidence": 0.0-1.0}`,

  // Tab 1: Belge Künye Bilgileri
  [TAB_TYPES.BELGE_KUNYE]: `Bu ekran görüntüsü bir ETUYS/DYS teşvik belgesi portalının "Belge Künye Bilgileri" sekmesini göstermektedir.

SAYFA YAPISI: Sol tarafta "Yatırımcı ile ilgili bilgiler" ve "Yatırım ile ilgili bilgiler" bölümleri, sağ tarafta "Belge ile ilgili bilgiler" bölümü bulunur.

Lütfen görüntüdeki TÜM alanları dikkatlice oku ve aşağıdaki JSON yapısında döndür. Boş veya okunamayan alanlar için null kullan.

{
  "firmaAdi": "string (ör: BAYRAM ÖZEL, METSAN MAKİNA LTD. ŞTİ.)",
  "sgkSicilNo": "string|null",
  "sermayeTuru": "string (ör: Tamamı Yerli Firma, Yabancı Sermayeli)",
  "yatirimKonusu": "string (Yatırımın Konusu satırındaki tam metin, ör: 2929 - DİĞER ÖZEL AMAÇLI MAKİNELERİN İMALATI veya 22.26 - Diğer plastik ürünlerin imalatı)",
  "kararnameNo": "string (ör: 15.06.2012 tarih 2012-3305 sayılı)",
  "il": "string (ör: KONYA, İSTANBUL)",
  "ilce": "string (ör: Karatay, Gebze)",
  "adres": "string|null (tam adres metni)",
  "osbAdi": "string|null",
  "sbAdi": "string|null",
  "ilBazliBolge": "string (ör: 2. Bölge, 5. Bölge)",
  "ilceBazliBolge": "string|null",
  "mevcutIstihdam": "number (boşsa 0)",
  "ilaveIstihdam": "number (boşsa 0)",
  "belgeId": "string (ör: 1022039)",
  "belgeNo": "string (ör: 516931)",
  "belgeTarihi": "string (DD/MM/YYYY formatında, ör: 16/11/2020)",
  "muracaatTarihi": "string (DD/MM/YYYY)|null",
  "muracaatSayisi": "string|null (ör: 21919)",
  "belgeBaslamaTarihi": "string (DD/MM/YYYY)|null",
  "belgeBitisTarihi": "string (DD/MM/YYYY)|null",
  "sureUzatimTarihi": "string (DD/MM/YYYY)|null (Süre Uzatım Tarihi satırı)",
  "oecdKategori": "string|null (OECD satırındaki tam metin, ör: B.Y.S. Makine ve Teçhizat İmalatı)",
  "destekSinifi": "string (ör: BÖLGESEL, GENEL, HEDEF YATIRIMLAR - ALT BÖLGE)",
  "oncelikliYatirim": "string|null (boşsa null)",
  "buyukOlcekli": "string|null (boşsa null)",
  "cazibeMerkezliMi": "string (EVET veya HAYIR)",
  "savunmaSanayiProjesi": "string (EVET veya HAYIR)|null",
  "ada": "string|null",
  "parsel": "string|null",
  "belgeMuracaatTalepTipi": "string (ör: YATIRIM TEŞVİK BELGESİ)",
  "enerjiUretimKaynagi": "string|null",
  "cazibeMerkezi2018": "string (EVET veya HAYIR)|null",
  "cazibeMerkeziDeprem": "string (EVET veya HAYIR)|null",
  "hamleMi": "string (EVET veya HAYIR)",
  "vergiIndirimsizDestek": "string (EVET veya HAYIR)",
  "belgeFormati": "eski|yeni"
}

BELGE FORMATI TESPİT KURALLARI (ÇOK KRİTİK):
- Sayfada "Yatırımın Konusu(US97):" etiketi varsa → "eski"
- Sayfada "Yatırımın Konusu(Nace):" etiketi varsa → "yeni"
- Yatırım konusu kodu 4 haneli başlıyorsa (2929, 2930, 1520) → "eski" (US97)
- Yatırım konusu kodu 2 haneli+nokta+2 haneli başlıyorsa (22.26, 10.71) → "yeni" (NACE)
- Tarihleri mutlaka DD/MM/YYYY formatında döndür.
- Sayısal değerleri number olarak döndür.
- Sadece JSON döndür, açıklama metni ekleme.`,

  // Tab 2: Yatırım Cinsi
  [TAB_TYPES.YATIRIM_CINSI]: `Bu ekran görüntüsü ETUYS/DYS portalının "Yatırım Cinsi" sekmesini göstermektedir.
Tabloda "Yatırım Cinsi" başlıklı sütunun altındaki tüm değerleri oku.

Yanıt formatı (sadece JSON):
{
  "yatirimCinsleri": ["string"]
}

Örnek: {"yatirimCinsleri": ["KOMPLE YENİ YATIRIM"]}
Diğer olası değerler: TEVSİ, MODERNİZASYON, ÜRÜN ÇEŞİTLENDİRME, ENTEGRASYON`,

  // Tab 3: Ürün Bilgileri
  [TAB_TYPES.URUN_BILGILERI]: `Bu ekran görüntüsü ETUYS/DYS portalının "Ürün Bilgileri" sekmesini göstermektedir.
Tablodaki tüm ürün satırlarını dikkatlice oku.

Yanıt formatı (sadece JSON):
{
  "kodTipi": "US97|NACE6",
  "urunler": [
    {
      "urunKodu": "string (ör: 2929.2.09 veya 22.26.01)",
      "urunAdi": "string (ör: KALIP, PLASTİK BORU)",
      "mevcutKapasite": number,
      "ilaveKapasite": number,
      "toplamKapasite": number,
      "birim": "string (ör: KG/YIL, ADET/YIL, TON/YIL, M2/YIL)"
    }
  ]
}

KOD TİPİ BELİRLEME KURALLARI:
1. Kolon başlığı "Ürün Kodu (US-97)" veya "Ürün Kodu (US97)" ise → kodTipi: "US97"
2. Kolon başlığı "Ürün Kodu (Nace6)" veya "NACE" ise → kodTipi: "NACE6"
3. Başlık okunamazsa ürün kodu formatından:
   - 2929.2.09 (4haneli.1-2haneli.2haneli) → US97
   - 22.26.01 (2haneli.2haneli.2haneli) → NACE6
- Sayıları number olarak döndür.
- Sadece JSON döndür.`,

  // Tab 4: Yerli Liste
  [TAB_TYPES.YERLI_LISTE]: `Bu ekran görüntüsü ETUYS/DYS portalının "Yerli Liste" sekmesini göstermektedir.
Bu sekme yerli (Türkiye'de üretilmiş) makine ve teçhizatların listesini gösterir.

Tablodaki tüm makine/teçhizat satırlarını oku.

Yanıt formatı (sadece JSON):
{
  "yerliMakineler": [
    {
      "siraNo": number,
      "makineCinsi": "string (ör: CNC TORNA, PRES, KAYNAK MAKİNESİ)",
      "adedi": number,
      "tutarTL": number,
      "aciklama": "string|null"
    }
  ]
}

ÖNEMLI: Türk sayı formatını doğru oku: 1.250.000 = 1250000 (nokta binlik ayracı). Sadece JSON döndür.`,

  // Tab 5: İthal Liste
  [TAB_TYPES.ITHAL_LISTE]: `Bu ekran görüntüsü ETUYS/DYS portalının "İthal Liste" sekmesini göstermektedir.
Bu sekme ithal (yurt dışından getirilen) makine ve teçhizatların listesini gösterir.

Tablodaki tüm makine/teçhizat satırlarını oku.

Yanıt formatı (sadece JSON):
{
  "ithalMakineler": [
    {
      "siraNo": number,
      "makineCinsi": "string (ör: ENJEKSİYON MAKİNESİ, CNC İŞLEME MERKEZİ)",
      "adedi": number,
      "tutarDolar": number,
      "tutarTL": number|null,
      "menseUlke": "string|null (ör: ALMANYA, ÇİN, İTALYA)",
      "yeniKullanilmis": "string|null (YENİ veya KULLANILMIŞ)",
      "aciklama": "string|null"
    }
  ]
}

ÖNEMLI: Sayı ayracı: 561.676,72 → 561676.72 (nokta binlik, virgül ondalık). Sadece JSON döndür.`,

  // Tab 6: Finansal Bilgiler
  [TAB_TYPES.FINANSAL_BILGILER]: `Bu ekran görüntüsü ETUYS/DYS portalının "Finansal Bilgiler" sekmesini göstermektedir.
Sol tarafta giderler (Arazi-Arsa, Bina-İnşaat, Diğer Yatırım Harcamaları), sağ tarafta Makina Teçhizat, İthal Makine($), Yabancı Kaynaklar, Özkaynaklar ve TOPLAM FİNANSMAN bulunur.

Tüm finansal değerleri dikkatlice oku.

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

ÖNEMLI: Türk sayı formatı: 12.819.990 = 12819990 (nokta binlik ayracı). Virgül ondalık ayracıdır: 561.676,72 = 561676.72. Boş alanlar için 0 kullan. Sadece JSON döndür.`,

  // Tab 7: Özel Şartlar (Liste)
  [TAB_TYPES.OZEL_SARTLAR]: `Bu ekran görüntüsü ETUYS/DYS portalının "Özel Şartlar" sekmesini göstermektedir.
Tabloda "Özel Şart Adı" ve "Özel Şart Açıklaması" sütunları bulunur.

DİKKAT: Açıklama metinleri tabloda kısaltılmış olabilir (... ile biten). Görünen kadarını yaz.

Yanıt formatı (sadece JSON):
{
  "ozelSartlar": [
    {
      "sartAdi": "string (ör: Kullanılmış Makine Münferit, BÖL - Faaliyet Zorunluluğu, 3305 - SGK : Bölgesel - 4. Bölge)",
      "sartAciklamasi": "string (görünen kadar, kısaltılmışsa ... ekle)"
    }
  ]
}

Not: Yaygın özel şart isimleri: Kullanılmış Makine Münferit, Diğer Kurum, BÖL - Faaliyet Zorunluluğu, 3305 - Yatırım Konusu Zorunluluğu, BÖL - SGK NO, 3305 - (OECD), 3305 - SGK : Bölgesel, BÖL - Faiz Desteği, Süre Uzatımı. Sadece JSON döndür.`,

  // Tab 7b: Özel Şart Detay Popup
  [TAB_TYPES.OZEL_SART_DETAY]: `Bu ekran görüntüsü bir "Özel Şart Görüntüleme" popup penceresidir.
Pencerede "Özel Şart:" ve "Açıklama:" etiketleri altında detaylı bilgi bulunur.

Açıklama metnini TAM OLARAK, hiç kısaltmadan oku.

Yanıt formatı (sadece JSON):
{
  "ozelSartDetay": {
    "sartAdi": "string (ör: BÖL - Faiz Desteği, Süre Uzatımı, 3305 - Yatırım Konusu Zorunluluğu)",
    "sartAciklamasi": "string (açıklama metninin TAMAMI - hiçbir şeyi atlama)"
  }
}

Sadece JSON döndür, açıklama metni ekleme.`,

  // Tab 8: Destek Unsurları
  [TAB_TYPES.DESTEK_UNSURLARI]: `Bu ekran görüntüsü ETUYS/DYS portalının "Destek Unsurları" sekmesini göstermektedir.
Tabloda "Destek Unsuru Adı" ve "Destek Oranı" sütunları bulunur.

Yanıt formatı (sadece JSON):
{
  "destekUnsurlari": [
    {
      "destekUnsuru": "string (ör: Vergi İndirimi, Sigorta Primi İşveren Hissesi, Gümrük Vergisi Muafiyeti, KDV İstisnası, Faiz Desteği)",
      "destekOrani": "string (ör: %70 YKO %30, 6 Yıl, boş ise empty string)"
    }
  ]
}

DİKKAT: Bazı destek unsurlarının oranı boş olabilir (sadece adı var). Bu durumda destekOrani'ni boş string "" olarak döndür. Sadece JSON döndür.`,

  // Tab 9: Proje Tanıtımı
  [TAB_TYPES.PROJE_TANITIMI]: `Bu ekran görüntüsü ETUYS/DYS portalının "Proje Tanıtımı" sekmesini göstermektedir.
Proje açıklama metnini tam olarak oku.

Yanıt formatı (sadece JSON):
{
  "projeTanitimi": "string (proje açıklama metninin tamamı)"
}

Sadece JSON döndür.`,

  // Tab 10: Evrak Listesi
  [TAB_TYPES.EVRAK_LISTESI]: `Bu ekran görüntüsü ETUYS/DYS portalının "Evrak Listesi" sekmesini göstermektedir.
Tablodaki tüm evrak/belge bilgilerini oku.

Yanıt formatı (sadece JSON):
{
  "evrakListesi": [
    {
      "evrakAdi": "string",
      "evrakTarihi": "string|null",
      "evrakDurumu": "string|null",
      "aciklama": "string|null"
    }
  ]
}

Sadece JSON döndür.`,
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
    oncelikliYatirim: null,
    buyukOlcekli: null,
    cazibeMerkezliMi: null,
    savunmaSanayiProjesi: null,
    ada: null,
    parsel: null,
    hamleMi: null,
    vergiIndirimsizDestek: null,
    belgeMuracaatTalepTipi: null,
    enerjiUretimKaynagi: null,
    cazibeMerkezi2018: null,
    cazibeMerkeziDeprem: null,
    belgeFormati: 'eski',

    // Yatırım Cinsi
    yatirimCinsleri: [],

    // Ürün Bilgileri
    kodTipi: null,
    urunler: [],

    // Makine Listeleri
    yerliMakineler: [],
    ithalMakineler: [],

    // Finansal
    finansal: null,

    // Özel Şartlar
    ozelSartlar: [],

    // Destek Unsurları
    destekUnsurlari: [],

    // Proje Tanıtımı
    projeTanitimi: null,

    // Evrak Listesi
    evrakListesi: [],
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

      case TAB_TYPES.YERLI_LISTE:
        if (result.data.yerliMakineler) {
          merged.yerliMakineler = result.data.yerliMakineler;
        }
        break;

      case TAB_TYPES.ITHAL_LISTE:
        if (result.data.ithalMakineler) {
          merged.ithalMakineler = result.data.ithalMakineler;
        }
        break;

      case TAB_TYPES.FINANSAL_BILGILER:
        merged.finansal = result.data;
        break;

      case TAB_TYPES.OZEL_SARTLAR:
        if (result.data.ozelSartlar) {
          merged.ozelSartlar = [...merged.ozelSartlar, ...result.data.ozelSartlar];
        }
        break;

      case TAB_TYPES.OZEL_SART_DETAY:
        // Popup detay — mevcut özel şartı güncelle veya yeni ekle
        if (result.data.ozelSartDetay) {
          const detay = result.data.ozelSartDetay;
          // İsmi eşleşen, ancak henüz detayı ile GÜNCELLENMEMİŞ ilk şartı bul (aynı isimden birden fazla varsa diye)
          const existing = merged.ozelSartlar.find(s => 
            s.sartAdi && detay.sartAdi && s.sartAdi.includes(detay.sartAdi.slice(0, 15)) && !s._isUpdated
          );
          
          if (existing) {
            // Var olan şartın açıklamasını tam metinle güncelle ve işaretle
            existing.sartAciklamasi = detay.sartAciklamasi;
            existing._isUpdated = true;
          } else {
            // Eşleşen güncellenmemiş satır bulunamadıysa yeni şart olarak ekle
            merged.ozelSartlar.push({
              sartAdi: detay.sartAdi,
              sartAciklamasi: detay.sartAciklamasi,
              _isUpdated: true
            });
          }
        }
        break;

      case TAB_TYPES.DESTEK_UNSURLARI:
        if (result.data.destekUnsurlari) {
          merged.destekUnsurlari = result.data.destekUnsurlari;
        }
        break;

      case TAB_TYPES.PROJE_TANITIMI:
        if (result.data.projeTanitimi) {
          merged.projeTanitimi = result.data.projeTanitimi;
        }
        break;

      case TAB_TYPES.EVRAK_LISTESI:
        if (result.data.evrakListesi) {
          merged.evrakListesi = result.data.evrakListesi;
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
