// 🌿 NACE 6-LI KOD SEÇİCİ MODAL – Advanced UX
// Özellikler: Akıllı tamamlama, kategori filtreleri, favoriler, kişiselleştirilmiş öneriler,
// gelişmiş arama eşleştirme, responsive ve modern tasarım, klavye navigasyonu.

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
  Badge,
  Tooltip,
  Accordion,
  AccordionSummary,
  AccordionDetails
} from '@mui/material';
import {
  Search as SearchIcon,
  Clear as ClearIcon,
  Category as CategoryIcon,
  Close as CloseIcon,
  FilterList as FilterListIcon,
  AccessTime as AccessTimeIcon,
  Star as StarIcon,
  StarBorder as StarBorderIcon,
  KeyboardArrowDown as KeyboardArrowDownIcon,
  KeyboardArrowUp as KeyboardArrowUpIcon,
  ExpandMore as ExpandMoreIcon
} from '@mui/icons-material';
import axios from '../utils/axios';

// 🔤 Türkçe karakter normalizasyonu ve tokenizasyon
const normalize = (s = '') => s
  .toLowerCase()
  .replace(/ç/g, 'c').replace(/ğ/g, 'g').replace(/ı/g, 'i').replace(/ö/g, 'o').replace(/ş/g, 's').replace(/ü/g, 'u');

// 🎯 Gelişmiş eşleştirme skoru: kod tam eşleşmesi > baştan eşleşme > içerme > açıklama eşleşmesi
const computeScore = (code, term) => {
  if (!term) return 0;
  const nkod = normalize(code.kod || '');
  const nacik = normalize(code.aciklama || '');
  const t = normalize(term);

  if (nkod === t) return 1000;
  if (nkod.startsWith(t)) return 600;
  if (nkod.includes(t)) return 400;
  if (nacik.startsWith(t)) return 300;
  if (nacik.includes(t)) return 200;
  return 0;
};

