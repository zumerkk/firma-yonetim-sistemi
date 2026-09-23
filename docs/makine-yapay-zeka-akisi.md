# Makine listesi: görüntüden Excel’e aktarım

İlk aşamada mevcut Gemini hesabıyla, sistemin kendi Excel şablonunu kullanarak bir pilot yapılabilir. Gemini dosya/görsel yüklemeyi ve Excel çıktısı oluşturmayı destekliyor; bunlar tek başına verilerin doğru okunacağını garanti etmez. Kaynaklar: [Dosya yükleme](https://support.google.com/gemini/answer/14903178), [Dosya oluşturma](https://blog.google/innovation-and-ai/products/gemini-app/generate-files-in-gemini/).

1. Makine Listesi ekranından boş Excel şablonunu indirin.
2. E-TUYS Excel’i, aynı teşvik belgesinin görüntüleri ve boş şablonu birlikte yükleyin.
3. Şablonun “Nasıl Kullanılır” sayfasındaki yapay zekâ yönergesini gönderin.
4. Oluşturulan gerçek `.xlsx` dosyasını sistemin “İçe Aktar” düğmesiyle açın.
5. Kaydetmeden önce satır sayısı, makine kimliği, GTİP, kiralama, talep/sonuç tarihleri ve tutarları kontrol edin.

Uyumluluğu sağlayan şey modelin adı değil, sabit YERLİ/İTHAL sayfaları ve sistemin tanıdığı sütunlardır. Boş hücreler mevcut değerleri silmez. İçe aktarma önce makine kimliğine, kimlik bulunmadığında ada göre eşleştirir; benzer isimli makinelerde eşleştirmeyi ayrıca kontrol edin.

Pilot değerlendirmesinde yerli ve ithal listelerden örnekler seçip eksik/yanlış okunan alanları sayın. Başka modele geçme kararını bu örneklerle karşılaştırarak verin. Bu çalışmada müşteri belgeleri bir yapay zekâ servisine gönderilmedi; gerçek müşteri örnekleri üzerinde doğruluk ölçümü yapılmadı.

Doğrudan entegrasyon sonraki bir geliştirme olabilir: görüntü okuma → sabit alan yapısı → doğrulama → kullanıcı önizlemesi → kayıt. Mevcut değişiklik harici servis çağrısı veya ücretli API entegrasyonu içermez.
