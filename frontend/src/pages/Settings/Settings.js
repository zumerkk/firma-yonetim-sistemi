// ⚙️ Settings Page - FUNCTIONAL BACKEND INTEGRATION
// Kullanıcı ve sistem ayarları sayfası - Real API calls

import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Typography,
  Grid,
  Card,
  CardContent,
  FormControl,
  FormControlLabel,
  Switch,
  Select,
  MenuItem,
  InputLabel,
  TextField,
  Button,
  Alert,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  ListItemSecondaryAction,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Container,
  Snackbar,
  LinearProgress
} from '@mui/material';
import {
  Notifications as NotificationsIcon,
  Security as SecurityIcon,
  Palette as PaletteIcon,
  Storage as StorageIcon,
  Email as EmailIcon,
  Save as SaveIcon,
  Info as InfoIcon,
  Refresh as RefreshIcon,
  RestoreOutlined as RestoreIcon,
  CloudDownload as CloudDownloadIcon,
  CheckCircle as CheckCircleIcon,
  Backup as BackupIcon
} from '@mui/icons-material';
// 🎯 Layout Components Import
import Header from '../../components/Layout/Header';
import Sidebar from '../../components/Layout/Sidebar';
import api from '../../utils/axios';

const Settings = () => {
  // 🎯 Layout State Management
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 1024);
  
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });
  const [confirmDialog, setConfirmDialog] = useState({ open: false, type: '' });
  
  // 💾 Backup State
  const [backupLoading, setBackupLoading] = useState(false);
  const [backupInfo, setBackupInfo] = useState(null);
  const [backupProgress, setBackupProgress] = useState(0);
  
  const [settings, setSettings] = useState({
    // 🔔 Bildirim Ayarları
    notifications: {
      email: true,
      push: false,
      sms: false,
      reminders: true
    },
    
    // 🎨 Arayüz Ayarları
    ui: {
      theme: 'light',
      language: 'tr',
      dateFormat: 'DD/MM/YYYY',
      currency: 'TRY'
    },
    
    // 📊 Veri Ayarları
    data: {
      autoSave: true,
      backupFrequency: 'daily',
      dataRetention: 365,
      exportFormat: 'excel'
    },
    
    // 🔒 Güvenlik Ayarları
    security: {
      twoFactorAuth: false,
      sessionTimeout: 30,
      passwordExpiry: 90,
      loginAlerts: true
    }
  });

  // 📢 Snackbar helper
  const showSnackbar = useCallback((message, severity = 'success') => {
    setSnackbar({ open: true, message, severity });
  }, []);

  const handleCloseSnackbar = useCallback(() => {
    setSnackbar(prev => ({ ...prev, open: false }));
  }, []);

  // 🔄 Load user settings
  const loadSettings = useCallback(async () => {
    try {
      const response = await api.get('/auth/settings');
      if (response.data.success) {
        setSettings(response.data.data.settings);
      }
    } catch (error) {
      console.error('Settings load error:', error);
      showSnackbar('Ayarlar yüklenirken hata oluştu', 'error');
    } finally {
      setInitialLoading(false);
    }
  }, [showSnackbar]);

  // 💾 Backup info yükle
  const loadBackupInfo = useCallback(async () => {
    try {
      const response = await api.get('/backup/info');
      if (response.data.success) {
        setBackupInfo(response.data.data);
      }
    } catch (error) {
      console.log('Backup info yüklenemedi (admin değilse normal):', error.message);
    }
  }, []);

  // 💾 Sistemi Yedekle
  const handleBackup = async () => {
    setBackupLoading(true);
    setBackupProgress(0);
    
    try {
      // Progress simülasyonu başlat
      const progressInterval = setInterval(() => {
        setBackupProgress(prev => {
          if (prev >= 90) {
            clearInterval(progressInterval);
            return 90;
          }
          return prev + Math.random() * 15;
        });
      }, 500);

      const token = localStorage.getItem('token');
      const baseURL = process.env.REACT_APP_API_URL || 'http://localhost:5001/api';
      
      const response = await fetch(`${baseURL}/backup/full`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      clearInterval(progressInterval);

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.message || `HTTP ${response.status}`);
      }

      setBackupProgress(95);

      // Blob'a çevir ve indirmeyi tetikle
      const blob = await response.blob();
      const sizeMB = (blob.size / (1024 * 1024)).toFixed(2);
      
      // Dosya adını header'dan al
      const contentDisposition = response.headers.get('Content-Disposition');
      let filename = 'GM_Yedek.zip';
      if (contentDisposition) {
        const match = contentDisposition.match(/filename="(.+?)"/);
        if (match) filename = match[1];
      }

      // İndirme linki oluştur
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      setBackupProgress(100);
      showSnackbar(`✅ Yedekleme tamamlandı! (${sizeMB} MB)`, 'success');

    } catch (error) {
      console.error('Backup hatası:', error);
      showSnackbar(`❌ Yedekleme başarısız: ${error.message}`, 'error');
    } finally {
      setBackupLoading(false);
      setTimeout(() => setBackupProgress(0), 3000);
    }
  };

  // 🚀 Load settings on mount
  useEffect(() => {
    loadSettings();
    loadBackupInfo();
  }, [loadSettings, loadBackupInfo]);

  // 📱 Responsive Handling
  useEffect(() => {
    const handleResize = () => {
      const mobile = window.innerWidth < 1024;
      setIsMobile(mobile);
      if (mobile) setSidebarOpen(false);
      else setSidebarOpen(true);
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // 📝 Setting change handler
  const handleSettingChange = (category, key, value) => {
    setSettings(prev => ({
      ...prev,
      [category]: {
        ...prev[category],
        [key]: value
      }
    }));
  };

  // 💾 Save settings
  const handleSave = async () => {
    setLoading(true);
    
    try {
      const response = await api.put('/auth/settings', { settings });
      
      if (response.data.success) {
        showSnackbar('Ayarlar başarıyla kaydedildi!', 'success');
      }
    } catch (error) {
      console.error('Settings save error:', error);
      const errorMessage = error.response?.data?.message || 'Ayarlar kaydedilirken hata oluştu';
      showSnackbar(errorMessage, 'error');
    } finally {
      setLoading(false);
    }
  };

  // 🔄 Reset settings
  const handleReset = () => {
    setConfirmDialog({ open: true, type: 'reset' });
  };

  const confirmReset = async () => {
    setLoading(true);
    setConfirmDialog({ open: false, type: '' });
    
    try {
      // Default settings
      const defaultSettings = {
        notifications: {
          email: true,
          push: false,
          sms: false,
          reminders: true
        },
        ui: {
          theme: 'light',
          language: 'tr',
          dateFormat: 'DD/MM/YYYY',
          currency: 'TRY'
        },
        data: {
          autoSave: true,
          backupFrequency: 'daily',
          dataRetention: 365,
          exportFormat: 'excel'
        },
        security: {
          twoFactorAuth: false,
          sessionTimeout: 30,
          passwordExpiry: 90,
          loginAlerts: true
        }
      };

      const response = await api.put('/auth/settings', { settings: defaultSettings });
      
      if (response.data.success) {
        setSettings(defaultSettings);
        showSnackbar('Ayarlar varsayılan değerlere sıfırlandı!', 'success');
      }
    } catch (error) {
      console.error('Settings reset error:', error);
      showSnackbar('Ayarlar sıfırlanırken hata oluştu', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box sx={{ 
      display: 'grid',
      gridTemplateRows: '64px 1fr',
      gridTemplateColumns: {
        xs: '1fr',
        lg: sidebarOpen ? '280px 1fr' : '1fr'
      },
      gridTemplateAreas: {
        xs: '"header" "content"',
        lg: sidebarOpen ? '"header header" "sidebar content"' : '"header" "content"'
      },
      height: '100vh',
      backgroundColor: '#f8fafc'
    }}>
      {/* Header */}
      <Box sx={{ gridArea: 'header', zIndex: 1201 }}>
        <Header onSidebarToggle={() => setSidebarOpen(!sidebarOpen)} />
      </Box>

      {/* Sidebar */}
      {!isMobile && sidebarOpen && (
        <Box sx={{ gridArea: 'sidebar', zIndex: 1200 }}>
          <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} variant="persistent" />
        </Box>
      )}

      {isMobile && (
        <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} variant="temporary" />
      )}

      {/* Main Content */}
      <Box component="main" sx={{ 
        gridArea: 'content',
        overflow: 'auto',
        p: 3
      }}>
        <Container maxWidth="lg">
          {/* 📱 Sayfa Başlığı */}
          <Box sx={{ mb: 3 }}>
            <Typography variant="h4" sx={{ fontWeight: 600, color: 'primary.main', mb: 1 }}>
              ⚙️ Ayarlar
            </Typography>
            <Typography variant="subtitle1" color="text.secondary">
              Sistem ve kullanıcı tercihlerinizi yönetin
            </Typography>
          </Box>

          {/* 🔄 Initial Loading */}
          {initialLoading ? (
            <LinearProgress sx={{ mb: 3 }} />
          ) : null}

          <Grid container spacing={3}>
            {/* 🔔 Bildirim Ayarları */}
            <Grid item xs={12} md={6}>
              <Card>
                <CardContent>
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
                    <NotificationsIcon sx={{ color: 'primary.main', mr: 1 }} />
                    <Typography variant="h6" sx={{ fontWeight: 600 }}>
                      Bildirim Ayarları
                    </Typography>
                  </Box>
                  
                  <List>
                    <ListItem>
                      <ListItemIcon>
                        <EmailIcon />
                      </ListItemIcon>
                      <ListItemText 
                        primary="E-posta Bildirimleri" 
                        secondary="Önemli güncellemeler için e-posta al"
                      />
                      <ListItemSecondaryAction>
                        <Switch
                          checked={settings.notifications.email}
                          onChange={(e) => handleSettingChange('notifications', 'email', e.target.checked)}
                          disabled={loading}
                        />
                      </ListItemSecondaryAction>
                    </ListItem>
                    
                    <ListItem>
                      <ListItemIcon>
                        <NotificationsIcon />
                      </ListItemIcon>
                      <ListItemText 
                        primary="Push Bildirimleri" 
                        secondary="Tarayıcı bildirimlerini etkinleştir"
                      />
                      <ListItemSecondaryAction>
                        <Switch
                          checked={settings.notifications.push}
                          onChange={(e) => handleSettingChange('notifications', 'push', e.target.checked)}
                          disabled={loading}
                        />
                      </ListItemSecondaryAction>
                    </ListItem>
                    
                    <ListItem>
                      <ListItemIcon>
                        <InfoIcon />
                      </ListItemIcon>
                      <ListItemText 
                        primary="Hatırlatma Bildirimleri" 
                        secondary="ETYUS ve DYS süre hatırlatmaları"
                      />
                      <ListItemSecondaryAction>
                        <Switch
                          checked={settings.notifications.reminders}
                          onChange={(e) => handleSettingChange('notifications', 'reminders', e.target.checked)}
                          disabled={loading}
                        />
                      </ListItemSecondaryAction>
                    </ListItem>
                  </List>
                </CardContent>
              </Card>
            </Grid>

            {/* 🎨 Arayüz Ayarları */}
            <Grid item xs={12} md={6}>
              <Card>
                <CardContent>
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
                    <PaletteIcon sx={{ color: 'secondary.main', mr: 1 }} />
                    <Typography variant="h6" sx={{ fontWeight: 600 }}>
                      Arayüz Ayarları
                    </Typography>
                  </Box>
                  
                  <Grid container spacing={3}>
                    <Grid item xs={12} sm={6}>
                      <FormControl fullWidth>
                        <InputLabel>Tema</InputLabel>
                        <Select
                          value={settings.ui.theme}
                          label="Tema"
                          onChange={(e) => handleSettingChange('ui', 'theme', e.target.value)}
                          disabled={loading}
                        >
                          <MenuItem value="light">Açık Tema</MenuItem>
                          <MenuItem value="dark">Koyu Tema</MenuItem>
                        </Select>
                      </FormControl>
                    </Grid>
                    
                    <Grid item xs={12} sm={6}>
                      <FormControl fullWidth>
                        <InputLabel>Dil</InputLabel>
                        <Select
                          value={settings.ui.language}
                          label="Dil"
                          onChange={(e) => handleSettingChange('ui', 'language', e.target.value)}
                          disabled={loading}
                        >
                          <MenuItem value="tr">Türkçe</MenuItem>
                          <MenuItem value="en">English</MenuItem>
                        </Select>
                      </FormControl>
                    </Grid>
                    
                    <Grid item xs={12} sm={6}>
                      <FormControl fullWidth>
                        <InputLabel>Tarih Formatı</InputLabel>
                        <Select
                          value={settings.ui.dateFormat}
                          label="Tarih Formatı"
                          onChange={(e) => handleSettingChange('ui', 'dateFormat', e.target.value)}
                          disabled={loading}
                        >
                          <MenuItem value="DD/MM/YYYY">DD/MM/YYYY</MenuItem>
                          <MenuItem value="MM/DD/YYYY">MM/DD/YYYY</MenuItem>
                          <MenuItem value="YYYY-MM-DD">YYYY-MM-DD</MenuItem>
                        </Select>
                      </FormControl>
                    </Grid>
                    
                    <Grid item xs={12} sm={6}>
                      <FormControl fullWidth>
                        <InputLabel>Para Birimi</InputLabel>
                        <Select
                          value={settings.ui.currency}
                          label="Para Birimi"
                          onChange={(e) => handleSettingChange('ui', 'currency', e.target.value)}
                          disabled={loading}
                        >
                          <MenuItem value="TRY">Türk Lirası (₺)</MenuItem>
                          <MenuItem value="USD">US Dollar ($)</MenuItem>
                          <MenuItem value="EUR">Euro (€)</MenuItem>
                        </Select>
                      </FormControl>
                    </Grid>
                  </Grid>
                </CardContent>
              </Card>
            </Grid>

            {/* 📊 Veri Ayarları */}
            <Grid item xs={12} md={6}>
              <Card>
                <CardContent>
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
                    <StorageIcon sx={{ color: 'warning.main', mr: 1 }} />
                    <Typography variant="h6" sx={{ fontWeight: 600 }}>
                      Veri Ayarları
                    </Typography>
                  </Box>
                  
                  <Grid container spacing={3}>
                    <Grid item xs={12}>
                      <FormControlLabel
                        control={
                          <Switch
                            checked={settings.data.autoSave}
                            onChange={(e) => handleSettingChange('data', 'autoSave', e.target.checked)}
                            disabled={loading}
                          />
                        }
                        label="Otomatik Kaydetme"
                      />
                    </Grid>
                    
                    <Grid item xs={12} sm={6}>
                      <FormControl fullWidth>
                        <InputLabel>Yedekleme Sıklığı</InputLabel>
                        <Select
                          value={settings.data.backupFrequency}
                          label="Yedekleme Sıklığı"
                          onChange={(e) => handleSettingChange('data', 'backupFrequency', e.target.value)}
                          disabled={loading}
                        >
                          <MenuItem value="daily">Günlük</MenuItem>
                          <MenuItem value="weekly">Haftalık</MenuItem>
                          <MenuItem value="monthly">Aylık</MenuItem>
                        </Select>
                      </FormControl>
                    </Grid>
                    
                    <Grid item xs={12} sm={6}>
                      <TextField
                        fullWidth
                        label="Veri Saklama (Gün)"
                        type="number"
                        value={settings.data.dataRetention}
                        onChange={(e) => handleSettingChange('data', 'dataRetention', parseInt(e.target.value) || 365)}
                        disabled={loading}
                        inputProps={{ min: 30, max: 3650 }}
                      />
                    </Grid>
                  </Grid>
                </CardContent>
              </Card>
            </Grid>

            {/* 🔒 Güvenlik Ayarları */}
            <Grid item xs={12} md={6}>
              <Card>
                <CardContent>
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
                    <SecurityIcon sx={{ color: 'error.main', mr: 1 }} />
                    <Typography variant="h6" sx={{ fontWeight: 600 }}>
                      Güvenlik Ayarları
                    </Typography>
                  </Box>
                  
                  <Grid container spacing={3}>
                    <Grid item xs={12}>
                      <FormControlLabel
                        control={
                          <Switch
                            checked={settings.security.twoFactorAuth}
                            onChange={(e) => handleSettingChange('security', 'twoFactorAuth', e.target.checked)}
                            disabled={loading}
                          />
                        }
                        label="İki Faktörlü Doğrulama"
                      />
                    </Grid>
                    
                    <Grid item xs={12} sm={6}>
                      <TextField
                        fullWidth
                        label="Oturum Zaman Aşımı (Dakika)"
                        type="number"
                        value={settings.security.sessionTimeout}
                        onChange={(e) => handleSettingChange('security', 'sessionTimeout', parseInt(e.target.value) || 30)}
                        disabled={loading}
                        inputProps={{ min: 5, max: 480 }}
                      />
                    </Grid>
                    
                    <Grid item xs={12} sm={6}>
                      <TextField
                        fullWidth
                        label="Şifre Geçerlilik (Gün)"
                        type="number"
                        value={settings.security.passwordExpiry}
                        onChange={(e) => handleSettingChange('security', 'passwordExpiry', parseInt(e.target.value) || 90)}
                        disabled={loading}
                        inputProps={{ min: 30, max: 365 }}
                      />
                    </Grid>
                    
                    <Grid item xs={12}>
                      <FormControlLabel
                        control={
                          <Switch
                            checked={settings.security.loginAlerts}
                            onChange={(e) => handleSettingChange('security', 'loginAlerts', e.target.checked)}
                            disabled={loading}
                          />
                        }
                        label="Giriş Uyarıları"
                      />
                    </Grid>
                  </Grid>
                </CardContent>
              </Card>
            </Grid>

            {/* 💾 Sistem Yedeği */}
            <Grid item xs={12}>
              <Card sx={{ 
                background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #334155 100%)',
                color: 'white',
                position: 'relative',
                overflow: 'hidden',
                borderRadius: 3,
                boxShadow: '0 10px 40px rgba(0,0,0,0.3)'
              }}>
                {/* Dekoratif arka plan efekti */}
                <Box sx={{
                  position: 'absolute',
                  top: -50,
                  right: -50,
                  width: 200,
                  height: 200,
                  borderRadius: '50%',
                  background: 'radial-gradient(circle, rgba(56,189,248,0.15) 0%, transparent 70%)',
                  pointerEvents: 'none'
                }} />
                <Box sx={{
                  position: 'absolute',
                  bottom: -30,
                  left: -30,
                  width: 150,
                  height: 150,
                  borderRadius: '50%',
                  background: 'radial-gradient(circle, rgba(168,85,247,0.1) 0%, transparent 70%)',
                  pointerEvents: 'none'
                }} />

                <CardContent sx={{ p: 4, position: 'relative', zIndex: 1 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
                    <Box sx={{
                      width: 48,
                      height: 48,
                      borderRadius: 2,
                      background: 'linear-gradient(135deg, #38bdf8, #818cf8)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      mr: 2,
                      boxShadow: '0 4px 15px rgba(56,189,248,0.3)'
                    }}>
                      <BackupIcon sx={{ fontSize: 28, color: 'white' }} />
                    </Box>
                    <Box>
                      <Typography variant="h5" sx={{ fontWeight: 700, letterSpacing: '-0.02em' }}>
                        💾 Sistem Yedeği
                      </Typography>
                      <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.6)', mt: 0.5 }}>
                        Tüm veritabanını ZIP olarak indirin
                      </Typography>
                    </Box>
                  </Box>

                  {/* İstatistik kartları */}
                  {backupInfo && (
                    <Grid container spacing={2} sx={{ mb: 3 }}>
                      <Grid item xs={4}>
                        <Box sx={{
                          background: 'rgba(255,255,255,0.06)',
                          borderRadius: 2,
                          p: 2,
                          textAlign: 'center',
                          border: '1px solid rgba(255,255,255,0.08)'
                        }}>
                          <Typography variant="h4" sx={{ fontWeight: 700, color: '#38bdf8' }}>
                            {backupInfo.collectionSayisi}
                          </Typography>
                          <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.5)' }}>
                            Tablo
                          </Typography>
                        </Box>
                      </Grid>
                      <Grid item xs={4}>
                        <Box sx={{
                          background: 'rgba(255,255,255,0.06)',
                          borderRadius: 2,
                          p: 2,
                          textAlign: 'center',
                          border: '1px solid rgba(255,255,255,0.08)'
                        }}>
                          <Typography variant="h4" sx={{ fontWeight: 700, color: '#a78bfa' }}>
                            {backupInfo.toplamKayit?.toLocaleString('tr-TR') || '0'}
                          </Typography>
                          <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.5)' }}>
                            Toplam Kayıt
                          </Typography>
                        </Box>
                      </Grid>
                      <Grid item xs={4}>
                        <Box sx={{
                          background: 'rgba(255,255,255,0.06)',
                          borderRadius: 2,
                          p: 2,
                          textAlign: 'center',
                          border: '1px solid rgba(255,255,255,0.08)'
                        }}>
                          <Typography variant="h4" sx={{ fontWeight: 700, color: '#34d399' }}>
                            {backupInfo.tahminiSure?.replace('~', '') || '-'}
                          </Typography>
                          <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.5)' }}>
                            Tahmini Süre
                          </Typography>
                        </Box>
                      </Grid>
                    </Grid>
                  )}

                  {/* Progress bar */}
                  {backupLoading && (
                    <Box sx={{ mb: 3 }}>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                        <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.7)' }}>
                          {backupProgress < 90 ? 'Veriler toplanıyor...' : backupProgress < 100 ? 'ZIP paketleniyor...' : '✅ Tamamlandı!'}
                        </Typography>
                        <Typography variant="body2" sx={{ color: '#38bdf8', fontWeight: 600 }}>
                          %{Math.round(backupProgress)}
                        </Typography>
                      </Box>
                      <LinearProgress
                        variant="determinate"
                        value={backupProgress}
                        sx={{
                          height: 8,
                          borderRadius: 4,
                          backgroundColor: 'rgba(255,255,255,0.1)',
                          '& .MuiLinearProgress-bar': {
                            borderRadius: 4,
                            background: backupProgress >= 100
                              ? 'linear-gradient(90deg, #34d399, #10b981)'
                              : 'linear-gradient(90deg, #38bdf8, #818cf8, #a78bfa)'
                          }
                        }}
                      />
                    </Box>
                  )}

                  {/* Yedekle butonu */}
                  <Button
                    variant="contained"
                    size="large"
                    fullWidth
                    onClick={handleBackup}
                    disabled={backupLoading || initialLoading}
                    startIcon={backupProgress >= 100 ? <CheckCircleIcon /> : <CloudDownloadIcon />}
                    sx={{
                      py: 1.5,
                      fontSize: '1rem',
                      fontWeight: 700,
                      borderRadius: 2,
                      background: backupLoading
                        ? 'rgba(255,255,255,0.1)'
                        : 'linear-gradient(135deg, #38bdf8 0%, #818cf8 100%)',
                      boxShadow: backupLoading ? 'none' : '0 4px 20px rgba(56,189,248,0.3)',
                      textTransform: 'none',
                      letterSpacing: '0.02em',
                      '&:hover': {
                        background: 'linear-gradient(135deg, #0ea5e9 0%, #6366f1 100%)',
                        boxShadow: '0 6px 25px rgba(56,189,248,0.4)',
                        transform: 'translateY(-1px)'
                      },
                      '&.Mui-disabled': {
                        color: 'rgba(255,255,255,0.4)',
                        background: 'rgba(255,255,255,0.08)'
                      },
                      transition: 'all 0.3s ease'
                    }}
                  >
                    {backupLoading ? 'Yedekleniyor...' : '🔽 Sistemi Yedekle (ZIP)'}
                  </Button>

                  <Typography variant="caption" sx={{ display: 'block', mt: 2, color: 'rgba(255,255,255,0.4)', textAlign: 'center' }}>
                    Firmalar • Eski Teşvik Belgeleri • Yeni Teşvik Belgeleri • Makine Listeleri • Dosya Takip • Tüm Referans Tabloları
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          </Grid>

          {/* 💾 Action Buttons */}
          <Box sx={{ display: 'flex', gap: 2, mt: 4, justifyContent: 'center' }}>
            <Button
              variant="contained"
              startIcon={<SaveIcon />}
              onClick={handleSave}
              disabled={loading || initialLoading}
              sx={{ minWidth: 150 }}
            >
              {loading ? 'Kaydediliyor...' : 'Ayarları Kaydet'}
            </Button>
            
            <Button
              variant="outlined"
              startIcon={<RefreshIcon />}
              onClick={loadSettings}
              disabled={loading || initialLoading}
            >
              Yenile
            </Button>
            
            <Button
              variant="outlined"
              color="warning"
              startIcon={<RestoreIcon />}
              onClick={handleReset}
              disabled={loading || initialLoading}
            >
              Sıfırla
            </Button>
          </Box>

          {/* 🔄 Confirmation Dialog */}
          <Dialog open={confirmDialog.open} onClose={() => setConfirmDialog({ open: false, type: '' })}>
            <DialogTitle>Ayarları Sıfırla</DialogTitle>
            <DialogContent>
              <Typography>
                Tüm ayarları varsayılan değerlere sıfırlamak istediğinizden emin misiniz? 
                Bu işlem geri alınamaz.
              </Typography>
            </DialogContent>
            <DialogActions>
              <Button onClick={() => setConfirmDialog({ open: false, type: '' })}>
                İptal
              </Button>
              <Button onClick={confirmReset} color="warning" variant="contained">
                Sıfırla
              </Button>
            </DialogActions>
          </Dialog>

          {/* 📢 Snackbar */}
          <Snackbar
            open={snackbar.open}
            autoHideDuration={4000}
            onClose={handleCloseSnackbar}
            anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
          >
            <Alert
              onClose={handleCloseSnackbar}
              severity={snackbar.severity}
              variant="filled"
              sx={{ width: '100%' }}
            >
              {snackbar.message}
            </Alert>
          </Snackbar>
        </Container>
      </Box>
    </Box>
  );
};

export default Settings; 