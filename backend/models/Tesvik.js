// 🏆 TEŞVİK BELGESİ MODELİ - ENTERPRISE EDITION
// Excel + Word şablonu analizine göre tam kapsamlı teşvik sistemi
// Devlet standartlarına uygun renk kodlaması + durum takibi

const mongoose = require('mongoose');

// 💰 Mali Hesaplamalar Schema
const maliHesaplamalarSchema = new mongoose.Schema({
  // Araç Araca Giderleri
  aracAracaGideri: {
    sx: { type: Number, default: 0 }, // Manuel meden
    sayisi: { type: Number, default: 0 },
    toplam: { type: Number, default: 0 }
  },
  
  // Maliyetlenen
  maliyetlenen: {
    sl: { type: Number, default: 0 }, // Sayı
    sm: { type: Number, default: 0 }, // Sayı
    sn: { type: Number, default: 0 } // SL*SM Çarp
  },
  
  // Bina İnşaat Giderleri
  binaInsaatGideri: {
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
  hesaplamaTarihi: { type: Date, default: Date.now }
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
    maxlength: 200
  },
  mevcutKapasite: { type: Number, default: 0 },
  ilaveKapasite: { type: Number, default: 0 },
  toplamKapasite: { type: Number, default: 0 },
  kapasiteBirimi: {
    type: String,
    trim: true,
    maxlength: 50
  },
  aktif: { type: Boolean, default: true }
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
    required: true,
    trim: true,
    maxlength: 500
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
    maxlength: 500
  },
  durum: {
    type: String,
    enum: ['beklemede', 'tamamlandi', 'iptal'],
    default: 'beklemede'
  }
}, { _id: false });

