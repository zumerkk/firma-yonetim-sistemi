// 📊 REPORT GENERATOR - ENTERPRISE REPORTING COMPONENT
// Advanced report generation with templates, filters, scheduling

import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Button,
  Grid,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  TextField,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Alert,
  LinearProgress,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  IconButton,
  Tooltip,
  Divider
} from '@mui/material';
import {
  Assessment as ReportIcon,
  PictureAsPdf as PdfIcon,
  TableChart as ExcelIcon,
  DateRange as DateIcon,
  FilterList as FilterIcon,
  Download as DownloadIcon,
  Save as SaveIcon,
  Schedule as ScheduleIcon,
  Close as CloseIcon,
  Business as BusinessIcon,
  EmojiEvents as TesvikIcon,
  People as PeopleIcon,
  TrendingUp as TrendIcon
} from '@mui/icons-material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { tr } from 'date-fns/locale';
import api from '../../utils/axios';

const ReportGenerator = ({ open, onClose }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  
  // 📊 Report Configuration
  const [reportConfig, setReportConfig] = useState({
    type: '',
    format: 'excel',
    title: '',
    description: '',
    filters: {
      dateFrom: null,
      dateTo: null,
      il: '',
      durum: '',
      firma: ''
    },
    options: {
      includeCharts: true,
      includeDetails: true,
      groupBy: 'il',
      sortBy: 'createdAt',
      sortOrder: 'desc'
    }
  });

  // 📋 Report Templates
  const reportTemplates = [
    {
      id: 'firma_summary',
      name: 'Firma Özet Raporu',
      description: 'Tüm firmaların genel özeti ve istatistikleri',
      icon: <BusinessIcon />,
      category: 'Firma',
      defaultFilters: {},
      fields: ['firmaId', 'tamUnvan', 'firmaIl', 'aktif', 'createdAt']
    },
    {
      id: 'tesvik_summary',
      name: 'Teşvik Özet Raporu',
      description: 'Teşvik belgelerinin durum ve analiz raporu',
      icon: <TesvikIcon />,
      category: 'Teşvik',
      defaultFilters: {},
      fields: ['tesvikId', 'gmId', 'yatirimciUnvan', 'durum', 'il']
    },
    {
      id: 'monthly_activity',
      name: 'Aylık Aktivite Raporu',
      description: 'Sistem kullanımı ve aktivite analizi',
      icon: <TrendIcon />,
      category: 'Sistem',
      defaultFilters: { dateFrom: new Date(new Date().setMonth(new Date().getMonth() - 1)) },
      fields: ['action', 'category', 'user', 'createdAt']
    },
    {
      id: 'user_activity',
      name: 'Kullanıcı Aktivite Raporu',
      description: 'Kullanıcı bazlı işlem ve performans raporu',
      icon: <PeopleIcon />,
      category: 'Kullanıcı',
      defaultFilters: {},
      fields: ['user', 'action', 'count', 'lastActivity']
    },
    {
      id: 'financial_summary',
      name: 'Mali Özet Raporu',
      description: 'Teşvik tutarları ve mali analiz raporu',
      icon: <ReportIcon />,
      category: 'Mali',
      defaultFilters: {},
      fields: ['yatirimTutari', 'tesvikMiktari', 'tesvikOrani']
    }
  ];

  // 🎨 Format Options
  const formatOptions = [
    { value: 'excel', label: 'Excel (.xlsx)', icon: <ExcelIcon /> },
    { value: 'pdf', label: 'PDF (.pdf)', icon: <PdfIcon /> },
    // TableChart, yukarıda `TableChart as ExcelIcon` diye içe aktarılmış;
    // çıplak adı TANIMSIZ. <TableChart /> render edilince React çökerdi.
    { value: 'csv', label: 'CSV (.csv)', icon: <ExcelIcon /> }
  ];

  // 📊 Handle template selection
  const handleTemplateSelect = (template) => {
    setReportConfig(prev => ({
      ...prev,
      type: template.id,
      title: template.name,
      description: template.description,
      filters: {
        ...prev.filters,
        ...template.defaultFilters
      }
    }));
  };

  // 🔧 Handle filter change
  const handleFilterChange = (field, value) => {
    setReportConfig(prev => ({
      ...prev,
      filters: {
        ...prev.filters,
        [field]: value
      }
    }));
  };

  // ⚙️ Handle option change
  const handleOptionChange = (field, value) => {
    setReportConfig(prev => ({
      ...prev,
      options: {
        ...prev.options,
        [field]: value
      }
    }));
  };

  // 📊 Generate Report
  const handleGenerateReport = async () => {
    if (!reportConfig.type) {
      setError('Lütfen bir rapor türü seçin');
      return;
    }

    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const response = await api.post('/reports/generate', {
        type: reportConfig.type,
        format: reportConfig.format,
        filters: reportConfig.filters,
        config: reportConfig.options
      });

      if (response.data.success) {
        setSuccess(`Rapor başarıyla oluşturuldu: ${response.data.data.fileName}`);
        
        // Download the report
        const downloadUrl = response.data.data.downloadUrl;
        const link = document.createElement('a');
        link.href = `${api.defaults.baseURL}${downloadUrl}`;
        link.download = response.data.data.fileName;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        // Close dialog after 2 seconds
        setTimeout(() => {
          handleClose();
        }, 2000);
      }
    } catch (error) {
      console.error('🚨 Report generation error:', error);
      setError(error.response?.data?.message || 'Rapor oluşturulurken hata oluştu');
    } finally {
      setLoading(false);
    }
  };

  // 🧹 Close and reset
  const handleClose = () => {
    if (!loading) {
      setReportConfig({
        type: '',
        format: 'excel',
        title: '',
        description: '',
        filters: {
          dateFrom: null,
          dateTo: null,
          il: '',
          durum: '',
          firma: ''
        },
        options: {
          includeCharts: true,
          includeDetails: true,
          groupBy: 'il',
          sortBy: 'createdAt',
          sortOrder: 'desc'
        }
      });
      setError(null);
      setSuccess(null);
      onClose();
    }
  };

  // 🎨 Get category color
  const getCategoryColor = (category) => {
    const colors = {
      'Firma': '#3b82f6',
      'Teşvik': '#dc2626',
      'Sistem': '#059669',
      'Kullanıcı': '#7c3aed',
      'Mali': '#f59e0b'
    };
    return colors[category] || '#6b7280';
  };

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      maxWidth="lg"
      fullWidth
      disableEscapeKeyDown={loading}
    >
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
        <ReportIcon color="primary" />
        Rapor Oluşturucu
        {!loading && (
          <IconButton onClick={handleClose} sx={{ ml: 'auto' }}>
            <CloseIcon />
          </IconButton>
        )}
      </DialogTitle>

      <DialogContent>
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        {success && (
          <Alert severity="success" sx={{ mb: 2 }}>
            {success}
          </Alert>
        )}

        {loading && (
          <Box sx={{ mb: 2 }}>
            <Typography variant="body2" sx={{ mb: 1 }}>
              Rapor oluşturuluyor...
            </Typography>
            <LinearProgress />
          </Box>
        )}

        <Grid container spacing={3}>
          {/* Report Templates */}
          <Grid item xs={12} md={6}>
            <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>
              📊 Rapor Şablonları
            </Typography>
            
            <List>
              {reportTemplates.map((template) => (
                <ListItem
                  key={template.id}
                  button
                  selected={reportConfig.type === template.id}
                  onClick={() => handleTemplateSelect(template)}
                  sx={{
                    border: 1,
                    borderColor: reportConfig.type === template.id ? 'primary.main' : 'divider',
                    mb: 1,
                    backgroundColor: reportConfig.type === template.id ? 'action.selected' : 'background.paper'
                  }}
                >
                  <ListItemIcon sx={{ color: getCategoryColor(template.category) }}>
                    {template.icon}
                  </ListItemIcon>
                  <ListItemText
                    primary={
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Typography variant="subtitle2">
                          {template.name}
                        </Typography>
                        <Chip
                          label={template.category}
                          size="small"
                          sx={{
                            backgroundColor: getCategoryColor(template.category),
                            color: 'white',
                            fontSize: '0.7rem'
                          }}
                        />
                      </Box>
                    }
                    secondary={template.description}
                  />
                </ListItem>
              ))}
            </List>
          </Grid>

          {/* Configuration */}
          <Grid item xs={12} md={6}>
            <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>
              ⚙️ Rapor Ayarları
            </Typography>

            {/* Format Selection */}
            <FormControl fullWidth sx={{ mb: 2 }}>
              <InputLabel>Dosya Formatı</InputLabel>
              <Select
                value={reportConfig.format}
                onChange={(e) => setReportConfig(prev => ({ ...prev, format: e.target.value }))}
                label="Dosya Formatı"
              >
                {formatOptions.map((option) => (
                  <MenuItem key={option.value} value={option.value}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      {option.icon}
                      {option.label}
                    </Box>
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            {/* Date Filters */}
            <LocalizationProvider dateAdapter={AdapterDateFns} adapterLocale={tr}>
              <Grid container spacing={2} sx={{ mb: 2 }}>
                <Grid item xs={6}>
                  <DatePicker
                    label="Başlangıç Tarihi"
                    value={reportConfig.filters.dateFrom}
                    onChange={(date) => handleFilterChange('dateFrom', date)}
                    renderInput={(params) => <TextField {...params} fullWidth />}
                  />
                </Grid>
                <Grid item xs={6}>
                  <DatePicker
                    label="Bitiş Tarihi"
                    value={reportConfig.filters.dateTo}
                    onChange={(date) => handleFilterChange('dateTo', date)}
                    renderInput={(params) => <TextField {...params} fullWidth />}
                  />
                </Grid>
              </Grid>
            </LocalizationProvider>

            {/* Additional Filters */}
            <Grid container spacing={2} sx={{ mb: 2 }}>
              <Grid item xs={6}>
                <TextField
                  fullWidth
                  label="İl Filtresi"
                  value={reportConfig.filters.il}
                  onChange={(e) => handleFilterChange('il', e.target.value)}
                  placeholder="İl adı girin..."
                />
              </Grid>
              <Grid item xs={6}>
                <FormControl fullWidth>
                  <InputLabel>Durum Filtresi</InputLabel>
                  <Select
                    value={reportConfig.filters.durum}
                    onChange={(e) => handleFilterChange('durum', e.target.value)}
                    label="Durum Filtresi"
                  >
                    <MenuItem value="">Tümü</MenuItem>
                    <MenuItem value="aktif">Aktif</MenuItem>
                    <MenuItem value="pasif">Pasif</MenuItem>
                    <MenuItem value="onaylandi">Onaylandı</MenuItem>
                    <MenuItem value="beklemede">Beklemede</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
            </Grid>

            <Divider sx={{ my: 2 }} />

            {/* Report Options */}
            <Typography variant="subtitle1" sx={{ mb: 1, fontWeight: 600 }}>
              📋 Rapor Seçenekleri
            </Typography>

            <Grid container spacing={2}>
              <Grid item xs={6}>
                <FormControl fullWidth>
                  <InputLabel>Gruplama</InputLabel>
                  <Select
                    value={reportConfig.options.groupBy}
                    onChange={(e) => handleOptionChange('groupBy', e.target.value)}
                    label="Gruplama"
                  >
                    <MenuItem value="il">İl</MenuItem>
                    <MenuItem value="durum">Durum</MenuItem>
                    <MenuItem value="tarih">Tarih</MenuItem>
                    <MenuItem value="kullanici">Kullanıcı</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={6}>
                <FormControl fullWidth>
                  <InputLabel>Sıralama</InputLabel>
                  <Select
                    value={reportConfig.options.sortBy}
                    onChange={(e) => handleOptionChange('sortBy', e.target.value)}
                    label="Sıralama"
                  >
                    <MenuItem value="createdAt">Oluşturma Tarihi</MenuItem>
                    <MenuItem value="updatedAt">Güncelleme Tarihi</MenuItem>
                    <MenuItem value="name">İsim</MenuItem>
                    <MenuItem value="status">Durum</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
            </Grid>
          </Grid>
        </Grid>
      </DialogContent>

      <DialogActions sx={{ p: 3 }}>
        <Button
          onClick={handleClose}
          disabled={loading}
        >
          İptal
        </Button>
        <Button
          onClick={handleGenerateReport}
          variant="contained"
          disabled={loading || !reportConfig.type}
          startIcon={<DownloadIcon />}
        >
          {loading ? 'Oluşturuluyor...' : 'Rapor Oluştur'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default ReportGenerator;