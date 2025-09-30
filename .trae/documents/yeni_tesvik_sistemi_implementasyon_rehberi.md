# Yeni Teşvik Sistemi - Adım Adım İmplementasyon Rehberi

## 1. Ön Hazırlık ve Planlama

### 1.1 Gereksinimler Kontrolü
- [ ] Node.js 18+ kurulu
- [ ] MongoDB 5.0+ çalışıyor
- [ ] Git repository backup'ı alındı
- [ ] Development environment hazır
- [ ] Test veritabanı oluşturuldu

### 1.2 Proje Yapısı Kontrolü
```
firma-yonetim-sistemi/
├── backend/
│   ├── models/
│   ├── controllers/
│   ├── routes/
│   └── server.js
├── frontend/
│   ├── src/
│   │   ├── pages/
│   │   ├── components/
│   │   └── services/
└── .trae/documents/
```

## 2. Backend İmplementasyonu

### 2.1 Adım 1: Yeni Model Oluşturma

**Dosya:** `backend/models/YeniTesvik.js`

```bash
# Terminal'de
cd backend/models
cp Tesvik.js YeniTesvik.js
```

**Değişiklikler:**
```javascript
// YeniTesvik.js - Başlık güncelleme
// 🏆 YENİ TEŞVİK BELGESİ MODELİ - ENTERPRISE EDITION
// Devlet güncellemelerine uygun yeni teşvik sistemi

// Collection adını değiştir (dosyanın sonunda)
module.exports = mongoose.model('YeniTesvik', tesvikSchema, 'yenitesvik');

// Yeni alanlar ekle (tesvikSchema içine)
yeniAlanlar: {
  guncellemeTarihi: { type: Date, default: Date.now },
  yeniKategori: {
    type: String,
    enum: ['Dijital Dönüşüm', 'Yeşil Teknoloji', 'Kritik Teknoloji', 'Stratejik Yatırım'],
    default: ''
  },
  uygunlukKriteri: { type: String, maxlength: 500 },
  oncelikPuani: { type: Number, min: 0, max: 100, default: 0 },
  dijitalDonusumOrani: { type: Number, min: 0, max: 100, default: 0 },
  cevreselEtki: {
    karbonAyakIzi: { type: Number, default: 0 },
    enerjiVerimliligi: { type: Number, default: 0 },
    atikAzaltma: { type: Number, default: 0 }
  }
}
```

### 2.2 Adım 2: Yeni Controller Oluşturma

**Dosya:** `backend/controllers/yeniTesvikController.js`

```bash
# Terminal'de
cd backend/controllers
cp tesvikController.js yeniTesvikController.js
```

**Değişiklikler:**
```javascript
// yeniTesvikController.js - Import güncelleme
const YeniTesvik = require('../models/YeniTesvik');

// Tüm Tesvik referanslarını YeniTesvik ile değiştir
// Find & Replace: Tesvik -> YeniTesvik

// Activity log'larda kategori güncelleme
category: 'yeni-tesvik'

// Yeni hesaplama fonksiyonları ekle
const calculateYeniTesvikBonuslari = (tesvik) => {
  let dijitalBonusu = 0;
  let yesilBonusu = 0;
  let stratejikBonusu = 0;
  
  // Dijital dönüşüm bonusu
  if (tesvik.yeniAlanlar?.yeniKategori === 'Dijital Dönüşüm') {
    dijitalBonusu = tesvik.yeniAlanlar.dijitalDonusumOrani * 0.1;
  }
  
  // Yeşil teknoloji bonusu
  if (tesvik.yeniAlanlar?.yeniKategori === 'Yeşil Teknoloji') {
    yesilBonusu = tesvik.yeniAlanlar.cevreselEtki.enerjiVerimliligi * 0.15;
  }
  
  // Stratejik yatırım bonusu
  if (tesvik.yeniAlanlar?.yeniKategori === 'Stratejik Yatırım') {
    stratejikBonusu = tesvik.yeniAlanlar.oncelikPuani * 0.2;
  }
  
  return {
    dijitalBonusu,
    yesilBonusu,
    stratejikBonusu,
    toplamBonus: dijitalBonusu + yesilBonusu + stratejikBonusu
  };
};
```

### 2.3 Adım 3: Yeni Routes Oluşturma

**Dosya:** `backend/routes/yeniTesvik.js`

```bash
# Terminal'de
cd backend/routes
cp tesvik.js yeniTesvik.js
```

