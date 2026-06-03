# Teşvik Makine Teçhizat Yönetimi Modülü

Yatırım teşvik belgelerindeki **yerli/ithal makine listelerinin** süreç takibini, kurumsal **SMTP mail** gönderimini, **7 günlük hatırlatmaları**, otomatik **klasör/evrak yönetimini** ve müşteri/tedarikçi için **public yükleme linklerini** yöneten modüldür.

> Bu modül mevcut sistemi **bozmadan**, üzerine bir **süreç katmanı** olarak eklenmiştir. Makine ana verisi (ad, GTİP, fiyat, adet) hâlâ `Tesvik` / `YeniTesvik` belgelerindeki gömülü `makineListeleri` alt-dökümanlarında **tek doğruluk kaynağı** olarak durur. Yeni koleksiyonlar bu satırlara kararlı `rowId` ile referans verir.

---

## 1. Mimari Özeti

| Katman | Dosya/Konum |
|---|---|
| Sabitler (tek merkez) | `backend/constants/tesvikMakineStatus.js`, `tesvikMakineMail.js` |
| Modeller (7+1) | `backend/models/MachineProcess.js`, `MailTemplate.js`, `MailLog.js`, `MachineProcessLog.js`, `DocumentFolder.js`, `UploadedDocument.js`, `ReminderJob.js`, `ParsedMinistryMail.js` |
| Servisler | `backend/services/tesvikMakine/*` (mail, storage, token, resolver, süreç, hatırlatma, parser, şablon) |
| Controller / Route | `backend/controllers/tesvikMakineController.js`, `tesvikEvrakUploadController.js` · `backend/routes/tesvikMakine.js`, `tesvikEvrakUpload.js` |
| Cron | `backend/server.js` → `setupCronJobs()` içinde günlük 08:00 hatırlatma |
| Frontend | `frontend/src/pages/TesvikMakine/*`, `frontend/src/services/tesvikMakineService.js` |

**Veri akışı:** Gömülü makine satırı → `certificateResolver` okur → `MachineProcess` (süreç/durum/mail/hatırlatma) → `MailLog`/`ReminderJob`/`UploadedDocument`/`DocumentFolder` + her kritik adımda `MachineProcessLog` (audit/timeline).

**API kök yolları:** `/api/tesvik-makine` (admin/consultant, auth'lu) · `/api/tesvik-evrak/:token` (public, auth'suz).

---

## 2. SMTP Nasıl Ayarlanır?

`backend/.env` dosyasına aşağıdaki değişkenleri girin (`.env.example` referans):

```env
SMTP_HOST=smtp.yandex.com
SMTP_PORT=587
SMTP_USER=info@firmaniz.com
SMTP_PASS=uygulama-sifresi
SMTP_FROM_NAME=GM Planlama Yatırım Danışmanlık
SMTP_FROM_EMAIL=info@firmaniz.com
SMTP_SECURE=false           # 465 → true, 587 → false
AUTO_SEND_ENABLED=false     # true → barkod girilince mail otomatik gider
REMINDER_DAYS=7
```

- SMTP boşsa sistem çalışmaya devam eder; mailler **taslak** olarak kaydedilir, gönderilmez.
- Bağlantıyı test etmek için (admin): `POST /api/tesvik-makine/smtp/test` `{ "to": "deneme@x.com" }`.
- SMTP hataları kullanıcıya **sade mesajla** döner (ham stack trace gösterilmez); ham hata sunucu logundadır.
- Gönderilen/başarısız her mail `MailLog`'a yazılır; başarısızlar arayüzde **"Tekrar Gönder"** ile yeniden denenir.

> **Not:** Eski `services/notificationService.js` hatalı `createTransporter` kullandığı için pasifti; bu modül kendi düzgün `createTransport` tabanlı `mailService`'ini kullanır, eskiye dokunmaz.

---

## 3. Depolama / Drive Nasıl Bağlanır?

Varsayılan: **local disk**. Dosyalar `backend/uploads/tesvik-evrak/...` altında klasör hiyerarşisiyle saklanır ve `/uploads` ile statik servis edilir.

```env
# Local (varsayılan) — ek ayar gerekmez
# TESVIK_UPLOAD_DIR=        # özel kök dizin (opsiyonel)
MAX_UPLOAD_MB=20

# Google Drive (opsiyonel)
DRIVE_ENABLED=false
GOOGLE_DRIVE_ROOT_FOLDER_ID=
# S3 (opsiyonel)
# S3_ENABLED=false
```

**Klasör yapısı** (her belge/makine için otomatik, idempotent):

```
Tesvikler/{Firma}/{BelgeNo}-{BelgeId}/
  01_Belge_Kunyesi/  02_Yerli_Makineler/  03_Ithal_Makineler/  04_Mail_Ekleri/  05_Genel_Evraklar/
  02|03_.../{SiraNo}_{MakineAdi}_{GTIP}/
    KDV_Muafiyet/ Proforma_Teklif/ Fatura_Taslak/ Fatura_Onayli/ Sevk_Teslimat/ Diger/
```

