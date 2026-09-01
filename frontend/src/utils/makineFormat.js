// 🏭 Makine kalemi alan biçimlendiricileri
// Birim ve "kullanılmış makine" alanları veritabanında KOD olarak tutulur; ekranlarda
// arama bileşeni kodu okunabilir metne çevirir. Excel/dışa aktarım tarafında bu çeviri
// yapılmadığı için müşteriye ham kod (ör. birim "142") gidiyordu — ortak yer burası.

// Bakanlık birim kodları — kaynak: `unitcodes` koleksiyonu (ETUYS birim listesi).
// ⚠️ Buradaki tablo daha önce elle yazılmıştı ve 13 kodun 12'si YANLIŞTI
// (151 "TON" sanılıyordu, gerçekte KİLOGRAM; 166 "KİLOGRAM" sanılıyordu, gerçekte
// KİLOGRAM-ADET). Müşteriye giden PDF/Excel'de yanlış birim basılıyordu.
// Tablo veritabanındaki listeden birebir üretildi; değiştirmeden önce oradan doğrula.
export const BIRIM_KODLARI = {
  '136': '-',
  '137': 'ALTIN AYARI',
  '138': 'BAS',
  '139': 'KG-METRE KARE',
  '140': 'TON BAŞINA TAŞIMA KAPASİTESİ',
  '141': 'ADET-ÇİFT',
  '142': 'ADET(UNIT)',
  '143': 'BRÜT KALORİ DEĞERİ',
  '144': 'BİN LİTRE',
  '145': 'FISSILE İZOTOP GRAMI',
  '146': 'GÜMÜŞ',
  '147': 'GRAM',
  '148': 'GROSS TON',
  '149': 'YÜZ ADET',
  '150': 'DİFOSFOR PENTAOKSİT KİLOGRAMI',
  '151': 'KİLOGRAM',
  '152': 'HİDROJEN PEROKSİT KİLOGRAMI',
  '153': 'KİLOGRAM-BAŞ',
  '154': 'METİL AMİNLERİN KİLOGRAMI',
  '155': 'AZOTUN KİLOGRAMI',
  '156': 'KİLOGRAM POTASYUM HİDROKSİT',
  '157': 'Kg POTASYUM OKSİD',
  '158': 'KİLOGRAM-ÇİFT',
  '159': '%90 KURU ÜRÜN KİLOGRAMI',
  '160': 'SODYUM HİDROKSİT KİLOGRAMI',
  '161': 'URANYUM KİLOGRAMI',
  '162': 'KİLOWATT SAAT',
  '163': 'KİLOWATT',
  '164': 'KİLOGRAM POTASYUM OKSİT',
  '165': 'KURUTULMUŞ NET AĞIRLIKLI KİLOGRAMI',
  '166': 'KİLOGRAM-ADET',
  '167': 'SAF ALKOL LİTRESİ',
  '168': 'LİTRE',
  '169': 'METRE KARE',
  '170': 'METRE KÜP',
  '171': 'METRE',
  '172': 'HÜCRE ADEDİ',
  '173': 'KARAT',
  '174': 'OTV Maktu Vergi',
  '175': 'OTV birim fiyatı',
  '176': 'ÇİFT',
  '177': 'BİN METRE KÜP',
  '178': 'SET',
  '179': 'BİN KİLOWATT SAAT',
  '180': 'BİN ADET'
};

// Birim/kullanılmış alanları veride İKİ biçimde duruyor: bazı satırlarda kod
// ("142"), çoğunda doğrudan metin ("ADET(UNIT)", "SET"). Metin biçiminde de
// parantezli ek temizlenmeli ki müşteri "ADET(UNIT)" yerine "ADET" görsün.
const parantezsiz = (metin) => String(metin ?? '').replace(/\s*\([^)]*\)\s*/g, '').trim();

