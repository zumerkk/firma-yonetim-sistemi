// 📦 US 97 KODLARI AUTOCOMPLETE COMPONENT
// GM Teşvik Sistemi - MongoDB based performanslı arama

import React, { useState, useEffect, useCallback } from 'react';
import {
  Autocomplete,
  TextField,
  Box,
  Typography,
  Chip,
  CircularProgress,
  Paper,
  ListSubheader
} from '@mui/material';
import { Search as SearchIcon } from '@mui/icons-material';
import { debounce } from 'lodash';
import axios from '../utils/axios';

const US97AutoComplete = ({ 
  value, 
  onChange, 
  label = "🏭 US 97 Kodu", 
  placeholder = "US 97 kodu ara...",
  disabled = false,
  size = "medium",
  fullWidth = true,
  required = false,
  error = false,
  helperText = ""
}) => {
  // 🔄 State Management
  const [options, setOptions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [inputValue, setInputValue] = useState('');
  const [selectedValue, setSelectedValue] = useState(null);
  const [popularCodes, setPopularCodes] = useState([]);

  // 🎯 Value prop değiştiğinde selectedValue'yu güncelle
  useEffect(() => {
    if (value && typeof value === 'string') {
      // String kod gelirse, o kodu options'larda ara
      const foundOption = options.find(option => option.kod === value);
      if (foundOption) {
        setSelectedValue(foundOption);
      } else if (value !== selectedValue?.kod) {
        // API'den kodu getir
        const fetchCodeByKod = async () => {
          try {
            const response = await axios.get(`/us97/code/${value}`);
            if (response.data.success) {
              setSelectedValue(response.data.data);
            }
          } catch (error) {
            console.error('❌ Kod getirme hatası:', error);
            setSelectedValue(null);
          }
        };
        fetchCodeByKod();
      }
    } else if (!value) {
      setSelectedValue(null);
    }
  }, [value, options]);

  // 🔍 API'den arama yap
  const searchCodes = useCallback(async (query) => {
    if (!query || query.trim().length < 2) {
      // Arama yoksa popüler kodları göster
      setOptions(popularCodes);
      return;
    }

    setLoading(true);
    try {
      const response = await axios.get('/us97/search', {
        params: {
          q: query.trim(),
          limit: 30 // Max 30 sonuç (performans için)
        }
      });

      if (response.data.success) {
        const searchResults = response.data.data || [];
        console.log('🔍 Arama sonuçları:', query, '->', searchResults.length, 'adet');
        setOptions(searchResults);
      }
    } catch (error) {
      console.error('❌ US 97 arama hatası:', error);
      setOptions([]);
    } finally {
      setLoading(false);
    }
  }, [popularCodes]);

  // 🔥 Debounced search (500ms bekle)
  const debouncedSearch = useCallback(
    debounce((query) => {
      searchCodes(query);
    }, 500),
    [searchCodes]
  );

  // 🚀 Component mount olduğunda popüler kodları getir
  useEffect(() => {
    const fetchPopularCodes = async () => {
      try {
        const response = await axios.get('/us97/popular', {
          params: { limit: 15 }
        });
        
        if (response.data.success) {
          const popular = response.data.data || [];
          console.log('🔥 Popüler kodlar yüklendi:', popular.length, 'adet');
          setPopularCodes(popular);
          setOptions(popular); // İlk yüklemede popüler kodları göster
        }
      } catch (error) {
        console.error('❌ Popüler kodlar getirme hatası:', error);
      }
    };

    fetchPopularCodes();
  }, []);

  // 🎯 Seçilen değeri parent'a bildir
  const handleChange = (event, newValue) => {
    setSelectedValue(newValue);
    
    if (onChange) {
      onChange(newValue?.kod || '');
    }

    // Seçim yapıldığında kullanım sayısını artır
    if (newValue?.kod) {
      axios.get(`/us97/code/${newValue.kod}`).catch(err => {
        console.error('❌ Kullanım sayısı artırma hatası:', err);
      });
    }
  };

  // 🔤 Input değişikliği
  const handleInputChange = (event, newInputValue) => {
    setInputValue(newInputValue);
    debouncedSearch(newInputValue);
  };

  // 🎨 Option render fonksiyonu
  const renderOption = (props, option) => (
    <Box component="li" {...props} key={option.kod}>
      <Box sx={{ display: 'flex', flexDirection: 'column', width: '100%' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Typography variant="body2" sx={{ fontWeight: 600, color: '#2563eb' }}>
            {option.kod}
          </Typography>
          <Chip 
            label={option.kategori} 
            size="small" 
            variant="outlined"
            color="primary"
            sx={{ fontSize: '0.7rem', height: 20 }}
          />
          {option.kullanimSayisi > 0 && (
            <Chip 
              label={`${option.kullanimSayisi}x`} 
              size="small" 
              color="success"
              sx={{ fontSize: '0.6rem', height: 16 }}
            />
          )}
        </Box>
        <Typography variant="caption" sx={{ color: 'text.secondary', mt: 0.5 }}>
          {option.aciklama?.substring(0, 100)}
          {option.aciklama?.length > 100 && '...'}
        </Typography>
      </Box>
    </Box>
  );

  // 🏷️ Group header render
  const renderGroup = (params) => (
    <ListSubheader component="div" key={params.key} sx={{ 
      backgroundColor: '#f8fafc',
      fontWeight: 600,
      color: '#1976d2'
    }}>
      📂 {params.group}
    </ListSubheader>
  );

  // 🎯 Seçilen değerin display text'i
  const getOptionLabel = (option) => {
    if (typeof option === 'string') return option;
    return option ? `${option.kod} - ${option.aciklama}` : '';
  };

  // ⚖️ Option'ların eşitlik kontrolü
  const isOptionEqualToValue = (option, value) => {
    return option?.kod === value?.kod;
  };

  // 📊 Not: Options'lar zaten kategoriye göre gruplandırılıyor (groupBy prop ile)

  return (
    <Autocomplete
      value={selectedValue}
      onChange={handleChange}
      inputValue={inputValue}
      onInputChange={handleInputChange}
      options={options}
      getOptionLabel={getOptionLabel}
      isOptionEqualToValue={isOptionEqualToValue}
      renderOption={renderOption}
      groupBy={(option) => option.kategori}
      renderGroup={renderGroup}
      loading={loading}
      loadingText="🔍 Aranıyor..."
      noOptionsText={inputValue.length < 2 ? "💡 En az 2 karakter yazın" : "❌ Sonuç bulunamadı"}
      size={size}
      fullWidth={fullWidth}
      disabled={disabled}
      clearOnBlur={false}
      selectOnFocus
      handleHomeEndKeys
      freeSolo={false}
      autoHighlight
      PaperComponent={({ children, ...other }) => (
        <Paper {...other} sx={{ maxHeight: 400, overflow: 'auto' }}>
          {loading && (
            <Box sx={{ display: 'flex', justifyContent: 'center', p: 2 }}>
              <CircularProgress size={24} />
            </Box>
          )}
          {children}
        </Paper>
      )}
      renderInput={(params) => (
        <TextField
          {...params}
          label={label}
          placeholder={placeholder}
          required={required}
          error={error}
          helperText={helperText}
          InputProps={{
            ...params.InputProps,
            startAdornment: (
              <SearchIcon sx={{ color: 'action.active', mr: 1 }} />
            ),
            endAdornment: (
              <>
                {loading && <CircularProgress color="inherit" size={20} />}
                {params.InputProps.endAdornment}
              </>
            ),
          }}
          sx={{
            '& .MuiOutlinedInput-root': {
              '&:hover fieldset': {
                borderColor: '#16a085',
              },
              '&.Mui-focused fieldset': {
                borderColor: '#16a085',
              },
            },
          }}
        />
      )}
    />
  );
};

export default US97AutoComplete;