// 🏆 YENİ TEŞVİK BELGESİ MODELİ - ENTERPRISE EDITION
// Devlet güncellemelerine uygun yeni teşvik sistemi
// Gelişmiş özellikler + bonus hesaplama sistemi

const mongoose = require('mongoose');
const { createTurkishInsensitiveRegex } = require('../utils/turkishUtils');

// 💰 Mali Hesaplamalar Schema
const maliHesaplamalarSchema = new mongoose.Schema({
  // Araç Araca Giderleri
  aracAracaGideri: {
    sx: { type: Number, default: 0 }, // Manuel meden
    sayisi: { type: Number, default: 0 },
    toplam: { type: Number, default: 0 }
  },
  
  // Maliyetlenen (Arazi-Arsa Bedeli)
  maliyetlenen: {
    aciklama: { type: String, trim: true, maxlength: 2000, default: '' }, // 🔧 FIX: 500 → 2000 (Arazi-Arsa Bedeli Açıklaması)
    sl: { type: Number, default: 0 }, // Metrekaresi
    sm: { type: Number, default: 0 }, // Birim Fiyatı
    sn: { type: Number, default: 0 } // SL*SM = Arazi-Arsa Bedeli
  },
  
  // Bina İnşaat Giderleri
  binaInsaatGideri: {
    aciklama: { type: String, trim: true, maxlength: 2000, default: '' }, // 🔧 FIX: 500 → 2000 (Bina İnşaat Gideri Açıklaması)
    so: { type: Number, default: 0 }, // Manuel meden
    anaBinaGideri: { type: Number, default: 0 },
    yardimciBinaGideri: { type: Number, default: 0 },
    toplamBinaGideri: { type: Number, default: 0 }
  },
  
  // Yatırım Hesaplamaları (ET-EZ)
  yatirimHesaplamalari: {
    et: { type: Number, default: 0 }, // Yatırım işletme miktarı
    eu: { type: Number, default: 0 }, // İşyolk uçu girmişlerinin sistemi
    ev: { type: Number, default: 0 }, // Yapılan uçu çeşitkin sistemi
    ew: { type: Number, default: 0 }, // Nesnci giderleri
    ex: { type: Number, default: 0 }, // Elde ve giran gösterieri
    ey: { type: Number, default: 0 }, // Diger giderleri
    ez: { type: Number, default: 0 }  // TOPLAM = (ET+EU+EV+EW+EX+EY)
  },
  
  // Makina Teçhizat
  makinaTechizat: {
    ithalMakina: { type: Number, default: 0 }, // FB
    yerliMakina: { type: Number, default: 0 },  // FC
    toplamMakina: { type: Number, default: 0 }, // FB+FC
    yeniMakina: { type: Number, default: 0 },   // FE
    kullanimisMakina: { type: Number, default: 0 }, // FF
    toplamYeniMakina: { type: Number, default: 0 }   // FE+FF
  },
  
  // Finansman
  finansman: {
    yabanciKaynak: { type: Number, default: 0 }, // FH
    ozKaynak: { type: Number, default: 0 },      // FI
    toplamFinansman: { type: Number, default: 0 } // FH+FI
  },
  
  // Genel Toplamlar
  toplamSabitYatirim: { type: Number, default: 0 }, // FA
  yatiriminTutari: { type: Number, default: 0 },
  araciArsaBedeli: { type: Number, default: 0 },
  
  // Otomatik hesaplama tarihi
  hesaplamaTarihi: { type: Date, default: Date.now },
  
  // 🆕 YENİ TEŞVİK SİSTEMİ BONUS HESAPLAMALARI
  bonusHesaplamalari: {
    // Sürdürülebilirlik Bonusu
    surdurulebilirlikBonusu: {
      temelPuan: { type: Number, default: 0 },
      cevreselEtkiPuani: { type: Number, default: 0 },
      enerjiVerimliligiPuani: { type: Number, default: 0 },
      toplamPuan: { type: Number, default: 0 },
      bonusOrani: { type: Number, default: 0 },
      bonusTutari: { type: Number, default: 0 }
    },
    
    // İnovasyon Bonusu
    inovasyonBonusu: {
      argeYatirimi: { type: Number, default: 0 },
      patentSayisi: { type: Number, default: 0 },
      teknolojikOlgunlukPuani: { type: Number, default: 0 },
      toplamPuan: { type: Number, default: 0 },
      bonusOrani: { type: Number, default: 0 },
      bonusTutari: { type: Number, default: 0 }
    },
    
    // Sosyal Etki Bonusu
    sosyalEtkiBonusu: {
      kadinIstihdamPuani: { type: Number, default: 0 },
      gencIstihdamPuani: { type: Number, default: 0 },
      engelliIstihdamPuani: { type: Number, default: 0 },
      yerelKalkınmaPuani: { type: Number, default: 0 },
      toplamPuan: { type: Number, default: 0 },
      bonusOrani: { type: Number, default: 0 },
      bonusTutari: { type: Number, default: 0 }
    },
    
    // İhracat Bonusu
    ihracatBonusu: {
      ihracatOranPuani: { type: Number, default: 0 },
      hedefPazarPuani: { type: Number, default: 0 },
      ihracatTutarPuani: { type: Number, default: 0 },
      toplamPuan: { type: Number, default: 0 },
      bonusOrani: { type: Number, default: 0 },
      bonusTutari: { type: Number, default: 0 }
    },
    
    // Ortaklık Bonusu
    ortaklikBonusu: {
      universiteSisanayiPuani: { type: Number, default: 0 },
      uluslararasiOrtaklikPuani: { type: Number, default: 0 },
      kobiOrtakligiPuani: { type: Number, default: 0 },
      startupIsbirligiPuani: { type: Number, default: 0 },
      toplamPuan: { type: Number, default: 0 },
      bonusOrani: { type: Number, default: 0 },
      bonusTutari: { type: Number, default: 0 }
    },
    
    // Dijital Dönüşüm Bonusu
    dijitalDonusumBonusu: {
      dijitalOlgunlukPuani: { type: Number, default: 0 },
      otomasyonSeviyesi: { type: Number, default: 0 },
      veriAnalitigiKullanimi: { type: Number, default: 0 },
      toplamPuan: { type: Number, default: 0 },
      bonusOrani: { type: Number, default: 0 },
      bonusTutari: { type: Number, default: 0 }
    },
    
    // Genel Bonus Özeti
    genelBonusOzeti: {
      toplamBonusPuani: { type: Number, default: 0 },
      toplamBonusOrani: { type: Number, default: 0 },
      toplamBonusTutari: { type: Number, default: 0 },
      temelTesvikTutari: { type: Number, default: 0 },
      bonusluTesvikTutari: { type: Number, default: 0 },
      hesaplamaTarihi: { type: Date, default: Date.now }
    }
  }
}, { _id: false });

// 🏭 Ürün Bilgileri Schema - U$97 Kodlu Sistem
const urunBilgileriSchema = new mongoose.Schema({
  u97Kodu: {
    type: String,
    required: true,
    trim: true,
    maxlength: 10
  },
  urunAdi: {
    type: String,
    required: true,
    trim: true,
    maxlength: 400 // 200 → 400: Bazı sektör ürün açıklamaları uzun olabiliyor
  },
  mevcutKapasite: { type: Number, default: 0 },
  ilaveKapasite: { type: Number, default: 0 },
  toplamKapasite: { type: Number, default: 0 },
  kapasiteBirimi: {
    type: String,
    trim: true,
    maxlength: 100
  },
  aktif: { type: Boolean, default: true }
}, { _id: false });

