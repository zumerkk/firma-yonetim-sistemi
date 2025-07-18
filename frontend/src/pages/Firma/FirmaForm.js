// 🏢 EXCEL FORMATLI FIRMA FORMU - PROFESSIONAL EDITION
// 📋 Eski panel sisteminin 1:1 modern karşılığı 
// Eksik kalmayacak, fazlası olacak şekilde geliştirilmiş

import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  Box,
  Container,
  Typography,
  Card,
  CardContent,
  Grid,
  TextField,
  Button,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Switch,
  FormControlLabel,
  Divider,
  Alert,
  Snackbar,
  Paper,
  Stack,
  CircularProgress,
  Chip
} from '@mui/material';
import {
  Business as BusinessIcon,
  Person as PersonIcon,
  Save as SaveIcon,
  ArrowBack as BackIcon,
  Search as SearchIcon,
  ContactMail as ContactIcon,
  Assignment as AssignmentIcon,
  CheckCircle as CheckIcon
} from '@mui/icons-material';

// Hooks & Services
import { useFirma } from '../../contexts/FirmaContext';
import { validateFirmaData } from '../../services/firmaService';
import turkeyData from '../../data/turkeyData';

// 🎯 Constants
const ANA_FAALIYET_KONULARI = [
  'İNŞAAT VE MÜHENDİSLİK',
  'BİLİŞİM VE YAZILIM', 
  'DANIŞMANLIK HİZMETLERİ',
  'GÜVENLIK HİZMETLERİ',
  'TEMİZLİK HİZMETLERİ',
  'GIDA VE İÇECEK',
  'TEKSTİL VE KONFEKS.',
  'OTOMOTİV VE YEDEK PARÇA',
  'MAKİNE VE EKİPMAN',
  'DİĞER'
];

const INITIAL_FORM_DATA = {
  firmaId: '',
  vergiNoTC: '',
  tamUnvan: '',
  adres: '',
  firmaIl: '',
  firmaIlce: '',
  kepAdresi: '',
  firmaTelefon: '',
  firmaEmail: '',
  firmaWebsite: '',
  yabanciSermayeli: false,
  anaFaaliyetKonusu: '',
  etuysYetkiBitisTarihi: '',
  dysYetkiBitisTarihi: '',
  ilkIrtibatKisi: '',
  yetkiliKisiler: [
    {
      adSoyad: '',
      telefon1: '',
      telefon2: '',
      eposta1: '',
      eposta2: ''
    }
  ],
  notlar: ''
};

