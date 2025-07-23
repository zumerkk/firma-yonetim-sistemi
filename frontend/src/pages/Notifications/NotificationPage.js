// 🔔 NOTIFICATION PAGE - ENTERPRISE EDITION
// Full-featured notification management with advanced filtering and bulk operations

import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Grid,
  Button,
  IconButton,
  TextField,
  MenuItem,
  Chip,
  Avatar,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  ListItemSecondaryAction,
  Checkbox,
  FormControl,
  InputLabel,
  Select,
  InputAdornment,
  Pagination,
  Alert,
  Snackbar,
  CircularProgress,
  Tooltip,
  Paper,
  Stack,
  Switch,
  FormControlLabel,
  Collapse,
  Fab,
  Badge,
  Divider
} from '@mui/material';
import {
  Notifications as NotificationsIcon,
  CheckCircle as CheckCircleIcon,
  Info as InfoIcon,
  Warning as WarningIcon,
  Error as ErrorIcon,
  Settings as SettingsIcon,
  Search as SearchIcon,
  FilterList as FilterListIcon,
  Refresh as RefreshIcon,
  DoneAll as DoneAllIcon,
  Delete as DeleteIcon,
  Clear as ClearIcon,
  ExpandMore as ExpandMoreIcon,
  ExpandLess as ExpandLessIcon,
  Business as BusinessIcon,
  Person as PersonIcon,
  Security as SecurityIcon,
  Assessment as AssessmentIcon,
  Sort as SortIcon,
  ViewList as ViewListIcon,
  ViewModule as ViewModuleIcon
} from '@mui/icons-material';
import { useNotifications } from '../../contexts/NotificationContext';

