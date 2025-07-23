// 🏢 Dashboard - COMPACT PROFESSIONAL EDITION  
// Minimal, functional, clickable dashboard with optimized layout

import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Grid,
  Button,
  Avatar,
  Chip,
  LinearProgress,
  IconButton
} from '@mui/material';
import {
  Business as BusinessIcon,
  CheckCircle as CheckCircleIcon,
  Warning as WarningIcon,
  LocationOn as LocationIcon,
  Add as AddIcon,
  ViewList as ViewListIcon,
  Assessment as AssessmentIcon,
  Refresh as RefreshIcon,
  Autorenew as AutorenewIcon,
  History as HistoryIcon
} from '@mui/icons-material';
import { useFirma } from '../../contexts/FirmaContext';
import activityService from '../../services/activityService';

const Dashboard = () => {
  const navigate = useNavigate();
  const { firmalar, loading, stats, fetchFirmalar, fetchStats } = useFirma();
  const [refreshing, setRefreshing] = useState(false);
  const [recentActivities, setRecentActivities] = useState([]);

  // 📋 Load Recent Activities
  const loadRecentActivities = useCallback(async () => {
    try {
      const result = await activityService.getRecentActivities(8);
      if (result.success) {
        setRecentActivities(result.data.activities || []);
      }
    } catch (error) {
      console.error('Recent activities loading error:', error);
    }
  }, []);

  // 🔄 Data Loading
  useEffect(() => {
    const loadData = async () => {
      await Promise.all([
        fetchFirmalar(),
        fetchStats(),
        loadRecentActivities()
      ]);
    };
    loadData();
  }, [fetchFirmalar, fetchStats, loadRecentActivities]);

  // 🔄 Manual Refresh
  const handleRefresh = async () => {
    setRefreshing(true);
    await Promise.all([
      fetchFirmalar(),
      fetchStats(),
      loadRecentActivities()
    ]);
    setTimeout(() => setRefreshing(false), 500);
  };

  // 👨‍💼 Recent Companies - Son eklenen firmaları ID'ye göre sırala
  const recentCompanies = (firmalar || [])
    .filter(firma => firma.aktif !== false) // Sadece aktif firmaları göster
    .sort((a, b) => {
      // Önce createdAt'e göre sırala (en yeni önce)
      const dateA = new Date(a.createdAt);
      const dateB = new Date(b.createdAt);
      if (dateB - dateA !== 0) return dateB - dateA;
      
      // Eğer tarihler aynıysa firmaId'ye göre sırala (A001185, A001184, ...)
      const idA = a.firmaId ? parseInt(a.firmaId.substring(1)) : 0;
      const idB = b.firmaId ? parseInt(b.firmaId.substring(1)) : 0;
      return idB - idA;
    })
    .slice(0, 5);

  // 📊 Dashboard Statistics - Compact & Clickable
  const dashboardStats = [
    {
      title: 'Toplam Firma',
      value: stats?.toplamFirma || 0,
      change: '+5.2%',
      changeType: 'increase',
      icon: <BusinessIcon sx={{ fontSize: 20 }} />,
      color: '#1e40af',
      gradient: 'linear-gradient(135deg, #1e40af 0%, #3b82f6 100%)',
      action: () => navigate('/firmalar')
    },
    {
      title: 'Aktif Firmalar', 
      value: stats?.aktifFirma || 0,
      change: '+2.1%',
      changeType: 'increase',
      icon: <CheckCircleIcon sx={{ fontSize: 20 }} />,
      color: '#059669',
      gradient: 'linear-gradient(135deg, #059669 0%, #10b981 100%)',
      action: () => navigate('/firmalar?aktif=true')
    },
    {
      title: 'Yetki Süresi Yaklaşan',
      value: stats?.etuysUyarilari?.count || 0,
      change: '-12.5%',
      changeType: 'decrease',
      icon: <WarningIcon sx={{ fontSize: 20 }} />,
      color: '#a16207',
      gradient: 'linear-gradient(135deg, #a16207 0%, #f59e0b 100%)',
      action: () => navigate('/firmalar?etuysUyari=true')
    },
    {
      title: 'Süresi Geçmiş',
      value: (stats?.toplamFirma || 0) - (stats?.etuysYetkili || 0) - (stats?.etuysUyarilari?.count || 0),
      change: '+3',
      changeType: 'neutral',
      icon: <LocationIcon sx={{ fontSize: 20 }} />,
      color: '#dc2626',
      gradient: 'linear-gradient(135deg, #dc2626 0%, #ef4444 100%)',
      action: () => navigate('/firmalar?etuysGecmis=true')
    }
  ];

  // 🚀 Quick Actions - Compact
  const quickActions = [
    {
      title: 'Yeni Firma Ekle',
      description: 'Yeni firma kaydı',
      icon: <AddIcon />,
      color: '#059669',
      action: () => navigate('/firmalar/yeni')
    },
    {
      title: 'Firma Listesi',
      description: 'Tüm firmaları görüntüle',
      icon: <ViewListIcon />,
      color: '#1e40af',
      action: () => navigate('/firmalar')
    }
  ];

  return (
    <Box sx={{ 
      width: '100%',
      height: '100%',
      p: { xs: 2, sm: 2.5, md: 3 },
      boxSizing: 'border-box',
      bgcolor: '#f8fafc',
      overflow: 'auto',
      display: 'flex',
      flexDirection: 'column',
    }}>
      {/* 👋 Compact Welcome Section */}
      <Box sx={{ mb: 2.5, position: 'relative' }}>
        <Box sx={{ 
          display: 'flex', 
          flexDirection: { xs: 'column', md: 'row' },
          justifyContent: 'space-between',
          alignItems: { xs: 'flex-start', md: 'center' },
          gap: 2
        }}>
          <Box>
            <Typography 
              variant="h4" 
              component="h1" 
              sx={{ 
                fontWeight: 700, 
                color: '#1e293b', 
                mb: 0.5,
                fontSize: { xs: '1.5rem', md: '1.75rem' }
              }}
            >
              Hoş geldiniz, Sistem
            </Typography>
            <Typography 
              variant="body1" 
              color="text.secondary"
              sx={{ 
                fontSize: '0.875rem'
              }}
            >
                              GM Planlama Danışmanlık - Ana kontrol paneli
            </Typography>
          </Box>
          
          <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
            <Button
              variant="outlined"
              startIcon={refreshing ? <AutorenewIcon className="rotating" /> : <RefreshIcon />}
              onClick={handleRefresh}
              disabled={refreshing}
              size="small"
              sx={{ 
                borderRadius: 2,
                textTransform: 'none',
                fontWeight: 600,
                fontSize: '0.75rem',
                px: 1.5,
                py: 0.5,
                minWidth: 'auto',
                '& .rotating': {
                  animation: 'spin 1s linear infinite'
                },
                '@keyframes spin': {
                  '0%': { transform: 'rotate(0deg)' },
                  '100%': { transform: 'rotate(360deg)' }
                }
              }}
            >
              Yenile
            </Button>
            
            <Button
              variant="contained"
              color="success"
              startIcon={<AssessmentIcon />}
              onClick={() => navigate('/istatistikler')}
              size="small"
              sx={{ 
                borderRadius: 2,
                textTransform: 'none',
                fontWeight: 600,
                fontSize: '0.75rem',
                px: 1.5,
                py: 0.5,
                minWidth: 'auto'
              }}
            >
              İstatistikler
            </Button>
          </Box>
        </Box>
      </Box>

      {/* Loading Bar */}
      {loading && <LinearProgress sx={{ mb: 2, borderRadius: 1, height: 3 }} />}

      {/* 📊 Compact Dashboard Stats Cards - CLICKABLE */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        {dashboardStats.map((stat, index) => (
          <Grid item xs={12} sm={6} md={3} key={index}>
            <Card 
              onClick={stat.action}
              sx={{ 
                height: '100%',
                background: 'rgba(255, 255, 255, 0.95)',
                borderRadius: 2,
                border: '1px solid rgba(226, 232, 240, 0.5)',
                position: 'relative',
                overflow: 'hidden',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                '&:hover': {
                  transform: 'translateY(-1px)',
                  boxShadow: '0 4px 12px rgba(0, 0, 0, 0.08)',
                  borderColor: stat.color
                },
                '&::before': {
                  content: '""',
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  right: 0,
                  height: 3,
                  background: stat.gradient
                }
              }}
            >
              <CardContent sx={{ p: 2 }}>
                <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', mb: 1 }}>
                  <Avatar sx={{ 
                    background: stat.gradient,
                    width: 36, 
                    height: 36,
                    boxShadow: `0 2px 8px ${stat.color}25`
                  }}>
                    {stat.icon}
                  </Avatar>
                  
                  <Chip 
                    label={stat.change}
                    size="small"
                    sx={{
                      background: stat.changeType === 'increase' ? 'rgba(5, 150, 105, 0.1)' : 
                                stat.changeType === 'decrease' ? 'rgba(161, 98, 7, 0.1)' : 'rgba(30, 64, 175, 0.1)',
                      color: stat.changeType === 'increase' ? '#059669' : 
                             stat.changeType === 'decrease' ? '#a16207' : '#1e40af',
                      fontWeight: 600,
                      fontSize: '0.6rem',
                      height: 18,
                      border: 'none'
                    }}
                  />
                </Box>
                
                <Typography variant="h5" sx={{
                  color: stat.color,
                  fontWeight: 800,
                  fontSize: '1.4rem',
                  lineHeight: 1,
                  mb: 0.5
                }}>
                  {typeof stat.value === 'number' ? stat.value.toLocaleString('tr-TR') : stat.value}
                </Typography>
                
                <Typography variant="subtitle2" sx={{ 
                  fontWeight: 600, 
                  color: '#374151', 
                  fontSize: '0.75rem',
                  lineHeight: 1.2
                }}>
                  {stat.title}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      <Grid container spacing={2}>
        {/* 🚀 Compact Quick Actions */}
        <Grid item xs={12} lg={4}>
          <Card sx={{ 
            height: '100%',
            borderRadius: 2,
            border: '1px solid rgba(226, 232, 240, 0.5)'
          }}>
            <CardContent sx={{ p: 2.5 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <BusinessIcon sx={{ color: 'primary.main', mr: 1, fontSize: 20 }} />
                <Typography variant="h6" sx={{ fontWeight: 600, fontSize: '1rem' }}>
                  🚀 Hızlı İşlemler
                </Typography>
              </Box>
              
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                {quickActions.map((action, index) => (
                  <Button
                    key={index}
                    onClick={action.action}
                    variant="outlined"
                    startIcon={action.icon}
                    sx={{
                      justifyContent: 'flex-start',
                      textTransform: 'none',
                      borderRadius: 2,
                      p: 1.5,
                      borderColor: 'rgba(226, 232, 240, 0.8)',
                      color: action.color,
                      fontSize: '0.8rem',
                      fontWeight: 500,
                      '&:hover': {
                        borderColor: action.color,
                        bgcolor: `${action.color}08`
                      }
                    }}
                  >
                    <Box sx={{ textAlign: 'left', flex: 1 }}>
                      <Typography variant="body2" sx={{ fontWeight: 600, fontSize: '0.8rem' }}>
                        {action.title}
                      </Typography>
                      <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.7rem' }}>
                        {action.description}
                      </Typography>
                    </Box>
                  </Button>
                ))}
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* 👥 Compact Recent Companies */}
        <Grid item xs={12} lg={4}>
          <Card sx={{ 
            height: '100%',
            borderRadius: 2,
            border: '1px solid rgba(226, 232, 240, 0.5)'
          }}>
            <CardContent sx={{ p: 2.5 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                  <CheckCircleIcon sx={{ color: 'success.main', mr: 1, fontSize: 20 }} />
                  <Typography variant="h6" sx={{ fontWeight: 600, fontSize: '1rem' }}>
                    📋 Son Eklenen Firmalar
                  </Typography>
                </Box>
                <IconButton 
                  size="small" 
                  onClick={() => navigate('/firmalar')}
                  sx={{ color: 'text.secondary' }}
                >
                  <ViewListIcon fontSize="small" />
                </IconButton>
              </Box>
              
              {recentCompanies.length > 0 ? (
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                  {recentCompanies.map((firma) => (
                    <Box 
                      key={firma._id}
                      onClick={() => navigate(`/firmalar/${firma._id}`)}
                      sx={{ 
                        display: 'flex', 
                        alignItems: 'center', 
                        p: 1.5,
                        borderRadius: 2,
                        border: '1px solid rgba(226, 232, 240, 0.5)',
                        cursor: 'pointer',
                        transition: 'all 0.2s ease',
                        '&:hover': {
                          bgcolor: 'rgba(59, 130, 246, 0.02)',
                          borderColor: 'rgba(59, 130, 246, 0.3)'
                        }
                      }}
                    >
                      <Avatar sx={{ 
                        width: 32, 
                        height: 32, 
                        bgcolor: 'primary.main',
                        fontSize: '0.7rem',
                        mr: 1.5
                      }}>
                        {firma.tamUnvan?.charAt(0)}
                      </Avatar>
                      
                      <Box sx={{ flex: 1, minWidth: 0 }}>
                        <Typography variant="body2" sx={{ 
                          fontWeight: 600, 
                          mb: 0.25,
                          fontSize: '0.8rem',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap'
                        }}>
                          {firma.tamUnvan}
                        </Typography>
                        <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.7rem' }}>
                          {firma.firmaId} • {firma.firmaIl || 'Şehir belirtilmemiş'}
                        </Typography>
                      </Box>
                      
                      <Chip 
                        label={firma.firmaId}
                        size="small"
                        color="primary"
                        sx={{ fontSize: '0.6rem', height: 20 }}
                      />
                    </Box>
                  ))}
                </Box>
              ) : (
                <Box sx={{ 
                  textAlign: 'center', 
                  py: 2,
                  color: 'text.secondary'
                }}>
                  <Typography variant="body2" sx={{ fontSize: '0.8rem' }}>
                    Henüz firma eklenmemiş
                  </Typography>
                </Box>
              )}
            </CardContent>
          </Card>
        </Grid>

        {/* 📋 Son İşlemler Widget */}
        <Grid item xs={12} lg={4}>
          <Card sx={{ 
            height: '100%',
            borderRadius: 2,
            border: '1px solid rgba(226, 232, 240, 0.5)'
          }}>
            <CardContent sx={{ p: 2.5 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                  <HistoryIcon sx={{ color: 'error.main', mr: 1, fontSize: 20 }} />
                  <Typography variant="h6" sx={{ fontWeight: 600, fontSize: '1rem' }}>
                    📋 Son İşlemler
                  </Typography>
                </Box>
                <IconButton 
                  size="small" 
                  onClick={() => navigate('/son-islemler')}
                  sx={{ color: 'text.secondary' }}
                >
                  <ViewListIcon fontSize="small" />
                </IconButton>
              </Box>
              
              {recentActivities.length > 0 ? (
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                  {recentActivities.map((activity) => (
                    <Box 
                      key={activity._id}
                      onClick={() => navigate('/son-islemler')}
                      sx={{ 
                        display: 'flex', 
                        alignItems: 'center', 
                        p: 1.5,
                        borderRadius: 2,
                        border: '1px solid rgba(226, 232, 240, 0.5)',
                        cursor: 'pointer',
                        transition: 'all 0.2s ease',
                        '&:hover': {
                          bgcolor: 'rgba(220, 38, 38, 0.02)',
                          borderColor: 'rgba(220, 38, 38, 0.3)'
                        }
                      }}
                    >
                      <Avatar sx={{ 
                        width: 32, 
                        height: 32, 
                        bgcolor: activityService.getStatusColor(activity.status) === 'error' ? 'error.main' : 
                                activityService.getStatusColor(activity.status) === 'success' ? 'success.main' : 'primary.main',
                        fontSize: '0.7rem',
                        mr: 1.5
                      }}>
                        {activity.user?.name?.charAt(0)?.toUpperCase()}
                      </Avatar>
                      
                      <Box sx={{ flex: 1, minWidth: 0 }}>
                        <Typography variant="body2" sx={{ 
                          fontWeight: 600, 
                          mb: 0.25,
                          fontSize: '0.8rem',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap'
                        }}>
                          {activity.title}
                        </Typography>
                        <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.7rem' }}>
                          {activity.user?.name} • {activityService.formatDate(activity.createdAt, 'relative')}
                        </Typography>
                      </Box>
                      
                      <Chip 
                        label={activityService.getActionDisplayName(activity.action)}
                        size="small"
                        color={activityService.getStatusColor(activity.status)}
                        variant="outlined"
                        sx={{ fontSize: '0.6rem', height: 20 }}
                      />
                    </Box>
                  ))}
                </Box>
              ) : (
                <Box sx={{ 
                  textAlign: 'center', 
                  py: 2,
                  color: 'text.secondary'
                }}>
                  <Typography variant="body2" sx={{ fontSize: '0.8rem' }}>
                    📝 Henüz işlem geçmişi bulunmamaktadır
                  </Typography>
                </Box>
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
};

export default Dashboard; 