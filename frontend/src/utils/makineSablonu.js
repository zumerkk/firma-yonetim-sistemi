// 📗 MAKİNE LİSTESİ EXCEL ŞABLONU — içe aktarma sözlüğü + boş şablon tanımı
//
// Müşteri: "Etuys'dan gerçekleşme dosyasını direkt yüklediğimizde tutarları
// getirmiyor veya dışa aktardığımız dosyayı düzenleyip içe aktarınca yine
// getirmiyor. Her şeyi excelde düzenleyebileceğimiz boş bir şablon lazım içe
// aktarınca aktarsın hepsini. En önemlisi tarihler."
//
// KÖK SEBEP — dışa aktarma ve içe aktarma AYRI başlık isimleri kullanıyordu:
//     dışa aktarma yazıyor:  "Gerç. Adet"      "Gerç. Tutar"    "Müracaat Tar."
//     içe aktarma arıyor:    "Gerçekleşen Adet" "Gerçekleşen Tutar " (sondaki
//                            boşluk dahil)     — tarihleri ise HİÇ okumuyordu.
// Bu yüzden kendi çıktımızı düzenleyip geri yüklemek gerçekleşme tutarlarını ve
// tarihleri getirmiyordu; kullanıcı sessizce veri kaybediyordu.
//
// Burası tek doğruluk kaynağı: hem boş şablonun başlıkları hem içe aktarmanın
// tanıdığı adlar buradan geliyor, bir daha ayrışamazlar.

// TR biçimli sayıyı ("1.234,56") sayıya çevirir. Excel hücresi zaten sayıysa
// olduğu gibi döner.
export const sayiCoz = (deger) => {
  if (deger === null || deger === undefined || deger === '') return 0;
  if (typeof deger === 'number') return Number.isFinite(deger) ? deger : 0;
  // Para birimi eki, boşluk vb. at; yalnız rakam ve ayraçlar kalsın
  const s = String(deger).trim().replace(/[^0-9.,-]/g, '');
  if (!s) return 0;

  let normal;
  if (s.includes(',') && s.includes('.')) {
    // Sonda gelen ayraç ONDALIKTIR: "1.234,56" (TR) · "1,234.56" (EN)
    normal = s.lastIndexOf(',') > s.lastIndexOf('.')
      ? s.replace(/\./g, '').replace(',', '.')
      : s.replace(/,/g, '');
  } else if (s.includes(',')) {
    normal = s.replace(',', '.');                 // "1234,56" → ondalık
  } else if (s.includes('.')) {
    // Yalnız nokta var: BELİRSİZ. "1.234.567" binlik, "12.5" ondalık.
    // Kural: ilkinden sonraki her grup tam 3 haneliyse binlik ayracıdır.
    // Bu ayrım önemli — "1.234.567" ondalık sayılırsa NaN olup 0'a düşüyordu
    // ve kullanıcı tutarın sıfırlandığını ancak kaydettikten sonra görüyordu.
    const parcalar = s.split('.');
    const binlik = parcalar.length > 1 && parcalar.slice(1).every((p) => p.length === 3);
    normal = binlik ? parcalar.join('') : s;
  } else {
    normal = s;
  }

  const n = Number(normal);
  return Number.isFinite(n) ? n : 0;
};

// Excel'den gelen tarihi ISO (yyyy-mm-dd) metne çevirir.
// Üç biçim geliyor: gerçek Date nesnesi, "31.05.2027" metni, Excel seri numarası.
export const tarihCoz = (deger) => {
  if (deger === null || deger === undefined || deger === '') return '';
  if (deger instanceof Date && !Number.isNaN(deger.getTime())) {
    return deger.toISOString().slice(0, 10);
  }
  // Excel seri numarası (1900 tabanlı). 20000 ≈ 1954, 60000 ≈ 2064 — makul aralık.
  if (typeof deger === 'number' && deger > 20000 && deger < 60000) {
    const ms = Math.round((deger - 25569) * 86400 * 1000);
    const d = new Date(ms);
    return Number.isNaN(d.getTime()) ? '' : d.toISOString().slice(0, 10);
  }
  const s = String(deger).trim();
  if (!s) return '';
  // 31.05.2027 / 31/05/2027 / 31-05-2027
  const tr = s.match(/^(\d{1,2})[./-](\d{1,2})[./-](\d{4})$/);
  if (tr) return `${tr[3]}-${tr[2].padStart(2, '0')}-${tr[1].padStart(2, '0')}`;
  // 2027-05-31
  const iso = s.match(/^(\d{4})[./-](\d{1,2})[./-](\d{1,2})$/);
  if (iso) return `${iso[1]}-${iso[2].padStart(2, '0')}-${iso[3].padStart(2, '0')}`;
  return '';
};