// 🔍 Öneri üretimi: skor + kişiselleştirme (recent/favorite ağırlıkları)
const buildSuggestions = (codes, term, recent, favorites, limit = 8) => {
  const favSet = new Set(favorites.map(f => f.kod));
  const recSet = new Set(recent.map(r => r.kod));
  return codes
    .map(c => ({
      item: c,
      score: computeScore(c, term) + (favSet.has(c.kod) ? 80 : 0) + (recSet.has(c.kod) ? 40 : 0)
    }))
    .filter(x => x.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map(x => x.item);
};

const NaceSuperSearch = ({ 
  value, 
  onChange, 
  size = 'small',
  placeholder = 'NACE kodu veya açıklama ara...'
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [allCodes, setAllCodes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedCode, setSelectedCode] = useState(null);
  const [recentCodes, setRecentCodes] = useState([]);
  const [favoriteCodes, setFavoriteCodes] = useState([]);
  const [showMode, setShowMode] = useState('all'); // 'all' | 'recent' | 'favorites'
  const [displayLimit, setDisplayLimit] = useState(50);
  const [categories, setCategories] = useState([]);
  const [selectedCats, setSelectedCats] = useState([]);
  const [suggestions, setSuggestions] = useState([]);
  const [highlightIndex, setHighlightIndex] = useState(-1);
  const [showCategories, setShowCategories] = useState(false);
  const [categorySearchTerm, setCategorySearchTerm] = useState('');
  const inputRef = useRef(null);

  // 🧲 Verileri yükle
  const loadCodes = useCallback(async () => {
    try {
      setLoading(true);
      const [codesRes, catsRes] = await Promise.all([
        axios.get('/nace/search?limit=5000'),
        axios.get('/nace/categories')
      ]);
      const codes = codesRes.data?.data || [];
      const cats = catsRes.data?.data || [];
      setAllCodes(codes);
      setCategories(cats);

      // Local storage
      try { setRecentCodes(JSON.parse(localStorage.getItem('nace_recent') || '[]').slice(0, 10)); } catch {}
      try { setFavoriteCodes(JSON.parse(localStorage.getItem('nace_favorites') || '[]')); } catch {}
    } catch (error) {
      console.error('🚨 NACE kodları yükleme hatası:', error);
      setAllCodes([]);
      setCategories([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadCodes(); }, [loadCodes]);

  // 🔁 Value değişince seçimi güncelle
  useEffect(() => {
    if (value && typeof value === 'string') {
      const foundCode = allCodes.find(code => code.kod === value);
      if (foundCode) setSelectedCode(foundCode);
    } else if (!value) {
      setSelectedCode(null);
    }
  }, [value, allCodes]);

  // 🧠 Akıllı öneriler (debounce)
  useEffect(() => {
    const handler = setTimeout(() => {
      if (!searchTerm.trim()) { setSuggestions([]); setHighlightIndex(-1); return; }
      const base = showMode === 'recent' ? recentCodes : showMode === 'favorites' ? favoriteCodes : allCodes;
      const pool = selectedCats.length ? base.filter(c => selectedCats.some(cat => (c.kategori || '').toLowerCase().includes(cat.toLowerCase()))) : base;
      setSuggestions(buildSuggestions(pool, searchTerm, recentCodes, favoriteCodes));
      setHighlightIndex(-1);
    }, 150);
    return () => clearTimeout(handler);
  }, [searchTerm, allCodes, showMode, selectedCats, recentCodes, favoriteCodes]);

  // 🔎 Filtrelenmiş liste (skor + kategori)
  const filteredCodes = useMemo(() => {
    let base = showMode === 'recent' ? recentCodes : showMode === 'favorites' ? favoriteCodes : allCodes;
    if (selectedCats.length) base = base.filter(c => selectedCats.some(cat => (c.kategori || '').toLowerCase().includes(cat.toLowerCase())));
    if (searchTerm.trim()) {
      const term = searchTerm.trim();
      base = base
        .map(c => ({ item: c, score: computeScore(c, term) }))
        .filter(x => x.score > 0)
        .sort((a, b) => b.score - a.score)
        .map(x => x.item);
    }
    return base.slice(0, displayLimit);
  }, [allCodes, searchTerm, showMode, displayLimit, selectedCats, recentCodes, favoriteCodes]);

  // ⭐ Favori toggle
  const toggleFavorite = useCallback((code) => {
    const exists = favoriteCodes.some(f => f.kod === code.kod);
    let next;
    if (exists) next = favoriteCodes.filter(f => f.kod !== code.kod);
    else next = [{ kod: code.kod, aciklama: code.aciklama }, ...favoriteCodes];
    setFavoriteCodes(next);
    localStorage.setItem('nace_favorites', JSON.stringify(next));
  }, [favoriteCodes]);

  // 🕘 Recent yaz
  const pushRecent = useCallback((code) => {
    const updatedRecent = [code, ...recentCodes.filter(r => r.kod !== code.kod)].slice(0, 10);
    setRecentCodes(updatedRecent);
    localStorage.setItem('nace_recent', JSON.stringify(updatedRecent));
  }, [recentCodes]);

  // 🎯 Seçim
  const handleCodeSelect = useCallback((code) => {
    setSelectedCode(code);
    pushRecent(code);
    onChange?.(code.kod, code.aciklama);
    setIsOpen(false);
    setSearchTerm('');
  }, [onChange, pushRecent]);

  // ⌨️ Klavye navigasyonu
  const handleKeyDown = useCallback((e) => {
    if (!isOpen) return;
    if (e.key === 'ArrowDown') { e.preventDefault(); setHighlightIndex(i => Math.min((i < 0 ? 0 : i + 1), Math.max(suggestions.length - 1, filteredCodes.length - 1))); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setHighlightIndex(i => Math.max((i < 0 ? 0 : i - 1), 0)); }
    else if (e.key === 'Enter') {
      e.preventDefault();
      const list = (suggestions.length ? suggestions : filteredCodes);
      if (list.length) handleCodeSelect(list[Math.max(0, highlightIndex)] || list[0]);
    } else if (e.key === 'Escape') { setIsOpen(false); }
  }, [isOpen, suggestions, filteredCodes, highlightIndex, handleCodeSelect]);

  useEffect(() => {
    if (!isOpen) return;
    const el = inputRef.current;
    if (el) el.focus();
    const listener = (e) => handleKeyDown(e);
    window.addEventListener('keydown', listener);
    return () => window.removeEventListener('keydown', listener);
  }, [isOpen, handleKeyDown]);

  // 🏷️ Kategori seçimi
  const toggleCategory = (cat) => {
    setSelectedCats(prev => prev.includes(cat) ? prev.filter(c => c !== cat) : [...prev, cat]);
    setDisplayLimit(50);
  };

  return (
    <>
      {/* Trigger input */}
      <TextField
        ref={inputRef}
        value={selectedCode ? `${selectedCode.kod} - ${selectedCode.aciklama?.substring(0, 60)}${(selectedCode.aciklama || '').length > 60 ? '...' : ''}` : ''}
        onClick={() => setIsOpen(true)}
        placeholder={placeholder}
        size={size}
        fullWidth
        InputProps={{
          startAdornment: (
            <InputAdornment position="start"><SearchIcon /></InputAdornment>
          ),
          readOnly: true
        }}
      />

      {/* Modal */}
      <Dialog
        open={isOpen}
        onClose={() => setIsOpen(false)}
        maxWidth="lg"
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: 3,
            overflow: 'hidden',
            maxHeight: '90vh',
            boxShadow: '0 25px 50px rgba(0,0,0,0.25)'
          }
        }}
        BackdropProps={{ 
          sx: { 
            backgroundColor: 'rgba(15, 23, 42, 0.7)', 
            backdropFilter: 'blur(12px)' 
          } 
        }}
      >
        {/* Compact Header */}
        <DialogTitle sx={{ 
          background: 'linear-gradient(135deg, #059669, #047857)', 
          color: 'white', 
          py: 1.5, 
          px: 3
        }}>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <CategoryIcon sx={{ fontSize: '1.5rem' }} />
              <Box>
                <Typography variant="h6" sx={{ fontWeight: 700, fontSize: '1.1rem', lineHeight: 1 }}>
                  NACE Kod Seçicisi
                </Typography>
                <Typography variant="caption" sx={{ opacity: 0.9, fontSize: '0.75rem' }}>
                  {allCodes.length} kod
                </Typography>
              </Box>
            </Box>
            <IconButton 
              onClick={() => setIsOpen(false)} 
              size="small"
              sx={{ 
                color: 'white',
                '&:hover': { backgroundColor: 'rgba(255,255,255,0.1)' }
              }}
            >
              <CloseIcon fontSize="small" />
            </IconButton>
          </Box>
        </DialogTitle>

        {/* Content */}
        <DialogContent sx={{ p: 0, display: 'flex', flexDirection: 'column', minHeight: 0, height: '80vh' }}>
          {/* Ultra Compact Header */}
          <Box sx={{ 
            p: 1.5, 
            borderBottom: '1px solid #e5e7eb', 
            background: 'white'
          }}>
            {/* Single Row Layout */}
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
              {/* Compact Search */}
              <Box sx={{ flex: 1, maxWidth: '400px' }}>
                <TextField
                  fullWidth
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Kod veya açıklama ara..."
                  size="small"
                  sx={{
                    '& .MuiOutlinedInput-root': {
                      height: '32px',
                      fontSize: '0.8rem',
                      '&:hover': { borderColor: '#059669' },
                      '&.Mui-focused': { borderColor: '#047857' }
                    }
                  }}
                  InputProps={{
                    startAdornment: (<InputAdornment position="start"><SearchIcon sx={{ color: '#059669', fontSize: '1rem' }} /></InputAdornment>),
                    endAdornment: searchTerm && (
                      <InputAdornment position="end">
                        <IconButton onClick={() => setSearchTerm('')} size="small" sx={{ p: 0.5 }}><ClearIcon fontSize="small" /></IconButton>
                      </InputAdornment>
                    )
                  }}
                />
                
                {/* Compact suggestions dropdown */}
                {suggestions.length > 0 && (
                  <Box sx={{ position: 'relative' }}>
                    <Box sx={{ 
                      position: 'absolute', 
                      zIndex: 15, 
                      mt: 0.5, 
                      left: 0, 
                      right: 0, 
                      bgcolor: 'white', 
                      border: '1px solid #d1d5db', 
                      borderRadius: 1, 
                      boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                      maxHeight: '150px',
                      overflowY: 'auto'
                    }}>
                      {suggestions.slice(0, 5).map((s, idx) => (
                        <Box
                          key={`sugg-${s.kod}`}
                          onClick={() => handleCodeSelect(s)}
                          sx={{ 
                            p: 1, 
                            cursor: 'pointer',
                            '&:hover': { bgcolor: '#f9fafb' },
                            borderBottom: idx < 4 ? '1px solid #f3f4f6' : 'none'
                          }}
                        >
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <Typography variant="caption" sx={{ 
                              bgcolor: '#d1fae5', 
                              color: '#065f46',
                              px: 1,
                              py: 0.25,
                              borderRadius: 0.5,
                              fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas',
                              fontWeight: 600,
                              fontSize: '0.7rem'
                            }}>
                              {s.kod}
                            </Typography>
                            <Typography variant="caption" sx={{ color: '#374151', fontSize: '0.75rem' }}>
                              {s.aciklama.length > 50 ? `${s.aciklama.substring(0, 50)}...` : s.aciklama}
                            </Typography>
                          </Box>
                        </Box>
                      ))}
                    </Box>
                  </Box>
                )}
              </Box>

              {/* Inline Mode Buttons */}
              <Box sx={{ display: 'flex', gap: 0.5 }}>
                <Button 
                  variant={showMode === 'all' ? 'contained' : 'text'} 
                  size="small"
                  onClick={() => { setShowMode('all'); setDisplayLimit(50); }}
                  sx={{
                    minWidth: 'auto',
                    px: 1.5,
                    py: 0.25,
                    fontSize: '0.7rem',
                    height: '24px',
                    ...(showMode === 'all' ? {
                      bgcolor: '#059669',
                      color: 'white',
                      '&:hover': { bgcolor: '#047857' }
                    } : {
                      color: '#6b7280',
                      '&:hover': { bgcolor: '#f3f4f6' }
                    })
                  }}
                >
                  Tümü
                </Button>
                <Button 
                  variant={showMode === 'recent' ? 'contained' : 'text'} 
                  size="small"
                  onClick={() => { setShowMode('recent'); setDisplayLimit(50); }}
                  sx={{
                    minWidth: 'auto',
                    px: 1.5,
                    py: 0.25,
                    fontSize: '0.7rem',
                    height: '24px',
                    ...(showMode === 'recent' ? {
                      bgcolor: '#059669',
                      color: 'white',
                      '&:hover': { bgcolor: '#047857' }
                    } : {
                      color: '#6b7280',
                      '&:hover': { bgcolor: '#f3f4f6' }
                    })
                  }}
                >
                  Son
                </Button>
                <Button 
                  variant={showMode === 'favorites' ? 'contained' : 'text'} 
                  size="small"
                  onClick={() => { setShowMode('favorites'); setDisplayLimit(50); }}
                  sx={{
                    minWidth: 'auto',
                    px: 1.5,
                    py: 0.25,
                    fontSize: '0.7rem',
                    height: '24px',
                    ...(showMode === 'favorites' ? {
                      bgcolor: '#059669',
                      color: 'white',
                      '&:hover': { bgcolor: '#047857' }
                    } : {
                      color: '#6b7280',
                      '&:hover': { bgcolor: '#f3f4f6' }
                    })
                  }}
                >
                  ⭐
                </Button>
              </Box>
              
              {/* Minimal Category Toggle */}
              <Button 
                variant="text"
                size="small"
                onClick={() => setShowCategories(v => !v)}
                sx={{ 
                  minWidth: 'auto',
                  px: 1,
                  py: 0.25,
                  fontSize: '0.7rem',
                  height: '24px',
                  color: '#6b7280',
                  '&:hover': { color: '#059669', bgcolor: '#f3f4f6' }
                }}
              >
                {showCategories ? '▲' : '▼'} Kategoriler
              </Button>
            </Box>

            {/* Ultra Compact Categories */}
            {showCategories && (
              <Box sx={{ 
                p: 1.5, 
                borderBottom: '1px solid #e5e7eb',
                bgcolor: '#f9fafb'
              }}>
                {/* Inline Category Search */}
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                  <TextField
                    size="small"
                    placeholder="Kategori ara..."
                    value={categorySearchTerm}
                    onChange={(e) => setCategorySearchTerm(e.target.value)}
                    sx={{
                      width: '200px',
                      '& .MuiOutlinedInput-root': {
                        height: '28px',
                        fontSize: '0.75rem'
                      }
                    }}
                    InputProps={{
                      startAdornment: (<InputAdornment position="start"><SearchIcon sx={{ fontSize: '0.9rem' }} /></InputAdornment>)
                    }}
                  />
                  {selectedCats.length > 0 && (
                    <Typography variant="caption" sx={{ color: '#059669', fontWeight: 600, fontSize: '0.75rem' }}>
                      {selectedCats.length} seçili
                    </Typography>
                  )}
                  <Button 
                    size="small" 
                    variant="text"
                    onClick={() => setSelectedCats([])}
                    disabled={selectedCats.length === 0}
                    sx={{ 
                      fontSize: '0.7rem',
                      color: '#dc2626',
                      minWidth: 'auto',
                      px: 1,
                      py: 0.25
                    }}
                  >
                    Temizle
                  </Button>
                </Box>

                {/* Horizontal Scrollable Categories */}
                <Box sx={{ 
                  display: 'flex',
                  gap: 0.5,
                  overflowX: 'auto',
                  pb: 1,
                  '&::-webkit-scrollbar': { height: 4 },
                  '&::-webkit-scrollbar-track': { backgroundColor: '#f3f4f6' },
                  '&::-webkit-scrollbar-thumb': { backgroundColor: '#d1d5db', borderRadius: 2 }
                }}>
                  {categories
                    .filter(cat => !categorySearchTerm || cat.toLowerCase().includes(categorySearchTerm.toLowerCase()))
                    .map((cat) => (
                    <Chip
                      key={cat}
                      label={cat.length > 25 ? `${cat.substring(0, 25)}...` : cat}
                      clickable
                      size="small"
                      onClick={() => toggleCategory(cat)}
                      variant={selectedCats.includes(cat) ? 'filled' : 'outlined'}
                      sx={{
                        fontSize: '0.7rem',
                        height: '24px',
                        whiteSpace: 'nowrap',
                        flexShrink: 0,
                        ...(selectedCats.includes(cat) ? {
                          bgcolor: '#059669',
                          color: 'white',
                          '&:hover': { bgcolor: '#047857' }
                        } : {
                          borderColor: '#d1d5db',
                          color: '#6b7280',
                          '&:hover': { borderColor: '#059669', bgcolor: 'rgba(5,150,105,0.05)' }
                        })
                      }}
                    />
                  ))}
                </Box>
              </Box>
            )}
          </Box>

          {/* List - Optimized Layout */}
          <Box sx={{ 
            flex: 1, 
            overflowY: 'auto', 
            px: 2, 
            py: 1,
            '&::-webkit-scrollbar': { width: 8 },
            '&::-webkit-scrollbar-track': { backgroundColor: '#f3f4f6', borderRadius: 4 },
            '&::-webkit-scrollbar-thumb': { backgroundColor: '#a7f3d0', borderRadius: 4, '&:hover': { backgroundColor: '#86efac' } }
          }}>
            {loading ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', py: 8 }}>
                <Box sx={{ textAlign: 'center' }}>
                  <CircularProgress sx={{ color: '#059669', mb: 2 }} />
                  <Typography variant="body2" sx={{ color: '#6b7280' }}>NACE kodları yükleniyor...</Typography>
                </Box>
              </Box>
            ) : filteredCodes.length === 0 ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', py: 8 }}>
                <Box sx={{ textAlign: 'center' }}>
                  <SearchIcon sx={{ fontSize: '3rem', color: '#d1d5db', mb: 2 }} />
                  <Typography variant="h6" sx={{ color: '#6b7280', mb: 1 }}>Sonuç bulunamadı</Typography>
                  <Typography variant="body2" sx={{ color: '#9ca3af' }}>
                    Arama teriminizi değiştirin veya filtreleri temizleyin
                  </Typography>
                </Box>
              </Box>
            ) : (
              <>
                {/* Minimal Results Info */}
                {filteredCodes.length > 0 && (
                  <Box sx={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'space-between',
                    mb: 1,
                    px: 1
                  }}>
                    <Typography variant="caption" sx={{ 
                      color: '#6b7280', 
                      fontWeight: 500,
                      fontSize: '0.75rem'
                    }}>
                      {filteredCodes.length} sonuç bulundu
                    </Typography>
                    {searchTerm && (
                      <Typography variant="caption" sx={{ 
                        color: '#059669', 
                        fontWeight: 600,
                        fontSize: '0.75rem'
                      }}>
                        "{searchTerm}" için
                      </Typography>
                    )}
                  </Box>
                )}

                {/* Code List - Enhanced Visual Hierarchy */}
                 {filteredCodes.map((code, idx) => (
                   <Box
                     key={`${code.kod}-${idx}`}
                     onClick={() => handleCodeSelect(code)}
                     sx={{ 
                       p: { xs: 2, sm: 2.5 },
                       mb: 1.5,
                       borderRadius: 2,
                       border: idx === highlightIndex ? '2px solid #059669' : '1px solid #f1f5f9',
                       bgcolor: idx === highlightIndex ? '#f0fdf4' : 'white',
                       cursor: 'pointer',
                       transition: 'all 0.2s ease',
                       boxShadow: idx === highlightIndex ? '0 4px 16px rgba(5,150,105,0.15)' : '0 1px 3px rgba(0,0,0,0.05)',
                       '&:hover': { 
                         borderColor: '#059669',
                         bgcolor: '#f9fafb',
                         transform: 'translateY(-1px)',
                         boxShadow: '0 4px 12px rgba(5,150,105,0.1)'
                       }
                     }}
                   >
                    <Box sx={{ 
                      display: 'flex', 
                      alignItems: 'flex-start', 
                      gap: { xs: 2, sm: 3 }, 
                      width: '100%',
                      flexDirection: { xs: 'column', sm: 'row' }
                    }}>
                      {/* Clean Code Badge */}
                        <Box sx={{ 
                          bgcolor: '#059669',
                          color: 'white',
                          px: { xs: 1.5, sm: 2 },
                          py: { xs: 0.5, sm: 0.8 },
                          borderRadius: 1.5,
                          fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas',
                          fontWeight: 700,
                          fontSize: { xs: '0.8rem', sm: '0.9rem' },
                          minWidth: { xs: 'auto', sm: '100px' },
                          textAlign: 'center',
                          alignSelf: { xs: 'flex-start', sm: 'flex-start' }
                        }}>
                          {code.kod}
                        </Box>
                      
                      {/* Content */}
                      <Box sx={{ flex: 1, minWidth: 0 }}>
                        <Typography 
                          variant="body1" 
                          sx={{ 
                            color: '#374151', 
                            lineHeight: 1.4,
                            fontWeight: 500,
                            mb: 0.5,
                            fontSize: { xs: '0.85rem', sm: '0.95rem' }
                          }}
                        >
                          {code.aciklama}
                        </Typography>
                        {code.kategori && (
                           <Typography variant="caption" sx={{ 
                             color: '#6b7280',
                             fontSize: '0.75rem',
                             fontWeight: 500
                           }}>
                             🏢 {code.kategori}
                           </Typography>
                         )}
                      </Box>

                      {/* Simple Favorite */}
                       <IconButton 
                         onClick={(e) => { e.stopPropagation(); toggleFavorite(code); }}
                         size="small"
                         sx={{
                           color: favoriteCodes.some(f => f.kod === code.kod) ? '#f59e0b' : '#d1d5db',
                           alignSelf: { xs: 'flex-end', sm: 'flex-start' },
                           '&:hover': { 
                             color: '#f59e0b',
                             transform: 'scale(1.1)'
                           }
                         }}
                       >
                         {favoriteCodes.some(f => f.kod === code.kod) ? <StarIcon /> : <StarBorderIcon />}
                       </IconButton>
                    </Box>
                  </Box>
                ))}

                {/* Load More Controls */}
                {!loading && filteredCodes.length >= displayLimit && (
                  <Box sx={{ display: 'flex', justifyContent: 'center', py: 3, gap: 2 }}>
                    <Button 
                      variant="outlined" 
                      startIcon={<KeyboardArrowUpIcon />} 
                      onClick={() => setDisplayLimit(l => Math.max(50, l - 50))}
                      sx={{ borderColor: '#d1d5db', '&:hover': { borderColor: '#059669', bgcolor: 'rgba(5,150,105,0.06)' } }}
                    >
                      Daha Az Göster
                    </Button>
                    <Button 
                      variant="contained" 
                      startIcon={<KeyboardArrowDownIcon />} 
                      onClick={() => setDisplayLimit(l => l + 50)}
                      sx={{ background: 'linear-gradient(135deg, #059669, #047857)' }}
                    >
                      Daha Fazla Göster
                    </Button>
                  </Box>
                )}
              </>
            )}
          </Box>
        </DialogContent>

        <DialogActions sx={{ 
          p: 1.5, 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center',
          borderTop: '1px solid #e5e7eb',
          background: '#f8fafc'
        }}>
          {/* Simple Stats */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Typography variant="caption" sx={{ color: '#6b7280', fontSize: '0.75rem' }}>
              ⭐ {favoriteCodes.length} • 🕒 {recentCodes.length}
            </Typography>
          </Box>
          
          {/* Compact Action Buttons */}
          <Box sx={{ display: 'flex', gap: 1 }}>
            <Button 
              variant="outlined" 
              size="small"
              onClick={() => { setSelectedCats([]); setSearchTerm(''); setShowMode('all'); setDisplayLimit(50); }}
              sx={{ 
                color: '#6b7280',
                borderColor: '#d1d5db',
                fontSize: '0.75rem',
                py: 0.5,
                px: 2,
                '&:hover': { 
                  color: '#dc2626',
                  borderColor: '#dc2626'
                }
              }}
            >
              Temizle
            </Button>
            <Button 
              variant="contained"
              size="small"
              onClick={() => setIsOpen(false)}
              sx={{ 
                bgcolor: '#059669',
                fontSize: '0.75rem',
                py: 0.5,
                px: 3,
                '&:hover': { bgcolor: '#047857' }
              }}
            >
              Kapat
            </Button>
          </Box>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default NaceSuperSearch;