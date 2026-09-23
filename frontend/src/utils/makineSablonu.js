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
// Müşteri (21.09.2026): "Listeleri içe aktarmak için standart boş bir Excel şablonu
// oluşturabilir miyiz? ... mak_list_sablon.xlsx adında örnek bir dosya ve E-TUYS ekran
// görüntülerini de ekledim, o tarz bir yapı kurabilirsek harika olur."
// Müşterinin şablonu "YERLİ" / "İTHAL" sayfalarından ve E-TUYS'a benzeyen büyük harfli
// başlıklardan oluşuyor ("SIRA NO", "MAKINE ID ", "ADI VE ÖZELLİİĞİ", "KDV İSTİNASI",
// "G. ADET", "SONUÇ TARİH"...). Eski içe aktarıcı başlıkları BİREBİR arıyordu ("Adı ve
// Özelliği") ve "YERLİ" sayfasını bulamıyordu: o şablonla tek satır gelmezdi. Kendi dışa
// aktarımımızın başlıklarının yarısı da ("KDV Muafiyeti", "Birim Fiyatı (FOB)", "Döviz",
// "Kullanılmış") tanınmıyor, boş sayılıp mevcut değerin üzerine varsayılan yazılıyordu.
//
// Şimdi başlıklar NORMALLEŞTİRİLEREK eşleniyor (büyük/küçük harf, Türkçe karakter, boşluk
// ve noktalama fark etmez) ve her alanın bilinen bütün adları aşağıdaki tek tabloda.
// Burası tek doğruluk kaynağı: boş şablonun başlıkları da içe aktarmanın tanıdığı adlar
// da buradan geliyor, bir daha ayrışamazlar.

import * as XLSX from 'xlsx';
import { BIRIM_KODLARI, KULLANILMIS_KODLARI, kullanilmisKoduNormalle } from './makineFormat';

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

const ikiHane = (s) => String(s).padStart(2, '0');
const gecerliGun = (y, a, g) => Number(a) >= 1 && Number(a) <= 12 && Number(g) >= 1 && Number(g) <= 31;

// Excel'den gelen tarihi ISO (yyyy-mm-dd) metne çevirir.
// Üç biçim geliyor: gerçek Date nesnesi, "31.05.2027" metni, Excel seri numarası.
// E-TUYS tarihleri saatli yazıyor ("26-05-2022 03:00:00"); saat kısmı yok sayılır.
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
  // 31.05.2027 / 31/05/2027 / 31-05-2027 (ardından saat gelebilir)
  const tr = s.match(/^(\d{1,2})[./-](\d{1,2})[./-](\d{4})(?:[ T].*)?$/);
  if (tr) return gecerliGun(tr[3], tr[2], tr[1]) ? `${tr[3]}-${ikiHane(tr[2])}-${ikiHane(tr[1])}` : '';
  // 2027-05-31
  const iso = s.match(/^(\d{4})[./-](\d{1,2})[./-](\d{1,2})(?:[ T].*)?$/);
  if (iso) return gecerliGun(iso[1], iso[2], iso[3]) ? `${iso[1]}-${ikiHane(iso[2])}-${ikiHane(iso[3])}` : '';
  return '';
};

// ── Başlık eşleme ────────────────────────────────────────────────────────────

const TR_HARF = { 'Ç': 'C', 'Ğ': 'G', 'İ': 'I', 'Ö': 'O', 'Ş': 'S', 'Ü': 'U', 'Â': 'A', 'Î': 'I', 'Û': 'U' };

/**
 * Başlığı karşılaştırma anahtarına çevirir: "MAKINE ID ", "Makine ID" ve "makine-id" aynı
 * anahtarı verir. "$" USD sayılır ki "TOPLAM TUTAR $" ile "TOPLAM TUTAR TL" ayrışsın.
 */
export const basligiNormallestir = (ad) => String(ad ?? '')
  .replace(/\$/g, 'USD')
  .toLocaleUpperCase('tr-TR')
  .replace(/[ÇĞİÖŞÜÂÎÛ]/g, (h) => TR_HARF[h])
  .normalize('NFKD').replace(/[\u0300-\u036f]/g, '')
  .replace(/[^A-Z0-9]/g, '');

const bosMu = (v) => v === undefined || v === null || (typeof v === 'string' && v.trim() === '');