// Birim kodunu okunabilir metne çevir: önce kod tablosu, sonra kayıttaki açıklama
// ("ADET(UNIT)" gibi ekler temizlenir), en son çare kodun kendisi.
export const birimEtiketi = (kod, aciklama) => {
  const k = String(kod ?? '').trim();
  // 1) Sayısal kod → bakanlık tablosundan çöz
  if (k && BIRIM_KODLARI[k]) return parantezsiz(BIRIM_KODLARI[k]) || BIRIM_KODLARI[k];
  // 2) Kayıttaki açıklama
  const a = String(aciklama ?? '').trim();
  if (a) return parantezsiz(a) || a;
  // 3) Kodun kendisi zaten metinse ("ADET(UNIT)") onu temizleyip göster
  return parantezsiz(k) || k;
};

// "Kullanılmış makine" kodu bakanlık listesinde üç değer alır:
// KULLANILMIŞ KOMPLE / HAYIR / KULLANILMIŞ MÜNFERİT. "HAYIR" da dolu bir değer olduğundan
// "alan dolu ⇒ kullanılmış" varsayımı yanlıştır — yeni makineler kullanılmış görünüyordu.
// Kullanılmış makine kodları — kaynak: `usedmachinecodes` koleksiyonu.
// Üç değer var ve "2" HAYIR demek; sayısal kodu tanımayan eski mantık "2"yi de
// kullanılmış sayıyordu (yeni makine kullanılmış görünüyordu).
export const KULLANILMIS_KODLARI = {
  '1': 'KULLANILMIŞ KOMPLE',
  '2': 'HAYIR',
  '3': 'KULLANILMIŞ MÜNFERİT'
};

// 🕰️ ESKİ VERİ UYUMLULUĞU
// Hızlı mod bir dönem hiçbir tabloda karşılığı olmayan 'KM' / 'KK' kodlarını
// yazmış; üretimde 495 satır bunları taşıyor (KM: 474, KK: 21) ve müşteriye giden
// PDF/Excel'de ham "KM" olarak çıkıyordu. Veriyi geriye dönük değiştirmek yerine
// GÖRÜNTÜLEMEDE çözüyoruz: eski kayıtlar olduğu gibi kalsın, ekranda anlamlı görünsün.
// Yazma yolu artık bakanlık kodlarını (1/2/3) kullanıyor, yani bu liste büyümeyecek.
const ESKI_KULLANILMIS_KODLARI = {
  'KM': 'KULLANILMIŞ MÜNFERİT',
  'KK': 'KULLANILMIŞ KOMPLE',
  'H': 'HAYIR'
};

const KULLANILMAMIS_DEGERLER = ['', '0', '2', 'HAYIR', 'HAYİR', 'YOK', 'YENİ', 'YENI'];

export const kullanilmisMi = (kod) => {
  const k = String(kod ?? '').trim().toLocaleUpperCase('tr');
  // Önce bakanlık tablosu ("2" → HAYIR → kullanılmış değil), sonra eski kısa kodlar
  const tablo = KULLANILMIS_KODLARI[k] || ESKI_KULLANILMIS_KODLARI[k];
  if (tablo) return tablo !== 'HAYIR';
  return !KULLANILMAMIS_DEGERLER.includes(k);
};

// Excel/rapor için görünen etiket
export const kullanilmisEtiketi = (kod, aciklama) => {
  if (!kullanilmisMi(kod)) return 'Yeni Makine';
  const k = String(kod ?? '').trim();
  // Bakanlık kodu ("1" → KULLANILMIŞ KOMPLE) ya da eski kısa kod ("KM" → MÜNFERİT)
  if (KULLANILMIS_KODLARI[k]) return KULLANILMIS_KODLARI[k];
  if (ESKI_KULLANILMIS_KODLARI[k]) return ESKI_KULLANILMIS_KODLARI[k];
  const a = String(aciklama ?? '').trim();
  // Kod zaten açıklayıcı ("KULLANILMIŞ MÜNFERİT"); sayısal kodlarda açıklamaya düşülür.
  if (k && !/^\d+$/.test(k)) return k;
  return a || 'Kullanılmış Makine';
};
