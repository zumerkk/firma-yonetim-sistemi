// 🌟 ULTRA-PROFESSIONAL ENTERPRISE FIRMA FORM - WORLD-CLASS DESIGN
// Modern çok adımlı firma ekleme/düzenleme formu
// Enterprise-level professional design with advanced glassmorphism & real-time features

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Grid,
  TextField,
  Button,
  Stepper,
  Step,
  StepLabel,
  FormControlLabel,
  Switch,
  Alert,
  Divider,
  Chip,
  LinearProgress,
  Paper,
  Stack,
  Autocomplete,
  Avatar,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Slide,
  Fade,
  Zoom,
  Skeleton,
  Tooltip,
  Badge,
  Accordion,
  AccordionSummary,
  AccordionDetails
} from '@mui/material';
import {
  Business as BusinessIcon,
  Person as PersonIcon,
  LocationOn as LocationIcon,
  Email as EmailIcon,
  Phone as PhoneIcon,
  Save as SaveIcon,
  ArrowBack as BackIcon,
  ArrowForward as ForwardIcon,
  Check as CheckIcon,
  Warning as WarningIcon,
  Cancel as CancelIcon,
  AutoMode as AutoSaveIcon,
  CloudDone as CloudIcon,
  Search as SearchIcon,
  Clear as ClearIcon,
  Add as AddIcon,
  CheckCircle as CheckCircleIcon,
  Error as ErrorIcon,
  Info as InfoIcon,
  Speed as SpeedIcon,
  Security as SecurityIcon,
  Verified as VerifiedIcon,
  TrendingUp as TrendingUpIcon,
  Psychology as AIIcon,
  AutoAwesome as MagicIcon,
  ExpandMore as ExpandMoreIcon
} from '@mui/icons-material';
import { useNavigate, useParams } from 'react-router-dom';
import { useFirma } from '../../contexts/FirmaContext';

// 🎨 PREMIUM ANIMATED BACKGROUND COMPONENT
const AnimatedBackground = () => (
  <Box
    sx={{
      position: 'fixed',
      top: 0,
      left: 0,
      width: '100%',
      height: '100%',
      zIndex: -1,
      background: `
        radial-gradient(circle at 20% 50%, rgba(120, 119, 198, 0.3) 0%, transparent 50%),
        radial-gradient(circle at 80% 20%, rgba(255, 119, 198, 0.3) 0%, transparent 50%),
        radial-gradient(circle at 40% 80%, rgba(119, 198, 255, 0.3) 0%, transparent 50%),
        linear-gradient(135deg, #667eea 0%, #764ba2 100%)
      `,
      '&::before': {
        content: '""',
        position: 'absolute',
        width: '100%',
        height: '100%',
        background: `
          url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.03'%3E%3Ccircle cx='30' cy='30' r='1'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")
        `,
        animation: 'float 6s ease-in-out infinite'
      },
      '@keyframes float': {
        '0%, 100%': { transform: 'translateY(0px)' },
        '50%': { transform: 'translateY(-20px)' }
      }
    }}
  />
);

// 🌟 PREMIUM STEPPER ICON COMPONENT WITH ANIMATIONS
const UltraProfessionalStepIcon = (props) => {
  const { active, completed, icon } = props;
  
  const icons = {
    1: <BusinessIcon sx={{ fontSize: 32 }} />,
    2: <LocationIcon sx={{ fontSize: 32 }} />,
    3: <PersonIcon sx={{ fontSize: 32 }} />,
    4: <VerifiedIcon sx={{ fontSize: 32 }} />
  };

  return (
    <Zoom in timeout={500}>
      <Badge
        badgeContent={completed ? <CheckCircleIcon sx={{ fontSize: 16, color: '#4caf50' }} /> : null}
        anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
      >
        <Avatar
          sx={{
            width: 80,
            height: 80,
            background: completed 
              ? 'linear-gradient(135deg, #4caf50 0%, #2e7d32 100%)'
              : active 
              ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
              : 'linear-gradient(135deg, #f5f5f5 0%, #e0e0e0 100%)',
            color: completed || active ? 'white' : '#9e9e9e',
            boxShadow: completed || active 
              ? '0 12px 40px rgba(0,0,0,0.2), 0 0 20px rgba(102, 126, 234, 0.3)' 
              : '0 8px 20px rgba(0,0,0,0.1)',
            transition: 'all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
            transform: active ? 'scale(1.15)' : completed ? 'scale(1.05)' : 'scale(1)',
            border: '4px solid',
            borderColor: completed 
              ? '#4caf50'
              : active 
              ? '#667eea'
              : '#e0e0e0',
            position: 'relative',
            '&::before': {
              content: '""',
              position: 'absolute',
              top: -4,
              left: -4,
              right: -4,
              bottom: -4,
              borderRadius: '50%',
              background: completed || active 
                ? 'linear-gradient(45deg, transparent, rgba(255,255,255,0.3), transparent)'
                : 'none',
              animation: active ? 'rotate 2s linear infinite' : 'none'
            }
          }}
        >
          {completed ? <CheckIcon sx={{ fontSize: 36 }} /> : icons[icon]}
        </Avatar>
      </Badge>
    </Zoom>
  );
};

// 🔥 REAL-TIME VALIDATION COMPONENT
const RealTimeValidation = ({ field, value, isValid, isChecking, suggestions = [] }) => {
  if (isChecking) {
    return (
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 1 }}>
        <Skeleton variant="circular" width={16} height={16} />
        <Typography variant="caption" color="text.secondary">
          Kontrol ediliyor...
        </Typography>
      </Box>
    );
  }

  if (!value) return null;

  return (
    <Fade in>
      <Box sx={{ mt: 1 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          {isValid ? (
            <CheckCircleIcon sx={{ fontSize: 16, color: 'success.main' }} />
          ) : (
            <ErrorIcon sx={{ fontSize: 16, color: 'error.main' }} />
          )}
          <Typography 
            variant="caption" 
            color={isValid ? 'success.main' : 'error.main'}
            sx={{ fontWeight: 600 }}
          >
            {isValid ? 'Geçerli' : 'Kontrol gerekli'}
          </Typography>
        </Box>
        
        {suggestions.length > 0 && (
          <Box sx={{ mt: 1 }}>
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5 }}>
              💡 Öneriler:
            </Typography>
            {suggestions.slice(0, 3).map((suggestion, index) => (
              <Chip
                key={index}
                label={suggestion}
                size="small"
                variant="outlined"
                sx={{ mr: 0.5, mb: 0.5, fontSize: '0.7rem' }}
                color="info"
              />
            ))}
          </Box>
        )}
      </Box>
    </Fade>
  );
};

// 🎯 SMART FIELD COMPONENT WITH ADVANCED FEATURES
const SmartField = ({ 
  label, 
  value, 
  onChange, 
  onBlur,
  type = 'text',
  placeholder,
  required = false,
  error,
  helperText,
  suggestions = [],
  validationState = null,
  isChecking = false,
  startIcon,
  endIcon,
  multiline = false,
  rows = 1,
  ...props 
}) => {
  const [focused, setFocused] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);

  return (
    <Box>
      <TextField
        fullWidth
        label={label}
        value={value}
        onChange={onChange}
        onBlur={(e) => {
          setFocused(false);
          onBlur && onBlur(e);
        }}
        onFocus={() => setFocused(true)}
        type={type}
        placeholder={placeholder}
        required={required}
        error={!!error}
        helperText={error || helperText}
        multiline={multiline}
        rows={rows}
        InputProps={{
          startAdornment: startIcon,
          endAdornment: endIcon || (isChecking && (
            <Box sx={{ display: 'flex', alignItems: 'center' }}>
              <Skeleton variant="circular" width={20} height={20} />
            </Box>
          )),
          sx: {
            transition: 'all 0.3s ease',
            '&:hover': {
              boxShadow: '0 4px 20px rgba(0,0,0,0.1)'
            },
            '&.Mui-focused': {
              boxShadow: '0 8px 30px rgba(102, 126, 234, 0.2)'
            }
          }
        }}
        sx={{
          '& .MuiOutlinedInput-root': {
            borderRadius: 3,
            backgroundColor: focused ? 'rgba(255,255,255,0.9)' : 'rgba(255,255,255,0.7)',
            backdropFilter: 'blur(10px)',
            transition: 'all 0.3s ease',
            '&:hover': {
              backgroundColor: 'rgba(255,255,255,0.85)'
            },
            '&.Mui-focused': {
              backgroundColor: 'rgba(255,255,255,0.95)',
              borderColor: validationState === 'valid' ? '#4caf50' : undefined
            }
          },
          '& .MuiInputLabel-root': {
            fontWeight: 600,
            color: focused ? 'primary.main' : 'text.secondary'
          }
        }}
        {...props}
      />
      
      <RealTimeValidation
        field={label}
        value={value}
        isValid={validationState === 'valid'}
        isChecking={isChecking}
        suggestions={suggestions}
      />
    </Box>
  );
};