const FirmaForm = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEdit = Boolean(id);

  // Context hooks
  const {
    firma,
    searchResults,
    isLoading,
    isSearching,
    isSubmitting,
    error,
    hasError,
    fetchFirma,
    createFirma,
    updateFirma,
    searchFirmalar,
    clearFirma,
    clearError,
    clearSearchResults
  } = useFirma();

  // Local State
  const [formData, setFormData] = useState(INITIAL_FORM_DATA);
  const [searchTerm, setSearchTerm] = useState('');
  const [validationErrors, setValidationErrors] = useState([]);
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: '',
    severity: 'info'
  });

  // 🔄 Form Data Management
  const handleChange = useCallback((field, value) => {
    setFormData(prev => {
      if (field.includes('.')) {
        const [parent, child] = field.split('.');
        return {
          ...prev,
          [parent]: {
            ...prev[parent],
            [child]: value
          }
        };
      } else if (field.startsWith('yetkiliKisiler[')) {
        const match = field.match(/yetkiliKisiler\[(\d+)\]\.(.+)/);
        if (match) {
          const [, index, childField] = match;
          const newYetkiliKisiler = [...prev.yetkiliKisiler];
          if (!newYetkiliKisiler[index]) {
            newYetkiliKisiler[index] = {};
          }
          newYetkiliKisiler[index][childField] = value;
          return {
            ...prev,
            yetkiliKisiler: newYetkiliKisiler
          };
        }
      }
      return {
        ...prev,
        [field]: value
      };
    });
    
    // Clear validation errors when user starts typing
    if (validationErrors.length > 0) {
      setValidationErrors([]);
    }
  }, [validationErrors.length]);

  // 🔍 Search Functions
  const handleSearch = useCallback(async () => {
    if (!searchTerm || searchTerm.length < 2) {
      showSnackbar('Arama terimi en az 2 karakter olmalıdır', 'warning');
      return;
    }

    const result = await searchFirmalar(searchTerm);
    if (result.success) {
      if (result.data.firmalar && result.data.firmalar.length > 0) {
        showSnackbar(`${result.data.firmalar.length} firma bulundu`, 'success');
      } else {
        showSnackbar('Arama kriterlerine uygun firma bulunamadı', 'info');
      }
    } else {
      showSnackbar(result.message, 'error');
    }
  }, [searchTerm, searchFirmalar]);

  const loadFirmaToForm = useCallback((selectedFirma) => {
    const loadedData = {
      firmaId: selectedFirma.firmaId || '',
      vergiNoTC: selectedFirma.vergiNoTC || '',
      tamUnvan: selectedFirma.tamUnvan || '',
      adres: selectedFirma.adres || '',
      firmaIl: selectedFirma.firmaIl || '',
      firmaIlce: selectedFirma.firmaIlce || '',
      kepAdresi: selectedFirma.kepAdresi || '',
      firmaTelefon: selectedFirma.firmaTelefon || '',
      firmaEmail: selectedFirma.firmaEmail || '',
      firmaWebsite: selectedFirma.firmaWebsite || '',
      yabanciSermayeli: selectedFirma.yabanciSermayeli || false,
      anaFaaliyetKonusu: selectedFirma.anaFaaliyetKonusu || '',
      etuysYetkiBitisTarihi: selectedFirma.etuysYetkiBitisTarihi ? 
        new Date(selectedFirma.etuysYetkiBitisTarihi).toISOString().split('T')[0] : '',
      dysYetkiBitisTarihi: selectedFirma.dysYetkiBitisTarihi ? 
        new Date(selectedFirma.dysYetkiBitisTarihi).toISOString().split('T')[0] : '',
      ilkIrtibatKisi: selectedFirma.ilkIrtibatKisi || '',
      yetkiliKisiler: selectedFirma.yetkiliKisiler && selectedFirma.yetkiliKisiler.length > 0 
        ? selectedFirma.yetkiliKisiler.map(kisi => ({
            adSoyad: kisi.adSoyad || '',
            telefon1: kisi.telefon1 || '',
            telefon2: kisi.telefon2 || '',
            eposta1: kisi.eposta1 || '',
            eposta2: kisi.eposta2 || ''
          }))
        : [INITIAL_FORM_DATA.yetkiliKisiler[0]],
      notlar: selectedFirma.notlar || ''
    };

    setFormData(loadedData);
    clearSearchResults();
    showSnackbar(`${selectedFirma.tamUnvan} firma bilgileri yüklendi`, 'success');
  }, [clearSearchResults]);

  // 📝 Form Submission
  const handleSubmit = useCallback(async (e) => {
    e.preventDefault();
    clearError();
    
    // Frontend validation
    const validation = validateFirmaData(formData);
    if (!validation.isValid) {
      setValidationErrors(validation.errors);
      showSnackbar('Girilen bilgilerde hatalar var', 'error');
      return;
    }

    // Prepare submission data
    const submitData = {
      vergiNoTC: formData.vergiNoTC.trim(),
      tamUnvan: formData.tamUnvan.trim(),
      adres: formData.adres.trim(),
      firmaIl: formData.firmaIl,
      firmaIlce: formData.firmaIlce,
      kepAdresi: formData.kepAdresi,
      firmaTelefon: formData.firmaTelefon,
      firmaEmail: formData.firmaEmail,
      firmaWebsite: formData.firmaWebsite,
      yabanciSermayeli: formData.yabanciSermayeli,
      anaFaaliyetKonusu: formData.anaFaaliyetKonusu,
      etuysYetkiBitisTarihi: formData.etuysYetkiBitisTarihi || null,
      dysYetkiBitisTarihi: formData.dysYetkiBitisTarihi || null,
      ilkIrtibatKisi: formData.ilkIrtibatKisi.trim(),
      yetkiliKisiler: formData.yetkiliKisiler.filter(kisi => kisi.adSoyad).map(kisi => ({
        adSoyad: kisi.adSoyad.trim(),
        telefon1: kisi.telefon1.trim(),
        telefon2: kisi.telefon2 ? kisi.telefon2.trim() : '',
        eposta1: kisi.eposta1.toLowerCase().trim(),
        eposta2: kisi.eposta2 ? kisi.eposta2.toLowerCase().trim() : ''
      })),
      notlar: formData.notlar
    };

    let result;
    if (isEdit) {
      result = await updateFirma(id, submitData);
    } else {
      result = await createFirma(submitData);
    }

    if (result.success) {
      showSnackbar(result.message, 'success');
      setTimeout(() => {
        navigate('/firmalar');
      }, 2000);
    } else {
      showSnackbar(result.message, 'error');
      if (result.errors) {
        setValidationErrors(result.errors.map(err => err.message || err));
      }
    }
  }, [formData, isEdit, id, createFirma, updateFirma, navigate, clearError]);

  // 🧩 Utility Functions
  const showSnackbar = useCallback((message, severity = 'info') => {
    setSnackbar({ open: true, message, severity });
  }, []);

  const handleSnackbarClose = useCallback(() => {
    setSnackbar(prev => ({ ...prev, open: false }));
  }, []);

  const addYetkiliKisi = useCallback(() => {
    if (formData.yetkiliKisiler.length < 2) {
      setFormData(prev => ({
        ...prev,
        yetkiliKisiler: [
          ...prev.yetkiliKisiler,
          {
            adSoyad: '',
            telefon1: '',
            telefon2: '',
            eposta1: '',
            eposta2: ''
          }
        ]
      }));
    }
  }, [formData.yetkiliKisiler.length]);

  const removeYetkiliKisi = useCallback((index) => {
    if (formData.yetkiliKisiler.length > 1) {
      setFormData(prev => ({
        ...prev,
        yetkiliKisiler: prev.yetkiliKisiler.filter((_, i) => i !== index)
      }));
    }
  }, [formData.yetkiliKisiler.length]);

  // 🔄 Effects
  useEffect(() => {
    if (isEdit && id) {
      fetchFirma(id).then(result => {
        if (result.success) {
          loadFirmaToForm(result.data);
        } else {
          showSnackbar('Firma yüklenirken hata oluştu', 'error');
        }
      });
    }

    return () => {
      clearFirma();
      clearSearchResults();
      clearError();
    };
  }, [isEdit, id, fetchFirma, loadFirmaToForm, clearFirma, clearSearchResults, clearError]);

  // Display error from context
  useEffect(() => {
    if (hasError && error) {
      showSnackbar(error, 'error');
    }
  }, [hasError, error]);

  return (
    <Container maxWidth="xl" sx={{ py: 3 }}>
      
      {/* 📋 Page Header */}
      <Box sx={{ mb: 3 }}>
        <Stack direction="row" alignItems="center" justifyContent="space-between">
          <Box>
            <Typography 
              variant="h4" 
              component="h1" 
              sx={{ 
                fontWeight: 700,
                color: '#1976d2',
                mb: 1
              }}
            >
              <BusinessIcon sx={{ mr: 2, fontSize: 32 }} />
              {isEdit ? 'Firma Düzenle' : 'Yeni Firma Ekle'}
            </Typography>
            <Typography variant="body1" color="text.secondary">
              {isEdit ? 
                'Seçili firma bilgilerini güncelleyin' : 
                'Yeni firma kaydı oluşturun veya mevcut firmayı arayın'
              }
            </Typography>
          </Box>
          
          <Button
            variant="outlined"
            startIcon={<BackIcon />}
            onClick={() => navigate('/firmalar')}
            sx={{ borderRadius: 2 }}
          >
            Firma Listesi
          </Button>
        </Stack>
      </Box>

      {/* 🔍 Search Panel (Only for new firms) */}
      {!isEdit && (
        <Card sx={{ 
          mb: 3,
          boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
          borderRadius: 3,
          border: '2px solid #1976d2'
        }}>
          <CardContent sx={{ p: 3 }}>
            <Typography variant="h6" sx={{ mb: 3, fontWeight: 600, color: '#1976d2' }}>
              <SearchIcon sx={{ mr: 1 }} /> Firma Arama
            </Typography>
            
            <Grid container spacing={3} alignItems="end">
              <Grid item xs={12} md={8}>
                <TextField
                  fullWidth
                  label="Vergi No/TC No veya Firma Ünvanı"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Arama yapmak için en az 2 karakter giriniz"
                  onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                  sx={{ bgcolor: 'white', borderRadius: 1 }}
                />
              </Grid>
              
              <Grid item xs={12} md={4}>
                <Button
                  fullWidth
                  variant="contained"
                  size="large"
                  onClick={handleSearch}
                  disabled={isSearching || searchTerm.length < 2}
                  startIcon={isSearching ? <CircularProgress size={20} /> : <SearchIcon />}
                  sx={{
                    py: 1.8,
                    background: 'linear-gradient(135deg, #1976d2 0%, #42a5f5 100%)',
                    '&:hover': {
                      background: 'linear-gradient(135deg, #1565c0 0%, #1976d2 100%)',
                    }
                  }}
                >
                  {isSearching ? 'Aranıyor...' : 'Firma Ara'}
                </Button>
              </Grid>
            </Grid>
            
            {/* Search Results */}
            {searchResults.length > 0 && (
              <Box sx={{ mt: 3 }}>
                <Typography variant="subtitle1" sx={{ mb: 2, fontWeight: 600 }}>
                  📋 Bulunan Firmalar ({searchResults.length})
                </Typography>
                <Grid container spacing={2}>
                  {searchResults.map((firma) => (
                    <Grid item xs={12} key={firma._id}>
                      <Paper 
                        sx={{ 
                          p: 2, 
                          cursor: 'pointer',
                          transition: 'all 0.2s',
                          '&:hover': { 
                            bgcolor: '#f5f5f5',
                            transform: 'translateY(-2px)',
                            boxShadow: 2
                          }
                        }}
                        onClick={() => loadFirmaToForm(firma)}
                      >
                        <Stack direction="row" spacing={2} alignItems="center" flexWrap="wrap">
                          <Chip label={firma.firmaId} color="primary" size="small" />
                          <Typography variant="body1" sx={{ fontWeight: 600, flexGrow: 1 }}>
                            {firma.tamUnvan}
                          </Typography>
                          <Chip label={firma.vergiNoTC} variant="outlined" size="small" />
                          <Typography variant="body2" color="text.secondary">
                            {firma.firmaIl} {firma.firmaIlce && `/ ${firma.firmaIlce}`}
                          </Typography>
                        </Stack>
                      </Paper>
                    </Grid>
                  ))}
                </Grid>
              </Box>
            )}
          </CardContent>
        </Card>
      )}

      {/* 📝 Main Form */}
      <Card sx={{ 
        boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
        borderRadius: 3,
        overflow: 'hidden'
      }}>
        <form onSubmit={handleSubmit}>
          <CardContent sx={{ p: 4 }}>
            
            {/* 🆔 Firma ID Display */}
            {formData.firmaId && (
              <Paper sx={{ p: 2, mb: 4, bgcolor: '#e3f2fd', borderRadius: 2 }}>
                <Stack direction="row" alignItems="center" spacing={2}>
                  <AssignmentIcon color="primary" />
                  <Typography variant="h6" color="primary">
                    Firma ID: {formData.firmaId}
                  </Typography>
                  <Chip 
                    label={isEdit ? "GÜNCELLEME MODU" : "YENİ KAYIT"} 
                    color={isEdit ? "warning" : "success"} 
                    size="small" 
                  />
                </Stack>
              </Paper>
            )}

            {/* ❌ Validation Errors */}
            {validationErrors.length > 0 && (
              <Alert severity="error" sx={{ mb: 3 }}>
                <Typography variant="subtitle2" sx={{ mb: 1 }}>
                  Aşağıdaki hataları düzeltin:
                </Typography>
                <ul style={{ margin: 0, paddingLeft: 20 }}>
                  {validationErrors.map((error, index) => (
                    <li key={index}>{error}</li>
                  ))}
                </ul>
              </Alert>
            )}

            {/* 🏢 Basic Information */}
            <Paper sx={{ p: 3, mb: 4, bgcolor: '#f8fafc', borderRadius: 2 }}>
              <Typography variant="h6" sx={{ mb: 3, fontWeight: 600, color: '#1976d2' }}>
                <BusinessIcon sx={{ mr: 1 }} /> Temel Bilgiler
              </Typography>
              
              <Grid container spacing={3}>
                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    label="Vergi No / TC No *"
                    value={formData.vergiNoTC}
                    onChange={(e) => handleChange('vergiNoTC', e.target.value)}
                    required
                    placeholder="10 haneli Vergi No veya 11 haneli TC No"
                    sx={{ bgcolor: 'white', borderRadius: 1 }}
                  />
                </Grid>
                
                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    label="Tam Ünvan *"
                    value={formData.tamUnvan}
                    onChange={(e) => handleChange('tamUnvan', e.target.value)}
                    required
                    sx={{ bgcolor: 'white', borderRadius: 1 }}
                  />
                </Grid>
                
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    label="Adres *"
                    value={formData.adres}
                    onChange={(e) => handleChange('adres', e.target.value)}
                    multiline
                    rows={3}
                    required
                    sx={{ bgcolor: 'white', borderRadius: 1 }}
                  />
                </Grid>
                
                <Grid item xs={12} md={6}>
                  <FormControl fullWidth required sx={{ bgcolor: 'white', borderRadius: 1 }}>
                    <InputLabel>Firma İli *</InputLabel>
                    <Select
                      value={formData.firmaIl}
                      onChange={(e) => {
                        handleChange('firmaIl', e.target.value);
                        handleChange('firmaIlce', ''); // Reset district when city changes
                      }}
                      required
                    >
                      {turkeyData.TURKEY_CITIES.map((il) => (
                        <MenuItem key={il} value={il}>{il}</MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>
                
                <Grid item xs={12} md={6}>
                  <FormControl fullWidth disabled={!formData.firmaIl} sx={{ bgcolor: 'white', borderRadius: 1 }}>
                    <InputLabel>Firma İlçe</InputLabel>
                    <Select
                      value={formData.firmaIlce}
                      onChange={(e) => handleChange('firmaIlce', e.target.value)}
                    >
                      {formData.firmaIl && turkeyData.CITY_DISTRICTS[formData.firmaIl]?.map((ilce) => (
                        <MenuItem key={ilce} value={ilce}>{ilce}</MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>
                
                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    label="KEP Adresi"
                    type="email"
                    value={formData.kepAdresi}
                    onChange={(e) => handleChange('kepAdresi', e.target.value)}
                    placeholder="ornek@hs01.kep.tr"
                    sx={{ bgcolor: 'white', borderRadius: 1 }}
                  />
                </Grid>
                
                <Grid item xs={12} md={6}>
                  <FormControlLabel
                    control={
                      <Switch
                        checked={formData.yabanciSermayeli}
                        onChange={(e) => handleChange('yabanciSermayeli', e.target.checked)}
                      />
                    }
                    label="Yabancı Sermayeli"
                    sx={{ bgcolor: 'white', borderRadius: 1, p: 2, m: 0, width: '100%' }}
                  />
                </Grid>
                
                <Grid item xs={12}>
                  <FormControl fullWidth sx={{ bgcolor: 'white', borderRadius: 1 }}>
                    <InputLabel>Ana Faaliyet Konusu</InputLabel>
                    <Select
                      value={formData.anaFaaliyetKonusu}
                      onChange={(e) => handleChange('anaFaaliyetKonusu', e.target.value)}
                    >
                      {ANA_FAALIYET_KONULARI.map((konus) => (
                        <MenuItem key={konus} value={konus}>{konus}</MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>
              </Grid>
            </Paper>

            {/* 📅 Authority Expiration Dates */}
            <Paper sx={{ p: 3, mb: 4, bgcolor: '#f8fafc', borderRadius: 2 }}>
              <Typography variant="h6" sx={{ mb: 3, fontWeight: 600, color: '#f57c00' }}>
                ⏰ Yetki Bitiş Tarihleri
              </Typography>
              
              <Grid container spacing={3}>
                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    type="date"
                    label="ETUYS Yetki Bitiş Tarihi"
                    value={formData.etuysYetkiBitisTarihi}
                    onChange={(e) => handleChange('etuysYetkiBitisTarihi', e.target.value)}
                    InputLabelProps={{ shrink: true }}
                    sx={{ bgcolor: 'white', borderRadius: 1 }}
                  />
                </Grid>
                
                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    type="date"
                    label="DYS Yetki Bitiş Tarihi"
                    value={formData.dysYetkiBitisTarihi}
                    onChange={(e) => handleChange('dysYetkiBitisTarihi', e.target.value)}
                    InputLabelProps={{ shrink: true }}
                    sx={{ bgcolor: 'white', borderRadius: 1 }}
                  />
                </Grid>
              </Grid>
            </Paper>

            {/* 👥 Authorized Persons */}
            <Paper sx={{ p: 3, mb: 4, bgcolor: '#f8fafc', borderRadius: 2 }}>
              <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 3 }}>
                <Typography variant="h6" sx={{ fontWeight: 600, color: '#9c27b0' }}>
                  <PersonIcon sx={{ mr: 1 }} /> Yetkili Kişiler
                </Typography>
                {formData.yetkiliKisiler.length < 2 && (
                  <Button
                    variant="outlined"
                    size="small"
                    onClick={addYetkiliKisi}
                    sx={{ borderRadius: 2 }}
                  >
                    + İkinci Yetkili Ekle
                  </Button>
                )}
              </Stack>
              
              {formData.yetkiliKisiler.map((yetkili, index) => (
                <Box key={index} sx={{ mb: index < formData.yetkiliKisiler.length - 1 ? 3 : 0 }}>
                  <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 2 }}>
                    <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                      Yetkili Kişi {index + 1} {index === 0 && '*'}
                    </Typography>
                    {index > 0 && (
                      <Button
                        variant="text"
                        color="error"
                        size="small"
                        onClick={() => removeYetkiliKisi(index)}
                      >
                        Kaldır
                      </Button>
                    )}
                  </Stack>
                  
                  <Grid container spacing={3}>
                    <Grid item xs={12} md={6}>
                      <TextField
                        fullWidth
                        label={`Adı Soyadı ${index === 0 ? '*' : ''}`}
                        value={yetkili.adSoyad}
                        onChange={(e) => handleChange(`yetkiliKisiler[${index}].adSoyad`, e.target.value)}
                        required={index === 0}
                        sx={{ bgcolor: 'white', borderRadius: 1 }}
                      />
                    </Grid>
                    
                    <Grid item xs={12} md={6}>
                      <TextField
                        fullWidth
                        label={`Telefon 1 ${index === 0 ? '*' : ''}`}
                        value={yetkili.telefon1}
                        onChange={(e) => handleChange(`yetkiliKisiler[${index}].telefon1`, e.target.value)}
                        required={index === 0}
                        placeholder="0XXX XXX XX XX"
                        sx={{ bgcolor: 'white', borderRadius: 1 }}
                      />
                    </Grid>
                    
                    <Grid item xs={12} md={6}>
                      <TextField
                        fullWidth
                        label="Telefon 2"
                        value={yetkili.telefon2}
                        onChange={(e) => handleChange(`yetkiliKisiler[${index}].telefon2`, e.target.value)}
                        placeholder="0XXX XXX XX XX"
                        sx={{ bgcolor: 'white', borderRadius: 1 }}
                      />
                    </Grid>
                    
                    <Grid item xs={12} md={6}>
                      <TextField
                        fullWidth
                        label={`E-posta 1 ${index === 0 ? '*' : ''}`}
                        type="email"
                        value={yetkili.eposta1}
                        onChange={(e) => handleChange(`yetkiliKisiler[${index}].eposta1`, e.target.value)}
                        required={index === 0}
                        sx={{ bgcolor: 'white', borderRadius: 1 }}
                      />
                    </Grid>
                    
                    <Grid item xs={12} md={6}>
                      <TextField
                        fullWidth
                        label="E-posta 2"
                        type="email"
                        value={yetkili.eposta2}
                        onChange={(e) => handleChange(`yetkiliKisiler[${index}].eposta2`, e.target.value)}
                        sx={{ bgcolor: 'white', borderRadius: 1 }}
                      />
                    </Grid>
                  </Grid>
                  
                  {index < formData.yetkiliKisiler.length - 1 && (
                    <Divider sx={{ mt: 3 }} />
                  )}
                </Box>
              ))}
            </Paper>

            {/* 📞 Contact & Additional Info */}
            <Paper sx={{ p: 3, mb: 4, bgcolor: '#f8fafc', borderRadius: 2 }}>
              <Typography variant="h6" sx={{ mb: 3, fontWeight: 600, color: '#2e7d32' }}>
                <ContactIcon sx={{ mr: 1 }} /> İrtibat ve Ek Bilgiler
              </Typography>
              
              <Grid container spacing={3}>
                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    label="İlk İrtibat Kurulacak Kişi *"
                    value={formData.ilkIrtibatKisi}
                    onChange={(e) => handleChange('ilkIrtibatKisi', e.target.value)}
                    required
                    placeholder="Ad Soyad"
                    sx={{ bgcolor: 'white', borderRadius: 1 }}
                  />
                </Grid>
                
                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    label="Firma Telefon"
                    value={formData.firmaTelefon}
                    onChange={(e) => handleChange('firmaTelefon', e.target.value)}
                    placeholder="0XXX XXX XX XX"
                    sx={{ bgcolor: 'white', borderRadius: 1 }}
                  />
                </Grid>
                
                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    label="Firma Email"
                    type="email"
                    value={formData.firmaEmail}
                    onChange={(e) => handleChange('firmaEmail', e.target.value)}
                    sx={{ bgcolor: 'white', borderRadius: 1 }}
                  />
                </Grid>
                
                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    label="Firma Website"
                    value={formData.firmaWebsite}
                    onChange={(e) => handleChange('firmaWebsite', e.target.value)}
                    placeholder="https://www.ornek.com"
                    sx={{ bgcolor: 'white', borderRadius: 1 }}
                  />
                </Grid>
                
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    label="Notlar"
                    value={formData.notlar}
                    onChange={(e) => handleChange('notlar', e.target.value)}
                    multiline
                    rows={3}
                    sx={{ bgcolor: 'white', borderRadius: 1 }}
                  />
                </Grid>
              </Grid>
            </Paper>

            <Divider sx={{ my: 3 }} />

            {/* 💾 Submit Button */}
            <Box sx={{ textAlign: 'center' }}>
              <Button
                type="submit"
                variant="contained"
                size="large"
                disabled={isSubmitting || isLoading}
                startIcon={
                  isSubmitting ? <CircularProgress size={20} /> : 
                  isEdit ? <SaveIcon /> : <CheckIcon />
                }
                sx={{
                  minWidth: 200,
                  py: 1.5,
                  borderRadius: 2,
                  background: 'linear-gradient(135deg, #1976d2 0%, #42a5f5 100%)',
                  boxShadow: '0 4px 12px rgba(25, 118, 210, 0.3)',
                  '&:hover': {
                    background: 'linear-gradient(135deg, #1565c0 0%, #1976d2 100%)',
                    boxShadow: '0 6px 16px rgba(25, 118, 210, 0.4)',
                    transform: 'translateY(-1px)'
                  },
                  '&:disabled': {
                    background: '#ccc'
                  }
                }}
              >
                {isSubmitting ? 'Kaydediliyor...' : 
                 isEdit ? 'Firma Güncelle' : 'Firma Kaydet'}
              </Button>
            </Box>

          </CardContent>
        </form>
      </Card>

      {/* 🔔 Notifications */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={handleSnackbarClose}
        anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
      >
        <Alert
          onClose={handleSnackbarClose}
          severity={snackbar.severity}
          sx={{ width: '100%', borderRadius: 2 }}
          variant="filled"
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Container>
  );
};

export default FirmaForm; 