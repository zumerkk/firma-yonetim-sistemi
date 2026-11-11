// 🆕 YENİ TEŞVİK LIST - ENTERPRISE EDITION
// Excel benzeri liste görünümü + advanced filtering
// Renk kodlaması + bulk operations

import React, { useState, useEffect, useRef } from 'react';
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
  TableSortLabel,
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
  DialogContentText,
  ToggleButton,
  ToggleButtonGroup
} from '@mui/material';
import {
  Search as SearchIcon,
  Visibility as VisibilityIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  EmojiEvents as EmojiEventsIcon,
  Add as AddIcon,

  TableView as TableViewIcon,
  History as HistoryIcon,
  DoneAll as DoneAllIcon,
  Inventory2 as ArchiveIcon
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import Header from '../../components/Layout/Header';
import Sidebar from '../../components/Layout/Sidebar';
import { useAuth } from '../../contexts/AuthContext';
import useTesvikListeGorunumu from '../../hooks/useTesvikListeGorunumu';
import axios from '../../utils/axios';
import { BELGE_DURUM_SECENEKLERI } from '../../utils/belgeDurum';
import BelgeDurumSecici from '../../components/Tesvik/BelgeDurumSecici';

const YeniTesvikList = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  
  // 📊 State Management
  const [sidebarOpen, setSidebarOpen] = useState(false); // yalnız mobil çekmece
  const [isMobile, setIsMobile] = useState(window.innerWidth < 1024);
  const [loading, setLoading] = useState(true);
  const [islemYukleniyor, setIslemYukleniyor] = useState(false);
  const [error, setError] = useState(null);
  const [listeYenileme, setListeYenileme] = useState(0);
  const listeIstegi = useRef(0);
  const yukleniyor = loading || islemYukleniyor;
  const {
    filters, siralama, sayfa, anaAlanRef, tabloRef,
    filtreleriGuncelle, siralamayaGec, sayfayaGec, listedenGit
  } = useTesvikListeGorunumu(loading);
  
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
  
  // 📝 Revizyon İşlemleri
  const handleRevizyonClick = (tesvik) => {
    // Liste modali yerine detay sayfasına git ve revizyon modalini otomatik aç
    listedenGit(`/yeni-tesvik/${tesvik._id}?revizyon=1`);
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
        listedenGit(`/yeni-tesvik/${revizyonDialog.tesvik._id}/duzenle`);
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
  useEffect(() => {
    const istekNo = ++listeIstegi.current;
    const loadTesvikler = async () => {
      let sayfaDegisti = false;
      try {
        setLoading(true);
        setError(null);
        const params = new URLSearchParams({
          sayfa,
          limit: 20,
          siraBy: siralama.alan,
          siraSekli: siralama.yon,
          ...filters
        });

        const response = await axios.get(`/yeni-tesvik?${params}`);
        if (istekNo !== listeIstegi.current) return;

        if (response.data.success) {
          const sonSayfa = Math.max(1, response.data.data.pagination.totalPages);
          if (sayfa > sonSayfa) {
            sayfaDegisti = true;
            sayfayaGec(sonSayfa);
            return;
          }
          setTesvikler(response.data.data.tesvikler);
          setPagination(response.data.data.pagination);
        } else {
          setError('Teşvikler yüklenemedi');
        }
      } catch (error) {
        if (istekNo !== listeIstegi.current) return;
        console.error('🚨 Teşvik list hatası:', error);
        setError('Veriler yüklenirken hata oluştu');
      } finally {
        if (istekNo === listeIstegi.current && !sayfaDegisti) setLoading(false);
      }
    };
    loadTesvikler();
    return () => { listeIstegi.current += 1; };
  }, [filters, siralama, sayfa, listeYenileme, sayfayaGec]);

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
        setListeYenileme((sayi) => sayi + 1);
      }
    } catch (error) {
      console.error('🚨 Teşvik silme hatası:', error);
      setError(error.response?.data?.message || 'Teşvik silinirken hata oluştu');
      setDeleteDialog(prev => ({ ...prev, loading: false }));
    }
  };

  const handleFilterChange = (field, value) => {
    filtreleriGuncelle({ [field]: value });
  };

  const handlePageChange = (event, newPage) => {
    sayfayaGec(newPage);
  };

  // ✅ Taslak belgeleri toplu 'Onaylandı' yap
  // (müşteri: "'Tümünü onaylandı yap' sadece taslakları onaylandı yapsın" — kapandı/süreçteki belgelere dokunulmaz)
  const handleTumunuOnayla = async () => {
    if (!window.confirm('Sadece "Taslak" durumundaki belgeler "Onaylandı" yapılacak.\nKapanmış, iptal edilmiş ve süreçte olan belgelere dokunulmayacak.\n\nDevam edilsin mi?')) return;
    try {
      setIslemYukleniyor(true);
      const res = await axios.patch('/yeni-tesvik/bulk-durum', { tumu: true, yeniDurum: 'onaylandi', aciklama: 'Toplu onay' });
      if (res?.data?.success) {
        sayfayaGec(1);
        setListeYenileme((sayi) => sayi + 1);
        alert(res.data.message || 'Belgeler onaylandı.');
      }
    } catch (error) {
      console.error('Toplu onay hatası:', error);
      alert('Toplu onay başarısız: ' + (error.response?.data?.message || error.message));
    } finally {
      setIslemYukleniyor(false);
    }
  };

  // 🔧 YENİ EKLENDİ - Toplu Excel Export Handler
  const handleBulkExcelExport = async () => {
    try {
      setIslemYukleniyor(true);
      console.log('📊 Toplu Excel export başlatılıyor...');
      
      const response = await axios.get('/yeni-tesvik/bulk-excel-export', {
        responseType: 'blob',
        params: {
          durum: filters.durum,
          arsiv: filters.arsiv,
          il: filters.il,
          search: filters.search,
          siraBy: siralama.alan,
          siraSekli: siralama.yon
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
      setIslemYukleniyor(false);
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
        gridTemplateRows: 'auto 1fr',
        gridTemplateColumns: {
          xs: '1fr',
          lg: '1fr'
        },
        gridTemplateAreas: {
          xs: '"header" "content"',
          lg: '"header" "content"'
        },
        height: '100vh',
        backgroundColor: '#f8fafc'
      }}>
      {/* Header */}
      <Box sx={{ gridArea: 'header', zIndex: 1201 }}>
        <Header onSidebarToggle={() => setSidebarOpen(!sidebarOpen)} />
      </Box>

      {/* Menü masaüstünde Header'ın içinde (üst menü); mobilde çekmece */}

      {isMobile && (
        <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} variant="temporary" />
      )}

      {/* Main Content */}
      <Box component="main" ref={anaAlanRef} sx={{
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
                Bu sayfada yalnızca Yeni Teşvik sisteminde oluşturulan belgeler listelenir. {filters.arsiv === '1'
                  ? `Arşiv: ${pagination.totalCount} kapanan belge.`
                  : `Toplam ${pagination.totalCount} yeni kayıt (kapanan belgeler Arşiv'de).`}
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
            
            <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', justifyContent: 'flex-end', alignItems: 'center' }}>
              <ToggleButtonGroup
                size="small"
                exclusive
                value={filters.arsiv}
                onChange={(e, deger) => deger && filtreleriGuncelle({ arsiv: deger, durum: '' })}
                sx={{ '& .MuiToggleButton-root': { textTransform: 'none', px: 1.5, fontWeight: 600, color: '#475569' },
                  '& .Mui-selected': { color: '#fff !important', background: '#047857 !important' } }}
              >
                <ToggleButton value="0">Aktif Belgeler</ToggleButton>
                <ToggleButton value="1"><ArchiveIcon sx={{ fontSize: 18, mr: 0.5 }} />Arşiv</ToggleButton>
              </ToggleButtonGroup>
              <Button
                variant="outlined"
                startIcon={<DoneAllIcon />}
                onClick={handleTumunuOnayla}
                disabled={yukleniyor}
                sx={{
                  color: '#15803d',
                  borderColor: '#16a34a',
                  fontWeight: 600,
                  '&:hover': { backgroundColor: '#f0fdf4', borderColor: '#15803d' }
                }}
              >
                Taslakları Onaylandı Yap
              </Button>
              <Button
                variant="outlined"
                startIcon={<TableViewIcon />}
                onClick={handleBulkExcelExport}
                disabled={yukleniyor}
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
                onClick={() => listedenGit('/yeni-tesvik/yeni')}
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
                    placeholder="Belge No, Belge ID veya ünvan ara..."
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
                    {/* Seçenekler tek kaynaktan gelir (bkz. utils/belgeDurum) */}
                    <MenuItem key="empty-all" value="">Tümü</MenuItem>
                    {BELGE_DURUM_SECENEKLERI.map((o) => (
                      <MenuItem key={o.value} value={o.value}>{o.label}</MenuItem>
                    ))}
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
            <TableContainer component={Paper} ref={tabloRef}>
              <Table>
                <TableHead>
                  <TableRow>
                    {/* Müşteri: "Teşvik listesinde Belge görüntüleme işlemini en başa
                        alalım." Tablo 10 sütun ve yatay kayıyor; İşlemler en sağdayken
                        görüntüle düğmesine ulaşmak için kaydırmak gerekiyordu. */}
                    <TableCell>İşlemler</TableCell>
                    <TableCell>Belge No</TableCell>
                    <TableCell>Belge ID</TableCell>
                    <TableCell>Yatırımcı Ünvanı</TableCell>
                    <TableCell>Durum</TableCell>
                    <TableCell>İl</TableCell>
                    {[
                      ['belgeYonetimi.belgeBitisTarihi', 'Belge Bitiş Tarihi'],
                      ['belgeYonetimi.uzatimTarihi', 'Süre Uzatım Tarihi']
                    ].map(([alan, etiket]) => (
                      <TableCell key={alan} sortDirection={siralama.alan === alan ? siralama.yon : false}>
                        <TableSortLabel active={siralama.alan === alan} direction={siralama.alan === alan ? siralama.yon : 'asc'} onClick={() => siralamayaGec(alan)}>
                          {etiket}
                        </TableSortLabel>
                      </TableCell>
                    ))}
                    <TableCell>Oluşturan</TableCell>
                    <TableCell>Oluşturma Tarihi</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {yukleniyor ? (
                    Array.from({ length: 10 }).map((_, index) => (
                      <TableRow key={index}>
                        {Array.from({ length: 10 }).map((_, cellIndex) => (
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
                        // müşteri: "işlemin üstüne tıklayınca açılsın" — küçük ekranlarda düğme aramak zor
                        onClick={() => listedenGit(`/yeni-tesvik/${tesvik._id}`)}
                        sx={{ cursor: 'pointer', '&:hover': { backgroundColor: '#f8fafc' } }}
                      >
                        <TableCell>
                          {/* düğmeler satır tıklamasını tetiklemesin */}
                          <Box sx={{ display: 'flex', gap: 0.5 }} onClick={(e) => e.stopPropagation()}>
                            <Tooltip title="Görüntüle">
                              <IconButton 
                                size="small"
                                onClick={() => listedenGit(`/yeni-tesvik/${tesvik._id}`)}
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
                        <TableCell>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <Typography variant="body2" sx={{ fontWeight: 600 }}>
                              {tesvik.belgeYonetimi?.belgeNo || '-'}
                            </Typography>
                          </Box>
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
                          {/* Belgeye girmeden durum değişir (müşteri, 14.10.2026) */}
                          <BelgeDurumSecici
                            belgeId={tesvik._id}
                            sistem={'Yeni'}
                            durum={tesvik.durumBilgileri?.genelDurum}
                            onDegisti={() => setListeYenileme((sayi) => sayi + 1)}
                            onHata={(mesaj) => window.alert(`Durum güncellenemedi: ${mesaj}`)}
                          />
                        </TableCell>
                        
                        <TableCell>
                          <Typography variant="body2">
                            {tesvik.yatirimBilgileri?.yerinIl || '-'}
                          </Typography>
                        </TableCell>
                        
                        <TableCell sx={{ whiteSpace: 'nowrap' }}>{formatDate(tesvik.belgeYonetimi?.belgeBitisTarihi)}</TableCell>
                        <TableCell sx={{ whiteSpace: 'nowrap' }}>{formatDate(tesvik.belgeYonetimi?.uzatimTarihi)}</TableCell>
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
                        

                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={10}>
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
                  page={sayfa}
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
          <Box sx={{ p: 2, backgroundColor: '#f8fafc' }}>
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
                  'Talep Revize',
                  'Sonuç Revize',
                  'Resen Revize',
                  'Müşavir Revize'
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
