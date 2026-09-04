// 🏆 TEŞVİK PANELİ — ETUYS diline geçirildi (madde 6 / Faz 3)
//
// Önce: her kutu 135° gradyan + 48px avatar + hover'da yukarı zıplama, kartlar
// yuvarlak köşeli ve gölgeli, listede emoji. etuys/README.md'nin "Olmayanlar"
// satırı bunların dördünü de sayıyor: gradyan, gölge, yuvarlak köşeli kart, emoji.
//
// Sonra: SayiKutusu + Panel + VeriTablosu. Yerel StatsCard (48 satır) silindi;
// aynı fikrin dört panelde dört ayrı kopyası vardı.
//
// Tema Faz 4'te global oldu (App.js → etuysTema); ekran bazlı ThemeProvider
// sarmalayıcısı kaldırıldı.

import React, { useState, useEffect } from 'react';
import { Box, Container, Grid, Button, Alert } from '@mui/material';
import {
  EmojiEvents as EmojiEventsIcon,
  Add as AddIcon,
  List as ListIcon,
  CheckCircle as CheckCircleIcon,
  Warning as WarningIcon,
  AccessTime as AccessTimeIcon,
  Visibility as VisibilityIcon,
  UploadFile as UploadFileIcon
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import Header from '../../components/Layout/Header';
import Sidebar from '../../components/Layout/Sidebar';
import { useAuth } from '../../contexts/AuthContext';
import axios from '../../utils/axios';
import {
  renk, yazi, aralik,
  Panel, SayiKutusu, VeriTablosu, DurumRozeti
} from '../../tasarim';

// Teşvik durumu → DurumRozeti'nin anlam anahtarı. Bilinmeyen durum nötr
// rozete düşer; eskiden her durum kendi hex rengini taşıyordu ve renkler
// dosyadan dosyaya kayıyordu.
const DURUM_ROZET = {
  onaylandi: 'onay',
  reddedildi: 'red',
  revize_talep_edildi: 'red',
  iptal_edildi: 'red',
  hazirlaniyor: 'beklemede',
  'başvuru_yapildi': 'beklemede',
  basvuru_yapildi: 'beklemede',
  inceleniyor: 'beklemede',
  ek_belge_istendi: 'beklemede',
  onay_bekliyor: 'beklemede'
};

const durumEtiketi = (d) => (d ? String(d).replace(/_/g, ' ') : '—');

const TesvikDashboard = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  
  // 📊 State Management
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 1024);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // 📈 Widget Data States
  const [dashboardData, setDashboardData] = useState({
    ozet: {
      toplamTesvik: 0,
      aktifTesvik: 0,
      bekleyenTesvik: 0,
      onaylananTesvik: 0,
      basariOrani: 0
    },
    sonEklenenler: [],
    durumDagilimi: [],
    ilBazindaDagilim: []
  });

  // 📱 Responsive Handling
  useEffect(() => {
    const handleResize = () => {
      const mobile = window.innerWidth < 1024;
      setIsMobile(mobile);
      if (mobile) setSidebarOpen(false);
      else setSidebarOpen(true);
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // 📊 Dashboard Verilerini Yükle
  useEffect(() => {
    const loadDashboardData = async () => {
      try {
        setLoading(true);
        const response = await axios.get('/tesvik/dashboard/widgets');
        
        if (response.data.success) {
          setDashboardData(response.data.data);
        } else {
          setError('Dashboard verileri yüklenemedi');
        }
      } catch (error) {
        console.error('🚨 Dashboard data hatası:', error);
        setError('Veriler yüklenirken hata oluştu');
      } finally {
        setLoading(false);
      }
    };

    loadDashboardData();
  }, []);

  return (
    // Tema yalnız BU ekranı sarıyor. Global tema değişmiyor; madde 6 ekran ekran
    // ilerlesin ve her adım tek satırla geri alınabilsin diye.
    <Box sx={{ 
      display: 'grid',
      gridTemplateRows: '64px 1fr',
      gridTemplateColumns: {
        xs: '1fr',
        lg: sidebarOpen ? '280px 1fr' : '1fr'
      },
      gridTemplateAreas: {
        xs: '"header" "content"',
        lg: sidebarOpen ? '"header header" "sidebar content"' : '"header" "content"'
      },
      height: '100vh',
      backgroundColor: renk.zemin
    }}>
      {/* Header */}
      <Box sx={{ gridArea: 'header', zIndex: 1201 }}>
        <Header onSidebarToggle={() => setSidebarOpen(!sidebarOpen)} />
      </Box>

      {/* Sidebar */}
      {!isMobile && sidebarOpen && (
        <Box sx={{ gridArea: 'sidebar', zIndex: 1200 }}>
          <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} variant="persistent" />
        </Box>
      )}

      {isMobile && (
        <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} variant="temporary" />
      )}

      {/* Main Content */}
      <Box component="main" sx={{ 
        gridArea: 'content',
        overflow: 'auto',
        p: 3
      }}>
        <Container maxWidth="xl" sx={{ px: '0 !important' }}>
          <Box sx={{ mb: `${aralik.grup}px` }}>
            <Box sx={{ fontSize: `${yazi.buyuk}px`, fontWeight: yazi.cokKalin, color: renk.murekkep }}>
              Belge Teşvik Sistemi
            </Box>
            <Box sx={{ fontSize: `${yazi.etiket}px`, color: renk.sessiz, mt: 0.2 }}>
              Teşvik belgelerini yönetin, durumları takip edin ve raporlar alın
            </Box>
          </Box>

          {error && <Alert severity="error" sx={{ mb: 2, borderRadius: 0 }}>{error}</Alert>}

          {/* Özet kutuları — eskiden dört gradyanlı StatsCard'dı */}
          <Grid container spacing={1.2} sx={{ mb: `${aralik.grup}px` }}>
            <Grid item xs={12} sm={6} md={3}>
              <SayiKutusu
                etiket="Toplam Teşvik" deger={dashboardData.ozet.toplamTesvik}
                ikon={<EmojiEventsIcon />} alt="Sistem geneli"
                yukleniyor={loading} onTik={() => navigate('/tesvik/liste')}
              />
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <SayiKutusu
                etiket="Aktif Teşvik" deger={dashboardData.ozet.aktifTesvik}
                ikon={<AccessTimeIcon />} alt="İşlemde olan" vurgu="bekle"
                yukleniyor={loading}
              />
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <SayiKutusu
                etiket="Bekleyen" deger={dashboardData.ozet.bekleyenTesvik}
                ikon={<WarningIcon />} alt="Değerlendirmede" vurgu="bekle"
                yukleniyor={loading}
              />
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <SayiKutusu
                etiket="Onaylanan" deger={dashboardData.ozet.onaylananTesvik}
                ikon={<CheckCircleIcon />} vurgu="onay"
                alt={`Başarı: %${dashboardData.ozet.basariOrani}`}
                yukleniyor={loading}
              />
            </Grid>
          </Grid>

          <Grid container spacing={1.2}>
            <Grid item xs={12} lg={8}>
              {/* Liste artık ETUYS tablosu: gri başlık, ince çizgi, zebra yok,
                  taşan metin kırpılır. Eskiden avatarlı <List> + emoji idi. */}
              <Panel
                baslik="Son Eklenen Teşvikler"
                ikon={<EmojiEventsIcon sx={{ fontSize: 14 }} />}
                bosluksuz
                sagUnsur={
                  <Button size="small" startIcon={<VisibilityIcon sx={{ fontSize: 14 }} />}
                    onClick={() => navigate('/tesvik/liste')}
                    sx={{ fontSize: `${yazi.kucuk}px`, py: 0, minHeight: 0 }}>
                    Tümünü Gör
                  </Button>
                }
              >
                <VeriTablosu
                  sutunlar={[
                    { anahtar: 'tesvikId', baslik: 'Teşvik No', genislik: 110 },
                    { anahtar: 'yatirimciUnvan', baslik: 'Yatırımcı Unvanı' },
                    { anahtar: 'durum', baslik: 'Durum', genislik: 120,
                      bicim: (_v, satir) => (
                        <DurumRozeti
                          durum={DURUM_ROZET[satir.durumBilgileri?.genelDurum]}
                          metin={durumEtiketi(satir.durumBilgileri?.genelDurum)}
                        />
                      ) },
                    { anahtar: 'ekleyen', baslik: 'Ekleyen', genislik: 140,
                      bicim: (_v, satir) => satir.olusturanKullanici?.adSoyad || 'Bilinmiyor' },
                    { anahtar: 'createdAt', baslik: 'Tarih', genislik: 90,
                      bicim: (v) => (v ? new Date(v).toLocaleDateString('tr-TR') : '—') }
                  ]}
                  satirlar={dashboardData.sonEklenenler}
                  onSatirTik={(satir) => navigate(`/tesvik/${satir._id}`)}
                  bosMetin="Henüz teşvik kaydı bulunmuyor"
                />
              </Panel>
            </Grid>

            <Grid item xs={12} lg={4}>
              <Panel baslik="Hızlı İşlemler" ikon={<ListIcon sx={{ fontSize: 14 }} />}>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.8 }}>
                  {user?.yetkiler?.belgeEkle && (
                    <Button fullWidth variant="contained" startIcon={<AddIcon />}
                      onClick={() => navigate('/tesvik/yeni')}>
                      Yeni Teşvik Ekle
                    </Button>
                  )}
                  <Button fullWidth variant="outlined" startIcon={<ListIcon />}
                    onClick={() => navigate('/tesvik/liste')}>
                    Teşvik Listesi
                  </Button>
                  {user?.yetkiler?.belgeEkle && (
                    <Button fullWidth variant="outlined" startIcon={<UploadFileIcon />}
                      onClick={() => navigate('/tesvik/import')}>
                      Excel'den Import
                    </Button>
                  )}
                </Box>
              </Panel>

              <Panel baslik="Durum Dağılımı" ikon={<WarningIcon sx={{ fontSize: 14 }} />} bosluksuz>
                <VeriTablosu
                  sutunlar={[
                    { anahtar: '_id', baslik: 'Durum',
                      bicim: (v) => (
                        <DurumRozeti durum={DURUM_ROZET[v]} metin={durumEtiketi(v)} />
                      ) },
                    { anahtar: 'count', baslik: 'Adet', sayi: true, genislik: 70 }
                  ]}
                  satirlar={dashboardData.durumDagilimi.slice(0, 8)}
                  anahtarAl={(s, i) => s._id ?? i}
                  bosMetin="Henüz veri yok"
                />
              </Panel>
            </Grid>
          </Grid>
        </Container>
      </Box>
    </Box>
  );
};

export default TesvikDashboard;