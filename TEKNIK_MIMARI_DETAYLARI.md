# 🔧 TEKNİK MİMARİ DETAYLARI - Firma Yönetim Sistemi

## 📊 VERİTABANI ŞEMALARI - DETAYLI ANALİZ

### 🏆 Tesvik Model - En Kapsamlı Schema (952 satır)

#### 1. Makine Schema Yapısı
```javascript
// Yerli Makine Schema
makinaKalemiYerliSchema {
  rowId: String (MongoDB ObjectId)
  siraNo: Number
  gtipKodu: String (max 20)
  gtipAciklamasi: String (max 1000)
  adiVeOzelligi: String (max 500)
  miktar: Number
  birim: String (max 50)
  birimAciklamasi: String (max 200)
  birimFiyatiTl: Number
  toplamTutariTl: Number
  kdvIstisnasi: Enum ['EVET', 'HAYIR', '']
  makineTechizatTipi: String
  finansalKiralamaMi: Enum
  finansalKiralamaAdet: Number
  finansalKiralamaSirket: String
  gerceklesenAdet: Number
  gerceklesenTutar: Number
  iadeDevirSatisVarMi: Enum
  etuysSecili: Boolean
  
  // Talep/Karar Süreci
  talep: {
    durum: Enum ['taslak', 'bakanliga_gonderildi', 'revize_istendi']
    istenenAdet: Number
    talepTarihi: Date
    talepNotu: String (max 500)
  }
  
  karar: {
    kararDurumu: Enum ['beklemede', 'onay', 'kismi_onay', 'red', 'revize']
    onaylananAdet: Number
    kararTarihi: Date
    kararNotu: String (max 500)
  }
}

// İthal Makine Schema (Yerli + FOB alanları)
makinaKalemiIthalSchema {
  // Yerli Schema'nın tüm alanları +
  
  birimFiyatiFob: Number (FOB birim fiyatı)
  gumrukDovizKodu: String (USD, EUR, vb.)
  toplamTutarFobUsd: Number
  toplamTutarFobTl: Number
  
  // Manuel kur girişi
  kurManuel: Boolean
  kurManuelDeger: Number
  
  // Ek nitelikler
  kullanilmisMakine: String (kod)
  kullanilmisMakineAciklama: String
  ckdSkdMi: Enum
  aracMi: Enum
  kdvMuafiyeti: Enum
  gumrukVergisiMuafiyeti: Enum
}
```

#### 2. Revizyon Snapshot Sistemi
```javascript
makineRevizyonSchema {
  revizeId: String (unique)
  revizeTarihi: Date
  revizeTuru: Enum ['start', 'final', 'revert']
  aciklama: String (max 500)
  yapanKullanici: ObjectId (User ref)
  
  // Süreç tarihleri
  revizeMuracaatTarihi: Date
  revizeOnayTarihi: Date
  hazirlikTarihi: Date
  talepTarihi: Date
  kararTarihi: Date
  
  // ETUYS metadata
  talepNo: String
  belgeNo: String
  belgeId: String
  talepTipi: String
  talepDetayi: String
  durum: String
  daire: String
  basvuruTarihi: Date
  odemeTalebi: String
  retSebebi: String
  
  // Snapshot (o anki makine listeleri)
  yerli: [makinaKalemiYerliSchema]
  ithal: [makinaKalemiIthalSchema]
  
  // Geri dönüş bilgisi
  kaynakRevizeId: String
}
```

#### 3. Mali Hesaplamalar
```javascript
maliHesaplamalarSchema {
  // Araç ve Arsa
  aracAracaGideri: {
    sx: Number
    sayisi: Number
    toplam: Number
  }
  
  // Maliyetlenen
  maliyetlenen: {
    sl: Number
    sm: Number
    sn: Number  // Otomatik: sl * sm
  }
  
  // Bina İnşaat
  binaInsaatGideri: {
    so: Number
    anaBinaGideri: Number
    yardimciBinaGideri: Number
    toplamBinaGideri: Number
  }
  
  // Yatırım Hesaplamaları (ET-EZ)
  yatirimHesaplamalari: {
    et: Number  // Yatırım işletme
    eu: Number  // İşyolu
    ev: Number  // Yapılan
    ew: Number  // Nesnel
    ex: Number  // Elde edilen
    ey: Number  // Diğer
    ez: Number  // TOPLAM (otomatik)
  }
  
  // Makina Teçhizat (otomatik hesaplama)
  makinaTechizat: {
    ithalMakina: Number    // FB
    yerliMakina: Number    // FC
    toplamMakina: Number   // FB+FC
    yeniMakina: Number     // FE
    kullanimisMakina: Number  // FF
    toplamYeniMakina: Number  // FE+FF
  }
  
  // Finansman
  finansman: {
    yabanciKaynak: Number  // FH
    ozKaynak: Number       // FI
    toplamFinansman: Number // FH+FI
  }
  
  // Genel
  toplamSabitYatirim: Number  // FA
  yatiriminTutari: Number
  araciArsaBedeli: Number
  hesaplamaTarihi: Date
}
```

