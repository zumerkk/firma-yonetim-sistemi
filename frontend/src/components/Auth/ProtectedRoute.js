// 🔐 Protected Route Component
// Kimlik doğrulama gerektiren sayfaları korur

import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { Box, CircularProgress, Typography } from '@mui/material';
import { useAuth } from '../../contexts/AuthContext';

const ProtectedRoute = ({ children }) => {
  const { isAuthenticated, loading } = useAuth();
  const { pathname, search, hash, state } = useLocation();

  // Loading durumunda loading göster
  if (loading) {
    return (
      <Box
        sx={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '100vh',
          backgroundColor: 'background.default'
        }}
      >
        <CircularProgress size={60} thickness={4} />
        <Typography variant="h6" sx={{ mt: 2, color: 'text.secondary' }}>
          🔄 Yükleniyor...
        </Typography>
      </Box>
    );
  }

  // Kullanıcı giriş yapmamışsa login sayfasına yönlendir
  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ girisSonrasi: { pathname, search, hash, state } }} />;
  }

  // Giriş yapmışsa children'ı render et
  return children;
};

export default ProtectedRoute;
