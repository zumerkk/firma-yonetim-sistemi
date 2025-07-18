// ��️ Firma Detail Page - Professional Edition
// Firma detay sayfası - Excel sisteminin modern karşılığı

import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Box,
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
  CircularProgress
} from '@mui/material';
import {
  ArrowBack as BackIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Business as BusinessIcon,
  LocationOn as LocationIcon,
  Email as EmailIcon,
  Phone as PhoneIcon,
  Language as WebsiteIcon,
  Person as PersonIcon,
  CalendarToday as CalendarIcon,
  Assignment as AssignmentIcon,
  CheckCircle as CheckCircleIcon,
  Warning as WarningIcon,
  ErrorOutline as ErrorIcon,
  Launch as LaunchIcon,

  AccountBalance as AccountIcon,
  Public as GlobalIcon,
  Schedule as ScheduleIcon,
  Notes as NotesIcon,
  Info as InfoIcon
} from '@mui/icons-material';
import { useFirma } from '../../contexts/FirmaContext';

const FirmaDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { firma, loading, error, fetchFirma, deleteFirma, clearFirma, clearError } = useFirma();
  
  // 🗑️ Silme dialog state
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

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
        // Başarılı silme mesajı gösterebiliriz
        navigate('/firmalar', { 
          replace: true,
          state: { 
            message: `${firma.tamUnvan} başarıyla silindi`,
            severity: 'success'
          }
        });
      } else {
        // Hata durumu - dialog açık kalabilir
        alert(result.message || 'Firma silinirken hata oluştu');
      }
    } catch (error) {
      alert('Firma silinirken hata oluştu');
    } finally {
      setDeleting(false);
    }
  };

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

  // ❌ Error durumu
  if (error) {
    return (
      <Box sx={{ p: 3 }}>
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
      </Box>
    );
  }

  // 🔄 Loading durumu
  if (loading || !firma) {
    return <LoadingSkeleton />;
  }

  const etuysStatus = getYetkiStatus(firma.etuysYetkiBitisTarihi);
  const dysStatus = getYetkiStatus(firma.dysYetkiBitisTarihi);

  return (
    <Box sx={{ p: 3 }}>
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
            sx={{ 
              background: 'linear-gradient(135deg, #1976d2 0%, #1565c0 100%)',
              '&:hover': {
                background: 'linear-gradient(135deg, #1565c0 0%, #0d47a1 100%)',
              }
            }}
          >
            Düzenle
          </Button>
          
          <Button
            variant="outlined"
            color="error"
            startIcon={<DeleteIcon />}
            onClick={() => setDeleteDialogOpen(true)}
            sx={{ 
              borderColor: 'error.main',
              color: 'error.main',
              '&:hover': {
                borderColor: 'error.dark',
                color: 'error.dark',
                backgroundColor: 'rgba(211, 47, 47, 0.04)',
              }
            }}
          >
            Sil
          </Button>
        </Stack>
      </Box>

      <Grid container spacing={3}>
        {/* 🏢 Temel Bilgiler */}
        <Grid item xs={12} md={6}>
          <Card className="glass-card" sx={{ height: '100%' }}>
            <CardHeader
              avatar={<BusinessIcon sx={{ color: 'primary.main' }} />}
              title="Temel Bilgiler"
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
                  <ListItemText
                    primary="Vergi No / TC"
                    secondary={firma.vergiNoTC}
                  />
                </ListItem>

                <ListItem sx={{ px: 0, py: 1 }}>
                  <ListItemIcon sx={{ minWidth: 40 }}>
                    <BusinessIcon color="primary" />
                  </ListItemIcon>
                  <ListItemText
                    primary="Tam Ünvan"
                    secondary={firma.tamUnvan}
                  />
                </ListItem>

                <ListItem sx={{ px: 0, py: 1 }}>
                  <ListItemIcon sx={{ minWidth: 40 }}>
                    <GlobalIcon color="primary" />
                  </ListItemIcon>
                  <ListItemText
                    primary="Yabancı Sermayeli"
                    secondary={
                      <Chip
                        label={firma.yabanciSermayeli ? 'Evet' : 'Hayır'}
                        color={firma.yabanciSermayeli ? 'warning' : 'default'}
                        size="small"
                      />
                    }
                  />
                </ListItem>

                <ListItem sx={{ px: 0, py: 1 }}>
                  <ListItemIcon sx={{ minWidth: 40 }}>
                    <InfoIcon color="primary" />
                  </ListItemIcon>
                  <ListItemText
                    primary="Ana Faaliyet Konusu"
                    secondary={firma.anaFaaliyetKonusu || 'Belirtilmemiş'}
                  />
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
                  <ListItemText
                    primary="Adres"
                    secondary={firma.adres}
                  />
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
                      firma.kepAdresi ? (
                        <Link href={`mailto:${firma.kepAdresi}`} color="primary">
                          {firma.kepAdresi}
                        </Link>
                      ) : 'Belirtilmemiş'
                    }
                  />
                </ListItem>

                {firma.firmaTelefon && (
                  <ListItem sx={{ px: 0, py: 1 }}>
                    <ListItemIcon sx={{ minWidth: 40 }}>
                      <PhoneIcon color="primary" />
                    </ListItemIcon>
                    <ListItemText
                      primary="Firma Telefon"
                      secondary={
                        <Link href={`tel:${firma.firmaTelefon}`} color="primary">
                          {firma.firmaTelefon}
                        </Link>
                      }
                    />
                  </ListItem>
                )}

                {firma.firmaEmail && (
                  <ListItem sx={{ px: 0, py: 1 }}>
                    <ListItemIcon sx={{ minWidth: 40 }}>
                      <EmailIcon color="primary" />
                    </ListItemIcon>
                    <ListItemText
                      primary="Firma Email"
                      secondary={
                        <Link href={`mailto:${firma.firmaEmail}`} color="primary">
                          {firma.firmaEmail}
                        </Link>
                      }
                    />
                  </ListItem>
                )}

                {firma.firmaWebsite && (
                  <ListItem sx={{ px: 0, py: 1 }}>
                    <ListItemIcon sx={{ minWidth: 40 }}>
                      <WebsiteIcon color="primary" />
                    </ListItemIcon>
                    <ListItemText
                      primary="Website"
                      secondary={
                        <Link 
                          href={firma.firmaWebsite} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          color="primary"
                          sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}
                        >
                          {firma.firmaWebsite}
                          <LaunchIcon fontSize="small" />
                        </Link>
                      }
                    />
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
                  <ListItemText
                    primary="ETUYS Yetki Bitiş"
                    secondary={
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Typography variant="body2">
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
                    }
                  />
                </ListItem>

                <ListItem sx={{ px: 0, py: 1 }}>
                  <ListItemIcon sx={{ minWidth: 40 }}>
                    <CalendarIcon color="primary" />
                  </ListItemIcon>
                  <ListItemText
                    primary="DYS Yetki Bitiş"
                    secondary={
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Typography variant="body2">
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
                    }
                  />
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
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                İlk İrtibat: <strong>{firma.ilkIrtibatKisi}</strong>
              </Typography>
              
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
                  Yetkili kişi bilgisi bulunmamaktadır.
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
                    <Typography variant="body2" color="text.secondary">
                      {firma.notlar}
                    </Typography>
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

       {/* 🗑️ Silme Onay Dialogu */}
       <Dialog
         open={deleteDialogOpen}
         onClose={() => !deleting && setDeleteDialogOpen(false)}
         aria-labelledby="delete-dialog-title"
         aria-describedby="delete-dialog-description"
         maxWidth="sm"
         fullWidth
       >
         <DialogTitle id="delete-dialog-title" sx={{ color: 'error.main', fontWeight: 600 }}>
           ⚠️ Firmayı Sil
         </DialogTitle>
         <DialogContent>
           <DialogContentText id="delete-dialog-description">
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
             sx={{
               background: 'linear-gradient(135deg, #d32f2f 0%, #b71c1c 100%)',
               '&:hover': {
                 background: 'linear-gradient(135deg, #b71c1c 0%, #8e0000 100%)',
               }
             }}
           >
             {deleting ? 'Siliniyor...' : 'Evet, Sil'}
           </Button>
         </DialogActions>
       </Dialog>
    </Box>
  );
};

export default FirmaDetail; 