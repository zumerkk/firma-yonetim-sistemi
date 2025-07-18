// 🏢 Professional Firma Management System - COMPACT EDITION
// Clean, efficient, and business-focused design

import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Typography,
  Button,
  Card,
  CardContent,
  Grid,
  TextField,
  MenuItem,
  Chip,
  IconButton,
  Tooltip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Alert,
  Snackbar,
  CircularProgress,
  FormControl,
  InputLabel,
  Select,
  InputAdornment,
  Paper,
  Collapse,
  Stack,
  Divider
} from '@mui/material';
import {
  DataGrid,
  GridToolbarContainer,
  GridToolbarFilterButton,
  GridToolbarDensitySelector,
  GridToolbarColumnsButton
} from '@mui/x-data-grid';
import {
  Business as BusinessIcon,
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Search as SearchIcon,
  Refresh as RefreshIcon,
  FilterList as FilterListIcon,
  Clear as ClearIcon,
  Visibility as VisibilityIcon,
  GetApp as GetAppIcon,
  LocationOn as LocationOnIcon,
  Person as PersonIcon,
  ExpandMore as ExpandMoreIcon,
  ExpandLess as ExpandLessIcon,
  CloudUpload as CloudUploadIcon // Import icon eklendi
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { useFirma } from '../../contexts/FirmaContext';
import { useAuth } from '../../contexts/AuthContext';
import { TURKEY_CITIES } from '../../data/turkeyData';
import * as XLSX from 'xlsx';
import ExcelJS from 'exceljs';
import { importExcel, downloadTemplate } from '../../services/firmaService'; // Import servislerini ekledim

const FirmaList = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { 
    firmalar, 
    loading, 
    fetchFirmalar, 
    deleteFirma, 
    searchFirmalar,
    searchResults, // Arama sonuçları için eklendi
    clearSearchResults, // Arama sonuçlarını temizlemek için eklendi
    fetchStats,
    filters,
    setFilters,
    resetFilters
  } = useFirma();

  // 🎯 State Management - Simplified
  const [localLoading, setLocalLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRows, setSelectedRows] = useState([]);
  const [deleteDialog, setDeleteDialog] = useState({ open: false, firmaId: null, firmaAdi: '' });
  const [notification, setNotification] = useState({ open: false, message: '', severity: 'success' });
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [exportLoading, setExportLoading] = useState(false);
  const [importDialog, setImportDialog] = useState(false); // Import dialog state
  const [importLoading, setImportLoading] = useState(false); // Import loading state

  // 📊 Arama durumuna göre doğru veriyi seç
  const displayData = searchQuery.trim().length >= 2 ? (searchResults || []) : (firmalar || []);

  // 📢 Notification Helper
  const showNotification = useCallback((message, severity = 'success') => {
    setNotification({ open: true, message, severity });
  }, []);

  // 🔍 Search Handler
  const handleSearch = useCallback(async () => {
    if (searchQuery.trim().length < 2) return;
    
    setLocalLoading(true);
    try {
      await searchFirmalar(searchQuery);
    } catch (error) {
      showNotification('Arama işlemi başarısız: ' + error.message, 'error');
    } finally {
      setLocalLoading(false);
    }
  }, [searchQuery, searchFirmalar, showNotification]);

  // 🔄 Data Loading
  useEffect(() => {
    const loadData = async () => {
      await Promise.all([
        fetchFirmalar(),
        fetchStats()
      ]);
    };
    loadData();
  }, [fetchFirmalar, fetchStats]);

  // 🔍 Real-time Search with Debouncing
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (searchQuery.trim().length >= 2) {
        handleSearch();
      } else if (searchQuery.trim().length === 0) {
        clearSearchResults(); // Arama sonuçlarını temizle
        fetchFirmalar();
      }
    }, 500);

    return () => clearTimeout(timeoutId);
  }, [searchQuery, fetchFirmalar, handleSearch, clearSearchResults]);

  // 🔄 Refresh Handler
  const handleRefresh = async () => {
    setLocalLoading(true);
    await fetchFirmalar();
    setLocalLoading(false);
    showNotification('Veriler yenilendi');
  };

  // 🗑️ Delete Handler
  const handleDelete = async () => {
    try {
      await deleteFirma(deleteDialog.firmaId);
      setDeleteDialog({ open: false, firmaId: null, firmaAdi: '' });
      showNotification('Firma başarıyla silindi');
      await fetchFirmalar();
    } catch (error) {
      showNotification('Silme işlemi başarısız: ' + error.message, 'error');
    }
  };

  // 📤 Professional Excel Export - SIMPLIFIED
  const handleExcelExport = async () => {
    setExportLoading(true);
    try {
      const exportData = selectedRows.length > 0 
        ? displayData.filter(firma => selectedRows.includes(firma._id))
        : displayData;

      await generateBusinessExcel(exportData);
      showNotification(`${exportData.length} firma Excel formatında dışa aktarıldı`);
    } catch (error) {
      showNotification('Excel dışa aktarım başarısız: ' + error.message, 'error');
    } finally {
      setExportLoading(false);
    }
  };

  // 📥 CSV/Excel Import Handler
  const handleFileImport = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    setImportLoading(true);
    try {
      const result = await importExcel(file);
      if (result.success) {
        showNotification(result.message || 'Veriler başarıyla içe aktarıldı');
        await fetchFirmalar(); // Listeyi yenile
        setImportDialog(false);
      } else {
        showNotification(result.message || 'İçe aktarım başarısız', 'error');
      }
    } catch (error) {
      showNotification('İçe aktarım hatası: ' + error.message, 'error');
    } finally {
      setImportLoading(false);
      event.target.value = ''; // Input'u temizle
    }
  };

  // 📥 Template İndirme Handler
  const handleDownloadTemplate = async () => {
    try {
      const result = await downloadTemplate();
      if (result.success) {
        showNotification('Şablon başarıyla indirildi');
      } else {
        showNotification(result.message || 'Şablon indirilemedi', 'error');
      }
    } catch (error) {
      showNotification('Şablon indirme hatası: ' + error.message, 'error');
    }
  };

  // 📊 Professional Business Excel Generator with ExcelJS - YELLOW HEADERS
  const generateBusinessExcel = async (data) => {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Firma Listesi', {
      pageSetup: { orientation: 'landscape', fitToPage: true }
    });
    
    // Complete headers including all database fields
    const headers = [
      'Firma ID', 'Vergi No/TC', 'Tam Ünvan', 'Adres', 'İl', 'İlçe',
      'KEP Adresi', 'Firma Telefon', 'Firma Email', 'Firma Website',
      'Yabancı Sermayeli', 'Ana Faaliyet Konusu', 
      'ETUYS Yetki Bitiş', 'DYS Yetki Bitiş', 'İlk İrtibat Kişisi', 
      'Yetkili 1 Ad Soyad', 'Yetkili 1 Telefon', 'Yetkili 1 Telefon 2', 
      'Yetkili 1 Email', 'Yetkili 1 Email 2',
      'Yetkili 2 Ad Soyad', 'Yetkili 2 Telefon', 'Yetkili 2 Telefon 2', 
      'Yetkili 2 Email', 'Yetkili 2 Email 2',
      'Notlar', 'Oluşturma Tarihi'
    ];

    // 🎨 Add headers with YELLOW styling
    const headerRow = worksheet.addRow(headers);
    headerRow.eachCell((cell, colNumber) => {
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFFFFF00' } // Bright Yellow
      };
      cell.font = {
        bold: true,
        color: { argb: 'FF000000' }, // Black text
        size: 11,
        name: 'Calibri'
      };
      cell.alignment = {
        horizontal: 'center',
        vertical: 'middle',
        wrapText: true
      };
      cell.border = {
        top: { style: 'thin', color: { argb: 'FF000000' } },
        left: { style: 'thin', color: { argb: 'FF000000' } },
        bottom: { style: 'thin', color: { argb: 'FF000000' } },
        right: { style: 'thin', color: { argb: 'FF000000' } }
      };
    });

    // Set header row height
    headerRow.height = 30;

    // 📊 Add data rows
    data.forEach(firma => {
      const row = worksheet.addRow([
        firma.firmaId || '',
        firma.vergiNoTC || '',
        firma.tamUnvan || '',
        firma.adres || '',
        firma.firmaIl || '',
        firma.firmaIlce || '',
        firma.kepAdresi || '',
        firma.firmaTelefon || '',
        firma.firmaEmail || '',
        firma.firmaWebsite || '',
        firma.yabanciSermayeli ? 'EVET' : 'HAYIR',
        firma.anaFaaliyetKonusu || '',
        firma.etuysYetkiBitisTarihi ? new Date(firma.etuysYetkiBitisTarihi).toLocaleDateString('tr-TR') : '',
        firma.dysYetkiBitisTarihi ? new Date(firma.dysYetkiBitisTarihi).toLocaleDateString('tr-TR') : '',
        firma.ilkIrtibatKisi || '',
        // Yetkili 1
        firma.yetkiliKisiler?.[0]?.adSoyad || '',
        firma.yetkiliKisiler?.[0]?.telefon1 || '',
        firma.yetkiliKisiler?.[0]?.telefon2 || '',
        firma.yetkiliKisiler?.[0]?.eposta1 || '',
        firma.yetkiliKisiler?.[0]?.eposta2 || '',
        // Yetkili 2
        firma.yetkiliKisiler?.[1]?.adSoyad || '',
        firma.yetkiliKisiler?.[1]?.telefon1 || '',
        firma.yetkiliKisiler?.[1]?.telefon2 || '',
        firma.yetkiliKisiler?.[1]?.eposta1 || '',
        firma.yetkiliKisiler?.[1]?.eposta2 || '',
        firma.notlar || '',
        new Date(firma.createdAt).toLocaleDateString('tr-TR')
      ]);

      // Style data rows
      row.eachCell((cell, colNumber) => {
        cell.border = {
          top: { style: 'thin', color: { argb: 'FFE0E0E0' } },
          left: { style: 'thin', color: { argb: 'FFE0E0E0' } },
          bottom: { style: 'thin', color: { argb: 'FFE0E0E0' } },
          right: { style: 'thin', color: { argb: 'FFE0E0E0' } }
        };
        cell.alignment = {
          vertical: 'middle',
          wrapText: true
        };
        cell.font = {
          size: 10,
          name: 'Calibri'
        };
      });
      row.height = 25;
    });

    // 📏 Set column widths
    const columnWidths = [
      12, 15, 40, 30, 12, 15, // A-F
      25, 15, 25, 20, // G-J (KEP, Tel, Email, Website)
      15, 25, // K-L (Yabancı, Faaliyet)
      15, 15, 20, // M-O (ETUYS, DYS, İrtibat)
      20, 15, 15, 25, 25, // P-T (Yetkili 1)
      20, 15, 15, 25, 25, // U-Y (Yetkili 2)
      30, 15 // Z-AA (Notlar, Tarih)
    ];

    worksheet.columns = columnWidths.map((width, index) => ({
      key: String.fromCharCode(65 + index),
      width: width
    }));

    // 🎯 Add AutoFilter
    worksheet.autoFilter = 'A1:AA1';

    // 🧊 Freeze first row
    worksheet.views = [
      { state: 'frozen', ySplit: 1 }
    ];

    // 📊 Create professional summary sheet
    const summarySheet = workbook.addWorksheet('Özet', {
      pageSetup: { orientation: 'portrait', fitToPage: true }
    });

    // Summary title
    const titleRow = summarySheet.addRow(['📊 FİRMA LİSTESİ ÖZETİ']);
    titleRow.getCell(1).font = { bold: true, size: 16, color: { argb: 'FF2E7D32' } };
    titleRow.getCell(1).alignment = { horizontal: 'center' };
    summarySheet.mergeCells('A1:B1');

    summarySheet.addRow(['']); // Empty row

    // Summary data with styling
    const summaryData = [
      ['Toplam Firma Sayısı', data.length],
      ['Aktif Firmalar', data.filter(f => f.aktif !== false).length],
      ['Yabancı Sermayeli', data.filter(f => f.yabanciSermayeli).length],
      ['ETUYS Yetkili', data.filter(f => f.etuysYetkiBitisTarihi).length],
      ['DYS Yetkili', data.filter(f => f.dysYetkiBitisTarihi).length],
      [''],
      ['📅 Raporlama Tarihi', new Date().toLocaleDateString('tr-TR')],
      ['⏰ Oluşturma Zamanı', new Date().toLocaleString('tr-TR')]
    ];

    summaryData.forEach(([label, value]) => {
      if (label === '') {
        summarySheet.addRow(['']);
        return;
      }
      
      const row = summarySheet.addRow([label, value]);
      row.getCell(1).font = { bold: true, color: { argb: 'FF1976D2' } };
      row.getCell(2).font = { bold: true, color: { argb: 'FF388E3C' } };
      
      if (label.includes('📅') || label.includes('⏰')) {
        row.getCell(1).font = { bold: true, color: { argb: 'FFE65100' } };
      }
    });

    // Set column widths for summary
    summarySheet.columns = [
      { width: 25 },
      { width: 20 }
    ];

    // 💾 Generate and download file
    const fileName = `Firma_Listesi_${new Date().toISOString().split('T')[0]}.xlsx`;
    
    try {
      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], { 
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' 
      });
      
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Excel export error:', error);
      throw error;
    }
  };

  // 🎨 Compact DataGrid Columns
  const columns = [
    {
      field: 'firmaId',
      headerName: 'Firma ID',
      width: 110,
      renderCell: (params) => (
        <Chip 
          label={params.value}
          size="small"
          color="primary"
          variant="outlined"
          sx={{ fontFamily: 'monospace', fontSize: '0.75rem' }}
        />
      )
    },
    {
      field: 'vergiNoTC',
      headerName: 'Vergi No/TC',
      width: 130,
      renderCell: (params) => (
        <Typography variant="body2" sx={{ fontFamily: 'monospace', fontSize: '0.8rem' }}>
          {params.value}
        </Typography>
      )
    },
    {
      field: 'tamUnvan',
      headerName: 'Tam Ünvan',
      width: 280,
      renderCell: (params) => (
        <Tooltip title={params.value}>
          <Typography 
            variant="body2" 
            sx={{ 
              fontWeight: 500,
              fontSize: '0.8rem',
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
      field: 'firmaIl',
      headerName: 'İl',
      width: 90,
      renderCell: (params) => (
        <Chip 
          icon={<LocationOnIcon sx={{ fontSize: 14 }} />}
          label={params.value}
          size="small"
          color="secondary"
          variant="outlined"
          sx={{ fontSize: '0.7rem' }}
        />
      )
    },
    {
      field: 'firmaIlce',
      headerName: 'İlçe',
      width: 110,
      renderCell: (params) => (
        <Typography variant="body2" sx={{ fontSize: '0.8rem' }}>
          {params.value || '-'}
        </Typography>
      )
    },
    {
      field: 'ilkIrtibatKisi',
      headerName: 'İrtibat Kişisi',
      width: 140,
      renderCell: (params) => (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
          <PersonIcon sx={{ fontSize: 14, color: 'text.secondary' }} />
          <Typography variant="body2" sx={{ fontSize: '0.8rem' }}>
            {params.value || '-'}
          </Typography>
        </Box>
      )
    },
    {
      field: 'yetkiliKisiler',
      headerName: 'Yetkili İletişim',
      width: 180,
      renderCell: (params) => {
        const yetkili = params.value?.[0];
        if (!yetkili) return <Typography variant="body2" sx={{ fontSize: '0.8rem' }}>-</Typography>;
        
        return (
          <Box>
            <Typography variant="body2" sx={{ fontSize: '0.8rem', fontWeight: 500 }}>
              {yetkili.adSoyad}
            </Typography>
            <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.7rem' }}>
              {yetkili.telefon}
            </Typography>
          </Box>
        );
      }
    },
    {
      field: 'etuysYetkiBitisTarihi',
      headerName: 'ETYUS Bitiş',
      width: 110,
      renderCell: (params) => {
        if (!params.value) return <Typography variant="body2" sx={{ fontSize: '0.8rem' }}>-</Typography>;
        
        const date = new Date(params.value);
        const today = new Date();
        const diffTime = date - today;
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        
        let color = 'default';
        if (diffDays < 0) color = 'error';
        else if (diffDays <= 30) color = 'warning';
        else color = 'success';
        
        return (
          <Chip
            label={date.toLocaleDateString('tr-TR')}
            size="small"
            color={color}
            sx={{ fontSize: '0.7rem' }}
          />
        );
      }
    },
    {
      field: 'actions',
      headerName: 'İşlemler',
      width: 120,
      sortable: false,
      renderCell: (params) => (
        <Box sx={{ display: 'flex', gap: 0.5 }}>
          <Tooltip title="Görüntüle">
            <IconButton 
              size="small" 
              onClick={() => navigate(`/firmalar/${params.row._id}`)}
            >
              <VisibilityIcon sx={{ fontSize: 16 }} />
            </IconButton>
          </Tooltip>
          <Tooltip title="Düzenle">
            <IconButton 
              size="small" 
              onClick={() => navigate(`/firmalar/duzenle/${params.row._id}`)}
            >
              <EditIcon sx={{ fontSize: 16 }} />
            </IconButton>
          </Tooltip>
          <Tooltip title="Sil">
            <IconButton 
              size="small" 
              color="error"
              onClick={() => setDeleteDialog({ 
                open: true, 
                firmaId: params.row._id, 
                firmaAdi: params.row.tamUnvan 
              })}
            >
              <DeleteIcon sx={{ fontSize: 16 }} />
            </IconButton>
          </Tooltip>
        </Box>
      )
    }
  ];

  // 🛠️ Custom DataGrid Toolbar
  const CustomToolbar = () => (
    <GridToolbarContainer sx={{ p: 1 }}>
      <GridToolbarFilterButton size="small" />
      <GridToolbarDensitySelector size="small" />
      <GridToolbarColumnsButton size="small" />
    </GridToolbarContainer>
  );

  return (
    <Box sx={{ 
      width: '100%', 
      height: '100vh',
      p: { xs: 1.5, sm: 2 },
      bgcolor: '#f8fafc'
    }}>
      {/* 📋 Compact Header */}
      <Paper sx={{ p: 2, mb: 2, borderRadius: 2 }}>
        <Box sx={{ 
          display: 'flex', 
          flexDirection: { xs: 'column', md: 'row' },
          justifyContent: 'space-between', 
          alignItems: { xs: 'stretch', md: 'center' },
          gap: 2
        }}>
          <Box>
            <Typography variant="h5" sx={{ 
              fontWeight: 700, 
              color: '#1e293b',
              fontSize: { xs: '1.25rem', md: '1.5rem' },
              mb: 0.5
            }}>
              Firma Veri Yönetim Paneli
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.875rem' }}>
              Toplam {displayData?.length || 0} firma kayıtlı {searchQuery.trim().length >= 2 ? '(arama sonucu)' : ''}
            </Typography>
          </Box>
          
          <Button
            variant="contained"
            color="success"
            startIcon={<AddIcon />}
            onClick={() => navigate('/firmalar/yeni')}
            size="medium"
            sx={{ 
              borderRadius: 2,
              textTransform: 'none',
              fontWeight: 600,
              px: 2.5,
              py: 1
            }}
          >
            Yeni Firma Ekle
          </Button>
        </Box>
      </Paper>

      {/* 🔍 Advanced Search & Filters */}
      <Paper sx={{ p: 2, mb: 2, borderRadius: 2 }}>
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} md={4}>
            <TextField
              fullWidth
              size="small"
              placeholder="Vergi No, Tam Ünvan veya Firma ID ile ara..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon sx={{ fontSize: 20 }} />
                  </InputAdornment>
                ),
                sx: { fontSize: '0.875rem' }
              }}
            />
          </Grid>
          
          <Grid item xs={12} md={2}>
            <FormControl fullWidth size="small">
              <InputLabel>Durum</InputLabel>
              <Select
                value={filters.aktif || 'all'}
                label="Durum"
                onChange={(e) => setFilters({ ...filters, aktif: e.target.value })}
                sx={{ fontSize: '0.875rem' }}
              >
                <MenuItem value="all">Tümü</MenuItem>
                <MenuItem value="true">Aktif</MenuItem>
                <MenuItem value="false">Pasif</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          
          <Grid item xs={12} md={2}>
            <FormControl fullWidth size="small">
              <InputLabel>Yabancı Sermaye</InputLabel>
              <Select
                value={filters.yabanciSermayeli || 'all'}
                label="Yabancı Sermaye"
                onChange={(e) => setFilters({ ...filters, yabanciSermayeli: e.target.value })}
                sx={{ fontSize: '0.875rem' }}
              >
                <MenuItem value="all">Tümü</MenuItem>
                <MenuItem value="true">Evet</MenuItem>
                <MenuItem value="false">Hayır</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          
          <Grid item xs={12} md={4}>
            <Stack direction="row" spacing={1}>
              <Button
                variant="outlined"
                size="small"
                startIcon={showAdvancedFilters ? <ExpandLessIcon /> : <ExpandMoreIcon />}
                onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
                sx={{ borderRadius: 2, textTransform: 'none' }}
              >
                Gelişmiş Filtreler
              </Button>
              
              <Button
                variant="outlined"
                size="small"
                startIcon={<RefreshIcon />}
                onClick={handleRefresh}
                disabled={localLoading}
                sx={{ borderRadius: 2, textTransform: 'none' }}
              >
                Yenile
              </Button>
              
              <Button
                variant="contained"
                size="small"
                startIcon={exportLoading ? <CircularProgress size={16} color="inherit" /> : <GetAppIcon />}
                onClick={handleExcelExport}
                disabled={exportLoading}
                sx={{ borderRadius: 2, textTransform: 'none' }}
              >
                Excel
              </Button>

              <Button
                variant="contained"
                size="small"
                startIcon={<CloudUploadIcon />}
                onClick={() => setImportDialog(true)}
                sx={{ borderRadius: 2, textTransform: 'none', bgcolor: 'success.main', '&:hover': { bgcolor: 'success.dark' } }}
              >
                İçe Aktar
              </Button>
            </Stack>
          </Grid>
        </Grid>

        {/* Advanced Filters Collapse */}
        <Collapse in={showAdvancedFilters}>
          <Divider sx={{ my: 2 }} />
          <Grid container spacing={2}>
            <Grid item xs={12} md={3}>
              <FormControl fullWidth size="small">
                <InputLabel>İl</InputLabel>
                <Select
                  value={filters.firmaIl || ''}
                  label="İl"
                  onChange={(e) => setFilters({ ...filters, firmaIl: e.target.value })}
                  sx={{ fontSize: '0.875rem' }}
                >
                  <MenuItem value="">Tümü</MenuItem>
                  {TURKEY_CITIES.map((city) => (
                    <MenuItem key={city} value={city}>{city}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            
            <Grid item xs={12} md={3}>
              <TextField
                fullWidth
                size="small"
                label="Ana Faaliyet Konusu"
                value={filters.anaFaaliyetKonusu || ''}
                onChange={(e) => setFilters({ ...filters, anaFaaliyetKonusu: e.target.value })}
                sx={{ '& .MuiInputBase-input': { fontSize: '0.875rem' } }}
              />
            </Grid>
            
            <Grid item xs={12} md={6}>
              <Stack direction="row" spacing={1}>
                <Button
                  variant="outlined"
                  size="small"
                  startIcon={<ClearIcon />}
                  onClick={() => {
                    resetFilters();
                    setSearchQuery('');
                    clearSearchResults(); // Arama sonuçlarını da temizle
                  }}
                  sx={{ borderRadius: 2, textTransform: 'none' }}
                >
                  Filtreleri Temizle
                </Button>
                
                <Chip 
                  label={`${selectedRows.length} firma seçili`}
                  size="small"
                  color={selectedRows.length > 0 ? 'primary' : 'default'}
                  sx={{ ml: 'auto' }}
                />
              </Stack>
            </Grid>
          </Grid>
        </Collapse>
      </Paper>

      {/* 📊 Compact DataGrid */}
      <Paper sx={{ borderRadius: 2, overflow: 'hidden' }}>
        <DataGrid
          rows={displayData}
          columns={columns}
          getRowId={(row) => row._id}
          loading={loading || localLoading}
          checkboxSelection
          disableRowSelectionOnClick
          onRowSelectionModelChange={setSelectedRows}
          slots={{ toolbar: CustomToolbar }}
          sx={{
            border: 'none',
            '& .MuiDataGrid-root': {
              fontSize: '0.875rem'
            },
            '& .MuiDataGrid-cell': {
              borderBottom: '1px solid #f1f5f9',
              fontSize: '0.875rem',
              py: 0.5
            },
            '& .MuiDataGrid-columnHeader': {
              backgroundColor: '#f8fafc',
              borderBottom: '2px solid #e2e8f0',
              fontSize: '0.8rem',
              fontWeight: 600
            },
            '& .MuiDataGrid-row:hover': {
              backgroundColor: '#f8fafc'
            },
            '& .MuiDataGrid-virtualScroller': {
              height: 'calc(100vh - 320px) !important'
            }
          }}
          initialState={{
            pagination: { paginationModel: { pageSize: 25 } }
          }}
          pageSizeOptions={[25, 50, 100]}
        />
      </Paper>

      {/* 🗑️ Delete Confirmation Dialog */}
      <Dialog open={deleteDialog.open} onClose={() => setDeleteDialog({ open: false, firmaId: null, firmaAdi: '' })}>
        <DialogTitle>Firma Silme Onayı</DialogTitle>
        <DialogContent>
          <Alert severity="warning" sx={{ mb: 2 }}>
            Bu işlem geri alınamaz!
          </Alert>
          <Typography>
            <strong>{deleteDialog.firmaAdi}</strong> firmasını silmek istediğinizden emin misiniz?
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialog({ open: false, firmaId: null, firmaAdi: '' })}>
            İptal
          </Button>
          <Button onClick={handleDelete} color="error" variant="contained">
            Sil
          </Button>
        </DialogActions>
      </Dialog>

      {/* 📥 Import Dialog */}
      <Dialog open={importDialog} onClose={() => !importLoading && setImportDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <CloudUploadIcon color="primary" />
            <Typography variant="h6">Excel/CSV İçe Aktar</Typography>
          </Box>
        </DialogTitle>
        <DialogContent>
          <Box sx={{ my: 2 }}>
            {!importLoading ? (
              <>
                <Alert severity="info" sx={{ mb: 2 }}>
                  Excel (.xlsx, .xls) veya CSV dosyası yükleyebilirsiniz. 
                  Dosyanızdaki sütun başlıkları şablon ile uyumlu olmalıdır.
                </Alert>
                
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                  <Button
                    variant="outlined"
                    startIcon={<GetAppIcon />}
                    onClick={handleDownloadTemplate}
                    fullWidth
                  >
                    Örnek Şablon İndir
                  </Button>
                  
                  <input
                    accept=".xlsx,.xls,.csv"
                    style={{ display: 'none' }}
                    id="file-input"
                    type="file"
                    onChange={handleFileImport}
                    disabled={importLoading}
                  />
                  <label htmlFor="file-input">
                    <Button
                      variant="contained"
                      component="span"
                      startIcon={<CloudUploadIcon />}
                      fullWidth
                    >
                      Dosya Seç ve Yükle
                    </Button>
                  </label>
                </Box>
              </>
            ) : (
              <Box sx={{ textAlign: 'center', py: 3 }}>
                <CircularProgress size={60} sx={{ mb: 2 }} />
                <Typography variant="h6" gutterBottom>
                  Veriler İşleniyor...
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Bu işlem dosya boyutuna göre birkaç dakika sürebilir.
                  Lütfen sayfayı kapatmayın.
                </Typography>
                <Alert severity="warning" sx={{ mt: 2 }}>
                  1185 firma kaydı işleniyor. Lütfen bekleyin...
                </Alert>
              </Box>
            )}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setImportDialog(false)} disabled={importLoading}>
            {importLoading ? 'İşlem Devam Ediyor...' : 'İptal'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* 📢 Notification Snackbar */}
      <Snackbar
        open={notification.open}
        autoHideDuration={6000}
        onClose={() => setNotification({ ...notification, open: false })}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert 
          onClose={() => setNotification({ ...notification, open: false })} 
          severity={notification.severity}
          variant="filled"
        >
          {notification.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default FirmaList; 