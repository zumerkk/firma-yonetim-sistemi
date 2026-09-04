// 🔄 REVIZYON TIMELINE - ENTERPRISE EDITION
// Excel benzeri revizyon geçmişi görselleştirme
// Renk kodlamalı değişiklik gösterimi

import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Chip,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Alert,
  CircularProgress,
  Button,
  IconButton,
  Tooltip,
  Grid,
  Badge,
  Divider
} from '@mui/material';
import {
  Timeline,
  TimelineItem,
  TimelineSeparator,
  TimelineConnector,
  TimelineContent,
  TimelineDot,
  TimelineOppositeContent
} from '@mui/lab';
import {
  ExpandMore as ExpandMoreIcon,
  Person as PersonIcon,
  // Schedule as ScheduleIcon, // GELECEKTE KULLANILABİLİR
  GetApp as DownloadIcon,
  History as HistoryIcon,
  TrendingUp as TrendingUpIcon,
  Assessment as AssessmentIcon,
  Edit as EditIcon,
  Visibility as VisibilityIcon,
  Check as CheckIcon,
  Close as CloseIcon
} from '@mui/icons-material';
import axios from '../utils/axios';

const RevisionTimeline = ({ tesvikId }) => {
  const [revisions, setRevisions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // 🎨 GELECEKTE KULLANILABİLİR - Revizyon Tipi Renk Haritası
  // const getRevisionColor = (type) => {
  //   const colorMap = {
  //     'created': '#10B981',
  //     'updated': '#3B82F6',
  //     'status_changed': '#F59E0B',
  //     'approved': '#10B981',
  //     'rejected': '#EF4444',
  //     'document_added': '#8B5CF6',
  //     'financial_updated': '#F97316'
  //   };
  //   return colorMap[type] || '#6B7280';
  // };

  // 🔄 GELECEKTE KULLANILABİLİR - Revizyon İkonu
  // const getRevisionIcon = (type) => {
  //   const iconMap = {
  //     'created': '🆕',
  //     'updated': '✏️',
  //     'status_changed': '🔄',
  //     'approved': '✅',
  //     'rejected': '❌',
  //     'document_added': '📎',
  //     'financial_updated': '💰'
  //   };
  //   return iconMap[type] || '📝';
  // };

  // 📊 Revizyon Verilerini Yükle
  const loadRevisions = useCallback(async () => {
    try {
      setLoading(true);
      const response = await axios.get(`/tesvik/${tesvikId}/revisions`);
      
      if (response.data.success) {
        setRevisions(response.data.data);
      } else {
        setError('Revizyon geçmişi yüklenemedi');
      }
    } catch (error) {
      console.error('🚨 Revizyon yükleme hatası:', error);
      setError('Revizyon geçmişi yüklenirken hata oluştu');
    } finally {
      setLoading(false);
    }
  }, [tesvikId]);

  // 📊 Excel Export İşlemi
  const handleExcelExport = async () => {
    try {
      const response = await axios.get(`/tesvik/${tesvikId}/revizyon-excel-export`, {
        responseType: 'blob'
      });
      
      // Blob oluştur ve download et
      const blob = new Blob([response.data], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      });
      
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `revizyon_gecmisi_${tesvikId}_${new Date().toISOString().split('T')[0]}.xlsx`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      
    } catch (error) {
      console.error('🚨 Excel export hatası:', error);
      setError('Excel dosyası oluşturulurken hata oluştu');
    }
  };

  useEffect(() => {
    if (tesvikId) {
      loadRevisions();
    }
  }, [tesvikId, loadRevisions]);

  // 📅 Tarih Formatı
  const formatDate = (date) => {
    return new Date(date).toLocaleString('tr-TR', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // 🔍 Değer Formatlama Fonksiyonu
  const formatValue = (value) => {
    if (value === null || value === undefined) return '-';
    if (typeof value === 'object') {
      // Obje ise JSON string'e çevir
      try {
        return JSON.stringify(value);
      } catch (e) {
        return '[Object]';
      }
    }
    if (Array.isArray(value)) {
      return value.join(', ');
    }
    return String(value);
  };

  // 🔍 Değişiklik Detayları Tablosu
  const renderChangeDetails = (changes) => {
    if (!changes || changes.length === 0) return null;

    return (
      <TableContainer component={Paper} sx={{ mt: 2 }}>
        <Table size="small">
          <TableHead>
            <TableRow sx={{ backgroundColor: '#f8fafc' }}>
              <TableCell sx={{ fontWeight: 600 }}>Alan</TableCell>
              <TableCell sx={{ fontWeight: 600 }}>Eski Değer</TableCell>
              <TableCell sx={{ fontWeight: 600 }}>Yeni Değer</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {changes.map((change, index) => (
              <TableRow key={index}>
                <TableCell>
                  <Typography variant="body2" sx={{ fontWeight: 600 }}>
                    {change.label || change.field || change.alan || 'Bilinmeyen Alan'}
                  </Typography>
                </TableCell>
                <TableCell>
                  <Box sx={{ 
                    backgroundColor: '#fef2f2', 
                    color: '#dc2626',
                    p: 1,
                    fontSize: '0.8rem'
                  }}>
                    {formatValue(change.oldValue || change.eskiDeger)}
                  </Box>
                </TableCell>
                <TableCell>
                  <Box sx={{ 
                    backgroundColor: '#f0fdf4', 
                    color: '#16a34a',
                    p: 1,
                    fontSize: '0.8rem'
                  }}>
                    {formatValue(change.newValue || change.yeniDeger)}
                  </Box>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    );
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Alert severity="error" sx={{ m: 2 }}>
        {error}
      </Alert>
    );
  }

  if (!revisions || revisions.length === 0) {
    return (
      <Alert severity="info" sx={{ m: 2 }}>
        Henüz revizyon kaydı bulunmuyor.
      </Alert>
    );
  }

  return (
    <Card>
      <CardContent>
        {/* 📊 Header with Export Button */}
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
          <Typography variant="h6" sx={{ fontWeight: 600, display: 'flex', alignItems: 'center', gap: 1 }}>
            <HistoryIcon sx={{ color: '#3B82F6' }} />
            Revizyon Geçmişi
            <Badge badgeContent={revisions.length} color="primary" sx={{ ml: 1 }}>
              <AssessmentIcon sx={{ color: '#10B981' }} />
            </Badge>
          </Typography>
          
          <Box sx={{ display: 'flex', gap: 1 }}>
            <Tooltip title="Revizyon geçmişini Excel olarak indir">
              <Button
                variant="contained"
                size="small"
                startIcon={<DownloadIcon />}
                onClick={handleExcelExport}
                sx={{
                  backgroundColor: '#10B981',
                  '&:hover': {
                    backgroundColor: '#059669'
                  }
                }}
              >
                Excel İndir
              </Button>
            </Tooltip>
            
            <Tooltip title="Sayfayı yenile">
              <IconButton
                size="small"
                onClick={loadRevisions}
                sx={{ color: '#6B7280' }}
              >
                <TrendingUpIcon />
              </IconButton>
            </Tooltip>
          </Box>
        </Box>

        {/* 📊 Özet Bilgiler */}
        <Grid container spacing={2} sx={{ mb: 3 }}>
          <Grid item xs={12} sm={6} md={3}>
            <Paper sx={{ p: 2, textAlign: 'center', backgroundColor: '#EFF6FF' }}>
              <Typography variant="h4" sx={{ color: '#2563EB', fontWeight: 'bold' }}>
                {revisions.length}
              </Typography>
              <Typography variant="caption" sx={{ color: '#6B7280' }}>
                Toplam Revizyon
              </Typography>
            </Paper>
          </Grid>
          
          <Grid item xs={12} sm={6} md={3}>
            <Paper sx={{ p: 2, textAlign: 'center', backgroundColor: '#F0FDF4' }}>
              <Typography variant="h4" sx={{ color: '#16A34A', fontWeight: 'bold' }}>
                {revisions.filter(r => r.durumSonrasi === 'onaylandi').length}
              </Typography>
              <Typography variant="caption" sx={{ color: '#6B7280' }}>
                Onaylanan
              </Typography>
            </Paper>
          </Grid>
          
          <Grid item xs={12} sm={6} md={3}>
            <Paper sx={{ p: 2, textAlign: 'center', backgroundColor: '#FEF2F2' }}>
              <Typography variant="h4" sx={{ color: '#DC2626', fontWeight: 'bold' }}>
                {revisions.filter(r => r.durumSonrasi === 'reddedildi').length}
              </Typography>
              <Typography variant="caption" sx={{ color: '#6B7280' }}>
                Reddedilen
              </Typography>
            </Paper>
          </Grid>
          
          <Grid item xs={12} sm={6} md={3}>
            <Paper sx={{ p: 2, textAlign: 'center', backgroundColor: '#FFFBEB' }}>
              <Typography variant="h4" sx={{ color: '#D97706', fontWeight: 'bold' }}>
                {revisions.filter(r => r.durumSonrasi === 'inceleniyor').length}
              </Typography>
              <Typography variant="caption" sx={{ color: '#6B7280' }}>
                İncelenen
              </Typography>
            </Paper>
          </Grid>
        </Grid>

        <Divider sx={{ mb: 3 }} />

        <Timeline>
          {revisions.map((revision, index) => (
            <TimelineItem key={revision.revizyonNo || index}>
              <TimelineOppositeContent sx={{ m: 'auto 0' }} align="right" variant="body2" color="text.secondary">
                <Typography variant="caption" sx={{ fontWeight: 'bold' }}>
                  #{revision.revizyonNo}
                </Typography>
                <br />
                <Typography variant="caption">
                  {formatDate(revision.tarih)}
                </Typography>
              </TimelineOppositeContent>
              
              <TimelineSeparator>
                <TimelineDot 
                  sx={{ 
                    backgroundColor: revision.durumSonrasi === 'onaylandi' ? '#10B981' : 
                                   revision.durumSonrasi === 'reddedildi' ? '#EF4444' : 
                                   revision.durumSonrasi === 'inceleniyor' ? '#3B82F6' : '#6B7280',
                    color: 'white',
                    width: 44,
                    height: 44,
                    fontSize: '18px'
                  }}
                >
                  {revision.durumSonrasi === 'onaylandi' ? <CheckIcon /> : 
                   revision.durumSonrasi === 'reddedildi' ? <CloseIcon /> : 
                   revision.durumSonrasi === 'inceleniyor' ? <VisibilityIcon /> : <EditIcon />}
                </TimelineDot>
                {index < revisions.length - 1 && <TimelineConnector sx={{ bgcolor: '#E5E7EB' }} />}
              </TimelineSeparator>
              
              <TimelineContent sx={{ py: '12px', px: 2 }}>
                <Paper 
                  sx={{ 
                    p: 2, 
                    backgroundColor: revision.durumSonrasi === 'onaylandi' ? '#F0FDF4' : 
                                   revision.durumSonrasi === 'reddedildi' ? '#FEF2F2' : 
                                   revision.durumSonrasi === 'inceleniyor' ? '#EFF6FF' : '#F9FAFB',
                    border: `1px solid ${revision.durumSonrasi === 'onaylandi' ? '#BBF7D0' : 
                                        revision.durumSonrasi === 'reddedildi' ? '#FECACA' : 
                                        revision.durumSonrasi === 'inceleniyor' ? '#BFDBFE' : '#E5E7EB'}`
                  }}
                >
                  {/* Revizyon Başlığı */}
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                    <Typography variant="h6" sx={{ fontWeight: 600 }}>
                      {revision.sebep || 'Revizyon'}
                    </Typography>
                    
                    <Box sx={{ display: 'flex', gap: 1 }}>
                      {revision.durumOncesi && (
                        <Chip 
                          label={`${revision.durumOncesi} → ${revision.durumSonrasi}`}
                          size="small"
                          sx={{ 
                            backgroundColor: revision.durumSonrasi === 'onaylandi' ? '#16A34A' : 
                                           revision.durumSonrasi === 'reddedildi' ? '#DC2626' : 
                                           revision.durumSonrasi === 'inceleniyor' ? '#2563EB' : '#6B7280',
                            color: 'white',
                            fontWeight: 'bold'
                          }}
                        />
                      )}
                    </Box>
                  </Box>

                  {/* Kullanıcı Bilgileri */}
                  <Grid container spacing={2} sx={{ mb: 2 }}>
                    <Grid item xs={12} sm={6}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <PersonIcon sx={{ fontSize: 18, color: '#6B7280' }} />
                        <Typography variant="body2">
                          <strong>Yapan:</strong> {revision.yapanKullanici?.ad || 'Sistem'}
                        </Typography>
                      </Box>
                    </Grid>
                    
                    <Grid item xs={12} sm={6}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Chip 
                          label={revision.yapanKullanici?.rol || 'sistem'}
                          size="small"
                          variant="outlined"
                          sx={{ fontSize: '11px' }}
                        />
                      </Box>
                    </Grid>
                  </Grid>

                  {/* Değişiklik Detayları */}
                  {revision.degisikenAlanlar && revision.degisikenAlanlar.length > 0 && (
                    <Accordion sx={{ mt: 2 }}>
                      <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                        <Typography variant="body2" sx={{ fontWeight: 600 }}>
                          Değişiklik Detayları ({revision.degisikenAlanlar.length} alan)
                        </Typography>
                      </AccordionSummary>
                      <AccordionDetails>
                        {renderChangeDetails(revision.degisikenAlanlar)}
                      </AccordionDetails>
                    </Accordion>
                  )}
                </Paper>
              </TimelineContent>
            </TimelineItem>
          ))}
        </Timeline>
      </CardContent>
    </Card>
  );
};

export default RevisionTimeline;