// 🛠️ Makine/Teçhizat Kalemi - Yerli liste için
const makinaKalemiYerliSchema = new mongoose.Schema({
  // Satır kimliği (alt dökümanlarda _id yok, bu alanla adreslenecek)
  rowId: { type: String, default: () => new mongoose.Types.ObjectId().toString() },
  // 🆕 Sıra numarası (otomatik atanır, manuel düzenlenebilir)
  siraNo: { type: Number, default: 0 },
  // 🆕 Bakanlık Makine ID (Bakanlık portalından gelen benzersiz makine kimliği)
  makineId: { type: String, trim: true, maxlength: 20, default: '' },
  gtipKodu: { type: String, trim: true, maxlength: 20 },
  gtipAciklamasi: { type: String, trim: true, maxlength: 1000 },
  adiVeOzelligi: { type: String, trim: true, maxlength: 500 },
  miktar: { type: Number, default: 0 },
  birim: { type: String, trim: true, maxlength: 50 },
  // 🆕 Birim açıklaması (gösterim amaçlı)
  birimAciklamasi: { type: String, trim: true, maxlength: 200, default: '' },
  birimFiyatiTl: { type: Number, default: 0 }, // KDV hariç
  toplamTutariTl: { type: Number, default: 0 }, // KDV hariç
  kdvIstisnasi: { type: String, enum: ['EVET', 'HAYIR', ''], default: '' },
  // 🆕 Ek alanlar (CSV şablonlarına uygun)
  makineTechizatTipi: { type: String, trim: true, default: '' },
  finansalKiralamaMi: { type: String, enum: ['EVET', 'HAYIR', ''], default: '' },
  finansalKiralamaAdet: { type: Number, default: 0 },
  finansalKiralamaSirket: { type: String, trim: true, default: '' },
  gerceklesenAdet: { type: Number, default: 0 },
  gerceklesenTutar: { type: Number, default: 0 },
  iadeDevirSatisVarMi: { type: String, enum: ['EVET', 'HAYIR', ''], default: '' },
  iadeDevirSatisAdet: { type: Number, default: 0 },
  iadeDevirSatisTutar: { type: Number, default: 0 },
  // 🆕 ETUYS gönderim seçimi: yalnızca işaretlenen makineler ETUYS işlemlerine dahil edilir
  etuysSecili: { type: Boolean, default: false },
  // 📦 Talep/Karar Süreci (Bakanlık onay-red-kısmi onay)
  talep: {
    durum: { type: String, enum: ['taslak', 'bakanliga_gonderildi', 'revize_istendi'], default: 'taslak' },
    istenenAdet: { type: Number, default: 0 },
    talepTarihi: { type: Date },
    talepNotu: { type: String, trim: true, maxlength: 500 }
  },
  karar: {
    kararDurumu: { type: String, enum: ['beklemede', 'onay', 'kismi_onay', 'red', 'revize'], default: 'beklemede' },
    onaylananAdet: { type: Number, default: 0 },
    kararTarihi: { type: Date },
    kararNotu: { type: String, trim: true, maxlength: 500 }
  }
}, { _id: false });

// 🛠️ Makine/Teçhizat Kalemi - İthal liste için (FOB ve ek alanlar)
const makinaKalemiIthalSchema = new mongoose.Schema({
  // Satır kimliği (alt dökümanlarda _id yok, bu alanla adreslenecek)
  rowId: { type: String, default: () => new mongoose.Types.ObjectId().toString() },
  // 🆕 Sıra numarası (otomatik atanır, manuel düzenlenebilir)
  siraNo: { type: Number, default: 0 },
  // 🆕 Bakanlık Makine ID (Bakanlık portalından gelen benzersiz makine kimliği)
  makineId: { type: String, trim: true, maxlength: 20, default: '' },
  gtipKodu: { type: String, trim: true, maxlength: 20 },
  gtipAciklamasi: { type: String, trim: true, maxlength: 1000 },
  adiVeOzelligi: { type: String, trim: true, maxlength: 500 },
  miktar: { type: Number, default: 0 },
  birim: { type: String, trim: true, maxlength: 50 },
  // 🆕 Birim açıklaması (gösterim amaçlı)
  birimAciklamasi: { type: String, trim: true, maxlength: 200, default: '' },
  // FOB alanları ve döviz bilgileri
  birimFiyatiFob: { type: Number, default: 0 }, // Menşe ülke döviz birim fiyatı (FOB)
  gumrukDovizKodu: { type: String, trim: true, uppercase: true, maxlength: 10 },
  toplamTutarFobUsd: { type: Number, default: 0 },
  toplamTutarFobTl: { type: Number, default: 0 },
  // Manuel kur girişi alanları
  kurManuel: { type: Boolean, default: false },
  kurManuelDeger: { type: Number, default: 0 },
  // Ek nitelikler
  // Kullanılmış makine alanı artık referans kod (ör: 1,2,3) veya açıklama tutulabilir
  kullanilmisMakine: { type: String, trim: true, maxlength: 50, default: '' },
  kullanilmisMakineAciklama: { type: String, trim: true, maxlength: 200, default: '' },
  ckdSkdMi: { type: String, enum: ['EVET', 'HAYIR', ''], default: '' },
  aracMi: { type: String, enum: ['EVET', 'HAYIR', ''], default: '' },
  // ⏮️ Eski alanlar (geriye dönük uyumluluk için tutulur)
  birimFiyatiTl: { type: Number, default: 0 },
  toplamTutariTl: { type: Number, default: 0 },
  kdvIstisnasi: { type: String, enum: ['EVET', 'HAYIR', ''], default: '' },
  // 🆕 Ek alanlar (CSV şablonlarına uygun)
  makineTechizatTipi: { type: String, trim: true, default: '' },
  kdvMuafiyeti: { type: String, enum: ['EVET', 'HAYIR', ''], default: '' },
  gumrukVergisiMuafiyeti: { type: String, enum: ['EVET', 'HAYIR', ''], default: '' },
  finansalKiralamaMi: { type: String, enum: ['EVET', 'HAYIR', ''], default: '' },
  finansalKiralamaAdet: { type: Number, default: 0 },
  finansalKiralamaSirket: { type: String, trim: true, default: '' },
  gerceklesenAdet: { type: Number, default: 0 },
  gerceklesenTutar: { type: Number, default: 0 },
  iadeDevirSatisVarMi: { type: String, enum: ['EVET', 'HAYIR', ''], default: '' },
  iadeDevirSatisAdet: { type: Number, default: 0 },
  iadeDevirSatisTutar: { type: Number, default: 0 },
  // 🆕 ETUYS gönderim seçimi: yalnızca işaretlenen makineler ETUYS işlemlerine dahil edilir
  etuysSecili: { type: Boolean, default: false },
  // 📦 Talep/Karar Süreci (Bakanlık onay-red-kısmi onay)
  talep: {
    durum: { type: String, enum: ['taslak', 'bakanliga_gonderildi', 'revize_istendi'], default: 'taslak' },
    istenenAdet: { type: Number, default: 0 },
    talepTarihi: { type: Date },
    talepNotu: { type: String, trim: true, maxlength: 500 }
  },
  karar: {
    kararDurumu: { type: String, enum: ['beklemede', 'onay', 'kismi_onay', 'red', 'revize'], default: 'beklemede' },
    onaylananAdet: { type: Number, default: 0 },
    kararTarihi: { type: Date },
    kararNotu: { type: String, trim: true, maxlength: 500 }
  }
}, { _id: false });

// 🧾 Makine Revizyonu Snapshot Schema
// Her revize başlangıcı/bitişi veya geri dönüş işleminde o anki makine listeleri saklanır
const makineRevizyonSchema = new mongoose.Schema({
  revizeId: { type: String, default: () => new mongoose.Types.ObjectId().toString(), index: true },
  revizeTarihi: { type: Date, default: Date.now },
  revizeTuru: { type: String, enum: ['start', 'final', 'revert'], default: 'start' },
  aciklama: { type: String, trim: true, maxlength: 500 },
  yapanKullanici: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  // İsteğe bağlı revize süreç tarihleri
  revizeMuracaatTarihi: { type: Date },
  revizeOnayTarihi: { type: Date },
  // 🆕 Süreç görünürlüğü için faz tarihleri
  hazirlikTarihi: { type: Date },
  talepTarihi: { type: Date },
  kararTarihi: { type: Date },
  // ETUYS metadata (devlet sistemi ile uyum için)
  talepNo: { type: String, trim: true },
  belgeNo: { type: String, trim: true },
  belgeId: { type: String, trim: true },
  talepTipi: { type: String, trim: true },
  talepDetayi: { type: String, trim: true },
  durum: { type: String, trim: true },
  daire: { type: String, trim: true },
  basvuruTarihi: { type: Date },
  odemeTalebi: { type: String, trim: true },
  retSebebi: { type: String, trim: true },
  // O anki makine listesi snapshot'ı
  yerli: [makinaKalemiYerliSchema],
  ithal: [makinaKalemiIthalSchema],
  // Eğer bir revizyondan dönüldüyse kaynak bilgi
  kaynakRevizeId: { type: String, trim: true }
}, { _id: false });

