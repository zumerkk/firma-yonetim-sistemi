import React, { useEffect, useLayoutEffect, useMemo, useState, useRef, useCallback, memo } from 'react';
import { Box, Paper, Typography, Button, Tabs, Tab, Chip, Stack, IconButton, Tooltip, Menu, MenuItem, Dialog, DialogTitle, DialogContent, DialogActions, Select, Drawer, Breadcrumbs, Snackbar, Alert, Checkbox, LinearProgress, ToggleButton, ToggleButtonGroup } from '@mui/material';
import { DataGrid } from '@mui/x-data-grid';
import UnitCurrencySearch from '../../components/UnitCurrencySearch';
import FileUpload from '../../components/Files/FileUpload';
import yeniTesvikService from '../../services/yeniTesvikService';
import { Autocomplete, TextField, Divider, FormControlLabel } from '@mui/material';
import api from '../../utils/axios';
import currencyService from '../../services/currencyService';
import * as XLSX from 'xlsx';
import ExcelJS from 'exceljs';
import { Add as AddIcon, Delete as DeleteIcon, FileUpload as ImportIcon, Download as ExportIcon, Replay as RecalcIcon, ContentCopy as CopyIcon, MoreVert as MoreIcon, Star as StarIcon, StarBorder as StarBorderIcon, Bookmarks as BookmarksIcon, Visibility as VisibilityIcon, Send as SendIcon, Check as CheckIcon, Percent as PercentIcon, Clear as ClearIcon, Fullscreen as FullscreenIcon, FullscreenExit as FullscreenExitIcon, ViewColumn as ViewColumnIcon, ArrowBack as ArrowBackIcon, Home as HomeIcon, Build as BuildIcon, History as HistoryIcon, Restore as RestoreIcon, FiberNew as FiberNewIcon, DeleteOutline as DeleteOutlineIcon, Timeline as TimelineIcon, TableView as TableViewIcon, CurrencyExchange as CurrencyExchangeIcon, Speed as SpeedIcon, ViewList as ViewListIcon, FlashOn as FlashOnIcon } from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import GTIPSuperSearch from '../../components/GTIPSuperSearch';
import { FixedSizeList as List } from 'react-window';

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

const emptyYerli = () => ({ id: Math.random().toString(36).slice(2), siraNo: 0, makineId: '', gtipKodu: '', gtipAciklama: '', adi: '', miktar: 0, birim: '', birimAciklamasi: '', birimFiyatiTl: 0, toplamTl: 0, kdvIstisnasi: '' , makineTechizatTipi:'', finansalKiralamaMi:'', finansalKiralamaAdet:0, finansalKiralamaSirket:'', gerceklesenAdet:0, gerceklesenTutar:0, iadeDevirSatisVarMi:'', iadeDevirSatisAdet:0, iadeDevirSatisTutar:0, dosyalar: [], silinmeTarihi: null });
const emptyIthal = () => ({ id: Math.random().toString(36).slice(2), siraNo: 0, makineId: '', gtipKodu: '', gtipAciklama: '', adi: '', miktar: 0, birim: '', birimAciklamasi: '', birimFiyatiFob: 0, doviz: '', toplamUsd: 0, toplamTl: 0, tlManuel: false, kurManuel: false, kurManuelDeger: 0, kullanilmisKod: '', kullanilmisAciklama: '', ckdSkd: '', aracMi: '', makineTechizatTipi:'', kdvMuafiyeti:'', gumrukVergisiMuafiyeti:'', finansalKiralamaMi:'', finansalKiralamaAdet:0, finansalKiralamaSirket:'', gerceklesenAdet:0, gerceklesenTutar:0, iadeDevirSatisVarMi:'', iadeDevirSatisAdet:0, iadeDevirSatisTutar:0, dosyalar: [], silinmeTarihi: null });

const loadLS = (key, fallback) => {
  try { const v = JSON.parse(localStorage.getItem(key)); return Array.isArray(v) ? v : fallback; } catch { return fallback; }
};
const saveLS = (key, val) => { try { localStorage.setItem(key, JSON.stringify(val)); } catch {} };

// 🔧 DebouncedTextField - Sadece blur'da günceller, scroll sıfırlanmasını önler
const DebouncedTextField = React.memo(({ value, onCommit, disabled, type, placeholder, sx, inputProps }) => {
  const [localValue, setLocalValue] = React.useState(value ?? '');
  const inputRef = React.useRef(null);
  
  // Parent'tan gelen değer değiştiğinde local'i güncelle (ama sadece focus dışındayken)
  React.useEffect(() => {
    if (document.activeElement !== inputRef.current) {
      setLocalValue(value ?? '');
    }
  }, [value]);
  
  const handleBlur = () => {
    if (onCommit && localValue !== value) {
      onCommit(localValue);
    }
  };
  
  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.target.blur();
    }
  };
  
  return (
    <TextField
      inputRef={inputRef}
      size="small"
      value={localValue}
      onChange={(e) => setLocalValue(e.target.value)}
      onBlur={handleBlur}
      onKeyDown={handleKeyDown}
      disabled={disabled}
      type={type}
      placeholder={placeholder}
      sx={sx}
      inputProps={inputProps}
    />
  );
});

