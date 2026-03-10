// 🏢 OPTIMIZED FIRMA FORMU - PROFESSIONAL ENTERPRISE EDITION V4.0
// Ultra-performance optimized with zero re-render issues
// State-of-the-art React best practices implementation

import React, { useState, useEffect, useCallback, memo } from 'react';
import { createFormDatePasteHandler } from '../../utils/dateUtils';
import { useNavigate, useParams } from 'react-router-dom';
import {
  Container,
  Card,
  CardContent,
  TextField,
  Button,
  Grid,
  Typography,
  Box,
  CircularProgress,
  Alert,
  MenuItem,
  FormControlLabel,
  Stack,
  Chip,
  IconButton,
  Paper,
  InputAdornment,
  CardHeader,
  Switch,
  Snackbar
} from '@mui/material';
import {
  Search as SearchIcon,
  Add as AddIcon,
  Remove as RemoveIcon,
  Person as PersonIcon,
  ContactMail as ContactIcon
} from '@mui/icons-material';

// 🎯 Layout Components Import
import Header from '../../components/Layout/Header';
import Sidebar from '../../components/Layout/Sidebar';
// Hooks & Services
import { useFirma } from '../../contexts/FirmaContext';
import { validateFirmaData, getNextFirmaId } from '../../services/firmaService';

// 🆕 Enhanced Components - CSV Integration
import EnhancedCitySelector from '../../components/EnhancedCitySelector.tsx';

// 🎯 Import activity selector component
import ActivitySelector from '../../components/ActivitySelector';

