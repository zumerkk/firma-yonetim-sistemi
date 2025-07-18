// 📊 Sidebar Component - Corporate Excellence Edition
// Ana uygulamanın yan menüsü - Professional muted design

import React from 'react';
import {
  Drawer,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Typography,
  Box,
  Divider,
  Collapse,
  Avatar,
  Chip
} from '@mui/material';
import {
  Dashboard as DashboardIcon,
  Business as BusinessIcon,
  Add as AddIcon,
  List as ListIcon,
  Settings as SettingsIcon,
  ExpandLess,
  ExpandMore,
  TrendingUp as TrendingUpIcon,
  Assessment as AssessmentIcon
} from '@mui/icons-material';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';

const SIDEBAR_WIDTH = 280;

const Sidebar = ({ open, onClose, variant = 'persistent' }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const [firmaMenuOpen, setFirmaMenuOpen] = React.useState(true);

  // 🎯 Corporate Professional Menu Items
  const menuItems = [
    {
      text: 'Dashboard',
      icon: <DashboardIcon />,
      path: '/dashboard',
      color: '#1e40af',
      gradient: 'linear-gradient(135deg, #1e3a8a, #1e40af)',
      description: 'Ana kontrol paneli'
    }
  ];

  // 🏢 Corporate Firma Menu Items
  const firmaMenuItems = [
    {
      text: 'Firma Listesi',
      icon: <ListIcon />,
      path: '/firmalar',
      color: '#059669',
      gradient: 'linear-gradient(135deg, #064e3b, #059669)',
      description: 'Tüm firmaları görüntüle'
    },
    {
      text: 'Yeni Firma Ekle',
      icon: <AddIcon />,
      path: '/firmalar/yeni',
      color: '#a16207',
      gradient: 'linear-gradient(135deg, #7c2d12, #a16207)',
      permission: 'firmaEkle',
      description: 'Yeni firma kaydı'
    }
  ];

  // Corporate Bottom Menu Items
  const bottomMenuItems = [
    {
      text: 'İstatistikler',
      icon: <AssessmentIcon />,
      path: '/istatistikler',
      color: '#7c3aed',
      gradient: 'linear-gradient(135deg, #581c87, #7c3aed)',
      description: 'Detaylı raporlar'
    },
    {
      text: 'Ayarlar',
      icon: <SettingsIcon />,
      path: '/ayarlar',
      color: '#64748b',
      gradient: 'linear-gradient(135deg, #475569, #64748b)',
      description: 'Sistem ayarları'
    }
  ];

  // 🚀 Sayfa navigasyonu
  const handleNavigation = (path) => {
    navigate(path);
    // Mobilde menüyü kapat
    if (variant === 'temporary') {
      onClose();
    }
  };

  // 🎨 Aktif sayfa kontrolü
  const isActive = (path) => {
    if (path === '/dashboard') {
      return location.pathname === '/' || location.pathname === '/dashboard';
    }
    return location.pathname.startsWith(path);
  };

  // 👀 Yetki kontrolü
  const hasPermission = (permission) => {
    if (!permission) return true;
    return user?.yetkiler?.[permission] || user?.rol === 'admin';
  };

  // 🎯 Corporate Menu Item Renderer - OPTIMIZED LAYOUT
  const renderMenuItem = (item) => {
    if (!hasPermission(item.permission)) return null;

    const active = isActive(item.path);

    return (
      <ListItem key={item.text} disablePadding sx={{ mb: 0.75, px: 2 }}>
        <ListItemButton
          onClick={() => handleNavigation(item.path)}
          sx={{
            borderRadius: 2,
            position: 'relative',
            overflow: 'hidden',
            background: active 
              ? 'rgba(255, 255, 255, 0.95)' 
              : 'transparent',
            backdropFilter: active ? 'blur(10px)' : 'none',
            border: active 
              ? '1px solid rgba(226, 232, 240, 0.8)' 
              : '1px solid transparent',
            boxShadow: active 
              ? '0 2px 8px rgba(0, 0, 0, 0.04)' 
              : 'none',
            transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
            py: 1.25,
            px: 1.5,
            minHeight: 56,
            '&:hover': {
              background: 'rgba(255, 255, 255, 0.95)',
              backdropFilter: 'blur(10px)',
              transform: 'translateX(2px)',
              boxShadow: '0 4px 12px rgba(0, 0, 0, 0.06)',
              border: '1px solid rgba(226, 232, 240, 0.8)',
            },
            '&::before': {
              content: '""',
              position: 'absolute',
              top: 0,
              left: 0,
              bottom: 0,
              width: active ? 3 : 0,
              background: item.gradient,
              transition: 'width 0.25s ease',
              borderRadius: '0 2px 2px 0'
            },
            '&:hover::before': {
              width: 3
            }
          }}
        >
          <ListItemIcon sx={{ 
            minWidth: 42,
            mr: 1
          }}>
            <Avatar sx={{
              width: 32,
              height: 32,
              background: active ? item.gradient : `${item.color}15`,
              color: active ? 'white' : item.color,
              transition: 'all 0.25s ease',
              boxShadow: active ? `0 2px 8px ${item.color}25` : 'none'
            }}>
              {React.cloneElement(item.icon, { sx: { fontSize: 16 } })}
            </Avatar>
          </ListItemIcon>
          <ListItemText 
            primary={
              <Typography variant="body2" sx={{
                fontSize: '0.875rem',
                fontWeight: active ? 600 : 500,
                color: active ? '#1e293b' : '#374151',
                transition: 'all 0.25s ease',
                lineHeight: 1.2
              }}>
                {item.text}
              </Typography>
            }
            secondary={
              <Typography variant="caption" sx={{
                fontSize: '0.7rem',
                color: '#64748b',
                mt: 0.25,
                lineHeight: 1.1
              }}>
                {item.description}
              </Typography>
            }
          />
          {active && (
            <Chip 
              label="●" 
              size="small"
              sx={{
                background: item.gradient,
                color: 'white',
                minWidth: 6,
                height: 6,
                fontSize: '0.4rem',
                borderRadius: '50%',
                '& .MuiChip-label': {
                  padding: 0
                }
              }}
            />
          )}
        </ListItemButton>
      </ListItem>
    );
  };

  const drawerContent = (
    <Box sx={{ 
      overflow: 'auto', 
      height: '100%', 
      pt: 1,
      background: 'rgba(255, 255, 255, 0.95)',
      backdropFilter: 'blur(16px) saturate(150%)',
      position: 'relative'
    }}>
      {/* Subtle background decoration */}
      <Box sx={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: `
          radial-gradient(circle at 20% 20%, rgba(30, 64, 175, 0.02) 0%, transparent 50%),
          radial-gradient(circle at 80% 80%, rgba(5, 150, 105, 0.015) 0%, transparent 50%)
        `,
        pointerEvents: 'none'
      }} />

      <Box sx={{ position: 'relative', zIndex: 1 }}>
        {/* 🏠 Corporate Main Menu */}
        <Box sx={{ mb: 1.5 }}>
          <Typography 
            variant="overline" 
            sx={{ 
              px: 3, 
              mb: 1,
              fontSize: '0.7rem',
              fontWeight: 700,
              color: '#64748b',
              letterSpacing: '0.08em',
              display: 'block'
            }}
          >
            Ana Menü
          </Typography>
          <List sx={{ px: 0, py: 0 }}>
            {menuItems.map(renderMenuItem)}
          </List>
        </Box>

        <Divider sx={{ 
          mx: 3, 
          my: 1.5,
          background: 'rgba(226, 232, 240, 0.5)',
          height: 1
        }} />

        {/* 🏢 Corporate Firma Management - OPTIMIZED */}
        <Box sx={{ mb: 1.5 }}>
          <Typography 
            variant="overline" 
            sx={{ 
              px: 3, 
              mb: 1,
              fontSize: '0.7rem',
              fontWeight: 700,
              color: '#64748b',
              letterSpacing: '0.08em',
              display: 'block'
            }}
          >
            Firma Yönetimi
          </Typography>
          <List sx={{ px: 0, py: 0 }}>
            <ListItem disablePadding sx={{ mb: 0.75, px: 2 }}>
              <ListItemButton
                onClick={() => setFirmaMenuOpen(!firmaMenuOpen)}
                sx={{
                  borderRadius: 2,
                  background: 'rgba(5, 150, 105, 0.05)',
                  backdropFilter: 'blur(8px)',
                  border: '1px solid rgba(5, 150, 105, 0.12)',
                  transition: 'all 0.25s ease',
                  py: 1.25,
                  px: 1.5,
                  minHeight: 56,
                  '&:hover': {
                    background: 'rgba(5, 150, 105, 0.08)',
                    transform: 'translateX(1px)',
                    boxShadow: '0 2px 8px rgba(5, 150, 105, 0.1)'
                  }
                }}
              >
                <ListItemIcon sx={{ minWidth: 42, mr: 1 }}>
                  <Avatar sx={{
                    width: 32,
                    height: 32,
                    background: 'linear-gradient(135deg, #064e3b, #059669)',
                    boxShadow: '0 2px 8px rgba(5, 150, 105, 0.15)'
                  }}>
                    <BusinessIcon sx={{ fontSize: 16, color: 'white' }} />
                  </Avatar>
                </ListItemIcon>
                <ListItemText 
                  primary={
                    <Typography variant="body2" sx={{
                      fontSize: '0.875rem',
                      fontWeight: 600,
                      color: '#1e293b',
                      lineHeight: 1.2
                    }}>
                      Firma Yönetimi
                    </Typography>
                  }
                  secondary={
                    <Typography variant="caption" sx={{
                      fontSize: '0.7rem',
                      color: '#64748b',
                      lineHeight: 1.1
                    }}>
                      Firma işlemleri
                    </Typography>
                  }
                />
                <Avatar sx={{
                  width: 18,
                  height: 18,
                  background: 'rgba(5, 150, 105, 0.12)',
                  color: '#059669'
                }}>
                  {firmaMenuOpen ? <ExpandLess sx={{ fontSize: 12 }} /> : <ExpandMore sx={{ fontSize: 12 }} />}
                </Avatar>
              </ListItemButton>
            </ListItem>
            
            <Collapse in={firmaMenuOpen} timeout="auto" unmountOnExit>
              <Box sx={{ pl: 1.5 }}>
                {firmaMenuItems.map(renderMenuItem)}
              </Box>
            </Collapse>
          </List>
        </Box>

        <Divider sx={{ 
          mx: 3, 
          my: 1.5,
          background: 'rgba(226, 232, 240, 0.5)',
          height: 1
        }} />

        {/* 📊 Corporate Reports & Settings */}
        <Box sx={{ mb: 2 }}>
          <Typography 
            variant="overline" 
            sx={{ 
              px: 3, 
              mb: 1,
              fontSize: '0.7rem',
              fontWeight: 700,
              color: '#64748b',
              letterSpacing: '0.08em',
              display: 'block'
            }}
          >
            Raporlar & Ayarlar
          </Typography>
          <List sx={{ px: 0, py: 0 }}>
            {bottomMenuItems.map(renderMenuItem)}
          </List>
        </Box>

        {/* 👤 Corporate User Info - OPTIMIZED SPACING */}
        <Box sx={{ mt: 'auto', p: 2 }}>
          <Box sx={{ 
            background: 'rgba(255, 255, 255, 0.9)',
            backdropFilter: 'blur(12px)',
            borderRadius: 2.5,
            p: 2,
            border: '1px solid rgba(226, 232, 240, 0.6)',
            boxShadow: '0 2px 12px rgba(0, 0, 0, 0.03)',
            position: 'relative',
            overflow: 'hidden'
          }}>
            {/* Corporate gradient accent */}
            <Box sx={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              height: 3,
              background: 'linear-gradient(90deg, #1e40af 0%, #059669 50%, #7c3aed 100%)'
            }} />
            
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 1.25, mt: 0.25 }}>
              <Avatar sx={{
                width: 38,
                height: 38,
                mr: 1.25,
                background: 'linear-gradient(135deg, #1e40af, #059669)',
                fontSize: '1rem',
                fontWeight: 600,
                boxShadow: '0 2px 8px rgba(30, 64, 175, 0.15)'
              }}>
                {user?.adSoyad?.charAt(0)}
              </Avatar>
              <Box sx={{ flex: 1 }}>
                <Typography 
                  variant="body2" 
                  sx={{ 
                    fontWeight: 600,
                    color: '#1e293b',
                    fontSize: '0.8rem',
                    mb: 0.25,
                    lineHeight: 1.2
                  }}
                >
                  {user?.adSoyad}
                </Typography>
                <Chip 
                  label={user?.rolAciklama || user?.rol}
                  size="small"
                  sx={{
                    background: 'linear-gradient(135deg, #1e40af, #059669)',
                    color: 'white',
                    fontWeight: 500,
                    fontSize: '0.65rem',
                    height: 16,
                    border: 'none'
                  }}
                />
              </Box>
            </Box>
            
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <Box sx={{
                  width: 5,
                  height: 5,
                  borderRadius: '50%',
                  background: '#059669',
                  mr: 0.5,
                  animation: 'pulse 2s ease-in-out infinite'
                }} />
                <Typography 
                  variant="caption" 
                  sx={{ 
                    color: '#059669',
                    fontWeight: 500,
                    fontSize: '0.65rem'
                  }}
                >
                  Çevrimiçi
                </Typography>
              </Box>
              <Chip 
                icon={<TrendingUpIcon sx={{ fontSize: 10 }} />}
                label="Corporate"
                size="small"
                sx={{
                  background: 'rgba(5, 150, 105, 0.08)',
                  color: '#064e3b',
                  fontWeight: 500,
                  fontSize: '0.6rem',
                  height: 18,
                  border: '1px solid rgba(5, 150, 105, 0.15)',
                  '& .MuiChip-icon': {
                    color: '#059669'
                  }
                }}
              />
            </Box>
          </Box>
        </Box>
      </Box>
    </Box>
  );

  // 🎯 GRID SYSTEM COMPATIBLE DRAWER CONFIGURATION
  if (variant === 'temporary') {
    return (
      <Drawer
        variant="temporary"
        anchor="left"
        open={open}
        onClose={onClose}
        ModalProps={{
          keepMounted: true, // Better mobile performance
        }}
        sx={{
          '& .MuiDrawer-paper': {
            width: SIDEBAR_WIDTH,
            boxSizing: 'border-box',
            top: 64, // Header height
            height: 'calc(100vh - 64px)',
            border: 'none',
            background: 'transparent',
            position: 'fixed',
            zIndex: 1300,
            overflowY: 'auto',
            overflowX: 'hidden',
            // Corporate scrollbar
            '&::-webkit-scrollbar': {
              width: '3px',
            },
            '&::-webkit-scrollbar-track': {
              background: 'transparent',
            },
            '&::-webkit-scrollbar-thumb': {
              background: 'rgba(30, 64, 175, 0.15)',
              borderRadius: '2px',
            },
            '&::-webkit-scrollbar-thumb:hover': {
              background: 'rgba(30, 64, 175, 0.25)',
            },
          },
        }}
      >
        {drawerContent}
      </Drawer>
    );
  }

  // PERSISTENT VARIANT - FOR GRID SYSTEM
  return (
    <Box
      sx={{
        width: '100%',
        height: '100%',
        position: 'relative',
        overflow: 'hidden',
        // Corporate scrollbar
        '&::-webkit-scrollbar': {
          width: '3px',
        },
        '&::-webkit-scrollbar-track': {
          background: 'transparent',
        },
        '&::-webkit-scrollbar-thumb': {
          background: 'rgba(30, 64, 175, 0.15)',
          borderRadius: '2px',
        },
        '&::-webkit-scrollbar-thumb:hover': {
          background: 'rgba(30, 64, 175, 0.25)',
        },
      }}
    >
      {drawerContent}
    </Box>
  );
};

export default Sidebar; 