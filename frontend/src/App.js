// 🚀 GM Planlama Danışmanlık - Frontend Ana Uygulama
// Bu dosya tüm sayfaları yöneten main App component'i

import React from 'react';
import { BrowserRouter as Router } from 'react-router-dom';
import { CssBaseline, ThemeProvider } from '@mui/material';
// 🎛️ GLOBAL TEMA — Faz 4'te etuysTema'ya geçildi.
//
// Faz 2'de iki tema yan yana kondu, Faz 3'te ekranlar tek tek etuysTema ile
// sarmalandı (19 ekran). Sarmalayıcılar artık gereksiz ve kaldırıldı; tema
// buradan tek noktadan geliyor.
//
// ⚠️ GERİ ALMA TEK SATIR: aşağıyı `mevcutTema as theme` yapmak tüm uygulamayı
// eski görünüme döndürür. mevcutTema muiTema.js'te bilerek duruyor —
// Faz 3'te hiç incelenmemiş 26 ekran da bu anahtarla değişti, sorun çıkarsa
// tek satırla geri dönülebilsin diye.
import { etuysTema as theme } from './tasarim/muiTema';

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

