// 📋 Dosya İş Akış Takip Sistemi - MongoDB Model
// Her belge talebi için iş akışı takibi

const mongoose = require('mongoose');

// ============================================================================
// 📌 TALEP TÜRLERİ (71 adet - CSV'den)
// ============================================================================
const TALEP_TURLERI = [
  'Belge Başvuru Talebi',
  'Belge Devir Talebi',
  'Belge İthal Makine Devir Vazgeç Revize Talebi',
  'Belge Kapatma Revize Talebi',
  'Belge Yerli Makine Devir Vazgeç Revize Talebi',
  'Birleştirme/Bölünme Yoluyla Belge Devir Talebi',
  'Destek Unsuru Revize Talebi',
  'Devir Öncesi Fatura Açma Revize Talebi',
  'Elektrik Gücü Revize Talebi',
  'Enerji Desteği Belge Talebi',
  'Enerji Desteği Ekspertiz Başvuru Talebi',
  'Enerji Desteği Fatura Ödeme Talebi',
  'Enerji Desteği Revize Talebi',
  'Eski Belgeden Devir İşlemi',
  'Eski Belgeden Devir İşlemi İthal Revize',
  'Faiz Desteği Başvuru Talebi',
  'Faiz Desteği İptal',
  'Faiz Yatırım Gerçekleşme Tespit Talebi',
  'Fatura Aktif Hale Getirme Talebi',
  'Finansal Kiralama Revize Talebi',
  'Firma Başvuru Talebi',
  'Gümrük Gerçekleşme Ek Süre Revize Talebi',
  'Harcama Belgesi Aktif Hale Getirme Talebi',
  'İthal Finansal Kiralama Vazgeçme',
  'İthal Liste Finansal Kiralama',
  'İhraç İthal İzin Revize Talebi',
  'İhraç İzin Revize Talebi',
  'İhraç Yerli İzin Revize Talebi',
  'İptal Belge Aktifleştirme Revize Talebi',
  'İstihdam Revize Talebi',
  'İthal Makine Revize Talebi',
  'İthal Sat Geri Kirala',
  'İthal Satış Vazgeçme Revize Talebi',
  'İthal Teçhizat Devir Revize Talebi',
  'Kapalı Belge Açma Revize Talebi',
  'Kapalı Belge Fatura Girişi',
  'Kapalı Belge Fatura Revize Talebi',
  'Kapalı Belge İşlem Talebi',
  'Kapasite Revize Talebi',
  'Kiralama İzin Revize Talebi',
  'Makine Kiralama İthal İzin Talebi',
  'Makine Kiralama Yerli İzin Talebi',
  'Nitelikli Gerçekleşen Harcama Tespiti',
  'Nitelikli Personel Başvuru Talebi',
  'Nitelikli Personel Destek Ödemesi Talebi',
  'Özel Şart Revize Talebi',
  'Resen Belge İptal Revize Talebi',
  'Resen Belge Kapatma Revize Talebi',
  'Resen Belge Kapatma Talebi',
  'Resen Enerji Desteği Talebi',
  'Resen Enerji Tüketim Bilgileri Talebi',
  'Resen İptal Başvurusu',
  'Resen İşlem Başvuru Talebi',
  'Resen Müeyyide İşlemi',
  'Resen Nitelikli Ödeme Düzeltme',
  'Resen Nitelikli Personel Yararlanıcı Talebi',
  'Sabit Yatırım Finansman Revize Talebi',
  'Satış İzin Revize Talebi',
  'Satış İthal İzin Revize Talebi',
  'Satış Yerli İzin Revize Talebi',
  'Süre Revize Talebi',
  'Teminatlı İthalatı Belgeye Dönüştürme Başvuru Talebi',
  'Yatırım Cinsi Revize Talebi',
  'Yatırım Finansman Revize Talebi',
  'Yatırım Yeri Revize Talebi',
  'Yerli Finansal Kiralama Vazgeçme',
  'Yerli Liste Finansal Kiralama',
  'Yerli Makine Revize Talebi',
  'Yerli Sat Geri Kirala',
  'Yerli Satış Vazgeçme Revize Talebi',
  'Yerli Teçhizat Devir Revize Talebi'
];