const FirmaForm = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const { createFirma, updateFirma, fetchFirma, loading, searchFirmalar } = useFirma();
  const isEdit = Boolean(id);

  // 🎯 Advanced State Management
  const [activeStep, setActiveStep] = useState(0);
  const [completed, setCompleted] = useState({});
  const [smartMode, setSmartMode] = useState(true);
  const [autoSaveEnabled, setAutoSaveEnabled] = useState(true);
  const [lastSaved, setLastSaved] = useState(null);

  // 📝 Form State - Excel sütunlarına bire bir uygun
  const [formData, setFormData] = useState({
    // Temel Bilgiler (Excel sütun 1-9)
    firmaId: '', // Otomatik oluşturulacak
    vergiNoTC: '',
    tamUnvan: '',
    adres: '',
    firmaIl: '',
    firmaIlce: '',
    kepAdresi: '',
    yabanciIsareti: false, // Yabancı Sermaye
    anaFaaliyetKonusu: '',
    
    // Yetkili Kişi 1 (Excel sütun 10-14)
    yetkiliKisi1: {
      adSoyad: '',
      tel1: '',
      tel2: '',
      mail1: '',
      mail2: ''
    },
    
    // Yetkili Kişi 2 (Excel sütun 15-19)
    yetkiliKisi2: {
      adSoyad: '',
      tel1: '',
      tel2: '',
      mail1: '',
      mail2: ''
    },
    
    // Ek Bilgiler (Excel sütun 20-22)
    ilkIrtibatKisi: '',
    etuysYetkiBitis: '', // ETUYS Yetki Bitiş
    dysYetkiBitis: ''    // DYS Yetki Bitiş
  });

  // 🚨 Hata State'i
  const [errors, setErrors] = useState({});
  
  // 🔄 Form durumları
  const [formStatus, setFormStatus] = useState({
    isValidating: false,
    isDuplicateChecking: false,
    isSaving: false,
    autoSaveEnabled: true,
    lastSaved: null
  });
  
  // ✅ Gerçek zamanlı validasyon sonuçları
  const [validationResults, setValidationResults] = useState({
    firmaIdAvailable: null,
    vergiNoAvailable: null,
    tamUnvanSimilar: []
  });

  // 🆔 Otomatik Firma ID oluşturma
  const generateNextFirmaId = useCallback(async () => {
    try {
      // Axios ile doğru API endpoint'ini kullan
      const response = await fetch('http://localhost:5001/api/firmalar?limit=1&siralamaSekli=firmaId&siralamaYonu=desc', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`, // Auth token ekle
        }
      });
      
      const data = await response.json();
      console.log('🔍 API Response:', data);
      
      if (data.success && data.data && data.data.firmalar && data.data.firmalar.length > 0) {
        const lastFirma = data.data.firmalar[0];
        const lastId = lastFirma.firmaId;
        console.log('📋 Son Firma ID:', lastId);
        
        // A001185 formatındaki ID'den sayıyı çıkar ve 1 artır
        const numberPart = parseInt(lastId.replace('A', ''));
        const nextNumber = numberPart + 1;
        const nextId = `A${nextNumber.toString().padStart(6, '0')}`;
        
        console.log('🆕 Yeni Firma ID:', nextId);
        return nextId;
      } else {
        // İlk firma ise A000001'den başla
        console.log('🏁 İlk firma - A000001 atanıyor');
        return 'A000001';
      }
    } catch (error) {
      console.error('🚨 Firma ID oluşturma hatası:', error);
      // Hata durumunda güvenli fallback - son bilinen ID'den devam et
      return 'A001186'; // A001185'ten sonraki ID
    }
  }, []);

  // 🚀 Component mount - Yeni firma için otomatik ID oluştur ve draft yükle
  useEffect(() => {
    if (!isEdit) {
      // 📋 Draft'tan yükle
      const draft = localStorage.getItem('firma_draft');
      if (draft) {
        try {
          const draftData = JSON.parse(draft);
          if (draftData.tamUnvan) {
            setFormData(draftData);
            return;
          }
        } catch (error) {
          console.error('Draft yükleme hatası:', error);
        }
      }
      
      // 🆔 Otomatik ID oluştur
      if (!formData.firmaId) {
        generateNextFirmaId().then(newId => {
          setFormData(prev => ({
            ...prev,
            firmaId: newId
          }));
        });
      }
    }
  }, [isEdit, formData.firmaId, generateNextFirmaId]);

  // 🔍 Gerçek zamanlı duplicate check
  const checkDuplicate = useCallback(async (field, value) => {
    if (!value || value.length < 3) return;
    
    setFormStatus(prev => ({ ...prev, isDuplicateChecking: true }));
    
    try {
      const response = await fetch(`http://localhost:5001/api/firmalar/search?q=${encodeURIComponent(value)}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      const data = await response.json();
      
      if (data.success && data.data.length > 0) {
        const matches = data.data.filter(firma => {
          if (field === 'vergiNoTC') return firma.vergiNoTC === value;
          if (field === 'tamUnvan') return firma.tamUnvan.toLowerCase().includes(value.toLowerCase());
          return false;
        });
        
        setValidationResults(prev => ({
          ...prev,
          [`${field}Available`]: matches.length === 0,
          [`${field}Similar`]: matches
        }));
      }
    } catch (error) {
      console.error('Duplicate check error:', error);
    } finally {
      setFormStatus(prev => ({ ...prev, isDuplicateChecking: false }));
    }
  }, []);

  // 💾 Otomatik kaydetme (draft olarak)
  const autoSave = useCallback(async () => {
    if (!formStatus.autoSaveEnabled || !formData.tamUnvan) return;
    
    try {
      const draftData = { ...formData, isDraft: true };
      localStorage.setItem('firma_draft', JSON.stringify(draftData));
      setFormStatus(prev => ({ 
        ...prev, 
        lastSaved: new Date().toLocaleTimeString() 
      }));
    } catch (error) {
      console.error('Auto save error:', error);
    }
  }, [formData, formStatus.autoSaveEnabled]);

  // 📋 Stepper adımları
  const steps = [
    {
      label: 'Temel Bilgiler',
      icon: 1,
      description: 'Firma kimlik bilgileri',
      fields: ['firmaId', 'vergiNoTC', 'tamUnvan', 'anaFaaliyetKonusu']
    },
    {
      label: 'İletişim Bilgileri',
      icon: 2,
      description: 'Adres ve iletişim',
      fields: ['adres', 'firmaIl', 'firmaIlce', 'kepAdresi']
    },
    {
      label: 'Yetkili Kişiler',
      icon: 3,
      description: 'Yetkili kişi bilgileri',
      fields: ['yetkiliKisi1', 'yetkiliKisi2', 'ilkIrtibatKisi']
    },
    {
      label: 'Önizleme',
      icon: 4,
      description: 'Bilgileri kontrol edin',
      fields: []
    }
  ];

  // 🏢 Türk illeri
  const turkishCities = [
    'ADANA', 'ADIYAMAN', 'AFYONKARAHİSAR', 'AĞRI', 'AMASYA', 'ANKARA', 'ANTALYA',
    'ARTVİN', 'AYDIN', 'BALIKESİR', 'BİLECİK', 'BİNGÖL', 'BİTLİS', 'BOLU',
    'BURDUR', 'BURSA', 'ÇANAKKALE', 'ÇANKIRI', 'ÇORUM', 'DENİZLİ', 'DİYARBAKIR',
    'EDİRNE', 'ELAZIĞ', 'ERZİNCAN', 'ERZURUM', 'ESKİŞEHİR', 'GAZİANTEP',
    'GİRESUN', 'GÜMÜŞHANE', 'HAKKARİ', 'HATAY', 'ISPARTA', 'MERSİN',
    'İSTANBUL', 'İZMİR', 'KARS', 'KASTAMONU', 'KAYSERİ', 'KIRKLARELİ',
    'KIRŞEHİR', 'KOCAELİ', 'KONYA', 'KÜTAHYA', 'MALATYA', 'MANİSA',
    'KAHRAMANMARAŞ', 'MARDİN', 'MUĞLA', 'MUŞ', 'NEVŞEHİR', 'NİĞDE',
    'ORDU', 'RİZE', 'SAKARYA', 'SAMSUN', 'SİİRT', 'SİNOP', 'SİVAS',
    'TEKİRDAĞ', 'TOKAT', 'TRABZON', 'TUNCELİ', 'ŞANLIURFA', 'UŞAK',
    'VAN', 'YOZGAT', 'ZONGULDAK', 'AKSARAY', 'BAYBURT', 'KARAMAN',
    'KIRIKKALE', 'BATMAN', 'ŞIRNAK', 'BARTIN', 'ARDAHAN', 'IĞDIR',
    'YALOVA', 'KARABÜK', 'KİLİS', 'OSMANİYE', 'DÜZCE'
  ];

  // 📋 Firma verilerini yükle (düzenleme için)
  const loadFirma = useCallback(async () => {
    try {
      const result = await fetchFirma(id);
      if (result.success) {
        setFormData(result.data.firma);
      }
    } catch (error) {
      console.error('Firma yüklenemedi:', error);
    }
  }, [id, fetchFirma]);

  // 🚀 Component mount
  useEffect(() => {
    if (isEdit) {
      loadFirma();
    }
  }, [id, isEdit, loadFirma]);

  // 📝 Form validation
  const validateStep = (step) => {
    const newErrors = {};

    switch (step) {
      case 0: // Temel Bilgiler
        if (!formData.firmaId.trim()) newErrors.firmaId = 'Firma ID zorunludur';
        if (!formData.tamUnvan.trim()) newErrors.tamUnvan = 'Tam ünvan zorunludur';
        if (formData.vergiNoTC && !/^\d{10,11}$/.test(formData.vergiNoTC)) {
          newErrors.vergiNoTC = 'Vergi No 10-11 haneli olmalıdır';
        }
        break;

      case 1: // İletişim Bilgileri
        if (!formData.firmaIl.trim()) newErrors.firmaIl = 'İl zorunludur';
        if (formData.kepAdresi && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.kepAdresi)) {
          newErrors.kepAdresi = 'Geçerli bir KEP adresi giriniz';
        }
        break;

      case 2: // Yetkili Kişiler
        // Yetkili Kişi 1 validasyonu
        if (formData.yetkiliKisi1.adSoyad && formData.yetkiliKisi1.tel1) {
          if (!/^[\d\s+\-()]+$/.test(formData.yetkiliKisi1.tel1)) {
            newErrors.yetkili1_tel1 = 'Geçerli telefon numarası giriniz';
          }
        }
        if (formData.yetkiliKisi1.mail1 && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.yetkiliKisi1.mail1)) {
          newErrors.yetkili1_mail1 = 'Geçerli e-posta adresi giriniz';
        }
        
        // Yetkili Kişi 2 validasyonu
        if (formData.yetkiliKisi2.adSoyad && formData.yetkiliKisi2.tel1) {
          if (!/^[\d\s+\-()]+$/.test(formData.yetkiliKisi2.tel1)) {
            newErrors.yetkili2_tel1 = 'Geçerli telefon numarası giriniz';
          }
        }
        if (formData.yetkiliKisi2.mail1 && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.yetkiliKisi2.mail1)) {
          newErrors.yetkili2_mail1 = 'Geçerli e-posta adresi giriniz';
        }
        break;
      
      default:
        // Bilinmeyen adım
        break;
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // ▶️ Sonraki adım
  const handleNext = () => {
    if (validateStep(activeStep)) {
      const newCompleted = { ...completed };
      newCompleted[activeStep] = true;
      setCompleted(newCompleted);
      setActiveStep((prevStep) => prevStep + 1);
    }
  };

  // ◀️ Önceki adım
  const handleBack = () => {
    setActiveStep((prevStep) => prevStep - 1);
  };

  // 📝 Form field değişikliği - Gelişmiş versiyon
  const handleChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
    
    // Hata temizleme
    if (errors[field]) {
      setErrors(prev => ({
        ...prev,
        [field]: ''
      }));
    }

    // 🔍 Gerçek zamanlı duplicate check
    if (field === 'vergiNoTC' && value.length >= 10) {
      const timeoutId = setTimeout(() => checkDuplicate('vergiNoTC', value), 500);
      return () => clearTimeout(timeoutId);
    }
    
    if (field === 'tamUnvan' && value.length >= 5) {
      const timeoutId = setTimeout(() => checkDuplicate('tamUnvan', value), 800);
      return () => clearTimeout(timeoutId);
    }

    // 💾 Otomatik kaydetme tetikle (debounced)
    const timeoutId = setTimeout(autoSave, 2000);
    return () => clearTimeout(timeoutId);
  };



  // 👤 Yetkili kişi güncelleme
  const updateYetkiliKisi = (kisiType, field, value) => {
    setFormData(prev => ({
      ...prev,
      [kisiType]: {
        ...prev[kisiType],
        [field]: value
      }
    }));
  };

  // 💾 Form gönderimi
  const handleSubmit = async () => {
    // Tüm adımları validate et
    let allValid = true;
    for (let i = 0; i < steps.length - 1; i++) {
      if (!validateStep(i)) {
        allValid = false;
        break;
      }
    }

    if (!allValid) {
      alert('Lütfen tüm zorunlu alanları doldurun');
      return;
    }

    try {
      // 🔄 Form data'yı backend formatına dönüştür
      const backendFormData = {
        ...formData,
        // Yetkili kişileri array formatına dönüştür (backend uyumluluğu için)
        yetkiliKisiler: [
          {
            adSoyad: formData.yetkiliKisi1.adSoyad,
            telefon1: formData.yetkiliKisi1.tel1,
            telefon2: formData.yetkiliKisi1.tel2,
            eposta1: formData.yetkiliKisi1.mail1,
            eposta2: formData.yetkiliKisi1.mail2
          },
          {
            adSoyad: formData.yetkiliKisi2.adSoyad,
            telefon1: formData.yetkiliKisi2.tel1,
            telefon2: formData.yetkiliKisi2.tel2,
            eposta1: formData.yetkiliKisi2.mail1,
            eposta2: formData.yetkiliKisi2.mail2
          }
        ].filter(kisi => kisi.adSoyad.trim() !== ''), // Boş kayıtları filtrele
        
        // Field mapping düzeltmeleri
        anaFaaliyetKonusu: formData.anaFaaliyetKonusu,
        yabanciIsareti: formData.yabanciIsareti,
        anaIrtikatKisi: formData.ilkIrtibatKisi,
        etyusYetkiBitisTarihi: formData.etuysYetkiBitis,
        dysYetkiBitisTarihi: formData.dysYetkiBitis
      };

      // Excel formatında kullanılan alanları kaldır
      delete backendFormData.yetkiliKisi1;
      delete backendFormData.yetkiliKisi2;
      delete backendFormData.ilkIrtibatKisi;
      delete backendFormData.etuysYetkiBitis;
      delete backendFormData.dysYetkiBitis;

      console.log('🚀 Gönderilen form data:', backendFormData);

      const result = isEdit 
        ? await updateFirma(id, backendFormData)
        : await createFirma(backendFormData);

      if (result.success) {
        navigate('/firmalar');
      } else {
        alert(result.message || 'İşlem başarısız');
      }
    } catch (error) {
      console.error('Form gönderimi hatası:', error);
      alert('Beklenmedik hata oluştu');
    }
  };

  // 🎨 Adım içerikleri render fonksiyonu
  const renderStepContent = (step) => {
    switch (step) {
      case 0:
        return (
          <Grid container spacing={3}>
            <Grid size={{ xs: 12, md: 6 }}>
              <TextField
                fullWidth
                label="Firma ID *"
                value={formData.firmaId}
                disabled={!isEdit} // Yeni firmada otomatik, düzenlemede manual
                onChange={(e) => handleChange('firmaId', e.target.value.toUpperCase())}
                error={!!errors.firmaId}
                helperText={isEdit ? errors.firmaId : "Otomatik olarak oluşturuldu"}
                placeholder="Örn: A000001"
                InputProps={{
                  sx: {
                    bgcolor: !isEdit ? 'grey.100' : 'transparent',
                    '& input': {
                      color: !isEdit ? 'text.secondary' : 'text.primary'
                    }
                  }
                }}
              />
            </Grid>
            <Grid size={{ xs: 12, md: 6 }}>
              <TextField
                fullWidth
                label="Vergi No/TC No"
                value={formData.vergiNoTC}
                onChange={(e) => handleChange('vergiNoTC', e.target.value)}
                error={!!errors.vergiNoTC || validationResults.vergiNoAvailable === false}
                helperText={
                  errors.vergiNoTC || 
                  (validationResults.vergiNoAvailable === false ? '⚠️ Bu vergi numarası zaten kayıtlı!' : '') ||
                  (validationResults.vergiNoAvailable === true ? '✅ Vergi numarası kullanılabilir' : '') ||
                  (formStatus.isDuplicateChecking ? '🔍 Kontrol ediliyor...' : '10-11 haneli sayı')
                }
                placeholder="10-11 haneli sayı"
                InputProps={{
                  endAdornment: formStatus.isDuplicateChecking ? (
                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                      <Box sx={{ width: 16, height: 16 }}>
                        <LinearProgress />
                      </Box>
                    </Box>
                  ) : validationResults.vergiNoAvailable === true ? (
                    <CheckIcon sx={{ color: 'success.main' }} />
                  ) : validationResults.vergiNoAvailable === false ? (
                    <WarningIcon sx={{ color: 'error.main' }} />
                  ) : null
                }}
              />
            </Grid>
            <Grid size={{ xs: 12 }}>
              <TextField
                fullWidth
                label="Tam Ünvan *"
                value={formData.tamUnvan}
                onChange={(e) => handleChange('tamUnvan', e.target.value.toUpperCase())}
                error={!!errors.tamUnvan}
                helperText={
                  errors.tamUnvan ||
                  (validationResults.tamUnvanSimilar?.length > 0 ? 
                    `⚠️ ${validationResults.tamUnvanSimilar.length} benzer firma bulundu` : '') ||
                  (formStatus.isDuplicateChecking ? '🔍 Benzer firmalar kontrol ediliyor...' : 'Firma tam ünvanını giriniz')
                }
                placeholder="Firma tam ünvanını giriniz"
                multiline
                rows={2}
                InputProps={{
                  endAdornment: formStatus.isDuplicateChecking ? (
                    <Box sx={{ display: 'flex', alignItems: 'center', mt: 1 }}>
                      <Box sx={{ width: 16, height: 16 }}>
                        <LinearProgress />
                      </Box>
                    </Box>
                  ) : validationResults.tamUnvanSimilar?.length > 0 ? (
                    <WarningIcon sx={{ color: 'warning.main', mt: 1 }} />
                  ) : null
                }}
              />
              
              {/* 📋 Benzer firma uyarıları */}
              {validationResults.tamUnvanSimilar?.length > 0 && (
                <Alert severity="warning" sx={{ mt: 1 }}>
                  <Typography variant="body2" sx={{ fontWeight: 600, mb: 1 }}>
                    🔍 Benzer Firmalar Bulundu:
                  </Typography>
                  {validationResults.tamUnvanSimilar.slice(0, 3).map((firma, index) => (
                    <Chip 
                      key={index}
                      label={`${firma.firmaId} - ${firma.tamUnvan}`}
                      size="small"
                      sx={{ mr: 1, mb: 1 }}
                      color="warning"
                      variant="outlined"
                    />
                  ))}
                  {validationResults.tamUnvanSimilar.length > 3 && (
                    <Typography variant="caption" color="text.secondary">
                      +{validationResults.tamUnvanSimilar.length - 3} daha...
                    </Typography>
                  )}
                </Alert>
              )}
            </Grid>
            <Grid size={{ xs: 12, md: 6 }}>
              <FormControl fullWidth>
                <InputLabel>Ana Faaliyet Konusu *</InputLabel>
                <Select
                  value={formData.anaFaaliyetKonusu}
                  onChange={(e) => handleChange('anaFaaliyetKonusu', e.target.value)}
                  label="Ana Faaliyet Konusu *"
                >
                  <MenuItem value="">Ana Faaliyet Konusu Seçiniz</MenuItem>
                  {anaFaaliyetKonulari.map((konusu, index) => (
                    <MenuItem key={index} value={konusu}>
                      {konusu}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid size={{ xs: 12, md: 6 }}>
              <FormControlLabel
                control={
                  <Switch
                    checked={formData.yabanciIsareti}
                    onChange={(e) => handleChange('yabanciIsareti', e.target.checked)}
                  />
                }
                label="Yabancı Sermayeli Firma"
              />
            </Grid>
          </Grid>
        );

      case 1:
        return (
          <Grid container spacing={3}>
            <Grid size={{ xs: 12 }}>
              <TextField
                fullWidth
                label="Adres"
                value={formData.adres}
                onChange={(e) => handleChange('adres', e.target.value)}
                multiline
                rows={3}
                placeholder="Firma adresini giriniz"
              />
            </Grid>
            <Grid size={{ xs: 12, md: 6 }}>
              <FormControl fullWidth>
                <InputLabel>Firma İl *</InputLabel>
                <Select
                  value={formData.firmaIl}
                  onChange={(e) => handleIlChange(e.target.value)}
                  label="Firma İl *"
                  error={!!errors.firmaIl}
                >
                  <MenuItem value="">İl Seçiniz</MenuItem>
                  {turkishCities.map((il, index) => (
                    <MenuItem key={index} value={il}>
                      {il}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid size={{ xs: 12, md: 6 }}>
              <FormControl fullWidth>
                <InputLabel>Firma İlçe</InputLabel>
                <Select
                  value={formData.firmaIlce}
                  onChange={(e) => handleChange('firmaIlce', e.target.value)}
                  label="Firma İlçe"
                  disabled={!formData.firmaIl}
                >
                  <MenuItem value="">{formData.firmaIl ? 'İlçe Seçiniz' : 'Önce İl Seçiniz'}</MenuItem>
                  {formData.firmaIl && ilIlceMap[formData.firmaIl] && ilIlceMap[formData.firmaIl].map((ilce, index) => (
                    <MenuItem key={index} value={ilce}>
                      {ilce}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid size={{ xs: 12 }}>
              <TextField
                fullWidth
                label="KEP Adresi"
                value={formData.kepAdresi}
                onChange={(e) => handleChange('kepAdresi', e.target.value.toLowerCase())}
                error={!!errors.kepAdresi}
                helperText={errors.kepAdresi}
                placeholder="ornek@firma.com.tr"
                InputProps={{
                  startAdornment: <EmailIcon color="action" sx={{ mr: 1 }} />
                }}
              />
            </Grid>
          </Grid>
        );

      case 2:
        return (
          <Box>
            <Typography variant="h6" sx={{ mb: 3, display: 'flex', alignItems: 'center' }}>
              <PersonIcon sx={{ mr: 1, color: 'primary.main' }} />
              Yetkili Kişiler (Excel Sütun 10-19)
            </Typography>
            
            {/* 👤 Yetkili Kişi 1 */}
            <Card sx={{ mb: 3, border: '2px solid #e3f2fd', borderRadius: 2 }}>
              <CardContent>
                <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 2, color: 'primary.main' }}>
                  👤 Yetkili Kişi 1 (Excel Sütun 10-14)
                </Typography>
                <Grid container spacing={2}>
                  <Grid size={{ xs: 12, md: 6 }}>
                    <TextField
                      fullWidth
                      label="Ad Soyad"
                      value={formData.yetkiliKisi1.adSoyad}
                      onChange={(e) => updateYetkiliKisi('yetkiliKisi1', 'adSoyad', e.target.value)}
                      placeholder="Yetkili kişinin adı soyadı"
                    />
                  </Grid>
                  <Grid size={{ xs: 12, md: 6 }}>
                    <TextField
                      fullWidth
                      label="Tel1"
                      value={formData.yetkiliKisi1.tel1}
                      onChange={(e) => updateYetkiliKisi('yetkiliKisi1', 'tel1', e.target.value)}
                      error={!!errors.yetkili1_tel1}
                      helperText={errors.yetkili1_tel1}
                      placeholder="05XXXXXXXXX"
                      InputProps={{
                        startAdornment: <PhoneIcon color="action" sx={{ mr: 1 }} />
                      }}
                    />
                  </Grid>
                  <Grid size={{ xs: 12, md: 4 }}>
                    <TextField
                      fullWidth
                      label="Tel2"
                      value={formData.yetkiliKisi1.tel2}
                      onChange={(e) => updateYetkiliKisi('yetkiliKisi1', 'tel2', e.target.value)}
                      placeholder="0312XXXXXXX"
                      InputProps={{
                        startAdornment: <PhoneIcon color="action" sx={{ mr: 1 }} />
                      }}
                    />
                  </Grid>
                  <Grid size={{ xs: 12, md: 4 }}>
                    <TextField
                      fullWidth
                      label="Mail1"
                      value={formData.yetkiliKisi1.mail1}
                      onChange={(e) => updateYetkiliKisi('yetkiliKisi1', 'mail1', e.target.value.toLowerCase())}
                      error={!!errors.yetkili1_mail1}
                      helperText={errors.yetkili1_mail1}
                      placeholder="yetkili@firma.com"
                      InputProps={{
                        startAdornment: <EmailIcon color="action" sx={{ mr: 1 }} />
                      }}
                    />
                  </Grid>
                  <Grid size={{ xs: 12, md: 4 }}>
                    <TextField
                      fullWidth
                      label="Mail2"
                      value={formData.yetkiliKisi1.mail2}
                      onChange={(e) => updateYetkiliKisi('yetkiliKisi1', 'mail2', e.target.value.toLowerCase())}
                      placeholder="alternatif@firma.com"
                      InputProps={{
                        startAdornment: <EmailIcon color="action" sx={{ mr: 1 }} />
                      }}
                    />
                  </Grid>
                </Grid>
              </CardContent>
            </Card>

            {/* 👤 Yetkili Kişi 2 */}
            <Card sx={{ mb: 3, border: '2px solid #f3e5f5', borderRadius: 2 }}>
              <CardContent>
                <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 2, color: 'secondary.main' }}>
                  👤 Yetkili Kişi 2 (Excel Sütun 15-19)
                </Typography>
                <Grid container spacing={2}>
                  <Grid size={{ xs: 12, md: 6 }}>
                    <TextField
                      fullWidth
                      label="Ad Soyad"
                      value={formData.yetkiliKisi2.adSoyad}
                      onChange={(e) => updateYetkiliKisi('yetkiliKisi2', 'adSoyad', e.target.value)}
                      placeholder="Yetkili kişinin adı soyadı"
                    />
                  </Grid>
                  <Grid size={{ xs: 12, md: 6 }}>
                    <TextField
                      fullWidth
                      label="Tel1"
                      value={formData.yetkiliKisi2.tel1}
                      onChange={(e) => updateYetkiliKisi('yetkiliKisi2', 'tel1', e.target.value)}
                      error={!!errors.yetkili2_tel1}
                      helperText={errors.yetkili2_tel1}
                      placeholder="05XXXXXXXXX"
                      InputProps={{
                        startAdornment: <PhoneIcon color="action" sx={{ mr: 1 }} />
                      }}
                    />
                  </Grid>
                  <Grid size={{ xs: 12, md: 4 }}>
                    <TextField
                      fullWidth
                      label="Tel2"
                      value={formData.yetkiliKisi2.tel2}
                      onChange={(e) => updateYetkiliKisi('yetkiliKisi2', 'tel2', e.target.value)}
                      placeholder="0312XXXXXXX"
                      InputProps={{
                        startAdornment: <PhoneIcon color="action" sx={{ mr: 1 }} />
                      }}
                    />
                  </Grid>
                  <Grid size={{ xs: 12, md: 4 }}>
                    <TextField
                      fullWidth
                      label="Mail1"
                      value={formData.yetkiliKisi2.mail1}
                      onChange={(e) => updateYetkiliKisi('yetkiliKisi2', 'mail1', e.target.value.toLowerCase())}
                      error={!!errors.yetkili2_mail1}
                      helperText={errors.yetkili2_mail1}
                      placeholder="yetkili@firma.com"
                      InputProps={{
                        startAdornment: <EmailIcon color="action" sx={{ mr: 1 }} />
                      }}
                    />
                  </Grid>
                  <Grid size={{ xs: 12, md: 4 }}>
                    <TextField
                      fullWidth
                      label="Mail2"
                      value={formData.yetkiliKisi2.mail2}
                      onChange={(e) => updateYetkiliKisi('yetkiliKisi2', 'mail2', e.target.value.toLowerCase())}
                      placeholder="alternatif@firma.com"
                      InputProps={{
                        startAdornment: <EmailIcon color="action" sx={{ mr: 1 }} />
                      }}
                    />
                  </Grid>
                </Grid>
              </CardContent>
            </Card>

            <Divider sx={{ my: 3 }} />

            {/* 📋 Ek Bilgiler (Excel Sütun 20-22) */}
            <Typography variant="h6" sx={{ mb: 2, display: 'flex', alignItems: 'center' }}>
              <CheckIcon sx={{ mr: 1, color: 'success.main' }} />
              Ek Bilgiler (Excel Sütun 20-22)
            </Typography>
            <Grid container spacing={3}>
              <Grid size={{ xs: 12, md: 4 }}>
                <FormControl fullWidth>
                  <InputLabel>İlk İrtibat Kurulacak Kişi</InputLabel>
                  <Select
                    value={formData.ilkIrtibatKisi}
                    onChange={(e) => handleChange('ilkIrtibatKisi', e.target.value)}
                    label="İlk İrtibat Kurulacak Kişi"
                  >
                    <MenuItem value="">İrtibat Kişisi Seçiniz</MenuItem>
                    {irtibatKisiSecenekleri.map((secenek) => (
                      <MenuItem key={secenek.value} value={secenek.value}>
                        {secenek.label}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              <Grid size={{ xs: 12, md: 4 }}>
                <TextField
                  fullWidth
                  label="ETUYS Yetki Bitiş Tarihi"
                  placeholder="gg.aa.yyyy"
                  value={formData.etuysYetkiBitis}
                  onChange={(e) => handleChange('etuysYetkiBitis', e.target.value)}
                  helperText="Örnek: 15.12.2024"
                />
              </Grid>
              <Grid size={{ xs: 12, md: 4 }}>
                <TextField
                  fullWidth
                  label="DYS Yetki Bitiş"
                  type="date"
                  value={formData.dysYetkiBitis}
                  onChange={(e) => handleChange('dysYetkiBitis', e.target.value)}
                  InputLabelProps={{ shrink: true }}
                />
              </Grid>
            </Grid>
          </Box>
        );

      case 3:
        return (
          <Box>
            <Alert severity="info" sx={{ mb: 3 }}>
              Lütfen girdiğiniz bilgileri kontrol edin. Onayladıktan sonra firma kaydı oluşturulacaktır.
            </Alert>

            <Grid container spacing={3}>
              {/* Temel Bilgiler Özeti */}
              <Grid size={{ xs: 12, md: 6 }}>
                <Card variant="outlined">
                  <CardContent>
                    <Typography variant="h6" gutterBottom color="primary">
                      <BusinessIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
                      Temel Bilgiler
                    </Typography>
                    <Stack spacing={1}>
                      <Box>
                        <Typography variant="caption" color="text.secondary">Firma ID:</Typography>
                        <Typography variant="body2" sx={{ fontWeight: 600 }}>{formData.firmaId}</Typography>
                      </Box>
                      <Box>
                        <Typography variant="caption" color="text.secondary">Tam Ünvan:</Typography>
                        <Typography variant="body2">{formData.tamUnvan}</Typography>
                      </Box>
                      {formData.vergiNoTC && (
                        <Box>
                          <Typography variant="caption" color="text.secondary">Vergi No:</Typography>
                          <Typography variant="body2">{formData.vergiNoTC}</Typography>
                        </Box>
                      )}
                      {formData.anaFaaliyetKonusu && (
                        <Box>
                          <Typography variant="caption" color="text.secondary">Ana Faaliyet Konusu:</Typography>
                          <Typography variant="body2">{formData.anaFaaliyetKonusu}</Typography>
                        </Box>
                      )}
                      {formData.yabanciIsareti && (
                        <Chip label="Yabancı Sermayeli" color="warning" size="small" />
                      )}
                    </Stack>
                  </CardContent>
                </Card>
              </Grid>

              {/* İletişim Bilgileri Özeti */}
              <Grid size={{ xs: 12, md: 6 }}>
                <Card variant="outlined">
                  <CardContent>
                    <Typography variant="h6" gutterBottom color="primary">
                      <LocationIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
                      İletişim Bilgileri
                    </Typography>
                    <Stack spacing={1}>
                      {formData.adres && (
                        <Box>
                          <Typography variant="caption" color="text.secondary">Adres:</Typography>
                          <Typography variant="body2">{formData.adres}</Typography>
                        </Box>
                      )}
                      <Box>
                        <Typography variant="caption" color="text.secondary">İl/İlçe:</Typography>
                        <Typography variant="body2">
                          {formData.firmaIl} {formData.firmaIlce && `/ ${formData.firmaIlce}`}
                        </Typography>
                      </Box>
                      {formData.kepAdresi && (
                        <Box>
                          <Typography variant="caption" color="text.secondary">KEP Adresi:</Typography>
                          <Typography variant="body2">{formData.kepAdresi}</Typography>
                        </Box>
                      )}
                    </Stack>
                  </CardContent>
                </Card>
              </Grid>

              {/* Yetkili Kişiler Özeti */}
              <Grid size={{ xs: 12, md: 8 }}>
                <Card variant="outlined">
                  <CardContent>
                    <Typography variant="h6" gutterBottom color="primary">
                      <PersonIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
                      Yetkili Kişiler ({formData.yetkiliKisiler.length})
                    </Typography>
                    <Grid container spacing={2}>
                      {formData.yetkiliKisiler.map((yetkili, index) => (
                        <Grid size={{ xs: 12, md: 6 }} key={index}>
                          <Paper variant="outlined" sx={{ p: 2 }}>
                            <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                              #{index + 1} {yetkili.adSoyad || 'Ad Soyad Girilmemiş'}
                            </Typography>
                            {yetkili.telefon1 && (
                              <Typography variant="body2" color="text.secondary">
                                📞 {yetkili.telefon1}
                              </Typography>
                            )}
                            {yetkili.eposta1 && (
                              <Typography variant="body2" color="text.secondary">
                                📧 {yetkili.eposta1}
                              </Typography>
                            )}
                          </Paper>
                        </Grid>
                      ))}
                    </Grid>
                  </CardContent>
                </Card>
              </Grid>

              {/* Yetki Bilgileri Özeti */}
              <Grid size={{ xs: 12, md: 4 }}>
                <Card variant="outlined">
                  <CardContent>
                    <Typography variant="h6" gutterBottom color="primary">
                      📅 Yetki Bilgileri
                    </Typography>
                    <Stack spacing={2}>
                      {formData.ilkIrtibatKisi && (
                        <Box>
                          <Typography variant="caption" color="text.secondary">İlk İrtibat Kişisi:</Typography>
                          <Typography variant="body2" sx={{ fontWeight: 500 }}>{formData.ilkIrtibatKisi}</Typography>
                        </Box>
                      )}
                      {formData.etuysYetkiBitis && (
                        <Box>
                          <Typography variant="caption" color="text.secondary">ETUYS Yetki Bitiş:</Typography>
                          <Typography variant="body2" sx={{ fontWeight: 500 }}>
                            {new Date(formData.etuysYetkiBitis).toLocaleDateString('tr-TR')}
                          </Typography>
                        </Box>
                      )}
                      {formData.dysYetkiBitis && (
                        <Box>
                          <Typography variant="caption" color="text.secondary">DYS Yetki Bitiş:</Typography>
                          <Typography variant="body2" sx={{ fontWeight: 500 }}>
                            {new Date(formData.dysYetkiBitis).toLocaleDateString('tr-TR')}
                          </Typography>
                        </Box>
                      )}
                      {!formData.ilkIrtibatKisi && !formData.etuysYetkiBitis && !formData.dysYetkiBitis && (
                        <Typography variant="body2" color="text.disabled">
                          Yetki bilgisi girilmemiş
                        </Typography>
                      )}
                    </Stack>
                  </CardContent>
                </Card>
              </Grid>
            </Grid>
          </Box>
        );

      default:
        return 'Bilinmeyen adım';
    }
  };

  // 🔍 ARAMA STATE'LERİ (EKSİK ÖZELLİK)
  const [searchMode, setSearchMode] = useState(false);
  const [searchData, setSearchData] = useState({
    vergiNoTC: '',
    tamUnvan: ''
  });
  const [searchResults, setSearchResults] = useState(null);

  // 🏢 Ana Faaliyet Konuları (EKSİK ÖZELLİK)
  const anaFaaliyetKonulari = [
    'Bilgisayar Programcılığı',
    'Yazılım Geliştirme',
    'Bilgi İşlem Danışmanlığı',
    'İnternet Tabanlı Yazılım',
    'Mobil Uygulama Geliştirme',
    'E-Ticaret Sistemleri',
    'Veri Analizi ve İşleme',
    'Bulut Bilişim Hizmetleri',
    'Siber Güvenlik Danışmanlığı',
    'Dijital Pazarlama',
    'Web Tasarım ve Geliştirme',
    'Bilgisayar Ağ Sistemleri',
    'Veritabanı Yönetimi',
    'Sistem Entegrasyonu',
    'IT Danışmanlığı',
    'Donanım Satış ve Servisi',
    'Teknik Destek Hizmetleri',
    'Eğitim ve Danışmanlık',
    'Proje Yönetimi',
    'Diğer'
  ];

  // 🌍 İlçe-İl Bağlantısı (EKSİK ÖZELLİK)
  const ilIlceMap = {
    'İSTANBUL': ['ADALAR', 'ARNAVUTKÖY', 'ATAŞEHİR', 'AVCILAR', 'BAĞCILAR', 'BAHÇELİEVLER', 'BAKIRKÖY', 'BEŞİKTAŞ', 'BEYKOZ', 'BEYLİKDÜZÜ', 'BEYOĞLU', 'BÜYÜKÇEKMECE', 'ÇATALCA', 'ÇEKMEKÖY', 'EMİNÖNÜ', 'ESENYURT', 'EYÜPSULTAN', 'FATİH', 'GAZİOSMANPAŞA', 'GÜNGÖREN', 'KADIKÖY', 'KAĞITHANE', 'KARTAL', 'KÜÇÜKÇEKMECE', 'MALTEPİ', 'PENDİK', 'SANCAKTEPE', 'SARIYER', 'SİLİVRİ', 'SULTANBEYLİ', 'SULTANGAZİ', 'ŞİLE', 'ŞİŞLİ', 'TUZLA', 'ÜMRANİYE', 'ÜSKÜDAR', 'ZEYTİNBURNU'],
    'ANKARA': ['AKYURT', 'ALTINDAĞ', 'AYAŞ', 'BALA', 'BEYPAZARI', 'ÇAMLIDERE', 'ÇANKAYA', 'ÇUBUK', 'ELMADAĞ', 'EMİRDAĞ', 'ETİMESGUT', 'EVREN', 'GÖLBAŞI', 'GÜDÜL', 'HAYMANA', 'KAHRAMANKAZAN', 'KALECİK', 'KEÇİÖREN', 'KIZILCAHAMAM', 'MAMAK', 'NALLIHAN', 'POLATLI', 'PURSAKLAR', 'SİNCAN', 'ŞEREFLİKOÇHİSAR', 'YENİMAHALLE'],
    'İZMİR': ['ALİAĞA', 'BALÇOVA', 'BAYINDIR', 'BAYRAKLI', 'BERGAMA', 'BORNOVA', 'BUCA', 'ÇEŞME', 'DİKİLİ', 'FOÇA', 'GAZİEMİR', 'GÜZELBAHÇE', 'KARABAĞLAR', 'KARABURUN', 'KARŞIYAKA', 'KEMALPAŞA', 'KINIK', 'KİRAZ', 'KONAK', 'MENDERES', 'MENEMEN', 'NARLIDA', 'ÖDEMİŞ', 'SEFERİHİSAR', 'SELÇUK', 'TİRE', 'TORBALI', 'URLA'],
    // Diğer iller için de ilçeler eklenebilir
  };

  // 🔍 KAYIT ARAMA FONKSİYONU (EKSİK ÖZELLİK)
  const handleSearchRecord = async () => {
    if (!searchData.vergiNoTC && !searchData.tamUnvan) {
      alert('Arama yapmak için Vergi No/TC veya Tam Ünvan giriniz');
      return;
    }

    try {
      const searchTerm = searchData.vergiNoTC || searchData.tamUnvan;
      const result = await searchFirmalar(searchTerm);
      
      if (result.success && result.data.length > 0) {
        const foundFirma = result.data.find(f => 
          f.vergiNoTC === searchData.vergiNoTC || 
          f.tamUnvan.toLowerCase().includes(searchData.tamUnvan.toLowerCase())
        );
        
        if (foundFirma) {
          setFormData({
            ...foundFirma,
            yetkiliKisi1: foundFirma.yetkiliKisiler?.[0] || {
              adSoyad: '', tel1: '', tel2: '', mail1: '', mail2: ''
            },
            yetkiliKisi2: foundFirma.yetkiliKisiler?.[1] || {
              adSoyad: '', tel1: '', tel2: '', mail1: '', mail2: ''
            }
          });
          setSearchMode(false);
          alert(`✅ Firma bulundu: ${foundFirma.tamUnvan}`);
        } else {
          alert('❌ Kayıt bulunamadı');
        }
      } else {
        alert('❌ Arama kriterlerine uygun kayıt bulunamadı');
      }
    } catch (error) {
      console.error('Arama hatası:', error);
      alert('❌ Arama sırasında hata oluştu');
    }
  };

  // 🗑️ FORMU TEMİZLE FONKSİYONU (EKSİK ÖZELLİK)
  const handleClearForm = () => {
    if (window.confirm('Formdaki tüm veriler silinecek. Emin misiniz?')) {
      setFormData({
        firmaId: '',
        vergiNoTC: '',
        tamUnvan: '',
        adres: '',
        firmaIl: '',
        firmaIlce: '',
        kepAdresi: '',
        yabanciIsareti: false,
        anaFaaliyetKonusu: '',
        yetkiliKisi1: {
          adSoyad: '', tel1: '', tel2: '', mail1: '', mail2: ''
        },
        yetkiliKisi2: {
          adSoyad: '', tel1: '', tel2: '', mail1: '', mail2: ''
        },
        ilkIrtibatKisi: '',
        etuysYetkiBitis: '',
        dysYetkiBitis: ''
      });
      setActiveStep(0);
      setCompleted({});
      setErrors({});
      
      // Yeni ID oluştur
      generateNextFirmaId().then(newId => {
        setFormData(prev => ({ ...prev, firmaId: newId }));
      });
      
      alert('✅ Form temizlendi');
    }
  };

  // İl değiştiğinde ilçeyi sıfırla
  const handleIlChange = (value) => {
    setFormData(prev => ({
      ...prev,
      firmaIl: value,
      firmaIlce: '' // İlçeyi sıfırla
    }));
  };

  // İlk irtibat kişisi seçenekleri
  const irtibatKisiSecenekleri = useMemo(() => {
    const secenekler = [];
    if (formData.yetkiliKisi1.adSoyad) {
      secenekler.push({
        value: 'yetkili1',
        label: `${formData.yetkiliKisi1.adSoyad} (Yetkili 1)`
      });
    }
    if (formData.yetkiliKisi2.adSoyad) {
      secenekler.push({
        value: 'yetkili2', 
        label: `${formData.yetkiliKisi2.adSoyad} (Yetkili 2)`
      });
    }
    return secenekler;
  }, [formData.yetkiliKisi1.adSoyad, formData.yetkiliKisi2.adSoyad]);

  return (
    <>
      {/* 🌟 PREMIUM ANIMATED BACKGROUND */}
      <AnimatedBackground />
      
      <Box className="app-container fade-in" sx={{ position: 'relative', zIndex: 1 }}>
        <Box sx={{ maxWidth: '1600px', mx: 'auto', px: 3, py: 4 }}>
          
          {/* 🚀 ULTRA-MODERN SMART SEARCH PANEL */}
          <Slide direction="down" in timeout={800}>
            <Card 
              sx={{ 
                mb: 4, 
                overflow: 'hidden',
                background: 'rgba(255,255,255,0.95)',
                backdropFilter: 'blur(20px)',
                border: '1px solid rgba(255,255,255,0.3)',
                borderRadius: 4,
                boxShadow: '0 20px 60px rgba(0,0,0,0.1), 0 0 40px rgba(102, 126, 234, 0.1)',
                position: 'relative',
                '&::before': {
                  content: '""',
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  right: 0,
                  height: 4,
                  background: 'linear-gradient(90deg, #667eea, #764ba2, #f093fb, #f5576c)',
                  backgroundSize: '400% 100%',
                  animation: 'shimmer 3s ease-in-out infinite'
                },
                '@keyframes shimmer': {
                  '0%, 100%': { backgroundPosition: '0% 50%' },
                  '50%': { backgroundPosition: '100% 50%' }
                }
              }}
            >
              <CardContent sx={{ p: 4 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
                  <Avatar 
                    sx={{ 
                      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                      width: 56,
                      height: 56,
                      mr: 2,
                      boxShadow: '0 8px 20px rgba(102, 126, 234, 0.3)'
                    }}
                  >
                    <AIIcon sx={{ fontSize: 28 }} />
                  </Avatar>
                  <Box>
                    <Typography variant="h5" sx={{ 
                      fontWeight: 700,
                      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                      backgroundClip: 'text',
                      WebkitBackgroundClip: 'text',
                      WebkitTextFillColor: 'transparent',
                      mb: 0.5
                    }}>
                      🔍 Akıllı Firma Arama & Düzenleme Paneli
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 500 }}>
                      AI destekli arama ile mevcut kayıtları bulun veya yeni firma ekleyin
                    </Typography>
                  </Box>
                  <Box sx={{ ml: 'auto', display: 'flex', gap: 1 }}>
                    <Tooltip title="Akıllı Mod">
                      <Chip
                        icon={<MagicIcon />}
                        label="Smart Mode"
                        color={smartMode ? 'primary' : 'default'}
                        onClick={() => setSmartMode(!smartMode)}
                        sx={{ cursor: 'pointer', fontWeight: 600 }}
                      />
                    </Tooltip>
                    <Tooltip title="Otomatik Kaydetme">
                      <Chip
                        icon={<AutoSaveIcon />}
                        label="Auto Save"
                        color={autoSaveEnabled ? 'success' : 'default'}
                        onClick={() => setAutoSaveEnabled(!autoSaveEnabled)}
                        sx={{ cursor: 'pointer', fontWeight: 600 }}
                      />
                    </Tooltip>
                  </Box>
                </Box>
                
                <Grid container spacing={3} alignItems="center">
                  <Grid size={{ xs: 12, md: 3 }}>
                    <SmartField
                      size="small"
                      label="Vergi No/TC No"
                      value={searchData.vergiNoTC}
                      onChange={(e) => setSearchData(prev => ({ ...prev, vergiNoTC: e.target.value }))}
                      placeholder="Vergi No veya TC No"
                      startIcon={<SecurityIcon sx={{ color: 'primary.main', mr: 1 }} />}
                      validationState={searchData.vergiNoTC && searchData.vergiNoTC.length >= 10 ? 'valid' : null}
                    />
                  </Grid>
                  <Grid size={{ xs: 12, md: 3 }}>
                    <SmartField
                      size="small"
                      label="Tam Ünvan"
                      value={searchData.tamUnvan}
                      onChange={(e) => setSearchData(prev => ({ ...prev, tamUnvan: e.target.value }))}
                      placeholder="Firma ünvanı ara..."
                      startIcon={<BusinessIcon sx={{ color: 'primary.main', mr: 1 }} />}
                      validationState={searchData.tamUnvan && searchData.tamUnvan.length >= 3 ? 'valid' : null}
                    />
                  </Grid>
                  <Grid size={{ xs: 12, md: 2 }}>
                    <Button
                      fullWidth
                      variant="contained"
                      size="large"
                      startIcon={<SearchIcon />}
                      onClick={handleSearchRecord}
                      sx={{ 
                        py: 1.5,
                        fontWeight: 600,
                        borderRadius: 3,
                        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                        boxShadow: '0 8px 25px rgba(102, 126, 234, 0.4)',
                        textTransform: 'none',
                        fontSize: '1rem',
                        '&:hover': {
                          background: 'linear-gradient(135deg, #7c8ceb 0%, #8b60a3 100%)',
                          transform: 'translateY(-2px)',
                          boxShadow: '0 12px 35px rgba(102, 126, 234, 0.5)'
                        }
                      }}
                    >
                      🚀 Akıllı Arama
                    </Button>
                  </Grid>
                  <Grid size={{ xs: 12, md: 4 }}>
                    <Box sx={{ 
                      p: 2, 
                      background: 'linear-gradient(135deg, rgba(102, 126, 234, 0.1) 0%, rgba(118, 75, 162, 0.1) 100%)',
                      borderRadius: 2,
                      border: '1px solid rgba(102, 126, 234, 0.2)'
                    }}>
                      <Typography variant="body2" sx={{ 
                        fontWeight: 600,
                        color: 'primary.main',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 1
                      }}>
                        <SpeedIcon sx={{ fontSize: 16 }} />
                        Hızlı İpuçları
                      </Typography>
                      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5 }}>
                        • Vergi No ile tam eşleşme arama<br/>
                        • Ünvan ile benzerlik arama<br/>
                        • Akıllı öneriler ve otomatik tamamlama
                      </Typography>
                    </Box>
                  </Grid>
                </Grid>
              </CardContent>
            </Card>
          </Slide>

        {/* 🌟 ULTRA-ENTERPRISE HEADER WITH PREMIUM EFFECTS */}
        <Fade in timeout={1000}>
          <Card className="ultra-glass" sx={{ 
            mb: 6, 
            textAlign: 'center',
            p: 6,
            position: 'relative',
            overflow: 'hidden',
            borderRadius: 5
          }}>
            {/* Premium Animated Background */}
            <Box sx={{
              position: 'absolute',
              top: -100,
              right: -100,
              width: 400,
              height: 400,
              background: 'radial-gradient(circle, rgba(102, 126, 234, 0.15) 0%, transparent 70%)',
              borderRadius: '50%',
              filter: 'blur(80px)',
              animation: 'float 8s ease-in-out infinite'
            }} />
            
            <Box sx={{
              position: 'absolute',
              bottom: -80,
              left: -80,
              width: 300,
              height: 300,
              background: 'radial-gradient(circle, rgba(118, 75, 162, 0.1) 0%, transparent 70%)',
              borderRadius: '50%',
              filter: 'blur(60px)',
              animation: 'float 6s ease-in-out infinite reverse'
            }} />
            
            <Box sx={{ position: 'relative', zIndex: 2 }}>
              <Zoom in timeout={1200}>
                <Box sx={{ mb: 4 }}>
                  <Avatar sx={{
                    width: 120,
                    height: 120,
                    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                    mx: 'auto',
                    mb: 3,
                    boxShadow: '0 25px 60px rgba(102, 126, 234, 0.3), 0 0 40px rgba(118, 75, 162, 0.2)',
                    border: '4px solid rgba(255,255,255,0.3)',
                    position: 'relative',
                    '&::before': {
                      content: '""',
                      position: 'absolute',
                      top: -4,
                      left: -4,
                      right: -4,
                      bottom: -4,
                      borderRadius: '50%',
                      background: 'linear-gradient(45deg, transparent, rgba(255,255,255,0.4), transparent)',
                      animation: 'rotate 3s linear infinite'
                    }
                  }}>
                    <BusinessIcon sx={{ fontSize: 60 }} />
                  </Avatar>
                  
                  <Typography 
                    variant="h2" 
                    component="h1" 
                    sx={{ 
                      fontWeight: 800,
                      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                      backgroundClip: 'text',
                      WebkitBackgroundClip: 'text',
                      WebkitTextFillColor: 'transparent',
                      mb: 2,
                      letterSpacing: '-0.02em'
                    }}
                  >
                    🎯 ULTRA-PROFESSIONAL FIRMA PANELİ
                  </Typography>
                  
                  <Typography variant="h6" sx={{ 
                    color: 'text.secondary',
                    fontWeight: 500,
                    mb: 4,
                    maxWidth: 600,
                    mx: 'auto'
                  }}>
                    {isEdit ? '📝 Enterprise Firma Düzenleme' : '🏢 Enterprise Firma Ekleme'} - AI Destekli Akıllı Form
                  </Typography>
                </Box>
              </Zoom>
              
              <Box sx={{ 
                display: 'flex', 
                justifyContent: 'center', 
                gap: 2, 
                mb: 4,
                flexWrap: 'wrap'
              }}>
                <Chip
                  icon={<VerifiedIcon />}
                  label="Enterprise Edition"
                  color="primary"
                  variant="filled"
                  sx={{ 
                    fontWeight: 600,
                    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                    color: 'white'
                  }}
                />
                <Chip
                  icon={<SecurityIcon />}
                  label="Güvenli Veri İşleme"
                  color="success"
                  variant="outlined"
                  sx={{ fontWeight: 600 }}
                />
                <Chip
                  icon={<TrendingUpIcon />}
                  label="AI Powered"
                  color="info"
                  variant="outlined"
                  sx={{ fontWeight: 600 }}
                />
              </Box>

              {/* Auto-Save Status */}
              {lastSaved && (
                <Fade in>
                  <Box sx={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'center',
                    gap: 1,
                    p: 1,
                    background: 'rgba(76, 175, 80, 0.1)',
                    borderRadius: 2,
                    border: '1px solid rgba(76, 175, 80, 0.3)'
                  }}>
                    <CloudIcon sx={{ fontSize: 16, color: 'success.main' }} />
                    <Typography variant="caption" color="success.main" sx={{ fontWeight: 600 }}>
                      Son kaydetme: {lastSaved}
                    </Typography>
                  </Box>
                </Fade>
              )}
            </Box>
          </Card>
        </Fade>

        {/* Ana başlık */}
        <Typography 
          variant="h4" 
          component="h1"
          className="text-display-medium"
          sx={{ 
            mb: 2, 
            fontWeight: 700,
            background: 'linear-gradient(45deg, #1976d2, #42a5f5)',
            backgroundClip: 'text',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            textAlign: 'center'
          }}
        >
          {isEdit ? '📝 Firma Düzenle' : '🏢 Yeni Firma Ekle'}
        </Typography>
            
            <Typography 
              variant="h6" 
              className="text-body-large"
              color="text.secondary"
              sx={{ mb: 3, maxWidth: 600, mx: 'auto' }}
            >
              {isEdit ? 
                'Firma bilgilerini profesyonel standartlarda güncelleyin ve değişiklikleri kaydedin' :
                'Excel formatında 23 sütunlu profesyonel firma kaydı oluşturun'
              }
            </Typography>
            
            {/* 🏷️ Feature Chips Container */}
            <Box sx={{ textAlign: 'center', mb: 4 }}>
              <Stack direction="row" spacing={2} justifyContent="center" flexWrap="wrap">
              <Chip 
                icon={<CheckIcon />}
                label="✅ 23 Excel Sütunu"
                className="btn-glass"
                sx={{ 
                  fontWeight: 600,
                  background: 'rgba(76, 175, 80, 0.1)',
                  color: '#2e7d32',
                  border: '1px solid rgba(76, 175, 80, 0.2)'
                }}
              />
              <Chip 
                icon={<AutoSaveIcon />}
                label="🔄 Otomatik Kayıt"
                className="btn-glass"
                sx={{ 
                  fontWeight: 600,
                  background: 'rgba(33, 150, 243, 0.1)',
                  color: '#1976d2',
                  border: '1px solid rgba(33, 150, 243, 0.2)'
                }}
              />
              <Chip 
                icon={<WarningIcon />}
                label="⚠️ Duplicate Check"
                className="btn-glass"
                sx={{ 
                  fontWeight: 600,
                  background: 'rgba(255, 152, 0, 0.1)',
                  color: '#f57c00',
                  border: '1px solid rgba(255, 152, 0, 0.2)'
                }}
              />
                             <Chip 
                 icon={<CloudIcon />}
                 label="☁️ Cloud Sync"
                 className="btn-glass"
                 sx={{ 
                   fontWeight: 600,
                   background: 'rgba(156, 39, 176, 0.1)',
                   color: '#9c27b0',
                   border: '1px solid rgba(156, 39, 176, 0.2)'
                 }}
               />
             </Stack>
           </Box> {/* Feature Chips Container kapatılışı */}
         </Card>
         </Box> {/* Ana header Box container kapatılışı */}

        {/* 📊 Modern İlerleme Paneli */}
        <Card sx={{ 
          mb: 4, 
          background: 'rgba(255,255,255,0.95)',
          backdropFilter: 'blur(10px)',
          borderRadius: 3,
          boxShadow: '0 10px 30px rgba(0,0,0,0.1)',
          border: '1px solid rgba(255,255,255,0.2)'
        }}>
          <CardContent sx={{ p: 3 }}>
            {/* 📈 Progress Header */}
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
              <Typography variant="h6" sx={{ 
                fontWeight: 700,
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                backgroundClip: 'text',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent'
              }}>
                📊 Form İlerlemesi
              </Typography>
              
              <Chip 
                label={`${Object.keys(completed).length}/${steps.length - 1} Tamamlandı`}
                color={Object.keys(completed).length === steps.length - 1 ? 'success' : 'primary'}
                variant="filled"
                sx={{ fontWeight: 600 }}
              />
            </Box>

            {/* 📊 Progress Bar */}
            <Box sx={{ mb: 3 }}>
              <LinearProgress 
                variant="determinate" 
                value={(Object.keys(completed).length / (steps.length - 1)) * 100}
                sx={{ 
                  height: 12, 
                  borderRadius: 6,
                  bgcolor: 'rgba(103, 126, 234, 0.1)',
                  '& .MuiLinearProgress-bar': {
                    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                    borderRadius: 6
                  }
                }}
              />
              <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                {Math.round((Object.keys(completed).length / (steps.length - 1)) * 100)}% Tamamlandı
              </Typography>
            </Box>

            {/* 🔧 İşlevler */}
            <Grid container spacing={3} alignItems="center">
              <Grid size={{ xs: 12, md: 4 }}>
                <Box sx={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: 1.5,
                  p: 2,
                  borderRadius: 2,
                  background: 'rgba(76, 175, 80, 0.1)',
                  border: '1px solid rgba(76, 175, 80, 0.2)'
                }}>
                  <SaveIcon sx={{ color: 'success.main', fontSize: 20 }} />
                  <Box>
                    <Typography variant="body2" sx={{ fontWeight: 600 }}>
                      Otomatik Kayıt
                    </Typography>
                    <Switch
                      size="small"
                      checked={formStatus.autoSaveEnabled}
                      onChange={(e) => setFormStatus(prev => ({ 
                        ...prev, 
                        autoSaveEnabled: e.target.checked 
                      }))}
                    />
                  </Box>
                </Box>
              </Grid>
              
              <Grid size={{ xs: 12, md: 4 }}>
                {formStatus.lastSaved && (
                  <Box sx={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: 1.5,
                    p: 2,
                    borderRadius: 2,
                    background: 'rgba(33, 150, 243, 0.1)',
                    border: '1px solid rgba(33, 150, 243, 0.2)'
                  }}>
                    <CheckIcon sx={{ color: 'info.main', fontSize: 20 }} />
                    <Box>
                      <Typography variant="body2" sx={{ fontWeight: 600, color: 'info.main' }}>
                        Son Kayıt
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {formStatus.lastSaved}
                      </Typography>
                    </Box>
                  </Box>
                )}
              </Grid>
              
              <Grid size={{ xs: 12, md: 4 }}>
                <Box sx={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: 1.5,
                  p: 2,
                  borderRadius: 2,
                  background: formStatus.isDuplicateChecking 
                    ? 'rgba(255, 152, 0, 0.1)' 
                    : 'rgba(76, 175, 80, 0.1)',
                  border: formStatus.isDuplicateChecking 
                    ? '1px solid rgba(255, 152, 0, 0.2)' 
                    : '1px solid rgba(76, 175, 80, 0.2)'
                }}>
                  {formStatus.isDuplicateChecking ? (
                    <LinearProgress sx={{ width: 20, height: 20 }} />
                  ) : (
                    <WarningIcon sx={{ color: 'success.main', fontSize: 20 }} />
                  )}
                  <Box>
                    <Typography variant="body2" sx={{ fontWeight: 600 }}>
                      Duplicate Check
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {formStatus.isDuplicateChecking ? 'Kontrol ediliyor...' : 'Hazır'}
                    </Typography>
                  </Box>
                </Box>
              </Grid>
            </Grid>

            {/* ⚠️ Uyarı Mesajları */}
            {(validationResults.vergiNoAvailable === false || validationResults.tamUnvanSimilar?.length > 0) && (
              <Alert 
                severity="warning" 
                sx={{ 
                  mt: 3,
                  borderRadius: 2,
                  '& .MuiAlert-icon': { fontSize: 24 }
                }}
              >
                <Typography variant="body2" sx={{ fontWeight: 600 }}>
                  ⚠️ Dikkat: Benzer kayıtlar bulundu!
                </Typography>
                <Typography variant="body2">
                  Devam etmeden önce duplicate kontrolleri gözden geçirin.
                </Typography>
              </Alert>
            )}

            {formStatus.isDuplicateChecking && (
              <Alert 
                severity="info" 
                sx={{ 
                  mt: 2,
                  borderRadius: 2,
                  '& .MuiAlert-icon': { fontSize: 24 }
                }}
              >
                <Typography variant="body2">
                  🔍 Duplicate kontroller çalışıyor... Lütfen bekleyin.
                </Typography>
              </Alert>
            )}
          </CardContent>
        </Card>

        {/* 🎯 Modern Stepper */}
        <Card sx={{ 
          mb: 4, 
          background: 'rgba(255,255,255,0.95)',
          backdropFilter: 'blur(10px)',
          borderRadius: 3,
          boxShadow: '0 10px 30px rgba(0,0,0,0.1)',
          border: '1px solid rgba(255,255,255,0.2)',
          overflow: 'hidden'
        }}>
          <Box sx={{ 
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            color: 'white',
            p: 2,
            textAlign: 'center'
          }}>
            <Typography variant="h6" sx={{ fontWeight: 700 }}>
              📋 Form Adımları
            </Typography>
            <Typography variant="body2" sx={{ opacity: 0.9 }}>
              Adım {activeStep + 1} / {steps.length}
            </Typography>
          </Box>
          
          <CardContent sx={{ p: 3 }}>
            <Stepper 
              activeStep={activeStep} 
              orientation="horizontal"
              sx={{ 
                '& .MuiStepConnector-root': {
                  top: '50%',
                  left: 'calc(-50% + 30px)',
                  right: 'calc(50% + 30px)',
                  '& .MuiStepConnector-line': {
                    borderTopWidth: 3,
                    borderColor: 'rgba(103, 126, 234, 0.3)',
                    borderRadius: 2
                  }
                },
                '& .MuiStepConnector-active .MuiStepConnector-line': {
                  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                  borderColor: 'transparent'
                },
                '& .MuiStepConnector-completed .MuiStepConnector-line': {
                  background: 'linear-gradient(135deg, #4caf50 0%, #2e7d32 100%)',
                  borderColor: 'transparent'
                }
              }}
            >
              {steps.map((step, index) => (
                <Step key={step.label} completed={completed[index]}>
                  <StepLabel
                    StepIconComponent={({ active, completed }) => (
                      <UltraProfessionalStepIcon 
                        active={active} 
                        completed={completed} 
                        icon={step.icon} 
                      />
                    )}
                  >
                    <Box sx={{ mt: 2, textAlign: 'center' }}>
                      <Typography 
                        variant="body1" 
                        sx={{ 
                          fontWeight: completed || activeStep === index ? 700 : 500,
                          color: completed || activeStep === index ? 'primary.main' : 'text.primary',
                          mb: 0.5
                        }}
                      >
                        {step.label}
                      </Typography>
                      <Typography 
                        variant="caption" 
                        color="text.secondary"
                        sx={{ 
                          display: 'block',
                          lineHeight: 1.3,
                          maxWidth: 120,
                          mx: 'auto'
                        }}
                      >
                        {step.description}
                      </Typography>
                      
                      {/* 📊 Adım durumu */}
                      <Box sx={{ mt: 1 }}>
                        {completed[index] && (
                          <Chip 
                            label="✅ Tamamlandı"
                            size="small"
                            color="success"
                            variant="filled"
                            sx={{ fontSize: '0.7rem', height: 20 }}
                          />
                        )}
                        {activeStep === index && !completed[index] && (
                          <Chip 
                            label="🔄 Aktif"
                            size="small"
                            color="primary"
                            variant="filled"
                            sx={{ fontSize: '0.7rem', height: 20 }}
                          />
                        )}
                        {!completed[index] && activeStep !== index && (
                          <Chip 
                            label="⏳ Bekliyor"
                            size="small"
                            color="default"
                            variant="outlined"
                            sx={{ fontSize: '0.7rem', height: 20 }}
                          />
                        )}
                      </Box>
                    </Box>
                  </StepLabel>
                </Step>
              ))}
            </Stepper>
          </CardContent>
        </Card>

        {/* 📝 Modern Form İçeriği */}
        <Card sx={{ 
          background: 'rgba(255,255,255,0.95)',
          backdropFilter: 'blur(10px)',
          borderRadius: 3,
          boxShadow: '0 10px 30px rgba(0,0,0,0.1)',
          border: '1px solid rgba(255,255,255,0.2)',
          overflow: 'hidden'
        }}>
          {/* 📋 Form Header */}
          <Box sx={{ 
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            color: 'white',
            p: 3
          }}>
            <Typography variant="h5" sx={{ fontWeight: 700, mb: 1 }}>
              {steps[activeStep]?.icon} {steps[activeStep]?.label}
            </Typography>
            <Typography variant="body2" sx={{ opacity: 0.9 }}>
              {steps[activeStep]?.description}
            </Typography>
          </Box>

          {/* 📝 Form Content */}
          <CardContent sx={{ p: 4 }}>
            <Box sx={{ 
              minHeight: '400px',
              '& .MuiTextField-root': {
                '& .MuiOutlinedInput-root': {
                  borderRadius: 2,
                  transition: 'all 0.3s ease',
                  '&:hover': {
                    boxShadow: '0 4px 12px rgba(103, 126, 234, 0.2)'
                  },
                  '&.Mui-focused': {
                    boxShadow: '0 4px 20px rgba(103, 126, 234, 0.3)',
                    '& fieldset': {
                      borderWidth: 2,
                      borderColor: '#667eea'
                    }
                  }
                },
                '& .MuiInputLabel-root': {
                  fontWeight: 600
                },
                '& .MuiFormHelperText-root': {
                  fontSize: '0.75rem',
                  fontWeight: 500
                }
              },
              '& .MuiCard-root': {
                borderRadius: 3,
                boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                transition: 'all 0.3s ease',
                '&:hover': {
                  boxShadow: '0 8px 24px rgba(0,0,0,0.15)',
                  transform: 'translateY(-2px)'
                }
              }
            }}>
              {renderStepContent(activeStep)}
            </Box>
          </CardContent>
          
          {/* 🔄 Modern Navigasyon */}
          <Box sx={{ 
            background: 'linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%)',
            borderTop: '1px solid rgba(0,0,0,0.1)',
            p: 3, 
            display: 'flex', 
            justifyContent: 'space-between',
            alignItems: 'center'
          }}>
            {/* 🔙 Geri Butonu */}
            <Button
              onClick={activeStep === 0 ? () => navigate('/firmalar') : handleBack}
              startIcon={<BackIcon />}
              variant="outlined"
              size="large"
              sx={{
                borderRadius: 3,
                px: 3,
                py: 1.5,
                borderColor: 'grey.400',
                color: 'grey.700',
                fontWeight: 600,
                '&:hover': {
                  borderColor: 'grey.600',
                  backgroundColor: 'grey.50',
                  transform: 'translateY(-1px)',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.15)'
                }
              }}
            >
              {activeStep === 0 ? '🚫 İptal' : '⬅️ Geri'}
            </Button>
            
            {/* 📊 Orta Alan - Adım Bilgisi */}
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              {/* 🗑️ Draft Temizle Butonu */}
              {!isEdit && activeStep === 0 && (
                <Button
                  onClick={handleClearForm}
                  variant="outlined"
                  color="error"
                  size="small"
                  startIcon={<ClearIcon />}
                  sx={{ 
                    borderRadius: 2,
                    px: 2,
                    '&:hover': {
                      transform: 'translateY(-1px)',
                      boxShadow: '0 4px 12px rgba(244, 67, 54, 0.3)'
                    }
                  }}
                >
                  🗑️ Formu Temizle
                </Button>
              )}
              
              {/* 🔍 Arama Butonu */}
              <Button
                onClick={handleSearchRecord}
                variant="outlined"
                size="small"
                startIcon={<SearchIcon />}
                sx={{ 
                  borderRadius: 2,
                  px: 2,
                  borderColor: 'grey.400',
                  color: 'grey.700',
                  fontWeight: 600,
                  '&:hover': {
                    borderColor: 'grey.600',
                    backgroundColor: 'grey.50',
                    transform: 'translateY(-1px)',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.15)'
                  }
                }}
              >
                Arama Yap
              </Button>

              {/* 📈 Progress Indicator */}
              <Box sx={{ textAlign: 'center' }}>
                <Typography variant="body2" sx={{ fontWeight: 600, color: 'text.secondary' }}>
                  Adım {activeStep + 1} / {steps.length}
                </Typography>
                <LinearProgress 
                  variant="determinate" 
                  value={((activeStep + 1) / steps.length) * 100}
                  sx={{ 
                    width: 120,
                    height: 6,
                    borderRadius: 3,
                    mt: 0.5,
                    bgcolor: 'grey.200',
                    '& .MuiLinearProgress-bar': {
                      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                      borderRadius: 3
                    }
                  }}
                />
              </Box>
            </Box>

            {/* 💾 ESKİ PANEL TARZI KAYDET/TEMİZLE BUTONLARI */}
            <Box sx={{ display: 'flex', gap: 2, justifyContent: 'center', mt: 3 }}>
              <Button
                onClick={handleSubmit}
                variant="contained"
                size="large"
                startIcon={loading ? null : <SaveIcon />}
                disabled={loading}
                sx={{
                  borderRadius: 2,
                  px: 6,
                  py: 1.5,
                  background: 'linear-gradient(135deg, #2196f3 0%, #1976d2 100%)',
                  fontWeight: 600,
                  fontSize: '1rem',
                  textTransform: 'none',
                  minWidth: 150,
                  '&:hover': {
                    background: 'linear-gradient(135deg, #42a5f5 0%, #2196f3 100%)',
                    transform: 'translateY(-1px)',
                    boxShadow: '0 4px 12px rgba(33, 150, 243, 0.4)'
                  }
                }}
              >
                {loading ? 'Kaydediliyor...' : 'Kaydet'}
              </Button>
              
              <Button
                onClick={handleClearForm}
                variant="outlined"
                size="large"
                startIcon={<ClearIcon />}
                sx={{
                  borderRadius: 2,
                  px: 6,
                  py: 1.5,
                  borderColor: '#ff9800',
                  color: '#ff9800',
                  fontWeight: 600,
                  fontSize: '1rem',
                  textTransform: 'none',
                  minWidth: 150,
                  background: 'linear-gradient(135deg, #fff3e0 0%, #ffe0b2 100%)',
                  '&:hover': {
                    borderColor: '#f57c00',
                    color: '#f57c00',
                    background: 'linear-gradient(135deg, #ffcc02 0%, #ff9800 100%)',
                    transform: 'translateY(-1px)'
                  }
                }}
              >
                Formu Temizle
              </Button>
            </Box>

            {/* ➡️ Stepper Navigation */}
            <Box sx={{ display: 'flex', gap: 2, mt: 2 }}>
              {activeStep === steps.length - 1 ? null : (
                <Button
                  onClick={handleNext}
                  variant="contained"
                  endIcon={<ForwardIcon />}
                  size="medium"
                  sx={{
                    borderRadius: 2,
                    px: 3,
                    py: 1,
                    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                    fontWeight: 600,
                    fontSize: '0.9rem',
                    textTransform: 'none',
                    '&:hover': {
                      background: 'linear-gradient(135deg, #7c8ceb 0%, #8b5fb5 100%)',
                      transform: 'translateY(-1px)'
                    }
                  }}
                >
                  ➡️ İleri
                </Button>
              )}
            </Box>
          </Box>
        </Card>
        </Box> {/* MaxWidth container kapanışı */}
      </Box> {/* App container kapanışı */}
    </>
  );
};

export default FirmaForm; 