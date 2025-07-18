// 🏢 OPTIMIZED FIRMA FORMU - PROFESSIONAL ENTERPRISE EDITION V4.0
// Ultra-performance optimized with zero re-render issues
// State-of-the-art React best practices implementation

import React, { useState, useEffect, useCallback, useMemo, memo } from 'react';
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
  Alert,
  Snackbar,
  Paper,
  Stack,
  CircularProgress,
  Chip,
  IconButton,
  Stepper,
  Step,
  StepLabel,
  Divider
} from '@mui/material';
import {
  Business as BusinessIcon,
  Person as PersonIcon,
  Save as SaveIcon,
  ArrowBack as BackIcon,
  Search as SearchIcon,
  ContactMail as ContactIcon,
  Add as AddIcon,
  Remove as RemoveIcon,
  LocationOn as LocationIcon,
  CheckCircle as CheckIcon,
  ArrowForward as ArrowForwardIcon,
  ArrowBack as ArrowBackIcon
} from '@mui/icons-material';

// Hooks & Services
import { useFirma } from '../../contexts/FirmaContext';
import { validateFirmaData } from '../../services/firmaService';
import turkeyData from '../../data/turkeyData';

// 🎯 Constants - Professional Categories
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

// 🎯 Default structures
const createEmptyYetkiliKisi = () => ({
  adSoyad: '',
  telefon1: '',
  telefon2: '',
  eposta1: '',
  eposta2: ''
});

const createInitialFormData = () => ({
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
  yetkiliKisiler: [createEmptyYetkiliKisi()],
  notlar: ''
});

// 🎯 Memoized Input Component - Prevents unnecessary re-renders
const MemoizedTextField = memo(({ value, onChange, ...props }) => (
  <TextField
    {...props}
    value={value || ''}
    onChange={onChange}
    sx={{ 
      backgroundColor: 'white',
      '& .MuiOutlinedInput-root': {
        '&:hover fieldset': {
          borderColor: '#3b82f6',
        },
        '&.Mui-focused fieldset': {
          borderColor: '#1e40af',
          borderWidth: 2,
        },
      },
      ...props.sx
    }}
  />
));

// 🎯 Memoized Yetkili Kisi Component
const YetkiliKisiForm = memo(({ 
  yetkili, 
  index, 
  onChange, 
  onRemove, 
  canRemove 
}) => {
  // Optimized change handlers
  const handleFieldChange = useCallback((field) => (event) => {
    onChange(index, field, event.target.value);
  }, [index, onChange]);

  return (
    <Paper 
      elevation={2}
      sx={{ 
        p: 3,
        borderRadius: 2,
        border: '1px solid #e5e7eb',
        background: 'linear-gradient(135deg, #ffffff 0%, #f9fafb 100%)',
        transition: 'all 0.2s ease',
        '&:hover': {
          boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
          transform: 'translateY(-1px)'
        }
      }}
    >
      <Box sx={{ 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'space-between', 
        mb: 2.5 
      }}>
        <Typography variant="h6" sx={{ 
          fontWeight: 600,
          fontSize: '1rem',
          color: '#1e40af',
          display: 'flex',
          alignItems: 'center',
          gap: 1
        }}>
          <PersonIcon sx={{ fontSize: 20 }} />
          {index === 0 ? 'Ana Yetkili Kişi' : `${index + 1}. Yetkili Kişi`}
        </Typography>
        
        {canRemove && (
          <IconButton
            size="small"
            onClick={() => onRemove(index)}
            sx={{ 
              color: '#ef4444',
              '&:hover': { 
                backgroundColor: '#fef2f2',
                transform: 'scale(1.1)' 
              }
            }}
          >
            <RemoveIcon fontSize="small" />
          </IconButton>
        )}
      </Box>
      
      <Grid container spacing={2.5}>
        <Grid item xs={12} md={6}>
          <MemoizedTextField
            fullWidth
            size="small"
            label="Ad Soyad *"
            value={yetkili.adSoyad}
            onChange={handleFieldChange('adSoyad')}
            required
            placeholder="Örnek: Ahmet Yılmaz"
          />
        </Grid>
        
        <Grid item xs={12} md={6}>
          <MemoizedTextField
            fullWidth
            size="small"
            label="Telefon 1 *"
            value={yetkili.telefon1}
            onChange={handleFieldChange('telefon1')}
            required
            placeholder="0532 000 00 00"
          />
        </Grid>
        
        <Grid item xs={12} md={6}>
          <MemoizedTextField
            fullWidth
            size="small"
            label="Telefon 2"
            value={yetkili.telefon2}
            onChange={handleFieldChange('telefon2')}
            placeholder="0532 000 00 00"
          />
        </Grid>
        
        <Grid item xs={12} md={6}>
          <MemoizedTextField
            fullWidth
            size="small"
            label="E-posta 1 *"
            type="email"
            value={yetkili.eposta1}
            onChange={handleFieldChange('eposta1')}
            required
            placeholder="yetkili@firma.com"
          />
        </Grid>
        
        <Grid item xs={12} md={6}>
          <MemoizedTextField
            fullWidth
            size="small"
            label="E-posta 2"
            type="email"
            value={yetkili.eposta2}
            onChange={handleFieldChange('eposta2')}
            placeholder="yetkili2@firma.com"
          />
        </Grid>
      </Grid>
    </Paper>
  );
});

