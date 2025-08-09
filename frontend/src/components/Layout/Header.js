// 🔝 Header Component - Enhanced Professional Edition
// Ana uygulamanın üst bar'ı - Modern glassmorphism design

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
  Tooltip,
  Divider,
  Chip
} from '@mui/material';
import {
  Menu as MenuIcon,
  AccountCircle as AccountCircleIcon,
  ExitToApp as LogoutIcon,
  Person as PersonIcon,
  // Business as BusinessIcon, // unused
  Settings as SettingsIcon,
  Dashboard as DashboardIcon
} from '@mui/icons-material';
import { useAuth } from '../../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import NotificationDropdown from '../Notifications/NotificationDropdown';

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
      elevation={0}
      sx={{ 
        backgroundColor: '#ffffff',
        borderBottom: '1px solid #e5e7eb',
        color: '#1f2937',
        zIndex: 1400,
        height: '64px',
        boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)'
      }}
    >
      <Toolbar sx={{ 
        minHeight: '64px !important',
        px: { xs: 2, sm: 3 },
        width: '100%',
        maxWidth: '100vw',
        overflow: 'hidden',
        display: 'flex',
        justifyContent: 'space-between', // 🎯 Sol ve sağ arasında boşluk
        alignItems: 'center'
      }}>
        {/* 🍔 Sol Taraf - Sadece Hamburger Menu */}
        <IconButton
          edge="start"
          onClick={onSidebarToggle}
          sx={{ 
            color: '#4b5563',
            p: 1,
            borderRadius: 2,
            '&:hover': {
              backgroundColor: '#f3f4f6',
            }
          }}
        >
          <MenuIcon />
        </IconButton>

        {/* 🎯 Sağ Taraf - Bildirimler, Dashboard ve Profil */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          {/* 🔔 Bildirimler - Enterprise Edition */}
          <NotificationDropdown />

          {/* 🎯 Dashboard Hızlı Erişim */}
          <Tooltip title="Dashboard'a Git" arrow>
            <IconButton 
              onClick={() => navigate('/dashboard')}
              sx={{
                width: 48,
                height: 48,
                background: 'rgba(16, 185, 129, 0.1)',
                backdropFilter: 'blur(10px)',
                border: '1px solid rgba(16, 185, 129, 0.2)',
                color: '#10b981',
                transition: 'all 0.3s ease',
                '&:hover': {
                  background: 'rgba(16, 185, 129, 0.2)',
                  transform: 'scale(1.05)',
                  boxShadow: '0 8px 25px rgba(16, 185, 129, 0.3)'
                }
              }}
            >
              <DashboardIcon />
            </IconButton>
          </Tooltip>

          {/* 👤 Kullanıcı Menüsü */}
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <Box sx={{ display: { xs: 'none', sm: 'block' }, mr: 2, textAlign: 'right' }}>
              <Typography 
                variant="body2" 
                sx={{ 
                  color: '#64748b',
                  fontSize: '0.75rem',
                  fontWeight: 500
                }}
              >
                Hoş geldin,
              </Typography>
              <Typography 
                variant="body1" 
                sx={{ 
                  fontWeight: 700,
                  color: '#1e293b',
                  fontSize: '0.875rem'
                }}
              >
                {user?.adSoyad || 'Kullanıcı'}
              </Typography>
            </Box>
            
            <Tooltip title="Hesap Menüsü" arrow>
              <IconButton
                onClick={handleMenuOpen}
                aria-label="account menu"
                sx={{
                  p: 0,
                  border: '2px solid rgba(59, 130, 246, 0.2)',
                  transition: 'all 0.3s ease',
                  '&:hover': {
                    borderColor: 'rgba(59, 130, 246, 0.4)',
                    transform: 'scale(1.05)',
                    boxShadow: '0 8px 25px rgba(59, 130, 246, 0.3)'
                  }
                }}
              >
                <Avatar 
                  sx={{ 
                    width: 44, 
                    height: 44,
                    background: 'linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%)',
                    fontSize: '1.125rem',
                    fontWeight: 700,
                    color: 'white',
                    boxShadow: '0 4px 15px rgba(59, 130, 246, 0.3)'
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
            elevation: 0,
            sx: {
              mt: 2,
              minWidth: 280,
              borderRadius: 4,
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
          transformOrigin={{ horizontal: 'right', vertical: 'top' }}
          anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
        >
          {/* 👤 Kullanıcı Bilgileri */}
          <Box sx={{ px: 3, py: 2.5, mt: 0.5 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
              <Avatar 
                sx={{ 
                  width: 56, 
                  height: 56, 
                  mr: 2,
                  background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)',
                  fontSize: '1.5rem',
                  fontWeight: 700,
                  boxShadow: '0 8px 25px rgba(59, 130, 246, 0.3)'
                }}
              >
                {user?.adSoyad?.charAt(0)}
              </Avatar>
              <Box>
                <Typography 
                  variant="h6" 
                  sx={{ 
                    fontWeight: 700,
                    color: '#1e293b',
                    fontSize: '1rem',
                    mb: 0.5
                  }}
                >
                  {user?.adSoyad}
                </Typography>
                <Typography 
                  variant="body2" 
                  sx={{ 
                    color: '#64748b',
                    fontSize: '0.875rem',
                    mb: 1
                  }}
                >
                  {user?.email}
                </Typography>
                <Chip 
                  label={user?.rolAciklama || user?.rol}
                  size="small"
                  sx={{ 
                    background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)',
                    color: 'white',
                    fontWeight: 600,
                    fontSize: '0.75rem',
                    border: 'none',
                    boxShadow: '0 4px 15px rgba(59, 130, 246, 0.3)'
                  }}
                />
              </Box>
            </Box>
          </Box>
          
          <Divider sx={{ 
            background: 'linear-gradient(90deg, transparent, rgba(59, 130, 246, 0.2), transparent)',
            height: 1.5
          }} />
          
          {/* 📋 Menü Öğeleri */}
          <MenuItem 
            onClick={handleProfileClick}
            sx={{
              mx: 2,
              my: 1,
              borderRadius: 2,
              transition: 'all 0.3s ease',
              '&:hover': {
                background: 'rgba(59, 130, 246, 0.1)',
                transform: 'translateX(8px)'
              }
            }}
          >
            <PersonIcon sx={{ mr: 2, color: '#3b82f6' }} />
            <Box>
              <Typography variant="body1" sx={{ fontWeight: 600, color: '#1e293b' }}>
                Profil Ayarları
              </Typography>
              <Typography variant="caption" sx={{ color: '#64748b' }}>
                Hesap bilgilerinizi düzenleyin
              </Typography>
            </Box>
          </MenuItem>

          <MenuItem 
            onClick={() => {
              handleMenuClose();
              navigate('/ayarlar');
            }}
            sx={{
              mx: 2,
              my: 1,
              borderRadius: 2,
              transition: 'all 0.3s ease',
              '&:hover': {
                background: 'rgba(139, 92, 246, 0.1)',
                transform: 'translateX(8px)'
              }
            }}
          >
            <SettingsIcon sx={{ mr: 2, color: '#8b5cf6' }} />
            <Box>
              <Typography variant="body1" sx={{ fontWeight: 600, color: '#1e293b' }}>
                Sistem Ayarları
              </Typography>
              <Typography variant="caption" sx={{ color: '#64748b' }}>
                Uygulama tercihlerinizi yönetin
              </Typography>
            </Box>
          </MenuItem>
          
          <Divider sx={{ 
            mx: 2,
            my: 1,
            background: 'linear-gradient(90deg, transparent, rgba(239, 68, 68, 0.2), transparent)',
            height: 1.5
          }} />
          
          <MenuItem 
            onClick={handleLogout} 
            sx={{ 
              mx: 2,
              my: 1,
              borderRadius: 2,
              transition: 'all 0.3s ease',
              '&:hover': {
                background: 'rgba(239, 68, 68, 0.1)',
                transform: 'translateX(8px)'
              }
            }}
          >
            <LogoutIcon sx={{ mr: 2, color: '#ef4444' }} />
            <Box>
              <Typography variant="body1" sx={{ fontWeight: 600, color: '#ef4444' }}>
                Çıkış Yap
              </Typography>
              <Typography variant="caption" sx={{ color: '#64748b' }}>
                Güvenli şekilde oturumu sonlandır
              </Typography>
            </Box>
          </MenuItem>
        </Menu>
      </Toolbar>
    </AppBar>
  );
};

export default Header; 