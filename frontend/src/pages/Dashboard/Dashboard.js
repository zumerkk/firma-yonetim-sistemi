// 🏢 ANA PANEL — ETUYS diline geçirildi (madde 6 / Faz 3)
//
// Önce: 4 gradyanlı kart (üstte 3px gradyan şerit + 36px avatar + hover'da
// zıplama), gradyanlı kritik uyarı kartı, avatarlı listeler, başlıklarda emoji.
// etuys/README.md "Olmayanlar": gradyan, gölge, yuvarlak köşeli kart, emoji.
//
// ⚠️ KALDIRILAN UYDURMA VERİ: kutularda `change: '+5.2%'`, `'+2.1%'`,
// `'-12.5%'`, `'+3'` sabit dizgileri vardı ve `label={stat.change}` ile
// GERÇEK TREND GÖSTERGESİ gibi, yeşil/amber renklendirmeyle basılıyordu.
// Hiçbiri veriden gelmiyordu; hiç değişmemişti. ETUYS'te trend rozeti de yok.
// Gerçek trend istenirse backend'de tarihsel toplama gerekir — ayrı iş.

import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Box, Grid, Button, IconButton, LinearProgress } from '@mui/material';
import {
  Business as BusinessIcon,
  CheckCircle as CheckCircleIcon,
  Warning as WarningIcon,
  LocationOn as LocationIcon,
  Add as AddIcon,
  ViewList as ViewListIcon,
  Assessment as AssessmentIcon,
  Refresh as RefreshIcon,
  Autorenew as AutorenewIcon,
  History as HistoryIcon
} from '@mui/icons-material';
import { useFirma } from '../../contexts/FirmaContext';
import { useAuth } from '../../contexts/AuthContext';
import activityService from '../../services/activityService';
import Header from '../../components/Layout/Header';
import Sidebar from '../../components/Layout/Sidebar';
import SmartUpload from '../../components/Dashboard/SmartUpload';
import ScreenshotImport from '../../components/Dashboard/ScreenshotImport';
import {
  renk, yazi, aralik,
  Panel, SayiKutusu, VeriTablosu, DurumRozeti
} from '../../tasarim';