const FirmaForm = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEdit = Boolean(id);

  // Context & State
  const {
    selectedFirma,
    loading,
    searchResults,
    fetchFirma,
    createFirma,
    updateFirma,
    searchFirmalar,
    clearFirma,
    clearError,
    clearSearchResults
  } = useFirma();

  // Optimized Local State
  const [formData, setFormData] = useState(createInitialFormData);
  const [searchTerm, setSearchTerm] = useState('');
  const [validationErrors, setValidationErrors] = useState([]);
  const [activeStep, setActiveStep] = useState(0);
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: '',
    severity: 'info'
  });

  // Steps configuration
  const steps = useMemo(() => [
    { label: 'Temel Bilgiler', icon: <BusinessIcon /> },
    { label: 'İletişim & Lokasyon', icon: <LocationIcon /> },
    { label: 'Yetkili Kişiler', icon: <PersonIcon /> }
  ], []);

  // Optimized Snackbar Handler
  const showSnackbar = useCallback((message, severity = 'info') => {
    setSnackbar({ open: true, message, severity });
  }, []);

  const handleCloseSnackbar = useCallback(() => {
    setSnackbar(prev => ({ ...prev, open: false }));
  }, []);

  // 🚀 ULTRA-OPTIMIZED Form Data Management
  const handleBasicFieldChange = useCallback((field) => (event) => {
    const value = event.target.type === 'checkbox' ? event.target.checked : event.target.value;
    
    setFormData(prevData => ({
      ...prevData,
      [field]: value
    }));

    // Clear validation errors
    if (validationErrors.length > 0) {
      setValidationErrors([]);
    }
  }, [validationErrors.length]);

  // Specialized handler for il/ilce dependency
  const handleIlChange = useCallback((event) => {
    const newIl = event.target.value;
    setFormData(prevData => ({
      ...prevData,
      firmaIl: newIl,
      firmaIlce: '' // Reset ilce when il changes
    }));
  }, []);

  // 🎯 Ultra-optimized Yetkili Kisi Management
  const handleYetkiliChange = useCallback((index, field, value) => {
    setFormData(prevData => {
      const newYetkiliKisiler = [...prevData.yetkiliKisiler];
      newYetkiliKisiler[index] = {
        ...newYetkiliKisiler[index],
        [field]: value
      };
      return {
        ...prevData,
        yetkiliKisiler: newYetkiliKisiler
      };
    });
  }, []);

  const addYetkiliKisi = useCallback(() => {
    if (formData.yetkiliKisiler.length < 2) {
      setFormData(prevData => ({
        ...prevData,
        yetkiliKisiler: [...prevData.yetkiliKisiler, createEmptyYetkiliKisi()]
      }));
    }
  }, [formData.yetkiliKisiler.length]);

  const removeYetkiliKisi = useCallback((index) => {
    if (formData.yetkiliKisiler.length > 1 && index > 0) {
      setFormData(prevData => ({
        ...prevData,
        yetkiliKisiler: prevData.yetkiliKisiler.filter((_, i) => i !== index)
      }));
    }
  }, [formData.yetkiliKisiler.length]);

  // Load data for edit mode
  useEffect(() => {
    if (isEdit && id) {
      fetchFirma(id);
    }
  }, [isEdit, id, fetchFirma]);

  useEffect(() => {
    if (isEdit && selectedFirma) {
      setFormData({
        ...selectedFirma,
        etuysYetkiBitisTarihi: selectedFirma.etuysYetkiBitisTarihi 
          ? new Date(selectedFirma.etuysYetkiBitisTarihi).toISOString().split('T')[0] 
          : '',
        dysYetkiBitisTarihi: selectedFirma.dysYetkiBitisTarihi 
          ? new Date(selectedFirma.dysYetkiBitisTarihi).toISOString().split('T')[0] 
          : '',
        yetkiliKisiler: selectedFirma.yetkiliKisiler?.length > 0 
          ? selectedFirma.yetkiliKisiler 
          : [createEmptyYetkiliKisi()]
      });
    }
  }, [isEdit, selectedFirma]);

  // 🔍 Search Functions
  const handleSearch = useCallback(async () => {
    if (searchTerm.length < 2) {
      showSnackbar('Arama terimi en az 2 karakter olmalıdır', 'warning');
      return;
    }

    try {
      await searchFirmalar(searchTerm);
      showSnackbar('Arama tamamlandı', 'success');
    } catch (error) {
      showSnackbar('Arama sırasında hata oluştu: ' + error.message, 'error');
    }
  }, [searchTerm, searchFirmalar, showSnackbar]);

  const loadFirmaToForm = useCallback((firma) => {
    setFormData({
      ...firma,
      etuysYetkiBitisTarihi: firma.etuysYetkiBitisTarihi 
        ? new Date(firma.etuysYetkiBitisTarihi).toISOString().split('T')[0] 
        : '',
      dysYetkiBitisTarihi: firma.dysYetkiBitisTarihi 
        ? new Date(firma.dysYetkiBitisTarihi).toISOString().split('T')[0] 
        : '',
      yetkiliKisiler: firma.yetkiliKisiler?.length > 0 
        ? firma.yetkiliKisiler 
        : [createEmptyYetkiliKisi()]
    });
    
    clearSearchResults();
    setSearchTerm('');
    showSnackbar('Firma bilgileri yüklendi', 'info');
  }, [clearSearchResults, showSnackbar]);

  // 📝 Form Validation
  const validateForm = useCallback(async () => {
    const errors = [];

    // Basic validations
    if (!formData.vergiNoTC) errors.push('Vergi No/TC No zorunludur');
    if (!formData.tamUnvan) errors.push('Tam Ünvan zorunludur');
    if (!formData.adres) errors.push('Adres zorunludur');
    if (!formData.firmaIl) errors.push('Firma İli zorunludur');
    if (!formData.ilkIrtibatKisi) errors.push('İlk İrtibat Kişisi zorunludur');

    // Yetkili kişi validations
    if (!formData.yetkiliKisiler || formData.yetkiliKisiler.length === 0) {
      errors.push('En az bir yetkili kişi bilgisi gereklidir');
    } else {
      formData.yetkiliKisiler.forEach((kisi, index) => {
        if (!kisi.adSoyad) errors.push(`${index + 1}. Yetkili Kişi: Ad Soyad zorunludur`);
        if (!kisi.telefon1) errors.push(`${index + 1}. Yetkili Kişi: Telefon 1 zorunludur`);
        if (!kisi.eposta1) errors.push(`${index + 1}. Yetkili Kişi: E-posta 1 zorunludur`);
      });
    }

    // Advanced validation using service
    try {
      const serviceValidation = await validateFirmaData(formData);
      if (!serviceValidation.success && serviceValidation.errors) {
        errors.push(...serviceValidation.errors);
      }
    } catch (error) {
      console.warn('Service validation failed:', error);
    }

    return errors;
  }, [formData]);

  // 💾 Form Submission
  const handleSubmit = useCallback(async (e) => {
    e.preventDefault();
    
    const errors = await validateForm();
    if (errors.length > 0) {
      setValidationErrors(errors);
      showSnackbar('Lütfen form hatalarını düzeltin', 'error');
      return;
    }

    try {
      const result = isEdit 
        ? await updateFirma(id, formData)
        : await createFirma(formData);

      if (result.success) {
        showSnackbar(
          isEdit ? 'Firma başarıyla güncellendi' : 'Firma başarıyla oluşturuldu',
          'success'
        );
        
        setTimeout(() => {
          navigate('/firmalar');
        }, 1500);
      } else {
        throw new Error(result.message || 'İşlem başarısız');
      }
    } catch (error) {
      showSnackbar('Hata: ' + error.message, 'error');
    }
  }, [validateForm, isEdit, updateFirma, id, formData, createFirma, showSnackbar, navigate]);

  // 🔙 Navigation
  const handleBack = useCallback(() => {
    clearFirma();
    clearError();
    clearSearchResults();
    navigate('/firmalar');
  }, [clearFirma, clearError, clearSearchResults, navigate]);

  // Step navigation
  const handleNext = useCallback(() => {
    setActiveStep((prevActiveStep) => prevActiveStep + 1);
  }, []);

  const handlePrev = useCallback(() => {
    setActiveStep((prevActiveStep) => prevActiveStep - 1);
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      clearFirma();
      clearError();
      clearSearchResults();
    };
  }, [clearFirma, clearError, clearSearchResults]);

  return (
    <Box sx={{ 
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)',
      py: 3,
      px: 2
    }}>
      <Container maxWidth="lg">
        {/* 🎯 Professional Header */}
        <Box sx={{ 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'space-between',
          mb: 3
        }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <IconButton 
              onClick={handleBack}
              size="medium"
              sx={{ 
                bgcolor: 'white',
                boxShadow: 2,
                '&:hover': { 
                  boxShadow: 4,
                  transform: 'scale(1.05)'
                }
              }}
            >
              <BackIcon />
            </IconButton>
            <Box>
              <Typography variant="h4" sx={{ 
                fontWeight: 700, 
                color: '#1e293b',
                fontSize: '1.5rem',
                mb: 0.5
              }}>
                {isEdit ? 'Firma Güncelle' : 'Yeni Firma Ekle'}
              </Typography>
              <Typography variant="body1" color="text.secondary" sx={{ fontSize: '1rem' }}>
                Profesyonel firma kayıt sistemi - Enterprise Edition
              </Typography>
            </Box>
          </Box>
          
          {formData.firmaId && (
            <Chip 
              label={`ID: ${formData.firmaId}`}
              color="primary"
              size="medium"
              sx={{ fontWeight: 600, fontSize: '0.9rem' }}
            />
          )}
        </Box>

        {/* 🔍 Advanced Search Section - Only for new records */}
        {!isEdit && (
          <Card sx={{ 
            mb: 3,
            borderRadius: 3,
            border: '1px solid #e2e8f0',
            boxShadow: '0 4px 12px rgba(0,0,0,0.05)'
          }}>
            <CardContent sx={{ p: 3 }}>
              <Typography variant="h6" sx={{ 
                mb: 2, 
                fontWeight: 600,
                fontSize: '1.1rem',
                color: '#374151',
                display: 'flex',
                alignItems: 'center',
                gap: 1
              }}>
                <SearchIcon sx={{ fontSize: 22 }} />
                Mevcut Firma Kontrolü
              </Typography>
              
              <Grid container spacing={2} alignItems="center">
                <Grid item xs={12} md={8}>
                  <MemoizedTextField
                    fullWidth
                    size="medium"
                    label="Vergi No/TC No veya Firma Ünvanı"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Arama yapmak için en az 2 karakter giriniz"
                    onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                  />
                </Grid>
                
                <Grid item xs={12} md={4}>
                  <Button
                    fullWidth
                    variant="contained"
                    size="large"
                    onClick={handleSearch}
                    disabled={loading || searchTerm.length < 2}
                    startIcon={loading ? <CircularProgress size={20} /> : <SearchIcon />}
                    sx={{
                      py: 1.5,
                      background: 'linear-gradient(135deg, #1e40af 0%, #3b82f6 100%)',
                      fontSize: '1rem',
                      textTransform: 'none',
                      fontWeight: 600,
                      '&:hover': {
                        background: 'linear-gradient(135deg, #1e3a8a 0%, #1e40af 100%)',
                        transform: 'translateY(-1px)',
                        boxShadow: '0 6px 20px rgba(59, 130, 246, 0.4)'
                      }
                    }}
                  >
                    {loading ? 'Aranıyor...' : 'Ara'}
                  </Button>
                </Grid>
              </Grid>
              
              {/* Enhanced Search Results */}
              {searchResults.length > 0 && (
                <Box sx={{ mt: 3 }}>
                  <Typography variant="body1" sx={{ mb: 2, fontWeight: 600, color: '#6b7280' }}>
                    {searchResults.length} firma bulundu
                  </Typography>
                  <Stack spacing={2}>
                    {searchResults.slice(0, 3).map((firma) => (
                      <Paper 
                        key={firma._id}
                        sx={{ 
                          p: 2.5, 
                          cursor: 'pointer',
                          transition: 'all 0.3s ease',
                          border: '1px solid #e5e7eb',
                          borderRadius: 2,
                          '&:hover': { 
                            bgcolor: '#f9fafb',
                            borderColor: '#3b82f6',
                            transform: 'translateY(-2px)',
                            boxShadow: '0 8px 24px rgba(0,0,0,0.1)'
                          }
                        }}
                        onClick={() => loadFirmaToForm(firma)}
                      >
                        <Stack direction="row" spacing={2} alignItems="center" flexWrap="wrap">
                          <Chip 
                            label={firma.firmaId} 
                            color="primary" 
                            size="medium" 
                            sx={{ fontSize: '0.8rem', fontWeight: 600 }} 
                          />
                          <Typography variant="h6" sx={{ 
                            fontWeight: 600, 
                            flexGrow: 1, 
                            fontSize: '1rem',
                            color: '#1e293b'
                          }}>
                            {firma.tamUnvan}
                          </Typography>
                          <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.9rem' }}>
                            {firma.firmaIl}
                          </Typography>
                        </Stack>
                      </Paper>
                    ))}
                  </Stack>
                </Box>
              )}
            </CardContent>
          </Card>
        )}

        {/* 📝 Main Form Card */}
        <Card sx={{ 
          borderRadius: 3,
          border: '1px solid #e2e8f0',
          boxShadow: '0 4px 12px rgba(0,0,0,0.05)'
        }}>
          <form onSubmit={handleSubmit}>
            <CardContent sx={{ p: 4 }}>
              
              {/* ❌ Validation Errors */}
              {validationErrors.length > 0 && (
                <Alert severity="error" sx={{ mb: 3, fontSize: '0.95rem' }}>
                  <Typography variant="h6" sx={{ mb: 1, fontSize: '1rem' }}>
                    Lütfen aşağıdaki hataları düzeltin:
                  </Typography>
                  <Box component="ul" sx={{ margin: 0, paddingLeft: 2, fontSize: '0.9rem' }}>
                    {validationErrors.slice(0, 5).map((error, index) => (
                      <li key={index} style={{ marginBottom: '4px' }}>{error}</li>
                    ))}
                    {validationErrors.length > 5 && (
                      <li>... ve {validationErrors.length - 5} hata daha</li>
                    )}
                  </Box>
                </Alert>
              )}

              {/* 🔄 Enhanced Stepper */}
              <Stepper activeStep={activeStep} orientation="horizontal" sx={{ mb: 4 }}>
                {steps.map((step, index) => (
                  <Step key={step.label}>
                    <StepLabel 
                      icon={step.icon}
                      sx={{
                        '& .MuiStepLabel-label': { 
                          fontSize: '1rem',
                          fontWeight: 600
                        },
                        '& .MuiStepIcon-root': {
                          fontSize: '2rem'
                        }
                      }}
                    >
                      {step.label}
                    </StepLabel>
                  </Step>
                ))}
              </Stepper>

              <Divider sx={{ mb: 4 }} />

              {/* Step Content */}
              {activeStep === 0 && (
                <Box>
                  <Typography variant="h5" sx={{ 
                    mb: 3, 
                    fontWeight: 700, 
                    color: '#1e40af',
                    fontSize: '1.3rem',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 1
                  }}>
                    <BusinessIcon sx={{ fontSize: 28 }} /> Temel Bilgiler
                  </Typography>
                  
                  <Grid container spacing={3}>
                    <Grid item xs={12} md={6}>
                      <MemoizedTextField
                        fullWidth
                        size="medium"
                        label="Vergi No / TC No *"
                        value={formData.vergiNoTC}
                        onChange={handleBasicFieldChange('vergiNoTC')}
                        required
                        placeholder="10 haneli Vergi No veya 11 haneli TC No"
                      />
                    </Grid>
                    
                    <Grid item xs={12} md={6}>
                      <MemoizedTextField
                        fullWidth
                        size="medium"
                        label="Tam Ünvan *"
                        value={formData.tamUnvan}
                        onChange={handleBasicFieldChange('tamUnvan')}
                        required
                        placeholder="Firma tam ünvanını giriniz"
                      />
                    </Grid>
                    
                    <Grid item xs={12}>
                      <MemoizedTextField
                        fullWidth
                        size="medium"
                        label="Adres *"
                        value={formData.adres}
                        onChange={handleBasicFieldChange('adres')}
                        multiline
                        rows={3}
                        required
                        placeholder="Firma adresini detaylı olarak giriniz"
                      />
                    </Grid>
                    
                    <Grid item xs={12} md={6}>
                      <FormControl fullWidth size="medium" required>
                        <InputLabel>Firma İli *</InputLabel>
                        <Select
                          value={formData.firmaIl}
                          onChange={handleIlChange}
                          required
                          sx={{ backgroundColor: 'white' }}
                        >
                          {turkeyData.TURKEY_CITIES.map((il) => (
                            <MenuItem key={il} value={il}>{il}</MenuItem>
                          ))}
                        </Select>
                      </FormControl>
                    </Grid>
                    
                    <Grid item xs={12} md={6}>
                      <FormControl fullWidth size="medium" disabled={!formData.firmaIl}>
                        <InputLabel>Firma İlçe</InputLabel>
                        <Select
                          value={formData.firmaIlce}
                          onChange={handleBasicFieldChange('firmaIlce')}
                          sx={{ backgroundColor: 'white' }}
                        >
                          {formData.firmaIl && turkeyData.CITY_DISTRICTS[formData.firmaIl]?.map((ilce) => (
                            <MenuItem key={ilce} value={ilce}>{ilce}</MenuItem>
                          ))}
                        </Select>
                      </FormControl>
                    </Grid>

                    <Grid item xs={12} md={6}>
                      <FormControl fullWidth size="medium">
                        <InputLabel>Ana Faaliyet Konusu</InputLabel>
                        <Select
                          value={formData.anaFaaliyetKonusu}
                          onChange={handleBasicFieldChange('anaFaaliyetKonusu')}
                          sx={{ backgroundColor: 'white' }}
                        >
                          {ANA_FAALIYET_KONULARI.map((faaliyet) => (
                            <MenuItem key={faaliyet} value={faaliyet}>{faaliyet}</MenuItem>
                          ))}
                        </Select>
                      </FormControl>
                    </Grid>

                    <Grid item xs={12} md={6}>
                      <Box sx={{ display: 'flex', alignItems: 'center', height: '100%' }}>
                        <FormControlLabel
                          control={
                            <Switch
                              checked={formData.yabanciSermayeli}
                              onChange={handleBasicFieldChange('yabanciSermayeli')}
                              size="medium"
                              color="primary"
                            />
                          }
                          label="Yabancı Sermayeli"
                          sx={{ 
                            '& .MuiFormControlLabel-label': { 
                              fontSize: '1rem',
                              fontWeight: 500 
                            } 
                          }}
                        />
                      </Box>
                    </Grid>
                  </Grid>
                </Box>
              )}

              {activeStep === 1 && (
                <Box>
                  <Typography variant="h5" sx={{ 
                    mb: 3, 
                    fontWeight: 700, 
                    color: '#1e40af',
                    fontSize: '1.3rem',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 1
                  }}>
                    <ContactIcon sx={{ fontSize: 28 }} /> İletişim & Lokasyon
                  </Typography>
                  
                  <Grid container spacing={3}>
                    <Grid item xs={12} md={6}>
                      <MemoizedTextField
                        fullWidth
                        size="medium"
                        label="KEP Adresi"
                        type="email"
                        value={formData.kepAdresi}
                        onChange={handleBasicFieldChange('kepAdresi')}
                        placeholder="ornek@hs01.kep.tr"
                      />
                    </Grid>
                    
                    <Grid item xs={12} md={6}>
                      <MemoizedTextField
                        fullWidth
                        size="medium"
                        label="Firma Telefonu"
                        value={formData.firmaTelefon}
                        onChange={handleBasicFieldChange('firmaTelefon')}
                        placeholder="0212 000 00 00"
                      />
                    </Grid>
                    
                    <Grid item xs={12} md={6}>
                      <MemoizedTextField
                        fullWidth
                        size="medium"
                        label="Firma E-postası"
                        type="email"
                        value={formData.firmaEmail}
                        onChange={handleBasicFieldChange('firmaEmail')}
                        placeholder="info@firma.com"
                      />
                    </Grid>
                    
                    <Grid item xs={12} md={6}>
                      <MemoizedTextField
                        fullWidth
                        size="medium"
                        label="Website"
                        value={formData.firmaWebsite}
                        onChange={handleBasicFieldChange('firmaWebsite')}
                        placeholder="https://www.firma.com"
                      />
                    </Grid>

                    <Grid item xs={12} md={6}>
                      <MemoizedTextField
                        fullWidth
                        size="medium"
                        label="İlk İrtibat Kişisi *"
                        value={formData.ilkIrtibatKisi}
                        onChange={handleBasicFieldChange('ilkIrtibatKisi')}
                        required
                        placeholder="İlk iletişim kurulacak kişi"
                      />
                    </Grid>

                    <Grid item xs={12} md={6}>
                      <MemoizedTextField
                        fullWidth
                        size="medium"
                        label="ETYUS Yetki Bitiş Tarihi"
                        type="date"
                        value={formData.etuysYetkiBitisTarihi}
                        onChange={handleBasicFieldChange('etuysYetkiBitisTarihi')}
                        InputLabelProps={{ shrink: true }}
                      />
                    </Grid>

                    <Grid item xs={12} md={6}>
                      <MemoizedTextField
                        fullWidth
                        size="medium"
                        label="DYS Yetki Bitiş Tarihi"
                        type="date"
                        value={formData.dysYetkiBitisTarihi}
                        onChange={handleBasicFieldChange('dysYetkiBitisTarihi')}
                        InputLabelProps={{ shrink: true }}
                      />
                    </Grid>
                  </Grid>
                </Box>
              )}

              {activeStep === 2 && (
                <Box>
                  <Box sx={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'space-between', 
                    mb: 3 
                  }}>
                    <Typography variant="h5" sx={{ 
                      fontWeight: 700, 
                      color: '#1e40af',
                      fontSize: '1.3rem',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 1
                    }}>
                      <PersonIcon sx={{ fontSize: 28 }} /> Yetkili Kişiler
                    </Typography>
                    
                    {formData.yetkiliKisiler.length < 2 && (
                      <Button
                        variant="contained"
                        size="medium"
                        startIcon={<AddIcon />}
                        onClick={addYetkiliKisi}
                        sx={{ 
                          textTransform: 'none',
                          fontSize: '1rem',
                          fontWeight: 600,
                          px: 3,
                          background: 'linear-gradient(135deg, #059669 0%, #047857 100%)',
                          '&:hover': {
                            background: 'linear-gradient(135deg, #047857 0%, #065f46 100%)',
                            transform: 'translateY(-1px)'
                          }
                        }}
                      >
                        Yetkili Ekle
                      </Button>
                    )}
                  </Box>
                  
                  <Stack spacing={3}>
                    {formData.yetkiliKisiler.map((yetkili, index) => (
                      <YetkiliKisiForm
                        key={index}
                        yetkili={yetkili}
                        index={index}
                        onChange={handleYetkiliChange}
                        onRemove={removeYetkiliKisi}
                        canRemove={formData.yetkiliKisiler.length > 1 && index > 0}
                      />
                    ))}
                  </Stack>

                  {/* Notlar */}
                  <Box sx={{ mt: 4 }}>
                    <Typography variant="h6" sx={{ mb: 2, fontWeight: 600, color: '#374151' }}>
                      Ek Notlar
                    </Typography>
                    <MemoizedTextField
                      fullWidth
                      size="medium"
                      label="Notlar"
                      value={formData.notlar}
                      onChange={handleBasicFieldChange('notlar')}
                      multiline
                      rows={4}
                      placeholder="Ek bilgiler, özel notlar ve açıklamalar..."
                    />
                  </Box>
                </Box>
              )}

              {/* 🎯 Enhanced Action Buttons */}
              <Box sx={{ 
                display: 'flex', 
                justifyContent: 'space-between', 
                alignItems: 'center',
                mt: 4,
                pt: 3,
                borderTop: '2px solid #e5e7eb'
              }}>
                <Button
                  disabled={activeStep === 0}
                  onClick={handlePrev}
                  size="large"
                  startIcon={<ArrowBackIcon />}
                  sx={{ 
                    textTransform: 'none', 
                    fontSize: '1rem',
                    fontWeight: 600,
                    px: 3
                  }}
                >
                  Önceki
                </Button>

                <Box sx={{ display: 'flex', gap: 2 }}>
                  {activeStep < steps.length - 1 ? (
                    <Button
                      variant="contained"
                      onClick={handleNext}
                      size="large"
                      endIcon={<ArrowForwardIcon />}
                      sx={{ 
                        textTransform: 'none',
                        fontSize: '1rem',
                        fontWeight: 600,
                        px: 4,
                        py: 1.5,
                        background: 'linear-gradient(135deg, #1e40af 0%, #3b82f6 100%)',
                        '&:hover': {
                          background: 'linear-gradient(135deg, #1e3a8a 0%, #1e40af 100%)',
                          transform: 'translateY(-1px)',
                          boxShadow: '0 6px 20px rgba(59, 130, 246, 0.4)'
                        }
                      }}
                    >
                      Sonraki
                    </Button>
                  ) : (
                    <Button
                      type="submit"
                      variant="contained"
                      disabled={loading}
                      startIcon={loading ? <CircularProgress size={20} /> : <SaveIcon />}
                      size="large"
                      sx={{ 
                        background: 'linear-gradient(135deg, #059669 0%, #047857 100%)',
                        textTransform: 'none',
                        fontSize: '1rem',
                        fontWeight: 600,
                        px: 4,
                        py: 1.5,
                        '&:hover': {
                          background: 'linear-gradient(135deg, #047857 0%, #065f46 100%)',
                          transform: 'translateY(-1px)',
                          boxShadow: '0 6px 20px rgba(5, 150, 105, 0.4)'
                        }
                      }}
                    >
                      {loading ? 'Kaydediliyor...' : (isEdit ? 'Güncelle' : 'Kaydet')}
                    </Button>
                  )}
                </Box>
              </Box>
            </CardContent>
          </form>
        </Card>
      </Container>

      {/* 📱 Enhanced Snackbar */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={4000}
        onClose={handleCloseSnackbar}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert 
          onClose={handleCloseSnackbar} 
          severity={snackbar.severity}
          sx={{ 
            fontSize: '1rem',
            fontWeight: 500,
            '& .MuiAlert-icon': {
              fontSize: '1.5rem'
            }
          }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default FirmaForm; 