#### 4. Durum Yönetimi ve Renk Kodlama
```javascript
durumBilgileri: {
  genelDurum: Enum [
    'taslak',
    'hazirlaniyor',
    'başvuru_yapildi',
    'inceleniyor',
    'ek_belge_istendi',
    'revize_talep_edildi',
    'onay_bekliyor',
    'onaylandi',
    'reddedildi',
    'iptal_edildi'
  ]
  
  durumRengi: Enum [
    'yesil',      // Onaylandı
    'sari',       // Beklemede
    'kirmizi',    // Reddedildi/Revize
    'mavi',       // Başvuru yapıldı
    'turuncu',    // İnceleniyor
    'gri'         // Taslak/İptal
  ]
  
  sonDurumGuncelleme: Date
  durumAciklamasi: String (max 500)
}
```

---

## 🔐 GÜVENLİK MİMARİSİ - DETAYLI

### 1. Authentication Flow
```javascript
// Login Process
POST /api/auth/login
├── 1. Email + Password alınır
├── 2. User.findByEmail(email) - Database query
├── 3. user.sifreKontrol(password) - Bcrypt compare
│      └── bcrypt.compare(candidatePassword, hashedPassword)
├── 4. JWT Token oluşturulur
│      ├── Payload: { id, email, rol }
│      ├── Secret: process.env.JWT_SECRET
│      └── Expiry: 7 gün
├── 5. User.sonGiris güncellenir
└── 6. Response: { success, token, user }

// Password Hashing (Pre-save middleware)
userSchema.pre('save', async function(next) {
  if (!this.isModified('sifre')) return next();
  
  const salt = await bcrypt.genSalt(12);  // 12 rounds
  this.sifre = await bcrypt.hash(this.sifre, salt);
  next();
});
```

### 2. Authorization Middleware
```javascript
// auth.js middleware
const auth = async (req, res, next) => {
  try {
    // 1. Token'ı header'dan al
    const token = req.header('Authorization')?.replace('Bearer ', '');
    
    if (!token) {
      throw new Error('Token bulunamadı');
    }
    
    // 2. Token'ı verify et
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // 3. User'ı bul
    const user = await User.findOne({ 
      _id: decoded.id, 
      aktif: true 
    });
    
    if (!user) {
      throw new Error('Kullanıcı bulunamadı');
    }
    
    // 4. Request'e ekle
    req.user = user;
    req.token = token;
    next();
    
  } catch (error) {
    res.status(401).json({ error: 'Kimlik doğrulama hatası' });
  }
};

// Permission check
const checkPermission = (permission) => {
  return (req, res, next) => {
    if (!req.user.yetkiler[permission]) {
      return res.status(403).json({ 
        error: 'Bu işlem için yetkiniz yok' 
      });
    }
    next();
  };
};
```

### 3. Security Headers (Helmet.js)
```javascript
app.use(helmet());

// Aktif olan headerlar:
X-DNS-Prefetch-Control: off
X-Frame-Options: SAMEORIGIN
Strict-Transport-Security: max-age=15552000; includeSubDomains
X-Download-Options: noopen
X-Content-Type-Options: nosniff
X-XSS-Protection: 1; mode=block
```

### 4. Rate Limiting
```javascript
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,  // 15 dakika
  max: 1000,                  // Max 1000 request (dev için yüksek)
  message: 'Çok fazla istek',
  standardHeaders: true,
  legacyHeaders: false
});

app.use('/api', limiter);
```

