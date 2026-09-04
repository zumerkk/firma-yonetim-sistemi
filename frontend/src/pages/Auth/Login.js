// 🔑 Login Page
// Kullanıcı giriş sayfası

import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  TextField,
  Button,
  Typography,
  Alert,
  Container,
  InputAdornment,
  IconButton,
  Divider,
  Link
} from '@mui/material';
import {
  Email as EmailIcon,
  Lock as LockIcon,
  Visibility,
  VisibilityOff,
  Business as BusinessIcon
} from '@mui/icons-material';
import { useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import { useAuth } from '../../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { renk } from '../../tasarim';

// 🎯 Validation Schema
const loginSchema = yup.object({
  email: yup
    .string()
    .email('Geçerli bir e-posta adresi giriniz')
    .required('E-posta adresi zorunludur'),
  sifre: yup
    .string()
    .required('Şifre zorunludur')
    .min(6, 'Şifre en az 6 karakter olmalıdır')
});

const Login = () => {
  const { login, isAuthenticated, loading, error, clearError } = useAuth();
  const navigate = useNavigate();
  const [showPassword, setShowPassword] = useState(false);
  const [submitLoading, setSubmitLoading] = useState(false);

  // 🎣 Form hook
  const {
    register,
    handleSubmit,
    formState: { errors }
  } = useForm({
    resolver: yupResolver(loginSchema),
    defaultValues: {
      email: '',
      sifre: ''
    }
  });

  // 🚀 Giriş yapmışsa dashboard'a yönlendir
  useEffect(() => {
    if (isAuthenticated && !loading) {
      console.log('🎯 Authenticated user detected, redirecting to dashboard...');
      navigate('/dashboard', { replace: true });
    }
  }, [isAuthenticated, loading, navigate]);

  // 🧹 Component mount olduğunda hataları temizle
  useEffect(() => {
    clearError();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Sadece mount'ta çalışsın

  // 📝 Form submit handler
  const onSubmit = async (data) => {
    setSubmitLoading(true);
    
    try {
      const result = await login(data);
      
      if (result.success) {
        // ✅ Giriş başarılı - useEffect otomatik yönlendirecek
        console.log('✅ Login başarılı! AuthContext güncellendi, useEffect yönlendirecek...');
        // navigate kaldırıldı - useEffect yönlendirecek
      }
    } catch (error) {
      console.error('❌ Login error:', error);
    } finally {
      setSubmitLoading(false);
    }
  };

  // 👁️ Şifre görünürlüğü toggle
  const handleTogglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };

  return (
    <Box
      sx={{
        minHeight: '100vh',
        background: renk.zemin,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 2
      }}
    >
      <Container maxWidth="sm">
        <Card 
          elevation={12}
          sx={{ 
            borderRadius: 4,
            overflow: 'hidden',
            boxShadow: '0 8px 32px rgba(0,0,0,0.15)'
          }}
        >
          <CardContent sx={{ p: 4 }}>
            {/* 🏢 Logo ve Başlık */}
            <Box sx={{ textAlign: 'center', mb: 4 }}>
              <Box
                sx={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: 80,
                  height: 80,
                  backgroundColor: 'primary.main',
                  borderRadius: '50%',
                  mb: 2
                }}
              >
                <BusinessIcon sx={{ fontSize: 40, color: 'white' }} />
              </Box>
              
              <Typography variant="h4" component="h1" gutterBottom sx={{ fontWeight: 600, color: 'text.primary' }}>
                GM Planlama Danışmanlık
              </Typography>
              
              <Typography variant="body1" color="text.secondary">
                Modern danışmanlık hizmeti otomasyonu
              </Typography>
            </Box>

            <Divider sx={{ mb: 4 }} />

            {/* 🚨 Hata Mesajı */}
            {error && (
              <Alert 
                severity="error" 
                sx={{ mb: 3 }}
                onClose={clearError}
              >
                {error}
              </Alert>
            )}

            {/* 📋 Giriş Formu */}
            <Box
              component="form"
              onSubmit={handleSubmit(onSubmit)}
              noValidate
            >
              {/* 📧 E-posta */}
              <TextField
                {...register('email')}
                fullWidth
                label="E-posta Adresi"
                type="email"
                autoComplete="email"
                error={!!errors.email}
                helperText={errors.email?.message}
                sx={{ mb: 2 }}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <EmailIcon color="action" />
                    </InputAdornment>
                  ),
                }}
                variant="outlined"
              />

              {/* 🔒 Şifre */}
              <TextField
                {...register('sifre')}
                fullWidth
                label="Şifre"
                type={showPassword ? 'text' : 'password'}
                autoComplete="current-password"
                error={!!errors.sifre}
                helperText={errors.sifre?.message}
                sx={{ mb: 3 }}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <LockIcon color="action" />
                    </InputAdornment>
                  ),
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton
                        onClick={handleTogglePasswordVisibility}
                        edge="end"
                        aria-label="şifre görünürlüğü"
                      >
                        {showPassword ? <VisibilityOff /> : <Visibility />}
                      </IconButton>
                    </InputAdornment>
                  ),
                }}
                variant="outlined"
              />

              {/* 🚀 Giriş Butonu */}
              <Button
                type="submit"
                fullWidth
                variant="contained"
                size="large"
                disabled={submitLoading || loading}
                sx={{
                  py: 1.5,
                  fontSize: '1.1rem',
                  fontWeight: 600,
                  textTransform: 'none'
                }}
              >
                {submitLoading || loading ? (
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <div className="loading-spinner" />
                    Giriş Yapılıyor...
                  </Box>
                ) : (
                  'Giriş Yap'
                )}
              </Button>
            </Box>

            {/* 🔗 Yardım Linkleri */}
            <Box sx={{ textAlign: 'center', mt: 3 }}>
              <Typography variant="body2" color="text.secondary">
                Şifrenizi mi unuttunuz?{' '}
                <Link href="#" color="primary" sx={{ textDecoration: 'none' }}>
                  Şifre Sıfırla
                </Link>
              </Typography>
            </Box>
          </CardContent>
        </Card>

        {/* 📄 Alt Bilgi
            Buradaki metin BEYAZDI (rgba(255,255,255,0.8)) ama sayfa zemini
            #f5f5f5 — yani ilk commit'ten beri görünmüyordu. Yılı da sabit
            yazılmıştı (2024); artık kendiliğinden güncelleniyor. */}
        <Box sx={{ textAlign: 'center', mt: 3 }}>
          <Typography variant="body2" sx={{ color: renk.sessiz }}>
            © {new Date().getFullYear()} GM Planlama Danışmanlık. Tüm hakları saklıdır.
          </Typography>
        </Box>
      </Container>
    </Box>
  );
};

export default Login; 