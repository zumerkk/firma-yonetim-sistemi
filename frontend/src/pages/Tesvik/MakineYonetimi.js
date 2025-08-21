import React, { useEffect, useMemo, useState } from 'react';
import { Box, Paper, Typography, Button, Tabs, Tab, Chip, Stack, IconButton, Tooltip, Menu, MenuItem, Dialog, DialogTitle, DialogContent, DialogActions, Select, Drawer } from '@mui/material';
import { DataGrid } from '@mui/x-data-grid';
import UnitCurrencySearch from '../../components/UnitCurrencySearch';
import FileUpload from '../../components/Files/FileUpload';
import tesvikService from '../../services/tesvikService';
import { Autocomplete, TextField, Divider } from '@mui/material';
import api from '../../utils/axios';
import currencyService from '../../services/currencyService';
import * as XLSX from 'xlsx';
import ExcelJS from 'exceljs';
import { Add as AddIcon, Delete as DeleteIcon, FileUpload as ImportIcon, Download as ExportIcon, Replay as RecalcIcon, ContentCopy as CopyIcon, MoreVert as MoreIcon, Star as StarIcon, StarBorder as StarBorderIcon, Bookmarks as BookmarksIcon, Visibility as VisibilityIcon, Send as SendIcon, Check as CheckIcon, Percent as PercentIcon, Clear as ClearIcon, Fullscreen as FullscreenIcon, FullscreenExit as FullscreenExitIcon, ViewColumn as ViewColumnIcon } from '@mui/icons-material';
import GTIPSuperSearch from '../../components/GTIPSuperSearch';

  const numberOrZero = (v) => {
  const n = parseFloat((v ?? '').toString().replace(/[^\d.-]/g, ''));
  return isNaN(n) ? 0 : n;
};

