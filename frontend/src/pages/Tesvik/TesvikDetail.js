// 🏆 TEŞVIK DETAIL - ENTERPRISE EDITION
// Comprehensive detail view + timeline + actions
// Excel benzeri renk kodlaması + Word şablonu layout

import React, { useState, useEffect } from 'react';
import {
  Box,
  Container,
  Typography,
  Card,
  CardContent,
  Grid,
  Chip,
  Button,
  Alert,
  Avatar,
  Divider,
  List,
  ListItem,
  ListItemText,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  LinearProgress,
  Skeleton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  IconButton,
  Stack
} from '@mui/material';
import {
  Edit as EditIcon,
  EmojiEvents as EmojiEventsIcon,
  Business as BusinessIcon,
  AttachMoney as AttachMoneyIcon,
  Print as PrintIcon,
  LocationOn as LocationOnIcon,
  DateRange as DateRangeIcon,
  History as HistoryIcon,
  Add as AddIcon,
  Update as UpdateIcon,
  Delete as DeleteIcon,
  Visibility as VisibilityIcon,
  Close as CloseIcon,
  Info as InfoIcon
} from '@mui/icons-material';
import { useNavigate, useParams } from 'react-router-dom';
import Header from '../../components/Layout/Header';
import Sidebar from '../../components/Layout/Sidebar';
import { useAuth } from '../../contexts/AuthContext';
import axios from '../../utils/axios';

