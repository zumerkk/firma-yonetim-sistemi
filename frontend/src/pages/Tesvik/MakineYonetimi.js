import React, { useEffect, useMemo, useState } from 'react';
import { Box, Paper, Typography, Button, Tabs, Tab, Chip, Stack, IconButton, Tooltip, Menu, MenuItem, Dialog, DialogTitle, DialogContent, DialogActions } from '@mui/material';
import { DataGrid } from '@mui/x-data-grid';
import UnitCurrencySearch from '../../components/UnitCurrencySearch';
import FileUpload from '../../components/Files/FileUpload';
import tesvikService from '../../services/tesvikService';
import { Autocomplete, TextField, Divider } from '@mui/material';
import api from '../../utils/axios';
import currencyService from '../../services/currencyService';
import * as XLSX from 'xlsx';
import ExcelJS from 'exceljs';
import { Add as AddIcon, Delete as DeleteIcon, FileUpload as ImportIcon, Download as ExportIcon, Replay as RecalcIcon, ContentCopy as CopyIcon, MoreVert as MoreIcon, Star as StarIcon, StarBorder as StarBorderIcon, Bookmarks as BookmarksIcon, Visibility as VisibilityIcon } from '@mui/icons-material';
import GTIPSuperSearch from '../../components/GTIPSuperSearch';

  const numberOrZero = (v) => {
  const n = parseFloat((v ?? '').toString().replace(/[^\d.-]/g, ''));
  return isNaN(n) ? 0 : n;
};

const emptyYerli = () => ({ id: Math.random().toString(36).slice(2), gtipKodu: '', gtipAciklama: '', adi: '', miktar: 0, birim: '', birimFiyatiTl: 0, toplamTl: 0, kdvIstisnasi: '' , dosyalar: []});
const emptyIthal = () => ({ id: Math.random().toString(36).slice(2), gtipKodu: '', gtipAciklama: '', adi: '', miktar: 0, birim: '', birimFiyatiFob: 0, doviz: '', toplamUsd: 0, toplamTl: 0, kullanilmisKod: '', kullanilmisAciklama: '', ckdSkd: '', aracMi: '', dosyalar: []});

const loadLS = (key, fallback) => {
  try { const v = JSON.parse(localStorage.getItem(key)); return Array.isArray(v) ? v : fallback; } catch { return fallback; }
};
const saveLS = (key, val) => { try { localStorage.setItem(key, JSON.stringify(val)); } catch {} };

