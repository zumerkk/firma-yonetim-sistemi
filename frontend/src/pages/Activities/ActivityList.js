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
  Pagination
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
import { useAuth } from '../../contexts/AuthContext';
import activityService from '../../services/activityService';

const ActivityList = () => {
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
    showSnackbar(`Aktivite detayı: ${activity.aksiyon}`, 'info');
  };

  return (
    <Box sx={{ 
      p: 3,
      background: 'linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)',
      minHeight: '100vh'
    }}>
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
                    <MenuItem key={cat} value={cat}>{cat}</MenuItem>
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
                    <MenuItem key={action} value={action}>{action}</MenuItem>
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
                          {activity.aksiyon}
                  </Typography>
                  <Chip
                          label={activity.kategori} 
                    size="small"
                          color="primary" 
                          variant="outlined" 
                        />
                      </Box>
                      
                      <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                        {activity.mesaj}
                      </Typography>
                      
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                          <ScheduleIcon sx={{ fontSize: 16, color: 'text.secondary' }} />
                          <Typography variant="caption" color="text.secondary">
                            {new Date(activity.createdAt).toLocaleString('tr-TR')}
                          </Typography>
                        </Box>
                        
                        {activity.kullanici && (
                          <>
                            <Typography variant="caption" color="text.secondary">•</Typography>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                              <PersonIcon sx={{ fontSize: 16, color: 'text.secondary' }} />
                              <Typography variant="caption" color="text.secondary">
                                {activity.kullanici.adSoyad || activity.kullanici.email}
                              </Typography>
                            </Box>
                          </>
                        )}
                        
                        {activity.firmaId && (
                          <>
                            <Typography variant="caption" color="text.secondary">•</Typography>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                              <BusinessIcon sx={{ fontSize: 16, color: 'text.secondary' }} />
                              <Typography variant="caption" color="text.secondary">
                                {activity.firmaId}
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
    </Box>
  );
};

export default ActivityList; 