### 5. CORS Configuration
```javascript
const allowedOrigins = [
  'http://localhost:3000',
  'http://localhost:3001',
  'https://cahit-firma-frontend.onrender.com',
  process.env.FRONTEND_URL
].filter(Boolean);

app.use(cors({
  origin: function (origin, callback) {
    if (!origin) return callback(null, true);
    
    if (allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('CORS policy violation'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
}));
```

---

## 📡 API ENDPOINT'LERİ - TAM LİSTE

### Authentication (`/api/auth`)
```
POST   /register           → Yeni kullanıcı kaydı
POST   /login              → Giriş yapma
GET    /profile            → Profil bilgileri
PUT    /profile            → Profil güncelleme
PUT    /change-password    → Şifre değiştirme
POST   /logout             → Çıkış yapma
```

### Firma Management (`/api/firma`)
```
GET    /                   → Firma listesi (pagination, filtering)
POST   /                   → Yeni firma oluşturma
GET    /:id                → Firma detayı
PUT    /:id                → Firma güncelleme
DELETE /:id                → Firma silme (soft delete)
GET    /search             → Firma arama
GET    /stats              → İstatistikler
GET    /il-ilce            → İl/İlçe listesi
POST   /bulk-delete        → Toplu silme
```

### Teşvik Management (`/api/tesvik`)
```
GET    /                   → Teşvik listesi
POST   /                   → Yeni teşvik oluşturma
GET    /:id                → Teşvik detayı
PUT    /:id                → Teşvik güncelleme
DELETE /:id                → Teşvik silme
GET    /stats              → İstatistikler
POST   /:id/makine         → Makine ekleme
PUT    /:id/makine/:rowId  → Makine güncelleme
DELETE /:id/makine/:rowId  → Makine silme
POST   /:id/revizyon       → Yeni revizyon başlatma
GET    /:id/revizyonlar    → Revizyon listesi
POST   /:id/revizyon-revert → Geri dönüş
GET    /:id/export         → Excel export
```

### Yeni Teşvik (`/api/yeni-tesvik`)
```
// Tesvik endpoint'lerinin aynısı +
GET    /:id/bonus-hesaplama → Bonus hesaplama detayı
PUT    /:id/bonus-guncelle  → Bonus parametreleri güncelleme
```

### Import/Export (`/api/import`)
```
GET    /template           → Excel template indirme
POST   /excel              → Excel dosyası import
POST   /csv                → CSV dosyası import
GET    /export/excel       → Excel export (filtered)
GET    /export/pdf         → PDF export
```

### GTIP Codes (`/api/gtip`)
```
GET    /                   → GTIP listesi (pagination)
GET    /search             → GTIP arama
GET    /:kod               → GTIP detayı
POST   /                   → Yeni GTIP (admin)
PUT    /:id                → GTIP güncelleme (admin)
DELETE /:id                → GTIP silme (admin)
```

### US 97 Codes (`/api/us97`)
```
GET    /                   → US97 listesi
GET    /search             → US97 arama
GET    /:kod               → US97 detayı
GET    /with-kapasite      → Kapasite bilgili liste
```

### NACE Codes (`/api/nace`)
```
GET    /                   → NACE listesi
GET    /search             → NACE arama (6-lı sistem)
GET    /:kod               → NACE detayı
```

### Admin Panel (`/api/admin`)
```
GET    /users              → Kullanıcı listesi
POST   /users              → Yeni kullanıcı
PUT    /users/:id          → Kullanıcı güncelleme
DELETE /users/:id          → Kullanıcı silme
PUT    /users/:id/permissions → Yetki güncelleme
GET    /stats              → Sistem istatistikleri
GET    /activities         → Tüm aktiviteler
POST   /backup             → Manuel backup
```

### Reports (`/api/reports`)
```
GET    /firma              → Firma raporu
GET    /tesvik             → Teşvik raporu
GET    /user-activity      → Kullanıcı aktivite raporu
GET    /dashboard-stats    → Dashboard istatistikleri
POST   /custom             → Özel rapor oluşturma
```

### Activities (`/api/activity`)
```
GET    /                   → Aktivite listesi
GET    /recent             → Son aktiviteler
GET    /user/:userId       → Kullanıcıya göre
GET    /firma/:firmaId     → Firmaya göre
GET    /tesvik/:tesvikId   → Teşviğe göre
```

