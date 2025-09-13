import React, { useEffect, useMemo, useState } from 'react';
import { Box, Paper, Typography, Button, Tabs, Tab, Chip, Stack, IconButton, Tooltip, Menu, MenuItem, Dialog, DialogTitle, DialogContent, DialogActions, Select, Drawer, Breadcrumbs, Snackbar, Alert } from '@mui/material';
import { DataGrid } from '@mui/x-data-grid';
import UnitCurrencySearch from '../../components/UnitCurrencySearch';
import FileUpload from '../../components/Files/FileUpload';
import tesvikService from '../../services/tesvikService';
import { Autocomplete, TextField, Divider } from '@mui/material';
import api from '../../utils/axios';
import currencyService from '../../services/currencyService';
import * as XLSX from 'xlsx';
import ExcelJS from 'exceljs';
import { Add as AddIcon, Delete as DeleteIcon, FileUpload as ImportIcon, Download as ExportIcon, Replay as RecalcIcon, ContentCopy as CopyIcon, MoreVert as MoreIcon, Star as StarIcon, StarBorder as StarBorderIcon, Bookmarks as BookmarksIcon, Visibility as VisibilityIcon, Send as SendIcon, Check as CheckIcon, Percent as PercentIcon, Clear as ClearIcon, Fullscreen as FullscreenIcon, FullscreenExit as FullscreenExitIcon, ViewColumn as ViewColumnIcon, ArrowBack as ArrowBackIcon, Home as HomeIcon, Build as BuildIcon, History as HistoryIcon, Restore as RestoreIcon, FiberNew as FiberNewIcon, DeleteOutline as DeleteOutlineIcon, Timeline as TimelineIcon, TableView as TableViewIcon } from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import GTIPSuperSearch from '../../components/GTIPSuperSearch';

  const numberOrZero = (v) => {
  const n = parseFloat((v ?? '').toString().replace(/[^\d.-]/g, ''));
  return isNaN(n) ? 0 : n;
};

// 🇹🇷 Türkçe sayı girişini güvenle parse et (786.861 => 786861, 1.651.332 => 1651332, 10,5 => 10.5)
const parseTrCurrency = (value) => {
  const str = (value ?? '').toString().trim();
  if (!str) return 0;
  if (str.includes('.') && str.includes(',')) {
    const normalized = str.replace(/\./g, '').replace(',', '.');
    const n = Number(normalized);
    return Number.isFinite(n) ? n : 0;
  }
  if (str.includes(',') && !str.includes('.')) {
    const normalized = str.replace(',', '.');
    const n = Number(normalized);
    return Number.isFinite(n) ? n : 0;
  }
  if (/^\d{1,3}(\.\d{3})+$/.test(str)) {
    const normalized = str.replace(/\./g, '');
    const n = Number(normalized);
    return Number.isFinite(n) ? n : 0;
  }
  const n = Number(str);
  return Number.isFinite(n) ? n : 0;
};

const emptyYerli = () => ({ id: Math.random().toString(36).slice(2), siraNo: 0, gtipKodu: '', gtipAciklama: '', adi: '', miktar: 0, birim: '', birimAciklamasi: '', birimFiyatiTl: 0, toplamTl: 0, kdvIstisnasi: '' , makineTechizatTipi:'', finansalKiralamaMi:'', finansalKiralamaAdet:0, finansalKiralamaSirket:'', gerceklesenAdet:0, gerceklesenTutar:0, iadeDevirSatisVarMi:'', iadeDevirSatisAdet:0, iadeDevirSatisTutar:0, dosyalar: []});
const emptyIthal = () => ({ id: Math.random().toString(36).slice(2), siraNo: 0, gtipKodu: '', gtipAciklama: '', adi: '', miktar: 0, birim: '', birimAciklamasi: '', birimFiyatiFob: 0, doviz: '', toplamUsd: 0, toplamTl: 0, tlManuel: false, kullanilmisKod: '', kullanilmisAciklama: '', ckdSkd: '', aracMi: '', makineTechizatTipi:'', kdvMuafiyeti:'', gumrukVergisiMuafiyeti:'', finansalKiralamaMi:'', finansalKiralamaAdet:0, finansalKiralamaSirket:'', gerceklesenAdet:0, gerceklesenTutar:0, iadeDevirSatisVarMi:'', iadeDevirSatisAdet:0, iadeDevirSatisTutar:0, dosyalar: []});

const loadLS = (key, fallback) => {
  try { const v = JSON.parse(localStorage.getItem(key)); return Array.isArray(v) ? v : fallback; } catch { return fallback; }
};
const saveLS = (key, val) => { try { localStorage.setItem(key, JSON.stringify(val)); } catch {} };

