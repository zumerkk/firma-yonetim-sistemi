// 🚀 GTIP SUPER SEARCH - MODAL
// US97SuperSearch benzeri; GTIP kodu ve açıklamasını hızlı seçtirir

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
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
  InputAdornment,
  IconButton,
  CircularProgress,
  Chip,
  Badge
} from '@mui/material';
import { Search as SearchIcon, Clear as ClearIcon, Close as CloseIcon, Star as StarIcon, AccessTime as AccessTimeIcon, FilterList as FilterListIcon } from '@mui/icons-material';
import gtipService from '../services/gtipService';

const debounce = (fn, wait = 300) => {
  let t;
  return (...args) => {
    clearTimeout(t);
    t = setTimeout(() => fn(...args), wait);
  };
};

const GTIPSuperSearch = ({ value, onChange, size = 'small', placeholder = 'GTIP kodu seç...' }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState([]); // Arama sonuçları
  const [selected, setSelected] = useState(null);
  const inputRef = useRef(null);
  const listRef = useRef(null);

  // Gelişmiş modlar
  const [showMode, setShowMode] = useState('all'); // all | recent | favorites | chapter
  const [displayLimit, setDisplayLimit] = useState(200); // backend limit (arttırılabilir)
  const [chapPrefix, setChapPrefix] = useState(''); // İlk 2 haneli bölüm filtresi
  const [recent, setRecent] = useState([]);
  const [favorites, setFavorites] = useState([]);

  const loadResults = useCallback(async (q) => {
    try {
      setLoading(true);
      const qp = [chapPrefix, q].filter(Boolean).join(' '); // prefix + query
      const data = await gtipService.search(qp || '', displayLimit);
      // Dedupe by kod/gtipKodu
      const dedup = [];
      const seen = new Set();
      for (const r of data) {
        const code = r.kod || r.gtipKodu;
        if (!code || seen.has(code)) continue;
        seen.add(code);
        dedup.push(r);
      }
      setResults(dedup);
    } catch (e) {
      setResults([]);
    } finally {
      setLoading(false);
    }
  }, [displayLimit, chapPrefix]);

  // Debounced search
  const debouncedSearch = useMemo(() => debounce(loadResults, 250), [loadResults]);

  useEffect(() => {
    if (isOpen) {
      debouncedSearch(searchTerm);
    }
  }, [isOpen, searchTerm, debouncedSearch]);

  // Limit değişince yeniden yükle
  useEffect(() => {
    if (isOpen) {
      loadResults(searchTerm);
    }
  }, [displayLimit, isOpen, loadResults, searchTerm]);

  useEffect(() => {
    if (value) {
      setSelected({ kod: value });
    } else {
      setSelected(null);
    }
  }, [value]);

  // Recent & Favorites yükle
  useEffect(() => {
    try {
      setRecent(JSON.parse(localStorage.getItem('gtip_recent') || '[]'));
    } catch { setRecent([]); }
    try {
      setFavorites(JSON.parse(localStorage.getItem('gtip_favorites') || '[]'));
    } catch { setFavorites([]); }
  }, [isOpen]);

  const handleSelect = (item) => {
    setSelected(item);
    // recent
    try {
      const rec = JSON.parse(localStorage.getItem('gtip_recent') || '[]');
      const updated = [item, ...rec.filter(r => (r.kod || r.gtipKodu) !== item.kod)].slice(0, 12);
      localStorage.setItem('gtip_recent', JSON.stringify(updated));
      setRecent(updated);
    } catch {}
    if (onChange) onChange(item.kod, item.aciklama);
    setIsOpen(false);
    setSearchTerm('');
  };

  const toggleFavorite = (code) => {
    try {
      const favs = JSON.parse(localStorage.getItem('gtip_favorites') || '[]');
      const exists = favs.find(f => (f.kod || f.gtipKodu) === code.kod);
      const updated = exists ? favs.filter(f => (f.kod || f.gtipKodu) !== code.kod) : [code, ...favs].slice(0, 50);
      localStorage.setItem('gtip_favorites', JSON.stringify(updated));
      setFavorites(updated);
    } catch {}
  };

  const isFavorite = (kod) => favorites.some(f => (f.kod || f.gtipKodu) === kod);

  // Scroll ile otomatik yükleme
  const handleScroll = (e) => {
    const el = e.currentTarget;
    const nearBottom = el.scrollTop + el.clientHeight >= el.scrollHeight - 50;
    if (nearBottom && !loading) {
      setDisplayLimit(prev => Math.min(prev + 200, 5000));
    }
  };

  // Enter ile ilk sonucu seç
  const onKeyDown = (e) => {
    if (e.key === 'Enter' && results.length > 0) {
      handleSelect({ kod: results[0].kod || results[0].gtipKodu, aciklama: results[0].aciklama });
    }
  };

  return (
    <>
      <TextField
        inputRef={inputRef}
        value={selected ? (selected.kod + (selected.aciklama ? ` - ${selected.aciklama.substring(0, 40)}...` : '')) : ''}
        onClick={() => setIsOpen(true)}
        placeholder={placeholder}
        size={size}
        fullWidth
        readOnly
        aria-label="GTIP kodu seç"
        role="button"
        sx={{
          cursor: 'pointer',
          '& .MuiOutlinedInput-root': {
            backgroundColor: '#ffffff',
            fontSize: '0.875rem',
            cursor: 'pointer',
            '& fieldset': { borderColor: '#e5e7eb' },
            '&:hover': { backgroundColor: '#f8fafc' }
          }
        }}
        InputProps={{
          startAdornment: (
            <InputAdornment position="start">
              <SearchIcon sx={{ color: '#3b82f6', fontSize: '1.2rem' }} />
            </InputAdornment>
          ),
          endAdornment: selected && (
            <InputAdornment position="end">
              <Chip label="Seçildi" size="small" color="primary" sx={{ fontSize: '0.7rem', height: 20 }} />
            </InputAdornment>
          )
        }}
      />

      <Dialog open={isOpen} onClose={() => setIsOpen(false)} maxWidth="lg" fullWidth>
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <FilterListIcon /> GTIP Kod Seçicisi
            <Badge badgeContent={results.length} color="primary"/>
          </Box>
          <IconButton onClick={() => setIsOpen(false)}><CloseIcon /></IconButton>
        </DialogTitle>
        <DialogContent dividers>
          <Box sx={{ mb: 2, display: 'flex', gap: 1, flexWrap: 'wrap' }}>
            <TextField
              fullWidth
              autoFocus
              placeholder="GTIP kodu veya açıklama ara..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onKeyDown={onKeyDown}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon />
                  </InputAdornment>
                ),
                endAdornment: searchTerm && (
                  <InputAdornment position="end">
                    <IconButton size="small" onClick={() => setSearchTerm('')}>
                      <ClearIcon />
                    </IconButton>
                  </InputAdornment>
                )
              }}
              sx={{ flex: 1, minWidth: 300 }}
            />
            <Chip icon={<AccessTimeIcon />} label={`Son Kullanılan (${recent.length})`} onClick={() => setShowMode('recent')} variant={showMode==='recent'?'filled':'outlined'} color={showMode==='recent'?'primary':'default'} size="small" />
            <Chip icon={<StarIcon />} label={`Favoriler (${favorites.length})`} onClick={() => setShowMode('favorites')} variant={showMode==='favorites'?'filled':'outlined'} color={showMode==='favorites'?'secondary':'default'} size="small" />
            <Chip label="Tümü" onClick={() => {setShowMode('all'); setChapPrefix('');}} variant={showMode==='all'?'filled':'outlined'} size="small" />
            {/* Bölüm (ilk 2 hane) hızlı filtreleri */}
            {['01','02','03','04','05','06','07','08','09','10','11','12'].map(p => (
              <Chip key={p} label={p} onClick={() => { setShowMode('chapter'); setChapPrefix(p); setDisplayLimit(200); }} variant={chapPrefix===p?'filled':'outlined'} size="small" />
            ))}
          </Box>

          {/* Liste */}
          {showMode === 'recent' ? (
            <Box sx={{ maxHeight: 480, overflow: 'auto' }}>
              {recent.length === 0 ? <Typography sx={{ color:'#64748b' }}>Henüz recent yok</Typography> : recent.map((r, idx) => (
                <ListItemButton key={`recent-${r.kod}-${idx}`} onClick={() => handleSelect(r)}>
                  <Box sx={{ display:'flex', flexDirection:'column', width:'100%' }}>
                    <Box sx={{ display:'flex', alignItems:'center', justifyContent:'space-between' }}>
                      <Typography variant="subtitle1" sx={{ fontFamily:'monospace', color:'#1e40af' }}>{r.kod}</Typography>
                      <IconButton size="small" onClick={(e)=>{e.stopPropagation(); toggleFavorite(r);}}><StarIcon sx={{ color: isFavorite(r.kod)?'#f59e0b':'#cbd5e1' }}/></IconButton>
                    </Box>
                    <Typography variant="body2" sx={{ color:'#334155' }}>{r.aciklama}</Typography>
                  </Box>
                </ListItemButton>
              ))}
            </Box>
          ) : showMode === 'favorites' ? (
            <Box sx={{ maxHeight: 480, overflow: 'auto' }}>
              {favorites.length === 0 ? <Typography sx={{ color:'#64748b' }}>Favori yok</Typography> : favorites.map((r, idx) => (
                <ListItemButton key={`fav-${r.kod}-${idx}`} onClick={() => handleSelect({ kod:r.kod||r.gtipKodu, aciklama:r.aciklama })}>
                  <Box sx={{ display:'flex', flexDirection:'column', width:'100%' }}>
                    <Box sx={{ display:'flex', alignItems:'center', justifyContent:'space-between' }}>
                      <Typography variant="subtitle1" sx={{ fontFamily:'monospace', color:'#1e40af' }}>{r.kod||r.gtipKodu}</Typography>
                      <IconButton size="small" onClick={(e)=>{e.stopPropagation(); toggleFavorite({kod:r.kod||r.gtipKodu, aciklama:r.aciklama});}}><StarIcon sx={{ color: isFavorite(r.kod||r.gtipKodu)?'#f59e0b':'#cbd5e1' }}/></IconButton>
                    </Box>
                    <Typography variant="body2" sx={{ color:'#334155' }}>{r.aciklama}</Typography>
                  </Box>
                </ListItemButton>
              ))}
            </Box>
          ) : loading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
              <CircularProgress />
            </Box>
          ) : (
            <Box sx={{ maxHeight: 480, overflow: 'auto' }} onScroll={handleScroll} ref={listRef}>
              {results.length === 0 ? (
                <Typography sx={{ color: '#64748b' }}>Sonuç yok. En az 2 karakter yaz.</Typography>
              ) : (
                results.map((r, idx) => {
                  const kod = r.kod || r.gtipKodu;
                  return (
                    <ListItemButton key={`${kod}-${idx}`} onClick={() => handleSelect({ kod, aciklama: r.aciklama })}>
                      <Box sx={{ display: 'flex', flexDirection: 'column', width:'100%' }}>
                        <Box sx={{ display:'flex', alignItems:'center', justifyContent:'space-between' }}>
                          <Typography variant="subtitle1" sx={{ fontFamily: 'monospace', color: '#1e40af' }}>{kod}</Typography>
                          <IconButton size="small" onClick={(e)=>{e.stopPropagation(); toggleFavorite({kod, aciklama:r.aciklama});}}>
                            <StarIcon sx={{ color: isFavorite(kod)?'#f59e0b':'#cbd5e1' }} />
                          </IconButton>
                        </Box>
                        <Typography variant="body2" sx={{ color: '#334155' }}>{r.aciklama}</Typography>
                      </Box>
                    </ListItemButton>
                  );
                })
              )}
              {/* Load more butonu alternatif */}
              {results.length >= displayLimit && (
                <Box sx={{ p: 2, textAlign:'center' }}>
                  <Button variant="outlined" onClick={()=> setDisplayLimit(prev => Math.min(prev+200, 5000))}>Daha Fazla (+200)</Button>
                </Box>
              )}
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setIsOpen(false)}>Kapat</Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default GTIPSuperSearch;


