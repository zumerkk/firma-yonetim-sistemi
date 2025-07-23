// 👤 Profile Page - FUNCTIONAL PROFESSIONAL EDITION
// Kullanıcı profil yönetimi sayfası - Edit, Password Change, Activity History

import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Typography,
  Grid,
  Card,
  CardContent,
  TextField,
  Button,
  Avatar,
  IconButton,
  Alert,
  Snackbar,
  Tabs,
  Tab,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Chip,
  LinearProgress,
  Stack,
  Paper
} from '@mui/material';
import {
  Person as PersonIcon,
  Edit as EditIcon,
  Lock as LockIcon,
  History as HistoryIcon,
  Save as SaveIcon,
  Visibility as VisibilityIcon,
  VisibilityOff as VisibilityOffIcon,
  Email as EmailIcon,
  Phone as PhoneIcon,
  AdminPanelSettings as AdminIcon,
  Business as BusinessIcon,
  AccessTime as TimeIcon
} from '@mui/icons-material';
import { useAuth } from '../../contexts/AuthContext';
import api from '../../utils/axios';
import activityService from '../../services/activityService';

const Profile = () => {
  const { user, updateUser } = useAuth();
  const [activeTab, setActiveTab] = useState(0);
  const [loading, setLoading] = useState(false);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });
  
  // 👤 Profile Edit State
  const [profileData, setProfileData] = useState({
    adSoyad: '',
    telefon: '',
    notlar: ''
  });
  const [profileErrors, setProfileErrors] = useState({});

  // 🔒 Password Change State
  const [passwordData, setPasswordData] = useState({
    eskiSifre: '',
    yeniSifre: '',
    yeniSifreTekrar: ''
  });
  const [passwordErrors, setPasswordErrors] = useState({});
  const [showPasswords, setShowPasswords] = useState({
    eskiSifre: false,
    yeniSifre: false,
    yeniSifreTekrar: false
  });

  // 📋 Activity History State
  const [activities, setActivities] = useState([]);
  const [activityLoading, setActivityLoading] = useState(false);

  // 🚀 Initialize profile data
  useEffect(() => {
    if (user) {
      setProfileData({
        adSoyad: user.adSoyad || '',
        telefon: user.telefon || '',
        notlar: user.notlar || ''
      });
    }
  }, [user]);

  // 📢 Snackbar helper
  const showSnackbar = useCallback((message, severity = 'success') => {
    setSnackbar({ open: true, message, severity });
  }, []);

  const handleCloseSnackbar = useCallback(() => {
    setSnackbar(prev => ({ ...prev, open: false }));
  }, []);

  // 👤 Profile Update Handler
  const handleProfileUpdate = async () => {
    setLoading(true);
    setProfileErrors({});

    try {
      const response = await api.put('/auth/profile', profileData);
      
      if (response.data.success) {
        updateUser(response.data.data.user);
        showSnackbar('Profil başarıyla güncellendi!', 'success');
      }
    } catch (error) {
      console.error('Profile update error:', error);
      const errorMessage = error.response?.data?.message || 'Profil güncellenirken hata oluştu';
      showSnackbar(errorMessage, 'error');
      
      if (error.response?.data?.errors) {
        const errors = {};
        error.response.data.errors.forEach(err => {
          errors[err.path] = err.msg;
        });
        setProfileErrors(errors);
      }
    } finally {
      setLoading(false);
    }
  };

  // 🔒 Password Change Handler
  const handlePasswordChange = async () => {
    setLoading(true);
    setPasswordErrors({});

    // Frontend validation
    const errors = {};
    if (!passwordData.eskiSifre) errors.eskiSifre = 'Mevcut şifre zorunludur';
    if (!passwordData.yeniSifre) errors.yeniSifre = 'Yeni şifre zorunludur';
    if (passwordData.yeniSifre.length < 6) errors.yeniSifre = 'Yeni şifre en az 6 karakter olmalıdır';
    if (passwordData.yeniSifre !== passwordData.yeniSifreTekrar) {
      errors.yeniSifreTekrar = 'Şifreler eşleşmiyor';
    }

    if (Object.keys(errors).length > 0) {
      setPasswordErrors(errors);
      setLoading(false);
      return;
    }

    try {
      const response = await api.put('/auth/change-password', {
        eskiSifre: passwordData.eskiSifre,
        yeniSifre: passwordData.yeniSifre
      });
      
      if (response.data.success) {
        showSnackbar('Şifre başarıyla değiştirildi!', 'success');
        setPasswordData({ eskiSifre: '', yeniSifre: '', yeniSifreTekrar: '' });
      }
    } catch (error) {
      console.error('Password change error:', error);
      const errorMessage = error.response?.data?.message || 'Şifre değiştirilirken hata oluştu';
      showSnackbar(errorMessage, 'error');
    } finally {
      setLoading(false);
    }
  };

  // 📋 Load user activities
  const loadUserActivities = useCallback(async () => {
    if (activeTab !== 2) return; // Only load when activity tab is active
    
    setActivityLoading(true);
    try {
      const result = await activityService.getUserActivities(user._id, { limit: 20 });
      if (result.success) {
        setActivities(result.data.activities || []);
      }
    } catch (error) {
      console.error('User activities error:', error);
      showSnackbar('Aktiviteler yüklenirken hata oluştu', 'error');
    } finally {
      setActivityLoading(false);
    }
  }, [activeTab, user._id, showSnackbar]);

  useEffect(() => {
    loadUserActivities();
  }, [loadUserActivities]);

  // 🎨 Tab change handler
  const handleTabChange = (event, newValue) => {
    setActiveTab(newValue);
  };

  // 👁️ Password visibility toggle
  const togglePasswordVisibility = (field) => {
    setShowPasswords(prev => ({
      ...prev,
      [field]: !prev[field]
    }));
  };

  // 🎨 Get role color and icon
  const getRoleInfo = (role) => {
    switch (role) {
      case 'admin':
        return { color: '#dc2626', icon: <AdminIcon />, label: 'Yönetici' };
      case 'kullanici':
        return { color: '#059669', icon: <PersonIcon />, label: 'Kullanıcı' };
      case 'readonly':
        return { color: '#64748b', icon: <VisibilityIcon />, label: 'Sadece Görüntüleme' };
      default:
        return { color: '#64748b', icon: <PersonIcon />, label: 'Bilinmeyen' };
    }
  };

  const roleInfo = getRoleInfo(user?.rol);

  return (
    <Box sx={{ 
      width: '100%',
      height: '100%',
      padding: { xs: '20px', sm: '24px', md: '32px', lg: '40px' },
      background: 'linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)',
      overflow: 'auto'
    }}>
      {/* 📱 Page Header */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" sx={{ fontWeight: 600, color: 'primary.main', mb: 1 }}>
        👤 Profil Ayarları
        </Typography>
        <Typography variant="subtitle1" color="text.secondary">
          Kişisel bilgilerinizi ve hesap ayarlarınızı yönetin
        </Typography>
      </Box>

      <Grid container spacing={3}>
        {/* 👤 Profile Summary Card */}
        <Grid item xs={12} md={4}>
          <Card sx={{ 
            borderRadius: 3,
            background: 'linear-gradient(135deg, #1e40af 0%, #3b82f6 100%)',
            color: 'white',
            position: 'sticky',
            top: 0
          }}>
            <CardContent sx={{ textAlign: 'center', p: 3 }}>
              <Avatar sx={{ 
                width: 80, 
                height: 80, 
                mx: 'auto', 
                mb: 2,
                bgcolor: 'rgba(255,255,255,0.2)',
                fontSize: '2rem'
              }}>
                {user?.adSoyad?.charAt(0)?.toUpperCase() || 'U'}
              </Avatar>
              
              <Typography variant="h6" sx={{ fontWeight: 600, mb: 1 }}>
                {user?.adSoyad || 'Kullanıcı'}
              </Typography>
              
              <Chip 
                icon={roleInfo.icon}
                label={roleInfo.label}
                sx={{ 
                  bgcolor: 'rgba(255,255,255,0.2)', 
                  color: 'white',
                  mb: 2
                }}
              />
              
              <Stack spacing={1} sx={{ textAlign: 'left' }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <EmailIcon sx={{ fontSize: 16 }} />
                  <Typography variant="body2" sx={{ opacity: 0.9 }}>
                    {user?.email}
                  </Typography>
                </Box>
                
                {user?.telefon && (
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <PhoneIcon sx={{ fontSize: 16 }} />
                    <Typography variant="body2" sx={{ opacity: 0.9 }}>
                      {user.telefon}
                    </Typography>
                  </Box>
                )}
                
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <TimeIcon sx={{ fontSize: 16 }} />
                  <Typography variant="body2" sx={{ opacity: 0.9 }}>
                    Üyelik: {new Date(user?.createdAt).toLocaleDateString('tr-TR')}
                  </Typography>
                </Box>
              </Stack>
            </CardContent>
          </Card>
        </Grid>

        {/* 📝 Main Content */}
        <Grid item xs={12} md={8}>
          <Card sx={{ borderRadius: 3 }}>
            <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
              <Tabs value={activeTab} onChange={handleTabChange}>
                <Tab icon={<EditIcon />} label="Profil Düzenle" />
                <Tab icon={<LockIcon />} label="Şifre Değiştir" />
                <Tab icon={<HistoryIcon />} label="Aktiviteler" />
              </Tabs>
            </Box>

            <CardContent sx={{ p: 3 }}>
              {/* 👤 Profile Edit Tab */}
              {activeTab === 0 && (
                <Box>
                  <Typography variant="h6" sx={{ mb: 3, fontWeight: 600 }}>
                    Profil Bilgilerini Düzenle
                  </Typography>
                  
                  <Grid container spacing={3}>
                    <Grid item xs={12}>
                      <TextField
                        fullWidth
                        label="Ad Soyad"
                        value={profileData.adSoyad}
                        onChange={(e) => setProfileData(prev => ({ ...prev, adSoyad: e.target.value }))}
                        error={!!profileErrors.adSoyad}
                        helperText={profileErrors.adSoyad}
                        InputProps={{
                          startAdornment: <PersonIcon sx={{ mr: 1, color: 'text.secondary' }} />
                        }}
                      />
                    </Grid>
                    
                    <Grid item xs={12}>
                      <TextField
                        fullWidth
                        label="Telefon"
                        value={profileData.telefon}
                        onChange={(e) => setProfileData(prev => ({ ...prev, telefon: e.target.value }))}
                        error={!!profileErrors.telefon}
                        helperText={profileErrors.telefon}
                        InputProps={{
                          startAdornment: <PhoneIcon sx={{ mr: 1, color: 'text.secondary' }} />
                        }}
                      />
                    </Grid>
                    
                    <Grid item xs={12}>
                      <TextField
                        fullWidth
                        label="Notlar"
                        multiline
                        rows={3}
                        value={profileData.notlar}
                        onChange={(e) => setProfileData(prev => ({ ...prev, notlar: e.target.value }))}
                        error={!!profileErrors.notlar}
                        helperText={profileErrors.notlar || 'Kendiniz hakkında kısa notlar (maksimum 500 karakter)'}
                        inputProps={{ maxLength: 500 }}
                      />
                    </Grid>
                  </Grid>
                  
                  <Box sx={{ display: 'flex', gap: 2, mt: 3 }}>
                    <Button
                      variant="contained"
                      startIcon={<SaveIcon />}
                      onClick={handleProfileUpdate}
                      disabled={loading}
                      sx={{ minWidth: 140 }}
                    >
                      {loading ? 'Kaydediliyor...' : 'Kaydet'}
                    </Button>
                  </Box>
                </Box>
              )}

              {/* 🔒 Password Change Tab */}
              {activeTab === 1 && (
                <Box>
                  <Typography variant="h6" sx={{ mb: 3, fontWeight: 600 }}>
                    Şifre Değiştir
                  </Typography>
                  
                  <Grid container spacing={3}>
                    <Grid item xs={12}>
                      <TextField
                        fullWidth
                        label="Mevcut Şifre"
                        type={showPasswords.eskiSifre ? 'text' : 'password'}
                        value={passwordData.eskiSifre}
                        onChange={(e) => setPasswordData(prev => ({ ...prev, eskiSifre: e.target.value }))}
                        error={!!passwordErrors.eskiSifre}
                        helperText={passwordErrors.eskiSifre}
                        InputProps={{
                          startAdornment: <LockIcon sx={{ mr: 1, color: 'text.secondary' }} />,
                          endAdornment: (
                            <IconButton onClick={() => togglePasswordVisibility('eskiSifre')}>
                              {showPasswords.eskiSifre ? <VisibilityOffIcon /> : <VisibilityIcon />}
                            </IconButton>
                          )
                        }}
                      />
                    </Grid>
                    
                    <Grid item xs={12}>
                      <TextField
                        fullWidth
                        label="Yeni Şifre"
                        type={showPasswords.yeniSifre ? 'text' : 'password'}
                        value={passwordData.yeniSifre}
                        onChange={(e) => setPasswordData(prev => ({ ...prev, yeniSifre: e.target.value }))}
                        error={!!passwordErrors.yeniSifre}
                        helperText={passwordErrors.yeniSifre || 'En az 6 karakter, büyük harf, küçük harf ve rakam içermeli'}
                        InputProps={{
                          startAdornment: <LockIcon sx={{ mr: 1, color: 'text.secondary' }} />,
                          endAdornment: (
                            <IconButton onClick={() => togglePasswordVisibility('yeniSifre')}>
                              {showPasswords.yeniSifre ? <VisibilityOffIcon /> : <VisibilityIcon />}
                            </IconButton>
                          )
                        }}
                      />
                    </Grid>
                    
                    <Grid item xs={12}>
                      <TextField
                        fullWidth
                        label="Yeni Şifre Tekrar"
                        type={showPasswords.yeniSifreTekrar ? 'text' : 'password'}
                        value={passwordData.yeniSifreTekrar}
                        onChange={(e) => setPasswordData(prev => ({ ...prev, yeniSifreTekrar: e.target.value }))}
                        error={!!passwordErrors.yeniSifreTekrar}
                        helperText={passwordErrors.yeniSifreTekrar}
                        InputProps={{
                          startAdornment: <LockIcon sx={{ mr: 1, color: 'text.secondary' }} />,
                          endAdornment: (
                            <IconButton onClick={() => togglePasswordVisibility('yeniSifreTekrar')}>
                              {showPasswords.yeniSifreTekrar ? <VisibilityOffIcon /> : <VisibilityIcon />}
                            </IconButton>
                          )
                        }}
                      />
                    </Grid>
                  </Grid>
                  
                  <Box sx={{ display: 'flex', gap: 2, mt: 3 }}>
                    <Button
                      variant="contained"
                      startIcon={<SaveIcon />}
                      onClick={handlePasswordChange}
                      disabled={loading}
                      sx={{ minWidth: 140 }}
                    >
                      {loading ? 'Değiştiriliyor...' : 'Şifre Değiştir'}
                    </Button>
                  </Box>
                </Box>
              )}

              {/* 📋 Activity History Tab */}
              {activeTab === 2 && (
                <Box>
                  <Typography variant="h6" sx={{ mb: 3, fontWeight: 600 }}>
                    Son Aktiviteler
                  </Typography>
                  
                  {activityLoading ? (
                    <LinearProgress />
                  ) : activities.length > 0 ? (
                    <List>
                      {activities.map((activity, index) => (
                        <ListItem key={activity._id} divider={index < activities.length - 1}>
                          <ListItemIcon>
                            <BusinessIcon color="primary" />
                          </ListItemIcon>
                          <ListItemText
                            primary={activity.mesaj}
                            secondary={`${new Date(activity.createdAt).toLocaleString('tr-TR')} - ${activity.kategori}`}
                          />
                          <Chip 
                            label={activity.aksiyon} 
                            size="small" 
                            color="primary" 
                            variant="outlined" 
                          />
                        </ListItem>
                      ))}
                    </List>
                  ) : (
                    <Paper sx={{ p: 4, textAlign: 'center', bgcolor: 'grey.50' }}>
                      <HistoryIcon sx={{ fontSize: 48, color: 'grey.400', mb: 2 }} />
                      <Typography variant="h6" color="text.secondary">
                        Henüz aktivite bulunmuyor
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Sistem üzerinde yaptığınız işlemler burada görünecek
        </Typography>
      </Paper>
                  )}
                </Box>
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>

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

export default Profile; 