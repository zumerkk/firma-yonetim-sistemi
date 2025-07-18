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

// 🎨 CORPORATE EXCELLENCE THEME - MUTED PROFESSIONAL COLORS
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
      main: '#1e40af', // Corporate navy blue
      600: '#1e3a8a',
      700: '#172554',
      800: '#1e293b',
      900: '#172554',
      contrastText: '#ffffff',
    },
    // 🥇 Sophisticated Gold - Premium Vurgu
    secondary: {
      main: '#059669', // Professional emerald
      light: '#10b981',
      dark: '#064e3b',
      contrastText: '#ffffff',
    },
    // 🌿 Professional Green - Başarı ve Büyüme
    success: {
      main: '#059669', // Same as secondary
      light: '#10b981',
      dark: '#064e3b',
      contrastText: '#ffffff',
    },
    // ⚠️ Refined Orange - Uyarı
    warning: {
      main: '#a16207', // Corporate amber
      light: '#f59e0b',
      dark: '#7c2d12',
      contrastText: '#ffffff',
    },
    // ❌ Sophisticated Red - Hata
    error: {
      main: '#dc2626', // Executive red
      light: '#ef4444',
      dark: '#7f1d1d',
      contrastText: '#ffffff',
    },
    // ℹ️ Corporate Blue - Bilgi
    info: {
      main: '#0284c7', // Professional sky blue
      light: '#0ea5e9',
      dark: '#0c4a6e',
      contrastText: '#ffffff',
    },
    // 🎨 Professional Background Scheme
    background: {
      default: '#f8fafc',
      paper: '#ffffff',
    },
    // 📝 Professional Text Colors
    text: {
      primary: '#1e293b',
      secondary: '#64748b',
      disabled: '#cbd5e1',
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
    fontFamily: '"Inter", "Roboto", "Helvetica", "Arial", sans-serif',
    fontWeightLight: 300,
    fontWeightRegular: 400,
    fontWeightMedium: 500,
    fontWeightBold: 600,
    h1: {
      fontSize: '2.5rem', // 36px
      fontWeight: 700,
      lineHeight: 1.2,
      letterSpacing: '-0.02em',
      color: '#1e293b',
    },
    h2: {
      fontSize: '2rem', // 30px
      fontWeight: 700,
      lineHeight: 1.3,
      letterSpacing: '-0.01em',
      color: '#1e293b',
    },
    h3: {
      fontSize: '1.5rem', // 24px
      fontWeight: 600,
      lineHeight: 1.3,
      color: '#1e293b',
    },
    h4: {
      fontSize: '1.25rem', // 20px
      fontWeight: 600,
      lineHeight: 1.4,
      color: '#1e293b',
    },
    h5: {
      fontSize: '1.125rem', // 18px
      fontWeight: 600,
      lineHeight: 1.4,
      color: '#1e293b',
    },
    h6: {
      fontSize: '1rem', // 16px
      fontWeight: 600,
      lineHeight: 1.5,
      color: '#1e293b',
    },
    body1: {
      fontSize: '0.95rem', // 16px
      lineHeight: 1.6,
      fontWeight: 400,
      color: '#374151',
    },
    body2: {
      fontSize: '0.875rem', // 14px
      lineHeight: 1.5,
      fontWeight: 400,
      color: '#64748b',
    },
    caption: {
      fontSize: '0.75rem', // 12px
      lineHeight: 1.4,
      fontWeight: 400,
      color: '#6b7280',
    },
    button: {
      fontSize: '0.875rem',
      fontWeight: 600,
      textTransform: 'none', // Büyük harf dönüşümünü kaldır
      letterSpacing: '0.01em',
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
    '0 1px 3px rgba(0, 0, 0, 0.05)',
    '0 4px 6px rgba(0, 0, 0, 0.05)',
    '0 5px 15px rgba(0, 0, 0, 0.08)',
    '0 10px 24px rgba(0, 0, 0, 0.1)',
    '0 15px 35px rgba(0, 0, 0, 0.1)',
    '0 20px 40px rgba(0, 0, 0, 0.1)',
    ...Array(18).fill('0 25px 50px rgba(0, 0, 0, 0.15)')
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
          borderRadius: 10,
          textTransform: 'none',
          fontWeight: 600,
          fontSize: '0.875rem',
          padding: '8px 16px',
          transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
          '&:hover': {
            transform: 'translateY(-1px)',
            boxShadow: '0 6px 20px rgba(0, 0, 0, 0.15)',
          },
        },
        contained: {
          boxShadow: '0 2px 8px rgba(0, 0, 0, 0.15)',
          '&:hover': {
            boxShadow: '0 6px 20px rgba(0, 0, 0, 0.25)',
          },
        },
        outlined: {
          borderWidth: '1.5px',
          '&:hover': {
            borderWidth: '1.5px',
            background: 'rgba(255, 255, 255, 0.1)',
          },
        },
      },
    },
    
    // 📄 Professional Paper System
    MuiPaper: {
      styleOverrides: {
        root: {
          borderRadius: 12,
          border: '1px solid rgba(255, 255, 255, 0.2)',
        },
      },
    },
    
    // 🎴 Professional Card System
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: 16,
          boxShadow: '0 4px 20px rgba(0, 0, 0, 0.08)',
          border: '1px solid rgba(255, 255, 255, 0.2)',
          transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
          overflow: 'hidden',
          position: 'relative',
          '&:hover': {
            transform: 'translateY(-2px)',
            boxShadow: '0 8px 40px rgba(0, 0, 0, 0.12)',
          },
        },
      },
    },
    
    // 🔝 Professional Header System
    MuiAppBar: {
      styleOverrides: {
        root: {
          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.1)',
          border: 'none',
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
          borderRadius: 8,
          fontWeight: 500,
          fontSize: '0.75rem',
        },
        filled: {
          background: 'rgba(30, 64, 175, 0.1)',
          color: '#1e40af',
          '&:hover': {
            background: 'rgba(30, 64, 175, 0.2)',
          },
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

    MuiCssBaseline: {
      styleOverrides: {
        body: {
          scrollbarWidth: 'thin',
          scrollbarColor: '#cbd5e1 #f1f5f9',
          '&::-webkit-scrollbar': {
            width: 8,
          },
          '&::-webkit-scrollbar-track': {
            background: '#f1f5f9',
          },
          '&::-webkit-scrollbar-thumb': {
            background: '#cbd5e1',
            borderRadius: 4,
            '&:hover': {
              background: '#94a3b8',
            },
          },
        },
      },
    },

    MuiSelect: {
      styleOverrides: {
        root: {
          borderRadius: 8,
          background: '#ffffff',
          border: '1px solid #e2e8f0',
          '&:hover': {
            borderColor: '#cbd5e1',
          },
        },
      },
    },

    MuiAlert: {
      styleOverrides: {
        root: {
          borderRadius: 12,
          border: '1px solid',
          fontSize: '0.875rem',
        },
        standardSuccess: {
          backgroundColor: 'rgba(5, 150, 105, 0.1)',
          borderColor: 'rgba(5, 150, 105, 0.3)',
          color: '#064e3b',
        },
        standardError: {
          backgroundColor: 'rgba(220, 38, 38, 0.1)',
          borderColor: 'rgba(220, 38, 38, 0.3)',
          color: '#7f1d1d',
        },
        standardWarning: {
          backgroundColor: 'rgba(161, 98, 7, 0.1)',
          borderColor: 'rgba(161, 98, 7, 0.3)',
          color: '#7c2d12',
        },
        standardInfo: {
          backgroundColor: 'rgba(30, 64, 175, 0.1)',
          borderColor: 'rgba(30, 64, 175, 0.3)',
          color: '#1e3a8a',
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

// 📱 MODERN GRID LAYOUT SYSTEM - ULTIMATE SOLUTION
function AppLayout() {
  const [sidebarOpen, setSidebarOpen] = React.useState(true);
  const [isMobile, setIsMobile] = React.useState(window.innerWidth < 1024);

  const handleSidebarToggle = () => {
    setSidebarOpen(!sidebarOpen);
  };

  // 📱 Responsive listener
  React.useEffect(() => {
    const handleResize = () => {
      const mobile = window.innerWidth < 1024;
      setIsMobile(mobile);
      // Mobilde sidebar'ı otomatik kapat
      if (mobile) {
        setSidebarOpen(false);
      } else {
        setSidebarOpen(true);
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return (
    <Box 
      sx={{ 
        display: 'grid',
        gridTemplateRows: '64px 1fr',
        gridTemplateColumns: {
          xs: '1fr',
          lg: sidebarOpen ? '280px 1fr' : '0px 1fr'
        },
        gridTemplateAreas: {
          xs: `
            "header"
            "content"
          `,
          lg: sidebarOpen ? `
            "header header"
            "sidebar content"
          ` : `
            "header"
            "content"
          `
        },
        height: '100vh',
        width: '100vw',
        overflow: 'hidden',
        transition: 'grid-template-columns 0.3s ease',
        backgroundColor: '#f8fafc'
      }}
    >
      {/* 🔝 Fixed Header - Grid Area */}
      <Box 
        sx={{ 
          gridArea: 'header',
          zIndex: 1201
        }}
      >
        <Header onSidebarToggle={handleSidebarToggle} />
      </Box>
      
      {/* 📊 Modern Sidebar - Grid Area */}
      {!isMobile && sidebarOpen && (
        <Box 
          sx={{ 
            gridArea: 'sidebar',
            zIndex: 1200,
            overflow: 'hidden'
          }}
        >
          <Sidebar 
            open={sidebarOpen} 
            onClose={() => setSidebarOpen(false)}
            variant="persistent"
          />
        </Box>
      )}

      {/* 📱 Mobile Sidebar Overlay */}
      {isMobile && (
        <Sidebar 
          open={sidebarOpen} 
          onClose={() => setSidebarOpen(false)}
          variant="temporary"
        />
      )}
      
      {/* 📄 MAIN CONTENT AREA - GRID SOLUTION */}
      <Box
        component="main"
        sx={{
          gridArea: 'content',
          overflow: 'auto',
          position: 'relative',
          backgroundColor: 'transparent',
          width: '100%',
          height: '100%',
          
          // 🎨 Professional Scrollbar
          '&::-webkit-scrollbar': {
            width: '6px',
          },
          '&::-webkit-scrollbar-track': {
            background: 'rgba(241, 245, 249, 0.6)',
            borderRadius: '3px',
          },
          '&::-webkit-scrollbar-thumb': {
            background: 'rgba(148, 163, 184, 0.8)',
            borderRadius: '3px',
            transition: 'background 0.2s ease',
            '&:hover': {
              background: 'rgba(100, 116, 139, 0.9)',
            },
          }
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
          
          {/* 🚫 404 - Corporate Error Page */}
          <Route path="*" element={
            <Box sx={{ 
              textAlign: 'center', 
              mt: 5, 
              p: 4,
              maxWidth: 600,
              mx: 'auto',
              background: 'rgba(255, 255, 255, 0.9)',
              borderRadius: 3,
              border: '1px solid rgba(226, 232, 240, 0.5)',
              boxShadow: '0 4px 20px rgba(0, 0, 0, 0.05)'
            }}>
              <Typography variant="h4" component="h2" sx={{ 
                mb: 2,
                fontWeight: 700,
                color: '#1e293b'
              }}>
                🚫 Sayfa Bulunamadı
              </Typography>
              <Typography variant="body1" color="text.secondary" sx={{
                fontSize: '0.95rem',
                lineHeight: 1.6
              }}>
                Aradığınız sayfa sistemde mevcut değil. Lütfen URL'yi kontrol ediniz.
              </Typography>
            </Box>
          } />
        </Routes>
      </Box>
      
      {/* 📱 Mobile Overlay - For sidebar backdrop */}
      {isMobile && sidebarOpen && (
        <Box
          sx={{
            position: 'fixed',
            top: 64,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.3)',
            zIndex: 1199,
            backdropFilter: 'blur(2px)'
          }}
          onClick={() => setSidebarOpen(false)}
        />
      )}
    </Box>
  );
}

export default App;