// ============================================================================
// 📌 DURUM KODLARİ (İş Akışı State Machine)
// ============================================================================
const DURUM_KODLARI = [
  // 2.1 MÜRACAAT ÖNCESİ
  '2.1.1_GORUSULUYOR',
  '2.1.2_BEKLE_EVRAK_TAMAM_FIYAT',
  '2.1.3_FIYAT_TAMAM_EVRAK_BEKLE',
  '2.1.4_MURACAAT_HAZIRLANIYOR',
  // 2.2 MÜRACAAT SONRASI
  '2.2.1_KURUM_DEGERLENDIRME',
  '2.2.1.1_KURUM_BEKLENIYOR',
  '2.2.1.1.1_KURUM_IRTIBAT_SAGLANDI',
  '2.2.1.1.2_KURUM_IRTIBAT_SAGLANAMADI',
  '2.2.1.1.3_KURUM_KENDI_HALINDE',
  '2.2.3_KURUM_EKSIK',
  '2.2.3.1_EKSIK_FIRMADAN_BEKLENIYOR',
  '2.2.3.2_EKSIK_BIZDEN_BEKLENIYOR',
  '2.2.3.3_EKSIK_HEM_FIRMA_HEM_BIZDEN',
  // 2.3 KURUM SONUÇLANMA
  '2.3.1_SONUC_FIRMAYA_ILETILDI',
  '2.3.2_SONUC_BEKLETILECEK',
  '2.3.3_TALEP_FIRMA_IPTAL',
  '2.3.4_TALEP_GM_IPTAL'
];

// Ana Aşamalar
const ANA_ASAMALAR = [
  'MURACAAT_ONCESI',
  'MURACAAT_SONRASI',
  'KURUM_SONUCLANMA',
  'TAMAMLANDI'
];

// ============================================================================
// 📌 TARIHLI NOT SCHEMA
// ============================================================================
const tarihliNotSchema = new mongoose.Schema({
  metin: { type: String, required: true },
  tarih: { type: Date, default: Date.now },
  yazan: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  yazanAdi: { type: String }
}, { _id: true, timestamps: false });

// ============================================================================
// 📌 DOSYA SCHEMA
// ============================================================================
const dosyaSchema = new mongoose.Schema({
  dosyaAdi: { type: String, required: true },
  dosyaYolu: { type: String, required: true },
  dosyaTipi: { type: String },
  dosyaBoyutu: { type: Number },
  yukleyenKisi: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  yukleyenAdi: { type: String },
  yuklemeTarihi: { type: Date, default: Date.now }
}, { _id: true, timestamps: false });