**Değişiklikler:**
```javascript
// yeniTesvik.js - Controller import güncelleme
const {
  createTesvik,
  getTesvikler,
  getTesvik,
  updateTesvik,
  deleteTesvik,
  // ... diğer fonksiyonlar
} = require('../controllers/yeniTesvikController');

// Router tanımlamaları aynı kalır
```

### 2.4 Adım 4: Server.js Güncelleme

**Dosya:** `backend/server.js`

```javascript
// Yeni route import'u ekle
const yeniTesvikRoutes = require('./routes/yeniTesvik');

// Route'u ekle (mevcut tesvik route'undan sonra)
app.use('/api/yeni-tesvik', yeniTesvikRoutes);
```

## 3. Frontend İmplementasyonu

### 3.1 Adım 1: Yeni Sayfa Klasörü Oluşturma

```bash
# Terminal'de
cd frontend/src/pages
mkdir YeniTesvik
cd YeniTesvik
```

### 3.2 Adım 2: Sayfaları Kopyalama

```bash
# Tesvik klasöründen kopyala
cp ../Tesvik/TesvikDashboard.js ./YeniTesvikDashboard.js
cp ../Tesvik/TesvikList.js ./YeniTesvikList.js
cp ../Tesvik/TesvikForm.js ./YeniTesvikForm.js
cp ../Tesvik/TesvikDetail.js ./YeniTesvikDetail.js
cp ../Tesvik/MakineYonetimi.js ./YeniMakineYonetimi.js
```

### 3.3 Adım 3: Component Adlarını Güncelleme

**Her dosyada yapılacak değişiklikler:**

```javascript
// YeniTesvikDashboard.js
// Component adını değiştir
const YeniTesvikDashboard = () => {
  // Başlık güncelleme
  <Typography variant="h4">
    🏆 Yeni Teşvik Sistemi - Kontrol Paneli
  </Typography>
  
  // API endpoint güncelleme
  const fetchData = async () => {
    const response = await axios.get('/api/yeni-tesvik/dashboard');
    // ...
  };
};

export default YeniTesvikDashboard;
```

### 3.4 Adım 4: Yeni Service Oluşturma

**Dosya:** `frontend/src/services/yeniTesvikService.js`

```bash
# Terminal'de
cd frontend/src/services
cp tesvikService.js yeniTesvikService.js
```

**Değişiklikler:**
```javascript
// yeniTesvikService.js
const API_BASE_URL = '/api/yeni-tesvik';

const yeniTesvikService = {
  // Tüm endpoint'leri güncelle
  getAll: (params) => api.get(`${API_BASE_URL}`, { params }),
  getById: (id) => api.get(`${API_BASE_URL}/${id}`),
  create: (data) => api.post(`${API_BASE_URL}`, data),
  update: (id, data) => api.put(`${API_BASE_URL}/${id}`, data),
  delete: (id) => api.delete(`${API_BASE_URL}/${id}`),
  
  // Yeni sistem özel fonksiyonları
  calculateYeniBonus: (data) => api.post(`${API_BASE_URL}/calculate-bonus`, data),
  validateYeniKriteria: (data) => api.post(`${API_BASE_URL}/validate-kriteria`, data)
};

export default yeniTesvikService;
```

### 3.5 Adım 5: Routing Güncelleme

**Dosya:** `frontend/src/components/AppRouter.js`

```javascript
// Import'ları ekle
import YeniTesvikDashboard from '../pages/YeniTesvik/YeniTesvikDashboard';
import YeniTesvikList from '../pages/YeniTesvik/YeniTesvikList';
import YeniTesvikForm from '../pages/YeniTesvik/YeniTesvikForm';
import YeniTesvikDetail from '../pages/YeniTesvik/YeniTesvikDetail';
import YeniMakineYonetimi from '../pages/YeniTesvik/YeniMakineYonetimi';

// Route'ları ekle (mevcut tesvik route'larından sonra)
<Route path="/yeni-tesvik/dashboard" element={
  <ProtectedRoute>
    <YeniTesvikDashboard />
  </ProtectedRoute>
} />

<Route path="/yeni-tesvik/liste" element={
  <ProtectedRoute>
    <YeniTesvikList />
  </ProtectedRoute>
} />

<Route path="/yeni-tesvik/yeni" element={
  <ProtectedRoute permission="belgeEkle">
    <YeniTesvikForm />
  </ProtectedRoute>
} />

<Route path="/yeni-tesvik/:id" element={
  <ProtectedRoute>
    <YeniTesvikDetail />
  </ProtectedRoute>
} />

<Route path="/yeni-tesvik/:id/duzenle" element={
  <ProtectedRoute permission="belgeDuzenle">
    <YeniTesvikForm />
  </ProtectedRoute>
} />

<Route path="/yeni-tesvik/makine" element={
  <ProtectedRoute>
    <YeniMakineYonetimi />
  </ProtectedRoute>
} />
```

