// 🏙️ Gelişmiş İl-İlçe Seçici Bileşeni
// CSV verilerinden 81 il ve tüm ilçeleri içeren modern seçici

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Box,
  TextField,
  Autocomplete,
  Typography,
  Chip,
  Paper,
  InputAdornment,
  IconButton
} from '@mui/material';
import {
  LocationOn,
  Clear,
  Search
} from '@mui/icons-material';
import {
  REGIONAL_GROUPS,
  getCityCode,
  getDistrictCode,
  getDistrictsByCity,
  searchCities,
  searchDistricts,
  TURKEY_CITIES_WITH_CODES
} from '../data/cityDataComplete';

// Utility functions
const getCityRegion = (cityName) => {
  for (const [region, cities] of Object.entries(REGIONAL_GROUPS)) {
    if (cities.some(city => city.toLowerCase() === cityName.toLowerCase())) {
      return region;
    }
  }
  return 'Diğer';
};

interface EnhancedCitySelectorProps {
  selectedCity?: string;
  selectedDistrict?: string;
  onCityChange: (city: string, cityCode?: number) => void;
  onDistrictChange: (district: string, districtCode?: string) => void;
  className?: string;
  required?: boolean;
  showCodes?: boolean;
  // Z-index ve görünüm sorunlarını çözmek için eklenen yeni özellikler
  popperProps?: any;
  paperProps?: any;
}

// City ve District tipi için interface tanımlayalım
interface CityType {
  kod: number;
  ad: string;
  value: string;
  label: string;
}

interface DistrictType {
  kod: number;
  ad: string;
}