const MakineYonetimi = () => {
  const [tab, setTab] = useState('yerli');
  const [selectedTesvik, setSelectedTesvik] = useState(null);
  const [tesvikOptions, setTesvikOptions] = useState([]);
  const [loadingTesvik, setLoadingTesvik] = useState(false);
  const [yerliRows, setYerliRows] = useState(() => loadLS('mk_yerli', []));
  const [ithalRows, setIthalRows] = useState(() => loadLS('mk_ithal', []));
  const [uploadRowId, setUploadRowId] = useState(null);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [selectionModel, setSelectionModel] = useState([]);
  const [filterText, setFilterText] = useState('');
  const [bulkMenuAnchor, setBulkMenuAnchor] = useState(null);
  const [rateCache, setRateCache] = useState({}); // { USD->TRY: 32.1 }
  const [contextAnchor, setContextAnchor] = useState(null);
  const [contextRow, setContextRow] = useState(null);
  const [rowClipboard, setRowClipboard] = useState(null);
  const [partialOpen, setPartialOpen] = useState(false);
  const [partialQty, setPartialQty] = useState(0);
  const [favAnchor, setFavAnchor] = useState(null);
  const [favType, setFavType] = useState(null); // 'gtip'|'unit'|'currency'
  const [favRowId, setFavRowId] = useState(null);
  const [tplAnchor, setTplAnchor] = useState(null);
  const [templatesYerli, setTemplatesYerli] = useState(()=>{ try{return JSON.parse(localStorage.getItem('mk_tpl_yerli')||'[]');}catch{return [];} });
  const [templatesIthal, setTemplatesIthal] = useState(()=>{ try{return JSON.parse(localStorage.getItem('mk_tpl_ithal')||'[]');}catch{return [];} });
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewUrl, setPreviewUrl] = useState('');

  useEffect(() => { document.title = 'Makine Teçhizat Yönetimi'; }, []);
  useEffect(() => {
    // Sayfa açılışında son 20 belgeyi getirip listeyi doldur
    (async () => {
      try {
        setLoadingTesvik(true);
        const res = await api.get('/tesvik', { params: { limit: 20 } });
        setTesvikOptions(res.data?.data?.tesvikler || []);
      } catch (e) {
        setTesvikOptions([]);
      } finally {
        setLoadingTesvik(false);
      }
    })();
  }, []);
  useEffect(() => saveLS(`mk_${selectedTesvik?._id || 'global'}_yerli`, yerliRows), [yerliRows, selectedTesvik]);
  useEffect(() => saveLS(`mk_${selectedTesvik?._id || 'global'}_ithal`, ithalRows), [ithalRows, selectedTesvik]);

  const yerliToplamTl = useMemo(() => yerliRows.reduce((s, r) => s + numberOrZero(r.toplamTl), 0), [yerliRows]);
  const ithalToplamUsd = useMemo(() => ithalRows.reduce((s, r) => s + numberOrZero(r.toplamUsd), 0), [ithalRows]);
  const ithalToplamTl = useMemo(() => ithalRows.reduce((s, r) => s + numberOrZero(r.toplamTl), 0), [ithalRows]);

  const filteredYerliRows = useMemo(() => {
    const q = (filterText || '').toLowerCase();
    if (!q) return yerliRows;
    return yerliRows.filter(r => (r.adi||'').toLowerCase().includes(q) || (r.gtipKodu||'').toLowerCase().includes(q));
  }, [yerliRows, filterText]);
  const filteredIthalRows = useMemo(() => {
    const q = (filterText || '').toLowerCase();
    if (!q) return ithalRows;
    return ithalRows.filter(r => (r.adi||'').toLowerCase().includes(q) || (r.gtipKodu||'').toLowerCase().includes(q));
  }, [ithalRows, filterText]);

  const updateYerli = (id, patch) => setYerliRows(rows => rows.map(r => r.id === id ? calcYerli({ ...r, ...patch }) : r));
  const updateIthal = (id, patch) => setIthalRows(rows => rows.map(r => r.id === id ? calcIthal({ ...r, ...patch }) : r));

  // DataGrid v6 için doğru event: onCellEditStop veya onCellEditCommit
  const handleYerliCommit = (params) => {
    const patch = { [params.field]: params.value };
    updateYerli(params.id, patch);
  };
  const handleIthalCommit = (params) => {
    const patch = { [params.field]: params.value };
    updateIthal(params.id, patch);
  };

  const calcYerli = (r) => {
    const miktar = numberOrZero(r.miktar);
    const bf = numberOrZero(r.birimFiyatiTl);
    return { ...r, toplamTl: miktar * bf };
  };
  const calcIthal = (r) => {
    const miktar = numberOrZero(r.miktar);
    const fob = numberOrZero(r.birimFiyatiFob);
    const usd = miktar * fob;
    return { ...r, toplamUsd: usd, toplamTl: r.toplamTl ?? 0 };
  };

  const addRow = () => {
    if (tab === 'yerli') setYerliRows(rows => [...rows, emptyYerli()]);
    else setIthalRows(rows => [...rows, emptyIthal()]);
  };
  const delRow = (id) => {
    if (tab === 'yerli') setYerliRows(rows => rows.filter(r => r.id !== id));
    else setIthalRows(rows => rows.filter(r => r.id !== id));
  };

  const handleUploadComplete = (files) => {
    if (!uploadRowId) return;
    const map = (r) => r.id === uploadRowId ? { ...r, dosyalar: [...(r.dosyalar||[]), ...files] } : r;
    if (tab === 'yerli') setYerliRows(rows => rows.map(map)); else setIthalRows(rows => rows.map(map));
  };

  const openUpload = (rowId) => { setUploadRowId(rowId); setUploadOpen(true); };
  const closeUpload = () => { setUploadOpen(false); setUploadRowId(null); };

  const exportExcel = async () => {
    const wb = new ExcelJS.Workbook();
    const addSheet = (name, headers, rows) => {
      const ws = wb.addWorksheet(name);
      ws.columns = headers.map(h => ({ header: h, key: h, width: Math.max(14, h.length + 2) }));
      rows.forEach(r => ws.addRow(r));
      // header style
      ws.getRow(1).font = { bold: true };
      ws.getRow(1).alignment = { horizontal: 'center' };
      ws.eachRow((row, rowNumber) => {
        row.eachCell((cell) => {
          cell.border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } };
        });
        if (rowNumber > 1) {
          row.alignment = { vertical: 'middle' };
        }
      });
      return ws;
    };
    const common = (r) => ({ 'GTIP No': r.gtipKodu, 'GTIP Açıklama': r.gtipAciklama, 'Adı ve Özelliği': r.adi, 'Miktarı': r.miktar, 'Birimi': r.birim });
    addSheet('Yerli', ['GTIP No', 'GTIP Açıklama', 'Adı ve Özelliği', 'Miktarı', 'Birimi', 'Birim Fiyatı (TL)', 'Toplam Tutar (TL)', 'KDV İstisnası'],
      yerliRows.map(r => ({ ...common(r), 'Birim Fiyatı (TL)': r.birimFiyatiTl, 'Toplam Tutar (TL)': r.toplamTl, 'KDV İstisnası': r.kdvIstisnasi }))
    );
    addSheet('İthal', ['GTIP No', 'GTIP Açıklama', 'Adı ve Özelliği', 'Miktarı', 'Birimi', 'Menşei Döviz Birim Fiyatı (FOB)', 'Menşei Döviz Cinsi (FOB)', 'Toplam Tutar (FOB $)', 'Toplam Tutar (FOB TL)', 'Kullanılmış Makine (Kod)', 'Kullanılmış Makine (Açıklama)'],
      ithalRows.map(r => ({ ...common(r), 'Menşei Döviz Birim Fiyatı (FOB)': r.birimFiyatiFob, 'Menşei Döviz Cinsi (FOB)': r.doviz, 'Toplam Tutar (FOB $)': r.toplamUsd, 'Toplam Tutar (FOB TL)': r.toplamTl, 'Kullanılmış Makine (Kod)': r.kullanilmisKod, 'Kullanılmış Makine (Açıklama)': r.kullanilmisAciklama }))
    );
    const buff = await wb.xlsx.writeBuffer();
    const blob = new Blob([buff], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `makine_tec_yonetimi_${new Date().toISOString().slice(0,10)}.xlsx`;
    a.click(); window.URL.revokeObjectURL(url);
  };

  const loadTesvikMakineListeleri = async (tesvikId) => {
    if (!tesvikId) return;
    const data = await tesvikService.get(tesvikId);
    const yerli = (data?.makineListeleri?.yerli || []).map(r => ({
      id: r.rowId || Math.random().toString(36).slice(2),
      rowId: r.rowId,
      gtipKodu: r.gtipKodu || '',
      gtipAciklama: r.gtipAciklamasi || '',
      adi: r.adiVeOzelligi || '',
      miktar: r.miktar || 0,
      birim: r.birim || '',
      birimFiyatiTl: r.birimFiyatiTl || 0,
      toplamTl: r.toplamTutariTl || 0,
      kdvIstisnasi: r.kdvIstisnasi || '',
      talep: r.talep || null,
      karar: r.karar || null
    }));
    const ithal = (data?.makineListeleri?.ithal || []).map(r => ({
      id: r.rowId || Math.random().toString(36).slice(2),
      rowId: r.rowId,
      gtipKodu: r.gtipKodu || '',
      gtipAciklama: r.gtipAciklamasi || '',
      adi: r.adiVeOzelligi || '',
      miktar: r.miktar || 0,
      birim: r.birim || '',
      birimFiyatiFob: r.birimFiyatiFob || 0,
      doviz: r.gumrukDovizKodu || '',
      toplamUsd: r.toplamTutarFobUsd || 0,
      toplamTl: r.toplamTutarFobTl || 0,
      kullanilmisKod: r.kullanilmisMakine || '',
      kullanilmisAciklama: r.kullanilmisMakineAciklama || '',
      ckdSkd: r.ckdSkdMi || '',
      aracMi: r.aracMi || '',
      talep: r.talep || null,
      karar: r.karar || null
    }));
    setYerliRows(yerli);
    setIthalRows(ithal);
  };

  const searchTesvik = async (q) => {
    try {
      setLoadingTesvik(true);
      const text = (q || '').trim();
      if (text.length < 2) {
        // 2 karakter altı: son kayıtlar
        const res = await api.get('/tesvik', { params: { limit: 20 } });
        setTesvikOptions(res.data?.data?.tesvikler || []);
        return;
      }
      const res = await api.get('/tesvik/search', { params: { q: text } });
      setTesvikOptions(res.data?.data || []);
    } catch (e) {
      setTesvikOptions([]);
    } finally {
      setLoadingTesvik(false);
    }
  };

  const importExcel = async (file) => {
    const data = await file.arrayBuffer();
    const wb = XLSX.read(data);
    const toJSON = (sheet) => XLSX.utils.sheet_to_json(wb.Sheets[sheet] || {}, { defval: '' });
    const yerli = toJSON('Yerli');
    const ithal = toJSON('İthal');
    const yerliMapped = yerli.map(r => {
      const obj = { id: Math.random().toString(36).slice(2), gtipKodu: r['GTIP No'], gtipAciklama: r['GTIP Açıklama'], adi: r['Adı ve Özelliği'], miktar: r['Miktarı'], birim: r['Birimi'], birimFiyatiTl: r['Birim Fiyatı (TL)'], toplamTl: r['Toplam Tutar (TL)'], kdvIstisnasi: r['KDV İstisnası'], dosyalar: [] };
      const errs = [];
      if (!obj.adi) errs.push('Adı boş');
      if (!obj.birim) errs.push('Birim boş');
      if (!numberOrZero(obj.miktar)) errs.push('Miktar 0');
      if (errs.length) obj._errors = errs;
      return calcYerli(obj);
    });
    const ithalMapped = ithal.map(r => {
      const obj = { id: Math.random().toString(36).slice(2), gtipKodu: r['GTIP No'], gtipAciklama: r['GTIP Açıklama'], adi: r['Adı ve Özelliği'], miktar: r['Miktarı'], birim: r['Birimi'], birimFiyatiFob: r['Menşei Döviz Birim Fiyatı (FOB)'], doviz: r['Menşei Döviz Cinsi (FOB)'], toplamUsd: r['Toplam Tutar (FOB $)'], toplamTl: r['Toplam Tutar (FOB TL)'], kullanilmisKod: r['Kullanılmış Makine (Kod)'], kullanilmisAciklama: r['Kullanılmış Makine (Açıklama)'], ckdSkd: '', aracMi: '', dosyalar: [] };
      const errs = [];
      if (!obj.adi) errs.push('Adı boş');
      if (!obj.birim) errs.push('Birim boş');
      if (!obj.doviz) errs.push('Döviz boş');
      if (!numberOrZero(obj.miktar)) errs.push('Miktar 0');
      if (errs.length) obj._errors = errs;
      return calcIthal(obj);
    });
    if (yerli.length) setYerliRows(yerliMapped);
    if (ithal.length) setIthalRows(ithalMapped);
  };

  const recalcIthalTotals = async () => {
    // Döviz kuruna göre TL hesapla (TRY hedef)
    const results = await Promise.all(ithalRows.map(async r => {
      if (!r.doviz || r.doviz === 'TRY') return { ...r, toplamTl: numberOrZero(r.toplamUsd) };
      try {
        const key = `${r.doviz}->TRY`;
        let rate = rateCache[key];
        if (!rate) {
          rate = await currencyService.getRate(r.doviz, 'TRY');
          setRateCache(prev => ({ ...prev, [key]: rate }));
        }
        return { ...r, toplamTl: Math.round(numberOrZero(r.toplamUsd) * (rate || 0)) };
      } catch { return { ...r }; }
    }));
    setIthalRows(results);
  };

  const duplicateRow = (rows, id) => {
    const idx = rows.findIndex(r => r.id === id);
    if (idx === -1) return rows;
    const copy = { ...rows[idx], id: Math.random().toString(36).slice(2) };
    return [...rows.slice(0, idx + 1), copy, ...rows.slice(idx + 1)];
  };

  // Favorites storage helpers
  const loadFav = (key) => { try { return JSON.parse(localStorage.getItem(key) || '[]'); } catch { return []; } };
  const saveFav = (key, list) => { try { localStorage.setItem(key, JSON.stringify(list)); } catch {} };
  const getFavKey = (type) => type==='gtip' ? 'fav_gtip' : type==='unit' ? 'fav_units' : 'fav_currencies';
  const addFavorite = (type, item) => { const key = getFavKey(type); const list = loadFav(key); const exists = list.find(x => x.kod === item.kod); if (!exists){ const next = [item, ...list].slice(0,50); saveFav(key,next);} };
  const removeFavorite = (type, code) => { const key = getFavKey(type); const list = loadFav(key).filter(x => x.kod !== code); saveFav(key,list); };
  const openFavMenu = (event, type, rowId) => { setFavAnchor(event.currentTarget); setFavType(type); setFavRowId(rowId); };
  const closeFavMenu = () => { setFavAnchor(null); setFavType(null); setFavRowId(null); };

  // Templates helpers
  const saveTemplate = () => {
    if (!contextRow) return;
    const tpl = tab==='yerli' ? (({ gtipKodu, gtipAciklama, adi, miktar, birim, birimFiyatiTl, kdvIstisnasi })=>({ gtipKodu, gtipAciklama, adi, miktar, birim, birimFiyatiTl, kdvIstisnasi })) (contextRow)
                              : (({ gtipKodu, gtipAciklama, adi, miktar, birim, birimFiyatiFob, doviz, kullanilmisKod, kullanilmisAciklama, ckdSkd, aracMi })=>({ gtipKodu, gtipAciklama, adi, miktar, birim, birimFiyatiFob, doviz, kullanilmisKod, kullanilmisAciklama, ckdSkd, aracMi })) (contextRow);
    if (tab==='yerli') {
      const next = [tpl, ...templatesYerli].slice(0,50); setTemplatesYerli(next); localStorage.setItem('mk_tpl_yerli', JSON.stringify(next));
    } else {
      const next = [tpl, ...templatesIthal].slice(0,50); setTemplatesIthal(next); localStorage.setItem('mk_tpl_ithal', JSON.stringify(next));
    }
  };
  const insertTemplate = (tpl) => {
    if (tab==='yerli') setYerliRows(rows => [...rows, calcYerli({ id: Math.random().toString(36).slice(2), ...tpl })]);
    else setIthalRows(rows => [...rows, calcIthal({ id: Math.random().toString(36).slice(2), ...tpl })]);
  };

  const handleBulkTalep = async () => {
    if (!selectedTesvik || selectionModel.length === 0) return;
    const list = tab === 'yerli' ? yerliRows : ithalRows;
    const apply = async (row) => {
      const talep = { durum: 'bakanliga_gonderildi', istenenAdet: Number(row.miktar) || 0 };
      await tesvikService.setMakineTalep(selectedTesvik._id, { liste: tab, rowId: row.id, talep });
      if (tab === 'yerli') updateYerli(row.id, { talep }); else updateIthal(row.id, { talep });
    };
    for (const id of selectionModel) {
      const row = list.find(r => r.id === id);
      if (row) await apply(row);
    }
  };

  const handleBulkKarar = async (type) => {
    if (!selectedTesvik || selectionModel.length === 0) return;
    let onayAdet = 0;
    if (type === 'kismi_onay') {
      const v = window.prompt('Kısmi onay adedi');
      onayAdet = Number(v) || 0;
    }
    const list = tab === 'yerli' ? yerliRows : ithalRows;
    const apply = async (row) => {
      const karar = {
        kararDurumu: type,
        onaylananAdet: type === 'kismi_onay' ? onayAdet : (type === 'onay' ? Number(row.miktar) || 0 : 0)
      };
      await tesvikService.setMakineKarar(selectedTesvik._id, { liste: tab, rowId: row.id, karar });
      if (tab === 'yerli') updateYerli(row.id, { karar }); else updateIthal(row.id, { karar });
    };
    for (const id of selectionModel) {
      const row = list.find(r => r.id === id);
      if (row) await apply(row);
    }
  };

  const YerliGrid = () => {
    const cols = [
      { field: 'gtipKodu', headerName: 'GTIP', width: 200, renderCell: (p) => (
        <Stack direction="row" spacing={0.5} alignItems="center" sx={{ width: '100%' }}>
          <Box sx={{ flex: 1 }}>
            <GTIPSuperSearch value={p.row.gtipKodu} onChange={(kod, aciklama)=>{ updateYerli(p.row.id, { gtipKodu: kod, gtipAciklama: aciklama }); }} />
          </Box>
          <IconButton size="small" onClick={(e)=> openFavMenu(e, 'gtip', p.row.id)}><StarBorderIcon fontSize="inherit"/></IconButton>
        </Stack>
      ) },
      { field: 'gtipAciklama', headerName: 'GTIP Açıklama', flex: 1, editable: true },
      { field: 'adi', headerName: 'Adı ve Özelliği', flex: 1, editable: true },
      { field: 'kdvIstisnasi', headerName: 'KDV İstisnası', width: 140, editable: true },
      { field: 'miktar', headerName: 'Miktar', width: 110, editable: true, type: 'number' },
      { field: 'birim', headerName: 'Birim', width: 180, renderCell: (p) => (
          <Stack direction="row" spacing={0.5} alignItems="center" sx={{ width: '100%' }}>
            <Box sx={{ flex: 1 }}>
              <UnitCurrencySearch type="unit" value={p.row.birim} onChange={(kod)=>updateYerli(p.row.id,{birim:kod})} />
            </Box>
            <IconButton size="small" onClick={(e)=> openFavMenu(e,'unit', p.row.id)}><StarBorderIcon fontSize="inherit"/></IconButton>
          </Stack>
        ) },
      { field: 'birimFiyatiTl', headerName: 'Birim Fiyatı (TL)', width: 160, editable: true, type: 'number' },
      { field: 'toplamTl', headerName: 'Toplam Tutar (TL)', width: 180, valueFormatter: (p)=> p.value?.toLocaleString('tr-TR') },
      { field: 'dosya', headerName: 'Dosyalar', width: 140, renderCell: (p)=> (
        <Box onDragOver={(e)=>{e.preventDefault();}} onDrop={async(e)=>{e.preventDefault(); const files = Array.from(e.dataTransfer.files||[]); if(files.length===0) return; const form = new FormData(); files.forEach(f=> form.append('files', f)); form.append('path', `makine-yonetimi/${tab}/${p.row.id}`); await api.post('/files/upload', form, { headers:{'Content-Type':'multipart/form-data'} }); updateYerli(p.row.id, { dosyalar: [...(p.row.dosyalar||[]), ...files.map(f=>({ name:f.name })) ] }); }}>
          <Button size="small" onClick={()=>openUpload(p.row.id)}>Yükle</Button>
          {Array.isArray(p.row.dosyalar) && p.row.dosyalar.length>0 && (
            <Chip label={p.row.dosyalar.length} size="small" sx={{ ml: 0.5 }} />
          )}
        </Box>
      )},
      { field: 'copy', headerName: '', width: 50, renderCell: (p)=> (
        <IconButton size="small" onClick={()=> setYerliRows(rows => duplicateRow(rows, p.row.id))}><CopyIcon fontSize="inherit"/></IconButton>
      )},
      { field: 'talep', headerName: 'Talep', width: 180, renderCell: (p)=>(
        <Stack direction="row" spacing={1} alignItems="center">
          {p.row.talep?.durum && (
            <Chip size="small" label={p.row.talep.durum.replace(/_/g,' ').toUpperCase()} />
          )}
          <Button size="small" variant="outlined" disabled={!selectedTesvik} onClick={async()=>{
            const talep = { durum:'bakanliga_gonderildi', istenenAdet: Number(p.row.miktar)||0 };
            await tesvikService.setMakineTalep(selectedTesvik._id, { liste:'yerli', rowId:p.row.id, talep });
            updateYerli(p.row.id, { talep });
          }}>Gönder</Button>
        </Stack>
      ) },
      { field: 'karar', headerName: 'Karar', width: 220, renderCell: (p)=>(
        <Stack direction="row" spacing={1} alignItems="center">
          {p.row.karar?.kararDurumu && (
            <Chip size="small" label={p.row.karar.kararDurumu.toUpperCase()} />
          )}
          <Button size="small" disabled={!selectedTesvik} onClick={async()=>{
            const karar = { kararDurumu:'onay', onaylananAdet:Number(p.row.miktar)||0 };
            await tesvikService.setMakineKarar(selectedTesvik._id, { liste:'yerli', rowId:p.row.id, karar });
            updateYerli(p.row.id, { karar });
          }}>Onay</Button>
          <Button size="small" color="warning" disabled={!selectedTesvik} onClick={async()=>{
            const karar = { kararDurumu:'kismi_onay', onaylananAdet: Math.max(0, Math.floor((Number(p.row.miktar)||0)/2)) };
            await tesvikService.setMakineKarar(selectedTesvik._id, { liste:'yerli', rowId:p.row.id, karar });
            updateYerli(p.row.id, { karar });
          }}>Kısmi</Button>
          <Button size="small" color="error" disabled={!selectedTesvik} onClick={async()=>{
            const karar = { kararDurumu:'red', onaylananAdet:0 };
            await tesvikService.setMakineKarar(selectedTesvik._id, { liste:'yerli', rowId:p.row.id, karar });
            updateYerli(p.row.id, { karar });
          }}>Red</Button>
        </Stack>
      ) },
      { field: 'actions', headerName: '', width: 60, renderCell: (p)=>(
        <IconButton color="error" onClick={()=>delRow(p.row.id)}><DeleteIcon/></IconButton>
      )}
    ];
    return (
      <DataGrid autoHeight rows={filteredYerliRows} columns={cols} pageSize={10} rowsPerPageOptions={[10]} disableSelectionOnClick
        checkboxSelection
        selectionModel={selectionModel}
        onSelectionModelChange={(m)=> setSelectionModel(m)}
        onCellEditCommit={handleYerliCommit}
        onCellContextMenu={(params, event)=>{ event.preventDefault(); setContextAnchor(event.currentTarget); setContextRow({ ...params.row, id: params.id }); }}
        getCellClassName={(params)=>{
          if (params.field === 'miktar' && numberOrZero(params.value) <= 0) return 'error-cell';
          if (params.field === 'birim' && !params.row.birim) return 'error-cell';
          return '';
        }}
        sx={{
          '& .error-cell': { backgroundColor: '#fee2e2' }
        }}
      />
    );
  };

  const IthalGrid = () => {
    const cols = [
      { field: 'gtipKodu', headerName: 'GTIP', width: 200, renderCell: (p) => (
        <Stack direction="row" spacing={0.5} alignItems="center" sx={{ width: '100%' }}>
          <Box sx={{ flex: 1 }}>
            <GTIPSuperSearch value={p.row.gtipKodu} onChange={(kod, aciklama)=>{ updateIthal(p.row.id, { gtipKodu: kod, gtipAciklama: aciklama }); }} />
          </Box>
          <IconButton size="small" onClick={(e)=> openFavMenu(e, 'gtip', p.row.id)}><StarBorderIcon fontSize="inherit"/></IconButton>
        </Stack>
      ) },
      { field: 'gtipAciklama', headerName: 'GTIP Açıklama', flex: 1, editable: true },
      { field: 'adi', headerName: 'Adı ve Özelliği', flex: 1, editable: true },
      { field: 'miktar', headerName: 'Miktar', width: 110, editable: true, type: 'number' },
      { field: 'birim', headerName: 'Birim', width: 180, renderCell: (p) => (
        <Stack direction="row" spacing={0.5} alignItems="center" sx={{ width: '100%' }}>
          <Box sx={{ flex: 1 }}>
            <UnitCurrencySearch type="unit" value={p.row.birim} onChange={(kod)=>updateIthal(p.row.id,{birim:kod})} />
          </Box>
          <IconButton size="small" onClick={(e)=> openFavMenu(e,'unit', p.row.id)}><StarBorderIcon fontSize="inherit"/></IconButton>
        </Stack>
      ) },
      { field: 'birimFiyatiFob', headerName: 'FOB Birim Fiyatı', width: 150, editable: true, type: 'number' },
      { field: 'doviz', headerName: 'Döviz', width: 180, renderCell: (p)=>(
        <Stack direction="row" spacing={0.5} alignItems="center" sx={{ width: '100%' }}>
          <Box sx={{ flex: 1 }}>
            <UnitCurrencySearch type="currency" value={p.row.doviz} onChange={(kod)=>updateIthal(p.row.id,{doviz:kod})} />
          </Box>
          <IconButton size="small" onClick={(e)=> openFavMenu(e,'currency', p.row.id)}><StarBorderIcon fontSize="inherit"/></IconButton>
        </Stack>
      ) },
      { field: 'toplamUsd', headerName: 'FOB $', width: 140, valueFormatter: (p)=> p.value?.toLocaleString('en-US') },
      { field: 'toplamTl', headerName: 'FOB TL', width: 150, valueFormatter: (p)=> p.value?.toLocaleString('tr-TR') },
      { field: 'kullanilmis', headerName: 'Kullanılmış', width: 180, renderCell: (p)=>(
        <UnitCurrencySearch type="used" value={p.row.kullanilmisKod} onChange={(kod,aciklama)=>updateIthal(p.row.id,{kullanilmisKod:kod,kullanilmisAciklama:aciklama})} />
      ) },
      { field: 'ckdSkd', headerName: 'CKD/SKD', width: 110, editable: true },
      { field: 'aracMi', headerName: 'Araç mı?', width: 110, editable: true },
      { field: 'dosya', headerName: 'Dosyalar', width: 140, renderCell: (p)=> (
        <Box onDragOver={(e)=>{e.preventDefault();}} onDrop={async(e)=>{e.preventDefault(); const files = Array.from(e.dataTransfer.files||[]); if(files.length===0) return; const form = new FormData(); files.forEach(f=> form.append('files', f)); form.append('path', `makine-yonetimi/${tab}/${p.row.id}`); await api.post('/files/upload', form, { headers:{'Content-Type':'multipart/form-data'} }); updateIthal(p.row.id, { dosyalar: [...(p.row.dosyalar||[]), ...files.map(f=>({ name:f.name })) ] }); }}>
          <Button size="small" onClick={()=>openUpload(p.row.id)}>Yükle</Button>
          {Array.isArray(p.row.dosyalar) && p.row.dosyalar.length>0 && (
            <Chip label={p.row.dosyalar.length} size="small" sx={{ ml: 0.5 }} />
          )}
        </Box>
      )},
      { field: 'copy', headerName: '', width: 50, renderCell: (p)=> (
        <IconButton size="small" onClick={()=> setIthalRows(rows => duplicateRow(rows, p.row.id))}><CopyIcon fontSize="inherit"/></IconButton>
      )},
      { field: 'talep', headerName: 'Talep', width: 180, renderCell: (p)=>(
        <Stack direction="row" spacing={1} alignItems="center">
          {p.row.talep?.durum && (
            <Chip size="small" label={p.row.talep.durum.replace(/_/g,' ').toUpperCase()} />
          )}
          <Button size="small" variant="outlined" disabled={!selectedTesvik} onClick={async()=>{
            const talep = { durum:'bakanliga_gonderildi', istenenAdet: Number(p.row.miktar)||0 };
            await tesvikService.setMakineTalep(selectedTesvik._id, { liste:'ithal', rowId:p.row.id, talep });
            updateIthal(p.row.id, { talep });
          }}>Gönder</Button>
        </Stack>
      ) },
      { field: 'karar', headerName: 'Karar', width: 220, renderCell: (p)=>(
        <Stack direction="row" spacing={1} alignItems="center">
          {p.row.karar?.kararDurumu && (
            <Chip size="small" label={p.row.karar.kararDurumu.toUpperCase()} />
          )}
          <Button size="small" disabled={!selectedTesvik} onClick={async()=>{
            const karar = { kararDurumu:'onay', onaylananAdet:Number(p.row.miktar)||0 };
            await tesvikService.setMakineKarar(selectedTesvik._id, { liste:'ithal', rowId:p.row.id, karar });
            updateIthal(p.row.id, { karar });
          }}>Onay</Button>
          <Button size="small" color="warning" disabled={!selectedTesvik} onClick={async()=>{
            const karar = { kararDurumu:'kismi_onay', onaylananAdet: Math.max(0, Math.floor((Number(p.row.miktar)||0)/2)) };
            await tesvikService.setMakineKarar(selectedTesvik._id, { liste:'ithal', rowId:p.row.id, karar });
            updateIthal(p.row.id, { karar });
          }}>Kısmi</Button>
          <Button size="small" color="error" disabled={!selectedTesvik} onClick={async()=>{
            const karar = { kararDurumu:'red', onaylananAdet:0 };
            await tesvikService.setMakineKarar(selectedTesvik._id, { liste:'ithal', rowId:p.row.id, karar });
            updateIthal(p.row.id, { karar });
          }}>Red</Button>
        </Stack>
      ) },
      { field: 'actions', headerName: '', width: 60, renderCell: (p)=>(
        <IconButton color="error" onClick={()=>delRow(p.row.id)}><DeleteIcon/></IconButton>
      )}
    ];
    return (
      <DataGrid autoHeight rows={filteredIthalRows} columns={cols} pageSize={10} rowsPerPageOptions={[10]} disableSelectionOnClick
        checkboxSelection
        selectionModel={selectionModel}
        onSelectionModelChange={(m)=> setSelectionModel(m)}
        onCellEditCommit={handleIthalCommit}
        onCellContextMenu={(params, event)=>{ event.preventDefault(); setContextAnchor(event.currentTarget); setContextRow({ ...params.row, id: params.id }); }}
        getCellClassName={(params)=>{
          if (params.field === 'miktar' && numberOrZero(params.value) <= 0) return 'error-cell';
          if (params.field === 'birim' && !params.row.birim) return 'error-cell';
          if (params.field === 'doviz' && !params.row.doviz) return 'error-cell';
          return '';
        }}
        sx={{ '& .error-cell': { backgroundColor: '#fee2e2' } }}
      />
    );
  };

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h5" sx={{ mb: 2, fontWeight: 700 }}>🛠️ Makine Teçhizat Yönetimi</Typography>

      {/* Belge Seçimi */}
      <Paper sx={{ p:2, mb:2 }}>
        <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 600 }}>Teşvik Belgesi Seç</Typography>
        <Autocomplete
          options={tesvikOptions}
          size="small"
          getOptionLabel={(o)=> o?.tesvikId || o?.gmId || o?.yatirimciUnvan || ''}
          isOptionEqualToValue={(o, v)=> (o?._id || o?.id) === (v?._id || v?.id)}
          filterOptions={(x)=>x}
          openOnFocus
          onInputChange={(e, val)=> searchTesvik(val)}
          value={selectedTesvik}
          onChange={(e, val)=> { setSelectedTesvik(val); loadTesvikMakineListeleri(val?._id); }}
          renderInput={(params)=> <TextField {...params} placeholder="Tesvik ID / GM ID / Ünvan ara..." />}
          loading={loadingTesvik}
          renderOption={(props, option)=> (
            <li {...props} key={option._id}>
              {option.tesvikId || option.gmId} — {option.yatirimciUnvan || option.firma?.tamUnvan || ''}
            </li>
          )}
        />
        <Stack direction="row" spacing={1} sx={{ mt: 1 }}>
          <Button size="small" variant="outlined" disabled={!selectedTesvik} onClick={()=> tesvikService.exportMakineExcel(selectedTesvik._id).then((res)=>{
            const blob = new Blob([res.data], { type: res.headers['content-type'] });
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url; a.download = `tesvik_${selectedTesvik?.tesvikId || selectedTesvik?.gmId}_makine.xlsx`;
            a.click(); window.URL.revokeObjectURL(url);
          })}>Belge Makine Excel İndir</Button>
          <Button size="small" variant="contained" disabled={!selectedTesvik} onClick={()=> setYerliRows([]) || setIthalRows([])}>Listeyi Temizle</Button>
        </Stack>
      </Paper>

      <Stack direction="row" spacing={1} sx={{ mb: 2, position: 'sticky', top: 0, zIndex: 2, backgroundColor: 'background.paper', py: 1 }}>
        <Chip label={`Yerli Toplam: ${yerliToplamTl.toLocaleString('tr-TR')} ₺`} color="primary" variant="outlined" />
        <Chip label={`İthal Toplam: ${ithalToplamUsd.toLocaleString('en-US')} $`} color="secondary" variant="outlined" />
        <Chip label={`İthal Toplam (TL): ${ithalToplamTl.toLocaleString('tr-TR')} ₺`} color="secondary" variant="outlined" />
        <Box sx={{ flex: 1 }} />
        <TextField size="small" placeholder="Satır ara (Ad/GTIP)" value={filterText} onChange={(e)=> setFilterText(e.target.value)} sx={{ width: 260 }} />
        <Tooltip title="Toplu İşlemler">
          <IconButton onClick={(e)=> setBulkMenuAnchor(e.currentTarget)}><MoreIcon/></IconButton>
        </Tooltip>
        <Menu open={!!bulkMenuAnchor} onClose={()=> setBulkMenuAnchor(null)} anchorEl={bulkMenuAnchor}>
          <MenuItem onClick={()=> { setBulkMenuAnchor(null); handleBulkTalep(); }}>Seçilenlere Talep Gönder</MenuItem>
          <MenuItem onClick={()=> { setBulkMenuAnchor(null); handleBulkKarar('onay'); }}>Seçilenleri Onayla</MenuItem>
          <MenuItem onClick={()=> { setBulkMenuAnchor(null); handleBulkKarar('kismi_onay'); }}>Seçilenlere Kısmi Onay</MenuItem>
          <MenuItem onClick={()=> { setBulkMenuAnchor(null); handleBulkKarar('red'); }}>Seçilenleri Reddet</MenuItem>
        </Menu>
      </Stack>

      <Paper sx={{ p: 2, mb: 2 }}>
        <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1 }}>
          <Tabs value={tab} onChange={(e,v)=>setTab(v)}>
            <Tab label="Yerli" value="yerli" />
            <Tab label="İthal" value="ithal" />
          </Tabs>
          <Box sx={{ flex: 1 }} />
          <Tooltip title="Satır Ekle"><IconButton onClick={addRow}><AddIcon/></IconButton></Tooltip>
          <Tooltip title="Toplamları Yenile (İthal)"><span><IconButton onClick={recalcIthalTotals} disabled={tab!== 'ithal'}><RecalcIcon/></IconButton></span></Tooltip>
          <Tooltip title="İçe Aktar"><label><input type="file" accept=".xlsx" hidden onChange={(e)=>{const f=e.target.files?.[0]; if(f) importExcel(f); e.target.value='';}} /><IconButton component="span"><ImportIcon/></IconButton></label></Tooltip>
          <Tooltip title="Dışa Aktar"><IconButton onClick={exportExcel}><ExportIcon/></IconButton></Tooltip>
        </Stack>

        {tab === 'yerli' ? <YerliGrid/> : <IthalGrid/>}
      </Paper>

      <FileUpload open={uploadOpen} onClose={closeUpload} onUploadComplete={handleUploadComplete} currentPath={`makine-yonetimi/${tab}/${uploadRowId||''}`} />

      {/* Sağ tık menüsü */}
      <Menu open={!!contextAnchor} anchorEl={contextAnchor} onClose={()=>{setContextAnchor(null); setContextRow(null);}}>
        <MenuItem onClick={()=>{ setContextAnchor(null); if (contextRow) setRowClipboard(contextRow); }}>Kopyala</MenuItem>
        <MenuItem onClick={()=>{ setContextAnchor(null); if (!contextRow || !rowClipboard) return; if (tab==='yerli') setYerliRows(rows=>{ const idx = rows.findIndex(r=> r.id===contextRow.id); const insert = { ...rowClipboard, id: Math.random().toString(36).slice(2) }; return [...rows.slice(0, idx+1), insert, ...rows.slice(idx+1)]; }); else setIthalRows(rows=>{ const idx = rows.findIndex(r=> r.id===contextRow.id); const insert = { ...rowClipboard, id: Math.random().toString(36).slice(2) }; return [...rows.slice(0, idx+1), insert, ...rows.slice(idx+1)]; }); }}>Yapıştır (Altına)</MenuItem>
        <MenuItem onClick={()=>{ setContextAnchor(null); if (contextRow) delRow(contextRow.id); }}>Sil</MenuItem>
      </Menu>

      {/* Kısmi Onay Dialog */}
      <Dialog open={partialOpen} onClose={()=> setPartialOpen(false)}>
        <DialogTitle>Kısmi Onay</DialogTitle>
        <DialogContent>
          <TextField autoFocus label="Onaylanacak Adet" type="number" value={partialQty} onChange={(e)=> setPartialQty(parseInt(e.target.value||'0',10))} sx={{ mt: 1 }} />
        </DialogContent>
        <DialogActions>
          <Button onClick={()=> setPartialOpen(false)}>İptal</Button>
          <Button variant="contained" onClick={async()=>{ setPartialOpen(false); await handleBulkKarar('kismi_onay', partialQty); }}>Uygula</Button>
        </DialogActions>
      </Dialog>

      {/* Favoriler menüsü */}
      <Menu open={!!favAnchor} anchorEl={favAnchor} onClose={closeFavMenu}>
        {(() => {
          const key = getFavKey(favType||'gtip');
          const list = loadFav(key);
          return (
            <Box>
              {list.length === 0 && <MenuItem disabled>Favori yok</MenuItem>}
              {list.map((it, idx) => (
                <MenuItem key={`${it.kod}-${idx}`} onClick={()=>{
                  if (!favRowId) return;
                  if (favType==='gtip') {
                    tab==='yerli' ? updateYerli(favRowId, { gtipKodu: it.kod, gtipAciklama: it.aciklama }) : updateIthal(favRowId, { gtipKodu: it.kod, gtipAciklama: it.aciklama });
                  } else if (favType==='unit') {
                    tab==='yerli' ? updateYerli(favRowId, { birim: it.kod }) : updateIthal(favRowId, { birim: it.kod });
                  } else if (favType==='currency') {
                    updateIthal(favRowId, { doviz: it.kod });
                  }
                  closeFavMenu();
                }}>
                  <StarIcon fontSize="small" sx={{ mr: 1 }} /> {it.kod} — {it.aciklama}
                </MenuItem>
              ))}
              <MenuItem onClick={()=>{ // aktif satırın değerini favoriye ekle
                if (!favRowId) return;
                const list = tab==='yerli' ? yerliRows : ithalRows;
                const row = list.find(r => r.id === favRowId);
                if (!row) return;
                if (favType==='gtip' && row.gtipKodu) addFavorite('gtip', { kod: row.gtipKodu, aciklama: row.gtipAciklama });
                if (favType==='unit' && row.birim) addFavorite('unit', { kod: row.birim, aciklama: '' });
                if (favType==='currency' && row.doviz) addFavorite('currency', { kod: row.doviz, aciklama: '' });
                closeFavMenu();
              }}>
                <StarBorderIcon fontSize="small" sx={{ mr: 1 }} /> Aktif değeri favorilere ekle
              </MenuItem>
            </Box>
          );
        })()}
      </Menu>

      {/* Şablon menüsü */}
      <Menu open={!!tplAnchor} anchorEl={tplAnchor} onClose={()=> setTplAnchor(null)}>
        <MenuItem disabled>Şablondan ekle</MenuItem>
        {(tab==='yerli' ? templatesYerli : templatesIthal).slice(0,10).map((tpl, idx) => (
          <MenuItem key={idx} onClick={()=> { insertTemplate(tpl); setTplAnchor(null); }}>
            <BookmarksIcon fontSize="small" sx={{ mr: 1 }} /> {(tpl.adi||tpl.gtipKodu||'Şablon')}
          </MenuItem>
        ))}
        <MenuItem onClick={()=> { setTplAnchor(null); saveTemplate(); }}>Aktif satırı şablona kaydet</MenuItem>
      </Menu>

      {/* Dosya önizleme dialog */}
      <Dialog open={previewOpen} onClose={()=> setPreviewOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>Önizleme</DialogTitle>
        <DialogContent dividers>
          {previewUrl && (/\.png$|\.jpg$|\.jpeg$|\.gif$/i.test(previewUrl) ? (
            <img src={previewUrl} alt="preview" style={{ maxWidth: '100%' }} />
          ) : (
            <iframe src={previewUrl} title="preview" style={{ width: '100%', height: 480, border: 0 }} />
          ))}
        </DialogContent>
        <DialogActions>
          <Button onClick={()=> setPreviewOpen(false)}>Kapat</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default MakineYonetimi;


