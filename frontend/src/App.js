// 🚀 GM Planlama Danışmanlık - Frontend Ana Uygulama
// Bu dosya tüm sayfaları yöneten main App component'i

import React from 'react';
import { BrowserRouter as Router } from 'react-router-dom';
import { CssBaseline, ThemeProvider } from '@mui/material';
import { createTheme } from '@mui/material/styles';

// 🛡️ App Router with Refresh Handler
import AppRouter from './components/AppRouter';

// 🔐 Auth Context
import { AuthProvider } from './contexts/AuthContext';
import { FirmaProvider } from './contexts/FirmaContext'; 
import { NotificationProvider } from './contexts/NotificationContext';
import { TesvikProvider } from './contexts/TesvikContext';



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
              <AppRouter />
              </Router>
            </TesvikProvider>
          </NotificationProvider>
        </FirmaProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;

