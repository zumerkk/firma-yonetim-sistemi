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
  CircularProgress
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
  Schedule as ScheduleIcon
} from '@mui/icons-material';
import axios from '../utils/axios';

const RevisionTimeline = ({ tesvikId }) => {
  const [revisions, setRevisions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // 🎨 Revizyon Tipi Renk Haritası
  const getRevisionColor = (type) => {
    const colorMap = {
      'created': '#10B981',
      'updated': '#3B82F6',
      'status_changed': '#F59E0B',
      'approved': '#10B981',
      'rejected': '#EF4444',
      'document_added': '#8B5CF6',
      'financial_updated': '#F97316'
    };
    return colorMap[type] || '#6B7280';
  };

  // 🔄 Revizyon İkonu
  const getRevisionIcon = (type) => {
    const iconMap = {
      'created': '🆕',
      'updated': '✏️',
      'status_changed': '🔄',
      'approved': '✅',
      'rejected': '❌',
      'document_added': '📎',
      'financial_updated': '💰'
    };
    return iconMap[type] || '📝';
  };

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

  useEffect(() => {
    if (tesvikId) {
      loadRevisions();
    }
  }, [tesvikId]);

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
                    {change.field}
                  </Typography>
                </TableCell>
                <TableCell>
                  <Box sx={{ 
                    backgroundColor: '#fef2f2', 
                    color: '#dc2626',
                    p: 1,
                    borderRadius: 1,
                    fontSize: '0.8rem'
                  }}>
                    {change.oldValue || '-'}
                  </Box>
                </TableCell>
                <TableCell>
                  <Box sx={{ 
                    backgroundColor: '#f0fdf4', 
                    color: '#16a34a',
                    p: 1,
                    borderRadius: 1,
                    fontSize: '0.8rem'
                  }}>
                    {change.newValue || '-'}
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
        <Typography variant="h6" sx={{ mb: 3, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 1 }}>
          <ScheduleIcon sx={{ color: '#3B82F6' }} />
          Revizyon Geçmişi
          <Chip 
            label={`${revisions.length} revizyon`} 
            size="small" 
            sx={{ ml: 1 }}
          />
        </Typography>

        <Timeline>
          {revisions.map((revision, index) => (
            <TimelineItem key={revision._id || index}>
              <TimelineSeparator>
                <TimelineDot 
                  sx={{ 
                    backgroundColor: getRevisionColor(revision.type),
                    color: 'white',
                    width: 40,
                    height: 40
                  }}
                >
                  {getRevisionIcon(revision.type)}
                </TimelineDot>
                {index < revisions.length - 1 && <TimelineConnector />}
              </TimelineSeparator>
              
              <TimelineContent>
                <Accordion>
                  <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                    <Box sx={{ width: '100%' }}>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                        <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                          {revision.title || 'Revizyon'}
                        </Typography>
                        <Chip 
                          label={revision.type}
                          size="small"
                          sx={{ 
                            backgroundColor: getRevisionColor(revision.type),
                            color: 'white'
                          }}
                        />
                      </Box>
                      
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, color: 'text.secondary' }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                          <PersonIcon sx={{ fontSize: 16 }} />
                          <Typography variant="body2">
                            {revision.user?.name || 'Sistem'}
                          </Typography>
                        </Box>
                        
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                          <ScheduleIcon sx={{ fontSize: 16 }} />
                          <Typography variant="body2">
                            {formatDate(revision.createdAt)}
                          </Typography>
                        </Box>
                      </Box>
                    </Box>
                  </AccordionSummary>
                  
                  <AccordionDetails>
                    {revision.description && (
                      <Typography variant="body2" sx={{ mb: 2 }}>
                        {revision.description}
                      </Typography>
                    )}
                    
                    {revision.reason && (
                      <Alert severity="info" sx={{ mb: 2 }}>
                        <strong>Sebep:</strong> {revision.reason}
                      </Alert>
                    )}
                    
                    {revision.changes && renderChangeDetails(revision.changes)}
                    
                    {revision.notes && (
                      <Box sx={{ mt: 2, p: 2, backgroundColor: '#f8fafc', borderRadius: 1 }}>
                        <Typography variant="body2">
                          <strong>Notlar:</strong> {revision.notes}
                        </Typography>
                      </Box>
                    )}
                  </AccordionDetails>
                </Accordion>
              </TimelineContent>
            </TimelineItem>
          ))}
        </Timeline>
      </CardContent>
    </Card>
  );
};

export default RevisionTimeline;