// 📋 Belge Yönetimi Schema - Excel'deki tüm belge alanları
const belgeYonetimiSchema = new mongoose.Schema({
  belgeId: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    index: true
  },
  belgeNo: {
    type: String,
    required: true,
    trim: true
  },
  belgeTarihi: { type: Date, required: true },
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
  belgebitisTarihi: { type: Date },
  uzatimTarihi: { type: Date },
  mudebbirUzatimTarihi: { type: Date },
  ozellikliYatirim: { 
    type: String, 
    enum: ['evet', 'hayir'], 
    trim: true 
  } // 🆕 Excel'den eklendi
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
  
  // 📝 Künye Bilgileri - Excel Şablonuna Uygun
  kunyeBilgileri: {
    talepSonuc: { type: String, trim: true },
    revizeId: { type: String, trim: true }, // 🆕 Excel'den eklendi
    sorguBaglantisi: { type: String, trim: true },
    yatirimci: { type: String, trim: true },
    yatirimciUnvan: { type: String, trim: true },
    sgkSicilNo: { type: String, trim: true }, // 🆕 Excel'den eklendi
    kararTarihi: { type: Date },
    kararSayisi: { type: String, trim: true },
    yonetmelikMaddesi: { type: String, trim: true },
    basvuruTarihi: { type: Date },
    
    // 🆕 EKLENEN EKSİK ALANLAR
    basvuruKontroldenSira: { type: String, trim: true }, // Başvuru Kontrolden Sıra
    sickSicilNo: { type: String, trim: true }, // SİCK Sicil No
    sektorelTuru: { type: String, trim: true }, // Sektörel Türü
    kurmaninTarihi: { type: Date }, // Kurmanın Tarihi
    kurmaninSayi: { type: String, trim: true }, // Kurmanın Sayı
    mevcutTarihi: { type: Date }, // Mevcut Tarihi
    tasvibenyatirimisi: { type: String, trim: true, maxlength: 1000 }, // Tasviben Yatırım İşi
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
    sCinsi1: { type: String, trim: true },
    tCinsi2: { type: String, trim: true },
    uCinsi3: { type: String, trim: true },
    vCinsi4: { type: String, trim: true },
    
    // 🆕 YATIRIM CİNSİ DETAYLARI - Resimden eklenen
    sSayi: { type: String, trim: true }, // S Sayı
    eKayit: { type: String, trim: true }, // E Kayıt  
    uSayi: { type: String, trim: true }, // U Sayı
    vSayi: { type: String, trim: true }, // V Sayı
    
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
    serbsetBolge: { type: String, trim: true } // 🆕 Excel'den eklendi
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
  
  // 📋 Proje Tanımı - Zorunlu değil, detaylı açıklama alanı
  projeTanimi: {
    aciklama: { 
      type: String, 
      trim: true, 
      maxlength: 2000 // Büyük metin alanı
    },
    amac: { 
      type: String, 
      trim: true, 
      maxlength: 1000 
    },
    kapsam: { 
      type: String, 
      trim: true, 
      maxlength: 1000 
    },
    beklenenSonuc: { 
      type: String, 
      trim: true, 
      maxlength: 1000 
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
  
  // Makina toplam hesaplamaları
  const makina = this.maliHesaplamalar.makinaTechizat;
  makina.toplamMakina = (makina.ithalMakina || 0) + (makina.yerliMakina || 0);
  makina.toplamYeniMakina = (makina.yeniMakina || 0) + (makina.kullanimisMakina || 0);
  
  // Finansman toplam
  const finansman = this.maliHesaplamalar.finansman;
  finansman.toplamFinansman = (finansman.yabanciKaynak || 0) + (finansman.ozKaynak || 0);
  
  // İstihdam toplamı
  this.istihdam.toplamKisi = (this.istihdam.mevcutKisi || 0) + (this.istihdam.ilaveKisi || 0);
  
  // Ürün kapasiteleri
  this.urunler.forEach(urun => {
    urun.toplamKapasite = (urun.mevcutKapasite || 0) + (urun.ilaveKapasite || 0);
  });
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

// 🎯 OTOMATIK CHANGE TRACKING - Pre Save Hook
tesvikSchema.pre('save', function(next) {
  // Yeni dokümanse değilse (update işlemi)
  if (!this.isNew) {
    // Değişen alanları tespit et
    const modifiedPaths = this.modifiedPaths();
    
    if (modifiedPaths.length > 0) {
      // Revizyonlar alanı değişmişse (manuel revizyon eklemesi) pas geç
      if (modifiedPaths.includes('revizyonlar')) {
        return next();
      }
      
      const degisikenAlanlar = [];
      
      modifiedPaths.forEach(path => {
        // Önemli sistemsel alanları filtrele
        if (!['updatedAt', 'sonGuncelleyen', 'sonGuncellemeNotlari', '__v'].includes(path)) {
          const eskiDeger = this._original ? this._original[path] : this.get(path);
          const yeniDeger = this.get(path);
          
          // Değer gerçekten değişmişse kaydet
          if (JSON.stringify(eskiDeger) !== JSON.stringify(yeniDeger)) {
            degisikenAlanlar.push({
              alan: path,
              eskiDeger: eskiDeger,
              yeniDeger: yeniDeger
            });
          }
        }
      });
      
      // Değişiklik varsa otomatik revizyon ekle
      if (degisikenAlanlar.length > 0) {
        const revizyonNo = this.revizyonlar.length + 1;
        
        this.revizyonlar.push({
          revizyonNo,
          revizyonTarihi: new Date(),
          revizyonSebebi: 'Otomatik Güncelleme',
          yapanKullanici: this.sonGuncelleyen,
          degisikenAlanlar: degisikenAlanlar,
          durumOncesi: this.durumBilgileri?.genelDurum,
          durumSonrasi: this.durumBilgileri?.genelDurum
        });
      }
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
  const regex = new RegExp(searchTerm, 'i');
  return this.find({
    $or: [
      { tesvikId: regex },
      { gmId: regex },
      { yatirimciUnvan: regex },
      { 'yatirimBilgileri.yatirimKonusu': regex }
    ],
    aktif: true
  }).sort({ createdAt: -1 });
};

module.exports = mongoose.model('Tesvik', tesvikSchema); 