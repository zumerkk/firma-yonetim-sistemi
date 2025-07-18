// 📊 Statistics Page - Detaylı İstatistikler
// Firma ve sistem istatistikleri sayfası

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
  Tooltip
} from '@mui/material';
import {
  Business as BusinessIcon,
  LocationOn as LocationIcon,
  Warning as WarningIcon,
  CheckCircle as CheckCircleIcon,
  Refresh as RefreshIcon,
  PieChart as PieChartIcon,
  BarChart as BarChartIcon,
  ShowChart as ShowChartIcon
} from '@mui/icons-material';
import { useFirma } from '../../contexts/FirmaContext';

const Statistics = () => {
  const { stats, fetchStats, loading } = useFirma();
  const [refreshing, setRefreshing] = useState(false);

  // 📊 Veri yükleme fonksiyonu
  const loadData = useCallback(async () => {
    await fetchStats();
  }, [fetchStats]);

  // 🚀 Component mount ve veri yükleme
  useEffect(() => {
    loadData();
  }, [loadData]);

  // 🔄 Verileri yenile
  const handleRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  // 📊 İstatistik kartları
  const statCards = [
    {
      title: 'Toplam Firma',
      value: stats?.totalFirmalar || 0,
      icon: <BusinessIcon sx={{ fontSize: 40 }} />,
      color: '#1976d2',
      description: 'Sistemdeki toplam firma sayısı'
    },
    {
      title: 'Aktif Firmalar',
      value: stats?.activeFirmalar || 0,
      icon: <CheckCircleIcon sx={{ fontSize: 40 }} />,
      color: '#2e7d32',
      description: 'Aktif durumda olan firmalar'
    },
    {
      title: 'ETUYS Süresi Yaklaşan',
      value: stats?.etuysExpiringSoon || 0,
      icon: <WarningIcon sx={{ fontSize: 40 }} />,
      color: '#ed6c02',
      description: '30 gün içinde süresi dolacak'
    },
    {
      title: 'Yabancı Sermayeli',
      value: stats?.foreignCapital || 0,
      icon: <LocationIcon sx={{ fontSize: 40 }} />,
      color: '#9c27b0',
      description: 'Yabancı sermayeli firmalar'
    }
  ];

  // 🌍 Şehir dağılımı (Mock data - gerçek veriler stats'ten gelecek)
  const cityDistribution = [
    { city: 'İstanbul', count: 145, percentage: 35 },
    { city: 'Ankara', count: 98, percentage: 23 },
    { city: 'İzmir', count: 76, percentage: 18 },
    { city: 'Bursa', count: 54, percentage: 13 },
    { city: 'Antalya', count: 32, percentage: 8 },
    { city: 'Diğer', count: 15, percentage: 3 }
  ];

  return (
    <Box>
      {/* 📋 Sayfa Başlığı */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box>
          <Typography variant="h4" sx={{ fontWeight: 600, color: 'primary.main', mb: 1 }}>
            📊 İstatistikler
          </Typography>
          <Typography variant="subtitle1" color="text.secondary">
            Detaylı sistem ve firma istatistikleri
          </Typography>
        </Box>
        <Tooltip title="Verileri Yenile">
          <IconButton 
            onClick={handleRefresh} 
            disabled={refreshing}
            sx={{ 
              bgcolor: 'primary.main', 
              color: 'white',
              '&:hover': { bgcolor: 'primary.dark' }
            }}
          >
            <RefreshIcon />
          </IconButton>
        </Tooltip>
      </Box>

      {loading && <LinearProgress sx={{ mb: 2 }} />}

      {/* 📊 Genel İstatistikler */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        {statCards.map((stat, index) => (
          <Grid size={{ xs: 12, sm: 6, md: 3 }} key={index}>
            <Card 
              sx={{ 
                height: '100%',
                background: `linear-gradient(135deg, ${stat.color}15 0%, ${stat.color}05 100%)`,
                border: `1px solid ${stat.color}30`,
                transition: 'transform 0.2s',
                '&:hover': { transform: 'translateY(-4px)' }
              }}
            >
              <CardContent sx={{ textAlign: 'center', py: 3 }}>
                <Box sx={{ color: stat.color, mb: 2 }}>
                  {stat.icon}
                </Box>
                <Typography variant="h3" sx={{ fontWeight: 700, color: stat.color, mb: 1 }}>
                  {stat.value.toLocaleString()}
                </Typography>
                <Typography variant="h6" sx={{ fontWeight: 600, mb: 1 }}>
                  {stat.title}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {stat.description}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      <Grid container spacing={3}>
        {/* 🌍 Şehir Dağılımı */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
                <PieChartIcon sx={{ color: 'primary.main', mr: 1 }} />
                <Typography variant="h6" sx={{ fontWeight: 600 }}>
                  Şehir Dağılımı
                </Typography>
              </Box>
              
              {cityDistribution.map((item, index) => (
                <Box key={index} sx={{ mb: 2 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                    <Typography variant="body2">{item.city}</Typography>
                    <Typography variant="body2" sx={{ fontWeight: 600 }}>
                      {item.count} (%{item.percentage})
                    </Typography>
                  </Box>
                  <LinearProgress 
                    variant="determinate" 
                    value={item.percentage * 2.5} // Scale için
                    sx={{ 
                      height: 8, 
                      borderRadius: 4,
                      bgcolor: 'grey.200',
                      '& .MuiLinearProgress-bar': {
                        borderRadius: 4,
                        bgcolor: `hsl(${index * 60}, 70%, 50%)`
                      }
                    }}
                  />
                </Box>
              ))}
            </CardContent>
          </Card>
        </Grid>

        {/* 📈 ETUYS Durum Analizi */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
                <BarChartIcon sx={{ color: 'secondary.main', mr: 1 }} />
                <Typography variant="h6" sx={{ fontWeight: 600 }}>
                  ETUYS Yetki Durumları
                </Typography>
              </Box>
              
              <TableContainer component={Paper} elevation={0} sx={{ bgcolor: 'grey.50' }}>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell sx={{ fontWeight: 600 }}>Durum</TableCell>
                      <TableCell align="right" sx={{ fontWeight: 600 }}>Sayı</TableCell>
                      <TableCell align="right" sx={{ fontWeight: 600 }}>Oran</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    <TableRow>
                      <TableCell>
                        <Chip 
                          label="Aktif" 
                          size="small" 
                          sx={{ bgcolor: '#4caf50', color: 'white' }}
                        />
                      </TableCell>
                      <TableCell align="right">856</TableCell>
                      <TableCell align="right">72%</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell>
                        <Chip 
                          label="30 Gün İçinde Bitecek" 
                          size="small" 
                          sx={{ bgcolor: '#ff9800', color: 'white' }}
                        />
                      </TableCell>
                      <TableCell align="right">142</TableCell>
                      <TableCell align="right">12%</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell>
                        <Chip 
                          label="Süresi Dolmuş" 
                          size="small" 
                          sx={{ bgcolor: '#f44336', color: 'white' }}
                        />
                      </TableCell>
                      <TableCell align="right">98</TableCell>
                      <TableCell align="right">8%</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell>
                        <Chip 
                          label="Bilgi Yok" 
                          size="small" 
                          sx={{ bgcolor: '#9e9e9e', color: 'white' }}
                        />
                      </TableCell>
                      <TableCell align="right">89</TableCell>
                      <TableCell align="right">8%</TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </TableContainer>
            </CardContent>
          </Card>
        </Grid>

        {/* 📊 Performans Özeti */}
        <Grid item xs={12}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
                <ShowChartIcon sx={{ color: 'success.main', mr: 1 }} />
                <Typography variant="h6" sx={{ fontWeight: 600 }}>
                  Sistem Performans Özeti
                </Typography>
              </Box>
              
              <Alert severity="success" sx={{ mb: 2 }}>
                <strong>Sistem Sağlıklı!</strong> Tüm veriler güncel ve erişilebilir durumda.
              </Alert>
              
              <Grid container spacing={2}>
                <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                  <Box sx={{ textAlign: 'center', p: 2, bgcolor: 'grey.50', borderRadius: 2 }}>
                    <Typography variant="h4" sx={{ color: 'primary.main', fontWeight: 600 }}>
                      99.9%
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Sistem Uptime
                    </Typography>
                  </Box>
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                  <Box sx={{ textAlign: 'center', p: 2, bgcolor: 'grey.50', borderRadius: 2 }}>
                    <Typography variant="h4" sx={{ color: 'success.main', fontWeight: 600 }}>
                      1.2s
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Ortalama Yanıt Süresi
                    </Typography>
                  </Box>
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                  <Box sx={{ textAlign: 'center', p: 2, bgcolor: 'grey.50', borderRadius: 2 }}>
                    <Typography variant="h4" sx={{ color: 'info.main', fontWeight: 600 }}>
                      15MB
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Veritabanı Boyutu
                    </Typography>
                  </Box>
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                  <Box sx={{ textAlign: 'center', p: 2, bgcolor: 'grey.50', borderRadius: 2 }}>
                    <Typography variant="h4" sx={{ color: 'warning.main', fontWeight: 600 }}>
                      3
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Aktif Kullanıcı
                    </Typography>
                  </Box>
                </Grid>
              </Grid>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
};

export default Statistics; 