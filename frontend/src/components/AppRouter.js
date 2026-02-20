// 🛡️ App Router with Refresh Handler
// Bu component App.js'den ayrılmış router logic'ini ve refresh handling'i içerir

import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';

// 🛡️ Page Refresh Handler Hook
import { usePageRefreshHandler } from '../hooks/usePageRefreshHandler';

// 🛡️ Protected Route
import ProtectedRoute from './Auth/ProtectedRoute';

// 📄 Pages
import Login from '../pages/Auth/Login';
import Dashboard from '../pages/Dashboard/Dashboard';
import FirmaList from '../pages/Firma/FirmaList';
import FirmaForm from '../pages/Firma/FirmaForm';
import FirmaDetail from '../pages/Firma/FirmaDetail';
import ActivityList from '../pages/Activities/ActivityList';
import Statistics from '../pages/Statistics/Statistics';
import Settings from '../pages/Settings/Settings';
import Profile from '../pages/Profile/Profile';
import NotificationPage from '../pages/Notifications/NotificationPage';

// 🏆 Teşvik Sistemi Pages
import TesvikDashboard from '../pages/Tesvik/TesvikDashboard';
import TesvikList from '../pages/Tesvik/TesvikList';
import TesvikForm from '../pages/Tesvik/TesvikForm';
import TesvikDetail from '../pages/Tesvik/TesvikDetail';
import MakineYonetimi from '../pages/Tesvik/MakineYonetimi';

// 🆕 Yeni Teşvik Sistemi Pages
import YeniTesvikDashboard from '../pages/YeniTesvik/YeniTesvikDashboard';
import YeniTesvikList from '../pages/YeniTesvik/YeniTesvikList';
import YeniTesvikForm from '../pages/YeniTesvik/YeniTesvikForm';
import YeniTesvikDetail from '../pages/YeniTesvik/YeniTesvikDetail';
import YeniMakineYonetimi from '../pages/YeniTesvik/MakineYonetimi';

// 📋 Dosya İş Akış Takip Sistemi Pages
import DosyaTakipDashboard from '../pages/DosyaTakip/DosyaTakipDashboard';
import DosyaTakipList from '../pages/DosyaTakip/DosyaTakipList';
import DosyaTakipForm from '../pages/DosyaTakip/DosyaTakipForm';
import DosyaTakipDetail from '../pages/DosyaTakip/DosyaTakipDetail';

// 📊 Dashboard Bileşenleri
import TesvikAnalyticsDashboard from './Dashboard/TesvikDashboard';

// 🔐 Admin Panel
import AdminPanel from '../pages/Admin/AdminPanel';

// 📊 Report Center
import ReportCenter from '../pages/Reports/ReportCenter';

// 📁 File Manager
import FileManager from '../pages/Files/FileManager';

const AppRouter = () => {
  // 🛡️ Page refresh handler - F5 basınca 404 engelleme
  usePageRefreshHandler();

  return (
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

      {/* 🛠️ Makine Teçhizat Yönetimi (Geliştiriliyor) */}
      <Route path="/tesvik/makine-yonetimi" element={
        <ProtectedRoute>
          <MakineYonetimi />
        </ProtectedRoute>
      } />

      {/* 🆕 Yeni Teşvik Sistemi */}
      <Route path="/yeni-tesvik" element={
        <ProtectedRoute>
          <YeniTesvikDashboard />
        </ProtectedRoute>
      } />

      <Route path="/yeni-tesvik/liste" element={
        <ProtectedRoute>
          <YeniTesvikList />
        </ProtectedRoute>
      } />

      <Route path="/yeni-tesvik/yeni" element={
        <ProtectedRoute permission="belgeEkle">
          <YeniTesvikForm />
        </ProtectedRoute>
      } />

      <Route path="/yeni-tesvik/:id" element={
        <ProtectedRoute>
          <YeniTesvikDetail />
        </ProtectedRoute>
      } />

      <Route path="/yeni-tesvik/:id/duzenle" element={
        <ProtectedRoute permission="belgeDuzenle">
          <YeniTesvikForm />
        </ProtectedRoute>
      } />

      {/* 🛠️ Yeni Teşvik - Makine Teçhizat Yönetimi */}
      <Route path="/yeni-tesvik/makine-yonetimi" element={
        <ProtectedRoute>
          <YeniMakineYonetimi />
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

      {/* 📋 Dosya İş Akış Takip Sistemi */}
      <Route path="/dosya-takip" element={
        <ProtectedRoute>
          <DosyaTakipDashboard />
        </ProtectedRoute>
      } />
      <Route path="/dosya-takip/liste" element={
        <ProtectedRoute>
          <DosyaTakipList />
        </ProtectedRoute>
      } />
      <Route path="/dosya-takip/yeni" element={
        <ProtectedRoute>
          <DosyaTakipForm />
        </ProtectedRoute>
      } />
      <Route path="/dosya-takip/:id/duzenle" element={
        <ProtectedRoute>
          <DosyaTakipForm />
        </ProtectedRoute>
      } />
      <Route path="/dosya-takip/:id" element={
        <ProtectedRoute>
          <DosyaTakipDetail />
        </ProtectedRoute>
      } />

      {/* 🚫 Catch-all route - 404 durumlarında dashboard'a yönlendir */}
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
};

export default AppRouter;