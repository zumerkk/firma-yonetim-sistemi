// 📊 Sidebar Component
// Ana uygulamanın yan menüsü

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
  Collapse
} from '@mui/material';
import {
  Dashboard as DashboardIcon,
  Business as BusinessIcon,
  Add as AddIcon,
  List as ListIcon,
  BarChart as StatsIcon,
  Settings as SettingsIcon,
  ExpandLess,
  ExpandMore
} from '@mui/icons-material';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';

const SIDEBAR_WIDTH = 240;

const Sidebar = ({ open, onClose }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const [firmaMenuOpen, setFirmaMenuOpen] = React.useState(true);

  // 🎯 Menü öğeleri
  const menuItems = [
    {
      text: 'Dashboard',
      icon: <DashboardIcon />,
      path: '/dashboard',
      color: '#1976d2'
    }
  ];

  // 🏢 Firma menü öğeleri
  const firmaMenuItems = [
    {
      text: 'Firma Listesi',
      icon: <ListIcon />,
      path: '/firmalar',
      color: '#2e7d32'
    },
    {
      text: 'Yeni Firma Ekle',
      icon: <AddIcon />,
      path: '/firmalar/yeni',
      color: '#ed6c02',
      permission: 'firmaEkle'
    }
  ];

  // Alt menü öğeleri
  const bottomMenuItems = [
    {
      text: 'İstatistikler',
      icon: <StatsIcon />,
      path: '/istatistikler',
      color: '#9c27b0'
    },
    {
      text: 'Ayarlar',
      icon: <SettingsIcon />,
      path: '/ayarlar',
      color: '#616161'
    }
  ];

  // 🚀 Sayfa navigasyonu
  const handleNavigation = (path) => {
    navigate(path);
    // Mobilde menüyü kapat
    if (window.innerWidth <= 768) {
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

  // 🎯 Menü öğesi render'ı
  const renderMenuItem = (item) => {
    if (!hasPermission(item.permission)) return null;

    return (
      <ListItem key={item.text} disablePadding>
        <ListItemButton
          onClick={() => handleNavigation(item.path)}
          sx={{
            mx: 1,
            my: 0.5,
            borderRadius: 2,
            backgroundColor: isActive(item.path) ? 'rgba(25, 118, 210, 0.08)' : 'transparent',
            border: isActive(item.path) ? '1px solid rgba(25, 118, 210, 0.2)' : '1px solid transparent',
            '&:hover': {
              backgroundColor: 'rgba(25, 118, 210, 0.04)',
            }
          }}
        >
          <ListItemIcon sx={{ 
            minWidth: 40,
            color: isActive(item.path) ? item.color : 'text.secondary'
          }}>
            {item.icon}
          </ListItemIcon>
          <ListItemText 
            primary={item.text}
            sx={{
              '& .MuiListItemText-primary': {
                fontSize: '0.875rem',
                fontWeight: isActive(item.path) ? 600 : 400,
                color: isActive(item.path) ? item.color : 'text.primary'
              }
            }}
          />
        </ListItemButton>
      </ListItem>
    );
  };

  const drawerContent = (
    <Box sx={{ overflow: 'auto', height: '100%', pt: 1 }}>
      {/* 🏠 Ana Menü */}
      <List>
        {menuItems.map(renderMenuItem)}
      </List>

      <Divider sx={{ mx: 2, my: 1 }} />

      {/* 🏢 Firma Yönetimi */}
      <List>
        <ListItem disablePadding>
          <ListItemButton
            onClick={() => setFirmaMenuOpen(!firmaMenuOpen)}
            sx={{
              mx: 1,
              borderRadius: 2,
              backgroundColor: 'rgba(46, 125, 50, 0.04)',
            }}
          >
            <ListItemIcon sx={{ minWidth: 40, color: '#2e7d32' }}>
              <BusinessIcon />
            </ListItemIcon>
            <ListItemText 
              primary="Firma Yönetimi"
              sx={{
                '& .MuiListItemText-primary': {
                  fontSize: '0.875rem',
                  fontWeight: 600,
                  color: '#2e7d32'
                }
              }}
            />
            {firmaMenuOpen ? <ExpandLess /> : <ExpandMore />}
          </ListItemButton>
        </ListItem>
        
        <Collapse in={firmaMenuOpen} timeout="auto" unmountOnExit>
          <List component="div" disablePadding sx={{ pl: 1 }}>
            {firmaMenuItems.map(renderMenuItem)}
          </List>
        </Collapse>
      </List>

      {/* 📊 Alt Menü */}
      <Box sx={{ flexGrow: 1 }} />
      <Divider sx={{ mx: 2, my: 1 }} />
      <List>
        {bottomMenuItems.map(renderMenuItem)}
      </List>

      {/* 👤 Kullanıcı Bilgisi (Alt) */}
      <Box sx={{ p: 2, mt: 'auto' }}>
        <Box sx={{ 
          backgroundColor: 'rgba(25, 118, 210, 0.04)',
          borderRadius: 2,
          p: 1.5,
          textAlign: 'center'
        }}>
          <Typography variant="caption" color="text.secondary">
            Giriş yapan:
          </Typography>
          <Typography variant="body2" sx={{ fontWeight: 600, color: 'primary.main' }}>
            {user?.adSoyad}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            {user?.rolAciklama || user?.rol}
          </Typography>
        </Box>
      </Box>
    </Box>
  );

  return (
    <>
      {/* 🖥️ Desktop Drawer */}
      <Drawer
        variant="persistent"
        anchor="left"
        open={open}
        sx={{
          display: { xs: 'none', md: 'block' },
          width: open ? SIDEBAR_WIDTH : 0,
          flexShrink: 0,
          '& .MuiDrawer-paper': {
            width: SIDEBAR_WIDTH,
            boxSizing: 'border-box',
            top: 64, // Header yüksekliği
            height: 'calc(100vh - 64px)',
            borderRight: '1px solid #e2e8f0',
            backgroundColor: '#ffffff',
            position: 'fixed', // Fixed position for perfect scroll
            zIndex: 1200, // Below header
            overflowY: 'auto', // Sidebar'ın kendi scroll'u
          },
        }}
      >
        {drawerContent}
      </Drawer>

      {/* 📱 Mobile Drawer */}
      <Drawer
        variant="temporary"
        anchor="left"
        open={open}
        onClose={onClose}
        sx={{
          display: { xs: 'block', md: 'none' },
          '& .MuiDrawer-paper': {
            width: SIDEBAR_WIDTH,
            boxSizing: 'border-box',
            top: 64, // Header yüksekliği
            height: 'calc(100vh - 64px)',
            borderRight: '1px solid #e0e0e0',
            backgroundColor: '#fafafa'
          },
        }}
      >
        {drawerContent}
      </Drawer>
    </>
  );
};

export default Sidebar; 