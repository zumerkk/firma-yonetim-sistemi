// 🚀 GTIP SUPER SEARCH - ENTERPRISE EDITION
// Profesyonel GTIP kodu arama ve seçim modalı

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Box,
  TextField,
  Dialog,
  DialogTitle,
  DialogContent,
  Button,
  Typography,
  InputAdornment,
  IconButton,
  CircularProgress,
  Chip,
  Tooltip,
  Paper,
  Divider,
  List,
  ListItem,
  ListItemButton,
  ListItemText,
  ListItemIcon,
  Tabs,
  Tab,
  Badge,
  Fade,
  Zoom,
  alpha,
  useTheme
} from '@mui/material';
import { 
  Search as SearchIcon, 
  Clear as ClearIcon, 
  Close as CloseIcon, 
  Star as StarIcon, 
  StarBorder as StarBorderIcon,
  AccessTime as AccessTimeIcon, 
  FilterList as FilterListIcon,
  ExpandMore as ExpandMoreIcon,
  ChevronRight as ChevronRightIcon,
  ContentCopy as CopyIcon,
  Check as CheckIcon,
  Inventory as InventoryIcon,
  TrendingUp as TrendingUpIcon,
  Category as CategoryIcon
} from '@mui/icons-material';
import gtipService from '../services/gtipService';

// Debounce utility
const debounce = (fn, wait = 300) => {
  let t;
  return (...args) => {
    clearTimeout(t);
    t = setTimeout(() => fn(...args), wait);
  };
};

// GTIP bölüm kategorileri
const GTIP_CHAPTERS = [
  { range: '01-05', name: 'Canlı Hayvanlar & Hayvansal Ürünler', icon: '🐄' },
  { range: '06-14', name: 'Bitkisel Ürünler', icon: '🌾' },
  { range: '15', name: 'Yağlar', icon: '🫒' },
  { range: '16-24', name: 'Gıda Ürünleri', icon: '🍔' },
  { range: '25-27', name: 'Mineral Ürünler', icon: '⚒️' },
  { range: '28-38', name: 'Kimya Sanayii', icon: '🧪' },
  { range: '39-40', name: 'Plastik & Kauçuk', icon: '♻️' },
  { range: '41-43', name: 'Deri & Kürkler', icon: '👜' },
  { range: '44-46', name: 'Ahşap Ürünler', icon: '🪵' },
  { range: '47-49', name: 'Kağıt Ürünleri', icon: '📰' },
  { range: '50-63', name: 'Tekstil Ürünleri', icon: '🧵' },
  { range: '64-67', name: 'Ayakkabı & Şapka', icon: '👟' },
  { range: '68-70', name: 'Taş, Cam, Seramik', icon: '🪨' },
  { range: '71', name: 'Kıymetli Taşlar & Metaller', icon: '💎' },
  { range: '72-83', name: 'Adi Metaller', icon: '⚙️' },
  { range: '84-85', name: 'MAKİNE & ELEKTRİK', icon: '🏭', highlight: true },
  { range: '86-89', name: 'Taşıt Araçları', icon: '🚗' },
  { range: '90-92', name: 'Optik & Tıbbi Aletler', icon: '🔬' },
  { range: '93', name: 'Silahlar & Mühimmat', icon: '🔫' },
  { range: '94-96', name: 'Çeşitli Mamul Eşya', icon: '🛋️' },
  { range: '97', name: 'Sanat Eserleri', icon: '🎨' },
];

