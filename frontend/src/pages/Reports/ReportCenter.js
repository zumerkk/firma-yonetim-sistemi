// 📊 REPORT CENTER - ENTERPRISE ANALYTICS SUITE
// Comprehensive reporting system with PDF/Excel export, custom reports, advanced analytics

import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Typography,
  Grid,
  Card,
  CardContent,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  TextField,
  Chip,
  IconButton,
  Tooltip,
  LinearProgress,
  Snackbar,
  Tabs,
  Tab
} from '@mui/material';
import {
  Assessment as ReportIcon,
  PictureAsPdf as PdfIcon,
  TableChart as ExcelIcon,
  TrendingUp as TrendingUpIcon,
  BarChart as ChartIcon,
  DateRange as DateIcon,
  Download as DownloadIcon,
  Schedule as ScheduleIcon,
  Settings as SettingsIcon,
  Visibility as ViewIcon,
  Save as SaveIcon,
  Delete as DeleteIcon
} from '@mui/icons-material';
// 📅 Native HTML date inputs kullanıyoruz - daha stabil ve bağımlılık yok
import Header from '../../components/Layout/Header';
import Sidebar from '../../components/Layout/Sidebar';
// import { useAuth } from '../../contexts/AuthContext'; // Future use
import api from '../../utils/axios';

