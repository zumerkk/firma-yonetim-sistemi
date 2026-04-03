// 🆕 YENİ TEŞVİK DASHBOARD - ENTERPRISE EDITION
// Ana teşvik kontrol paneli + widget sistemi
// Excel benzeri renk kodlaması + durum takibi

import React, { useState, useEffect } from 'react';
import {
  Box,
  Container,
  Typography,
  Grid,
  Card,
  CardContent,
  Button,
  Chip,
  Avatar,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
  LinearProgress,
  IconButton,
  Alert,
  Skeleton,
  Divider
} from '@mui/material';
import {
  EmojiEvents as EmojiEventsIcon,
  Add as AddIcon,
  List as ListIcon,
  CheckCircle as CheckCircleIcon,
  Warning as WarningIcon,
  AccessTime as AccessTimeIcon,
  Visibility as VisibilityIcon
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import Header from '../../components/Layout/Header';
import Sidebar from '../../components/Layout/Sidebar';
import { useAuth } from '../../contexts/AuthContext';
import axios from '../../utils/axios';

const YeniTesvikDashboard = () => {
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
        const response = await axios.get('/yeni-tesvik/dashboard/widgets');
        
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

  // 🎨 Durum Renk Haritası - Excel Style
  const getDurumColor = (durum) => {
    const colorMap = {
      'taslak': '#6B7280',
      'hazirlaniyor': '#F59E0B',
      'başvuru_yapildi': '#3B82F6',
      'inceleniyor': '#F97316',
      'ek_belge_istendi': '#F59E0B',
      'revize_talep_edildi': '#EF4444',
      'onay_bekliyor': '#F97316',
      'onaylandi': '#10B981',
      'reddedildi': '#EF4444',
      'iptal_edildi': '#6B7280'
    };
    return colorMap[durum] || '#6B7280';
  };

  // 📊 Widget Components
  const StatsCard = ({ title, value, subtitle, icon, color, progress }) => (
    <Card sx={{ 
      height: '100%',
      background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.95), rgba(248, 250, 252, 0.95))',
      border: '1px solid rgba(226, 232, 240, 0.5)',
      borderRadius: 3,
      transition: 'all 0.3s ease',
      '&:hover': {
        transform: 'translateY(-2px)',
        boxShadow: '0 8px 25px rgba(0, 0, 0, 0.1)',
        border: `1px solid ${color}25`
      }
    }}>
      <CardContent sx={{ pb: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
          <Avatar sx={{ 
            background: `linear-gradient(135deg, ${color}, ${color}dd)`,
            mr: 2,
            width: 48,
            height: 48
          }}>
            {icon}
          </Avatar>
          <Box sx={{ flex: 1 }}>
            <Typography variant="h4" sx={{ 
              fontWeight: 700,
              color: '#1f2937',
              fontSize: '2rem'
            }}>
              {loading ? <Skeleton width={80} /> : value.toLocaleString()}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {title}
            </Typography>
          </Box>
        </Box>
        
        {progress !== undefined && (
          <Box>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
              <Typography variant="caption" color="text.secondary">
                {subtitle}
              </Typography>
              <Typography variant="caption" sx={{ color, fontWeight: 600 }}>
                %{progress}
              </Typography>
            </Box>
            <LinearProgress 
              variant="determinate" 
              value={progress} 
              sx={{
                backgroundColor: 'rgba(0, 0, 0, 0.1)',
                '& .MuiLinearProgress-bar': {
                  background: `linear-gradient(90deg, ${color}, ${color}cc)`
                }
              }}
            />
          </Box>
        )}
      </CardContent>
    </Card>
  );

  if (loading && !dashboardData.ozet.toplamTesvik) {
    return (
      <Box sx={{ display: 'grid', gridTemplateRows: '64px 1fr', height: '100vh' }}>
        <Header onSidebarToggle={() => setSidebarOpen(!sidebarOpen)} />
        <Box sx={{ display: 'flex' }}>
          <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} variant={isMobile ? 'temporary' : 'persistent'} />
          <Container maxWidth="xl" sx={{ mt: 4, mb: 4 }}>
            <Grid container spacing={3}>
              {[1, 2, 3, 4].map(i => (
                <Grid item xs={12} sm={6} md={3} key={i}>
                  <Skeleton variant="rectangular" height={120} sx={{ borderRadius: 2 }} />
                </Grid>
              ))}
            </Grid>
          </Container>
        </Box>
      </Box>
    );
  }

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
        p: 3
      }}>
        <Container maxWidth="xl">
          {/* 🏆 Header */}
          <Box sx={{ mb: 4 }}>
            <Typography variant="h4" sx={{ 
              fontWeight: 700,
              color: '#1f2937',
              mb: 1,
              display: 'flex',
              alignItems: 'center',
              gap: 2
            }}>
              <EmojiEventsIcon sx={{ fontSize: 32, color: '#dc2626' }} />
              Yeni Teşvik Dashboard
              <Chip 
                label="Yalnızca Yeni Kayıtlar" 
                size="small" 
                sx={{ bgcolor: '#ecfdf5', color: '#065f46', border: '1px solid #10b981' }}
              />
            </Typography>
            <Alert severity="info" sx={{ mt: 1 }}>
              Bu panelde yalnızca Yeni Teşvik sisteminde oluşturulan belgeler gösterilir.
            </Alert>
            <Box sx={{ mt: 1, display: 'flex', gap: 1 }}>
              <Button variant="contained" size="small" disabled sx={{ bgcolor: '#10b981', '&:hover': { bgcolor: '#059669' } }}>
                Yeni Sistem
              </Button>
              <Button variant="outlined" size="small" onClick={() => navigate('/tesvik')}>
                Legacy Sistem
              </Button>
            </Box>
          </Box>

          {error && (
            <Alert severity="error" sx={{ mb: 3 }}>
              {error}
            </Alert>
          )}

          {/* 📊 İstatistik Kartları */}
          <Grid container spacing={3} sx={{ mb: 4 }}>
            <Grid item xs={12} sm={6} md={3}>
              <StatsCard
                title="Toplam Teşvik"
                value={dashboardData.ozet.toplamTesvik}
                subtitle="Sistem geneli"
                icon={<EmojiEventsIcon />}
                color="#1e40af"
              />
            </Grid>
            
            <Grid item xs={12} sm={6} md={3}>
              <StatsCard
                title="Aktif Teşvik"
                value={dashboardData.ozet.aktifTesvik}
                subtitle="İşlemde olan"
                icon={<AccessTimeIcon />}
                color="#f97316"
              />
            </Grid>
            
            <Grid item xs={12} sm={6} md={3}>
              <StatsCard
                title="Bekleyen"
                value={dashboardData.ozet.bekleyenTesvik}
                subtitle="Değerlendirmede"
                icon={<WarningIcon />}
                color="#f59e0b"
              />
            </Grid>
            
            <Grid item xs={12} sm={6} md={3}>
              <StatsCard
                title="Onaylanan"
                value={dashboardData.ozet.onaylananTesvik}
                subtitle={`Başarı: %${dashboardData.ozet.basariOrani}`}
                icon={<CheckCircleIcon />}
                color="#10b981"
                progress={parseFloat(dashboardData.ozet.basariOrani)}
              />
            </Grid>
          </Grid>

          {/* 📋 İçerik Kartları */}
          <Grid container spacing={3}>
            {/* Son Eklenen Teşvikler */}
            <Grid item xs={12} lg={8}>
              <Card sx={{ height: 400 }}>
                <CardContent>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                    <Typography variant="h6" sx={{ fontWeight: 600 }}>
                      Son Eklenen Teşvikler
                    </Typography>
                    <Button
                      startIcon={<VisibilityIcon />}
                      onClick={() => navigate('/yeni-tesvik/liste')}
                      size="small"
                    >
                      Tümünü Gör
                    </Button>
                  </Box>
                  
                  <List sx={{ maxHeight: 300, overflow: 'auto' }}>
                    {dashboardData.sonEklenenler.length > 0 ? (
                      dashboardData.sonEklenenler.map((tesvik, index) => (
                        <ListItem key={tesvik._id || index} sx={{ 
                          border: '1px solid #f1f5f9',
                          borderRadius: 2,
                          mb: 1,
                          '&:hover': { backgroundColor: '#f8fafc' }
                        }}>
                          <ListItemAvatar>
                            <Avatar sx={{ 
                              background: getDurumColor(tesvik.durumBilgileri?.genelDurum),
                              color: 'white',
                              width: 32,
                              height: 32
                            }}>
                              <EmojiEventsIcon sx={{ fontSize: 16 }} />
                            </Avatar>
                          </ListItemAvatar>
                          <ListItemText
                            primary={
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                                  {tesvik.tesvikId}
                                </Typography>
                                <Chip
                                  label={tesvik.durumBilgileri?.genelDurum?.replace('_', ' ')}
                                  size="small"
                                  sx={{
                                    backgroundColor: getDurumColor(tesvik.durumBilgileri?.genelDurum),
                                    color: 'white',
                                    fontSize: '0.7rem',
                                    height: 20
                                  }}
                                />
                              </Box>
                            }
                            secondary={
                              <span>
                                <span style={{ color: '#6b7280', fontSize: '0.875rem', lineHeight: 1.43, display: 'block' }}>
                                  {tesvik.yatirimciUnvan}
                                </span>
                                {/* 👤 Ekleyen kullanıcı bilgisi */}
                                <span style={{ 
                                  display: 'flex', 
                                  alignItems: 'center', 
                                  gap: '4px',
                                  marginTop: '4px',
                                  color: '#6b7280',
                                  fontSize: '0.75rem'
                                }}>
                                  <span>👤 {tesvik.olusturanKullanici?.adSoyad || 'Bilinmiyor'}</span>
                                  {tesvik.olusturanKullanici?.rol && (
                                    <span 
                                      style={{
                                        display: 'inline-block',
                                        padding: '2px 6px',
                                        border: '1px solid #d1d5db',
                                        borderRadius: '4px',
                                        fontSize: '0.6rem',
                                        height: '16px',
                                        lineHeight: '12px',
                                        color: '#6b7280'
                                      }}
                                    >
                                      {tesvik.olusturanKullanici.rol}
                                    </span>
                                  )}
                                  <span>• {new Date(tesvik.createdAt).toLocaleDateString('tr-TR')}</span>
                                </span>
                              </span>
                            }
                          />
                          <IconButton 
                            size="small"
                            onClick={() => navigate(`/yeni-tesvik/${tesvik._id}`)}
                          >
                            <VisibilityIcon fontSize="small" />
                          </IconButton>
                        </ListItem>
                      ))
                    ) : (
                      <Alert severity="info">
                        Henüz teşvik kaydı bulunmuyor
                      </Alert>
                    )}
                  </List>
                </CardContent>
              </Card>
            </Grid>

            {/* Hızlı İşlemler */}
            <Grid item xs={12} lg={4}>
              <Card sx={{ height: 400 }}>
                <CardContent>
                  <Typography variant="h6" sx={{ fontWeight: 600, mb: 3 }}>
                    Hızlı İşlemler
                  </Typography>
                  
                  <Grid container spacing={2}>
                    <Grid item xs={12}>
                      {user?.yetkiler?.belgeEkle && (
                        <Button
                          fullWidth
                          variant="contained"
                          startIcon={<AddIcon />}
                          onClick={() => navigate('/yeni-tesvik/yeni')}
                          sx={{
                            background: 'linear-gradient(135deg, #dc2626, #b91c1c)',
                            py: 1.5,
                            fontSize: '0.9rem',
                            fontWeight: 600
                          }}
                        >
                          Yeni Teşvik Ekle
                        </Button>
                      )}
                    </Grid>
                    
                    <Grid item xs={12}>
                      <Button
                        fullWidth
                        variant="outlined"
                        startIcon={<ListIcon />}
                        onClick={() => navigate('/yeni-tesvik/liste')}
                        sx={{ py: 1.5 }}
                      >
                        Teşvik Listesi
                      </Button>
                    </Grid>

                    {user?.yetkiler?.belgeEkle && (
                      <Grid item xs={12}>
                        <Button
                          fullWidth
                          variant="outlined"
                          color="secondary"
                          startIcon={<EmojiEventsIcon />}
                          onClick={() => navigate('/yeni-tesvik/import')}
                          sx={{
                            py: 1.5,
                            borderColor: '#6d28d9',
                            color: '#6d28d9',
                            '&:hover': {
                              borderColor: '#5b21b6',
                              bgcolor: 'rgba(109, 40, 217, 0.04)'
                            }
                          }}
                        >
                          📊 Excel'den Import
                        </Button>
                      </Grid>
                    )}
                  </Grid>

                  <Divider sx={{ my: 3 }} />

                  <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 2 }}>
                    Durum Dağılımı
                  </Typography>
                  
                  {dashboardData.durumDagilimi.length > 0 ? (
                    <Box component="div">
                      {dashboardData.durumDagilimi.slice(0, 5).map((item, index) => (
                        <Box component="div" key={item._id || index} sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', py: 1 }}>
                          <Box component="div" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <Box component="span" sx={{
                              width: 12,
                              height: 12,
                              borderRadius: '50%',
                              backgroundColor: getDurumColor(item._id)
                            }} />
                            <Typography component="span" variant="body2">
                              {item._id?.replace('_', ' ') || 'Diğer'}
                            </Typography>
                          </Box>
                          <Typography component="span" variant="body2" sx={{ fontWeight: 600 }}>
                            {item.count}
                          </Typography>
                        </Box>
                      ))}
                    </Box>
                  ) : (
                    <Typography component="div" variant="body2" color="text.secondary">
                      Henüz veri yok
                    </Typography>
                  )}
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        </Container>
      </Box>
    </Box>
  );
};

export default YeniTesvikDashboard;