### Notifications (`/api/notifications`)
```
GET    /                   → Bildirim listesi
GET    /unread             → Okunmamışlar
PUT    /:id/read           → Okundu işaretle
PUT    /mark-all-read      → Tümünü okundu işaretle
DELETE /:id                → Bildirim silme
POST   /send               → Bildirim gönderme (admin)
```

### Lookup Services (`/api/lookup`)
```
GET    /units              → Birim kodları
GET    /currencies         → Döviz kodları
GET    /machine-types      → Makine türleri
GET    /used-machine-codes → Kullanılmış makine kodları
```

### File Management (`/api/files`)
```
POST   /upload             → Dosya yükleme
GET    /:id                → Dosya indirme
DELETE /:id                → Dosya silme
GET    /list/:entityType/:entityId → İlişkili dosyalar
```

---

## 🎨 FRONTEND MİMARİSİ - DETAYLI

### 1. Context API Kullanımı
```javascript
// AuthContext.js
const AuthContext = createContext({
  user: null,
  token: null,
  login: async (email, password) => {},
  logout: () => {},
  updateProfile: async (data) => {},
  isAuthenticated: false,
  loading: true
});

// FirmaContext.js
const FirmaContext = createContext({
  firmalar: [],
  firma: null,
  loading: false,
  error: null,
  getFirmalar: async (filters) => {},
  getFirma: async (id) => {},
  createFirma: async (data) => {},
  updateFirma: async (id, data) => {},
  deleteFirma: async (id) => {}
});

// TesvikContext.js
const TesvikContext = createContext({
  tesvikler: [],
  tesvik: null,
  loading: false,
  getTesvikler: async (filters) => {},
  getTesvik: async (id) => {},
  createTesvik: async (data) => {},
  updateTesvik: async (id, data) => {},
  addMakine: async (tesvikId, makine, type) => {},
  startRevizyon: async (tesvikId, data) => {}
});
```

### 2. Axios Interceptors
```javascript
// utils/axios.js
import axios from 'axios';

const api = axios.create({
  baseURL: process.env.REACT_APP_API_URL || 'http://localhost:5001/api',
  headers: {
    'Content-Type': 'application/json'
  }
});

// Request interceptor - Token ekleme
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor - Error handling
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Token expired - logout
      localStorage.removeItem('token');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export default api;
```

### 3. Form Validation (React Hook Form + Yup)
```javascript
import { useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';

// Schema tanımı
const firmaSchema = yup.object().shape({
  vergiNoTC: yup.string()
    .required('Vergi No zorunludur')
    .matches(/^\d{10,11}$/, 'Vergi No 10-11 haneli olmalıdır'),
  
  tamUnvan: yup.string()
    .required('Tam ünvan zorunludur')
    .min(3, 'En az 3 karakter')
    .max(500, 'En fazla 500 karakter'),
  
  firmaIl: yup.string()
    .required('İl zorunludur'),
  
  yetkiliKisiler: yup.array()
    .of(yup.object().shape({
      adSoyad: yup.string().required('Ad Soyad zorunludur'),
      telefon1: yup.string()
        .matches(/^[0-9+\s\-\(\)]{10,20}$/, 'Geçersiz telefon'),
      eposta1: yup.string()
        .email('Geçersiz email')
    }))
    .min(1, 'En az 1 yetkili kişi')
    .max(2, 'En fazla 2 yetkili kişi')
});

// Form kullanımı
const { register, handleSubmit, formState: { errors } } = useForm({
  resolver: yupResolver(firmaSchema)
});
```

### 4. Material-UI DataGrid Kullanımı
```javascript
import { DataGrid } from '@mui/x-data-grid';

const columns = [
  { field: 'firmaId', headerName: 'Firma ID', width: 120 },
  { field: 'tamUnvan', headerName: 'Ünvan', width: 300 },
  { field: 'firmaIl', headerName: 'İl', width: 150 },
  { field: 'vergiNoTC', headerName: 'Vergi No', width: 150 },
  {
    field: 'actions',
    headerName: 'İşlemler',
    width: 200,
    renderCell: (params) => (
      <Box>
        <IconButton onClick={() => handleEdit(params.row)}>
          <EditIcon />
        </IconButton>
        <IconButton onClick={() => handleDelete(params.row.id)}>
          <DeleteIcon />
        </IconButton>
      </Box>
    )
  }
];

<DataGrid
  rows={firmalar}
  columns={columns}
  pageSize={50}
  rowsPerPageOptions={[50, 100, 200]}
  checkboxSelection
  disableSelectionOnClick
  onSelectionModelChange={(ids) => setSelectedIds(ids)}
/>
```