const emptyYerli = () => ({ id: Math.random().toString(36).slice(2), siraNo: 0, gtipKodu: '', gtipAciklama: '', adi: '', miktar: 0, birim: '', birimAciklamasi: '', birimFiyatiTl: 0, toplamTl: 0, kdvIstisnasi: '' , makineTechizatTipi:'', finansalKiralamaMi:'', finansalKiralamaAdet:0, finansalKiralamaSirket:'', gerceklesenAdet:0, gerceklesenTutar:0, iadeDevirSatisVarMi:'', iadeDevirSatisAdet:0, iadeDevirSatisTutar:0, dosyalar: []});
const emptyIthal = () => ({ id: Math.random().toString(36).slice(2), siraNo: 0, gtipKodu: '', gtipAciklama: '', adi: '', miktar: 0, birim: '', birimAciklamasi: '', birimFiyatiFob: 0, doviz: '', toplamUsd: 0, toplamTl: 0, tlManuel: false, kullanilmisKod: '', kullanilmisAciklama: '', ckdSkd: '', aracMi: '', makineTechizatTipi:'', kdvMuafiyeti:'', gumrukVergisiMuafiyeti:'', finansalKiralamaMi:'', finansalKiralamaAdet:0, finansalKiralamaSirket:'', gerceklesenAdet:0, gerceklesenTutar:0, iadeDevirSatisVarMi:'', iadeDevirSatisAdet:0, iadeDevirSatisTutar:0, dosyalar: []});

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
  const [gumrukMuaf, setGumrukMuaf] = useState(false);
  const [kdvMuaf, setKdvMuaf] = useState(false);
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
  const [density, setDensity] = useState('compact');
  const [fullScreen, setFullScreen] = useState(false);
  const [columnsAnchor, setColumnsAnchor] = useState(null);
  const [columnVisibilityModel, setColumnVisibilityModel] = useState({ gtipAciklama: false });
  const [columnOrderYerli, setColumnOrderYerli] = useState(()=>{ try{return JSON.parse(localStorage.getItem('mk_cols_order_yerli')||'[]')}catch{return []};});
  const [columnOrderIthal, setColumnOrderIthal] = useState(()=>{ try{return JSON.parse(localStorage.getItem('mk_cols_order_ithal')||'[]')}catch{return []};});
  const [groupBy, setGroupBy] = useState('none'); // none|gtip|birim|kullanilmis
  const [errorsOpen, setErrorsOpen] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);

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

  // Otomatik TL hesaplama (kurla) - kullanıcı TL'yi manuel değiştirmediyse
  useEffect(() => {
    (async () => {
      if (!Array.isArray(ithalRows) || ithalRows.length === 0) return;
      let changed = false;
      const nextRows = await Promise.all(ithalRows.map(async (r) => {
        try {
          if (r.tlManuel) return r; // manuel modda dokunma
          const miktar = numberOrZero(r.miktar);
          const fob = numberOrZero(r.birimFiyatiFob);
          const usd = miktar * fob;
          // Döviz yoksa sadece USD güncelle
          if (!r.doviz) {
            if (numberOrZero(r.toplamUsd) !== usd) { changed = true; return { ...r, toplamUsd: usd }; }
            return r;
          }
          const doviz = (r.doviz || '').toUpperCase();
          if (doviz === 'TRY') {
            const tl = usd;
            if (numberOrZero(r.toplamUsd) !== usd || numberOrZero(r.toplamTl) !== tl) { changed = true; return { ...r, toplamUsd: usd, toplamTl: tl }; }
            return r;
          }
          // Kur çek ve TL hesapla
          const key = `${doviz}->TRY`;
          let rate = rateCache[key];
          if (!rate) {
            try {
              rate = await currencyService.getRate(doviz, 'TRY');
              if (rate) setRateCache(prev => ({ ...prev, [key]: rate }));
            } catch { /* ignore */ }
          }
          const tl = rate ? Math.round(usd * rate) : numberOrZero(r.toplamTl);
          if (numberOrZero(r.toplamUsd) !== usd || (rate && numberOrZero(r.toplamTl) !== tl)) {
            changed = true; return { ...r, toplamUsd: usd, ...(rate ? { toplamTl: tl } : {}) };
          }
          return r;
        } catch { return r; }
      }));
      if (changed) setIthalRows(nextRows);
    })();
  }, [ithalRows, rateCache]);

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

  const totals = useMemo(()=>({
    yerli: {
      filtered: filteredYerliRows.reduce((s,r)=> s + numberOrZero(r.toplamTl), 0),
      all: yerliRows.reduce((s,r)=> s + numberOrZero(r.toplamTl), 0)
    },
    ithal: {
      filteredUsd: filteredIthalRows.reduce((s,r)=> s + numberOrZero(r.toplamUsd), 0),
      filteredTl: filteredIthalRows.reduce((s,r)=> s + numberOrZero(r.toplamTl), 0),
      allUsd: ithalRows.reduce((s,r)=> s + numberOrZero(r.toplamUsd), 0),
      allTl: ithalRows.reduce((s,r)=> s + numberOrZero(r.toplamTl), 0)
    }
  }), [filteredYerliRows, yerliRows, filteredIthalRows, ithalRows]);

  const groupSummary = useMemo(()=>{
    const list = tab==='yerli' ? filteredYerliRows : filteredIthalRows;
    const map = new Map();
    const keyFn = groupBy==='gtip' ? (r)=> r.gtipKodu || '-' : groupBy==='birim' ? (r)=> r.birim || '-' : groupBy==='kullanilmis' ? (r)=> (r.kullanilmisKod ? 'KULLANILMIŞ' : 'YENİ') : null;
    if (!keyFn) return [];
    for (const r of list) {
      const k = keyFn(r);
      const o = map.get(k) || { count:0, toplamTl:0, toplamUsd:0 };
      o.count += 1;
      o.toplamTl += numberOrZero(r.toplamTl);
      o.toplamUsd += numberOrZero(r.toplamUsd);
      map.set(k,o);
    }
    return Array.from(map.entries()).map(([k,v])=> ({ key:k, ...v }));
  }, [tab, filteredYerliRows, filteredIthalRows, groupBy]);

  // Keyboard shortcuts
  useEffect(()=>{
    const handler = (e)=>{
      if (e.key==='?' || (e.shiftKey && e.key==='/')) { e.preventDefault(); setHelpOpen(true); }
      if ((e.ctrlKey||e.metaKey) && e.key==='Enter') { e.preventDefault(); addRow(); }
      if ((e.ctrlKey||e.metaKey) && e.key.toLowerCase()==='c' && selectionModel.length===1) { e.preventDefault(); const id=selectionModel[0]; const list=tab==='yerli'?yerliRows:ithalRows; const row=list.find(r=>r.id===id); if(row) setRowClipboard(row); }
      if ((e.ctrlKey||e.metaKey) && e.key.toLowerCase()==='v' && selectionModel.length===1 && rowClipboard) { e.preventDefault(); const id=selectionModel[0]; if(tab==='yerli') setYerliRows(rows=>{const idx=rows.findIndex(r=>r.id===id); const ins={...rowClipboard,id:Math.random().toString(36).slice(2)}; return [...rows.slice(0,idx+1),ins,...rows.slice(idx+1)];}); else setIthalRows(rows=>{const idx=rows.findIndex(r=>r.id===id); const ins={...rowClipboard,id:Math.random().toString(36).slice(2)}; return [...rows.slice(0,idx+1),ins,...rows.slice(idx+1)];}); }
      if (e.key==='Delete' && selectionModel.length>0) { e.preventDefault(); selectionModel.forEach(id=> delRow(id)); }
    };
    window.addEventListener('keydown', handler);
    return ()=> window.removeEventListener('keydown', handler);
  }, [selectionModel, tab, yerliRows, ithalRows, rowClipboard]);

  const updateYerli = (id, patch) => setYerliRows(rows => rows.map(r => r.id === id ? calcYerli({ ...r, ...patch }) : r));
  const updateIthal = (id, patch) => setIthalRows(rows => rows.map(r => r.id === id ? calcIthal({ ...r, ...patch }) : r));

  // DataGrid v6 için doğru event: onCellEditStop veya onCellEditCommit
  const handleYerliCommit = (params) => {
    const patch = { [params.field]: params.value };
    updateYerli(params.id, patch);
  };
  const handleIthalCommit = async (params) => {
    const field = params.field;
    const value = params.value;
    const row = ithalRows.find(r => r.id === params.id) || {};
    const next = { ...row, [field]: value };
    // 1) USD'yi canlı hesapla (miktar/FOB değiştiğinde)
    if (field === 'miktar' || field === 'birimFiyatiFob') {
      const miktar = numberOrZero(field === 'miktar' ? value : next.miktar);
      const fob = numberOrZero(field === 'birimFiyatiFob' ? value : next.birimFiyatiFob);
      const usd = miktar * fob;
      // çekirdek alan değiştiyse manuel TL resetle (yeniden otomatik hesaplansın)
      updateIthal(params.id, { [field]: value, toplamUsd: usd, tlManuel: false });
      // TRY ise TL = USD; değilse kur ile TL (manuel değilse)
      if ((next.doviz || '').toUpperCase() === 'TRY') {
        if (!next.tlManuel) updateIthal(params.id, { toplamTl: usd });
      } else if (!next.tlManuel && next.doviz) {
        try {
          const key = `${next.doviz}->TRY`;
          let rate = rateCache[key];
          if (!rate) { rate = await currencyService.getRate(next.doviz, 'TRY'); setRateCache(prev => ({ ...prev, [key]: rate })); }
          updateIthal(params.id, { toplamTl: Math.round(usd * (rate || 0)) });
        } catch {}
      }
      return;
    }
    // 2) Döviz değiştiğinde TL'yi güncelle (manuel değilse)
    if (field === 'doviz') {
      updateIthal(params.id, { doviz: value, tlManuel: false });
      const miktar = numberOrZero(next.miktar);
      const fob = numberOrZero(next.birimFiyatiFob);
      const usd = miktar * fob;
      if ((value || '').toUpperCase() === 'TRY') {
        if (!next.tlManuel) updateIthal(params.id, { toplamUsd: usd, toplamTl: usd });
      } else if (!next.tlManuel && value) {
        try {
          const key = `${value}->TRY`;
          let rate = rateCache[key];
          if (!rate) { rate = await currencyService.getRate(value, 'TRY'); setRateCache(prev => ({ ...prev, [key]: rate })); }
          updateIthal(params.id, { toplamUsd: usd, toplamTl: Math.round(usd * (rate || 0)) });
        } catch { updateIthal(params.id, { toplamUsd: usd }); }
      } else {
        updateIthal(params.id, { toplamUsd: usd });
      }
      return;
    }
    // 3) TL elle düzenlendiyse manuel mod
    if (field === 'toplamTl') {
      const newVal = numberOrZero(value);
      if (newVal !== numberOrZero(row.toplamTl)) {
        updateIthal(params.id, { toplamTl: newVal, tlManuel: true });
      }
      return;
    }
    // Diğer alanlar için patch
    updateIthal(params.id, { [field]: value });
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
    if (tab === 'yerli') setYerliRows(rows => { const nextSira = (rows[rows.length-1]?.siraNo || rows.length) + 1; return [...rows, { ...emptyYerli(), siraNo: nextSira }]; });
    else setIthalRows(rows => { const nextSira = (rows[rows.length-1]?.siraNo || rows.length) + 1; return [...rows, { ...emptyIthal(), siraNo: nextSira }]; });
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
    // Daha profesyonel Excel çıktı: stil, dondurulmuş başlık, filtre, numara formatları,
    // veri doğrulama (EVET/HAYIR ve Makine Tipi), toplam satırları ve özet sayfası.

    const wb = new ExcelJS.Workbook();
    wb.creator = 'Firma Yönetim Sistemi';
    wb.created = new Date();

    // Yardımcı: kolon index → harf
    const colLetter = (n) => {
      let s = ''; let x = n;
      while (x > 0) { const m = (x - 1) % 26; s = String.fromCharCode(65 + m) + s; x = Math.floor((x - 1) / 26); }
      return s;
    };

    // Yardımcı: sayfayı profesyonel hale getir
    const finalizeSheet = (ws, numRows) => {
      // Başlık satırı
      const header = ws.getRow(1);
      header.font = { bold: true, color: { argb: 'FF1F2937' } };
      header.alignment = { horizontal: 'center', vertical: 'middle' };
      header.height = 20;
      header.eachCell((cell) => {
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE5E7EB' } };
        cell.border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } };
      });
      // Satır stilleri
      ws.eachRow((row, rowNumber) => {
        if (rowNumber > 1) {
          row.alignment = { vertical: 'middle' };
        }
      });
      // Dondur ve filtre ekle
      ws.views = [{ state: 'frozen', ySplit: 1 }];
      const lastCol = colLetter(ws.columnCount);
      ws.autoFilter = `A1:${lastCol}1`;
      // Baskı ve kenar boşlukları
      ws.pageSetup = { fitToPage: true, orientation: 'landscape', margins: { left: 0.4, right: 0.4, top: 0.5, bottom: 0.5 } };
      // Zebra şerit (okunabilirlik)
      for (let r = 2; r <= numRows; r += 2) {
        ws.getRow(r).eachCell((cell) => {
          cell.fill = cell.fill || { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFFFFF' } };
        });
      }
    };

    // Lookup/Validation sayfası (gizli)
    const wsLists = wb.addWorksheet('Lists');
    wsLists.state = 'veryHidden';
    wsLists.getCell('A1').value = 'EVETHAYIR';
    wsLists.getCell('A2').value = 'EVET';
    wsLists.getCell('A3').value = 'HAYIR';
    wsLists.getCell('B1').value = 'MAKINE_TIPI';
    wsLists.getCell('B2').value = 'Ana Makine';
    wsLists.getCell('B3').value = 'Yardımcı Makine';

    // Alan setleri
    const yerliColumns = [
      { header: 'Sıra No', key: 'siraNo', width: 10 },
      { header: 'GTIP No', key: 'gtipKodu', width: 16 },
      { header: 'GTIP Açıklama', key: 'gtipAciklama', width: 32 },
      { header: 'Adı ve Özelliği', key: 'adi', width: 36 },
      { header: 'Miktarı', key: 'miktar', width: 12, numFmt: '#,##0' },
      { header: 'Birimi', key: 'birim', width: 12 },
      { header: 'Birim Açıklaması', key: 'birimAciklamasi', width: 22 },
      { header: 'Birim Fiyatı(TL)(KDV HARİÇ)', key: 'birimFiyatiTl', width: 20, numFmt: '#,##0.00' },
      { header: 'Toplam Tutar (TL)', key: 'toplamTl', width: 18, numFmt: '#,##0' },
      { header: 'Makine Teçhizat Tipi', key: 'makineTechizatTipi', width: 18 },
      { header: 'KDV Muafiyeti (EVET/HAYIR)', key: 'kdvIstisnasi', width: 22 },
      { header: 'Finansal Kiralama Mı', key: 'finansalKiralamaMi', width: 18 },
      { header: 'Finansal Kiralama İse Adet ', key: 'finansalKiralamaAdet', width: 20, numFmt: '#,##0' },
      { header: 'Finansal Kiralama İse Şirket', key: 'finansalKiralamaSirket', width: 24 },
      { header: 'Gerçekleşen Adet', key: 'gerceklesenAdet', width: 16, numFmt: '#,##0' },
      { header: 'Gerçekleşen Tutar ', key: 'gerceklesenTutar', width: 18, numFmt: '#,##0' },
      { header: 'İade-Devir-Satış Var mı?', key: 'iadeDevirSatisVarMi', width: 20 },
      { header: 'İade-Devir-Satış adet', key: 'iadeDevirSatisAdet', width: 20, numFmt: '#,##0' },
      { header: 'İade Devir Satış Tutar', key: 'iadeDevirSatisTutar', width: 20, numFmt: '#,##0' }
    ];

    const ithalColumns = [
      { header: 'Sıra No', key: 'siraNo', width: 10 },
      { header: 'GTIP No', key: 'gtipKodu', width: 16 },
      { header: 'GTIP Açıklama', key: 'gtipAciklama', width: 32 },
      { header: 'Adı ve Özelliği', key: 'adi', width: 36 },
      { header: 'Miktarı', key: 'miktar', width: 12, numFmt: '#,##0' },
      { header: 'Birimi', key: 'birim', width: 12 },
      { header: 'Birim Açıklaması', key: 'birimAciklamasi', width: 22 },
      { header: 'Menşei Döviz Birim Fiyatı (FOB)', key: 'birimFiyatiFob', width: 24, numFmt: '#,##0.00' },
      { header: 'Menşei Döviz Cinsi (FOB)', key: 'doviz', width: 18 },
      { header: 'Toplam Tutar (FOB $)', key: 'toplamUsd', width: 20, numFmt: '#,##0' },
      { header: 'Toplam Tutar (FOB TL)', key: 'toplamTl', width: 20, numFmt: '#,##0' },
      { header: 'KULLANILMIŞ MAKİNE', key: 'kullanilmisKod', width: 22 },
      { header: 'Makine Teçhizat Tipi', key: 'makineTechizatTipi', width: 18 },
      { header: 'KDV Muafiyeti', key: 'kdvMuafiyeti', width: 16 },
      { header: 'Gümrük Vergisi Muafiyeti', key: 'gumrukVergisiMuafiyeti', width: 22 },
      { header: 'Finansal Kiralama Mı', key: 'finansalKiralamaMi', width: 18 },
      { header: 'Finansal Kiralama İse Adet ', key: 'finansalKiralamaAdet', width: 20, numFmt: '#,##0' },
      { header: 'Finansal Kiralama İse Şirket', key: 'finansalKiralamaSirket', width: 24 },
      { header: 'Gerçekleşen Adet', key: 'gerceklesenAdet', width: 16, numFmt: '#,##0' },
      { header: 'Gerçekleşen Tutar ', key: 'gerceklesenTutar', width: 18, numFmt: '#,##0' },
      { header: 'İade-Devir-Satış Var mı?', key: 'iadeDevirSatisVarMi', width: 20 },
      { header: 'İade-Devir-Satış adet', key: 'iadeDevirSatisAdet', width: 20, numFmt: '#,##0' },
      { header: 'İade Devir Satış Tutar', key: 'iadeDevirSatisTutar', width: 20, numFmt: '#,##0' }
    ];

    // Yerli sayfası
    const wsYerli = wb.addWorksheet('Yerli');
    wsYerli.columns = yerliColumns;
    yerliRows.forEach((r) => {
      // Toplam TL'yi Excel içinde formülle üretelim
      const row = wsYerli.addRow({ ...r, toplamTl: undefined });
      const miktarCol = yerliColumns.findIndex(c => c.key === 'miktar') + 1;
      const bfCol = yerliColumns.findIndex(c => c.key === 'birimFiyatiTl') + 1;
      const toplamCol = yerliColumns.findIndex(c => c.key === 'toplamTl') + 1;
      row.getCell(toplamCol).value = { formula: `${colLetter(miktarCol)}${row.number}*${colLetter(bfCol)}${row.number}` };
    });
    // Numara formatlarını uygula
    yerliColumns.forEach((c, idx) => { if (c.numFmt) wsYerli.getColumn(idx + 1).numFmt = c.numFmt; });
    finalizeSheet(wsYerli, wsYerli.rowCount);
    // Veri doğrulama: EVET/HAYIR ve Makine Tipi
    const idxKdvY = yerliColumns.findIndex(c => c.key === 'kdvIstisnasi') + 1;
    const idxFkY = yerliColumns.findIndex(c => c.key === 'finansalKiralamaMi') + 1;
    const idxIadeY = yerliColumns.findIndex(c => c.key === 'iadeDevirSatisVarMi') + 1;
    const idxTipY = yerliColumns.findIndex(c => c.key === 'makineTechizatTipi') + 1;
    const endRowY = Math.max(wsYerli.rowCount + 100, 1000); // boş satırlar için ileriye kadar
    wsYerli.dataValidations.add(`${colLetter(idxKdvY)}2:${colLetter(idxKdvY)}${endRowY}`, { type: 'list', allowBlank: true, formulae: ['=Lists!$A$2:$A$3'] });
    wsYerli.dataValidations.add(`${colLetter(idxFkY)}2:${colLetter(idxFkY)}${endRowY}`, { type: 'list', allowBlank: true, formulae: ['=Lists!$A$2:$A$3'] });
    wsYerli.dataValidations.add(`${colLetter(idxIadeY)}2:${colLetter(idxIadeY)}${endRowY}`, { type: 'list', allowBlank: true, formulae: ['=Lists!$A$2:$A$3'] });
    wsYerli.dataValidations.add(`${colLetter(idxTipY)}2:${colLetter(idxTipY)}${endRowY}`, { type: 'list', allowBlank: true, formulae: ['=Lists!$B$2:$B$3'] });
    // Toplam satırı (TL)
    const totalRowY = wsYerli.addRow({});
    const toplamColY = yerliColumns.findIndex(c => c.key === 'toplamTl') + 1;
    totalRowY.getCell(toplamColY).value = { formula: `SUM(${colLetter(toplamColY)}2:${colLetter(toplamColY)}${wsYerli.rowCount - 1})` };
    totalRowY.font = { bold: true };

    // İthal sayfası
    const wsIthal = wb.addWorksheet('İthal');
    wsIthal.columns = ithalColumns;
    ithalRows.forEach((r) => {
      // $'ı Excel formülüyle üret
      const row = wsIthal.addRow({ ...r });
      const miktarCol = ithalColumns.findIndex(c => c.key === 'miktar') + 1;
      const fobCol = ithalColumns.findIndex(c => c.key === 'birimFiyatiFob') + 1;
      const usdCol = ithalColumns.findIndex(c => c.key === 'toplamUsd') + 1;
      row.getCell(usdCol).value = { formula: `${colLetter(miktarCol)}${row.number}*${colLetter(fobCol)}${row.number}` };
    });
    ithalColumns.forEach((c, idx) => { if (c.numFmt) wsIthal.getColumn(idx + 1).numFmt = c.numFmt; });
    finalizeSheet(wsIthal, wsIthal.rowCount);
    // Veri doğrulama sütunları: EVET/HAYIR + Makine Tipi
    const idxKdvI = ithalColumns.findIndex(c => c.key === 'kdvMuafiyeti') + 1;
    const idxGvI = ithalColumns.findIndex(c => c.key === 'gumrukVergisiMuafiyeti') + 1;
    const idxFkI = ithalColumns.findIndex(c => c.key === 'finansalKiralamaMi') + 1;
    const idxIadeI = ithalColumns.findIndex(c => c.key === 'iadeDevirSatisVarMi') + 1;
    const idxTipI = ithalColumns.findIndex(c => c.key === 'makineTechizatTipi') + 1;
    const endRowI = Math.max(wsIthal.rowCount + 100, 1000);
    [idxKdvI, idxGvI, idxFkI, idxIadeI].forEach((idx) => wsIthal.dataValidations.add(`${colLetter(idx)}2:${colLetter(idx)}${endRowI}`, { type: 'list', allowBlank: true, formulae: ['=Lists!$A$2:$A$3'] }));
    wsIthal.dataValidations.add(`${colLetter(idxTipI)}2:${colLetter(idxTipI)}${endRowI}`, { type: 'list', allowBlank: true, formulae: ['=Lists!$B$2:$B$3'] });
    // Toplam satırları ($ ve TL)
    const totalRowI = wsIthal.addRow({});
    const colUsd = ithalColumns.findIndex(c => c.key === 'toplamUsd') + 1;
    const colTl = ithalColumns.findIndex(c => c.key === 'toplamTl') + 1;
    totalRowI.getCell(colUsd).value = { formula: `SUM(${colLetter(colUsd)}2:${colLetter(colUsd)}${wsIthal.rowCount - 1})` };
    totalRowI.getCell(colTl).value = { formula: `SUM(${colLetter(colTl)}2:${colLetter(colTl)}${wsIthal.rowCount - 1})` };
    totalRowI.font = { bold: true };

    // Özet sayfası
    const wsSummary = wb.addWorksheet('Özet');
    wsSummary.columns = [ { header: 'Alan', key: 'k', width: 28 }, { header: 'Değer', key: 'v', width: 40 } ];
    wsSummary.addRows([
      { k: 'Tarih', v: new Date().toLocaleString('tr-TR') },
      { k: 'Belge', v: selectedTesvik ? `${selectedTesvik.tesvikId || selectedTesvik.gmId} — ${selectedTesvik.yatirimciUnvan || selectedTesvik.firma?.tamUnvan || ''}` : '-' },
      { k: 'Yerli Toplam (TL)', v: yerliToplamTl },
      { k: 'İthal Toplam ($)', v: ithalToplamUsd },
      { k: 'İthal Toplam (TL)', v: ithalToplamTl }
    ]);
    wsSummary.getColumn(2).numFmt = '#,##0';
    wsSummary.getRow(1).font = { bold: true };

    // Çıktıyı indir
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
    // Muafiyetleri destek unsurlarından türet
    const destekList = Array.isArray(data?.destekUnsurlari) ? data.destekUnsurlari : [];
    const hasGumruk = destekList.some(d => (d?.destekUnsuru || '').toLowerCase() === 'gümrük vergisi muafiyeti');
    const hasKdv = destekList.some(d => (d?.destekUnsuru || '').toLowerCase() === 'kdv istisnası' || (d?.destekUnsuru || '').toLowerCase() === 'kdv i̇stisnası');
    setGumrukMuaf(!!hasGumruk);
    setKdvMuaf(!!hasKdv);
    const yerli = (data?.makineListeleri?.yerli || []).map(r => ({
      id: r.rowId || Math.random().toString(36).slice(2),
      rowId: r.rowId,
      siraNo: r.siraNo || 0,
      gtipKodu: r.gtipKodu || '',
      gtipAciklama: r.gtipAciklamasi || '',
      adi: r.adiVeOzelligi || '',
      miktar: r.miktar || 0,
      birim: r.birim || '', birimAciklamasi: r.birimAciklamasi || '',
      birimFiyatiTl: r.birimFiyatiTl || 0,
      toplamTl: r.toplamTutariTl || 0,
      kdvIstisnasi: r.kdvIstisnasi || '',
      makineTechizatTipi: r.makineTechizatTipi || '',
      finansalKiralamaMi: r.finansalKiralamaMi || '',
      finansalKiralamaAdet: r.finansalKiralamaAdet || 0,
      finansalKiralamaSirket: r.finansalKiralamaSirket || '',
      gerceklesenAdet: r.gerceklesenAdet || 0,
      gerceklesenTutar: r.gerceklesenTutar || 0,
      iadeDevirSatisVarMi: r.iadeDevirSatisVarMi || '',
      iadeDevirSatisAdet: r.iadeDevirSatisAdet || 0,
      iadeDevirSatisTutar: r.iadeDevirSatisTutar || 0,
      talep: r.talep || null,
      karar: r.karar || null
    }));
    const ithal = (data?.makineListeleri?.ithal || []).map(r => ({
      id: r.rowId || Math.random().toString(36).slice(2),
      rowId: r.rowId,
      siraNo: r.siraNo || 0,
      gtipKodu: r.gtipKodu || '',
      gtipAciklama: r.gtipAciklamasi || '',
      adi: r.adiVeOzelligi || '',
      miktar: r.miktar || 0,
      birim: r.birim || '', birimAciklamasi: r.birimAciklamasi || '',
      birimFiyatiFob: r.birimFiyatiFob || 0,
      doviz: r.gumrukDovizKodu || '',
      toplamUsd: r.toplamTutarFobUsd || 0,
      toplamTl: r.toplamTutarFobTl || 0,
      kdvIstisnasi: r.kdvIstisnasi || '',
      kullanilmisKod: r.kullanilmisMakine || '',
      kullanilmisAciklama: r.kullanilmisMakineAciklama || '',
      ckdSkd: r.ckdSkdMi || '',
      aracMi: r.aracMi || '',
      makineTechizatTipi: r.makineTechizatTipi || '',
      kdvMuafiyeti: r.kdvMuafiyeti || '',
      gumrukVergisiMuafiyeti: r.gumrukVergisiMuafiyeti || '',
      finansalKiralamaMi: r.finansalKiralamaMi || '',
      finansalKiralamaAdet: r.finansalKiralamaAdet || 0,
      finansalKiralamaSirket: r.finansalKiralamaSirket || '',
      gerceklesenAdet: r.gerceklesenAdet || 0,
      gerceklesenTutar: r.gerceklesenTutar || 0,
      iadeDevirSatisVarMi: r.iadeDevirSatisVarMi || '',
      iadeDevirSatisAdet: r.iadeDevirSatisAdet || 0,
      iadeDevirSatisTutar: r.iadeDevirSatisTutar || 0,
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
      const obj = { id: Math.random().toString(36).slice(2), siraNo: r['Sıra No'] || 0, gtipKodu: r['GTIP No'], gtipAciklama: r['GTIP Açıklama'], adi: r['Adı ve Özelliği'], miktar: r['Miktarı'], birim: r['Birimi'], birimAciklamasi: r['Birim Açıklaması'] || '', birimFiyatiTl: r['Birim Fiyatı(TL)(KDV HARİÇ)'] || r['Birim Fiyatı (TL)'], toplamTl: r['Toplam Tutar (TL)'], kdvIstisnasi: r['KDV Muafiyeti Var Mı?'] || r['KDV Muafiyeti (EVET/HAYIR)'] || r['KDV İstisnası'], makineTechizatTipi: r['Makine Teçhizat Tipi'] || '', finansalKiralamaMi: r['Finansal Kiralama Mı'] || '', finansalKiralamaAdet: r['Finansal Kiralama İse Adet '] || 0, finansalKiralamaSirket: r['Finansal Kiralama İse Şirket'] || '', gerceklesenAdet: r['Gerçekleşen Adet'] || 0, gerceklesenTutar: r['Gerçekleşen Tutar '] || 0, iadeDevirSatisVarMi: r['İade-Devir-Satış Var mı?'] || '', iadeDevirSatisAdet: r['İade-Devir-Satış adet'] || 0, iadeDevirSatisTutar: r['İade Devir Satış Tutar'] || 0, dosyalar: [] };
      const errs = [];
      if (!obj.adi) errs.push('Adı boş');
      if (!obj.birim) errs.push('Birim boş');
      if (!numberOrZero(obj.miktar)) errs.push('Miktar 0');
      if (errs.length) obj._errors = errs;
      return calcYerli(obj);
    });
    const ithalMapped = ithal.map(r => {
      const obj = { id: Math.random().toString(36).slice(2), siraNo: r['Sıra No'] || 0, gtipKodu: r['GTIP No'], gtipAciklama: r['GTIP Açıklama'], adi: r['Adı ve Özelliği'], miktar: r['Miktarı'], birim: r['Birimi'], birimAciklamasi: r['Birim Açıklaması'] || '', birimFiyatiFob: r['Mensei Doviz Tutari(Fob)'] || r['Menşei Döviz Birim Fiyatı (FOB)'], doviz: r['Mensei Doviz Cinsi(Fob)'] || r['Menşei Döviz Cinsi (FOB)'], toplamUsd: r['Toplam Tutar (FOB $)'], toplamTl: r['Toplam Tutar (FOB TL)'], kullanilmisKod: r['KULLANILMIŞ MAKİNE'] || r['Kullanılmış Makine (Kod)'], kullanilmisAciklama: r['Kullanılmış Makine (Açıklama)'] || '', makineTechizatTipi: r['Makine Teçhizat Tipi'] || '', kdvMuafiyeti: r['KDV Muafiyeti'] || '', gumrukVergisiMuafiyeti: r['Gümrük Vergisi Muafiyeti'] || '', finansalKiralamaMi: r['Finansal Kiralama Mı'] || '', finansalKiralamaAdet: r['Finansal Kiralama İse Adet '] || 0, finansalKiralamaSirket: r['Finansal Kiralama İse Şirket'] || '', gerceklesenAdet: r['Gerçekleşen Adet'] || 0, gerceklesenTutar: r['Gerçekleşen Tutar '] || 0, iadeDevirSatisVarMi: r['İade-Devir-Satış Var mı?'] || '', iadeDevirSatisAdet: r['İade-Devir-Satış adet'] || 0, iadeDevirSatisTutar: r['İade Devir Satış Tutar'] || 0, ckdSkd: '', aracMi: '', dosyalar: [] };
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
    // Döviz kuruna göre TL hesapla (TRY hedef) + USD yoksa önce hesapla
    const results = await Promise.all(ithalRows.map(async r => {
      if (r.tlManuel) return r; // kullanıcı elle girmişse dokunma
      const miktar = numberOrZero(r.miktar);
      const fob = numberOrZero(r.birimFiyatiFob);
      const usd = miktar * fob;
      if (!r.doviz || (r.doviz || '').toUpperCase() === 'TRY') return { ...r, toplamUsd: usd, toplamTl: usd };
      try {
        const key = `${r.doviz}->TRY`;
        let rate = rateCache[key];
        if (!rate) { rate = await currencyService.getRate(r.doviz, 'TRY'); setRateCache(prev => ({ ...prev, [key]: rate })); }
        return { ...r, toplamUsd: usd, toplamTl: Math.round(usd * (rate || 0)) };
      } catch { return { ...r, toplamUsd: usd }; }
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
      { field: 'siraNo', headerName: '#', width: 70, editable: true, type: 'number' },
      { field: 'gtipKodu', headerName: 'GTIP', width: 200, renderCell: (p) => (
        <Stack direction="row" spacing={0.5} alignItems="center" sx={{ width: '100%' }}>
          <Box sx={{ flex: 1 }}>
            <GTIPSuperSearch value={p.row.gtipKodu} onChange={(kod, aciklama)=>{ const patch = { gtipKodu: kod, gtipAciklama: aciklama }; if (!p.row.adi) patch.adi = aciklama; updateYerli(p.row.id, patch); }} />
          </Box>
          <IconButton size="small" onClick={(e)=> openFavMenu(e, 'gtip', p.row.id)}><StarBorderIcon fontSize="inherit"/></IconButton>
        </Stack>
      ) },
      { field: 'gtipAciklama', headerName: 'GTIP Açıklama', flex: 1, minWidth: 200, editable: true },
      { field: 'adi', headerName: 'Adı ve Özelliği', flex: 1, minWidth: 220, editable: true },
      { field: 'kdvIstisnasi', headerName: 'KDV Muafiyeti', width: 140, renderCell: (p) => (
        <Select size="small" value={p.row.kdvIstisnasi || ''} onChange={(e)=> updateYerli(p.row.id, { kdvIstisnasi: e.target.value })} displayEmpty fullWidth>
          <MenuItem value="">-</MenuItem>
          <MenuItem value="EVET">EVET</MenuItem>
          <MenuItem value="HAYIR">HAYIR</MenuItem>
        </Select>
      ) },
      { field: 'miktar', headerName: 'Miktar', width: 90, editable: true, type: 'number' },
      { field: 'birim', headerName: 'Birim', width: 180, renderCell: (p) => (
          <Stack direction="row" spacing={0.5} alignItems="center" sx={{ width: '100%' }}>
            <Box sx={{ flex: 1 }}>
              <UnitCurrencySearch type="unit" value={p.row.birim} onChange={(kod)=>updateYerli(p.row.id,{birim:kod})} />
            </Box>
            <IconButton size="small" onClick={(e)=> openFavMenu(e,'unit', p.row.id)}><StarBorderIcon fontSize="inherit"/></IconButton>
          </Stack>
        ) },
      // birimAciklamasi kolonu kaldırıldı
      { field: 'birimFiyatiTl', headerName: 'BF (TL)', width: 120, editable: true, type: 'number' },
      { field: 'makineTechizatTipi', headerName: 'M.Teşhizat Tipi', width: 180, renderCell: (p)=> (
        <Select size="small" value={p.row.makineTechizatTipi || ''} onChange={(e)=> updateYerli(p.row.id, { makineTechizatTipi: e.target.value })} displayEmpty fullWidth>
          <MenuItem value="">-</MenuItem>
          <MenuItem value="Ana Makine">Ana Makine</MenuItem>
          <MenuItem value="Yardımcı Makine">Yardımcı Makine</MenuItem>
        </Select>
      ) },
      { field: 'finansalKiralamaMi', headerName: 'FK mı?', width: 100, renderCell: (p) => (
        <Select size="small" value={p.row.finansalKiralamaMi || ''} onChange={(e)=> updateYerli(p.row.id, { finansalKiralamaMi: e.target.value })} displayEmpty fullWidth>
          <MenuItem value="">-</MenuItem>
          <MenuItem value="EVET">EVET</MenuItem>
          <MenuItem value="HAYIR">HAYIR</MenuItem>
        </Select>
      )},
      { field: 'finansalKiralamaAdet', headerName: 'FK Adet', width: 100, editable: true, type: 'number' },
      { field: 'finansalKiralamaSirket', headerName: 'FK Şirket', width: 160, editable: true },
      { field: 'gerceklesenAdet', headerName: 'Gerç. Adet', width: 110, editable: true, type: 'number' },
      { field: 'gerceklesenTutar', headerName: 'Gerç. Tutar', width: 130, editable: true, type: 'number' },
      { field: 'iadeDevirSatisVarMi', headerName: 'İade/Devir/Satış?', width: 150, renderCell: (p) => (
        <Select size="small" value={p.row.iadeDevirSatisVarMi || ''} onChange={(e)=> updateYerli(p.row.id, { iadeDevirSatisVarMi: e.target.value })} displayEmpty fullWidth>
          <MenuItem value="">-</MenuItem>
          <MenuItem value="EVET">EVET</MenuItem>
          <MenuItem value="HAYIR">HAYIR</MenuItem>
        </Select>
      ) },
      { field: 'iadeDevirSatisAdet', headerName: 'İade/Devir/Satış Adet', width: 170, editable: true, type: 'number' },
      { field: 'iadeDevirSatisTutar', headerName: 'İade/Devir/Satış Tutar', width: 180, editable: true, type: 'number' },
      { field: 'toplamTl', headerName: 'Toplam (TL)', width: 140, valueFormatter: (p)=> p.value?.toLocaleString('tr-TR') },
      { field: 'dosya', headerName: 'Dosya', width: 120, sortable: false, renderCell: (p)=> (
        <Box onDragOver={(e)=>{e.preventDefault();}} onDrop={async(e)=>{e.preventDefault(); const files = Array.from(e.dataTransfer.files||[]); if(files.length===0) return; const form = new FormData(); files.forEach(f=> form.append('files', f)); form.append('path', `makine-yonetimi/${selectedTesvik?._id || 'global'}/${tab}/${p.row.id}`); await api.post('/files/upload', form, { headers:{'Content-Type':'multipart/form-data'} }); updateYerli(p.row.id, { dosyalar: [...(p.row.dosyalar||[]), ...files.map(f=>({ name:f.name })) ] }); }}>
          <Button size="small" onClick={()=>openUpload(p.row.id)}>Yükle</Button>
          {Array.isArray(p.row.dosyalar) && p.row.dosyalar.length>0 && (
            <Chip label={p.row.dosyalar.length} size="small" sx={{ ml: 0.5 }} />
          )}
        </Box>
      )},
      { field: 'copy', headerName: '', width: 42, sortable: false, renderCell: (p)=> (
        <IconButton size="small" onClick={()=> setYerliRows(rows => duplicateRow(rows, p.row.id))}><CopyIcon fontSize="inherit"/></IconButton>
      )},
      { field: 'talep', headerName: 'Talep', width: 140, sortable: false, renderCell: (p)=>(
        <Stack direction="row" spacing={0.5} alignItems="center">
          {p.row.talep?.durum && (
            <Chip size="small" label={p.row.talep.durum.replace(/_/g,' ').toUpperCase()} />
          )}
          <Tooltip title="Bakanlığa gönder">
            <span>
              <IconButton size="small" disabled={!selectedTesvik} onClick={async()=>{
                const talep = { durum:'bakanliga_gonderildi', istenenAdet: Number(p.row.miktar)||0 };
                await tesvikService.setMakineTalep(selectedTesvik._id, { liste:'yerli', rowId:p.row.id, talep });
                updateYerli(p.row.id, { talep });
              }}><SendIcon fontSize="inherit"/></IconButton>
            </span>
          </Tooltip>
        </Stack>
      ) },
      { field: 'karar', headerName: 'Karar', width: 160, sortable: false, renderCell: (p)=>(
        <Stack direction="row" spacing={0.5} alignItems="center">
          {p.row.karar?.kararDurumu && (
            <Chip size="small" label={p.row.karar.kararDurumu.toUpperCase()} />
          )}
          <Tooltip title="Onay">
            <span>
              <IconButton size="small" disabled={!selectedTesvik} onClick={async()=>{
                const karar = { kararDurumu:'onay', onaylananAdet:Number(p.row.miktar)||0 };
                await tesvikService.setMakineKarar(selectedTesvik._id, { liste:'yerli', rowId:p.row.id, karar });
                updateYerli(p.row.id, { karar });
              }}><CheckIcon fontSize="inherit"/></IconButton>
            </span>
          </Tooltip>
          <Tooltip title="Kısmi Onay">
            <span>
              <IconButton size="small" disabled={!selectedTesvik} onClick={async()=>{
                const karar = { kararDurumu:'kismi_onay', onaylananAdet: Math.max(0, Math.floor((Number(p.row.miktar)||0)/2)) };
                await tesvikService.setMakineKarar(selectedTesvik._id, { liste:'yerli', rowId:p.row.id, karar });
                updateYerli(p.row.id, { karar });
              }}><PercentIcon fontSize="inherit"/></IconButton>
            </span>
          </Tooltip>
          <Tooltip title="Red">
            <span>
              <IconButton size="small" color="error" disabled={!selectedTesvik} onClick={async()=>{
                const karar = { kararDurumu:'red', onaylananAdet:0 };
                await tesvikService.setMakineKarar(selectedTesvik._id, { liste:'yerli', rowId:p.row.id, karar });
                updateYerli(p.row.id, { karar });
              }}><ClearIcon fontSize="inherit"/></IconButton>
            </span>
          </Tooltip>
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
        density={density}
        columnVisibilityModel={columnVisibilityModel}
        onColumnVisibilityModelChange={(m)=> setColumnVisibilityModel(m)}
        getCellClassName={(params)=>{
          if (params.field === 'miktar' && numberOrZero(params.value) <= 0) return 'error-cell';
          if (params.field === 'birim' && !params.row.birim) return 'error-cell';
          return '';
        }}
        sx={{
          '& .error-cell': { backgroundColor: '#fee2e2' },
          '& .MuiDataGrid-cell': { py: 0.5 },
          '& .MuiDataGrid-columnHeaders': { py: 0.25 }
        }}
      />
    );
  };

  const IthalGrid = () => {
    const cols = [
      // Birim Açıklaması kolonu kaldırıldı (müşteri istemiyor)
      { field: 'siraNo', headerName: '#', width: 70, editable: true, type: 'number' },
      { field: 'gtipKodu', headerName: 'GTIP', width: 200, renderCell: (p) => (
        <Stack direction="row" spacing={0.5} alignItems="center" sx={{ width: '100%' }}>
          <Box sx={{ flex: 1 }}>
            <GTIPSuperSearch value={p.row.gtipKodu} onChange={(kod, aciklama)=>{ const patch = { gtipKodu: kod, gtipAciklama: aciklama }; if (!p.row.adi) patch.adi = aciklama; updateIthal(p.row.id, patch); }} />
          </Box>
          <IconButton size="small" onClick={(e)=> openFavMenu(e, 'gtip', p.row.id)}><StarBorderIcon fontSize="inherit"/></IconButton>
        </Stack>
      ) },
      { field: 'gtipAciklama', headerName: 'GTIP Açıklama', flex: 1, minWidth: 200, editable: true },
      { field: 'adi', headerName: 'Adı ve Özelliği', flex: 1, minWidth: 220, editable: true },
      { field: 'miktar', headerName: 'Miktar', width: 90, editable: true, type: 'number' },
      { field: 'birim', headerName: 'Birim', width: 180, renderCell: (p) => (
        <Stack direction="row" spacing={0.5} alignItems="center" sx={{ width: '100%' }}>
          <Box sx={{ flex: 1 }}>
            <UnitCurrencySearch type="unit" value={p.row.birim} onChange={(kod)=>updateIthal(p.row.id,{birim:kod})} />
          </Box>
          <IconButton size="small" onClick={(e)=> openFavMenu(e,'unit', p.row.id)}><StarBorderIcon fontSize="inherit"/></IconButton>
        </Stack>
      ) },
      // birimAciklamasi kolonu kaldırıldı
      { field: 'birimFiyatiFob', headerName: 'FOB BF', width: 110, editable: true, type: 'number' },
      { field: 'doviz', headerName: 'Döviz', width: 160, renderCell: (p)=>(
        <Stack direction="row" spacing={0.5} alignItems="center" sx={{ width: '100%' }}>
          <Box sx={{ flex: 1 }}>
            <UnitCurrencySearch type="currency" value={p.row.doviz} onChange={(kod)=>updateIthal(p.row.id,{doviz:kod})} />
          </Box>
          <IconButton size="small" onClick={(e)=> openFavMenu(e,'currency', p.row.id)}><StarBorderIcon fontSize="inherit"/></IconButton>
        </Stack>
      ) },
      { field: 'toplamUsd', headerName: '$', width: 110,
        valueGetter: (p)=> numberOrZero(p.row.miktar) * numberOrZero(p.row.birimFiyatiFob),
        valueFormatter: (p)=> numberOrZero(p.value)?.toLocaleString('en-US')
      },
      { field: 'toplamTl', headerName: 'TL', width: 140, editable: true, valueFormatter: (p)=> p.value?.toLocaleString('tr-TR') },
      { field: 'kullanilmis', headerName: 'Kullanılmış', width: 180, renderCell: (p)=>(
        <UnitCurrencySearch type="used" value={p.row.kullanilmisKod} onChange={(kod,aciklama)=>updateIthal(p.row.id,{kullanilmisKod:kod,kullanilmisAciklama:aciklama})} />
      ) },
      { field: 'ckdSkd', headerName: 'CKD/SKD', width: 110, editable: true },
      { field: 'aracMi', headerName: 'Araç mı?', width: 110, editable: true },
      { field: 'makineTechizatTipi', headerName: 'M.Teşhizat Tipi', width: 180, renderCell: (p)=> (
        <Select size="small" value={p.row.makineTechizatTipi || ''} onChange={(e)=> updateIthal(p.row.id, { makineTechizatTipi: e.target.value })} displayEmpty fullWidth>
          <MenuItem value="">-</MenuItem>
          <MenuItem value="Ana Makine">Ana Makine</MenuItem>
          <MenuItem value="Yardımcı Makine">Yardımcı Makine</MenuItem>
        </Select>
      ) },
      { field: 'kdvMuafiyeti', headerName: 'KDV Muaf?', width: 120, renderCell: (p)=> (
        <Select size="small" value={p.row.kdvMuafiyeti || ''} onChange={(e)=> updateIthal(p.row.id, { kdvMuafiyeti: e.target.value })} displayEmpty fullWidth>
          <MenuItem value="">-</MenuItem>
          <MenuItem value="EVET">EVET</MenuItem>
          <MenuItem value="HAYIR">HAYIR</MenuItem>
        </Select>
      ) },
      { field: 'gumrukVergisiMuafiyeti', headerName: 'G.Verg. Muaf?', width: 140, renderCell: (p)=> (
        <Select size="small" value={p.row.gumrukVergisiMuafiyeti || ''} onChange={(e)=> updateIthal(p.row.id, { gumrukVergisiMuafiyeti: e.target.value })} displayEmpty fullWidth>
          <MenuItem value="">-</MenuItem>
          <MenuItem value="EVET">EVET</MenuItem>
          <MenuItem value="HAYIR">HAYIR</MenuItem>
        </Select>
      ) },
      { field: 'finansalKiralamaMi', headerName: 'FK mı?', width: 100, renderCell: (p)=> (
        <Select size="small" value={p.row.finansalKiralamaMi || ''} onChange={(e)=> updateIthal(p.row.id, { finansalKiralamaMi: e.target.value })} displayEmpty fullWidth>
          <MenuItem value="">-</MenuItem>
          <MenuItem value="EVET">EVET</MenuItem>
          <MenuItem value="HAYIR">HAYIR</MenuItem>
        </Select>
      ) },
      { field: 'finansalKiralamaAdet', headerName: 'FK Adet', width: 100, editable: true, type: 'number' },
      { field: 'finansalKiralamaSirket', headerName: 'FK Şirket', width: 160, editable: true },
      { field: 'gerceklesenAdet', headerName: 'Gerç. Adet', width: 110, editable: true, type: 'number' },
      { field: 'gerceklesenTutar', headerName: 'Gerç. Tutar', width: 130, editable: true, type: 'number' },
      { field: 'iadeDevirSatisVarMi', headerName: 'İade/Devir/Satış?', width: 150, renderCell: (p)=> (
        <Select size="small" value={p.row.iadeDevirSatisVarMi || ''} onChange={(e)=> updateIthal(p.row.id, { iadeDevirSatisVarMi: e.target.value })} displayEmpty fullWidth>
          <MenuItem value="">-</MenuItem>
          <MenuItem value="EVET">EVET</MenuItem>
          <MenuItem value="HAYIR">HAYIR</MenuItem>
        </Select>
      ) },
      { field: 'iadeDevirSatisAdet', headerName: 'İade/Devir/Satış Adet', width: 170, editable: true, type: 'number' },
      { field: 'iadeDevirSatisTutar', headerName: 'İade/Devir/Satış Tutar', width: 180, editable: true, type: 'number' },
      { field: 'dosya', headerName: 'Dosya', width: 120, sortable: false, renderCell: (p)=> (
        <Box onDragOver={(e)=>{e.preventDefault();}} onDrop={async(e)=>{e.preventDefault(); const files = Array.from(e.dataTransfer.files||[]); if(files.length===0) return; const form = new FormData(); files.forEach(f=> form.append('files', f)); form.append('path', `makine-yonetimi/${selectedTesvik?._id || 'global'}/${tab}/${p.row.id}`); await api.post('/files/upload', form, { headers:{'Content-Type':'multipart/form-data'} }); updateIthal(p.row.id, { dosyalar: [...(p.row.dosyalar||[]), ...files.map(f=>({ name:f.name })) ] }); }}>
          <Button size="small" onClick={()=>openUpload(p.row.id)}>Yükle</Button>
          {Array.isArray(p.row.dosyalar) && p.row.dosyalar.length>0 && (
            <Chip label={p.row.dosyalar.length} size="small" sx={{ ml: 0.5 }} />
          )}
        </Box>
      )},
      { field: 'copy', headerName: '', width: 42, sortable: false, renderCell: (p)=> (
        <IconButton size="small" onClick={()=> setIthalRows(rows => duplicateRow(rows, p.row.id))}><CopyIcon fontSize="inherit"/></IconButton>
      )},
      { field: 'talep', headerName: 'Talep', width: 140, sortable: false, renderCell: (p)=>(
        <Stack direction="row" spacing={0.5} alignItems="center">
          {p.row.talep?.durum && (
            <Chip size="small" label={p.row.talep.durum.replace(/_/g,' ').toUpperCase()} />
          )}
          <Tooltip title="Bakanlığa gönder">
            <span>
              <IconButton size="small" disabled={!selectedTesvik} onClick={async()=>{
                const talep = { durum:'bakanliga_gonderildi', istenenAdet: Number(p.row.miktar)||0 };
                await tesvikService.setMakineTalep(selectedTesvik._id, { liste:'ithal', rowId:p.row.id, talep });
                updateIthal(p.row.id, { talep });
              }}><SendIcon fontSize="inherit"/></IconButton>
            </span>
          </Tooltip>
        </Stack>
      ) },
      { field: 'karar', headerName: 'Karar', width: 160, sortable: false, renderCell: (p)=>(
        <Stack direction="row" spacing={0.5} alignItems="center">
          {p.row.karar?.kararDurumu && (
            <Chip size="small" label={p.row.karar.kararDurumu.toUpperCase()} />
          )}
          <Tooltip title="Onay">
            <span>
              <IconButton size="small" disabled={!selectedTesvik} onClick={async()=>{
                const karar = { kararDurumu:'onay', onaylananAdet:Number(p.row.miktar)||0 };
                await tesvikService.setMakineKarar(selectedTesvik._id, { liste:'ithal', rowId:p.row.id, karar });
                updateIthal(p.row.id, { karar });
              }}><CheckIcon fontSize="inherit"/></IconButton>
            </span>
          </Tooltip>
          <Tooltip title="Kısmi Onay">
            <span>
              <IconButton size="small" disabled={!selectedTesvik} onClick={async()=>{
                const karar = { kararDurumu:'kismi_onay', onaylananAdet: Math.max(0, Math.floor((Number(p.row.miktar)||0)/2)) };
                await tesvikService.setMakineKarar(selectedTesvik._id, { liste:'ithal', rowId:p.row.id, karar });
                updateIthal(p.row.id, { karar });
              }}><PercentIcon fontSize="inherit"/></IconButton>
            </span>
          </Tooltip>
          <Tooltip title="Red">
            <span>
              <IconButton size="small" color="error" disabled={!selectedTesvik} onClick={async()=>{
                const karar = { kararDurumu:'red', onaylananAdet:0 };
                await tesvikService.setMakineKarar(selectedTesvik._id, { liste:'ithal', rowId:p.row.id, karar });
                updateIthal(p.row.id, { karar });
              }}><ClearIcon fontSize="inherit"/></IconButton>
            </span>
          </Tooltip>
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
        density={density}
        columnVisibilityModel={columnVisibilityModel}
        onColumnVisibilityModelChange={(m)=> setColumnVisibilityModel(m)}
        getCellClassName={(params)=>{
          if (params.field === 'miktar' && numberOrZero(params.value) <= 0) return 'error-cell';
          if (params.field === 'birim' && !params.row.birim) return 'error-cell';
          if (params.field === 'doviz' && !params.row.doviz) return 'error-cell';
          return '';
        }}
        sx={{ '& .error-cell': { backgroundColor: '#fee2e2' }, '& .MuiDataGrid-cell': { py: 0.5 }, '& .MuiDataGrid-columnHeaders': { py: 0.25 } }}
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
        <Tooltip title="Kur Hesapla (TCMB)">
          <span>
            <IconButton onClick={recalcIthalTotals} disabled={(ithalRows||[]).length===0}>
              <RecalcIcon/>
            </IconButton>
          </span>
        </Tooltip>
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

      <Paper sx={{ p: 2, mb: 2, position: fullScreen ? 'fixed' : 'relative', inset: fullScreen ? 0 : 'auto', zIndex: fullScreen ? 1300 : 'auto', height: fullScreen ? '100vh' : 'auto', overflow: 'auto' }}>
        <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1 }}>
          <Tabs value={tab} onChange={(e,v)=>setTab(v)}>
            <Tab label="Yerli" value="yerli" />
            <Tab label="İthal" value="ithal" />
          </Tabs>
          <Box sx={{ flex: 1 }} />
          <Tooltip title="Satır Ekle"><IconButton onClick={addRow}><AddIcon/></IconButton></Tooltip>
          <Tooltip title="Kurları (TCMB) al ve TL hesapla"><span><IconButton onClick={recalcIthalTotals} disabled={tab!== 'ithal'}><RecalcIcon/></IconButton></span></Tooltip>
          <Tooltip title="İçe Aktar"><label><input type="file" accept=".xlsx" hidden onChange={(e)=>{const f=e.target.files?.[0]; if(f) importExcel(f); e.target.value='';}} /><IconButton component="span"><ImportIcon/></IconButton></label></Tooltip>
          <Tooltip title="Dışa Aktar"><IconButton onClick={exportExcel}><ExportIcon/></IconButton></Tooltip>
          <Tooltip title="Sütunlar"><IconButton onClick={(e)=> setColumnsAnchor(e.currentTarget)}><ViewColumnIcon/></IconButton></Tooltip>
          <Tooltip title={density==='compact'?'Geniş görünüm':'Kompakt görünüm'}><IconButton onClick={()=> setDensity(density==='compact'?'standard':'compact')}><VisibilityIcon/></IconButton></Tooltip>
          <Tooltip title={fullScreen?'Tam ekranı kapat':'Tam ekran'}><IconButton onClick={()=> setFullScreen(v=>!v)}>{fullScreen ? <FullscreenExitIcon/> : <FullscreenIcon/>}</IconButton></Tooltip>
          <Tooltip title="Kaydet"><span><IconButton disabled={!selectedTesvik} onClick={async()=>{
            const payload = {
              yerli: yerliRows.map(r=>({ siraNo:r.siraNo, rowId:r.rowId, gtipKodu:r.gtipKodu, gtipAciklamasi:r.gtipAciklama, adiVeOzelligi:r.adi, miktar:r.miktar, birim:r.birim, birimAciklamasi:r.birimAciklamasi, birimFiyatiTl:r.birimFiyatiTl, toplamTutariTl:r.toplamTl, kdvIstisnasi:r.kdvIstisnasi, makineTechizatTipi:r.makineTechizatTipi, finansalKiralamaMi:r.finansalKiralamaMi, finansalKiralamaAdet:r.finansalKiralamaAdet, finansalKiralamaSirket:r.finansalKiralamaSirket, gerceklesenAdet:r.gerceklesenAdet, gerceklesenTutar:r.gerceklesenTutar, iadeDevirSatisVarMi:r.iadeDevirSatisVarMi, iadeDevirSatisAdet:r.iadeDevirSatisAdet, iadeDevirSatisTutar:r.iadeDevirSatisTutar })),
              ithal: ithalRows.map(r=>({ siraNo:r.siraNo, rowId:r.rowId, gtipKodu:r.gtipKodu, gtipAciklamasi:r.gtipAciklama, adiVeOzelligi:r.adi, miktar:r.miktar, birim:r.birim, birimAciklamasi:r.birimAciklamasi, birimFiyatiFob:r.birimFiyatiFob, gumrukDovizKodu:r.doviz, toplamTutarFobUsd:r.toplamUsd, toplamTutarFobTl:r.toplamTl, kullanilmisMakine:r.kullanilmisKod, kullanilmisMakineAciklama:r.kullanilmisAciklama, ckdSkdMi:r.ckdSkd, aracMi:r.aracMi, makineTechizatTipi:r.makineTechizatTipi, kdvMuafiyeti:r.kdvMuafiyeti, gumrukVergisiMuafiyeti:r.gumrukVergisiMuafiyeti, finansalKiralamaMi:r.finansalKiralamaMi, finansalKiralamaAdet:r.finansalKiralamaAdet, finansalKiralamaSirket:r.finansalKiralamaSirket, gerceklesenAdet:r.gerceklesenAdet, gerceklesenTutar:r.gerceklesenTutar, iadeDevirSatisVarMi:r.iadeDevirSatisVarMi, iadeDevirSatisAdet:r.iadeDevirSatisAdet, iadeDevirSatisTutar:r.iadeDevirSatisTutar }))
            };
            const res = await tesvikService.saveMakineListeleri(selectedTesvik._id, payload);
            if (res?.success) {
              // basit geri bildirim
              alert('Makine listeleri kaydedildi.');
            }
          }}><CheckIcon/></IconButton></span></Tooltip>
        </Stack>

        {tab === 'yerli' ? <YerliGrid/> : <IthalGrid/>}
      </Paper>

      {/* Sütun görünürlük menüsü */}
      <Menu open={!!columnsAnchor} anchorEl={columnsAnchor} onClose={()=> setColumnsAnchor(null)}>
        {['gtipAciklama'].map((key)=> (
          <MenuItem key={key} onClick={()=> setColumnVisibilityModel(m=> ({ ...m, [key]: !m[key] }))}>
            <input type="checkbox" checked={!columnVisibilityModel[key]===false ? !columnVisibilityModel[key] : !columnVisibilityModel[key]} readOnly style={{ marginRight: 8 }} /> {key}
          </MenuItem>
        ))}
      </Menu>

      <FileUpload open={uploadOpen} onClose={closeUpload} onUploadComplete={handleUploadComplete} currentPath={`makine-yonetimi/${selectedTesvik?._id || 'global'}/${tab}/${uploadRowId||''}`} />

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


