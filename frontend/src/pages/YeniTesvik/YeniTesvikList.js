// 🆕 YENİ TEŞVİK LIST - ENTERPRISE EDITION
// Excel benzeri liste görünümü + advanced filtering
// Renk kodlaması + bulk operations

import React, { useState, useEffect } from 'react';
import {
  Box,
  Container,
  Typography,
  Card,
  CardContent,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  IconButton,
  TextField,
  MenuItem,
  Grid,
  Pagination,
  Alert,
  Skeleton,
  InputAdornment,
  Tooltip,
  Avatar,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  DialogContentText
} from '@mui/material';
import {
  Search as SearchIcon,
  Visibility as VisibilityIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  EmojiEvents as EmojiEventsIcon,
  Add as AddIcon,

  TableView as TableViewIcon,
  History as HistoryIcon
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import Header from '../../components/Layout/Header';
import Sidebar from '../../components/Layout/Sidebar';
import { useAuth } from '../../contexts/AuthContext';
import axios from '../../utils/axios';

const YeniTesvikList = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  
  // 📊 State Management
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 1024);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // 📋 Data States
  const [tesvikler, setTesvikler] = useState([]);
  const [pagination, setPagination] = useState({
    currentPage: 1,
    totalPages: 1,
    totalCount: 0
  });
  
  // 🗑️ Delete Dialog States
  const [deleteDialog, setDeleteDialog] = useState({
    open: false,
    tesvik: null,
    loading: false
  });

  // 📝 Revizyon Dialog States
  const [revizyonDialog, setRevizyonDialog] = useState({
    open: false,
    tesvik: null,
    loading: false,
    form: {
      revizyonSebebi: '',
      yeniDurum: '',
      kullaniciNotu: ''
    }
  });
  
  // 🔍 Filter States
  const [filters, setFilters] = useState({
    search: '',
    durum: '',
    il: ''
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

  // 📝 Revizyon İşlemleri
  const handleRevizyonClick = (tesvik) => {
    // Liste modali yerine detay sayfasına git ve revizyon modalini otomatik aç
    navigate(`/yeni-tesvik/${tesvik._id}?revizyon=1`);
  };

  const handleRevizyonClose = () => {
    setRevizyonDialog({
      open: false,
      tesvik: null,
      loading: false,
      form: {
        revizyonSebebi: '',
        yeniDurum: '',
        kullaniciNotu: ''
      }
    });
  };

  const handleRevizyonSubmit = async () => {
    try {
      setRevizyonDialog(prev => ({ ...prev, loading: true }));
      
      const response = await axios.post(`/yeni-tesvik/${revizyonDialog.tesvik._id}/revizyon`, {
        revizyonSebebi: revizyonDialog.form.revizyonSebebi,
        kullaniciNotu: revizyonDialog.form.kullaniciNotu
      });
      
      if (response.data.success) {
        // Başarılı mesajı
        alert('Revizyon başarıyla eklendi! Düzenleme sayfasına yönlendiriliyorsunuz...');
        
        // Dialog'u kapat
        handleRevizyonClose();
        
        // Düzenleme sayfasına yönlendir
        navigate(`/yeni-tesvik/${revizyonDialog.tesvik._id}/duzenle`);
      }
    } catch (error) {
      console.error('❌ Revizyon ekleme hatası:', error);
      alert('Revizyon eklenirken hata oluştu. Lütfen tekrar deneyin.');
    } finally {
      setRevizyonDialog(prev => ({ ...prev, loading: false }));
    }
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
  const loadTesvikler = async (page = 1) => {
    try {
      setLoading(true);
      
      const params = new URLSearchParams({
        sayfa: page,
        limit: 20,
        ...filters
      });

      const response = await axios.get(`/yeni-tesvik?${params}`);
      
      if (response.data.success) {
        setTesvikler(response.data.data.tesvikler);
        setPagination(response.data.data.pagination);
      } else {
        setError('Teşvikler yüklenemedi');
      }
    } catch (error) {
      console.error('🚨 Teşvik list hatası:', error);
      setError('Veriler yüklenirken hata oluştu');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTesvikler();
  }, [filters]); // eslint-disable-line react-hooks/exhaustive-deps

  // 🗑️ SİLME FONKSİYONLARI
  const handleDeleteClick = (tesvik) => {
    setDeleteDialog({
      open: true,
      tesvik: tesvik,
      loading: false
    });
  };

  const handleDeleteCancel = () => {
    setDeleteDialog({
      open: false,
      tesvik: null,
      loading: false
    });
  };

  const handleDeleteConfirm = async () => {
    if (!deleteDialog.tesvik) return;
    
    try {
      setDeleteDialog(prev => ({ ...prev, loading: true }));
      
      console.log('🗑️ Teşvik siliniyor:', deleteDialog.tesvik.tesvikId);
      
      const response = await axios.delete(`/yeni-tesvik/${deleteDialog.tesvik._id}`);
      
      if (response.data.success) {
        console.log('✅ Teşvik başarıyla silindi');
        
        // Success notification (isteğe bağlı)
        setError(null);
        
        // Dialog'u kapat
        handleDeleteCancel();
        
        // Listeyi yenile
        loadTesvikler(pagination.currentPage);
      }
    } catch (error) {
      console.error('🚨 Teşvik silme hatası:', error);
      setError(error.response?.data?.message || 'Teşvik silinirken hata oluştu');
      setDeleteDialog(prev => ({ ...prev, loading: false }));
    }
  };

  const handleFilterChange = (field, value) => {
    setFilters(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handlePageChange = (event, newPage) => {
    loadTesvikler(newPage);
  };

  // 🔧 YENİ EKLENDİ - Toplu Excel Export Handler
  const handleBulkExcelExport = async () => {
    try {
      setLoading(true);
      console.log('📊 Toplu Excel export başlatılıyor...');
      
      const response = await axios.get('/yeni-tesvik/bulk-excel-export', {
        responseType: 'blob',
        params: {
          durum: filters.durum,
          il: filters.il,
          search: filters.search
        }
      });
      
      // Dosya indirme
      const blob = new Blob([response.data], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      });
      
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `tesvikler_toplu_${new Date().toISOString().split('T')[0]}.xlsx`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      
      console.log('✅ Toplu Excel dosyası indirildi');
      
    } catch (error) {
      console.error('🚨 Toplu Excel export hatası:', error);
      setError('Excel çıktı alınırken hata oluştu: ' + (error.response?.data?.message || error.message || 'Bilinmeyen hata'));
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (date) => {
    if (!date) return '-';
    return new Date(date).toLocaleDateString('tr-TR');
  };

  return (
    <>
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
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
            <Box>
              <Typography variant="h4" sx={{ 
                fontWeight: 700,
                color: '#1f2937',
                mb: 1,
                display: 'flex',
                alignItems: 'center',
                gap: 2
              }}>
                <EmojiEventsIcon sx={{ fontSize: 32, color: '#dc2626' }} />
                Yeni Teşvik Listesi
                <Chip label="Yalnızca Yeni Kayıtlar" size="small" sx={{ bgcolor: '#ecfdf5', color: '#065f46', border: '1px solid #10b981' }} />
              </Typography>
              <Alert severity="info" sx={{ mt: 1 }}>
                Bu sayfada yalnızca Yeni Teşvik sisteminde oluşturulan belgeler listelenir. Toplam {pagination.totalCount} yeni kayıt.
              </Alert>
              <Box sx={{ mt: 1, display: 'flex', gap: 1 }}>
                <Button variant="contained" size="small" disabled sx={{ bgcolor: '#10b981', '&:hover': { bgcolor: '#059669' } }}>
                  Yeni Sistem
                </Button>
                <Button variant="outlined" size="small" onClick={() => navigate('/tesvik/liste')}>
                  Legacy Sistem
                </Button>
              </Box>
            </Box>
            
            <Box sx={{ display: 'flex', gap: 2 }}>
              <Button
                variant="outlined"
                startIcon={<TableViewIcon />}
                onClick={handleBulkExcelExport}
                disabled={loading}
                sx={{
                  color: '#16a34a',
                  borderColor: '#16a34a',
                  fontWeight: 600,
                  '&:hover': {
                    backgroundColor: '#f0fdf4',
                    borderColor: '#16a34a'
                  }
                }}
              >
                📊 Excel Export
              </Button>
              
              <Button
                variant="contained"
                startIcon={<AddIcon />}
                onClick={() => navigate('/yeni-tesvik/yeni')}
                sx={{
                  background: 'linear-gradient(135deg, #dc2626, #b91c1c)',
                  fontWeight: 600
                }}
              >
                Yeni Teşvik
              </Button>
            </Box>
          </Box>

          {error && (
            <Alert severity="error" sx={{ mb: 3 }}>
              {error}
            </Alert>
          )}

          {/* Filters */}
          <Card sx={{ mb: 3 }}>
            <CardContent>
              <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>
                Filtreler
              </Typography>
              
              <Grid container spacing={2}>
                <Grid item xs={12} md={4}>
                  <TextField
                    fullWidth
                    label="Arama"
                    value={filters.search}
                    onChange={(e) => handleFilterChange('search', e.target.value)}
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">
                          <SearchIcon />
                        </InputAdornment>
                      ),
                    }}
                    placeholder="Teşvik ID, GM ID veya ünvan ara..."
                  />
                </Grid>
                
                <Grid item xs={12} md={4}>
                  <TextField
                    fullWidth
                    select
                    label="Durum"
                    value={filters.durum}
                    onChange={(e) => handleFilterChange('durum', e.target.value)}
                  >
                    <MenuItem key="empty-all" value="">Tümü</MenuItem>
                    <MenuItem value="taslak">Taslak</MenuItem>
                    <MenuItem value="hazirlaniyor">Hazırlanıyor</MenuItem>
                    <MenuItem value="başvuru_yapildi">Başvuru Yapıldı</MenuItem>
                    <MenuItem value="inceleniyor">İnceleniyor</MenuItem>
                    <MenuItem value="onaylandi">Onaylandı</MenuItem>
                    <MenuItem value="reddedildi">Reddedildi</MenuItem>
                  </TextField>
                </Grid>
                
                <Grid item xs={12} md={4}>
                  <TextField
                    fullWidth
                    label="İl"
                    value={filters.il}
                    onChange={(e) => handleFilterChange('il', e.target.value)}
                    placeholder="İl adı girin..."
                  />
                </Grid>
              </Grid>
            </CardContent>
          </Card>

          {/* Table */}
          <Card>
            <TableContainer component={Paper}>
              <Table>
                <TableHead sx={{ backgroundColor: '#f8fafc' }}>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 600 }}>Teşvik ID</TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>GM ID</TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>Belge ID</TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>Yatırımcı Ünvanı</TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>Durum</TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>İl</TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>Oluşturan</TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>Oluşturma Tarihi</TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>İşlemler</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {loading ? (
                    Array.from({ length: 10 }).map((_, index) => (
                      <TableRow key={index}>
                        {Array.from({ length: 9 }).map((_, cellIndex) => (
                          <TableCell key={cellIndex}>
                            <Skeleton />
                          </TableCell>
                        ))}
                      </TableRow>
                    ))
                  ) : tesvikler.length > 0 ? (
                    tesvikler.map((tesvik) => (
                      <TableRow 
                        key={tesvik._id} 
                        hover 
                        sx={{ '&:hover': { backgroundColor: '#f8fafc' } }}
                      >
                        <TableCell>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <Avatar sx={{ 
                              width: 24, 
                              height: 24,
                              backgroundColor: getDurumColor(tesvik.durumBilgileri?.genelDurum),
                              fontSize: '0.7rem'
                            }}>
                              🏆
                            </Avatar>
                            <Typography variant="body2" sx={{ fontWeight: 600 }}>
                              {tesvik.tesvikId}
                            </Typography>
                          </Box>
                        </TableCell>
                        
                        <TableCell>
                          <Typography variant="body2">
                            {tesvik.gmId}
                          </Typography>
                        </TableCell>

                        <TableCell>
                          <Typography variant="body2" sx={{ fontWeight: 600 }}>
                            {tesvik.belgeYonetimi?.belgeId || '-'}
                          </Typography>
                        </TableCell>

                        <TableCell>
                          <Typography variant="body2" noWrap sx={{ maxWidth: 200 }}>
                            {tesvik.yatirimciUnvan}
                          </Typography>
                        </TableCell>
                        
                        <TableCell>
                          <Chip
                            label={tesvik.durumBilgileri?.genelDurum?.replace('_', ' ') || 'Bilinmeyen'}
                            size="small"
                            sx={{
                              backgroundColor: getDurumColor(tesvik.durumBilgileri?.genelDurum),
                              color: 'white',
                              fontSize: '0.75rem',
                              fontWeight: 600
                            }}
                          />
                        </TableCell>
                        
                        <TableCell>
                          <Typography variant="body2">
                            {tesvik.yatirimBilgileri?.yerinIl || '-'}
                          </Typography>
                        </TableCell>
                        
                        {/* 👤 Oluşturan Kullanıcı */}
                        <TableCell>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <Typography variant="body2" noWrap sx={{ maxWidth: 120 }}>
                              {tesvik.olusturanKullanici?.adSoyad || 'Bilinmiyor'}
                            </Typography>
                            {tesvik.olusturanKullanici?.rol && (
                              <Chip 
                                label={tesvik.olusturanKullanici.rol} 
                                size="small" 
                                variant="outlined"
                                sx={{ height: 16, fontSize: '0.6rem' }}
                              />
                            )}
                          </Box>
                        </TableCell>
                        
                        <TableCell>
                          <Typography variant="body2">
                            {formatDate(tesvik.createdAt)}
                          </Typography>
                        </TableCell>
                        
                        <TableCell>
                          <Box sx={{ display: 'flex', gap: 0.5 }}>
                            <Tooltip title="Görüntüle">
                              <IconButton 
                                size="small"
                                onClick={() => navigate(`/yeni-tesvik/${tesvik._id}`)}
                              >
                                <VisibilityIcon fontSize="small" />
                              </IconButton>
                            </Tooltip>
                            
                            {(user?.yetkiler?.belgeEkle || user?.yetkiler?.belgeDuzenle) && (
                              <Tooltip title="Revizyon Ekle / Düzenle">
                                <IconButton 
                                  size="small"
                                  onClick={() => handleRevizyonClick(tesvik)}
                                  sx={{ color: '#059669' }}
                                >
                                  <EditIcon fontSize="small" />
                                </IconButton>
                              </Tooltip>
                            )}
                            
                            {/* 🔧 Admin ve belgeSil yetkisi olan kullanıcılar görebilir */}
                            {(user?.rol === 'admin' || user?.yetkiler?.belgeSil) && (
                              <Tooltip title="Sil">
                                <IconButton 
                                  size="small"
                                  onClick={() => handleDeleteClick(tesvik)}
                                  sx={{ color: '#dc2626' }}
                                >
                                  <DeleteIcon fontSize="small" />
                                </IconButton>
                              </Tooltip>
                            )}
                          </Box>
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={9}>
                        <Alert severity="info">
                          Henüz teşvik kaydı bulunmuyor
                        </Alert>
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </TableContainer>

            {/* Pagination */}
            {pagination.totalPages > 1 && (
              <Box sx={{ display: 'flex', justifyContent: 'center', p: 2 }}>
                <Pagination
                  count={pagination.totalPages}
                  page={pagination.currentPage}
                  onChange={handlePageChange}
                  color="primary"
                />
              </Box>
            )}
          </Card>
        </Container>
      </Box>
    </Box>

    {/* 🗑️ SİLME ONAY DIALOG'U */}
    <Dialog
      open={deleteDialog.open}
      onClose={handleDeleteCancel}
      maxWidth="sm"
      fullWidth
    >
      <DialogTitle sx={{ color: '#dc2626', fontWeight: 600 }}>
        🗑️ Teşvik Sil
      </DialogTitle>
      <DialogContent>
        <DialogContentText sx={{ mb: 2 }}>
          Bu teşviki silmek istediğinizden emin misiniz?
        </DialogContentText>
        {deleteDialog.tesvik && (
          <Box sx={{ p: 2, backgroundColor: '#f8fafc', borderRadius: 1 }}>
            <Typography variant="body2" sx={{ fontWeight: 600, mb: 1 }}>
              📋 Silinecek Teşvik:
            </Typography>
            <Typography variant="body2">
              🆔 <strong>Teşvik ID:</strong> {deleteDialog.tesvik.tesvikId}
            </Typography>
            <Typography variant="body2">
              🏢 <strong>Ünvan:</strong> {deleteDialog.tesvik.yatirimciUnvan}
            </Typography>
            <Typography variant="body2">
              📍 <strong>İl:</strong> {deleteDialog.tesvik.yatirimBilgileri?.yerinIl || '-'}
            </Typography>
          </Box>
        )}
        <Alert severity="warning" sx={{ mt: 2 }}>
          ⚠️ Bu işlem geri alınamaz! Teşvik kalıcı olarak silinecektir.
        </Alert>
      </DialogContent>
      <DialogActions sx={{ p: 3 }}>
        <Button 
          onClick={handleDeleteCancel} 
          disabled={deleteDialog.loading}
          variant="outlined"
        >
          İptal
        </Button>
        <Button 
          onClick={handleDeleteConfirm} 
          disabled={deleteDialog.loading}
          variant="contained"
          color="error"
          sx={{ fontWeight: 600 }}
        >
          {deleteDialog.loading ? 'Siliniyor...' : 'Sil'}
        </Button>
      </DialogActions>
    </Dialog>

    {/* 📝 Revizyon Ekleme Modal */}
    <Dialog 
      open={revizyonDialog.open} 
      onClose={handleRevizyonClose}
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
          <HistoryIcon />
        </Avatar>
        <Box>
          <Typography variant="h6" sx={{ fontWeight: 600 }}>
            Revizyon Ekle
          </Typography>
          <Typography variant="caption" color="text.secondary">
            {revizyonDialog.tesvik?.tesvikId} - {revizyonDialog.tesvik?.yatirimciUnvan}
          </Typography>
        </Box>
      </DialogTitle>
      
      <DialogContent sx={{ p: 3 }}>
        <Grid container spacing={3}>
          <Grid item xs={12}>
            <Alert severity="info" sx={{ mb: 2 }}>
              <Typography variant="body2">
                Bu revizyon teşvik belgesinin geçmişine kaydedilecektir.
              </Typography>
            </Alert>
          </Grid>
          
          <Grid item xs={12}>
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
                  'Talep Revize',
                  'Sonuç Revize',
                  'Resen Revize',
                  'Müşavir Revize',
                  'Diğer'
                ].map((sebep) => (
                  <Box 
                    key={sebep}
                    onClick={() => setRevizyonDialog(prev => ({ 
                      ...prev, 
                      form: { ...prev.form, revizyonSebebi: sebep } 
                    }))}
                    sx={{
                      p: 2,
                      border: revizyonDialog.form.revizyonSebebi === sebep ? '2px solid #059669' : '1px solid #e5e7eb',
                      borderRadius: 1,
                      cursor: 'pointer',
                      backgroundColor: revizyonDialog.form.revizyonSebebi === sebep ? '#f0fdf4' : 'white',
                      '&:hover': {
                        backgroundColor: revizyonDialog.form.revizyonSebebi === sebep ? '#f0fdf4' : '#f8fafc'
                      }
                    }}
                  >
                    <Typography variant="body2" sx={{ 
                      fontWeight: revizyonDialog.form.revizyonSebebi === sebep ? 600 : 400,
                      color: revizyonDialog.form.revizyonSebebi === sebep ? '#059669' : 'text.primary'
                    }}>
                      {sebep}
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
              value={revizyonDialog.form.kullaniciNotu}
              onChange={(e) => setRevizyonDialog(prev => ({ 
                ...prev, 
                form: { ...prev.form, kullaniciNotu: e.target.value } 
              }))}
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
          onClick={handleRevizyonClose}
          variant="outlined"
          disabled={revizyonDialog.loading}
        >
          İptal
        </Button>
        <Button 
          onClick={handleRevizyonSubmit}
          variant="contained"
          disabled={!revizyonDialog.form.revizyonSebebi || revizyonDialog.loading}
          sx={{
            backgroundColor: '#059669',
            '&:hover': {
              backgroundColor: '#047857'
            }
          }}
        >
          {revizyonDialog.loading ? 'Kaydediliyor...' : 'Revizyon Ekle'}
        </Button>
      </DialogActions>
    </Dialog>
  </>
  );
};

export default YeniTesvikList;