const Dashboard = () => {
  const navigate = useNavigate();
  const { firmalar, loading, stats, fetchFirmalar, fetchStats } = useFirma();
  // Karşılama metninde ad sabit "Sistem" yazıyordu; gerçek kullanıcıdan geliyor.
  const { user } = useAuth();
  const [refreshing, setRefreshing] = useState(false);
  const [recentActivities, setRecentActivities] = useState([]);
  const [criticalAlerts, setCriticalAlerts] = useState([]);
  
  // 📊 Sidebar Management
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 1024);

  // 📋 Load Recent Activities
  const loadRecentActivities = useCallback(async () => {
    try {
      const result = await activityService.getRecentActivities(8);
      if (result.success) {
        setRecentActivities(result.data.activities || []);
      }
    } catch (error) {
      console.error('Recent activities loading error:', error);
    }
  }, []);

  // 🚨 Calculate Critical Alerts
  const calculateCriticalAlerts = useCallback(() => {
    if (!firmalar || firmalar.length === 0) {
      setCriticalAlerts([]);
      return;
    }

    const today = new Date();
    const alerts = [];

    // ETUYS yetki süresi kontrolü
    const etuysExpired = firmalar.filter(firma => {
      if (!firma.etuysYetkiBitisTarihi || firma.aktif === false) return false;
      const expiryDate = new Date(firma.etuysYetkiBitisTarihi);
      return expiryDate < today;
    });

    const etuysExpiringSoon = firmalar.filter(firma => {
      if (!firma.etuysYetkiBitisTarihi || firma.aktif === false) return false;
      const expiryDate = new Date(firma.etuysYetkiBitisTarihi);
      const diffTime = expiryDate - today;
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      return diffDays >= 0 && diffDays <= 30;
    });

    // DYS yetki süresi kontrolü
    const dysExpired = firmalar.filter(firma => {
      if (!firma.dysYetkiBitisTarihi || firma.aktif === false) return false;
      const expiryDate = new Date(firma.dysYetkiBitisTarihi);
      return expiryDate < today;
    });

    const dysExpiringSoon = firmalar.filter(firma => {
      if (!firma.dysYetkiBitisTarihi || firma.aktif === false) return false;
      const expiryDate = new Date(firma.dysYetkiBitisTarihi);
      const diffTime = expiryDate - today;
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      return diffDays >= 0 && diffDays <= 30;
    });

    // Kritik uyarıları oluştur
    if (etuysExpired.length > 0) {
      alerts.push({
        type: 'error',
        title: 'ETUYS Yetki Süresi Geçmiş',
        count: etuysExpired.length,
        message: `${etuysExpired.length} firmanın ETUYS yetki süresi geçmiş`,
        firms: etuysExpired.slice(0, 3),
        action: () => navigate('/firmalar?etuysGecmis=true')
      });
    }

    if (dysExpired.length > 0) {
      alerts.push({
        type: 'error',
        title: 'DYS Yetki Süresi Geçmiş',
        count: dysExpired.length,
        message: `${dysExpired.length} firmanın DYS yetki süresi geçmiş`,
        firms: dysExpired.slice(0, 3),
        action: () => navigate('/firmalar?dysGecmis=true')
      });
    }

    if (etuysExpiringSoon.length > 0) {
      alerts.push({
        type: 'warning',
        title: 'ETUYS Yetki Süresi Yaklaşıyor',
        count: etuysExpiringSoon.length,
        message: `${etuysExpiringSoon.length} firmanın ETUYS yetki süresi 30 gün içinde bitiyor`,
        firms: etuysExpiringSoon.slice(0, 3),
        action: () => navigate('/firmalar?etuysUyari=true')
      });
    }

    if (dysExpiringSoon.length > 0) {
      alerts.push({
        type: 'warning',
        title: 'DYS Yetki Süresi Yaklaşıyor',
        count: dysExpiringSoon.length,
        message: `${dysExpiringSoon.length} firmanın DYS yetki süresi 30 gün içinde bitiyor`,
        firms: dysExpiringSoon.slice(0, 3),
        action: () => navigate('/firmalar?dysUyari=true')
      });
    }

    setCriticalAlerts(alerts);
  }, [firmalar, navigate]);

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

  // 🔄 Data Loading
  useEffect(() => {
    const loadData = async () => {
      await Promise.all([
        fetchFirmalar(),
        fetchStats(),
        loadRecentActivities()
      ]);
    };
    loadData();
  }, [fetchFirmalar, fetchStats, loadRecentActivities]);

  // 🚨 Calculate Critical Alerts when firmalar changes
  useEffect(() => {
    calculateCriticalAlerts();
  }, [calculateCriticalAlerts]);

  // 🔄 Manual Refresh
  const handleRefresh = async () => {
    setRefreshing(true);
    await Promise.all([
      fetchFirmalar(),
      fetchStats(),
      loadRecentActivities()
    ]);
    setTimeout(() => setRefreshing(false), 500);
  };

  // 👨‍💼 Recent Companies - Son eklenen firmaları ID'ye göre sırala
  const recentCompanies = (firmalar || [])
    .filter(firma => firma.aktif !== false) // Sadece aktif firmaları göster
    .sort((a, b) => {
      // Önce createdAt'e göre sırala (en yeni önce)
      const dateA = new Date(a.createdAt);
      const dateB = new Date(b.createdAt);
      if (dateB - dateA !== 0) return dateB - dateA;
      
      // Eğer tarihler aynıysa firmaId'ye göre sırala (A001185, A001184, ...)
      const idA = a.firmaId ? parseInt(a.firmaId.substring(1)) : 0;
      const idB = b.firmaId ? parseInt(b.firmaId.substring(1)) : 0;
      return idB - idA;
    })
    .slice(0, 5);

  // 📊 Özet kutuları — hepsi tıklanabilir
  // Not: burada eskiden `change`/`changeType` alanları vardı ve sabit yüzdeler
  // gerçek trend gibi gösteriliyordu. Kaldırıldı (dosya başındaki nota bakın).
  const dashboardStats = [
    {
      title: 'Toplam Firma',
      value: stats?.toplamFirma || 0,
      icon: <BusinessIcon />,
      action: () => navigate('/firmalar')
    },
    {
      title: 'Aktif Firmalar',
      value: stats?.aktifFirma || 0,
      icon: <CheckCircleIcon />,
      vurgu: 'onay',
      action: () => navigate('/firmalar?aktif=true')
    },
    {
      title: 'Yetki Süresi Yaklaşan',
      value: stats?.etuysUyarilari?.count || 0,
      icon: <WarningIcon />,
      vurgu: 'bekle',
      action: () => navigate('/firmalar?etuysUyari=true')
    },
    {
      title: 'Süresi Geçmiş',
      value: (stats?.toplamFirma || 0) - (stats?.etuysYetkili || 0) - (stats?.etuysUyarilari?.count || 0),
      icon: <LocationIcon />,
      vurgu: 'red',
      action: () => navigate('/firmalar?etuysGecmis=true')
    }
  ];

  // 🚀 Quick Actions - Compact
  const quickActions = [
    {
      title: 'Yeni Firma Ekle',
      description: 'Yeni firma kaydı',
      icon: <AddIcon />,
      color: '#059669',
      action: () => navigate('/firmalar/yeni')
    },
    {
      title: 'Firma Listesi',
      description: 'Tüm firmaları görüntüle',
      icon: <ViewListIcon />,
      color: '#1e40af',
      action: () => navigate('/firmalar')
    }
  ];

  return (
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
      backgroundColor: '#f8fafc'
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
        p: { xs: 2, sm: 2.5, md: 3 },
        display: 'flex',
        flexDirection: 'column'
      }}>
      {/* Karşılama */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 1, flexWrap: 'wrap', mb: `${aralik.grup}px` }}>
        <Box>
          <Box sx={{ fontSize: `${yazi.buyuk}px`, fontWeight: yazi.cokKalin, color: renk.murekkep }}>
            Hoş geldiniz{user?.adSoyad ? `, ${user.adSoyad}` : ''}
          </Box>
          <Box sx={{ fontSize: `${yazi.etiket}px`, color: renk.sessiz, mt: 0.2 }}>
            GM Planlama Danışmanlık — Ana kontrol paneli
          </Box>
        </Box>
        <Box sx={{ display: 'flex', gap: 0.8, alignItems: 'center' }}>
          <Button variant="outlined" size="small" disabled={refreshing} onClick={handleRefresh}
            startIcon={refreshing ? <AutorenewIcon className="rotating" /> : <RefreshIcon />}
            sx={{ '& .rotating': { animation: 'spin 1s linear infinite' }, '@keyframes spin': { '0%': { transform: 'rotate(0deg)' }, '100%': { transform: 'rotate(360deg)' } } }}>
            Yenile
          </Button>
          <Button variant="contained" size="small" startIcon={<AssessmentIcon />}
            onClick={() => navigate('/istatistikler')}>
            İstatistikler
          </Button>
        </Box>
      </Box>

      {loading && <LinearProgress sx={{ mb: 1, height: 2 }} />}

      <SmartUpload />
      <ScreenshotImport />

      {/* Kritik durumlar — gradyanlı kart yerine kırmızı kenarlı panel */}
      {criticalAlerts.length > 0 && (
        <Panel
          baslik="Kritik Durumlar"
          ikon={<WarningIcon sx={{ fontSize: 14 }} />}
          sagUnsur={<DurumRozeti durum="red" metin={`${criticalAlerts.length} Uyarı`} />}
          sx={{ '& > div:first-of-type': { borderLeftColor: renk.red, color: renk.red } }}
        >
          <Grid container spacing={1.2}>
            {criticalAlerts.map((uyari, i) => (
              <Grid item xs={12} md={6} key={i}>
                <Box
                  onClick={uyari.action}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); uyari.action(); } }}
                  aria-label={`${uyari.title}: ${uyari.count} — listeyi aç`}
                  sx={{
                    border: `1px solid ${uyari.type === 'error' ? renk.red : renk.bekle}`,
                    borderLeft: `3px solid ${uyari.type === 'error' ? renk.red : renk.bekle}`,
                    backgroundColor: uyari.type === 'error' ? renk.redHafif : renk.bekleHafif,
                    p: 1, cursor: 'pointer', height: '100%',
                    '&:focus-visible': { outline: `2px solid ${renk.ana}`, outlineOffset: '-2px' }
                  }}
                >
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 1, mb: 0.4 }}>
                    <Box sx={{ fontSize: `${yazi.baslik}px`, fontWeight: yazi.cokKalin, color: uyari.type === 'error' ? renk.red : renk.bekle }}>
                      {uyari.title}
                    </Box>
                    <Box sx={{ fontSize: `${yazi.govde}px`, fontWeight: yazi.cokKalin, fontVariantNumeric: 'tabular-nums' }}>
                      {uyari.count}
                    </Box>
                  </Box>
                  <Box sx={{ fontSize: `${yazi.etiket}px`, color: renk.murekkep, mb: 0.4 }}>
                    {uyari.message}
                  </Box>
                  {uyari.firms?.length > 0 && (
                    <Box sx={{ fontSize: `${yazi.kucuk}px`, color: renk.sessiz }}>
                      {uyari.firms.map((f, fi) => (
                        <Box key={fi}>• {f.tamUnvan} ({f.firmaId})</Box>
                      ))}
                      {uyari.count > 3 && <Box sx={{ fontStyle: 'italic' }}>… ve {uyari.count - 3} firma daha</Box>}
                    </Box>
                  )}
                </Box>
              </Grid>
            ))}
          </Grid>
        </Panel>
      )}

      {/* Özet kutuları */}
      <Grid container spacing={1.2} sx={{ mb: `${aralik.grup}px` }}>
        {dashboardStats.map((kutu) => (
          <Grid item xs={12} sm={6} md={3} key={kutu.title}>
            <SayiKutusu
              etiket={kutu.title}
              deger={kutu.value}
              ikon={kutu.icon}
              vurgu={kutu.vurgu}
              yukleniyor={loading && !stats}
              onTik={kutu.action}
              ariaEtiket={`${kutu.title}: ${kutu.value} — listeyi aç`}
            />
          </Grid>
        ))}
      </Grid>

      <Grid container spacing={1.2}>
        <Grid item xs={12} lg={4}>
          <Panel baslik="Hızlı İşlemler" ikon={<BusinessIcon sx={{ fontSize: 14 }} />}>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.8 }}>
              {quickActions.map((eylem, i) => (
                <Button key={i} onClick={eylem.action} variant="outlined" startIcon={eylem.icon}
                  sx={{ justifyContent: 'flex-start', textAlign: 'left' }}>
                  <Box sx={{ flex: 1 }}>
                    <Box sx={{ fontSize: `${yazi.govde}px`, fontWeight: yazi.kalin }}>{eylem.title}</Box>
                    <Box sx={{ fontSize: `${yazi.kucuk}px`, color: renk.sessiz, textTransform: 'none' }}>
                      {eylem.description}
                    </Box>
                  </Box>
                </Button>
              ))}
            </Box>
          </Panel>
        </Grid>

        <Grid item xs={12} lg={4}>
          <Panel
            baslik="Son Eklenen Firmalar"
            ikon={<CheckCircleIcon sx={{ fontSize: 14 }} />}
            bosluksuz
            sagUnsur={
              <IconButton size="small" onClick={() => navigate('/firmalar')}
                aria-label="Firma listesini aç" sx={{ p: 0.15, color: renk.sessiz }}>
                <ViewListIcon sx={{ fontSize: 16 }} />
              </IconButton>
            }
          >
            <VeriTablosu
              sutunlar={[
                { anahtar: 'firmaId', baslik: 'Firma No', genislik: 90 },
                { anahtar: 'tamUnvan', baslik: 'Unvan' },
                { anahtar: 'firmaIl', baslik: 'İl', genislik: 100,
                  bicim: (v) => v || 'Belirtilmemiş' }
              ]}
              satirlar={recentCompanies}
              onSatirTik={(satir) => navigate(`/firmalar/${satir._id}`)}
              bosMetin="Henüz firma eklenmemiş"
            />
          </Panel>
        </Grid>

        <Grid item xs={12} lg={4}>
          <Panel
            baslik="Son İşlemler"
            ikon={<HistoryIcon sx={{ fontSize: 14 }} />}
            bosluksuz
            sagUnsur={
              <IconButton size="small" onClick={() => navigate('/son-islemler')}
                aria-label="Tüm işlemleri aç" sx={{ p: 0.15, color: renk.sessiz }}>
                <ViewListIcon sx={{ fontSize: 16 }} />
              </IconButton>
            }
          >
            <VeriTablosu
              sutunlar={[
                { anahtar: 'title', baslik: 'İşlem' },
                { anahtar: 'user', baslik: 'Kullanıcı', genislik: 110,
                  bicim: (_v, satir) => satir.user?.name || '—' },
                { anahtar: 'action', baslik: 'Tür', genislik: 110,
                  bicim: (v) => activityService.getActionDisplayName(v) },
                { anahtar: 'createdAt', baslik: 'Zaman', genislik: 90,
                  bicim: (v) => activityService.formatDate(v, 'relative') }
              ]}
              satirlar={recentActivities}
              onSatirTik={() => navigate('/son-islemler')}
              bosMetin="Henüz işlem geçmişi bulunmamaktadır"
            />
          </Panel>
        </Grid>
      </Grid>
      </Box>
    </Box>
  );
};

export default Dashboard;