Dosya/klasör adları normalize edilir: Türkçe karakterler korunur, boşluk → `_`, path-güvensiz karakterler atılır, makine adı 80 karaktere kısaltılır, çakışan dosya adına `_2` eklenir.

**Drive'a geçiş:** `DRIVE_ENABLED=true` + `GOOGLE_DRIVE_ROOT_FOLDER_ID` ayarlanır. `storageService.getProvider()` sağlayıcıyı `drive` döndürür; Drive adaptörü implement edilene kadar sistem **otomatik local fallback** yapar (süreç durmaz). Adaptör, `storageService` içindeki `ensure*`/`saveBuffer` arayüzünü karşılayacak şekilde eklenebilir.

---

## 4. Makine Süreci Nasıl Başlatılır?

1. Sol menü → **Makine Teçhizat Takip** → `/tesvikler`.
2. Bir teşvik belgesine tıkla → **Makine Talepleri** sekmesi.
3. İlgili makine satırında **"İşlem"** butonu → modal açılır (süreç ilk açılışta otomatik oluşturulur).
4. Modalda:
   - **Tedarikçi** (firma, vergi no, mail, CC) ve **müşteri** (yetkili, mail) bilgilerini gir → **Kaydet**.
   - **Durum** seç → **Durumu Güncelle** (17 durumdan biri; istenildiği gibi değiştirilebilir).
   - **Mail Şablonu** seç → **Mail Önizle** → **SMTP ile Gönder**.
   - **Barkod / Otomasyon Kodu** gir → **Kodu Uygula** (aşağıdaki akış).
   - **Klasör Oluştur**, **Upload Link Üret**, **Evrak Yükle**, **Hatırlatmayı Durdur/Aç**.

### Bakanlık / Teşvik Otomasyon Kodu akışı
Barkod girilip **Kodu Uygula** denildiğinde:
1. Durum → `ministry_code_received`.
2. `supplier_verification_invoice_instruction` şablonu hazırlanır.
3. `AUTO_SEND_ENABLED` veya makinenin "Otomatik gönder" anahtarı açıksa **SMTP ile gönderilir**, durum → `verification_mail_sent`, gönderimden **+7 gün** sonrası için hatırlatma planlanır.
4. Kapalıysa mail **taslak** olarak bekletilir (`MailLog.status=draft`).
5. Aynı barkod başka makineye girilmişse **uyarı** verir (bloklamaz).

---

## 5. Hatırlatma Sistemi Nasıl Çalışır?

- Bir mail gönderildiğinde `nextReminderAt = gönderim + REMINDER_DAYS (7)` ve `ReminderJob (pending)` oluşur.
- **Cron** her gün **08:00 (Europe/Istanbul)** çalışır → vadesi gelmiş `pending` jobları işler (`reminderService.processDueReminders`).
- Bir job şu durumlarda **atlanır (skipped):**
  - Durum `completed` / `invoice_approved` / `cancelled`,
  - Makinede **"Hatırlatmayı durdur"** aktifse,
  - Son maildan sonra **evrak yüklenmiş** veya **durum değişmiş** (cevap algılandı).
- Aksi halde `reminder_no_response` maili **orijinal alıcılara** gönderilir, `MailLog`'a yazılır ve **bir sonraki 7 günlük** hatırlatma planlanır (üst üste yığılmaz).
- Manuel tetikleme (admin): `POST /api/tesvik-makine/reminders/run`.

---

## 6. Mail Şablonları Nereden Düzenlenir?

- 5 varsayılan şablon ilk açılışta DB'ye seed edilir (`MailTemplate` koleksiyonu): `supplier_verification_invoice_instruction`, `customer_document_request`, `supplier_info_request`, `reminder_no_response`, `invoice_draft_approved`.
- Listele (admin): `GET /api/tesvik-makine/templates`
- Düzenle (admin): `PUT /api/tesvik-makine/templates/:code` `{ name, subjectTemplate, bodyTemplate, isActive }`
- Placeholder formatı `{anahtar}`: `{firmaAdi} {makineAdi} {belgeNo} {belgeId} {belgeTarihi} {makineId} {siraNo} {tedarikciMail} {tedarikciVergiNo} {uploadLink} {mailTarihi} {imza}`.
- Gönderimden önce **eksik placeholder validasyonu** yapılır; eksikse gönderim engellenir ve eksik alanlar bildirilir.
- **İmza:** `MAIL_SIGNATURE` env ile override edilebilir; boşsa varsayılan (GM Planlama) imza kullanılır.

---

## 7. Public Evrak Yükleme (Müşteri/Tedarikçi)

- Her makine için **tahmin edilemez token** (256-bit) ile link üretilir: `/upload/tesvik/{token}` (opsiyonel süre: `UPLOAD_TOKEN_DAYS`).
- Müşteri linke girer → firma/belge/makine bilgisini görür, **evrak türü** seçer, dosya yükler (PDF/JPG/PNG/XLSX/DOCX, maks `MAX_UPLOAD_MB`).
- Dosya yalnızca **o makinenin klasörüne** yazılır; `UploadedDocument`'a kaydedilir; admin panelde **bildirim** olarak görünür (`GET /api/tesvik-makine/notifications`).
- KVKK: public ekran hassas veri (mail, vergi no) **göstermez**.

