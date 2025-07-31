import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  TextField,
  Box,
  Typography,
  ToggleButton,
  ToggleButtonGroup,
  Autocomplete,
  Chip,
  Paper,
  InputAdornment,
  IconButton,
  CircularProgress,
  ListSubheader
} from '@mui/material';
import {
  Search,
  Clear,
  Business,
  Code,
  CheckCircle
} from '@mui/icons-material';
import { FixedSizeList as List } from 'react-window';
import { YATIRIM_DATA } from '../data/yatirimData';

// NACE kodlarını parse etme fonksiyonu - Geliştirilmiş CSV parsing
const parseNaceCodes = (csvContent) => {
  const lines = csvContent.split('\n');
  const codes = [];
  
  for (let i = 1; i < lines.length; i++) { // İlk satır başlık
    const line = lines[i].trim();
    if (line) {
      // CSV parsing - tırnak işaretlerini ve virgülleri doğru şekilde handle et
      const match = line.match(/^([^,]+),(.*)$/);
      if (match) {
        const kod = match[1].trim();
        let tanim = match[2].trim();
        
        // Tırnak işaretlerini temizle
        if (tanim.startsWith('"') && tanim.endsWith('"')) {
          tanim = tanim.slice(1, -1);
        }
        
        if (kod && tanim) {
          codes.push({
            kod,
            tanim,
            searchText: `${kod} ${tanim}`.toLowerCase()
          });
        }
      }
    }
  }
  
  return codes;
};

// Virtualized List Item Component
const VirtualizedListItem = ({ index, style, data }) => {
  const { options, getOptionLabel, renderOption, onSelect } = data;
  const option = options[index];
  
  return (
    <div style={style}>
      <div
        onClick={() => onSelect(option)}
        style={{
          padding: '8px 16px',
          cursor: 'pointer',
          borderBottom: '1px solid #f0f0f0',
          ':hover': {
            backgroundColor: '#f5f5f5'
          }
        }}
        onMouseEnter={(e) => {
          e.target.style.backgroundColor = '#f5f5f5';
        }}
        onMouseLeave={(e) => {
          e.target.style.backgroundColor = 'transparent';
        }}
      >
        {renderOption({ key: index }, option)}
      </div>
    </div>
  );
};

// Mock NACE kodları (gerçek CSV'den yüklenecek)
const mockNaceCodes = [
  { kod: 'A', tanim: 'TARIM, ORMANCILIK VE BALIKÇILIK', searchText: 'a tarim ormancilik ve balikçilik' },
  { kod: '01', tanim: 'Bitkisel ve hayvansal üretim ile avcılık ve ilgili hizmet faaliyetleri', searchText: '01 bitkisel ve hayvansal üretim ile avcılık ve ilgili hizmet faaliyetleri' }
];

