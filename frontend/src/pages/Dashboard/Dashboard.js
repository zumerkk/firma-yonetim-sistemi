// 🏠 ENTERPRISE DASHBOARD PAGE
// Ana dashboard sayfası - Firma istatistikleri ve özet bilgiler
// Corporate-level professional design

import React, { useEffect } from 'react';
import {
  Box,
  Grid,
  Card,
  CardContent,
  Typography,
  Button,
  Avatar,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
  Chip,
  Divider,
  IconButton,
  Tooltip
} from '@mui/material';
import {
  Business as BusinessIcon,
  Add as AddIcon,
  TrendingUp as TrendingUpIcon,
  People as PeopleIcon,
  LocationOn as LocationIcon,
  Schedule as ScheduleIcon,
  Assessment as AssessmentIcon,
  Refresh as RefreshIcon,
  Visibility as VisibilityIcon,
  BarChart as ChartIcon
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useFirma } from '../../contexts/FirmaContext';

const Dashboard = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { stats, fetchStats, firmalar, fetchFirmalar } = useFirma();

  // 🚀 Component mount olduğunda verileri yükle
  useEffect(() => {
    const loadData = async () => {
      try {
        await fetchStats();
        await fetchFirmalar({ limit: 5 }); // Son 5 firmayı getir
      } catch (error) {
        console.error('Dashboard veri yükleme hatası:', error);
      }
    };
    
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Empty dependency array - sadece mount'ta çalış

  // 🔄 Verileri yenile
  const handleRefresh = async () => {
    await Promise.all([
      fetchStats(),
      fetchFirmalar({ limit: 5 })
    ]);
  };

  // 🎯 Hızlı işlemler - Professional Actions
  const quickActions = [
    {
      title: 'Yeni Firma Ekle',
      icon: <AddIcon sx={{ fontSize: 28 }} />,
      color: '#2e7d32',
      gradient: 'linear-gradient(135deg, #4caf50 0%, #2e7d32 100%)',
      action: () => navigate('/firmalar/yeni'),
      description: 'Yeni firma kaydı oluştur',
      subtitle: 'Excel formatında kayıt'
    },
    {
      title: 'Firma Listesi',
      icon: <BusinessIcon sx={{ fontSize: 28 }} />,
      color: '#1976d2',
      gradient: 'linear-gradient(135deg, #2196f3 0%, #1976d2 100%)',
      action: () => navigate('/firmalar'),
      description: 'Tüm firmaları görüntüle',
      subtitle: '1185 firma kayıtlı'
    },
    {
      title: 'İstatistikler',
      icon: <AssessmentIcon sx={{ fontSize: 28 }} />,
      color: '#9c27b0',
      gradient: 'linear-gradient(135deg, #e91e63 0%, #9c27b0 100%)',
      action: () => navigate('/istatistikler'),
      description: 'Detaylı raporları incele',
      subtitle: 'Grafik ve analiz'
    }
  ];

  // 📊 İstatistik kartları - Professional Stats
  const statCards = [
    {
      title: 'Toplam Firma',
      value: stats?.toplamFirma || 0,
      icon: <BusinessIcon sx={{ fontSize: 32 }} />,
      color: '#1976d2',
      gradient: 'linear-gradient(135deg, #2196f3 0%, #1976d2 100%)',
      subtitle: 'Sistemdeki toplam firma sayısı',
      change: '+12',
      changeType: 'positive'
    },
    {
      title: 'Aktif Firmalar',
      value: stats?.aktifFirma || 0,
      icon: <TrendingUpIcon sx={{ fontSize: 32 }} />,
      color: '#2e7d32',
      gradient: 'linear-gradient(135deg, #4caf50 0%, #2e7d32 100%)',
      subtitle: 'Aktif durumda olan firmalar',
      change: '+8',
      changeType: 'positive'
    },
    {
      title: 'ETUYS Süresi Yaklaşan',
      value: stats?.etuysSuresiYaklasan || 0,
      icon: <ScheduleIcon sx={{ fontSize: 32 }} />,
      color: '#f57c00',
      gradient: 'linear-gradient(135deg, #ff9800 0%, #f57c00 100%)',
      subtitle: '30 gün içinde süre dolacak',
      change: '3',
      changeType: 'warning'
    },
    {
      title: 'Farklı İl',
      value: stats?.farkliIl || 0,
      icon: <LocationIcon sx={{ fontSize: 32 }} />,
      color: '#9c27b0',
      gradient: 'linear-gradient(135deg, #e91e63 0%, #9c27b0 100%)',
      subtitle: 'Yabancı sermayeli firmaların il sayısı',
      change: '2',
      changeType: 'info'
    }
  ];

  return (
    <Box className="fade-in">
      {/* 👋 Professional Welcome Section */}
      <Box className="glass-card" sx={{ mb: 4, p: 4, position: 'relative', overflow: 'hidden' }}>
        {/* Background decoration */}
        <Box sx={{
          position: 'absolute',
          top: -20,
          right: -20,
          width: 120,
          height: 120,
          background: 'linear-gradient(135deg, rgba(33, 150, 243, 0.1), rgba(25, 118, 210, 0.1))',
          borderRadius: '50%',
          filter: 'blur(40px)'
        }} />
        
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Box>
            <Typography variant="h4" component="h1" sx={{ 
              fontWeight: 600,
              color: '#424242',
              mb: 1
            }}>
              Hoş geldiniz, {user?.adSoyad || 'Sistem Yöneticisi'}
            </Typography>
            <Typography variant="body1" color="text.secondary" sx={{ mb: 2 }}>
              Firma yönetim sistemi - Ana kontrol paneli
            </Typography>
            <Chip 
              label="Profesyonel Sürüm" 
              size="small" 
              variant="outlined"
              sx={{
                borderColor: '#1976d2',
                color: '#1976d2',
                fontWeight: 500,
                fontSize: '0.75rem'
              }}
            />
          </Box>
          
          <Tooltip title="Verileri Yenile" arrow>
            <IconButton 
              onClick={handleRefresh}
              sx={{ 
                width: 48, 
                height: 48,
                border: '1px solid #e0e0e0',
                '&:hover': {
                  backgroundColor: '#f5f5f5',
                  borderColor: '#1976d2'
                }
              }}
            >
              <RefreshIcon />
            </IconButton>
          </Tooltip>
        </Box>
      </Box>

      {/* 📊 Professional Statistics Cards */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        {statCards.map((stat, index) => (
          <Grid size={{ xs: 12, sm: 6, md: 3 }} key={index}>
            <Card className="dashboard-stat-card slide-up" sx={{
              position: 'relative',
              overflow: 'hidden',
              '&::before': {
                background: stat.gradient
              }
            }}>
              <CardContent sx={{ position: 'relative', zIndex: 1 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
                  <Avatar sx={{ 
                    background: stat.gradient,
                    width: 56, 
                    height: 56,
                    boxShadow: '0 8px 24px rgba(0,0,0,0.15)'
                  }}>
                    {stat.icon}
                  </Avatar>
                  
                  <Box sx={{ textAlign: 'right' }}>
                    <Typography 
                      variant="h3" 
                      component="div" 
                      className="stat-number"
                      sx={{
                        background: stat.gradient,
                        backgroundClip: 'text',
                        WebkitBackgroundClip: 'text',
                        WebkitTextFillColor: 'transparent',
                        fontWeight: 800,
                        fontSize: '2.5rem'
                      }}
                    >
                      {stat.value.toLocaleString()}
                    </Typography>
                    <Chip 
                      label={`+${stat.change}`}
                      size="small"
                      sx={{
                        background: stat.changeType === 'positive' ? 'rgba(76, 175, 80, 0.1)' : 
                                  stat.changeType === 'warning' ? 'rgba(255, 152, 0, 0.1)' : 'rgba(33, 150, 243, 0.1)',
                        color: stat.changeType === 'positive' ? '#2e7d32' : 
                               stat.changeType === 'warning' ? '#f57c00' : '#1976d2',
                        fontWeight: 600,
                        fontSize: '0.7rem'
                      }}
                    />
                  </Box>
                </Box>
                
                <Typography variant="h6" className="text-heading-medium" sx={{ mb: 1, fontWeight: 600 }}>
                  {stat.title}
                </Typography>
                <Typography variant="body2" className="text-body-small" color="text.secondary">
                  {stat.subtitle}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      <Grid container spacing={3}>
        {/* 🚀 Quick Actions - Professional */}
        <Grid size={{ xs: 12, md: 8 }}>
          <Card className="glass-card">
            <CardContent sx={{ p: 4 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
                <PeopleIcon sx={{ mr: 2, color: '#1976d2', fontSize: 28 }} />
                <Typography variant="h5" className="text-heading-large" sx={{ fontWeight: 600 }}>
                  Hızlı İşlemler
                </Typography>
              </Box>
              
              <Grid container spacing={3}>
                {quickActions.map((action, index) => (
                  <Grid size={{ xs: 12, sm: 4 }} key={index}>
                    <Card 
                      className="scale-in"
                      onClick={action.action}
                      sx={{
                        cursor: 'pointer',
                        background: 'rgba(255, 255, 255, 0.7)',
                        backdropFilter: 'blur(8px)',
                        border: '1px solid rgba(255, 255, 255, 0.3)',
                        borderRadius: 3,
                        transition: 'all 0.3s ease',
                        '&:hover': {
                          background: 'rgba(255, 255, 255, 0.9)',
                          transform: 'translateY(-8px) scale(1.02)',
                          boxShadow: '0 20px 40px rgba(0,0,0,0.15)',
                          borderColor: action.color,
                        }
                      }}
                    >
                      <CardContent sx={{ textAlign: 'center', p: 3 }}>
                        <Avatar sx={{ 
                          background: action.gradient,
                          width: 60, 
                          height: 60, 
                          mx: 'auto', 
                          mb: 2,
                          boxShadow: `0 8px 24px ${action.color}40`
                        }}>
                          {action.icon}
                        </Avatar>
                        <Typography variant="h6" className="text-heading-medium" sx={{ mb: 1, fontWeight: 600 }}>
                          {action.title}
                        </Typography>
                        <Typography variant="body2" className="text-body-small" color="text.secondary" sx={{ mb: 1 }}>
                          {action.description}
                        </Typography>
                        <Chip 
                          label={action.subtitle}
                          size="small"
                          sx={{
                            background: `${action.color}15`,
                            color: action.color,
                            fontWeight: 500,
                            fontSize: '0.7rem'
                          }}
                        />
                      </CardContent>
                    </Card>
                  </Grid>
                ))}
              </Grid>
            </CardContent>
          </Card>
        </Grid>

        {/* 📋 Recent Companies - Professional */}
        <Grid size={{ xs: 12, md: 4 }}>
          <Card className="glass-card">
            <CardContent sx={{ p: 0 }}>
              <Box sx={{ p: 3, pb: 1 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center' }}>
                    <BusinessIcon sx={{ mr: 2, color: '#1976d2', fontSize: 28 }} />
                    <Typography variant="h6" className="text-heading-medium" sx={{ fontWeight: 600 }}>
                      Son Eklenen Firmalar
                    </Typography>
                  </Box>
                  <Tooltip title="Tümünü Gör" arrow>
                    <IconButton 
                      size="small" 
                      onClick={() => navigate('/firmalar')}
                      sx={{ 
                        background: 'rgba(33, 150, 243, 0.1)',
                        color: '#1976d2',
                        '&:hover': {
                          background: 'rgba(33, 150, 243, 0.2)',
                          transform: 'scale(1.1)'
                        }
                      }}
                    >
                      <VisibilityIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                </Box>
                <Divider sx={{ background: 'rgba(33, 150, 243, 0.1)' }} />
              </Box>

              <List sx={{ p: 0 }}>
                {firmalar?.slice(0, 5).map((firma, index) => (
                  <ListItem 
                    key={firma._id} 
                    sx={{
                      px: 3,
                      py: 2,
                      cursor: 'pointer',
                      borderRadius: 2,
                      mx: 1,
                      transition: 'all 0.3s ease',
                      '&:hover': {
                        background: 'rgba(33, 150, 243, 0.05)',
                        transform: 'translateX(8px)',
                      }
                    }}
                    onClick={() => navigate(`/firmalar/${firma._id}`)}
                  >
                    <ListItemAvatar>
                      <Avatar sx={{ 
                        background: `linear-gradient(135deg, ${['#1976d2', '#2e7d32', '#f57c00', '#9c27b0', '#d32f2f'][index % 5]}, ${['#2196f3', '#4caf50', '#ff9800', '#e91e63', '#f44336'][index % 5]})`,
                        fontSize: '0.875rem',
                        fontWeight: 600
                      }}>
                        {firma.firmaId || `F${index + 1}`}
                      </Avatar>
                    </ListItemAvatar>
                    <ListItemText
                      primary={
                        <Typography 
                          variant="body1" 
                          className="text-body-medium" 
                          sx={{ 
                            fontWeight: 500, 
                            fontSize: '0.9rem',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap'
                          }}
                        >
                          {firma.tamUnvan || 'Firma Adı Yok'}
                        </Typography>
                      }
                      secondary={
                        <span style={{ display: 'flex', alignItems: 'center', marginTop: '4px' }}>
                          <LocationIcon style={{ fontSize: 14, marginRight: '4px', color: '#64748b' }} />
                          <span style={{ fontSize: '0.75rem', color: '#64748b' }}>
                            {firma.il || 'Konum Belirtilmemiş'}
                          </span>
                        </span>
                      }
                    />
                    <Box sx={{ textAlign: 'right' }}>
                      <Chip 
                        label="Aktif"
                        size="small"
                        className="status-success"
                        sx={{ fontSize: '0.65rem' }}
                      />
                    </Box>
                  </ListItem>
                ))}
              </List>

              <Box sx={{ p: 2, pt: 1 }}>
                <Button
                  fullWidth
                  variant="outlined"
                  startIcon={<ChartIcon />}
                  onClick={() => navigate('/firmalar')}
                  className="btn-glass"
                  sx={{
                    borderRadius: 2,
                    py: 1.5,
                    fontWeight: 600,
                    fontSize: '0.875rem'
                  }}
                >
                  Tüm Firmaları Görüntüle
                </Button>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
};

export default Dashboard; 