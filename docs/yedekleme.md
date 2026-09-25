# Yedekleme

> Müşteri (25.09.2026): *"Verilerimizin yedeklenmesi ile ilgili nasıl tedbir alabiliriz,
> oto yedekleme vs gibi ne yapabiliriz?"*

## Ne yedekleniyor

| Katman | Nerede | Nasıl |
|---|---|---|
| **Veritabanı** (27 koleksiyon, ~31 bin kayıt, sıkıştırılmış ~22 MB) | MongoDB Atlas | Her gece 03:30'da ZIP olarak Google Drive'a |
| **Evraklar** (1134 dosya, ~616 MB) | Cloudinary | Her gece artımlı: Drive'da olmayanlar kopyalanır |
| **Elle yedek** | — | Ayarlar → "Sistemi Yedekle" → ZIP indirir (her zaman çalışır) |

Yedek ZIP'i her koleksiyonu ayrı bir JSON dosyası olarak içerir, ayrıca `metadata.json`
içinde kayıt sayıları ve varsa eksikler yazar. Evraklar Drive'da `evraklar/` klasöründe
`kaynak_dosyaadi` biçiminde durur; hangi dosyanın hangi belgeye ait olduğu veritabanı
yedeğindeki kayıtlardan çözülür.

**Saklama:** veritabanı yedeklerinin son 30 günü tutulur (`YEDEK_SAKLAMA_GUN`), eskiler
otomatik silinir. Evrak kopyaları silinmez.

## Kurulum (tek seferlik, ~10 dakika)

Yedek, dosyaları **sizin Google hesabınızın** Drive alanına yazar. Servis hesabı
kullanılmadı: servis hesaplarının kendi depolama kotası yoktur ve kişisel bir klasöre
yüklerken *"Service Accounts do not have storage quota"* hatası verirler.

### 1. Drive'da klasör açın
Drive'da `GM Plansis Yedek` adında bir klasör açın. Adres çubuğundaki
`https://drive.google.com/drive/folders/**BURASI**` kısmı klasör kimliğidir, not edin.

### 2. Google'da uygulama tanımlayın
1. [console.cloud.google.com](https://console.cloud.google.com) → yeni proje (ör. `gm-yedek`)
2. **APIs & Services → Library** → "Google Drive API" → **Enable**
3. **OAuth consent screen** → External → uygulama adı yazın → *Test users* kısmına yedeğin
   yazılacağı Google hesabını ekleyin
4. **Credentials → Create credentials → OAuth client ID → Desktop app** → Client ID ve
   Client Secret'ı kopyalayın

### 3. Yenileme tokenı alın
Proje klasöründe:

```bash
cd backend && GOOGLE_OAUTH_CLIENT_ID=<client-id> GOOGLE_OAUTH_CLIENT_SECRET=<client-secret> node scripts/driveYetkiAl.js
```

Ekrandaki adresi tarayıcıda açıp onaylayın, çıkan kodu yapıştırın. Betik size Render'a
eklenecek değerleri basar.

### 4. Render'a ekleyin
Render → `cahit-firma-backend` → **Environment**:

```
GOOGLE_OAUTH_CLIENT_ID=...
GOOGLE_OAUTH_CLIENT_SECRET=...
GOOGLE_OAUTH_REFRESH_TOKEN=...
YEDEK_DRIVE_KLASOR_ID=...
```

İsteğe bağlı ayarlar: `YEDEK_SAKLAMA_GUN` (varsayılan 30), `YEDEK_EVRAK_ADET` (bir gecede
en fazla kaç evrak, varsayılan 1000), `YEDEK_EVRAK_SURE_SN` (evrak kopyalama bütçesi,
varsayılan 1200 sn).

### 5. İlk yedeği elle çalıştırın
Servis yeniden başladıktan sonra, admin oturumuyla:

```bash
curl -X POST https://api.gmplansis.com/api/backup/drive -H "Authorization: Bearer <token>"
```

İlk turda 616 MB evrak kopyalanacağı için bütçe dolabilir; kalanları ertesi gece
kendiliğinden tamamlar (ya da komutu tekrar çalıştırın).

## Doğrulama

- `GET /api/backup/durum` (admin) son 10 çalışmayı, son başarılı yedeğin tarihini ve
  yedeklenmiş evrak sayısını verir.
- Açılış logunda `🌙 Otomatik yedek AÇIK (oauth)` yazmalı. Yapılandırılmamışsa üretimde
  `⚠️ OTOMATİK YEDEK KAPALI` uyarısı basılır.

## Geri yükleme

Yedek, geri yüklenebildiği kanıtlanana kadar yedek sayılmaz. Yılda birkaç kez deneyin:

1. Drive'dan son `GM_Veritabani_*.zip` dosyasını indirin, açın.
2. Boş bir test veritabanı açın (Atlas'ta yeni bir database ya da yerel `mongod`).
3. Her JSON dosyasını ilgili koleksiyona aktarın:
   ```bash
   mongoimport --uri "<test-uri>" --collection firmas --jsonArray --file firmalar.json
   ```
   (dosya→koleksiyon eşlemesi `backend/services/yedek/veritabaniArsivi.js` içindeki
   `KOLEKSIYONLAR` listesindedir)
4. Evraklar Drive'daki `evraklar/` klasöründedir; kayıtlardaki adresler eski Cloudinary
   adresleridir, gerçek bir geri dönüşte dosyaların yeniden yüklenip adreslerin
   güncellenmesi gerekir.

## Ayrıca yapılması önerilen

- **Atlas'ın kendi yedeği:** Atlas → Cluster → **Backup** sekmesinden Cloud Backup'ın açık
  olduğunu doğrulayın. Bu, saat bazında geri dönüş (point-in-time) sağlar ve buradaki
  gece yedeğinden daha hızlı bir kurtarma yoludur. İkisi birbirinin yerine geçmez:
  Atlas hesabına erişimi kaybederseniz Drive'daki kopya elinizde kalır.
- **Dosya Yöneticisi (`/api/files`)** hâlâ sunucunun uçucu diskine yazıyor; oraya yüklenen
  dosyalar her yeniden başlatmada siliniyor ve bu yedeğe de girmiyor. Ayrı bir iş olarak
  bulut depoya taşınmalı.
