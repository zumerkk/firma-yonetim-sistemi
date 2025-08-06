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
  Info as InfoIcon,
  FileDownload as FileDownloadIcon,

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
  // const [activitiesLoading, setActivitiesLoading] = useState(false);
  const [selectedActivity, setSelectedActivity] = useState(null);
  const [activityModalOpen, setActivityModalOpen] = useState(false);
  const [allActivitiesModalOpen, setAllActivitiesModalOpen] = useState(false);
  const [activityFilter, setActivityFilter] = useState('all');
  const [exportingRevizyon, setExportingRevizyon] = useState(false);
  const [revizyonModalOpen, setRevizyonModalOpen] = useState(false);
  const [revizyonForm, setRevizyonForm] = useState({
    revizyonSebebi: '',
    yeniDurum: '',
    kullaniciNotu: ''
  });

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
        // setActivitiesLoading(true);
        const response = await axios.get('/activities', {
          params: {
            kategori: 'tesvik',
            targetId: tesvik._id,
            limit: 100, // Tüm aktiviteleri yükle
            sayfa: 1
          }
        });
        
        if (response.data.success) {
          setActivities(response.data.data.activities || []);
        }
      } catch (error) {
        console.error('🚨 Aktivite yükleme hatası:', error);
      } finally {
        // setActivitiesLoading(false);
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

  // 🕒 Gelişmiş Tarih/Saat Formatı
  const formatDateTime = (date) => {
    if (!date) return '-';
    return new Date(date).toLocaleString('tr-TR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  };

  // 📊 Revizyon Excel Export
  const handleRevizyonExcelExport = async () => {
    try {
      setExportingRevizyon(true);
      
      const response = await axios.get(`/tesvik/${tesvik._id}/revizyon-excel-export`, {
        responseType: 'blob',
        params: {
          includeColors: true
        }
      });
      
      // Blob'dan dosya oluştur
      const blob = new Blob([response.data], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      });
      
      // Dosya adını response header'ından al veya varsayılan kullan
      const contentDisposition = response.headers['content-disposition'];
      let fileName = `revizyon_gecmisi_${tesvik.firma?.firmaId}_${tesvik.tesvikId || tesvik.gmId}_${new Date().toISOString().split('T')[0]}.xlsx`;
      
      if (contentDisposition) {
        const fileNameMatch = contentDisposition.match(/filename="?([^"]+)"?/);
        if (fileNameMatch) {
          fileName = fileNameMatch[1];
        }
      }
      
      // Dosyayı indir
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
      
      console.log('✅ Revizyon Excel export başarılı');
      
    } catch (error) {
      console.error('❌ Revizyon Excel export hatası:', error);
      alert('Excel export sırasında hata oluştu. Lütfen tekrar deneyin.');
    } finally {
      setExportingRevizyon(false);
    }
  };

  // 📝 Revizyon Ekleme
  const handleRevizyonEkle = async () => {
    try {
      const response = await axios.post(`/tesvik/${tesvik._id}/revizyon`, {
        revizyonSebebi: revizyonForm.revizyonSebebi,
        yeniDurum: revizyonForm.yeniDurum,
        kullaniciNotu: revizyonForm.kullaniciNotu
      });
      
      if (response.data.success) {
        // Başarılı mesajı
        alert('Revizyon başarıyla eklendi!');
        
        // Form'u temizle
        setRevizyonForm({
          revizyonSebebi: '',
          yeniDurum: '',
          kullaniciNotu: ''
        });
        
        // Modal'ı kapat
        setRevizyonModalOpen(false);
        
        // Sayfayı yenile (teşvik verisini tekrar yükle)
        window.location.reload();
      }
    } catch (error) {
      console.error('❌ Revizyon ekleme hatası:', error);
      alert('Revizyon eklenirken hata oluştu. Lütfen tekrar deneyin.');
    }
  };

  // ⏰ Kaç Zaman Önce Hesaplama
  const getTimeAgo = (date) => {
    if (!date) return '-';
    const now = new Date();
    const diffMs = now - new Date(date);
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    
    if (diffMins < 1) return 'Az önce';
    if (diffMins < 60) return `${diffMins} dakika önce`;
    if (diffHours < 24) return `${diffHours} saat önce`;
    if (diffDays < 30) return `${diffDays} gün önce`;
    return formatDate(date);
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

  const handleCloseAllActivitiesModal = () => {
    setAllActivitiesModalOpen(false);
  };

  // 🔍 Aktiviteleri Filtrele
  const getFilteredActivities = () => {
    if (activityFilter === 'all') {
      return activities;
    }
    return activities.filter(activity => activity.action === activityFilter);
  };



  // 🔄 İşlem Türlerini Türkçe'ye Çevir
  const getActionDisplayName = (action) => {
    const actionMap = {
      'create': 'Oluşturma',
      'update': 'Güncelleme',
      'delete': 'Silme',
      'view': 'Görüntüleme',
      'export': 'Dışa Aktarma'
    };
    
    return actionMap[action] || action;
  };

  // 🏷️ Alan İsimlerini Türkçe'ye Çevir
  const getFieldDisplayName = (field) => {
    const fieldMap = {
      'yatirimciUnvan': 'Yatırımcı Ünvanı',
      'yatirimciAdres': 'Yatırımcı Adresi',
      'yatirimciTelefon': 'Telefon',
      'yatirimciEmail': 'E-posta',
      'yatirimTutari': 'Yatırım Tutarı',
      'istihdam.mevcutKisi': 'Mevcut Kişi Sayısı',
      'istihdam.yeniKisi': 'Yeni Kişi Sayısı',
      'durumBilgileri.genelDurum': 'Genel Durum',
      'durumBilgileri.durumAciklamasi': 'Durum Açıklaması',
      'maliHesaplamalar.toplamYatirim': 'Toplam Yatırım',
      'maliHesaplamalar.tesvikTutari': 'Teşvik Tutarı',
      'notlar.dahiliNotlar': 'Dahili Notlar',
      'notlar.resmiAciklamalar': 'Resmi Açıklamalar'
    };
    
    return fieldMap[field] || field;
  };

  // 💰 Alan Değerlerini Formatla
  const formatFieldValue = (field, value) => {
    if (!value || value === '-') return '-';
    
    // Para birimi alanları
    if (field.includes('Tutari') || field.includes('Yatirim')) {
      return new Intl.NumberFormat('tr-TR', {
        style: 'currency',
        currency: 'TRY'
      }).format(value);
    }
    
    // Sayı alanları
    if (field.includes('Kisi') && !isNaN(value)) {
      return `${value} kişi`;
    }
    
    // Durum alanları
    if (field.includes('Durum')) {
      const durumMap = {
        'taslak': 'Taslak',
        'hazirlaniyor': 'Hazırlanıyor',
        'başvuru_yapildi': 'Başvuru Yapıldı',
        'inceleniyor': 'İnceleniyor',
        'onaylandi': 'Onaylandı',
        'reddedildi': 'Reddedildi'
      };
      return durumMap[value] || value;
    }
    
    return value;
  };

  // Removed unused function getChangesSummary

  // 🏷️ Alanın Kategorisini Belirle
  const getCategoryFromField = (fieldName) => {
    if (fieldName.includes('firma') || fieldName.includes('yatirimci')) return 'Firma Bilgileri';
    if (fieldName.includes('yatirim') || fieldName.includes('konum')) return 'Yatırım Bilgileri';
    if (fieldName.includes('belge') || fieldName.includes('durum')) return 'Belge Bilgileri';
    if (fieldName.includes('mali') || fieldName.includes('tutar') || fieldName.includes('hesap')) return 'Mali Bilgiler';
    if (fieldName.includes('urun')) return 'Ürün Bilgileri';
    if (fieldName.includes('destek') || fieldName.includes('sart')) return 'Destek & Şartlar';
    if (fieldName.includes('istihdam')) return 'İstihdam Bilgileri';
    return 'Genel Bilgiler';
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
              {user?.yetkiler?.belgeEkle && (
                <Button
                  variant="outlined"
                  startIcon={<AddIcon />}
                  onClick={() => setRevizyonModalOpen(true)}
                  sx={{
                    borderColor: '#059669',
                    color: '#059669',
                    '&:hover': {
                      backgroundColor: '#059669',
                      color: 'white',
                      borderColor: '#059669'
                    }
                  }}
                >
                  Revizyon Ekle
                </Button>
              )}

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
                variant="contained"
                startIcon={<FileDownloadIcon />}
                onClick={handleRevizyonExcelExport}
                disabled={exportingRevizyon}
                sx={{
                  backgroundColor: '#4F46E5',
                  '&:hover': {
                    backgroundColor: '#3730A3'
                  }
                }}
              >
                {exportingRevizyon ? 'Excel Hazırlanıyor...' : 'Sistem Revizyon Çıktısı'}
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
                          <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <span>
                              {tesvik.olusturanKullanici?.adSoyad || 'Bilinmiyor'}
                            </span>
                            {tesvik.olusturanKullanici?.rol && (
                              <span style={{ 
                                display: 'inline-block',
                                padding: '2px 6px',
                                fontSize: '0.65rem',
                                border: '1px solid #ccc',
                                borderRadius: '4px',
                                backgroundColor: '#f5f5f5'
                              }}>
                                {tesvik.olusturanKullanici.rol}
                              </span>
                            )}
                          </span>
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
                              <span>
                                {tesvik.sonGuncelleyen?.adSoyad || 'Bilinmiyor'}
                              </span>
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

            {/* 📋 Belge İşlem Yönetimi - Sadece Butonlar */}
            <Grid item xs={12} md={6}>
              <Card>
                <CardContent>
                  <Typography variant="h6" sx={{ fontWeight: 600, display: 'flex', alignItems: 'center', gap: 1, mb: 3 }}>
                    <HistoryIcon />
                    Belge İşlem Yönetimi
                  </Typography>
                  
                  {/* Ana İşlem Butonları */}
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                    {/* Tüm İşlemleri Göster Butonu */}
                    <Button 
                      size="large"
                      variant="outlined"
                      startIcon={<HistoryIcon />}
                      onClick={() => setAllActivitiesModalOpen(true)}
                      sx={{
                        py: 2,
                        borderColor: '#3B82F6',
                        color: '#3B82F6',
                        '&:hover': {
                          backgroundColor: '#3B82F6',
                          color: 'white'
                        }
                      }}
                    >
                      Tüm Belge İşlemlerini Göster ({activities.length})
                    </Button>
                    
                    {/* Revizyon İşlemleri */}
                    <Box sx={{ display: 'flex', gap: 1 }}>
                      {user?.yetkiler?.belgeEkle && (
                        <Button
                          variant="contained"
                          startIcon={<AddIcon />}
                          onClick={() => setRevizyonModalOpen(true)}
                          sx={{
                            flex: 1,
                            backgroundColor: '#059669',
                            '&:hover': {
                              backgroundColor: '#047857'
                            }
                          }}
                        >
                          Revizyon Ekle
                        </Button>
                      )}
                      
                      <Button
                        variant="outlined"
                        startIcon={exportingRevizyon ? null : <FileDownloadIcon />}
                        onClick={handleRevizyonExcelExport}
                        disabled={exportingRevizyon}
                        sx={{
                          flex: 1,
                          borderColor: '#4F46E5',
                          color: '#4F46E5',
                          '&:hover': {
                            backgroundColor: '#4F46E5',
                            color: 'white'
                          }
                        }}
                      >
                        {exportingRevizyon ? (
                          <>
                            <Box sx={{ width: 16, height: 16, mr: 1 }}>
                              <LinearProgress size="small" />
                            </Box>
                            Excel...
                          </>
                        ) : (
                          'Excel Export'
                        )}
                      </Button>
                    </Box>
                    
                    {/* İstatistik Bilgisi */}
                    <Paper sx={{ p: 2, backgroundColor: '#f8fafc', border: '1px solid #e5e7eb' }}>
                      <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                        📊 İşlem Özeti
                      </Typography>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Typography variant="caption" color="text.secondary">
                          Toplam İşlem: <strong>{activities.length}</strong>
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          Görüntüleme: <strong>{activities.filter(a => a.action === 'view').length}</strong>
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          Güncelleme: <strong>{activities.filter(a => a.action === 'update').length}</strong>
                        </Typography>
                      </Box>
                    </Paper>
                  </Box>
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
        maxWidth="lg"
        fullWidth
      >
        <DialogTitle sx={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center',
          backgroundColor: selectedActivity ? getActivityColor(selectedActivity.action) + '10' : 'transparent',
          borderBottom: '1px solid #e5e7eb'
        }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            {selectedActivity && (
              <Avatar sx={{ 
                backgroundColor: getActivityColor(selectedActivity.action),
                width: 40,
                height: 40
              }}>
                {getActivityIcon(selectedActivity.action)}
              </Avatar>
            )}
            <Box>
              <Typography variant="h6" sx={{ fontWeight: 600 }}>
                {selectedActivity && selectedActivity.changes?.fields ? 
                  `${getActionDisplayName(selectedActivity.action)} İşlemi - ${selectedActivity.changes.fields.length} Alan Değiştirildi` :
                  'İşlem Detayları'
                }
              </Typography>
              {selectedActivity && (
                <Typography variant="caption" color="text.secondary">
                  {getTimeAgo(selectedActivity.createdAt)} • {selectedActivity.user?.name || 'Sistem'}
                </Typography>
              )}
            </Box>
          </Box>
          <IconButton onClick={handleCloseActivityModal}>
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        <DialogContent sx={{ p: 0 }}>
          {selectedActivity && (
            <Box>
              {/* 📊 Özet Bilgi Kartları */}
              <Box sx={{ p: 3, backgroundColor: '#f8fafc', borderBottom: '1px solid #e5e7eb' }}>
                <Grid container spacing={3}>
                  <Grid item xs={12} md={3}>
                    <Paper sx={{ p: 2, textAlign: 'center', backgroundColor: 'white', border: '1px solid #e5e7eb' }}>
                      <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>İŞLEM TARİHİ</Typography>
                      <Typography variant="body1" sx={{ fontWeight: 600, mt: 0.5 }}>
                        {formatDateTime(selectedActivity.createdAt)}
                      </Typography>
                      <Typography variant="caption" color="primary.main" sx={{ fontWeight: 500 }}>
                        {getTimeAgo(selectedActivity.createdAt)}
                      </Typography>
                    </Paper>
                  </Grid>
                  <Grid item xs={12} md={3}>
                    <Paper sx={{ p: 2, textAlign: 'center', backgroundColor: 'white', border: '1px solid #e5e7eb' }}>
                      <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>İŞLEMİ YAPAN</Typography>
                      <Typography variant="body1" sx={{ fontWeight: 600, mt: 0.5 }}>
                        {selectedActivity.user?.name || 'Sistem'}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {selectedActivity.user?.role || 'sistem'} {selectedActivity.user?.email && `• ${selectedActivity.user.email}`}
                      </Typography>
                    </Paper>
                  </Grid>
                  <Grid item xs={12} md={3}>
                    <Paper sx={{ p: 2, textAlign: 'center', backgroundColor: 'white', border: '1px solid #e5e7eb' }}>
                      <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>DEĞİŞİKLİK SAYISI</Typography>
                      <Typography variant="h4" sx={{ fontWeight: 700, color: getActivityColor(selectedActivity.action), mt: 0.5 }}>
                        {selectedActivity.changes?.fields?.length || 0}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        alan güncellendi
                      </Typography>
                    </Paper>
                  </Grid>
                  <Grid item xs={12} md={3}>
                    <Paper sx={{ p: 2, textAlign: 'center', backgroundColor: 'white', border: '1px solid #e5e7eb' }}>
                      <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>İŞLEM DURUMU</Typography>
                      <Box sx={{ display: 'flex', justifyContent: 'center', mt: 0.5 }}>
                        <Chip 
                          label="Tamamlandı" 
                          size="small" 
                          sx={{ 
                            backgroundColor: '#10B981',
                            color: 'white',
                            fontWeight: 600
                          }}
                        />
                      </Box>
                      <Typography variant="caption" color="text.secondary">
                        başarılı
                      </Typography>
                    </Paper>
                  </Grid>
                </Grid>
              </Box>

              {/* 📝 İşlem Açıklaması */}
              <Box sx={{ p: 3, borderBottom: '1px solid #e5e7eb' }}>
                <Typography variant="h6" sx={{ fontWeight: 600, mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
                  📝 İşlem Açıklaması
                </Typography>
                <Paper sx={{ p: 2, backgroundColor: '#f8fafc', border: '1px solid #e5e7eb' }}>
                  <Typography variant="body1">
                    {selectedActivity.description || 'Bu işlem için açıklama bulunmuyor.'}
                  </Typography>
                </Paper>
              </Box>
              {/* 🔄 Değişiklik Detayları */}
              {selectedActivity.changes?.fields && selectedActivity.changes.fields.length > 0 && (
                <Box sx={{ p: 3 }}>
                  <Typography variant="h6" sx={{ fontWeight: 600, mb: 3, display: 'flex', alignItems: 'center', gap: 1 }}>
                    🔄 Değişiklik Detayları ({selectedActivity.changes.fields.length} Alan)
                  </Typography>
                  
                  <Grid container spacing={2}>
                    {selectedActivity.changes.fields.map((change, idx) => (
                      <Grid item xs={12} key={idx}>
                        <Paper sx={{ 
                          p: 3, 
                          border: '1px solid #e5e7eb',
                          borderRadius: 2,
                          '&:hover': { boxShadow: 2 },
                          transition: 'box-shadow 0.2s'
                        }}>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                            <Box sx={{ 
                              width: 8, 
                              height: 8, 
                              borderRadius: '50%', 
                              backgroundColor: getActivityColor(selectedActivity.action) 
                            }} />
                            <Typography variant="subtitle1" sx={{ fontWeight: 600, color: 'text.primary' }}>
                              {getFieldDisplayName(change.field)}
                            </Typography>
                            <Chip 
                              label={getCategoryFromField(change.field)} 
                              size="small" 
                              variant="outlined"
                              sx={{ ml: 'auto' }}
                            />
                          </Box>
                          
                          <Grid container spacing={2}>
                            <Grid item xs={12} md={5}>
                              <Box sx={{ 
                                p: 2, 
                                backgroundColor: '#fef2f2', 
                                borderRadius: 1,
                                border: '1px solid #fecaca'
                              }}>
                                <Typography variant="caption" sx={{ 
                                  color: '#dc2626', 
                                  fontWeight: 600,
                                  textTransform: 'uppercase',
                                  letterSpacing: 0.5
                                }}>
                                  ❌ Önceki Değer
                                </Typography>
                                <Typography variant="body1" sx={{ 
                                  mt: 1,
                                  fontFamily: 'monospace',
                                  color: '#991b1b',
                                  fontWeight: 500,
                                  wordBreak: 'break-word'
                                }}>
                                  {formatFieldValue(change.field, change.oldValue) || '(Boş)'}
                                </Typography>
                              </Box>
                            </Grid>
                            
                            <Grid item xs={12} md={2} sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                              <Box sx={{ 
                                display: 'flex', 
                                alignItems: 'center', 
                                justifyContent: 'center',
                                width: 40,
                                height: 40,
                                borderRadius: '50%',
                                backgroundColor: '#f3f4f6',
                                border: '2px solid #d1d5db'
                              }}>
                                <Typography sx={{ color: '#6b7280', fontWeight: 600, fontSize: '1.2rem' }}>→</Typography>
                              </Box>
                            </Grid>
                            
                            <Grid item xs={12} md={5}>
                              <Box sx={{ 
                                p: 2, 
                                backgroundColor: '#f0fdf4', 
                                borderRadius: 1,
                                border: '1px solid #bbf7d0'
                              }}>
                                <Typography variant="caption" sx={{ 
                                  color: '#059669', 
                                  fontWeight: 600,
                                  textTransform: 'uppercase',
                                  letterSpacing: 0.5
                                }}>
                                  ✅ Yeni Değer
                                </Typography>
                                <Typography variant="body1" sx={{ 
                                  mt: 1,
                                  fontFamily: 'monospace',
                                  color: '#065f46',
                                  fontWeight: 500,
                                  wordBreak: 'break-word'
                                }}>
                                  {formatFieldValue(change.field, change.newValue) || '(Boş)'}
                                </Typography>
                              </Box>
                            </Grid>
                          </Grid>
                        </Paper>
                      </Grid>
                    ))}
                  </Grid>
                </Box>
              )}

              {/* 🔍 Teknik Bilgiler */}
              {selectedActivity.metadata && (
                <Box sx={{ p: 3, backgroundColor: '#f8fafc', borderTop: '1px solid #e5e7eb' }}>
                  <Typography variant="h6" sx={{ fontWeight: 600, mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
                    🔍 Teknik Bilgiler
                  </Typography>
                  <Grid container spacing={2}>
                    <Grid item xs={12} md={6}>
                      <Paper sx={{ p: 2, backgroundColor: 'white', border: '1px solid #e5e7eb' }}>
                        <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>IP ADRESİ</Typography>
                        <Typography variant="body1" sx={{ fontFamily: 'monospace', mt: 0.5 }}>
                          {selectedActivity.metadata.ip || 'Bilinmiyor'}
                        </Typography>
                      </Paper>
                    </Grid>
                    <Grid item xs={12} md={6}>
                      <Paper sx={{ p: 2, backgroundColor: 'white', border: '1px solid #e5e7eb' }}>
                        <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>TARAYICI BİLGİSİ</Typography>
                        <Typography variant="body2" sx={{ mt: 0.5, wordBreak: 'break-word' }}>
                          {selectedActivity.metadata.userAgent || 'Bilinmiyor'}
                        </Typography>
                      </Paper>
                    </Grid>
                  </Grid>
                </Box>
              )}
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseActivityModal}>Kapat</Button>
        </DialogActions>
      </Dialog>

      {/* 📋 Tüm İşlemler Modal */}
      <Dialog 
        open={allActivitiesModalOpen} 
        onClose={handleCloseAllActivitiesModal}
        maxWidth="lg"
        fullWidth
      >
        <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          Tüm Belge İşlemleri ({activities.length})
          <IconButton onClick={handleCloseAllActivitiesModal}>
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        <DialogContent>
          {/* Filtreleme Butonları */}
          <Box sx={{ mb: 2, display: 'flex', gap: 1, flexWrap: 'wrap' }}>
            <Button 
              size="small" 
              variant={activityFilter === 'all' ? 'contained' : 'outlined'}
              onClick={() => setActivityFilter('all')}
            >
              Tümü ({activities.length})
            </Button>
            <Button 
              size="small" 
              variant={activityFilter === 'create' ? 'contained' : 'outlined'}
              onClick={() => setActivityFilter('create')}
            >
              Oluşturma ({activities.filter(a => a.action === 'create').length})
            </Button>
            <Button 
              size="small" 
              variant={activityFilter === 'update' ? 'contained' : 'outlined'}
              onClick={() => setActivityFilter('update')}
            >
              Güncelleme ({activities.filter(a => a.action === 'update').length})
            </Button>
            <Button 
              size="small" 
              variant={activityFilter === 'view' ? 'contained' : 'outlined'}
              onClick={() => setActivityFilter('view')}
            >
              Görüntüleme ({activities.filter(a => a.action === 'view').length})
            </Button>
            <Button 
              size="small" 
              variant={activityFilter === 'delete' ? 'contained' : 'outlined'}
              onClick={() => setActivityFilter('delete')}
            >
              Silme ({activities.filter(a => a.action === 'delete').length})
            </Button>
            <Button 
              size="small" 
              variant={activityFilter === 'export' ? 'contained' : 'outlined'}
              onClick={() => setActivityFilter('export')}
            >
              Dışa Aktarma ({activities.filter(a => a.action === 'export').length})
            </Button>
          </Box>
          
          {getFilteredActivities().length > 0 ? (
            <Stack spacing={1}>
              {getFilteredActivities().map((activity, index) => (
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
                  onClick={() => {
                    handleActivityClick(activity);
                    setAllActivitiesModalOpen(false);
                  }}
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
                      <Typography variant="caption" sx={{ 
                        color: 'text.secondary',
                        fontSize: '0.7rem',
                        display: 'block',
                        mb: 1
                      }}>
                        {activity.user?.name || 'Sistem'} ({activity.user?.role || 'sistem'})
                      </Typography>
                      {activity.changes?.fields && activity.changes.fields.length > 0 && (
                        <Box>
                          <span style={{
                            display: 'inline-block',
                            padding: '2px 6px',
                            backgroundColor: '#FEF3C7',
                            color: '#D97706',
                            fontSize: '0.65rem',
                            borderRadius: '4px',
                            height: '20px',
                            lineHeight: '16px',
                            marginBottom: '4px'
                          }}>
                            {activity.changes.fields.length} alan güncellendi
                          </span>
                          {activity.changes.fields.slice(0, 2).map((change, idx) => (
                            <Typography key={idx} variant="caption" sx={{ 
                              display: 'block',
                              color: 'text.secondary',
                              fontSize: '0.65rem',
                              lineHeight: 1.2,
                              mt: 0.3
                            }}>
                              <span style={{ fontWeight: 500 }}>{change.field}:</span> {change.oldValue || '-'} → {change.newValue || '-'}
                            </Typography>
                          ))}
                          {activity.changes.fields.length > 2 && (
                            <Typography variant="caption" sx={{ 
                              color: 'primary.main',
                              fontSize: '0.65rem',
                              fontStyle: 'italic',
                              display: 'block',
                              mt: 0.3
                            }}>
                              +{activity.changes.fields.length - 2} alan daha...
                            </Typography>
                          )}
                        </Box>
                      )}
                    </Box>
                  </Box>
                </Paper>
              ))}
            </Stack>
          ) : (
            <Box sx={{ textAlign: 'center', py: 3 }}>
              <Typography variant="body2" color="text.secondary">
                Bu filtrede işlem kaydı bulunmuyor
              </Typography>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseAllActivitiesModal}>Kapat</Button>
        </DialogActions>
      </Dialog>

      {/* 📝 Revizyon Ekleme Modal */}
      <Dialog 
        open={revizyonModalOpen} 
        onClose={() => setRevizyonModalOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle sx={{ 
          backgroundColor: '#f8fafc', 
          borderBottom: '1px solid #e5e7eb',
          display: 'flex',
          alignItems: 'center',
          gap: 2
        }}>
          <Avatar sx={{ 
            backgroundColor: '#059669',
            width: 40,
            height: 40
          }}>
            <AddIcon />
          </Avatar>
          <Box>
            <Typography variant="h6" sx={{ fontWeight: 600 }}>
              Yeni Revizyon Ekle
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {tesvik?.tesvikId} - {tesvik?.yatirimciUnvan}
            </Typography>
          </Box>
          <IconButton 
            onClick={() => setRevizyonModalOpen(false)}
            sx={{ ml: 'auto' }}
          >
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        
        <DialogContent sx={{ p: 3 }}>
          <Grid container spacing={3}>
            <Grid item xs={12}>
              <Alert severity="info" sx={{ mb: 2 }}>
                <Typography variant="body2">
                  Bu revizyon teşvik belgesinin geçmişine kaydedilecek ve Excel raporunda görünecektir.
                </Typography>
              </Alert>
            </Grid>
            
            <Grid item xs={12} md={6}>
              <Box>
                <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 600 }}>
                  Revizyon Sebebi *
                </Typography>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                  {[
                    'Red geldi - Ek belge istendi',
                    'Red geldi - Revizyon talep edildi', 
                    'Onay geldi',
                    'Belge tamamlandı',
                    'İptal edildi',
                    'Diğer'
                  ].map((sebep) => (
                    <Box 
                      key={sebep}
                      onClick={() => setRevizyonForm(prev => ({ ...prev, revizyonSebebi: sebep }))}
                      sx={{
                        p: 2,
                        border: revizyonForm.revizyonSebebi === sebep ? '2px solid #059669' : '1px solid #e5e7eb',
                        borderRadius: 1,
                        cursor: 'pointer',
                        backgroundColor: revizyonForm.revizyonSebebi === sebep ? '#f0fdf4' : 'white',
                        '&:hover': {
                          backgroundColor: revizyonForm.revizyonSebebi === sebep ? '#f0fdf4' : '#f8fafc'
                        }
                      }}
                    >
                      <Typography variant="body2" sx={{ 
                        fontWeight: revizyonForm.revizyonSebebi === sebep ? 600 : 400,
                        color: revizyonForm.revizyonSebebi === sebep ? '#059669' : 'text.primary'
                      }}>
                        {sebep}
                      </Typography>
                    </Box>
                  ))}
                </Box>
              </Box>
            </Grid>
            
            <Grid item xs={12} md={6}>
              <Box>
                <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 600 }}>
                  Yeni Durum
                </Typography>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                  {[
                    { value: 'reddedildi', label: 'Reddedildi', color: '#EF4444' },
                    { value: 'revize_talep_edildi', label: 'Revize Talep Edildi', color: '#F59E0B' },
                    { value: 'ek_belge_istendi', label: 'Ek Belge İstendi', color: '#F97316' },
                    { value: 'inceleniyor', label: 'İnceleniyor', color: '#3B82F6' },
                    { value: 'onaylandi', label: 'Onaylandı', color: '#10B981' },
                    { value: 'iptal_edildi', label: 'İptal Edildi', color: '#6B7280' }
                  ].map((durum) => (
                    <Box 
                      key={durum.value}
                      onClick={() => setRevizyonForm(prev => ({ ...prev, yeniDurum: durum.value }))}
                      sx={{
                        p: 2,
                        border: revizyonForm.yeniDurum === durum.value ? `2px solid ${durum.color}` : '1px solid #e5e7eb',
                        borderRadius: 1,
                        cursor: 'pointer',
                        backgroundColor: revizyonForm.yeniDurum === durum.value ? `${durum.color}10` : 'white',
                        '&:hover': {
                          backgroundColor: revizyonForm.yeniDurum === durum.value ? `${durum.color}20` : '#f8fafc'
                        }
                      }}
                    >
                      <Typography variant="body2" sx={{ 
                        fontWeight: revizyonForm.yeniDurum === durum.value ? 600 : 400,
                        color: revizyonForm.yeniDurum === durum.value ? durum.color : 'text.primary'
                      }}>
                        {durum.label}
                      </Typography>
                    </Box>
                  ))}
                </Box>
              </Box>
            </Grid>
            
            <Grid item xs={12}>
              <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 600 }}>
                Açıklama / Not
              </Typography>
              <textarea
                placeholder="Bu revizyon hakkında detaylı açıklama yazabilirsiniz..."
                value={revizyonForm.kullaniciNotu}
                onChange={(e) => setRevizyonForm(prev => ({ ...prev, kullaniciNotu: e.target.value }))}
                style={{
                  width: '100%',
                  minHeight: '100px',
                  padding: '12px',
                  border: '1px solid #e5e7eb',
                  borderRadius: '8px',
                  fontSize: '14px',
                  fontFamily: 'inherit',
                  resize: 'vertical'
                }}
              />
            </Grid>
          </Grid>
        </DialogContent>
        
        <DialogActions sx={{ p: 3, backgroundColor: '#f8fafc', borderTop: '1px solid #e5e7eb' }}>
          <Button 
            onClick={() => setRevizyonModalOpen(false)}
            variant="outlined"
          >
            İptal
          </Button>
          <Button 
            onClick={handleRevizyonEkle}
            variant="contained"
            disabled={!revizyonForm.revizyonSebebi}
            sx={{
              backgroundColor: '#059669',
              '&:hover': {
                backgroundColor: '#047857'
              }
            }}
          >
            Revizyon Ekle
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default TesvikDetail;