# Akıllı Veri Yükleme Sistemi (Excel/CSV/PDF) — Tasarım Dokümanı

Tarih: 2026-04-15  
Durum: Tasarım Onaylandı (uygulamaya geçmeden önce gözden geçirilecek)  
Kapsam: Firma, Dosya Takip, Eski Teşvik, Yeni Teşvik, Makine/Teçhizat (Yerli/İthal) import/ingestion

---

## 0) Güvenlik Notu (kritik)

Bu özellik kapsamında **API anahtarları asla sohbet içinde paylaşılmamalı** ve **frontend’e gömülmemelidir**.  
LLM (Gemini vb.) entegrasyonu kullanılacaksa:

- Anahtar yalnızca backend ortam değişkeni olarak tutulur (ör. `GEMINI_API_KEY`).
- Repo’ya yazılmaz, commit edilmez, log’lanmaz.
- LLM’e gönderilen veri “minimum gerekli” olmalıdır (tercihen sadece kolon başlıkları + maskeli örnekler).

---

## 1) Problem Tanımı

Önceden sistemde daha zengin veri vardı; mevcut veri kaybı sonrası tekrar veri girişi gerekiyor.  
Manuel form doldurarak tekrar giriş:

- yavaş
- hataya açık
- modül/alt-modül ayrımı karmaşık (firma mı? dosya takip mi? teşvik mi? eski/yeni? makine listesi mi? yerli/ithal mi?)

Hedef: Excel/CSV/PDF yükleyerek sistemin **otomatik sınıflandırma + kolon eşleştirme + doğrulama + önizleme + kayıt oluşturma** yapması.

---

## 2) Hedefler (Goals)

1. Kullanıcı tek ekrandan dosya yükler (Excel/CSV/PDF).
2. Sistem dosyanın **hangi modüle ait olduğunu** tespit eder:
   - Firma
   - Dosya Takip
   - Eski Teşvik
   - Yeni Teşvik
   - Makine/Teçhizat listesi (Yerli/İthal) + hangi teşvik sistemine bağlı (eski/yeni)
3. Sistem kolonları otomatik eşler (kısmen standart kolon adları için synonym desteği).
4. Önizleme:
   - kaç satır
   - kaç hata
   - hangi kayıtlar güncellenecek / eklenecek
5. Kullanıcı “Onayla” dediğinde backend toplu kayıt oluşturur.

---

## 3) Kapsam Dışı (Non-goals)

- %100 otomatik ve hatasız mapping garantisi (özellikle PDF ve düzensiz kaynaklar)
- Taranmış PDF’ler için kusursuz OCR (opsiyonel faz)
- Eski verinin “tam birebir” geri dönüşüm garantisi (kaynak dosyaların kalitesine bağlı)

---

## 4) Mevcut Sistemden Çıkan Kısıtlar / Gerçekler

### 4.1 Firma
- Model: `backend/models/Firma.js`
- Firma ID (`firmaId`) backend pre-save middleware ile otomatik üretilebiliyor.
  - Import’ta `firmaId` gelirse: **zorunlu kabul edilmemeli**.
  - Asıl benzersiz anahtar: `vergiNoTC` (unique).

### 4.2 Dosya Takip
- Model: `backend/models/DosyaTakip.js`
- Ayırt edici alanlar:
  - `talepTuru` (enum)
  - `durum` (örn. `2.1.1_GORUSULUYOR`)
  - `anaAsama`
  - `takipId`, `ytbNo`, `belgeSistemi` (`Tesvik|YeniTesvik`)

### 4.3 Teşvik / Yeni Teşvik
- Modeller: `backend/models/Tesvik.js`, `backend/models/YeniTesvik.js`
- Ortak kavramlar: `tesvikId`, `gmId`, durum, makine listeleri, revizyon.
- Yeni Teşvik ayırt edici: `bonusHesaplamalari.*`

### 4.4 Makine/Teçhizat (Yerli/İthal)
- Yerli sinyalleri: `birimFiyatiTl`, `toplamTutariTl`, `kdvIstisnasi`, `gtipKodu`
- İthal sinyalleri: `birimFiyatiFob`, `gumrukDovizKodu`, `toplamTutarFob*`, `kurManuel*`, `gumrukVergisiMuafiyeti`

---

## 5) Önerilen Yaklaşım (Hibrit) — Kural + LLM destekli mapping

### 5.1 Neden hibrit?
“Kısmen standart” dosyalarda:
- Çoğu zaman header/saha adları benziyor → kural tabanlı fingerprint yeterli
- Bazı durumlarda kolon adları değişiyor → LLM sadece mapping için devreye girsin

### 5.2 Temel prensip
1) **Sınıflandırma**: deterministik + skorlu (confidence)  
2) **Kolon eşleştirme**: synonym sözlüğü + gerektiğinde Gemini “öneri”  
3) **Kayıt yazma**: mevcut controller/servis mantığını yeniden kullanma (iş kuralları tek yerde kalsın)

---

## 6) Backend Tasarımı

### 6.1 Yeni API (öneri)

#### `POST /api/ingest/preview`
Girdi:
- `file` (multipart)
- opsiyonel: `sheetName`, `headerRow`, `delimiter`, `sourceHint` (kullanıcı ipucu)

Çıktı:
- `classification`: `{ module, subType, confidence, reasons[] }`
- `mapping`: `{ sourceColumn -> targetField }`
- `requiredFieldCheck`: eksikler
- `rowPreview`: ilk N satır normalize edilmiş şekilde
- `errors`: satır bazlı validasyon hataları
- `ingestSessionId`

#### `POST /api/ingest/commit`
Girdi:
- `ingestSessionId`
- `mappingOverrides` (kullanıcı düzeltmeleri)
- `mode`: `create_only | upsert`
- `dryRun`: false

