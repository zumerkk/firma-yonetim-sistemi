# Örnek / şablon dosyalar (İşlem & Evrak modülü)

Bu klasördeki dosyalar, "İşlem & Evrak" modülünde firmaya gönderilen evrak talebi
mailine **otomatik ek** olarak iliştirilir.

## Beklenen dosyalar

| Dosya adı (ASCII, birebir)        | Bağlandığı evrak kalemi              |
|-----------------------------------|--------------------------------------|
| `ETUYS_Taahhutnamesi_Sahis.docx`  | E-TUYS Taahhütnamesi (Şahıs)         |
| `ETUYS_Taahhutnamesi_Sirket.docx` | E-TUYS Taahhütnamesi (Şirket)        |

Eşleştirme `backend/services/islemEvrak/seedIslemTurleri.js` içindeki
`ORNEK_TAAHHUTNAME` sabitinde tanımlıdır. Firmanın mailde göreceği ad oradaki
`dosyaAdi` alanından gelir (Türkçe karakter serbest); buradaki **dosya adı ASCII
olmalıdır** — macOS (NFD, harf duyarsız) ile Render/Linux (NFC, harf duyarlı)
arasında ad kayması yaşanmasın diye.

## Neden repoda tutuluyor?

Render free plan'de kalıcı disk yok; çalışma anında yüklenen dosyalar ilk
yeniden başlatmada siliniyor. Repoda tutulan dosyalar her deploy build'inde
yeniden oluşur. `.gitignore`'daki global `*.docx` kuralına bu klasör için dar
kapsamlı bir istisna eklenmiştir.

## Dosya eksikse ne olur?

`islemEvrakService.mailGonder` diskte olmayan eki **atlar** ve uyarı loglar;
mail gönderimi eksiksiz devam eder (eski davranışta nodemailer ENOENT fırlatıp
tüm gönderimi düşürüyordu).

Sunucu her açılışta `ornekDosyalariBagla()` çalıştırır: yalnızca `ornekDosya`
alanı **boş** olan taahhütname kalemlerini doldurur, kullanıcının arayüzden
yüklediği kendi örnek dosyasını asla ezmez.
