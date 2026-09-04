// 📋 Son İşlemler Sayfası - Professional Activity Management
// Tüm firma işlemlerini profesyonel şekilde listeleyen sayfa

import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Grid,
  Button,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Chip,
  Paper,
  Alert,
  Snackbar,
  LinearProgress,
  Stack,
  Avatar,
  Pagination,
  Container
} from '@mui/material';
import {
  History as HistoryIcon,
  Business as BusinessIcon,
  Person as PersonIcon,
  Schedule as ScheduleIcon,
  Search as SearchIcon,
  Refresh as RefreshIcon,
  Sort as SortIcon,
  Info as InfoIcon
} from '@mui/icons-material';
// 🎯 Layout Components Import
import Header from '../../components/Layout/Header';
import Sidebar from '../../components/Layout/Sidebar';
import activityService from '../../services/activityService';
import { ThemeProvider } from '@mui/material/styles';
import { etuysTema } from '../../tasarim';

const ActivityList = () => {
  // 🎯 Layout State Management
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 1024);
  
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });
  
  // 🔍 Filtering & Pagination State  
  const [searchQuery, setSearchQuery] = useState('');
  const [filters, setFilters] = useState({
    kategori: '',
    aksiyon: '',
    tarih: '',
    kullanici: ''
  });
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    total: 0
  });
  
  // 📊 Filter Options - Dynamic from API
  const [filterOptions, setFilterOptions] = useState({
    categories: [],
    actions: [],
    users: []
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

  // 📢 Snackbar helper
  const showSnackbar = useCallback((message, severity = 'success') => {
    setSnackbar({ open: true, message, severity });
  }, []);

  const handleCloseSnackbar = useCallback(() => {
    setSnackbar(prev => ({ ...prev, open: false }));
  }, []);

  // 🔄 Load Activities with Filters
  const loadActivities = useCallback(async () => {
    setLoading(true);
    try {
      const params = {
        sayfa: pagination.page,
        limit: pagination.limit,
        ...filters
      };
      
      if (searchQuery.trim()) {
        params.arama = searchQuery.trim();
      }

      const result = await activityService.getActivities(params);
      
      if (result.success) {
        setActivities(result.data.activities || []);
        setPagination(prev => ({
          ...prev,
          total: result.data.toplam || 0
        }));
      } else {
        throw new Error(result.message || 'Aktiviteler yüklenemedi');
      }
      
      setError(null);
    } catch (error) {
      console.error('Activities load error:', error);
      setError(error.message);
      showSnackbar(error.message, 'error');
    } finally {
      setLoading(false);
    }
  }, [pagination.page, pagination.limit, filters, searchQuery, showSnackbar]);

  // 🎯 Load Filter Options
  const loadFilterOptions = useCallback(async () => {
    try {
      const result = await activityService.getFilterOptions();
      if (result.success) {
        setFilterOptions(result.data);
      }
    } catch (error) {
      console.error('Filter options load error:', error);
    }
  }, []);

  // 🚀 Load data on mount and filter changes
  useEffect(() => {
    loadActivities();
  }, [loadActivities]);

  useEffect(() => {
    loadFilterOptions();
  }, [loadFilterOptions]);

  // 🔍 Filter handlers
  const handleFilterChange = (newFilters) => {
    setFilters(newFilters);
    setPagination(prev => ({ ...prev, page: 1 })); // Reset to first page
  };

  const handleSearchChange = (event) => {
    setSearchQuery(event.target.value);
    setPagination(prev => ({ ...prev, page: 1 })); // Reset to first page
  };

  const handlePageChange = (event, value) => {
    setPagination(prev => ({ ...prev, page: value }));
  };

  // 🔤 Türkçe çeviriler
  const getCategoryLabel = (category) => {
    const labels = {
      'system': 'Sistem',
      'firma': 'Firma',
      'user': 'Kullanıcı',
      'tesvik': 'Teşvik',
      'auth': 'Kimlik Doğrulama',
      'certificate': 'Belge'
    };
    return labels[category] || category;
  };

  const getActionLabel = (action) => {
    const labels = {
      'create': 'Oluştur',
      'update': 'Güncelle', 
      'delete': 'Sil',
      'view': 'Görüntüle',
      'export': 'Dışa Aktar',
      'import': 'İçe Aktar',
      'generate': 'Oluştur',
      'restore': 'Geri Yükle'
    };
    return labels[action] || action;
  };

  const handleClearFilters = () => {
    setFilters({
      kategori: '',
      aksiyon: '',
      tarih: '',
      kullanici: ''
    });
    setSearchQuery('');
    setPagination(prev => ({ ...prev, page: 1 }));
  };

  // 🔍 Activity detail view
  const handleViewDetail = (activity) => {
    showSnackbar(`Aktivite detayı: ${activity.title}`, 'info');
  };

  return (
    // 📋 ETUYS teması — Paper/Card/tipografi temadan geliyor; içerik değişmedi.
    <ThemeProvider theme={etuysTema}>
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
          {/* 📱 Header */}
          <Box sx={{ mb: 4 }}>
            <Typography variant="h4" sx={{ fontWeight: 600, color: 'primary.main', mb: 1 }}>
              📋 Aktivite Geçmişi
                </Typography>
            <Typography variant="subtitle1" color="text.secondary">
              Sistem üzerindeki tüm işlemler ve değişiklikler
                </Typography>
              </Box>
              
          {/* 🔍 Search & Filters */}
          <Card sx={{ mb: 3 }}>
            <CardContent>
              <Grid container spacing={2}>
              <Grid item xs={12} md={3}>
                <TextField
                  fullWidth
                  size="small"
                    placeholder="Arama yapın..."
                  value={searchQuery}
                    onChange={handleSearchChange}
                  InputProps={{
                      startAdornment: <SearchIcon sx={{ mr: 1, color: 'text.secondary' }} />
                  }}
                />
              </Grid>
              
              <Grid item xs={12} md={2}>
                <FormControl fullWidth size="small">
                  <InputLabel>Kategori</InputLabel>
                  <Select
                    value={filters.kategori}
                    label="Kategori"
                    onChange={(e) => handleFilterChange({ ...filters, kategori: e.target.value })}
                  >
                    <MenuItem value="">Tümü</MenuItem>
                    {filterOptions.categories.map((cat) => (
                        <MenuItem key={cat} value={cat}>{getCategoryLabel(cat)}</MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              
              <Grid item xs={12} md={2}>
                <FormControl fullWidth size="small">
                  <InputLabel>İşlem</InputLabel>
                  <Select
                    value={filters.aksiyon}
                    label="İşlem"
                    onChange={(e) => handleFilterChange({ ...filters, aksiyon: e.target.value })}
                  >
                    <MenuItem value="">Tümü</MenuItem>
                    {filterOptions.actions.map((action) => (
                        <MenuItem key={action} value={action}>{getActionLabel(action)}</MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              
              <Grid item xs={12} md={3}>
                <Stack direction="row" spacing={1}>
                  <Button
                    variant="outlined"
                      startIcon={<RefreshIcon />}
                      onClick={loadActivities}
                      disabled={loading}
                    >
                      Yenile
                  </Button>
                  <Button
                    variant="outlined"
                      startIcon={<SortIcon />}
                      onClick={handleClearFilters}
                  >
                    Temizle
                  </Button>
                </Stack>
              </Grid>
            </Grid>
            </CardContent>
          </Card>

          {/* 📊 Activities List */}
          {loading ? (
            <Card>
              <CardContent>
                <LinearProgress sx={{ mb: 2 }} />
                <Typography variant="body2" color="text.secondary" textAlign="center">
                  Aktiviteler yükleniyor...
                </Typography>
              </CardContent>
            </Card>
          ) : error ? (
            <Alert severity="error" sx={{ mb: 3 }}>
              {error}
            </Alert>
          ) : activities.length > 0 ? (
            <>
              <Stack spacing={2}>
                {activities.map((activity, index) => (
                  <Card key={activity._id} sx={{ border: '1px solid rgba(25, 118, 210, 0.1)' }}>
                    <CardContent sx={{ py: 2 }}>
                      <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 2 }}>
                        <Avatar sx={{ bgcolor: 'primary.main', width: 40, height: 40 }}>
                          <HistoryIcon />
                        </Avatar>
                        
                        <Box sx={{ flex: 1 }}>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                            <Typography variant="h6" sx={{ fontSize: '1rem', fontWeight: 600 }}>
                              {activity.title || getActionLabel(activity.action)}
                      </Typography>
                      <Chip
                              label={getCategoryLabel(activity.category)} 
                        size="small"
                              color="primary" 
                              variant="outlined" 
                            />
                          </Box>
                          
                          <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                            {activity.description}
                          </Typography>
                          
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                              <ScheduleIcon sx={{ fontSize: 16, color: 'text.secondary' }} />
                              <Typography variant="caption" color="text.secondary">
                                {new Date(activity.createdAt).toLocaleString('tr-TR')}
                              </Typography>
                            </Box>
                            
                            {activity.user && (
                              <>
                                <Typography variant="caption" color="text.secondary">•</Typography>
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                  <PersonIcon sx={{ fontSize: 16, color: 'text.secondary' }} />
                                  <Typography variant="caption" color="text.secondary">
                                    {activity.user.name || activity.user.email}
                                  </Typography>
                                </Box>
                              </>
                            )}
                            
                            {activity.targetResource?.firmaId && (
                              <>
                                <Typography variant="caption" color="text.secondary">•</Typography>
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                  <BusinessIcon sx={{ fontSize: 16, color: 'text.secondary' }} />
                                  <Typography variant="caption" color="text.secondary">
                                    {activity.targetResource.name || activity.targetResource.firmaId}
                                  </Typography>
                                </Box>
                              </>
                            )}
                          </Box>
                        </Box>
                        
                        <Button
                          size="small"
                          variant="outlined"
                          onClick={() => handleViewDetail(activity)}
                          startIcon={<InfoIcon />}
                        >
                          Detay
                        </Button>
                      </Box>
                    </CardContent>
                  </Card>
                ))}
              </Stack>
              
              {/* 📄 Pagination */}
              <Box sx={{ display: 'flex', justifyContent: 'center', mt: 3 }}>
                <Pagination
                  count={Math.ceil(pagination.total / pagination.limit)}
                  page={pagination.page}
                  onChange={handlePageChange}
                  color="primary"
                  showFirstButton 
                  showLastButton
                />
                </Box>
            </>
          ) : (
            <Paper sx={{ p: 4, textAlign: 'center' }}>
              <HistoryIcon sx={{ fontSize: 48, color: 'grey.400', mb: 2 }} />
              <Typography variant="h6" color="text.secondary">
                Aktivite bulunamadı
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Arama kriterlerinizi değiştirmeyi deneyin
              </Typography>
            </Paper>
          )}

          {/* 📢 Snackbar */}
          <Snackbar
            open={snackbar.open}
            autoHideDuration={4000}
            onClose={handleCloseSnackbar}
            anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
          >
            <Alert 
              onClose={handleCloseSnackbar}
              severity={snackbar.severity}
              variant="filled"
              sx={{ width: '100%' }}
            >
              {snackbar.message}
            </Alert>
          </Snackbar>
        </Container>
      </Box>
    </Box>
    </ThemeProvider>
  );
};

export default ActivityList; 