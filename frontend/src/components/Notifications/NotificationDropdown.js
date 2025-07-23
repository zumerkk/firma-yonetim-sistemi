// 🔔 NOTIFICATION DROPDOWN - ENTERPRISE EDITION
// Professional notification management interface with advanced features

import React, { useState, useEffect, useRef } from 'react';
import {
  Box,
  Typography,
  IconButton,
  Badge,
  Popover,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  ListItemSecondaryAction,
  Button,
  Chip,
  Divider,
  CircularProgress,
  MenuItem,
  Switch,
  FormControlLabel,
  TextField,
  InputAdornment,
  Tooltip,
  Card,
  CardContent,
  Stack,
  Collapse
} from '@mui/material';
import {
  Notifications as NotificationsIcon,
  CheckCircle as CheckCircleIcon,
  Info as InfoIcon,
  Warning as WarningIcon,
  Error as ErrorIcon,
  Settings as SettingsIcon,
  DoneAll as DoneAllIcon,
  Delete as DeleteIcon,
  Refresh as RefreshIcon,
  FilterList as FilterListIcon,
  Search as SearchIcon,
  Close as CloseIcon,
  Business as BusinessIcon,
  Person as PersonIcon,
  Security as SecurityIcon
} from '@mui/icons-material';
import { useNotifications } from '../../contexts/NotificationContext';