// Gerçekleşme ve karar alanları — müşterinin kayıp dediği kısım.
// `baslik` eski şablonun adı; `adlar` içe aktarmada TANINACAK tüm adlar
// (dışa aktarımın, E-TUYS dosyasının ve müşteri şablonunun kullandıkları dahil).
export const GERCEKLESME_SUTUNLARI = [
  {
    alan: 'gerceklesenAdet', tip: 'sayi', baslik: 'Gerçekleşen Adet',
    adlar: ['Gerçekleşen Adet', 'Gerç. Adet', 'G. ADET', 'Fatura Gerçekleşen Miktar', 'Gümrük Gerçekleşen Miktar', 'Gerceklesen Adet']
  },
  {
    alan: 'gerceklesenTutar', tip: 'sayi', baslik: 'Gerçekleşen Tutar',
    // 'Gerçekleşen Tutar ' — sondaki boşluk eski dosyalarda gerçekten var (normalleştirme de yutar)
    adlar: ['Gerçekleşen Tutar', 'Gerçekleşen Tutar ', 'Gerç. Tutar', 'G. TUTAR', 'Fatura Gerçekleşen Değer', 'Gümrük Gerçekleşen Değer', 'Gerceklesen Tutar']
  },
  {
    alan: 'talepTarihi', tip: 'tarih', baslik: 'Talep Tarihi',
    adlar: ['Talep Tarihi', 'TALEP TARİH', 'Müracaat Tar.', 'Müracaat Tarihi', 'T.Tarih', 'Talep Tar.']
  },
  {
    alan: 'kararTarihi', tip: 'tarih', baslik: 'Sonuç Tarihi',
    adlar: ['Karar Tarihi', 'SONUÇ TARİH', 'Sonuç Tarihi', 'Onay Tarihi', 'K.Tarih', 'Karar Tar.']
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

const GERCEKLESME_ESLEME = new Map(
  GERCEKLESME_SUTUNLARI.flatMap((s) => s.adlar.map((ad) => [basligiNormallestir(ad), s.alan]))
);

/**
 * Bir Excel satırından gerçekleşme/karar alanlarını çözer.
 * Sadece DOLU olanları döner — boş hücre mevcut değeri ezmesin.
 */
export function gerceklesmeCoz(satir) {
  // normal başlık → ilk dolu değer
  const degerler = new Map();
  for (const [baslik, deger] of Object.entries(satir || {})) {
    const alan = GERCEKLESME_ESLEME.get(basligiNormallestir(baslik));
    if (!alan || bosMu(deger) || degerler.has(alan)) continue;
    degerler.set(alan, deger);
  }
  const cikti = {};
  for (const sutun of GERCEKLESME_SUTUNLARI) {
    if (!degerler.has(sutun.alan)) continue;
    const ham = degerler.get(sutun.alan);
    if (sutun.tip === 'tarih') {
      const tarih = tarihCoz(ham);
      if (tarih) cikti[sutun.alan] = tarih;
    } else {
      // 0 geçerli bir gerçekleşme değeri
      cikti[sutun.alan] = sayiCoz(ham);
    }
  }
  return cikti;
}

// ── Değer çözücüler ──────────────────────────────────────────────────────────

const EVET_DEGERLERI = new Set(['EVET', 'E', 'VAR', 'X', '✓', '✔', '1', 'YES', 'Y', 'TRUE', 'DOĞRU']);
const HAYIR_DEGERLERI = new Set(['HAYIR', 'HAYİR', 'H', 'YOK', '0', 'NO', 'N', 'FALSE', 'YANLIŞ']);

/** "Evet", "E", "VAR", "x" → EVET · "Hayır", "YOK" → HAYIR · boş/"-" → '' · tanınmayan büyük harfle aynen */
export const evetHayirCoz = (deger) => {
  if (deger === true) return 'EVET';
  if (deger === false) return 'HAYIR';
  const s = String(deger ?? '').trim().toLocaleUpperCase('tr-TR');
  if (!s || s === '-') return '';
  if (EVET_DEGERLERI.has(s)) return 'EVET';
  if (HAYIR_DEGERLERI.has(s)) return 'HAYIR';
  return s;
};

// E-TUYS birim adı / kısaltması → bakanlık birim kodu
const BIRIM_SOZLUGU = (() => {
  const s = new Map();
  const kodlar = Object.entries(BIRIM_KODLARI).filter(([kod]) => kod !== '136'); // '136' = "-"
  for (const [kod, ad] of kodlar) {
    const n = basligiNormallestir(ad);
    if (n && !s.has(n)) s.set(n, kod);
  }
  // Parantezsiz adlar: "ADET(UNIT)" → "ADET"
  for (const [kod, ad] of kodlar) {
    const n = basligiNormallestir(ad.replace(/\s*\([^)]*\)\s*/g, ''));
    if (n && !s.has(n)) s.set(n, kod);
  }
  const KISALTMALAR = { AD: '142', ADT: '142', KG: '151', KGM: '151', LT: '168', L: '168', M: '171', MT: '171', M2: '169', M3: '170', KW: '163', KWH: '162' };
  for (const [k, kod] of Object.entries(KISALTMALAR)) if (!s.has(k)) s.set(k, kod);
  return s;
})();

/**
 * Birim hücresini koda çevirir: "ADET(UNIT)", "Adet", "ADT", "142" → { kod: '142', aciklama: 'ADET(UNIT)' }.
 * Tanınmayan birim olduğu gibi kalır (eski davranış) — ekranda yine görünür.
 */
export const birimCoz = (deger) => {
  const ham = String(deger ?? '').trim();
  if (!ham) return null;
  if (BIRIM_KODLARI[ham]) return { kod: ham, aciklama: BIRIM_KODLARI[ham] };
  const kod = BIRIM_SOZLUGU.get(basligiNormallestir(ham));
  if (kod) return { kod, aciklama: BIRIM_KODLARI[kod] };
  return { kod: ham, aciklama: '' };
};

const DOVIZ_SEMBOLLERI = { '$': 'USD', '€': 'EUR', '£': 'GBP', '₺': 'TRY', '¥': 'JPY' };
const DOVIZ_ADLARI = {
  USD: ['ABD DOLARI', 'AMERİKAN DOLARI', 'DOLAR', 'US DOLLAR'],
  EUR: ['EURO', 'AVRO'],
  GBP: ['İNGİLİZ STERLİNİ', 'STERLİN'],
  CHF: ['İSVİÇRE FRANGI', 'FRANK'],
  JPY: ['JAPON YENİ', 'YEN'],
  CNY: ['ÇİN YUANI', 'YUAN', 'RMB'],
  TRY: ['TL', 'TÜRK LİRASI']
};
const DOVIZ_SOZLUGU = new Map(
  Object.entries(DOVIZ_ADLARI).flatMap(([kod, adlar]) => adlar.map((a) => [basligiNormallestir(a), kod]))
);

/** "EUR", "Euro", "€", "USD - ABD DOLARI" → üç harfli kod */
export const dovizCoz = (deger) => {
  const s = String(deger ?? '').trim();
  if (!s) return '';
  if (DOVIZ_SEMBOLLERI[s]) return DOVIZ_SEMBOLLERI[s];
  const ad = DOVIZ_SOZLUGU.get(basligiNormallestir(s));
  if (ad) return ad;
  const kod = s.toUpperCase().match(/^([A-Z]{3})\b/);
  if (kod) return kod[1];
  return s.toLocaleUpperCase('tr-TR');
};

const YENI_MAKINE = new Set(['YENİ', 'YENI', 'YENİ MAKİNE', 'YENI MAKINE', 'YOK']);

/**
 * Kullanılmışlık hücresini bakanlık koduna çevirir ('1' komple · '2' hayır · '3' münferit).
 * E-TUYS "Yeni Makine" yazıyor, dışa aktarımımız kodu ('2') ya da eski kısa kodu ('KM') yazıyor.
 * Boşsa '' döner; "EVET" gibi türü belirsiz bir değerse null (sessizce HAYIR sayılmasın).
 */
export const kullanilmisCoz = (deger) => {
  const s = String(deger ?? '').trim().toLocaleUpperCase('tr-TR');
  if (!s || s === '-') return '';
  if (YENI_MAKINE.has(s)) return '2';
  const kod = kullanilmisKoduNormalle(s);
  if (kod) return kod;
  if (s.includes('KOMPLE')) return '1';
  if (s.includes('MÜNFERİT') || s.includes('MUNFERIT')) return '3';
  if (HAYIR_DEGERLERI.has(s)) return '2';
  return null;
};

// ── Alan sözlüğü ─────────────────────────────────────────────────────────────
// tip: metin | sayi | evetHayir | birim | doviz | kullanilmis | bayrak
// Gerçekleşme/tarih alanları GERCEKLESME_SUTUNLARI'nda.

const alan = (tip, adlar) => ({ tip, adlar });

const ORTAK_ALANLAR = {
  siraNo: alan('sayi', ['SIRA NO', 'Sıra', 'S.No', 'Sıra Numarası']),
  makineId: alan('metin', ['MAKİNE ID', 'Makina ID']),
  gtipKodu: alan('metin', ['GTIP NO', 'GTİP NO', 'GTIP Kodu', 'GTIP', 'GTİP', 'GTIP KOD']),
  gtipAciklama: alan('metin', ['GTIP AÇIKLAMA', 'GTIP Aciklama', 'GTIP Açk.', 'GTIP Açıklaması']),
  adi: alan('metin', ['ADI VE ÖZELLİĞİ', 'ADI VE ÖZELLİİĞİ', 'Adı', 'Makina ve Teçhizatın Cinsi', 'Makine ve Teçhizatın Cinsi', 'Makine Adı']),
  miktar: alan('sayi', ['MİKTARI', 'Miktar']),
  birim: alan('birim', ['BİRİM', 'Birimi']),
  birimAciklamasi: alan('metin', ['Birim Açıklaması']),
  makineTechizatTipi: alan('metin', ['Makine Teçhizat Tipi', 'Makine Techizat Tipi', 'Makine Tipi']),
  finansalKiralamaMi: alan('evetHayir', ['FİNANSAL KİRALAMA', 'Finansal Kiralama Mı', 'Finansal Kir.']),
  finansalKiralamaAdet: alan('sayi', ['F.K. MİKTAR', 'F.K. Adet', 'Finansal Kiralama İse Adet', 'Finansal Kiralama İzin Verilen Miktar', 'Kiralama İzin Verilen Miktar']),
  finansalKiralamaSirket: alan('metin', ['F.K. ŞİRKETİ', 'F.K. Şirket', 'Finansal Kiralama İse Şirket', 'Finansal Kiralama Şirketi']),
  iadeDevirSatisVarMi: alan('evetHayir', ['İade-Devir-Satış Var mı?', 'İade/Devir/Satış']),
  iadeDevirSatisAdet: alan('sayi', ['İade-Devir-Satış adet', 'İ/D/S Adet']),
  iadeDevirSatisTutar: alan('sayi', ['İade Devir Satış Tutar', 'İ/D/S Tutar'])
};

const ALANLAR = {
  yerli: {
    ...ORTAK_ALANLAR,
    birimFiyatiTl: alan('sayi', ['BİRİM FİYATI', 'Birim Fiyatı (TL)', 'Birim Fiyatı(TL)(KDV HARİÇ)']),
    toplamTl: alan('sayi', ['TOPLAM TUTARI', 'Toplam Tutar', 'Toplam Tutar (TL)', 'Toplam Tutarı(TL)(KDV Hariç)']),
    kdvIstisnasi: alan('evetHayir', ['KDV İSTİSNASI', 'KDV İSTİNASI', 'KDV Muafiyeti', 'KDV Muafiyeti Var Mı?', 'KDV Muafiyeti (EVET/HAYIR)', 'KDV Muaf.'])
  },
  ithal: {
    ...ORTAK_ALANLAR,
    birimFiyatiFob: alan('sayi', ['MENŞEİ ÜLKE DÖVİZ BİRİM FİYATI', 'Menşe Ülke Döviz Birim Fiyatı', 'Menşei Döviz Birim Fiyatı (FOB)', 'Mensei Doviz Tutari(Fob)', 'Menşei Ülke Döviz Birim Fiyatı(FOB)', 'Birim Fiyatı (FOB)']),
    doviz: alan('doviz', ['DÖVİZ CİNSİ', 'Döviz', 'Menşei Döviz Cinsi (FOB)', 'Mensei Doviz Cinsi(Fob)', 'Menşei Ülke Döviz Cinsi(FOB)', 'Menşe Döviz Kodu', 'Gümrük Döviz Kodu', 'Gümrük Döviz Kodları']),
    toplamUsd: alan('sayi', ['TOPLAM TUTAR $', 'Toplam ($)', 'Toplam Tutar (FOB $)', 'Toplam Tutarı(FOB $)']),
    toplamTl: alan('sayi', ['TOPLAM TUTAR TL', 'Toplam (TL)', 'Toplam Tutar (FOB TL)', 'Toplam Tutarı(FOB TL)']),
    gumrukVergisiMuafiyeti: alan('evetHayir', ['GÜMRÜK VERGİSİ İSTİSNASI', 'GÜMRÜK VERGİSİ İSTİNASI', 'Gümrük Vergisi Muafiyeti', 'G.V. Muaf.']),
    kdvMuafiyeti: alan('evetHayir', ['KDV İSTİSNASI', 'KDV İSTİNASI', 'KDV Muafiyeti', 'KDV Muaf.']),
    kullanilmisKod: alan('kullanilmis', ['KULLANILMIŞ MI', 'KULLANILMIŞ MAKİNE', 'Kullanılmış', 'Kullanılmış Makine (Kod)', 'Kullanılmış Mı?']),
    kullanilmisAciklama: alan('metin', ['Kullanılmış Makine (Açıklama)']),
    ckdSkd: alan('evetHayir', ['CKD Mİ?', 'CKD', 'CKD/SKD', 'CKD/SKD Mİ?']),
    aracMi: alan('evetHayir', ['ARAÇ MI?', 'ARAÇ', 'Araç Mı?']),
    kurManuel: alan('bayrak', ['Manuel Kur']),
    kurManuelDeger: alan('sayi', ['Man. Kur Değ.', 'Manuel Kur Değeri'])
  }
};

// normal başlık → alan adı (türe göre)
const ESLEME = Object.fromEntries(Object.entries(ALANLAR).map(([tur, alanlar]) => {
  const m = new Map();
  for (const [ad, tanim] of Object.entries(alanlar)) {
    for (const a of tanim.adlar) {
      const n = basligiNormallestir(a);
      if (n && !m.has(n)) m.set(n, ad);
    }
  }
  return [tur, m];
}));

/** Başlığın bu türde hangi alana gittiğini söyler (gerçekleşme alanları dahil); tanınmıyorsa null */
export const baslikAlani = (baslik, tur) => {
  const n = basligiNormallestir(baslik);
  return ESLEME[tur]?.get(n) || GERCEKLESME_ESLEME.get(n) || null;
};

// ── Boş şablon ───────────────────────────────────────────────────────────────
// Müşterinin mak_list_sablon.xlsx düzeni (E-TUYS listesine benzer). Yazım hataları
// düzeltildi ("ÖZELLİİĞİ", "İSTİNASI"); hatalı yazılmış eski dosyalar yine tanınıyor.
// Yerliye GTIP NO eklendi: E-TUYS'ın "Yeni Yerli Makine Techizat Ekle" formunun ilk alanı.
// `zorunlu` ve `aciklama` şablonun "Nasıl Kullanılır" sayfasına ve başlık notlarına gidiyor.
const sutun = (baslik, alanAdi, ek = {}) => ({ baslik, alan: alanAdi, ...ek });

const SIRA = sutun('SIRA NO', 'siraNo', { genislik: 9, bicim: '0', aciklama: 'Belgedeki sıra numarası. Boş bırakılırsa sırayla verilir.', etuys: 'Sıra No' });
const GTIP = sutun('GTIP NO', 'gtipKodu', { genislik: 15, bicim: '@', aciklama: 'GTİP numarası. Açıklaması sistemde otomatik bulunur.', etuys: 'Gtip No' });
const ADI = sutun('ADI VE ÖZELLİĞİ', 'adi', { genislik: 42, zorunlu: true, aciklama: 'Makinenin adı ve özelliği.', etuys: 'Adı ve Özelliği' });
const MIKTAR = sutun('MİKTARI', 'miktar', { genislik: 10, bicim: '#,##0.##', zorunlu: true, aciklama: 'Adet / miktar.', etuys: 'Miktarı' });
const BIRIM = sutun('BİRİM', 'birim', { genislik: 16, liste: 'birim', zorunlu: true, aciklama: 'E-TUYS birim adı: ADET(UNIT), SET, KİLOGRAM… "ADET", "KG" da olur. Tam liste "Listeler" sayfasında.', etuys: 'Birim' });
const FK_MIKTAR = sutun('F.K. MİKTAR', 'finansalKiralamaAdet', { genislik: 11, bicim: '#,##0.##', aciklama: 'Finansal kiralamayla alınacak miktar. Doluysa FİNANSAL KİRALAMA "EVET" sayılır.', etuys: 'Kiralama İzin Verilen Miktar' });
const FK_SIRKET = sutun('F.K. ŞİRKETİ', 'finansalKiralamaSirket', { genislik: 24, aciklama: 'Finansal kiralama şirketi.', etuys: 'Finansal Kiralama İşlemleri' });
const G_ADET = sutun('G. ADET', 'gerceklesenAdet', { genislik: 10, bicim: '#,##0.##', aciklama: 'Gerçekleşen adet.', etuys: 'Gerçekleşen Miktar' });
const G_TUTAR = sutun('G. TUTAR', 'gerceklesenTutar', { genislik: 14, bicim: '#,##0.00', aciklama: 'Gerçekleşen tutar.', etuys: 'Gerçekleşen Değer' });
const TALEP_TARIH = sutun('TALEP TARİH', 'talepTarihi', { genislik: 13, bicim: 'dd.mm.yyyy', aciklama: 'Revize talebinin bakanlığa gönderildiği tarih (gg.aa.yyyy).', etuys: 'Revize başvuru tarihi' });
const SONUC_TARIH = sutun('SONUÇ TARİH', 'kararTarihi', { genislik: 13, bicim: 'dd.mm.yyyy', aciklama: 'Bakanlık karar (onay) tarihi (gg.aa.yyyy).', etuys: 'Revize sonuç tarihi' });

export const SABLON_SUTUNLARI = {
  yerli: [
    SIRA,
    sutun('MAKİNE ID', 'makineId', { genislik: 13, bicim: '@', aciklama: 'E-TUYS Makine ID. Doluysa eşleştirme buna göre yapılır.', etuys: 'Makine ID' }),
    GTIP,
    ADI,
    MIKTAR,
    BIRIM,
    sutun('BİRİM FİYATI', 'birimFiyatiTl', { genislik: 16, bicim: '#,##0.00', aciklama: 'TL, KDV hariç.', etuys: 'Birim Fiyatı (TL)(KDV Hariç)' }),
    sutun('TOPLAM TUTARI', 'toplamTl', { genislik: 17, bicim: '#,##0.00', aciklama: 'TL, KDV hariç. Boş bırakılırsa Miktar × Birim Fiyatı hesaplanır; yazılırsa yazılan korunur.', etuys: 'Toplam Tutarı (TL)(KDV Hariç)' }),
    sutun('KDV İSTİSNASI', 'kdvIstisnasi', { genislik: 13, liste: 'evetHayir', aciklama: 'EVET / HAYIR', etuys: 'Kdv İstisnası' }),
    sutun('FİNANSAL KİRALAMA', 'finansalKiralamaMi', { genislik: 14, liste: 'evetHayir', aciklama: 'EVET / HAYIR', etuys: 'Finansal Kiralama İşlemleri' }),
    FK_MIKTAR, FK_SIRKET, G_ADET, G_TUTAR, TALEP_TARIH, SONUC_TARIH
  ],
  ithal: [
    SIRA,
    GTIP,
    ADI,
    MIKTAR,
    BIRIM,
    sutun('MENŞEİ ÜLKE DÖVİZ BİRİM FİYATI', 'birimFiyatiFob', { genislik: 20, bicim: '#,##0.00', aciklama: 'Menşe ülke döviziyle FOB birim fiyatı.', etuys: 'Menşei Ülke Döviz Birim Fiyatı(FOB)' }),
    sutun('DÖVİZ CİNSİ', 'doviz', { genislik: 11, liste: 'doviz', zorunlu: true, aciklama: 'USD, EUR, GBP… (üç harfli kod).', etuys: 'Gümrük Döviz Kodları' }),
    sutun('TOPLAM TUTAR $', 'toplamUsd', { genislik: 16, bicim: '#,##0.00', aciklama: 'E-TUYS\'taki gibi yazılırsa korunur; boş bırakılırsa hesaplanır.', etuys: 'Toplam Tutarı(FOB $)' }),
    sutun('TOPLAM TUTAR TL', 'toplamTl', { genislik: 17, bicim: '#,##0.00', aciklama: 'E-TUYS\'taki gibi yazılırsa korunur; boş bırakılırsa kurla hesaplanır.', etuys: 'Toplam Tutarı(FOB TL)' }),
    sutun('GÜMRÜK VERGİSİ İSTİSNASI', 'gumrukVergisiMuafiyeti', { genislik: 14, liste: 'evetHayir', aciklama: 'EVET / HAYIR', etuys: 'Gümrük Vergisi İstisnası' }),
    sutun('KDV İSTİSNASI', 'kdvMuafiyeti', { genislik: 12, liste: 'evetHayir', aciklama: 'EVET / HAYIR', etuys: 'Kdv İstisnası' }),
    sutun('KULLANILMIŞ MI', 'kullanilmisKod', { genislik: 22, liste: 'kullanilmis', aciklama: 'HAYIR / KULLANILMIŞ KOMPLE / KULLANILMIŞ MÜNFERİT ("Yeni Makine" = HAYIR).', etuys: 'Kullanılmış Makine' }),
    sutun('CKD Mİ?', 'ckdSkd', { genislik: 9, liste: 'evetHayir', aciklama: 'EVET / HAYIR', etuys: 'CKD/SKD Mİ?' }),
    sutun('ARAÇ MI?', 'aracMi', { genislik: 9, liste: 'evetHayir', aciklama: 'EVET / HAYIR', etuys: 'ARAÇ MI?' }),
    FK_MIKTAR, FK_SIRKET, G_ADET, G_TUTAR, TALEP_TARIH, SONUC_TARIH
  ]
};

export const SABLON_BASLIKLARI = {
  yerli: SABLON_SUTUNLARI.yerli.map((s) => s.baslik),
  ithal: SABLON_SUTUNLARI.ithal.map((s) => s.baslik)
};

export const SABLON_SAYFA_ADLARI = { yerli: 'YERLİ', ithal: 'İTHAL' };

// ── Excel/CSV okuma ──────────────────────────────────────────────────────────

/** "YERLİ", "Yerli", "YERLI LISTE" … — E-TUYS görüntü sayfaları ("ETUYS Y. MAK. ÖRN. GÖRÜNTÜ") eşleşmez */
export function sayfaBul(sayfaAdlari, tur) {
  const kok = tur === 'ithal' ? 'ITHAL' : 'YERLI';
  const adlar = (sayfaAdlari || []).map((ad) => ({ ad, n: basligiNormallestir(ad) }));
  const bulunan = adlar.find((s) => s.n === kok) || adlar.find((s) => s.n.startsWith(kok));
  return bulunan ? bulunan.ad : null;
}

const ITHALE_OZEL = new Set(['birimFiyatiFob', 'doviz', 'toplamUsd', 'gumrukVergisiMuafiyeti', 'kullanilmisKod', 'ckdSkd', 'aracMi']);

/** Tek sayfalı dosya / CSV için: ithale özgü bir başlık varsa ithal, yoksa yerli */
export const turTahminEt = (basliklar) => ((basliklar || [])
  .some((b) => ITHALE_OZEL.has(ESLEME.ithal.get(basligiNormallestir(b)))) ? 'ithal' : 'yerli');

/**
 * Satır dizilerini (sheet_to_json header:1) başlık adıyla anahtarlanmış nesnelere çevirir.
 * Başlık satırı ilk satır olmak zorunda değil: üstte başlık/not satırı olan dosyalarda
 * en az iki tanınan başlık içeren ilk satır aranır.
 */
export function dizilerdenSatirlar(diziler, tur) {
  if (!Array.isArray(diziler) || !diziler.length) return [];
  const taninanSayisi = (dizi) => (dizi || []).filter((h) => !bosMu(h) && baslikAlani(h, tur)).length;
  let baslikIndeksi = 0;
  for (let i = 0; i < Math.min(diziler.length, 20); i++) {
    if (taninanSayisi(diziler[i]) >= 2) { baslikIndeksi = i; break; }
  }
  const basliklar = (diziler[baslikIndeksi] || []).map((h) => String(h ?? '').trim());
  const satirlar = [];
  for (const dizi of diziler.slice(baslikIndeksi + 1)) {
    if (!Array.isArray(dizi) || dizi.every(bosMu)) continue;
    const nesne = {};
    basliklar.forEach((b, j) => {
      if (!b) return;
      const v = dizi[j] === undefined ? '' : dizi[j];
      if (!(b in nesne) || bosMu(nesne[b])) nesne[b] = v;
    });
    satirlar.push(nesne);
  }
  return satirlar;
}

const sayfaDizileri = (ws) => XLSX.utils.sheet_to_json(ws, { header: 1, defval: '', raw: true, blankrows: false });

/**
 * .xlsx/.xls içeriğini okur → { yerli: satır[], ithal: satır[] }.
 * Sayfa adları "YERLİ"/"İTHAL" (ve eski adlar); ikisi de yoksa tek sayfa başlıklarına göre yorumlanır.
 */
export function excelSatirlariniOku(icerik) {
  const wb = XLSX.read(icerik, { type: 'array' });
  const yerliAd = sayfaBul(wb.SheetNames, 'yerli');
  const ithalAd = sayfaBul(wb.SheetNames, 'ithal');
  const sonuc = {
    yerli: yerliAd ? dizilerdenSatirlar(sayfaDizileri(wb.Sheets[yerliAd]), 'yerli') : [],
    ithal: ithalAd ? dizilerdenSatirlar(sayfaDizileri(wb.Sheets[ithalAd]), 'ithal') : []
  };
  if (!yerliAd && !ithalAd && wb.SheetNames.length) {
    const diziler = sayfaDizileri(wb.Sheets[wb.SheetNames[0]]);
    const ithalSatirlari = dizilerdenSatirlar(diziler, 'ithal');
    if (turTahminEt(Object.keys(ithalSatirlari[0] || {})) === 'ithal') sonuc.ithal = ithalSatirlari;
    else sonuc.yerli = dizilerdenSatirlar(diziler, 'yerli');
  }
  return sonuc;
}

/** CSV (; veya , ayraçlı) → { yerli, ithal }; tür dosya adından ya da başlıklardan */
export function csvSatirlariniOku(metin, dosyaAdi = '') {
  const satirlar = String(metin || '').split(/\r?\n/).filter((l) => l.trim());
  if (satirlar.length < 2) return { yerli: [], ithal: [] };
  const ayrac = satirlar[0].includes(';') ? ';' : ',';
  const temizle = (v) => v.trim().replace(/^"|"$/g, '');
  const diziler = satirlar.map((l) => l.split(ayrac).map(temizle));
  const ad = String(dosyaAdi).toLocaleUpperCase('tr-TR');
  const tur = (ad.includes('İTHAL') || ad.includes('ITHAL')) ? 'ithal' : turTahminEt(diziler[0]);
  return { yerli: [], ithal: [], [tur]: dizilerdenSatirlar(diziler, tur) };
}

// ── Satır → makine kalemi ────────────────────────────────────────────────────

const VARSAYILANLAR = {
  yerli: () => ({
    makineId: '', gtipKodu: '', gtipAciklama: '', adi: '', miktar: 0, birim: '', birimAciklamasi: '',
    birimFiyatiTl: 0, toplamTl: 0, kdvIstisnasi: 'HAYIR', makineTechizatTipi: 'Ana Makine',
    finansalKiralamaMi: 'HAYIR', finansalKiralamaAdet: 0, finansalKiralamaSirket: '',
    gerceklesenAdet: 0, gerceklesenTutar: 0, iadeDevirSatisVarMi: 'HAYIR', iadeDevirSatisAdet: 0, iadeDevirSatisTutar: 0
  }),
  ithal: () => ({
    makineId: '', gtipKodu: '', gtipAciklama: '', adi: '', miktar: 0, birim: '', birimAciklamasi: '',
    birimFiyatiFob: 0, doviz: '', toplamUsd: 0, toplamTl: 0, kullanilmisKod: '2', kullanilmisAciklama: '',
    makineTechizatTipi: 'Ana Makine', kdvMuafiyeti: 'EVET', gumrukVergisiMuafiyeti: 'EVET',
    finansalKiralamaMi: 'HAYIR', finansalKiralamaAdet: 0, finansalKiralamaSirket: '',
    gerceklesenAdet: 0, gerceklesenTutar: 0, iadeDevirSatisVarMi: 'HAYIR', iadeDevirSatisAdet: 0, iadeDevirSatisTutar: 0,
    ckdSkd: 'HAYIR', aracMi: 'HAYIR'
  })
};

// Sıfır toplam anlamsız (boş formül hücresi, "0" yazılmış) — elle girilmiş tutar sayılmasın
const SIFIR_ANLAMSIZ = new Set(['toplamTl', 'toplamUsd', 'siraNo']);
const KURUS = 0.005;

/**
 * Excel/CSV satırını makine kalemine çevirir.
 *
 * @param {object} satir  başlık → hücre değeri
 * @param {'yerli'|'ithal'} tur
 * @param {{ sira?: number, gtipAciklamaBul?: (kod:string)=>string }} secenekler
 * @returns {{ kalem: object, doluAlanlar: string[], bos: boolean, uyarilar: string[] }}
 *   kalem: YENİ satır olarak eklenecek tam nesne (eksikler varsayılanla);
 *   doluAlanlar: dosyada gerçekten dolu gelen alanlar — mevcut satır güncellenirken yalnız
 *   bunlar yazılır, boş hücre mevcut değeri silmez;
 *   bos: makine bilgisi yok (toplam satırı, boş satır) — atlanır.
 */
export function makineSatiriCoz(satir, tur, { sira = 0, gtipAciklamaBul } = {}) {
  const tanimlar = ALANLAR[tur];
  const esleme = ESLEME[tur];

  // alan → ilk dolu ham değer (sütun sırasıyla)
  const ham = {};
  for (const [baslik, deger] of Object.entries(satir || {})) {
    const alanAdi = esleme.get(basligiNormallestir(baslik));
    if (!alanAdi || bosMu(deger) || alanAdi in ham) continue;
    ham[alanAdi] = deger;
  }

  const dolu = {};
  const uyarilar = [];
  for (const [alanAdi, deger] of Object.entries(ham)) {
    switch (tanimlar[alanAdi].tip) {
      case 'metin':
        if (alanAdi !== 'birimAciklamasi') dolu[alanAdi] = String(deger).trim();
        break;
      case 'sayi': {
        if (!/\d/.test(String(deger))) break;
        const n = sayiCoz(deger);
        if (n === 0 && SIFIR_ANLAMSIZ.has(alanAdi)) break;
        dolu[alanAdi] = alanAdi === 'siraNo' ? Math.trunc(n) : n;
        break;
      }
      case 'evetHayir': {
        const v = evetHayirCoz(deger);
        if (v) dolu[alanAdi] = v;
        break;
      }
      case 'birim': {
        const b = birimCoz(deger);
        if (b) {
          dolu.birim = b.kod;
          if (b.aciklama) dolu.birimAciklamasi = b.aciklama;
        }
        break;
      }
      case 'doviz': {
        const d = dovizCoz(deger);
        if (d) dolu.doviz = d;
        break;
      }
      case 'kullanilmis': {
        const k = kullanilmisCoz(deger);
        if (k) {
          dolu.kullanilmisKod = k;
          dolu.kullanilmisAciklama = KULLANILMIS_KODLARI[k] || '';
        } else if (k === null) {
          uyarilar.push(`Kullanılmış bilgisi anlaşılamadı ("${deger}"): HAYIR, KULLANILMIŞ KOMPLE ya da KULLANILMIŞ MÜNFERİT yazın.`);
        }
        break;
      }
      case 'bayrak': {
        const v = evetHayirCoz(deger);
        if (v === 'EVET') dolu[alanAdi] = true;
        else if (v === 'HAYIR') dolu[alanAdi] = false;
        break;
      }
      default:
        break;
    }
  }

  // Birim koda çözülemediyse dosyadaki açıklama kullanılır (dışa aktarımın "Birim Açıklaması")
  if (!dolu.birimAciklamasi && !bosMu(ham.birimAciklamasi)) dolu.birimAciklamasi = String(ham.birimAciklamasi).trim();
  if (dolu.gtipKodu && !dolu.gtipAciklama && gtipAciklamaBul) {
    const aciklama = gtipAciklamaBul(dolu.gtipKodu);
    if (aciklama) dolu.gtipAciklama = aciklama;
  }
  // Müşteri şablonunun İTHAL sayfasında "FİNANSAL KİRALAMA" sütunu yok; F.K. bilgisi doluysa EVET
  if (!('finansalKiralamaMi' in dolu) && (dolu.finansalKiralamaAdet > 0 || dolu.finansalKiralamaSirket)) {
    dolu.finansalKiralamaMi = 'EVET';
  }

  // Dosyadaki toplamlar korunur: formülle tutmuyorsa "elle girildi" işaretlenir, yoksa ekran
  // Miktar × Fiyat (yerli) ya da güncel kurla (ithal) yeniden hesaplayıp E-TUYS'taki tutarı ezerdi.
  const carpim = (a, b) => (a !== undefined && b !== undefined ? a * b : null);
  if (tur === 'yerli' && 'toplamTl' in dolu) {
    const hesap = carpim(dolu.miktar, dolu.birimFiyatiTl);
    if (hesap === null || Math.abs(hesap - dolu.toplamTl) > KURUS) dolu.tlYerliManuel = true;
  }
  if (tur === 'ithal') {
    if ('toplamUsd' in dolu) {
      const hesap = carpim(dolu.miktar, dolu.birimFiyatiFob);
      if (hesap === null || Math.abs(hesap - dolu.toplamUsd) > KURUS) dolu.usdManuel = true;
    }
    if ('toplamTl' in dolu) dolu.tlManuel = true;
  }

  // Gerçekleşme + talep/karar tarihleri (ızgara talep/karar nesnelerinden okuyor)
  const gerc = gerceklesmeCoz(satir);
  if (gerc.gerceklesenAdet !== undefined) dolu.gerceklesenAdet = gerc.gerceklesenAdet;
  if (gerc.gerceklesenTutar !== undefined) dolu.gerceklesenTutar = gerc.gerceklesenTutar;
  let talep = null;
  if (gerc.talepTarihi || gerc.talepAdedi !== undefined) {
    talep = {};
    if (gerc.talepTarihi) { talep.talepTarihi = gerc.talepTarihi; talep.durum = 'bakanliga_gonderildi'; }
    if (gerc.talepAdedi !== undefined) talep.istenenAdet = gerc.talepAdedi;
  }
  let karar = null;
  if (gerc.kararTarihi || gerc.onaylananAdet !== undefined) {
    karar = {};
    if (gerc.kararTarihi) { karar.kararTarihi = gerc.kararTarihi; karar.kararDurumu = 'onay'; }
    if (gerc.onaylananAdet !== undefined) karar.onaylananAdet = gerc.onaylananAdet;
  }

  const kalem = {
    id: Math.random().toString(36).slice(2),
    siraNo: sira,
    ...VARSAYILANLAR[tur](),
    ...dolu,
    dosyalar: []
  };
  if (talep) kalem.talep = talep;
  if (karar) kalem.karar = karar;

  const bos = !kalem.adi && !kalem.makineId && !kalem.gtipKodu;
  if (!bos) {
    if (!kalem.adi) uyarilar.push('Adı boş');
    if (!kalem.birim) uyarilar.push('Birim boş');
    if (!sayiCoz(kalem.miktar)) uyarilar.push('Miktar 0');
    if (tur === 'ithal' && !kalem.doviz) uyarilar.push('Döviz boş');
  }
  if (uyarilar.length) kalem._errors = uyarilar;

  return { kalem, doluAlanlar: Object.keys(dolu), bos, uyarilar };
}

// ── Mevcut listeyle birleştirme ──────────────────────────────────────────────

const adAnahtari = (s) => String(s || '').toLocaleLowerCase('tr-TR').normalize('NFKD')
  .replace(/[\u0300-\u036f]/g, '').replace(/ı/g, 'i').replace(/\s+/g, ' ').trim();

// Talep/karar: dosyadaki alanlar mevcut nesneye eklenir; durum yalnız boşsa doldurulur
const altNesneBirlestir = (mevcut, gelen, durumAnahtari) => {
  const { [durumAnahtari]: varsayilanDurum, ...degerler } = gelen;
  const sonuc = { ...(mevcut || {}), ...degerler };
  if (!sonuc[durumAnahtari] && varsayilanDurum) sonuc[durumAnahtari] = varsayilanDurum;
  return sonuc;
};

/**
 * 📥 İçe aktarma birleştirme (müşteri: "excel ile içe aktarınca güncellenen-yeni eklenen
 * makineler eklenecek, diğerlerine dokunulmayacak").
 *
 * Eşleştirme: Makine ID (ikisinde de doluysa) → yoksa Adı ve Özelliği. Ad eşleşmesi yalnız
 * taraflardan birinin Makine ID'si boşken yapılır: aynı adlı iki farklı makine birbirinin
 * üstüne yazılmasın. Her mevcut satır en fazla BİR dosya satırıyla eşleşir; aynı adlı
 * mevcut satırlar sırayla kullanılır.
 * Eşleşen satıra yalnız dosyada DOLU gelen alanlar yazılır (boş hücre mevcut değeri silmez);
 * id/rowId/dosyalar/etuysSecili/silinmeTarihi ve sıra no korunur, talep/karar tarihleri eklenir.
 *
 * @param {Function} hesapla  satırın toplamlarını yeniden hesaplar (calcYerli / calcIthal)
 */
export function iceAktarimBirlestir(mevcutSatirlar, gelenler, hesapla = (r) => r) {
  const liste = (mevcutSatirlar || []).map((r) => ({ ...r }));
  const idIndeksi = new Map();
  const adIndeksi = new Map();
  liste.forEach((r, i) => {
    const id = String(r.makineId ?? '').trim();
    if (id && !idIndeksi.has(id)) idIndeksi.set(id, i);
    const ad = adAnahtari(r.adi);
    if (!ad) return;
    if (!adIndeksi.has(ad)) adIndeksi.set(ad, []);
    adIndeksi.get(ad).push(i);
  });

  const bosListe = liste.length === 0;
  let enBuyukSira = liste.reduce((m, r) => Math.max(m, Number(r.siraNo) || 0), 0);
  const kullanilan = new Set();
  let eklenen = 0;
  let guncellenen = 0;
  let atlanan = 0;
  let uyarili = 0;

  for (const gelen of gelenler || []) {
    if (!gelen || gelen.bos) { atlanan++; continue; }
    const { kalem, doluAlanlar } = gelen;
    const id = doluAlanlar.includes('makineId') ? String(kalem.makineId).trim() : '';

    let i = id ? idIndeksi.get(id) : undefined;
    if (i !== undefined && kullanilan.has(i)) i = undefined;
    if (i === undefined) {
      i = (adIndeksi.get(adAnahtari(kalem.adi)) || [])
        .find((j) => !kullanilan.has(j) && (!id || !String(liste[j].makineId ?? '').trim()));
    }

    if (i !== undefined) {
      kullanilan.add(i);
      const mevcut = liste[i];
      const guncel = { ...mevcut };
      for (const alanAdi of doluAlanlar) {
        if (alanAdi === 'siraNo' && mevcut.siraNo) continue;
        guncel[alanAdi] = kalem[alanAdi];
      }
      if (kalem.talep) guncel.talep = altNesneBirlestir(mevcut.talep, kalem.talep, 'durum');
      if (kalem.karar) guncel.karar = altNesneBirlestir(mevcut.karar, kalem.karar, 'kararDurumu');
      liste[i] = hesapla(guncel);
      guncellenen++;
    } else {
      // Boş listeye aktarımda Excel'deki Sıra No korunur (1-2-3 diye ezilmesin)
      const siraNo = (bosListe && doluAlanlar.includes('siraNo') && kalem.siraNo > 0) ? kalem.siraNo : enBuyukSira + 1;
      enBuyukSira = Math.max(enBuyukSira, siraNo);
      liste.push(hesapla({ ...kalem, siraNo }));
      eklenen++;
      if (kalem._errors) uyarili++;
    }
  }

  return {
    list: liste,
    added: eklenen,
    updated: guncellenen,
    untouched: Math.max(0, (mevcutSatirlar || []).length - guncellenen),
    skipped: atlanan,
    warned: uyarili
  };
}
