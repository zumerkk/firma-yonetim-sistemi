// 🚀 GM Planlama Danışmanlık - Frontend Ana Uygulama
// Bu dosya tüm sayfaları yöneten main App component'i

import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { CssBaseline, ThemeProvider } from '@mui/material';
import { createTheme } from '@mui/material/styles';

// 🔐 Auth Context
import { AuthProvider } from './contexts/AuthContext';
import { FirmaProvider } from './contexts/FirmaContext'; 
import { NotificationProvider } from './contexts/NotificationContext';
import { TesvikProvider } from './contexts/TesvikContext';

// 🛡️ Protected Route
import ProtectedRoute from './components/Auth/ProtectedRoute';

// 📄 Pages
import Login from './pages/Auth/Login';
import Dashboard from './pages/Dashboard/Dashboard';
import FirmaList from './pages/Firma/FirmaList';
import FirmaForm from './pages/Firma/FirmaForm';
import FirmaDetail from './pages/Firma/FirmaDetail';
import ActivityList from './pages/Activities/ActivityList';
import Statistics from './pages/Statistics/Statistics';
import Settings from './pages/Settings/Settings';
import Profile from './pages/Profile/Profile';
import NotificationPage from './pages/Notifications/NotificationPage';

// 🏆 Teşvik Sistemi Pages
import TesvikDashboard from './pages/Tesvik/TesvikDashboard';
import TesvikList from './pages/Tesvik/TesvikList'; 
import TesvikForm from './pages/Tesvik/TesvikForm';
import TesvikDetail from './pages/Tesvik/TesvikDetail';

// 📊 Dashboard Bileşenleri
import TesvikAnalyticsDashboard from './components/Dashboard/TesvikDashboard';

// 🔐 Admin Panel
import AdminPanel from './pages/Admin/AdminPanel';

// 📊 Report Center
import ReportCenter from './pages/Reports/ReportCenter';

// 📁 File Manager
import FileManager from './pages/Files/FileManager';

// 🎨 Corporate Muted Professional Theme
const theme = createTheme({
  palette: {
    mode: 'light',
    primary: {
      main: '#1e40af', // Corporate Blue
      light: '#3b82f6',
      dark: '#1e3a8a'
    },
    secondary: {
      main: '#059669', // Corporate Green
      light: '#10b981',
      dark: '#047857'
    },
    background: {
      default: '#f8fafc', // Very light gray
      paper: '#ffffff'
    },
    text: {
      primary: '#1f2937', // Very dark gray
      secondary: '#6b7280' // Medium gray
    }
  },
  typography: {
    fontFamily: '"Inter", "Roboto", "Helvetica", "Arial", sans-serif',
    h1: {
      fontWeight: 700,
      fontSize: '2rem'
    },
    h2: {
      fontWeight: 600,
      fontSize: '1.75rem'
    },
    h3: {
      fontWeight: 600,
      fontSize: '1.5rem'
    }
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          textTransform: 'none',
          borderRadius: 8,
          fontWeight: 500
        }
      }
    },
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: 12,
          boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)'
        }
      }
    }
  }
});

function App() {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <AuthProvider>
        <FirmaProvider>
          <NotificationProvider>
            <TesvikProvider>
              <Router future={{
                v7_startTransition: true,
                v7_relativeSplatPath: true
              }}>
              <Routes>
                {/* 🔑 Giriş Sayfası */}
                <Route path="/login" element={<Login />} />
                
                {/* 🛡️ Korumalı Rotalar */}
                <Route path="/" element={
                  <ProtectedRoute>
                    <Navigate to="/dashboard" replace />
                  </ProtectedRoute>
                } />
                
                {/* 📊 Dashboard */}
                <Route path="/dashboard" element={
                  <ProtectedRoute>
                    <Dashboard />
                  </ProtectedRoute>
                } />
                
                {/* 🏢 Firma Yönetimi */}
                <Route path="/firmalar" element={
                  <ProtectedRoute>
                    <FirmaList />
                  </ProtectedRoute>
                } />
                
                <Route path="/firmalar/yeni" element={
                  <ProtectedRoute permission="firmaEkle">
                    <FirmaForm />
                  </ProtectedRoute>
                } />
                
                <Route path="/firmalar/:id" element={
                  <ProtectedRoute>
                    <FirmaDetail />
                  </ProtectedRoute>
                } />
                
                <Route path="/firmalar/:id/duzenle" element={
                  <ProtectedRoute permission="firmaDuzenle">
                    <FirmaForm />
                  </ProtectedRoute>
                } />

                {/* 🏆 Teşvik Belge Sistemi */}
                <Route path="/tesvik" element={
                  <ProtectedRoute>
                    <TesvikDashboard />
                  </ProtectedRoute>
                } />
                
                {/* 📊 Teşvik Analytics Dashboard */}
                <Route path="/tesvik/dashboard" element={
                  <ProtectedRoute>
                    <TesvikAnalyticsDashboard />
                  </ProtectedRoute>
                } />
                
                <Route path="/tesvik/liste" element={
                  <ProtectedRoute>
                    <TesvikList />
                  </ProtectedRoute>
                } />
                
                <Route path="/tesvik/yeni" element={
                  <ProtectedRoute permission="belgeEkle">
                    <TesvikForm />
                  </ProtectedRoute>
                } />
                
                <Route path="/tesvik/:id" element={
                  <ProtectedRoute>
                    <TesvikDetail />
                  </ProtectedRoute>
                } />
                
                <Route path="/tesvik/:id/duzenle" element={
                  <ProtectedRoute permission="belgeDuzenle">
                    <TesvikForm />
                  </ProtectedRoute>
                } />
                
                {/* 📋 Diğer Sayfalar */}
                <Route path="/son-islemler" element={
                  <ProtectedRoute>
                    <ActivityList />
                  </ProtectedRoute>
                } />
                
                <Route path="/istatistikler" element={
                  <ProtectedRoute>
                    <Statistics />
                  </ProtectedRoute>
                } />
                
                <Route path="/ayarlar" element={
                  <ProtectedRoute>
                    <Settings />
                  </ProtectedRoute>
                } />
                
                <Route path="/profil" element={
                  <ProtectedRoute>
                    <Profile />
                  </ProtectedRoute>
                } />
                
                <Route path="/bildirimler" element={
                  <ProtectedRoute>
                    <NotificationPage />
                  </ProtectedRoute>
                } />

                {/* 🔐 Admin Panel */}
                <Route path="/admin" element={
                  <ProtectedRoute permission="yonetimPaneli">
                    <AdminPanel />
                  </ProtectedRoute>
                } />

                {/* 📊 Report Center */}
                <Route path="/raporlar" element={
                  <ProtectedRoute permission="raporGoruntule">
                    <ReportCenter />
                  </ProtectedRoute>
                } />

                {/* 📁 File Manager */}
                <Route path="/dosyalar" element={
                  <ProtectedRoute>
                    <FileManager />
                  </ProtectedRoute>
                } />
                
                {/* 🚫 Catch-all route */}
                <Route path="*" element={<Navigate to="/dashboard" replace />} />
              </Routes>
              </Router>
            </TesvikProvider>
          </NotificationProvider>
        </FirmaProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;