const NotificationPage = () => {
  const {
    notifications,
    unreadCount,
    loading,
    pagination,
    filters,
    categories,
    types,
    priorities,
    loadNotifications,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    bulkDelete,
    updateFilters,
    resetFilters,
    refreshAll,
    autoRefresh,
    setAutoRefresh,
    getTypeColor,
    formatRelativeTime
  } = useNotifications();

  // 🔧 Local State
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedNotifications, setSelectedNotifications] = useState([]);
  const [showFilters, setShowFilters] = useState(false);
  const [viewMode, setViewMode] = useState('list'); // 'list' or 'card'
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });
  const [deleteDialog, setDeleteDialog] = useState({ open: false, type: 'single', id: null });

  // 🚀 Initialize page
  useEffect(() => {
    loadNotifications();
  }, [loadNotifications]);

  // 🔍 Search handler
  const handleSearch = useCallback(() => {
    updateFilters({ 
      ...filters,
      page: 1 // Reset to first page on search
    });
    loadNotifications();
  }, [filters, updateFilters, loadNotifications]);

  // 📋 Selection handlers
  const handleSelectAll = (checked) => {
    if (checked) {
      setSelectedNotifications(notifications.map(n => n.id));
    } else {
      setSelectedNotifications([]);
    }
  };

  const handleSelectNotification = (notificationId, checked) => {
    if (checked) {
      setSelectedNotifications(prev => [...prev, notificationId]);
    } else {
      setSelectedNotifications(prev => prev.filter(id => id !== notificationId));
    }
  };

  // ✅ Mark as read handlers
  const handleMarkAsRead = async (notificationId) => {
    try {
      await markAsRead(notificationId);
      showSnackbar('Bildirim okundu olarak işaretlendi');
    } catch (error) {
      showSnackbar('İşlem başarısız', 'error');
    }
  };

  const handleBulkMarkAsRead = async () => {
    try {
      if (selectedNotifications.length > 0) {
        // Selected notifications
        for (const id of selectedNotifications) {
          await markAsRead(id);
        }
        showSnackbar(`${selectedNotifications.length} bildirim okundu olarak işaretlendi`);
      } else {
        // All notifications
        await markAllAsRead();
        showSnackbar('Tüm bildirimler okundu olarak işaretlendi');
      }
      setSelectedNotifications([]);
    } catch (error) {
      showSnackbar('İşlem başarısız', 'error');
    }
  };

  // 🗑️ Delete handlers
  const handleDelete = async (notificationId) => {
    try {
      await deleteNotification(notificationId);
      showSnackbar('Bildirim silindi');
    } catch (error) {
      showSnackbar('Silme işlemi başarısız', 'error');
    }
  };

  const handleBulkDelete = async () => {
    try {
      if (selectedNotifications.length > 0) {
        await bulkDelete({ ids: selectedNotifications });
        showSnackbar(`${selectedNotifications.length} bildirim silindi`);
        setSelectedNotifications([]);
      }
    } catch (error) {
      showSnackbar('Toplu silme başarısız', 'error');
    }
  };

  // 📄 Pagination handler
  const handlePageChange = (event, page) => {
    updateFilters({ ...filters, page });
    loadNotifications();
  };

  // 📢 Snackbar helper
  const showSnackbar = (message, severity = 'success') => {
    setSnackbar({ open: true, message, severity });
  };

  // 🎨 Get notification icon
  const getNotificationIcon = (type, category) => {
    const iconProps = { sx: { color: getTypeColor(type), fontSize: 24 } };
    
    if (category === 'firma') return <BusinessIcon {...iconProps} />;
    if (category === 'user') return <PersonIcon {...iconProps} />;
    if (category === 'security') return <SecurityIcon {...iconProps} />;
    if (category === 'system') return <SettingsIcon {...iconProps} />;
    
    switch (type) {
      case 'success': return <CheckCircleIcon {...iconProps} />;
      case 'warning': return <WarningIcon {...iconProps} />;
      case 'error': return <ErrorIcon {...iconProps} />;
      default: return <InfoIcon {...iconProps} />;
    }
  };

  return (
    <Box sx={{ p: 3, maxWidth: 1200, mx: 'auto' }}>
      {/* 🔝 Header */}
      <Box sx={{ mb: 4 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Avatar sx={{ 
              background: 'linear-gradient(135deg, #f59e0b, #f97316)',
              width: 48,
              height: 48
            }}>
              <NotificationsIcon sx={{ fontSize: 28, color: 'white' }} />
            </Avatar>
            <Box>
              <Typography variant="h4" sx={{ fontWeight: 700, color: '#1e293b', mb: 0.5 }}>
                🔔 Bildirimler
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Bildirimlerinizi yönetin ve takip edin
              </Typography>
            </Box>
          </Box>
          
          <Box sx={{ display: 'flex', gap: 1 }}>
            <Badge badgeContent={unreadCount} color="error">
              <Chip 
                label={`${notifications.length} Toplam`}
                variant="outlined"
                sx={{ fontWeight: 600 }}
              />
            </Badge>
          </Box>
        </Box>

        {/* 📊 Stats Cards */}
        <Grid container spacing={2} sx={{ mb: 3 }}>
          <Grid item xs={12} sm={6} md={3}>
            <Card sx={{ background: 'linear-gradient(135deg, #3b82f6, #1e40af)', color: 'white' }}>
              <CardContent sx={{ p: 2 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <Box>
                    <Typography variant="h4" sx={{ fontWeight: 700 }}>
                      {notifications.length}
                    </Typography>
                    <Typography variant="body2" sx={{ opacity: 0.9 }}>
                      Toplam Bildirim
                    </Typography>
                  </Box>
                  <ViewListIcon sx={{ fontSize: 40, opacity: 0.8 }} />
                </Box>
              </CardContent>
            </Card>
          </Grid>
          
          <Grid item xs={12} sm={6} md={3}>
            <Card sx={{ background: 'linear-gradient(135deg, #ef4444, #dc2626)', color: 'white' }}>
              <CardContent sx={{ p: 2 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <Box>
                    <Typography variant="h4" sx={{ fontWeight: 700 }}>
                      {unreadCount}
                    </Typography>
                    <Typography variant="body2" sx={{ opacity: 0.9 }}>
                      Okunmamış
                    </Typography>
                  </Box>
                  <NotificationsIcon sx={{ fontSize: 40, opacity: 0.8 }} />
                </Box>
              </CardContent>
            </Card>
          </Grid>
          
          <Grid item xs={12} sm={6} md={3}>
            <Card sx={{ background: 'linear-gradient(135deg, #10b981, #059669)', color: 'white' }}>
              <CardContent sx={{ p: 2 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <Box>
                    <Typography variant="h4" sx={{ fontWeight: 700 }}>
                      {notifications.length - unreadCount}
                    </Typography>
                    <Typography variant="body2" sx={{ opacity: 0.9 }}>
                      Okunmuş
                    </Typography>
                  </Box>
                  <CheckCircleIcon sx={{ fontSize: 40, opacity: 0.8 }} />
                </Box>
              </CardContent>
            </Card>
          </Grid>
          
          <Grid item xs={12} sm={6} md={3}>
            <Card sx={{ background: 'linear-gradient(135deg, #8b5cf6, #7c3aed)', color: 'white' }}>
              <CardContent sx={{ p: 2 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <Box>
                    <Typography variant="h4" sx={{ fontWeight: 700 }}>
                      {selectedNotifications.length}
                    </Typography>
                    <Typography variant="body2" sx={{ opacity: 0.9 }}>
                      Seçili
                    </Typography>
                  </Box>
                  <DoneAllIcon sx={{ fontSize: 40, opacity: 0.8 }} />
                </Box>
              </CardContent>
            </Card>
          </Grid>
        </Grid>

        {/* 🎯 Action Bar */}
        <Paper sx={{ p: 2, mb: 3, border: '1px solid rgba(226, 232, 240, 0.5)' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 2 }}>
            {/* Search */}
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flex: 1, minWidth: 300 }}>
              <TextField
                size="small"
                placeholder="Bildirimlerimde ara..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <SearchIcon sx={{ fontSize: 20 }} />
                    </InputAdornment>
                  ),
                  endAdornment: searchQuery && (
                    <InputAdornment position="end">
                      <IconButton size="small" onClick={() => setSearchQuery('')}>
                        <ClearIcon sx={{ fontSize: 18 }} />
                      </IconButton>
                    </InputAdornment>
                  )
                }}
                sx={{ flex: 1, maxWidth: 400 }}
              />
              <Button
                variant="contained"
                onClick={handleSearch}
                startIcon={<SearchIcon />}
                sx={{ whiteSpace: 'nowrap' }}
              >
                Ara
              </Button>
            </Box>

            {/* Actions */}
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Tooltip title="Filtreleri Göster/Gizle">
                <IconButton
                  onClick={() => setShowFilters(!showFilters)}
                  color={showFilters ? 'primary' : 'default'}
                >
                  <FilterListIcon />
                </IconButton>
              </Tooltip>
              
              <Tooltip title="Görünüm Değiştir">
                <IconButton
                  onClick={() => setViewMode(viewMode === 'list' ? 'card' : 'list')}
                >
                  {viewMode === 'list' ? <ViewModuleIcon /> : <ViewListIcon />}
                </IconButton>
              </Tooltip>
              
              <Tooltip title="Yenile">
                <IconButton onClick={refreshAll} disabled={loading}>
                  <RefreshIcon />
                </IconButton>
              </Tooltip>
              
              {selectedNotifications.length > 0 && (
                <>
                  <Button
                    variant="outlined"
                    startIcon={<DoneAllIcon />}
                    onClick={handleBulkMarkAsRead}
                    size="small"
                  >
                    Okundu İşaretle
                  </Button>
                  <Button
                    variant="outlined"
                    color="error"
                    startIcon={<DeleteIcon />}
                    onClick={handleBulkDelete}
                    size="small"
                  >
                    Sil
                  </Button>
                </>
              )}
            </Box>
          </Box>

          {/* Auto-refresh */}
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mt: 2 }}>
            <FormControlLabel
              control={
                <Switch
                  checked={autoRefresh}
                  onChange={(e) => setAutoRefresh(e.target.checked)}
                  size="small"
                />
              }
              label={
                <Typography variant="body2">
                  Otomatik Yenileme (30s)
                </Typography>
              }
            />
            
            <Box sx={{ display: 'flex', gap: 1 }}>
              <Button
                variant="text"
                onClick={resetFilters}
                size="small"
                startIcon={<ClearIcon />}
              >
                Filtreleri Temizle
              </Button>
              <Button
                variant="outlined"
                onClick={handleBulkMarkAsRead}
                size="small"
                startIcon={<DoneAllIcon />}
                disabled={unreadCount === 0}
              >
                Tümünü Okundu İşaretle
              </Button>
            </Box>
          </Box>
        </Paper>

        {/* 🔍 Advanced Filters */}
        <Collapse in={showFilters}>
          <Paper sx={{ p: 3, mb: 3, background: 'rgba(59, 130, 246, 0.05)' }}>
            <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>
              🔍 Gelişmiş Filtreler
            </Typography>
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6} md={3}>
                <FormControl fullWidth size="small">
                  <InputLabel>Tip</InputLabel>
                  <Select
                    value={filters.type || ''}
                    onChange={(e) => updateFilters({ ...filters, type: e.target.value || null })}
                    label="Tip"
                  >
                    <MenuItem value="">Tümü</MenuItem>
                    {types.map(type => (
                      <MenuItem key={type.value} value={type.value}>
                        {type.label}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              
              <Grid item xs={12} sm={6} md={3}>
                <FormControl fullWidth size="small">
                  <InputLabel>Kategori</InputLabel>
                  <Select
                    value={filters.category || ''}
                    onChange={(e) => updateFilters({ ...filters, category: e.target.value || null })}
                    label="Kategori"
                  >
                    <MenuItem value="">Tümü</MenuItem>
                    {categories.map(category => (
                      <MenuItem key={category.value} value={category.value}>
                        {category.label}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              
              <Grid item xs={12} sm={6} md={3}>
                <FormControl fullWidth size="small">
                  <InputLabel>Durum</InputLabel>
                  <Select
                    value={filters.isRead?.toString() || ''}
                    onChange={(e) => updateFilters({ 
                      ...filters, 
                      isRead: e.target.value === '' ? null : e.target.value === 'true' 
                    })}
                    label="Durum"
                  >
                    <MenuItem value="">Tümü</MenuItem>
                    <MenuItem value="false">Okunmamış</MenuItem>
                    <MenuItem value="true">Okunmuş</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              
              <Grid item xs={12} sm={6} md={3}>
                <FormControl fullWidth size="small">
                  <InputLabel>Öncelik</InputLabel>
                  <Select
                    value={filters.priority || ''}
                    onChange={(e) => updateFilters({ ...filters, priority: e.target.value || null })}
                    label="Öncelik"
                  >
                    <MenuItem value="">Tümü</MenuItem>
                    {priorities.map(priority => (
                      <MenuItem key={priority.value} value={priority.value}>
                        {priority.label}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
            </Grid>
          </Paper>
        </Collapse>
      </Box>

      {/* 📋 Notifications List */}
      <Card sx={{ minHeight: 400 }}>
        <CardContent sx={{ p: 0 }}>
          {loading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
              <CircularProgress />
            </Box>
          ) : notifications.length === 0 ? (
            <Box sx={{ textAlign: 'center', py: 8 }}>
              <NotificationsIcon sx={{ fontSize: 80, color: 'text.secondary', mb: 2 }} />
              <Typography variant="h6" color="text.secondary" sx={{ mb: 1 }}>
                Bildirim bulunamadı
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {searchQuery || Object.values(filters).some(f => f) 
                  ? 'Arama kriterlerinize uygun bildirim yok' 
                  : 'Henüz hiç bildiriminiz yok'
                }
              </Typography>
            </Box>
          ) : (
            <>
              {/* Select All */}
              <Box sx={{ p: 2, borderBottom: '1px solid rgba(0,0,0,0.1)' }}>
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={selectedNotifications.length === notifications.length}
                      indeterminate={selectedNotifications.length > 0 && selectedNotifications.length < notifications.length}
                      onChange={(e) => handleSelectAll(e.target.checked)}
                    />
                  }
                  label={
                    <Typography variant="body2">
                      {selectedNotifications.length > 0 
                        ? `${selectedNotifications.length} bildirim seçili` 
                        : 'Tümünü Seç'
                      }
                    </Typography>
                  }
                />
              </Box>

              {/* Notifications */}
              <List sx={{ p: 0 }}>
                {notifications.map((notification, index) => (
                  <ListItem
                    key={notification.id}
                    sx={{
                      borderBottom: index < notifications.length - 1 ? '1px solid rgba(0,0,0,0.05)' : 'none',
                      background: notification.isRead ? 'transparent' : 'rgba(59, 130, 246, 0.02)',
                      '&:hover': {
                        background: 'rgba(59, 130, 246, 0.05)'
                      },
                      py: 2
                    }}
                  >
                    <Checkbox
                      checked={selectedNotifications.includes(notification.id)}
                      onChange={(e) => handleSelectNotification(notification.id, e.target.checked)}
                      sx={{ mr: 1 }}
                    />
                    
                    <ListItemIcon>
                      {getNotificationIcon(notification.type, notification.category)}
                    </ListItemIcon>
                    
                    <ListItemText
                      primary={
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                          <Typography 
                            variant="subtitle1" 
                            sx={{ 
                              fontWeight: notification.isRead ? 400 : 600,
                              flex: 1
                            }}
                          >
                            {notification.title}
                          </Typography>
                          {!notification.isRead && (
                            <Box 
                              sx={{ 
                                width: 8, 
                                height: 8, 
                                borderRadius: '50%', 
                                background: '#3b82f6' 
                              }} 
                            />
                          )}
                        </Box>
                      }
                      secondary={
                        <Box>
                          <Typography 
                            variant="body2" 
                            color="text.secondary" 
                            sx={{ mb: 1 }}
                          >
                            {notification.message}
                          </Typography>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
                            <Chip 
                              label={notification.type.toUpperCase()} 
                              size="small"
                              sx={{ 
                                height: 20,
                                fontSize: '0.7rem',
                                fontWeight: 600,
                                background: getTypeColor(notification.type) + '20',
                                color: getTypeColor(notification.type),
                                border: `1px solid ${getTypeColor(notification.type)}40`
                              }}
                            />
                            <Typography variant="caption" color="text.secondary">
                              {formatRelativeTime(notification.createdAt)}
                            </Typography>
                          </Box>
                        </Box>
                      }
                    />
                    
                    <ListItemSecondaryAction>
                      <Box sx={{ display: 'flex', gap: 0.5 }}>
                        {!notification.isRead && (
                          <Tooltip title="Okundu İşaretle">
                            <IconButton 
                              size="small" 
                              onClick={() => handleMarkAsRead(notification.id)}
                              color="primary"
                            >
                              <CheckCircleIcon />
                            </IconButton>
                          </Tooltip>
                        )}
                        <Tooltip title="Sil">
                          <IconButton 
                            size="small" 
                            onClick={() => handleDelete(notification.id)}
                            color="error"
                          >
                            <DeleteIcon />
                          </IconButton>
                        </Tooltip>
                      </Box>
                    </ListItemSecondaryAction>
                  </ListItem>
                ))}
              </List>
            </>
          )}
        </CardContent>
      </Card>

      {/* 📄 Pagination */}
      {pagination.totalPages > 1 && (
        <Box sx={{ display: 'flex', justifyContent: 'center', mt: 3 }}>
          <Pagination
            count={pagination.totalPages}
            page={pagination.currentPage}
            onChange={handlePageChange}
            color="primary"
            size="large"
            showFirstButton
            showLastButton
          />
        </Box>
      )}

      {/* 📢 Snackbar */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={4000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert
          onClose={() => setSnackbar({ ...snackbar, open: false })}
          severity={snackbar.severity}
          variant="filled"
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default NotificationPage; 