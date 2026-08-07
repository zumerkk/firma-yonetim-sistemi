// 🏭 Makine kalemi alan biçimlendiricileri
// Birim ve "kullanılmış makine" alanları veritabanında KOD olarak tutulur; ekranlarda
// arama bileşeni kodu okunabilir metne çevirir. Excel/dışa aktarım tarafında bu çeviri
// yapılmadığı için müşteriye ham kod (ör. birim "142") gidiyordu — ortak yer burası.

// Bakanlık birim kodları (Ithal-Liste-Bilgileri "BİRİM KODLARI" listesinin yaygın olanları)
export const BIRIM_KODLARI = {
  '142': 'ADET',
  '166': 'KİLOGRAM',
  '112': 'LİTRE',
  '138': 'METRE',
  '111': 'MİLİMETRE',
  '144': 'ÇİFT',
  '143': 'DÜZÜNE',
  '145': 'YÜZ',
  '146': 'BİN',
  '139': 'METREKARE',
  '140': 'METREKÜP',
  '151': 'TON',
  '999': 'DİĞER'
};

// Birim kodunu okunabilir metne çevir: önce kod tablosu, sonra kayıttaki açıklama
// ("ADET(UNIT)" gibi ekler temizlenir), en son çare kodun kendisi.
export const birimEtiketi = (kod, aciklama) => {
  const k = String(kod ?? '').trim();
  if (k && BIRIM_KODLARI[k]) return BIRIM_KODLARI[k];
  const a = String(aciklama ?? '').trim();
  if (a) return a.replace(/\s*\([^)]*\)\s*/g, '').trim() || a;
  return k;
};

// "Kullanılmış makine" kodu bakanlık listesinde üç değer alır:
// KULLANILMIŞ KOMPLE / HAYIR / KULLANILMIŞ MÜNFERİT. "HAYIR" da dolu bir değer olduğundan
// "alan dolu ⇒ kullanılmış" varsayımı yanlıştır — yeni makineler kullanılmış görünüyordu.
const KULLANILMAMIS_DEGERLER = ['', '0', 'HAYIR', 'HAYİR', 'YOK', 'YENİ', 'YENI'];

export const kullanilmisMi = (kod) => {
  const k = String(kod ?? '').trim().toLocaleUpperCase('tr');
  return !KULLANILMAMIS_DEGERLER.includes(k);
};

// Excel/rapor için görünen etiket
export const kullanilmisEtiketi = (kod, aciklama) => {
  if (!kullanilmisMi(kod)) return 'Yeni Makine';
  const k = String(kod ?? '').trim();
  const a = String(aciklama ?? '').trim();
  // Kod zaten açıklayıcı ("KULLANILMIŞ MÜNFERİT"); sayısal kodlarda açıklamaya düşülür.
  if (k && !/^\d+$/.test(k)) return k;
  return a || 'Kullanılmış Makine';
};