// 🎯 Destek Unsurları Schema
const destekUnsurlariSchema = new mongoose.Schema({
  destekUnsuru: {
    type: String,
    required: true,
    trim: true,
    maxlength: 200
  },
  sarti: {
    type: String,
    required: false, // ✅ FİXED: Opsiyonel yapıldı - bazı destek unsurlarında şart girilmeyebilir
    trim: true,
    maxlength: 500,
    default: '' // 🔧 FIX: '-' → '' (boş string)
  },
  aciklama: {
    type: String,
    trim: true,
    maxlength: 1000
  },
  durum: {
    type: String,
    enum: ['beklemede', 'onaylandi', 'reddedildi', 'revize_gerekli'],
    default: 'beklemede'
  }
}, { _id: false });

// ⚖️ Özel Şartlar Schema
const ozelSartlarSchema = new mongoose.Schema({
  koşulNo: { type: Number, required: true },
  koşulMetni: {
    type: String,
    required: true,
    trim: true,
    maxlength: 300
  },
  aciklamaNotu: {
    type: String,
    trim: true,
    maxlength: 2000  // Uzun resmi açıklamalar için artırıldı
  },
  durum: {
    type: String,
    enum: ['beklemede', 'tamamlandi', 'iptal'],
    default: 'beklemede'
  }
}, { _id: false });

// 📋 Belge Yönetimi Schema - Excel'deki tüm belge alanları
// 🔧 FIX: unique kaldırıldı - subdocument'larda unique index sorunlu, controller'da kontrol edilecek
// 🔧 FIX: required kaldırıldı - taslak teşvik oluşturma için belgeId/belgeNo boş bırakılabilmeli
const belgeYonetimiSchema = new mongoose.Schema({
  belgeId: {
    type: String,
    required: false,  // Taslak için opsiyonel
    trim: true,
    sparse: true,     // Boş değerlere izin ver
    default: ''
  },
  belgeNo: {
    type: String,
    required: false,  // Taslak için opsiyonel
    trim: true,
    default: ''
  },
  belgeTarihi: { type: Date, required: false },  // Taslak için opsiyonel
  dayandigiKanun: {
    type: String,
    trim: true,
    maxlength: 200
  },
  belgeMuracaatNo: {
    type: String,
    trim: true
  },
  belgeDurumu: {
    type: String,
    enum: ['hazirlaniyor', 'başvuru_yapildi', 'inceleniyor', 'ek_belge_bekleniyor', 'onaylandi', 'reddedildi', 'iptal'],
    default: 'hazirlaniyor'
    // index: true - KALDIRILDI: schema.index'te zaten var
  },
  belgeMuracaatTarihi: { type: Date },
  belgeBaslamaTarihi: { type: Date },
  belgeBitisTarihi: { type: Date }, // 🔧 FIX: belgebitisTarihi → belgeBitisTarihi (camelCase)
  uzatimTarihi: { type: Date },
  mucbirUzumaTarihi: { type: Date }, // 🔧 FIX: mudebbirUzatimTarihi → mucbirUzumaTarihi (frontend ile uyumlu)
  // 🏆 Öncelikli Yatırım Alanları
  oncelikliYatirim: {
    type: String,
    enum: ['evet', 'hayır', ''],
    default: '',
    trim: true
  },
  oncelikliYatirimTuru: {
    type: String,
    trim: true,
    default: ''
  }
}, { _id: false });

// 🎨 Durum Renk Kodlaması Schema - Excel'deki renk sistemi
const durumRengiSchema = new mongoose.Schema({
  durum: {
    type: String,
    required: true,
    enum: ['yesil', 'sari', 'kirmizi', 'mavi', 'turuncu', 'gri']
  },
  aciklama: {
    type: String,
    required: true,
    maxlength: 100
  },
  hexKod: {
    type: String,
    required: true,
    match: /^#[0-9A-F]{6}$/i
  }
}, { _id: false });