const NotificationDropdown = ({ sx = {} }) => {
  const {
    recentNotifications,
    unreadCount,
    loading,
    loadRecentNotifications,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    refreshUnreadCount,
    autoRefresh,
    setAutoRefresh,
    getTypeColor,
    formatRelativeTime
  } = useNotifications();

  // 🔧 Component State
  const [anchorEl, setAnchorEl] = useState(null);
  const [showFilters, setShowFilters] = useState(false);
  const [localLoading, setLocalLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [notifications, setNotifications] = useState([]);

  const dropdownRef = useRef(null);
  const open = Boolean(anchorEl);

  // 🎯 Initialize and filter notifications
  useEffect(() => {
    let filtered = recentNotifications || [];

    // Search filter
    if (searchQuery.trim()) {
      filtered = filtered.filter(n => 
        n.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        n.message.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // Type filter
    if (typeFilter !== 'all') {
      filtered = filtered.filter(n => n.type === typeFilter);
    }

    setNotifications(filtered);
  }, [recentNotifications, searchQuery, typeFilter]);

  // 🚀 Handle dropdown open
  const handleClick = async (event) => {
    setAnchorEl(event.currentTarget);
    if (!recentNotifications.length) {
      await loadRecentNotifications(10);
    }
  };

  // 🚪 Handle dropdown close
  const handleClose = () => {
    setAnchorEl(null);
    setShowFilters(false);
    setSearchQuery('');
    setTypeFilter('all');
  };

  // 📊 Get notification icon
  const getNotificationIcon = (type, category) => {
    const iconProps = { sx: { color: getTypeColor(type), fontSize: 20 } };
    
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

  // ✅ Handle mark as read
  const handleMarkAsRead = async (notificationId, event) => {
    event.stopPropagation();
    setLocalLoading(true);
    
    try {
      await markAsRead(notificationId);
      await refreshUnreadCount();
    } catch (error) {
      console.error('Mark as read error:', error);
    } finally {
      setLocalLoading(false);
    }
  };

  // ✅ Handle mark all as read
  const handleMarkAllAsRead = async () => {
    setLocalLoading(true);
    
    try {
      await markAllAsRead();
      await loadRecentNotifications(10);
    } catch (error) {
      console.error('Mark all as read error:', error);
    } finally {
      setLocalLoading(false);
    }
  };

  // 🗑️ Handle delete notification
  const handleDelete = async (notificationId, event) => {
    event.stopPropagation();
    setLocalLoading(true);
    
    try {
      await deleteNotification(notificationId);
      await loadRecentNotifications(10);
    } catch (error) {
      console.error('Delete notification error:', error);
    } finally {
      setLocalLoading(false);
    }
  };

  // 🔄 Handle refresh
  const handleRefresh = async () => {
    await Promise.all([
      loadRecentNotifications(10),
      refreshUnreadCount()
    ]);
  };

  // 📋 Tab content renderer
  const renderTabContent = () => {
    if (loading) {
      return (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
          <CircularProgress size={24} />
        </Box>
      );
    }

    if (notifications.length === 0) {
      return (
        <Box sx={{ textAlign: 'center', py: 4, px: 2 }}>
          <NotificationsIcon sx={{ fontSize: 48, color: 'text.secondary', mb: 2 }} />
          <Typography variant="body2" color="text.secondary">
            {searchQuery || typeFilter !== 'all' 
              ? 'Filtreye uygun bildirim bulunamadı' 
              : 'Henüz bildirim yok'
            }
          </Typography>
        </Box>
      );
    }

    return (
      <List sx={{ maxHeight: 400, overflow: 'auto' }}>
        {notifications.map((notification, index) => (
          <ListItem
            key={notification.id}
            sx={{
              cursor: 'pointer',
              borderRadius: 2,
              mb: 0.5,
              mx: 1,
              background: notification.isRead 
                ? 'transparent' 
                : 'rgba(59, 130, 246, 0.05)',
              border: notification.isRead 
                ? '1px solid transparent' 
                : '1px solid rgba(59, 130, 246, 0.1)',
              '&:hover': {
                background: 'rgba(59, 130, 246, 0.08)',
                transform: 'translateX(2px)'
              },
              transition: 'all 0.2s ease'
            }}
          >
            <ListItemIcon sx={{ minWidth: 36 }}>
              {getNotificationIcon(notification.type, notification.category)}
            </ListItemIcon>
            
            <ListItemText
              primary={
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Typography 
                    variant="body2" 
                    sx={{ 
                      fontWeight: notification.isRead ? 400 : 600,
                      fontSize: '0.875rem'
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
                    variant="caption" 
                    color="text.secondary"
                    sx={{ 
                      display: 'block',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                      maxWidth: 250
                    }}
                  >
                    {notification.message}
                  </Typography>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 0.5 }}>
                    <Typography variant="caption" color="text.secondary">
                      {formatRelativeTime(notification.createdAt)}
                    </Typography>
                    <Chip 
                      label={notification.type.toUpperCase()} 
                      size="small"
                      sx={{ 
                        height: 16,
                        fontSize: '0.65rem',
                        fontWeight: 600,
                        background: getTypeColor(notification.type) + '20',
                        color: getTypeColor(notification.type),
                        border: `1px solid ${getTypeColor(notification.type)}40`
                      }}
                    />
                  </Box>
                </Box>
              }
            />
            
            <ListItemSecondaryAction>
              <Box sx={{ display: 'flex', gap: 0.5 }}>
                {!notification.isRead && (
                  <Tooltip title="Okundu işaretle">
                    <IconButton 
                      size="small" 
                      onClick={(e) => handleMarkAsRead(notification.id, e)}
                      disabled={localLoading}
                    >
                      <CheckCircleIcon sx={{ fontSize: 16 }} />
                    </IconButton>
                  </Tooltip>
                )}
                <Tooltip title="Sil">
                  <IconButton 
                    size="small" 
                    onClick={(e) => handleDelete(notification.id, e)}
                    disabled={localLoading}
                  >
                    <DeleteIcon sx={{ fontSize: 16 }} />
                  </IconButton>
                </Tooltip>
              </Box>
            </ListItemSecondaryAction>
          </ListItem>
        ))}
      </List>
    );
  };

  return (
    <>
      {/* 🔔 Notification Button */}
      <Tooltip title="Bildirimler" arrow>
        <IconButton 
          onClick={handleClick}
          sx={{
            width: 48,
            height: 48,
            background: 'rgba(245, 158, 11, 0.1)',
            backdropFilter: 'blur(10px)',
            border: '1px solid rgba(245, 158, 11, 0.2)',
            color: '#f59e0b',
            transition: 'all 0.3s ease',
            '&:hover': {
              background: 'rgba(245, 158, 11, 0.2)',
              transform: 'scale(1.05)',
              boxShadow: '0 8px 25px rgba(245, 158, 11, 0.3)'
            },
            ...sx
          }}
        >
          <Badge 
            badgeContent={unreadCount} 
            sx={{
              '& .MuiBadge-badge': {
                background: 'linear-gradient(135deg, #ef4444, #f97316)',
                color: 'white',
                fontWeight: 700,
                fontSize: '0.75rem',
                boxShadow: '0 2px 8px rgba(239, 68, 68, 0.4)',
                animation: unreadCount > 0 ? 'pulse 2s infinite' : 'none'
              },
              '@keyframes pulse': {
                '0%': { transform: 'scale(1)' },
                '50%': { transform: 'scale(1.1)' },
                '100%': { transform: 'scale(1)' }
              }
            }}
          >
            <NotificationsIcon />
          </Badge>
        </IconButton>
      </Tooltip>

      {/* 📋 Notification Dropdown */}
      <Popover
        ref={dropdownRef}
        open={open}
        anchorEl={anchorEl}
        onClose={handleClose}
        anchorOrigin={{
          vertical: 'bottom',
          horizontal: 'right',
        }}
        transformOrigin={{
          vertical: 'top',
          horizontal: 'right',
        }}
        PaperProps={{
          elevation: 0,
          sx: {
            mt: 2,
            width: 420,
            maxWidth: '90vw',
            borderRadius: 3,
            background: 'rgba(255, 255, 255, 0.95)',
            backdropFilter: 'blur(20px) saturate(180%)',
            border: '1px solid rgba(255, 255, 255, 0.3)',
            boxShadow: '0 20px 60px rgba(0, 0, 0, 0.15)',
            overflow: 'hidden',
            '&::before': {
              content: '""',
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              height: 4,
              background: 'linear-gradient(90deg, #3b82f6 0%, #8b5cf6 50%, #ec4899 100%)'
            }
          }
        }}
      >
        {/* 🔝 Header */}
        <Box sx={{ p: 2, pb: 1 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
            <Typography variant="h6" sx={{ fontWeight: 700, fontSize: '1.1rem' }}>
              🔔 Bildirimler
            </Typography>
            <Box sx={{ display: 'flex', gap: 0.5 }}>
              <Tooltip title="Yenile">
                <IconButton size="small" onClick={handleRefresh} disabled={loading}>
                  <RefreshIcon sx={{ fontSize: 18 }} />
                </IconButton>
              </Tooltip>
              <Tooltip title="Filtreleri Göster/Gizle">
                <IconButton 
                  size="small" 
                  onClick={() => setShowFilters(!showFilters)}
                  sx={{ color: showFilters ? 'primary.main' : 'inherit' }}
                >
                  <FilterListIcon sx={{ fontSize: 18 }} />
                </IconButton>
              </Tooltip>
              <Tooltip title="Kapat">
                <IconButton size="small" onClick={handleClose}>
                  <CloseIcon sx={{ fontSize: 18 }} />
                </IconButton>
              </Tooltip>
            </Box>
          </Box>

          {/* 📊 Stats */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
            <Chip 
              label={`${unreadCount} Okunmamış`}
              size="small"
              color={unreadCount > 0 ? 'error' : 'default'}
              sx={{ fontWeight: 600 }}
            />
            <Chip 
              label={`${notifications.length} Toplam`}
              size="small"
              variant="outlined"
              sx={{ fontWeight: 600 }}
            />
          </Box>

          {/* 🔍 Filters */}
          <Collapse in={showFilters}>
            <Card sx={{ mb: 2, background: 'rgba(59, 130, 246, 0.05)' }}>
              <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
                <Stack spacing={2}>
                  <TextField
                    size="small"
                    placeholder="Bildirim ara..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">
                          <SearchIcon sx={{ fontSize: 18 }} />
                        </InputAdornment>
                      )
                    }}
                  />
                  <TextField
                    select
                    size="small"
                    label="Tip"
                    value={typeFilter}
                    onChange={(e) => setTypeFilter(e.target.value)}
                  >
                    <MenuItem value="all">Tümü</MenuItem>
                    <MenuItem value="success">✅ Başarılı</MenuItem>
                    <MenuItem value="info">ℹ️ Bilgi</MenuItem>
                    <MenuItem value="warning">⚠️ Uyarı</MenuItem>
                    <MenuItem value="error">❌ Hata</MenuItem>
                    <MenuItem value="system">⚙️ Sistem</MenuItem>
                  </TextField>
                </Stack>
              </CardContent>
            </Card>
          </Collapse>

          {/* 🎯 Action Buttons */}
          <Box sx={{ display: 'flex', gap: 1, mb: 1 }}>
            <Button
              size="small"
              startIcon={<DoneAllIcon />}
              onClick={handleMarkAllAsRead}
              disabled={localLoading || unreadCount === 0}
              sx={{ flex: 1, textTransform: 'none', fontWeight: 600 }}
            >
              Tümünü Okundu İşaretle
            </Button>
          </Box>

          {/* ⚙️ Settings */}
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <FormControlLabel
              control={
                <Switch
                  size="small"
                  checked={autoRefresh}
                  onChange={(e) => setAutoRefresh(e.target.checked)}
                />
              }
              label={
                <Typography variant="caption">
                  Otomatik Yenile
                </Typography>
              }
            />
            <Button
              size="small"
              onClick={() => {
                handleClose();
                // Navigate to full notifications page
                window.location.href = '/bildirimler';
              }}
              sx={{ textTransform: 'none', fontWeight: 600 }}
            >
              Tümünü Gör
            </Button>
          </Box>
        </Box>

        <Divider sx={{ background: 'linear-gradient(90deg, transparent, rgba(59, 130, 246, 0.2), transparent)' }} />

        {/* 📋 Notifications List */}
        <Box sx={{ maxHeight: 400, overflow: 'hidden' }}>
          {renderTabContent()}
        </Box>
      </Popover>
    </>
  );
};

export default NotificationDropdown; 