const MakineYonetimi = () => {
  const navigate = useNavigate(); // 🧭 Navigasyon hook'u
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
  // 🆕 Revizyon state'leri
  const [isReviseMode, setIsReviseMode] = useState(false);
  const [isReviseStarted, setIsReviseStarted] = useState(false);
  const [revList, setRevList] = useState([]);

  // Sıra numarası güncelleme fonksiyonu
  const updateRowSiraNo = (type, rowId, newSiraNo) => {
    if (type === 'yerli') {
      updateYerli(rowId, { siraNo: Number(newSiraNo) || 0 });
    } else {
      updateIthal(rowId, { siraNo: Number(newSiraNo) || 0 });
    }
  };

  // Makine verilerini yükle (teşvik ID'sine göre)
  const loadMakineData = (tesvikId) => {
    if (!tesvikId) return;
    try {
      // Teşvik bazlı yerli ve ithal verilerini localStorage'dan yükle
      const yerli = loadLS(`mk_${tesvikId}_yerli`, []);
      const ithal = loadLS(`mk_${tesvikId}_ithal`, []);
      setYerliRows(yerli);
      setIthalRows(ithal);
    } catch (error) {
      console.error('Makine verileri yüklenirken hata:', error);
      setYerliRows([]);
      setIthalRows([]);
    }
  };

  // Tarihi HTML date input formatına çevir
  const formatDateForInput = (date) => {
    if (!date) return '';
    try {
      if (typeof date === 'string' && date.includes('-') && date.length === 10) {
        return date; // Zaten doğru formatta
      }
      return new Date(date).toISOString().slice(0, 10);
    } catch {
      return '';
    }
  };
  const [revertOpen, setRevertOpen] = useState(false);
  const [selectedRevizeId, setSelectedRevizeId] = useState('');
  // 🗑️ Silinen satırları gösterme (UI içinde takip)
  const [deletedRows, setDeletedRows] = useState([]); // { type:'yerli'|'ithal', row, date }
  const [deletedOpen, setDeletedOpen] = useState(false);
  // ⚙️ İşlem günlükleri (talep/karar/silme)
  const [activityLog, setActivityLog] = useState([]); // { type:'talep'|'karar'|'sil', list:'yerli'|'ithal', row, payload, date }
  // 🛎️ Bildirimler
  const [toast, setToast] = useState({ open:false, severity:'info', message:'' });
  const openToast = (severity, message) => setToast({ open:true, severity, message });
  const closeToast = () => setToast(t => ({ ...t, open:false }));
  // 🆕 Revize Metası Dialog state
  const [metaOpen, setMetaOpen] = useState(false);
  const [metaForm, setMetaForm] = useState({ talepNo:'', belgeNo:'', belgeId:'', basvuruTarihi:'', odemeTalebi:'' });
  const getActiveRevize = ()=> (Array.isArray(revList) && revList.length>0 ? revList[0] : null);
  const openMeta = ()=>{
    const active = getActiveRevize();
    if (active) {
      setMetaForm({
        talepNo: active.talepNo||'',
        belgeNo: active.belgeNo || (selectedTesvik?.tesvikId || selectedTesvik?.gmId || ''),
        belgeId: active.belgeId || (selectedTesvik?.tesvikId || selectedTesvik?.gmId || ''),
        basvuruTarihi: active.basvuruTarihi ? new Date(active.basvuruTarihi).toISOString().slice(0,10) : (selectedTesvik?.belgeYonetimi?.belgeTarihi ? new Date(selectedTesvik.belgeYonetimi.belgeTarihi).toISOString().slice(0,10) : ''),
        odemeTalebi: active.odemeTalebi||''
      });
    } else {
      setMetaForm({ talepNo:'', belgeNo:(selectedTesvik?.tesvikId || selectedTesvik?.gmId || ''), belgeId:(selectedTesvik?.tesvikId || selectedTesvik?.gmId || ''), basvuruTarihi:(selectedTesvik?.belgeYonetimi?.belgeTarihi ? new Date(selectedTesvik.belgeYonetimi.belgeTarihi).toISOString().slice(0,10) : ''), odemeTalebi:'' });
    }
    setMetaOpen(true);
  };
  const saveMeta = async()=>{
    try{
      const active = getActiveRevize();
      if (!active || !selectedTesvik?._id) { openToast('error','Aktif revize bulunamadı'); return; }
      const meta = { ...metaForm, basvuruTarihi: metaForm.basvuruTarihi ? new Date(metaForm.basvuruTarihi) : undefined };
      await tesvikService.updateMakineRevizyonMeta(selectedTesvik._id, active.revizeId, meta);
      const list = await tesvikService.listMakineRevizyonlari(selectedTesvik._id); setRevList(list.reverse());
      setMetaOpen(false);
      openToast('success','Revize metası güncellendi.');
    }catch(e){ openToast('error','Revize metası kaydedilemedi.'); }
  };
  // 🗂️ Dosyalar Görüntüle Dialog
  const [filesOpen, setFilesOpen] = useState(false);
  const [filesList, setFilesList] = useState([]);
  const [filesPath, setFilesPath] = useState('');
  const openFilesDialog = async(path)=>{
    try{ setFilesPath(path); setFilesOpen(true); const res = await api.get('/files', { params:{ path } }); setFilesList(res.data?.data?.files||[]); }catch{ setFilesList([]); }
  };

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
  
  // Seçili teşvik değişince revizyon listesini getir ve modu sıfırla
  useEffect(()=>{
    (async()=>{
      if (!selectedTesvik?._id) { 
        setRevList([]); 
        setIsReviseMode(false); 
        setIsReviseStarted(false);
        return; 
      }
      try {
        const list = await tesvikService.listMakineRevizyonlari(selectedTesvik._id);
        setRevList(Array.isArray(list) ? list.reverse() : []);
      } catch { setRevList([]); }
      // Teşvik bazlı silinenler ve işlem loglarını yükle
      try {
        // Sadece geçerli belgeye ait lokaller yüklensin; global fallback kullanılmasın
        const del = loadLS(`mk_deleted_${selectedTesvik._id}`, []);
        const act = loadLS(`mk_activity_${selectedTesvik._id}`, []);
        setDeletedRows(del);
        setActivityLog(act);
      } catch {}
      // Makine verilerini yükle
      loadMakineData(selectedTesvik._id);
      setIsReviseMode(false);
      setIsReviseStarted(false);
    })();
  }, [selectedTesvik]);
  useEffect(() => { if (selectedTesvik?._id) saveLS(`mk_${selectedTesvik._id}_yerli`, yerliRows); }, [yerliRows, selectedTesvik]);
  useEffect(() => { if (selectedTesvik?._id) saveLS(`mk_${selectedTesvik._id}_ithal`, ithalRows); }, [ithalRows, selectedTesvik]);

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

  const updateYerli = (id, patch) => {
    setYerliRows(rows => rows.map(r => r.id === id ? calcYerli({ ...r, ...patch }) : r));
  };
  const updateIthal = (id, patch) => {
    setIthalRows(rows => rows.map(r => r.id === id ? calcIthal({ ...r, ...patch }) : r));
  };

  // DataGrid v6 için doğru event: onCellEditStop veya onCellEditCommit
  // 🔧 DataGrid v6 API: processRowUpdate kullan (onCellEditCommit deprecated!)
  const processYerliRowUpdate = (newRow, oldRow) => {
    console.log('🔧 Yerli row güncelleniyor:', newRow);
    const changedFields = Object.keys(newRow).filter(key => newRow[key] !== oldRow[key]);
    let updatedRow = { ...newRow };
    // Kullanıcı TL'yi elle girdiyse manuel moda geç
    if (changedFields.includes('toplamTl')) {
      updatedRow.tlYerliManuel = true;
    }
    // State'i güncelle (calcYerli tlYerliManuel=true ise mevcut TL'yi korur)
    updateYerli(updatedRow.id, updatedRow);
    return updatedRow;
  };
  const processIthalRowUpdate = async (newRow, oldRow) => {
    console.log('🔧 İthal row güncelleniyor:', newRow);
    
    try {
      // Değişen field'ları tespit et
      const changedFields = Object.keys(newRow).filter(key => newRow[key] !== oldRow[key]);
      console.log('📝 Değişen alanlar:', changedFields);
      // TL elle düzenlendiyse manuel moda geçir ve değeri koru
      if (changedFields.includes('toplamTl')) {
        const updatedRow = { ...newRow, tlManuel: true, toplamTl: numberOrZero(newRow.toplamTl) };
        updateIthal(newRow.id, updatedRow);
        return updatedRow;
      }
      
      // Miktar veya FOB değiştiyse USD'yi yeniden hesapla
      if (changedFields.includes('miktar') || changedFields.includes('birimFiyatiFob')) {
        const miktar = numberOrZero(newRow.miktar);
        const fob = numberOrZero(newRow.birimFiyatiFob);
        const usd = miktar * fob;
        
        console.log(`💰 USD hesaplanıyor: ${miktar} × ${fob} = ${usd}`);
        
        // USD güncelle ve manuel TL flag'ini sıfırla
        const updatedRow = { ...newRow, toplamUsd: usd, tlManuel: false };
        
        // TRY ise direkt TL = USD
        if ((newRow.doviz || '').toUpperCase() === 'TRY') {
          updatedRow.toplamTl = usd;
          console.log(`🇹🇷 TRY: TL = ${usd}`);
        } 
        // Başka döviz ise kur ile çevir
        else if (newRow.doviz && !newRow.tlManuel) {
          try {
            const key = `${newRow.doviz}->TRY`;
            let rate = rateCache[key];
            if (!rate) { 
              rate = await currencyService.getRate(newRow.doviz, 'TRY'); 
              setRateCache(prev => ({ ...prev, [key]: rate })); 
            }
            updatedRow.toplamTl = Math.round(usd * (rate || 0));
            console.log(`💱 ${newRow.doviz}: ${usd} × ${rate} = ${updatedRow.toplamTl} TL`);
          } catch (error) {
            console.error('❌ Kur çevirme hatası:', error);
          }
        }
        
        // State'i güncelle
        updateIthal(newRow.id, updatedRow);
        return updatedRow;
      }
      // Döviz değiştiyse TL'yi güncelle (manuel değilse)
      else if (changedFields.includes('doviz') && newRow.doviz && !newRow.tlManuel) {
        const usd = numberOrZero(newRow.toplamUsd);
        const updatedRow = { ...newRow };
        
        if (newRow.doviz.toUpperCase() === 'TRY') {
          updatedRow.toplamTl = usd;
          console.log(`🇹🇷 Döviz TRY'ye değişti: TL = ${usd}`);
        } else {
          try {
            const key = `${newRow.doviz}->TRY`;
            let rate = rateCache[key];
            if (!rate) { 
              rate = await currencyService.getRate(newRow.doviz, 'TRY'); 
              setRateCache(prev => ({ ...prev, [key]: rate })); 
            }
            // Her zaman yakınsayan yuvarlama: .5 ve üzeri yukarı
            const tlRaw = usd * (rate || 0);
            updatedRow.toplamTl = Math.round(tlRaw);
            console.log(`💱 Döviz değişti ${newRow.doviz}: ${usd} × ${rate} = ${updatedRow.toplamTl} TL`);
          } catch (error) {
            console.error('❌ Döviz kur çevirme hatası:', error);
          }
        }
        
        updateIthal(newRow.id, updatedRow);
        return updatedRow;
      }
      else {
        // Normal field değişikliği
        updateIthal(newRow.id, newRow);
        return newRow;
      }
      
    } catch (error) {
      console.error('❌ İthal row güncelleme hatası:', error);
      // Hata durumunda eski row'u döndür
      return oldRow;
    }
  };

  const calcYerli = (r) => {
    const miktar = numberOrZero(r.miktar);
    const bf = numberOrZero(r.birimFiyatiTl);
    const computed = miktar * bf;
    return { ...r, toplamTl: r.tlYerliManuel ? (r.toplamTl ?? computed) : computed };
  };
  const calcIthal = (r) => {
    const miktar = numberOrZero(r.miktar);
    const fob = numberOrZero(r.birimFiyatiFob);
    const usd = miktar * fob;
    // TL manuel ise değeri koru; değilse mevcut kur mantığı devreye girecek (useEffect/processRowUpdate)
    return { ...r, toplamUsd: usd, toplamTl: r.tlManuel ? (r.toplamTl ?? 0) : (r.toplamTl ?? 0) };
  };

  const addRow = () => {
    if (tab === 'yerli') setYerliRows(rows => { const nextSira = (rows[rows.length-1]?.siraNo || rows.length) + 1; return [...rows, { ...emptyYerli(), siraNo: nextSira }]; });
    else setIthalRows(rows => { const nextSira = (rows[rows.length-1]?.siraNo || rows.length) + 1; return [...rows, { ...emptyIthal(), siraNo: nextSira }]; });
  };
  const delRow = (id) => {
    if (tab === 'yerli') setYerliRows(rows => { const row = rows.find(r=> r.id===id); if (row && isReviseMode) { setDeletedRows(list=> { const next = [{ type:'yerli', row, date:new Date() }, ...list].slice(0,200); if(selectedTesvik?._id){ saveLS(`mk_deleted_${selectedTesvik._id}`, next); } return next; }); setActivityLog(log=> { const next = [{ type:'sil', list:'yerli', row, payload:null, date:new Date() }, ...log].slice(0,200); if(selectedTesvik?._id){ saveLS(`mk_activity_${selectedTesvik._id}`, next); } return next; }); } return rows.filter(r => r.id !== id); });
    else setIthalRows(rows => { const row = rows.find(r=> r.id===id); if (row && isReviseMode) { setDeletedRows(list=> { const next = [{ type:'ithal', row, date:new Date() }, ...list].slice(0,200); if(selectedTesvik?._id){ saveLS(`mk_deleted_${selectedTesvik._id}`, next); } return next; }); setActivityLog(log=> { const next = [{ type:'sil', list:'ithal', row, payload:null, date:new Date() }, ...log].slice(0,200); if(selectedTesvik?._id){ saveLS(`mk_activity_${selectedTesvik._id}`, next); } return next; }); } return rows.filter(r => r.id !== id); });
  };

  const handleUploadComplete = (files) => {
    if (!uploadRowId) return;
    const map = (r) => r.id === uploadRowId ? { ...r, dosyalar: [...(r.dosyalar||[]), ...files] } : r;
    if (tab === 'yerli') setYerliRows(rows => rows.map(map)); else setIthalRows(rows => rows.map(map));
  };

  // 🛡️ Yardımcı: Satırın rowId'sini garanti altına al (gerekirse autosave yap)
  const ensureRowId = async (liste, row) => {
    // Eğer zaten rowId varsa döndür
    if (row?.rowId) return row.rowId;
    if (!selectedTesvik?._id) return null;
    // 1) Mevcut ekranı DB'ye kaydet (rowId'ler backend tarafından üretilecek)
    const payload = {
      yerli: yerliRows.map(r=>({ siraNo:r.siraNo, rowId:r.rowId, gtipKodu:r.gtipKodu, gtipAciklamasi:r.gtipAciklama, adiVeOzelligi:r.adi, miktar:r.miktar, birim:r.birim, birimAciklamasi:r.birimAciklamasi, birimFiyatiTl:r.birimFiyatiTl, toplamTutariTl:r.toplamTl, kdvIstisnasi:r.kdvIstisnasi, makineTechizatTipi:r.makineTechizatTipi, finansalKiralamaMi:r.finansalKiralamaMi, finansalKiralamaAdet:r.finansalKiralamaAdet, finansalKiralamaSirket:r.finansalKiralamaSirket, gerceklesenAdet:r.gerceklesenAdet, gerceklesenTutar:r.gerceklesenTutar, iadeDevirSatisVarMi:r.iadeDevirSatisVarMi, iadeDevirSatisAdet:r.iadeDevirSatisAdet, iadeDevirSatisTutar:r.iadeDevirSatisTutar, etuysSecili: !!r.etuysSecili })),
      ithal: ithalRows.map(r=>({ siraNo:r.siraNo, rowId:r.rowId, gtipKodu:r.gtipKodu, gtipAciklamasi:r.gtipAciklama, adiVeOzelligi:r.adi, miktar:r.miktar, birim:r.birim, birimAciklamasi:r.birimAciklamasi, birimFiyatiFob:r.birimFiyatiFob, gumrukDovizKodu:r.doviz, toplamTutarFobUsd:r.toplamUsd, toplamTutarFobTl:r.toplamTl, kullanilmisMakine:r.kullanilmisKod, kullanilmisMakineAciklama:r.kullanilmisAciklama, ckdSkdMi:r.ckdSkd, aracMi:r.aracMi, makineTechizatTipi:r.makineTechizatTipi, kdvMuafiyeti:r.kdvMuafiyeti, gumrukVergisiMuafiyeti:r.gumrukVergisiMuafiyeti, finansalKiralamaMi:r.finansalKiralamaMi, finansalKiralamaAdet:r.finansalKiralamaAdet, finansalKiralamaSirket:r.finansalKiralamaSirket, gerceklesenAdet:r.gerceklesenAdet, gerceklesenTutar:r.gerceklesenTutar, iadeDevirSatisVarMi:r.iadeDevirSatisVarMi, iadeDevirSatisAdet:r.iadeDevirSatisAdet, iadeDevirSatisTutar:r.iadeDevirSatisTutar, etuysSecili: !!r.etuysSecili }))
    };
    try { await tesvikService.saveMakineListeleri(selectedTesvik._id, payload); } catch {}
    // 2) DB'den güncel listeyi çek ve ilgili satırı yakala
    const data = await tesvikService.get(selectedTesvik._id);
    const list = (liste==='yerli' ? (data?.makineListeleri?.yerli||[]) : (data?.makineListeleri?.ithal||[]));
    const key = (x)=> `${x.gtipKodu||''}|${x.adiVeOzelligi||''}|${Number(x.miktar)||0}|${x.birim||''}`;
    const targetKey = `${row.gtipKodu||''}|${row.adi||row.adiVeOzelligi||''}|${Number(row.miktar)||0}|${row.birim||''}`;
    const found = list.find(x => key(x) === targetKey);
    const newRowId = found?.rowId || null;
    // 3) UI state'e rowId'yi uygula
    if (newRowId) {
      if (liste==='yerli') updateYerli(row.id, { rowId: newRowId }); else updateIthal(row.id, { rowId: newRowId });
    }
    return newRowId;
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
    // Detay ile seçili teşviki zenginleştir (belge tarihi gibi alanları meta için kullanacağız)
    setSelectedTesvik(prev => ({ ...(prev||{}), ...(data||{}) }));
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
      karar: r.karar || null,
      etuysSecili: !!r.etuysSecili
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
      karar: r.karar || null,
      etuysSecili: !!r.etuysSecili
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
      const rid = await ensureRowId(tab, row);
      if (!rid) return;
      const talep = { durum: 'bakanliga_gonderildi', istenenAdet: Number(row.miktar) || 0, talepTarihi: new Date() };
      await tesvikService.setMakineTalep(selectedTesvik._id, { liste: tab, rowId: rid, talep });
      if (tab === 'yerli') updateYerli(row.id, { rowId: rid, talep }); else updateIthal(row.id, { rowId: rid, talep });
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
      const rid = await ensureRowId(tab, row);
      if (!rid) return;
      const karar = {
        kararDurumu: type,
        onaylananAdet: type === 'kismi_onay' ? onayAdet : (type === 'onay' ? Number(row.miktar) || 0 : 0),
        kararTarihi: new Date()
      };
      await tesvikService.setMakineKarar(selectedTesvik._id, { liste: tab, rowId: rid, karar });
      if (tab === 'yerli') updateYerli(row.id, { rowId: rid, karar }); else updateIthal(row.id, { rowId: rid, karar });
    };
    for (const id of selectionModel) {
      const row = list.find(r => r.id === id);
      if (row) await apply(row);
    }
  };

  const YerliGrid = () => {
    const cols = [
      { field: 'siraNo', headerName: '#', width: 70, 
        renderCell: (p) => (
          <TextField 
            size="small" 
            value={p.row.siraNo || ''} 
            onChange={(e) => isReviseMode && updateRowSiraNo('yerli', p.row.id, e.target.value)}
            disabled={!isReviseMode}
            type="number"
            sx={{ width: '100%' }}
            inputProps={{ min: 1, style: { textAlign: 'center' } }}
          />
        )
      },
      { field: 'gtipKodu', headerName: 'GTIP', width: 200, renderCell: (p) => (
        <Stack direction="row" spacing={0.5} alignItems="center" sx={{ width: '100%' }}>
          <Box sx={{ flex: 1 }}>
            <GTIPSuperSearch value={p.row.gtipKodu} onChange={(kod, aciklama)=>{ if(!isReviseMode) return; const patch = { gtipKodu: kod, gtipAciklama: aciklama }; if (!p.row.adi) patch.adi = aciklama; updateYerli(p.row.id, patch); }} />
          </Box>
          <IconButton size="small" onClick={(e)=> openFavMenu(e, 'gtip', p.row.id)}><StarBorderIcon fontSize="inherit"/></IconButton>
        </Stack>
      ) },
      { field: 'gtipAciklama', headerName: 'GTIP Açıklama', flex: 1, minWidth: 220, editable: true, renderCell:(p)=> (
        <Tooltip title={p.value||''}><Box sx={{ whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis', width:'100%' }}>{p.value||''}</Box></Tooltip>
      ) },
      { field: 'adi', headerName: 'Adı ve Özelliği', flex: 1, minWidth: 260, editable: isReviseMode, renderCell:(p)=> (
        <Tooltip title={p.value||''}><Box sx={{ whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis', width:'100%' }}>{p.value||''}</Box></Tooltip>
      ) },
      { field: 'kdvIstisnasi', headerName: 'KDV Muafiyeti', width: 140, renderCell: (p) => (
        <Select size="small" value={p.row.kdvIstisnasi || ''} onChange={(e)=> isReviseMode && updateYerli(p.row.id, { kdvIstisnasi: e.target.value })} displayEmpty fullWidth disabled={!isReviseMode}>
          <MenuItem value="">-</MenuItem>
          <MenuItem value="EVET">EVET</MenuItem>
          <MenuItem value="HAYIR">HAYIR</MenuItem>
        </Select>
      ) },
      { field: 'miktar', headerName: 'Miktar', width: 90, editable: isReviseMode, type: 'number', align:'right', headerAlign:'right' },
      { field: 'birim', headerName: 'Birim', width: 280, renderCell: (p) => (
          <Stack direction="row" spacing={0.5} alignItems="center" sx={{ width: '100%' }}>
            <Box sx={{ flex: 1, pr:1 }}>
              <UnitCurrencySearch display="chip" type="unit" value={{ kod: p.row.birim, aciklama: p.row.birimAciklamasi }} onChange={(kod, aciklama)=>{ if(!isReviseMode) return; updateYerli(p.row.id,{ birim: kod, birimAciklamasi: aciklama }); }} />
            </Box>
            <IconButton size="small" onClick={(e)=> openFavMenu(e,'unit', p.row.id)}><StarBorderIcon fontSize="inherit"/></IconButton>
          </Stack>
        ) },
      // birimAciklamasi kolonu kaldırıldı
      { field: 'birimFiyatiTl', headerName: 'BF (TL)', width: 120, editable: isReviseMode, type: 'number', align:'right', headerAlign:'right' },
      { field: 'makineTechizatTipi', headerName: 'M.Teşhizat Tipi', width: 180, renderCell: (p)=> (
        <Select size="small" value={p.row.makineTechizatTipi || ''} onChange={(e)=> isReviseMode && updateYerli(p.row.id, { makineTechizatTipi: e.target.value })} displayEmpty fullWidth disabled={!isReviseMode}>
          <MenuItem value="">-</MenuItem>
          <MenuItem value="Ana Makine">Ana Makine</MenuItem>
          <MenuItem value="Yardımcı Makine">Yardımcı Makine</MenuItem>
        </Select>
      ) },
      { field: 'finansalKiralamaMi', headerName: 'FK mı?', width: 100, renderCell: (p) => (
        <Select size="small" value={p.row.finansalKiralamaMi || ''} onChange={(e)=> isReviseMode && updateYerli(p.row.id, { finansalKiralamaMi: e.target.value })} displayEmpty fullWidth disabled={!isReviseMode}>
          <MenuItem value="">-</MenuItem>
          <MenuItem value="EVET">EVET</MenuItem>
          <MenuItem value="HAYIR">HAYIR</MenuItem>
        </Select>
      )},
      { field: 'finansalKiralamaAdet', headerName: 'FK Adet', width: 100, editable: isReviseMode, type: 'number' },
      { field: 'finansalKiralamaSirket', headerName: 'FK Şirket', width: 160, editable: isReviseMode },
      { field: 'gerceklesenAdet', headerName: 'Gerç. Adet', width: 110, editable: isReviseMode, type: 'number' },
      { field: 'gerceklesenTutar', headerName: 'Gerç. Tutar', width: 130, editable: isReviseMode, type: 'number' },
      { field: 'iadeDevirSatisVarMi', headerName: 'İade/Devir/Satış Var mı?', width: 150, renderCell: (p) => (
        <Select size="small" value={p.row.iadeDevirSatisVarMi || ''} onChange={(e)=> isReviseMode && updateYerli(p.row.id, { iadeDevirSatisVarMi: e.target.value })} displayEmpty fullWidth disabled={!isReviseMode}>
          <MenuItem value="">-</MenuItem>
          <MenuItem value="EVET">EVET</MenuItem>
          <MenuItem value="HAYIR">HAYIR</MenuItem>
        </Select>
      ) },
      { field: 'iadeDevirSatisAdet', headerName: 'İade/Devir/Satış Adet', width: 170, editable: isReviseMode, type: 'number' },
      { field: 'iadeDevirSatisTutar', headerName: 'İade/Devir/Satış Tutar', width: 180, editable: isReviseMode, type: 'number' },
      { field: 'toplamTl', headerName: 'Toplam (TL)', width: 140, editable: isReviseMode, align:'right', headerAlign:'right', valueFormatter: (p)=> p.value?.toLocaleString('tr-TR') },
      { field: 'dosya', headerName: 'Dosya', width: 120, sortable: false, renderCell: (p)=> (
        <Box onDragOver={(e)=>{e.preventDefault();}} onDrop={async(e)=>{ if(!isReviseMode) return; e.preventDefault(); const files = Array.from(e.dataTransfer.files||[]); if(files.length===0) return; const form = new FormData(); files.forEach(f=> form.append('files', f)); form.append('path', `makine-yonetimi/${selectedTesvik?._id || 'global'}/${tab}/${p.row.id}`); await api.post('/files/upload', form, { headers:{'Content-Type':'multipart/form-data'} }); updateYerli(p.row.id, { dosyalar: [...(p.row.dosyalar||[]), ...files.map(f=>({ name:f.name })) ] }); }}>
          <Button size="small" onClick={()=> isReviseMode ? openUpload(p.row.id) : openFilesDialog(`makine-yonetimi/${selectedTesvik?._id || 'global'}/${tab}/${p.row.id}`)}>{isReviseMode?'Yükle':'Görüntüle'}</Button>
          {Array.isArray(p.row.dosyalar) && p.row.dosyalar.length>0 && (
            <Chip label={p.row.dosyalar.length} size="small" sx={{ ml: 0.5 }} />
          )}
        </Box>
      )},
      { field: 'etuysSecili', headerName: 'ETUYS', width: 80, sortable:false, renderCell:(p)=> (
        <input type="checkbox" checked={!!p.row.etuysSecili} disabled={!isReviseMode} onChange={(e)=> updateYerli(p.row.id, { etuysSecili: e.target.checked })} />
      ) },
      { field: 'copy', headerName: '', width: 42, sortable: false, renderCell: (p)=> (
        <IconButton size="small" onClick={()=> isReviseMode && setYerliRows(rows => duplicateRow(rows, p.row.id))} disabled={!isReviseMode}><CopyIcon fontSize="inherit"/></IconButton>
      )},
      { field: 'talep', headerName: 'Talep', width: 200, sortable: false, renderCell: (p)=>(
        <Stack direction="row" spacing={0.5} alignItems="center">
          {p.row.talep?.durum && (
            <Tooltip title={`Talep Tarihi: ${p.row.talep?.talepTarihi ? new Date(p.row.talep.talepTarihi).toLocaleDateString('tr-TR') : '-'}`}>
              <Chip size="small" label={`${p.row.talep.durum.replace(/_/g,' ').toUpperCase()}${p.row.talep.istenenAdet?` (${p.row.talep.istenenAdet})`:''}`} />
            </Tooltip>
          )}
          <Tooltip title="Bakanlığa gönder">
            <span>
              <IconButton size="small" disabled={!selectedTesvik || !isReviseMode} onClick={async()=>{
                const rid = await ensureRowId('yerli', p.row);
                if (!rid) { alert('Satır kimliği oluşturulamadı. Lütfen tekrar deneyin.'); return; }
                const talep = { durum:'bakanliga_gonderildi', istenenAdet: Number(p.row.miktar)||0, talepTarihi: new Date() };
                await tesvikService.setMakineTalep(selectedTesvik._id, { liste:'yerli', rowId: rid, talep });
                updateYerli(p.row.id, { rowId: rid, talep });
                setActivityLog(log=> { const next = [{ type:'talep', list:'yerli', row:p.row, payload:talep, date:new Date() }, ...log].slice(0,200); if(selectedTesvik?._id){ saveLS(`mk_activity_${selectedTesvik._id}`, next); } return next; });
              }}><SendIcon fontSize="inherit"/></IconButton>
            </span>
          </Tooltip>
        </Stack>
      ) },
      { field: 'karar', headerName: 'Karar', width: 220, sortable: false, renderCell: (p)=>(
        <Stack direction="row" spacing={0.5} alignItems="center">
          {p.row.karar?.kararDurumu && (
            <Tooltip title={`Karar Tarihi: ${p.row.karar?.kararTarihi ? new Date(p.row.karar.kararTarihi).toLocaleDateString('tr-TR') : '-'}`}>
              <Chip size="small" label={`${p.row.karar.kararDurumu.toUpperCase()}${Number.isFinite(Number(p.row.karar.onaylananAdet))?` (${p.row.karar.onaylananAdet})`:''}`} />
            </Tooltip>
          )}
          <Tooltip title="Onay">
            <span>
              <IconButton size="small" disabled={!selectedTesvik || !isReviseMode || !p.row.talep?.durum || p.row.talep.durum !== 'bakanliga_gonderildi'} onClick={async()=>{
                const rid = await ensureRowId('yerli', p.row);
                if (!rid) { alert('Satır kimliği oluşturulamadı. Lütfen tekrar deneyin.'); return; }
                const karar = { kararDurumu:'onay', onaylananAdet:Number(p.row.miktar)||0, kararTarihi: new Date() };
                await tesvikService.setMakineKarar(selectedTesvik._id, { liste:'yerli', rowId: rid, karar });
                updateYerli(p.row.id, { rowId: rid, karar });
                setActivityLog(log=> { const next = [{ type:'karar', list:'yerli', row:p.row, payload:karar, date:new Date() }, ...log].slice(0,200); if(selectedTesvik?._id){ saveLS(`mk_activity_${selectedTesvik._id}`, next); } return next; });
              }}><CheckIcon fontSize="inherit"/></IconButton>
            </span>
          </Tooltip>
          <Tooltip title="Kısmi Onay">
            <span>
              <IconButton size="small" disabled={!selectedTesvik || !isReviseMode || !p.row.talep?.durum || p.row.talep.durum !== 'bakanliga_gonderildi'} onClick={async()=>{
                const rid = await ensureRowId('yerli', p.row);
                if (!rid) { alert('Satır kimliği oluşturulamadı. Lütfen tekrar deneyin.'); return; }
                const karar = { kararDurumu:'kismi_onay', onaylananAdet: Math.max(0, Math.floor((Number(p.row.miktar)||0)/2)), kararTarihi: new Date() };
                await tesvikService.setMakineKarar(selectedTesvik._id, { liste:'yerli', rowId: rid, karar });
                updateYerli(p.row.id, { rowId: rid, karar });
                setActivityLog(log=> { const next = [{ type:'karar', list:'yerli', row:p.row, payload:karar, date:new Date() }, ...log].slice(0,200); if(selectedTesvik?._id){ saveLS(`mk_activity_${selectedTesvik._id}`, next); } return next; });
              }}><PercentIcon fontSize="inherit"/></IconButton>
            </span>
          </Tooltip>
          <Tooltip title="Red">
            <span>
              <IconButton size="small" color="error" disabled={!selectedTesvik || !isReviseMode || !p.row.talep?.durum || p.row.talep.durum !== 'bakanliga_gonderildi'} onClick={async()=>{
                const rid = await ensureRowId('yerli', p.row);
                if (!rid) { alert('Satır kimliği oluşturulamadı. Lütfen tekrar deneyin.'); return; }
                const karar = { kararDurumu:'red', onaylananAdet:0, kararTarihi: new Date() };
                await tesvikService.setMakineKarar(selectedTesvik._id, { liste:'yerli', rowId: rid, karar });
                updateYerli(p.row.id, { rowId: rid, karar });
                setActivityLog(log=> { const next = [{ type:'karar', list:'yerli', row:p.row, payload:karar, date:new Date() }, ...log].slice(0,200); if(selectedTesvik?._id){ saveLS(`mk_activity_${selectedTesvik._id}`, next); } return next; });
              }}><ClearIcon fontSize="inherit"/></IconButton>
            </span>
          </Tooltip>
        </Stack>
      ) },
      { field: 'talepTarihi', headerName: 'Talep Tarihi', width: 150, sortable: false, renderCell: (p)=> {
        const TalepTarihiCell = () => {
          const [localValue, setLocalValue] = useState(formatDateForInput(p.row.talep?.talepTarihi));
          
          // Row değiştiğinde local value'yu güncelle
          useEffect(() => {
            setLocalValue(formatDateForInput(p.row.talep?.talepTarihi));
          }, [p.row.talep?.talepTarihi]);

          return (
            <TextField
              type="date"
              size="small"
              InputLabelProps={{ shrink: true }}
              disabled={!selectedTesvik}
              value={localValue}
              onChange={async(e)=>{
                const newValue = e.target.value;
                setLocalValue(newValue); // Hemen UI'da güncelle
                
                const rid = await ensureRowId('yerli', p.row);
                if (!rid) return;
                const talep = { ...(p.row.talep||{}), talepTarihi: newValue ? new Date(newValue) : undefined };
                await tesvikService.setMakineTalep(selectedTesvik._id, { liste:'yerli', rowId: rid, talep });
                updateYerli(p.row.id, { rowId: rid, talep });
                setActivityLog(log=> { const next = [{ type:'talep_tarih', list:'yerli', row:p.row, payload:talep, date:new Date() }, ...log].slice(0,200); if(selectedTesvik?._id){ saveLS(`mk_activity_${selectedTesvik._id}`, next); } return next; });
              }}
            />
          );
        };
        return <TalepTarihiCell />;
      } },
      { field: 'kararTarihi', headerName: 'Karar Tarihi', width: 150, sortable: false, renderCell: (p)=> {
        const KararTarihiCell = () => {
          const [localValue, setLocalValue] = useState(formatDateForInput(p.row.karar?.kararTarihi));
          
          // Row değiştiğinde local value'yu güncelle
          useEffect(() => {
            setLocalValue(formatDateForInput(p.row.karar?.kararTarihi));
          }, [p.row.karar?.kararTarihi]);

          return (
            <TextField
              type="date"
              size="small"
              InputLabelProps={{ shrink: true }}
              disabled={!selectedTesvik || !p.row.talep?.durum || p.row.talep.durum !== 'bakanliga_gonderildi'}
              value={localValue}
              onChange={async(e)=>{
                const newValue = e.target.value;
                setLocalValue(newValue); // Hemen UI'da güncelle
                
                const rid = await ensureRowId('yerli', p.row);
                if (!rid) return;
                const karar = { ...(p.row.karar||{}), kararTarihi: newValue ? new Date(newValue) : undefined };
                await tesvikService.setMakineKarar(selectedTesvik._id, { liste:'yerli', rowId: rid, karar });
                updateYerli(p.row.id, { rowId: rid, karar });
                setActivityLog(log=> { const next = [{ type:'karar_tarih', list:'yerli', row:p.row, payload:karar, date:new Date() }, ...log].slice(0,200); if(selectedTesvik?._id){ saveLS(`mk_activity_${selectedTesvik._id}`, next); } return next; });
              }}
            />
          );
        };
        return <KararTarihiCell />;
      } },
      { field: 'actions', headerName: '', width: 60, renderCell: (p)=>(
        <IconButton color="error" onClick={()=>delRow(p.row.id)}><DeleteIcon/></IconButton>
      )}
    ];
    return (
      <DataGrid autoHeight rows={filteredYerliRows} columns={cols} pageSize={10} rowsPerPageOptions={[10]} disableSelectionOnClick rowHeight={44} headerHeight={44}
        checkboxSelection
        selectionModel={selectionModel}
        onSelectionModelChange={(m)=> setSelectionModel(m)}
        processRowUpdate={processYerliRowUpdate}
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
          '& .MuiDataGrid-columnHeaders': { py: 0.25, backgroundColor:'#f8fafc', borderBottom:'1px solid #e5e7eb' },
          '& .MuiDataGrid-cell': { py: 0.5, borderBottom:'1px dashed #f1f5f9' },
          '& .MuiDataGrid-row:nth-of-type(odd)': { backgroundColor:'#fcfcfd' },
          '& .MuiDataGrid-row:hover': { backgroundColor:'#f5faff' }
        }}
      />
    );
  };

  const IthalGrid = () => {
    const cols = [
      // Birim Açıklaması kolonu kaldırıldı (müşteri istemiyor)
      { field: 'siraNo', headerName: '#', width: 70, 
        renderCell: (p) => (
          <TextField 
            size="small" 
            value={p.row.siraNo || ''} 
            onChange={(e) => isReviseMode && updateRowSiraNo('ithal', p.row.id, e.target.value)}
            disabled={!isReviseMode}
            type="number"
            sx={{ width: '100%' }}
            inputProps={{ min: 1, style: { textAlign: 'center' } }}
          />
        )
      },
      { field: 'gtipKodu', headerName: 'GTIP', width: 200, renderCell: (p) => (
        <Stack direction="row" spacing={0.5} alignItems="center" sx={{ width: '100%' }}>
          <Box sx={{ flex: 1 }}>
            <GTIPSuperSearch value={p.row.gtipKodu} onChange={(kod, aciklama)=>{ if(!isReviseMode) return; const patch = { gtipKodu: kod, gtipAciklama: aciklama }; if (!p.row.adi) patch.adi = aciklama; updateIthal(p.row.id, patch); }} />
          </Box>
          <IconButton size="small" onClick={(e)=> openFavMenu(e, 'gtip', p.row.id)}><StarBorderIcon fontSize="inherit"/></IconButton>
        </Stack>
      ) },
      { field: 'gtipAciklama', headerName: 'GTIP Açıklama', flex: 1, minWidth: 220, editable: true, renderCell:(p)=> (
        <Tooltip title={p.value||''}><Box sx={{ whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis', width:'100%' }}>{p.value||''}</Box></Tooltip>
      ) },
      { field: 'adi', headerName: 'Adı ve Özelliği', flex: 1, minWidth: 260, editable: isReviseMode, renderCell:(p)=> (
        <Tooltip title={p.value||''}><Box sx={{ whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis', width:'100%' }}>{p.value||''}</Box></Tooltip>
      ) },
      { field: 'miktar', headerName: 'Miktar', width: 90, editable: isReviseMode, type: 'number', align:'right', headerAlign:'right' },
      { field: 'birim', headerName: 'Birim', width: 280, renderCell: (p) => (
        <Stack direction="row" spacing={0.5} alignItems="center" sx={{ width: '100%' }}>
          <Box sx={{ flex: 1, pr:1 }}>
            <UnitCurrencySearch display="chip" type="unit" value={{ kod: p.row.birim, aciklama: p.row.birimAciklamasi }} onChange={(kod,aciklama)=>{ if(!isReviseMode) return; updateIthal(p.row.id,{ birim:kod, birimAciklamasi: aciklama }); }} />
          </Box>
          <IconButton size="small" onClick={(e)=> openFavMenu(e,'unit', p.row.id)}><StarBorderIcon fontSize="inherit"/></IconButton>
        </Stack>
      ) },
      // birimAciklamasi kolonu kaldırıldı
      { field: 'birimFiyatiFob', headerName: 'FOB BF', width: 110, editable: isReviseMode, type: 'number', align:'right', headerAlign:'right' },
      { field: 'doviz', headerName: 'Döviz', width: 160, renderCell: (p)=>(
        <Stack direction="row" spacing={0.5} alignItems="center" sx={{ width: '100%' }}>
          <Box sx={{ flex: 1 }}>
            <UnitCurrencySearch type="currency" value={p.row.doviz} onChange={(kod)=>{ if(!isReviseMode) return; updateIthal(p.row.id,{doviz:kod}); }} />
          </Box>
          <IconButton size="small" onClick={(e)=> openFavMenu(e,'currency', p.row.id)}><StarBorderIcon fontSize="inherit"/></IconButton>
        </Stack>
      ) },
      { field: 'toplamUsd', headerName: '$', width: 110, align:'right', headerAlign:'right',
        valueGetter: (p)=> numberOrZero(p.row.miktar) * numberOrZero(p.row.birimFiyatiFob),
        valueFormatter: (p)=> numberOrZero(p.value)?.toLocaleString('en-US')
      },
      { field: 'toplamTl', headerName: 'TL', width: 140, editable: isReviseMode, align:'right', headerAlign:'right', valueFormatter: (p)=> p.value?.toLocaleString('tr-TR') },
      { field: 'kullanilmis', headerName: 'Kullanılmış', width: 180, renderCell: (p)=>(
        <UnitCurrencySearch type="used" value={p.row.kullanilmisKod} onChange={(kod,aciklama)=>{ if(!isReviseMode) return; updateIthal(p.row.id,{kullanilmisKod:kod,kullanilmisAciklama:aciklama}); }} />
      ) },
      { field: 'ckdSkd', headerName: 'CKD/SKD', width: 110, renderCell: (p)=> (
        <Select size="small" value={p.row.ckdSkd || ''} onChange={(e)=> isReviseMode && updateIthal(p.row.id, { ckdSkd: e.target.value })} displayEmpty fullWidth disabled={!isReviseMode}>
          <MenuItem value="">-</MenuItem>
          <MenuItem value="EVET">EVET</MenuItem>
          <MenuItem value="HAYIR">HAYIR</MenuItem>
        </Select>
      ) },
      { field: 'aracMi', headerName: 'Araç mı?', width: 110, renderCell: (p)=> (
        <Select size="small" value={p.row.aracMi || ''} onChange={(e)=> isReviseMode && updateIthal(p.row.id, { aracMi: e.target.value })} displayEmpty fullWidth disabled={!isReviseMode}>
          <MenuItem value="">-</MenuItem>
          <MenuItem value="EVET">EVET</MenuItem>
          <MenuItem value="HAYIR">HAYIR</MenuItem>
        </Select>
      ) },
      { field: 'makineTechizatTipi', headerName: 'M.Teşhizat Tipi', width: 180, renderCell: (p)=> (
        <Select size="small" value={p.row.makineTechizatTipi || ''} onChange={(e)=> isReviseMode && updateIthal(p.row.id, { makineTechizatTipi: e.target.value })} displayEmpty fullWidth disabled={!isReviseMode}>
          <MenuItem value="">-</MenuItem>
          <MenuItem value="Ana Makine">Ana Makine</MenuItem>
          <MenuItem value="Yardımcı Makine">Yardımcı Makine</MenuItem>
        </Select>
      ) },
      { field: 'kdvMuafiyeti', headerName: 'KDV Muaf?', width: 120, renderCell: (p)=> (
        <Select size="small" value={p.row.kdvMuafiyeti || ''} onChange={(e)=> isReviseMode && updateIthal(p.row.id, { kdvMuafiyeti: e.target.value })} displayEmpty fullWidth disabled={!isReviseMode}>
          <MenuItem value="">-</MenuItem>
          <MenuItem value="EVET">EVET</MenuItem>
          <MenuItem value="HAYIR">HAYIR</MenuItem>
        </Select>
      ) },
      { field: 'gumrukVergisiMuafiyeti', headerName: 'G.Verg. Muaf?', width: 140, renderCell: (p)=> (
        <Select size="small" value={p.row.gumrukVergisiMuafiyeti || ''} onChange={(e)=> isReviseMode && updateIthal(p.row.id, { gumrukVergisiMuafiyeti: e.target.value })} displayEmpty fullWidth disabled={!isReviseMode}>
          <MenuItem value="">-</MenuItem>
          <MenuItem value="EVET">EVET</MenuItem>
          <MenuItem value="HAYIR">HAYIR</MenuItem>
        </Select>
      ) },
      { field: 'finansalKiralamaMi', headerName: 'FK mı?', width: 100, renderCell: (p)=> (
        <Select size="small" value={p.row.finansalKiralamaMi || ''} onChange={(e)=> isReviseMode && updateIthal(p.row.id, { finansalKiralamaMi: e.target.value })} displayEmpty fullWidth disabled={!isReviseMode}>
          <MenuItem value="">-</MenuItem>
          <MenuItem value="EVET">EVET</MenuItem>
          <MenuItem value="HAYIR">HAYIR</MenuItem>
        </Select>
      ) },
      { field: 'finansalKiralamaAdet', headerName: 'FK Adet', width: 100, editable: isReviseMode, type: 'number' },
      { field: 'finansalKiralamaSirket', headerName: 'FK Şirket', width: 160, editable: isReviseMode },
      { field: 'gerceklesenAdet', headerName: 'Gerç. Adet', width: 110, editable: isReviseMode, type: 'number' },
      { field: 'gerceklesenTutar', headerName: 'Gerç. Tutar', width: 130, editable: isReviseMode, type: 'number' },
      { field: 'iadeDevirSatisVarMi', headerName: 'İade/Devir/Satış?', width: 150, renderCell: (p)=> (
        <Select size="small" value={p.row.iadeDevirSatisVarMi || ''} onChange={(e)=> isReviseMode && updateIthal(p.row.id, { iadeDevirSatisVarMi: e.target.value })} displayEmpty fullWidth disabled={!isReviseMode}>
          <MenuItem value="">-</MenuItem>
          <MenuItem value="EVET">EVET</MenuItem>
          <MenuItem value="HAYIR">HAYIR</MenuItem>
        </Select>
      ) },
      { field: 'iadeDevirSatisAdet', headerName: 'İade/Devir/Satış Adet', width: 170, editable: isReviseMode, type: 'number' },
      { field: 'iadeDevirSatisTutar', headerName: 'İade/Devir/Satış Tutar', width: 180, editable: isReviseMode, type: 'number' },
      { field: 'dosya', headerName: 'Dosya', width: 120, sortable: false, renderCell: (p)=> (
        <Box onDragOver={(e)=>{e.preventDefault();}} onDrop={async(e)=>{ if(!isReviseMode) return; e.preventDefault(); const files = Array.from(e.dataTransfer.files||[]); if(files.length===0) return; const form = new FormData(); files.forEach(f=> form.append('files', f)); form.append('path', `makine-yonetimi/${selectedTesvik?._id || 'global'}/${tab}/${p.row.id}`); await api.post('/files/upload', form, { headers:{'Content-Type':'multipart/form-data'} }); updateIthal(p.row.id, { dosyalar: [...(p.row.dosyalar||[]), ...files.map(f=>({ name:f.name })) ] }); }}>
          <Button size="small" onClick={()=> isReviseMode ? openUpload(p.row.id) : openFilesDialog(`makine-yonetimi/${selectedTesvik?._id || 'global'}/${tab}/${p.row.id}`)}>{isReviseMode?'Yükle':'Görüntüle'}</Button>
          {Array.isArray(p.row.dosyalar) && p.row.dosyalar.length>0 && (
            <Chip label={p.row.dosyalar.length} size="small" sx={{ ml: 0.5 }} />
          )}
        </Box>
      )},
      { field: 'etuysSecili', headerName: 'ETUYS', width: 80, sortable:false, renderCell:(p)=> (
        <input type="checkbox" checked={!!p.row.etuysSecili} disabled={!isReviseMode} onChange={(e)=> updateIthal(p.row.id, { etuysSecili: e.target.checked })} />
      ) },
      { field: 'copy', headerName: '', width: 42, sortable: false, renderCell: (p)=> (
        <IconButton size="small" onClick={()=> isReviseMode && setIthalRows(rows => duplicateRow(rows, p.row.id))} disabled={!isReviseMode}><CopyIcon fontSize="inherit"/></IconButton>
      )},
      { field: 'talep', headerName: 'Talep', width: 200, sortable: false, renderCell: (p)=>(
        <Stack direction="row" spacing={0.5} alignItems="center">
          {p.row.talep?.durum && (
            <Tooltip title={`Talep Tarihi: ${p.row.talep?.talepTarihi ? new Date(p.row.talep.talepTarihi).toLocaleDateString('tr-TR') : '-'}`}>
              <Chip size="small" label={`${p.row.talep.durum.replace(/_/g,' ').toUpperCase()}${p.row.talep.istenenAdet?` (${p.row.talep.istenenAdet})`:''}`} />
            </Tooltip>
          )}
          <Tooltip title="Bakanlığa gönder">
            <span>
              <IconButton size="small" disabled={!selectedTesvik || !isReviseMode} onClick={async()=>{
                const rid = await ensureRowId('ithal', p.row);
                if (!rid) { alert('Satır kimliği oluşturulamadı. Lütfen tekrar deneyin.'); return; }
                const talep = { durum:'bakanliga_gonderildi', istenenAdet: Number(p.row.miktar)||0, talepTarihi: new Date() };
                await tesvikService.setMakineTalep(selectedTesvik._id, { liste:'ithal', rowId: rid, talep });
                updateIthal(p.row.id, { rowId: rid, talep });
                setActivityLog(log=> { const next = [{ type:'talep', list:'ithal', row:p.row, payload:talep, date:new Date() }, ...log].slice(0,200); if(selectedTesvik?._id){ saveLS(`mk_activity_${selectedTesvik._id}`, next); } return next; });
              }}><SendIcon fontSize="inherit"/></IconButton>
            </span>
          </Tooltip>
        </Stack>
      ) },
      { field: 'karar', headerName: 'Karar', width: 220, sortable: false, renderCell: (p)=>
      (
        <Stack direction="row" spacing={0.5} alignItems="center">
          {p.row.karar?.kararDurumu && (
            <Tooltip title={`Karar Tarihi: ${p.row.karar?.kararTarihi ? new Date(p.row.karar.kararTarihi).toLocaleDateString('tr-TR') : '-'}`}>
              <Chip size="small" label={`${p.row.karar.kararDurumu.toUpperCase()}${Number.isFinite(Number(p.row.karar.onaylananAdet))?` (${p.row.karar.onaylananAdet})`:''}`} />
            </Tooltip>
          )}
          <Tooltip title="Onay">
            <span>
              <IconButton size="small" disabled={!selectedTesvik || !isReviseMode || !p.row.talep?.durum || p.row.talep.durum !== 'bakanliga_gonderildi'} onClick={async()=>{
                const rid = await ensureRowId('ithal', p.row);
                if (!rid) { alert('Satır kimliği oluşturulamadı. Lütfen tekrar deneyin.'); return; }
                const karar = { kararDurumu:'onay', onaylananAdet:Number(p.row.miktar)||0, kararTarihi: new Date() };
                await tesvikService.setMakineKarar(selectedTesvik._id, { liste:'ithal', rowId: rid, karar });
                updateIthal(p.row.id, { rowId: rid, karar });
                setActivityLog(log=> { const next = [{ type:'karar', list:'ithal', row:p.row, payload:karar, date:new Date() }, ...log].slice(0,200); if(selectedTesvik?._id){ saveLS(`mk_activity_${selectedTesvik._id}`, next); } return next; });
              }}><CheckIcon fontSize="inherit"/></IconButton>
            </span>
          </Tooltip>
          <Tooltip title="Kısmi Onay">
            <span>
              <IconButton size="small" disabled={!selectedTesvik || !isReviseMode || !p.row.talep?.durum || p.row.talep.durum !== 'bakanliga_gonderildi'} onClick={async()=>{
                const rid = await ensureRowId('ithal', p.row);
                if (!rid) { alert('Satır kimliği oluşturulamadı. Lütfen tekrar deneyin.'); return; }
                const karar = { kararDurumu:'kismi_onay', onaylananAdet: Math.max(0, Math.floor((Number(p.row.miktar)||0)/2)), kararTarihi: new Date() };
                await tesvikService.setMakineKarar(selectedTesvik._id, { liste:'ithal', rowId: rid, karar });
                updateIthal(p.row.id, { rowId: rid, karar });
                setActivityLog(log=> { const next = [{ type:'karar', list:'ithal', row:p.row, payload:karar, date:new Date() }, ...log].slice(0,200); if(selectedTesvik?._id){ saveLS(`mk_activity_${selectedTesvik._id}`, next); } return next; });
              }}><PercentIcon fontSize="inherit"/></IconButton>
            </span>
          </Tooltip>
          <Tooltip title="Red">
            <span>
              <IconButton size="small" color="error" disabled={!selectedTesvik || !isReviseMode || !p.row.talep?.durum || p.row.talep.durum !== 'bakanliga_gonderildi'} onClick={async()=>{
                const rid = await ensureRowId('ithal', p.row);
                if (!rid) { alert('Satır kimliği oluşturulamadı. Lütfen tekrar deneyin.'); return; }
                const karar = { kararDurumu:'red', onaylananAdet:0, kararTarihi: new Date() };
                await tesvikService.setMakineKarar(selectedTesvik._id, { liste:'ithal', rowId: rid, karar });
                updateIthal(p.row.id, { rowId: rid, karar });
                setActivityLog(log=> { const next = [{ type:'karar', list:'ithal', row:p.row, payload:karar, date:new Date() }, ...log].slice(0,200); if(selectedTesvik?._id){ saveLS(`mk_activity_${selectedTesvik._id}`, next); } return next; });
              }}><ClearIcon fontSize="inherit"/></IconButton>
            </span>
          </Tooltip>
        </Stack>
      ) },
      { field: 'talepTarihi', headerName: 'Talep Tarihi', width: 150, sortable: false, renderCell: (p)=> {
        const TalepTarihiCell = () => {
          const [localValue, setLocalValue] = useState(formatDateForInput(p.row.talep?.talepTarihi));
          
          // Row değiştiğinde local value'yu güncelle
          useEffect(() => {
            setLocalValue(formatDateForInput(p.row.talep?.talepTarihi));
          }, [p.row.talep?.talepTarihi]);

          return (
            <TextField
              type="date"
              size="small"
              InputLabelProps={{ shrink: true }}
              disabled={!selectedTesvik}
              value={localValue}
              onChange={async(e)=>{
                const newValue = e.target.value;
                setLocalValue(newValue); // Hemen UI'da güncelle
                
                const rid = await ensureRowId('ithal', p.row);
                if (!rid) return;
                const talep = { ...(p.row.talep||{}), talepTarihi: newValue ? new Date(newValue) : undefined };
                await tesvikService.setMakineTalep(selectedTesvik._id, { liste:'ithal', rowId: rid, talep });
                updateIthal(p.row.id, { rowId: rid, talep });
                setActivityLog(log=> { const next = [{ type:'talep_tarih', list:'ithal', row:p.row, payload:talep, date:new Date() }, ...log].slice(0,200); if(selectedTesvik?._id){ saveLS(`mk_activity_${selectedTesvik._id}`, next); } return next; });
              }}
            />
          );
        };
        return <TalepTarihiCell />;
      } },
      { field: 'kararTarihi', headerName: 'Karar Tarihi', width: 150, sortable: false, renderCell: (p)=> {
        const KararTarihiCell = () => {
          const [localValue, setLocalValue] = useState(formatDateForInput(p.row.karar?.kararTarihi));
          
          // Row değiştiğinde local value'yu güncelle
          useEffect(() => {
            setLocalValue(formatDateForInput(p.row.karar?.kararTarihi));
          }, [p.row.karar?.kararTarihi]);

          return (
            <TextField
              type="date"
              size="small"
              InputLabelProps={{ shrink: true }}
              disabled={!selectedTesvik || !p.row.talep?.durum || p.row.talep.durum !== 'bakanliga_gonderildi'}
              value={localValue}
              onChange={async(e)=>{
                const newValue = e.target.value;
                setLocalValue(newValue); // Hemen UI'da güncelle
                
                const rid = await ensureRowId('ithal', p.row);
                if (!rid) return;
                const karar = { ...(p.row.karar||{}), kararTarihi: newValue ? new Date(newValue) : undefined };
                await tesvikService.setMakineKarar(selectedTesvik._id, { liste:'ithal', rowId: rid, karar });
                updateIthal(p.row.id, { rowId: rid, karar });
                setActivityLog(log=> { const next = [{ type:'karar_tarih', list:'ithal', row:p.row, payload:karar, date:new Date() }, ...log].slice(0,200); if(selectedTesvik?._id){ saveLS(`mk_activity_${selectedTesvik._id}`, next); } return next; });
              }}
            />
          );
        };
        return <KararTarihiCell />;
      } },
      { field: 'actions', headerName: '', width: 60, renderCell: (p)=>(
        <IconButton color="error" onClick={()=>delRow(p.row.id)}><DeleteIcon/></IconButton>
      )}
    ];
    return (
      <DataGrid autoHeight rows={filteredIthalRows} columns={cols} pageSize={10} rowsPerPageOptions={[10]} disableSelectionOnClick rowHeight={44} headerHeight={44}
        checkboxSelection
        selectionModel={selectionModel}
        onSelectionModelChange={(m)=> setSelectionModel(m)}
        processRowUpdate={processIthalRowUpdate}
        onCellEditStop={(params)=>{
          // Hücre edit commit olduğunda TL'yi manuel moda geçir ve değeri yaz
          if (params.field === 'toplamTl') {
            const id = params.id;
            const committed = parseTrCurrency(params.value);
            setIthalRows(rows => rows.map(r => r.id === id ? { ...r, tlManuel: true, toplamTl: committed } : r));
          }
        }}
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
        sx={{ '& .error-cell': { backgroundColor: '#fee2e2' }, '& .MuiDataGrid-columnHeaders': { py: 0.25, backgroundColor:'#f8fafc', borderBottom:'1px solid #e5e7eb' }, '& .MuiDataGrid-cell': { py: 0.5, borderBottom:'1px dashed #f1f5f9' }, '& .MuiDataGrid-row:nth-of-type(odd)': { backgroundColor:'#fcfcfd' }, '& .MuiDataGrid-row:hover': { backgroundColor:'#f5faff' }, '& .MuiDataGrid-row.Mui-selected': { backgroundColor:'#eef2ff !important' } }}
      />
    );
  };

  return (
    <Box sx={{ p: 3 }}>
      {/* 🧭 Navigasyon Butonları */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          {/* Ana Sayfa ve Geri Dönüş Butonları */}
          <Button
            variant="outlined"
            startIcon={<HomeIcon />}
            onClick={() => navigate('/')}
            sx={{
              color: '#10b981',
              borderColor: '#10b981',
              fontWeight: 600,
              '&:hover': {
                backgroundColor: '#f0fdf4',
                borderColor: '#10b981'
              }
            }}
          >
            Ana Sayfa
          </Button>
          
          <Button
            variant="outlined"
            startIcon={<ArrowBackIcon />}
            onClick={() => navigate('/tesvik')}
            sx={{
              color: '#8b5cf6',
              borderColor: '#8b5cf6',
              fontWeight: 600,
              '&:hover': {
                backgroundColor: '#faf5ff',
                borderColor: '#8b5cf6'
              }
            }}
          >
            Teşvikler
          </Button>
        </Box>

        {/* Breadcrumb Navigasyon */}
        <Breadcrumbs
          separator="›"
          sx={{ 
            color: '#64748b',
            '& .MuiBreadcrumbs-separator': { color: '#d1d5db' }
          }}
        >
          <Button
            variant="text"
            size="small"
            onClick={() => navigate('/')}
            sx={{ 
              color: '#64748b', 
              minWidth: 'auto',
              '&:hover': { color: '#10b981', backgroundColor: 'transparent' }
            }}
          >
            Ana Sayfa
          </Button>
          <Button
            variant="text"
            size="small"
            onClick={() => navigate('/tesvik')}
            sx={{ 
              color: '#64748b', 
              minWidth: 'auto',
              '&:hover': { color: '#8b5cf6', backgroundColor: 'transparent' }
            }}
          >
            Teşvikler
          </Button>
          <Typography variant="body2" sx={{ color: '#1f2937', fontWeight: 600 }}>
            Makine Yönetimi
          </Typography>
        </Breadcrumbs>
      </Box>

      <Typography variant="h5" sx={{ mb: 2, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 1 }}>
        <BuildIcon sx={{ color: '#dc2626' }} />
        Makine Teçhizat Yönetimi
      </Typography>

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
          {/* Seçili makineyi ETUYS için filtrelemeden gönderme opsiyonu daha sonra eklenecek */}
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

      <Paper sx={{ p: 2, mb: 2, position: fullScreen ? 'fixed' : 'relative', inset: fullScreen ? 0 : 'auto', zIndex: fullScreen ? 1300 : 'auto', height: fullScreen ? '100vh' : 'auto', overflow: 'auto', borderRadius: 2, boxShadow: '0 8px 24px rgba(0,0,0,0.06)' }}>
        <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1 }}>
          <Tabs value={tab} onChange={(e,v)=>setTab(v)}>
            <Tab label="Yerli" value="yerli" />
            <Tab label="İthal" value="ithal" />
          </Tabs>
          <Box sx={{ flex: 1 }} />
          {/* 🆕 Revizyon Aksiyonları */}
          <Tooltip title={isReviseMode ? 'Revize Modu Aktif' : 'Yeni Revize Başlat'}>
            <span>
              <Button size="small" 
                variant={isReviseMode?'contained':'outlined'} 
                startIcon={isReviseStarted ? <ClearIcon/> : <FiberNewIcon/>} 
                color={isReviseStarted ? 'warning' : 'primary'}
                disabled={!selectedTesvik} 
                onClick={async()=>{
                  if (!selectedTesvik?._id) return;
                  
                  // Eğer revize başlatılmışsa vazgeç seçeneği sun
                  if (isReviseStarted) {
                    const ok = window.confirm('Revizeden vazgeçilecek ve değişiklikler kaydedilmeyecek. Emin misiniz?');
                    if (!ok) return;
                    setIsReviseMode(false);
                    setIsReviseStarted(false);
                    // Eski verileri geri yükle
                    if (selectedTesvik) {
                      loadMakineData(selectedTesvik._id);
                    }
                    openToast('info', 'Revizeden vazgeçildi.');
                    return;
                  }
                  
                  const ok = window.confirm('Mevcut liste snapshot alınacak ve revize modu açılacak. Devam edilsin mi?');
                  if (!ok) return;
                  try {
                    await tesvikService.startMakineRevizyon(selectedTesvik._id, { aciklama: 'Yeni revize başladı', revizeMuracaatTarihi: new Date() });
                    setIsReviseMode(true);
                    setIsReviseStarted(true);
                    const list = await tesvikService.listMakineRevizyonlari(selectedTesvik._id); setRevList(list.reverse());
                    openToast('success', 'Revize başlatıldı. Düzenleme modu aktif.');
                  } catch (e) {
                    openToast('error', 'Revize başlatılırken hata oluştu.');
                  }
                }}>{isReviseStarted ? 'Revizden Vazgeç' : 'Yeni Revize'}</Button>
            </span>
          </Tooltip>
          <Tooltip title="Revizeyi Finalize Et (post-snapshot)">
            <span>
              <Button size="small" variant="outlined" startIcon={<CheckIcon/>} disabled={!selectedTesvik || !isReviseMode} onClick={async()=>{
                const ok = window.confirm('Revize sonlandırılacak ve son hali snapshot olarak kaydedilecek. Onaylıyor musun?');
                if (!ok) return;
                try {
                  // Revize bitmeden önce ekrandaki son hali veritabanına kaydet
                  const payload = {
                    yerli: yerliRows.map(r=>({ siraNo:r.siraNo, rowId:r.rowId, gtipKodu:r.gtipKodu, gtipAciklamasi:r.gtipAciklama, adiVeOzelligi:r.adi, miktar:r.miktar, birim:r.birim, birimAciklamasi:r.birimAciklamasi, birimFiyatiTl:r.birimFiyatiTl, toplamTutariTl:r.toplamTl, kdvIstisnasi:r.kdvIstisnasi, makineTechizatTipi:r.makineTechizatTipi, finansalKiralamaMi:r.finansalKiralamaMi, finansalKiralamaAdet:r.finansalKiralamaAdet, finansalKiralamaSirket:r.finansalKiralamaSirket, gerceklesenAdet:r.gerceklesenAdet, gerceklesenTutar:r.gerceklesenTutar, iadeDevirSatisVarMi:r.iadeDevirSatisVarMi, iadeDevirSatisAdet:r.iadeDevirSatisAdet, iadeDevirSatisTutar:r.iadeDevirSatisTutar })),
                    ithal: ithalRows.map(r=>({ siraNo:r.siraNo, rowId:r.rowId, gtipKodu:r.gtipKodu, gtipAciklamasi:r.gtipAciklama, adiVeOzelligi:r.adi, miktar:r.miktar, birim:r.birim, birimAciklamasi:r.birimAciklamasi, birimFiyatiFob:r.birimFiyatiFob, gumrukDovizKodu:r.doviz, toplamTutarFobUsd:r.toplamUsd, toplamTutarFobTl:r.toplamTl, kullanilmisMakine:r.kullanilmisKod, kullanilmisMakineAciklama:r.kullanilmisAciklama, ckdSkdMi:r.ckdSkd, aracMi:r.aracMi, makineTechizatTipi:r.makineTechizatTipi, kdvMuafiyeti:r.kdvMuafiyeti, gumrukVergisiMuafiyeti:r.gumrukVergisiMuafiyeti, finansalKiralamaMi:r.finansalKiralamaMi, finansalKiralamaAdet:r.finansalKiralamaAdet, finansalKiralamaSirket:r.finansalKiralamaSirket, gerceklesenAdet:r.gerceklesenAdet, gerceklesenTutar:r.gerceklesenTutar, iadeDevirSatisVarMi:r.iadeDevirSatisVarMi, iadeDevirSatisAdet:r.iadeDevirSatisAdet, iadeDevirSatisTutar:r.iadeDevirSatisTutar }))
                  };
                  await tesvikService.saveMakineListeleri(selectedTesvik._id, payload);
                  // Onaya basınca onay tarihi yazsın (kararTarihi)
                  await tesvikService.finalizeMakineRevizyon(selectedTesvik._id, { aciklama: 'Revize finalize', revizeOnayTarihi: new Date(), kararTarihi: new Date() });
                  setIsReviseMode(false);
                  setIsReviseStarted(false);
                  const list = await tesvikService.listMakineRevizyonlari(selectedTesvik._id); setRevList(list.reverse());
                  openToast('success', 'Revize başarıyla finalize edildi.');
                } catch (e) {
                  openToast('error', 'Revize finalize edilirken hata oluştu.');
                }
              }}>Revizeyi Bitir</Button>
            </span>
          </Tooltip>
          <Tooltip title="Eski Revizeye Dön">
            <span>
              <Button size="small" variant="outlined" startIcon={<RestoreIcon/>} disabled={!selectedTesvik} onClick={()=> setRevertOpen(true)}>Eski Revizeye Dön</Button>
            </span>
          </Tooltip>
          <Tooltip title="Revize Excel Çıktısı (değişiklikler kırmızı)"><span><Button size="small" startIcon={<TableViewIcon/>} sx={{ color:'#166534', borderColor:'#16a34a', backgroundColor:'#e7f6ec', '&:hover':{ backgroundColor:'#d9f0e0' } }} variant="outlined" disabled={!selectedTesvik} onClick={async()=>{
             try {
               const res = await tesvikService.exportMakineRevizyonExcel(selectedTesvik._id);
               const blob = new Blob([res.data], { type: res.headers['content-type'] });
               const url = window.URL.createObjectURL(blob);
               const a = document.createElement('a');
               a.href = url; a.download = `makine_revizyon_${selectedTesvik?.tesvikId || selectedTesvik?.gmId}.xlsx`;
               a.click(); window.URL.revokeObjectURL(url);
               openToast('success', 'Revize Excel indirildi.');
             } catch (e) {
               openToast('error', 'Revize Excel alınamadı.');
             }
           }}>Revize Excel</Button></span></Tooltip>
          <Tooltip title="İşlem Geçmişi Excel"><span><IconButton disabled={!selectedTesvik} onClick={async()=>{
            try {
              const res = await tesvikService.exportMakineRevizyonHistoryExcel(selectedTesvik._id);
              const blob = new Blob([res.data], { type: res.headers['content-type'] });
              const url = window.URL.createObjectURL(blob);
              const a = document.createElement('a');
              a.href = url; a.download = `makine_revizyon_islem_gecmisi_${selectedTesvik?.tesvikId || selectedTesvik?.gmId}.xlsx`;
              a.click(); window.URL.revokeObjectURL(url);
              openToast('success', 'İşlem geçmişi Excel indirildi.');
            } catch (e) {
              openToast('error', 'İşlem geçmişi Excel alınamadı.');
            }
          }}><VisibilityIcon/></IconButton></span></Tooltip>
          <Tooltip title="Revize Metası (ETUYS)"><span><IconButton disabled={!selectedTesvik} onClick={openMeta}><BookmarksIcon/></IconButton></span></Tooltip>
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
              alert('Makine listeleri kaydedildi.');
            }
          }}><CheckIcon/></IconButton></span></Tooltip>
        </Stack>

        {tab === 'yerli' ? <YerliGrid/> : <IthalGrid/>}
      </Paper>

      {/* 🗑️ Silinen Satırlar & İşlem Özeti */}
      <Paper sx={{ p:2, mb:2, borderRadius: 2, boxShadow: '0 6px 18px rgba(0,0,0,0.05)' }}>
        <Stack direction="row" alignItems="center" spacing={1} sx={{ mb:1 }}>
          <DeleteOutlineIcon sx={{ color:'#ef4444' }} />
          <Typography variant="subtitle2" sx={{ fontWeight:700 }}>Silinen Satırlar</Typography>
        </Stack>
        <Stack spacing={0.75} sx={{ maxHeight:180, overflow:'auto' }}>
          {deletedRows.map((it, idx)=> (
            <Paper key={idx} variant="outlined" sx={{ p:1, display:'flex', alignItems:'center', gap:1, borderRadius:1.5 }}>
              <Chip size="small" color="error" label="SİLİNDİ" />
              <Chip size="small" label={it.type.toUpperCase()} />
              <Chip size="small" label={`#${it.row.siraNo||0}`} />
              <Box sx={{ flex:1, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{`${it.row.gtipKodu||''} — ${it.row.adi||it.row.adiVeOzelligi||''}`}</Box>
              <Box sx={{ color:'text.secondary' }}>{new Date(it.date).toLocaleString('tr-TR')}</Box>
            </Paper>
          ))}
          {deletedRows.length===0 && <Box sx={{ color:'text.secondary' }}>Silinen satır yok</Box>}
        </Stack>
        <Divider sx={{ my:1 }} />
        <Stack direction="row" alignItems="center" spacing={1} sx={{ mb:1 }}>
          <TimelineIcon sx={{ color:'#10b981' }} />
          <Typography variant="subtitle2" sx={{ fontWeight:700 }}>İşlem Özeti (Talep/Karar)</Typography>
        </Stack>
        <Stack spacing={0.75} sx={{ maxHeight:220, overflow:'auto' }}>
          {activityLog.map((it, idx)=> (
            <Paper key={idx} variant="outlined" sx={{ p:1, display:'flex', alignItems:'center', gap:1, borderRadius:1.5 }}>
              <Chip size="small" label={it.list.toUpperCase()} />
              <Chip size="small" color={it.type==='talep'?'primary': it.type==='karar'?'success':'default'} label={it.type.toUpperCase()} />
              <Box sx={{ flex:1, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{`${it.row?.gtipKodu||''} — ${it.row?.adi||it.row?.adiVeOzelligi||''}`}</Box>
              <Box>{it.type==='talep' ? `${(it.payload?.durum||'').replace(/_/g,' ')} ${it.payload?.istenenAdet?`(${it.payload.istenenAdet})`:''}` : it.type==='karar' ? `${(it.payload?.kararDurumu||'').replace(/_/g,' ')} ${Number.isFinite(Number(it.payload?.onaylananAdet))?`(${it.payload.onaylananAdet})`:''}` : ''}</Box>
              <Box sx={{ color:'text.secondary' }}>{new Date(it.date).toLocaleString('tr-TR')}</Box>
            </Paper>
          ))}
          {activityLog.length===0 && <Box sx={{ color:'text.secondary' }}>İşlem yok</Box>}
        </Stack>
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

      {/* 🛎️ Toast */}
      <Snackbar open={toast.open} autoHideDuration={3500} onClose={closeToast} anchorOrigin={{ vertical:'bottom', horizontal:'right' }}>
        <Alert onClose={closeToast} severity={toast.severity} sx={{ width: '100%' }}>
          {toast.message}
        </Alert>
      </Snackbar>

      {/* 🆕 Revize Metası Dialog */}
      <Dialog open={metaOpen} onClose={()=> setMetaOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Revize Metası (ETUYS)</DialogTitle>
        <DialogContent dividers>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField label="Talep No" size="small" value={metaForm.talepNo} onChange={(e)=> setMetaForm(v=>({ ...v, talepNo:e.target.value }))} />
            <Stack direction="row" spacing={1}>
              <TextField label="Belge No" size="small" value={metaForm.belgeNo} onChange={(e)=> setMetaForm(v=>({ ...v, belgeNo:e.target.value }))} sx={{ flex:1 }} />
              <TextField label="Belge Id" size="small" value={metaForm.belgeId} onChange={(e)=> setMetaForm(v=>({ ...v, belgeId:e.target.value }))} sx={{ flex:1 }} />
            </Stack>
            <TextField label="Başvuru Tarihi" type="date" size="small" InputLabelProps={{ shrink:true }} value={metaForm.basvuruTarihi} onChange={(e)=> setMetaForm(v=>({ ...v, basvuruTarihi:e.target.value }))} />
            <Select size="small" value={metaForm.odemeTalebi||''} onChange={(e)=> setMetaForm(v=>({ ...v, odemeTalebi:e.target.value }))} displayEmpty>
              <MenuItem value=""><em>Ödeme Talebi</em></MenuItem>
              <MenuItem value="firma">Firma</MenuItem>
              <MenuItem value="danisman">Danışman</MenuItem>
            </Select>
            <TextField label="Ret Sebebi" size="small" value={metaForm.retSebebi} onChange={(e)=> setMetaForm(v=>({ ...v, retSebebi:e.target.value }))} />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={()=> setMetaOpen(false)}>Kapat</Button>
          <Button variant="contained" onClick={saveMeta}>Kaydet</Button>
        </DialogActions>
      </Dialog>

      {/* 🗂️ Dosyalar Görüntüle */}
      <Dialog open={filesOpen} onClose={()=> setFilesOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Dosyalar — {filesPath}</DialogTitle>
        <DialogContent dividers>
          <Stack spacing={1}>
            {filesList.map((f, idx)=> (
              <Stack key={idx} direction="row" spacing={1} alignItems="center">
                <Chip size="small" label={(f.size||0).toLocaleString('tr-TR') + ' B'} />
                <Box sx={{ flex:1 }}>{f.name}</Box>
                <Button size="small" onClick={()=> window.open(`/uploads/files/${filesPath}/${f.name}`,'_blank')}>Önizle</Button>
                <Button size="small" onClick={()=>{ const a=document.createElement('a'); a.href=`/uploads/files/${filesPath}/${f.name}`; a.download=f.name; a.click(); }}>İndir</Button>
              </Stack>
            ))}
            {filesList.length===0 && <Box sx={{ color:'text.secondary' }}>Kayıt yok</Box>}
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={()=> setFilesOpen(false)}>Kapat</Button>
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

      {/* 🆕 Eski Revizeye Dön Dialog */}
      <Dialog open={revertOpen} onClose={()=> setRevertOpen(false)}>
        <DialogTitle>Eski Revizeye Dön</DialogTitle>
        <DialogContent>
          <Typography variant="body2" sx={{ mb:1 }}>Bir revize kaydı seç:</Typography>
          <Select size="small" fullWidth value={selectedRevizeId} onChange={(e)=> setSelectedRevizeId(e.target.value)} displayEmpty>
            <MenuItem value=""><em>Seçiniz</em></MenuItem>
            {revList.map(r => (
              <MenuItem key={r.revizeId} value={r.revizeId}>{new Date(r.revizeTarihi).toLocaleString('tr-TR')} — {r.revizeTuru?.toUpperCase()}</MenuItem>
            ))}
          </Select>
          <Typography variant="caption" color="text.secondary">Not: Geri dönüş yeni bir "revert" revizesi olarak kaydedilir.</Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={()=> setRevertOpen(false)}>İptal</Button>
          <Button variant="contained" disabled={!selectedRevizeId} onClick={async()=>{
            if (!selectedTesvik?._id || !selectedRevizeId) return;
            const res = await tesvikService.revertMakineRevizyon(selectedTesvik._id, selectedRevizeId, 'Kullanıcı geri dönüşü');
            if (res?.makineListeleri) {
              setYerliRows((res.makineListeleri.yerli||[]).map(r=>({ id:r.rowId||Math.random().toString(36).slice(2), ...r, gtipAciklama:r.gtipAciklamasi, adi:r.adiVeOzelligi, toplamTl:r.toplamTutariTl })));
              setIthalRows((res.makineListeleri.ithal||[]).map(r=>({ id:r.rowId||Math.random().toString(36).slice(2), ...r, gtipAciklama:r.gtipAciklamasi, adi:r.adiVeOzelligi, doviz:r.gumrukDovizKodu, toplamUsd:r.toplamTutarFobUsd, toplamTl:r.toplamTutarFobTl })));
            }
            setRevertOpen(false);
            const list = await tesvikService.listMakineRevizyonlari(selectedTesvik._id); setRevList(list.reverse());
            setIsReviseMode(true);
          }}>Geri Dön</Button>
        </DialogActions>
      </Dialog>

      {/* 🗑️ Silinen Satırlar Dialog */}
      <Dialog open={deletedOpen} onClose={()=> setDeletedOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>Silinen Satırlar (revize sürecinde)</DialogTitle>
        <DialogContent dividers>
          <Stack spacing={1}>
            {deletedRows.map((it, idx)=> (
              <Stack key={idx} direction="row" spacing={1} alignItems="center">
                <Chip size="small" label={it.type.toUpperCase()} />
                <Chip size="small" label={`#${it.row.siraNo||0}`} />
                <Box sx={{ flex:1 }}>{`${it.row.gtipKodu||''} — ${it.row.adi||it.row.adiVeOzelligi||''}`}</Box>
                <Box sx={{ color:'text.secondary' }}>{new Date(it.date).toLocaleString('tr-TR')}</Box>
              </Stack>
            ))}
            {deletedRows.length===0 && <Box sx={{ color:'text.secondary' }}>Kayıt yok</Box>}
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={()=> setDeletedOpen(false)}>Kapat</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default MakineYonetimi;