const TesvikDetail = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const { user } = useAuth();
  
  // 📊 State Management
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 1024);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [tesvik, setTesvik] = useState(null);
  const [activities, setActivities] = useState([]);
  const [activitiesLoading, setActivitiesLoading] = useState(false);
  const [selectedActivity, setSelectedActivity] = useState(null);
  const [activityModalOpen, setActivityModalOpen] = useState(false);

  // 🎨 Durum Renk Haritası
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

  // 📊 Teşvik Verilerini Yükle
  useEffect(() => {
    const loadTesvik = async () => {
      try {
        setLoading(true);
        const response = await axios.get(`/tesvik/${id}`);
        
        if (response.data.success) {

          setTesvik(response.data.data);
        } else {
          setError('Teşvik bulunamadı');
        }
      } catch (error) {
        console.error('🚨 Teşvik detail hatası:', error);
        setError('Teşvik yüklenirken hata oluştu');
      } finally {
        setLoading(false);
      }
    };

    if (id) {
      loadTesvik();
    }
  }, [id]);

  // 📋 Belge İşlemlerini Yükle
  useEffect(() => {
    const loadActivities = async () => {
      if (!tesvik) return;
      
      try {
        setActivitiesLoading(true);
        const response = await axios.get('/activities', {
          params: {
            kategori: 'tesvik',
            targetId: tesvik._id,
            limit: 10,
            sayfa: 1
          }
        });
        
        if (response.data.success) {
          setActivities(response.data.data.activities || []);
        }
      } catch (error) {
        console.error('🚨 Aktivite yükleme hatası:', error);
      } finally {
        setActivitiesLoading(false);
      }
    };

    loadActivities();
  }, [tesvik]);

  const formatDate = (date) => {
    if (!date) return '-';
    return new Date(date).toLocaleDateString('tr-TR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };



  const getDurumProgress = (durum) => {
    const progressMap = {
      'taslak': 10,
      'hazirlaniyor': 25,
      'başvuru_yapildi': 40,
      'inceleniyor': 60,
      'ek_belge_istendi': 45,
      'revize_talep_edildi': 30,
      'onay_bekliyor': 80,
      'onaylandi': 100,
      'reddedildi': 0,
      'iptal_edildi': 0
    };
    return progressMap[durum] || 0;
  };

  // 🎨 Aktivite İkon ve Renk Haritası
  const getActivityIcon = (action) => {
    const iconMap = {
      'create': <AddIcon />,
      'update': <UpdateIcon />,
      'delete': <DeleteIcon />,
      'view': <VisibilityIcon />,
      'export': <PrintIcon />
    };
    return iconMap[action] || <InfoIcon />;
  };

  const getActivityColor = (action) => {
    const colorMap = {
      'create': '#10B981',
      'update': '#F59E0B',
      'delete': '#EF4444',
      'view': '#3B82F6',
      'export': '#8B5CF6'
    };
    return colorMap[action] || '#6B7280';
  };

  const handleActivityClick = (activity) => {
    setSelectedActivity(activity);
    setActivityModalOpen(true);
  };

  const handleCloseActivityModal = () => {
    setActivityModalOpen(false);
    setSelectedActivity(null);
  };

  // 🏷️ Alan Adlarını Türkçe'ye Çevir
  const getFieldDisplayName = (fieldName) => {
    const fieldMap = {
      // Temel Bilgiler
      'firmaAdi': 'Firma Adı',
      'vergiNo': 'Vergi Numarası',
      'ticariSicilNo': 'Ticari Sicil No',
      'kurulusTarihi': 'Kuruluş Tarihi',
      'faaliyet': 'Faaliyet Konusu',
      'adres': 'Adres',
      'telefon': 'Telefon',
      'email': 'E-posta',
      'yetkiliKisi': 'Yetkili Kişi',
      
      // Yatırım Bilgileri
      'yatirimKonusu': 'Yatırım Konusu',
      'yatirimTutari': 'Yatırım Tutarı',
      'baslangicTarihi': 'Başlangıç Tarihi',
      'bitisTarihi': 'Bitiş Tarihi',
      'il': 'İl',
      'ilce': 'İlçe',
      'mahalle': 'Mahalle',
      
      // Belge Bilgileri
      'belgeNo': 'Belge Numarası',
      'belgeTarihi': 'Belge Tarihi',
      'gecerlilikTarihi': 'Geçerlilik Tarihi',
      'durum': 'Durum',
      
      // Mali Bilgiler
      'toplamYatirim': 'Toplam Yatırım',
      'destekTutari': 'Destek Tutarı',
      'destekOrani': 'Destek Oranı',
      
      // Diğer
      'notlar': 'Notlar',
      'aciklama': 'Açıklama'
    };
    
    return fieldMap[fieldName] || fieldName;
  };

  // 💰 Değerleri Formatla
  const formatFieldValue = (fieldName, value) => {
    if (value === null || value === undefined || value === '') {
      return '-';
    }
    
    // Para birimi alanları
    const moneyFields = ['yatirimTutari', 'toplamYatirim', 'destekTutari'];
    if (moneyFields.includes(fieldName)) {
      return new Intl.NumberFormat('tr-TR', {
        style: 'currency',
        currency: 'TRY'
      }).format(value);
    }
    
    // Yüzde alanları
    const percentFields = ['destekOrani'];
    if (percentFields.includes(fieldName)) {
      return `%${value}`;
    }
    
    // Tarih alanları
    const dateFields = ['kurulusTarihi', 'baslangicTarihi', 'bitisTarihi', 'belgeTarihi', 'gecerlilikTarihi'];
    if (dateFields.includes(fieldName)) {
      return formatDate(value);
    }
    
    // Durum alanları
    if (fieldName === 'durum') {
      const durumMap = {
        'taslak': 'Taslak',
        'hazirlaniyor': 'Hazırlanıyor',
        'başvuru_yapildi': 'Başvuru Yapıldı',
        'inceleniyor': 'İnceleniyor',
        'ek_belge_istendi': 'Ek Belge İstendi',
        'revize_talep_edildi': 'Revize Talep Edildi',
        'onay_bekliyor': 'Onay Bekliyor',
        'onaylandi': 'Onaylandı',
        'reddedildi': 'Reddedildi',
        'iptal_edildi': 'İptal Edildi'
      };
      return durumMap[value] || value;
    }
    
    return String(value);
  };

  if (loading) {
    return (
      <Box sx={{ 
        display: 'grid',
        gridTemplateRows: '64px 1fr',
        gridTemplateColumns: { xs: '1fr', lg: sidebarOpen ? '280px 1fr' : '1fr' },
        height: '100vh',
        backgroundColor: '#f8fafc'
      }}>
        <Header onSidebarToggle={() => setSidebarOpen(!sidebarOpen)} />
        <Container maxWidth="xl" sx={{ mt: 4 }}>
          <Grid container spacing={3}>
            {[1, 2, 3, 4].map(i => (
              <Grid item xs={12} md={6} key={i}>
                <Skeleton variant="rectangular" height={200} sx={{ borderRadius: 2 }} />
              </Grid>
            ))}
          </Grid>
        </Container>
      </Box>
    );
  }

  if (error || !tesvik) {
    return (
      <Box sx={{ 
        display: 'grid',
        gridTemplateRows: '64px 1fr',
        height: '100vh',
        backgroundColor: '#f8fafc'
      }}>
        <Header onSidebarToggle={() => setSidebarOpen(!sidebarOpen)} />
        <Container maxWidth="xl" sx={{ mt: 4 }}>
          <Alert severity="error">
            {error || 'Teşvik bulunamadı'}
          </Alert>
        </Container>
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
          {/* Header */}
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4 }}>
            <Box>
              <Typography variant="h4" sx={{ 
                fontWeight: 700,
                color: '#1f2937',
                mb: 1,
                display: 'flex',
                alignItems: 'center',
                gap: 2
              }}>
                <Avatar sx={{ 
                  background: getDurumColor(tesvik.durumBilgileri?.genelDurum),
                  width: 48,
                  height: 48
                }}>
                  <EmojiEventsIcon />
                </Avatar>
                {tesvik.tesvikId}
              </Typography>
              <Typography variant="h6" color="text.secondary">
                {tesvik.yatirimciUnvan}
              </Typography>
            </Box>
            
            <Box sx={{ display: 'flex', gap: 1 }}>
              {user?.yetkiler?.belgeDuzenle && (
                <Button
                  variant="outlined"
                  startIcon={<EditIcon />}
                  onClick={() => navigate(`/tesvik/${tesvik._id}/duzenle`)}
                >
                  Düzenle
                </Button>
              )}
              
              <Button
                variant="outlined"
                startIcon={<PrintIcon />}
                onClick={() => window.print()}
              >
                Yazdır
              </Button>
            </Box>
          </Box>

          {/* Ana Bilgiler */}
          <Grid container spacing={3}>
            {/* Durum Kartı */}
            <Grid item xs={12} md={4}>
              <Card sx={{ height: '100%' }}>
                <CardContent>
                  <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>
                    Durum Bilgileri
                  </Typography>
                  
                  <Box sx={{ mb: 3 }}>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                      Mevcut Durum
                    </Typography>
                    <Chip
                      label={tesvik.durumBilgileri?.genelDurum?.replace('_', ' ')}
                      sx={{
                        backgroundColor: getDurumColor(tesvik.durumBilgileri?.genelDurum),
                        color: 'white',
                        fontWeight: 600,
                        fontSize: '0.875rem'
                      }}
                    />
                  </Box>

                  <Box sx={{ mb: 3 }}>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                      İlerleme
                    </Typography>
                    <LinearProgress
                      variant="determinate"
                      value={getDurumProgress(tesvik.durumBilgileri?.genelDurum)}
                      sx={{
                        height: 8,
                        borderRadius: 4,
                        backgroundColor: 'rgba(0, 0, 0, 0.1)',
                        '& .MuiLinearProgress-bar': {
                          backgroundColor: getDurumColor(tesvik.durumBilgileri?.genelDurum)
                        }
                      }}
                    />
                    <Typography variant="caption" color="text.secondary">
                      %{getDurumProgress(tesvik.durumBilgileri?.genelDurum)} tamamlandı
                    </Typography>
                  </Box>

                  <Divider sx={{ my: 2 }} />

                  <Box>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                      Son Güncelleme
                    </Typography>
                    <Typography variant="body2">
                      {formatDate(tesvik.durumBilgileri?.sonDurumGuncelleme)}
                    </Typography>
                  </Box>
                </CardContent>
              </Card>
            </Grid>

            {/* Firma Bilgileri */}
            <Grid item xs={12} md={4}>
              <Card sx={{ height: '100%' }}>
                <CardContent>
                  <Typography variant="h6" sx={{ mb: 2, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 1 }}>
                    <BusinessIcon />
                    Firma Bilgileri
                  </Typography>
                  
                  {tesvik.firma && (
                    <List dense>
                      <ListItem disablePadding>
                        <ListItemText
                          primary="Firma ID"
                          secondary={tesvik.firma.firmaId}
                        />
                      </ListItem>
                      <ListItem disablePadding>
                        <ListItemText
                          primary="Ünvan"
                          secondary={tesvik.firma.tamUnvan}
                        />
                      </ListItem>
                      <ListItem disablePadding>
                        <ListItemText
                          primary="Vergi No"
                          secondary={tesvik.firma.vergiNoTC}
                        />
                      </ListItem>
                      <ListItem disablePadding>
                        <ListItemText
                          primary="İl"
                          secondary={tesvik.firma.firmaIl}
                        />
                      </ListItem>
                    </List>
                  )}
                </CardContent>
              </Card>
            </Grid>

            {/* Yatırım Bilgileri */}
            <Grid item xs={12} md={4}>
              <Card sx={{ height: '100%' }}>
                <CardContent>
                  <Typography variant="h6" sx={{ mb: 2, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 1 }}>
                    <LocationOnIcon />
                    Yatırım Bilgileri
                  </Typography>
                  
                  <List dense>
                    <ListItem disablePadding>
                      <ListItemText
                        primary="Yatırım Konusu"
                        secondary={tesvik.yatirimBilgileri?.yatirimKonusu || '-'}
                      />
                    </ListItem>
                    <ListItem disablePadding>
                      <ListItemText
                        primary="Destek Sınıfı"
                        secondary={tesvik.yatirimBilgileri?.destekSinifi || '-'}
                      />
                    </ListItem>
                    <ListItem disablePadding>
                      <ListItemText
                        primary="Yatırım Yeri"
                        secondary={`${tesvik.yatirimBilgileri?.yerinIl || ''} ${tesvik.yatirimBilgileri?.yerinIlce || ''}`.trim() || '-'}
                      />
                    </ListItem>
                  </List>
                </CardContent>
              </Card>
            </Grid>

            {/* Belge Yönetimi */}
            <Grid item xs={12} md={6}>
              <Card>
                <CardContent>
                  <Typography variant="h6" sx={{ mb: 2, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 1 }}>
                    <DateRangeIcon />
                    Belge Yönetimi
                  </Typography>
                  
                  <TableContainer>
                    <Table size="small">
                      <TableBody>
                        <TableRow>
                          <TableCell sx={{ fontWeight: 600 }}>Belge No</TableCell>
                          <TableCell>{tesvik.belgeYonetimi?.belgeNo || '-'}</TableCell>
                        </TableRow>
                        <TableRow>
                          <TableCell sx={{ fontWeight: 600 }}>Belge Tarihi</TableCell>
                          <TableCell>{formatDate(tesvik.belgeYonetimi?.belgeTarihi)}</TableCell>
                        </TableRow>
                        <TableRow>
                          <TableCell sx={{ fontWeight: 600 }}>Dayandığı Kanun</TableCell>
                          <TableCell>{tesvik.belgeYonetimi?.dayandigiKanun || '-'}</TableCell>
                        </TableRow>
                        <TableRow>
                          <TableCell sx={{ fontWeight: 600 }}>Müracaat No</TableCell>
                          <TableCell>{tesvik.belgeYonetimi?.belgeMuracaatNo || '-'}</TableCell>
                        </TableRow>
                      </TableBody>
                    </Table>
                  </TableContainer>
                </CardContent>
              </Card>
            </Grid>

            {/* Mali Hesaplamalar */}
            <Grid item xs={12} md={6}>
              <Card>
                <CardContent>
                  <Typography variant="h6" sx={{ mb: 2, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 1 }}>
                    <AttachMoneyIcon />
                    Mali Hesaplamalar
                  </Typography>
                  
                  <Paper sx={{ p: 2, backgroundColor: '#f8fafc', mb: 2 }}>
                    <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 600 }}>
                      Maliyetlenen Hesaplamalar
                    </Typography>
                    <Grid container spacing={2}>
                      <Grid item xs={4}>
                        <Typography variant="caption" color="text.secondary">SL</Typography>
                        <Typography variant="body2" sx={{ fontWeight: 600 }}>
                          {tesvik.maliHesaplamalar?.maliyetlenen?.sl?.toLocaleString() || '0'}
                        </Typography>
                      </Grid>
                      <Grid item xs={4}>
                        <Typography variant="caption" color="text.secondary">SM</Typography>
                        <Typography variant="body2" sx={{ fontWeight: 600 }}>
                          {tesvik.maliHesaplamalar?.maliyetlenen?.sm?.toLocaleString() || '0'}
                        </Typography>
                      </Grid>
                      <Grid item xs={4}>
                        <Typography variant="caption" color="text.secondary">SN (SL×SM)</Typography>
                        <Typography variant="body2" sx={{ fontWeight: 600, color: '#dc2626' }}>
                          {tesvik.maliHesaplamalar?.maliyetlenen?.sn?.toLocaleString() || '0'}
                        </Typography>
                      </Grid>
                    </Grid>
                  </Paper>

                  <Paper sx={{ p: 2, backgroundColor: '#f0fdf4' }}>
                    <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 600 }}>
                      İstihdam
                    </Typography>
                    <Grid container spacing={2}>
                      <Grid item xs={4}>
                        <Typography variant="caption" color="text.secondary">Mevcut</Typography>
                        <Typography variant="body2" sx={{ fontWeight: 600 }}>
                          {tesvik.istihdam?.mevcutKisi || 0} kişi
                        </Typography>
                      </Grid>
                      <Grid item xs={4}>
                        <Typography variant="caption" color="text.secondary">İlave</Typography>
                        <Typography variant="body2" sx={{ fontWeight: 600 }}>
                          {tesvik.istihdam?.ilaveKisi || 0} kişi
                        </Typography>
                      </Grid>
                      <Grid item xs={4}>
                        <Typography variant="caption" color="text.secondary">Toplam</Typography>
                        <Typography variant="body2" sx={{ fontWeight: 600, color: '#059669' }}>
                          {tesvik.istihdam?.toplamKisi || 0} kişi
                        </Typography>
                      </Grid>
                    </Grid>
                  </Paper>
                </CardContent>
              </Card>
            </Grid>

            {/* 👤 Kullanıcı Takibi */}
            <Grid item xs={12} md={6}>
              <Card>
                <CardContent>
                  <Typography variant="h6" sx={{ mb: 2, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 1 }}>
                    👤 Kullanıcı Takibi
                  </Typography>
                  
                  <List dense>
                    <ListItem disablePadding>
                      <ListItemText
                        primary="Oluşturan"
                        secondary={
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <Typography variant="body2">
                              {tesvik.olusturanKullanici?.adSoyad || 'Bilinmiyor'}
                            </Typography>
                            {tesvik.olusturanKullanici?.rol && (
                              <Chip 
                                label={tesvik.olusturanKullanici.rol} 
                                size="small" 
                                variant="outlined"
                                sx={{ height: 18, fontSize: '0.65rem' }}
                              />
                            )}
                          </Box>
                        }
                      />
                    </ListItem>
                    <ListItem disablePadding>
                      <ListItemText
                        primary="Oluşturma Tarihi"
                        secondary={formatDate(tesvik.createdAt)}
                      />
                    </ListItem>
                    {tesvik.sonGuncelleyen && (
                      <>
                        <ListItem disablePadding>
                          <ListItemText
                            primary="Son Güncelleyen"
                            secondary={
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                <Typography variant="body2">
                                  {tesvik.sonGuncelleyen?.adSoyad || 'Bilinmiyor'}
                                </Typography>
                              </Box>
                            }
                          />
                        </ListItem>
                        <ListItem disablePadding>
                          <ListItemText
                            primary="Son Güncelleme"
                            secondary={formatDate(tesvik.updatedAt)}
                          />
                        </ListItem>
                      </>
                    )}
                  </List>
                </CardContent>
              </Card>
            </Grid>

            {/* 📋 Son Belge İşlemleri */}
            <Grid item xs={12} md={6}>
              <Card>
                <CardContent>
                  <Typography variant="h6" sx={{ mb: 2, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 1 }}>
                    <HistoryIcon />
                    Son Belge İşlemleri
                  </Typography>
                  
                  {activitiesLoading ? (
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                      {[1, 2, 3].map(i => (
                        <Skeleton key={i} variant="rectangular" height={40} sx={{ borderRadius: 1 }} />
                      ))}
                    </Box>
                  ) : activities.length > 0 ? (
                     <Stack spacing={1}>
                       {activities.slice(0, 5).map((activity, index) => (
                         <Paper 
                           key={activity._id}
                           variant="outlined"
                           sx={{ 
                             p: 2,
                             cursor: 'pointer',
                             '&:hover': { backgroundColor: '#f5f5f5' },
                             transition: 'background-color 0.2s',
                             borderLeft: `4px solid ${getActivityColor(activity.action)}`
                           }}
                           onClick={() => handleActivityClick(activity)}
                         >
                           <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 2 }}>
                             <Avatar sx={{ 
                               backgroundColor: getActivityColor(activity.action),
                               color: 'white',
                               width: 32,
                               height: 32
                             }}>
                               {getActivityIcon(activity.action)}
                             </Avatar>
                             <Box sx={{ flex: 1 }}>
                               <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 0.5 }}>
                                 <Typography variant="body2" sx={{ fontWeight: 600 }}>
                                   {activity.title}
                                 </Typography>
                                 <Typography variant="caption" color="text.secondary">
                                   {formatDate(activity.createdAt)}
                                 </Typography>
                               </Box>
                               <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5 }}>
                                 {activity.description}
                               </Typography>
                               {activity.changes && activity.changes.length > 0 && (
                                 <Chip 
                                   label={`${activity.changes.length} alan güncellendi`}
                                   size="small"
                                   sx={{ 
                                     backgroundColor: '#FEF3C7',
                                     color: '#D97706',
                                     fontSize: '0.65rem',
                                     height: 20
                                   }}
                                 />
                               )}
                             </Box>
                           </Box>
                         </Paper>
                       ))}
                     </Stack>
                  ) : (
                    <Box sx={{ textAlign: 'center', py: 3 }}>
                      <Typography variant="body2" color="text.secondary">
                        Henüz işlem kaydı bulunmuyor
                      </Typography>
                    </Box>
                  )}
                  
                  {activities.length > 5 && (
                    <Box sx={{ textAlign: 'center', mt: 2 }}>
                      <Button 
                        size="small" 
                        variant="outlined"
                        onClick={() => {
                          // Tüm işlemleri göster modalı açılabilir
                          console.log('Tüm işlemleri göster');
                        }}
                      >
                        Tüm İşlemleri Göster ({activities.length})
                      </Button>
                    </Box>
                  )}
                </CardContent>
              </Card>
            </Grid>

            {/* Ek Bilgiler */}
            {tesvik.notlar?.dahiliNotlar && (
              <Grid item xs={12}>
                <Card>
                  <CardContent>
                    <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>
                      Notlar
                    </Typography>
                    <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>
                      {tesvik.notlar.dahiliNotlar}
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
            )}
          </Grid>
        </Container>
      </Box>

      {/* 📋 İşlem Detayı Modal */}
      <Dialog 
        open={activityModalOpen} 
        onClose={handleCloseActivityModal}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="h6">İşlem Detayları</Typography>
          <IconButton onClick={handleCloseActivityModal}>
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        <DialogContent>
          {selectedActivity && (
            <Box>
              <Grid container spacing={2}>
                <Grid item xs={12} md={6}>
                  <Typography variant="subtitle2" color="text.secondary">İşlem Türü</Typography>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                    <Avatar sx={{ 
                      backgroundColor: getActivityColor(selectedActivity.action),
                      width: 24,
                      height: 24
                    }}>
                      {getActivityIcon(selectedActivity.action)}
                    </Avatar>
                    <Typography variant="body1">{selectedActivity.title}</Typography>
                  </Box>
                </Grid>
                <Grid item xs={12} md={6}>
                  <Typography variant="subtitle2" color="text.secondary">Tarih</Typography>
                  <Typography variant="body1" sx={{ mb: 2 }}>
                    {formatDate(selectedActivity.createdAt)}
                  </Typography>
                </Grid>
                <Grid item xs={12}>
                  <Typography variant="subtitle2" color="text.secondary">Açıklama</Typography>
                  <Typography variant="body1" sx={{ mb: 2 }}>
                    {selectedActivity.description}
                  </Typography>
                </Grid>
                {selectedActivity.user && (
                  <Grid item xs={12}>
                    <Typography variant="subtitle2" color="text.secondary">İşlemi Yapan</Typography>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                      <Typography variant="body1">{selectedActivity.user.name}</Typography>
                      {selectedActivity.user.role && (
                        <Chip 
                          label={selectedActivity.user.role} 
                          size="small" 
                          variant="outlined"
                        />
                      )}
                    </Box>
                  </Grid>
                )}
                {selectedActivity.changes && selectedActivity.changes.length > 0 && (
                  <Grid item xs={12}>
                    <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1 }}>
                      Değişiklikler ({selectedActivity.changes.length} alan güncellendi)
                    </Typography>
                    <TableContainer component={Paper} variant="outlined" sx={{ maxHeight: 400, overflow: 'auto' }}>
                      <Table size="small" stickyHeader>
                         <TableHead>
                           <TableRow sx={{ backgroundColor: '#f8fafc' }}>
                            <TableCell sx={{ 
                              fontWeight: 700, 
                              backgroundColor: '#f1f5f9',
                              borderRight: '1px solid #e5e7eb',
                              width: '30%'
                            }}>
                              Alan
                            </TableCell>
                            <TableCell sx={{ 
                              fontWeight: 700, 
                              backgroundColor: '#fef2f2',
                              borderRight: '1px solid #e5e7eb',
                              color: '#dc2626'
                            }}>
                              Önceki Değer
                            </TableCell>
                            <TableCell sx={{ 
                              fontWeight: 700, 
                              backgroundColor: '#f0fdf4',
                              color: '#059669'
                            }}>
                              Yeni Değer
                            </TableCell>
                          </TableRow>
                         </TableHead>
                        <TableBody>
                          {selectedActivity.changes.map((change, index) => (
                            <TableRow key={index} sx={{ '&:nth-of-type(odd)': { backgroundColor: '#f9fafb' } }}>
                              <TableCell sx={{ fontWeight: 600, width: '30%', borderRight: '1px solid #e5e7eb' }}>
                                {getFieldDisplayName(change.field)}
                              </TableCell>
                              <TableCell sx={{ 
                                color: '#dc2626', 
                                backgroundColor: '#fef2f2',
                                borderRight: '1px solid #e5e7eb',
                                fontFamily: 'monospace',
                                fontSize: '0.875rem'
                              }}>
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                  <Typography variant="caption" sx={{ color: '#6b7280', fontWeight: 600 }}>ESKİ:</Typography>
                                  <Typography variant="body2">{formatFieldValue(change.field, change.oldValue)}</Typography>
                                </Box>
                              </TableCell>
                              <TableCell sx={{ 
                                color: '#059669', 
                                backgroundColor: '#f0fdf4',
                                fontFamily: 'monospace',
                                fontSize: '0.875rem'
                              }}>
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                  <Typography variant="caption" sx={{ color: '#6b7280', fontWeight: 600 }}>YENİ:</Typography>
                                  <Typography variant="body2">{formatFieldValue(change.field, change.newValue)}</Typography>
                                </Box>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </TableContainer>
                  </Grid>
                )}
                {selectedActivity.metadata && (
                  <Grid item xs={12}>
                    <Typography variant="subtitle2" color="text.secondary">Ek Bilgiler</Typography>
                    <Paper sx={{ p: 2, backgroundColor: '#f8fafc', mt: 1 }}>
                      <Typography variant="caption" color="text.secondary">
                        IP: {selectedActivity.metadata.ip || '-'} | 
                        Tarayıcı: {selectedActivity.metadata.userAgent?.substring(0, 50) || '-'}...
                      </Typography>
                    </Paper>
                  </Grid>
                )}
              </Grid>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseActivityModal}>Kapat</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default TesvikDetail;