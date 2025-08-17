// 🔎 Generic modal selector for Unit or Currency codes (GTIPSuperSearch benzeri)
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Box, TextField, Dialog, DialogTitle, DialogContent, DialogActions, Button, ListItemButton, Typography, InputAdornment, Chip, CircularProgress } from '@mui/material';
import { Search as SearchIcon } from '@mui/icons-material';
import unitService from '../services/unitService';
import currencyService from '../services/currencyService';
import usedMachineService from '../services/usedMachineService';

const debounce = (fn, wait = 250) => {
  let t; return (...args) => { clearTimeout(t); t = setTimeout(() => fn(...args), wait); };
};

// type: 'unit' | 'currency' | 'used' | 'machineType'
const UnitCurrencySearch = ({ type = 'unit', value, onChange, size = 'small', placeholder }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState([]);
  const [selected, setSelected] = useState(null);
  const [recent, setRecent] = useState([]);
  const storageKey = `ucs_recent_${type}`;
  const inputRef = useRef(null);

  const loader = useCallback(async (q) => {
    setLoading(true);
    try {
      let data = [];
      if (type === 'unit') data = await unitService.search(q, 100);
      else if (type === 'currency') data = await currencyService.search(q, 200);
      else if (type === 'machineType') data = await unitService.searchMachineTypes(q, 200);
      else data = await usedMachineService.search(q, 50);
      setResults(data);
    } finally {
      setLoading(false);
    }
  }, [type]);

  const debounced = useMemo(() => debounce(loader, 250), [loader]);

  useEffect(() => { if (isOpen) debounced(searchTerm); }, [isOpen, searchTerm, debounced]);

  useEffect(() => {
    if (value) setSelected(typeof value === 'string' ? { kod: value } : value); else setSelected(null);
  }, [value]);

  // recent load
  useEffect(() => {
    try { const r = JSON.parse(localStorage.getItem(storageKey) || '[]'); setRecent(r); } catch {}
  }, [storageKey]);

  const handlePick = (item) => {
    setSelected(item);
    onChange && onChange(item.kod, item.aciklama);
    setIsOpen(false);
    try {
      const old = JSON.parse(localStorage.getItem(storageKey) || '[]');
      const next = [item, ...old.filter(x => x.kod !== item.kod)].slice(0, 10);
      localStorage.setItem(storageKey, JSON.stringify(next));
      setRecent(next);
    } catch {}
  };

  return (
    <>
      <TextField
        inputRef={inputRef}
        value={selected ? (selected.kod + (selected.aciklama ? ` - ${selected.aciklama}` : '')) : ''}
        onClick={() => setIsOpen(true)}
        placeholder={placeholder || (type === 'unit' ? 'Birim seç...' : type==='currency' ? 'Döviz seç...' : type==='machineType' ? 'Makine tipi seç...' : 'Seç...')}
        size={size}
        fullWidth
        readOnly
        sx={{ cursor: 'pointer' }}
        InputProps={{
          startAdornment: (
            <InputAdornment position="start">
              <SearchIcon sx={{ color: '#3b82f6', fontSize: '1.2rem' }} />
            </InputAdornment>
          ),
          endAdornment: loading ? <CircularProgress size={16} /> : null
        }}
      />

      <Dialog open={isOpen} onClose={() => setIsOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>{type === 'unit' ? 'Birim Kodu Seç' : type === 'currency' ? 'Döviz Kodu Seç' : type === 'machineType' ? 'Makine Teçhizat Tipi Seç' : 'Kullanılmış Makine Seç'}</DialogTitle>
        <DialogContent dividers>
          <TextField
            autoFocus
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Ara..."
            fullWidth
            size="small"
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon />
                </InputAdornment>
              )
            }}
          />
          <Box sx={{ mt: 2, maxHeight: 360, overflowY: 'auto' }}>
            {recent.length > 0 && (
              <Box sx={{ mb: 1 }}>
                <Typography variant="caption" color="text.secondary">Son Seçilenler</Typography>
                {recent.map((r,i) => (
                  <ListItemButton key={`recent-${i}`} onClick={() => handlePick(r)}>
                    <Chip label={r.kod} size="small" color="secondary" sx={{ mr: 1 }} />
                    <Typography variant="body2">{r.aciklama}</Typography>
                  </ListItemButton>
                ))}
              </Box>
            )}
            {results.map((r, i) => (
              <ListItemButton key={i} onClick={() => handlePick(r)}>
                <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                  <Chip label={r.kod} size="small" color="primary" />
                  <Typography variant="body2">{r.aciklama}</Typography>
                </Box>
              </ListItemButton>
            ))}
            {!loading && results.length === 0 && (
              <Typography variant="body2" color="text.secondary">Kayıt bulunamadı</Typography>
            )}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setIsOpen(false)}>Kapat</Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default UnitCurrencySearch;