---

## 8. Gelen Bakanlık Maili Parser (opsiyonel)

- Gövde metnini ayrıştırır (`POST /api/tesvik-makine/parser/ingest` `{ text, autoApply }`): Makine Adı, GTİP, Barkod, Firma, Belge No/Id, Adres. Büyük/küçük harf ve Türkçe duyarsız; `Gtip / GTİP / G.T.İ.P` ve noktalı GTİP destekli.
- Belge No + Belge Id + GTİP + ad/barkod ile mevcut makine satırına **skorlu eşleştirme** yapar. Eşleşirse `autoApply` ile süreç oluşturulup barkod uygulanabilir.
- Eşleşmeyenler **"Eşleşmeyen Bakanlık Maili"** kuyruğuna düşer (`ParsedMinistryMail`); `POST /parser/queue/:id/link` ile elle bağlanır.
- **UI:** Sol menü → **Bakanlık Mail Ayrıştırma** (`/tesvikler/bakanlik-mail`): mail metnini yapıştır → ayrıştır/önizle → sisteme işle → kuyruğu gör → eşleşmeyeni **aday makinelerle** (`GET /parser/queue/:id/candidates`) elle bağla.
- **Gmail/IMAP** ileride bu `ingest()` fonksiyonuna bağlanacak şekilde tasarlandı (henüz IMAP fetcher bağlı değil; tetikleme metin/endpoint üzerinden).

> **Raporlar UI:** Sol menü → **Makine Raporları** (`/tesvikler/raporlar`): Firma bazlı, Tedarikçi bazlı bekleyen, KDV muafiyet bekleyen, Fatura taslağı bekleyen tabloları + **CSV/Excel export**.

---

## 9. Roller (KVKK / RBAC)

| Spec rolü | Sistem rolü | Yetki |
|---|---|---|
| admin | `admin` | tüm işlemler + şablon/SMTP/cron |
| consultant | `kullanici` | belge/makine/mail/evrak yönetimi (yazma) |
| viewer | `readonly` | yalnız görüntüleme |
| customer_upload | (giriş yok) | yalnız token linkinden yükleme |

Yazma uçları `admin`+`kullanici`, ayar uçları yalnız `admin`. Public upload auth gerektirmez, sadece geçerli token ile çalışır.

---

## 10. API Hızlı Referans

```
GET    /api/tesvik-makine/meta | /dashboard | /notifications
GET    /api/tesvik-makine/certificates?q=&tesvikModel=&page=&limit=
GET    /api/tesvik-makine/certificates/:model/:id (/machines|/mails|/documents|/reminders|/timeline)
POST   /api/tesvik-makine/process            # süreç oluştur/getir {tesvikModel,tesvikId,listType,rowId}
GET    /api/tesvik-makine/process/:id
PATCH  /api/tesvik-makine/process/:id/fields | /status
POST   /api/tesvik-makine/process/:id/barcode | /mail/preview | /mail/send | /folders | /upload-link | /upload
POST   /api/tesvik-makine/process/:id/reminders/stop | /resume
POST   /api/tesvik-makine/mail/:mailLogId/resend
POST   /api/tesvik-makine/bulk               # toplu: set_status|send_mail|create_folders|upload_link
GET    /api/tesvik-makine/reports/:type      # suppliers|kdv-waiting|invoice-draft-waiting|firms
GET/PUT/api/tesvik-makine/templates[/:code]  # şablonlar (PUT admin)
POST   /api/tesvik-makine/smtp/test | /reminders/run   # admin
POST   /api/tesvik-makine/parser/parse | /ingest ; GET /parser/queue
GET    /api/tesvik-makine/parser/queue/:id/candidates   # elle bağlama için aday makineler
POST   /api/tesvik-makine/parser/queue/:id/link ; DELETE /parser/queue/:id
GET/POST /api/tesvik-evrak/:token            # public yükleme (info / upload)
```

---

## 11. Testler

```bash
cd backend
npx jest tests/tesvikMakine        # 36 test: engine, parser, storage normalize, token,
                                   # durum geçişleri, barkod, SMTP-fail, evrak auto-advance,
                                   # hatırlatma skip, parser eşleştirme (mongodb-memory-server)
```

---

## 12. Makine Listesi Girişi / Import

Makineler mevcut **`Tesvik` / `YeniTesvik`** belgelerinin `makineListeleri` alanında tutulur ve mevcut teşvik formları/Excel-CSV import ekranlarıyla (`/api/tesvik-import`, `/api/eski-tesvik-import`) eklenir. Bu modül o listeleri **okur** ve üzerine süreç katmanı kurar; ayrı bir makine import'una gerek yoktur. Yeni belge/makine eklendiğinde `/tesvikler` listesinde otomatik görünür.