// Gerçekleşme ve karar alanları — müşterinin kayıp dediği kısım.
// `baslik` boş şablonda yazılacak ad; `adlar` içe aktarmada TANINACAK tüm adlar
// (dışa aktarımın kullandıkları ve ETUYS dosyasındakiler dahil).
export const GERCEKLESME_SUTUNLARI = [
  {
    alan: 'gerceklesenAdet', tip: 'sayi', baslik: 'Gerçekleşen Adet',
    adlar: ['Gerçekleşen Adet', 'Gerç. Adet', 'Fatura Gerçekleşen Miktar', 'Gerceklesen Adet']
  },
  {
    alan: 'gerceklesenTutar', tip: 'sayi', baslik: 'Gerçekleşen Tutar',
    // 'Gerçekleşen Tutar ' — sondaki boşluk eski dosyalarda gerçekten var
    adlar: ['Gerçekleşen Tutar', 'Gerçekleşen Tutar ', 'Gerç. Tutar', 'Fatura Gerçekleşen Değer', 'Gerceklesen Tutar']
  },
  {
    alan: 'talepTarihi', tip: 'tarih', baslik: 'Talep Tarihi',
    adlar: ['Talep Tarihi', 'Müracaat Tar.', 'Müracaat Tarihi', 'T.Tarih', 'Talep Tar.']
  },
  {
    alan: 'kararTarihi', tip: 'tarih', baslik: 'Karar Tarihi',
    adlar: ['Karar Tarihi', 'Onay Tarihi', 'K.Tarih', 'Karar Tar.']
  },
  {
    alan: 'talepAdedi', tip: 'sayi', baslik: 'Talep Adedi',
    adlar: ['Talep Adedi', 'Talep Ad.', 'İstenen Adet']
  },
  {
    alan: 'onaylananAdet', tip: 'sayi', baslik: 'Onaylanan Adet',
    adlar: ['Onaylanan Adet', 'Onay. Adet']
  }
];

/**
 * Bir Excel satırından gerçekleşme/karar alanlarını çözer.
 * Sadece DOLU olanları döner — boş hücre mevcut değeri ezmesin.
 */
export function gerceklesmeCoz(satir) {
  const cikti = {};
  for (const sutun of GERCEKLESME_SUTUNLARI) {
    const anahtar = sutun.adlar.find((ad) => satir?.[ad] !== undefined && satir?.[ad] !== '');
    if (!anahtar) continue;
    const ham = satir[anahtar];
    const deger = sutun.tip === 'tarih' ? tarihCoz(ham) : sayiCoz(ham);
    // 0 geçerli bir gerçekleşme değeri; boş tarih değil
    if (sutun.tip === 'tarih' ? deger : deger !== null) cikti[sutun.alan] = deger;
  }
  return cikti;
}

// Boş şablonun başlıkları. Kimlik sütunları + gerçekleşme sütunları.
// Kullanıcı bunu indirip Excel'de doldurup geri yüklüyor.
const KIMLIK_SUTUNLARI_ORTAK = ['Sıra No', 'Makine ID', 'GTIP No', 'GTIP Açıklama', 'Adı ve Özelliği', 'Miktarı', 'Birimi'];

export const SABLON_BASLIKLARI = {
  yerli: [
    ...KIMLIK_SUTUNLARI_ORTAK,
    'Birim Fiyatı (TL)', 'Toplam Tutar (TL)', 'KDV Muafiyeti Var Mı?', 'Makine Teçhizat Tipi',
    ...GERCEKLESME_SUTUNLARI.map((s) => s.baslik)
  ],
  ithal: [
    ...KIMLIK_SUTUNLARI_ORTAK,
    'Birim Fiyatı (FOB)', 'Menşe Döviz Kodu', 'Toplam Tutar (FOB $)', 'Toplam Tutar (FOB TL)',
    'KULLANILMIŞ MAKİNE', 'CKD/SKD', 'Araç Mı?', 'Makine Teçhizat Tipi',
    ...GERCEKLESME_SUTUNLARI.map((s) => s.baslik)
  ]
};
