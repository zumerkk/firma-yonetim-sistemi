// 🔥 EKRAN DUMAN TESTLERİ
//
// Neden var: Faz 4'te global tema anahtarı çevrildi (App.js → etuysTema) ve bu,
// Faz 3'te HİÇ İNCELENMEMİŞ 26 ekranı da etkiledi. Dördü (Login + üç genel
// sayfa) tarayıcıda gözle doğrulandı; kalanı giriş gerektiriyor.
//
// Bu testler o boşluğun OTOMATİKLEŞTİRİLEBİLEN kısmını kapatıyor: her ekran
// sahte bağlamlarla monte ediliyor ve ÇÖKMEDİĞİ doğrulanıyor.
//
// Ne yakalar: tanımsız bileşen, bozuk import, render sırasında patlayan mantık.
//
// ── KAPSAM SINIRI (mutasyon testiyle ölçüldü) ─────────────────────────
// Bu testler YALNIZ SAYFALARI monte ediyor. Ölçtüm: ReportGenerator'daki
// tanımsız `<TableChart />` hatasını geri koyup çalıştırdım — takım GEÇTİ.
// Sebebi, o bileşenin hiçbir sayfadan render edilmemesi. Yani:
//   • bir sayfadan erişilemeyen bileşen buradan görünmez
//   • undefined-bileşen hataları için asıl ağ `react/jsx-no-undef` (eslint)
//
// Ne YAKALAMAZ: görsel yerleşim. "Ekran çöküyor mu" ile "ekran doğru görünüyor
// mu" ayrı sorular; bu dosya yalnız birincisini yanıtlıyor. Görsel doğrulama
// Login ve üç genel sayfada tarayıcıda yapıldı; kalanı giriş gerektiriyor.

import React from 'react';
import { render } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

// ─────────────────────────── SAHTE BAĞLAMLAR ───────────────────────────
// Şekiller uydurulmadı: sayfaların hooklardan gerçekten destructure ettiği
// alanlar taranarak çıkarıldı (grep "const {...} = useX()").
//
// ⚠️ NESNE KİMLİĞİ SABİT OLMALI. İlk yazımda hooklar `() => ({...})` şeklindeydi,
// yani HER RENDER'DA yeni nesne ve yeni fonksiyon kimliği dönüyordu. Sayfalardaki
// `useEffect(..., [fetchFirmalar])` bağımlılığı her render'da değişmiş görüp
// sonsuza dek yeniden çalıştı: jest işçisi %101 CPU'da 1,3 GB'a çıkıp asıldı.
// Stub'lar bu yüzden MODÜL DÜZEYİNDE bir kez kuruluyor.
// (jest.mock fabrikaları dış değişkene ancak adı `mock` ile başlıyorsa erişebilir.)

const mockAuth = {
  user: { adSoyad: 'Test Kullanıcı', rol: 'admin', email: 't@t.tt', yetkiler: {} },
  isAuthenticated: true, loading: false, error: null,
  login: () => {}, logout: () => {}, updateUser: () => {}, clearError: () => {}
};

const mockFirma = {
  firmalar: [], firma: null, stats: {}, loading: false, error: null,
  fetchFirmalar: () => {}, fetchFirma: () => {}, fetchStats: () => {},
  deleteFirma: () => {}, clearFirma: () => {}, clearError: () => {}
};

const mockDosyaTakip = {
  talepler: [], seciliTalep: null, dashboardStats: null, enumDegerleri: {},
  pagination: { page: 1, limit: 10, total: 0 }, loading: false, error: null,
  fetchDashboard: () => {}, fetchEnums: () => {}, fetchTalepler: () => {},
  fetchTalep: () => {}, talepOlustur: () => {}, talepGuncelle: () => {},
  durumDegistir: () => {}, eksikTamamla: () => {}, personelMailDusur: () => {},
  notEkle: () => {}, notSil: () => {}, dosyaEkle: () => {}, dosyaSil: () => {},
  dosyaAciklamaKaydet: () => {}, talepSil: () => {}, clearError: () => {}
};

// ⚠️ Bu stub ilk yazımda eksikti ve NotificationPage çöktü
// ("Cannot read properties of undefined (reading 'type')" — filters.type).
// Sebebi: stub şekillerini `grep "const {...} = useX()"` ile çıkarmıştım, ama
// o desen SATIR TABANLI; NotificationPage 22 alanı ÇOK SATIRLI destructure
// ediyor ve tarama onu hiç görmedi. Gerçek NotificationContext filters/
// categories/types/... sağlıyor, yani sayfa üretimde sağlam — eksik olan
// testti. Şekil artık dosyadan birebir alındı (NotificationPage.js:59-81).
const mockBildirim = {
  notifications: [], unreadCount: 0, loading: false, error: null,
  pagination: { page: 1, limit: 20, total: 0, pages: 1 },
  filters: { type: null, category: null, isRead: null, priority: null,
             sortBy: 'createdAt', sortOrder: 'desc' },
  categories: [], types: [], priorities: [],
  autoRefresh: false,
  loadNotifications: () => {}, markAsRead: () => {}, markAllAsRead: () => {},
  deleteNotification: () => {}, bulkDelete: () => {},
  updateFilters: () => {}, resetFilters: () => {}, refreshAll: () => {},
  setAutoRefresh: () => {}, getTypeColor: () => 'primary',
  formatRelativeTime: () => 'az önce',
  fetchNotifications: () => {}, clearError: () => {}
};