## 4. Yeni Sistem Özelliklerinin Eklenmesi

### 4.1 Yeni Form Alanları

**Dosya:** `frontend/src/pages/YeniTesvik/YeniTesvikForm.js`

```javascript
// Yeni alanlar için state ekle
const [yeniAlanlar, setYeniAlanlar] = useState({
  yeniKategori: '',
  uygunlukKriteri: '',
  oncelikPuani: 0,
  dijitalDonusumOrani: 0,
  cevreselEtki: {
    karbonAyakIzi: 0,
    enerjiVerimliligi: 0,
    atikAzaltma: 0
  }
});

// Form'a yeni section ekle
<Box sx={{ mt: 3 }}>
  <Typography variant="h6" gutterBottom>
    🆕 Yeni Sistem Alanları
  </Typography>
  
  <Grid container spacing={2}>
    <Grid item xs={12} md={6}>
      <FormControl fullWidth>
        <InputLabel>Yeni Kategori</InputLabel>
        <Select
          value={yeniAlanlar.yeniKategori}
          onChange={(e) => setYeniAlanlar({
            ...yeniAlanlar,
            yeniKategori: e.target.value
          })}
        >
          <MenuItem value="Dijital Dönüşüm">Dijital Dönüşüm</MenuItem>
          <MenuItem value="Yeşil Teknoloji">Yeşil Teknoloji</MenuItem>
          <MenuItem value="Kritik Teknoloji">Kritik Teknoloji</MenuItem>
          <MenuItem value="Stratejik Yatırım">Stratejik Yatırım</MenuItem>
        </Select>
      </FormControl>
    </Grid>
    
    <Grid item xs={12} md={6}>
      <TextField
        fullWidth
        label="Öncelik Puanı"
        type="number"
        inputProps={{ min: 0, max: 100 }}
        value={yeniAlanlar.oncelikPuani}
        onChange={(e) => setYeniAlanlar({
          ...yeniAlanlar,
          oncelikPuani: Number(e.target.value)
        })}
      />
    </Grid>
  </Grid>
</Box>
```

### 4.2 Yeni Dashboard Widget'ları

**Dosya:** `frontend/src/pages/YeniTesvik/YeniTesvikDashboard.js`

```javascript
// Yeni istatistik kartları
const YeniSistemStats = () => {
  return (
    <Grid container spacing={3}>
      <Grid item xs={12} sm={6} md={3}>
        <Card>
          <CardContent>
            <Typography color="textSecondary" gutterBottom>
              Dijital Dönüşüm
            </Typography>
            <Typography variant="h4">
              {stats.dijitalDonusum}
            </Typography>
          </CardContent>
        </Card>
      </Grid>
      
      <Grid item xs={12} sm={6} md={3}>
        <Card>
          <CardContent>
            <Typography color="textSecondary" gutterBottom>
              Yeşil Teknoloji
            </Typography>
            <Typography variant="h4">
              {stats.yesilTeknoloji}
            </Typography>
          </CardContent>
        </Card>
      </Grid>
      
      <Grid item xs={12} sm={6} md={3}>
        <Card>
          <CardContent>
            <Typography color="textSecondary" gutterBottom>
              Ortalama Bonus
            </Typography>
            <Typography variant="h4">
              %{stats.ortalamaBonusOrani}
            </Typography>
          </CardContent>
        </Card>
      </Grid>
      
      <Grid item xs={12} sm={6} md={3}>
        <Card>
          <CardContent>
            <Typography color="textSecondary" gutterBottom>
              Çevresel Etki
            </Typography>
            <Typography variant="h4">
              {stats.cevreselEtkiPuani}
            </Typography>
          </CardContent>
        </Card>
      </Grid>
    </Grid>
  );
};
```

## 5. Test ve Doğrulama

### 5.1 Backend Testleri

```bash
# Terminal'de
cd backend
npm test -- --grep "YeniTesvik"
```

**Test dosyası:** `backend/tests/yeniTesvik.test.js`

