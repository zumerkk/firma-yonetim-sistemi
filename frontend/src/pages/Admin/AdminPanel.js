// 🔐 ADMIN PANEL - ENTERPRISE SYSTEM MANAGEMENT
// Temiz JSX structure ile responsive admin dashboard

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
  TextField,
  Switch,
  Chip,
  IconButton,
  Tooltip,
  Snackbar,
  Alert,
  Tabs,
  Tab,
  LinearProgress,
  Avatar,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions
} from '@mui/material';
import {
  AdminPanelSettings as AdminIcon,
  People as PeopleIcon,
  Assessment as AssessmentIcon,
  Security as SecurityIcon,
  Storage as StorageIcon,
  Speed as SpeedIcon,
  Backup as BackupIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Add as AddIcon
} from '@mui/icons-material';
import Header from '../../components/Layout/Header';
import Sidebar from '../../components/Layout/Sidebar';
import { useAuth } from '../../contexts/AuthContext';
import api from '../../utils/axios';

const AdminPanel = () => {
  const { user } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 1024);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState(0);
  
  // 📊 System Data State - Defensive initial values
  const [systemMetrics, setSystemMetrics] = useState({
    users: { total: 0, active: 0, admin: 0, lastWeek: 0 },
    firmas: { total: 0, active: 0, recent: 0 }, // ✅ Backend uyumlu
    tesviks: { total: 0, active: 0, pending: 0 }, // ✅ Backend uyumlu  
    activities: { today: 0, week: 0, month: 0 }, // ✅ Backend uyumlu
    performance: { cpu: 0, memory: 0, storage: 0 }
  });
  
  const [users, setUsers] = useState([]);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });
  const [userDialog, setUserDialog] = useState({ open: false, mode: 'add', user: null });

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

  // 📢 Snackbar helper - EN ÖNCE tanımla (CRITICAL)
  const showSnackbar = useCallback((message, severity = 'success') => {
    setSnackbar({ open: true, message, severity });
  }, []);

  // 📊 Load System Data - Enhanced error handling  
  const loadSystemData = useCallback(async () => {
    setLoading(true);
    try {
      const [usersResponse, metricsResponse] = await Promise.all([
        api.get('/admin/users'),
        api.get('/admin/system-metrics') // ✅ Backend'deki doğru endpoint adı
      ]);

      // ✅ Users data handling
      if (usersResponse.data.success && usersResponse.data.data) {
        setUsers(usersResponse.data.data.users || []);
      }

      // ✅ Metrics data handling with fallback
      if (metricsResponse.data.success && metricsResponse.data.data) {
        setSystemMetrics(prev => ({
          ...prev,
          ...metricsResponse.data.data // Merge ile mevcut state'i koru
        }));
      }
    } catch (error) {
      console.error('❌ API Response Error:', error);
      console.error('System data loading error:', error);
      showSnackbar('Sistem verileri yüklenirken hata oluştu', 'error');
    } finally {
      setLoading(false);
    }
  }, [showSnackbar]); // ✅ Dependency array'e showSnackbar eklendi

  useEffect(() => {
    loadSystemData();
  }, [loadSystemData]);

  // 🚫 Access control check
  if (user?.rol !== 'admin') {
    return (
      <Box sx={{ display: 'flex', height: '100vh' }}>
        <Header sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} />
        <Sidebar open={sidebarOpen} />
        <Box sx={{ 
          marginLeft: sidebarOpen && !isMobile ? '280px' : '0',
          marginTop: '64px',
          padding: 3,
          flex: 1
        }}>
          <Alert severity="error" sx={{ borderRadius: 2 }}>
            <Typography variant="h6" sx={{ mb: 1 }}>
              🚫 Erişim Engellendi
            </Typography>
            <Typography>
              Bu sayfaya sadece admin kullanıcılar erişebilir.
            </Typography>
          </Alert>
        </Box>
      </Box>
    );
  }

  // 📊 METRICS CARDS - Defensive programming ile güvenli
  const renderMetricsCards = () => (
    <Grid container spacing={3} sx={{ mb: 4 }}>
      <Grid item xs={12} sm={6} md={3}>
        <Card sx={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', color: 'white' }}>
          <CardContent>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <Box>
                <Typography variant="h4" sx={{ fontWeight: 'bold' }}>
                  {systemMetrics?.users?.total || 0}
                </Typography>
                <Typography variant="body2">Toplam Kullanıcı</Typography>
              </Box>
              <PeopleIcon sx={{ fontSize: 40, opacity: 0.8 }} />
            </Box>
          </CardContent>
        </Card>
      </Grid>
      
      <Grid item xs={12} sm={6} md={3}>
        <Card sx={{ background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)', color: 'white' }}>
          <CardContent>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <Box>
                <Typography variant="h4" sx={{ fontWeight: 'bold' }}>
                  {systemMetrics?.firmas?.total || 0}
                </Typography>
                <Typography variant="body2">Toplam Firma</Typography>
              </Box>
              <AssessmentIcon sx={{ fontSize: 40, opacity: 0.8 }} />
            </Box>
          </CardContent>
        </Card>
      </Grid>
      
      <Grid item xs={12} sm={6} md={3}>
        <Card sx={{ background: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)', color: 'white' }}>
          <CardContent>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <Box>
                <Typography variant="h4" sx={{ fontWeight: 'bold' }}>
                  {systemMetrics?.tesviks?.total || 0}
                </Typography>
                <Typography variant="body2">Toplam Teşvik</Typography>
              </Box>
              <SecurityIcon sx={{ fontSize: 40, opacity: 0.8 }} />
            </Box>
          </CardContent>
        </Card>
      </Grid>
      
      <Grid item xs={12} sm={6} md={3}>
        <Card sx={{ background: 'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)', color: 'white' }}>
          <CardContent>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <Box>
                <Typography variant="h4" sx={{ fontWeight: 'bold' }}>
                  {systemMetrics?.performance?.memory || 0}%
                </Typography>
                <Typography variant="body2">Sistem Performansı</Typography>
              </Box>
              <SpeedIcon sx={{ fontSize: 40, opacity: 0.8 }} />
            </Box>
          </CardContent>
        </Card>
      </Grid>
    </Grid>
  );

  // 👥 USER MANAGEMENT TAB
  const renderUserManagement = () => (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h6" sx={{ fontWeight: 600 }}>
          👥 Kullanıcı Yönetimi
        </Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => setUserDialog({ open: true, mode: 'add', user: null })}
          sx={{ fontWeight: 600 }}
        >
          Yeni Kullanıcı
        </Button>
      </Box>

      <TableContainer component={Paper} sx={{ borderRadius: 2 }}>
        <Table>
          <TableHead sx={{ backgroundColor: '#f8fafc' }}>
            <TableRow>
              <TableCell sx={{ fontWeight: 600 }}>Kullanıcı</TableCell>
              <TableCell sx={{ fontWeight: 600 }}>Email</TableCell>
              <TableCell sx={{ fontWeight: 600 }}>Rol</TableCell>
              <TableCell sx={{ fontWeight: 600 }}>Durum</TableCell>
              <TableCell sx={{ fontWeight: 600 }}>Son Giriş</TableCell>
              <TableCell sx={{ fontWeight: 600 }}>İşlemler</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {users.map((userData) => (
              <TableRow key={userData._id} hover>
                <TableCell>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                    <Avatar sx={{ width: 40, height: 40, backgroundColor: '#1976d2' }}>
                      {userData.adSoyad.charAt(0).toUpperCase()}
                    </Avatar>
                    <Box>
                      <Typography variant="body2" sx={{ fontWeight: 600 }}>
                        {userData.adSoyad}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {userData.telefon}
                      </Typography>
                    </Box>
                  </Box>
                </TableCell>
                <TableCell>{userData.email}</TableCell>
                <TableCell>
                  <Chip
                    label={userData.rol}
                    size="small"
                    color={userData.rol === 'admin' ? 'error' : 'primary'}
                    variant="outlined"
                  />
                </TableCell>
                <TableCell>
                  <Chip
                    label={userData.aktif ? 'Aktif' : 'Pasif'}
                    size="small"
                    color={userData.aktif ? 'success' : 'default'}
                  />
                </TableCell>
                <TableCell>
                  {new Date(userData.sonGiris || userData.createdAt).toLocaleDateString('tr-TR')}
                </TableCell>
                <TableCell>
                  <Box sx={{ display: 'flex', gap: 1 }}>
                    <Tooltip title="Düzenle">
                      <IconButton
                        size="small"
                        onClick={() => setUserDialog({ open: true, mode: 'edit', user: userData })}
                      >
                        <EditIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Sil">
                      <IconButton size="small" sx={{ color: '#dc2626' }}>
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

  // ⚙️ SYSTEM SETTINGS TAB
  const renderSystemSettings = () => (
    <Box>
      <Typography variant="h6" sx={{ mb: 3, fontWeight: 600 }}>
        ⚙️ Sistem Ayarları
      </Typography>
      
      <Grid container spacing={3}>
        <Grid item xs={12} md={6}>
          <Card sx={{ p: 3 }}>
            <Typography variant="h6" sx={{ mb: 2 }}>🔔 Bildirim Ayarları</Typography>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Typography>Email Bildirimleri</Typography>
                <Switch defaultChecked />
              </Box>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Typography>SMS Bildirimleri</Typography>
                <Switch />
              </Box>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Typography>Push Bildirimleri</Typography>
                <Switch defaultChecked />
              </Box>
            </Box>
          </Card>
        </Grid>
        
        <Grid item xs={12} md={6}>
          <Card sx={{ p: 3 }}>
            <Typography variant="h6" sx={{ mb: 2 }}>🔒 Güvenlik Ayarları</Typography>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Typography>İki Faktörlü Doğrulama</Typography>
                <Switch />
              </Box>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Typography>Session Timeout (dk)</Typography>
                <TextField size="small" defaultValue="30" sx={{ width: 80 }} />
              </Box>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Typography>Auto Backup</Typography>
                <Switch defaultChecked />
              </Box>
            </Box>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );

  // 🔧 SYSTEM MAINTENANCE TAB
  const renderSystemMaintenance = () => (
    <Box>
      <Typography variant="h6" sx={{ mb: 3, fontWeight: 600 }}>
        🔧 Sistem Bakımı
      </Typography>
      
      <Grid container spacing={3}>
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ p: 3, textAlign: 'center' }}>
            <BackupIcon sx={{ fontSize: 48, color: '#1976d2', mb: 2 }} />
            <Typography variant="h6" sx={{ mb: 1 }}>Yedekleme</Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Sistem verilerinin yedeğini al
            </Typography>
            <Button variant="contained" size="small">
              Yedek Al
            </Button>
          </Card>
        </Grid>
        
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ p: 3, textAlign: 'center' }}>
            <StorageIcon sx={{ fontSize: 48, color: '#059669', mb: 2 }} />
            <Typography variant="h6" sx={{ mb: 1 }}>Temizleme</Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Gereksiz dosyaları temizle
            </Typography>
            <Button variant="contained" size="small" color="success">
              Temizle
            </Button>
          </Card>
        </Grid>
        
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ p: 3, textAlign: 'center' }}>
            <SpeedIcon sx={{ fontSize: 48, color: '#7c3aed', mb: 2 }} />
            <Typography variant="h6" sx={{ mb: 1 }}>Optimizasyon</Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Sistem performansını artır
            </Typography>
            <Button variant="contained" size="small" sx={{ backgroundColor: '#7c3aed' }}>
              Optimize Et
            </Button>
          </Card>
        </Grid>
        
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ p: 3, textAlign: 'center' }}>
            <AssessmentIcon sx={{ fontSize: 48, color: '#ea580c', mb: 2 }} />
            <Typography variant="h6" sx={{ mb: 1 }}>Rapor</Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Sistem durumu raporu oluştur
            </Typography>
            <Button variant="contained" size="small" sx={{ backgroundColor: '#ea580c' }}>
              Rapor Al
            </Button>
          </Card>
        </Grid>
      </Grid>
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
            <AdminIcon sx={{ fontSize: 40, color: '#dc2626' }} />
            Admin Panel
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Sistem yönetimi, kullanıcı kontrolü ve güvenlik ayarları
          </Typography>
        </Box>

        {/* Metrics Cards */}
        {renderMetricsCards()}

        {/* Main Content Tabs */}
        <Card sx={{ 
          borderRadius: 3, 
          overflow: 'hidden',
          flex: 1, // ✅ Flex grow to fill available space
          display: 'flex',
          flexDirection: 'column'
        }}>
          <Tabs value={activeTab} onChange={(e, newValue) => setActiveTab(newValue)}>
            <Tab label="👥 Kullanıcı Yönetimi" />
            <Tab label="⚙️ Sistem Ayarları" />
            <Tab label="🔧 Sistem Bakımı" />
          </Tabs>
          
          <CardContent sx={{ 
            p: 3,
            flex: 1, // ✅ Grow to fill available Card space
            overflow: 'auto' // ✅ Enable scroll within card content
          }}>
            {loading && <LinearProgress sx={{ mb: 2 }} />}
            
            {activeTab === 0 && renderUserManagement()}
            {activeTab === 1 && renderSystemSettings()}
            {activeTab === 2 && renderSystemMaintenance()}
          </CardContent>
        </Card>

        {/* User Dialog */}
        <Dialog open={userDialog.open} onClose={() => setUserDialog({ open: false, mode: 'add', user: null })}>
          <DialogTitle>
            {userDialog.mode === 'add' ? 'Yeni Kullanıcı Ekle' : 'Kullanıcı Düzenle'}
          </DialogTitle>
          <DialogContent>
            <TextField label="Ad Soyad" fullWidth margin="normal" />
            <TextField label="Email" fullWidth margin="normal" />
            <TextField label="Telefon" fullWidth margin="normal" />
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setUserDialog({ open: false, mode: 'add', user: null })}>
              İptal
            </Button>
            <Button variant="contained">
              Kaydet
            </Button>
          </DialogActions>
        </Dialog>

        {/* Snackbar */}
        <Snackbar
          open={snackbar.open}
          autoHideDuration={6000}
          onClose={() => setSnackbar(prev => ({ ...prev, open: false }))}
        >
          <Alert 
            onClose={() => setSnackbar(prev => ({ ...prev, open: false }))} 
            severity={snackbar.severity}
            sx={{ width: '100%' }}
          >
            {snackbar.message}
          </Alert>
        </Snackbar>
      </Box>
    </Box>
  );
};

export default AdminPanel; 