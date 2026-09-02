# ETUYS Ekran Görüntüleri — Tasarım Referansı

Bu klasör **madde 6 (arayüz sadeleştirme)** için referans malzemesidir.
Müşteri: *"Genel olarak bütün arayüzü sadeleştirelim, ETUYS kopyası gibi olmasını istiyoruz."*

Kaynak: T.C. Sanayi ve Teknoloji Bakanlığı **ETUYS** portalı
(ST TURKUAZ TURİZM YATIRIMLARI A.Ş., belge no 578589, 830 makine kalemi).

## Neden repoda duruyor

Yenileme 4–6 aya yayılıyor ve her ekran çizilirken "ETUYS'te bu nasıl?" sorusu
tekrar soruluyor. Görüntüler sohbette kalırsa kayboluyor; burada kalıcı.

## Çıkarılan kurallar

Ayrıntılı hali Faz 1 tasarım dili belgesinde; kodda karşılığı
`frontend/src/tasarim/jetonlar.js`.

| Kural | ETUYS'te |
|---|---|
| İki kademeli sekme | Üstte kapatılabilir çalışma sekmeleri, altta belge bölümleri |
| Bölüm sekmeleri | 10 adet, **sabit sırada** (aşağıda) |
| Sol panel | "İşlemler" — katlanabilir gruplar, kalıcı |
| Form | İki sütun; etiket sol, kutulu değer sağ; 4px satır aralığı |
| **Sarı zemin** | **Hesaplanan/yazılamaz alan** *ve* **seçili satır** — aynı sarı |
| Panel | İkon + başlık şeridi + sağda katlama düğmesi |
| Araç çubuğu | Panel altında ikonlu metin eylemleri |
| Sayfalama | `⏮ ◀ Sayfa [n]/[m] ▶ ⏭` + "Gösterilen Kayıtlar a – b / c" |
| Tablo | Gri başlık, ince çizgi, **zebra yok**, taşan metin kırpılır |
| Sayı | Binlik **nokta**, ondalık **virgül** — `1.840.000,00` |
| Eylem şeridi | Formun altında gri şerit (Kaydet / Güncelle) |
| Modal | Küçük, ortalanmış, altta tek "Kapat" |
| Durum çubuğu | Altta: kullanıcı · firma · yetki bitiş tarihi |
| **Olmayanlar** | Gradyan, gölge, yuvarlak köşeli kart, emoji |

## Sekme sırası (değiştirilmeyecek)

Kullanıcı kararı: ETUYS'ünki aynen korunacak. Kullanıcılar bu sırayı bakanlık
sisteminde ezberlemiş; "en sık kullanılanı öne al" optimizasyonu kas hafızasını bozar.

1. Belge Künye Bilgileri
2. Yatırım Cinsi ← *bizde ayrı bölüm olarak YOK, künye içinde dağınık*
3. Ürün Bilgileri
4. Yerli Liste
5. İthal Liste
6. Finansal Bilgiler
7. Özel Şartlar
8. Destek Unsurları
9. Proje Tanıtımı
10. Evrak Listesi

## Ayrıca

`BAYRAMÖZEL_ÖRNEK/` klasöründe daha eski bir belgeye (516931) ait 16 görüntü daha var.