// 🏆 ANA TEŞVİK SCHEMA - ENTERPRISE LEVEL
const tesvikSchema = new mongoose.Schema({
  // 🆔 Temel Kimlik Bilgileri
  tesvikId: {
    type: String,
    unique: true,
    sparse: true,
    trim: true,
    index: true
  },
  
  gmId: {
    type: String,
    required: true,
    trim: true,
    index: true
  },
  
  // 🏢 Firma Bağlantısı
  firma: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Firma',
    required: true,
    index: true
  },
  firmaId: {
    type: String,
    required: true,
    trim: true,
    index: true
  },
  yatirimciUnvan: {
    type: String,
    required: true,
    trim: true,
    maxlength: 500
  },

  // 🧰 Makine-Teçhizat Listeleri (Yerli/İthal ayrı şemalar)
  makineListeleri: {
    yerli: [makinaKalemiYerliSchema],
    ithal: [makinaKalemiIthalSchema]
  },
  
  // 📝 Makine Revizyonları (snapshot listesi)
  makineRevizyonlari: [makineRevizyonSchema],
  
  // 📝 Künye Bilgileri - Excel Şablonuna Uygun
  kunyeBilgileri: {
    talepSonuc: { type: String, trim: true },
    revizeId: { type: String, trim: true }, // 🆕 Excel'den eklendi
    sorguBaglantisi: { type: String, trim: true },
    yatirimci: { type: String, trim: true },
    yatirimciUnvan: { type: String, trim: true },
    sgkSicilNo: { type: String, trim: true }, // 🆕 Excel'den eklendi
    sermayeTuru: { type: String, trim: true, default: '' }, // 🆕 Sermaye Türü eklendi
    kararTarihi: { type: Date },
    kararSayisi: { type: String, trim: true },
    yonetmelikMaddesi: { type: String, trim: true },
    basvuruTarihi: { type: Date },
    dosyaNo: { type: String, trim: true },
    projeBedeli: { type: Number, default: 0 },
    tesvikMiktari: { type: Number, default: 0 },
    tesvikOrani: { type: Number, default: 0 }
  },
  
  // 📋 Belge Yönetimi
  belgeYonetimi: belgeYonetimiSchema,
  
  // 👥 İstihdam Bilgileri
  istihdam: {
    mevcutKisi: { type: Number, default: 0 },
    ilaveKisi: { type: Number, default: 0 },
    toplamKisi: { type: Number, default: 0 }
  },
  
  // 🏭 Yatırım Bilgileri - 2 Bölüm
  yatirimBilgileri: {
    // Bölüm 1 - Sınıflandırma  
    yatirimKonusu: {
      type: String,
      required: true,
      trim: true,
      maxlength: 200
    },
    // 🎯 YENİ PROFESYONEL ALANLAR - Resimden eklenenler
    cazibeMerkeziMi: {
      type: String,
      enum: ['evet', 'hayir', ''],
      default: '',
      trim: true
    },
    savunmaSanayiProjesi: {
      type: String,
      enum: ['evet', 'hayir', ''],
      default: '',
      trim: true
    },
    enerjiUretimKaynagi: {
      type: String,
      trim: true,
      default: ''
    },
    cazibeMerkezi2018: {
      type: String,
      enum: ['evet', 'hayir', ''],
      default: '',
      trim: true
    },
    cazibeMerkeziDeprem: {
      type: String,
      enum: ['evet', 'hayir', ''],
      default: '',
      trim: true
    },
    hamleMi: {
      type: String,
      enum: ['evet', 'hayir', ''],
      default: '',
      trim: true
    },
    vergiIndirimsizDestek: {
      type: String,
      enum: ['evet', 'hayir', ''],
      default: '',
      trim: true
    },
    oecdKategori: {
      type: String,
      trim: true,
      default: ''
    },
    sCinsi1: { type: String, trim: true },
    tCinsi2: { type: String, trim: true },
    uCinsi3: { type: String, trim: true },
    vCinsi4: { type: String, trim: true },
    destekSinifi: {
      type: String,
      required: true,
      trim: true
    },
    
    // Bölüm 2 - Lokasyon
    yerinIl: {
      type: String,
      required: true,
      trim: true,
      uppercase: true
      // index: true - KALDIRILDI: schema.index'te zaten var
    },
    yerinIlce: {
      type: String,
      trim: true,
      uppercase: true
    },
    ada: { type: String, trim: true }, // 🆕 Excel'den eklendi
    parsel: { type: String, trim: true }, // 🆕 Excel'den eklendi
    yatirimAdresi1: { type: String, trim: true },
    yatirimAdresi2: { type: String, trim: true },
    yatirimAdresi3: { type: String, trim: true },
    osbIseMudurluk: { type: String, trim: true },
    ilBazliBolge: { type: String, trim: true }, // 🆕 Excel'den eklendi
    ilceBazliBolge: { type: String, trim: true }, // 🆕 Excel'den eklendi
    serbsetBolge: { type: String, trim: true }, // 🆕 Excel'den eklendi
    
    // 🆕 YENİ TEŞVİK SİSTEMİ ÖZEL ALANLARI
    yeniAlanlar: {
      dijitalDonusumProjesi: {
        type: String,
        enum: ['evet', 'hayir', ''],
        default: '',
        trim: true
      },
      surdurulebilirlikPuani: {
        type: Number,
        min: 0,
        max: 100,
        default: 0
      },
      inovasyonKategorisi: {
        type: String,
        enum: ['ar-ge', 'teknoloji-transfer', 'startup', 'patent', 'tasarim', ''],
        default: '',
        trim: true
      },
      cevreselEtki: {
        karbonAyakIzi: { type: Number, default: 0 },
        enerjiVerimliligi: { type: String, enum: ['A+', 'A', 'B', 'C', 'D', ''], default: '' },
        atikAzaltma: { type: Boolean, default: false },
        yenilenebilirEnerji: { type: Boolean, default: false }
      },
      sosyalEtki: {
        kadinIstihdami: { type: Number, default: 0 },
        gencIstihdami: { type: Number, default: 0 },
        engelliIstihdami: { type: Number, default: 0 },
        yerelKalkinma: { type: Boolean, default: false }
      },
      teknolojikOlgunluk: {
        type: String,
        enum: ['TRL1', 'TRL2', 'TRL3', 'TRL4', 'TRL5', 'TRL6', 'TRL7', 'TRL8', 'TRL9', ''],
        default: '',
        trim: true
      },
      ihracatHedefi: {
        hedefPazar: [{ type: String, trim: true }],
        ihracatOrani: { type: Number, min: 0, max: 100, default: 0 },
        ihracatTutari: { type: Number, default: 0 }
      },
      ortaklikBilgileri: {
        universiteSisanayi: { type: Boolean, default: false },
        uluslararasiOrtaklik: { type: Boolean, default: false },
        kobiOrtakligi: { type: Boolean, default: false },
        startupIsbirligi: { type: Boolean, default: false }
      }
    }
  },
  
  // 📦 Ürün Yönetimi - U$97 Kodlu Sistem
  urunler: [urunBilgileriSchema],
  
  // 🎯 Destek Unsurları
  destekUnsurlari: [destekUnsurlariSchema],
  
  // ⚖️ Özel Şartlar
  ozelSartlar: [ozelSartlarSchema],
  
  // 💰 Mali Hesaplamalar
  maliHesaplamalar: maliHesaplamalarSchema,
  
  // 🎨 Durum ve Renk Yönetimi
  durumBilgileri: {
    genelDurum: {
      type: String,
      enum: ['taslak', 'hazirlaniyor', 'başvuru_yapildi', 'inceleniyor', 'ek_belge_istendi', 'revize_talep_edildi', 'onay_bekliyor', 'onaylandi', 'reddedildi', 'iptal_edildi'],
      default: 'taslak',
      index: true
    },
    durumRengi: {
      type: String,
      enum: ['yesil', 'sari', 'kirmizi', 'mavi', 'turuncu', 'gri'],
      default: 'gri'
    },
    sonDurumGuncelleme: { type: Date, default: Date.now },
    durumAciklamasi: {
      type: String,
      trim: true,
      maxlength: 500
    }
  },
  
  // 📝 Revizyon Takibi
  revizyonlar: [{
    revizyonNo: { type: Number, required: true },
    revizyonTarihi: { type: Date, default: Date.now },
    revizyonSebebi: {
      type: String,
      required: true,
      trim: true,
      maxlength: 500
    },
    yapanKullanici: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    degisikenAlanlar: [{
      alan: String,
      eskiDeger: mongoose.Schema.Types.Mixed,
      yeniDeger: mongoose.Schema.Types.Mixed
    }],
    durumOncesi: String,
    durumSonrasi: String
  }],
  
  // 📊 Süreç Takibi
  surecTakibi: {
    baslamaTarihi: { type: Date },
    tahminibitisTarihi: { type: Date },
    gercekbitisTarihi: { type: Date },
    gecenGunler: { type: Number, default: 0 },
    kalanGunler: { type: Number, default: 0 }
  },
  
  // 📎 Ek Belgeler ve Dosyalar
  ekBelgeler: [{
    dosyaAdi: { type: String, required: true },
    dosyaYolu: { type: String, required: true },
    dosyaBoyutu: { type: Number },
    dosyaTipi: { type: String },
    yuklemeTarihi: { type: Date, default: Date.now },
    aciklama: { type: String, trim: true }
  }],
  
  // 📝 Notlar ve Açıklamalar
  notlar: {
    dahiliNotlar: {
      type: String,
      trim: true,
      maxlength: 2000
    },
    resmiAciklamalar: {
      type: String,
      trim: true,
      maxlength: 2000
    },
    uyarilar: [{
      uyariMetni: String,
      uyariTipi: { type: String, enum: ['bilgi', 'dikkat', 'uyari', 'tehlike'] },
      uyariTarihi: { type: Date, default: Date.now }
    }]
  },
  
  // 📊 Sistem Bilgileri
  aktif: {
    type: Boolean,
    default: true
    // index: true - KALDIRILDI: compound index'te zaten var
  },
  
  olusturanKullanici: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  
  sonGuncelleyen: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  
  sonGuncellemeNotlari: {
    type: String,
    trim: true,
    maxlength: 500
  }
  
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// 🔍 İndeksler - Performance Optimized (DUPLICATE'lar TEMİZLENDİ)
// Primary indexes
tesvikSchema.index({ tesvikId: 1, aktif: 1 });
tesvikSchema.index({ gmId: 1, firmaId: 1 });
tesvikSchema.index({ createdAt: -1 });

// Single field indexes (önemli query'ler için)
tesvikSchema.index({ 'yatirimBilgileri.yerinIl': 1 });
tesvikSchema.index({ 'belgeYonetimi.belgeDurumu': 1 });

// Compound index for complex queries
tesvikSchema.index({ 
  firma: 1, 
  'durumBilgileri.genelDurum': 1, 
  aktif: 1 
});

// 🔄 Pre-save Middleware - Otomatik Teşvik ID
tesvikSchema.pre('save', async function(next) {
  try {
    if (this.isNew && !this.tesvikId) {
      // TEŞ + yıl + sıra formatında ID oluştur
      const year = new Date().getFullYear();
      const lastTesvik = await this.constructor.findOne(
        { tesvikId: new RegExp(`^TES${year}`) },
        { tesvikId: 1 },
        { sort: { tesvikId: -1 } }
      );
      
      let nextNumber = 1;
      if (lastTesvik && lastTesvik.tesvikId) {
        const currentNumber = parseInt(lastTesvik.tesvikId.slice(7)); // TES2024 sonrası
        nextNumber = currentNumber + 1;
      }
      
      this.tesvikId = `TES${year}${nextNumber.toString().padStart(4, '0')}`;
    }
    
    // Mali hesaplamaları otomatik güncelle
    this.updateMaliHesaplamalar();
    
    next();
  } catch (error) {
    next(error);
  }
});

// 💰 Mali Hesaplama Otomasyonu
tesvikSchema.methods.updateMaliHesaplamalar = function() {
  // SN = SL * SM hesaplama
  if (this.maliHesaplamalar.maliyetlenen.sl && this.maliHesaplamalar.maliyetlenen.sm) {
    this.maliHesaplamalar.maliyetlenen.sn = 
      this.maliHesaplamalar.maliyetlenen.sl * this.maliHesaplamalar.maliyetlenen.sm;
  }
  
  // EZ = ET+EU+EV+EW+EX+EY toplam hesaplama
  const yatirim = this.maliHesaplamalar.yatirimHesaplamalari;
  yatirim.ez = (yatirim.et || 0) + (yatirim.eu || 0) + (yatirim.ev || 0) + 
               (yatirim.ew || 0) + (yatirim.ex || 0) + (yatirim.ey || 0);
  
  // Makine toplam hesaplamaları (kalemlerden otomatik topla)
  const makina = this.maliHesaplamalar.makinaTechizat;

  // Yerli kalemlerden TL toplamını hesapla
  const yerliKalemler = Array.isArray(this.makineListeleri?.yerli) ? this.makineListeleri.yerli : [];
  const yerliToplamTl = yerliKalemler.reduce((sum, r) => {
    const tl = Number(r.toplamTutariTl || r.toplamTl || 0);
    return sum + (isNaN(tl) ? 0 : tl);
  }, 0);

  // İthal kalemlerden TL toplamını hesapla (FOB TL öncelikli; yoksa toplamTl)
  const ithalKalemler = Array.isArray(this.makineListeleri?.ithal) ? this.makineListeleri.ithal : [];
  const ithalToplamTl = ithalKalemler.reduce((sum, r) => {
    const tl = Number(r.toplamTutarFobTl || r.toplamTl || 0);
    return sum + (isNaN(tl) ? 0 : tl);
  }, 0);

  // 🔧 FIX: İthal Makine ($) alanları USD cinsinden olmalı - toplamTutarFobUsd kullan (toplamTutarFobTl değil!)
  // Yeni/Kullanılmış ayrımı (kullanilmisMakine alanı dolu ise kullanılmış kabul edilir)
  const yeniToplam = (
    ithalKalemler.filter(r => !r.kullanilmisMakine).reduce((s, r) => s + (Number(r.toplamTutarFobUsd || 0) || 0), 0)
  );
  const kullanilmisToplam = (
    ithalKalemler.filter(r => !!r.kullanilmisMakine).reduce((s, r) => s + (Number(r.toplamTutarFobUsd || 0) || 0), 0)
  );

  // 🔧 FIX: Sadece makineListeleri dolu ise hesaplanan değerleri kullan
  // Boşsa kullanıcının manuel girdiği değerleri koru
  const hasMakineListesi = yerliKalemler.length > 0 || ithalKalemler.length > 0;
  
  // 🔧 FIX: Kullanıcının manuel girdiği değerleri KORU
  // Sadece toplamları hesapla, bireysel alanları değiştirme
  makina.toplamMakina = (makina.yerliMakina || 0) + (makina.ithalMakina || 0);
  makina.toplamYeniMakina = (makina.yeniMakina || 0) + (makina.kullanimisMakina || 0);
  
  // Finansman toplam
  const finansman = this.maliHesaplamalar.finansman;
  finansman.toplamFinansman = (finansman.yabanciKaynak || 0) + (finansman.ozKaynak || 0);
  
  // 🔧 FIX: araciArsaBedeli senkronizasyonu — maliyetlenen.sn'den üst seviye alana kopyala
  // Frontend araciArsaBedeli'ni okuyor, import ise maliyetlenen.sn'ye yazıyor
  if (this.maliHesaplamalar.maliyetlenen.sn && !this.maliHesaplamalar.araciArsaBedeli) {
    this.maliHesaplamalar.araciArsaBedeli = this.maliHesaplamalar.maliyetlenen.sn;
  }
  if (this.maliHesaplamalar.araciArsaBedeli && !this.maliHesaplamalar.maliyetlenen.sn) {
    this.maliHesaplamalar.maliyetlenen.sn = this.maliHesaplamalar.araciArsaBedeli;
  }
  
  // 🔧 FIX: TOPLAM SABİT YATIRIM TUTARI otomatik hesaplama
  // Excel import'ta bu alan genellikle boş geliyor → alt bileşenlerden hesapla
  const araziArsa = this.maliHesaplamalar.maliyetlenen?.sn || this.maliHesaplamalar.araciArsaBedeli || 0;
  const binaInsaat = this.maliHesaplamalar.binaInsaatGideri?.toplamBinaGideri || 0;
  const makinaToplam = makina.toplamMakina || 0;
  const digerYatirim = yatirim.ez || 0;
  const hesaplananToplam = araziArsa + binaInsaat + makinaToplam + digerYatirim;
  
  // Eğer toplamSabitYatirim 0 veya boşsa → alt bileşenlerden hesapla
  if (!this.maliHesaplamalar.toplamSabitYatirim && hesaplananToplam > 0) {
    this.maliHesaplamalar.toplamSabitYatirim = hesaplananToplam;
  }
  
  // 🔧 FIX: yatiriminTutari senkronizasyonu  
  if (!this.maliHesaplamalar.yatiriminTutari && this.maliHesaplamalar.toplamSabitYatirim) {
    this.maliHesaplamalar.yatiriminTutari = this.maliHesaplamalar.toplamSabitYatirim;
  }
  
  // İstihdam toplamı
  this.istihdam.toplamKisi = (this.istihdam.mevcutKisi || 0) + (this.istihdam.ilaveKisi || 0);
  
  // Ürün kapasiteleri
  this.urunler.forEach(urun => {
    urun.toplamKapasite = (urun.mevcutKapasite || 0) + (urun.ilaveKapasite || 0);
  });
  
  // 🆕 Bonus hesaplamalarını güncelle
  if (typeof this.updateBonusHesaplamalari === 'function') {
    this.updateBonusHesaplamalari();
  }
};

// 🆕 YENİ TEŞVİK SİSTEMİ BONUS HESAPLAMA METODLARİ
tesvikSchema.methods.updateBonusHesaplamalari = function() {
  const yeniAlanlar = this.yatirimBilgileri?.yeniAlanlar || {};
  const bonusHesap = this.maliHesaplamalar.bonusHesaplamalari;
  
  // Sürdürülebilirlik Bonusu Hesaplama
  this.hesaplaSurdurulebilirlikBonusu();
  
  // İnovasyon Bonusu Hesaplama
  this.hesaplaInovasyonBonusu();
  
  // Sosyal Etki Bonusu Hesaplama
  this.hesaplaSosyalEtkiBonusu();
  
  // İhracat Bonusu Hesaplama
  this.hesaplaIhracatBonusu();
  
  // Ortaklık Bonusu Hesaplama
  this.hesaplaOrtaklikBonusu();
  
  // Dijital Dönüşüm Bonusu Hesaplama
  this.hesaplaDijitalDonusumBonusu();
  
  // Genel Bonus Özeti Hesaplama
  this.hesaplaGenelBonusOzeti();
};

// Sürdürülebilirlik Bonusu Hesaplama
tesvikSchema.methods.hesaplaSurdurulebilirlikBonusu = function() {
  const yeniAlanlar = this.yatirimBilgileri?.yeniAlanlar || {};
  const bonus = this.maliHesaplamalar.bonusHesaplamalari.surdurulebilirlikBonusu;
  
  // Temel puan (sürdürülebilirlik puanından)
  bonus.temelPuan = yeniAlanlar.surdurulebilirlikPuani || 0;
  
  // Çevresel etki puanı
  const cevreselEtki = yeniAlanlar.cevreselEtki || {};
  let cevreselPuan = 0;
  
  // Karbon ayak izi puanı (düşük = yüksek puan)
  if (cevreselEtki.karbonAyakIzi <= 10) cevreselPuan += 20;
  else if (cevreselEtki.karbonAyakIzi <= 25) cevreselPuan += 15;
  else if (cevreselEtki.karbonAyakIzi <= 50) cevreselPuan += 10;
  
  // Enerji verimliliği puanı
  const enerjiMap = { 'A+': 25, 'A': 20, 'B': 15, 'C': 10, 'D': 5 };
  cevreselPuan += enerjiMap[cevreselEtki.enerjiVerimliligi] || 0;
  
  // Atık azaltma ve yenilenebilir enerji
  if (cevreselEtki.atikAzaltma) cevreselPuan += 15;
  if (cevreselEtki.yenilenebilirEnerji) cevreselPuan += 20;
  
  bonus.cevreselEtkiPuani = cevreselPuan;
  
  // Enerji verimliliği puanı (ayrı hesaplama)
  bonus.enerjiVerimliligiPuani = enerjiMap[cevreselEtki.enerjiVerimliligi] || 0;
  
  // Toplam puan
  bonus.toplamPuan = bonus.temelPuan + bonus.cevreselEtkiPuani + bonus.enerjiVerimliligiPuani;
  
  // Bonus oranı hesaplama (0-15% arası)
  if (bonus.toplamPuan >= 80) bonus.bonusOrani = 15;
  else if (bonus.toplamPuan >= 60) bonus.bonusOrani = 10;
  else if (bonus.toplamPuan >= 40) bonus.bonusOrani = 7;
  else if (bonus.toplamPuan >= 20) bonus.bonusOrani = 5;
  else bonus.bonusOrani = 0;
  
  // Bonus tutarı
  const temelTutar = this.maliHesaplamalar?.toplamSabitYatirim || 0;
  bonus.bonusTutari = (temelTutar * bonus.bonusOrani) / 100;
};

// İnovasyon Bonusu Hesaplama
tesvikSchema.methods.hesaplaInovasyonBonusu = function() {
  const yeniAlanlar = this.yatirimBilgileri?.yeniAlanlar || {};
  const bonus = this.maliHesaplamalar.bonusHesaplamalari.inovasyonBonusu;
  
  // AR-GE yatırımı puanı (toplam yatırımın %'si olarak)
  const toplamYatirim = this.maliHesaplamalar?.toplamSabitYatirim || 0;
  const argeOrani = toplamYatirim > 0 ? (bonus.argeYatirimi / toplamYatirim) * 100 : 0;
  
  let argePuani = 0;
  if (argeOrani >= 10) argePuani = 30;
  else if (argeOrani >= 5) argePuani = 20;
  else if (argeOrani >= 2) argePuani = 10;
  
  // Patent sayısı puanı
  let patentPuani = 0;
  if (bonus.patentSayisi >= 5) patentPuani = 25;
  else if (bonus.patentSayisi >= 3) patentPuani = 20;
  else if (bonus.patentSayisi >= 1) patentPuani = 15;
  
  // Teknolojik olgunluk puanı
  const trlMap = {
    'TRL9': 30, 'TRL8': 25, 'TRL7': 20, 'TRL6': 15,
    'TRL5': 10, 'TRL4': 8, 'TRL3': 6, 'TRL2': 4, 'TRL1': 2
  };
  bonus.teknolojikOlgunlukPuani = trlMap[yeniAlanlar.teknolojikOlgunluk] || 0;
  
  // İnovasyon kategorisi bonus
  let kategoriPuani = 0;
  const kategoriMap = {
    'ar-ge': 15, 'teknoloji-transfer': 12, 'startup': 10,
    'patent': 13, 'tasarim': 8
  };
  kategoriPuani = kategoriMap[yeniAlanlar.inovasyonKategorisi] || 0;
  
  // Toplam puan
  bonus.toplamPuan = argePuani + patentPuani + bonus.teknolojikOlgunlukPuani + kategoriPuani;
  
  // Bonus oranı hesaplama (0-20% arası)
  if (bonus.toplamPuan >= 80) bonus.bonusOrani = 20;
  else if (bonus.toplamPuan >= 60) bonus.bonusOrani = 15;
  else if (bonus.toplamPuan >= 40) bonus.bonusOrani = 10;
  else if (bonus.toplamPuan >= 20) bonus.bonusOrani = 5;
  else bonus.bonusOrani = 0;
  
  // Bonus tutarı
  const temelTutar = this.maliHesaplamalar?.toplamSabitYatirim || 0;
  bonus.bonusTutari = (temelTutar * bonus.bonusOrani) / 100;
};

// Sosyal Etki Bonusu Hesaplama
tesvikSchema.methods.hesaplaSosyalEtkiBonusu = function() {
  const yeniAlanlar = this.yatirimBilgileri?.yeniAlanlar || {};
  const sosyalEtki = yeniAlanlar.sosyalEtki || {};
  const bonus = this.maliHesaplamalar.bonusHesaplamalari.sosyalEtkiBonusu;
  
  const toplamIstihdam = this.istihdam?.toplamKisi || 0;
  
  // Kadın istihdamı puanı (%30 ve üzeri hedef)
  const kadinOrani = toplamIstihdam > 0 ? (sosyalEtki.kadinIstihdami / toplamIstihdam) * 100 : 0;
  if (kadinOrani >= 50) bonus.kadinIstihdamPuani = 25;
  else if (kadinOrani >= 40) bonus.kadinIstihdamPuani = 20;
  else if (kadinOrani >= 30) bonus.kadinIstihdamPuani = 15;
  else if (kadinOrani >= 20) bonus.kadinIstihdamPuani = 10;
  
  // Genç istihdamı puanı (%25 ve üzeri hedef)
  const gencOrani = toplamIstihdam > 0 ? (sosyalEtki.gencIstihdami / toplamIstihdam) * 100 : 0;
  if (gencOrani >= 40) bonus.gencIstihdamPuani = 20;
  else if (gencOrani >= 30) bonus.gencIstihdamPuani = 15;
  else if (gencOrani >= 25) bonus.gencIstihdamPuani = 12;
  else if (gencOrani >= 15) bonus.gencIstihdamPuani = 8;
  
  // Engelli istihdamı puanı (%3 ve üzeri hedef)
  const engelliOrani = toplamIstihdam > 0 ? (sosyalEtki.engelliIstihdami / toplamIstihdam) * 100 : 0;
  if (engelliOrani >= 5) bonus.engelliIstihdamPuani = 20;
  else if (engelliOrani >= 3) bonus.engelliIstihdamPuani = 15;
  else if (engelliOrani >= 2) bonus.engelliIstihdamPuani = 10;
  
  // Yerel kalkınma puanı
  bonus.yerelKalkınmaPuani = sosyalEtki.yerelKalkinma ? 15 : 0;
  
  // Toplam puan
  bonus.toplamPuan = bonus.kadinIstihdamPuani + bonus.gencIstihdamPuani + 
                     bonus.engelliIstihdamPuani + bonus.yerelKalkınmaPuani;
  
  // Bonus oranı hesaplama (0-12% arası)
  if (bonus.toplamPuan >= 70) bonus.bonusOrani = 12;
  else if (bonus.toplamPuan >= 50) bonus.bonusOrani = 9;
  else if (bonus.toplamPuan >= 30) bonus.bonusOrani = 6;
  else if (bonus.toplamPuan >= 15) bonus.bonusOrani = 3;
  else bonus.bonusOrani = 0;
  
  // Bonus tutarı
  const temelTutar = this.maliHesaplamalar?.toplamSabitYatirim || 0;
  bonus.bonusTutari = (temelTutar * bonus.bonusOrani) / 100;
};

// İhracat Bonusu Hesaplama
tesvikSchema.methods.hesaplaIhracatBonusu = function() {
  const yeniAlanlar = this.yatirimBilgileri?.yeniAlanlar || {};
  const ihracatHedefi = yeniAlanlar.ihracatHedefi || {};
  const bonus = this.maliHesaplamalar.bonusHesaplamalari.ihracatBonusu;
  
  // İhracat oranı puanı
  const ihracatOrani = ihracatHedefi.ihracatOrani || 0;
  if (ihracatOrani >= 80) bonus.ihracatOranPuani = 30;
  else if (ihracatOrani >= 60) bonus.ihracatOranPuani = 25;
  else if (ihracatOrani >= 40) bonus.ihracatOranPuani = 20;
  else if (ihracatOrani >= 20) bonus.ihracatOranPuani = 15;
  else if (ihracatOrani >= 10) bonus.ihracatOranPuani = 10;
  
  // Hedef pazar çeşitliliği puanı
  const pazarSayisi = ihracatHedefi.hedefPazar?.length || 0;
  if (pazarSayisi >= 10) bonus.hedefPazarPuani = 20;
  else if (pazarSayisi >= 7) bonus.hedefPazarPuani = 15;
  else if (pazarSayisi >= 5) bonus.hedefPazarPuani = 12;
  else if (pazarSayisi >= 3) bonus.hedefPazarPuani = 8;
  else if (pazarSayisi >= 1) bonus.hedefPazarPuani = 5;
  
  // İhracat tutarı puanı (toplam yatırımın %'si olarak)
  const toplamYatirim = this.maliHesaplamalar?.toplamSabitYatirim || 0;
  const ihracatTutarOrani = toplamYatirim > 0 ? (ihracatHedefi.ihracatTutari / toplamYatirim) * 100 : 0;
  if (ihracatTutarOrani >= 100) bonus.ihracatTutarPuani = 25;
  else if (ihracatTutarOrani >= 75) bonus.ihracatTutarPuani = 20;
  else if (ihracatTutarOrani >= 50) bonus.ihracatTutarPuani = 15;
  else if (ihracatTutarOrani >= 25) bonus.ihracatTutarPuani = 10;
  
  // Toplam puan
  bonus.toplamPuan = bonus.ihracatOranPuani + bonus.hedefPazarPuani + bonus.ihracatTutarPuani;
  
  // Bonus oranı hesaplama (0-18% arası)
  if (bonus.toplamPuan >= 70) bonus.bonusOrani = 18;
  else if (bonus.toplamPuan >= 50) bonus.bonusOrani = 14;
  else if (bonus.toplamPuan >= 30) bonus.bonusOrani = 10;
  else if (bonus.toplamPuan >= 15) bonus.bonusOrani = 6;
  else bonus.bonusOrani = 0;
  
  // Bonus tutarı
  const temelTutar = this.maliHesaplamalar?.toplamSabitYatirim || 0;
  bonus.bonusTutari = (temelTutar * bonus.bonusOrani) / 100;
};

// Ortaklık Bonusu Hesaplama
tesvikSchema.methods.hesaplaOrtaklikBonusu = function() {
  const yeniAlanlar = this.yatirimBilgileri?.yeniAlanlar || {};
  const ortaklikBilgileri = yeniAlanlar.ortaklikBilgileri || {};
  const bonus = this.maliHesaplamalar.bonusHesaplamalari.ortaklikBonusu;
  
  // Üniversite-sanayi işbirliği puanı
  bonus.universiteSisanayiPuani = ortaklikBilgileri.universiteSisanayi ? 25 : 0;
  
  // Uluslararası ortaklık puanı
  bonus.uluslararasiOrtaklikPuani = ortaklikBilgileri.uluslararasiOrtaklik ? 20 : 0;
  
  // KOBİ ortaklığı puanı
  bonus.kobiOrtakligiPuani = ortaklikBilgileri.kobiOrtakligi ? 15 : 0;
  
  // Startup işbirliği puanı
  bonus.startupIsbirligiPuani = ortaklikBilgileri.startupIsbirligi ? 18 : 0;
  
  // Toplam puan
  bonus.toplamPuan = bonus.universiteSisanayiPuani + bonus.uluslararasiOrtaklikPuani + 
                     bonus.kobiOrtakligiPuani + bonus.startupIsbirligiPuani;
  
  // Bonus oranı hesaplama (0-10% arası)
  if (bonus.toplamPuan >= 60) bonus.bonusOrani = 10;
  else if (bonus.toplamPuan >= 45) bonus.bonusOrani = 8;
  else if (bonus.toplamPuan >= 30) bonus.bonusOrani = 6;
  else if (bonus.toplamPuan >= 15) bonus.bonusOrani = 4;
  else bonus.bonusOrani = 0;
  
  // Bonus tutarı
  const temelTutar = this.maliHesaplamalar?.toplamSabitYatirim || 0;
  bonus.bonusTutari = (temelTutar * bonus.bonusOrani) / 100;
};

// Dijital Dönüşüm Bonusu Hesaplama
tesvikSchema.methods.hesaplaDijitalDonusumBonusu = function() {
  const yeniAlanlar = this.yatirimBilgileri?.yeniAlanlar || {};
  const bonus = this.maliHesaplamalar.bonusHesaplamalari.dijitalDonusumBonusu;
  
  // Dijital dönüşüm projesi kontrolü
  const dijitalProje = yeniAlanlar.dijitalDonusumProjesi === 'evet';
  
  if (dijitalProje) {
    // Dijital olgunluk puanı (varsayılan değerler)
    bonus.dijitalOlgunlukPuani = 30;
    
    // Otomasyon seviyesi puanı (varsayılan değerler)
    bonus.otomasyonSeviyesi = 25;
    
    // Veri analitiği kullanımı puanı (varsayılan değerler)
    bonus.veriAnalitigiKullanimi = 20;
  } else {
    bonus.dijitalOlgunlukPuani = 0;
    bonus.otomasyonSeviyesi = 0;
    bonus.veriAnalitigiKullanimi = 0;
  }
  
  // Toplam puan
  bonus.toplamPuan = bonus.dijitalOlgunlukPuani + bonus.otomasyonSeviyesi + bonus.veriAnalitigiKullanimi;
  
  // Bonus oranı hesaplama (0-8% arası)
  if (bonus.toplamPuan >= 70) bonus.bonusOrani = 8;
  else if (bonus.toplamPuan >= 50) bonus.bonusOrani = 6;
  else if (bonus.toplamPuan >= 30) bonus.bonusOrani = 4;
  else if (bonus.toplamPuan >= 15) bonus.bonusOrani = 2;
  else bonus.bonusOrani = 0;
  
  // Bonus tutarı
  const temelTutar = this.maliHesaplamalar?.toplamSabitYatirim || 0;
  bonus.bonusTutari = (temelTutar * bonus.bonusOrani) / 100;
};

// Genel Bonus Özeti Hesaplama
tesvikSchema.methods.hesaplaGenelBonusOzeti = function() {
  const bonusHesap = this.maliHesaplamalar.bonusHesaplamalari;
  const genelOzet = bonusHesap.genelBonusOzeti;
  
  // Tüm bonus puanlarını topla
  genelOzet.toplamBonusPuani = 
    bonusHesap.surdurulebilirlikBonusu.toplamPuan +
    bonusHesap.inovasyonBonusu.toplamPuan +
    bonusHesap.sosyalEtkiBonusu.toplamPuan +
    bonusHesap.ihracatBonusu.toplamPuan +
    bonusHesap.ortaklikBonusu.toplamPuan +
    bonusHesap.dijitalDonusumBonusu.toplamPuan;
  
  // Tüm bonus oranlarını topla
  genelOzet.toplamBonusOrani = 
    bonusHesap.surdurulebilirlikBonusu.bonusOrani +
    bonusHesap.inovasyonBonusu.bonusOrani +
    bonusHesap.sosyalEtkiBonusu.bonusOrani +
    bonusHesap.ihracatBonusu.bonusOrani +
    bonusHesap.ortaklikBonusu.bonusOrani +
    bonusHesap.dijitalDonusumBonusu.bonusOrani;
  
  // Maksimum bonus oranını sınırla (%50)
  if (genelOzet.toplamBonusOrani > 50) {
    genelOzet.toplamBonusOrani = 50;
  }
  
  // Tüm bonus tutarlarını topla
  genelOzet.toplamBonusTutari = 
    bonusHesap.surdurulebilirlikBonusu.bonusTutari +
    bonusHesap.inovasyonBonusu.bonusTutari +
    bonusHesap.sosyalEtkiBonusu.bonusTutari +
    bonusHesap.ihracatBonusu.bonusTutari +
    bonusHesap.ortaklikBonusu.bonusTutari +
    bonusHesap.dijitalDonusumBonusu.bonusTutari;
  
  // Temel teşvik tutarı
  genelOzet.temelTesvikTutari = this.maliHesaplamalar?.toplamSabitYatirim || 0;
  
  // Bonuslu teşvik tutarı
  genelOzet.bonusluTesvikTutari = genelOzet.temelTesvikTutari + genelOzet.toplamBonusTutari;
  
  // Hesaplama tarihi
  genelOzet.hesaplamaTarihi = new Date();
};

// 🎨 Durum Rengi Güncelleme
tesvikSchema.methods.updateDurumRengi = function() {
  const durumRenkMappingi = {
    'taslak': 'gri',
    'hazirlaniyor': 'sari',
    'başvuru_yapildi': 'mavi',
    'inceleniyor': 'turuncu',
    'ek_belge_istendi': 'sari',
    'revize_talep_edildi': 'kirmizi',
    'onay_bekliyor': 'turuncu',
    'onaylandi': 'yesil',
    'reddedildi': 'kirmizi',
    'iptal_edildi': 'gri'
  };
  
  this.durumBilgileri.durumRengi = durumRenkMappingi[this.durumBilgileri.genelDurum] || 'gri';
  this.durumBilgileri.sonDurumGuncelleme = new Date();
};

// 📊 Virtual Fields
tesvikSchema.virtual('urunSayisi').get(function() {
  return this.urunler ? this.urunler.length : 0;
});

tesvikSchema.virtual('destekUnsurSayisi').get(function() {
  return this.destekUnsurlari ? this.destekUnsurlari.length : 0;
});

tesvikSchema.virtual('toplamYatirimTutari').get(function() {
  return this.maliHesaplamalar?.toplamSabitYatirim || 0; // 🔧 Safety check eklendi
});

// 📝 Instance Methods
tesvikSchema.methods.toSafeJSON = function() {
  const obj = this.toObject();
  delete obj.__v;
  return obj;
};

tesvikSchema.methods.addRevizyon = function(revizyonData) {
  const revizyonNo = this.revizyonlar.length + 1;
  
  this.revizyonlar.push({
    revizyonNo,
    ...revizyonData,
    durumOncesi: this.durumBilgileri.genelDurum
  });
  
  // Durumu güncelle
  if (revizyonData.yeniDurum) {
    this.durumBilgileri.genelDurum = revizyonData.yeniDurum;
    this.updateDurumRengi();
  }
};

// 🎯 PROFESSIONAL CHANGE TRACKING - DEACTIVATED
// Change tracking şimdi controller seviyesinde professional olarak yapılıyor
// Model seviyesindeki hook'u devre dışı bırakıyoruz - çakışma önlemi
tesvikSchema.pre('save', function(next) {
  // Sadece temel validasyonlar ve hesaplamalar
  console.log('📝 Tesvik kaydediliyor:', this.tesvikId || 'YENİ');
  
  // Mali hesaplamaları güncelle (eğer tanımlıysa)
  if (typeof this.updateMaliHesaplamalar === 'function') {
    try {
      this.updateMaliHesaplamalar();
    } catch (error) {
      console.log('⚠️ Mali hesaplama hatası (pas geçildi):', error.message);
    }
  }
  
  // Durum rengini güncelle (eğer tanımlıysa)
  if (typeof this.updateDurumRengi === 'function') {
    try {
      this.updateDurumRengi();
    } catch (error) {
      console.log('⚠️ Durum rengi güncelleme hatası (pas geçildi):', error.message);
    }
  }
  
  next();
});

// 📊 Post Save Hook - Original değerini kaydet
tesvikSchema.post('init', function() {
  this._original = this.toObject();
});

// 🔍 Değişiklik Detay Analizi için Method
tesvikSchema.methods.analyzeChanges = function(originalData) {
  const changes = {
    belgeYonetimi: [],
    yatirimBilgileri: [],
    finansalBilgiler: [],
    urunBilgileri: [],
    destekUnsurlari: [],
    ozelSartlar: []
  };
  
  // Ana kategorileri kontrol et
  const categories = Object.keys(changes);
  
  categories.forEach(category => {
    const original = originalData[category] || {};
    const current = this[category] || {};
    
    // Deep comparison ile değişiklikleri tespit et
    const categoryChanges = this.deepCompare(original, current, category);
    if (categoryChanges.length > 0) {
      changes[category] = categoryChanges;
    }
  });
  
  return changes;
};

// 🔍 Deep Comparison Helper
tesvikSchema.methods.deepCompare = function(obj1, obj2, parentPath = '') {
  const changes = [];
  const allKeys = new Set([...Object.keys(obj1), ...Object.keys(obj2)]);
  
  allKeys.forEach(key => {
    const fullPath = parentPath ? `${parentPath}.${key}` : key;
    const val1 = obj1[key];
    const val2 = obj2[key];
    
    if (Array.isArray(val1) && Array.isArray(val2)) {
      // Array değişiklikleri
      if (JSON.stringify(val1) !== JSON.stringify(val2)) {
        changes.push({
          field: fullPath,
          oldValue: val1,
          newValue: val2,
          changeType: 'array_modified'
        });
      }
    } else if (typeof val1 === 'object' && typeof val2 === 'object' && val1 && val2) {
      // Nested object değişiklikleri
      const nestedChanges = this.deepCompare(val1, val2, fullPath);
      changes.push(...nestedChanges);
    } else if (val1 !== val2) {
      // Primitive değer değişiklikleri
      changes.push({
        field: fullPath,
        oldValue: val1,
        newValue: val2,
        changeType: val1 === undefined ? 'added' : val2 === undefined ? 'removed' : 'modified'
      });
    }
  });
  
  return changes;
};

// 📊 Static Methods
tesvikSchema.statics.findByTesvikId = function(tesvikId) {
  return this.findOne({ tesvikId: tesvikId.toUpperCase(), aktif: true });
};

tesvikSchema.statics.findByFirma = function(firmaId) {
  return this.find({ firma: firmaId, aktif: true }).sort({ createdAt: -1 });
};

tesvikSchema.statics.getStatistics = async function() {
  const [
    toplamTesvik,
    aktifTesvik,
    onaylananTesvik,
    reddedilenTesvik,
    bekleyenTesvik,
    durumDagilimi
  ] = await Promise.all([
    this.countDocuments(),
    this.countDocuments({ aktif: true }),
    this.countDocuments({ 'durumBilgileri.genelDurum': 'onaylandi' }),
    this.countDocuments({ 'durumBilgileri.genelDurum': 'reddedildi' }),
    this.countDocuments({ 
      'durumBilgileri.genelDurum': { 
        $in: ['inceleniyor', 'onay_bekliyor', 'ek_belge_istendi'] 
      } 
    }),
    
    // Durum dağılımı
    this.aggregate([
      { $match: { aktif: true } },
      { $group: { _id: '$durumBilgileri.genelDurum', count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ])
  ]);
  
  return {
    toplamTesvik,
    aktifTesvik,
    onaylananTesvik,
    reddedilenTesvik,
    bekleyenTesvik,
    durumDagilimi,
    basariOrani: toplamTesvik > 0 ? ((onaylananTesvik / toplamTesvik) * 100).toFixed(1) : 0
  };
};

tesvikSchema.statics.searchTesvikler = function(searchTerm) {
  // Türkçe karakter duyarsız regex oluştur
  const turkishRegex = createTurkishInsensitiveRegex(searchTerm);
  return this.find({
    $or: [
      { tesvikId: turkishRegex },
      { gmId: turkishRegex },
      { yatirimciUnvan: turkishRegex },
      { 'yatirimBilgileri.yatirimKonusu': turkishRegex }
    ],
    aktif: true
  }).sort({ createdAt: -1 });
};

module.exports = mongoose.model('YeniTesvik', tesvikSchema, 'yenitesvik');