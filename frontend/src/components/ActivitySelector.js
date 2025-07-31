import React, { useState, useEffect, useMemo } from 'react';
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
  IconButton
} from '@mui/material';
import {
  Search,
  Clear,
  Business,
  Code
} from '@mui/icons-material';
import { YATIRIM_DATA } from '../data/yatirimData';

// NACE kodlarını parse etme fonksiyonu
const parseNaceCodes = (csvContent) => {
  const lines = csvContent.split('\n');
  const codes = [];
  
  for (let i = 1; i < lines.length; i++) { // İlk satır başlık
    const line = lines[i].trim();
    if (line) {
      // CSV'de virgül ile ayrılmış değerleri parse et
      const commaIndex = line.indexOf(',');
      if (commaIndex > 0) {
        const kod = line.substring(0, commaIndex).trim();
        const tanim = line.substring(commaIndex + 1).replace(/^"|"$/g, '').trim();
        
        if (kod && tanim) {
          codes.push({
            kod,
            tanim
          });
        }
      }
    }
  }
  
  return codes;
};

// Mock NACE kodları (gerçek CSV'den yüklenecek)
const mockNaceCodes = [
  { kod: 'A', tanim: 'TARIM, ORMANCILIK VE BALIKÇILIK' },
  { kod: '01', tanim: 'Bitkisel ve hayvansal üretim ile avcılık ve ilgili hizmet faaliyetleri' },
  { kod: '01.1', tanim: 'Tek yıllık (uzun ömürlü olmayan) bitkisel ürünlerin yetiştirilmesi' },
  { kod: '01.11', tanim: 'Tahılların (pirinç hariç), baklagillerin ve yağlı tohumların yetiştirilmesi' },
  { kod: '01.11.07', tanim: 'Baklagillerin yetiştirilmesi' },
  { kod: '01.11.12', tanim: 'Tahıl yetiştiriciliği' },
  { kod: '01.11.14', tanim: 'Yağlı tohum yetiştiriciliği' },
  { kod: '01.12', tanim: 'Çeltik (kabuklu pirinç) yetiştirilmesi' },
  { kod: '01.12.14', tanim: 'Çeltik (kabuklu pirinç) yetiştirilmesi' },
  { kod: '01.13', tanim: 'Sebze, kavun-karpuz, kök ve yumru sebzelerin yetiştirilmesi' },
  { kod: 'B', tanim: 'MADENCİLİK VE TAŞ OCAKÇILIĞI' },
  { kod: '05', tanim: 'Kömür ve linyit çıkartılması' },
  { kod: '05.1', tanim: 'Taş kömürü madenciliği' },
  { kod: '05.10', tanim: 'Taş kömürü madenciliği' },
  { kod: '05.10.01', tanim: 'Taş kömürü madenciliği' },
  { kod: 'C', tanim: 'İMALAT' },
  { kod: '10', tanim: 'Gıda ürünlerinin imalatı' },
  { kod: '10.1', tanim: 'Etin işlenmesi ve saklanması ile et ürünlerinin imalatı' }
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
  const [naceCodes, setNaceCodes] = useState(mockNaceCodes);
  const [isLoading, setIsLoading] = useState(false);

  // NACE CSV dosyasını yükle
  useEffect(() => {
    const loadNaceCodes = async () => {
      setIsLoading(true);
      try {
        const response = await fetch('/NACE_REV.2.1-ALTILI_(V3.0) - Sayfa 1.csv');
        if (response.ok) {
          const csvContent = await response.text();
          const parsedCodes = parseNaceCodes(csvContent);
          if (parsedCodes.length > 0) {
            setNaceCodes(parsedCodes);
            console.log(`NACE kodları yüklendi: ${parsedCodes.length} adet`);
          } else {
            console.warn('NACE kodları parse edilemedi, mock veriler kullanılıyor');
          }
        } else {
          console.warn('NACE CSV dosyası yüklenemedi, mock veriler kullanılıyor');
        }
      } catch (error) {
        console.warn('NACE CSV dosyası yüklenemedi, mock veriler kullanılıyor:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadNaceCodes();
  }, []);

  // Eski sistem kodları (1010-9500 arası)
  const oldSystemCodes = useMemo(() => {
    return YATIRIM_DATA.YATIRIM_KONULARI;
  }, []);

  // Filtrelenmiş seçenekler
  const filteredOptions = useMemo(() => {
    if (codeSystem === 'old') {
      if (!searchTerm) return oldSystemCodes.slice(0, 50);
      return oldSystemCodes.filter(code => 
        code.toLowerCase().includes(searchTerm.toLowerCase())
      ).slice(0, 50);
    } else {
      if (!searchTerm) return naceCodes.slice(0, 50);
      return naceCodes.filter(code => 
        code.kod.toLowerCase().includes(searchTerm.toLowerCase()) ||
        code.tanim.toLowerCase().includes(searchTerm.toLowerCase())
      ).slice(0, 50);
    }
  }, [codeSystem, searchTerm, oldSystemCodes, naceCodes]);

  const handleSystemChange = (event, newSystem) => {
    if (newSystem !== null) {
      setCodeSystem(newSystem);
      setSearchTerm('');
      onChange(''); // Sistem değiştiğinde seçimi temizle
    }
  };

  const handleSelectionChange = (event, newValue) => {
    if (newValue) {
      if (typeof newValue === 'string') {
        onChange(newValue);
      } else {
        onChange(`${newValue.kod} - ${newValue.tanim}`);
      }
    } else {
      onChange('');
    }
  };

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
            Eski Sistem (1010-9500)
          </ToggleButton>
          <ToggleButton value="nace">
            <Code sx={{ mr: 1, fontSize: 16 }} />
            NACE Kodları
          </ToggleButton>
        </ToggleButtonGroup>
      </Box>

      {/* Ana Faaliyet Seçici */}
      <Autocomplete
        value={value || null}
        onChange={handleSelectionChange}
        options={codeSystem === 'old' ? filteredOptions : filteredOptions}
        getOptionLabel={getOptionLabel}
        renderOption={renderOption}
        loading={isLoading}
        loadingText="NACE kodları yükleniyor..."
        noOptionsText={searchTerm ? "Sonuç bulunamadı" : "Arama yapın"}
        filterOptions={(x) => x} // Filtreleme manuel yapılıyor
        PaperComponent={(props) => (
          <Paper {...props} sx={{ maxHeight: 300, overflow: 'auto' }} />
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
                    onClick={() => setSearchTerm('')}
                    edge="end"
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
              placeholder={codeSystem === 'old' ? 'Eski sistem kodlarından seçin...' : 'NACE kodlarından seçin...'}
              required={required}
              error={error}
              helperText={helperText}
              onChange={(e) => setSearchTerm(e.target.value)}
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

      {/* Seçim Bilgisi */}
      {value && (
        <Box sx={{ mt: 2, p: 2, backgroundColor: 'success.light', borderRadius: 1 }}>
          <Typography variant="caption" sx={{ color: 'success.dark', fontWeight: 600 }}>
            Seçili Ana Faaliyet:
          </Typography>
          <Typography variant="body2" sx={{ color: 'success.dark', mt: 0.5 }}>
            {value}
          </Typography>
          <Chip 
            label={codeSystem === 'old' ? 'Eski Sistem' : 'NACE Kodu'} 
            size="small" 
            color="success" 
            variant="outlined"
            sx={{ mt: 1, fontSize: '0.75rem' }}
          />
        </Box>
      )}

      {/* Hidden input for form submission */}
      <input
        type="hidden"
        name="anaFaaliyetKonusu"
        value={value}
      />
    </Box>
  );
};

export default ActivitySelector;