Çıktı:
- oluşturulan/güncellenen kayıt sayıları
- hata raporu (indirilebilir CSV)
- Activity log özetleri

### 6.2 Ingestor arayüzü
Her modül için ayrı handler:
- `canHandle(fingerprint) -> score`
- `buildMapping(headers, sampleRows) -> mapping + confidence`
- `normalizeRow(row) -> normalized`
- `validateRow(normalized) -> issues[]`
- `writeRows(rows, options) -> result`

### 6.3 Sınıflandırma (Fingerprint + Skor)
Başlık ve veri örneklerinden skor üret:

Örnek:
- DosyaTakip: `talepTuru` + `durum` + `anaAsama` varsa skor çok yükselir.
- Firma: `vergiNoTC` + `tamUnvan` + `firmaIl` + `adres` varsa.
- YeniTeşvik: `bonusHesaplamalari`/bonus kolonları varsa.
- Makine-İthal: `birimFiyatiFob`/`gumrukDovizKodu` varsa.

Skor çıktısı:
- `confidence >= 0.85` → otomatik seç
- `0.6 - 0.85` → UI’da “muhtemelen X” göster + kullanıcı onayı iste
- `< 0.6` → “manuel seç” moduna düş

---

## 7) Kolon Eşleştirme (Mapping)

### 7.1 Synonym sözlüğü
Her hedef alan için:
- canonical field adı (backend DTO)
- olası kolon başlıkları (TR/EN varyasyonları, boşluk/noktalama farkları)

Örnek (Firma):
- `vergiNoTC`: `["vergi no", "vergi no/tc", "vkn", "tckn", "vergiNoTC"]`
- `tamUnvan`: `["ünvan", "unvan", "tam ünvan", "firma ünvanı"]`
- `firmaIl`: `["il", "şehir", "firma il"]`

### 7.2 Gemini (opsiyonel, sadece düşük güven durumunda)
Gemini’ye gönderilecek payload:
- headers listesi
- hedef modülün beklediği alan listesi
- 3-5 satır “maskeli örnek” (telefon/email/vergi no kısmen maskelenmiş)

Gemini çıktısı:
- önerilen mapping + gerekçe + confidence

Kural: Gemini önerisi **otomatik commit etmez**, kullanıcı önizlemede görür/onaylar.

---

## 8) Upsert / Dedup Kuralları

### 8.1 Firma
- Upsert anahtarı: `vergiNoTC` (unique)
- `firmaId` import edilse bile zorunlu değil; backend zaten üretebilir.

### 8.2 DosyaTakip
- Upsert anahtarı (öneri sırası):
  1) `takipId` (varsa)
  2) `belgeId + talepTuru + createdAt (yakınlık)` (fallback)

### 8.3 Tesvik/YeniTesvik
- Upsert anahtarı:
  - `tesvikId` (varsa) veya `gmId`
  - Yoksa: firma + belge tarihleri + belge no kombinasyonu (düşük güven)

### 8.4 Makine listesi
- Makine satırları için:
  - `rowId` yoksa: deterministic hash (gtipKodu + adiVeOzelligi + siraNo)
  - Import “belge bağlamı” gerektirir (hangi tesvikId/gmId’ye yazacağı net olmalı).

---

## 9) Frontend Tasarımı (Import Wizard)

Adımlar:
1) Dosya seç (xlsx/csv/pdf)
2) Sistem sınıflandırma sonucu göster (modül + alt-tip + confidence)
3) Kolon eşleştirme ekranı (drag/drop veya dropdown ile düzeltme)
4) Önizleme tablo + hata listesi
5) Commit / İptal

Ek:
- “Şablon indir” (her modül için) → kullanıcı doğru formatla veri hazırlasın.

---

## 10) PDF Desteği (Fazlandırma)

### Faz-1 (text-based PDF)
- pdfplumber ile text extraction
- tablosal veriler için heuristics

### Faz-2 (scanned PDF)
- OCR (tesseract) + layout parsing
- yüksek hata riski → mutlaka manual mapping/preview

---

## 11) Hata Yönetimi ve Raporlama

- Preview’da satır bazlı hatalar:
  - eksik zorunlu alanlar
  - invalid tarih/para formatı
  - enum uyuşmazlıkları (DosyaTakip durum kodu vb.)
- Commit’te:
  - başarısız satırlar için “hata CSV” indirilebilir
  - başarılı satırlar için Activity log (import kategorisi)

---

## 12) Uyum/Refactor Notları (mevcut koddan)

- Bazı endpoint’lerde `checkPermission('yonetici')` kullanımı görülüyor; `User.yetkiler` şemasında böyle bir alan yok.
  - Çözüm: `authorize('admin')` veya `yetkiler` şemasına uygun permission tanımı.
- Repo hijyeni:
  - `node_modules` ve `backend/.env` gibi dosyalar repoda kalmamalı.

---

## 13) Kabul Kriterleri (Acceptance Criteria)

1. Kullanıcı tek dosya yükleyerek “Firma” import edebilir; `vergiNoTC` ile upsert çalışır.
2. DosyaTakip import’unda `talepTuru/durum/anaAsama` doğru map edilir, preview’da enum hataları görünür.
3. Teşvik/YeniTeşvik import’unda dosya doğru sınıflanır (bonus alanları varsa YeniTeşvik).
4. Makine listesi import’unda yerli/ithal doğru ayrılır (FOB/döviz alanları).
5. Preview/commit ayrımı vardır; commit olmadan DB yazılmaz.
6. Hata CSV raporu üretilebilir.

---

## 14) Uygulama Planına Geçiş

Bu tasarım onaylandıysa bir sonraki adım:
1) Yazılım planı (dosya/dizin bazlı görevler)
2) Ardından implementasyon

