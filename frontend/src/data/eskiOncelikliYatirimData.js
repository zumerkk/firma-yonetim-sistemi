// 🏆 ESKİ BELGE ÖNCELİKLİ YATIRIM TÜRLERİ — 2012/3305 sayılı BKK (Yatırımlarda Devlet Yardımları
// Hakkında Karar) md. 17 bentleri
//
// Müşteri (05.10.2026): "Öncelikli Yatırım - Evet ise çıkan seçenekler yeni ve eski belgede aynı
// görünüyor, yeni belge için şu an sistemdeki seçenekler çıksın, eski belge için 'eski belge
// öncelikli yatırım kodları' kısmına yüklediklerim çıksın."
// Kaynak: müşterinin yüklediği "eski belge öncelikli yatırım kodları.xlsx" (a … ff, 35 bent).
// Metinler aynen alındı; yalnız "(Değişik:RG-…)" / "(Ek:RG-…)" değişiklik notları atıldı.
// Mülga bentler listede kalır (o tarihten önce düzenlenmiş belgeler bu harfi taşıyabilir) ama
// seçilemez. Yeni belge listesi: oncelikliYatirimData.js (aynı harfler orada başka anlama gelir).

export const eskiOncelikliYatirimTurleri = [
  {
    id: 'a',
    baslik: 'Demiryolu, Denizyolu, Havayolu Taşımacılığı',
    aciklama: 'Demiryolu, denizyolu veya havayolu ile yük ve/veya yolcu taşımacılığına yönelik yatırımlar.'
  },
  { id: 'b', baslik: 'Mülga', aciklama: '', mulga: true },
  {
    id: 'c',
    baslik: 'OECD Orta-Yüksek / Yüksek Teknoloji Test Merkezi',
    aciklama: 'Ekonomik İşbirliği ve Kalkınma Teşkilatı (OECD) teknoloji yoğunluk tanımına göre orta yüksek ve yüksek teknolojili sanayi sınıfında yer alan ürünlere yönelik test merkezi yatırımları.'
  },
  {
    id: 'ç',
    baslik: 'Turizm Konaklama (KTKGB, Turizm Merkezi, Termal)',
    aciklama: 'Kültür ve Turizm Koruma ve Gelişim Bölgelerinde, Turizm Merkezlerinde veya termal turizm konusunda bölgesel desteklerden yararlanabilecek nitelikteki turizm konaklama yatırımları.'
  },
  { id: 'd', baslik: 'Mülga', aciklama: '', mulga: true },
  { id: 'e', baslik: 'Mülga', aciklama: '', mulga: true },
  {
    id: 'f',
    baslik: 'Savunma Sanayii Projeleri',
    aciklama: 'Savunma Sanayii Başkanlığından alınacak proje onayına istinaden gerçekleştirilecek savunma alanındaki yatırımlar.'
  },
  {
    id: 'g',
    baslik: 'Maden İstihraç ve/veya İşleme',
    aciklama: 'Maden istihraç yatırımları ve/veya maden işleme yatırımları (4/6/1985 tarihli ve 3213 sayılı Maden Kanununda tanımlanan I. grup madenler ve mıcır yatırımları ile İstanbul ilinde gerçekleştirilecek istihraç ve/veya işleme yatırımları hariç).'
  },
  {
    id: 'ğ',
    baslik: 'Özel Sektör Eğitim Yatırımları',
    aciklama: 'Özel sektör tarafından gerçekleştirilecek olan, kreş ve gündüz bakım evleri, okul öncesi eğitim, ilkokul, ortaokul ve lise eğitim yatırımları ile hava araçlarının kullanım, tamir ve bakımına yönelik eğitim yatırımları.'
  },
  {
    id: 'h',
    baslik: 'Ar-Ge Sonucu Geliştirilen Ürün Üretimi',
    aciklama: 'TÜBİTAK ve KOSGEB tarafından desteklenen Ar-Ge projeleri neticesinde geliştirilen ya da 5746 sayılı Araştırma, Geliştirme ve Tasarım Faaliyetlerinin Desteklenmesi Hakkında Kanun kapsamında Ar-Ge Merkezlerinde yürütülen Ar-Ge projesi sonucunda geliştirildiği Bakanlıkça görevlendirilen izleyici raporu veya varsa ilgili Değerlendirme ve Denetim Komisyonu kararı ile belgelenen ürünlerin veya parçaların üretimine yönelik yatırımlar.'
  },
  {
    id: 'ı',
    baslik: 'Motorlu Kara Taşıtları Ana Sanayi ve Motor',
    aciklama: 'Motorlu kara taşıtları ana sanayinde gerçekleştirilecek asgari 300 milyon TL tutarındaki yatırımlar ve asgari 75 milyon TL tutarındaki motor yatırımları ile asgari 20 milyon TL tutarındaki motor aksamları, aktarma organları/aksamları ve otomotiv elektroniğine yönelik yatırımlar.'
  },
  {
    id: 'i',
    baslik: '4-b Grubu Maden Girdili Elektrik Üretimi',
    aciklama: 'Enerji ve Tabii Kaynaklar Bakanlığı tarafından düzenlenen geçerli bir maden işletme ruhsatı ve izni kapsamında 3213 sayılı Maden Kanununun 2 nci maddesinin 4-b grubunda yer alan madenlerin girdi olarak kullanıldığı elektrik üretimi yatırımları.'
  },
  {
    id: 'j',
    baslik: 'Enerji Verimliliği (500 TEP, %15 Tasarruf)',
    aciklama: 'EK-4’te yer alan “Teşvik Edilmeyecek Yatırımlar” hariç olmak üzere, Enerji ve Tabii Kaynaklar Bakanlığının vereceği proje onayına istinaden, yıllık asgari 500 ton eşdeğer petrol (TEP) enerji tüketimi olan mevcut imalat sanayi tesislerinde gerçekleştirilecek, mevcut durumuna göre en az yüzde onbeş oranında enerji tasarrufu sağlayan enerji verimliliğine yönelik yatırımlar.'
  },
  {
    id: 'k',
    baslik: 'Atık Isıdan Elektrik Üretimi',
    aciklama: 'Atık ısı kaynaklı olarak, bir tesisteki atık ısıdan geri kazanım yolu ile elektrik üretimine yönelik yatırımlar (doğal gaza dayalı üretim tesisleri hariç).'
  },
  {
    id: 'l',
    baslik: 'LNG ve Yer Altı Doğal Gaz Depolama',
    aciklama: 'Asgari 50 milyon TL tutarındaki, sıvılaştırılmış doğal gaz (LNG) yatırımları ve yer altı doğal gaz depolama yatırımları.'
  },
  {
    id: 'm',
    baslik: 'Karbon Elyaf / Kompozit Malzeme',
    aciklama: 'Karbon elyaf üretimine veya karbon elyaf üretimi ile birlikte olmak kaydıyla karbon elyaftan mamul kompozit malzeme üretimine yönelik yatırımlar.'
  },
  {
    id: 'n',
    baslik: 'OECD Yüksek Teknolojili Ürün Üretimi',
    aciklama: 'Ekonomik İşbirliği ve Kalkınma Teşkilatı (OECD) teknoloji yoğunluk tanımına göre yüksek teknolojili sanayi sınıfında yer alan ürünlerin üretimine yönelik yatırımlar (US-97 Kodu: 2423, 30, 32, 33 ve 353).'
  },
  {
    id: 'o',
    baslik: 'Maden Arama Yatırımları',
    aciklama: 'Maden Kanununa istinaden düzenlenmiş geçerli Arama Ruhsatı veya Sertifikasına sahip yatırımcıların ruhsatlı sahalarında yapacağı maden arama yatırımları.'
  },
  {
    id: 'ö',
    baslik: 'Türbin, Jeneratör ve Rüzgar Kanadı İmalatı',
    aciklama: 'Yenilenebilir enerji üretimine yönelik türbin ve jeneratör imalatı ile rüzgar enerjisi üretiminde kullanılan kanat imalatı yatırımları.'
  },
  {
    id: 'p',
    baslik: 'Alüminyum Yassı Mamul Entegre Yatırımı',
    aciklama: 'Direk soğutmalı slab döküm ve sıcak haddeleme yöntemi ile alüminyum yassı mamul üretimine yönelik entegre yatırımlar.'
  },
  {
    id: 'r',
    baslik: 'Lisanslı Depoculuk',
    aciklama: 'Lisanslı depoculuk yatırımları.'
  },
  {
    id: 's',
    baslik: 'Nükleer Enerji Santrali',
    aciklama: 'Nükleer enerji santrali yatırımları.'
  },
  {
    id: 'ş',
    baslik: 'Laboratuvar Kompleksi',
    aciklama: 'Araştırma ve referans laboratuvarı, tüketici güvenliği ve enfeksiyon hastalıkları referans laboratuvarı, ilaç ve tıbbi cihaz analiz ve kontrol laboratuvarı ile deney hayvanları üretim test ve araştırma merkezi birimlerinin yer aldığı laboratuvar kompleksi yatırımları.'
  },
  {
    id: 't',
    baslik: 'Otomasyonlu Sera (25 Dekar ve Üzeri)',
    aciklama: 'Asgari 5 milyon TL tutarındaki 25 dekar ve üzeri yurtiçinde üretilen sera teknolojilerini de ihtiva eden otomasyona dayalı (bilgisayar kontrollü iklimlendirme, sulama, gübreleme ve ilaçlama sistemi ihtiva eden) sera yatırımları.'
  },
  { id: 'u', baslik: 'Mülga', aciklama: '', mulga: true },
  {
    id: 'ü',
    baslik: 'Çevre Lisansına Tabi Yatırımlar',
    aciklama: 'Çevre İzin ve Lisans Yönetmeliği kapsamında Çevre Lisansına tabi yatırımlar.'
  },
  {
    id: 'v',
    baslik: 'Yaşlı / Engelli Bakım Merkezi ve Wellness',
    aciklama: 'Asgari 5 milyon TL tutarındaki 100 kişi ve üzeri kapasiteli yaşlı ve/veya engelli bakım merkezleri ve esenlik tesisi (wellness) yatırımları.'
  },
  {
    id: 'y',
    baslik: 'EK-6 Konularında 500 Milyon TL ve Üzeri',
    aciklama: 'EK-6’da yer alan yatırım konularında gerçekleştirilecek asgari 500 milyon TL tutarındaki yatırımlar.'
  },
  {
    id: 'z',
    baslik: 'İhtisas Serbest Bölgede Yazılım ve Bilişim',
    aciklama: 'Asgari yatırım tutarı şartı aranmaksızın ihtisas serbest bölgelerinde gerçekleştirilecek yazılım ve bilişim ürünleri üretimi yatırımları.'
  },
  {
    id: 'aa',
    baslik: 'Elektrikli / Hidrojenli Ulaşım Aracı İmalatı',
    aciklama: 'Asgari 50 milyon TL tutarındaki elektrik veya hidrojenle çalışan ulaşım araçları imalatını da içeren sanayi tesisi yatırımları.'
  },
  {
    id: 'bb',
    baslik: 'Ar-Ge ve Çevre Yatırımları',
    aciklama: 'AR-GE ve çevre yatırımları.'
  },
  {
    id: 'cc',
    baslik: 'Veri Merkezi Yatırımları',
    aciklama: 'Bakanlık tarafından ilan edilecek uluslararası teknik standartları karşılayan ve asgari 5.000 m2 beyaz alan şartını sağlayan veri merkezi yatırımları.'
  },
  {
    id: 'dd',
    baslik: 'Sismik İzolasyon Kauçuk Kolon Üretimi',
    aciklama: 'US-97 kodu 2519.0.04 olan vulkanize edilmiş kauçuktan taşıyıcı kolonlar ve transmisyon kolonları üretimine yönelik yatırımlar (depremde hasar önleyici sismik izolasyon cihazı, epoksi kaplı öngerme halatı vb.).'
  },
  {
    id: 'ee',
    baslik: 'Dijital Dönüşüm Destek Programı',
    aciklama: 'Dijital Dönüşüm Destek Programı kapsamındaki yatırımlar.'
  },
  {
    id: 'ff',
    baslik: 'Yeşil Dönüşüm Destek Programı',
    aciklama: 'Yeşil Dönüşüm Destek Programı kapsamındaki yatırımlar.'
  }
];