// ============================================================================
// 📌 ANA MODEL: DosyaTakip
// ============================================================================
const dosyaTakipSchema = new mongoose.Schema({
  // --- KİMLİK BİLGİLERİ ---
  takipId: {
    type: String,
    unique: true,
    index: true
  },
  gmId: { type: String, trim: true },
  
  // --- FİRMA BİLGİLERİ ---
  firma: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Firma',
    required: [true, 'Firma seçimi zorunludur']
  },
  firmaId: { type: String, trim: true },
  firmaUnvan: { type: String, trim: true },

  // --- BELGE BİLGİLERİ (Belgeden Getir) ---
  belge: {
    type: mongoose.Schema.Types.ObjectId,
    refPath: 'belgeSistemi'
  },
  belgeSistemi: {
    type: String,
    enum: ['Tesvik', 'YeniTesvik'],
    default: 'Tesvik'
  },
  belgeId: { type: String, trim: true },
  ytbNo: { type: String, trim: true },
  ytbBaslamaTarihi: { type: Date },
  ytbBitisTarihi: { type: Date },
  belgeTuru: { type: String, trim: true },
  sektorKonu: { type: String, trim: true },
  belgeGoruntulemeLinki: { type: String, trim: true },
  belgeDurumu: { type: String, trim: true },

  // --- TALEP BİLGİLERİ ---
  talepTuru: {
    type: String,
    enum: TALEP_TURLERI,
    required: [true, 'Talep türü seçimi zorunludur']
  },

  // --- DURUM YÖNETİMİ (State Machine) ---
  anaAsama: {
    type: String,
    enum: ANA_ASAMALAR,
    default: 'MURACAAT_ONCESI'
  },
  durum: {
    type: String,
    enum: DURUM_KODLARI,
    default: '2.1.1_GORUSULUYOR'
  },
  durumAciklamasi: { type: String, trim: true },
  durumRengi: {
    type: String,
    enum: ['mavi', 'sari', 'turuncu', 'kirmizi', 'yesil', 'gri', 'mor'],
    default: 'mavi'
  },

  // ============================================================================
  // 2.1 MÜRACAAT ÖNCESİ
  // ============================================================================
  muraacatOncesi: {
    // 2.1.1 - 2.1.3 Görüşülüyor
    gorusmeYapan: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    gorusmeYapanAdi: { type: String },
    gorusmeNotlari: [tarihliNotSchema],
    gorusmeEvraklari: [dosyaSchema],
    sozlesmeNotlari: { type: String, trim: true },

    // 2.1.4 Müracaat Hazırlanıyor
    muraacatHazirlayanPersonel: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    muraacatHazirlayanAdi: { type: String },
    muraacatGorusmeNotlari: [tarihliNotSchema],
    eksikEvraklar: [tarihliNotSchema],
    muraacatKlasor: [dosyaSchema]
  },

  // ============================================================================
  // 2.2 MÜRACAAT SONRASI
  // ============================================================================
  muraacatSonrasi: {
    takibiYapanPersonel: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    takibiYapanAdi: { type: String },

    // 2.2.1 Kurum Değerlendirme
    kurumDegerlendirme: {
      kurumDaire: { type: String, trim: true },
      daireUzman: { type: String, trim: true },
      
      // 2.2.1.1 Kurum Bekleniyor
      gorusmeNotlari: [tarihliNotSchema],
      kurumIrtibatDurumu: {
        type: String,
        enum: ['bekleniyor', 'saglandi', 'saglanamadi', 'kendiHalinde', ''],
        default: ''
      }
    },

    // 2.2.3 Kurum Eksik
    kurumEksik: {
      eksikKaynak: {
        type: String,
        enum: ['firma', 'biz', 'herIkisi', ''],
        default: ''
      },

      // 2.2.3.1 Eksik Firmadan Bekleniyor
      firmadanBeklenen: {
        firmaYetkilisi: { type: String, trim: true },
        beklenenEksikler: [tarihliNotSchema],
        gelenBelgeler: [dosyaSchema]
      },

      // 2.2.3.2 Eksik Bizden Bekleniyor
      bizdenBeklenen: {
        personel: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        personelAdi: { type: String },
        beklenenEksikler: [tarihliNotSchema],
        gelenBelgeler: [dosyaSchema]
      },

      // 2.2.3.3 Eksik Hem Firma Hem Bizden
      herIkisindenBeklenen: {
        personelBitti: { type: Boolean, default: false },
        firmaBitti: { type: Boolean, default: false },
        firmaYetkilisi: { type: String, trim: true },
        personel: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        personelAdi: { type: String },
        beklenenEksikler: [tarihliNotSchema],
        gelenBelgeler: [dosyaSchema]
      }
    }
  },

  // ============================================================================
  // 2.3 KURUM SONUÇLANMA
  // ============================================================================
  kurumSonuclanma: {
    sonuc: {
      type: String,
      enum: ['firmaIletildi', 'bekletilecek', 'firmaIptal', 'gmIptal', ''],
      default: ''
    },
    personel: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    personelAdi: { type: String },
    mailDusuruldu: { type: Boolean, default: false },
    sonucNotlari: [tarihliNotSchema]
  },

  // ============================================================================
  // GENEL ALANLAR
  // ============================================================================
  genelNotlar: [tarihliNotSchema],
  dosyalar: [dosyaSchema],

  // Durum Geçmişi
  durumGecmisi: [{
    oncekiDurum: String,
    yeniDurum: String,
    oncekiAnaAsama: String,
    yeniAnaAsama: String,
    degistiren: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    degistirenAdi: String,
    aciklama: String,
    tarih: { type: Date, default: Date.now }
  }],

  // Oluşturan / Güncelleyen
  olusturanKullanici: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  olusturanAdi: { type: String },
  sonGuncelleyen: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  sonGuncelleyenAdi: { type: String },

  aktif: { type: Boolean, default: true }

}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// ============================================================================
// INDEX'LER
// ============================================================================
dosyaTakipSchema.index({ firma: 1, durum: 1 });
dosyaTakipSchema.index({ talepTuru: 1 });
dosyaTakipSchema.index({ anaAsama: 1 });
dosyaTakipSchema.index({ createdAt: -1 });
dosyaTakipSchema.index({ ytbNo: 1 });
dosyaTakipSchema.index({ firmaUnvan: 'text', takipId: 'text', ytbNo: 'text' });

// ============================================================================
// OTOMATİK TAKİP ID ÜRETİMİ (DT20260001 formatı)
// ============================================================================
dosyaTakipSchema.pre('save', async function(next) {
  if (!this.takipId) {
    const year = new Date().getFullYear();
    const prefix = `DT${year}`;
    
    const lastDoc = await this.constructor.findOne(
      { takipId: new RegExp(`^${prefix}`) },
      { takipId: 1 },
      { sort: { takipId: -1 } }
    );

    let nextNum = 1;
    if (lastDoc && lastDoc.takipId) {
      const lastNum = parseInt(lastDoc.takipId.replace(prefix, ''));
      if (!isNaN(lastNum)) nextNum = lastNum + 1;
    }

    this.takipId = `${prefix}${String(nextNum).padStart(4, '0')}`;
  }
  next();
});

