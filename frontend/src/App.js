// 🚀 GM Planlama Danışmanlık - Frontend Ana Uygulama
// Bu dosya tüm sayfaları yöneten main App component'i

import React from 'react';
import { BrowserRouter as Router } from 'react-router-dom';
import { CssBaseline, ThemeProvider } from '@mui/material';
// 🎛️ Tema artık tasarim/muiTema.js'te. mevcutTema, burada duran temanın
// BİREBİR aynısı — bu taşıma görünümü değiştirmiyor. Faz 3'te ekranlar
// sırayla etuysTema ile sarmalanacak, en sonda burası da ona geçecek.
import { mevcutTema as theme } from './tasarim/muiTema';

// 🛡️ App Router with Refresh Handler
import AppRouter from './components/AppRouter';

// 🔐 Auth Context
import { AuthProvider } from './contexts/AuthContext';
import { FirmaProvider } from './contexts/FirmaContext';
import { NotificationProvider } from './contexts/NotificationContext';
import { TesvikProvider } from './contexts/TesvikContext';
import { DosyaTakipProvider } from './contexts/DosyaTakipContext';
import SurumUyarisi from './components/common/SurumUyarisi';





function App() {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <AuthProvider>
        <FirmaProvider>
          <NotificationProvider>
            <TesvikProvider>
              <DosyaTakipProvider>
                <Router future={{
                  v7_startTransition: true,
                  v7_relativeSplatPath: true
                }}>
                  <AppRouter />
                  {/* Eski arayüzle yeni backend kuralları çakışmasın diye yenileme önerir */}
                  <SurumUyarisi />
                </Router>
              </DosyaTakipProvider>
            </TesvikProvider>
          </NotificationProvider>
        </FirmaProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;

