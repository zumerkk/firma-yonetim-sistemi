# Akıllı Import (Excel/CSV) — Kullanım Notları (MVP / Phase-1)

Bu doküman, **Akıllı Veri Yükleme** özelliğinin (Phase-1) nasıl kullanılacağını ve hangi dosya formatlarını desteklediğini anlatır.

> Phase-1 kapsamı: **Firma** + **Dosya Takip** (Excel/CSV).  
> Teşvik / Yeni Teşvik / Makine listeleri Phase-2/3 kapsamındadır.

---

## 1) Güvenlik (kritik)

- LLM/Gemini anahtarını **asla** frontend’e koymayın ve repoya commit etmeyin.
- Anahtar sadece backend ortam değişkeni olmalıdır:
  - `GEMINI_API_KEY=...`
- Bu özellikte Gemini **zorunlu değildir**; yalnızca “kolon eşleştirme” konusunda düşük güven durumunda *öneri* üretmek için kullanılacaktır.

---

## 2) Çalıştırma

### 2.1 Backend

Backend `.env` dosyanıza şunları ekleyin:

```bash
GEMINI_API_KEY=...          # opsiyonel (mapping fallback)
```

Ardından backend’i başlatın:

```bash
cd backend
npm run dev
```

### 2.2 Frontend

```bash
cd frontend
npm start
```

---

## 3) UI’dan kullanım (Import Wizard)

1. Uygulamaya login olun.
2. Sol menüden **“Import Sihirbazı”** sayfasına gidin (`/import`).
3. `.xlsx` / `.csv` dosyasını seçin.
4. **Önizleme** butonuna basın:
   - Sistem dosyayı sınıflandırır (Firma mı / Dosya Takip mi?)
   - Kolonları otomatik eşler
   - `previewId` üretir
5. **Onayla ve Kaydet**:
   - Sistem satır satır validate eder
   - Geçenleri create/upsert eder
   - Hatalıları response içinde `errors[]` olarak döner

---

## 4) API’dan kullanım

### 4.1 Preview

`POST /api/ingest/preview` (multipart/form-data)

- Body:
  - `file`: xlsx/csv

Yanıt:
- `classification`: `{ module, confidence, reasons }`
- `mapping`: `{ "KaynakKolon": "hedefAlan" }`
- `ingestSessionId`: commit için gerekli id
- `rowPreview`: ilk satırlar

### 4.2 Commit

`POST /api/ingest/commit` (JSON)

```json
{
  "ingestSessionId": "....",
  "mappingOverrides": {},
  "mode": "upsert"
}
```

Yanıt:
- `created`, `updated`, `errorsCount`, `errors[]`

---

## 5) Dosya formatı (minimum) — Örnekler

> Kolon adları kısmen esnektir; synonym sözlüğü ile farklı başlıklar map edilebilir.

### 5.1 Firma CSV örneği

Zorunlu alanlar (Phase-1 validate):
- `vergiNoTC`
- `tamUnvan`
- `adres`
- `firmaIl`
- `ilkIrtibatKisi`

Örnek:

```csv
VKN,Ünvan,Adres,İl,İlçe,İlk İrtibat Kişisi,KEP
1234567890,Örnek A.Ş.,İstanbul Avcılar ...,İSTANBUL,AVCILAR,Ali Veli,ornek@hs01.kep.tr
```

### 5.2 Dosya Takip CSV örneği

Zorunlu alanlar (Phase-1 validate):
- `talepTuru`
- `durum`
- `anaAsama`

Ek olarak, `firma` referansı bulunabilmesi için **en az bir tanesi** önerilir:
- `firmaId` veya `vergiNoTC` veya `firmaUnvan`

Örnek:

```csv
takipId,talepTuru,durum,anaAsama,firmaUnvan
DT-0001,Revize Talebi,2.1.1_GORUSULUYOR,2.1,Örnek A.Ş.
```

---

## 6) Sık karşılaşılan problemler

1) **“firma not found” (Dosya Takip import’unda)**
- DosyaTakip modelinde `firma` zorunlu olduğu için, sistem `firmaId/vergiNoTC/firmaUnvan` üzerinden firma bulamazsa satır hataya düşer.

2) **Tarih formatı**
- CSV’de tarih kolonları varsa ISO format (`YYYY-MM-DD`) tercih edin.

3) **Büyük dosyalar**
- Preview session Phase-1’de payload satırlarını sınırlayabilir (ör. 2000 satır). Büyük import için chunk upload planlanacaktır.