---

## 🔄 CRON JOBS VE SCHEDULED TASKS

### 1. Activity Cleanup (Her gece 02:00)
```javascript
cron.schedule('0 2 * * *', async () => {
  try {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    const result = await Activity.deleteMany({
      createdAt: { $lt: thirtyDaysAgo }
    });
    
    console.log(`🧹 ${result.deletedCount} eski kayıt temizlendi`);
  } catch (error) {
    console.error('🚨 Cleanup error:', error);
  }
}, {
  timezone: 'Europe/Istanbul'
});
```

### 2. Backend Warm-up (Her 10 dakika)
```javascript
// Render.com sleep mode'u engellemek için
cron.schedule('*/10 * * * *', async () => {
  try {
    const https = require('https');
    const backendUrl = process.env.BACKEND_URL;
    
    https.get(`${backendUrl}/api/health`, (res) => {
      console.log(`💓 Backend warm-up: ${res.statusCode}`);
    });
  } catch (error) {
    console.error('🚨 Warm-up error:', error);
  }
});
```

---

## 📊 PERFORMANS OPTİMİZASYONLARI

### 1. Database Indexing Strategy
```javascript
// Firma Model
firmaSchema.index({ tamUnvan: 'text', firmaId: 'text' });
firmaSchema.index({ firmaIl: 1, firmaIlce: 1 });
firmaSchema.index({ createdAt: -1 });
firmaSchema.index({ vergiNoTC: 1 }, { unique: true });

// Tesvik Model
tesvikSchema.index({ tesvikId: 1, aktif: 1 });
tesvikSchema.index({ gmId: 1, firmaId: 1 });
tesvikSchema.index({ 'yatirimBilgileri.yerinIl': 1 });
tesvikSchema.index({ 
  firma: 1, 
  'durumBilgileri.genelDurum': 1, 
  aktif: 1 
});
```

### 2. Pagination Implementation
```javascript
// Backend
const page = parseInt(req.query.sayfa) || 1;
const limit = parseInt(req.query.limit) || 50;
const skip = (page - 1) * limit;

const firmalar = await Firma.find(query)
  .skip(skip)
  .limit(limit)
  .sort({ createdAt: -1 });

const total = await Firma.countDocuments(query);

res.json({
  data: firmalar,
  pagination: {
    currentPage: page,
    totalPages: Math.ceil(total / limit),
    totalItems: total,
    itemsPerPage: limit
  }
});
```

### 3. Query Optimization
```javascript
// Populate seçici kullanımı
const tesvik = await Tesvik.findById(id)
  .populate('firma', 'firmaId tamUnvan vergiNoTC')  // Sadece gerekli alanlar
  .populate('olusturanKullanici', 'adSoyad email')
  .lean();  // Plain JS object (daha hızlı)
```

---

## 🧪 TEST STRATEJİSİ (Öneriler)

### Unit Tests (Jest)
```javascript
// __tests__/models/Firma.test.js
describe('Firma Model', () => {
  test('should create firma with auto-generated ID', async () => {
    const firma = new Firma({
      vergiNoTC: '1234567890',
      tamUnvan: 'TEST FİRMA',
      firmaIl: 'ANKARA',
      // ...
    });
    
    await firma.save();
    expect(firma.firmaId).toMatch(/^A\d{6}$/);
  });
  
  test('should validate vergiNoTC format', async () => {
    const firma = new Firma({
      vergiNoTC: '123',  // Invalid
      // ...
    });
    
    await expect(firma.save()).rejects.toThrow();
  });
});
```

### Integration Tests
```javascript
// __tests__/api/firma.test.js
describe('Firma API', () => {
  let token;
  
  beforeAll(async () => {
    // Login and get token
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'test@test.com', password: '123456' });
    
    token = res.body.token;
  });
  
  test('GET /api/firma should return firmalar', async () => {
    const res = await request(app)
      .get('/api/firma')
      .set('Authorization', `Bearer ${token}`);
    
    expect(res.status).toBe(200);
    expect(res.body.data).toBeInstanceOf(Array);
  });
});
```

---

**🎯 Bu teknik dokümantasyon, sistemin derinlemesine mimari detaylarını içermektedir.**

*Güncelleme: 14 Ekim 2025*

