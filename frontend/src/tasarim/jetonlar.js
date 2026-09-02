// 🎛️ TASARIM JETONLARI — TEK KAYNAK
//
// Madde 6 / Faz 2. Bugün görünüm kuralları sistemde 4.478 ayrı `sx={{...}}`
// içinde dağınık; bir renk kararını değiştirmek 4.478 yere dokunmak demek.
// Bu dosya o kararların TEK adresi. Yeni kod buradan okur; eski kod Faz 3'te
// ekran ekran buraya bağlanır.
//
// Kaynak: ETUYS ekran görüntüleri (etuys/ klasörü, ST TURKUAZ belge 578589).
// Kurallar Faz 1 tasarım dili belgesinde onaylandı.
//
// ⚠️ Buraya renk/ölçü eklerken ETUYS'te karşılığı olduğundan emin olun.
// "Şuraya biraz mor koyalım" isteği bu dosyada değil, tasarım dili belgesinde
// tartışılır — dosya büyüdükçe sadeleştirme amacı kaybolur.

// ─────────────────────────── RENK ───────────────────────────
export const renk = {
  // Zemin ve yüzey
  zemin: '#F1F4F7',        // uygulama arka planı
  yuzey: '#FFFFFF',        // panel / kart
  yuzeyAlt: '#E8EDF2',     // bölüm başlığı şeridi, tablo başlığı

  // Metin
  murekkep: '#1B2733',     // birincil metin
  sessiz: '#5A6B7B',       // etiket, ikincil metin
  soluk: '#8A99A8',        // devre dışı

  // Çizgi
  cizgi: '#DCE3E9',        // panel/tablo kenarlığı
  alanCizgi: '#C6D0D9',    // form alanı kenarlığı

  // Vurgu
  ana: '#1B6EA8',          // etkin sekme, bağlantı, birincil düğme
  anaKoyu: '#155A8A',
  anaHafif: '#E4EDF2',
  baslikYazi: '#1B4E75',   // bölüm başlığı metni

  // 🟡 SARI = sistem karar verdi, kullanıcı yazamaz.
  // ETUYS'te tek sarı İKİ anlam taşır: hesaplanan alan VE seçili satır.
  // Ortak paydası "buraya sen yazmadın" — o yüzden ikisi de aynı jeton.
  hesapZemin: '#FFF8DC',
  hesapYazi: '#7A6112',
  hesapCizgi: '#E4D08A',

  // Anlam renkleri — vurgu renginden AYRI, sadece durum bildirir
  onay: '#2E7D57',
  onayHafif: '#E3F0E9',
  bekle: '#B7791F',
  bekleHafif: '#FBF0D9',
  red: '#C0392B',
  redHafif: '#F8E4E2'
};

// ─────────────────────────── TİPOGRAFİ ───────────────────────────
// Gövde yazı tipi değişmiyor: Inter zaten sistemde kurulu ve ETUYS'ün
// sistem fontuna yakın nötrlükte.
export const yazi = {
  aile: '"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
  aileSayi: '"Inter", ui-monospace, monospace',

  govde: 13,        // tablo hücresi, alan değeri
  etiket: 12.5,     // form etiketi
  baslik: 12.5,     // bölüm başlığı (kalın)
  tabloBaslik: 11.5,
  kucuk: 11,        // sayfalama, durum çubuğu
  buyuk: 15,        // sayfa başlığı

  normal: 400,
  orta: 500,
  kalin: 600,
  cokKalin: 700,

  satirYuksekligi: 1.45
};

// ─────────────────────────── ARALIK ───────────────────────────
// ETUYS'ün yoğunluğu: bir ekranda 25+ alan. Aralıklar bilinçli olarak dar.
export const aralik = {
  satir: 4,      // form satırları arası
  hucre: '5px 9px',
  panelIc: 14,   // panel iç boşluğu — HER panelde aynı
  sutun: 28,     // iki sütun arası
  grup: 16       // alan grupları arası
};

// ─────────────────────────── KENARLIK ───────────────────────────
// Yuvarlak köşe ve gölge YOK. ETUYS'te de yok; bugünkü arayüzü "kalabalık"
// gösteren asıl sebep bunlar (bkz. Faz 1 belgesi).
export const kenar = {
  yaricap: 0,
  yaricapKucuk: 3,   // yalnız sekme üst köşeleri ve düğme
  ince: `1px solid ${renk.cizgi}`,
  alan: `1px solid ${renk.alanCizgi}`,
  vurgu: `2px solid ${renk.ana}`,
  golge: 'none'
};

// ─────────────────────────── HAZIR STİL PARÇALARI ───────────────────────────
// Bileşenler bunları paylaşır; aynı kuralın iki yerde ayrı yazılması
// bu projede zaten sorun çıkardı (bkz. iki MakineYonetimi dosyası).
export const stil = {
  panelBasligi: {
    display: 'flex',
    alignItems: 'center',
    gap: 0.9,
    backgroundColor: renk.yuzeyAlt,
    color: renk.baslikYazi,
    border: kenar.ince,
    borderLeft: `3px solid ${renk.ana}`,
    px: 1.1,
    py: 0.5,
    fontSize: `${yazi.baslik}px`,
    fontWeight: yazi.cokKalin
  },

  alan: {
    border: kenar.alan,
    backgroundColor: renk.yuzey,
    px: 1,
    py: 0.5,
    minHeight: 26,
    fontSize: `${yazi.govde}px`,
    fontVariantNumeric: 'tabular-nums',
    borderRadius: kenar.yaricap
  },

  alanHesap: {
    backgroundColor: renk.hesapZemin,
    borderColor: renk.hesapCizgi,
    color: renk.hesapYazi,
    fontWeight: yazi.kalin
  },

  tabloBasligi: {
    backgroundColor: renk.yuzeyAlt,
    color: renk.murekkep,
    fontWeight: yazi.kalin,
    fontSize: `${yazi.tabloBaslik}px`,
    border: kenar.ince,
    padding: '6px 9px',
    textAlign: 'left',
    whiteSpace: 'nowrap'
  },

  tabloHucresi: {
    padding: aralik.hucre,
    border: kenar.ince,
    fontSize: `${yazi.govde}px`,
    maxWidth: 260,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap'
  }
};

// Anlam rengi → rozet stili (durum gösterimi tek yerden)
export const durumStili = {
  onay: { bg: renk.onayHafif, yazi: renk.onay },
  bekle: { bg: renk.bekleHafif, yazi: renk.bekle },
  red: { bg: renk.redHafif, yazi: renk.red },
  notr: { bg: renk.yuzeyAlt, yazi: renk.sessiz }
};

const jetonlar = { renk, yazi, aralik, kenar, stil, durumStili };
export default jetonlar;
