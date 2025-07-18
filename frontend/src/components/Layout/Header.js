// 🔝 Header Component
// Ana uygulamanın üst bar'ı

import React, { useState } from 'react';
import {
  AppBar,
  Toolbar,
  Typography,
  IconButton,
  Box,
  Avatar,
  Menu,
  MenuItem,
  Badge,
  Tooltip,
  Divider
} from '@mui/material';
import {
  Menu as MenuIcon,
  Notifications as NotificationsIcon,
  AccountCircle as AccountCircleIcon,
  ExitToApp as LogoutIcon,
  Person as PersonIcon,
  Business as BusinessIcon
} from '@mui/icons-material';
import { useAuth } from '../../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';

const Header = ({ onSidebarToggle }) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [anchorEl, setAnchorEl] = useState(null);

  const handleMenuOpen = (event) => {
    setAnchorEl(event.currentTarget);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
  };

  const handleProfileClick = () => {
    handleMenuClose();
    navigate('/profil');
  };

  const handleLogout = () => {
    handleMenuClose();
    logout();
    navigate('/login');
  };

  return (
    <AppBar 
      position="fixed" 
      sx={{ 
        zIndex: (theme) => theme.zIndex.drawer + 1,
        backgroundColor: '#1976d2',
        boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
      }}
    >
      <Toolbar sx={{ justifyContent: 'space-between' }}>
        {/* 🍔 Sol Taraf - Menu ve Logo */}
        <Box sx={{ display: 'flex', alignItems: 'center' }}>
          <IconButton
            color="inherit"
            aria-label="toggle sidebar"
            onClick={onSidebarToggle}
            edge="start"
            sx={{ mr: 2 }}
          >
            <MenuIcon />
          </IconButton>
          
          <BusinessIcon sx={{ mr: 1, fontSize: 28 }} />
          <Typography variant="h6" component="div" sx={{ fontWeight: 600 }}>
            Firma Yönetim Sistemi
          </Typography>
        </Box>

        {/* 🎯 Sağ Taraf - Bildirimler ve Profil */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          {/* 🔔 Bildirimler */}
          <Tooltip title="Bildirimler">
            <IconButton color="inherit">
              <Badge badgeContent={3} color="error">
                <NotificationsIcon />
              </Badge>
            </IconButton>
          </Tooltip>

          {/* 👤 Kullanıcı Menüsü */}
          <Box sx={{ display: 'flex', alignItems: 'center', ml: 2 }}>
            <Box sx={{ display: { xs: 'none', sm: 'block' }, mr: 2 }}>
              <Typography variant="body2" color="inherit" sx={{ opacity: 0.9 }}>
                Hoş geldin,
              </Typography>
              <Typography variant="body1" color="inherit" sx={{ fontWeight: 500 }}>
                {user?.adSoyad || 'Kullanıcı'}
              </Typography>
            </Box>
            
            <Tooltip title="Hesap Menüsü">
              <IconButton
                color="inherit"
                onClick={handleMenuOpen}
                aria-label="account menu"
              >
                <Avatar 
                  sx={{ 
                    width: 36, 
                    height: 36,
                    backgroundColor: 'rgba(255,255,255,0.2)',
                    fontSize: '1rem'
                  }}
                >
                  {user?.adSoyad?.charAt(0) || <AccountCircleIcon />}
                </Avatar>
              </IconButton>
            </Tooltip>
          </Box>
        </Box>

        {/* 📱 Kullanıcı Dropdown Menüsü */}
        <Menu
          anchorEl={anchorEl}
          open={Boolean(anchorEl)}
          onClose={handleMenuClose}
          PaperProps={{
            sx: {
              mt: 1.5,
              minWidth: 200,
              borderRadius: 2,
              boxShadow: '0 4px 12px rgba(0,0,0,0.15)'
            }
          }}
          transformOrigin={{ horizontal: 'right', vertical: 'top' }}
          anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
        >
          {/* 👤 Kullanıcı Bilgileri */}
          <Box sx={{ px: 2, py: 1.5 }}>
            <Typography variant="subtitle2" color="text.primary" sx={{ fontWeight: 600 }}>
              {user?.adSoyad}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {user?.email}
            </Typography>
            <Typography variant="caption" color="primary" sx={{ 
              backgroundColor: 'primary.light', 
              color: 'primary.contrastText',
              px: 1,
              py: 0.25,
              borderRadius: 1,
              display: 'inline-block',
              mt: 0.5
            }}>
              {user?.rolAciklama || user?.rol}
            </Typography>
          </Box>
          
          <Divider />
          
          {/* 📋 Menü Öğeleri */}
          <MenuItem onClick={handleProfileClick}>
            <PersonIcon sx={{ mr: 2, color: 'text.secondary' }} />
            Profil Ayarları
          </MenuItem>
          
          <Divider />
          
          <MenuItem onClick={handleLogout} sx={{ color: 'error.main' }}>
            <LogoutIcon sx={{ mr: 2 }} />
            Çıkış Yap
          </MenuItem>
        </Menu>
      </Toolbar>
    </AppBar>
  );
};

export default Header; 