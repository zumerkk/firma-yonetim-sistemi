// 🚀 US 97 ULTRA-FAST SEARCH COMPONENT - MODAL VERSION
// Enterprise-grade modal dialog solution - No more positioning issues!

import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import {
  Box,
  TextField,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  ListItemButton,
  Typography,
  Chip,
  InputAdornment,
  IconButton,
  CircularProgress,
  Grid,
  Badge
} from '@mui/material';
import {
  Search as SearchIcon,
  Clear as ClearIcon,
  Close as CloseIcon,
  FilterList as FilterListIcon,
  Star as StarIcon,
  AccessTime as AccessTimeIcon,
  Category as CategoryIcon
} from '@mui/icons-material';
import axios from '../utils/axios';

const US97SuperSearch = ({
  value,
  onChange,
  size = "small",
  placeholder = "US97 kod seç..."
}) => {
  // 🔄 STATE MANAGEMENT
  const [searchTerm, setSearchTerm] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [allCodes, setAllCodes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedCode, setSelectedCode] = useState(null);
  const [recentCodes, setRecentCodes] = useState([]);
  const [favoriteCodes, setFavoriteCodes] = useState([]);
  const [showMode, setShowMode] = useState('all'); // 'all', 'recent', 'favorites'
  const [displayLimit, setDisplayLimit] = useState(50); // Infinite scroll için

  const inputRef = useRef(null);

  // 🎯 US 97 KODLARI YÜKLENİYOR
  const loadUS97Codes = useCallback(async () => {
    try {
      setLoading(true);
      // 🚀 Backend endpoint fix: /us97/search (baseURL zaten /api içeriyor)
      const response = await axios.get('/us97/search?limit=5000');
      const codes = response.data?.data || []; // Backend returns {success, count, data}

      setAllCodes(codes);

      // 📦 LOCAL STORAGE'DAN RECENT VE FAVORİLER
      let loadedRecent = [];
      let loadedFavorites = [];

      try {
        const stored = localStorage.getItem('us97_recent') || '[]';
        loadedRecent = JSON.parse(stored).slice(0, 10); // Son 10
        setRecentCodes(loadedRecent);
      } catch {
        setRecentCodes([]);
      }

      try {
        loadedFavorites = JSON.parse(localStorage.getItem('us97_favorites') || '[]');
        setFavoriteCodes(loadedFavorites);
      } catch {
        setFavoriteCodes([]);
      }

      if (process.env.NODE_ENV === 'development') {
        console.log('🚀 US97 Kodları Yüklendi:', {
          total: codes.length,
          recent: loadedRecent.length,
          favorites: loadedFavorites.length
        });
      }
    } catch (error) {
      console.error('🚨 US97 kodları yükleme hatası:', error);
      setAllCodes([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadUS97Codes();
  }, [loadUS97Codes]);

  // 🎯 FILTERED CODES - MEMORY OPTIMIZED
  const filteredCodes = useMemo(() => {
    let codes = [];

    // MODE'A GÖRE KODLARI SEÇ
    switch (showMode) {
      case 'recent':
        codes = recentCodes;
        break;
      case 'favorites':
        codes = favoriteCodes;
        break;
      default:
        codes = allCodes;
    }

    // SEARCH TERİM FİLTRESİ
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase().trim();
      codes = codes.filter(code =>
        code.kod?.toLowerCase().includes(term) ||
        code.aciklama?.toLowerCase().includes(term) ||
        code.bolum?.toLowerCase().includes(term)
      );
    }

    // DISPLAY LIMIT UYGULA
    return codes.slice(0, displayLimit);
  }, [allCodes, searchTerm, showMode, displayLimit, recentCodes, favoriteCodes]);

  // 🎯 CODE SELECTION HANDLER
  const handleCodeSelect = useCallback((code) => {
    setSelectedCode(code);

    // 📝 RECENT CODES'A EKLE
    const updatedRecent = [
      code,
      ...recentCodes.filter(r => r.kod !== code.kod)
    ].slice(0, 10);

    setRecentCodes(updatedRecent);
    localStorage.setItem('us97_recent', JSON.stringify(updatedRecent));

    // 🎯 PARENT COMPONENT'E BİLDİR - HER İKİ DEĞERİ DE GÖNDER!
    if (onChange) {
      onChange(code.kod, code.aciklama);
    }

    // 📱 MODAL'I KAPAT
    setIsOpen(false);
    setSearchTerm('');

    if (process.env.NODE_ENV === 'development') {
      console.log('✅ US97 Kod Seçildi:', {
        kod: code.kod,
        aciklama: code.aciklama,
        recentCount: updatedRecent.length
      });
    }
  }, [onChange, recentCodes]);

  // 🎯 SEARCH HANDLERS
  const handleClear = () => {
    setSearchTerm('');
  };

  // 🚀 INFINITE SCROLL HANDLER  
  const handleLoadMore = useCallback(() => {
    setDisplayLimit(prev => prev + 50);
  }, []);

  // 🎯 HIZLI SEÇİM HANDLERS
  const handleModeChange = useCallback((mode) => {
    setShowMode(mode);
    setDisplayLimit(50); // Reset limit when changing mode
  }, []);

  const handleCategorySelect = useCallback((category) => {
    setSearchTerm(category);
    setShowMode('all');
    setDisplayLimit(50);
  }, []);

  // 🎯 VALUE PROP DEĞİŞTİĞİNDE
  useEffect(() => {
    if (value && typeof value === 'string') {
      const foundCode = allCodes.find(code => code.kod === value);
      if (foundCode) {
        setSelectedCode(foundCode);
      } else if (allCodes.length > 0) {
        // 🔧 FIX: Kod US97 koleksiyonunda bulunamasa bile fallback obje oluştur
        // Böylece kaydedilmiş kod düzenleme ekranında görünür
        setSelectedCode({ kod: value, aciklama: '', kategori: '' });
      } else {
        // allCodes henüz yüklenmedi - yüklenince tekrar denenecek
        // Şimdilik fallback olarak value'dan geçici obje oluştur
        setSelectedCode({ kod: value, aciklama: '(yükleniyor...)', kategori: '' });
      }
    } else if (!value) {
      setSelectedCode(null);
    }
  }, [value, allCodes]);

  return (
    <>
      {/* 🚀 ENTERPRISE MODAL TRIGGER */}
      <TextField
        ref={inputRef}
        value={selectedCode ? `${selectedCode.kod}${selectedCode.aciklama ? ` - ${selectedCode.aciklama.substring(0, 40)}${selectedCode.aciklama.length > 40 ? '...' : ''}` : ''}` : (value || '')}
        onClick={() => setIsOpen(true)}
        placeholder={placeholder}
        size={size}
        fullWidth
        readOnly
        aria-label="US97 kodu seç"
        role="button"
        sx={{
          cursor: 'pointer',
          '& .MuiOutlinedInput-root': {
            backgroundColor: '#ffffff',
            fontSize: '0.875rem',
            cursor: 'pointer',
            transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
            '& fieldset': {
              borderColor: '#e5e7eb'
            },
            '&:hover': {
              backgroundColor: '#f8fafc',
              transform: 'translateY(-1px)',
              boxShadow: '0 4px 12px rgba(59, 130, 246, 0.15)',
              '& fieldset': {
                borderColor: '#3b82f6',
                borderWidth: '2px'
              }
            },
            '&.Mui-focused fieldset': {
              borderColor: '#3b82f6',
              borderWidth: '2px'
            }
          }
        }}
        InputProps={{
          startAdornment: (
            <InputAdornment position="start">
              <SearchIcon sx={{
                color: '#3b82f6',
                fontSize: '1.2rem',
                transition: 'transform 0.2s ease',
                '&:hover': {
                  transform: 'scale(1.1)'
                }
              }} />
            </InputAdornment>
          ),
          endAdornment: (
            <InputAdornment position="end">
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                {selectedCode && (
                  <Chip
                    label="Seçildi"
                    size="small"
                    color="primary"
                    sx={{ fontSize: '0.7rem', height: 20 }}
                  />
                )}
                <FilterListIcon sx={{ color: '#6b7280', fontSize: '1.1rem' }} />
              </Box>
            </InputAdornment>
          ),
        }}
      />

      {/* 🚀 ENTERPRISE MODAL DIALOG */}
      <Dialog
        open={isOpen}
        onClose={() => setIsOpen(false)}
        maxWidth="lg"
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: 3,
            minHeight: '70vh',
            maxHeight: '90vh',
            background: 'linear-gradient(135deg, rgba(255,255,255,0.98) 0%, rgba(248,250,252,0.95) 100%)',
            backdropFilter: 'blur(20px)',
            boxShadow: '0 25px 80px rgba(0, 0, 0, 0.25)',
          }
        }}
        BackdropProps={{
          sx: {
            backgroundColor: 'rgba(15, 23, 42, 0.6)',
            backdropFilter: 'blur(8px)'
          }
        }}
      >
        {/* 🎯 MODAL HEADER */}
        <DialogTitle sx={{
          background: 'linear-gradient(135deg, #3b82f6, #1d4ed8)',
          color: 'white',
          py: 3,
          position: 'relative',
          overflow: 'hidden'
        }}>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'relative', zIndex: 1 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <CategoryIcon sx={{ fontSize: '2rem' }} />
              <Box>
                <Typography variant="h5" sx={{ fontWeight: 700, mb: 0.5 }}>
                  US97 Kod Seçicisi
                </Typography>
                <Typography variant="body2" sx={{ opacity: 0.9, fontSize: '0.9rem' }}>
                  {allCodes.length}+ ürün kodu • Gelişmiş arama ve filtreleme
                </Typography>
              </Box>
            </Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Badge badgeContent={allCodes.length} color="secondary" max={9999}>
                <Chip
                  label="Toplam Kod"
                  variant="outlined"
                  sx={{
                    color: 'white',
                    borderColor: 'rgba(255,255,255,0.3)',
                    backgroundColor: 'rgba(255,255,255,0.1)'
                  }}
                />
              </Badge>
              <IconButton
                onClick={() => setIsOpen(false)}
                sx={{
                  color: 'white',
                  '&:hover': {
                    backgroundColor: 'rgba(255,255,255,0.1)'
                  }
                }}
              >
                <CloseIcon />
              </IconButton>
            </Box>
          </Box>
        </DialogTitle>

        {/* 🔍 MODAL CONTENT */}
        <DialogContent sx={{ p: 0, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
          {/* 🎯 SEARCH & FILTERS BAR */}
          <Box sx={{
            p: 3,
            borderBottom: '1px solid rgba(0,0,0,0.06)',
            background: 'rgba(248,250,252,0.5)'
          }}>
            <Grid container spacing={3} alignItems="center">
              <Grid item xs={12} md={8}>
                <TextField
                  fullWidth
                  placeholder="US97 kodu veya açıklama ara... (örn: 0111, buğday, tarım)"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  variant="outlined"
                  size="medium"
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <SearchIcon sx={{ color: '#3b82f6' }} />
                      </InputAdornment>
                    ),
                    endAdornment: searchTerm && (
                      <InputAdornment position="end">
                        <IconButton size="small" onClick={handleClear}>
                          <ClearIcon />
                        </IconButton>
                      </InputAdornment>
                    )
                  }}
                  sx={{
                    '& .MuiOutlinedInput-root': {
                      backgroundColor: '#ffffff',
                      borderRadius: 2,
                      '& fieldset': {
                        borderColor: '#e2e8f0'
                      },
                      '&:hover fieldset': {
                        borderColor: '#3b82f6'
                      },
                      '&.Mui-focused fieldset': {
                        borderColor: '#3b82f6'
                      }
                    }
                  }}
                />
              </Grid>
              <Grid item xs={12} md={4}>
                <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                  <Chip
                    icon={<AccessTimeIcon />}
                    label={`Son Kullanılan (${recentCodes.length})`}
                    onClick={() => handleModeChange('recent')}
                    color={showMode === 'recent' ? 'primary' : 'default'}
                    variant={showMode === 'recent' ? 'filled' : 'outlined'}
                    size="small"
                    sx={{ cursor: 'pointer' }}
                  />
                  <Chip
                    icon={<StarIcon />}
                    label={`Favoriler (${favoriteCodes.length})`}
                    onClick={() => handleModeChange('favorites')}
                    color={showMode === 'favorites' ? 'secondary' : 'default'}
                    variant={showMode === 'favorites' ? 'filled' : 'outlined'}
                    size="small"
                    sx={{ cursor: 'pointer' }}
                  />
                  <Chip
                    label="Tümü"
                    onClick={() => handleModeChange('all')}
                    color={showMode === 'all' ? 'primary' : 'default'}
                    variant={showMode === 'all' ? 'filled' : 'outlined'}
                    size="small"
                    sx={{ cursor: 'pointer' }}
                  />
                </Box>
              </Grid>
            </Grid>
          </Box>

          {/* 📂 CATEGORIES SECTION */}
          {showMode === 'all' && !searchTerm && (
            <Box sx={{ px: 3, py: 2, borderBottom: '1px solid rgba(0,0,0,0.06)' }}>
              <Typography variant="subtitle2" sx={{ mb: 2, color: '#4b5563', fontWeight: 600 }}>
                🏷️ Popüler Kategoriler
              </Typography>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                {[
                  { name: 'İmalat', count: 776 },
                  { name: 'Ticaret', count: 492 },
                  { name: 'Madencilik/Enerji', count: 379 },
                  { name: 'Elektrik/Su', count: 347 },
                  { name: 'Mali/Hizmet', count: 161 },
                  { name: 'Ulaştırma/İletişim', count: 160 },
                  { name: 'Sosyal Hizmetler', count: 122 },
                  { name: 'İnşaat', count: 108 }
                ].map((cat) => (
                  <Chip
                    key={cat.name}
                    label={`${cat.name} (${cat.count})`}
                    onClick={() => handleCategorySelect(cat.name)}
                    variant="outlined"
                    size="small"
                    sx={{
                      cursor: 'pointer',
                      '&:hover': {
                        backgroundColor: '#f1f5f9',
                        borderColor: '#3b82f6'
                      }
                    }}
                  />
                ))}
              </Box>
            </Box>
          )}

          {/* 📋 RESULTS LIST */}
          <Box sx={{ flex: 1, overflow: 'auto', minHeight: 0 }}>
            {loading ? (
              <Box sx={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                minHeight: 300,
                gap: 2
              }}>
                <CircularProgress size={40} sx={{ color: '#3b82f6' }} />
                <Typography variant="body2" sx={{ color: '#6b7280' }}>
                  US97 kodları yükleniyor...
                </Typography>
              </Box>
            ) : filteredCodes.length > 0 ? (
              <Box>
                {filteredCodes.map((code, index) => {
                  const isRecent = recentCodes.some(r => r.kod === code.kod);

                  return (
                    <ListItemButton
                      key={`${code.kod}-${index}`}
                      onClick={() => handleCodeSelect(code)}
                      sx={{
                        py: 3,
                        px: 3,
                        borderBottom: '1px solid #f1f5f9',
                        position: 'relative',
                        transition: 'all 0.2s ease',
                        '&:hover': {
                          backgroundColor: 'rgba(59, 130, 246, 0.04)',
                          transform: 'translateX(4px)',
                          '&::before': {
                            transform: 'scaleY(1)'
                          }
                        },
                        '&::before': {
                          content: '""',
                          position: 'absolute',
                          left: 0,
                          top: 0,
                          bottom: 0,
                          width: '4px',
                          background: 'linear-gradient(135deg, #3b82f6, #1d4ed8)',
                          transform: 'scaleY(0)',
                          transformOrigin: 'center',
                          transition: 'transform 0.2s ease'
                        }
                      }}
                    >
                      <Box sx={{ width: '100%' }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                            <Typography variant="h6" sx={{
                              fontWeight: 700,
                              color: '#1e40af',
                              fontSize: '1.1rem',
                              fontFamily: 'monospace',
                              letterSpacing: '0.5px'
                            }}>
                              {code.kod}
                            </Typography>
                            {isRecent && (
                              <Chip
                                label="YENİ"
                                size="small"
                                color="primary"
                                sx={{
                                  fontSize: '0.65rem',
                                  height: 20,
                                  fontWeight: 600
                                }}
                              />
                            )}
                          </Box>
                          <Typography variant="caption" sx={{
                            color: '#6b7280',
                            backgroundColor: '#f1f5f9',
                            px: 1.5,
                            py: 0.5,
                            borderRadius: 1,
                            fontSize: '0.7rem',
                            fontWeight: 500
                          }}>
                            {code.bolum || 'Tarım'}
                          </Typography>
                        </Box>
                        <Typography variant="body2" sx={{
                          color: '#374151',
                          fontSize: '0.9rem',
                          lineHeight: 1.5
                        }}>
                          {code.aciklama}
                        </Typography>
                      </Box>
                    </ListItemButton>
                  );
                })}

                {/* 🚀 LOAD MORE BUTTON */}
                {filteredCodes.length >= displayLimit && (
                  <Box sx={{ p: 3, textAlign: 'center' }}>
                    <Button
                      onClick={handleLoadMore}
                      variant="outlined"
                      size="large"
                      sx={{
                        borderRadius: 2,
                        px: 4,
                        py: 1.5,
                        borderColor: '#3b82f6',
                        color: '#3b82f6',
                        '&:hover': {
                          borderColor: '#1d4ed8',
                          backgroundColor: 'rgba(59, 130, 246, 0.04)'
                        }
                      }}
                    >
                      Daha Fazla Göster (+50)
                    </Button>
                  </Box>
                )}
              </Box>
            ) : (
              <Box sx={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                minHeight: 300,
                gap: 2,
                px: 3
              }}>
                <SearchIcon sx={{ fontSize: 60, color: '#cbd5e1' }} />
                <Typography variant="h6" sx={{ color: '#6b7280', textAlign: 'center' }}>
                  🔍 "{searchTerm}" için sonuç bulunamadı
                </Typography>
                <Typography variant="body2" sx={{ color: '#9ca3af', textAlign: 'center' }}>
                  Farklı kelimeler deneyin veya kategorilerden seçin
                </Typography>
              </Box>
            )}
          </Box>
        </DialogContent>

        {/* 📋 MODAL ACTIONS */}
        <DialogActions sx={{
          px: 3,
          py: 2,
          borderTop: '1px solid rgba(0,0,0,0.06)',
          backgroundColor: '#f8fafc'
        }}>
          <Button
            onClick={() => setIsOpen(false)}
            variant="outlined"
            sx={{ borderRadius: 2, px: 3 }}
          >
            İptal
          </Button>
          <Button
            onClick={() => setIsOpen(false)}
            variant="contained"
            color="primary"
            sx={{ borderRadius: 2, px: 3 }}
          >
            Kapat
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default US97SuperSearch;