const EnhancedCitySelector: React.FC<EnhancedCitySelectorProps> = ({
  selectedCity = '',
  selectedDistrict = '',
  onCityChange,
  onDistrictChange,
  className = '',
  required = false,
  showCodes = true,
  popperProps = {},
  paperProps = {}
}) => {
  const [citySearchTerm, setCitySearchTerm] = useState('');
  const [districtSearchTerm, setDistrictSearchTerm] = useState('');
  const [cityOptions, setCityOptions] = useState<CityType[]>(TURKEY_CITIES_WITH_CODES);
  const [districtOptions, setDistrictOptions] = useState<DistrictType[]>([]);
  
  // İl seçeneklerini güncelle
  useEffect(() => {
    if (citySearchTerm) {
      const filtered = searchCities(citySearchTerm);
      setCityOptions(filtered);
    } else {
      setCityOptions(TURKEY_CITIES_WITH_CODES);
    }
  }, [citySearchTerm]);

  // İlçe seçeneklerini güncelle
  useEffect(() => {
    if (selectedCity) {
      const districts = getDistrictsByCity(selectedCity);
      if (districtSearchTerm) {
        const filtered = searchDistricts(selectedCity, districtSearchTerm);
        setDistrictOptions(filtered);
      } else {
        setDistrictOptions(districts);
      }
    } else {
      setDistrictOptions([]);
    }
  }, [selectedCity, districtSearchTerm]);

  const handleCityChange = useCallback((event: any, newValue: any) => {
    const cityName = newValue ? newValue.ad : '';
    onCityChange?.(cityName);
    setCitySearchTerm('');
    setDistrictSearchTerm('');
    onDistrictChange?.('');
  }, [onCityChange, onDistrictChange]);

  const handleDistrictChange = useCallback((event: any, newValue: any) => {
    const districtName = newValue ? newValue.ad : '';
    onDistrictChange?.(districtName);
    setDistrictSearchTerm('');
  }, [onDistrictChange]);

  const handleClearCity = useCallback(() => {
    onCityChange?.('');
    setCitySearchTerm('');
    setDistrictSearchTerm('');
    onDistrictChange?.('');
  }, [onCityChange, onDistrictChange]);

  const handleClearDistrict = useCallback(() => {
    onDistrictChange?.('');
    setDistrictSearchTerm('');
  }, [onDistrictChange]);

  // Autocomplete ayarları - önceden tanımla
  const cityAutocompleteProps = useMemo(() => ({
    PopperProps: {
      style: { zIndex: 9999 }
    },
    renderOption: (props: any, option: CityType) => {
      const { key, ...otherProps } = props;
      return (
        <Box component="li" key={key} {...otherProps} sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', py: 1 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Typography variant="body2" sx={{ fontWeight: 500 }}>
              {option.ad}
            </Typography>
            <Chip 
              label={getCityRegion(option.ad)} 
              size="small" 
              variant="outlined"
              sx={{ fontSize: '0.7rem', height: 20 }}
            />
          </Box>
          {showCodes && (
            <Chip 
              label={option.kod} 
              size="small" 
              sx={{ fontSize: '0.7rem', height: 20, fontFamily: 'monospace' }}
            />
          )}
        </Box>
      );
    }
  }), [showCodes]);

  const districtAutocompleteProps = useMemo(() => ({
    PopperProps: {
      style: { zIndex: 9999 }
    },
    renderOption: (props: any, option: DistrictType) => {
      const { key, ...otherProps } = props;
      return (
        <Box component="li" key={key} {...otherProps} sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', py: 1 }}>
          <Typography variant="body2" sx={{ fontWeight: 500 }}>
            {option.ad}
          </Typography>
          {showCodes && (
            <Chip 
              label={option.kod} 
              size="small" 
              sx={{ fontSize: '0.7rem', height: 20, fontFamily: 'monospace' }}
            />
          )}
        </Box>
      );
    }
  }), [showCodes]);

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      {/* İl Seçimi */}
      <Box>
        <Typography 
          variant="subtitle2" 
          sx={{ 
            mb: 1, 
            fontWeight: 600,
            color: 'text.primary',
            display: 'flex',
            alignItems: 'center',
            gap: 0.5
          }}
        >
          <LocationOn sx={{ fontSize: 16 }} />
          İl {required && <span style={{ color: 'error.main' }}>*</span>}
        </Typography>
        
        <Autocomplete
          id="city-selector"
          value={selectedCity ? cityOptions.find(city => city.ad === selectedCity) || null : null}
          onChange={handleCityChange}
          options={cityOptions}
          getOptionLabel={(option) => option.ad || ''}
          isOptionEqualToValue={(option, value) => option.ad === value.ad}
          {...cityAutocompleteProps}
          renderInput={(params) => (
            <TextField
              {...params}
              placeholder="İl seçin..."
              variant="outlined"
              size="medium"
              InputProps={{
                ...params.InputProps,
                startAdornment: (
                  <InputAdornment position="start">
                    <Search sx={{ color: 'text.secondary', fontSize: 20 }} />
                  </InputAdornment>
                ),
                endAdornment: (
                  <Box sx={{ display: 'flex', alignItems: 'center' }}>
                    {selectedCity && (
                      <IconButton
                        size="small"
                        onClick={handleClearCity}
                        sx={{ mr: 1 }}
                      >
                        <Clear sx={{ fontSize: 18 }} />
                      </IconButton>
                    )}
                    {params.InputProps.endAdornment}
                  </Box>
                )
              }}
              sx={{
                '& .MuiOutlinedInput-root': {
                  backgroundColor: selectedCity ? 'primary.50' : 'background.paper',
                  '&:hover': {
                    backgroundColor: selectedCity ? 'primary.100' : 'grey.50'
                  },
                  '&.Mui-focused': {
                    backgroundColor: 'background.paper'
                  }
                }
              }}
            />
          )}
          PaperComponent={(props) => (
            <Paper 
              {...props} 
              elevation={8}
              sx={{ 
                mt: 1, 
                maxHeight: '300px',
                overflow: 'auto',
                zIndex: 9999
              }}
            />
          )}
          noOptionsText="İl bulunamadı"
          loadingText="Yükleniyor..."
          clearOnBlur={false}
          selectOnFocus
          handleHomeEndKeys
        />
      </Box>

      {/* İlçe Seçimi */}
      <Box>
        <Typography 
          variant="subtitle2" 
          sx={{ 
            mb: 1, 
            fontWeight: 600,
            color: selectedCity ? 'text.primary' : 'text.disabled',
            display: 'flex',
            alignItems: 'center',
            gap: 0.5
          }}
        >
          <LocationOn sx={{ fontSize: 16 }} />
          İlçe {required && <span style={{ color: 'error.main' }}>*</span>}
        </Typography>
        
        <Autocomplete
          id="district-selector"
          value={selectedDistrict ? districtOptions.find(district => district.ad === selectedDistrict) || null : null}
          onChange={handleDistrictChange}
          options={districtOptions}
          getOptionLabel={(option) => option.ad || ''}
          disabled={!selectedCity}
          isOptionEqualToValue={(option, value) => option.ad === value.ad}
          {...districtAutocompleteProps}
          renderInput={(params) => (
            <TextField
              {...params}
              placeholder={selectedCity ? "İlçe seçin..." : "Önce il seçin"}
              variant="outlined"
              size="medium"
              InputProps={{
                ...params.InputProps,
                startAdornment: (
                  <InputAdornment position="start">
                    <Search sx={{ color: selectedCity ? 'text.secondary' : 'text.disabled', fontSize: 20 }} />
                  </InputAdornment>
                ),
                endAdornment: (
                  <Box sx={{ display: 'flex', alignItems: 'center' }}>
                    {selectedDistrict && (
                      <IconButton
                        size="small"
                        onClick={handleClearDistrict}
                        sx={{ mr: 1 }}
                      >
                        <Clear sx={{ fontSize: 18 }} />
                      </IconButton>
                    )}
                    {params.InputProps.endAdornment}
                  </Box>
                )
              }}
              sx={{
                '& .MuiOutlinedInput-root': {
                  backgroundColor: selectedDistrict ? 'success.50' : selectedCity ? 'background.paper' : 'grey.100',
                  '&:hover': {
                    backgroundColor: selectedDistrict ? 'success.100' : selectedCity ? 'grey.50' : 'grey.100'
                  },
                  '&.Mui-focused': {
                    backgroundColor: 'background.paper'
                  },
                  '&.Mui-disabled': {
                    backgroundColor: 'grey.100'
                  }
                }
              }}
            />
          )}
          PaperComponent={(props) => (
            <Paper 
              {...props} 
              elevation={8}
              sx={{ 
                mt: 1, 
                maxHeight: '300px',
                overflow: 'auto',
                zIndex: 9999
              }}
            />
          )}
          noOptionsText="İlçe bulunamadı"
          loadingText="Yükleniyor..."
          clearOnBlur={false}
          selectOnFocus
          handleHomeEndKeys
        />
        
        {/* İlçe sayısı bilgisi */}
        {selectedCity && districtOptions.length > 0 && (
          <Typography variant="caption" sx={{ mt: 1, color: 'text.secondary' }}>
            {districtOptions.length} ilçe mevcut
          </Typography>
        )}
      </Box>

      {/* Seçim özeti */}
      {(selectedCity || selectedDistrict) && (
        <Box sx={{ p: 2, backgroundColor: 'grey.50', borderRadius: 1 }}>
          <Typography variant="body2" sx={{ fontWeight: 600, mb: 1, color: 'text.primary' }}>
            Seçili Konum:
          </Typography>
          <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
            {selectedCity && (
              <Chip
                icon={<LocationOn sx={{ fontSize: 14 }} />}
                label={`${selectedCity}${showCodes ? ` (${getCityCode(selectedCity)})` : ''}`}
                size="small"
                color="primary"
                variant="filled"
                sx={{ fontSize: '0.75rem' }}
              />
            )}
            {selectedDistrict && (
              <Chip
                icon={<LocationOn sx={{ fontSize: 14 }} />}
                label={selectedDistrict}
                size="small"
                color="success"
                variant="filled"
                sx={{ fontSize: '0.75rem' }}
              />
            )}
          </Box>
        </Box>
      )}
      
      {/* Hidden inputs for form submission */}
      <input type="hidden" name="il" value={selectedCity} id="hidden-il" />
      <input type="hidden" name="ilce" value={selectedDistrict} id="hidden-ilce" />
      <input type="hidden" name="ilKod" value={selectedCity ? getCityCode(selectedCity)?.toString() || '' : ''} id="hidden-il-kod" />
      <input type="hidden" name="ilceKod" value={selectedDistrict && selectedCity ? getDistrictCode(selectedCity, selectedDistrict)?.toString() || '' : ''} id="hidden-ilce-kod" />
    </Box>
  );
};

export default EnhancedCitySelector;