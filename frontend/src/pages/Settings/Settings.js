// ⚙️ Settings Page - Sistem Ayarları
// Kullanıcı ve sistem ayarları sayfası

import React, { useState } from 'react';
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
  Paper,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  ListItemSecondaryAction,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions
} from '@mui/material';
import {
  Notifications as NotificationsIcon,
  Security as SecurityIcon,
  Palette as PaletteIcon,
  Storage as StorageIcon,
  Email as EmailIcon,
  Save as SaveIcon,
  Cancel as CancelIcon,
  Info as InfoIcon
} from '@mui/icons-material';
import { useAuth } from '../../contexts/AuthContext';

const Settings = () => {
  const { user } = useAuth();
  const [settings, setSettings] = useState({
    // 🔔 Bildirim Ayarları
    emailNotifications: true,
    pushNotifications: false,
    smsNotifications: false,
    reminderNotifications: true,
    
    // 🎨 Arayüz Ayarları
    theme: 'light',
    language: 'tr',
    dateFormat: 'DD/MM/YYYY',
    currency: 'TRY',
    
    // 📊 Veri Ayarları
    autoSave: true,
    backupFrequency: 'daily',
    dataRetention: '365',
    
    // 🔒 Güvenlik Ayarları
    twoFactorAuth: false,
    sessionTimeout: '30',
    passwordExpiry: '90'
  });

  const [openDialog, setOpenDialog] = useState(false);
  const [saveMessage, setSaveMessage] = useState('');

  // 📝 Ayar değişikliği
  const handleSettingChange = (key, value) => {
    setSettings(prev => ({
      ...prev,
      [key]: value
    }));
  };

  // 💾 Ayarları kaydet
  const handleSave = () => {
    // TODO: API call to save settings
    setSaveMessage('Ayarlar başarıyla kaydedildi!');
    setTimeout(() => setSaveMessage(''), 3000);
  };

  // 🔄 Ayarları sıfırla
  const handleReset = () => {
    setOpenDialog(true);
  };

  const confirmReset = () => {
    // TODO: Reset to default settings
    setOpenDialog(false);
    setSaveMessage('Ayarlar varsayılan değerlere sıfırlandı!');
    setTimeout(() => setSaveMessage(''), 3000);
  };

  return (
    <Box>
      {/* 📋 Sayfa Başlığı */}
      <Box sx={{ mb: 3 }}>
        <Typography variant="h4" sx={{ fontWeight: 600, color: 'primary.main', mb: 1 }}>
          ⚙️ Ayarlar
        </Typography>
        <Typography variant="subtitle1" color="text.secondary">
          Sistem ve kullanıcı tercihlerinizi yönetin
        </Typography>
      </Box>

      {saveMessage && (
        <Alert severity="success" sx={{ mb: 3 }}>
          {saveMessage}
        </Alert>
      )}

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
                      checked={settings.emailNotifications}
                      onChange={(e) => handleSettingChange('emailNotifications', e.target.checked)}
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
                      checked={settings.pushNotifications}
                      onChange={(e) => handleSettingChange('pushNotifications', e.target.checked)}
                    />
                  </ListItemSecondaryAction>
                </ListItem>
                
                <ListItem>
                  <ListItemIcon>
                    <InfoIcon />
                  </ListItemIcon>
                  <ListItemText 
                    primary="Hatırlatma Bildirimleri" 
                    secondary="ETUYS ve DYS süre hatırlatmaları"
                  />
                  <ListItemSecondaryAction>
                    <Switch
                      checked={settings.reminderNotifications}
                      onChange={(e) => handleSettingChange('reminderNotifications', e.target.checked)}
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
              
              <Grid container spacing={2}>
                <Grid item xs={12}>
                  <FormControl fullWidth>
                    <InputLabel>Tema</InputLabel>
                    <Select
                      value={settings.theme}
                      label="Tema"
                      onChange={(e) => handleSettingChange('theme', e.target.value)}
                    >
                      <MenuItem value="light">🌞 Açık Tema</MenuItem>
                      <MenuItem value="dark">🌙 Koyu Tema</MenuItem>
                      <MenuItem value="auto">🔄 Otomatik</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>
                
                <Grid item xs={12}>
                  <FormControl fullWidth>
                    <InputLabel>Dil</InputLabel>
                    <Select
                      value={settings.language}
                      label="Dil"
                      onChange={(e) => handleSettingChange('language', e.target.value)}
                    >
                      <MenuItem value="tr">🇹🇷 Türkçe</MenuItem>
                      <MenuItem value="en">🇺🇸 English</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>
                
                <Grid item xs={6}>
                  <FormControl fullWidth>
                    <InputLabel>Tarih Formatı</InputLabel>
                    <Select
                      value={settings.dateFormat}
                      label="Tarih Formatı"
                      onChange={(e) => handleSettingChange('dateFormat', e.target.value)}
                    >
                      <MenuItem value="DD/MM/YYYY">DD/MM/YYYY</MenuItem>
                      <MenuItem value="MM/DD/YYYY">MM/DD/YYYY</MenuItem>
                      <MenuItem value="YYYY-MM-DD">YYYY-MM-DD</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>
                
                <Grid item xs={6}>
                  <FormControl fullWidth>
                    <InputLabel>Para Birimi</InputLabel>
                    <Select
                      value={settings.currency}
                      label="Para Birimi"
                      onChange={(e) => handleSettingChange('currency', e.target.value)}
                    >
                      <MenuItem value="TRY">₺ TL</MenuItem>
                      <MenuItem value="USD">$ USD</MenuItem>
                      <MenuItem value="EUR">€ EUR</MenuItem>
                    </Select>
                  </FormControl>
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
              
              <Grid container spacing={2}>
                <Grid item xs={12}>
                  <FormControlLabel
                    control={
                      <Switch
                        checked={settings.twoFactorAuth}
                        onChange={(e) => handleSettingChange('twoFactorAuth', e.target.checked)}
                      />
                    }
                    label="İki Faktörlü Kimlik Doğrulama"
                  />
                </Grid>
                
                <Grid item xs={6}>
                  <TextField
                    fullWidth
                    label="Oturum Zaman Aşımı (dk)"
                    type="number"
                    value={settings.sessionTimeout}
                    onChange={(e) => handleSettingChange('sessionTimeout', e.target.value)}
                  />
                </Grid>
                
                <Grid item xs={6}>
                  <TextField
                    fullWidth
                    label="Şifre Geçerlilik (gün)"
                    type="number"
                    value={settings.passwordExpiry}
                    onChange={(e) => handleSettingChange('passwordExpiry', e.target.value)}
                  />
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
                <StorageIcon sx={{ color: 'info.main', mr: 1 }} />
                <Typography variant="h6" sx={{ fontWeight: 600 }}>
                  Veri Yönetimi
                </Typography>
              </Box>
              
              <Grid container spacing={2}>
                <Grid item xs={12}>
                  <FormControlLabel
                    control={
                      <Switch
                        checked={settings.autoSave}
                        onChange={(e) => handleSettingChange('autoSave', e.target.checked)}
                      />
                    }
                    label="Otomatik Kaydetme"
                  />
                </Grid>
                
                <Grid item xs={6}>
                  <FormControl fullWidth>
                    <InputLabel>Yedekleme Sıklığı</InputLabel>
                    <Select
                      value={settings.backupFrequency}
                      label="Yedekleme Sıklığı"
                      onChange={(e) => handleSettingChange('backupFrequency', e.target.value)}
                    >
                      <MenuItem value="hourly">Saatlik</MenuItem>
                      <MenuItem value="daily">Günlük</MenuItem>
                      <MenuItem value="weekly">Haftalık</MenuItem>
                      <MenuItem value="monthly">Aylık</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>
                
                <Grid item xs={6}>
                  <TextField
                    fullWidth
                    label="Veri Saklama (gün)"
                    type="number"
                    value={settings.dataRetention}
                    onChange={(e) => handleSettingChange('dataRetention', e.target.value)}
                  />
                </Grid>
              </Grid>
            </CardContent>
          </Card>
        </Grid>

        {/* 📋 Sistem Bilgileri */}
        <Grid item xs={12}>
          <Card>
            <CardContent>
              <Typography variant="h6" sx={{ fontWeight: 600, mb: 3 }}>
                📋 Sistem Bilgileri
              </Typography>
              
              <Grid container spacing={3}>
                <Grid item xs={12} sm={6} md={3}>
                  <Paper sx={{ p: 2, textAlign: 'center', bgcolor: 'grey.50' }}>
                    <Typography variant="h6" sx={{ color: 'primary.main' }}>
                      v1.0.0
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Uygulama Sürümü
                    </Typography>
                  </Paper>
                </Grid>
                
                <Grid item xs={12} sm={6} md={3}>
                  <Paper sx={{ p: 2, textAlign: 'center', bgcolor: 'grey.50' }}>
                    <Typography variant="h6" sx={{ color: 'success.main' }}>
                      Online
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Bağlantı Durumu
                    </Typography>
                  </Paper>
                </Grid>
                
                <Grid item xs={12} sm={6} md={3}>
                  <Paper sx={{ p: 2, textAlign: 'center', bgcolor: 'grey.50' }}>
                    <Typography variant="h6" sx={{ color: 'info.main' }}>
                      MongoDB
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Veritabanı
                    </Typography>
                  </Paper>
                </Grid>
                
                <Grid item xs={12} sm={6} md={3}>
                  <Paper sx={{ p: 2, textAlign: 'center', bgcolor: 'grey.50' }}>
                    <Typography variant="h6" sx={{ color: 'warning.main' }}>
                      {user?.rol || 'User'}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Kullanıcı Rolü
                    </Typography>
                  </Paper>
                </Grid>
              </Grid>
            </CardContent>
          </Card>
        </Grid>

        {/* 💾 İşlem Butonları */}
        <Grid item xs={12}>
          <Box sx={{ display: 'flex', gap: 2, justifyContent: 'flex-end' }}>
            <Button
              variant="outlined"
              startIcon={<CancelIcon />}
              onClick={handleReset}
              color="error"
            >
              Sıfırla
            </Button>
            <Button
              variant="contained"
              startIcon={<SaveIcon />}
              onClick={handleSave}
              sx={{ minWidth: 120 }}
            >
              Kaydet
            </Button>
          </Box>
        </Grid>
      </Grid>

      {/* 🔄 Sıfırlama Onay Dialogu */}
      <Dialog open={openDialog} onClose={() => setOpenDialog(false)}>
        <DialogTitle>Ayarları Sıfırla</DialogTitle>
        <DialogContent>
          <Typography>
            Tüm ayarları varsayılan değerlere sıfırlamak istediğinizden emin misiniz?
            Bu işlem geri alınamaz.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenDialog(false)}>İptal</Button>
          <Button onClick={confirmReset} color="error" variant="contained">
            Sıfırla
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default Settings; 