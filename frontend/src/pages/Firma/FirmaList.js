// 📋 Firma List Page - Profesyonel Excel Benzeri Arayüz
// Modern DataGrid ile firma listesi yönetimi - ENHANCED VERSION

import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Button,
  TextField,
  InputAdornment,
  Chip,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Stack,
  IconButton,
  Tooltip,
  LinearProgress,
  Fab,
  Grid
} from '@mui/material';
import {
  DataGrid,
  GridToolbarContainer,
  GridToolbarExport,
  GridToolbarFilterButton,
  GridToolbarDensitySelector,
  GridToolbarColumnsButton
} from '@mui/x-data-grid';
import {
  Search as SearchIcon,
  Add as AddIcon,
  Upload as UploadIcon,
  Download as DownloadIcon,
  Refresh as RefreshIcon,
  Business as BusinessIcon,
  Edit as EditIcon,
  Visibility as ViewIcon,
  LocationOn as LocationIcon,
  Email as EmailIcon,
  Clear as ClearIcon,
  FilterList as FilterListIcon,
  ExpandMore as ExpandMoreIcon,
  ExpandLess as ExpandLessIcon,
  Bookmark as BookmarkIcon,
  Save as SaveIcon,
  Delete as DeleteIcon,
  AccessTime as AccessTimeIcon,
  Warning as WarningIcon,
  GetApp as GetAppIcon,
  Settings as SettingsIcon,
  Autorenew as AutorenewIcon,
  CheckCircle as CheckCircleIcon
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { useFirma } from '../../contexts/FirmaContext';
import axios from '../../utils/axios';

const FirmaList = () => {

  const navigate = useNavigate();
  const { firmalar, fetchFirmalar, loading, error, pagination, stats, fetchStats } = useFirma();
  const fileInputRef = useRef(null);
  
  // 🎯 State Yönetimi
  const [searchText, setSearchText] = useState('');
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState(null);
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [advancedFiltersOpen, setAdvancedFiltersOpen] = useState(false);
  const [selectedRows, setSelectedRows] = useState([]);
  const [bulkActionMenuOpen, setBulkActionMenuOpen] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  
  // 🔍 Gelişmiş Filtre State'leri
  const [filters, setFilters] = useState({
    firmaIl: [],
    firmaIlce: [],
    yabanciIsareti: '',
    hasKepAdresi: '',
    anaFaaliyetKonusu: '',
    yetkiliKisiVar: '',
    etuysYetkiDurumu: '', // active, expired, expiring
    dysYetkiDurumu: '', // active, expired, expiring
    etuysDateRange: { start: '', end: '' },
    dysDateRange: { start: '', end: '' },
    createdDateRange: { start: '', end: '' }
  });

  // 📊 Filtrelenmiş veriler (tüm data) - dashboardStats'tan önce tanımlanmalı
  const filteredData = useMemo(() => {
    if (!firmalar) {
      console.log('🔍 Filtreleme: Firmalar henüz yüklenmemiş');
      return [];
    }
    
    let allData = firmalar.firmalar || firmalar || [];
    console.log('📊 Toplam veri sayısı:', allData.length);
    
    // Arama filtresi uygula
    if (searchText && searchText.length >= 2) {
      const searchLower = searchText.toLowerCase();
      allData = allData.filter(firma => 
        firma.tamUnvan?.toLowerCase().includes(searchLower) ||
        firma.firmaId?.toLowerCase().includes(searchLower) ||
        firma.vergiNoTC?.includes(searchText) ||
        firma.ilkIrtibatKisi?.toLowerCase().includes(searchLower) ||
        firma.firmaIl?.toLowerCase().includes(searchLower) ||
        firma.adres?.toLowerCase().includes(searchLower)
      );
      console.log('🔍 Arama sonrası veri sayısı:', allData.length);
    }
    
    // İleri düzey filtreler burada eklenecek
    // Şimdilik temel arama filtresini ekliyoruz
    
    console.log('✅ Final filtrelenmiş veri sayısı:', allData.length);
    return allData;
  }, [firmalar, searchText]);

  // 📊 Dashboard İstatistik Kartları
  const dashboardStats = useMemo(() => {
    if (!stats) return [];
    
    return [
      {
        title: 'Toplam Firma',
        value: stats.toplamFirma || filteredData.length || 0,
        icon: <BusinessIcon />,
        color: '#1976d2',
        gradient: 'linear-gradient(135deg, #2196f3 0%, #1976d2 100%)',
        change: '+5.2%',
        changeType: 'increase'
      },
      {
        title: 'Aktif Firmalar',
        value: stats.aktifFirma || filteredData.length || 0,
        icon: <CheckCircleIcon />,
        color: '#2e7d32',
        gradient: 'linear-gradient(135deg, #4caf50 0%, #2e7d32 100%)',
        change: '+2.1%',
        changeType: 'increase'
      },
      {
        title: 'Yetki Süresi Yaklaşan',
        value: stats.etuysUyarilari?.count || 0,
        icon: <AccessTimeIcon />,
        color: '#f57c00',
        gradient: 'linear-gradient(135deg, #ff9800 0%, #f57c00 100%)',
        change: '-12.5%',
        changeType: 'decrease'
      },
      {
        title: 'Süresi Geçmiş',
        value: '8', // Bu değeri stats'tan alacağız
        icon: <WarningIcon />,
        color: '#d32f2f',
        gradient: 'linear-gradient(135deg, #f44336 0%, #d32f2f 100%)',
        change: '+3',
        changeType: 'increase'
      }
    ];
  }, [stats, filteredData]);

  // 📊 Hızlı Filtreler
  const quickFilters = [
    { 
      label: 'Süresi Geçenler', 
      icon: <WarningIcon />, 
      color: 'error',
      filter: { etuysYetkiDurumu: 'expired', dysYetkiDurumu: 'expired' } 
    },
    { 
      label: '30 Gün İçinde Bitecek', 
      icon: <AccessTimeIcon />, 
      color: 'warning',
      filter: { etuysYetkiDurumu: 'expiring', dysYetkiDurumu: 'expiring' } 
    },
    { 
      label: 'Yabancı Sermayeli', 
      icon: <BusinessIcon />, 
      color: 'info',
      filter: { yabanciIsareti: 'true' } 
    },
    { 
      label: 'KEP Adresi Var', 
      icon: <EmailIcon />, 
      color: 'success',
      filter: { hasKepAdresi: 'true' } 
    }
  ];

  // 💾 Kayıtlı Filtreler
  const [savedFilters, setSavedFilters] = useState([
    { id: 1, name: 'İstanbul Firmaları', filters: { firmaIl: ['İSTANBUL'] } },
    { id: 2, name: 'Yetki Sorunu Olanlar', filters: { etuysYetkiDurumu: 'expired' } }
  ]);

  // 🏢 Türk İlleri (Genişletilmiş)
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

  // 📊 Sayfalama State'i - MIT DataGrid limiti: max 100
  const [paginationModel, setPaginationModel] = useState({
    page: 0,
    pageSize: 50  // MIT versiyonu limiti: max 100
  });

  // 📋 Component mount olduğunda verileri yükle
  useEffect(() => {
    const loadData = async () => {
      try {
        await Promise.all([
          fetchFirmalar(),
          fetchStats()
        ]);
      } catch (error) {
        console.error('❌ Veri yükleme hatası:', error);
        
        // Token hatası varsa localStorage'ı temizle
        if (error.response?.status === 401) {
          console.log('🧹 Hatalı token temizleniyor...');
          localStorage.removeItem('token');
          localStorage.removeItem('user');
        }
      }
    };
    
    loadData();
  }, [fetchFirmalar, fetchStats]);

  // 🔄 Verileri yenile
  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await Promise.all([
        fetchFirmalar(),
        fetchStats()
      ]);
    } catch (error) {
      console.error('Refresh error:', error);
    } finally {
      setRefreshing(false);
    }
  }, [fetchFirmalar, fetchStats]);





  // 🔢 Aktif filtre sayısı
  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (searchText) count++;
    Object.entries(filters).forEach(([key, value]) => {
      if (Array.isArray(value) && value.length > 0) count++;
      else if (typeof value === 'string' && value) count++;
      else if (typeof value === 'object' && value && (value.start || value.end)) count++;
    });
    return count;
  }, [searchText, filters]);



  // 🗑️ Filtreleri temizle - useCallback ile optimize et
  const clearFilters = useCallback(() => {
    setSearchText('');
    setFilters({
      firmaIl: [],
      firmaIlce: [],
      yabanciIsareti: '',
      hasKepAdresi: '',
      anaFaaliyetKonusu: '',
      yetkiliKisiVar: '',
      etuysYetkiDurumu: '',
      dysYetkiDurumu: '',
      etuysDateRange: { start: '', end: '' },
      dysDateRange: { start: '', end: '' },
      createdDateRange: { start: '', end: '' }
    });
    setPaginationModel(prev => ({ ...prev, page: 0 }));
  }, []);

  // ✅ Toplu işlemler - useCallback ile optimize et
  const handleBulkAction = useCallback((action) => {
    console.log(`${action} işlemi seçili ${selectedRows.length} kayıt için uygulanacak`);
    // Burada toplu işlem mantığı eklenecek
    setBulkActionMenuOpen(false);
  }, [selectedRows.length]);

  // ⌨️ Kısayol tuşları
  useEffect(() => {
    const handleKeyboard = (event) => {
      // Eğer kullanıcı input alanında yazıyorsa, kısayolları devre dışı bırak
      if (event.target.tagName === 'INPUT' || event.target.tagName === 'TEXTAREA') {
        return;
      }

      // Ctrl kombinasyonları
      if (event.ctrlKey || event.metaKey) {
        switch (event.key.toLowerCase()) {
          case 'f':
            event.preventDefault();
            document.querySelector('input[placeholder*="Firma ara"]')?.focus();
            break;
          case 'a':
            event.preventDefault();
            if (filteredData.length > 0) {
              setSelectedRows(filteredData.map(row => row._id));
            }
            break;
          case 'e':
            event.preventDefault();
            if (selectedRows.length > 0) {
              handleBulkAction('export');
            }
            break;
          case 'n':
            event.preventDefault();
            navigate('/firmalar/yeni');
            break;
          default:
            break;
        }
      } else {
        // Tek tuş kısayolları
        switch (event.key) {
          case 'Delete':
            if (selectedRows.length > 0) {
              handleBulkAction('delete');
            }
            break;
          case 'F5':
            event.preventDefault();
            handleRefresh();
            break;
          case 'Escape':
            setSelectedRows([]);
            clearFilters();
            break;
          default:
            break;
        }
      }
    };

    // Event listener ekle
    document.addEventListener('keydown', handleKeyboard);

    // Cleanup
    return () => {
      document.removeEventListener('keydown', handleKeyboard);
    };
  }, [filteredData, selectedRows, navigate, handleRefresh, clearFilters, handleBulkAction]);

  // 🔍 Arama işlevi
  const handleSearch = (value) => {
    setSearchText(value);
    setPaginationModel(prev => ({ ...prev, page: 0 }));
  };

  // 🚀 Hızlı filtre uygula
  const applyQuickFilter = (quickFilter) => {
    setFilters(prev => ({ ...prev, ...quickFilter.filter }));
    setPaginationModel(prev => ({ ...prev, page: 0 }));
  };

  // 💾 Kayıtlı filtre uygula
  const applySavedFilter = (savedFilter) => {
    setFilters(prev => ({ ...prev, ...savedFilter.filters }));
    setPaginationModel(prev => ({ ...prev, page: 0 }));
  };

  // 📁 Filtre kaydet
  const saveCurrentFilter = (name) => {
    const newFilter = {
      id: Date.now(),
      name,
      filters: { ...filters }
    };
    setSavedFilters(prev => [...prev, newFilter]);
  };



  // 📤 Template indirme
  const handleDownloadTemplate = async () => {
    try {
      const response = await axios.get('/import/template', {
        responseType: 'blob'
      });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.download = 'firma-template.xlsx';
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Template indirilemedi:', error);
    }
  };

  // 📥 Excel dosyası import
  const handleFileImport = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('file', file);

    setImporting(true);
    try {
      const response = await axios.post('/import/excel', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      
      setImportResult(response.data);
      setImportDialogOpen(true);
      fetchFirmalar(); // Listeyi yenile
    } catch (error) {
      console.error('Import hatası:', error);
      setImportResult({
        success: false,
        message: error.response?.data?.message || 'Import işlemi başarısız'
      });
      setImportDialogOpen(true);
    } finally {
      setImporting(false);
      event.target.value = '';
    }
  };

  // 📊 DataGrid Sütunları - Excel Formatında
  const columns = [
    {
      field: 'firmaId',
      headerName: '🏢 FIRMA ID',
      width: 110,
      pinned: 'left',
      renderCell: (params) => (
        <Chip
          label={params.value}
          size="small"
          color="primary"
          variant="outlined"
          sx={{ fontWeight: 600 }}
        />
      )
    },
    {
      field: 'vergiNoTC',
      headerName: '🆔 VERGİ NO/TC',
      width: 130,
      align: 'center',
      headerAlign: 'center',
      renderCell: (params) => (
        <Typography variant="body2" sx={{ fontFamily: 'monospace' }}>
          {params.value || '-'}
        </Typography>
      )
    },
    {
      field: 'tamUnvan',
      headerName: '🏪 TAM ÜNVAN',
      width: 320,
      renderCell: (params) => (
        <Tooltip title={params.value} arrow>
          <Typography
            variant="body2"
            sx={{
              fontWeight: 500,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap'
            }}
          >
            {params.value}
          </Typography>
        </Tooltip>
      )
    },
    {
      field: 'adres',
      headerName: '📍 ADRES',
      width: 220,
      renderCell: (params) => (
        <Tooltip title={params.value || 'Adres girilmemiş'} arrow>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <LocationIcon fontSize="small" color="action" />
            <Typography variant="body2" noWrap>
              {params.value || '-'}
            </Typography>
          </Box>
        </Tooltip>
      )
    },
    {
      field: 'firmaIl',
      headerName: '🌍 İL',
      width: 90,
      align: 'center',
      headerAlign: 'center',
      renderCell: (params) => (
        params.value ? (
          <Chip
            label={params.value}
            size="small"
            variant="outlined"
            color="secondary"
          />
        ) : (
          <Typography variant="body2" color="text.disabled">-</Typography>
        )
      )
    },
    {
      field: 'firmaIlce',
      headerName: '🏘️ İLÇE',
      width: 110,
      align: 'center',
      headerAlign: 'center',
      renderCell: (params) => (
        <Typography variant="body2">
          {params.value || '-'}
        </Typography>
      )
    },
    {
      field: 'kepAdresi',
      headerName: '📧 KEP ADRESİ',
      width: 190,
      renderCell: (params) => (
        params.value ? (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <EmailIcon fontSize="small" color="primary" />
            <Typography variant="body2" noWrap>
              {params.value}
            </Typography>
          </Box>
        ) : (
          <Typography variant="body2" color="text.disabled">
            -
          </Typography>
        )
      )
    },
    {
      field: 'yabanciIsareti',
      headerName: '🌍 YABANCI SERMAYE',
      width: 140,
      align: 'center',
      headerAlign: 'center',
      renderCell: (params) => (
        <Chip
          label={params.value ? 'EVET' : 'HAYIR'}
          size="small"
          color={params.value ? 'warning' : 'default'}
          variant={params.value ? 'filled' : 'outlined'}
        />
      )
    },
    {
      field: 'anaFaaliyetKonusu',
      headerName: '💼 FAALİYET KONUSU',
      width: 200,
      renderCell: (params) => (
        <Tooltip title={params.value || 'Faaliyet konusu belirtilmemiş'} arrow>
          <Typography variant="body2" noWrap>
            {params.value || '-'}
          </Typography>
        </Tooltip>
      )
    },
    {
      field: 'yetkili1AdSoyad',
      headerName: '👤 YETKİLİ KİŞİ',
      width: 160,
      renderCell: (params) => {
        const yetkili = params.row.yetkiliKisiler?.[0];
        return (
          <Typography variant="body2" sx={{ fontWeight: 500 }}>
            {yetkili?.adSoyad || '-'}
          </Typography>
        );
      }
    },
    {
      field: 'yetkili1Tel1',
      headerName: '📞 TELEFON',
      width: 130,
      renderCell: (params) => {
        const yetkili = params.row.yetkiliKisiler?.[0];
        return (
          <Typography variant="body2" sx={{ fontFamily: 'monospace' }}>
            {yetkili?.telefon1 || '-'}
          </Typography>
        );
      }
    },
    {
      field: 'yetkili1Tel2',
      headerName: '📱 TELEFON 2',
      width: 130,
      renderCell: (params) => {
        const yetkili = params.row.yetkiliKisiler?.[0];
        return (
          <Typography variant="body2" sx={{ fontFamily: 'monospace' }}>
            {yetkili?.telefon2 || '-'}
          </Typography>
        );
      }
    },
    {
      field: 'yetkili1Mail1',
      headerName: '✉️ E-POSTA',
      width: 170,
      renderCell: (params) => {
        const yetkili = params.row.yetkiliKisiler?.[0];
        return yetkili?.eposta1 ? (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <EmailIcon fontSize="small" color="primary" />
            <Typography variant="body2" noWrap>
              {yetkili.eposta1}
            </Typography>
          </Box>
        ) : (
          <Typography variant="body2" color="text.disabled">-</Typography>
        );
      }
    },
    {
      field: 'yetkili1Mail2',
      headerName: '📧 E-POSTA 2',
      width: 170,
      renderCell: (params) => {
        const yetkili = params.row.yetkiliKisiler?.[0];
        return yetkili?.eposta2 ? (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <EmailIcon fontSize="small" color="secondary" />
            <Typography variant="body2" noWrap>
              {yetkili.eposta2}
            </Typography>
          </Box>
        ) : (
          <Typography variant="body2" color="text.disabled">-</Typography>
        );
      }
    },
    {
      field: 'yetkili2AdSoyad',
      headerName: 'Yetkili Kişi 2 Ad Soyad',
      width: 150,
      renderCell: (params) => {
        const yetkili = params.row.yetkiliKisiler?.[1];
        return (
          <Typography variant="body2" sx={{ fontWeight: 500 }}>
            {yetkili?.adSoyad || '-'}
          </Typography>
        );
      }
    },
    {
      field: 'yetkili2Tel1',
      headerName: 'Yetkili Kişi 2 Tel',
      width: 120,
      renderCell: (params) => {
        const yetkili = params.row.yetkiliKisiler?.[1];
        return (
          <Typography variant="body2" sx={{ fontFamily: 'monospace' }}>
            {yetkili?.telefon1 || '-'}
          </Typography>
        );
      }
    },
    {
      field: 'yetkili2Tel2',
      headerName: 'Yetkili Kişi 2 Tel2',
      width: 120,
      renderCell: (params) => {
        const yetkili = params.row.yetkiliKisiler?.[1];
        return (
          <Typography variant="body2" sx={{ fontFamily: 'monospace' }}>
            {yetkili?.telefon2 || '-'}
          </Typography>
        );
      }
    },
    {
      field: 'yetkili2Mail1',
      headerName: 'Yetkili Kişi 2 Mail',
      width: 160,
      renderCell: (params) => {
        const yetkili = params.row.yetkiliKisiler?.[1];
        return yetkili?.eposta1 ? (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <EmailIcon fontSize="small" color="primary" />
            <Typography variant="body2" noWrap>
              {yetkili.eposta1}
            </Typography>
          </Box>
        ) : (
          <Typography variant="body2" color="text.disabled">-</Typography>
        );
      }
    },
    {
      field: 'yetkili2Mail2',
      headerName: 'Yetkili Kişi 2 Mail2',
      width: 160,
      renderCell: (params) => {
        const yetkili = params.row.yetkiliKisiler?.[1];
        return yetkili?.eposta2 ? (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <EmailIcon fontSize="small" color="secondary" />
            <Typography variant="body2" noWrap>
              {yetkili.eposta2}
            </Typography>
          </Box>
        ) : (
          <Typography variant="body2" color="text.disabled">-</Typography>
        );
      }
    },
    {
      field: 'ilkIrtibatKisi',
      headerName: 'İlk İrtibat Kişisi',
      width: 150,
      renderCell: (params) => (
        <Typography variant="body2" sx={{ fontWeight: 500 }}>
          {params.value || '-'}
        </Typography>
      )
    },
    {
      field: 'etuysYetkiBitis',
      headerName: 'ETUYS Yetki Bitiş',
      width: 120,
      align: 'center',
      headerAlign: 'center',
      renderCell: (params) => {
        if (!params.value) return <Typography variant="body2" color="text.disabled">-</Typography>;
        
        const date = new Date(params.value);
        const now = new Date();
        const isExpired = date < now;
        const daysLeft = Math.ceil((date - now) / (1000 * 60 * 60 * 24));
        
        return (
          <Box sx={{ textAlign: 'center' }}>
            <Typography 
              variant="body2" 
              sx={{ 
                fontSize: '0.75rem',
                color: isExpired ? 'error.main' : daysLeft < 30 ? 'warning.main' : 'text.primary'
              }}
            >
              {date.toLocaleDateString('tr-TR')}
            </Typography>
            {isExpired ? (
              <Chip label="SÜREİ" size="small" color="error" sx={{ fontSize: '0.6rem', height: 16 }} />
            ) : daysLeft < 30 && (
              <Chip label={`${daysLeft}g`} size="small" color="warning" sx={{ fontSize: '0.6rem', height: 16 }} />
            )}
          </Box>
        );
      }
    },
    {
      field: 'dysYetkiBitis',
      headerName: 'DYS Yetki Bitiş',
      width: 120,
      align: 'center',
      headerAlign: 'center',
      renderCell: (params) => {
        if (!params.value) return <Typography variant="body2" color="text.disabled">-</Typography>;
        
        const date = new Date(params.value);
        const now = new Date();
        const isExpired = date < now;
        const daysLeft = Math.ceil((date - now) / (1000 * 60 * 60 * 24));
        
        return (
          <Box sx={{ textAlign: 'center' }}>
            <Typography 
              variant="body2" 
              sx={{ 
                fontSize: '0.75rem',
                color: isExpired ? 'error.main' : daysLeft < 30 ? 'warning.main' : 'text.primary'
              }}
            >
              {date.toLocaleDateString('tr-TR')}
            </Typography>
            {isExpired ? (
              <Chip label="SÜREİ" size="small" color="error" sx={{ fontSize: '0.6rem', height: 16 }} />
            ) : daysLeft < 30 && (
              <Chip label={`${daysLeft}g`} size="small" color="warning" sx={{ fontSize: '0.6rem', height: 16 }} />
            )}
          </Box>
        );
      }
    },
    {
      field: 'actions',
      headerName: 'İşlemler',
      width: 120,
      align: 'center',
      headerAlign: 'center',
      sortable: false,
      filterable: false,
      pinned: 'right',
      renderCell: (params) => (
        <Stack direction="row" spacing={0.5}>
          <Tooltip title="Görüntüle">
            <IconButton
              size="small"
              onClick={() => navigate(`/firmalar/${params.row._id}`)}
              color="primary"
            >
              <ViewIcon fontSize="small" />
            </IconButton>
          </Tooltip>
          <Tooltip title="Düzenle">
            <IconButton
              size="small"
              onClick={() => navigate(`/firmalar/${params.row._id}/duzenle`)}
              color="secondary"
            >
              <EditIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        </Stack>
      )
    }
  ];

  // 🛠️ Custom Toolbar
  const CustomToolbar = () => (
    <GridToolbarContainer>
      <GridToolbarColumnsButton />
      <GridToolbarFilterButton />
      <GridToolbarDensitySelector />
      <GridToolbarExport />
    </GridToolbarContainer>
  );

      return (
      <Box role="main" aria-labelledby="page-title">
        {/* ♿ Erişilebilirlik Bilgileri - Screen Reader için */}
        <Box 
          id="search-help-text" 
          aria-hidden="true" 
          sx={{ position: 'absolute', left: '-9999px' }}
        >
          Firma aramak için firma ID, ünvan, vergi numarası, adres veya yetkili kişi bilgilerini yazabilirsiniz.
        </Box>
        
        <Box 
          id="table-description" 
          aria-hidden="true" 
          sx={{ position: 'absolute', left: '-9999px' }}
        >
          Bu tablo {filteredData.length} firma kaydını Excel formatında göstermektedir. 
          Sütunları sıralayabilir, filtreleyebilir ve seçili kayıtlar üzerinde toplu işlemler yapabilirsiniz.
        </Box>

        {/* 📊 Dashboard İstatistik Kartları */}
      {dashboardStats.length > 0 && (
        <Grid container spacing={3} sx={{ mb: 4 }}>
          {dashboardStats.map((stat, index) => (
            <Grid item xs={12} sm={6} md={3} key={index}>
              <Card 
                className="glass-card"
                sx={{ 
                  height: '100%',
                  background: stat.gradient,
                  color: 'white',
                  position: 'relative',
                  overflow: 'hidden',
                  '&:hover': {
                    transform: 'translateY(-4px)',
                    boxShadow: `0 8px 25px rgba(0,0,0,0.15)`,
                  },
                  transition: 'all 0.3s ease-in-out',
                  border: 'none'
                }}
              >
                <CardContent sx={{ p: 3 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
                    <Box>
                      <Typography variant="h3" component="div" sx={{ fontWeight: 700, mb: 0.5 }}>
                        {typeof stat.value === 'number' ? stat.value.toLocaleString('tr-TR') : stat.value}
                      </Typography>
                      <Typography variant="body2" sx={{ opacity: 0.9, fontWeight: 500 }}>
                        {stat.title}
                      </Typography>
                    </Box>
                    <Box sx={{ 
                      p: 2, 
                      borderRadius: '50%', 
                      backgroundColor: 'rgba(255,255,255,0.2)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}>
                      {React.cloneElement(stat.icon, { sx: { fontSize: 32 } })}
                    </Box>
                  </Box>
                  
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Chip
                      label={stat.change}
                      size="small"
                      sx={{
                        backgroundColor: stat.changeType === 'increase' ? 'rgba(76, 175, 80, 0.2)' : 'rgba(244, 67, 54, 0.2)',
                        color: stat.changeType === 'increase' ? '#4caf50' : '#f44336',
                        fontWeight: 600,
                        border: `1px solid ${stat.changeType === 'increase' ? 'rgba(76, 175, 80, 0.3)' : 'rgba(244, 67, 54, 0.3)'}`
                      }}
                    />
                    <Typography variant="caption" sx={{ opacity: 0.8 }}>
                      son aya göre
                    </Typography>
                  </Box>
                </CardContent>
                
                {/* Decorative Pattern */}
                <Box sx={{
                  position: 'absolute',
                  top: -20,
                  right: -20,
                  width: 80,
                  height: 80,
                  borderRadius: '50%',
                  background: 'rgba(255,255,255,0.1)',
                  transform: 'rotate(45deg)'
                }} />
              </Card>
            </Grid>
          ))}
        </Grid>
      )}

        {/* 🎯 Profesyonel Sayfa Başlığı */}
      <Box sx={{ 
        mb: 4, 
        p: 3, 
        background: 'linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%)',
        borderRadius: 3,
        border: '1px solid #e0e0e0',
        boxShadow: '0 2px 8px rgba(0,0,0,0.05)'
      }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 2 }}>
          <Box>
            <Typography 
              id="page-title"
              variant="h4" 
              component="h1" 
              gutterBottom 
              sx={{ 
                fontWeight: 700, 
                display: 'flex', 
                alignItems: 'center', 
                gap: 2,
                background: 'linear-gradient(135deg, #2e7d32 0%, #4caf50 100%)',
                backgroundClip: 'text',
                WebkitBackgroundClip: 'text',
                color: 'transparent',
                mb: 1
              }}
            >
              <BusinessIcon 
                sx={{ 
                  fontSize: 40, 
                  color: '#4CAF50',
                  filter: 'drop-shadow(0 2px 4px rgba(76, 175, 80, 0.3))'
                }}
                aria-hidden="true"
              />
              📊 Firma Yönetim Sistemi
            </Typography>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap' }}>
              <Chip 
                label={`${pagination?.toplamSayisi || 0} firma kayıtlı`} 
                color="primary" 
                variant="filled"
                size="medium"
                sx={{ fontWeight: 600 }}
              />
              <Chip 
                label="22 sütunlu Excel formatı" 
                color="success" 
                variant="outlined"
                size="medium"
              />
              <Chip 
                label={`${activeFilterCount} aktif filtre`} 
                color={activeFilterCount > 0 ? "warning" : "default"} 
                variant="outlined"
                size="medium"
              />
              {selectedRows.length > 0 && (
                <Chip 
                  label={`${selectedRows.length} seçili kayıt`} 
                  color="secondary" 
                  variant="filled"
                  size="medium"
                />
              )}
            </Box>
          </Box>
          
          <Stack direction="row" spacing={2}>
            <Button
              variant="outlined"
              startIcon={<SettingsIcon />}
              size="medium"
              sx={{ 
                borderRadius: 2,
                textTransform: 'none',
                fontWeight: 600
              }}
            >
              Ayarlar
            </Button>
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={() => navigate('/firmalar/yeni')}
              size="large"
              sx={{ 
                borderRadius: 2,
                textTransform: 'none',
                fontWeight: 600,
                background: 'linear-gradient(135deg, #4CAF50 0%, #45a049 100%)',
                boxShadow: '0 4px 12px rgba(76, 175, 80, 0.3)',
                '&:hover': {
                  background: 'linear-gradient(135deg, #45a049 0%, #388e3c 100%)',
                  boxShadow: '0 6px 16px rgba(76, 175, 80, 0.4)',
                  transform: 'translateY(-1px)'
                }
              }}
            >
              ➕ Yeni Firma Ekle
            </Button>
          </Stack>
        </Box>
      </Box>

      {/* 🔍 Gelişmiş Arama ve Filtreler */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          {/* Ana Arama Çubuğu */}
          <Grid container spacing={2} alignItems="center" sx={{ mb: 2 }}>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                placeholder="🔍 Firma ara... (ID, ünvan, vergi no, adres, yetkili kişi)"
                value={searchText}
                onChange={(e) => handleSearch(e.target.value)}
                inputProps={{
                  'aria-label': 'Firma arama kutusu',
                  'aria-describedby': 'search-help-text'
                }}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <SearchIcon color="primary" aria-hidden="true" />
                    </InputAdornment>
                  ),
                  endAdornment: searchText && (
                    <InputAdornment position="end">
                      <IconButton 
                        size="small" 
                        onClick={() => handleSearch('')}
                        aria-label="Arama metnini temizle"
                      >
                        <ClearIcon />
                      </IconButton>
                    </InputAdornment>
                  )
                }}
                size="small"
                sx={{
                  '& .MuiOutlinedInput-root': {
                    borderRadius: 3,
                    backgroundColor: 'background.paper'
                  }
                }}
              />
            </Grid>
            
            <Grid item xs={12} md={6}>
              <Stack direction="row" spacing={1} justifyContent="flex-end">
                <Button
                  variant={advancedFiltersOpen ? "contained" : "outlined"}
                  startIcon={<FilterListIcon />}
                  endIcon={advancedFiltersOpen ? <ExpandLessIcon /> : <ExpandMoreIcon />}
                  onClick={() => setAdvancedFiltersOpen(!advancedFiltersOpen)}
                  size="small"
                  color="primary"
                >
                  Gelişmiş Filtreler
                  {activeFilterCount > 0 && (
                    <Chip 
                      label={activeFilterCount} 
                      size="small" 
                      color="secondary" 
                      sx={{ ml: 1, height: 16, fontSize: '0.65rem' }} 
                    />
                  )}
                </Button>

                {selectedRows.length > 0 && (
                  <Button
                    variant="outlined"
                    startIcon={<SettingsIcon />}
                    onClick={() => setBulkActionMenuOpen(true)}
                    size="small"
                    color="secondary"
                  >
                    Toplu İşlem ({selectedRows.length})
                  </Button>
                )}

                <Button
                  variant="outlined"
                  startIcon={refreshing ? <AutorenewIcon className="rotating" /> : <RefreshIcon />}
                  onClick={handleRefresh}
                  disabled={refreshing}
                  size="small"
                  sx={{
                    '& .rotating': {
                      animation: 'spin 1s linear infinite'
                    },
                    '@keyframes spin': {
                      '0%': {
                        transform: 'rotate(0deg)'
                      },
                      '100%': {
                        transform: 'rotate(360deg)'
                      }
                    }
                  }}
                >
                  {refreshing ? 'Yenileniyor...' : 'Yenile'}
                </Button>
              </Stack>
            </Grid>
          </Grid>

          {/* Hızlı Filtreler */}
          <Box sx={{ mb: 2 }}>
            <Typography variant="subtitle2" gutterBottom sx={{ fontWeight: 600, color: 'text.secondary' }}>
              🚀 Hızlı Filtreler:
            </Typography>
            <Stack direction="row" spacing={1} flexWrap="wrap" gap={1}>
              {quickFilters.map((filter, index) => (
                <Chip
                  key={index}
                  icon={filter.icon}
                  label={filter.label}
                  onClick={() => applyQuickFilter(filter)}
                  color={filter.color}
                  variant="outlined"
                  size="small"
                  sx={{ cursor: 'pointer', '&:hover': { transform: 'translateY(-1px)' } }}
                />
              ))}
              
              <Button
                variant="text"
                startIcon={<ClearIcon />}
                onClick={clearFilters}
                size="small"
                color="secondary"
              >
                Tümünü Temizle
              </Button>
            </Stack>
          </Box>

          {/* Gelişmiş Filtre Paneli */}
          {advancedFiltersOpen && (
            <Box sx={{ 
              p: 3, 
              backgroundColor: 'grey.50', 
              borderRadius: 2, 
              border: '1px solid',
              borderColor: 'grey.200'
            }}>
              <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <FilterListIcon color="primary" />
                Detaylı Filtreler
              </Typography>
              
              <Grid container spacing={3}>
                {/* İl Filtreleri */}
                <Grid item xs={12} md={3}>
                  <FormControl fullWidth size="small">
                    <InputLabel>İller</InputLabel>
                    <Select
                      multiple
                      value={filters.firmaIl}
                      label="İller"
                      onChange={(e) => setFilters(prev => ({ ...prev, firmaIl: e.target.value }))}
                      renderValue={(selected) => (
                        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                          {selected.map((value) => (
                            <Chip key={value} label={value} size="small" />
                          ))}
                        </Box>
                      )}
                    >
                      {turkishCities.map((city) => (
                        <MenuItem key={city} value={city}>
                          {city}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>

                {/* Yabancı Sermaye */}
                <Grid item xs={12} md={2}>
                  <FormControl fullWidth size="small">
                    <InputLabel>Yabancı Sermaye</InputLabel>
                    <Select
                      value={filters.yabanciIsareti}
                      label="Yabancı Sermaye"
                      onChange={(e) => setFilters(prev => ({ ...prev, yabanciIsareti: e.target.value }))}
                    >
                      <MenuItem value="">Tümü</MenuItem>
                      <MenuItem value="true">✅ Evet</MenuItem>
                      <MenuItem value="false">❌ Hayır</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>

                {/* KEP Adresi */}
                <Grid item xs={12} md={2}>
                  <FormControl fullWidth size="small">
                    <InputLabel>KEP Adresi</InputLabel>
                    <Select
                      value={filters.hasKepAdresi}
                      label="KEP Adresi"
                      onChange={(e) => setFilters(prev => ({ ...prev, hasKepAdresi: e.target.value }))}
                    >
                      <MenuItem value="">Tümü</MenuItem>
                      <MenuItem value="true">📧 Var</MenuItem>
                      <MenuItem value="false">❌ Yok</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>

                {/* ETUYS Yetki Durumu */}
                <Grid item xs={12} md={2}>
                  <FormControl fullWidth size="small">
                    <InputLabel>ETUYS Yetki</InputLabel>
                    <Select
                      value={filters.etuysYetkiDurumu}
                      label="ETUYS Yetki"
                      onChange={(e) => setFilters(prev => ({ ...prev, etuysYetkiDurumu: e.target.value }))}
                    >
                      <MenuItem value="">Tümü</MenuItem>
                      <MenuItem value="active">✅ Aktif</MenuItem>
                      <MenuItem value="expiring">⚠️ Bitecek</MenuItem>
                      <MenuItem value="expired">❌ Süresi Geçmiş</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>

                {/* DYS Yetki Durumu */}
                <Grid item xs={12} md={2}>
                  <FormControl fullWidth size="small">
                    <InputLabel>DYS Yetki</InputLabel>
                    <Select
                      value={filters.dysYetkiDurumu}
                      label="DYS Yetki"
                      onChange={(e) => setFilters(prev => ({ ...prev, dysYetkiDurumu: e.target.value }))}
                    >
                      <MenuItem value="">Tümü</MenuItem>
                      <MenuItem value="active">✅ Aktif</MenuItem>
                      <MenuItem value="expiring">⚠️ Bitecek</MenuItem>
                      <MenuItem value="expired">❌ Süresi Geçmiş</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>

                {/* Ana Faaliyet Konusu */}
                <Grid item xs={12} md={3}>
                  <TextField
                    fullWidth
                    size="small"
                    label="Ana Faaliyet Konusu"
                    value={filters.anaFaaliyetKonusu}
                    onChange={(e) => setFilters(prev => ({ ...prev, anaFaaliyetKonusu: e.target.value }))}
                    placeholder="Faaliyet alanı ara..."
                  />
                </Grid>

                {/* Yetkili Kişi Durumu */}
                <Grid item xs={12} md={2}>
                  <FormControl fullWidth size="small">
                    <InputLabel>Yetkili Kişi</InputLabel>
                    <Select
                      value={filters.yetkiliKisiVar}
                      label="Yetkili Kişi"
                      onChange={(e) => setFilters(prev => ({ ...prev, yetkiliKisiVar: e.target.value }))}
                    >
                      <MenuItem value="">Tümü</MenuItem>
                      <MenuItem value="true">👤 Var</MenuItem>
                      <MenuItem value="false">❌ Yok</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>
              </Grid>

              {/* Kayıtlı Filtreler */}
              <Box sx={{ mt: 3, pt: 2, borderTop: '1px solid', borderColor: 'grey.300' }}>
                <Typography variant="subtitle2" gutterBottom sx={{ fontWeight: 600 }}>
                  💾 Kayıtlı Filtreler:
                </Typography>
                <Stack direction="row" spacing={1} flexWrap="wrap" gap={1}>
                  {savedFilters.map((savedFilter) => (
                    <Chip
                      key={savedFilter.id}
                      icon={<BookmarkIcon />}
                      label={savedFilter.name}
                      onClick={() => applySavedFilter(savedFilter)}
                      variant="outlined"
                      size="small"
                      sx={{ cursor: 'pointer' }}
                    />
                  ))}
                  <Button
                    variant="text"
                    startIcon={<SaveIcon />}
                    size="small"
                    onClick={() => {
                      const name = prompt('Filtre adı:');
                      if (name) saveCurrentFilter(name);
                    }}
                  >
                    Mevcut Filtreyi Kaydet
                  </Button>
                </Stack>
              </Box>

              {/* İşlem Butonları */}
              <Box sx={{ mt: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Stack direction="row" spacing={1}>
                  <Button
                    variant="outlined"
                    startIcon={<DownloadIcon />}
                    onClick={handleDownloadTemplate}
                    size="small"
                  >
                    📄 Template İndir
                  </Button>
                  
                  <input
                    type="file"
                    accept=".xlsx,.xls"
                    onChange={handleFileImport}
                    ref={fileInputRef}
                    style={{ display: 'none' }}
                  />
                  
                  <Button
                    variant="outlined"
                    startIcon={<UploadIcon />}
                    onClick={() => fileInputRef.current?.click()}
                    disabled={importing}
                    size="small"
                  >
                    {importing ? '⏳ İçe Aktarılıyor...' : '📤 Excel İçe Aktar'}
                  </Button>

                  <Button
                    variant="outlined"
                    startIcon={<GetAppIcon />}
                    size="small"
                    color="success"
                  >
                    📊 Excel'e Aktar
                  </Button>
                </Stack>

                <Stack direction="row" spacing={1}>
                  <Chip 
                    label={`${filteredData.length} kayıt bulundu`} 
                    color="primary" 
                    variant="filled" 
                  />
                  <Button
                    variant="text"
                    startIcon={<ClearIcon />}
                    onClick={clearFilters}
                    size="small"
                    color="error"
                  >
                    Tüm Filtreleri Temizle
                  </Button>
                </Stack>
              </Box>
            </Box>
          )}
        </CardContent>
      </Card>

      {/* 📊 DataGrid - Excel Benzeri Profesyonel Görünüm */}
      <Card sx={{ borderRadius: 3, overflow: 'hidden', boxShadow: '0 4px 20px rgba(0,0,0,0.1)' }}>
        {/* Gelişmiş Loading State */}
        {loading && (
          <Box sx={{ 
            position: 'absolute', 
            top: 0, 
            left: 0, 
            right: 0, 
            height: 4, 
            background: 'linear-gradient(90deg, #4CAF50, #81C784, #4CAF50)',
            backgroundSize: '200% 100%',
            animation: 'loading 1.5s ease-in-out infinite',
            zIndex: 1000,
            '@keyframes loading': {
              '0%': { backgroundPosition: '200% 0' },
              '100%': { backgroundPosition: '-200% 0' }
            }
          }} />
        )}
        
        <Box sx={{ height: 700, width: '100%', overflow: 'auto', paddingBottom: '20px' }}>
          {/* Boş Durum */}
          {!loading && filteredData.length === 0 ? (
            <Box sx={{ 
              height: '100%', 
              display: 'flex', 
              flexDirection: 'column', 
              alignItems: 'center', 
              justifyContent: 'center',
              textAlign: 'center',
              p: 4,
              background: 'linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%)'
            }}>
              <BusinessIcon sx={{ fontSize: 120, color: '#bdbdbd', mb: 3 }} />
              <Typography variant="h5" gutterBottom sx={{ fontWeight: 600, color: 'text.secondary' }}>
                {searchText || activeFilterCount > 0 ? 'Sonuç Bulunamadı' : 'Henüz Firma Kaydı Yok'}
              </Typography>
              <Typography variant="body1" color="text.secondary" sx={{ mb: 4, maxWidth: 400 }}>
                {searchText || activeFilterCount > 0 
                  ? 'Arama kriterlerinize uygun firma bulunamadı. Filtreleri temizleyip tekrar deneyin.'
                  : 'Sisteme henüz firma kaydı eklenmemiş. İlk firmanızı ekleyerek başlayın.'
                }
              </Typography>
              <Stack direction="row" spacing={2}>
                {(searchText || activeFilterCount > 0) ? (
                  <Button
                    variant="contained"
                    startIcon={<ClearIcon />}
                    onClick={clearFilters}
                    sx={{ borderRadius: 2 }}
                  >
                    Filtreleri Temizle
                  </Button>
                ) : (
                  <Button
                    variant="contained"
                    startIcon={<AddIcon />}
                    onClick={() => navigate('/firmalar/yeni')}
                    sx={{ 
                      borderRadius: 2,
                      background: 'linear-gradient(135deg, #4CAF50 0%, #45a049 100%)'
                    }}
                  >
                    İlk Firmayı Ekle
                  </Button>
                )}
                <Button
                  variant="outlined"
                  startIcon={<RefreshIcon />}
                  onClick={handleRefresh}
                  sx={{ borderRadius: 2 }}
                >
                  Yenile
                </Button>
              </Stack>
            </Box>
          ) : (
            <DataGrid
              rows={filteredData}
              columns={columns}
              loading={loading}
              paginationModel={paginationModel}
              onPaginationModelChange={setPaginationModel}
              pageSizeOptions={[25, 50, 100]}
              initialState={{
                pagination: {
                  paginationModel: { pageSize: 50 }
                }
              }}
              checkboxSelection
              disableRowSelectionOnClick
              onRowSelectionModelChange={setSelectedRows}
              slots={{
                toolbar: CustomToolbar,
                loadingOverlay: () => (
                  <Box 
                    role="status" 
                    aria-live="polite"
                    aria-label="Veriler yükleniyor"
                    sx={{ 
                      display: 'flex', 
                      flexDirection: 'column', 
                      alignItems: 'center', 
                      justifyContent: 'center',
                      height: '100%',
                      background: 'rgba(255,255,255,0.9)',
                      backdropFilter: 'blur(4px)'
                    }}
                  >
                    <Box sx={{ 
                      width: 40, 
                      height: 40, 
                      border: '4px solid #e0e0e0',
                      borderTop: '4px solid #4CAF50',
                      borderRadius: '50%',
                      animation: 'spin 1s linear infinite',
                      mb: 2,
                      '@keyframes spin': {
                        '0%': { transform: 'rotate(0deg)' },
                        '100%': { transform: 'rotate(360deg)' }
                      }
                    }} 
                    aria-hidden="true"
                    />
                    <Typography variant="body2" color="text.secondary">
                      Veriler yükleniyor...
                    </Typography>
                  </Box>
                )
              }}
              componentsProps={{
                baseCheckbox: {
                  'aria-label': 'Satır seç'
                },
                columnHeaderCheckbox: {
                  'aria-label': 'Tümünü seç'
                }
              }}
              aria-label="Firma listesi tablosu"
              aria-rowcount={filteredData.length}
              aria-describedby="table-description"
              sx={{
                width: '100%',
                height: '100%',
                minWidth: 800,
                border: 'none',
                marginBottom: '80px',
                '& .MuiDataGrid-root': {
                  border: 'none'
                },
                '& .MuiDataGrid-columnHeaders': {
                  background: '#f5f5f5', // Light gray background
                  borderBottom: '2px solid #e0e0e0',
                  minHeight: '52px !important',
                  '& .MuiDataGrid-columnHeaderTitle': {
                    fontWeight: 600,
                    fontSize: '0.85rem',
                    color: '#333333',
                    letterSpacing: '0.3px',
                    textTransform: 'uppercase'
                  },
                  '& .MuiDataGrid-iconButtonContainer': {
                    color: '#666666'
                  },
                  '& .MuiDataGrid-sortIcon': {
                    color: '#666666',
                    fontSize: '1.1rem'
                  },
                  '& .MuiDataGrid-menuIcon': {
                    color: '#666666'
                  },
                  '& .MuiDataGrid-columnSeparator': {
                    color: '#e0e0e0'
                  }
                },
                '& .MuiDataGrid-row': {
                  cursor: 'pointer',
                  transition: 'background-color 0.2s ease-in-out',
                  '&:nth-of-type(even)': {
                    backgroundColor: '#fafafa'
                  },
                  '&:nth-of-type(odd)': {
                    backgroundColor: 'white'
                  },
                  '&:hover': {
                    backgroundColor: '#f5f5f5 !important',
                    '& .MuiDataGrid-cell': {
                      color: '#1976d2'
                    }
                  },
                  '&.Mui-selected': {
                    backgroundColor: '#e3f2fd !important',
                    '&:hover': {
                      backgroundColor: '#bbdefb !important'
                    }
                  },
                  borderBottom: '1px solid #f0f0f0'
                },
                '& .MuiDataGrid-cell': {
                  borderColor: '#f0f0f0',
                  fontSize: '0.875rem',
                  padding: '8px 16px',
                  color: '#424242'
                },
                '& .MuiDataGrid-footerContainer': {
                  borderTop: '1px solid #e0e0e0',
                  backgroundColor: '#fafafa',
                  '& .MuiTablePagination-root': {
                    fontSize: '0.875rem',
                    color: '#666666'
                  },
                  '& .MuiTablePagination-toolbar': {
                    minHeight: '52px'
                  }
                },
                '& .MuiDataGrid-virtualScroller': {
                  backgroundColor: 'white'
                },
                '& .MuiDataGrid-pinnedColumns': {
                  backgroundColor: '#fafafa',
                  borderRight: '1px solid #e0e0e0'
                },
                '& .MuiDataGrid-pinnedColumnsLeft': {
                  boxShadow: '2px 0 4px rgba(0,0,0,0.05)',
                  zIndex: 2
                },
                '& .MuiDataGrid-pinnedColumnsRight': {
                  boxShadow: '-2px 0 4px rgba(0,0,0,0.05)',
                  zIndex: 2
                },
                '& .MuiDataGrid-overlay': {
                  backgroundColor: 'rgba(255,255,255,0.9)',
                  backdropFilter: 'blur(2px)'
                },
                '& .MuiCheckbox-root': {
                  color: '#1976d2',
                  '&.Mui-checked': {
                    color: '#1976d2'
                  }
                }
              }}
              getRowId={(row) => row._id}
              density="compact"
              scrollbarSize={10}
            />
          )}
        </Box>
      </Card>

      {/* 📊 Import Sonuçları Dialog */}
      <Dialog
        open={importDialogOpen}
        onClose={() => setImportDialogOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          {importResult?.success ? '✅ Import Başarılı' : '❌ Import Hatası'}
        </DialogTitle>
        <DialogContent>
          {importResult?.success ? (
            <Alert severity="success" sx={{ mb: 2 }}>
              <Typography variant="body1">
                <strong>{importResult.data?.basarili || 0}</strong> firma başarıyla eklendi/güncellendi
              </Typography>
              {importResult.data?.hatali > 0 && (
                <Typography variant="body2" color="warning.main">
                  {importResult.data.hatali} kayıtta hata oluştu
                </Typography>
              )}
            </Alert>
          ) : (
            <Alert severity="error">
              {importResult?.message || 'Bilinmeyen hata oluştu'}
            </Alert>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setImportDialogOpen(false)}>Kapat</Button>
        </DialogActions>
      </Dialog>

      {/* ♿ Durum Bildirimleri - Screen Reader için */}
      <Box 
        aria-live="polite" 
        aria-atomic="true"
        sx={{ position: 'absolute', left: '-9999px' }}
      >
        {loading && "Veriler yükleniyor..."}
        {!loading && filteredData.length === 0 && (searchText || activeFilterCount > 0) && "Arama kriterlerinize uygun sonuç bulunamadı"}
        {!loading && filteredData.length === 0 && !searchText && activeFilterCount === 0 && "Henüz firma kaydı bulunmuyor"}
        {!loading && filteredData.length > 0 && `${filteredData.length} firma listelendi`}
        {selectedRows.length > 0 && `${selectedRows.length} kayıt seçili`}
      </Box>

      {/* 🚨 Hata Mesajı */}
      {error && (
        <Alert severity="error" sx={{ mt: 2 }} role="alert" aria-live="assertive">
          {error}
        </Alert>
      )}

      {/* 🔧 Toplu İşlemler Menüsü */}
      <Dialog
        open={bulkActionMenuOpen}
        onClose={() => setBulkActionMenuOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle sx={{ 
          display: 'flex', 
          alignItems: 'center', 
          gap: 1,
          background: 'linear-gradient(135deg, #4CAF50 0%, #45a049 100%)',
          color: 'white'
        }}>
          <SettingsIcon />
          Toplu İşlemler ({selectedRows.length} kayıt seçili)
        </DialogTitle>
        <DialogContent sx={{ pt: 3 }}>
          <Grid container spacing={2}>
            <Grid item xs={12} md={6}>
              <Button
                fullWidth
                variant="outlined"
                startIcon={<GetAppIcon />}
                onClick={() => handleBulkAction('export')}
                sx={{ 
                  p: 2, 
                  borderRadius: 2,
                  justifyContent: 'flex-start',
                  textTransform: 'none',
                  fontSize: '1rem'
                }}
              >
                📊 Excel'e Aktar
              </Button>
            </Grid>
            <Grid item xs={12} md={6}>
              <Button
                fullWidth
                variant="outlined"
                startIcon={<EmailIcon />}
                onClick={() => handleBulkAction('email')}
                sx={{ 
                  p: 2, 
                  borderRadius: 2,
                  justifyContent: 'flex-start',
                  textTransform: 'none',
                  fontSize: '1rem'
                }}
              >
                📧 E-posta Gönder
              </Button>
            </Grid>
            <Grid item xs={12} md={6}>
              <Button
                fullWidth
                variant="outlined"
                startIcon={<EditIcon />}
                onClick={() => handleBulkAction('edit')}
                sx={{ 
                  p: 2, 
                  borderRadius: 2,
                  justifyContent: 'flex-start',
                  textTransform: 'none',
                  fontSize: '1rem'
                }}
              >
                ✏️ Toplu Düzenle
              </Button>
            </Grid>
            <Grid item xs={12} md={6}>
              <Button
                fullWidth
                variant="outlined"
                startIcon={<AccessTimeIcon />}
                onClick={() => handleBulkAction('reminder')}
                sx={{ 
                  p: 2, 
                  borderRadius: 2,
                  justifyContent: 'flex-start',
                  textTransform: 'none',
                  fontSize: '1rem'
                }}
              >
                ⏰ Hatırlatıcı Kur
              </Button>
            </Grid>
            <Grid item xs={12}>
              <Button
                fullWidth
                variant="outlined"
                startIcon={<DeleteIcon />}
                onClick={() => handleBulkAction('delete')}
                color="error"
                sx={{ 
                  p: 2, 
                  borderRadius: 2,
                  justifyContent: 'flex-start',
                  textTransform: 'none',
                  fontSize: '1rem'
                }}
              >
                🗑️ Toplu Sil
              </Button>
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions sx={{ p: 3 }}>
          <Button onClick={() => setBulkActionMenuOpen(false)} variant="outlined">
            İptal
          </Button>
        </DialogActions>
      </Dialog>

      {/* ⌨️ Kısayol Tuşları Info */}
      <Box sx={{ 
        position: 'fixed', 
        bottom: 200, 
        right: 20, 
        zIndex: 1000,
        display: { xs: 'none', md: 'block' }
      }}>
        <Tooltip 
          title={
            <Box sx={{ p: 1 }}>
              <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1 }}>⌨️ Kısayol Tuşları:</Typography>
              <Typography variant="body2">• Ctrl + F: Hızlı Arama</Typography>
              <Typography variant="body2">• Ctrl + A: Tümünü Seç</Typography>
              <Typography variant="body2">• Delete: Seçili Kayıtları Sil</Typography>
              <Typography variant="body2">• Ctrl + E: Excel'e Aktar</Typography>
              <Typography variant="body2">• Ctrl + N: Yeni Firma</Typography>
              <Typography variant="body2">• F5: Sayfayı Yenile</Typography>
            </Box>
          }
          arrow
          placement="left"
        >
          <Box sx={{
            width: 48,
            height: 48,
            borderRadius: '50%',
            background: 'linear-gradient(135deg, #4CAF50 0%, #45a049 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            boxShadow: '0 4px 12px rgba(76, 175, 80, 0.3)',
            '&:hover': {
              transform: 'scale(1.1)',
              boxShadow: '0 6px 16px rgba(76, 175, 80, 0.4)'
            },
            transition: 'all 0.2s ease-in-out'
          }}>
            <Typography variant="h6" sx={{ color: 'white', fontWeight: 700 }}>
              ⌨️
            </Typography>
          </Box>
        </Tooltip>
      </Box>

      {/* 🚀 Modern Floating Action Button */}
      <Fab
        color="primary"
        aria-label="Yeni firma ekle"
        onClick={() => navigate('/firmalar/yeni')}
        sx={{
          position: 'fixed',
          bottom: { xs: 16, md: 120 },
          right: { xs: 16, md: 24 },
          background: 'linear-gradient(135deg, #4CAF50 0%, #45a049 100%)',
          width: 64,
          height: 64,
          '&:hover': {
            background: 'linear-gradient(135deg, #45a049 0%, #388e3c 100%)',
            transform: 'scale(1.1)',
          },
          transition: 'all 0.3s ease-in-out',
          boxShadow: '0 6px 20px rgba(76, 175, 80, 0.4)',
          zIndex: 1000
        }}
      >
        <AddIcon sx={{ fontSize: 32, color: 'white' }} />
      </Fab>

      {/* 📱 Progress Indicator for Mobile */}
      {loading && (
        <LinearProgress
          sx={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            zIndex: 2000,
            height: 3,
            background: 'rgba(76, 175, 80, 0.1)',
            '& .MuiLinearProgress-bar': {
              background: 'linear-gradient(90deg, #4CAF50, #8BC34A, #4CAF50)',
              animation: 'progress-gradient 1.5s ease-in-out infinite'
            },
            '@keyframes progress-gradient': {
              '0%': { backgroundPosition: '0% 50%' },
              '50%': { backgroundPosition: '100% 50%' },
              '100%': { backgroundPosition: '0% 50%' }
            }
          }}
        />
      )}
    </Box>
  );
};

export default FirmaList; 