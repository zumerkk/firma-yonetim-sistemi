// 🚀 Firma Yönetim Sistemi - Ana Uygulama
// Modern React tabanlı firma tanımlama ve yönetim sistemi

import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import { Box, Typography } from '@mui/material';

// Context providers
import { AuthProvider } from './contexts/AuthContext';
import { FirmaProvider } from './contexts/FirmaContext';

// Components
import Header from './components/Layout/Header';
import Sidebar from './components/Layout/Sidebar';
import ProtectedRoute from './components/Auth/ProtectedRoute';

// Pages
import Login from './pages/Auth/Login';
import Dashboard from './pages/Dashboard/Dashboard';
import FirmaList from './pages/Firma/FirmaList';
import FirmaDetail from './pages/Firma/FirmaDetail';
import FirmaForm from './pages/Firma/FirmaForm';
import Profile from './pages/Profile/Profile';
import Statistics from './pages/Statistics/Statistics';
import Settings from './pages/Settings/Settings';

// Styles
import './styles/global.css';

// 🎨 ULTRA-PROFESSIONAL CORPORATE TEMA - ENTERPRISE EDITION
const theme = createTheme({
  // 🏢 Corporate Professional Renk Paleti - Psikolojik Etki
  palette: {
    mode: 'light',
    // 💙 Professional Navy Blue - Güven ve İstikrar
    primary: {
      50: '#f0f2ff',
      100: '#e0e7ff',
      200: '#c7d2fe',
      300: '#a5b4fc',
      400: '#818cf8',
      main: '#1e293b', // Ana renk: Professional Dark Blue
      600: '#0f172a',
      700: '#020617',
      800: '#0c1220',
      900: '#020617',
      contrastText: '#ffffff',
    },
    // 🥇 Sophisticated Gold - Premium Vurgu
    secondary: {
      main: '#d97706', // Elegant Gold
      light: '#fbbf24',
      dark: '#92400e',
      contrastText: '#ffffff',
    },
    // 🌿 Professional Green - Başarı ve Büyüme
    success: {
      main: '#059669', // Modern Green
      light: '#10b981',
      dark: '#047857',
      contrastText: '#ffffff',
    },
    // ⚠️ Refined Orange - Uyarı
    warning: {
      main: '#ea580c', // Refined Orange
      light: '#fb923c',
      dark: '#c2410c',
      contrastText: '#ffffff',
    },
    // ❌ Sophisticated Red - Hata
    error: {
      main: '#dc2626', // Modern Red
      light: '#ef4444',
      dark: '#b91c1c',
      contrastText: '#ffffff',
    },
    // ℹ️ Corporate Blue - Bilgi
    info: {
      main: '#0369a1', // Corporate Blue
      light: '#0ea5e9',
      dark: '#0c4a6e',
      contrastText: '#ffffff',
    },
    // 🎨 Professional Background Scheme
    background: {
      default: '#f8fafc', // Ultra Clean Background
      paper: '#ffffff', // Pure White
    },
    // 📝 Professional Text Colors
    text: {
      primary: '#1e293b', // Professional Dark Blue
      secondary: '#64748b', // Muted Gray
      disabled: '#cbd5e1', // Light Gray
    },
    // 🎯 Corporate Gray Scale
    grey: {
      50: '#f8fafc',
      100: '#f1f5f9',
      200: '#e2e8f0',
      300: '#cbd5e1',
      400: '#94a3b8',
      500: '#64748b',
      600: '#475569',
      700: '#334155',
      800: '#1e293b',
      900: '#0f172a',
    },
    divider: '#e2e8f0', // Professional Divider
  },
  
  // 🔤 Typography Sistemi - Inter Font Family
  typography: {
    fontFamily: '"Inter", "Roboto", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
    fontWeightLight: 300,
    fontWeightRegular: 400,
    fontWeightMedium: 500,
    fontWeightBold: 600,
    h1: {
      fontSize: '2.25rem', // 36px
      fontWeight: 700,
      lineHeight: 1.1,
      letterSpacing: '-0.02em',
    },
    h2: {
      fontSize: '1.875rem', // 30px
      fontWeight: 600,
      lineHeight: 1.2,
      letterSpacing: '-0.01em',
    },
    h3: {
      fontSize: '1.5rem', // 24px
      fontWeight: 600,
      lineHeight: 1.3,
    },
    h4: {
      fontSize: '1.25rem', // 20px
      fontWeight: 600,
      lineHeight: 1.4,
    },
    h5: {
      fontSize: '1.125rem', // 18px
      fontWeight: 600,
      lineHeight: 1.4,
    },
    h6: {
      fontSize: '1rem', // 16px
      fontWeight: 600,
      lineHeight: 1.4,
    },
    body1: {
      fontSize: '1rem', // 16px
      lineHeight: 1.6,
      fontWeight: 400,
    },
    body2: {
      fontSize: '0.875rem', // 14px
      lineHeight: 1.5,
      fontWeight: 400,
    },
    caption: {
      fontSize: '0.75rem', // 12px
      lineHeight: 1.4,
      fontWeight: 500,
      textTransform: 'uppercase',
      letterSpacing: '0.08em',
    },
    button: {
      fontSize: '0.875rem',
      fontWeight: 600,
      textTransform: 'none', // Büyük harf dönüşümünü kaldır
      letterSpacing: '0.02em',
    },
  },
  
  // 📏 Spacing Sistemi - 8px Grid
  spacing: 8,
  
  // 📐 Shape Sistemi
  shape: {
    borderRadius: 12,
  },
  
  // 🎭 Shadow Sistemi
  shadows: [
    'none',
    '0 1px 2px rgba(0, 0, 0, 0.05)',
    '0 4px 6px rgba(0, 0, 0, 0.07)',
    '0 10px 15px rgba(0, 0, 0, 0.1)',
    '0 20px 25px rgba(0, 0, 0, 0.15)',
    '0 25px 50px rgba(0, 0, 0, 0.25)',
    // ... diğer shadow değerleri Material-UI standartlarına göre
    '0 8px 32px rgba(31, 38, 135, 0.37)', // Glassmorphism shadow
    '0 10px 40px rgba(31, 38, 135, 0.4)',
    '0 12px 48px rgba(31, 38, 135, 0.45)',
    '0 14px 56px rgba(31, 38, 135, 0.5)',
    // Remaining shadows to complete the array
    ...Array(15).fill('0 25px 50px rgba(0, 0, 0, 0.25)'),
  ],
  
  // 🔄 Transitions
  transitions: {
    duration: {
      shortest: 150,
      shorter: 200,
      short: 250,
      standard: 300,
      complex: 375,
      enteringScreen: 225,
      leavingScreen: 195,
    },
    easing: {
      easeInOut: 'cubic-bezier(0.4, 0, 0.2, 1)',
      easeOut: 'cubic-bezier(0.0, 0, 0.2, 1)',
      easeIn: 'cubic-bezier(0.4, 0, 1, 1)',
      sharp: 'cubic-bezier(0.4, 0, 0.6, 1)',
    },
  },
  
  // 🎨 ULTRA-PROFESSIONAL COMPONENT CUSTOMIZATIONS
  components: {
    // 🔘 Professional Button System
    MuiButton: {
      styleOverrides: {
        root: {
          textTransform: 'none',
          borderRadius: 8, // More conservative radius
          fontWeight: 600,
          fontSize: '0.875rem',
          padding: '10px 20px',
          boxShadow: 'none',
          transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
          letterSpacing: '0.025em',
          '&:hover': {
            transform: 'translateY(-1px)',
            boxShadow: '0 4px 12px rgba(30, 41, 59, 0.15)',
          },
        },
        contained: {
          background: 'linear-gradient(135deg, #1e293b 0%, #334155 100%)',
          color: '#ffffff',
          '&:hover': {
            background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
            boxShadow: '0 6px 20px rgba(30, 41, 59, 0.25)',
          },
        },
        outlined: {
          backgroundColor: '#ffffff',
          border: '1px solid #e2e8f0',
          color: '#1e293b',
          '&:hover': {
            backgroundColor: '#f8fafc',
            borderColor: '#1e293b',
            boxShadow: '0 2px 8px rgba(30, 41, 59, 0.1)',
          },
        },
        text: {
          color: '#64748b',
          '&:hover': {
            backgroundColor: '#f1f5f9',
            color: '#1e293b',
          },
        },
      },
    },
    
    // 📄 Professional Paper System
    MuiPaper: {
      styleOverrides: {
        root: {
          background: '#ffffff',
          border: '1px solid #e2e8f0',
          borderRadius: 12,
          boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
          transition: 'all 0.2s ease',
        },
        elevation1: {
          boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
        },
        elevation2: {
          boxShadow: '0 4px 6px rgba(0, 0, 0, 0.07)',
        },
        elevation3: {
          boxShadow: '0 10px 15px rgba(0, 0, 0, 0.1)',
        },
        elevation4: {
          boxShadow: '0 20px 25px rgba(0, 0, 0, 0.1)',
        },
      },
    },
    
    // 🎴 Professional Card System
    MuiCard: {
      styleOverrides: {
        root: {
          background: '#ffffff',
          border: '1px solid #e2e8f0',
          borderRadius: 12,
          boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
          transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
          overflow: 'hidden',
          position: 'relative',
          '&:hover': {
            transform: 'translateY(-2px)',
            boxShadow: '0 10px 25px rgba(30, 41, 59, 0.15)',
            borderColor: '#cbd5e1',
          },
        },
      },
    },
    
    // 🔝 Professional Header System
    MuiAppBar: {
      styleOverrides: {
        root: {
          background: 'linear-gradient(135deg, #1e293b 0%, #334155 100%)',
          borderBottom: '1px solid #e2e8f0',
          boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
          color: '#ffffff',
          '& .MuiToolbar-root': {
            paddingLeft: '24px',
            paddingRight: '24px',
          },
        },
      },
    },
    
    // 📊 Professional Sidebar System
    MuiDrawer: {
      styleOverrides: {
        paper: {
          background: '#ffffff',
          borderRight: '1px solid #e2e8f0',
          boxShadow: '2px 0 8px rgba(0, 0, 0, 0.05)',
          '& .MuiListItemText-primary': {
            fontSize: '0.875rem',
            fontWeight: 500,
            color: '#1e293b',
          },
        },
      },
    },
    
    // 📝 Professional Form Components
    MuiTextField: {
      styleOverrides: {
        root: {
          '& .MuiOutlinedInput-root': {
            background: '#ffffff',
            borderRadius: 8,
            border: '1px solid #e2e8f0',
            transition: 'all 0.2s ease',
            fontSize: '0.875rem',
            '&:hover': {
              borderColor: '#cbd5e1',
              background: '#f8fafc',
            },
            '&.Mui-focused': {
              background: '#ffffff',
              borderColor: '#1e293b',
              boxShadow: '0 0 0 3px rgba(30, 41, 59, 0.1)',
            },
            '& .MuiOutlinedInput-notchedOutline': {
              border: 'none',
            },
          },
          '& .MuiInputLabel-root': {
            color: '#64748b',
            fontSize: '0.875rem',
            '&.Mui-focused': {
              color: '#1e293b',
            },
          },
        },
      },
    },
    
    // 📊 Professional Data Grid System - Excel Inspired
    MuiDataGrid: {
      styleOverrides: {
        root: {
          background: '#ffffff',
          border: '1px solid #e2e8f0',
          borderRadius: 8,
          fontSize: '0.875rem',
          '& .MuiDataGrid-columnHeaders': {
            background: 'linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)',
            borderBottom: '2px solid #e2e8f0',
            color: '#1e293b',
            fontWeight: 600,
            fontSize: '0.8rem',
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
            minHeight: '48px !important',
            '& .MuiDataGrid-columnHeaderTitle': {
              fontWeight: 600,
            },
          },
          '& .MuiDataGrid-row': {
            borderBottom: '1px solid #f1f5f9',
            '&:hover': {
              background: '#f8fafc',
              cursor: 'pointer',
            },
            '&.Mui-selected': {
              background: '#f0f9ff',
              '&:hover': {
                background: '#e0f2fe',
              },
            },
          },
          '& .MuiDataGrid-cell': {
            borderBottom: '1px solid #f1f5f9',
            borderRight: '1px solid #f1f5f9',
            fontSize: '0.875rem',
            color: '#1e293b',
            '&:focus': {
              outline: '2px solid #d97706',
              outlineOffset: '-2px',
            },
          },
          '& .MuiDataGrid-footerContainer': {
            borderTop: '2px solid #e2e8f0',
            background: '#f8fafc',
            minHeight: '52px',
          },
        },
      },
    },
    
    // 🎯 List Components
    MuiListItemButton: {
      styleOverrides: {
        root: {
          borderRadius: 12,
          margin: '4px 8px',
          transition: 'all 0.3s ease',
          '&:hover': {
            background: 'rgba(33, 150, 243, 0.08)',
            transform: 'translateX(4px)',
          },
          '&.Mui-selected': {
            background: 'linear-gradient(135deg, rgba(33, 150, 243, 0.15), rgba(25, 118, 210, 0.15))',
            '&:hover': {
              background: 'linear-gradient(135deg, rgba(33, 150, 243, 0.2), rgba(25, 118, 210, 0.2))',
            },
          },
        },
      },
    },
    
    // 🔲 Chip Components
    MuiChip: {
      styleOverrides: {
        root: {
          borderRadius: 20,
          fontWeight: 500,
          fontSize: '0.75rem',
          textTransform: 'uppercase',
          letterSpacing: '0.05em',
        },
        filled: {
          background: 'rgba(33, 150, 243, 0.1)',
          color: '#1976d2',
          border: '1px solid rgba(33, 150, 243, 0.2)',
        },
      },
    },
    
    // 🎪 Dialog Components
    MuiDialog: {
      styleOverrides: {
        paper: {
          background: 'rgba(255, 255, 255, 0.95)',
          backdropFilter: 'blur(12px)',
          border: '1px solid rgba(255, 255, 255, 0.2)',
          borderRadius: 20,
          boxShadow: '0 20px 60px rgba(31, 38, 135, 0.4)',
        },
      },
    },
  },
});

