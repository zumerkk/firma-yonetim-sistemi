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
  RestoreOutlined as RestoreIcon
} from '@mui/icons-material';
import api from '../../utils/axios';

const Settings = () => {
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });
  const [confirmDialog, setConfirmDialog] = useState({ open: false, type: '' });
  
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

  // 🚀 Load settings on mount
  useEffect(() => {
    loadSettings();
  }, [loadSettings]);

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
      width: '100%',
      height: '100%',
      padding: { xs: '20px', sm: '24px', md: '32px', lg: '40px' },
      boxSizing: 'border-box',
      background: 'linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)',
      overflow: 'auto',
      position: 'relative',
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
      </Container>

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
    </Box>
  );
};

export default Settings; 