// 🇹🇷 Türkçe karakter dönüştürme fonksiyonu
const toTurkishUpperCase = (str) => {
  if (!str || typeof str !== 'string') return str;

  // Türkçe karakterlerin doğru büyük harf karşılıkları
  const turkishCharMap = {
    'ı': 'I',  // Türkçe küçük ı -> Türkçe büyük I
    'i': 'İ',  // Türkçe küçük i -> Türkçe büyük İ
    'ş': 'Ş',  // ş -> Ş
    'ğ': 'Ğ',  // ğ -> Ğ
    'ü': 'Ü',  // ü -> Ü
    'ö': 'Ö',  // ö -> Ö
    'ç': 'Ç'   // ç -> Ç
  };

  return str.split('').map(char => {
    // Önce Türkçe karakterleri kontrol et
    if (turkishCharMap[char]) {
      return turkishCharMap[char];
    }
    // Diğer karakterler için normal uppercase
    return char.toUpperCase();
  }).join('');
};

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
  ilKod: '',
  ilceKod: '',
  kepAdresi: '',
  firmaTelefon: '',
  firmaEmail: '',
  firmaWebsite: '',
  yabanciSermayeli: false,
  aktif: true,
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
    let value = event.target.value;

    // 🔤 Türkçe karakterli büyük harf dönüştürme (email alanları hariç)
    const emailFields = ['eposta1', 'eposta2'];
    if (typeof value === 'string' && !emailFields.includes(field)) {
      value = toTurkishUpperCase(value);
    }

    onChange(index, field, value);
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
          <TextField
            fullWidth
            id={`yetkili-ad-soyad-${index}`}
            name={`yetkiliKisiler[${index}].adSoyad`}
            size="small"
            label="Ad Soyad *"
            value={yetkili.adSoyad}
            onChange={handleFieldChange('adSoyad')}
            required
            placeholder="Örnek: Ahmet Yılmaz"
            error={Boolean(index === 0 && !yetkili.adSoyad)}
            helperText={
              index === 0 && !yetkili.adSoyad
                ? "❌ Ad Soyad zorunludur"
                : yetkili.adSoyad
                  ? "✅ Geçerli"
                  : ""
            }
            sx={{
              '& .MuiFormHelperText-root': {
                color: (index === 0 && !yetkili.adSoyad)
                  ? 'error.main'
                  : yetkili.adSoyad
                    ? 'success.main'
                    : 'text.secondary'
              },
              '& .MuiOutlinedInput-root': {
                '&.Mui-error': {
                  backgroundColor: '#fef2f2',
                  '& fieldset': { borderColor: '#ef4444', borderWidth: 2 }
                }
              }
            }}
          />
        </Grid>

        <Grid item xs={12} md={6}>
          <MemoizedTextField
            fullWidth
            id={`yetkili-telefon1-${index}`}
            name={`yetkiliKisiler[${index}].telefon1`}
            size="small"
            label="Telefon 1"
            value={yetkili.telefon1}
            onChange={handleFieldChange('telefon1')}
            placeholder="0532 000 00 00"
          />
        </Grid>

        <Grid item xs={12} md={6}>
          <MemoizedTextField
            fullWidth
            id={`yetkili-telefon2-${index}`}
            name={`yetkiliKisiler[${index}].telefon2`}
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
            id={`yetkili-eposta1-${index}`}
            name={`yetkiliKisiler[${index}].eposta1`}
            size="small"
            label="E-posta 1"
            type="email"
            value={yetkili.eposta1}
            onChange={handleFieldChange('eposta1')}
            placeholder="yetkili@firma.com"
          />
        </Grid>

        <Grid item xs={12} md={6}>
          <MemoizedTextField
            fullWidth
            id={`yetkili-eposta2-${index}`}
            name={`yetkiliKisiler[${index}].eposta2`}
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
    firma: selectedFirma,
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

  // 🎯 Layout State Management
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 1024);

  // 🎯 State Management - Optimized
  const [formData, setFormData] = useState(createInitialFormData);
  const [validationErrors, setValidationErrors] = useState([]);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });

  // Optimized Snackbar Handler
  const showSnackbar = useCallback((message, severity = 'info') => {
    setSnackbar({ open: true, message, severity });
  }, []);

  const handleCloseSnackbar = useCallback(() => {
    setSnackbar(prev => ({ ...prev, open: false }));
  }, []);

  // 🚀 ULTRA-OPTIMIZED Form Data Management
  const handleBasicFieldChange = useCallback((field) => (event) => {
    let value = event.target.type === 'checkbox' ? event.target.checked : event.target.value;

    // 🔤 Türkçe karakterli büyük harf dönüştürme (email, website alanları ve İlk İrtibat Kişisi hariç)
    const exemptFields = ['ilkIrtibatKisi', 'firmaEmail', 'kepAdresi', 'firmaWebsite'];
    if (typeof value === 'string' && !exemptFields.includes(field)) {
      value = toTurkishUpperCase(value);
    }

    // 🌐 Website alanı için otomatik küçük harf + https:// ekleme
    if (field === 'firmaWebsite' && value && value.trim() !== '') {
      let trimmedValue = value.trim().toLowerCase(); // Küçük harfe dönüştür (I/İ karışıklığı önler)

      // Protokol kontrolü ve ekleme
      if (!trimmedValue.startsWith('http://') && !trimmedValue.startsWith('https://') && !trimmedValue.includes('://')) {
        // Sadece domain adı yazıldıysa https:// ekle
        if (trimmedValue.includes('.') && !trimmedValue.startsWith('www.')) {
          value = 'https://' + trimmedValue;
        } else if (trimmedValue.startsWith('www.')) {
          value = 'https://' + trimmedValue;
        } else {
          value = trimmedValue; // Protokol ekleme
        }
      } else {
        value = trimmedValue; // Kullanıcı zaten protokol yazmış
      }
    }

    setFormData(prevData => ({
      ...prevData,
      [field]: value
    }));

    // Clear validation errors
    if (validationErrors.length > 0) {
      setValidationErrors([]);
    }
  }, [validationErrors.length]);



  // 🎯 Ultra-optimized Yetkili Kisi Management
  const handleYetkiliChange = useCallback((index, field, value) => {
    // 🔤 Türkçe karakterli büyük harf dönüştürme (email alanları hariç)
    const emailFields = ['eposta1', 'eposta2'];
    if (typeof value === 'string' && !emailFields.includes(field)) {
      value = toTurkishUpperCase(value);
    }

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
      console.log('🔄 Loading firma for edit, ID:', id);
      fetchFirma(id);
    }
  }, [isEdit, id, fetchFirma]);

  useEffect(() => {
    if (isEdit && selectedFirma && selectedFirma._id) {
      console.log('📝 Setting form data for edit:', selectedFirma);
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
      showSnackbar('Firma bilgileri yüklendi', 'success');
    }
  }, [isEdit, selectedFirma, showSnackbar]);

  // 🆔 Load next Firma ID on component mount
  useEffect(() => {
    const loadNextFirmaId = async () => {
      if (!isEdit) { // Sadece yeni firma eklerken
        try {
          const result = await getNextFirmaId();
          if (result.success) {
            setFormData(prevData => ({
              ...prevData,
              firmaId: result.nextFirmaId
            }));
            console.log('✅ Next Firma ID loaded:', result.nextFirmaId);
          }
        } catch (error) {
          console.error('❌ Next Firma ID load error:', error);
        }
      }
    };

    loadNextFirmaId();
  }, [isEdit]);

  // 🔍 Enhanced Search handling
  const handleSearch = useCallback(async () => {
    // Form verilerinden arama terimini al
    const searchTermFromForm = formData.vergiNoTC?.trim() || formData.tamUnvan?.trim() || '';

    if (!searchTermFromForm || searchTermFromForm.length < 2) {
      showSnackbar('Arama için Vergi No/TC veya Tam Ünvan alanına en az 2 karakter giriniz', 'warning');
      return;
    }

    try {
      console.log('🔍 Searching for:', searchTermFromForm);
      const results = await searchFirmalar(searchTermFromForm);

      if (results && results.length > 0) {
        showSnackbar(`✅ ${results.length} firma bulundu`, 'success');
      } else {
        showSnackbar('❌ Eşleşen firma bulunamadı', 'info');
      }
    } catch (error) {
      console.error('Search error:', error);
      showSnackbar('Arama sırasında hata oluştu: ' + (error.message || 'Bilinmeyen hata'), 'error');
    }
  }, [formData.vergiNoTC, formData.tamUnvan, searchFirmalar, showSnackbar]);

  const loadFirmaToForm = useCallback((firma) => {
    console.log('🔍 loadFirmaToForm çağrıldı, gelen firma verisi:', firma);

    // Firma seçildiğinde detay sayfasına yönlendir
    if (firma.firmaId) {
      showSnackbar(`✅ ${firma.tamUnvan} firma detayına yönlendiriliyor...`, 'success');
      navigate(`/firmalar/${firma.firmaId}`);
      return;
    }

    // Eğer firmaId yoksa (eski kod uyumluluğu için) form verilerini doldur
    const processedData = {
      // Temel bilgiler
      firmaId: firma.firmaId || '',
      vergiNoTC: firma.vergiNoTC || '',
      tamUnvan: firma.tamUnvan || '',
      adres: firma.adres || '',
      firmaIl: firma.firmaIl || '',
      firmaIlce: firma.firmaIlce || '',
      ilKod: firma.ilKod || '',
      ilceKod: firma.ilceKod || '',

      // İletişim bilgileri
      kepAdresi: firma.kepAdresi || '',
      firmaTelefon: firma.firmaTelefon || '',
      firmaEmail: firma.firmaEmail || '',
      firmaWebsite: firma.firmaWebsite || '',

      // Diğer bilgiler
      yabanciSermayeli: Boolean(firma.yabanciSermayeli),
      aktif: firma.aktif !== false,
      anaFaaliyetKonusu: firma.anaFaaliyetKonusu || '',
      ilkIrtibatKisi: firma.ilkIrtibatKisi || '',
      notlar: firma.notlar || '',

      // Tarih alanları - ISO formatına çevir
      etuysYetkiBitisTarihi: firma.etuysYetkiBitisTarihi
        ? new Date(firma.etuysYetkiBitisTarihi).toISOString().split('T')[0]
        : '',
      dysYetkiBitisTarihi: firma.dysYetkiBitisTarihi
        ? new Date(firma.dysYetkiBitisTarihi).toISOString().split('T')[0]
        : '',

      // Yetkili kişiler - en az bir tane olmalı
      yetkiliKisiler: firma.yetkiliKisiler?.length > 0
        ? firma.yetkiliKisiler.map(kisi => ({
          adSoyad: kisi.adSoyad || '',
          telefon1: kisi.telefon1 || '',
          telefon2: kisi.telefon2 || '',
          eposta1: kisi.eposta1 || '',
          eposta2: kisi.eposta2 || ''
        }))
        : [createEmptyYetkiliKisi()]
    };

    console.log('📝 İşlenmiş form verisi:', processedData);

    // Form verilerini güncelle
    setFormData(processedData);

    // Arama sonuçlarını temizle
    clearSearchResults();

    // Validation hatalarını temizle
    setValidationErrors([]);

    // Başarı mesajı göster
    showSnackbar(`✅ ${firma.tamUnvan} firma bilgileri yüklendi`, 'success');
  }, [clearSearchResults, showSnackbar, setValidationErrors, navigate]);

  // 📝 Form Validation
  const validateForm = useCallback(async () => {
    const errors = [];

    // Basic validations
    if (!formData.vergiNoTC) errors.push('Vergi No/TC No zorunludur');
    if (!formData.tamUnvan) errors.push('Tam Ünvan zorunludur');
    if (!formData.adres) errors.push('Adres zorunludur');
    if (!formData.firmaIl) errors.push('Firma İli zorunludur');
    if (!formData.ilkIrtibatKisi) errors.push('İlk İrtibat Kişisi zorunludur');

    // Yetkili kişi validations - Updated to make phone and email optional
    if (!formData.yetkiliKisiler || formData.yetkiliKisiler.length === 0) {
      errors.push('En az bir yetkili kişi bilgisi gereklidir');
    } else {
      formData.yetkiliKisiler.forEach((kisi, index) => {
        if (!kisi.adSoyad) errors.push(`${index + 1}. Yetkili Kişi: Ad Soyad zorunludur`);
        // Phone and email are now optional - removed validation
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

    console.log('🔍 Form Data Being Sent:', formData);

    // Frontend validation kontrolü
    const frontendErrors = await validateForm();

    if (frontendErrors.length > 0) {
      setValidationErrors(frontendErrors);
      showSnackbar('Lütfen eksik/hatalı alanları düzeltin', 'error');
      return;
    }

    try {
      console.log('🚀 Calling createFirma with:', JSON.stringify(formData, null, 2));

      const result = isEdit
        ? await updateFirma(id, formData)
        : await createFirma(formData);

      console.log('📥 Backend Response:', result);

      if (result.success) {
        showSnackbar(
          isEdit ? 'Firma başarıyla güncellendi ✅' : 'Firma başarıyla oluşturuldu ✅',
          'success'
        );

        setTimeout(() => {
          navigate('/firmalar');
        }, 1500);
      } else {
        console.log('❌ Backend Error:', result);
        // Backend'den gelen detaylı hataları işle
        if (result.errors && Array.isArray(result.errors)) {
          // express-validator hataları
          const backendErrors = result.errors.map(error => {
            if (error.param) {
              const fieldNames = {
                vergiNoTC: 'Vergi No/TC',
                tamUnvan: 'Tam Ünvan',
                adres: 'Adres',
                firmaIl: 'Firma İli',
                firmaIlce: 'Firma İlçesi',
                ilkIrtibatKisi: 'İlk İrtibat Kişisi',
                'yetkiliKisiler[0].adSoyad': '1. Yetkili Kişi - Ad Soyad',
                'yetkiliKisiler[0].telefon1': '1. Yetkili Kişi - Telefon 1',
                'yetkiliKisiler[0].eposta1': '1. Yetkili Kişi - E-posta 1'
              };
              const fieldName = fieldNames[error.param] || error.param;
              return `${fieldName}: ${error.msg}`;
            }
            return error.msg || error.message || 'Bilinmeyen hata';
          });

          setValidationErrors(backendErrors);
          showSnackbar(`${backendErrors.length} alanda hata bulundu. Lütfen düzeltin.`, 'error');
        } else {
          // Genel hata mesajı
          const errorMessage = result.message || 'İşlem başarısız';
          setValidationErrors([errorMessage]);
          showSnackbar('Hata: ' + errorMessage, 'error');
        }
      }
    } catch (error) {
      console.error('💥 Form submission error:', error);
      console.log('🔴 Error details:', {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status
      });

      // Network veya diğer hatalar
      if (error.response && error.response.data) {
        const errorData = error.response.data;

        // Backend'den gelen validation errors (express-validator format)
        if (errorData.errors && Array.isArray(errorData.errors)) {
          const backendErrors = errorData.errors.map(error => {
            // express-validator error format: { param, msg, value, location }
            if (error.param) {
              const fieldNames = {
                vergiNoTC: 'Vergi No/TC',
                tamUnvan: 'Tam Ünvan',
                adres: 'Adres',
                firmaIl: 'Firma İli',
                firmaIlce: 'Firma İlçesi',
                ilkIrtibatKisi: 'İlk İrtibat Kişisi',
                'yetkiliKisiler[0].adSoyad': '1. Yetkili Kişi - Ad Soyad',
                'yetkiliKisiler[0].telefon1': '1. Yetkili Kişi - Telefon 1',
                'yetkiliKisiler[0].eposta1': '1. Yetkili Kişi - E-posta 1'
              };
              const fieldName = fieldNames[error.param] || error.param;
              return `${fieldName}: ${error.msg}`;
            }
            return error.msg || error.message || 'Bilinmeyen hata';
          });

          setValidationErrors(backendErrors);
          showSnackbar(`${backendErrors.length} alanda hata bulundu. Lütfen düzeltin.`, 'error');
        } else {
          // Genel backend error mesajı
          const errorMessage = errorData.message || 'Sunucu hatası oluştu';
          setValidationErrors([errorMessage]);
          showSnackbar('Hata: ' + errorMessage, 'error');
        }
      } else {
        const errorMessage = error.message || 'İnternet bağlantısı sorunu olabilir';
        setValidationErrors([errorMessage]);
        showSnackbar('Hata: ' + errorMessage, 'error');
      }
    }
  }, [validateForm, isEdit, updateFirma, id, formData, createFirma, showSnackbar, navigate]);

  // 🔙 Navigation
  const handleBack = useCallback(() => {
    clearFirma();
    clearError();
    clearSearchResults();
    navigate('/firmalar');
  }, [clearFirma, clearError, clearSearchResults, navigate]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      clearFirma();
      clearError();
      clearSearchResults();
    };
  }, [clearFirma, clearError, clearSearchResults]);

  // Helper to get districts for selected city - removed unused selectedIlceler

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
                <RemoveIcon />
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

                <Typography variant="body2" sx={{
                  color: '#64748b',
                  fontStyle: 'italic',
                  textAlign: 'center',
                  py: 2,
                  backgroundColor: '#f8fafc',
                  borderRadius: 2,
                  border: '1px dashed #cbd5e1'
                }}>
                  💡 Mevcut firma kontrolü için yukarıdaki "Vergi No/TC" veya "Tam Ünvan" alanlarını doldurup "🔍 Kayıt Arama" butonuna tıklayın.
                </Typography>

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
            {/* 📋 Form Header */}
            <CardHeader
              title={
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <Box sx={{ display: 'flex', alignItems: 'center' }}>
                    <Box sx={{
                      backgroundColor: '#3b82f6',
                      borderRadius: '8px',
                      p: 1,
                      mr: 2,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}>
                      <Typography sx={{ color: 'white', fontSize: '1.2rem' }}>
                        {isEdit ? '✏️' : '➕'}
                      </Typography>
                    </Box>
                    <Typography variant="h5" sx={{ fontWeight: 600, color: '#1e293b' }}>
                      {isEdit ? 'Firma Güncelle' : 'Yeni Firma Ekle'}
                    </Typography>
                  </Box>

                  {/* Form Tamamlanma Durumu */}
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Chip
                      label={
                        (() => {
                          const requiredFields = [
                            formData.vergiNoTC,
                            formData.tamUnvan,
                            formData.adres,
                            formData.firmaIl,
                            formData.ilkIrtibatKisi,
                            formData.yetkiliKisiler?.[0]?.adSoyad
                          ].filter(Boolean);

                          const totalRequired = 8;
                          const completed = requiredFields.length;
                          const percentage = Math.round((completed / totalRequired) * 100);

                          return `${completed}/${totalRequired} Zorunlu Alan (${percentage}%)`;
                        })()
                      }
                      color={
                        (() => {
                          const requiredFields = [
                            formData.vergiNoTC,
                            formData.tamUnvan,
                            formData.adres,
                            formData.firmaIl,
                            formData.ilkIrtibatKisi,
                            formData.yetkiliKisiler?.[0]?.adSoyad,
                            formData.yetkiliKisiler?.[0]?.telefon1,
                            formData.yetkiliKisiler?.[0]?.eposta1
                          ].filter(Boolean);

                          if (requiredFields.length === 6) return 'success';
                          if (requiredFields.length >= 4) return 'warning';
                          return 'error';
                        })()
                      }
                      size="small"
                      sx={{ fontWeight: 600 }}
                    />
                  </Box>
                </Box>
              }
              subheader={
                <Typography variant="body2" sx={{ color: '#64748b', mt: 1 }}>
                  📝 Firma bilgilerini eksiksiz doldurunuz. (*) ile işaretli alanlar zorunludur.
                  {validationErrors.length > 0 && (
                    <Typography component="span" sx={{ color: '#dc2626', fontWeight: 600, ml: 1 }}>
                      ⚠️ {validationErrors.length} alan düzeltilmeyi bekliyor.
                    </Typography>
                  )}
                </Typography>
              }
              sx={{ pb: 2 }}
            />
            <form onSubmit={handleSubmit}>
              <CardContent sx={{ p: 4 }}>
                {/* 🚨 Validation Errors - Kullanıcı Dostu Hata Gösterimi */}
                {validationErrors.length > 0 && (
                  <Paper
                    elevation={2}
                    sx={{
                      p: 2,
                      mb: 3,
                      backgroundColor: '#fef2f2',
                      border: '1px solid #fecaca',
                      borderRadius: 2
                    }}
                  >
                    <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                      <Box
                        sx={{
                          width: 20,
                          height: 20,
                          borderRadius: '50%',
                          backgroundColor: '#ef4444',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          mr: 1
                        }}
                      >
                        <Typography sx={{ color: 'white', fontSize: '12px', fontWeight: 'bold' }}>
                          !
                        </Typography>
                      </Box>
                      <Typography variant="subtitle2" sx={{ color: '#dc2626', fontWeight: 600 }}>
                        {validationErrors.length === 1
                          ? 'Düzeltilmesi gereken 1 alan var:'
                          : `Düzeltilmesi gereken ${validationErrors.length} alan var:`
                        }
                      </Typography>
                    </Box>

                    <Box component="ul" sx={{ m: 0, pl: 3, color: '#dc2626' }}>
                      {validationErrors.map((error, index) => (
                        <Box component="li" key={index} sx={{ mb: 0.5 }}>
                          <Typography variant="body2" sx={{ color: '#dc2626' }}>
                            {error}
                          </Typography>
                        </Box>
                      ))}
                    </Box>

                    <Typography variant="caption" sx={{ color: '#991b1b', mt: 1, display: 'block' }}>
                      💡 Lütfen yukarıdaki alanları kontrol edip gerekli düzeltmeleri yapın.
                    </Typography>
                  </Paper>
                )}

                {/* 📋 FORM SECTIONS - SINGLE PAGE LAYOUT */}

                {/* 🏢 Temel Firma Bilgileri */}
                <Box sx={{ mb: 4 }}>
                  <Typography variant="h5" sx={{
                    mb: 3,
                    fontWeight: 700,
                    color: '#1e40af',
                    fontSize: '1.3rem',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 1,
                    borderBottom: '2px solid #e5e7eb',
                    pb: 2
                  }}>
                    <Box sx={{
                      backgroundColor: '#3b82f6',
                      borderRadius: '8px',
                      p: 1,
                      mr: 2,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}>
                      <Typography sx={{ color: 'white', fontSize: '1.2rem' }}>
                        🏢
                      </Typography>
                    </Box>
                    Firma Ekle / Güncelle / Ara
                  </Typography>

                  <Grid container spacing={3}>
                    {/* İlk satır - Arama */}
                    <Grid item xs={12} md={4}>
                      <TextField
                        fullWidth
                        id="vergi-no-tc"
                        label="Vergi No/TC No *"
                        name="vergiNoTC"
                        value={formData.vergiNoTC}
                        onChange={handleBasicFieldChange('vergiNoTC')}
                        placeholder="10 haneli Vergi No veya 11 haneli TC No"
                        helperText={
                          formData.vergiNoTC && !formData.vergiNoTC.match(/^\d{10}$|^\d{11}$/)
                            ? "❌ Vergi No (10 hane) veya TC No (11 hane) formatında olmalıdır"
                            : formData.vergiNoTC && formData.vergiNoTC.match(/^\d{10}$|^\d{11}$/)
                              ? "✅ Format geçerli"
                              : "Sadece rakam giriniz (örn: 1234567890)"
                        }
                        error={Boolean(formData.vergiNoTC && !formData.vergiNoTC.match(/^\d{10}$|^\d{11}$/))}
                        InputProps={{
                          startAdornment: (
                            <InputAdornment position="start">
                              <Box sx={{
                                color: formData.vergiNoTC && formData.vergiNoTC.match(/^\d{10}$|^\d{11}$/)
                                  ? 'success.main'
                                  : 'text.secondary'
                              }}>
                                🏢
                              </Box>
                            </InputAdornment>
                          ),
                        }}
                        sx={{
                          '& .MuiFormHelperText-root': {
                            color: formData.vergiNoTC && formData.vergiNoTC.match(/^\d{10}$|^\d{11}$/)
                              ? 'success.main'
                              : formData.vergiNoTC && !formData.vergiNoTC.match(/^\d{10}$|^\d{11}$/)
                                ? 'error.main'
                                : 'text.secondary'
                          },
                          '& .MuiOutlinedInput-root': {
                            '&.Mui-error': {
                              backgroundColor: '#fef2f2',
                              '& fieldset': { borderColor: '#ef4444', borderWidth: 2 }
                            }
                          }
                        }}
                      />
                    </Grid>

                    <Grid item xs={12} md={8}>
                      <TextField
                        fullWidth
                        id="tam-unvan"
                        label="Tam Ünvan *"
                        name="tamUnvan"
                        value={formData.tamUnvan}
                        onChange={handleBasicFieldChange('tamUnvan')}
                        placeholder="Şirket tam ünvanını giriniz..."
                        helperText={
                          formData.tamUnvan && formData.tamUnvan.length < 3
                            ? "❌ En az 3 karakter olmalıdır"
                            : formData.tamUnvan && formData.tamUnvan.length > 500
                              ? "❌ 500 karakterden fazla olamaz"
                              : formData.tamUnvan && formData.tamUnvan.length >= 3
                                ? `✅ Geçerli (${formData.tamUnvan.length}/500 karakter)`
                                : "Şirketin resmi ünvanını tam olarak giriniz"
                        }
                        error={Boolean(
                          (formData.tamUnvan && formData.tamUnvan.length < 3) ||
                          (formData.tamUnvan && formData.tamUnvan.length > 500)
                        )}
                        InputProps={{
                          startAdornment: (
                            <InputAdornment position="start">
                              <Box sx={{
                                color: formData.tamUnvan && formData.tamUnvan.length >= 3 && formData.tamUnvan.length <= 500
                                  ? 'success.main'
                                  : 'text.secondary'
                              }}>
                                🏛️
                              </Box>
                            </InputAdornment>
                          ),
                        }}
                        sx={{
                          '& .MuiFormHelperText-root': {
                            color: formData.tamUnvan && formData.tamUnvan.length >= 3 && formData.tamUnvan.length <= 500
                              ? 'success.main'
                              : formData.tamUnvan && (formData.tamUnvan.length < 3 || formData.tamUnvan.length > 500)
                                ? 'error.main'
                                : 'text.secondary'
                          },
                          '& .MuiOutlinedInput-root': {
                            '&.Mui-error': {
                              backgroundColor: '#fef2f2',
                              '& fieldset': { borderColor: '#ef4444', borderWidth: 2 }
                            }
                          }
                        }}
                      />
                    </Grid>

                    <Grid item xs={12} md={4}>
                      <Button
                        fullWidth
                        variant="contained"
                        size="large"
                        onClick={handleSearch}
                        disabled={loading || (!formData.vergiNoTC && !formData.tamUnvan)}
                        startIcon={loading ? <CircularProgress size={20} /> : <SearchIcon />}
                        sx={{
                          height: '56px',
                          fontSize: '1rem',
                          fontWeight: 600,
                          background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
                          '&:hover': {
                            background: 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)',
                          }
                        }}
                      >
                        🔍 Kayıt Arama
                      </Button>
                    </Grid>

                    {/* İkinci satır */}
                    <Grid item xs={12} md={6}>
                      <MemoizedTextField
                        fullWidth
                        id="firma-id"
                        name="firmaId"
                        size="medium"
                        label="Firma ID"
                        value={formData.firmaId}
                        InputProps={{ readOnly: true }}
                        sx={{
                          backgroundColor: '#f1f5f9',
                          '& .MuiInputBase-input': { fontWeight: 600 }
                        }}
                      />
                    </Grid>

                    <Grid item xs={12} md={6} />

                    {/* Üçüncü satır - Adres */}
                    <Grid item xs={12}>
                      <TextField
                        fullWidth
                        id="adres"
                        name="adres"
                        label="Adres *"
                        value={formData.adres}
                        onChange={handleBasicFieldChange('adres')}
                        required
                        multiline
                        rows={3}
                        placeholder="Tam adres bilgisi..."
                        error={Boolean(!formData.adres || formData.adres.length < 10)}
                        helperText={
                          !formData.adres
                            ? "❌ Adres zorunludur"
                            : formData.adres.length < 10
                              ? "❌ En az 10 karakter olmalıdır"
                              : `✅ Geçerli (${formData.adres.length} karakter)`
                        }
                        sx={{
                          '& .MuiFormHelperText-root': {
                            color: formData.adres && formData.adres.length >= 10
                              ? 'success.main'
                              : 'error.main'
                          },
                          '& .MuiOutlinedInput-root': {
                            '&.Mui-error': {
                              backgroundColor: '#fef2f2',
                              '& fieldset': { borderColor: '#ef4444', borderWidth: 2 }
                            }
                          }
                        }}
                      />
                    </Grid>

                    {/* Dördüncü satır */}
                    <Grid item xs={12} md={8}>
                      <EnhancedCitySelector
                        selectedCity={formData.firmaIl}
                        selectedDistrict={formData.firmaIlce}
                        onCityChange={(city, cityCode) => {
                          setFormData(prev => ({
                            ...prev,
                            firmaIl: city,
                            ilKod: cityCode || '',
                            firmaIlce: '', // İl değiştiğinde ilçeyi sıfırla
                            ilceKod: ''
                          }));
                        }}
                        onDistrictChange={(district, districtCode) => {
                          setFormData(prev => ({
                            ...prev,
                            firmaIlce: district,
                            ilceKod: districtCode || ''
                          }));
                        }}
                        required={true}
                        showCodes={true}
                      />
                    </Grid>

                    <Grid item xs={12} md={4}>
                      <MemoizedTextField
                        fullWidth
                        id="kep-adresi"
                        name="kepAdresi"
                        size="medium"
                        label="KEP Adresi"
                        type="email"
                        value={formData.kepAdresi}
                        onChange={handleBasicFieldChange('kepAdresi')}
                        placeholder="ornek@hs01.kep.tr"
                      />
                    </Grid>

                    {/* Beşinci satır */}
                    <Grid item xs={12} md={4}>
                      <FormControlLabel
                        control={
                          <Switch
                            id="yabanci-sermayeli"
                            name="yabanciSermayeli"
                            checked={Boolean(formData.yabanciSermayeli)}
                            onChange={handleBasicFieldChange('yabanciSermayeli')}
                            size="medium"
                            color="primary"
                          />
                        }
                        label="Yabancı Sermayeli mi?"
                        sx={{
                          '& .MuiFormControlLabel-label': {
                            fontSize: '1rem',
                            fontWeight: 500
                          }
                        }}
                      />
                    </Grid>

                    <Grid item xs={12} md={4}>
                      <FormControlLabel
                        control={
                          <Switch
                            id="aktif-durum"
                            name="aktif"
                            checked={formData.aktif !== false}
                            onChange={handleBasicFieldChange('aktif')}
                            size="medium"
                            color="success"
                          />
                        }
                        label={
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <Typography sx={{ fontSize: '1rem', fontWeight: 500 }}>
                              Firma Durumu
                            </Typography>
                            <Chip
                              label={formData.aktif !== false ? 'Aktif' : 'Pasif'}
                              size="small"
                              sx={{
                                fontWeight: 700,
                                backgroundColor: formData.aktif !== false ? '#dcfce7' : '#f1f5f9',
                                color: formData.aktif !== false ? '#16a34a' : '#64748b',
                                border: `1px solid ${formData.aktif !== false ? '#86efac' : '#cbd5e1'}`
                              }}
                            />
                          </Box>
                        }
                      />
                    </Grid>

                    <Grid item xs={12} md={4}>
                      <ActivitySelector
                        value={formData.anaFaaliyetKonusu}
                        onChange={(value) => setFormData(prev => ({ ...prev, anaFaaliyetKonusu: value }))}
                        required
                        error={Boolean(!formData.anaFaaliyetKonusu)}
                        helperText={
                          !formData.anaFaaliyetKonusu
                            ? "❌ Ana faaliyet konusu seçilmelidir"
                            : "✅ Seçildi"
                        }
                      />
                    </Grid>

                  </Grid>
                </Box>

                {/* 📋 FORM SECTIONS - SINGLE PAGE LAYOUT */}

                {/* 🏢 İletişim & Lokasyon */}
                <Box sx={{ mt: 4, mb: 4 }}>
                  <Typography variant="h5" sx={{
                    mb: 3,
                    fontWeight: 700,
                    color: '#1e40af',
                    fontSize: '1.3rem',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 1,
                    borderBottom: '2px solid #e5e7eb',
                    pb: 2
                  }}>
                    <ContactIcon sx={{ fontSize: 28 }} /> İletişim & Lokasyon
                  </Typography>

                  <Grid container spacing={3}>
                    <Grid item xs={12} md={6}>
                      <MemoizedTextField
                        fullWidth
                        id="firma-telefonu"
                        name="firmaTelefon"
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
                        id="firma-email"
                        name="firmaEmail"
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
                        id="firma-website"
                        name="firmaWebsite"
                        size="medium"
                        label="Website"
                        value={formData.firmaWebsite}
                        onChange={handleBasicFieldChange('firmaWebsite')}
                        placeholder="https://www.firma.com"
                      />
                    </Grid>

                    <Grid item xs={12} md={6}>
                      <TextField
                        select
                        fullWidth
                        id="ilk-irtibat-kisi"
                        name="ilkIrtibatKisi"
                        label="İlk İrtibat Kişisi *"
                        value={formData.ilkIrtibatKisi || ''}
                        onChange={handleBasicFieldChange('ilkIrtibatKisi')}
                        required
                        error={Boolean(!formData.ilkIrtibatKisi)}
                        helperText={
                          !formData.ilkIrtibatKisi
                            ? "❌ İrtibat kişisi seçilmelidir"
                            : "✅ Seçildi"
                        }
                        sx={{
                          '& .MuiFormHelperText-root': {
                            color: formData.ilkIrtibatKisi ? 'success.main' : 'error.main'
                          },
                          '& .MuiOutlinedInput-root': {
                            '&.Mui-error': {
                              backgroundColor: '#fef2f2',
                              '& fieldset': { borderColor: '#ef4444', borderWidth: 2 }
                            }
                          }
                        }}
                      >
                        <MenuItem value="">
                          <em>İrtibat Kişisi Seçiniz</em>
                        </MenuItem>
                        {[
                          { name: 'Merve Koç', email: 'merve@gmplanlama.com' },
                          { name: 'Selin Nergiz', email: 'selin@gmplanlama.com' },
                          { name: 'Seda Durak', email: 'seda@gmplanlama.com' },
                          { name: 'Ayşegül Gezer', email: 'aysegul@gmplanlama.com' },
                          { name: 'Hüseyin Cahit Ağır', email: 'cahit@gmplanlama.com' }
                        ].map((person) => (
                          <MenuItem key={person.email} value={`${person.name} - ${person.email}`}>
                            {person.name} - {person.email}
                          </MenuItem>
                        ))}
                      </TextField>
                    </Grid>

                    {/* ETUYS ve DYS Yetki Bitiş Tarihleri yan yana */}
                    <Grid item xs={12} md={6}>
                      <MemoizedTextField
                        fullWidth
                        id="etuys-yetki-bitis-tarihi"
                        name="etuysYetkiBitisTarihi"
                        size="medium"
                        label="ETUYS Yetki Bitiş Tarihi"
                        type="date"
                        value={formData.etuysYetkiBitisTarihi}
                        onChange={handleBasicFieldChange('etuysYetkiBitisTarihi')}
                        InputLabelProps={{ shrink: true }}
                        inputProps={{ onPaste: createFormDatePasteHandler(setFormData, 'etuysYetkiBitisTarihi') }}
                      />
                    </Grid>

                    <Grid item xs={12} md={6}>
                      <MemoizedTextField
                        fullWidth
                        id="dys-yetki-bitis-tarihi"
                        name="dysYetkiBitisTarihi"
                        size="medium"
                        label="DYS Yetki Bitiş Tarihi"
                        type="date"
                        value={formData.dysYetkiBitisTarihi}
                        onChange={handleBasicFieldChange('dysYetkiBitisTarihi')}
                        InputLabelProps={{ shrink: true }}
                        inputProps={{ onPaste: createFormDatePasteHandler(setFormData, 'dysYetkiBitisTarihi') }}
                      />
                    </Grid>
                  </Grid>
                </Box>

                {/* 📋 FORM SECTIONS - SINGLE PAGE LAYOUT */}

                {/* 👥 Yetkili Kişiler */}
                <Box sx={{ mt: 4, mb: 4 }}>
                  <Typography variant="h5" sx={{
                    mb: 3,
                    fontWeight: 700,
                    color: '#1e40af',
                    fontSize: '1.3rem',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 1,
                    borderBottom: '2px solid #e5e7eb',
                    pb: 2
                  }}>
                    <PersonIcon sx={{ fontSize: 28 }} /> Yetkili Kişiler
                  </Typography>

                  <Box sx={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    mb: 3
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
                      Ana Yetkili Kişi
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
                      id="notlar"
                      name="notlar"
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

                {/* 🎯 Action Buttons - Excel Style */}
                {/* 💾 Submit Buttons */}
                <Box sx={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  mt: 4,
                  pt: 3,
                  borderTop: '2px solid #f1f5f9'
                }}>
                  <Button
                    variant="outlined"
                    size="large"
                    onClick={handleBack}
                    disabled={loading}
                    sx={{
                      px: 4,
                      py: 1.5,
                      fontWeight: 600,
                      borderWidth: 2,
                      '&:hover': { borderWidth: 2 }
                    }}
                  >
                    ← Geri Dön
                  </Button>

                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                    {/* Form Durumu Chip'i */}
                    <Chip
                      label={
                        (() => {
                          const requiredFieldsData = [
                            { value: formData.vergiNoTC, name: 'Vergi No/TC' },
                            { value: formData.tamUnvan, name: 'Tam Ünvan' },
                            { value: formData.adres, name: 'Adres' },
                            { value: formData.firmaIl, name: 'İl' },
                            { value: formData.ilkIrtibatKisi, name: 'İlk İrtibat Kişisi' },
                            { value: formData.yetkiliKisiler?.[0]?.adSoyad, name: 'Yetkili Ad Soyad' }
                          ];

                          const filledFields = requiredFieldsData.filter(field => field.value);
                          const emptyFields = requiredFieldsData.filter(field => !field.value);

                          const isComplete = filledFields.length === 6;
                          const hasValidationErrors = validationErrors.length > 0;

                          if (hasValidationErrors) return '❌ Hatalar var';
                          if (isComplete) return '✅ Form hazır';

                          const emptyFieldNames = emptyFields.map(field => field.name).slice(0, 2).join(', ');
                          const remainingCount = emptyFields.length - 2;

                          if (emptyFields.length <= 2) {
                            return `⏳ Eksik: ${emptyFieldNames}`;
                          } else {
                            return `⏳ Eksik: ${emptyFieldNames} +${remainingCount} alan`;
                          }
                        })()
                      }
                      color={
                        (() => {
                          const requiredFields = [
                            formData.vergiNoTC,
                            formData.tamUnvan,
                            formData.adres,
                            formData.firmaIl,
                            formData.ilkIrtibatKisi,
                            formData.yetkiliKisiler?.[0]?.adSoyad
                          ].filter(Boolean);

                          if (validationErrors.length > 0) return 'error';
                          if (requiredFields.length === 6) return 'success';
                          return 'warning';
                        })()
                      }
                      size="medium"
                      sx={{ fontWeight: 600, maxWidth: '300px' }}
                    />

                    <Button
                      type="submit"
                      variant="contained"
                      size="large"
                      disabled={
                        loading ||
                        validationErrors.length > 0 ||
                        !formData.vergiNoTC ||
                        !formData.tamUnvan ||
                        !formData.adres ||
                        !formData.firmaIl ||
                        !formData.ilkIrtibatKisi ||
                        !formData.yetkiliKisiler?.[0]?.adSoyad
                      }
                      startIcon={
                        loading ? (
                          <CircularProgress size={20} color="inherit" />
                        ) : isEdit ? (
                          <Typography>💾</Typography>
                        ) : (
                          <Typography>✅</Typography>
                        )
                      }
                      sx={{
                        px: 4,
                        py: 1.5,
                        fontSize: '1.1rem',
                        fontWeight: 600,
                        background: loading
                          ? 'linear-gradient(135deg, #94a3b8 0%, #64748b 100%)'
                          : 'linear-gradient(135deg, #059669 0%, #047857 100%)',
                        '&:hover': {
                          background: loading
                            ? 'linear-gradient(135deg, #94a3b8 0%, #64748b 100%)'
                            : 'linear-gradient(135deg, #047857 0%, #065f46 100%)',
                        },
                        '&:disabled': {
                          background: 'linear-gradient(135deg, #d1d5db 0%, #9ca3af 100%)',
                          color: '#6b7280'
                        }
                      }}
                    >
                      {loading
                        ? 'İşleniyor...'
                        : isEdit
                          ? 'Firma Güncelle'
                          : 'Firma Kaydet'
                      }
                    </Button>
                  </Box>
                </Box>
              </CardContent>
            </form>
          </Card>

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
        </Container>
      </Box>
    </Box>
  );
};

export default FirmaForm;