const ActivitySelector = ({
  value = '',
  onChange,
  required = false,
  error = false,
  helperText = ''
}) => {
  const [codeSystem, setCodeSystem] = useState('old');
  const [searchTerm, setSearchTerm] = useState('');
  const [naceCodes, setNaceCodes] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [totalCodes, setTotalCodes] = useState(0);

  // NACE CSV dosyasını yükle - Geliştirilmiş loading ve error handling
  useEffect(() => {
    const loadNaceCodes = async () => {
      setIsLoading(true);
      setLoadingProgress(0);
      
      try {
        setLoadingProgress(25);
        const response = await fetch('/NACE_REV.2.1-ALTILI_(V3.0) - Sayfa 1.csv');
        
        if (response.ok) {
          setLoadingProgress(50);
          const csvContent = await response.text();
          setLoadingProgress(75);
          
          const parsedCodes = parseNaceCodes(csvContent);
          
          if (parsedCodes.length > 0) {
            setNaceCodes(parsedCodes);
            setTotalCodes(parsedCodes.length);
            setLoadingProgress(100);
            console.log(`✅ NACE kodları başarıyla yüklendi: ${parsedCodes.length} adet`);
          } else {
            console.warn('⚠️ NACE kodları parse edilemedi, mock veriler kullanılıyor');
            setNaceCodes(mockNaceCodes);
            setTotalCodes(mockNaceCodes.length);
          }
        } else {
          console.warn('⚠️ NACE CSV dosyası yüklenemedi, mock veriler kullanılıyor');
          setNaceCodes(mockNaceCodes);
          setTotalCodes(mockNaceCodes.length);
        }
      } catch (error) {
        console.error('❌ NACE CSV dosyası yüklenirken hata:', error);
        setNaceCodes(mockNaceCodes);
        setTotalCodes(mockNaceCodes.length);
      } finally {
        setIsLoading(false);
        setLoadingProgress(100);
      }
    };

    loadNaceCodes();
  }, []);

  // Eski sistem kodları (1010-9500 arası)
  const oldSystemCodes = useMemo(() => {
    return YATIRIM_DATA.YATIRIM_KONULARI;
  }, []);

  // Geliştirilmiş arama ve filtreleme - Tüm sonuçları göster
  const filteredOptions = useMemo(() => {
    if (codeSystem === 'old') {
      if (!searchTerm) return oldSystemCodes;
      const searchLower = searchTerm.toLowerCase();
      return oldSystemCodes.filter(code => 
        code.toLowerCase().includes(searchLower)
      );
    } else {
      if (!searchTerm) return naceCodes;
      const searchLower = searchTerm.toLowerCase();
      return naceCodes.filter(code => 
        code.searchText.includes(searchLower)
      );
    }
  }, [codeSystem, searchTerm, oldSystemCodes, naceCodes]);

  // Arama sonuçları istatistikleri
  const searchStats = useMemo(() => {
    const total = codeSystem === 'old' ? oldSystemCodes.length : naceCodes.length;
    const filtered = filteredOptions.length;
    return { total, filtered, hasFilter: !!searchTerm };
  }, [codeSystem, oldSystemCodes.length, naceCodes.length, filteredOptions.length, searchTerm]);

  const handleSystemChange = (event, newSystem) => {
    if (newSystem !== null) {
      setCodeSystem(newSystem);
      setSearchTerm('');
      onChange(''); // Sistem değiştiğinde seçimi temizle
    }
  };

  const handleSelectionChange = useCallback((event, newValue) => {
    if (newValue) {
      if (typeof newValue === 'string') {
        onChange(newValue);
      } else {
        onChange(`${newValue.kod} - ${newValue.tanim}`);
      }
    } else {
      onChange('');
    }
  }, [onChange]);

  const handleSearchChange = useCallback((event) => {
    setSearchTerm(event.target.value);
  }, []);

  const clearSearch = useCallback(() => {
    setSearchTerm('');
  }, []);

  const getOptionLabel = (option) => {
    if (typeof option === 'string') {
      return option;
    }
    return `${option.kod} - ${option.tanim}`;
  };

  const renderOption = (props, option) => {
    const { key, ...otherProps } = props;
    
    if (typeof option === 'string') {
      return (
        <li key={key} {...otherProps}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, width: '100%' }}>
            <Business sx={{ fontSize: 16, color: 'primary.main' }} />
            <Typography variant="body2" sx={{ flex: 1 }}>
              {option}
            </Typography>
          </Box>
        </li>
      );
    }
    
    return (
      <li key={key} {...otherProps}>
        <Box sx={{ display: 'flex', flexDirection: 'column', width: '100%', py: 0.5 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Code sx={{ fontSize: 16, color: 'secondary.main' }} />
            <Chip 
              label={option.kod} 
              size="small" 
              variant="outlined" 
              sx={{ fontSize: '0.75rem', height: 20 }}
            />
          </Box>
          <Typography variant="body2" sx={{ mt: 0.5, color: 'text.secondary', fontSize: '0.875rem' }}>
            {option.tanim}
          </Typography>
        </Box>
      </li>
    );
  };

  return (
    <Box>
      {/* Sistem Seçici */}
      <Box sx={{ mb: 2 }}>
        <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 600, color: 'text.primary' }}>
          Kod Sistemi Seçin:
        </Typography>
        <ToggleButtonGroup
          value={codeSystem}
          exclusive
          onChange={handleSystemChange}
          size="small"
          sx={{
            '& .MuiToggleButton-root': {
              px: 2,
              py: 1,
              fontSize: '0.875rem',
              fontWeight: 500,
              border: '1px solid',
              borderColor: 'divider',
              '&.Mui-selected': {
                backgroundColor: 'primary.main',
                color: 'white',
                '&:hover': {
                  backgroundColor: 'primary.dark'
                }
              }
            }
          }}
        >
          <ToggleButton value="old">
            <Business sx={{ mr: 1, fontSize: 16 }} />
            Eski Sistem ({oldSystemCodes.length} kod)
          </ToggleButton>
          <ToggleButton value="nace" disabled={isLoading}>
            <Code sx={{ mr: 1, fontSize: 16 }} />
            NACE Kodları ({totalCodes} kod)
            {isLoading && <CircularProgress size={16} sx={{ ml: 1 }} />}
          </ToggleButton>
        </ToggleButtonGroup>
      </Box>

      {/* Loading Progress */}
      {isLoading && (
        <Box sx={{ mb: 2, p: 2, backgroundColor: 'info.light', borderRadius: 1 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <CircularProgress size={20} />
            <Typography variant="body2" color="info.dark">
              NACE kodları yükleniyor... ({loadingProgress}%)
            </Typography>
          </Box>
        </Box>
      )}

      {/* Arama İstatistikleri */}
      {!isLoading && (
        <Box sx={{ mb: 2, p: 1.5, backgroundColor: 'grey.50', borderRadius: 1 }}>
          <Typography variant="caption" color="text.secondary">
            {searchStats.hasFilter 
              ? `${searchStats.filtered} sonuç bulundu (${searchStats.total} toplam)`
              : `${searchStats.total} kod mevcut`
            }
          </Typography>
        </Box>
      )}

      {/* Ana Faaliyet Seçici - Geliştirilmiş Autocomplete */}
      <Autocomplete
        value={value || null}
        onChange={handleSelectionChange}
        options={filteredOptions}
        getOptionLabel={getOptionLabel}
        renderOption={renderOption}
        loading={isLoading && codeSystem === 'nace'}
        loadingText={`NACE kodları yükleniyor... (${loadingProgress}%)`}
        noOptionsText={searchTerm ? `"${searchTerm}" için sonuç bulunamadı` : "Arama yapmaya başlayın"}
        filterOptions={(x) => x} // Filtreleme manuel yapılıyor
        ListboxProps={{
          style: {
            maxHeight: '400px',
            padding: 0
          }
        }}
        PaperComponent={(props) => (
          <Paper 
            {...props} 
            sx={{ 
              maxHeight: 450, 
              overflow: 'hidden',
              '& .MuiAutocomplete-listbox': {
                padding: 0,
                maxHeight: '400px',
                overflow: 'auto'
              }
            }} 
          />
        )}
        renderInput={(params) => {
          const inputProps = {
            ...params.InputProps,
            startAdornment: (
              <InputAdornment position="start">
                <Search sx={{ fontSize: 20, color: 'text.secondary' }} />
              </InputAdornment>
            )
          };
          
          if (searchTerm) {
            inputProps.endAdornment = (
              <>
                <InputAdornment position="end">
                  <IconButton
                    size="small"
                    onClick={clearSearch}
                    edge="end"
                    title="Aramayı temizle"
                  >
                    <Clear sx={{ fontSize: 16 }} />
                  </IconButton>
                </InputAdornment>
                {params.InputProps.endAdornment}
              </>
            );
          } else {
            inputProps.endAdornment = params.InputProps.endAdornment;
          }
          
          return (
            <TextField
              {...params}
              label={`Ana Faaliyet Konusu * (${codeSystem === 'old' ? 'Eski Sistem' : 'NACE'})`}
              placeholder={codeSystem === 'old' 
                ? 'Eski sistem kodlarından arayın ve seçin...' 
                : 'NACE kodlarından arayın ve seçin...'
              }
              required={required}
              error={error}
              helperText={helperText || (searchTerm && `"${searchTerm}" için ${filteredOptions.length} sonuç`)}
              onChange={handleSearchChange}
              InputProps={inputProps}
              sx={{
                backgroundColor: 'white',
                '& .MuiOutlinedInput-root': {
                  '&.Mui-error': {
                    backgroundColor: '#fef2f2',
                    '& fieldset': { borderColor: '#ef4444', borderWidth: 2 }
                  }
                }
              }}
            />
          );
        }}
        slotProps={{
          popper: {
            style: { zIndex: 9999 }
          }
        }}
      />

      {/* Seçim Bilgisi - Geliştirilmiş */}
      {value && (
        <Box sx={{ mt: 2, p: 2, backgroundColor: 'success.light', borderRadius: 1, border: '1px solid', borderColor: 'success.main' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
            <CheckCircle sx={{ fontSize: 16, color: 'success.dark' }} />
            <Typography variant="caption" sx={{ color: 'success.dark', fontWeight: 600 }}>
              Seçili Ana Faaliyet:
            </Typography>
          </Box>
          <Typography variant="body2" sx={{ color: 'success.dark', mb: 1, fontWeight: 500 }}>
            {value}
          </Typography>
          <Box sx={{ display: 'flex', gap: 1 }}>
            <Chip 
              label={codeSystem === 'old' ? 'Eski Sistem' : 'NACE Kodu'} 
              size="small" 
              color="success" 
              variant="outlined"
              sx={{ fontSize: '0.75rem' }}
            />
            <Chip 
              label={`${filteredOptions.length} seçenek mevcut`}
              size="small" 
              color="info" 
              variant="outlined"
              sx={{ fontSize: '0.75rem' }}
            />
          </Box>
        </Box>
      )}

      {/* Hidden input for form submission */}
      <input
        type="hidden"
        name="anaFaaliyetKonusu"
        value={value}
      />
      <input
        type="hidden"
        name="anaFaaliyetKoduSistemi"
        value={codeSystem}
      />
    </Box>
  );
};

export default ActivitySelector;