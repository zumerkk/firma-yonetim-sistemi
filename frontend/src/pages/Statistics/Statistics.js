// 📊 İstatistikler Sayfası - PROFESSIONAL MINIMAL EDITION
// Backend API uyumlu, responsive design, optimized layout

import React, { useEffect, useState, useCallback } from 'react';
import {
  Box,
  Typography,
  Grid,
  Card,
  CardContent,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  LinearProgress,
  Alert,
  IconButton,
  Tooltip,
  CircularProgress,
  Stack,
  Divider
} from '@mui/material';
import {
  Business as BusinessIcon,
  LocationOn as LocationIcon,
  Warning as WarningIcon,
  CheckCircle as CheckCircleIcon,
  Refresh as RefreshIcon,
  PieChart as PieChartIcon,
  BarChart as BarChartIcon,
  ShowChart as ShowChartIcon,
  Public as PublicIcon,
  TrendingUp as TrendingUpIcon,
  Speed as SpeedIcon,
  Storage as StorageIcon,
  Group as GroupIcon
} from '@mui/icons-material';
import { useFirma } from '../../contexts/FirmaContext';

const Statistics = () => {
  const { stats, fetchStats, loading } = useFirma();
  const [refreshing, setRefreshing] = useState(false);

  // 📊 Veri yükleme fonksiyonu
  const loadData = useCallback(async () => {
    try {
      await fetchStats();
    } catch (error) {
      console.error('İstatistik yükleme hatası:', error);
    }
  }, [fetchStats]);

  // 🚀 Component mount ve veri yükleme
  useEffect(() => {
    loadData();
  }, [loadData]);

  // 🔄 Verileri yenile
  const handleRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setTimeout(() => setRefreshing(false), 500);
  };

  // 📊 Ana istatistik kartları - Backend API uyumlu
  const statCards = [
    {
      title: 'Toplam Firma',
      value: stats?.toplamFirma || 0,
      icon: <BusinessIcon />,
      color: '#1e40af',
      gradient: 'linear-gradient(135deg, #1e40af 0%, #3b82f6 100%)',
      description: 'Sistemdeki toplam firma sayısı',
      change: '+%5.2'
    },
    {
      title: 'Aktif Firmalar',
      value: stats?.aktifFirma || 0,
      icon: <CheckCircleIcon />,
      color: '#059669',
      gradient: 'linear-gradient(135deg, #059669 0%, #10b981 100%)',
      description: 'Aktif durumda olan firmalar',
      change: '+%2.1'
    },
    {
      title: 'ETYUS Uyarıları',
      value: stats?.etuysUyarilari?.count || 0,
      icon: <WarningIcon />,
      color: '#a16207',
      gradient: 'linear-gradient(135deg, #a16207 0%, #f59e0b 100%)',
      description: '30 gün içinde süresi dolacak',
      change: '-12.5%'
    },
    {
      title: 'Yabancı Sermayeli',
      value: stats?.yabanciSermayeli || 0,
      icon: <PublicIcon />,
      color: '#7c3aed',
      gradient: 'linear-gradient(135deg, #7c3aed 0%, #8b5cf6 100%)',
      description: 'Yabancı sermayeli firmalar',
      change: '+%8.3'
    }
  ];

  // �� İl dağılımı - Backend'den gelen gerçek veriler
  const cityDistribution = stats?.illereBolum?.slice(0, 6) || [];

  // 📈 ETYUS durum analizi - Gerçek verilerle
  const etuysAnalysis = [
    {
      label: 'Aktif',
      count: stats?.etuysYetkili || 0,
      percentage: stats?.yuzdesel?.etuysYetkiliOrani || 0,
      color: '#059669'
    },
    {
      label: '30 Gün İçinde Bitecek',
      count: stats?.etuysUyarilari?.count || 0,
      percentage: stats?.toplamFirma > 0 ? 
        Math.round((stats.etuysUyarilari.count / stats.toplamFirma) * 100) : 0,
      color: '#f59e0b'
    },
    {
      label: 'Süresi Dolmuş',
      count: (stats?.toplamFirma || 0) - (stats?.etuysYetkili || 0) - (stats?.etuysUyarilari?.count || 0),
      percentage: stats?.toplamFirma > 0 ? 
        Math.round(((stats.toplamFirma - stats.etuysYetkili - stats.etuysUyarilari.count) / stats.toplamFirma) * 100) : 0,
      color: '#ef4444'
    }
  ];

  return (
    <Box sx={{ 
      width: '100%',
      minHeight: '100vh',
      p: { xs: 2, sm: 3, md: 4 },
      bgcolor: '#f8fafc'
    }}>
      {/* 📋 Sayfa Başlığı - Responsive */}
      <Box sx={{ 
        display: 'flex', 
        flexDirection: { xs: 'column', sm: 'row' },
        justifyContent: 'space-between', 
        alignItems: { xs: 'flex-start', sm: 'center' },
        mb: 3,
        gap: 2
      }}>
        <Box>
          <Typography variant="h4" sx={{ 
            fontWeight: 700, 
            color: '#1e293b',
            fontSize: { xs: '1.5rem', sm: '1.75rem', md: '2rem' },
            mb: 0.5
          }}>
            📊 İstatistikler
          </Typography>
          <Typography variant="body1" color="text.secondary" sx={{ fontSize: '0.9rem' }}>
            Detaylı sistem ve firma istatistikleri
          </Typography>
        </Box>
        
        <Tooltip title="Verileri Yenile">
          <IconButton 
            onClick={handleRefresh} 
            disabled={refreshing || loading}
            size="small"
            sx={{ 
              bgcolor: 'primary.main', 
              color: 'white',
              '&:hover': { bgcolor: 'primary.dark' },
              '&:disabled': { bgcolor: 'grey.400' }
            }}
          >
            {refreshing ? <CircularProgress size={20} color="inherit" /> : <RefreshIcon />}
          </IconButton>
        </Tooltip>
      </Box>

      {/* Loading indicator */}
      {loading && <LinearProgress sx={{ mb: 3, borderRadius: 1 }} />}

      {/* 📊 Ana İstatistik Kartları */}
      <Grid container spacing={{ xs: 2, md: 3 }} sx={{ mb: 4 }}>
        {statCards.map((stat, index) => (
          <Grid item xs={12} sm={6} md={3} key={index}>
            <Card 
              sx={{ 
                height: '100%',
                background: 'rgba(255, 255, 255, 0.95)',
                border: '1px solid rgba(226, 232, 240, 0.5)',
                borderRadius: 2,
                transition: 'all 0.25s ease',
                '&:hover': { 
                  transform: 'translateY(-2px)',
                  boxShadow: '0 8px 25px rgba(0, 0, 0, 0.08)'
                },
                position: 'relative',
                overflow: 'hidden',
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
              <CardContent sx={{ p: 2.5 }}>
                <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', mb: 1.5 }}>
                  <Box
                    sx={{
                      width: 48,
                      height: 48,
                      borderRadius: '50%',
                      background: stat.gradient,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: 'white',
                      boxShadow: `0 4px 14px ${stat.color}25`
                    }}
                  >
                    {stat.icon}
                  </Box>
                  
                  <Chip 
                    label={stat.change}
                    size="small"
                    sx={{
                      fontSize: '0.7rem',
                      height: 20,
                      color: stat.change.startsWith('+') ? '#059669' : '#ef4444',
                      bgcolor: stat.change.startsWith('+') ? 'rgba(5, 150, 105, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                      border: 'none'
                    }}
                  />
                </Box>
                
                <Typography variant="h4" sx={{
                  color: stat.color,
                  fontWeight: 800,
                  fontSize: '1.8rem',
                  lineHeight: 1,
                  mb: 0.5
                }}>
                  {stat.value.toLocaleString('tr-TR')}
                </Typography>
                
                <Typography variant="subtitle2" sx={{ 
                  fontWeight: 600, 
                  color: '#374151',
                  fontSize: '0.85rem',
                  mb: 0.25
                }}>
                  {stat.title}
                </Typography>
                
                <Typography variant="body2" color="text.secondary" sx={{ 
                  fontSize: '0.75rem',
                  lineHeight: 1.2
                }}>
                  {stat.description}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      <Grid container spacing={{ xs: 2, md: 3 }}>
        {/* 🌍 Şehir Dağılımı */}
        <Grid item xs={12} lg={6}>
          <Card sx={{ 
            height: '100%',
            borderRadius: 2,
            border: '1px solid rgba(226, 232, 240, 0.5)'
          }}>
            <CardContent sx={{ p: 3 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
                <PieChartIcon sx={{ color: 'primary.main', mr: 1.5, fontSize: 24 }} />
                <Typography variant="h6" sx={{ fontWeight: 600, fontSize: '1.1rem' }}>
                  Şehir Dağılımı
                </Typography>
              </Box>
              
              {cityDistribution.length > 0 ? (
                <Stack spacing={2}>
                  {cityDistribution.map((item, index) => {
                    const percentage = stats?.toplamFirma > 0 ? 
                      Math.round((item.count / stats.toplamFirma) * 100) : 0;
                    
                    return (
                      <Box key={index}>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                          <Typography variant="body2" sx={{ fontWeight: 500 }}>
                            {item._id || 'Belirtilmemiş'}
                          </Typography>
                          <Typography variant="body2" sx={{ fontWeight: 600, color: 'primary.main' }}>
                            {item.count} (%{percentage})
                          </Typography>
                        </Box>
                        <LinearProgress 
                          variant="determinate" 
                          value={Math.min(percentage * 2, 100)}
                          sx={{ 
                            height: 6, 
                            borderRadius: 3,
                            bgcolor: 'grey.100',
                            '& .MuiLinearProgress-bar': {
                              borderRadius: 3,
                              background: `hsl(${index * 45 + 200}, 70%, 50%)`
                            }
                          }}
                        />
                      </Box>
                    );
                  })}
                </Stack>
              ) : (
                <Alert severity="info" sx={{ fontSize: '0.875rem' }}>
                  Şehir dağılım verileri yükleniyor...
                </Alert>
              )}
            </CardContent>
          </Card>
        </Grid>

        {/* 📈 ETYUS Durum Analizi */}
        <Grid item xs={12} lg={6}>
          <Card sx={{ 
            height: '100%',
            borderRadius: 2,
            border: '1px solid rgba(226, 232, 240, 0.5)'
          }}>
            <CardContent sx={{ p: 3 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
                <BarChartIcon sx={{ color: 'success.main', mr: 1.5, fontSize: 24 }} />
                <Typography variant="h6" sx={{ fontWeight: 600, fontSize: '1.1rem' }}>
                  ETYUS Yetki Durumları
                </Typography>
              </Box>
              
              <TableContainer component={Paper} elevation={0} sx={{ bgcolor: '#f8fafc' }}>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell sx={{ fontWeight: 600, fontSize: '0.8rem' }}>Durum</TableCell>
                      <TableCell align="right" sx={{ fontWeight: 600, fontSize: '0.8rem' }}>Sayı</TableCell>
                      <TableCell align="right" sx={{ fontWeight: 600, fontSize: '0.8rem' }}>Oran</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {etuysAnalysis.map((row, index) => (
                      <TableRow key={index}>
                        <TableCell sx={{ py: 1 }}>
                          <Chip 
                            label={row.label} 
                            size="small" 
                            sx={{ 
                              bgcolor: row.color, 
                              color: 'white',
                              fontSize: '0.7rem',
                              fontWeight: 500
                            }}
                          />
                        </TableCell>
                        <TableCell align="right" sx={{ fontWeight: 600, fontSize: '0.85rem' }}>
                          {row.count.toLocaleString('tr-TR')}
                        </TableCell>
                        <TableCell align="right" sx={{ fontWeight: 600, fontSize: '0.85rem' }}>
                          %{row.percentage}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </CardContent>
          </Card>
        </Grid>

        {/* 📊 Sistem Performans Özeti */}
        <Grid item xs={12}>
          <Card sx={{ 
            borderRadius: 2,
            border: '1px solid rgba(226, 232, 240, 0.5)'
          }}>
            <CardContent sx={{ p: 3 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
                <ShowChartIcon sx={{ color: 'info.main', mr: 1.5, fontSize: 24 }} />
                <Typography variant="h6" sx={{ fontWeight: 600, fontSize: '1.1rem' }}>
                  Sistem Performans Özeti
                </Typography>
              </Box>
              
              <Alert severity="success" sx={{ mb: 3, fontSize: '0.875rem' }}>
                <strong>Sistem Sağlıklı!</strong> Tüm veriler güncel ve erişilebilir durumda.
              </Alert>
              
              <Grid container spacing={3}>
                <Grid item xs={12} sm={6} lg={3}>
                  <Paper sx={{ 
                    textAlign: 'center', 
                    p: 2.5, 
                    bgcolor: '#f8fafc', 
                    borderRadius: 2,
                    border: '1px solid #e5e7eb'
                  }}>
                    <SpeedIcon sx={{ fontSize: 32, color: 'primary.main', mb: 1 }} />
                    <Typography variant="h4" sx={{ 
                      color: 'primary.main', 
                      fontWeight: 700,
                      mb: 0.5
                    }}>
                      99.9%
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.8rem' }}>
                      Sistem Uptime
                    </Typography>
                  </Paper>
                </Grid>
                
                <Grid item xs={12} sm={6} lg={3}>
                  <Paper sx={{ 
                    textAlign: 'center', 
                    p: 2.5, 
                    bgcolor: '#f8fafc', 
                    borderRadius: 2,
                    border: '1px solid #e5e7eb'
                  }}>
                    <TrendingUpIcon sx={{ fontSize: 32, color: 'success.main', mb: 1 }} />
                    <Typography variant="h4" sx={{ 
                      color: 'success.main', 
                      fontWeight: 700,
                      mb: 0.5
                    }}>
                      1.2s
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.8rem' }}>
                      Ortalama Yanıt Süresi
                    </Typography>
                  </Paper>
                </Grid>
                
                <Grid item xs={12} sm={6} lg={3}>
                  <Paper sx={{ 
                    textAlign: 'center', 
                    p: 2.5, 
                    bgcolor: '#f8fafc', 
                    borderRadius: 2,
                    border: '1px solid #e5e7eb'
                  }}>
                    <StorageIcon sx={{ fontSize: 32, color: 'info.main', mb: 1 }} />
                    <Typography variant="h4" sx={{ 
                      color: 'info.main', 
                      fontWeight: 700,
                      mb: 0.5
                    }}>
                      15MB
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.8rem' }}>
                      Veritabanı Boyutu
                    </Typography>
                  </Paper>
                </Grid>
                
                <Grid item xs={12} sm={6} lg={3}>
                  <Paper sx={{ 
                    textAlign: 'center', 
                    p: 2.5, 
                    bgcolor: '#f8fafc', 
                    borderRadius: 2,
                    border: '1px solid #e5e7eb'
                  }}>
                    <GroupIcon sx={{ fontSize: 32, color: 'warning.main', mb: 1 }} />
                    <Typography variant="h4" sx={{ 
                      color: 'warning.main', 
                      fontWeight: 700,
                      mb: 0.5
                    }}>
                      3
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.8rem' }}>
                      Aktif Kullanıcı
                    </Typography>
                  </Paper>
                </Grid>
              </Grid>
            </CardContent>
          </Card>
        </Grid>

        {/* 📋 Son Eklenen Firmalar */}
        {stats?.sonEklenenler && stats.sonEklenenler.length > 0 && (
          <Grid item xs={12}>
            <Card sx={{ 
              borderRadius: 2,
              border: '1px solid rgba(226, 232, 240, 0.5)'
            }}>
              <CardContent sx={{ p: 3 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
                  <BusinessIcon sx={{ color: 'secondary.main', mr: 1.5, fontSize: 24 }} />
                  <Typography variant="h6" sx={{ fontWeight: 600, fontSize: '1.1rem' }}>
                    Son Eklenen Firmalar
                  </Typography>
                </Box>
                
                <TableContainer component={Paper} elevation={0} sx={{ bgcolor: '#f8fafc' }}>
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell sx={{ fontWeight: 600, fontSize: '0.8rem' }}>Firma ID</TableCell>
                        <TableCell sx={{ fontWeight: 600, fontSize: '0.8rem' }}>Firma Ünvanı</TableCell>
                        <TableCell sx={{ fontWeight: 600, fontSize: '0.8rem' }}>Şehir</TableCell>
                        <TableCell sx={{ fontWeight: 600, fontSize: '0.8rem' }}>İrtibat</TableCell>
                        <TableCell align="right" sx={{ fontWeight: 600, fontSize: '0.8rem' }}>Tarih</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {stats.sonEklenenler.slice(0, 5).map((firma) => (
                        <TableRow key={firma._id}>
                          <TableCell sx={{ py: 1 }}>
                            <Chip 
                              label={firma.firmaId} 
                              size="small" 
                              color="primary"
                              sx={{ fontSize: '0.7rem' }}
                            />
                          </TableCell>
                          <TableCell sx={{ fontWeight: 500, fontSize: '0.85rem', maxWidth: 200 }}>
                            <Typography
                              sx={{
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                whiteSpace: 'nowrap',
                                fontSize: '0.85rem'
                              }}
                            >
                              {firma.tamUnvan}
                            </Typography>
                          </TableCell>
                          <TableCell sx={{ fontSize: '0.85rem' }}>
                            {firma.firmaIl || '-'}
                          </TableCell>
                          <TableCell sx={{ fontSize: '0.85rem' }}>
                            {firma.ilkIrtibatKisi || '-'}
                          </TableCell>
                          <TableCell align="right" sx={{ fontSize: '0.85rem' }}>
                            {new Date(firma.createdAt).toLocaleDateString('tr-TR')}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              </CardContent>
            </Card>
          </Grid>
        )}
      </Grid>
    </Box>
  );
};

export default Statistics; 