const MakineYonetimi = () => {
  const navigate = useNavigate(); // 🧭 Navigasyon hook'u
  const [tab, setTab] = useState('yerli');
  const [selectedTesvik, setSelectedTesvik] = useState(null);
  const [tesvikOptions, setTesvikOptions] = useState([]);
  const [loadingTesvik, setLoadingTesvik] = useState(false);
  // 🔧 FIX: Başlangıçta boş başla, teşvik seçildiğinde localStorage'dan yükle
  // Bu şekilde makine ID'leri teşvik bazlı kalıcı olacak
  const [yerliRows, setYerliRows] = useState([]);
  const [ithalRows, setIthalRows] = useState([]);
  
  // 🚀 ENTERPRISE: İki Modlu Sistem - Standard vs Hızlı Yönetim
  // 'standard' = Mevcut detaylı görünüm (küçük veri setleri için)
  // 'quick' = Hızlı Yönetim modu (toplu ekleme, 1000+ satır için optimize)
  const [viewMode, setViewMode] = useState('standard');
  const [quickModeRows, setQuickModeRows] = useState([]); // Hızlı mod için geçici satırlar
  const [bulkProgress, setBulkProgress] = useState({ active: false, current: 0, total: 0, message: '' });
  const [pasteDialogOpen, setPasteDialogOpen] = useState(false);
  const [pasteData, setPasteData] = useState('');
  const [pendingBulkRows, setPendingBulkRows] = useState([]);
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
  // 📝 NOTLAR - Makine yönetimi için notlar alanı
  const [makineNotlari, setMakineNotlari] = useState('');

  // Sıra numarası güncelleme fonksiyonu
  const updateRowSiraNo = (type, rowId, newSiraNo) => {
    if (type === 'yerli') {
      updateYerli(rowId, { siraNo: Number(newSiraNo) || 0 });
    } else {
      updateIthal(rowId, { siraNo: Number(newSiraNo) || 0 });
    }
  };

  // Makine verilerini yükle (teşvik ID'sine göre) - Önce backend, sonra localStorage
  const loadMakineData = async (tesvikId) => {
    if (!tesvikId) return;
    try {
      // 1) Önce backend'den veri çek
      const data = await yeniTesvikService.get(tesvikId);
      
      // Notları da yükle
      if (data?.notlar?.dahiliNotlar) {
        setMakineNotlari(data.notlar.dahiliNotlar);
      } else {
        setMakineNotlari('');
      }
      
      const backendYerli = data?.makineListeleri?.yerli || [];
      const backendIthal = data?.makineListeleri?.ithal || [];
      
      // 2) Backend'de veri varsa onu kullan
      if (backendYerli.length > 0 || backendIthal.length > 0) {
        // Backend verisini UI formatına çevir
        const yerli = backendYerli.map(r => ({
          id: r.rowId || Math.random().toString(36).slice(2),
          siraNo: r.siraNo || 0,
          makineId: r.makineId || '',
          rowId: r.rowId || '',
          gtipKodu: r.gtipKodu || '',
          gtipAciklama: r.gtipAciklamasi || '',
          adi: r.adiVeOzelligi || '',
          miktar: r.miktar || 0,
          birim: r.birim || '',
          birimAciklamasi: r.birimAciklamasi || '',
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
          etuysSecili: !!r.etuysSecili,
          talep: r.talep,
          karar: r.karar,
          dosyalar: r.dosyalar || []
        }));
        const ithal = backendIthal.map(r => ({
          id: r.rowId || Math.random().toString(36).slice(2),
          siraNo: r.siraNo || 0,
          makineId: r.makineId || '',
          rowId: r.rowId || '',
          gtipKodu: r.gtipKodu || '',
          gtipAciklama: r.gtipAciklamasi || '',
          adi: r.adiVeOzelligi || '',
          miktar: r.miktar || 0,
          birim: r.birim || '',
          birimAciklamasi: r.birimAciklamasi || '',
          birimFiyatiFob: r.birimFiyatiFob || 0,
          doviz: r.gumrukDovizKodu || '',
          toplamUsd: r.toplamTutarFobUsd || 0,
          toplamTl: r.toplamTutarFobTl || 0,
          tlManuel: r.tlManuel || false,
          kurManuel: r.kurManuel || false,
          kurManuelDeger: r.kurManuelDeger || 0,
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
          etuysSecili: !!r.etuysSecili,
          talep: r.talep,
          karar: r.karar,
          dosyalar: r.dosyalar || []
        }));
        setYerliRows(yerli);
        setIthalRows(ithal);
        // localStorage'ı da güncelle
        saveLS(`mk_${tesvikId}_yerli`, yerli);
        saveLS(`mk_${tesvikId}_ithal`, ithal);
        return;
      }
      
      // 3) Backend boşsa localStorage'dan yükle
      const localYerli = loadLS(`mk_${tesvikId}_yerli`, []);
      const localIthal = loadLS(`mk_${tesvikId}_ithal`, []);
      setYerliRows(localYerli);
      setIthalRows(localIthal);
    } catch (error) {
      console.error('Makine verileri yüklenirken hata:', error);
      // Hata durumunda localStorage'dan yükle
      const yerli = loadLS(`mk_${tesvikId}_yerli`, []);
      const ithal = loadLS(`mk_${tesvikId}_ithal`, []);
      setYerliRows(yerli);
      setIthalRows(ithal);
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
  // Manuel kur dialog state'leri
  const [manuelKurDialogOpen, setManuelKurDialogOpen] = useState(false);
  const [manuelKurEditingRow, setManuelKurEditingRow] = useState(null);
  // ⚙️ İşlem günlükleri (talep/karar/silme)
  const [activityLog, setActivityLog] = useState([]); // { type:'talep'|'karar'|'sil', list:'yerli'|'ithal', row, payload, date }
  // 🛎️ Bildirimler
  const [toast, setToast] = useState({ open:false, severity:'info', message:'' });
  const openToast = (severity, message) => setToast({ open:true, severity, message });
  const closeToast = () => setToast(t => ({ ...t, open:false }));
  
  // 🚀 ENTERPRISE: Auto-save ve sync state'leri
  const [isSaving, setIsSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState(null);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [syncStatus, setSyncStatus] = useState('idle'); // 'idle' | 'syncing' | 'synced' | 'error'
  const autoSaveTimeoutRef = useRef(null);
  
  // 🚀 ENTERPRISE: Batch işlemleri için state
  const [batchEditOpen, setBatchEditOpen] = useState(false);
  const [batchEditField, setBatchEditField] = useState('');
  const [batchEditValue, setBatchEditValue] = useState('');
  const [quickStatsOpen, setQuickStatsOpen] = useState(false);
  
  // 🚀 ENTERPRISE: Auto-save to DB (3 saniye debounce)
  // 🔧 FIX: Sadece revize modunda değil, her zaman veritabanına kaydet
  // Böylece makineId ve diğer alanlar sayfa yenilendiğinde kaybolmaz
  const autoSaveToDb = useCallback(async () => {
    if (!selectedTesvik?._id) return;
    
    setIsSaving(true);
    setSyncStatus('syncing');
    
    try {
      const payload = {
        yerli: yerliRows.map(r=>({ siraNo:r.siraNo, makineId:r.makineId, rowId:r.rowId, gtipKodu:r.gtipKodu, gtipAciklamasi:r.gtipAciklama, adiVeOzelligi:r.adi, miktar:r.miktar, birim:r.birim, birimAciklamasi:r.birimAciklamasi, birimFiyatiTl:r.birimFiyatiTl, toplamTutariTl:r.toplamTl, kdvIstisnasi:r.kdvIstisnasi, makineTechizatTipi:r.makineTechizatTipi, finansalKiralamaMi:r.finansalKiralamaMi, finansalKiralamaAdet:r.finansalKiralamaAdet, finansalKiralamaSirket:r.finansalKiralamaSirket, gerceklesenAdet:r.gerceklesenAdet, gerceklesenTutar:r.gerceklesenTutar, iadeDevirSatisVarMi:r.iadeDevirSatisVarMi, iadeDevirSatisAdet:r.iadeDevirSatisAdet, iadeDevirSatisTutar:r.iadeDevirSatisTutar, silinmeTarihi:r.silinmeTarihi, etuysSecili: !!r.etuysSecili, talep:r.talep, karar:r.karar })),
        ithal: ithalRows.map(r=>({ siraNo:r.siraNo, makineId:r.makineId, rowId:r.rowId, gtipKodu:r.gtipKodu, gtipAciklamasi:r.gtipAciklama, adiVeOzelligi:r.adi, miktar:r.miktar, birim:r.birim, birimAciklamasi:r.birimAciklamasi, birimFiyatiFob:r.birimFiyatiFob, gumrukDovizKodu:r.doviz, toplamTutarFobUsd:r.toplamUsd, toplamTutarFobTl:r.toplamTl, kurManuel:r.kurManuel, kurManuelDeger:r.kurManuelDeger, kullanilmisMakine:r.kullanilmisKod, kullanilmisMakineAciklama:r.kullanilmisAciklama, ckdSkdMi:r.ckdSkd, aracMi:r.aracMi, makineTechizatTipi:r.makineTechizatTipi, kdvMuafiyeti:r.kdvMuafiyeti, gumrukVergisiMuafiyeti:r.gumrukVergisiMuafiyeti, finansalKiralamaMi:r.finansalKiralamaMi, finansalKiralamaAdet:r.finansalKiralamaAdet, finansalKiralamaSirket:r.finansalKiralamaSirket, gerceklesenAdet:r.gerceklesenAdet, gerceklesenTutar:r.gerceklesenTutar, iadeDevirSatisVarMi:r.iadeDevirSatisVarMi, iadeDevirSatisAdet:r.iadeDevirSatisAdet, iadeDevirSatisTutar:r.iadeDevirSatisTutar, silinmeTarihi:r.silinmeTarihi, etuysSecili: !!r.etuysSecili, talep:r.talep, karar:r.karar }))
      };
      await yeniTesvikService.saveMakineListeleri(selectedTesvik._id, payload);
      setLastSaved(new Date());
      setHasUnsavedChanges(false);
      setSyncStatus('synced');
      // 2 saniye sonra idle'a dön
      setTimeout(() => setSyncStatus('idle'), 2000);
    } catch (error) {
      console.error('Auto-save error:', error);
      setSyncStatus('error');
      openToast('error', 'Otomatik kayıt başarısız');
    } finally {
      setIsSaving(false);
    }
  }, [selectedTesvik, yerliRows, ithalRows, isReviseStarted]);
  
  // 🚀 ENTERPRISE: Değişiklik takibi (auto-save devre dışı - sadece manuel kaydet)
  useEffect(() => {
    if (!selectedTesvik?._id || !isReviseStarted) return;
    setHasUnsavedChanges(true);
  }, [yerliRows, ithalRows, selectedTesvik, isReviseStarted]);
  
  // 🚀 ENTERPRISE: Batch edit uygula
  const applyBatchEdit = useCallback(() => {
    if (!batchEditField || selectionModel.length === 0) return;
    
    const updateFn = (rows) => rows.map(r => {
      if (!selectionModel.includes(r.id)) return r;
      return { ...r, [batchEditField]: batchEditValue };
    });
    
    if (tab === 'yerli') {
      setYerliRows(updateFn);
    } else {
      setIthalRows(updateFn);
    }
    
    setBatchEditOpen(false);
    setBatchEditField('');
    setBatchEditValue('');
    openToast('success', `${selectionModel.length} satır güncellendi`);
  }, [batchEditField, batchEditValue, selectionModel, tab]);
  
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
      await yeniTesvikService.updateMakineRevizyonMeta(selectedTesvik._id, active.revizeId, meta);
      const list = await yeniTesvikService.listMakineRevizyonlari(selectedTesvik._id); setRevList(list.reverse());
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
        const res = await api.get('/yeni-tesvik', { params: { limit: 20 } });
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
        const list = await yeniTesvikService.listMakineRevizyonlari(selectedTesvik._id);
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
      // NOT: Makine verileri loadTesvikMakineListeleri fonksiyonuyla veritabanından yükleniyor
      // localStorage sadece önbellek olarak kullanılıyor, veritabanı öncelikli
      setIsReviseMode(false);
      setIsReviseStarted(false);
    })();
  }, [selectedTesvik]);
  // 🔧 Debounced localStorage save - scroll pozisyonunu korumak için
  const saveTimeoutYerliRef = useRef(null);
  const saveTimeoutIthalRef = useRef(null);
  
  useEffect(() => { 
    if (!selectedTesvik?._id) return;
    // Önceki timeout'u temizle
    if (saveTimeoutYerliRef.current) clearTimeout(saveTimeoutYerliRef.current);
    // 1.5 saniye gecikme ile kaydet (scroll pozisyonunu korur)
    saveTimeoutYerliRef.current = setTimeout(() => {
      saveLS(`mk_${selectedTesvik._id}_yerli`, yerliRows);
    }, 1500);
    return () => { if (saveTimeoutYerliRef.current) clearTimeout(saveTimeoutYerliRef.current); };
  }, [yerliRows, selectedTesvik]);
  
  useEffect(() => { 
    if (!selectedTesvik?._id) return;
    if (saveTimeoutIthalRef.current) clearTimeout(saveTimeoutIthalRef.current);
    saveTimeoutIthalRef.current = setTimeout(() => {
      saveLS(`mk_${selectedTesvik._id}_ithal`, ithalRows);
    }, 1500);
    return () => { if (saveTimeoutIthalRef.current) clearTimeout(saveTimeoutIthalRef.current); };
  }, [ithalRows, selectedTesvik]);

  // 🚨 Sayfa kapatılırken/yenilenirken verileri anında kaydet (veri kaybını önle)
  useEffect(() => {
    const handleBeforeUnload = () => {
      if (selectedTesvik?._id) {
        // Debounce timeout'larını iptal et ve anında kaydet
        if (saveTimeoutYerliRef.current) clearTimeout(saveTimeoutYerliRef.current);
        if (saveTimeoutIthalRef.current) clearTimeout(saveTimeoutIthalRef.current);
        saveLS(`mk_${selectedTesvik._id}_yerli`, yerliRows);
        saveLS(`mk_${selectedTesvik._id}_ithal`, ithalRows);
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [selectedTesvik, yerliRows, ithalRows]);

  // Otomatik TL hesaplama (kurla) - kullanıcı TL'yi manuel değiştirmediyse
  useEffect(() => {
    (async () => {
      if (!Array.isArray(ithalRows) || ithalRows.length === 0) return;
      let changed = false;
      const nextRows = await Promise.all(ithalRows.map(async (r) => {
        try {
          if (r.tlManuel || (r.kurManuel && Number(parseTrCurrency(r.kurManuelDeger))>0)) return r; // manuel TL/kur modda dokunma
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

  // 🚀 ENTERPRISE: Enhanced Keyboard shortcuts
  useEffect(()=>{
    const handler = (e)=>{
      // ? veya Shift+/ - Yardım
      if (e.key==='?' || (e.shiftKey && e.key==='/')) { e.preventDefault(); setHelpOpen(true); }
      
      // Ctrl+Enter - Yeni satır ekle
      if ((e.ctrlKey||e.metaKey) && e.key==='Enter') { e.preventDefault(); if(isReviseStarted) addRow(); else openToast('warning', 'Satır eklemek için önce revize talebi başlatmanız gerekmektedir.'); }
      
      // Ctrl+S - Manuel kaydet
      if ((e.ctrlKey||e.metaKey) && e.key.toLowerCase()==='s') { 
        e.preventDefault(); 
        if (isReviseStarted && hasUnsavedChanges) {
          autoSaveToDb();
          openToast('info', 'Kaydediliyor...');
        } else if (!isReviseStarted) {
          openToast('warning', 'Kaydetmek için önce revize başlatın');
        }
      }
      
      // Ctrl+B - Toplu düzenleme (seçim varsa)
      if ((e.ctrlKey||e.metaKey) && e.key.toLowerCase()==='b' && selectionModel.length > 0 && isReviseStarted) { 
        e.preventDefault(); 
        setBatchEditOpen(true); 
      }
      
      // Ctrl+I - İstatistikleri göster
      if ((e.ctrlKey||e.metaKey) && e.key.toLowerCase()==='i') { 
        e.preventDefault(); 
        setQuickStatsOpen(true); 
      }
      
      // Tab değiştirme: Ctrl+1 (Yerli), Ctrl+2 (İthal)
      if ((e.ctrlKey||e.metaKey) && e.key==='1') { e.preventDefault(); setTab('yerli'); }
      if ((e.ctrlKey||e.metaKey) && e.key==='2') { e.preventDefault(); setTab('ithal'); }
      
      // Ctrl+A - Tümünü seç (aktif tabda)
      if ((e.ctrlKey||e.metaKey) && e.key.toLowerCase()==='a' && document.activeElement?.tagName !== 'INPUT') { 
        e.preventDefault(); 
        const list = tab === 'yerli' ? yerliRows : ithalRows;
        setSelectionModel(list.map(r => r.id));
      }
      
      // Escape - Seçimi temizle
      if (e.key === 'Escape' && selectionModel.length > 0) { 
        e.preventDefault(); 
        setSelectionModel([]); 
      }
      
      // Kopyala/Yapıştır
      if ((e.ctrlKey||e.metaKey) && e.key.toLowerCase()==='c' && selectionModel.length===1 && document.activeElement?.tagName !== 'INPUT') { e.preventDefault(); const id=selectionModel[0]; const list=tab==='yerli'?yerliRows:ithalRows; const row=list.find(r=>r.id===id); if(row) { setRowClipboard(row); openToast('info', 'Satır kopyalandı'); } }
      if ((e.ctrlKey||e.metaKey) && e.key.toLowerCase()==='v' && selectionModel.length===1 && rowClipboard && document.activeElement?.tagName !== 'INPUT') { e.preventDefault(); const id=selectionModel[0]; if(tab==='yerli') setYerliRows(rows=>{const idx=rows.findIndex(r=>r.id===id); const ins={...rowClipboard,id:Math.random().toString(36).slice(2)}; return [...rows.slice(0,idx+1),ins,...rows.slice(idx+1)];}); else setIthalRows(rows=>{const idx=rows.findIndex(r=>r.id===id); const ins={...rowClipboard,id:Math.random().toString(36).slice(2)}; return [...rows.slice(0,idx+1),ins,...rows.slice(idx+1)];}); openToast('success', 'Satır yapıştırıldı'); }
      
      // Delete - Seçili satırları sil
      if (e.key==='Delete' && selectionModel.length>0 && document.activeElement?.tagName !== 'INPUT') { e.preventDefault(); selectionModel.forEach(id=> delRow(id)); setSelectionModel([]); }
    };
    window.addEventListener('keydown', handler);
    return ()=> window.removeEventListener('keydown', handler);
  }, [selectionModel, tab, yerliRows, ithalRows, rowClipboard, isReviseStarted, hasUnsavedChanges, autoSaveToDb]);

  // 🔧 SCROLL POZİSYONU KORUMA - YENİ YAKLAŞIM
  // DataGrid container ref'leri
  const yerliGridRef = useRef(null);
  const ithalGridRef = useRef(null);
  // Scroll pozisyonlarını sakla
  const scrollPositionRef = useRef({ yerli: { top: 0, left: 0 }, ithal: { top: 0, left: 0 } });
  // Render sayacı - scroll restore tetiklemek için
  const renderCountRef = useRef(0);
  // Restore işlemi sırasında scroll event'lerini yoksay
  const isRestoringRef = useRef(false);

  // Scroll event listener - pozisyon takibi (sürekli)
  useEffect(() => {
    const setupScrollListener = (gridRef, type) => {
      const scroller = gridRef.current?.querySelector('.MuiDataGrid-virtualScroller');
      if (!scroller) return null;
      
      const handleScroll = () => {
        // Restore sırasında kaydetme
        if (!isRestoringRef.current) {
          scrollPositionRef.current[type] = { 
            top: scroller.scrollTop, 
            left: scroller.scrollLeft 
          };
        }
      };
      
      scroller.addEventListener('scroll', handleScroll, { passive: true });
      return () => scroller.removeEventListener('scroll', handleScroll);
    };
    
    // DOM hazır olduğunda listener'ları kur
    const timer = setTimeout(() => {
      const cleanupYerli = setupScrollListener(yerliGridRef, 'yerli');
      const cleanupIthal = setupScrollListener(ithalGridRef, 'ithal');
      return () => {
        cleanupYerli?.();
        cleanupIthal?.();
      };
    }, 50);
    
    return () => clearTimeout(timer);
  }, [selectedTesvik?._id]);

  // 🔧 KRİTİK: useLayoutEffect ile her render sonrası scroll pozisyonunu geri yükle
  // Bu, DOM güncellemesinden SONRA ama paint'ten ÖNCE çalışır
  useLayoutEffect(() => {
    renderCountRef.current += 1;
    
    const gridRef = tab === 'yerli' ? yerliGridRef : ithalGridRef;
    const savedPosition = scrollPositionRef.current[tab];
    const scroller = gridRef.current?.querySelector('.MuiDataGrid-virtualScroller');
    
    if (scroller && (savedPosition.top > 0 || savedPosition.left > 0)) {
      isRestoringRef.current = true;
      
      // Hemen restore et
      scroller.scrollTop = savedPosition.top;
      scroller.scrollLeft = savedPosition.left;
      
      // Kısa bir süre sonra restore flag'ini kaldır
      requestAnimationFrame(() => {
        scroller.scrollTop = savedPosition.top;
        scroller.scrollLeft = savedPosition.left;
        setTimeout(() => {
          isRestoringRef.current = false;
        }, 50);
      });
    }
  }, [yerliRows, ithalRows, tab]);

  // Eski fonksiyon uyumluluk için (artık kullanılmıyor)
  const saveScrollPosition = useCallback(() => {}, []);
  const restoreScrollPosition = useCallback(() => {}, []);

  // 🔧 OPTIMIZED: updateYerli ve updateIthal - functional update pattern
  const updateYerli = useCallback((id, patch) => {
    setYerliRows(rows => rows.map(r => r.id === id ? calcYerli({ ...r, ...patch }) : r));
  }, []);

  const updateIthal = useCallback((id, patch) => {
    setIthalRows(rows => rows.map(r => r.id === id ? calcIthal({ ...r, ...patch }) : r));
  }, []);

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
        const raw = (newRow.toplamTl ?? newRow.__manualTLInput ?? '').toString();
        const parsed = parseTrCurrency(raw);
        const updatedRow = { ...newRow, tlManuel: true, toplamTl: parsed, __manualTLInput: raw };
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
        
        // Manuel kur varsa önce onu kullan
        if (newRow.kurManuel && Number(newRow.kurManuelDeger) > 0) {
          updatedRow.toplamTl = Math.round(usd * Number(newRow.kurManuelDeger));
          console.log(`📊 Manuel Kur: ${usd} × ${newRow.kurManuelDeger} = ${updatedRow.toplamTl} TL`);
        }
        // TRY ise direkt TL = USD
        else if ((newRow.doviz || '').toUpperCase() === 'TRY') {
          updatedRow.toplamTl = usd;
          console.log(`🇹🇷 TRY: TL = ${usd}`);
        } 
        // Başka döviz ise otomatik kur ile çevir
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
        // Döviz değiştiğinde manuel kur bilgisini temizle
        const updatedRow = { ...newRow, kurManuel: false, kurManuelDeger: 0 };
        
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
            // Eğer kullanıcı daha önce TL'yi string olarak girdi ise aynen gösterilecek formatı koru
            if (updatedRow.__manualTLInput) {
              updatedRow.toplamTl = parseTrCurrency(updatedRow.__manualTLInput);
            } else {
              updatedRow.toplamTl = Math.round(tlRaw);
            }
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
    // Kur manuel girilmişse TL'yi o kurdan hesapla ve tlManuel'i de güvenceye al
    if (r.kurManuel && Number.isFinite(Number(r.kurManuelDeger)) && Number(r.kurManuelDeger) > 0) {
      const tl = Math.round(usd * Number(r.kurManuelDeger));
      return { ...r, toplamUsd: usd, toplamTl: tl, tlManuel: true };
    }
    // TL manuel ise değeri koru; değilse mevcut kur mantığı devreye girecek (useEffect/processRowUpdate)
    return { ...r, toplamUsd: usd, toplamTl: r.tlManuel ? (r.toplamTl ?? 0) : (r.toplamTl ?? 0) };
  };

  const addRow = () => {
    if (!isReviseStarted) {
      openToast('warning', 'Satır eklemek için önce revize talebi başlatmanız gerekmektedir.');
      return;
    }
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
      yerli: yerliRows.map(r=>({ siraNo:r.siraNo, makineId:r.makineId, rowId:r.rowId, gtipKodu:r.gtipKodu, gtipAciklamasi:r.gtipAciklama, adiVeOzelligi:r.adi, miktar:r.miktar, birim:r.birim, birimAciklamasi:r.birimAciklamasi, birimFiyatiTl:r.birimFiyatiTl, toplamTutariTl:r.toplamTl, kdvIstisnasi:r.kdvIstisnasi, makineTechizatTipi:r.makineTechizatTipi, finansalKiralamaMi:r.finansalKiralamaMi, finansalKiralamaAdet:r.finansalKiralamaAdet, finansalKiralamaSirket:r.finansalKiralamaSirket, gerceklesenAdet:r.gerceklesenAdet, gerceklesenTutar:r.gerceklesenTutar, iadeDevirSatisVarMi:r.iadeDevirSatisVarMi, iadeDevirSatisAdet:r.iadeDevirSatisAdet, iadeDevirSatisTutar:r.iadeDevirSatisTutar, silinmeTarihi:r.silinmeTarihi, etuysSecili: !!r.etuysSecili, talep:r.talep, karar:r.karar })),
      ithal: ithalRows.map(r=>({ siraNo:r.siraNo, makineId:r.makineId, rowId:r.rowId, gtipKodu:r.gtipKodu, gtipAciklamasi:r.gtipAciklama, adiVeOzelligi:r.adi, miktar:r.miktar, birim:r.birim, birimAciklamasi:r.birimAciklamasi, birimFiyatiFob:r.birimFiyatiFob, gumrukDovizKodu:r.doviz, toplamTutarFobUsd:r.toplamUsd, toplamTutarFobTl:r.toplamTl, kurManuel:r.kurManuel, kurManuelDeger:r.kurManuelDeger, kullanilmisMakine:r.kullanilmisKod, kullanilmisMakineAciklama:r.kullanilmisAciklama, ckdSkdMi:r.ckdSkd, aracMi:r.aracMi, makineTechizatTipi:r.makineTechizatTipi, kdvMuafiyeti:r.kdvMuafiyeti, gumrukVergisiMuafiyeti:r.gumrukVergisiMuafiyeti, finansalKiralamaMi:r.finansalKiralamaMi, finansalKiralamaAdet:r.finansalKiralamaAdet, finansalKiralamaSirket:r.finansalKiralamaSirket, gerceklesenAdet:r.gerceklesenAdet, gerceklesenTutar:r.gerceklesenTutar, iadeDevirSatisVarMi:r.iadeDevirSatisVarMi, iadeDevirSatisAdet:r.iadeDevirSatisAdet, iadeDevirSatisTutar:r.iadeDevirSatisTutar, silinmeTarihi:r.silinmeTarihi, etuysSecili: !!r.etuysSecili, talep:r.talep, karar:r.karar }))
    };
    try { await yeniTesvikService.saveMakineListeleri(selectedTesvik._id, payload); } catch {}
    // 2) DB'den güncel listeyi çek ve ilgili satırı yakala
    const data = await yeniTesvikService.get(selectedTesvik._id);
    const list = (liste==='yerli' ? (data?.makineListeleri?.yerli||[]) : (data?.makineListeleri?.ithal||[]));
    // Önce sıra numarası ile bul, bulamazsa diğer alanlara bak
    let found = list.find(x => x.siraNo === row.siraNo);
    if (!found) {
      // Sıra numarası ile bulunamadıysa, diğer alanlarla dene
      const key = (x)=> `${x.gtipKodu||''}|${x.adiVeOzelligi||''}|${Number(x.miktar)||0}|${x.birim||''}`;
      const targetKey = `${row.gtipKodu||''}|${row.adi||row.adiVeOzelligi||''}|${Number(row.miktar)||0}|${row.birim||''}`;
      found = list.find(x => key(x) === targetKey);
    }
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

    // 🔧 Yaygın birim kodları için açıklama mapping'i
    const birimKodlari = {
      '142': 'ADET',
      '166': 'KİLOGRAM',
      '112': 'LİTRE',
      '138': 'METRE',
      '111': 'MİLİMETRE',
      '144': 'ÇİFT',
      '143': 'DÜZÜNE',
      '145': 'YÜZ',
      '146': 'BİN',
      '139': 'METREKARE',
      '140': 'METREKÜp',
      '151': 'TON',
      '999': 'DİĞER'
    };
    
    // 🔧 FIX: Birim açıklamasını al - Önce kod mapping'i kontrol et, sonra temiz açıklama
    const getBirimAciklama = (kod, aciklama) => {
      // Önce kod mapping'inden bak (daha temiz sonuç için)
      if (kod && birimKodlari[kod]) return birimKodlari[kod];
      // Açıklama varsa parantez içindeki kısmı temizle (ADET(UNIT) -> ADET)
      if (aciklama && aciklama.trim()) {
        return aciklama.replace(/\s*\([^)]*\)\s*/g, '').trim() || aciklama;
      }
      return kod || '';
    };

    // Yardımcı: kolon index → harf
    const colLetter = (n) => {
      let s = ''; let x = n;
      while (x > 0) { const m = (x - 1) % 26; s = String.fromCharCode(65 + m) + s; x = Math.floor((x - 1) / 26); }
      return s;
    };

    // Yardımcı: sayfayı profesyonel hale getir - 🔧 GELİŞTİRİLMİŞ OKUNURLURLUK
    const finalizeSheet = (ws, numRows) => {
      // Başlık satırı - Daha belirgin
      const header = ws.getRow(1);
      header.font = { bold: true, size: 11, color: { argb: 'FFFFFFFF' } };
      header.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
      header.height = 28;
      header.eachCell((cell) => {
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E3A5F' } }; // Koyu mavi başlık
        cell.border = { 
          top: { style: 'medium', color: { argb: 'FF0D47A1' } }, 
          left: { style: 'thin', color: { argb: 'FF0D47A1' } }, 
          bottom: { style: 'medium', color: { argb: 'FF0D47A1' } }, 
          right: { style: 'thin', color: { argb: 'FF0D47A1' } } 
        };
      });
      // Satır stilleri - Daha iyi okunurluk
      ws.eachRow((row, rowNumber) => {
        if (rowNumber > 1) {
          row.alignment = { vertical: 'middle', wrapText: false };
          row.font = { size: 10 };
          row.height = 18;
          // Tüm hücrelere kenarlık ekle
          row.eachCell((cell) => {
            cell.border = cell.border || { 
              top: { style: 'thin', color: { argb: 'FFD0D0D0' } }, 
              left: { style: 'thin', color: { argb: 'FFD0D0D0' } }, 
              bottom: { style: 'thin', color: { argb: 'FFD0D0D0' } }, 
              right: { style: 'thin', color: { argb: 'FFD0D0D0' } } 
            };
          });
        }
      });
      // Dondur ve filtre ekle
      ws.views = [{ state: 'frozen', ySplit: 1 }];
      const lastCol = colLetter(ws.columnCount);
      ws.autoFilter = `A1:${lastCol}1`;
      // Baskı ve kenar boşlukları
      ws.pageSetup = { fitToPage: true, orientation: 'landscape', margins: { left: 0.4, right: 0.4, top: 0.5, bottom: 0.5 } };
      // 🔧 GELİŞTİRİLMİŞ Zebra şerit (okunabilirlik) - Daha belirgin renk farkı
      for (let r = 2; r <= numRows; r++) {
        const row = ws.getRow(r);
        const bgColor = r % 2 === 0 ? 'FFF8F9FA' : 'FFFFFFFF'; // Açık gri / Beyaz
        row.eachCell((cell) => {
          // Sadece daha önce özel renk atanmamış hücreleri renklendir
          if (!cell.fill || cell.fill.fgColor?.argb === 'FFFFFFFF' || !cell.fill.fgColor) {
            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: bgColor } };
          }
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

    // 🔧 GELİŞTİRİLMİŞ Alan setleri - Daha geniş sütunlar, daha iyi okunurluk
    const yerliColumns = [
      { header: 'Sıra No', key: 'siraNo', width: 10 },
      { header: 'Makine ID', key: 'makineId', width: 14 },
      { header: 'GTIP No', key: 'gtipKodu', width: 16 },
      { header: 'GTIP Açıklama', key: 'gtipAciklama', width: 40 },
      { header: 'Adı ve Özelliği', key: 'adi', width: 45 },
      { header: 'Miktarı', key: 'miktar', width: 12, numFmt: '#,##0' },
      { header: 'Birimi', key: 'birim', width: 10 },
      { header: 'Birim Açıklaması', key: 'birimAciklamasi', width: 18 },
      { header: 'Birim Fiyatı (TL)', key: 'birimFiyatiTl', width: 22, numFmt: '#,##0.00' },
      { header: 'Toplam Tutar (TL)', key: 'toplamTl', width: 22, numFmt: '#,##0.00' },
      { header: 'Makine Tipi', key: 'makineTechizatTipi', width: 16 },
      { header: 'KDV Muafiyeti', key: 'kdvIstisnasi', width: 14 },
      { header: 'Finansal Kir.', key: 'finansalKiralamaMi', width: 14 },
      { header: 'F.K. Adet', key: 'finansalKiralamaAdet', width: 12, numFmt: '#,##0' },
      { header: 'F.K. Şirket', key: 'finansalKiralamaSirket', width: 20 },
      { header: 'Gerç. Adet', key: 'gerceklesenAdet', width: 12, numFmt: '#,##0' },
      { header: 'Gerç. Tutar', key: 'gerceklesenTutar', width: 16, numFmt: '#,##0' },
      { header: 'İade/Devir/Satış', key: 'iadeDevirSatisVarMi', width: 16 },
      { header: 'İ/D/S Adet', key: 'iadeDevirSatisAdet', width: 12, numFmt: '#,##0' },
      { header: 'İ/D/S Tutar', key: 'iadeDevirSatisTutar', width: 16, numFmt: '#,##0' },
      { header: 'Durum', key: 'durum', width: 12 },
      { header: 'Silinme Tar.', key: 'silinmeTarihi', width: 14 },
      { header: 'Müracaat Tar.', key: 'muracaatTarihi', width: 14 },
      { header: 'Onay Tarihi', key: 'onayTarihi', width: 14 },
      { header: 'Talep Ad.', key: 'talepAdedi', width: 12, numFmt: '#,##0' },
      { header: 'Karar Kodu', key: 'kararKodu', width: 12 },
      { header: 'Karar Durumu', key: 'kararDurumu', width: 14 },
      { header: 'Onay. Adet', key: 'onaylananAdet', width: 12, numFmt: '#,##0' },
      { header: 'Değişiklik', key: 'degisiklikDurumu', width: 14 }
    ];

    const ithalColumns = [
      { header: 'Sıra No', key: 'siraNo', width: 10 },
      { header: 'Makine ID', key: 'makineId', width: 14 },
      { header: 'GTIP No', key: 'gtipKodu', width: 16 },
      { header: 'GTIP Açıklama', key: 'gtipAciklama', width: 40 },
      { header: 'Adı ve Özelliği', key: 'adi', width: 45 },
      { header: 'Miktarı', key: 'miktar', width: 12, numFmt: '#,##0' },
      { header: 'Birimi', key: 'birim', width: 10 },
      { header: 'Birim Açıklaması', key: 'birimAciklamasi', width: 18 },
      { header: 'Birim Fiyatı (FOB)', key: 'birimFiyatiFob', width: 22, numFmt: '#,##0.00' },
      { header: 'Döviz', key: 'doviz', width: 10 },
      { header: 'Manuel Kur', key: 'kurManuel', width: 12 },
      { header: 'Man. Kur Değ.', key: 'kurManuelDeger', width: 14, numFmt: '#,##0.0000' },
      { header: 'Uyg. Kur', key: 'uygulanankur', width: 14, numFmt: '#,##0.0000' },
      { header: 'Toplam ($)', key: 'toplamUsd', width: 18, numFmt: '#,##0.00' },
      { header: 'Toplam (TL)', key: 'toplamTl', width: 20, numFmt: '#,##0.00' },
      { header: 'Kullanılmış', key: 'kullanilmisKod', width: 12 },
      { header: 'Makine Tipi', key: 'makineTechizatTipi', width: 16 },
      { header: 'KDV Muaf.', key: 'kdvMuafiyeti', width: 12 },
      { header: 'G.V. Muaf.', key: 'gumrukVergisiMuafiyeti', width: 12 },
      { header: 'Finansal Kir.', key: 'finansalKiralamaMi', width: 14 },
      { header: 'F.K. Adet', key: 'finansalKiralamaAdet', width: 12, numFmt: '#,##0' },
      { header: 'F.K. Şirket', key: 'finansalKiralamaSirket', width: 20 },
      { header: 'Gerç. Adet', key: 'gerceklesenAdet', width: 12, numFmt: '#,##0' },
      { header: 'Gerç. Tutar', key: 'gerceklesenTutar', width: 16, numFmt: '#,##0' },
      { header: 'İade/Devir/Satış', key: 'iadeDevirSatisVarMi', width: 16 },
      { header: 'İ/D/S Adet', key: 'iadeDevirSatisAdet', width: 12, numFmt: '#,##0' },
      { header: 'İ/D/S Tutar', key: 'iadeDevirSatisTutar', width: 16, numFmt: '#,##0' },
      { header: 'Durum', key: 'durum', width: 12 },
      { header: 'Silinme Tar.', key: 'silinmeTarihi', width: 14 },
      { header: 'Müracaat Tar.', key: 'muracaatTarihi', width: 14 },
      { header: 'Onay Tarihi', key: 'onayTarihi', width: 14 },
      { header: 'Talep Ad.', key: 'talepAdedi', width: 12, numFmt: '#,##0' },
      { header: 'Karar Kodu', key: 'kararKodu', width: 12 },
      { header: 'Karar Durumu', key: 'kararDurumu', width: 14 },
      { header: 'Onay. Adet', key: 'onaylananAdet', width: 12, numFmt: '#,##0' },
      { header: 'Değişiklik', key: 'degisiklikDurumu', width: 14 }
    ];

    // Karar kodu helper - Enterprise Excel Export
    const getKararKodu = (karar) => karar?.kararDurumu === 'onay' ? 1 : karar?.kararDurumu === 'kismi_onay' ? 2 : karar?.kararDurumu === 'red' ? 3 : '';
    // Karar durumu adı + kod parantez içinde: "ONAY (1)", "KISMİ (2)", "RED (3)", "beklemede"
    const getKararAdi = (karar) => {
      if (karar?.kararDurumu === 'onay') return 'ONAY (1)';
      if (karar?.kararDurumu === 'kismi_onay') return 'KISMİ (2)';
      if (karar?.kararDurumu === 'red') return 'RED (3)';
      return 'beklemede';
    };
    // Renk kodları: 1=Yeşil, 2=Sarı, 3=Kırmızı
    const kararRenkler = { 1: 'FF22C55E', 2: 'FFEAB308', 3: 'FFEF4444' };
    const kararBgRenkler = { 1: 'FFDCFCE7', 2: 'FFFEF9C3', 3: 'FFFEE2E2' };
    // Beklemede renk
    const beklemedeBgRenk = 'FFF3F4F6';
    const beklemedeFontRenk = 'FF6B7280';

    // Yerli sayfası
    const wsYerli = wb.addWorksheet('Yerli');
    wsYerli.columns = yerliColumns;
    const yerliKararKoduCol = yerliColumns.findIndex(c => c.key === 'kararKodu') + 1;
    const yerliKararDurumuCol = yerliColumns.findIndex(c => c.key === 'kararDurumu') + 1;
    
    yerliRows.forEach((r) => {
      // Karar kodunu hesapla
      const kararKodu = getKararKodu(r.karar);
      const kararAdi = getKararAdi(r.karar);
      
      // Silinme durumunu belirle
      const isSilindi = !!r.silinmeTarihi;
      const durumText = isSilindi ? 'SİLİNDİ' : 'AKTİF';
      const silinmeTarihiText = r.silinmeTarihi ? new Date(r.silinmeTarihi).toLocaleDateString('tr-TR') : '';
      
      // 🔧 FIX: Birim açıklamasını doğru şekilde göster
      const birimGosterim = getBirimAciklama(r.birim, r.birimAciklamasi);
      
      // Toplam TL'yi Excel içinde formülle üretelim
      const row = wsYerli.addRow({ 
        ...r, 
        makineId: r.makineId || '', // 🔧 FIX: Makine ID'yi garantile
        birim: r.birim || '', // Birim kodu
        birimAciklamasi: birimGosterim, // 🔧 FIX: Birim açıklamasını düzelt (ADET vb.)
        birimFiyatiTl: Number(r.birimFiyatiTl) || 0, // 🔧 FIX: Fiyatı sayıya çevir (string olabilir)
        toplamTl: undefined,
        durum: durumText,
        silinmeTarihi: silinmeTarihiText,
        muracaatTarihi: r?.talep?.talepTarihi ? new Date(r.talep.talepTarihi).toLocaleDateString('tr-TR') : '',
        onayTarihi: r?.karar?.kararTarihi ? new Date(r.karar.kararTarihi).toLocaleDateString('tr-TR') : '',
        talepAdedi: r?.talep?.istenenAdet || '',
        kararKodu: kararKodu,
        kararDurumu: kararAdi,
        onaylananAdet: r?.karar?.onaylananAdet || '',
        degisiklikDurumu: isSilindi ? '🗑️ SİLİNDİ' : r.degistirildi ? '✏️ DEĞİŞTİ' : ''
      });
      const miktarCol = yerliColumns.findIndex(c => c.key === 'miktar') + 1;
      const bfCol = yerliColumns.findIndex(c => c.key === 'birimFiyatiTl') + 1;
      const toplamCol = yerliColumns.findIndex(c => c.key === 'toplamTl') + 1;
      row.getCell(toplamCol).value = { formula: `${colLetter(miktarCol)}${row.number}*${colLetter(bfCol)}${row.number}` };
      
      // Karar durumuna göre renklendirme - Enterprise Level
      if (kararKodu && kararRenkler[kararKodu]) {
        // Karar kodu hücresi
        row.getCell(yerliKararKoduCol).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: kararBgRenkler[kararKodu] } };
        row.getCell(yerliKararKoduCol).font = { bold: true, color: { argb: kararRenkler[kararKodu] } };
        // Karar durumu hücresi (artık "ONAY (1)" formatında)
        row.getCell(yerliKararDurumuCol).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: kararBgRenkler[kararKodu] } };
        row.getCell(yerliKararDurumuCol).font = { bold: true, color: { argb: kararRenkler[kararKodu] } };
      } else if (!kararKodu && r.karar) {
        // Beklemede durumu
        row.getCell(yerliKararKoduCol).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: beklemedeBgRenk } };
        row.getCell(yerliKararKoduCol).font = { color: { argb: beklemedeFontRenk } };
        row.getCell(yerliKararDurumuCol).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: beklemedeBgRenk } };
        row.getCell(yerliKararDurumuCol).font = { color: { argb: beklemedeFontRenk } };
      }
      
      // Silinmiş/Değiştirilmiş satırları vurgula - Tüm satır renklendir
      const degisiklikCol = yerliColumns.findIndex(c => c.key === 'degisiklikDurumu') + 1;
      const durumCol = yerliColumns.findIndex(c => c.key === 'durum') + 1;
      const silinmeTarihiCol = yerliColumns.findIndex(c => c.key === 'silinmeTarihi') + 1;
      
      if (isSilindi) {
        // Silinen satır: Tüm satır açık kırmızı arka plan
        row.eachCell((cell) => {
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFE5E5' } };
        });
        row.getCell(degisiklikCol).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFEE2E2' } };
        row.getCell(degisiklikCol).font = { bold: true, color: { argb: 'FFDC2626' } };
        row.getCell(durumCol).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFEE2E2' } };
        row.getCell(durumCol).font = { bold: true, color: { argb: 'FFDC2626' } };
        row.getCell(silinmeTarihiCol).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFEE2E2' } };
        row.getCell(silinmeTarihiCol).font = { bold: true, color: { argb: 'FFDC2626' } };
      } else if (r.degistirildi) {
        // Değiştirilen satır: Tüm satır açık sarı arka plan
        row.eachCell((cell) => {
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFF8E1' } };
        });
        row.getCell(degisiklikCol).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFEF3C7' } };
        row.getCell(degisiklikCol).font = { bold: true, color: { argb: 'FF92400E' } };
      }
    });
    // Numara formatlarını uygula
    yerliColumns.forEach((c, idx) => { if (c.numFmt) wsYerli.getColumn(idx + 1).numFmt = c.numFmt; });
    finalizeSheet(wsYerli, wsYerli.rowCount);
    
    // 🔧 FİYAT SÜTUNLARINI VURGULA - Yerli
    const birimFiyatColY = yerliColumns.findIndex(c => c.key === 'birimFiyatiTl') + 1;
    const toplamTlColY = yerliColumns.findIndex(c => c.key === 'toplamTl') + 1;
    // Başlık hücrelerini sarı yap
    wsYerli.getCell(1, birimFiyatColY).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFEF3C7' } };
    wsYerli.getCell(1, birimFiyatColY).font = { bold: true, size: 11, color: { argb: 'FF92400E' } };
    wsYerli.getCell(1, toplamTlColY).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFEF3C7' } };
    wsYerli.getCell(1, toplamTlColY).font = { bold: true, size: 11, color: { argb: 'FF92400E' } };
    // Veri hücrelerini açık sarı yap
    for (let r = 2; r <= wsYerli.rowCount; r++) {
      const row = wsYerli.getRow(r);
      row.getCell(birimFiyatColY).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFFBEB' } };
      row.getCell(birimFiyatColY).font = { bold: true, color: { argb: 'FF78350F' } };
      row.getCell(toplamTlColY).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFFBEB' } };
      row.getCell(toplamTlColY).font = { bold: true, color: { argb: 'FF78350F' } };
    }
    
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
    const ithalKararKoduCol = ithalColumns.findIndex(c => c.key === 'kararKodu') + 1;
    const ithalKararDurumuCol = ithalColumns.findIndex(c => c.key === 'kararDurumu') + 1;
    
    ithalRows.forEach((r) => {
      // Manuel kur durumunu ve uygulanan kuru hesapla
      let uygulanankur = 0;
      if (r.kurManuel && r.kurManuelDeger > 0) {
        uygulanankur = r.kurManuelDeger;
      } else if (r.doviz && r.doviz !== 'TRY' && r.toplamUsd > 0 && r.toplamTl > 0) {
        // Otomatik kuru hesapla
        uygulanankur = r.toplamTl / r.toplamUsd;
      } else if (r.doviz === 'TRY') {
        uygulanankur = 1;
      }
      
      // Karar kodunu hesapla
      const kararKodu = getKararKodu(r.karar);
      const kararAdi = getKararAdi(r.karar);
      
      // Silinme durumunu belirle
      const isSilindi = !!r.silinmeTarihi;
      const durumText = isSilindi ? 'SİLİNDİ' : 'AKTİF';
      const silinmeTarihiText = r.silinmeTarihi ? new Date(r.silinmeTarihi).toLocaleDateString('tr-TR') : '';
      
      // 🔧 FIX: Birim açıklamasını doğru şekilde göster
      const birimGosterim = getBirimAciklama(r.birim, r.birimAciklamasi);
      
      // Satırı ekle
      const rowData = { 
        ...r, 
        makineId: r.makineId || '', // 🔧 FIX: Makine ID'yi garantile
        birim: r.birim || '', // Birim kodu
        birimAciklamasi: birimGosterim, // 🔧 FIX: Birim açıklamasını düzelt (ADET vb.)
        birimFiyatiFob: Number(r.birimFiyatiFob) || 0, // 🔧 FIX: Fiyatı sayıya çevir (string olabilir)
        kurManuel: r.kurManuel ? 'EVET' : 'HAYIR',
        uygulanankur: uygulanankur,
        durum: durumText,
        silinmeTarihi: silinmeTarihiText,
        muracaatTarihi: r?.talep?.talepTarihi ? new Date(r.talep.talepTarihi).toLocaleDateString('tr-TR') : '',
        onayTarihi: r?.karar?.kararTarihi ? new Date(r.karar.kararTarihi).toLocaleDateString('tr-TR') : '',
        talepAdedi: r?.talep?.istenenAdet || '',
        kararKodu: kararKodu,
        kararDurumu: kararAdi,
        onaylananAdet: r?.karar?.onaylananAdet || '',
        degisiklikDurumu: isSilindi ? '🗑️ SİLİNDİ' : r.degistirildi ? '✏️ DEĞİŞTİ' : ''
      };
      const row = wsIthal.addRow(rowData);
      
      // $'ı Excel formülüyle üret
      const miktarCol = ithalColumns.findIndex(c => c.key === 'miktar') + 1;
      const fobCol = ithalColumns.findIndex(c => c.key === 'birimFiyatiFob') + 1;
      const usdCol = ithalColumns.findIndex(c => c.key === 'toplamUsd') + 1;
      row.getCell(usdCol).value = { formula: `${colLetter(miktarCol)}${row.number}*${colLetter(fobCol)}${row.number}` };
      
      // Karar durumuna göre renklendirme - Enterprise Level
      if (kararKodu && kararRenkler[kararKodu]) {
        // Karar kodu hücresi
        row.getCell(ithalKararKoduCol).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: kararBgRenkler[kararKodu] } };
        row.getCell(ithalKararKoduCol).font = { bold: true, color: { argb: kararRenkler[kararKodu] } };
        // Karar durumu hücresi (artık "ONAY (1)" formatında)
        row.getCell(ithalKararDurumuCol).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: kararBgRenkler[kararKodu] } };
        row.getCell(ithalKararDurumuCol).font = { bold: true, color: { argb: kararRenkler[kararKodu] } };
      } else if (!kararKodu && r.karar) {
        // Beklemede durumu
        row.getCell(ithalKararKoduCol).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: beklemedeBgRenk } };
        row.getCell(ithalKararKoduCol).font = { color: { argb: beklemedeFontRenk } };
        row.getCell(ithalKararDurumuCol).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: beklemedeBgRenk } };
        row.getCell(ithalKararDurumuCol).font = { color: { argb: beklemedeFontRenk } };
      }
      
      // Silinmiş/Değiştirilmiş satırları vurgula - Tüm satır renklendir
      const degisiklikCol = ithalColumns.findIndex(c => c.key === 'degisiklikDurumu') + 1;
      const durumCol = ithalColumns.findIndex(c => c.key === 'durum') + 1;
      const silinmeTarihiCol = ithalColumns.findIndex(c => c.key === 'silinmeTarihi') + 1;
      
      if (isSilindi) {
        // Silinen satır: Tüm satır açık kırmızı arka plan
        row.eachCell((cell) => {
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFE5E5' } };
        });
        row.getCell(degisiklikCol).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFEE2E2' } };
        row.getCell(degisiklikCol).font = { bold: true, color: { argb: 'FFDC2626' } };
        row.getCell(durumCol).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFEE2E2' } };
        row.getCell(durumCol).font = { bold: true, color: { argb: 'FFDC2626' } };
        row.getCell(silinmeTarihiCol).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFEE2E2' } };
        row.getCell(silinmeTarihiCol).font = { bold: true, color: { argb: 'FFDC2626' } };
      } else if (r.degistirildi) {
        // Değiştirilen satır: Tüm satır açık sarı arka plan
        row.eachCell((cell) => {
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFF8E1' } };
        });
        row.getCell(degisiklikCol).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFEF3C7' } };
        row.getCell(degisiklikCol).font = { bold: true, color: { argb: 'FF92400E' } };
      }
    });
    ithalColumns.forEach((c, idx) => { if (c.numFmt) wsIthal.getColumn(idx + 1).numFmt = c.numFmt; });
    finalizeSheet(wsIthal, wsIthal.rowCount);
    
    // 🔧 FİYAT SÜTUNLARINI VURGULA - İthal
    const birimFiyatColI = ithalColumns.findIndex(c => c.key === 'birimFiyatiFob') + 1;
    const toplamUsdColI = ithalColumns.findIndex(c => c.key === 'toplamUsd') + 1;
    const toplamTlColI = ithalColumns.findIndex(c => c.key === 'toplamTl') + 1;
    // Başlık hücrelerini sarı yap
    wsIthal.getCell(1, birimFiyatColI).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFEF3C7' } };
    wsIthal.getCell(1, birimFiyatColI).font = { bold: true, size: 11, color: { argb: 'FF92400E' } };
    wsIthal.getCell(1, toplamUsdColI).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFDBEAFE' } };
    wsIthal.getCell(1, toplamUsdColI).font = { bold: true, size: 11, color: { argb: 'FF1E40AF' } };
    wsIthal.getCell(1, toplamTlColI).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFEF3C7' } };
    wsIthal.getCell(1, toplamTlColI).font = { bold: true, size: 11, color: { argb: 'FF92400E' } };
    // Veri hücrelerini vurgula
    for (let r = 2; r <= wsIthal.rowCount; r++) {
      const row = wsIthal.getRow(r);
      row.getCell(birimFiyatColI).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFFBEB' } };
      row.getCell(birimFiyatColI).font = { bold: true, color: { argb: 'FF78350F' } };
      row.getCell(toplamUsdColI).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFEFF6FF' } };
      row.getCell(toplamUsdColI).font = { bold: true, color: { argb: 'FF1E40AF' } };
      row.getCell(toplamTlColI).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFFBEB' } };
      row.getCell(toplamTlColI).font = { bold: true, color: { argb: 'FF78350F' } };
    }
    
    // Manuel kur kolonlarını vurgula
    const kurManuelCol = ithalColumns.findIndex(c => c.key === 'kurManuel') + 1;
    const kurDegerCol = ithalColumns.findIndex(c => c.key === 'kurManuelDeger') + 1;
    const uygulanankurCol = ithalColumns.findIndex(c => c.key === 'uygulanankur') + 1;
    
    // Başlık hücrelerini renklendir
    wsIthal.getCell(1, kurManuelCol).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF4ADE80' } };
    wsIthal.getCell(1, kurDegerCol).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF4ADE80' } };
    wsIthal.getCell(1, uygulanankurCol).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF60A5FA' } };
    
    // Manuel kur kullanılan satırları vurgula
    wsIthal.eachRow((row, rowNumber) => {
      if (rowNumber > 1 && row.getCell(kurManuelCol).value === 'EVET') {
        row.getCell(kurManuelCol).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD1FAE5' } };
        row.getCell(kurDegerCol).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD1FAE5' } };
        row.getCell(kurDegerCol).font = { bold: true, color: { argb: 'FF065F46' } };
      }
    });
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

    // Manuel kur istatistikleri
    const manuelKurSayisi = ithalRows.filter(r => r.kurManuel).length;
    const manuelKurOrtalama = manuelKurSayisi > 0 
      ? ithalRows.filter(r => r.kurManuel).reduce((sum, r) => sum + (r.kurManuelDeger || 0), 0) / manuelKurSayisi
      : 0;
    
    // Karar istatistikleri
    const yerliOnay = yerliRows.filter(r => r.karar?.kararDurumu === 'onay').length;
    const yerliKismi = yerliRows.filter(r => r.karar?.kararDurumu === 'kismi_onay').length;
    const yerliRed = yerliRows.filter(r => r.karar?.kararDurumu === 'red').length;
    const ithalOnay = ithalRows.filter(r => r.karar?.kararDurumu === 'onay').length;
    const ithalKismi = ithalRows.filter(r => r.karar?.kararDurumu === 'kismi_onay').length;
    const ithalRed = ithalRows.filter(r => r.karar?.kararDurumu === 'red').length;
    
    // Özet sayfası
    const wsSummary = wb.addWorksheet('Özet');
    wsSummary.columns = [ { header: 'Alan', key: 'k', width: 35 }, { header: 'Değer', key: 'v', width: 45 } ];
    wsSummary.addRows([
      { k: 'Tarih', v: new Date().toLocaleString('tr-TR') },
      { k: 'Belge', v: selectedTesvik ? `${selectedTesvik.tesvikId || selectedTesvik.gmId} — ${selectedTesvik.yatirimciUnvan || selectedTesvik.firma?.tamUnvan || ''}` : '-' },
      { k: '', v: '' }, // Boş satır
      { k: 'YERLİ LİSTE', v: '' },
      { k: 'Yerli Toplam Satır', v: yerliRows.length },
      { k: 'Yerli Toplam (TL)', v: yerliToplamTl },
      { k: '✅ Onay (Kod: 1)', v: yerliOnay },
      { k: '⚠️ Kısmi Onay (Kod: 2)', v: yerliKismi },
      { k: '❌ Red (Kod: 3)', v: yerliRed },
      { k: '', v: '' }, // Boş satır
      { k: 'İTHAL LİSTE', v: '' },
      { k: 'İthal Toplam Satır', v: ithalRows.length },
      { k: 'İthal Toplam ($)', v: ithalToplamUsd },
      { k: 'İthal Toplam (TL)', v: ithalToplamTl },
      { k: '✅ Onay (Kod: 1)', v: ithalOnay },
      { k: '⚠️ Kısmi Onay (Kod: 2)', v: ithalKismi },
      { k: '❌ Red (Kod: 3)', v: ithalRed },
      { k: '', v: '' }, // Boş satır
      { k: 'DÖVİZ KURU BİLGİLERİ', v: '' },
      { k: 'Manuel Kur Kullanılan Satır Sayısı', v: manuelKurSayisi },
      { k: 'Ortalama Manuel Kur', v: manuelKurOrtalama > 0 ? manuelKurOrtalama.toFixed(4) : '-' },
      { k: 'Manuel Kur Kullanım Oranı', v: ithalRows.length > 0 ? `%${((manuelKurSayisi / ithalRows.length) * 100).toFixed(1)}` : '-' },
      { k: '', v: '' }, // Boş satır
      { k: 'KARAR KODLARI', v: '' },
      { k: '1 = ONAY (Yeşil)', v: 'Tam onay verilmiş' },
      { k: '2 = KISMİ (Sarı)', v: 'Kısmi onay verilmiş' },
      { k: '3 = RED (Kırmızı)', v: 'Reddedilmiş' }
    ]);
    wsSummary.getColumn(2).numFmt = '#,##0';
    wsSummary.getRow(1).font = { bold: true };
    
    // Başlık satırlarını vurgula
    [4, 11, 19, 24].forEach(rowNum => {
      const row = wsSummary.getRow(rowNum);
      row.font = { bold: true, size: 12 };
      row.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE5E7EB' } };
    });
    
    // Manuel kur bilgilerini vurgula
    [20, 21, 22].forEach(rowNum => {
      wsSummary.getRow(rowNum).getCell(1).font = { color: { argb: 'FF065F46' } };
    });
    
    // Karar satırlarını renklendir
    // Yerli karar satırları (7, 8, 9)
    wsSummary.getRow(7).eachCell(cell => { cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFDCFCE7' } }; cell.font = { bold: true, color: { argb: 'FF15803D' } }; });
    wsSummary.getRow(8).eachCell(cell => { cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFEF9C3' } }; cell.font = { bold: true, color: { argb: 'FFA16207' } }; });
    wsSummary.getRow(9).eachCell(cell => { cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFEE2E2' } }; cell.font = { bold: true, color: { argb: 'FFDC2626' } }; });
    // İthal karar satırları (15, 16, 17)
    wsSummary.getRow(15).eachCell(cell => { cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFDCFCE7' } }; cell.font = { bold: true, color: { argb: 'FF15803D' } }; });
    wsSummary.getRow(16).eachCell(cell => { cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFEF9C3' } }; cell.font = { bold: true, color: { argb: 'FFA16207' } }; });
    wsSummary.getRow(17).eachCell(cell => { cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFEE2E2' } }; cell.font = { bold: true, color: { argb: 'FFDC2626' } }; });
    // Karar kod açıklamaları (25, 26, 27)
    wsSummary.getRow(25).eachCell(cell => { cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFDCFCE7' } }; });
    wsSummary.getRow(26).eachCell(cell => { cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFEF9C3' } }; });
    wsSummary.getRow(27).eachCell(cell => { cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFEE2E2' } }; });

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
    const data = await yeniTesvikService.get(tesvikId);
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
      makineId: r.makineId || '',
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
      silinmeTarihi: r.silinmeTarihi ? new Date(r.silinmeTarihi) : null,
      talep: r.talep || null,
      karar: r.karar || null,
      etuysSecili: !!r.etuysSecili
    }));
    const ithal = (data?.makineListeleri?.ithal || []).map(r => ({
      id: r.rowId || Math.random().toString(36).slice(2),
      rowId: r.rowId,
      siraNo: r.siraNo || 0,
      makineId: r.makineId || '',
      gtipKodu: r.gtipKodu || '',
      gtipAciklama: r.gtipAciklamasi || '',
      adi: r.adiVeOzelligi || '',
      miktar: r.miktar || 0,
      birim: r.birim || '', birimAciklamasi: r.birimAciklamasi || '',
      birimFiyatiFob: r.birimFiyatiFob || 0,
      doviz: r.gumrukDovizKodu || '',
      toplamUsd: r.toplamTutarFobUsd || 0,
      toplamTl: r.toplamTutarFobTl || 0,
      kurManuel: r.kurManuel || false,
      kurManuelDeger: r.kurManuelDeger || 0,
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
      silinmeTarihi: r.silinmeTarihi ? new Date(r.silinmeTarihi) : null,
      talep: r.talep || null,
      karar: r.karar || null,
      etuysSecili: !!r.etuysSecili
    }));
    
    // 🔧 LocalStorage'dan kaydedilmiş siraNo ve makineId değerlerini al ve birleştir
    const lsYerli = loadLS(`mk_${tesvikId}_yerli`, []);
    const lsIthal = loadLS(`mk_${tesvikId}_ithal`, []);
    
    // Veritabanı verisini localStorage ile birleştir (siraNo ve makineId için localStorage öncelikli)
    const mergedYerli = yerli.map((row, idx) => {
      const lsRow = lsYerli.find(ls => ls.rowId === row.rowId || ls.gtipKodu === row.gtipKodu);
      return {
        ...row,
        siraNo: lsRow?.siraNo || row.siraNo || (idx + 1), // localStorage > DB > index+1
        makineId: lsRow?.makineId || row.makineId || ''
      };
    });
    
    const mergedIthal = ithal.map((row, idx) => {
      const lsRow = lsIthal.find(ls => ls.rowId === row.rowId || ls.gtipKodu === row.gtipKodu);
      return {
        ...row,
        siraNo: lsRow?.siraNo || row.siraNo || (idx + 1), // localStorage > DB > index+1
        makineId: lsRow?.makineId || row.makineId || ''
      };
    });
    
    setYerliRows(mergedYerli);
    setIthalRows(mergedIthal);
  };

  const searchTesvik = async (q) => {
    try {
      setLoadingTesvik(true);
      const text = (q || '').trim();
      if (text.length < 2) {
        // 2 karakter altı: son kayıtlar
        const res = await api.get('/yeni-tesvik', { params: { limit: 20 } });
        setTesvikOptions(res.data?.data?.tesvikler || []);
        return;
      }
      const res = await api.get('/yeni-tesvik/search', { params: { q: text } });
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
      const obj = { id: Math.random().toString(36).slice(2), siraNo: r['Sıra No'] || 0, makineId: r['Makine ID'] || '', gtipKodu: r['GTIP No'], gtipAciklama: r['GTIP Açıklama'], adi: r['Adı ve Özelliği'], miktar: r['Miktarı'], birim: r['Birimi'], birimAciklamasi: r['Birim Açıklaması'] || '', birimFiyatiTl: r['Birim Fiyatı(TL)(KDV HARİÇ)'] || r['Birim Fiyatı (TL)'], toplamTl: r['Toplam Tutar (TL)'], kdvIstisnasi: r['KDV Muafiyeti Var Mı?'] || r['KDV Muafiyeti (EVET/HAYIR)'] || r['KDV İstisnası'], makineTechizatTipi: r['Makine Teçhizat Tipi'] || '', finansalKiralamaMi: r['Finansal Kiralama Mı'] || '', finansalKiralamaAdet: r['Finansal Kiralama İse Adet '] || 0, finansalKiralamaSirket: r['Finansal Kiralama İse Şirket'] || '', gerceklesenAdet: r['Gerçekleşen Adet'] || 0, gerceklesenTutar: r['Gerçekleşen Tutar '] || 0, iadeDevirSatisVarMi: r['İade-Devir-Satış Var mı?'] || '', iadeDevirSatisAdet: r['İade-Devir-Satış adet'] || 0, iadeDevirSatisTutar: r['İade Devir Satış Tutar'] || 0, dosyalar: [] };
      const errs = [];
      if (!obj.adi) errs.push('Adı boş');
      if (!obj.birim) errs.push('Birim boş');
      if (!numberOrZero(obj.miktar)) errs.push('Miktar 0');
      if (errs.length) obj._errors = errs;
      return calcYerli(obj);
    });
    const ithalMapped = ithal.map(r => {
      const obj = { id: Math.random().toString(36).slice(2), siraNo: r['Sıra No'] || 0, makineId: r['Makine ID'] || '', gtipKodu: r['GTIP No'], gtipAciklama: r['GTIP Açıklama'], adi: r['Adı ve Özelliği'], miktar: r['Miktarı'], birim: r['Birimi'], birimAciklamasi: r['Birim Açıklaması'] || '', birimFiyatiFob: r['Mensei Doviz Tutari(Fob)'] || r['Menşei Döviz Birim Fiyatı (FOB)'], doviz: r['Mensei Doviz Cinsi(Fob)'] || r['Menşei Döviz Cinsi (FOB)'], toplamUsd: r['Toplam Tutar (FOB $)'], toplamTl: r['Toplam Tutar (FOB TL)'], kullanilmisKod: r['KULLANILMIŞ MAKİNE'] || r['Kullanılmış Makine (Kod)'], kullanilmisAciklama: r['Kullanılmış Makine (Açıklama)'] || '', makineTechizatTipi: r['Makine Teçhizat Tipi'] || '', kdvMuafiyeti: r['KDV Muafiyeti'] || '', gumrukVergisiMuafiyeti: r['Gümrük Vergisi Muafiyeti'] || '', finansalKiralamaMi: r['Finansal Kiralama Mı'] || '', finansalKiralamaAdet: r['Finansal Kiralama İse Adet '] || 0, finansalKiralamaSirket: r['Finansal Kiralama İse Şirket'] || '', gerceklesenAdet: r['Gerçekleşen Adet'] || 0, gerceklesenTutar: r['Gerçekleşen Tutar '] || 0, iadeDevirSatisVarMi: r['İade-Devir-Satış Var mı?'] || '', iadeDevirSatisAdet: r['İade-Devir-Satış adet'] || 0, iadeDevirSatisTutar: r['İade Devir Satış Tutar'] || 0, ckdSkd: '', aracMi: '', dosyalar: [] };
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
      const talep = { durum: 'bakanliga_gonderildi', istenenAdet: Number(row.miktar) || 0, talepTarihi: row?.talep?.talepTarihi ? row.talep.talepTarihi : new Date() };
      const result = await yeniTesvikService.setMakineTalep(selectedTesvik._id, { liste: tab, rowId: rid, talep });
      // Backend'ten gelen güncel veriyi kullan
      if (result?.data?.makineListeleri) {
        const updatedRow = result.data.makineListeleri[tab]?.find(r => r.rowId === rid);
        if (updatedRow) {
          if (tab === 'yerli') updateYerli(row.id, { rowId: rid, talep: updatedRow.talep }); 
          else updateIthal(row.id, { rowId: rid, talep: updatedRow.talep });
        }
      }
    };
    for (const id of selectionModel) {
      const row = list.find(r => r.id === id);
      if (row) await apply(row);
    }
    // İşlem sonunda tüm veriyi yeniden yükle
    try {
      const fresh = await yeniTesvikService.get(selectedTesvik._id);
      setSelectedTesvik(fresh);
      openToast('success', 'Talep durumları güncellendi');
    } catch(e) {
      console.error('Veri yenilenemedi:', e);
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
        kararTarihi: row?.karar?.kararTarihi ? row.karar.kararTarihi : new Date()
      };
      const result = await yeniTesvikService.setMakineKarar(selectedTesvik._id, { liste: tab, rowId: rid, karar });
      // Backend'ten gelen güncel veriyi kullan
      if (result?.data?.makineListeleri) {
        const updatedRow = result.data.makineListeleri[tab]?.find(r => r.rowId === rid);
        if (updatedRow) {
          if (tab === 'yerli') updateYerli(row.id, { rowId: rid, karar: updatedRow.karar }); 
          else updateIthal(row.id, { rowId: rid, karar: updatedRow.karar });
        }
      }
    };
    for (const id of selectionModel) {
      const row = list.find(r => r.id === id);
      if (row) await apply(row);
    }
    // İşlem sonunda tüm veriyi yeniden yükle
    try {
      const fresh = await yeniTesvikService.get(selectedTesvik._id);
      setSelectedTesvik(fresh);
      openToast('success', 'Karar durumları güncellendi');
    } catch(e) {
      console.error('Veri yenilenemedi:', e);
    }
  };

  // 🎯 Kompakt Input Stilleri
  const compactInputSx = { 
    '& .MuiInputBase-root': { fontSize: '0.68rem', py: 0, height: 22 },
    '& .MuiOutlinedInput-notchedOutline': { borderColor: '#e8eaed' },
    '& input': { py: '2px', px: '4px' }
  };
  const compactSelectSx = { 
    fontSize: '0.68rem', 
    '& .MuiSelect-select': { py: '2px', px: '4px', minHeight: 'auto' },
    '& .MuiOutlinedInput-notchedOutline': { borderColor: '#e8eaed' }
  };

  const YerliGrid = () => {
    const cols = [
      { field: 'siraNo', headerName: '#', width: 40, 
        renderCell: (p) => (
          <DebouncedTextField 
            value={p.row.siraNo || ''} 
            onCommit={(val) => isReviseMode && updateRowSiraNo('yerli', p.row.id, val)}
            disabled={!isReviseMode}
            type="number"
            sx={{ ...compactInputSx, width: '100%' }}
            inputProps={{ min: 1, style: { textAlign: 'center' } }}
          />
        )
      },
      { field: 'makineId', headerName: 'M.ID', width: 80, 
        renderCell: (p) => (
          <Tooltip title={p.row.makineId ? `Makine ID: ${p.row.makineId}` : 'Bakanlık Makine ID girilmemiş'} arrow>
            <Box sx={{ width: '100%', position: 'relative' }}>
              <DebouncedTextField 
                value={p.row.makineId || ''} 
                onCommit={(val) => isReviseMode && updateYerli(p.row.id, { makineId: val })}
                disabled={!isReviseMode}
                placeholder="ID gir"
                sx={{ 
                  ...compactInputSx, 
                  width: '100%',
                  '& .MuiInputBase-input': {
                    bgcolor: !p.row.makineId && isReviseStarted ? 'rgba(245, 158, 11, 0.1)' : 'transparent',
                    borderRadius: 0.5,
                    fontWeight: p.row.makineId ? 600 : 400,
                    color: p.row.makineId ? '#10b981' : '#94a3b8',
                    '&::placeholder': { color: '#f59e0b', opacity: 0.7 }
                  }
                }}
              />
              {!p.row.makineId && isReviseStarted && (
                <Box sx={{ 
                  position: 'absolute', 
                  right: 2, 
                  top: '50%', 
                  transform: 'translateY(-50%)',
                  width: 6, 
                  height: 6, 
                  borderRadius: '50%', 
                  bgcolor: '#f59e0b',
                  boxShadow: '0 0 4px rgba(245, 158, 11, 0.5)'
                }} />
              )}
            </Box>
          </Tooltip>
        )
      },
      { field: 'gtipKodu', headerName: 'GTIP', width: 140, renderCell: (p) => (
        <Stack direction="row" spacing={0.25} alignItems="center" sx={{ width: '100%' }}>
          <Box sx={{ flex: 1 }}>
            <GTIPSuperSearch 
              value={p.row.gtipKodu} 
              onChange={(kod, aciklama)=>{ 
                if(!isReviseMode) return; 
                const patch = { gtipKodu: kod, gtipAciklama: aciklama }; 
                if (!p.row.adi) patch.adi = aciklama; 
                updateYerli(p.row.id, patch); 
              }} 
              disabled={!isReviseStarted}
              disableMessage="Revize başlatın"
            />
          </Box>
          <IconButton size="small" sx={{ p: 0.25 }} onClick={(e)=> openFavMenu(e, 'gtip', p.row.id)}><StarBorderIcon sx={{ fontSize: 12 }}/></IconButton>
        </Stack>
      ) },
      { field: 'gtipAciklama', headerName: 'GTIP Açıklama', width: 150, editable: true, renderCell:(p)=> (
        <Tooltip title={p.value||''}><Box sx={{ whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis', width:'100%', fontSize: '0.68rem' }}>{p.value||''}</Box></Tooltip>
      ) },
      { field: 'adi', headerName: 'Adı', flex: 1, minWidth: 180, editable: isReviseMode, renderCell:(p)=> (
        <Tooltip title={p.value||''}><Box sx={{ whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis', width:'100%', fontSize: '0.68rem' }}>{p.value||''}</Box></Tooltip>
      ) },
      { field: 'kdvIstisnasi', headerName: 'KDV', width: 65, renderCell: (p) => (
        <Select size="small" value={p.row.kdvIstisnasi || ''} onChange={(e)=> isReviseMode && updateYerli(p.row.id, { kdvIstisnasi: e.target.value })} displayEmpty fullWidth disabled={!isReviseMode} sx={compactSelectSx}>
          <MenuItem value="" sx={{ fontSize: '0.68rem' }}>-</MenuItem>
          <MenuItem value="EVET" sx={{ fontSize: '0.68rem' }}>E</MenuItem>
          <MenuItem value="HAYIR" sx={{ fontSize: '0.68rem' }}>H</MenuItem>
        </Select>
      ) },
      { field: 'miktar', headerName: 'Adet', width: 55, editable: isReviseMode, type: 'number', align:'right', headerAlign:'right' },
      { field: 'birim', headerName: 'Birim', width: 160, renderCell: (p) => (
          <Stack direction="row" spacing={0.25} alignItems="center" sx={{ width: '100%' }}>
            <Box sx={{ flex: 1 }}>
              <UnitCurrencySearch display="chip" type="unit" value={{ kod: p.row.birim, aciklama: p.row.birimAciklamasi }} onChange={(kod, aciklama)=>{ if(!isReviseMode) return; updateYerli(p.row.id,{ birim: kod, birimAciklamasi: aciklama }); }} />
            </Box>
            <IconButton size="small" sx={{ p: 0.25 }} onClick={(e)=> openFavMenu(e,'unit', p.row.id)}><StarBorderIcon sx={{ fontSize: 12 }}/></IconButton>
          </Stack>
        ) },
      { field: 'birimFiyatiTl', headerName: 'B.Fiyat', width: 80, editable: isReviseMode, type: 'number', align:'right', headerAlign:'right' },
      { field: 'makineTechizatTipi', headerName: 'Tip', width: 85, renderCell: (p)=> (
        <Select size="small" value={p.row.makineTechizatTipi || ''} onChange={(e)=> isReviseMode && updateYerli(p.row.id, { makineTechizatTipi: e.target.value })} displayEmpty fullWidth disabled={!isReviseMode} sx={compactSelectSx}>
          <MenuItem value="" sx={{ fontSize: '0.68rem' }}>-</MenuItem>
          <MenuItem value="Ana Makine" sx={{ fontSize: '0.68rem' }}>Ana</MenuItem>
          <MenuItem value="Yardımcı Makine" sx={{ fontSize: '0.68rem' }}>Yard.</MenuItem>
        </Select>
      ) },
      { field: 'finansalKiralamaMi', headerName: 'FK', width: 55, renderCell: (p) => (
        <Select size="small" value={p.row.finansalKiralamaMi || ''} onChange={(e)=> isReviseMode && updateYerli(p.row.id, { finansalKiralamaMi: e.target.value })} displayEmpty fullWidth disabled={!isReviseMode} sx={compactSelectSx}>
          <MenuItem value="" sx={{ fontSize: '0.68rem' }}>-</MenuItem>
          <MenuItem value="EVET" sx={{ fontSize: '0.68rem' }}>E</MenuItem>
          <MenuItem value="HAYIR" sx={{ fontSize: '0.68rem' }}>H</MenuItem>
        </Select>
      )},
      { field: 'finansalKiralamaAdet', headerName: 'FK#', width: 50, editable: isReviseMode, type: 'number' },
      { field: 'finansalKiralamaSirket', headerName: 'FK Şrk', width: 80, editable: isReviseMode },
      { field: 'gerceklesenAdet', headerName: 'G.Adet', width: 55, editable: isReviseMode, type: 'number' },
      { field: 'gerceklesenTutar', headerName: 'G.Tutar', width: 70, editable: isReviseMode, type: 'number' },
      { field: 'iadeDevirSatisVarMi', headerName: 'DVR', width: 55, renderCell: (p) => (
        <Select size="small" value={p.row.iadeDevirSatisVarMi || ''} onChange={(e)=> isReviseMode && updateYerli(p.row.id, { iadeDevirSatisVarMi: e.target.value })} displayEmpty fullWidth disabled={!isReviseMode} sx={compactSelectSx}>
          <MenuItem value="" sx={{ fontSize: '0.68rem' }}>-</MenuItem>
          <MenuItem value="EVET" sx={{ fontSize: '0.68rem' }}>E</MenuItem>
          <MenuItem value="HAYIR" sx={{ fontSize: '0.68rem' }}>H</MenuItem>
        </Select>
      ) },
      { field: 'iadeDevirSatisAdet', headerName: 'DVR#', width: 55, editable: isReviseMode, type: 'number' },
      { field: 'iadeDevirSatisTutar', headerName: 'DVR₺', width: 70, editable: isReviseMode, type: 'number' },
      { field: 'toplamTl', headerName: 'Toplam', width: 90, editable: isReviseMode, align:'right', headerAlign:'right', valueFormatter: (p)=> p.value?.toLocaleString('tr-TR') },
      { field: 'dosya', headerName: '📎', width: 70, sortable: false, renderCell: (p)=> (
        <Box onDragOver={(e)=>{e.preventDefault();}} onDrop={async(e)=>{ if(!isReviseMode) return; e.preventDefault(); const files = Array.from(e.dataTransfer.files||[]); if(files.length===0) return; const form = new FormData(); files.forEach(f=> form.append('files', f)); form.append('path', `makine-yonetimi/${selectedTesvik?._id || 'global'}/${tab}/${p.row.id}`); await api.post('/files/upload', form, { headers:{'Content-Type':'multipart/form-data'} }); updateYerli(p.row.id, { dosyalar: [...(p.row.dosyalar||[]), ...files.map(f=>({ name:f.name })) ] }); }}>
          <Button size="small" sx={{ fontSize: '0.6rem', minWidth: 40, py: 0.25, px: 0.5 }} onClick={()=> isReviseMode ? openUpload(p.row.id) : openFilesDialog(`makine-yonetimi/${selectedTesvik?._id || 'global'}/${tab}/${p.row.id}`)}>{Array.isArray(p.row.dosyalar) && p.row.dosyalar.length>0 ? p.row.dosyalar.length : '+'}</Button>
        </Box>
      )},
      { field: 'etuysSecili', headerName: '✓', width: 35, sortable:false, renderCell:(p)=> (
        <input type="checkbox" checked={!!p.row.etuysSecili} disabled={!isReviseMode} onChange={(e)=> updateYerli(p.row.id, { etuysSecili: e.target.checked })} style={{ width: 14, height: 14 }} />
      ) },
      { field: 'copy', headerName: '', width: 30, sortable: false, renderCell: (p)=> (
        <IconButton size="small" sx={{ p: 0.25 }} onClick={()=> isReviseMode && setYerliRows(rows => duplicateRow(rows, p.row.id))} disabled={!isReviseMode}><CopyIcon sx={{ fontSize: 12 }}/></IconButton>
      )},
      { field: 'talep', headerName: 'Talep', width: 85, sortable: false, renderCell: (p)=>(
        <Stack direction="row" spacing={0.25} alignItems="center">
          {p.row.talep?.durum && (
            <Tooltip title={`Talep: ${p.row.talep.istenenAdet||0} adet - ${p.row.talep?.talepTarihi ? new Date(p.row.talep.talepTarihi).toLocaleDateString('tr-TR') : ''}`}>
              <Chip 
                size="small" 
                sx={{ 
                  height: 18, 
                  fontSize: '0.62rem', 
                  fontWeight: 700,
                  bgcolor: '#dbeafe',
                  color: '#1d4ed8',
                  border: '1px solid #3b82f6',
                  '& .MuiChip-label': { px: 0.5 } 
                }} 
                label={p.row.talep.istenenAdet||0} 
              />
            </Tooltip>
          )}
          <Tooltip title="Gönder"><span>
            <IconButton size="small" sx={{ p: 0.25 }} disabled={!selectedTesvik || !isReviseMode} onClick={async()=>{
              const rid = await ensureRowId('yerli', p.row);
              if (!rid) return;
              const talep = { durum:'bakanliga_gonderildi', istenenAdet: Number(p.row.miktar)||0, talepTarihi: p.row?.talep?.talepTarihi || new Date() };
              await yeniTesvikService.setMakineTalep(selectedTesvik._id, { liste:'yerli', rowId: rid, talep });
              updateYerli(p.row.id, { rowId: rid, talep });
              setActivityLog(log=> [{ type:'talep', list:'yerli', row:p.row, payload:talep, date:new Date() }, ...log].slice(0,200));
            }}><SendIcon sx={{ fontSize: 12 }}/></IconButton>
          </span></Tooltip>
        </Stack>
      ) },
      { field: 'karar', headerName: 'Karar', width: 90, sortable: false, renderCell: (p)=>{
        // Karar durumu: 1=Onay (Yeşil), 2=Kısmi (Sarı), 3=Red (Kırmızı)
        const kararKodu = p.row.karar?.kararDurumu === 'onay' ? 1 : p.row.karar?.kararDurumu === 'kismi_onay' ? 2 : p.row.karar?.kararDurumu === 'red' ? 3 : null;
        const kararRenk = kararKodu === 1 ? { bg: '#dcfce7', color: '#15803d', border: '#22c55e' } : kararKodu === 2 ? { bg: '#fef9c3', color: '#a16207', border: '#eab308' } : kararKodu === 3 ? { bg: '#fee2e2', color: '#dc2626', border: '#ef4444' } : null;
        const kararAdi = kararKodu === 1 ? 'ONAY' : kararKodu === 2 ? 'KISMİ' : kararKodu === 3 ? 'RED' : '';
        return (
        <Stack direction="row" spacing={0.25} alignItems="center">
          {kararKodu && (
            <Tooltip title={`${kararAdi} - Onaylanan: ${p.row.karar.onaylananAdet||0} adet`}>
              <Chip 
                size="small" 
                sx={{ 
                  height: 18, 
                  minWidth: 22,
                  fontSize: '0.65rem', 
                  fontWeight: 800,
                  bgcolor: kararRenk.bg,
                  color: kararRenk.color,
                  border: `1.5px solid ${kararRenk.border}`,
                  '& .MuiChip-label': { px: 0.5 } 
                }} 
                label={kararKodu} 
              />
            </Tooltip>
          )}
          <Tooltip title="Onayla (1)"><span>
            <IconButton size="small" sx={{ p: 0.25 }} disabled={!selectedTesvik || !isReviseMode || p.row.talep?.durum !== 'bakanliga_gonderildi'} onClick={async()=>{
              const rid = await ensureRowId('yerli', p.row);
              if (!rid) return;
              const karar = { kararDurumu:'onay', onaylananAdet:Number(p.row.miktar)||0, kararTarihi: new Date() };
              await yeniTesvikService.setMakineKarar(selectedTesvik._id, { liste:'yerli', rowId: rid, karar });
              updateYerli(p.row.id, { rowId: rid, karar });
            }}><CheckIcon sx={{ fontSize: 12, color: '#10b981' }}/></IconButton>
          </span></Tooltip>
          <Tooltip title="Kısmi (2)"><span>
            <IconButton size="small" sx={{ p: 0.25 }} disabled={!selectedTesvik || !isReviseMode || p.row.talep?.durum !== 'bakanliga_gonderildi'} onClick={async()=>{
              const rid = await ensureRowId('yerli', p.row);
              if (!rid) return;
              const karar = { kararDurumu:'kismi_onay', onaylananAdet: Math.floor((Number(p.row.miktar)||0)/2), kararTarihi: new Date() };
              await yeniTesvikService.setMakineKarar(selectedTesvik._id, { liste:'yerli', rowId: rid, karar });
              updateYerli(p.row.id, { rowId: rid, karar });
            }}><PercentIcon sx={{ fontSize: 12, color: '#f59e0b' }}/></IconButton>
          </span></Tooltip>
          <Tooltip title="Red (3)"><span>
            <IconButton size="small" sx={{ p: 0.25 }} disabled={!selectedTesvik || !isReviseMode || p.row.talep?.durum !== 'bakanliga_gonderildi'} onClick={async()=>{
              const rid = await ensureRowId('yerli', p.row);
              if (!rid) return;
              const karar = { kararDurumu:'red', onaylananAdet:0, kararTarihi: new Date() };
              await yeniTesvikService.setMakineKarar(selectedTesvik._id, { liste:'yerli', rowId: rid, karar });
              updateYerli(p.row.id, { rowId: rid, karar });
            }}><ClearIcon sx={{ fontSize: 12, color: '#ef4444' }}/></IconButton>
          </span></Tooltip>
        </Stack>
      )} },
      { field: 'talepTarihi', headerName: 'T.Tarih', width: 90, sortable: false, renderCell: (p)=> {
        const TalepTarihiCell = () => {
          const [localValue, setLocalValue] = useState(formatDateForInput(p.row.talep?.talepTarihi));
          useEffect(() => { setLocalValue(formatDateForInput(p.row.talep?.talepTarihi)); }, [p.row.talep?.talepTarihi]);
          return (
            <TextField type="date" size="small" disabled={!selectedTesvik} value={localValue}
              sx={{ ...compactInputSx, '& input': { fontSize: '0.6rem', py: 0, px: 0.5 } }}
              onChange={async(e)=>{
                const newValue = e.target.value;
                setLocalValue(newValue);
                const rid = await ensureRowId('yerli', p.row);
                if (!rid) return;
                const talep = { ...(p.row.talep||{}), talepTarihi: newValue ? new Date(newValue) : undefined };
                await yeniTesvikService.setMakineTalep(selectedTesvik._id, { liste:'yerli', rowId: rid, talep });
                updateYerli(p.row.id, { rowId: rid, talep });
              }}
            />
          );
        };
        return <TalepTarihiCell />;
      } },
      { field: 'kararTarihi', headerName: 'K.Tarih', width: 90, sortable: false, renderCell: (p)=> {
        const KararTarihiCell = () => {
          const [localValue, setLocalValue] = useState(formatDateForInput(p.row.karar?.kararTarihi));
          useEffect(() => { setLocalValue(formatDateForInput(p.row.karar?.kararTarihi)); }, [p.row.karar?.kararTarihi]);
          return (
            <TextField type="date" size="small" disabled={!selectedTesvik} value={localValue}
              sx={{ ...compactInputSx, '& input': { fontSize: '0.6rem', py: 0, px: 0.5 } }}
              onChange={async(e)=>{
                const newValue = e.target.value;
                setLocalValue(newValue);
                const rid = await ensureRowId('yerli', p.row);
                if (!rid) return;
                const karar = { ...(p.row.karar||{}), kararTarihi: newValue ? new Date(newValue) : undefined };
                await yeniTesvikService.setMakineKarar(selectedTesvik._id, { liste:'yerli', rowId: rid, karar });
                updateYerli(p.row.id, { rowId: rid, karar });
              }}
            />
          );
        };
        return <KararTarihiCell />;
      } },
      { field: 'silinmeTarihi', headerName: 'S.Tarih', width: 90, sortable: false, renderCell: (p) => {
        const SilinmeTarihiCell = () => {
          const [localValue, setLocalValue] = useState(formatDateForInput(p.row.silinmeTarihi));
          useEffect(() => { setLocalValue(formatDateForInput(p.row.silinmeTarihi)); }, [p.row.silinmeTarihi]);
          return (
            <TextField type="date" size="small" disabled={!isReviseMode} value={localValue}
              sx={{ ...compactInputSx, '& input': { fontSize: '0.6rem', py: 0, px: 0.5 } }}
              onBlur={(e) => {
                if (!isReviseMode) return;
                const newValue = e.target.value;
                if (newValue !== formatDateForInput(p.row.silinmeTarihi)) {
                  updateYerli(p.row.id, { silinmeTarihi: newValue ? new Date(newValue) : null });
                }
              }}
              onChange={(e) => setLocalValue(e.target.value)}
            />
          );
        };
        return <SilinmeTarihiCell />;
      } },
      { field: 'actions', headerName: '', width: 32, renderCell: (p)=>(
        <IconButton size="small" sx={{ p: 0.25, color: '#ef4444' }} onClick={()=>delRow(p.row.id)}><DeleteIcon sx={{ fontSize: 14 }}/></IconButton>
      )}
    ];
    return (
      <Box ref={yerliGridRef} sx={{ height: '100%', width: '100%' }}>
      <DataGrid 
        rows={filteredYerliRows} 
        columns={cols} 
        getRowId={(row) => row.id}
        pageSize={100} 
        rowsPerPageOptions={[50, 100, 200, 500]} 
        disableSelectionOnClick 
        rowHeight={32} 
        headerHeight={36}
        checkboxSelection
        selectionModel={selectionModel}
        onSelectionModelChange={(m)=> setSelectionModel(m)}
        processRowUpdate={processYerliRowUpdate}
        onCellContextMenu={(params, event)=>{ event.preventDefault(); setContextAnchor(event.currentTarget); setContextRow({ ...params.row, id: params.id }); }}
        density="compact"
        columnVisibilityModel={columnVisibilityModel}
        onColumnVisibilityModelChange={(m)=> setColumnVisibilityModel(m)}
        getCellClassName={(params)=>{
          if (params.field === 'miktar' && numberOrZero(params.value) <= 0) return 'error-cell';
          if (params.field === 'birim' && !params.row.birim) return 'error-cell';
          return '';
        }}
        sx={{
          height: '100%',
          width: '100%',
          border: '1px solid #e2e8f0',
          borderRadius: 2,
          fontSize: '0.72rem',
          fontFamily: '"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
          boxShadow: '0 1px 3px rgba(15, 23, 42, 0.04)',
          '& .error-cell': { 
            backgroundColor: '#fef2f2',
            borderLeft: '3px solid #ef4444'
          },
          '& .MuiDataGrid-columnHeaders': { 
            background: 'linear-gradient(180deg, #f8fafc 0%, #f1f5f9 100%)',
            borderBottom: '2px solid #e2e8f0',
            minHeight: '36px !important',
            maxHeight: '36px !important'
          },
          '& .MuiDataGrid-columnHeader': { 
            py: 0,
            '&:hover': { backgroundColor: '#e2e8f0' }
          },
          '& .MuiDataGrid-columnHeaderTitle': { 
            fontWeight: 700, 
            fontSize: '0.68rem', 
            color: '#475569',
            textTransform: 'uppercase',
            letterSpacing: '0.02em'
          },
          '& .MuiDataGrid-cell': { 
            py: 0.5, 
            borderBottom: '1px solid #f1f5f9',
            fontSize: '0.72rem',
            color: '#1e293b',
            '&:focus': {
              outline: '2px solid #3b82f6',
              outlineOffset: -2
            }
          },
          '& .MuiDataGrid-row': { 
            minHeight: '32px !important',
            maxHeight: '32px !important',
            transition: 'all 0.15s ease',
            '&:nth-of-type(even)': { backgroundColor: '#fafbfc' },
            '&:hover': { 
              backgroundColor: '#f0f9ff',
              boxShadow: 'inset 0 0 0 1px rgba(59, 130, 246, 0.15)'
            },
            '&.Mui-selected': { 
              backgroundColor: '#eff6ff !important',
              boxShadow: 'inset 3px 0 0 #3b82f6'
            }
          },
          '& .MuiDataGrid-footerContainer': { 
            minHeight: 40, 
            background: 'linear-gradient(180deg, #f8fafc 0%, #f1f5f9 100%)',
            borderTop: '2px solid #e2e8f0',
            '& .MuiTablePagination-root': { fontSize: '0.7rem' },
            '& .MuiTablePagination-selectLabel, & .MuiTablePagination-displayedRows': { 
              fontSize: '0.7rem',
              color: '#64748b'
            }
          },
          '& .MuiCheckbox-root': { 
            p: 0.5,
            color: '#94a3b8',
            '&.Mui-checked': { color: '#3b82f6' }
          },
          '& .MuiDataGrid-cellCheckbox': { minWidth: 40, maxWidth: 40 },
          '& .MuiDataGrid-virtualScroller': {
            '&::-webkit-scrollbar': { width: 8, height: 8 },
            '&::-webkit-scrollbar-track': { background: '#f1f5f9', borderRadius: 4 },
            '&::-webkit-scrollbar-thumb': { background: '#cbd5e1', borderRadius: 4, '&:hover': { background: '#94a3b8' } }
          }
        }}
      />
      </Box>
    );
  };

  const IthalGrid = () => {
    const cols = [
      // Birim Açıklaması kolonu kaldırıldı (müşteri istemiyor)
      { field: 'siraNo', headerName: '#', width: 40, 
        renderCell: (p) => (
          <DebouncedTextField 
            value={p.row.siraNo || ''} 
            onCommit={(val) => isReviseMode && updateRowSiraNo('ithal', p.row.id, val)}
            disabled={!isReviseMode}
            type="number"
            sx={{ ...compactInputSx, width: '100%' }}
            inputProps={{ min: 1, style: { textAlign: 'center' } }}
          />
        )
      },
      { field: 'makineId', headerName: 'M.ID', width: 80, 
        renderCell: (p) => (
          <Tooltip title={p.row.makineId ? `Makine ID: ${p.row.makineId}` : 'Bakanlık Makine ID girilmemiş'} arrow>
            <Box sx={{ width: '100%', position: 'relative' }}>
              <DebouncedTextField 
                value={p.row.makineId || ''} 
                onCommit={(val) => isReviseMode && updateIthal(p.row.id, { makineId: val })}
                disabled={!isReviseMode}
                placeholder="ID gir"
                sx={{ 
                  ...compactInputSx, 
                  width: '100%',
                  '& .MuiInputBase-input': {
                    bgcolor: !p.row.makineId && isReviseStarted ? 'rgba(245, 158, 11, 0.1)' : 'transparent',
                    borderRadius: 0.5,
                    fontWeight: p.row.makineId ? 600 : 400,
                    color: p.row.makineId ? '#10b981' : '#94a3b8',
                    '&::placeholder': { color: '#f59e0b', opacity: 0.7 }
                  }
                }}
              />
              {!p.row.makineId && isReviseStarted && (
                <Box sx={{ 
                  position: 'absolute', 
                  right: 2, 
                  top: '50%', 
                  transform: 'translateY(-50%)',
                  width: 6, 
                  height: 6, 
                  borderRadius: '50%', 
                  bgcolor: '#f59e0b',
                  boxShadow: '0 0 4px rgba(245, 158, 11, 0.5)'
                }} />
              )}
            </Box>
          </Tooltip>
        )
      },
      { field: 'gtipKodu', headerName: 'GTIP', width: 140, renderCell: (p) => (
        <Stack direction="row" spacing={0.25} alignItems="center" sx={{ width: '100%' }}>
          <Box sx={{ flex: 1 }}>
            <GTIPSuperSearch 
              value={p.row.gtipKodu} 
              onChange={(kod, aciklama)=>{ 
                if(!isReviseMode) return; 
                const patch = { gtipKodu: kod, gtipAciklama: aciklama }; 
                if (!p.row.adi) patch.adi = aciklama; 
                updateIthal(p.row.id, patch); 
              }} 
              disabled={!isReviseStarted}
              disableMessage="Revize başlatın"
            />
          </Box>
          <IconButton size="small" sx={{ p: 0.25 }} onClick={(e)=> openFavMenu(e, 'gtip', p.row.id)}><StarBorderIcon sx={{ fontSize: 12 }}/></IconButton>
        </Stack>
      ) },
      { field: 'gtipAciklama', headerName: 'GTIP Açıklama', width: 150, editable: true, renderCell:(p)=> (
        <Tooltip title={p.value||''}><Box sx={{ whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis', width:'100%', fontSize: '0.68rem' }}>{p.value||''}</Box></Tooltip>
      ) },
      { field: 'adi', headerName: 'Adı', flex: 1, minWidth: 160, editable: isReviseMode, renderCell:(p)=> (
        <Tooltip title={p.value||''}><Box sx={{ whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis', width:'100%', fontSize: '0.68rem' }}>{p.value||''}</Box></Tooltip>
      ) },
      { field: 'miktar', headerName: 'Adet', width: 55, editable: isReviseMode, type: 'number', align:'right', headerAlign:'right' },
      { field: 'birim', headerName: 'Birim', width: 140, renderCell: (p) => (
        <Stack direction="row" spacing={0.25} alignItems="center" sx={{ width: '100%' }}>
          <Box sx={{ flex: 1 }}>
            <UnitCurrencySearch display="chip" type="unit" value={{ kod: p.row.birim, aciklama: p.row.birimAciklamasi }} onChange={(kod,aciklama)=>{ if(!isReviseMode) return; updateIthal(p.row.id,{ birim:kod, birimAciklamasi: aciklama }); }} />
          </Box>
          <IconButton size="small" sx={{ p: 0.25 }} onClick={(e)=> openFavMenu(e,'unit', p.row.id)}><StarBorderIcon sx={{ fontSize: 12 }}/></IconButton>
        </Stack>
      ) },
      { field: 'birimFiyatiFob', headerName: 'FOB', width: 75, editable: isReviseMode, type: 'number', align:'right', headerAlign:'right' },
      { field: 'doviz', headerName: 'Döviz', width: 140, renderCell: (p)=>(
        <Stack direction="row" spacing={0.25} alignItems="center" sx={{ width: '100%' }}>
          <Box sx={{ flex: 1 }}>
            <UnitCurrencySearch type="currency" value={p.row.doviz} onChange={(kod)=>{ if(!isReviseMode) return; updateIthal(p.row.id,{doviz:kod}); }} />
          </Box>
          {p.row.doviz && p.row.doviz !== 'TRY' && p.row.kurManuel && p.row.kurManuelDeger > 0 && (
            <Tooltip title={`Manuel Kur: ${p.row.kurManuelDeger}`}>
              <Chip label={`${p.row.kurManuelDeger}`} size="small" sx={{ height: 16, fontSize: '0.58rem', bgcolor: '#d1fae5', '& .MuiChip-label': { px: 0.5 } }}/>
            </Tooltip>
          )}
          {p.row.doviz && p.row.doviz !== 'TRY' && (
            <IconButton size="small" sx={{ p: 0.25 }} onClick={() => { if (!isReviseMode) return; setManuelKurEditingRow(p.row); setManuelKurDialogOpen(true); }}>
              <CurrencyExchangeIcon sx={{ fontSize: 12, color: p.row.kurManuel ? '#10b981' : '#1a73e8' }} />
            </IconButton>
          )}
        </Stack>
      ) },
      { field: 'toplamUsd', headerName: '$', width: 75, align:'right', headerAlign:'right',
        valueGetter: (p)=> numberOrZero(p.row.miktar) * numberOrZero(p.row.birimFiyatiFob),
        valueFormatter: (p)=> numberOrZero(p.value)?.toLocaleString('en-US')
      },
      { field: 'toplamTl', headerName: '₺', width: 85, editable: isReviseMode, type:'string', align:'right', headerAlign:'right',
        renderCell: (p) => {
          const formattedValue = p.row.__manualTLInput || Number(numberOrZero(p.value)).toLocaleString('tr-TR');
          return p.row.kurManuel ? (
            <Tooltip title={`Kur: ${p.row.kurManuelDeger}`}><span style={{ color: '#10b981' }}>{formattedValue}</span></Tooltip>
          ) : formattedValue;
        },
        preProcessEditCellProps: (params)=> {
          const parsed = parseTrCurrency((params.props.value ?? '').toString());
          return { ...params.props, error: !Number.isFinite(parsed) };
        }
      },
      { field: 'kullanilmis', headerName: 'Kull.', width: 100, renderCell: (p)=>(
        <UnitCurrencySearch type="used" value={p.row.kullanilmisKod} onChange={(kod,aciklama)=>{ if(!isReviseMode) return; updateIthal(p.row.id,{kullanilmisKod:kod,kullanilmisAciklama:aciklama}); }} />
      ) },
      { field: 'ckdSkd', headerName: 'CKD', width: 55, renderCell: (p)=> (
        <Select size="small" value={p.row.ckdSkd || ''} onChange={(e)=> isReviseMode && updateIthal(p.row.id, { ckdSkd: e.target.value })} displayEmpty fullWidth disabled={!isReviseMode} sx={compactSelectSx}>
          <MenuItem value="" sx={{ fontSize: '0.68rem' }}>-</MenuItem>
          <MenuItem value="EVET" sx={{ fontSize: '0.68rem' }}>E</MenuItem>
          <MenuItem value="HAYIR" sx={{ fontSize: '0.68rem' }}>H</MenuItem>
        </Select>
      ) },
      { field: 'aracMi', headerName: 'Araç', width: 55, renderCell: (p)=> (
        <Select size="small" value={p.row.aracMi || ''} onChange={(e)=> isReviseMode && updateIthal(p.row.id, { aracMi: e.target.value })} displayEmpty fullWidth disabled={!isReviseMode} sx={compactSelectSx}>
          <MenuItem value="" sx={{ fontSize: '0.68rem' }}>-</MenuItem>
          <MenuItem value="EVET" sx={{ fontSize: '0.68rem' }}>E</MenuItem>
          <MenuItem value="HAYIR" sx={{ fontSize: '0.68rem' }}>H</MenuItem>
        </Select>
      ) },
      { field: 'makineTechizatTipi', headerName: 'Tip', width: 70, renderCell: (p)=> (
        <Select size="small" value={p.row.makineTechizatTipi || ''} onChange={(e)=> isReviseMode && updateIthal(p.row.id, { makineTechizatTipi: e.target.value })} displayEmpty fullWidth disabled={!isReviseMode} sx={compactSelectSx}>
          <MenuItem value="" sx={{ fontSize: '0.68rem' }}>-</MenuItem>
          <MenuItem value="Ana Makine" sx={{ fontSize: '0.68rem' }}>Ana</MenuItem>
          <MenuItem value="Yardımcı Makine" sx={{ fontSize: '0.68rem' }}>Yrd</MenuItem>
        </Select>
      ) },
      { field: 'kdvMuafiyeti', headerName: 'KDV', width: 55, renderCell: (p)=> (
        <Select size="small" value={p.row.kdvMuafiyeti || ''} onChange={(e)=> isReviseMode && updateIthal(p.row.id, { kdvMuafiyeti: e.target.value })} displayEmpty fullWidth disabled={!isReviseMode} sx={compactSelectSx}>
          <MenuItem value="" sx={{ fontSize: '0.68rem' }}>-</MenuItem>
          <MenuItem value="EVET" sx={{ fontSize: '0.68rem' }}>E</MenuItem>
          <MenuItem value="HAYIR" sx={{ fontSize: '0.68rem' }}>H</MenuItem>
        </Select>
      ) },
      { field: 'gumrukVergisiMuafiyeti', headerName: 'G.V.', width: 55, renderCell: (p)=> (
        <Select size="small" value={p.row.gumrukVergisiMuafiyeti || ''} onChange={(e)=> isReviseMode && updateIthal(p.row.id, { gumrukVergisiMuafiyeti: e.target.value })} displayEmpty fullWidth disabled={!isReviseMode} sx={compactSelectSx}>
          <MenuItem value="" sx={{ fontSize: '0.68rem' }}>-</MenuItem>
          <MenuItem value="EVET" sx={{ fontSize: '0.68rem' }}>E</MenuItem>
          <MenuItem value="HAYIR" sx={{ fontSize: '0.68rem' }}>H</MenuItem>
        </Select>
      ) },
      { field: 'finansalKiralamaMi', headerName: 'FK', width: 50, renderCell: (p)=> (
        <Select size="small" value={p.row.finansalKiralamaMi || ''} onChange={(e)=> isReviseMode && updateIthal(p.row.id, { finansalKiralamaMi: e.target.value })} displayEmpty fullWidth disabled={!isReviseMode} sx={compactSelectSx}>
          <MenuItem value="" sx={{ fontSize: '0.68rem' }}>-</MenuItem>
          <MenuItem value="EVET" sx={{ fontSize: '0.68rem' }}>E</MenuItem>
          <MenuItem value="HAYIR" sx={{ fontSize: '0.68rem' }}>H</MenuItem>
        </Select>
      ) },
      { field: 'finansalKiralamaAdet', headerName: 'FK#', width: 45, editable: isReviseMode, type: 'number' },
      { field: 'finansalKiralamaSirket', headerName: 'FK Şrk', width: 70, editable: isReviseMode },
      { field: 'gerceklesenAdet', headerName: 'G.#', width: 45, editable: isReviseMode, type: 'number' },
      { field: 'gerceklesenTutar', headerName: 'G.₺', width: 60, editable: isReviseMode, type: 'number' },
      { field: 'iadeDevirSatisVarMi', headerName: 'DVR', width: 50, renderCell: (p)=> (
        <Select size="small" value={p.row.iadeDevirSatisVarMi || ''} onChange={(e)=> isReviseMode && updateIthal(p.row.id, { iadeDevirSatisVarMi: e.target.value })} displayEmpty fullWidth disabled={!isReviseMode} sx={compactSelectSx}>
          <MenuItem value="" sx={{ fontSize: '0.68rem' }}>-</MenuItem>
          <MenuItem value="EVET" sx={{ fontSize: '0.68rem' }}>E</MenuItem>
          <MenuItem value="HAYIR" sx={{ fontSize: '0.68rem' }}>H</MenuItem>
        </Select>
      ) },
      { field: 'iadeDevirSatisAdet', headerName: 'DVR#', width: 50, editable: isReviseMode, type: 'number' },
      { field: 'iadeDevirSatisTutar', headerName: 'DVR₺', width: 60, editable: isReviseMode, type: 'number' },
      { field: 'dosya', headerName: '📎', width: 55, sortable: false, renderCell: (p)=> (
        <Box onDragOver={(e)=>{e.preventDefault();}} onDrop={async(e)=>{ if(!isReviseMode) return; e.preventDefault(); const files = Array.from(e.dataTransfer.files||[]); if(files.length===0) return; const form = new FormData(); files.forEach(f=> form.append('files', f)); form.append('path', `makine-yonetimi/${selectedTesvik?._id || 'global'}/${tab}/${p.row.id}`); await api.post('/files/upload', form, { headers:{'Content-Type':'multipart/form-data'} }); updateIthal(p.row.id, { dosyalar: [...(p.row.dosyalar||[]), ...files.map(f=>({ name:f.name })) ] }); }}>
          <Button size="small" sx={{ fontSize: '0.6rem', minWidth: 36, py: 0.25, px: 0.5 }} onClick={()=> isReviseMode ? openUpload(p.row.id) : openFilesDialog(`makine-yonetimi/${selectedTesvik?._id || 'global'}/${tab}/${p.row.id}`)}>{Array.isArray(p.row.dosyalar) && p.row.dosyalar.length>0 ? p.row.dosyalar.length : '+'}</Button>
        </Box>
      )},
      { field: 'etuysSecili', headerName: '✓', width: 32, sortable:false, renderCell:(p)=> (
        <input type="checkbox" checked={!!p.row.etuysSecili} disabled={!isReviseMode} onChange={(e)=> updateIthal(p.row.id, { etuysSecili: e.target.checked })} style={{ width: 14, height: 14 }} />
      ) },
      { field: 'copy', headerName: '', width: 28, sortable: false, renderCell: (p)=> (
        <IconButton size="small" sx={{ p: 0.25 }} onClick={()=> isReviseMode && setIthalRows(rows => duplicateRow(rows, p.row.id))} disabled={!isReviseMode}><CopyIcon sx={{ fontSize: 12 }}/></IconButton>
      )},
      { field: 'talep', headerName: 'Talep', width: 85, sortable: false, renderCell: (p)=>(
        <Stack direction="row" spacing={0.25} alignItems="center">
          {p.row.talep?.durum && (
            <Tooltip title={`Talep: ${p.row.talep.istenenAdet||0} adet - ${p.row.talep?.talepTarihi ? new Date(p.row.talep.talepTarihi).toLocaleDateString('tr-TR') : ''}`}>
              <Chip 
                size="small" 
                sx={{ 
                  height: 18, 
                  fontSize: '0.62rem', 
                  fontWeight: 700,
                  bgcolor: '#fef3c7',
                  color: '#92400e',
                  border: '1px solid #f59e0b',
                  '& .MuiChip-label': { px: 0.5 } 
                }} 
                label={p.row.talep.istenenAdet||0} 
              />
            </Tooltip>
          )}
          <Tooltip title="Gönder"><span>
            <IconButton size="small" sx={{ p: 0.25 }} disabled={!selectedTesvik || !isReviseMode} onClick={async()=>{
              const rid = await ensureRowId('ithal', p.row);
              if (!rid) return;
              const talep = { durum:'bakanliga_gonderildi', istenenAdet: Number(p.row.miktar)||0, talepTarihi: new Date() };
              await yeniTesvikService.setMakineTalep(selectedTesvik._id, { liste:'ithal', rowId: rid, talep });
              updateIthal(p.row.id, { rowId: rid, talep });
            }}><SendIcon sx={{ fontSize: 12 }}/></IconButton>
          </span></Tooltip>
        </Stack>
      ) },
      { field: 'karar', headerName: 'Karar', width: 90, sortable: false, renderCell: (p)=>{
        // Karar durumu: 1=Onay (Yeşil), 2=Kısmi (Sarı), 3=Red (Kırmızı)
        const kararKodu = p.row.karar?.kararDurumu === 'onay' ? 1 : p.row.karar?.kararDurumu === 'kismi_onay' ? 2 : p.row.karar?.kararDurumu === 'red' ? 3 : null;
        const kararRenk = kararKodu === 1 ? { bg: '#dcfce7', color: '#15803d', border: '#22c55e' } : kararKodu === 2 ? { bg: '#fef9c3', color: '#a16207', border: '#eab308' } : kararKodu === 3 ? { bg: '#fee2e2', color: '#dc2626', border: '#ef4444' } : null;
        const kararAdi = kararKodu === 1 ? 'ONAY' : kararKodu === 2 ? 'KISMİ' : kararKodu === 3 ? 'RED' : '';
        return (
        <Stack direction="row" spacing={0.25} alignItems="center">
          {kararKodu && (
            <Tooltip title={`${kararAdi} - Onaylanan: ${p.row.karar.onaylananAdet||0} adet`}>
              <Chip 
                size="small" 
                sx={{ 
                  height: 18, 
                  minWidth: 22,
                  fontSize: '0.65rem', 
                  fontWeight: 800,
                  bgcolor: kararRenk.bg,
                  color: kararRenk.color,
                  border: `1.5px solid ${kararRenk.border}`,
                  '& .MuiChip-label': { px: 0.5 } 
                }} 
                label={kararKodu} 
              />
            </Tooltip>
          )}
          <Tooltip title="Onayla (1)"><span>
            <IconButton size="small" sx={{ p: 0.25 }} disabled={!selectedTesvik || !isReviseMode || p.row.talep?.durum !== 'bakanliga_gonderildi'} onClick={async()=>{
              const rid = await ensureRowId('ithal', p.row);
              if (!rid) return;
              const karar = { kararDurumu:'onay', onaylananAdet:Number(p.row.miktar)||0, kararTarihi: new Date() };
              await yeniTesvikService.setMakineKarar(selectedTesvik._id, { liste:'ithal', rowId: rid, karar });
              updateIthal(p.row.id, { rowId: rid, karar });
            }}><CheckIcon sx={{ fontSize: 12, color: '#10b981' }}/></IconButton>
          </span></Tooltip>
          <Tooltip title="Kısmi (2)"><span>
            <IconButton size="small" sx={{ p: 0.25 }} disabled={!selectedTesvik || !isReviseMode || p.row.talep?.durum !== 'bakanliga_gonderildi'} onClick={async()=>{
              const rid = await ensureRowId('ithal', p.row);
              if (!rid) return;
              const karar = { kararDurumu:'kismi_onay', onaylananAdet: Math.floor((Number(p.row.miktar)||0)/2), kararTarihi: new Date() };
              await yeniTesvikService.setMakineKarar(selectedTesvik._id, { liste:'ithal', rowId: rid, karar });
              updateIthal(p.row.id, { rowId: rid, karar });
            }}><PercentIcon sx={{ fontSize: 12, color: '#f59e0b' }}/></IconButton>
          </span></Tooltip>
          <Tooltip title="Red (3)"><span>
            <IconButton size="small" sx={{ p: 0.25 }} disabled={!selectedTesvik || !isReviseMode || p.row.talep?.durum !== 'bakanliga_gonderildi'} onClick={async()=>{
              const rid = await ensureRowId('ithal', p.row);
              if (!rid) return;
              const karar = { kararDurumu:'red', onaylananAdet:0, kararTarihi: new Date() };
              await yeniTesvikService.setMakineKarar(selectedTesvik._id, { liste:'ithal', rowId: rid, karar });
              updateIthal(p.row.id, { rowId: rid, karar });
            }}><ClearIcon sx={{ fontSize: 12, color: '#ef4444' }}/></IconButton>
          </span></Tooltip>
        </Stack>
      )} },
      { field: 'talepTarihi', headerName: 'T.Tarih', width: 85, sortable: false, renderCell: (p)=> {
        const TalepTarihiCell = () => {
          const [localValue, setLocalValue] = useState(formatDateForInput(p.row.talep?.talepTarihi));
          useEffect(() => { setLocalValue(formatDateForInput(p.row.talep?.talepTarihi)); }, [p.row.talep?.talepTarihi]);
          return (
            <TextField type="date" size="small" disabled={!selectedTesvik} value={localValue}
              sx={{ ...compactInputSx, '& input': { fontSize: '0.6rem', py: 0, px: 0.5 } }}
              onChange={async(e)=>{
                const newValue = e.target.value;
                setLocalValue(newValue);
                const rid = await ensureRowId('ithal', p.row);
                if (!rid) return;
                const talep = { ...(p.row.talep||{}), talepTarihi: newValue ? new Date(newValue) : undefined };
                await yeniTesvikService.setMakineTalep(selectedTesvik._id, { liste:'ithal', rowId: rid, talep });
                updateIthal(p.row.id, { rowId: rid, talep });
              }}
            />
          );
        };
        return <TalepTarihiCell />;
      } },
      { field: 'kararTarihi', headerName: 'K.Tarih', width: 85, sortable: false, renderCell: (p)=> {
        const KararTarihiCell = () => {
          const [localValue, setLocalValue] = useState(formatDateForInput(p.row.karar?.kararTarihi));
          useEffect(() => { setLocalValue(formatDateForInput(p.row.karar?.kararTarihi)); }, [p.row.karar?.kararTarihi]);
          return (
            <TextField type="date" size="small" disabled={!selectedTesvik} value={localValue}
              sx={{ ...compactInputSx, '& input': { fontSize: '0.6rem', py: 0, px: 0.5 } }}
              onChange={async(e)=>{
                const newValue = e.target.value;
                setLocalValue(newValue);
                const rid = await ensureRowId('ithal', p.row);
                if (!rid) return;
                const karar = { ...(p.row.karar||{}), kararTarihi: newValue ? new Date(newValue) : undefined };
                await yeniTesvikService.setMakineKarar(selectedTesvik._id, { liste:'ithal', rowId: rid, karar });
                updateIthal(p.row.id, { rowId: rid, karar });
              }}
            />
          );
        };
        return <KararTarihiCell />;
      } },
      { field: 'silinmeTarihi', headerName: 'S.Tarih', width: 85, sortable: false, renderCell: (p) => {
        const SilinmeTarihiCell = () => {
          const [localValue, setLocalValue] = useState(formatDateForInput(p.row.silinmeTarihi));
          useEffect(() => { setLocalValue(formatDateForInput(p.row.silinmeTarihi)); }, [p.row.silinmeTarihi]);
          return (
            <TextField type="date" size="small" disabled={!isReviseMode} value={localValue}
              sx={{ ...compactInputSx, '& input': { fontSize: '0.6rem', py: 0, px: 0.5 } }}
              onBlur={(e) => {
                if (!isReviseMode) return;
                const newValue = e.target.value;
                if (newValue !== formatDateForInput(p.row.silinmeTarihi)) {
                  updateIthal(p.row.id, { silinmeTarihi: newValue ? new Date(newValue) : null });
                }
              }}
              onChange={(e) => setLocalValue(e.target.value)}
            />
          );
        };
        return <SilinmeTarihiCell />;
      } },
      { field: 'actions', headerName: '', width: 32, renderCell: (p)=>(
        <IconButton size="small" sx={{ p: 0.25, color: '#ef4444' }} onClick={()=>delRow(p.row.id)}><DeleteIcon sx={{ fontSize: 14 }}/></IconButton>
      )}
    ];
    return (
      <Box ref={ithalGridRef} sx={{ height: '100%', width: '100%' }}>
      <DataGrid 
        rows={filteredIthalRows} 
        columns={cols} 
        getRowId={(row) => row.id}
        pageSize={100} 
        rowsPerPageOptions={[50, 100, 200, 500]} 
        disableSelectionOnClick 
        rowHeight={32} 
        headerHeight={36}
        checkboxSelection
        selectionModel={selectionModel}
        onSelectionModelChange={(m)=> setSelectionModel(m)}
        processRowUpdate={processIthalRowUpdate}
        onCellEditStop={(params)=>{
          if (params.field === 'toplamTl') {
            const id = params.id;
            const committed = parseTrCurrency(params.value);
            setIthalRows(rows => rows.map(r => r.id === id ? { ...r, tlManuel: true, toplamTl: committed, __manualTLInput: (params.value ?? '').toString() } : r));
          }
        }}
        onCellContextMenu={(params, event)=>{ event.preventDefault(); setContextAnchor(event.currentTarget); setContextRow({ ...params.row, id: params.id }); }}
        density="compact"
        columnVisibilityModel={columnVisibilityModel}
        onColumnVisibilityModelChange={(m)=> setColumnVisibilityModel(m)}
        getCellClassName={(params)=>{
          if (params.field === 'miktar' && numberOrZero(params.value) <= 0) return 'error-cell';
          if (params.field === 'birim' && !params.row.birim) return 'error-cell';
          if (params.field === 'doviz' && !params.row.doviz) return 'error-cell';
          return '';
        }}
        sx={{
          height: '100%',
          width: '100%',
          border: '1px solid #e2e8f0',
          borderRadius: 2,
          fontSize: '0.72rem',
          fontFamily: '"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
          boxShadow: '0 1px 3px rgba(15, 23, 42, 0.04)',
          '& .error-cell': { 
            backgroundColor: '#fef2f2',
            borderLeft: '3px solid #ef4444'
          },
          '& .MuiDataGrid-columnHeaders': { 
            background: 'linear-gradient(180deg, #fefce8 0%, #fef9c3 100%)',
            borderBottom: '2px solid #fde047',
            minHeight: '36px !important',
            maxHeight: '36px !important'
          },
          '& .MuiDataGrid-columnHeader': { 
            py: 0,
            '&:hover': { backgroundColor: '#fef08a' }
          },
          '& .MuiDataGrid-columnHeaderTitle': { 
            fontWeight: 700, 
            fontSize: '0.68rem', 
            color: '#854d0e',
            textTransform: 'uppercase',
            letterSpacing: '0.02em'
          },
          '& .MuiDataGrid-cell': { 
            py: 0.5, 
            borderBottom: '1px solid #f1f5f9',
            fontSize: '0.72rem',
            color: '#1e293b',
            '&:focus': {
              outline: '2px solid #f59e0b',
              outlineOffset: -2
            }
          },
          '& .MuiDataGrid-row': { 
            minHeight: '32px !important',
            maxHeight: '32px !important',
            transition: 'all 0.15s ease',
            '&:nth-of-type(even)': { backgroundColor: '#fffbeb' },
            '&:hover': { 
              backgroundColor: '#fef3c7',
              boxShadow: 'inset 0 0 0 1px rgba(245, 158, 11, 0.2)'
            },
            '&.Mui-selected': { 
              backgroundColor: '#fef3c7 !important',
              boxShadow: 'inset 3px 0 0 #f59e0b'
            }
          },
          '& .MuiDataGrid-footerContainer': { 
            minHeight: 40, 
            background: 'linear-gradient(180deg, #fefce8 0%, #fef9c3 100%)',
            borderTop: '2px solid #fde047',
            '& .MuiTablePagination-root': { fontSize: '0.7rem' },
            '& .MuiTablePagination-selectLabel, & .MuiTablePagination-displayedRows': { 
              fontSize: '0.7rem',
              color: '#92400e'
            }
          },
          '& .MuiCheckbox-root': { 
            p: 0.5,
            color: '#d97706',
            '&.Mui-checked': { color: '#f59e0b' }
          },
          '& .MuiDataGrid-cellCheckbox': { minWidth: 40, maxWidth: 40 },
          '& .MuiDataGrid-virtualScroller': {
            '&::-webkit-scrollbar': { width: 8, height: 8 },
            '&::-webkit-scrollbar-track': { background: '#fef9c3', borderRadius: 4 },
            '&::-webkit-scrollbar-thumb': { background: '#fcd34d', borderRadius: 4, '&:hover': { background: '#fbbf24' } }
          }
        }}
      />
      </Box>
    );
  };

  // 🚀 HIZLI MOD: Tam Ekran Excel Benzeri Grid
  // Küçük puntolu, tüm sütunlar görünür, hızlı veri girişi için optimize
  const QuickExcelGrid = memo(() => {
    const [quickTab, setQuickTab] = useState(tab);
    const rows = quickTab === 'yerli' ? yerliRows : ithalRows;
    const setRows = quickTab === 'yerli' ? setYerliRows : setIthalRows;
    const emptyRowFn = quickTab === 'yerli' ? emptyYerli : emptyIthal;
    const calcFn = quickTab === 'yerli' ? calcYerli : calcIthal;
    const updater = quickTab === 'yerli' ? updateYerli : updateIthal;
    
    // Sütun tanımları - Yerli (TÜM SÜTUNLAR - Standart grid ile aynı)
    const yerliCols = [
      { key: 'siraNo', label: '#', w: 28, type: 'number' },
      { key: 'makineId', label: 'M.ID', w: 45 },
      { key: 'gtipKodu', label: 'GTIP', w: 70 },
      { key: 'gtipAciklama', label: 'GTIP Açk.', w: 90 },
      { key: 'adi', label: 'Adı', w: 130, flex: true },
      { key: 'kdvIstisnasi', label: 'KDV', w: 30, options: ['', 'E', 'H'] },
      { key: 'miktar', label: 'Adet', w: 35, type: 'number' },
      { key: 'birim', label: 'Birim', w: 35 },
      { key: 'birimFiyatiTl', label: 'B.Fiy', w: 55, type: 'number' },
      { key: 'makineTechizatTipi', label: 'Tip', w: 30, options: ['', 'A', 'Y'] },
      { key: 'finansalKiralamaMi', label: 'FK', w: 26, options: ['', 'E', 'H'] },
      { key: 'finansalKiralamaAdet', label: 'FK#', w: 30, type: 'number' },
      { key: 'finansalKiralamaSirket', label: 'FKŞrk', w: 50 },
      { key: 'gerceklesenAdet', label: 'G.Ad', w: 32, type: 'number' },
      { key: 'gerceklesenTutar', label: 'G.Tut', w: 45, type: 'number' },
      { key: 'iadeDevirSatisVarMi', label: 'DVR', w: 26, options: ['', 'E', 'H'] },
      { key: 'iadeDevirSatisAdet', label: 'DV#', w: 28, type: 'number' },
      { key: 'iadeDevirSatisTutar', label: 'DV₺', w: 45, type: 'number' },
      { key: 'toplamTl', label: 'Toplam', w: 65, type: 'number', computed: true },
      { key: 'dosyaSayisi', label: '📎', w: 26, type: 'display', render: (row) => (row.dosyalar?.length || 0) },
      { key: 'etuysSecili', label: '✓', w: 22, type: 'checkbox' },
      { key: 'talepDurum', label: 'Talep', w: 35, type: 'display', render: (row) => row.talep?.istenenAdet || '' },
      { key: 'kararDurum', label: 'Karar', w: 28, type: 'display', render: (row) => row.karar?.kararDurumu === 'onay' ? '1' : row.karar?.kararDurumu === 'kismi_onay' ? '2' : row.karar?.kararDurumu === 'red' ? '3' : '' },
      { key: 'talepTarihi', label: 'T.Tar', w: 65, type: 'date', getValue: (row) => row.talep?.talepTarihi },
      { key: 'kararTarihi', label: 'K.Tar', w: 65, type: 'date', getValue: (row) => row.karar?.kararTarihi },
      { key: 'silinmeTarihi', label: 'S.Tar', w: 65, type: 'date' },
    ];
    
    // Sütun tanımları - İthal (TÜM SÜTUNLAR - Standart grid ile aynı)
    const ithalCols = [
      { key: 'siraNo', label: '#', w: 28, type: 'number' },
      { key: 'makineId', label: 'M.ID', w: 45 },
      { key: 'gtipKodu', label: 'GTIP', w: 70 },
      { key: 'gtipAciklama', label: 'GTIP Açk.', w: 90 },
      { key: 'adi', label: 'Adı', w: 110, flex: true },
      { key: 'miktar', label: 'Adet', w: 32, type: 'number' },
      { key: 'birim', label: 'Birim', w: 32 },
      { key: 'birimFiyatiFob', label: 'FOB', w: 50, type: 'number' },
      { key: 'doviz', label: 'Dvz', w: 32 },
      { key: 'toplamUsd', label: '$', w: 55, type: 'number', computed: true },
      { key: 'toplamTl', label: '₺', w: 60, type: 'number' },
      { key: 'kullanilmisKod', label: 'Kul', w: 26 },
      { key: 'ckdSkd', label: 'CKD', w: 26, options: ['', 'E', 'H'] },
      { key: 'aracMi', label: 'Arç', w: 26, options: ['', 'E', 'H'] },
      { key: 'makineTechizatTipi', label: 'Tip', w: 26, options: ['', 'A', 'Y'] },
      { key: 'kdvMuafiyeti', label: 'KDV', w: 26, options: ['', 'E', 'H'] },
      { key: 'gumrukVergisiMuafiyeti', label: 'GV', w: 26, options: ['', 'E', 'H'] },
      { key: 'finansalKiralamaMi', label: 'FK', w: 24, options: ['', 'E', 'H'] },
      { key: 'finansalKiralamaAdet', label: 'F#', w: 26, type: 'number' },
      { key: 'finansalKiralamaSirket', label: 'FŞrk', w: 45 },
      { key: 'gerceklesenAdet', label: 'G#', w: 26, type: 'number' },
      { key: 'gerceklesenTutar', label: 'G₺', w: 40, type: 'number' },
      { key: 'iadeDevirSatisVarMi', label: 'DV', w: 24, options: ['', 'E', 'H'] },
      { key: 'iadeDevirSatisAdet', label: 'D#', w: 26, type: 'number' },
      { key: 'iadeDevirSatisTutar', label: 'D₺', w: 40, type: 'number' },
      { key: 'dosyaSayisi', label: '📎', w: 24, type: 'display', render: (row) => (row.dosyalar?.length || 0) },
      { key: 'etuysSecili', label: '✓', w: 20, type: 'checkbox' },
      { key: 'talepDurum', label: 'Tlp', w: 30, type: 'display', render: (row) => row.talep?.istenenAdet || '' },
      { key: 'kararDurum', label: 'Kr', w: 24, type: 'display', render: (row) => row.karar?.kararDurumu === 'onay' ? '1' : row.karar?.kararDurumu === 'kismi_onay' ? '2' : row.karar?.kararDurumu === 'red' ? '3' : '' },
      { key: 'talepTarihi', label: 'T.Tar', w: 60, type: 'date', getValue: (row) => row.talep?.talepTarihi },
      { key: 'kararTarihi', label: 'K.Tar', w: 60, type: 'date', getValue: (row) => row.karar?.kararTarihi },
      { key: 'silinmeTarihi', label: 'S.Tar', w: 60, type: 'date' },
    ];
    
    const cols = quickTab === 'yerli' ? yerliCols : ithalCols;
    const gridRef = useRef(null);
    
    // Satır ekleme
    const addRows = (count) => {
      if (!isReviseStarted) { openToast('warning', 'Önce Revize başlatın'); return; }
      const newRows = Array.from({ length: count }, (_, i) => {
        const row = emptyRowFn();
        row.siraNo = rows.length + i + 1;
        return row;
      });
      setRows(prev => [...prev, ...newRows]);
    };
    
    // Hücre güncelleme
    const updateCell = useCallback((rowId, field, value) => {
      if (!isReviseStarted) return;
      const col = cols.find(c => c.key === field);
      let finalValue = value;
      if (col?.type === 'number') {
        finalValue = parseTrCurrency(value);
      }
      // E/H -> EVET/HAYIR, A/Y -> Ana Makine/Yardımcı Makine
      if (col?.options) {
        if (value === 'E') finalValue = 'EVET';
        else if (value === 'H') finalValue = 'HAYIR';
        else if (value === 'A') finalValue = 'Ana Makine';
        else if (value === 'Y') finalValue = 'Yardımcı Makine';
      }
      updater(rowId, { [field]: finalValue });
    }, [cols, updater, isReviseStarted]);
    
    // Excel yapıştırma
    const handlePaste = useCallback((e) => {
      if (!isReviseStarted) return;
      const text = e.clipboardData?.getData('text/plain');
      if (!text) return;
      
      const lines = text.split('\n').filter(l => l.trim());
      if (lines.length === 0) return;
      
      e.preventDefault();
      
      // Aktif hücre bul
      const activeEl = document.activeElement;
      const rowIdx = parseInt(activeEl?.dataset?.row || '0');
      const colIdx = parseInt(activeEl?.dataset?.col || '0');
      
      const newRows = [];
      lines.forEach((line, li) => {
        const cells = line.split('\t');
        const targetRowIdx = rowIdx + li;
        
        if (targetRowIdx < rows.length) {
          // Mevcut satırı güncelle
          const row = rows[targetRowIdx];
          cells.forEach((cell, ci) => {
            const targetColIdx = colIdx + ci;
            if (targetColIdx < cols.length) {
              const col = cols[targetColIdx];
              if (!col.computed) {
                updateCell(row.id, col.key, cell.trim());
              }
            }
          });
        } else {
          // Yeni satır
          const newRow = emptyRowFn();
          newRow.siraNo = rows.length + newRows.length + 1;
          cells.forEach((cell, ci) => {
            const targetColIdx = colIdx + ci;
            if (targetColIdx < cols.length) {
              const col = cols[targetColIdx];
              if (!col.computed) {
                let val = cell.trim();
                if (col.type === 'number') val = parseTrCurrency(val);
                newRow[col.key] = val;
              }
            }
          });
          newRows.push(calcFn(newRow));
        }
      });
      
      if (newRows.length > 0) {
        setRows(prev => [...prev, ...newRows]);
      }
      openToast('success', `${lines.length} satır yapıştırıldı`);
    }, [rows, cols, isReviseStarted, emptyRowFn, calcFn, setRows, updateCell]);
    
    // Klavye navigasyonu
    const handleKeyDown = useCallback((e, rowIdx, colIdx) => {
      const totalRows = rows.length;
      const totalCols = cols.length;
      
      if (e.key === 'Tab' || e.key === 'Enter') {
        e.preventDefault();
        let nextRow = rowIdx;
        let nextCol = colIdx + 1;
        if (nextCol >= totalCols) {
          nextCol = 0;
          nextRow = rowIdx + 1;
        }
        if (nextRow < totalRows) {
          const nextInput = gridRef.current?.querySelector(`[data-row="${nextRow}"][data-col="${nextCol}"]`);
          nextInput?.focus();
        }
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        if (rowIdx + 1 < totalRows) {
          const nextInput = gridRef.current?.querySelector(`[data-row="${rowIdx + 1}"][data-col="${colIdx}"]`);
          nextInput?.focus();
        }
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        if (rowIdx > 0) {
          const nextInput = gridRef.current?.querySelector(`[data-row="${rowIdx - 1}"][data-col="${colIdx}"]`);
          nextInput?.focus();
        }
      } else if (e.key === 'ArrowRight' && e.target.selectionStart === e.target.value.length) {
        if (colIdx + 1 < totalCols) {
          const nextInput = gridRef.current?.querySelector(`[data-row="${rowIdx}"][data-col="${colIdx + 1}"]`);
          nextInput?.focus();
        }
      } else if (e.key === 'ArrowLeft' && e.target.selectionStart === 0) {
        if (colIdx > 0) {
          const nextInput = gridRef.current?.querySelector(`[data-row="${rowIdx}"][data-col="${colIdx - 1}"]`);
          nextInput?.focus();
        }
      }
    }, [rows.length, cols.length]);
    
    // Satır silme
    const deleteRow = (rowId) => {
      if (!isReviseStarted) return;
      setRows(prev => prev.filter(r => r.id !== rowId));
    };
    
    const cellStyle = {
      border: '1px solid #d1d5db',
      padding: '1px 3px',
      fontSize: '10px',
      fontFamily: 'Consolas, Monaco, monospace',
      outline: 'none',
      background: '#fff',
      width: '100%',
      boxSizing: 'border-box'
    };
    
    return (
      <Box sx={{ 
        position: 'fixed', 
        top: 0, 
        left: 0, 
        right: 0, 
        bottom: 0, 
        bgcolor: '#f8fafc', 
        zIndex: 9999,
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden'
      }}>
        {/* Mini Header */}
        <Box sx={{ 
          display: 'flex', 
          alignItems: 'center', 
          gap: 1, 
          px: 1, 
          py: 0.5, 
          bgcolor: quickTab === 'yerli' ? '#d1fae5' : '#fef3c7',
          borderBottom: '1px solid #e5e7eb',
          flexShrink: 0
        }}>
          <FlashOnIcon sx={{ fontSize: 14, color: quickTab === 'yerli' ? '#059669' : '#d97706' }} />
          <Typography sx={{ fontSize: '11px', fontWeight: 700, color: quickTab === 'yerli' ? '#065f46' : '#92400e' }}>
            HIZLI MOD
          </Typography>
          
          {/* Yerli/İthal Toggle */}
          <Button 
            size="small" 
            variant={quickTab === 'yerli' ? 'contained' : 'outlined'}
            onClick={() => setQuickTab('yerli')}
            sx={{ fontSize: '10px', py: 0.25, px: 1, minWidth: 50, bgcolor: quickTab === 'yerli' ? '#10b981' : 'transparent' }}
          >
            Yerli ({yerliRows.length})
          </Button>
          <Button 
            size="small" 
            variant={quickTab === 'ithal' ? 'contained' : 'outlined'}
            onClick={() => setQuickTab('ithal')}
            sx={{ fontSize: '10px', py: 0.25, px: 1, minWidth: 50, bgcolor: quickTab === 'ithal' ? '#f59e0b' : 'transparent' }}
          >
            İthal ({ithalRows.length})
          </Button>
          
          <Divider orientation="vertical" flexItem />
          
          {/* Satır Ekle */}
          <Button size="small" onClick={() => addRows(1)} disabled={!isReviseStarted} sx={{ fontSize: '10px', py: 0.25, px: 0.5, minWidth: 28 }}>+1</Button>
          <Button size="small" onClick={() => addRows(10)} disabled={!isReviseStarted} sx={{ fontSize: '10px', py: 0.25, px: 0.5, minWidth: 32 }}>+10</Button>
          <Button size="small" onClick={() => addRows(50)} disabled={!isReviseStarted} sx={{ fontSize: '10px', py: 0.25, px: 0.5, minWidth: 32 }}>+50</Button>
          
          <Box sx={{ flex: 1 }} />
          
          <Typography sx={{ fontSize: '10px', color: '#64748b' }}>
            {rows.length} satır | Toplam: {quickTab === 'yerli' ? yerliToplamTl.toLocaleString('tr-TR') + ' ₺' : ithalToplamUsd.toLocaleString('en-US') + ' $'}
          </Typography>
          
          {/* Kapat */}
          <Button 
            size="small" 
            variant="outlined"
            onClick={() => setViewMode('standard')}
            sx={{ fontSize: '10px', py: 0.25, px: 1, color: '#ef4444', borderColor: '#ef4444' }}
          >
            ✕ Kapat
          </Button>
        </Box>
        
        {/* Grid Container */}
        <Box 
          ref={gridRef}
          onPaste={handlePaste}
          sx={{ 
            flex: 1, 
            overflow: 'auto',
            '&::-webkit-scrollbar': { width: 8, height: 8 },
            '&::-webkit-scrollbar-thumb': { bgcolor: '#94a3b8', borderRadius: 4 }
          }}
        >
          <table style={{ borderCollapse: 'collapse', width: 'max-content', fontSize: '10px', fontFamily: 'Consolas, Monaco, monospace' }}>
            {/* Header */}
            <thead>
              <tr style={{ position: 'sticky', top: 0, background: quickTab === 'yerli' ? '#d1fae5' : '#fef3c7', zIndex: 10 }}>
                <th style={{ border: '1px solid #9ca3af', padding: '2px 4px', fontSize: '9px', fontWeight: 700, minWidth: 20, background: 'inherit' }}>X</th>
                {cols.map(col => (
                  <th 
                    key={col.key} 
                    style={{ 
                      border: '1px solid #9ca3af', 
                      padding: '2px 4px', 
                      fontSize: '9px', 
                      fontWeight: 700, 
                      minWidth: col.w, 
                      maxWidth: col.flex ? 300 : col.w,
                      background: 'inherit',
                      whiteSpace: 'nowrap'
                    }}
                  >
                    {col.label}
                  </th>
                ))}
              </tr>
            </thead>
            {/* Body */}
            <tbody>
              {rows.map((row, rowIdx) => (
                <tr key={row.id} style={{ background: rowIdx % 2 === 0 ? '#fff' : '#f9fafb' }}>
                  <td style={{ border: '1px solid #e5e7eb', padding: '1px', textAlign: 'center' }}>
                    <button 
                      onClick={() => deleteRow(row.id)} 
                      disabled={!isReviseStarted}
                      style={{ fontSize: '9px', cursor: 'pointer', border: 'none', background: 'none', color: '#ef4444', padding: 0 }}
                    >
                      ×
                    </button>
                  </td>
                  {cols.map((col, colIdx) => {
                    // Değer al (özel getValue fonksiyonu varsa kullan)
                    const rawVal = col.getValue ? col.getValue(row) : row[col.key];
                    const val = rawVal;
                    const displayVal = col.type === 'number' && val != null ? val : (val ?? '');
                    // E/H kısaltma
                    let shortVal = displayVal;
                    if (displayVal === 'EVET') shortVal = 'E';
                    else if (displayVal === 'HAYIR') shortVal = 'H';
                    else if (displayVal === 'Ana Makine') shortVal = 'A';
                    else if (displayVal === 'Yardımcı Makine') shortVal = 'Y';
                    
                    // Date formatting
                    if (col.type === 'date' && rawVal) {
                      try {
                        const d = new Date(rawVal);
                        shortVal = d.toLocaleDateString('tr-TR', { day: '2-digit', month: '2-digit', year: '2-digit' });
                      } catch { shortVal = ''; }
                    }
                    
                    return (
                      <td key={col.key} style={{ border: '1px solid #e5e7eb', padding: 0, minWidth: col.w, maxWidth: col.flex ? 300 : col.w }}>
                        {col.computed ? (
                          <span style={{ 
                            display: 'block', 
                            padding: '1px 3px', 
                            fontSize: '10px', 
                            fontFamily: 'Consolas, Monaco, monospace',
                            textAlign: 'right',
                            color: '#059669',
                            fontWeight: 600
                          }}>
                            {typeof displayVal === 'number' ? displayVal.toLocaleString('tr-TR') : displayVal}
                          </span>
                        ) : col.type === 'display' ? (
                          <span style={{ 
                            display: 'block', 
                            padding: '1px 3px', 
                            fontSize: '10px', 
                            fontFamily: 'Consolas, Monaco, monospace',
                            textAlign: 'center',
                            color: '#6b7280'
                          }}>
                            {col.render ? col.render(row) : displayVal}
                          </span>
                        ) : col.type === 'checkbox' ? (
                          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
                            <input
                              type="checkbox"
                              checked={!!row[col.key]}
                              onChange={(e) => updater(row.id, { [col.key]: e.target.checked })}
                              disabled={!isReviseStarted}
                              style={{ width: 12, height: 12, cursor: isReviseStarted ? 'pointer' : 'default' }}
                            />
                          </div>
                        ) : col.type === 'date' ? (
                          <span style={{ 
                            display: 'block', 
                            padding: '1px 2px', 
                            fontSize: '9px', 
                            fontFamily: 'Consolas, Monaco, monospace',
                            textAlign: 'center',
                            color: '#374151'
                          }}>
                            {shortVal}
                          </span>
                        ) : col.options ? (
                          <select
                            data-row={rowIdx}
                            data-col={colIdx}
                            value={shortVal}
                            onChange={(e) => updateCell(row.id, col.key, e.target.value)}
                            onKeyDown={(e) => handleKeyDown(e, rowIdx, colIdx)}
                            disabled={!isReviseStarted}
                            style={{ ...cellStyle, textAlign: 'center' }}
                          >
                            {col.options.map(opt => <option key={opt} value={opt}>{opt || '-'}</option>)}
                          </select>
                        ) : (
                          <input
                            data-row={rowIdx}
                            data-col={colIdx}
                            type="text"
                            value={shortVal}
                            onChange={(e) => updateCell(row.id, col.key, e.target.value)}
                            onKeyDown={(e) => handleKeyDown(e, rowIdx, colIdx)}
                            disabled={!isReviseStarted}
                            style={{ ...cellStyle, textAlign: col.type === 'number' ? 'right' : 'left' }}
                          />
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
              {/* Boş satır eklemek için */}
              {rows.length === 0 && (
                <tr>
                  <td colSpan={cols.length + 1} style={{ textAlign: 'center', padding: 20, color: '#94a3b8' }}>
                    Veri yok. {isReviseStarted ? 'Yukarıdaki butonlarla satır ekleyin.' : 'Önce Revize başlatın.'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </Box>
        
        {/* Footer Info */}
        <Box sx={{ px: 1, py: 0.5, bgcolor: '#f1f5f9', borderTop: '1px solid #e5e7eb', fontSize: '9px', color: '#64748b', display: 'flex', gap: 2 }}>
          <span>Tab/Enter: Sonraki hücre</span>
          <span>Ok tuşları: Navigasyon</span>
          <span>Ctrl+V: Excel'den yapıştır</span>
          <span>E=Evet, H=Hayır, A=Ana, Y=Yardımcı</span>
        </Box>
      </Box>
    );
  });

  // 🎨 PREMIUM ENTERPRISE THEME - Modern & Professional
  const theme = {
    // Primary colors
    primary: '#0f172a',
    primaryLight: '#1e293b',
    accent: '#3b82f6',
    accentLight: '#60a5fa',
    accentGlow: 'rgba(59, 130, 246, 0.15)',
    
    // Backgrounds
    bg: 'linear-gradient(135deg, #f8fafc 0%, #f1f5f9 50%, #e2e8f0 100%)',
    bgSolid: '#f8fafc',
    card: '#ffffff',
    cardHover: '#fafbff',
    
    // Borders & Shadows
    border: '#e2e8f0',
    borderLight: '#f1f5f9',
    shadow: '0 1px 3px rgba(15, 23, 42, 0.04), 0 4px 12px rgba(15, 23, 42, 0.06)',
    shadowHover: '0 4px 16px rgba(15, 23, 42, 0.08), 0 8px 24px rgba(15, 23, 42, 0.12)',
    shadowInner: 'inset 0 1px 2px rgba(15, 23, 42, 0.05)',
    
    // Text
    text: { 
      primary: '#0f172a', 
      secondary: '#475569', 
      muted: '#94a3b8',
      light: '#cbd5e1'
    },
    
    // Status colors
    success: '#10b981',
    successLight: '#d1fae5',
    successDark: '#059669',
    warning: '#f59e0b',
    warningLight: '#fef3c7',
    warningDark: '#d97706',
    error: '#ef4444',
    errorLight: '#fee2e2',
    errorDark: '#dc2626',
    info: '#06b6d4',
    infoLight: '#cffafe',
    
    // Gradients
    gradientPrimary: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
    gradientAccent: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
    gradientSuccess: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
    gradientWarning: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
    gradientError: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
    gradientSubtle: 'linear-gradient(180deg, #ffffff 0%, #f8fafc 100%)',
    
    // Special
    yerli: { bg: '#10b981', light: '#d1fae5', text: '#065f46' },
    ithal: { bg: '#f59e0b', light: '#fef3c7', text: '#92400e' }
  };

  return (
    <Box sx={{ 
      background: theme.bg, 
      height: '100vh',
      maxHeight: '100vh',
      overflow: 'hidden',
      display: 'flex',
      flexDirection: 'column',
      p: { xs: 0.5, sm: 1, md: 1.5 }
    }}>
      {/* 🏢 CLEAN MINIMAL HEADER */}
      <Box sx={{ 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'space-between',
        mb: 1,
        pb: 1,
        flexShrink: 0,
        borderBottom: `1px solid ${theme.border}`
      }}>
        {/* Left - Navigation & Title */}
        <Stack direction="row" alignItems="center" spacing={1.5}>
          <Stack direction="row" spacing={0.5}>
            <IconButton 
              size="small" 
              onClick={() => navigate('/')} 
              sx={{ 
                color: theme.text.muted, 
                '&:hover': { color: theme.accent, bgcolor: theme.accentGlow },
                transition: 'all 0.2s'
              }}
            >
              <HomeIcon sx={{ fontSize: 18 }} />
            </IconButton>
            <IconButton 
              size="small" 
              onClick={() => navigate('/yeni-tesvik')} 
              sx={{ 
                color: theme.text.muted, 
                '&:hover': { color: theme.accent, bgcolor: theme.accentGlow },
                transition: 'all 0.2s'
              }}
            >
              <ArrowBackIcon sx={{ fontSize: 18 }} />
            </IconButton>
          </Stack>
          
          <Divider orientation="vertical" flexItem />
          
          <Stack direction="row" alignItems="center" spacing={1.5}>
            <Box sx={{ 
              width: 36, 
              height: 36, 
              borderRadius: 1.5, 
              background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 2px 8px rgba(59, 130, 246, 0.25)'
            }}>
              <BuildIcon sx={{ fontSize: 20, color: '#fff' }} />
            </Box>
            <Box>
              <Typography sx={{ color: theme.text.primary, fontWeight: 700, fontSize: '1rem', lineHeight: 1.2, letterSpacing: '-0.01em' }}>
                Makine Teçhizat Yönetimi
              </Typography>
              <Typography sx={{ color: theme.text.muted, fontSize: '0.7rem', fontWeight: 500 }}>
                Yeni Teşvik Sistemi
              </Typography>
            </Box>
            {isReviseMode && (
              <Chip 
                label="REVİZE MODU" 
                size="small" 
                sx={{ 
                  bgcolor: theme.warningLight,
                  color: theme.warningDark,
                  fontSize: '0.6rem', 
                  height: 22,
                  fontWeight: 700,
                  border: `1px solid ${theme.warning}`,
                  '& .MuiChip-label': { px: 1 }
                }} 
              />
            )}
          </Stack>
        </Stack>
        
        {/* Right - Summary Stats */}
        <Stack direction="row" spacing={1} alignItems="center">
          <Box sx={{ 
            bgcolor: theme.successLight,
            border: `1px solid ${theme.success}30`,
            px: 1.5, 
            py: 0.5, 
            borderRadius: 1.5
          }}>
            <Typography sx={{ color: theme.successDark, fontWeight: 700, fontSize: '0.8rem' }}>
              Yerli: {yerliToplamTl.toLocaleString('tr-TR')} ₺
            </Typography>
          </Box>
          <Box sx={{ 
            bgcolor: theme.warningLight,
            border: `1px solid ${theme.warning}30`,
            px: 1.5, 
            py: 0.5, 
            borderRadius: 1.5
          }}>
            <Typography sx={{ color: theme.warningDark, fontWeight: 700, fontSize: '0.8rem' }}>
              İthal: {ithalToplamUsd.toLocaleString('en-US')} $
            </Typography>
          </Box>
        </Stack>
      </Box>

      {/* 📋 BELGE SEÇİMİ - Premium Card */}
      <Paper 
        elevation={0} 
        sx={{ 
          p: 1, 
          mb: 1, 
          flexShrink: 0,
          border: `1px solid ${theme.border}`,
          borderRadius: 2,
          bgcolor: theme.card,
          boxShadow: theme.shadow,
          transition: 'all 0.2s ease',
          '&:hover': { boxShadow: theme.shadowHover }
        }}
      >
        <Stack direction="row" spacing={2} alignItems="center">
          <Box sx={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: 1,
            px: 1.5,
            py: 0.75,
            borderRadius: 1,
            bgcolor: theme.accentGlow,
            border: `1px solid ${theme.accent}20`
          }}>
            <Typography sx={{ color: theme.text.secondary, fontWeight: 600, fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Belge
            </Typography>
          </Box>
          <Autocomplete
            options={tesvikOptions}
            size="small"
            sx={{ 
              flex: 1, 
              maxWidth: 450,
              '& .MuiOutlinedInput-root': {
                borderRadius: 1.5,
                bgcolor: '#fff',
                transition: 'all 0.2s',
                '&:hover': { boxShadow: '0 2px 8px rgba(59, 130, 246, 0.1)' },
                '&.Mui-focused': { boxShadow: '0 0 0 3px rgba(59, 130, 246, 0.1)' }
              }
            }}
            getOptionLabel={(o)=> o?.tesvikId || o?.gmId || o?.yatirimciUnvan || ''}
            isOptionEqualToValue={(o, v)=> (o?._id || o?.id) === (v?._id || v?.id)}
            filterOptions={(x)=>x}
            openOnFocus
            onInputChange={(e, val)=> searchTesvik(val)}
            value={selectedTesvik}
            onChange={(e, val)=> { setSelectedTesvik(val); loadTesvikMakineListeleri(val?._id); }}
            renderInput={(params)=> <TextField {...params} placeholder="Teşvik ara..." size="small" sx={{ '& .MuiInputBase-root': { fontSize: '0.75rem', py: 0 } }} />}
            loading={loadingTesvik}
            renderOption={(props, option)=> (
              <li {...props} key={option._id} style={{ fontSize: '0.75rem', padding: '6px 12px', borderBottom: '1px solid #f1f5f9' }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Chip label={option.tesvikId || option.gmId} size="small" sx={{ fontSize: '0.65rem', height: 20, bgcolor: theme.accentGlow, color: theme.accent, fontWeight: 600 }} />
                  <span style={{ color: '#64748b' }}>{option.yatirimciUnvan || ''}</span>
                </Box>
              </li>
            )}
          />
          <Divider orientation="vertical" flexItem sx={{ borderColor: theme.border }} />
          <Stack direction="row" spacing={0.5}>
            <Tooltip title="Excel İndir" arrow>
              <span>
                <IconButton 
                  size="small" 
                  disabled={!selectedTesvik} 
                  onClick={()=> yeniTesvikService.exportMakineExcel(selectedTesvik._id).then((res)=>{
                    const blob = new Blob([res.data], { type: res.headers['content-type'] });
                    const url = window.URL.createObjectURL(blob);
                    const a = document.createElement('a'); a.href = url; a.download = `tesvik_${selectedTesvik?.tesvikId}_makine.xlsx`; a.click();
                  })}
                  sx={{ 
                    color: theme.success,
                    '&:hover': { bgcolor: theme.successLight }
                  }}
                >
                  <ExportIcon sx={{ fontSize: 18 }} />
                </IconButton>
              </span>
            </Tooltip>
            <Tooltip title="Listeyi Temizle" arrow>
              <span>
                <IconButton 
                  size="small" 
                  disabled={!selectedTesvik} 
                  onClick={()=> setYerliRows([]) || setIthalRows([])}
                  sx={{ 
                    color: theme.error,
                    '&:hover': { bgcolor: theme.errorLight }
                  }}
                >
                  <DeleteIcon sx={{ fontSize: 18 }} />
                </IconButton>
              </span>
            </Tooltip>
          </Stack>
        </Stack>
      </Paper>

      {/* 🔧 ANA ÇALIŞMA ALANI - Premium Workspace */}
      <Paper 
        elevation={0} 
        sx={{ 
          border: `1px solid ${theme.border}`,
          borderRadius: 2,
          bgcolor: theme.card,
          position: fullScreen ? 'fixed' : 'relative', 
          inset: fullScreen ? 0 : 'auto', 
          zIndex: fullScreen ? 1300 : 'auto', 
          flex: fullScreen ? 'none' : 1,
          height: fullScreen ? '100vh' : 'auto',
          minHeight: 0,
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: theme.shadow,
          transition: 'box-shadow 0.3s ease'
        }}
      >
        {/* Toolbar - Premium */}
        <Box sx={{ 
          display: 'flex', 
          alignItems: 'center', 
          px: 1.5, 
          py: 0.75, 
          background: theme.gradientSubtle,
          borderBottom: `1px solid ${theme.border}`,
          gap: 1
        }}>
          {/* Premium Tabs */}
          <Box sx={{ 
            display: 'flex', 
            gap: 0.5,
            p: 0.5,
            bgcolor: '#f1f5f9',
            borderRadius: 1.5
          }}>
            <Button 
              size="small" 
              onClick={()=>setTab('yerli')}
              sx={{ 
                minWidth: 'auto', 
                px: 2, 
                py: 0.5,
                fontSize: '0.7rem',
                fontWeight: 600,
                color: tab === 'yerli' ? '#fff' : theme.text.secondary,
                background: tab === 'yerli' ? theme.gradientSuccess : 'transparent',
                borderRadius: 1,
                boxShadow: tab === 'yerli' ? '0 2px 8px rgba(16, 185, 129, 0.3)' : 'none',
                transition: 'all 0.2s ease',
                '&:hover': { 
                  background: tab === 'yerli' ? theme.gradientSuccess : 'rgba(16, 185, 129, 0.1)',
                  transform: 'translateY(-1px)'
                }
              }}
            >
              Yerli ({yerliRows.length})
            </Button>
            <Button 
              size="small"
              onClick={()=>setTab('ithal')}
              sx={{ 
                minWidth: 'auto', 
                px: 2, 
                py: 0.5,
                fontSize: '0.7rem',
                fontWeight: 600,
                color: tab === 'ithal' ? '#fff' : theme.text.secondary,
                background: tab === 'ithal' ? theme.gradientWarning : 'transparent',
                borderRadius: 1,
                boxShadow: tab === 'ithal' ? '0 2px 8px rgba(245, 158, 11, 0.3)' : 'none',
                transition: 'all 0.2s ease',
                '&:hover': { 
                  background: tab === 'ithal' ? theme.gradientWarning : 'rgba(245, 158, 11, 0.1)',
                  transform: 'translateY(-1px)'
                }
              }}
            >
              İthal ({ithalRows.length})
            </Button>
          </Box>

          <Divider orientation="vertical" flexItem sx={{ borderColor: theme.border, mx: 0.5 }} />

          {/* 🚀 ENTERPRISE: Mod Değiştirme Toggle */}
          <Tooltip title={viewMode === 'standard' ? 'Hızlı Yönetim Moduna Geç (1000+ satır için optimize)' : 'Standart Moda Geç (detaylı görünüm)'} arrow>
            <ToggleButtonGroup
              value={viewMode}
              exclusive
              onChange={(e, newMode) => newMode && setViewMode(newMode)}
              size="small"
              sx={{
                '& .MuiToggleButton-root': {
                  py: 0.25,
                  px: 1,
                  fontSize: '0.65rem',
                  fontWeight: 600,
                  textTransform: 'none',
                  border: `1px solid ${theme.border}`,
                  '&.Mui-selected': {
                    bgcolor: theme.accentGlow,
                    color: theme.accent,
                    borderColor: theme.accent,
                    '&:hover': { bgcolor: theme.accentGlow }
                  }
                }
              }}
            >
              <ToggleButton value="standard">
                <ViewListIcon sx={{ fontSize: 14, mr: 0.5 }} />
                Standart
              </ToggleButton>
              <ToggleButton value="quick">
                <FlashOnIcon sx={{ fontSize: 14, mr: 0.5 }} />
                Hızlı
              </ToggleButton>
            </ToggleButtonGroup>
          </Tooltip>

          <Divider orientation="vertical" flexItem sx={{ borderColor: theme.border, mx: 0.5 }} />

          {/* Search - Enhanced */}
          <TextField 
            size="small" 
            placeholder="Ara..." 
            value={filterText} 
            onChange={(e)=> setFilterText(e.target.value)} 
            sx={{ 
              width: 160,
              '& .MuiInputBase-root': { 
                fontSize: '0.7rem', 
                height: 28, 
                bgcolor: '#fff',
                borderRadius: 1.5,
                transition: 'all 0.2s',
                '&:hover': { boxShadow: '0 2px 8px rgba(0,0,0,0.06)' },
                '&.Mui-focused': { boxShadow: '0 0 0 3px rgba(59, 130, 246, 0.1)' }
              },
              '& .MuiOutlinedInput-notchedOutline': { borderColor: theme.border }
            }} 
          />

          {/* 🚀 ENTERPRISE: Auto-save Status Indicator */}
          {isReviseStarted && (
            <Box sx={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: 0.5,
              px: 1,
              py: 0.25,
              borderRadius: 1,
              bgcolor: syncStatus === 'syncing' ? 'rgba(59, 130, 246, 0.1)' : 
                       syncStatus === 'synced' ? 'rgba(16, 185, 129, 0.1)' : 
                       syncStatus === 'error' ? 'rgba(239, 68, 68, 0.1)' : 
                       hasUnsavedChanges ? 'rgba(245, 158, 11, 0.1)' : 'transparent',
              transition: 'all 0.3s ease'
            }}>
              <Box sx={{ 
                width: 6, 
                height: 6, 
                borderRadius: '50%',
                bgcolor: syncStatus === 'syncing' ? '#3b82f6' : 
                         syncStatus === 'synced' ? '#10b981' : 
                         syncStatus === 'error' ? '#ef4444' : 
                         hasUnsavedChanges ? '#f59e0b' : '#94a3b8',
                animation: syncStatus === 'syncing' ? 'pulse 1s infinite' : 'none',
                '@keyframes pulse': {
                  '0%, 100%': { opacity: 1 },
                  '50%': { opacity: 0.4 }
                }
              }} />
              <Typography variant="caption" sx={{ 
                fontSize: '0.6rem', 
                color: syncStatus === 'syncing' ? '#3b82f6' : 
                       syncStatus === 'synced' ? '#10b981' : 
                       syncStatus === 'error' ? '#ef4444' : 
                       hasUnsavedChanges ? '#f59e0b' : '#94a3b8',
                fontWeight: 500
              }}>
                {syncStatus === 'syncing' ? 'Kaydediliyor...' : 
                 syncStatus === 'synced' ? 'Kaydedildi' : 
                 syncStatus === 'error' ? 'Hata!' : 
                 hasUnsavedChanges ? 'Değişiklik var' : 
                 lastSaved ? `Son: ${lastSaved.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}` : ''}
              </Typography>
            </Box>
          )}

          {/* 🚀 ENTERPRISE: Batch Actions (seçim varsa) */}
          {selectionModel.length > 0 && isReviseStarted && (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
              <Chip 
                label={`${selectionModel.length} seçili`} 
                size="small" 
                sx={{ 
                  fontSize: '0.6rem', 
                  height: 20, 
                  bgcolor: theme.accentGlow, 
                  color: theme.accent,
                  fontWeight: 600
                }} 
              />
              <Tooltip title="Toplu Düzenle" arrow>
                <IconButton 
                  size="small" 
                  onClick={() => setBatchEditOpen(true)}
                  sx={{ color: theme.accent, '&:hover': { bgcolor: theme.accentGlow } }}
                >
                  <BuildIcon sx={{ fontSize: 14 }} />
                </IconButton>
              </Tooltip>
              <Tooltip title="Seçilenleri Sil" arrow>
                <IconButton 
                  size="small" 
                  onClick={() => {
                    if (window.confirm(`${selectionModel.length} satırı silmek istediğinize emin misiniz?`)) {
                      selectionModel.forEach(id => delRow(id));
                      setSelectionModel([]);
                    }
                  }}
                  sx={{ color: theme.error, '&:hover': { bgcolor: theme.errorLight } }}
                >
                  <DeleteIcon sx={{ fontSize: 14 }} />
                </IconButton>
              </Tooltip>
            </Box>
          )}

          <Box sx={{ flex: 1 }} />

          {/* 🚀 ENTERPRISE: Manual Save Button */}
          {isReviseStarted && (
            <Tooltip title={hasUnsavedChanges ? "Şimdi Kaydet (Ctrl+S)" : "Tüm değişiklikler kaydedildi"} arrow>
              <span>
                <IconButton 
                  size="small" 
                  onClick={autoSaveToDb}
                  disabled={!hasUnsavedChanges || isSaving}
                  sx={{ 
                    color: hasUnsavedChanges ? theme.accent : '#94a3b8',
                    '&:hover': { color: theme.accent, bgcolor: theme.accentGlow },
                    transition: 'all 0.2s'
                  }}
                >
                  {isSaving ? (
                    <Box sx={{ 
                      width: 16, 
                      height: 16, 
                      border: '2px solid', 
                      borderColor: `${theme.accent} transparent transparent transparent`,
                      borderRadius: '50%',
                      animation: 'spin 1s linear infinite',
                      '@keyframes spin': { '100%': { transform: 'rotate(360deg)' } }
                    }} />
                  ) : (
                    <CheckIcon sx={{ fontSize: 16 }} />
                  )}
                </IconButton>
              </span>
            </Tooltip>
          )}

          {/* 🚀 ENTERPRISE: Quick Stats Button */}
          <Tooltip title="Hızlı İstatistikler (Ctrl+I)" arrow>
            <IconButton 
              size="small" 
              onClick={() => setQuickStatsOpen(true)}
              sx={{ color: theme.text.secondary, '&:hover': { color: theme.accent } }}
            >
              <TableViewIcon sx={{ fontSize: 16 }} />
            </IconButton>
          </Tooltip>

          <Divider orientation="vertical" flexItem sx={{ borderColor: theme.border, mx: 0.5 }} />

          {/* Revize Actions - Premium */}
          <Stack direction="row" spacing={0.5} alignItems="center">
            {!isReviseStarted ? (
              <Button 
                size="small" 
                variant="outlined"
                disabled={!selectedTesvik} 
                onClick={async()=>{
                  if (!selectedTesvik?._id) return;
                  const ok = window.confirm('Revize başlat?');
                  if (!ok) return;
                  try {
                    await yeniTesvikService.startMakineRevizyon(selectedTesvik._id, { aciklama: 'Yeni revize' });
                    setIsReviseMode(true); setIsReviseStarted(true);
                    const list = await yeniTesvikService.listMakineRevizyonlari(selectedTesvik._id); setRevList(list.reverse());
                    openToast('success', 'Revize başladı');
                  } catch (e) { openToast('error', 'Hata'); }
                }}
                sx={{ 
                  fontSize: '0.68rem',
                  py: 0.5,
                  px: 1.5,
                  borderRadius: 1.5,
                  fontWeight: 600,
                  color: theme.accent,
                  borderColor: theme.accent,
                  '&:hover': { 
                    bgcolor: theme.accentGlow,
                    borderColor: theme.accent
                  }
                }}
              >
                Revize
              </Button>
            ) : (
              <>
                <Button 
                  size="small" 
                  disabled={!selectedTesvik} 
                  onClick={async()=>{
                    const ok = window.confirm('Revize bitir?');
                    if (!ok) return;
                    try {
                      const payload = {
                        yerli: yerliRows.map(r=>({ siraNo:r.siraNo, makineId:r.makineId, rowId:r.rowId, gtipKodu:r.gtipKodu, gtipAciklamasi:r.gtipAciklama, adiVeOzelligi:r.adi, miktar:r.miktar, birim:r.birim, birimAciklamasi:r.birimAciklamasi, birimFiyatiTl:r.birimFiyatiTl, toplamTutariTl:r.toplamTl, kdvIstisnasi:r.kdvIstisnasi, makineTechizatTipi:r.makineTechizatTipi, finansalKiralamaMi:r.finansalKiralamaMi, finansalKiralamaAdet:r.finansalKiralamaAdet, finansalKiralamaSirket:r.finansalKiralamaSirket, gerceklesenAdet:r.gerceklesenAdet, gerceklesenTutar:r.gerceklesenTutar, iadeDevirSatisVarMi:r.iadeDevirSatisVarMi, iadeDevirSatisAdet:r.iadeDevirSatisAdet, iadeDevirSatisTutar:r.iadeDevirSatisTutar, silinmeTarihi:r.silinmeTarihi, talep:r.talep, karar:r.karar })),
                        ithal: ithalRows.map(r=>({ siraNo:r.siraNo, makineId:r.makineId, rowId:r.rowId, gtipKodu:r.gtipKodu, gtipAciklamasi:r.gtipAciklama, adiVeOzelligi:r.adi, miktar:r.miktar, birim:r.birim, birimAciklamasi:r.birimAciklamasi, birimFiyatiFob:r.birimFiyatiFob, gumrukDovizKodu:r.doviz, toplamTutarFobUsd:r.toplamUsd, toplamTutarFobTl:r.toplamTl, kurManuel:r.kurManuel, kurManuelDeger:r.kurManuelDeger, kullanilmisMakine:r.kullanilmisKod, kullanilmisMakineAciklama:r.kullanilmisAciklama, ckdSkdMi:r.ckdSkd, aracMi:r.aracMi, makineTechizatTipi:r.makineTechizatTipi, kdvMuafiyeti:r.kdvMuafiyeti, gumrukVergisiMuafiyeti:r.gumrukVergisiMuafiyeti, finansalKiralamaMi:r.finansalKiralamaMi, finansalKiralamaAdet:r.finansalKiralamaAdet, finansalKiralamaSirket:r.finansalKiralamaSirket, gerceklesenAdet:r.gerceklesenAdet, gerceklesenTutar:r.gerceklesenTutar, iadeDevirSatisVarMi:r.iadeDevirSatisVarMi, iadeDevirSatisAdet:r.iadeDevirSatisAdet, iadeDevirSatisTutar:r.iadeDevirSatisTutar, silinmeTarihi:r.silinmeTarihi, talep:r.talep, karar:r.karar }))
                      };
                      await yeniTesvikService.saveMakineListeleri(selectedTesvik._id, payload);
                      await yeniTesvikService.finalizeMakineRevizyon(selectedTesvik._id, { aciklama: 'Finalize' });
                      setIsReviseMode(false); setIsReviseStarted(false);
                      openToast('success', 'Revize tamamlandı');
                    } catch { openToast('error', 'Hata'); }
                  }} 
                  sx={{ 
                    fontSize: '0.68rem',
                    py: 0.5,
                    px: 1.5,
                    borderRadius: 1.5,
                    fontWeight: 600,
                    color: '#fff',
                    background: theme.gradientSuccess,
                    boxShadow: '0 2px 8px rgba(16, 185, 129, 0.3)',
                    '&:hover': { 
                      background: theme.gradientSuccess,
                      transform: 'translateY(-1px)',
                      boxShadow: '0 4px 12px rgba(16, 185, 129, 0.4)'
                    }
                  }}
                >
                  Bitir
                </Button>
                <Button 
                  size="small" 
                  onClick={()=>{ setIsReviseMode(false); setIsReviseStarted(false); if(selectedTesvik) loadMakineData(selectedTesvik._id); openToast('info','Vazgeçildi'); }} 
                  sx={{ 
                    fontSize: '0.68rem',
                    py: 0.5,
                    px: 1.5,
                    borderRadius: 1.5,
                    fontWeight: 600,
                    color: theme.warning,
                    border: `1px solid ${theme.warning}`,
                    '&:hover': { 
                      bgcolor: theme.warningLight
                    }
                  }}
                >
                  İptal
                </Button>
              </>
            )}
          </Stack>

          <Divider orientation="vertical" flexItem sx={{ borderColor: theme.border, mx: 0.5 }} />

          {/* Action Icons - Premium Toolbar */}
          <Stack 
            direction="row" 
            spacing={0.25}
            sx={{ 
              bgcolor: '#f8fafc',
              borderRadius: 1.5,
              p: 0.5,
              '& .MuiIconButton-root': { 
                p: 0.75,
                borderRadius: 1,
                transition: 'all 0.2s ease',
                '&:hover': { 
                  bgcolor: theme.accentGlow,
                  transform: 'scale(1.05)'
                }
              }
            }}
          >
            <Tooltip title="Satır Ekle" arrow><span>
              <IconButton size="small" onClick={addRow} disabled={!isReviseStarted} sx={{ color: theme.success }}>
                <AddIcon sx={{ fontSize: 17 }}/>
              </IconButton>
            </span></Tooltip>
            <Tooltip title="Kur Hesapla" arrow><span>
              <IconButton size="small" onClick={recalcIthalTotals} disabled={tab!=='ithal'} sx={{ color: theme.info }}>
                <RecalcIcon sx={{ fontSize: 17 }}/>
              </IconButton>
            </span></Tooltip>
            <Tooltip title="İçe Aktar" arrow>
              <label>
                <input type="file" accept=".xlsx" hidden onChange={(e)=>{const f=e.target.files?.[0]; if(f) importExcel(f); e.target.value='';}} />
                <IconButton component="span" size="small" sx={{ color: theme.accent }}>
                  <ImportIcon sx={{ fontSize: 17 }}/>
                </IconButton>
              </label>
            </Tooltip>
            <Tooltip title="Dışa Aktar" arrow>
              <IconButton size="small" onClick={exportExcel} sx={{ color: theme.success }}>
                <ExportIcon sx={{ fontSize: 17 }}/>
              </IconButton>
            </Tooltip>
            <Divider orientation="vertical" flexItem sx={{ mx: 0.5, borderColor: theme.border }} />
            <Tooltip title="Sütunlar" arrow>
              <IconButton size="small" onClick={(e)=> setColumnsAnchor(e.currentTarget)} sx={{ color: theme.text.secondary }}>
                <ViewColumnIcon sx={{ fontSize: 17 }}/>
              </IconButton>
            </Tooltip>
            <Tooltip title="Tam Ekran" arrow>
              <IconButton size="small" onClick={()=> setFullScreen(v=>!v)} sx={{ color: theme.text.secondary }}>
                {fullScreen ? <FullscreenExitIcon sx={{ fontSize: 17 }}/> : <FullscreenIcon sx={{ fontSize: 17 }}/>}
              </IconButton>
            </Tooltip>
            <Tooltip title="Eski Revize" arrow><span>
              <IconButton size="small" disabled={!selectedTesvik} onClick={()=> setRevertOpen(true)} sx={{ color: theme.warning }}>
                <RestoreIcon sx={{ fontSize: 17 }}/>
              </IconButton>
            </span></Tooltip>
            <Tooltip title="Toplu İşlem" arrow>
              <IconButton size="small" onClick={(e)=> setBulkMenuAnchor(e.currentTarget)} sx={{ color: theme.text.secondary }}>
                <MoreIcon sx={{ fontSize: 17 }}/>
              </IconButton>
            </Tooltip>
          </Stack>
        </Box>

        {/* DataGrid Area - Premium Container */}
        <Box sx={{ 
          flex: 1, 
          minHeight: 0,
          overflow: 'hidden', 
          p: 1,
          display: 'flex',
          flexDirection: 'column',
          background: 'linear-gradient(180deg, #fafbfc 0%, #f8fafc 100%)'
        }}>
          <Box sx={{ flex: 1, minHeight: 0, width: '100%', display: 'flex', flexDirection: 'column' }}>
            {/* Grid - Standart mod */}
            <Box sx={{ flex: 1, minHeight: 0 }}>
              {tab === 'yerli' ? <YerliGrid/> : <IthalGrid/>}
            </Box>
          </Box>
          
          {/* 🚀 Hızlı Mod - Tam Ekran Excel Grid */}
          {viewMode === 'quick' && <QuickExcelGrid />}
          
        </Box>
        
        {/* Progress Indicator for Bulk Operations */}
        {bulkProgress.active && (
          <Box sx={{ 
            position: 'absolute', 
            bottom: 0, 
            left: 0, 
            right: 0, 
            bgcolor: 'rgba(255,255,255,0.95)',
            borderTop: `1px solid ${theme.border}`,
            p: 2
          }}>
            <Stack spacing={1}>
              <Stack direction="row" justifyContent="space-between" alignItems="center">
                <Typography variant="body2" sx={{ fontWeight: 600 }}>
                  {bulkProgress.message}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {bulkProgress.current} / {bulkProgress.total}
                </Typography>
              </Stack>
              <LinearProgress 
                variant="determinate" 
                value={(bulkProgress.current / bulkProgress.total) * 100} 
                sx={{ height: 6, borderRadius: 3 }}
              />
            </Stack>
          </Box>
        )}
      </Paper>

      {/* 📝 NOTLAR - Makine Yönetimi Notları */}
      <Paper sx={{ p: 2, mb: 2, borderRadius: 2, boxShadow: '0 6px 18px rgba(0,0,0,0.05)', border: '1px solid #e5e7eb' }}>
        <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 1.5 }}>
          <Box sx={{ fontSize: 20 }}>📝</Box>
          <Typography variant="subtitle2" sx={{ fontWeight: 700, color: '#374151' }}>NOTLAR</Typography>
          {selectedTesvik && (
            <Chip size="small" label={selectedTesvik.belgeNo || selectedTesvik._id} sx={{ ml: 1 }} />
          )}
        </Stack>
        <TextField
          fullWidth
          multiline
          rows={4}
          placeholder="Bu belge için notlarınızı buraya yazabilirsiniz..."
          value={makineNotlari}
          onChange={(e) => setMakineNotlari(e.target.value)}
          disabled={!selectedTesvik}
          sx={{
            '& .MuiOutlinedInput-root': {
              backgroundColor: '#fff',
              fontSize: '0.875rem',
              '&:hover': { backgroundColor: '#f8fafc' },
              '&.Mui-focused': { backgroundColor: '#fff' }
            }
          }}
        />
        <Box sx={{ mt: 1.5, display: 'flex', justifyContent: 'flex-end', gap: 1 }}>
          <Button
            size="small"
            variant="contained"
            disabled={!selectedTesvik || !isReviseStarted}
            onClick={async () => {
              if (!selectedTesvik?._id) return;
              try {
                await api.put(`/yeni-tesvik/${selectedTesvik._id}`, { 
                  notlar: { dahiliNotlar: makineNotlari }
                });
                openToast('success', 'Notlar kaydedildi');
              } catch (e) {
                console.error('Notlar kaydetme hatası:', e);
                openToast('error', 'Notlar kaydedilemedi');
              }
            }}
            sx={{ 
              fontSize: '0.75rem', 
              py: 0.5, 
              px: 2,
              background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
              '&:hover': { background: 'linear-gradient(135deg, #059669 0%, #047857 100%)' }
            }}
          >
            Notları Kaydet
          </Button>
        </Box>
      </Paper>

      {/* Bulk Menu - Premium */}
      <Menu 
        open={!!bulkMenuAnchor} 
        onClose={()=> setBulkMenuAnchor(null)} 
        anchorEl={bulkMenuAnchor} 
        PaperProps={{ 
          sx: { 
            borderRadius: 2,
            boxShadow: theme.shadowHover,
            border: `1px solid ${theme.border}`,
            minWidth: 180
          } 
        }}
      >
        <MenuItem 
          onClick={()=> { setBulkMenuAnchor(null); handleBulkTalep(); }} 
          sx={{ fontSize: '0.75rem', py: 1, px: 2, '&:hover': { bgcolor: theme.accentGlow } }}
        >
          <SendIcon sx={{ fontSize: 16, mr: 1.5, color: theme.accent }} />
          Seçilenlere Talep
        </MenuItem>
        <Divider sx={{ my: 0.5 }} />
        <MenuItem 
          onClick={()=> { setBulkMenuAnchor(null); handleBulkKarar('onay'); }} 
          sx={{ fontSize: '0.75rem', py: 1, px: 2, '&:hover': { bgcolor: theme.successLight } }}
        >
          <CheckIcon sx={{ fontSize: 16, mr: 1.5, color: theme.success }} />
          Onayla
        </MenuItem>
        <MenuItem 
          onClick={()=> { setBulkMenuAnchor(null); handleBulkKarar('kismi_onay'); }} 
          sx={{ fontSize: '0.75rem', py: 1, px: 2, '&:hover': { bgcolor: theme.warningLight } }}
        >
          <PercentIcon sx={{ fontSize: 16, mr: 1.5, color: theme.warning }} />
          Kısmi Onay
        </MenuItem>
        <MenuItem 
          onClick={()=> { setBulkMenuAnchor(null); handleBulkKarar('red'); }} 
          sx={{ fontSize: '0.75rem', py: 1, px: 2, color: theme.error, '&:hover': { bgcolor: theme.errorLight } }}
        >
          <ClearIcon sx={{ fontSize: 16, mr: 1.5 }} />
          Reddet
        </MenuItem>
      </Menu>

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
            const res = await yeniTesvikService.revertMakineRevizyon(selectedTesvik._id, selectedRevizeId, 'Kullanıcı geri dönüşü');
            if (res?.makineListeleri) {
              setYerliRows((res.makineListeleri.yerli||[]).map(r=>({ id:r.rowId||Math.random().toString(36).slice(2), ...r, gtipAciklama:r.gtipAciklamasi, adi:r.adiVeOzelligi, toplamTl:r.toplamTutariTl })));
              setIthalRows((res.makineListeleri.ithal||[]).map(r=>({ id:r.rowId||Math.random().toString(36).slice(2), ...r, gtipAciklama:r.gtipAciklamasi, adi:r.adiVeOzelligi, doviz:r.gumrukDovizKodu, toplamUsd:r.toplamTutarFobUsd, toplamTl:r.toplamTutarFobTl, kurManuel:r.kurManuel||false, kurManuelDeger:r.kurManuelDeger||0 })));
            }
            setRevertOpen(false);
            const list = await yeniTesvikService.listMakineRevizyonlari(selectedTesvik._id); setRevList(list.reverse());
            setIsReviseMode(true);
          }}>Geri Dön</Button>
        </DialogActions>
      </Dialog>

      {/* 🚀 ENTERPRISE: Batch Edit Dialog */}
      <Dialog open={batchEditOpen} onClose={() => setBatchEditOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ pb: 1 }}>
          <Stack direction="row" alignItems="center" spacing={1}>
            <BuildIcon sx={{ color: theme.accent }} />
            <Typography variant="h6" sx={{ fontWeight: 600 }}>Toplu Düzenleme</Typography>
            <Chip label={`${selectionModel.length} satır`} size="small" sx={{ ml: 'auto', bgcolor: theme.accentGlow, color: theme.accent }} />
          </Stack>
        </DialogTitle>
        <DialogContent dividers>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <Typography variant="body2" color="text.secondary">
              Seçili satırların belirli bir alanını toplu olarak güncelleyin.
            </Typography>
            <Select
              size="small"
              fullWidth
              value={batchEditField}
              onChange={(e) => setBatchEditField(e.target.value)}
              displayEmpty
            >
              <MenuItem value=""><em>Alan seçin...</em></MenuItem>
              {tab === 'yerli' ? (
                <>
                  <MenuItem value="makineId">Makine ID</MenuItem>
                  <MenuItem value="birim">Birim</MenuItem>
                  <MenuItem value="kdvIstisnasi">KDV İstisnası</MenuItem>
                  <MenuItem value="makineTechizatTipi">Makine Teçhizat Tipi</MenuItem>
                  <MenuItem value="finansalKiralamaMi">Finansal Kiralama</MenuItem>
                </>
              ) : (
                <>
                  <MenuItem value="makineId">Makine ID</MenuItem>
                  <MenuItem value="birim">Birim</MenuItem>
                  <MenuItem value="doviz">Döviz</MenuItem>
                  <MenuItem value="kullanilmisKod">Kullanılmış Makine</MenuItem>
                  <MenuItem value="makineTechizatTipi">Makine Teçhizat Tipi</MenuItem>
                  <MenuItem value="kdvMuafiyeti">KDV Muafiyeti</MenuItem>
                  <MenuItem value="gumrukVergisiMuafiyeti">Gümrük Vergisi Muafiyeti</MenuItem>
                </>
              )}
            </Select>
            {batchEditField && (
              <TextField
                size="small"
                fullWidth
                label="Yeni Değer"
                value={batchEditValue}
                onChange={(e) => setBatchEditValue(e.target.value)}
                placeholder={batchEditField === 'kdvIstisnasi' || batchEditField === 'kdvMuafiyeti' || batchEditField === 'gumrukVergisiMuafiyeti' ? 'EVET veya HAYIR' : 'Değer girin...'}
                helperText={batchEditField === 'makineId' ? 'Bakanlık portalından gelen makine kimliği' : ''}
              />
            )}
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 2 }}>
          <Button onClick={() => setBatchEditOpen(false)} sx={{ color: theme.text.secondary }}>İptal</Button>
          <Button 
            variant="contained" 
            disabled={!batchEditField || !batchEditValue}
            onClick={applyBatchEdit}
            sx={{ 
              background: theme.gradientSuccess,
              '&:hover': { background: theme.gradientSuccess, opacity: 0.9 }
            }}
          >
            Uygula ({selectionModel.length} satır)
          </Button>
        </DialogActions>
      </Dialog>

      {/* 🚀 ENTERPRISE: Quick Stats Dialog */}
      <Dialog open={quickStatsOpen} onClose={() => setQuickStatsOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle sx={{ pb: 1 }}>
          <Stack direction="row" alignItems="center" spacing={1}>
            <TableViewIcon sx={{ color: theme.accent }} />
            <Typography variant="h6" sx={{ fontWeight: 600 }}>Hızlı İstatistikler</Typography>
          </Stack>
        </DialogTitle>
        <DialogContent dividers>
          <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 2, mt: 1 }}>
            {/* Yerli Özet */}
            <Paper sx={{ p: 2, bgcolor: 'rgba(16, 185, 129, 0.05)', border: '1px solid rgba(16, 185, 129, 0.2)', borderRadius: 2 }}>
              <Typography variant="subtitle2" sx={{ color: '#10b981', fontWeight: 600, mb: 1 }}>YERLİ MAKİNE</Typography>
              <Stack spacing={0.5}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Typography variant="body2" color="text.secondary">Toplam Kalem:</Typography>
                  <Typography variant="body2" fontWeight={600}>{yerliRows.length}</Typography>
                </Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Typography variant="body2" color="text.secondary">Toplam Miktar:</Typography>
                  <Typography variant="body2" fontWeight={600}>{yerliRows.reduce((s, r) => s + numberOrZero(r.miktar), 0).toLocaleString('tr-TR')}</Typography>
                </Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Typography variant="body2" color="text.secondary">Toplam Tutar:</Typography>
                  <Typography variant="body2" fontWeight={600} color="#10b981">{yerliToplamTl.toLocaleString('tr-TR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })} ₺</Typography>
                </Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Typography variant="body2" color="text.secondary">Makine ID Eksik:</Typography>
                  <Typography variant="body2" fontWeight={600} color={yerliRows.filter(r => !r.makineId).length > 0 ? '#f59e0b' : '#10b981'}>
                    {yerliRows.filter(r => !r.makineId).length}
                  </Typography>
                </Box>
              </Stack>
            </Paper>

            {/* İthal Özet */}
            <Paper sx={{ p: 2, bgcolor: 'rgba(245, 158, 11, 0.05)', border: '1px solid rgba(245, 158, 11, 0.2)', borderRadius: 2 }}>
              <Typography variant="subtitle2" sx={{ color: '#f59e0b', fontWeight: 600, mb: 1 }}>İTHAL MAKİNE</Typography>
              <Stack spacing={0.5}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Typography variant="body2" color="text.secondary">Toplam Kalem:</Typography>
                  <Typography variant="body2" fontWeight={600}>{ithalRows.length}</Typography>
                </Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Typography variant="body2" color="text.secondary">Toplam Miktar:</Typography>
                  <Typography variant="body2" fontWeight={600}>{ithalRows.reduce((s, r) => s + numberOrZero(r.miktar), 0).toLocaleString('tr-TR')}</Typography>
                </Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Typography variant="body2" color="text.secondary">Toplam FOB $:</Typography>
                  <Typography variant="body2" fontWeight={600} color="#f59e0b">${ithalToplamUsd.toLocaleString('tr-TR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</Typography>
                </Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Typography variant="body2" color="text.secondary">Toplam FOB TL:</Typography>
                  <Typography variant="body2" fontWeight={600}>{ithalToplamTl.toLocaleString('tr-TR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })} ₺</Typography>
                </Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Typography variant="body2" color="text.secondary">Makine ID Eksik:</Typography>
                  <Typography variant="body2" fontWeight={600} color={ithalRows.filter(r => !r.makineId).length > 0 ? '#f59e0b' : '#10b981'}>
                    {ithalRows.filter(r => !r.makineId).length}
                  </Typography>
                </Box>
              </Stack>
            </Paper>

            {/* Genel Özet */}
            <Paper sx={{ p: 2, bgcolor: 'rgba(59, 130, 246, 0.05)', border: '1px solid rgba(59, 130, 246, 0.2)', borderRadius: 2 }}>
              <Typography variant="subtitle2" sx={{ color: '#3b82f6', fontWeight: 600, mb: 1 }}>GENEL ÖZET</Typography>
              <Stack spacing={0.5}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Typography variant="body2" color="text.secondary">Toplam Kalem:</Typography>
                  <Typography variant="body2" fontWeight={600}>{yerliRows.length + ithalRows.length}</Typography>
                </Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Typography variant="body2" color="text.secondary">Toplam Yatırım:</Typography>
                  <Typography variant="body2" fontWeight={600} color="#3b82f6">{(yerliToplamTl + ithalToplamTl).toLocaleString('tr-TR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })} ₺</Typography>
                </Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Typography variant="body2" color="text.secondary">Revizyon Sayısı:</Typography>
                  <Typography variant="body2" fontWeight={600}>{revList.length}</Typography>
                </Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Typography variant="body2" color="text.secondary">Aktif Revize:</Typography>
                  <Typography variant="body2" fontWeight={600} color={isReviseStarted ? '#10b981' : '#94a3b8'}>
                    {isReviseStarted ? 'Evet' : 'Hayır'}
                  </Typography>
                </Box>
              </Stack>
            </Paper>

            {/* Veri Kalitesi */}
            <Paper sx={{ p: 2, bgcolor: 'rgba(139, 92, 246, 0.05)', border: '1px solid rgba(139, 92, 246, 0.2)', borderRadius: 2 }}>
              <Typography variant="subtitle2" sx={{ color: '#8b5cf6', fontWeight: 600, mb: 1 }}>VERİ KALİTESİ</Typography>
              <Stack spacing={0.5}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Typography variant="body2" color="text.secondary">GTIP Eksik:</Typography>
                  <Typography variant="body2" fontWeight={600} color={[...yerliRows, ...ithalRows].filter(r => !r.gtipKodu).length > 0 ? '#ef4444' : '#10b981'}>
                    {[...yerliRows, ...ithalRows].filter(r => !r.gtipKodu).length}
                  </Typography>
                </Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Typography variant="body2" color="text.secondary">Birim Eksik:</Typography>
                  <Typography variant="body2" fontWeight={600} color={[...yerliRows, ...ithalRows].filter(r => !r.birim).length > 0 ? '#ef4444' : '#10b981'}>
                    {[...yerliRows, ...ithalRows].filter(r => !r.birim).length}
                  </Typography>
                </Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Typography variant="body2" color="text.secondary">Sıfır Miktarlı:</Typography>
                  <Typography variant="body2" fontWeight={600} color={[...yerliRows, ...ithalRows].filter(r => !numberOrZero(r.miktar)).length > 0 ? '#f59e0b' : '#10b981'}>
                    {[...yerliRows, ...ithalRows].filter(r => !numberOrZero(r.miktar)).length}
                  </Typography>
                </Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Typography variant="body2" color="text.secondary">Tamamlılık:</Typography>
                  <Typography variant="body2" fontWeight={600} color="#8b5cf6">
                    {(() => {
                      const total = yerliRows.length + ithalRows.length;
                      if (total === 0) return '-%';
                      const complete = [...yerliRows, ...ithalRows].filter(r => r.gtipKodu && r.adi && r.birim && numberOrZero(r.miktar) > 0).length;
                      return `%${Math.round((complete / total) * 100)}`;
                    })()}
                  </Typography>
                </Box>
              </Stack>
            </Paper>
          </Box>
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 2 }}>
          <Button onClick={() => setQuickStatsOpen(false)} variant="contained" sx={{ background: theme.gradient }}>Kapat</Button>
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

      {/* Manuel Kur Dialog */}
      <Dialog open={manuelKurDialogOpen} onClose={() => setManuelKurDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ bgcolor: 'primary.light', color: 'primary.main' }}>
          <Stack direction="row" alignItems="center" spacing={1}>
            <CurrencyExchangeIcon />
            <Typography variant="h6">Manuel Döviz Kuru Girişi</Typography>
          </Stack>
        </DialogTitle>
        <DialogContent>
          <Stack spacing={3} sx={{ mt: 2 }}>
            <Alert severity="info" sx={{ '& .MuiAlert-message': { width: '100%' } }}>
              <Stack spacing={1}>
                <Typography variant="subtitle2">
                  {manuelKurEditingRow?.doviz} için manuel kur belirleyebilirsiniz
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Otomatik kur yerine girdiğiniz değer kullanılacaktır
                </Typography>
              </Stack>
            </Alert>
            
            <Stack spacing={2}>
              <TextField
                label={`${manuelKurEditingRow?.doviz || 'USD'} / TL Kuru`}
                type="number"
                fullWidth
                size="large"
                value={manuelKurEditingRow?.kurManuelDeger || ''}
                onChange={(e) => {
                  const value = e.target.value;
                  setManuelKurEditingRow(prev => ({ ...prev, kurManuelDeger: value, kurManuel: true }));
                }}
                inputProps={{ step: 0.0001, min: 0 }}
                placeholder="0.0000"
                helperText={`1 ${manuelKurEditingRow?.doviz || 'USD'} = ? TL`}
                InputProps={{
                  startAdornment: <Typography sx={{ mr: 1 }}>₺</Typography>,
                }}
                sx={{ 
                  '& input': { 
                    fontSize: '1.25rem',
                    fontWeight: 'bold' 
                  }
                }}
              />
              
              {manuelKurEditingRow?.kurManuelDeger > 0 && (
                <Paper variant="outlined" sx={{ p: 2, bgcolor: 'grey.50' }}>
                  <Stack spacing={1}>
                    <Typography variant="caption" color="text.secondary">
                      Hesaplanan Değerler:
                    </Typography>
                    <Stack direction="row" justifyContent="space-between">
                      <Typography variant="body2">
                        Miktar: {manuelKurEditingRow?.miktar || 0} {manuelKurEditingRow?.birim || 'ADET'}
                      </Typography>
                      <Typography variant="body2" fontWeight="bold">
                        x {manuelKurEditingRow?.birimFiyatiFob || 0} {manuelKurEditingRow?.doviz}
                      </Typography>
                    </Stack>
                    <Divider />
                    <Stack direction="row" justifyContent="space-between">
                      <Typography variant="body2">
                        Toplam FOB:
                      </Typography>
                      <Typography variant="body2" fontWeight="bold" color="primary">
                        {((manuelKurEditingRow?.miktar || 0) * (manuelKurEditingRow?.birimFiyatiFob || 0)).toLocaleString('en-US')} {manuelKurEditingRow?.doviz}
                      </Typography>
                    </Stack>
                    <Stack direction="row" justifyContent="space-between">
                      <Typography variant="body2">
                        TL Karşılığı:
                      </Typography>
                      <Typography variant="body1" fontWeight="bold" color="success.main">
                        ₺{((manuelKurEditingRow?.miktar || 0) * (manuelKurEditingRow?.birimFiyatiFob || 0) * (parseFloat(manuelKurEditingRow?.kurManuelDeger) || 0)).toLocaleString('tr-TR')}
                      </Typography>
                    </Stack>
                  </Stack>
                </Paper>
              )}
              
              <FormControlLabel
                control={
                  <Checkbox
                    checked={!!manuelKurEditingRow?.kurManuel}
                    onChange={(e) => {
                      setManuelKurEditingRow(prev => ({ ...prev, kurManuel: e.target.checked }));
                    }}
                  />
                }
                label={
                  <Stack>
                    <Typography variant="body2">Manuel kuru kullan</Typography>
                    <Typography variant="caption" color="text.secondary">
                      İşaretlenmezse otomatik kur kullanılır
                    </Typography>
                  </Stack>
                }
              />
            </Stack>
          </Stack>
        </DialogContent>
        <DialogActions sx={{ p: 2, bgcolor: 'grey.50' }}>
          <Button onClick={() => {
            setManuelKurEditingRow(null);
            setManuelKurDialogOpen(false);
          }}>
            İptal
          </Button>
          <Button 
            variant="contained" 
            size="large"
            startIcon={<CheckIcon />}
            onClick={() => {
              if (manuelKurEditingRow) {
                updateIthal(manuelKurEditingRow.id, {
                  kurManuel: manuelKurEditingRow.kurManuel,
                  kurManuelDeger: manuelKurEditingRow.kurManuelDeger,
                  tlManuel: false
                });
              }
              setManuelKurDialogOpen(false);
            }}
            disabled={!manuelKurEditingRow?.kurManuelDeger || parseFloat(manuelKurEditingRow.kurManuelDeger) <= 0}
          >
            Kuru Uygula
          </Button>
        </DialogActions>
      </Dialog>

      {/* 🚀 ENTERPRISE: Keyboard Shortcuts Help Dialog */}
      <Dialog open={helpOpen} onClose={() => setHelpOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ pb: 1, borderBottom: `1px solid ${theme.border}` }}>
          <Stack direction="row" alignItems="center" spacing={1}>
            <Box sx={{ 
              width: 32, 
              height: 32, 
              borderRadius: 1, 
              bgcolor: theme.accentGlow, 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center',
              color: theme.accent,
              fontWeight: 700,
              fontSize: '0.9rem'
            }}>
              ?
            </Box>
            <Typography variant="h6" sx={{ fontWeight: 600 }}>Klavye Kısayolları</Typography>
          </Stack>
        </DialogTitle>
        <DialogContent sx={{ p: 0 }}>
          <Box sx={{ p: 2 }}>
            <Typography variant="subtitle2" sx={{ color: theme.accent, fontWeight: 600, mb: 1 }}>GENEL</Typography>
            <Stack spacing={0.5} sx={{ mb: 2 }}>
              {[
                { keys: '?', desc: 'Yardım menüsünü aç' },
                { keys: 'Ctrl + S', desc: 'Değişiklikleri kaydet' },
                { keys: 'Ctrl + I', desc: 'İstatistikleri göster' },
                { keys: 'Ctrl + 1', desc: 'Yerli sekmesine geç' },
                { keys: 'Ctrl + 2', desc: 'İthal sekmesine geç' },
                { keys: 'Escape', desc: 'Seçimi temizle' },
              ].map((item, idx) => (
                <Box key={idx} sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                  <Box sx={{ 
                    minWidth: 90, 
                    px: 1, 
                    py: 0.25, 
                    bgcolor: '#f1f5f9', 
                    borderRadius: 0.5, 
                    fontFamily: 'monospace', 
                    fontSize: '0.75rem',
                    fontWeight: 600,
                    color: '#475569',
                    textAlign: 'center'
                  }}>
                    {item.keys}
                  </Box>
                  <Typography variant="body2" color="text.secondary">{item.desc}</Typography>
                </Box>
              ))}
            </Stack>

            <Typography variant="subtitle2" sx={{ color: '#10b981', fontWeight: 600, mb: 1 }}>SATIR İŞLEMLERİ</Typography>
            <Stack spacing={0.5} sx={{ mb: 2 }}>
              {[
                { keys: 'Ctrl + Enter', desc: 'Yeni satır ekle (revize modunda)' },
                { keys: 'Ctrl + A', desc: 'Tüm satırları seç' },
                { keys: 'Ctrl + C', desc: 'Seçili satırı kopyala' },
                { keys: 'Ctrl + V', desc: 'Satırı yapıştır' },
                { keys: 'Delete', desc: 'Seçili satırları sil' },
              ].map((item, idx) => (
                <Box key={idx} sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                  <Box sx={{ 
                    minWidth: 90, 
                    px: 1, 
                    py: 0.25, 
                    bgcolor: 'rgba(16, 185, 129, 0.1)', 
                    borderRadius: 0.5, 
                    fontFamily: 'monospace', 
                    fontSize: '0.75rem',
                    fontWeight: 600,
                    color: '#10b981',
                    textAlign: 'center'
                  }}>
                    {item.keys}
                  </Box>
                  <Typography variant="body2" color="text.secondary">{item.desc}</Typography>
                </Box>
              ))}
            </Stack>

            <Typography variant="subtitle2" sx={{ color: '#f59e0b', fontWeight: 600, mb: 1 }}>TOPLU İŞLEMLER</Typography>
            <Stack spacing={0.5}>
              {[
                { keys: 'Ctrl + B', desc: 'Toplu düzenleme (seçim varsa)' },
              ].map((item, idx) => (
                <Box key={idx} sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                  <Box sx={{ 
                    minWidth: 90, 
                    px: 1, 
                    py: 0.25, 
                    bgcolor: 'rgba(245, 158, 11, 0.1)', 
                    borderRadius: 0.5, 
                    fontFamily: 'monospace', 
                    fontSize: '0.75rem',
                    fontWeight: 600,
                    color: '#f59e0b',
                    textAlign: 'center'
                  }}>
                    {item.keys}
                  </Box>
                  <Typography variant="body2" color="text.secondary">{item.desc}</Typography>
                </Box>
              ))}
            </Stack>
          </Box>
          
          <Box sx={{ p: 2, bgcolor: '#f8fafc', borderTop: `1px solid ${theme.border}` }}>
            <Typography variant="caption" color="text.secondary">
              <strong>İpucu:</strong> Revize modunda düzenleme yapabilirsiniz. Değişikliklerinizi kaydetmek için <strong>Ctrl+S</strong> kullanın veya "Bitir" butonuna tıklayın.
            </Typography>
          </Box>
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 2 }}>
          <Button onClick={() => setHelpOpen(false)} variant="contained" sx={{ background: theme.gradient }}>Anladım</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default MakineYonetimi;