const ReportCenter = () => {
  // const { } = useAuth(); // user kullanılmıyor şimdilik
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 1024);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState(0);
  
  // 📊 REPORT STATE - Template için hazır
  const [reportTypes] = useState([
    { id: 'firma_summary', name: 'Firma Özet Raporu', description: 'Tüm firmaların genel durumu' },
    { id: 'tesvik_summary', name: 'Teşvik Özet Raporu', description: 'Tüm teşviklerin durumu' },
    { id: 'monthly_activity', name: 'Aylık Aktivite Raporu', description: 'Aylık sistem kullanımı' },
    { id: 'user_activity', name: 'Kullanıcı Aktivite Raporu', description: 'Kullanıcı bazlı işlemler' },
    { id: 'financial_summary', name: 'Mali Özet Raporu', description: 'Finansal veriler özeti' },
    { id: 'custom', name: 'Özel Rapor', description: 'Özelleştirilmiş rapor' }
  ]);
  
  // 📋 REPORT FILTERS
  const [filters, setFilters] = useState({
    reportType: '',
    dateFrom: null,
    dateTo: null,
    format: 'pdf', // pdf, excel, csv
    includeCharts: true,
    includeDetails: true,
    groupBy: 'il', // il, ay, kullanici
    firms: [],
    users: []
  });
  
  // 📈 REPORT TEMPLATES
  const [savedReports, setSavedReports] = useState([]);
  // const [reportDialog, setReportDialog] = useState({ open: false, mode: 'create', report: null }); // Future use
  const setReportDialog = () => {}; // Temporary placeholder
  
  // 📊 ANALYTICS DATA
  const [analytics, setAnalytics] = useState({
    totalReports: 0,
    monthlyReports: 0,
    mostUsedFormat: 'PDF',
    averageGenerationTime: '2.3s'
  });
  
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });

  // 📱 Responsive handling
  useEffect(() => {
    const handleResize = () => {
      const mobile = window.innerWidth < 1024;
      setIsMobile(mobile);
      if (mobile) setSidebarOpen(false);
      else setSidebarOpen(true);
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // 📢 Snackbar helper - EN ÖNCE tanımla
  const showSnackbar = useCallback((message, severity = 'success') => {
    setSnackbar({ open: true, message, severity });
  }, []);

  // 📊 Load initial data
  const loadReportData = useCallback(async () => {
    setLoading(true);
    try {
      const [reportsResponse, analyticsResponse] = await Promise.all([
        api.get('/reports/saved'),
        api.get('/reports/analytics')
      ]);

      if (reportsResponse.data.success) {
        setSavedReports(reportsResponse.data.data);
      }

      if (analyticsResponse.data.success) {
        setAnalytics(analyticsResponse.data.data);
      }
    } catch (error) {
      console.error('Report data loading error:', error);
      showSnackbar('Rapor verileri yüklenirken hata oluştu', 'error');
    } finally {
      setLoading(false);
    }
  }, [showSnackbar]); // ✅ showSnackbar dependency eklendi

  useEffect(() => {
    loadReportData();
  }, [loadReportData]);

  // 📊 REPORT GENERATION
  const generateReport = async (reportConfig) => {
    try {
      setLoading(true);
      
      console.log('📊 Rapor oluşturuluyor:', reportConfig);
      
      // Determine format from reportConfig or use default
      const format = reportConfig.format || filters.format || 'pdf';
      
      const response = await api.post('/reports/generate', {
        type: reportConfig.reportType,
        filters: {
          ...filters,
          dateFrom: filters.dateFrom || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          dateTo: filters.dateTo || new Date().toISOString().split('T')[0]
        },
        format: format,
        config: reportConfig
      });

      if (response.data.success) {
        const { downloadUrl, fileName } = response.data.data;
        
        // Create full download URL - baseURL already includes /api now
        const fullDownloadUrl = downloadUrl.startsWith('http') 
          ? downloadUrl 
          : `${process.env.REACT_APP_API_URL || 'http://localhost:5001'}${downloadUrl}`;
        
        // Download file
        try {
          const downloadResponse = await fetch(fullDownloadUrl, {
            headers: {
              'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
          });
          
          if (downloadResponse.ok) {
            const blob = await downloadResponse.blob();
            const url = window.URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = fileName;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            window.URL.revokeObjectURL(url);
            
            showSnackbar(`Rapor başarıyla oluşturuldu: ${fileName}`, 'success');
          } else {
            throw new Error('Dosya indirilemedi');
          }
        } catch (downloadError) {
          console.error('Download error:', downloadError);
          showSnackbar('Dosya indirilemedi', 'error');
        }
        
        // Refresh analytics
        loadReportData();
      } else {
        showSnackbar(response.data.message || 'Rapor oluşturulamadı', 'error');
      }
      
    } catch (error) {
      console.error('Report generation error:', error);
      const errorMessage = error.response?.data?.message || 'Rapor oluşturulurken hata oluştu';
      showSnackbar(errorMessage, 'error');
    } finally {
      setLoading(false);
    }
  };

  // 💾 SAVE REPORT TEMPLATE - Future implementation
  /*
  const saveReportTemplate = async (templateData) => {
    try {
      setLoading(true);
      
      const response = await api.post('/reports/templates', {
        name: templateData.name,
        description: templateData.description,
        config: {
          reportType: filters.reportType,
          filters: filters,
          settings: templateData.settings
        }
      });

      if (response.data.success) {
        showSnackbar('Rapor şablonu başarıyla kaydedildi', 'success');
        loadReportData();
      }
      
    } catch (error) {
      console.error('Save template error:', error);
      showSnackbar('Şablon kaydedilirken hata oluştu', 'error');
    } finally {
      setLoading(false);
    }
  };
  */

  // 📊 QUICK REPORTS
  const quickReportButtons = [
    {
      title: 'Firma Listesi PDF',
      description: 'Tüm firmaların PDF listesi',
      icon: <PdfIcon />,
      color: '#dc2626',
      action: () => generateReport({ reportType: 'firma_summary', format: 'pdf' })
    },
    {
      title: 'Teşvik Excel',
      description: 'Teşvik verilerinin Excel tablosu',
      icon: <ExcelIcon />,
      color: '#059669',
      action: () => generateReport({ reportType: 'tesvik_summary', format: 'excel' })
    },
    {
      title: 'Aylık Aktivite',
      description: 'Son 30 günün aktivite raporu',
      icon: <TrendingUpIcon />,
      color: '#7c3aed',
      action: () => generateReport({ reportType: 'monthly_activity', format: 'pdf' })
    },
    {
      title: 'Mali Özet',
      description: 'Finansal veriler özet raporu',
      icon: <ChartIcon />,
      color: '#ea580c',
      action: () => generateReport({ reportType: 'financial_summary', format: 'excel' })
    }
  ];

  // 📊 ANALYTICS CARDS
  const renderAnalyticsCards = () => (
    <Grid container spacing={3} sx={{ mb: 3 }}>
      <Grid item xs={12} sm={6} md={3}>
        <Card sx={{ background: '#667eea', color: 'white' }}>
          <CardContent>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <Box>
                <Typography variant="h4" sx={{ fontWeight: 'bold' }}>
                  {analytics.totalReports}
                </Typography>
                <Typography variant="body2" sx={{ opacity: 0.8 }}>
                  Toplam Rapor
                </Typography>
              </Box>
              <ReportIcon sx={{ fontSize: 40, opacity: 0.8 }} />
            </Box>
          </CardContent>
        </Card>
      </Grid>
      
      <Grid item xs={12} sm={6} md={3}>
        <Card sx={{ background: '#f5576c', color: 'white' }}>
          <CardContent>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <Box>
                <Typography variant="h4" sx={{ fontWeight: 'bold' }}>
                  {analytics.monthlyReports}
                </Typography>
                <Typography variant="body2" sx={{ opacity: 0.8 }}>
                  Bu Ay
                </Typography>
              </Box>
              <DateIcon sx={{ fontSize: 40, opacity: 0.8 }} />
            </Box>
          </CardContent>
        </Card>
      </Grid>
      
      <Grid item xs={12} sm={6} md={3}>
        <Card sx={{ background: '#4facfe', color: 'white' }}>
          <CardContent>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <Box>
                <Typography variant="h4" sx={{ fontWeight: 'bold' }}>
                  {analytics.mostUsedFormat}
                </Typography>
                <Typography variant="body2" sx={{ opacity: 0.8 }}>
                  En Çok Kullanılan
                </Typography>
              </Box>
              <DownloadIcon sx={{ fontSize: 40, opacity: 0.8 }} />
            </Box>
          </CardContent>
        </Card>
      </Grid>
      
      <Grid item xs={12} sm={6} md={3}>
        <Card sx={{ background: '#43e97b', color: 'white' }}>
          <CardContent>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <Box>
                <Typography variant="h4" sx={{ fontWeight: 'bold' }}>
                  {analytics.averageGenerationTime}
                </Typography>
                <Typography variant="body2" sx={{ opacity: 0.8 }}>
                  Ortalama Süre
                </Typography>
              </Box>
              <ScheduleIcon sx={{ fontSize: 40, opacity: 0.8 }} />
            </Box>
          </CardContent>
        </Card>
      </Grid>
    </Grid>
  );

  // 🚀 QUICK REPORTS TAB
  const renderQuickReports = () => (
    <Box>
      <Typography variant="h6" sx={{ mb: 3, fontWeight: 600 }}>
        🚀 Hızlı Raporlar
      </Typography>
      
      <Grid container spacing={3}>
        {quickReportButtons.map((report, index) => (
          <Grid item xs={12} sm={6} md={3} key={index}>
            <Card 
              sx={{ 
                height: '100%',
                cursor: 'pointer',
                transition: 'transform 0.2s, box-shadow 0.2s',
                '&:hover': {
                  transform: 'translateY(-4px)',
                }
              }}
              onClick={report.action}
            >
              <CardContent sx={{ textAlign: 'center', p: 3 }}>
                <Box sx={{ color: report.color, mb: 2 }}>
                  {React.cloneElement(report.icon, { sx: { fontSize: 48 } })}
                </Box>
                <Typography variant="h6" sx={{ mb: 1, fontWeight: 600 }}>
                  {report.title}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {report.description}
                </Typography>
                <Button
                  variant="contained"
                  size="small"
                  sx={{ 
                    mt: 2, 
                    backgroundColor: report.color,
                    '&:hover': { backgroundColor: report.color }
                  }}
                  startIcon={<DownloadIcon />}
                >
                  İndir
                </Button>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>
    </Box>
  );

  // ⚙️ CUSTOM REPORTS TAB
  const renderCustomReports = () => (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h6" sx={{ fontWeight: 600 }}>
          ⚙️ Özel Rapor Oluştur
        </Typography>
        <Button
          variant="contained"
          startIcon={<SaveIcon />}
          onClick={() => setReportDialog({ open: true, mode: 'create', report: null })}
          sx={{ fontWeight: 600 }}
        >
          Şablon Kaydet
        </Button>
      </Box>

      <Card sx={{ p: 3, mb: 3 }}>
        <Grid container spacing={3}>
          <Grid item xs={12} md={4}>
            <FormControl fullWidth>
              <InputLabel>Rapor Türü</InputLabel>
              <Select
                value={filters.reportType}
                onChange={(e) => setFilters(prev => ({ ...prev, reportType: e.target.value }))}
              >
                {reportTypes.map((type) => (
                  <MenuItem key={type.id} value={type.id}>
                    {type.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
          
          <Grid item xs={12} md={4}>
            <FormControl fullWidth>
              <InputLabel>Format</InputLabel>
              <Select
                value={filters.format}
                onChange={(e) => setFilters(prev => ({ ...prev, format: e.target.value }))}
              >
                <MenuItem value="pdf">PDF</MenuItem>
                <MenuItem value="excel">Excel</MenuItem>
                <MenuItem value="csv">CSV</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          
          <Grid item xs={12} md={4}>
            <FormControl fullWidth>
              <InputLabel>Gruplama</InputLabel>
              <Select
                value={filters.groupBy}
                onChange={(e) => setFilters(prev => ({ ...prev, groupBy: e.target.value }))}
              >
                <MenuItem value="il">İl</MenuItem>
                <MenuItem value="ay">Ay</MenuItem>
                <MenuItem value="kullanici">Kullanıcı</MenuItem>
                <MenuItem value="none">Gruplamadan</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          
          <Grid item xs={12} md={6}>
            <TextField
              type="date"
              label="Başlangıç Tarihi"
              value={filters.dateFrom ? filters.dateFrom.toISOString().split('T')[0] : ''}
              onChange={(e) => setFilters(prev => ({ 
                ...prev, 
                dateFrom: e.target.value ? new Date(e.target.value) : null 
              }))}
              fullWidth
              InputLabelProps={{ shrink: true }}
            />
          </Grid>
          
          <Grid item xs={12} md={6}>
            <TextField
              type="date"
              label="Bitiş Tarihi"
              value={filters.dateTo ? filters.dateTo.toISOString().split('T')[0] : ''}
              onChange={(e) => setFilters(prev => ({ 
                ...prev, 
                dateTo: e.target.value ? new Date(e.target.value) : null 
              }))}
              fullWidth
              InputLabelProps={{ shrink: true }}
            />
          </Grid>
        </Grid>
        
        <Box sx={{ mt: 3, display: 'flex', gap: 2, justifyContent: 'flex-end' }}>
          <Button
            variant="outlined"
            startIcon={<ViewIcon />}
            onClick={() => console.log('Preview report')}
          >
            Önizleme
          </Button>
          <Button
            variant="contained"
            startIcon={<DownloadIcon />}
            onClick={() => generateReport(filters)}
            disabled={loading || !filters.reportType}
            sx={{ fontWeight: 600 }}
          >
            {loading ? 'Oluşturuluyor...' : 'Rapor Oluştur'}
          </Button>
        </Box>
      </Card>
    </Box>
  );

  // 📋 SAVED REPORTS TAB
  const renderSavedReports = () => (
    <Box>
      <Typography variant="h6" sx={{ mb: 3, fontWeight: 600 }}>
        📋 Kaydedilmiş Şablonlar
      </Typography>
      
      <TableContainer component={Paper}>
        <Table>
          <TableHead sx={{ backgroundColor: '#f8fafc' }}>
            <TableRow>
              <TableCell sx={{ fontWeight: 600 }}>Şablon Adı</TableCell>
              <TableCell sx={{ fontWeight: 600 }}>Açıklama</TableCell>
              <TableCell sx={{ fontWeight: 600 }}>Türü</TableCell>
              <TableCell sx={{ fontWeight: 600 }}>Oluşturma Tarihi</TableCell>
              <TableCell sx={{ fontWeight: 600 }}>İşlemler</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {savedReports.map((report) => (
              <TableRow key={report._id} hover>
                <TableCell>
                  <Typography variant="body2" sx={{ fontWeight: 600 }}>
                    {report.name}
                  </Typography>
                </TableCell>
                <TableCell>{report.description}</TableCell>
                <TableCell>
                  <Chip
                    label={report.config?.reportType || 'Bilinmiyor'}
                    size="small"
                    variant="outlined"
                  />
                </TableCell>
                <TableCell>
                  {new Date(report.createdAt).toLocaleDateString('tr-TR')}
                </TableCell>
                <TableCell>
                  <Box sx={{ display: 'flex', gap: 1 }}>
                    <Tooltip title="Rapor Oluştur">
                      <IconButton
                        size="small"
                        onClick={() => generateReport(report.config)}
                      >
                        <DownloadIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Düzenle">
                      <IconButton
                        size="small"
                        onClick={() => setReportDialog({ open: true, mode: 'edit', report })}
                      >
                        <SettingsIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Sil">
                      <IconButton
                        size="small"
                        sx={{ color: '#dc2626' }}
                      >
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  </Box>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );

  return (
    <Box sx={{ 
      display: 'grid',
      gridTemplateRows: '64px 1fr',
      gridTemplateColumns: {
        xs: '1fr',
        lg: sidebarOpen ? '280px 1fr' : '1fr'
      },
      gridTemplateAreas: {
        xs: '"header" "content"',
        lg: sidebarOpen ? '"header header" "sidebar content"' : '"header" "content"'
      },
      height: '100vh',
      backgroundColor: '#f8fafc'
    }}>
      {/* Header */}
      <Box sx={{ gridArea: 'header', zIndex: 1201 }}>
        <Header onSidebarToggle={() => setSidebarOpen(!sidebarOpen)} />
      </Box>

      {/* Sidebar */}
      {!isMobile && sidebarOpen && (
        <Box sx={{ gridArea: 'sidebar', zIndex: 1200 }}>
          <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} variant="persistent" />
        </Box>
      )}

      {isMobile && (
        <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} variant="temporary" />
      )}

      {/* Main Content */}
      <Box
        component="main"
        sx={{
          gridArea: 'content',
          overflow: 'auto',
          p: { xs: 2, sm: 2.5, md: 3 },
          display: 'flex',
          flexDirection: 'column'
        }}
      >
          {/* Page Header */}
          <Box sx={{ mb: 3 }}>
            <Typography variant="h4" sx={{ fontWeight: 'bold', mb: 1, display: 'flex', alignItems: 'center', gap: 2 }}>
              <ReportIcon sx={{ fontSize: 40, color: '#1976d2' }} />
              Rapor Merkezi
            </Typography>
            <Typography variant="body1" color="text.secondary">
              Kapsamlı raporlama sistemi - PDF/Excel export, özel raporlar, analitik
            </Typography>
          </Box>

          {/* Analytics Cards */}
          {renderAnalyticsCards()}

          {/* Main Content Tabs */}
          <Card sx={{  
            overflow: 'hidden',
            flex: 1, // ✅ Flex grow to fill available space
            display: 'flex',
            flexDirection: 'column'
          }}>
            <Tabs value={activeTab} onChange={(e, newValue) => setActiveTab(newValue)}>
              <Tab label="🚀 Hızlı Raporlar" />
              <Tab label="⚙️ Özel Rapor" />
              <Tab label="📋 Kaydedilmiş Şablonlar" />
            </Tabs>
            
            <CardContent sx={{ 
              p: 3,
              flex: 1, // ✅ Grow to fill available Card space
              overflow: 'auto' // ✅ Enable scroll within card content
            }}>
              {loading && <LinearProgress sx={{ mb: 2 }} />}
              
              {activeTab === 0 && renderQuickReports()}
              {activeTab === 1 && renderCustomReports()}
              {activeTab === 2 && renderSavedReports()}
            </CardContent>
          </Card>

        {/* Snackbar */}
        <Snackbar
          open={snackbar.open}
          autoHideDuration={6000}
          onClose={() => setSnackbar(prev => ({ ...prev, open: false }))}
          message={snackbar.message}
        />
      </Box>
    </Box>
  );
};

export default ReportCenter;