const GTIPSuperSearch = ({ 
  value, 
  onChange, 
  size = 'small', 
  placeholder = 'GTIP kodu seç...', 
  disabled = false,
  disableMessage = 'GTIP girişi için revize talebi başlatmanız gerekmektedir'
}) => {
  const theme = useTheme();
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState([]);
  const [selected, setSelected] = useState(null);
  const [activeTab, setActiveTab] = useState(0); // 0: Ara, 1: Son Kullanılan, 2: Favoriler, 3: Kategoriler
  const [chapterFilter, setChapterFilter] = useState(null);
  const [copiedCode, setCopiedCode] = useState(null);
  const inputRef = useRef(null);
  const searchInputRef = useRef(null);

  // localStorage
  const [recent, setRecent] = useState([]);
  const [favorites, setFavorites] = useState([]);

  // Load results
  const loadResults = useCallback(async (q, chapter = null) => {
    try {
      setLoading(true);
      let searchQuery = q || '';
      if (chapter) {
        searchQuery = chapter + ' ' + searchQuery;
      }
      const data = await gtipService.search(searchQuery.trim(), 500);
      // Dedupe
      const dedup = [];
      const seen = new Set();
      for (const r of data) {
        const code = r.kod || r.gtipKodu;
        if (!code || seen.has(code)) continue;
        seen.add(code);
        dedup.push({ ...r, kod: code });
      }
      setResults(dedup);
    } catch (e) {
      console.error('GTIP arama hatası:', e);
      setResults([]);
    } finally {
      setLoading(false);
    }
  }, []);

  // Debounced search
  const debouncedSearch = useMemo(() => debounce(loadResults, 250), [loadResults]);

  useEffect(() => {
    if (isOpen && activeTab === 0) {
      debouncedSearch(searchTerm, chapterFilter);
    }
  }, [isOpen, searchTerm, chapterFilter, activeTab, debouncedSearch]);

  useEffect(() => {
    if (value) {
      setSelected({ kod: value });
    } else {
      setSelected(null);
    }
  }, [value]);

  // Load recent & favorites from localStorage
  useEffect(() => {
    try {
      setRecent(JSON.parse(localStorage.getItem('gtip_recent') || '[]'));
    } catch { setRecent([]); }
    try {
      setFavorites(JSON.parse(localStorage.getItem('gtip_favorites') || '[]'));
    } catch { setFavorites([]); }
  }, [isOpen]);

  const handleSelect = (item) => {
    const code = item.kod || item.gtipKodu;
    setSelected({ kod: code, aciklama: item.aciklama });
    
    // Update recent
    try {
      const rec = JSON.parse(localStorage.getItem('gtip_recent') || '[]');
      const updated = [{ kod: code, aciklama: item.aciklama }, ...rec.filter(r => r.kod !== code)].slice(0, 20);
      localStorage.setItem('gtip_recent', JSON.stringify(updated));
      setRecent(updated);
    } catch {}
    
    if (onChange) onChange(code, item.aciklama);
    setIsOpen(false);
    setSearchTerm('');
    setChapterFilter(null);
  };

  const toggleFavorite = (item, e) => {
    if (e) e.stopPropagation();
    const code = item.kod || item.gtipKodu;
    try {
      const favs = JSON.parse(localStorage.getItem('gtip_favorites') || '[]');
      const exists = favs.find(f => f.kod === code);
      const updated = exists 
        ? favs.filter(f => f.kod !== code) 
        : [{ kod: code, aciklama: item.aciklama }, ...favs].slice(0, 50);
      localStorage.setItem('gtip_favorites', JSON.stringify(updated));
      setFavorites(updated);
    } catch {}
  };

  const isFavorite = (kod) => favorites.some(f => f.kod === kod);

  const copyToClipboard = async (code, e) => {
    if (e) e.stopPropagation();
    try {
      await navigator.clipboard.writeText(code);
      setCopiedCode(code);
      setTimeout(() => setCopiedCode(null), 1500);
    } catch {}
  };

  // Filter by chapter range
  const filterByChapter = (range) => {
    if (chapterFilter === range) {
      setChapterFilter(null);
    } else {
      setChapterFilter(range);
    }
    setActiveTab(0);
  };

  // Keyboard navigation
  const onKeyDown = (e) => {
    if (e.key === 'Enter' && results.length > 0) {
      handleSelect(results[0]);
    }
    if (e.key === 'Escape') {
      setIsOpen(false);
    }
  };

  const handleOpen = () => {
    if (!disabled) {
      setIsOpen(true);
      setActiveTab(recent.length > 0 ? 1 : 0); // Son kullanılanlar varsa onları göster
      setTimeout(() => searchInputRef.current?.focus(), 100);
    }
  };

  // Render GTIP item
  const renderGTIPItem = (item, index, showFavIcon = true) => {
    const code = item.kod || item.gtipKodu;
    const isFav = isFavorite(code);
    
    return (
      <ListItem 
        key={`${code}-${index}`} 
        disablePadding
        secondaryAction={
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
            <Tooltip title="Kopyala">
              <IconButton 
                size="small" 
                onClick={(e) => copyToClipboard(code, e)}
                sx={{ color: copiedCode === code ? 'success.main' : 'text.secondary' }}
              >
                {copiedCode === code ? <CheckIcon fontSize="small" /> : <CopyIcon fontSize="small" />}
              </IconButton>
            </Tooltip>
            {showFavIcon && (
              <Tooltip title={isFav ? 'Favorilerden Çıkar' : 'Favorilere Ekle'}>
                <IconButton 
                  size="small" 
                  onClick={(e) => toggleFavorite(item, e)}
                  sx={{ color: isFav ? 'warning.main' : 'text.secondary' }}
                >
                  {isFav ? <StarIcon fontSize="small" /> : <StarBorderIcon fontSize="small" />}
                </IconButton>
              </Tooltip>
            )}
          </Box>
        }
      >
        <ListItemButton 
          onClick={() => handleSelect(item)}
          sx={{
            borderRadius: 1,
            mb: 0.5,
            '&:hover': {
              backgroundColor: alpha(theme.palette.primary.main, 0.08),
            },
            ...(selected?.kod === code && {
              backgroundColor: alpha(theme.palette.primary.main, 0.12),
              borderLeft: `3px solid ${theme.palette.primary.main}`,
            })
          }}
        >
          <ListItemIcon sx={{ minWidth: 40 }}>
            <InventoryIcon sx={{ color: 'primary.main', fontSize: 20 }} />
          </ListItemIcon>
          <ListItemText
            primary={
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Typography 
                  component="span" 
                  sx={{ 
                    fontFamily: 'monospace', 
                    fontWeight: 600, 
                    color: 'primary.main',
                    fontSize: '0.95rem',
                    letterSpacing: '0.5px'
                  }}
                >
                  {code}
                </Typography>
                {item.kullanimSayisi > 0 && (
                  <Chip 
                    icon={<TrendingUpIcon sx={{ fontSize: 12 }} />}
                    label={item.kullanimSayisi} 
                    size="small" 
                    sx={{ height: 18, fontSize: '0.65rem' }}
                  />
                )}
              </Box>
            }
            secondary={
              <Typography 
                variant="body2" 
                sx={{ 
                  color: 'text.secondary',
                  fontSize: '0.8rem',
                  display: '-webkit-box',
                  WebkitLineClamp: 2,
                  WebkitBoxOrient: 'vertical',
                  overflow: 'hidden',
                  lineHeight: 1.3,
                  mt: 0.3
                }}
              >
                {item.aciklama}
              </Typography>
            }
          />
        </ListItemButton>
      </ListItem>
    );
  };

  // TextField for main display
  const textFieldContent = (
    <TextField
      inputRef={inputRef}
      value={selected ? `${selected.kod}${selected.aciklama ? ` - ${selected.aciklama.substring(0, 50)}...` : ''}` : ''}
      onClick={handleOpen}
      placeholder={disabled ? disableMessage : placeholder}
      size={size}
      fullWidth
      InputProps={{
        readOnly: true,
        startAdornment: (
          <InputAdornment position="start">
            <SearchIcon sx={{ color: disabled ? '#9ca3af' : '#3b82f6', fontSize: '1.1rem' }} />
          </InputAdornment>
        ),
        endAdornment: selected && !disabled && (
          <InputAdornment position="end">
            <Chip 
              label={selected.kod} 
              size="small" 
              color="primary" 
              variant="outlined"
              sx={{ fontSize: '0.7rem', height: 22, fontFamily: 'monospace' }} 
            />
          </InputAdornment>
        )
      }}
      sx={{
        cursor: disabled ? 'not-allowed' : 'pointer',
        '& .MuiOutlinedInput-root': {
          backgroundColor: disabled ? '#f3f4f6' : '#ffffff',
          fontSize: '0.85rem',
          cursor: disabled ? 'not-allowed' : 'pointer',
          '& fieldset': { borderColor: disabled ? '#d1d5db' : '#e5e7eb' },
          '&:hover': { 
            backgroundColor: disabled ? '#f3f4f6' : '#f8fafc',
            '& fieldset': { borderColor: disabled ? '#d1d5db' : '#3b82f6' }
          },
        }
      }}
    />
  );

  return (
    <>
      {disabled ? (
        <Tooltip title={disableMessage} placement="top">
          <span style={{ width: '100%', display: 'inline-block' }}>
            {textFieldContent}
          </span>
        </Tooltip>
      ) : textFieldContent}

      <Dialog 
        open={isOpen} 
        onClose={() => setIsOpen(false)} 
        maxWidth="md" 
        fullWidth
        TransitionComponent={Zoom}
        PaperProps={{
          sx: {
            borderRadius: 3,
            maxHeight: '85vh',
            background: 'linear-gradient(180deg, #ffffff 0%, #f8fafc 100%)'
          }
        }}
      >
        {/* Header */}
        <DialogTitle sx={{ 
          pb: 1, 
          borderBottom: '1px solid',
          borderColor: 'divider',
          background: 'linear-gradient(90deg, #1e40af 0%, #3b82f6 100%)',
          color: 'white'
        }}>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
              <FilterListIcon />
              <Typography variant="h6" sx={{ fontWeight: 600 }}>
                GTIP Kod Seçicisi
              </Typography>
              <Badge 
                badgeContent={results.length} 
                color="warning" 
                max={999}
                sx={{ '& .MuiBadge-badge': { fontSize: '0.7rem' } }}
              />
            </Box>
            <IconButton onClick={() => setIsOpen(false)} sx={{ color: 'white' }}>
              <CloseIcon />
            </IconButton>
          </Box>
        </DialogTitle>

        <DialogContent sx={{ p: 0 }}>
          {/* Search Box - Always visible */}
          <Box sx={{ p: 2, backgroundColor: '#f8fafc', borderBottom: '1px solid', borderColor: 'divider' }}>
            <TextField
              inputRef={searchInputRef}
              fullWidth
              autoFocus
              placeholder="GTIP kodu veya açıklama ara... (örn: 8422, makine, motor)"
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setActiveTab(0);
              }}
              onKeyDown={onKeyDown}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon sx={{ color: 'primary.main' }} />
                  </InputAdornment>
                ),
                endAdornment: (
                  <InputAdornment position="end">
                    {loading && <CircularProgress size={20} />}
                    {searchTerm && !loading && (
                    <IconButton size="small" onClick={() => setSearchTerm('')}>
                      <ClearIcon />
                    </IconButton>
                    )}
                  </InputAdornment>
                )
              }}
              sx={{
                '& .MuiOutlinedInput-root': {
                  backgroundColor: 'white',
                  borderRadius: 2,
                  '&.Mui-focused fieldset': {
                    borderColor: 'primary.main',
                    borderWidth: 2
                  }
                }
              }}
            />
            
            {/* Quick chapter filters */}
            {chapterFilter && (
              <Box sx={{ mt: 1, display: 'flex', alignItems: 'center', gap: 1 }}>
                <Typography variant="caption" color="text.secondary">Filtre:</Typography>
                <Chip 
                  label={`Bölüm ${chapterFilter}`} 
                  size="small" 
                  onDelete={() => setChapterFilter(null)}
                  color="primary"
                />
              </Box>
            )}
          </Box>

          {/* Tabs */}
          <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
            <Tabs 
              value={activeTab} 
              onChange={(e, v) => setActiveTab(v)}
              variant="fullWidth"
              sx={{
                '& .MuiTab-root': {
                  textTransform: 'none',
                  fontWeight: 500,
                  fontSize: '0.85rem',
                  minHeight: 48
                }
              }}
            >
              <Tab 
                icon={<SearchIcon sx={{ fontSize: 18 }} />} 
                iconPosition="start" 
                label={`Arama ${results.length > 0 ? `(${results.length})` : ''}`}
              />
              <Tab 
                icon={<AccessTimeIcon sx={{ fontSize: 18 }} />} 
                iconPosition="start" 
                label={`Son Kullanılan (${recent.length})`}
              />
              <Tab 
                icon={<StarIcon sx={{ fontSize: 18 }} />} 
                iconPosition="start" 
                label={`Favoriler (${favorites.length})`}
              />
              <Tab 
                icon={<CategoryIcon sx={{ fontSize: 18 }} />} 
                iconPosition="start" 
                label="Kategoriler"
              />
            </Tabs>
                    </Box>

          {/* Tab Content */}
          <Box sx={{ height: 400, overflow: 'auto' }}>
            {/* Tab 0: Search Results */}
            {activeTab === 0 && (
              <Box sx={{ p: 1 }}>
                {loading ? (
                  <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 300 }}>
                    <CircularProgress />
                  </Box>
                ) : results.length === 0 ? (
                  <Box sx={{ textAlign: 'center', py: 8, color: 'text.secondary' }}>
                    <InventoryIcon sx={{ fontSize: 48, mb: 2, opacity: 0.5 }} />
                    <Typography variant="body1" sx={{ mb: 1 }}>
                      {searchTerm ? 'Sonuç bulunamadı' : 'GTIP kodu aramak için yazın'}
                    </Typography>
                    <Typography variant="caption">
                      En az 2 karakter girin veya kategorilerden seçin
                    </Typography>
            </Box>
                ) : (
                  <List disablePadding>
                    {results.map((item, idx) => renderGTIPItem(item, idx))}
                  </List>
                )}
                    </Box>
            )}

            {/* Tab 1: Recent */}
            {activeTab === 1 && (
              <Box sx={{ p: 1 }}>
                {recent.length === 0 ? (
                  <Box sx={{ textAlign: 'center', py: 8, color: 'text.secondary' }}>
                    <AccessTimeIcon sx={{ fontSize: 48, mb: 2, opacity: 0.5 }} />
                    <Typography variant="body1">Henüz kullanım geçmişi yok</Typography>
                  </Box>
                ) : (
                  <List disablePadding>
                    {recent.map((item, idx) => renderGTIPItem(item, idx))}
                  </List>
                )}
            </Box>
            )}

            {/* Tab 2: Favorites */}
            {activeTab === 2 && (
              <Box sx={{ p: 1 }}>
                {favorites.length === 0 ? (
                  <Box sx={{ textAlign: 'center', py: 8, color: 'text.secondary' }}>
                    <StarBorderIcon sx={{ fontSize: 48, mb: 2, opacity: 0.5 }} />
                    <Typography variant="body1">Henüz favori eklenmemiş</Typography>
                    <Typography variant="caption">Yıldız ikonuna tıklayarak favorilere ekleyin</Typography>
            </Box>
          ) : (
                  <List disablePadding>
                    {favorites.map((item, idx) => renderGTIPItem(item, idx, false))}
                  </List>
                )}
              </Box>
            )}

            {/* Tab 3: Categories */}
            {activeTab === 3 && (
              <Box sx={{ p: 2 }}>
                <Typography variant="subtitle2" sx={{ mb: 2, color: 'text.secondary' }}>
                  Kategori seçerek hızlı filtreleme yapın
                </Typography>
                <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 1 }}>
                  {GTIP_CHAPTERS.map((chapter) => (
                    <Paper
                      key={chapter.range}
                      elevation={0}
                      onClick={() => filterByChapter(chapter.range.split('-')[0])}
                      sx={{
                        p: 1.5,
                        cursor: 'pointer',
                        border: '1px solid',
                        borderColor: chapter.highlight ? 'primary.main' : 'divider',
                        borderRadius: 2,
                        transition: 'all 0.2s',
                        backgroundColor: chapter.highlight ? alpha(theme.palette.primary.main, 0.05) : 'transparent',
                        '&:hover': {
                          borderColor: 'primary.main',
                          backgroundColor: alpha(theme.palette.primary.main, 0.08),
                          transform: 'translateY(-2px)',
                          boxShadow: 2
                        }
                      }}
                    >
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                        <Typography sx={{ fontSize: 24 }}>{chapter.icon}</Typography>
                        <Box>
                          <Typography variant="caption" sx={{ color: 'primary.main', fontWeight: 600 }}>
                            Bölüm {chapter.range}
                          </Typography>
                          <Typography variant="body2" sx={{ fontWeight: chapter.highlight ? 600 : 400 }}>
                            {chapter.name}
                          </Typography>
                        </Box>
                        <ChevronRightIcon sx={{ ml: 'auto', color: 'text.secondary' }} />
                      </Box>
                    </Paper>
                  ))}
                </Box>
                </Box>
              )}
            </Box>
        </DialogContent>

        {/* Footer */}
        <Box sx={{ 
          p: 2, 
          borderTop: '1px solid', 
          borderColor: 'divider',
          backgroundColor: '#f8fafc',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <Typography variant="caption" color="text.secondary">
            💡 İpucu: Kod veya açıklama ile arayabilir, kategorilerden seçebilirsiniz
          </Typography>
          <Button onClick={() => setIsOpen(false)} variant="outlined" size="small">
            Kapat
          </Button>
        </Box>
      </Dialog>
    </>
  );
};

export default GTIPSuperSearch;