const mockTesvik = {
  tesvikler: [], currentTesvik: null, stats: {}, filters: {}, loading: false, error: null,
  fetchTesvikler: () => {}, fetchTesvikStats: () => {}, fetchTesvik: () => {},
  createTesvik: () => {}, updateTesvik: () => {}, deleteTesvik: () => {},
  updateFilters: () => {}, clearError: () => {}, clearCurrentTesvik: () => {}
};

jest.mock('../contexts/AuthContext', () => ({
  useAuth: () => mockAuth, AuthProvider: ({ children }) => children
}));
jest.mock('../contexts/FirmaContext', () => ({
  useFirma: () => mockFirma, FirmaProvider: ({ children }) => children
}));
jest.mock('../contexts/DosyaTakipContext', () => ({
  useDosyaTakip: () => mockDosyaTakip, DosyaTakipProvider: ({ children }) => children
}));
jest.mock('../contexts/NotificationContext', () => ({
  useNotifications: () => mockBildirim, NotificationProvider: ({ children }) => children
}));
jest.mock('../contexts/TesvikContext', () => ({
  useTesvik: () => mockTesvik, TesvikProvider: ({ children }) => children
}));

// Ağ: her çağrı boş ama BAŞARILI dönsün ki ekranlar hata yoluna sapmasın.
// Yanıt nesnesi de sabit — aynı sonsuz döngü tuzağı burada da geçerli.
const mockYanit = { data: { success: true, data: {}, veriler: [], count: 0 } };
jest.mock('../utils/axios', () => {
  const c = () => Promise.resolve(mockYanit);
  return { __esModule: true, default: { get: c, post: c, put: c, delete: c, patch: c } };
});

// ─────────────────────────── EKRAN LİSTESİ ───────────────────────────
// Faz 3'te sarmalanmayan, yani hiç incelenmemiş ekranlar (Login ve üç genel
// sayfa tarayıcıda ayrıca doğrulandı, onlar da burada).
const EKRANLAR = [
  ['Login',                   () => require('../pages/Auth/Login').default],
  ['AdminPanel',              () => require('../pages/Admin/AdminPanel').default],
  ['Profile',                 () => require('../pages/Profile/Profile').default],
  ['Settings',                () => require('../pages/Settings/Settings').default],
  ['FileManager',             () => require('../pages/Files/FileManager').default],
  ['ImportWizard',            () => require('../pages/Import/ImportWizard').default],
  ['NotificationPage',        () => require('../pages/Notifications/NotificationPage').default],
  ['ReportCenter',            () => require('../pages/Reports/ReportCenter').default],
  ['FirmaDetail',             () => require('../pages/Firma/FirmaDetail').default],
  ['DosyaTakipDetail',        () => require('../pages/DosyaTakip/DosyaTakipDetail').default],
  ['IslemEvrakDetail',        () => require('../pages/IslemEvrak/IslemEvrakDetail').default],
  ['IslemTuruYonetimi',       () => require('../pages/IslemEvrak/IslemTuruYonetimi').default],
  ['IslemEvrakPublicUpload',  () => require('../pages/IslemEvrak/IslemEvrakPublicUpload').default],
  ['PublicUpload',            () => require('../pages/TesvikMakine/PublicUpload').default],
  ['KdvMuafiyetIndir',        () => require('../pages/TesvikMakine/KdvMuafiyetIndir').default],
  ['TesvikMakineDetail',      () => require('../pages/TesvikMakine/TesvikMakineDetail').default],
  ['AraKontrol',              () => require('../pages/TesvikMakine/AraKontrol').default],
  ['BakanlikMailParser',      () => require('../pages/TesvikMakine/BakanlikMailParser').default],
  ['TesvikRaporlar',          () => require('../pages/TesvikMakine/TesvikRaporlar').default],
  ['EskiTesvikImport',        () => require('../pages/Tesvik/EskiTesvikImport').default],
  ['TesvikImport',            () => require('../pages/YeniTesvik/TesvikImport').default]
];

describe('Ekranlar çökmeden monte oluyor (Faz 4 global tema altında)', () => {
  // Ekranlar mount'ta ağ çağırıyor; act uyarıları testi düşürmesin diye
  // konsol gürültüsü susturuluyor. ÇÖKME yine de yakalanır — render throw eder.
  let hataAyikla, uyar;
  beforeAll(() => {
    hataAyikla = console.error; uyar = console.warn;
    console.error = () => {}; console.warn = () => {};
  });
  afterAll(() => { console.error = hataAyikla; console.warn = uyar; });

  test.each(EKRANLAR)('%s', (_ad, yukle) => {
    const Ekran = yukle();
    expect(Ekran).toBeDefined();
    expect(() =>
      render(
        <MemoryRouter initialEntries={['/test/abc123']}>
          <Ekran />
        </MemoryRouter>
      )
    ).not.toThrow();
  });
});
