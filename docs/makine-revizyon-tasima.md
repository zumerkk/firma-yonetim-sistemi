# Makine revizyon geçmişini ayrı depoya taşıma

Güncel makine listeleri teşvik belgesinde kalır; eski makine listelerinin her biri
`makinerevizyonkaydis` koleksiyonunda ayrı kayıt olarak saklanır. Büyük revizyon
geçmişinin aynı belgeyi büyütmesi ve MongoDB belge sınırına ulaşması önlenir.

Önce uygulamanın ayrı depoyu destekleyen sürümünü yayınlayın. Betik transaction
destekleyen replica set veya sharded MongoDB gerektirir. Veritabanı adresi
`backend/.env` içinden ya da `MONGODB_URI` ortam değişkeninden okunur.

## Kontrol ve taşıma

Proje kökünde salt okunur kontrol:

```sh
node backend/scripts/migrateMakineRevizyonlari.js
```

Tek belgeyi kontrol etmek veya taşımak için `--model Tesvik` / `--model YeniTesvik`
ve `--id <belge-kimligi>` ekleyin. Birden çok `--id` verilebilir.

Kontrol edilen belgeleri taşımak:

```sh
node backend/scripts/migrateMakineRevizyonlari.js --apply
```

Betik **ilk veritabanı yazımından önce** seçilen belgelerin tamamını ham BSON
Extended JSON olarak, sıkıştırılmış ve AES-256-GCM ile şifrelenmiş yerel arşive
yazar. Arşivin tümünü yeniden okuyup şifreleme doğrulamasını, kayıt sayısını ve
SHA-256 hash değerlerini denetler. Varsayılan yedek konumu kullanıcının ev
dizinindeki `.gmplansis-backups/makine-revizyon/` klasörüdür; `--backup-dir` ile
değiştirilebilir. Her çalışma klasörü 0700, arşiv ve anahtar 0600 izinlidir.
Arşiv ile anahtarı ayrı, güvenli konumlara da kopyalayın; ikisi birlikte olmadan
yedek geri okunamaz. Anahtar içeriğini günlüğe veya repoya koymayın.

Sonra belgeler sırayla, belge başına tek transaction içinde taşınır:

1. Yedekten sonra revizyon geçmişi değişmemiş olmalı.
2. Eski snapshot'ın bütün BSON alanları, tarihleri, kimlikleri ve dizi sırası
   korunarak ayrı depoya yazılır.
3. Kayıt adedi, sıra ve her snapshot'ın hash değeri karşılaştırılır.
4. Yalnız doğrulama başarılıysa gömülü geçmiş kaldırılır; belgeye
   `makineRevizyonDeposu: 'ayri'` ve sonraki revizyon için sıra sayacı yazılır.

Tekrar çalıştırmak mükerrer geçmiş üretmez. Kaynakta mükerrer/eksik revize
kimliği, değişen geçmiş veya ayrı depoda çelişen kayıt varsa işlem durur ve o
belgenin transaction'ı geri alınır. Önceden tamamlanan belgeler korunur; kalanlar
yeni bir yedekle tekrar taşınabilir. `--env-file` farklı bir ortam dosyasını seçer.

Normal elle ve otomatik ZIP yedekleri de yeni koleksiyonu
`makine_revizyon_kayitlari.json` dosyası olarak kapsar.

## Taşımayı geri alma

Betik çıktısındaki arşiv ve anahtar dosyalarının yollarıyla önce kontrol edin:

```sh
node backend/scripts/migrateMakineRevizyonlari.js --restore '/guvenli/yol/kaynak.jsonl.gz.enc' --key '/guvenli/yol/anahtar.key'
```

Kontrol başarılıysa aynı komuta `--apply` ekleyin. Geri alma yalnız revizyon
geçmişini, depo işaretini ve sıra sayacını yedekteki durumuna döndürür; belgenin
sonradan değiştirilen diğer alanlarını korur. Ayrı depodaki geçmiş taşıma
sonrasında değişmişse veya yeni revizyon eklenmişse üzerine yazmayı reddeder.
Bu durumda yeni geçmişi kapsayan kurtarma ayrıca planlanmalıdır.

Geri alma uygulamayı eski sürüme döndürmek için gerekiyorsa, önce güncel sürüm
çalışırken veriyi geri alın, ardından uygulama sürümünü geri döndürün.