```javascript
const request = require('supertest');
const app = require('../server');

describe('Yeni Tesvik API', () => {
  it('should create yeni tesvik with new fields', async () => {
    const response = await request(app)
      .post('/api/yeni-tesvik')
      .send({
        gmId: 'YTS2024001',
        firma: '507f1f77bcf86cd799439011',
        yeniAlanlar: {
          yeniKategori: 'Dijital Dönüşüm',
          oncelikPuani: 85
        }
      })
      .expect(201);
      
    expect(response.body.data.yeniAlanlar.yeniKategori)
      .toBe('Dijital Dönüşüm');
  });
  
  it('should not interfere with old tesvik system', async () => {
    // Eski sistem verilerinin etkilenmediğini test et
    const oldTesvikResponse = await request(app)
      .get('/api/tesvik')
      .expect(200);
      
    const newTesvikResponse = await request(app)
      .get('/api/yeni-tesvik')
      .expect(200);
      
    // İki sistem verilerinin farklı olduğunu doğrula
    expect(oldTesvikResponse.body.data)
      .not.toEqual(newTesvikResponse.body.data);
  });
});
```

### 5.2 Frontend Testleri

```bash
# Terminal'de
cd frontend
npm test -- --testPathPattern="YeniTesvik"
```

### 5.3 Manuel Test Senaryoları

**Test Listesi:**
- [ ] Yeni teşvik oluşturma
- [ ] Yeni alanların kaydedilmesi
- [ ] Bonus hesaplamalarının çalışması
- [ ] Eski sistem verilerinin korunması
- [ ] İki sistemin bağımsız çalışması
- [ ] Navigation'ın doğru çalışması
- [ ] Yetkilendirmenin çalışması

## 6. Deployment

### 6.1 Production Hazırlığı

```bash
# Environment variables kontrolü
echo "YENI_TESVIK_FEATURE_FLAG=true" >> .env

# Database migration (gerekirse)
node scripts/createYeniTesvikIndexes.js

# Frontend build
cd frontend
npm run build

# Backend restart
cd ../backend
pm2 restart all
```

### 6.2 Monitoring Setup

```javascript
// utils/yeniTesvikMonitoring.js
const monitoring = {
  trackYeniTesvikUsage: (action, userId) => {
    console.log(`[YENI-TESVIK] ${action} by user ${userId} at ${new Date()}`);
    // Analytics service'e gönder
  },
  
  trackPerformance: (endpoint, duration) => {
    console.log(`[YENI-TESVIK] ${endpoint} took ${duration}ms`);
    // Performance monitoring service'e gönder
  }
};
```

## 7. Kullanıcı Eğitimi ve Dokümantasyon

### 7.1 Kullanıcı Kılavuzu Hazırlama

**Konular:**
- Yeni sistem özellikleri
- Eski sistemden farklar
- Yeni form alanları kullanımı
- Bonus hesaplama sistemi
- Navigation değişiklikleri

### 7.2 Teknik Dokümantasyon

**Konular:**
- API endpoint'leri
- Veri modeli değişiklikleri
- Yeni hesaplama algoritmaları
- Sistem mimarisi
- Troubleshooting rehberi

## 8. Go-Live Checklist

### 8.1 Son Kontroller
- [ ] Tüm testler geçiyor
- [ ] Performance testleri tamamlandı
- [ ] Security audit yapıldı
- [ ] Backup alındı
- [ ] Rollback planı hazır
- [ ] Monitoring aktif
- [ ] Kullanıcı eğitimleri tamamlandı

### 8.2 Launch Adımları
1. **Soft Launch** - Sınırlı kullanıcı grubu
2. **Monitoring** - İlk 24 saat yakın takip
3. **Feedback Collection** - Kullanıcı geri bildirimleri
4. **Bug Fixes** - Acil düzeltmeler
5. **Full Launch** - Tüm kullanıcılara açma

## 9. Post-Launch Aktiviteleri

### 9.1 İlk Hafta
- Günlük monitoring raporları
- Kullanıcı feedback'lerini toplama
- Performance metrikleri analizi
- Bug fix'lerin deployment'ı

### 9.2 İlk Ay
- Kullanım istatistikleri analizi
- Sistem optimizasyonları
- Kullanıcı eğitimi devamı
- Feature enhancement planlaması

Bu rehber ile Yeni Teşvik Sistemi başarıyla implement edilecek ve eski sistem tamamen korunarak iki sistem bağımsız çalışacaktır.