function App() {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <AuthProvider>
        <FirmaProvider>
          <Router future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
            <Box className="app-container">
              <Routes>
                {/* 🔐 Public Routes - Giriş Sayfası */}
                <Route path="/login" element={<Login />} />
                
                {/* 🏠 Protected Routes - Ana Uygulama */}
                <Route path="/*" element={
                  <ProtectedRoute>
                    <AppLayout />
                  </ProtectedRoute>
                } />
              </Routes>
            </Box>
          </Router>
        </FirmaProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}

// 📱 ENTERPRISE ANA UYGULAMA LAYOUT'U
function AppLayout() {
  const [sidebarOpen, setSidebarOpen] = React.useState(true);

  const handleSidebarToggle = () => {
    setSidebarOpen(!sidebarOpen);
  };

  return (
    <>
      {/* 🔝 Enterprise Header - Fixed Position */}
      <Header onSidebarToggle={handleSidebarToggle} />
      
      {/* 📊 Professional Sidebar */}
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      
      {/* 📄 Ana İçerik Alanı - Fixed Scroll Solution */}
      <Box
        component="main"
        className="main-content"
        sx={{
          // 🔧 Sidebar Scroll Düzeltmesi
          marginLeft: { xs: 0, md: sidebarOpen ? '240px' : '0px' }, // Responsive sidebar space
          marginTop: '64px', // Header space
          transition: 'margin 0.3s ease', // Smooth transition
          padding: { xs: 2, sm: 3 }, // Responsive padding
          paddingBottom: 4, // Bottom space
          
          // 🎯 Kritik scroll çözümü - Ana problem burada!
          minHeight: 'calc(100vh - 64px)', // Minimum height
          maxHeight: 'calc(100vh - 64px)', // Maximum height - EKLENDI!
          overflowY: 'auto', // Vertical scroll MUTLAKA
          overflowX: 'hidden', // Horizontal scroll gizli
          
          // 📱 Position ve display optimizasyonu
          position: 'static', // relative yerine static - DÜZELTME!
          display: 'block', // Block display - EKLENDI!
          backgroundColor: '#f8fafc', // Clean background
          
          // 🎨 Professional scrollbar styling
          '&::-webkit-scrollbar': {
            width: '8px',
          },
          '&::-webkit-scrollbar-track': {
            background: '#f1f5f9',
            borderRadius: '4px',
          },
          '&::-webkit-scrollbar-thumb': {
            background: '#cbd5e1',
            borderRadius: '4px',
            '&:hover': {
              background: '#94a3b8',
            },
          },
        }}
      >
        <Routes>
          {/* 🏠 Dashboard - Ana Sayfa */}
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="/dashboard" element={<Dashboard />} />
          
          {/* 🏢 Firma Yönetimi */}
          <Route path="/firmalar" element={<FirmaList />} />
          <Route path="/firmalar/yeni" element={<FirmaForm />} />
          <Route path="/firmalar/:id" element={<FirmaDetail />} />
          <Route path="/firmalar/:id/duzenle" element={<FirmaForm />} />
          
          {/* 📊 İstatistikler */}
          <Route path="/istatistikler" element={<Statistics />} />
          
          {/* ⚙️ Ayarlar */}
          <Route path="/ayarlar" element={<Settings />} />
          
          {/* 👤 Profil */}
          <Route path="/profil" element={<Profile />} />
          
          {/* 🚫 404 - Enterprise Error Page */}
          <Route path="*" element={
            <Box className="glass-card" sx={{ 
              textAlign: 'center', 
              mt: 5, 
              p: 4,
              maxWidth: 600,
              mx: 'auto'
            }}>
              <Typography variant="h4" component="h2" className="text-heading-large" sx={{ mb: 2 }}>
                🚫 Sayfa Bulunamadı
              </Typography>
              <Typography variant="body1" className="text-body-medium" color="text.secondary">
                Aradığınız sayfa sistemde mevcut değil. Lütfen URL'yi kontrol ediniz.
              </Typography>
            </Box>
          } />
        </Routes>
      </Box>
    </>
  );
}

export default App;