// ============================================================================
// VİRTUAL ALANLAR
// ============================================================================
dosyaTakipSchema.virtual('durumEtiketi').get(function() {
  const etiketler = {
    '2.1.1_GORUSULUYOR': 'Görüşülüyor',
    '2.1.2_BEKLE_EVRAK_TAMAM_FIYAT': 'Bekle - Evrak Tamam, Fiyat Bekleniyor',
    '2.1.3_FIYAT_TAMAM_EVRAK_BEKLE': 'Fiyat Tamam - Evrak Bekleniyor',
    '2.1.4_MURACAAT_HAZIRLANIYOR': 'Müracaat Hazırlanıyor',
    '2.2.1_KURUM_DEGERLENDIRME': 'Kurum Değerlendirme',
    '2.2.1.1_KURUM_BEKLENIYOR': 'Kurum Bekleniyor',
    '2.2.1.1.1_KURUM_IRTIBAT_SAGLANDI': 'Kurum İrtibat Sağlandı',
    '2.2.1.1.2_KURUM_IRTIBAT_SAGLANAMADI': 'Kurum İrtibat Sağlanamadı',
    '2.2.1.1.3_KURUM_KENDI_HALINDE': 'Kurum Kendi Halinde Kalacak',
    '2.2.3_KURUM_EKSIK': 'Kurum Eksik',
    '2.2.3.1_EKSIK_FIRMADAN_BEKLENIYOR': 'Eksik Firmadan Bekleniyor',
    '2.2.3.2_EKSIK_BIZDEN_BEKLENIYOR': 'Eksik Bizden Bekleniyor',
    '2.2.3.3_EKSIK_HEM_FIRMA_HEM_BIZDEN': 'Eksik Hem Firma Hem Bizden',
    '2.3.1_SONUC_FIRMAYA_ILETILDI': 'Sonuç Firmaya İletildi',
    '2.3.2_SONUC_BEKLETILECEK': 'Sonuç Bekletilecek',
    '2.3.3_TALEP_FIRMA_IPTAL': 'Talep Firma Tarafından İptal',
    '2.3.4_TALEP_GM_IPTAL': 'Talep GM Tarafından İptal'
  };
  return etiketler[this.durum] || this.durum;
});

dosyaTakipSchema.virtual('anaAsamaEtiketi').get(function() {
  const etiketler = {
    'MURACAAT_ONCESI': '2.1 Müracaat Öncesi',
    'MURACAAT_SONRASI': '2.2 Müracaat Sonrası',
    'KURUM_SONUCLANMA': '2.3 Kurum Sonuçlanma',
    'TAMAMLANDI': 'Tamamlandı'
  };
  return etiketler[this.anaAsama] || this.anaAsama;
});

// ============================================================================
// STATIK EXPORTS
// ============================================================================
dosyaTakipSchema.statics.TALEP_TURLERI = TALEP_TURLERI;
dosyaTakipSchema.statics.DURUM_KODLARI = DURUM_KODLARI;
dosyaTakipSchema.statics.ANA_ASAMALAR = ANA_ASAMALAR;

// Durum → Ana Aşama eşleştirmesi
dosyaTakipSchema.statics.durumToAnaAsama = function(durum) {
  if (durum.startsWith('2.1')) return 'MURACAAT_ONCESI';
  if (durum.startsWith('2.2')) return 'MURACAAT_SONRASI';
  if (durum.startsWith('2.3')) return 'KURUM_SONUCLANMA';
  return 'TAMAMLANDI';
};

// Durum rengini belirle
dosyaTakipSchema.statics.durumRengiBelirle = function(durum) {
  if (durum.startsWith('2.1.1')) return 'mavi';
  if (durum.startsWith('2.1.2') || durum.startsWith('2.1.3')) return 'sari';
  if (durum.startsWith('2.1.4')) return 'turuncu';
  if (durum.startsWith('2.2.1')) return 'mor';
  if (durum.startsWith('2.2.3')) return 'kirmizi';
  if (durum === '2.3.1_SONUC_FIRMAYA_ILETILDI') return 'yesil';
  if (durum === '2.3.2_SONUC_BEKLETILECEK') return 'sari';
  if (durum.startsWith('2.3.3') || durum.startsWith('2.3.4')) return 'gri';
  return 'mavi';
};

module.exports = mongoose.model('DosyaTakip', dosyaTakipSchema);
