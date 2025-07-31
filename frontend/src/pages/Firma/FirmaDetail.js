// 🏢️ Firma Detail Page - ENHANCED PROFESSIONAL EDITION
// Firma detay sayfası - Activity History, Edit-in-place, Related Records

import React, { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Box,
  Container,
  Typography,
  Paper,
  Card,
  CardContent,
  Grid,
  Button,
  Chip,
  Divider,
  Avatar,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Stack,
  IconButton,
  Alert,
  Skeleton,
  CardHeader,
  Link,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  DialogContentText,
  CircularProgress,
  Tabs,
  Tab,
  TextField,
  LinearProgress,
  Tooltip,
  Badge,
  Snackbar
} from '@mui/material';
import {
  ArrowBack as BackIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Business as BusinessIcon,
  LocationOn as LocationIcon,
  Email as EmailIcon,
  Phone as PhoneIcon,
  Person as PersonIcon,
  CalendarToday as CalendarIcon,
  Assignment as AssignmentIcon,
  CheckCircle as CheckCircleIcon,
  Warning as WarningIcon,
  ErrorOutline as ErrorIcon,
  AccountBalance as AccountIcon,
  Public as GlobalIcon,
  Schedule as ScheduleIcon,
  Notes as NotesIcon,
  Info as InfoIcon,
  History as HistoryIcon,
  Save as SaveIcon,
  Cancel as CancelIcon,
  EditOutlined as EditInPlaceIcon,
  Refresh as RefreshIcon,
  AccessTime as TimeIcon
} from '@mui/icons-material';
// 🎯 Layout Components Import
import Header from '../../components/Layout/Header';
import Sidebar from '../../components/Layout/Sidebar';
import { useFirma } from '../../contexts/FirmaContext';
import activityService from '../../services/activityService';
import api from '../../utils/axios';

const FirmaDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { firma, loading, error, fetchFirma, deleteFirma, clearFirma, clearError } = useFirma();
  
  // 🎯 Layout State Management
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 1024);
  
  // 🗑️ Silme dialog state
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  
  // 📋 Tab state
  const [activeTab, setActiveTab] = useState(0);
  
  // 📈 Activity History State
  const [activities, setActivities] = useState([]);
  const [activityLoading, setActivityLoading] = useState(false);
  
  // ✏️ Edit-in-place state
  const [editMode, setEditMode] = useState({});
  const [editValues, setEditValues] = useState({});
  const [editLoading, setEditLoading] = useState(false);
  
  // 📢 Snackbar state
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });

  // 📱 Responsive Handling
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

  // 📢 Snackbar helper
  const showSnackbar = useCallback((message, severity = 'success') => {
    setSnackbar({ open: true, message, severity });
  }, []);

  const handleCloseSnackbar = useCallback(() => {
    setSnackbar(prev => ({ ...prev, open: false }));
  }, []);

  // 🔄 Firma verisini yükle
  useEffect(() => {
    if (id) {
      fetchFirma(id);
    }

    // Cleanup
    return () => {
      clearFirma();
      clearError();
    };
  }, [id, fetchFirma, clearFirma, clearError]);

  // 📋 Load firma activities
  const loadFirmaActivities = useCallback(async () => {
    if (!firma?._id || activeTab !== 1) return;
    
    setActivityLoading(true);
    try {
      const result = await activityService.getFirmaActivities(firma._id, { limit: 20 });
      if (result.success) {
        setActivities(result.data.activities || []);
      }
    } catch (error) {
      console.error('Firma activities error:', error);
      showSnackbar('Aktiviteler yüklenirken hata oluştu', 'error');
    } finally {
      setActivityLoading(false);
    }
  }, [firma?._id, activeTab, showSnackbar]);

  useEffect(() => {
    loadFirmaActivities();
  }, [loadFirmaActivities]);

  // ✏️ Edit-in-place handlers
  const startEdit = (field, currentValue) => {
    setEditMode(prev => ({ ...prev, [field]: true }));
    setEditValues(prev => ({ ...prev, [field]: currentValue }));
  };

  const cancelEdit = (field) => {
    setEditMode(prev => ({ ...prev, [field]: false }));
    setEditValues(prev => ({ ...prev, [field]: undefined }));
  };

  const saveEdit = async (field) => {
    setEditLoading(true);
    try {
      const updateData = { [field]: editValues[field] };
      const response = await api.put(`/firmalar/${id}`, updateData);
      
      if (response.data.success) {
        // Refresh firma data
        await fetchFirma(id);
        setEditMode(prev => ({ ...prev, [field]: false }));
        setEditValues(prev => ({ ...prev, [field]: undefined }));
        showSnackbar('Başarıyla güncellendi!', 'success');
      }
    } catch (error) {
      console.error('Edit error:', error);
      showSnackbar('Güncelleme sırasında hata oluştu', 'error');
    } finally {
      setEditLoading(false);
    }
  };

  // 🎨 Tab change handler
  const handleTabChange = (event, newValue) => {
    setActiveTab(newValue);
  };

  // 📅 Tarih formatı
  const formatDate = (dateString) => {
    if (!dateString) return 'Belirtilmemiş';
    return new Date(dateString).toLocaleDateString('tr-TR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  // ⚠️ Yetki durumu kontrolü
  const getYetkiStatus = (date) => {
    if (!date) return { status: 'none', label: 'Yetki Yok', color: 'default' };
    
    const now = new Date();
    const yetkiDate = new Date(date);
    const diffTime = yetkiDate - now;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays < 0) {
      return { status: 'expired', label: 'Süresi Geçmiş', color: 'error' };
    } else if (diffDays <= 30) {
      return { status: 'expiring', label: `${diffDays} Gün Kaldı`, color: 'warning' };
    } else {
      return { status: 'active', label: 'Aktif', color: 'success' };
    }
  };

  // 🗑️ Firma silme fonksiyonu
  const handleDeleteFirma = async () => {
    setDeleting(true);
    
    try {
      const result = await deleteFirma(id);
      
      if (result.success) {
        setDeleteDialogOpen(false);
        navigate('/firmalar', { 
          replace: true,
          state: { 
            message: `${firma.tamUnvan} başarıyla silindi`,
            severity: 'success'
          }
        });
      } else {
        showSnackbar(result.message || 'Firma silinirken hata oluştu', 'error');
      }
    } catch (error) {
      showSnackbar('Firma silinirken hata oluştu', 'error');
    } finally {
      setDeleting(false);
    }
  };

  // ✏️ Editable Field Component
  const EditableField = ({ field, value, label, type = 'text', multiline = false }) => {
    const isEditing = editMode[field];
    const editValue = editValues[field] ?? value;

    if (isEditing) {
      return (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <TextField
            size="small"
            value={editValue}
            onChange={(e) => setEditValues(prev => ({ ...prev, [field]: e.target.value }))}
            multiline={multiline}
            rows={multiline ? 2 : 1}
            fullWidth
            disabled={editLoading}
          />
          <IconButton 
            size="small" 
            color="primary" 
            onClick={() => saveEdit(field)}
            disabled={editLoading}
          >
            {editLoading ? <CircularProgress size={16} /> : <SaveIcon />}
          </IconButton>
          <IconButton 
            size="small" 
            onClick={() => cancelEdit(field)}
            disabled={editLoading}
          >
            <CancelIcon />
          </IconButton>
        </Box>
      );
    }

    return (
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, group: 'hover' }}>
        <Typography component="span" variant="body2" sx={{ flex: 1 }}>
          {value || 'Belirtilmemiş'}
        </Typography>
        <Tooltip title={`${label} düzenle`}>
          <IconButton 
            size="small" 
            onClick={() => startEdit(field, value)}
            sx={{ 
              opacity: 0, 
              '.group:hover &': { opacity: 1 },
              transition: 'opacity 0.2s'
            }}
          >
            <EditInPlaceIcon fontSize="small" />
          </IconButton>
        </Tooltip>
      </Box>
    );
  };

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
      <Box component="main" sx={{ 
        gridArea: 'content',
        overflow: 'auto',
        p: 3
      }}>
        <Container maxWidth="xl">
          {/* ❌ Error durumu */}
          {error && (
            <Alert 
              severity="error" 
              sx={{ mb: 3 }}
              action={
                <Button 
                  color="inherit" 
                  size="small" 
                  onClick={() => navigate('/firmalar')}
                >
                  Firma Listesine Dön
                </Button>
              }
            >
              {error}
            </Alert>
          )}

          {/* 🔄 Loading durumu */}
          {loading || !firma ? (
            (() => {
              // 🎨 Loading Component
              const LoadingSkeleton = () => (
                <Box sx={{ p: 3 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
                    <Skeleton variant="circular" width={40} height={40} />
                    <Box sx={{ ml: 2, flex: 1 }}>
                      <Skeleton variant="text" width="40%" height={40} />
                      <Skeleton variant="text" width="20%" height={20} />
                    </Box>
                  </Box>
                  
                  <Grid container spacing={3}>
                    {[1, 2, 3, 4].map((item) => (
                      <Grid item xs={12} md={6} key={item}>
                        <Card>
                          <CardContent>
                            <Skeleton variant="text" width="60%" height={30} />
                            <Skeleton variant="text" width="100%" height={20} />
                            <Skeleton variant="text" width="80%" height={20} />
                            <Skeleton variant="text" width="40%" height={20} />
                          </CardContent>
                        </Card>
                      </Grid>
                    ))}
                  </Grid>
                </Box>
              );
              
              return <LoadingSkeleton />;
            })()
          ) : (
            (() => {
              const etuysStatus = getYetkiStatus(firma.etuysYetkiBitisTarihi);
              const dysStatus = getYetkiStatus(firma.dysYetkiBitisTarihi);
              
              return (
                <>
                  {/* 📋 Başlık ve Eylemler */}
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                      <IconButton 
                        onClick={() => navigate('/firmalar')}
                        sx={{ mr: 2, color: 'primary.main' }}
                      >
                        <BackIcon />
                      </IconButton>
                      <Box>
                        <Typography variant="h4" component="h1" sx={{ fontWeight: 600, color: 'primary.main' }}>
                          {firma.tamUnvan}
                        </Typography>
                        <Typography variant="subtitle1" color="text.secondary">
                          Firma ID: {firma.firmaId} • Vergi No: {firma.vergiNoTC}
                        </Typography>
                      </Box>
                    </Box>
                    
                    <Stack direction="row" spacing={2}>
                      <Button
                        variant="contained"
                        startIcon={<EditIcon />}
                        onClick={() => navigate(`/firmalar/${id}/duzenle`)}
                      >
                        Düzenle
                      </Button>
                      
                      <Button
                        variant="outlined"
                        color="error"
                        startIcon={<DeleteIcon />}
                        onClick={() => setDeleteDialogOpen(true)}
                      >
                        Sil
                      </Button>
                    </Stack>
                  </Box>

                  {/* 📑 Tab Navigation */}
                  <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
                    <Tabs value={activeTab} onChange={handleTabChange}>
                      <Tab icon={<InfoIcon />} label="Genel Bilgiler" />
                      <Tab 
                        icon={
                          <Badge badgeContent={activities.length} color="primary">
                            <HistoryIcon />
                          </Badge>
                        } 
                        label="Aktivite Geçmişi" 
                      />
                    </Tabs>
                  </Box>

                  {/* 📄 Tab Content */}
                  {activeTab === 0 && (
                    <Grid container spacing={3}>
                      {/* 🏢 Temel Bilgiler */}
                      <Grid item xs={12} md={6}>
                        <Card className="glass-card" sx={{ height: '100%' }}>
                          <CardHeader
                            avatar={<BusinessIcon sx={{ color: 'primary.main' }} />}
                            title="Temel Bilgiler"
                            action={
                              <Tooltip title="Bilgileri yenile">
                                <IconButton onClick={() => fetchFirma(id)}>
                                  <RefreshIcon />
                                </IconButton>
                              </Tooltip>
                            }
                            sx={{ pb: 1 }}
                          />
                          <CardContent sx={{ pt: 0 }}>
                            <List sx={{ p: 0 }}>
                              <ListItem sx={{ px: 0, py: 1 }}>
                                <ListItemIcon sx={{ minWidth: 40 }}>
                                  <AccountIcon color="primary" />
                                </ListItemIcon>
                                <ListItemText
                                  primary="Firma ID"
                                  secondary={firma.firmaId}
                                />
                              </ListItem>
                              
                              <ListItem sx={{ px: 0, py: 1 }}>
                                <ListItemIcon sx={{ minWidth: 40 }}>
                                  <AssignmentIcon color="primary" />
                                </ListItemIcon>
                                <Box sx={{ flex: 1 }}>
                                  <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
                                    Vergi No / TC
                                  </Typography>
                                  <EditableField field="vergiNoTC" value={firma.vergiNoTC} label="Vergi No/TC" />
                                </Box>
                              </ListItem>

                              <ListItem sx={{ px: 0, py: 1 }}>
                                <ListItemIcon sx={{ minWidth: 40 }}>
                                  <BusinessIcon color="primary" />
                                </ListItemIcon>
                                <Box sx={{ flex: 1 }}>
                                  <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
                                    Tam Ünvan
                                  </Typography>
                                  <EditableField field="tamUnvan" value={firma.tamUnvan} label="Tam Ünvan" />
                                </Box>
                              </ListItem>

                              <ListItem sx={{ px: 0, py: 1 }}>
                                <ListItemIcon sx={{ minWidth: 40 }}>
                                  <GlobalIcon color="primary" />
                                </ListItemIcon>
                                <Box sx={{ flex: 1 }}>
                                  <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
                                    Yabancı Sermayeli
                                  </Typography>
                                  <Chip
                                    label={firma.yabanciSermayeli ? 'Evet' : 'Hayır'}
                                    color={firma.yabanciSermayeli ? 'warning' : 'default'}
                                    size="small"
                                  />
                                </Box>
                              </ListItem>

                              <ListItem sx={{ px: 0, py: 1 }}>
                                <ListItemIcon sx={{ minWidth: 40 }}>
                                  <InfoIcon color="primary" />
                                </ListItemIcon>
                                <Box sx={{ flex: 1 }}>
                                  <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
                                    Ana Faaliyet Konusu
                                  </Typography>
                                  <EditableField field="anaFaaliyetKonusu" value={firma.anaFaaliyetKonusu} label="Ana Faaliyet Konusu" />
                                </Box>
                              </ListItem>
                            </List>
                          </CardContent>
                        </Card>
                      </Grid>

                      {/* 📍 Lokasyon Bilgileri */}
                      <Grid item xs={12} md={6}>
                        <Card className="glass-card" sx={{ height: '100%' }}>
                          <CardHeader
                            avatar={<LocationIcon sx={{ color: 'primary.main' }} />}
                            title="Lokasyon Bilgileri"
                            sx={{ pb: 1 }}
                          />
                          <CardContent sx={{ pt: 0 }}>
                            <List sx={{ p: 0 }}>
                              <ListItem sx={{ px: 0, py: 1 }}>
                                <ListItemIcon sx={{ minWidth: 40 }}>
                                  <LocationIcon color="primary" />
                                </ListItemIcon>
                                <Box sx={{ flex: 1 }}>
                                  <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
                                    Adres
                                  </Typography>
                                  <EditableField field="adres" value={firma.adres} label="Adres" multiline />
                                </Box>
                              </ListItem>

                              <ListItem sx={{ px: 0, py: 1 }}>
                                <ListItemIcon sx={{ minWidth: 40 }}>
                                  <LocationIcon color="primary" />
                                </ListItemIcon>
                                <ListItemText
                                  primary="İl / İlçe"
                                  secondary={`${firma.firmaIl}${firma.firmaIlce ? ` / ${firma.firmaIlce}` : ''}`}
                                />
                              </ListItem>

                              <ListItem sx={{ px: 0, py: 1 }}>
                                <ListItemIcon sx={{ minWidth: 40 }}>
                                  <EmailIcon color="primary" />
                                </ListItemIcon>
                                <ListItemText
                                  primary="KEP Adresi"
                                  secondary={
                                    firma.kepAdresi ? firma.kepAdresi : "Belirtilmemiş"
                                  }
                                />
                                {firma.kepAdresi && (
                                  <Link href={`mailto:${firma.kepAdresi}`} color="primary" sx={{ ml: 1 }}>
                                    {firma.kepAdresi}
                                  </Link>
                                )}
                                {!firma.kepAdresi && (
                                  <EditableField field="kepAdresi" value={firma.kepAdresi} label="KEP Adresi" />
                                )}
                              </ListItem>

                              {firma.firmaTelefon && (
                                <ListItem sx={{ px: 0, py: 1 }}>
                                  <ListItemIcon sx={{ minWidth: 40 }}>
                                    <PhoneIcon color="primary" />
                                  </ListItemIcon>
                                  <ListItemText
                                    primary="Firma Telefon"
                                    secondary={firma.firmaTelefon}
                                  />
                                  <Link href={`tel:${firma.firmaTelefon}`} color="primary" sx={{ ml: 1 }}>
                                    {firma.firmaTelefon}
                                  </Link>
                                </ListItem>
                              )}
                            </List>
                          </CardContent>
                        </Card>
                      </Grid>

                      {/* 📅 Yetki Bilgileri */}
                      <Grid item xs={12} md={6}>
                        <Card className="glass-card" sx={{ height: '100%' }}>
                          <CardHeader
                            avatar={<ScheduleIcon sx={{ color: 'primary.main' }} />}
                            title="Yetki Bilgileri"
                            sx={{ pb: 1 }}
                          />
                          <CardContent sx={{ pt: 0 }}>
                            <List sx={{ p: 0 }}>
                              <ListItem sx={{ px: 0, py: 1 }}>
                                <ListItemIcon sx={{ minWidth: 40 }}>
                                  <CalendarIcon color="primary" />
                                </ListItemIcon>
                                <Box sx={{ flex: 1 }}>
                                  <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
                                    ETUYS Yetki Bitiş
                                  </Typography>
                                  <Typography variant="body2" sx={{ mb: 1 }}>
                                    {formatDate(firma.etuysYetkiBitisTarihi)}
                                  </Typography>
                                  <Chip
                                    label={etuysStatus.label}
                                    color={etuysStatus.color}
                                    size="small"
                                    icon={
                                      etuysStatus.status === 'expired' ? <ErrorIcon /> :
                                      etuysStatus.status === 'expiring' ? <WarningIcon /> :
                                      etuysStatus.status === 'active' ? <CheckCircleIcon /> : <InfoIcon />
                                    }
                                  />
                                </Box>
                              </ListItem>

                              <ListItem sx={{ px: 0, py: 1 }}>
                                <ListItemIcon sx={{ minWidth: 40 }}>
                                  <CalendarIcon color="primary" />
                                </ListItemIcon>
                                <Box sx={{ flex: 1 }}>
                                  <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
                                    DYS Yetki Bitiş
                                  </Typography>
                                  <Typography variant="body2" sx={{ mb: 1 }}>
                                    {formatDate(firma.dysYetkiBitisTarihi)}
                                  </Typography>
                                  <Chip
                                    label={dysStatus.label}
                                    color={dysStatus.color}
                                    size="small"
                                    icon={
                                      dysStatus.status === 'expired' ? <ErrorIcon /> :
                                      dysStatus.status === 'expiring' ? <WarningIcon /> :
                                      dysStatus.status === 'active' ? <CheckCircleIcon /> : <InfoIcon />
                                    }
                                  />
                                </Box>
                              </ListItem>
                            </List>
                          </CardContent>
                        </Card>
                      </Grid>

                      {/* 👥 Yetkili Kişiler */}
                      <Grid item xs={12} md={6}>
                        <Card className="glass-card" sx={{ height: '100%' }}>
                          <CardHeader
                            avatar={<PersonIcon sx={{ color: 'primary.main' }} />}
                            title="Yetkili Kişiler"
                            sx={{ pb: 1 }}
                          />
                          <CardContent sx={{ pt: 0 }}>
                            {firma.ilkIrtibatKisi && (
                              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                                İlk İrtibat: <strong>{firma.ilkIrtibatKisi}</strong>
                              </Typography>
                            )}
                            
                            {firma.yetkiliKisiler && firma.yetkiliKisiler.length > 0 ? (
                              <Stack spacing={2}>
                                {firma.yetkiliKisiler.map((yetkili, index) => (
                                  <Paper 
                                    key={index} 
                                    sx={{ 
                                      p: 2, 
                                      backgroundColor: 'rgba(25, 118, 210, 0.04)',
                                      border: '1px solid rgba(25, 118, 210, 0.12)'
                                    }}
                                  >
                                    <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 2 }}>
                                      <Avatar sx={{ backgroundColor: 'primary.main', width: 32, height: 32 }}>
                                        {index + 1}
                                      </Avatar>
                                      <Box sx={{ flex: 1 }}>
                                        <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1 }}>
                                          {yetkili.adSoyad}
                                        </Typography>
                                        
                                        <Stack spacing={0.5}>
                                          {yetkili.telefon1 && (
                                            <Typography variant="body2" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                              <PhoneIcon fontSize="small" color="primary" />
                                              <Link href={`tel:${yetkili.telefon1}`} color="primary">
                                                {yetkili.telefon1}
                                              </Link>
                                            </Typography>
                                          )}
                                          
                                          {yetkili.telefon2 && (
                                            <Typography variant="body2" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                              <PhoneIcon fontSize="small" color="primary" />
                                              <Link href={`tel:${yetkili.telefon2}`} color="primary">
                                                {yetkili.telefon2}
                                              </Link>
                                            </Typography>
                                          )}
                                          
                                          {yetkili.eposta1 && (
                                            <Typography variant="body2" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                              <EmailIcon fontSize="small" color="primary" />
                                              <Link href={`mailto:${yetkili.eposta1}`} color="primary">
                                                {yetkili.eposta1}
                                              </Link>
                                            </Typography>
                                          )}
                                          
                                          {yetkili.eposta2 && (
                                            <Typography variant="body2" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                              <EmailIcon fontSize="small" color="primary" />
                                              <Link href={`mailto:${yetkili.eposta2}`} color="primary">
                                                {yetkili.eposta2}
                                              </Link>
                                            </Typography>
                                          )}
                                        </Stack>
                                      </Box>
                                    </Box>
                                  </Paper>
                                ))}
                              </Stack>
                            ) : (
                              <Typography variant="body2" color="text.secondary">
                                Henüz yetkili kişi eklenmemiş
                              </Typography>
                            )}
                          </CardContent>
                        </Card>
                      </Grid>

                      {/* 📝 Notlar ve Sistem Bilgileri */}
                      {(firma.notlar || firma.createdAt) && (
                        <Grid item xs={12}>
                          <Card className="glass-card">
                            <CardHeader
                              avatar={<NotesIcon sx={{ color: 'primary.main' }} />}
                              title="Notlar ve Sistem Bilgileri"
                              sx={{ pb: 1 }}
                            />
                            <CardContent sx={{ pt: 0 }}>
                              {firma.notlar && (
                                <Box sx={{ mb: 2 }}>
                                  <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 600 }}>
                                    Notlar:
                                  </Typography>
                                  <EditableField field="notlar" value={firma.notlar} label="Notlar" multiline />
                                </Box>
                              )}
                              
                              <Divider sx={{ my: 2 }} />
                              
                              <Grid container spacing={2}>
                                <Grid item xs={12} sm={6}>
                                  <Typography variant="body2" color="text.secondary">
                                    <strong>Oluşturma Tarihi:</strong> {formatDate(firma.createdAt)}
                                  </Typography>
                                </Grid>
                                
                                {firma.updatedAt && (
                                  <Grid item xs={12} sm={6}>
                                    <Typography variant="body2" color="text.secondary">
                                      <strong>Son Güncelleme:</strong> {formatDate(firma.updatedAt)}
                                    </Typography>
                                  </Grid>
                                )}
                                
                                {firma.olusturanKullanici && (
                                  <Grid item xs={12} sm={6}>
                                    <Typography variant="body2" color="text.secondary">
                                      <strong>Oluşturan:</strong> {firma.olusturanKullanici.adSoyad || firma.olusturanKullanici.email}
                                    </Typography>
                                  </Grid>
                                )}
                                
                                {firma.sonGuncelleyen && (
                                  <Grid item xs={12} sm={6}>
                                    <Typography variant="body2" color="text.secondary">
                                      <strong>Son Güncelleyen:</strong> {firma.sonGuncelleyen.adSoyad || firma.sonGuncelleyen.email}
                                    </Typography>
                                  </Grid>
                                )}
                              </Grid>
                            </CardContent>
                          </Card>
                        </Grid>
                      )}
                    </Grid>
                  )}

                  {/* 📋 Activity History Tab */}
                  {activeTab === 1 && (
                    <Box>
                      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3 }}>
                        <Typography variant="h6" sx={{ fontWeight: 600 }}>
                          Firma Aktivite Geçmişi
                        </Typography>
                        <Button 
                          variant="outlined" 
                          startIcon={<RefreshIcon />}
                          onClick={loadFirmaActivities}
                          disabled={activityLoading}
                        >
                          Yenile
                        </Button>
                      </Box>
                      
                      {activityLoading ? (
                        <LinearProgress sx={{ mb: 3 }} />
                      ) : activities.length > 0 ? (
                        <Stack spacing={2}>
                          {activities.map((activity, index) => (
                            <Card key={activity._id} sx={{ border: '1px solid rgba(25, 118, 210, 0.2)' }}>
                              <CardContent sx={{ py: 2 }}>
                                <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 2 }}>
                                  <Avatar sx={{ bgcolor: 'primary.main', width: 40, height: 40 }}>
                                    <BusinessIcon />
                                  </Avatar>
                                  
                                  <Box sx={{ flex: 1 }}>
                                    <Typography variant="h6" sx={{ fontSize: '1rem', fontWeight: 600, mb: 0.5 }}>
                                      {activity.aksiyon}
                                    </Typography>
                                    <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                                      {activity.mesaj}
                                    </Typography>
                                    
                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                        <TimeIcon sx={{ fontSize: 16, color: 'text.secondary' }} />
                                        <Typography variant="caption" color="text.secondary">
                                          {new Date(activity.createdAt).toLocaleString('tr-TR')}
                                        </Typography>
                                      </Box>
                                      
                                      {activity.kullanici?.adSoyad && (
                                        <>
                                          <Typography variant="caption" color="text.secondary">•</Typography>
                                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                            <PersonIcon sx={{ fontSize: 16, color: 'text.secondary' }} />
                                            <Typography variant="caption" color="text.secondary">
                                              {activity.kullanici.adSoyad}
                                            </Typography>
                                          </Box>
                                        </>
                                      )}
                                      
                                      <Chip 
                                        label={activity.kategori} 
                                        size="small" 
                                        color="primary" 
                                        variant="outlined"
                                        sx={{ ml: 'auto' }}
                                      />
                                    </Box>
                                  </Box>
                                </Box>
                              </CardContent>
                            </Card>
                          ))}
                        </Stack>
                      ) : (
                        <Paper sx={{ p: 4, textAlign: 'center', bgcolor: 'grey.50' }}>
                          <HistoryIcon sx={{ fontSize: 48, color: 'grey.400', mb: 2 }} />
                          <Typography variant="h6" color="text.secondary">
                            Henüz aktivite bulunmuyor
                          </Typography>
                          <Typography variant="body2" color="text.secondary">
                            Bu firma ile ilgili işlemler burada görünecek
                          </Typography>
                        </Paper>
                      )}
                    </Box>
                  )}
                </>
              );
            })()
          )}
        </Container>

        {/* 🗑️ Silme Onay Dialogu */}
        <Dialog
          open={deleteDialogOpen}
          onClose={() => !deleting && setDeleteDialogOpen(false)}
          maxWidth="sm"
          fullWidth
        >
          <DialogTitle sx={{ color: 'error.main', fontWeight: 600 }}>
            ⚠️ Firmayı Sil
          </DialogTitle>
          <DialogContent>
            <DialogContentText>
              <strong>{firma?.tamUnvan}</strong> firmasını silmek istediğinizden emin misiniz?
            </DialogContentText>
            <DialogContentText sx={{ mt: 1, color: 'error.main' }}>
              Bu işlem geri alınamaz ve firma veritabanından kalıcı olarak silinecektir.
            </DialogContentText>
          </DialogContent>
          <DialogActions sx={{ p: 3, pt: 1 }}>
            <Button 
              onClick={() => setDeleteDialogOpen(false)}
              disabled={deleting}
              variant="outlined"
            >
              İptal
            </Button>
            <Button 
              onClick={handleDeleteFirma}
              disabled={deleting}
              variant="contained"
              color="error"
              startIcon={deleting ? <CircularProgress size={16} color="inherit" /> : <DeleteIcon />}
            >
              {deleting ? 'Siliniyor...' : 'Evet, Sil'}
            </Button>
          </DialogActions>
        </Dialog>

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
    </Box>
  );
};

export default FirmaDetail;