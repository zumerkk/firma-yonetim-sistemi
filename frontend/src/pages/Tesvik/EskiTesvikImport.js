// 📊 TEŞVİK EXCEL IMPORT - PREMIUM UI
// Bakanlık formatındaki Excel/CSV dosyalarından otomatik YeniTesvik oluşturma
// Drag-drop upload → Önizleme → Doğrulama → Kaydetme akışı

import React, { useState, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box, Typography, Paper, Button, Stepper, Step, StepLabel, StepContent,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  Chip, Alert, AlertTitle, LinearProgress, Card, CardContent,
  Grid, Divider, IconButton, Tooltip, Collapse, Fade, Zoom,
  Dialog, DialogTitle, DialogContent, DialogActions,
  CircularProgress, Skeleton, Stack
} from '@mui/material';
import {
  CloudUpload as UploadIcon,
  Description as FileIcon,
  CheckCircle as SuccessIcon,
  Error as ErrorIcon,
  Warning as WarningIcon,
  Info as InfoIcon,
  Business as FirmaIcon,
  AccountBalance as BelgeIcon,
  LocationOn as LocationIcon,
  People as PeopleIcon,
  Inventory as ProductIcon,
  AttachMoney as MoneyIcon,
  Shield as ShieldIcon,
  Gavel as GavelIcon,
  NavigateNext as NextIcon,
  NavigateBefore as BackIcon,
  Refresh as RefreshIcon,
  Download as DownloadIcon,
  Delete as DeleteIcon,
  ExpandMore as ExpandIcon,
  ExpandLess as CollapseIcon,
  KeyboardArrowRight as ArrowIcon,
  AutoAwesome as MagicIcon,
  FactCheck as ValidateIcon,
  Save as SaveIcon,
  Celebration as CelebrationIcon,
  OpenInNew as OpenIcon,
  ArrowBack as ArrowBackIcon,
  Article as ArticleIcon,
} from '@mui/icons-material';

import LayoutWrapper from '../../components/Layout/LayoutWrapper';
import tesvikService from '../../services/tesvikService';

// ═════════════════════════════════ STYLES ═════════════════════════════════
const styles = {
  pageContainer: {
    minHeight: '100vh',
    background: 'linear-gradient(135deg, #f0f4ff 0%, #e8eeff 50%, #f5f0ff 100%)',
    pb: 6
  },
  heroSection: {
    background: 'linear-gradient(135deg, #1e40af 0%, #3730a3 50%, #6d28d9 100%)',
    borderRadius: 4,
    p: 4,
    mb: 4,
    color: 'white',
    position: 'relative',
    overflow: 'hidden',
    '&::before': {
      content: '""',
      position: 'absolute',
      top: 0, right: 0,
      width: '40%', height: '100%',
      background: 'radial-gradient(circle at 80% 50%, rgba(255,255,255,0.1) 0%, transparent 70%)',
    }
  },
  dropZone: (isDragOver, hasFile) => ({
    border: `3px dashed ${isDragOver ? '#3b82f6' : hasFile ? '#10b981' : '#cbd5e1'}`,
    borderRadius: 4,
    p: 6,
    textAlign: 'center',
    cursor: 'pointer',
    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
    bgcolor: isDragOver ? 'rgba(59, 130, 246, 0.05)' : hasFile ? 'rgba(16, 185, 129, 0.03)' : 'rgba(248, 250, 252, 0.8)',
    '&:hover': {
      borderColor: '#3b82f6',
      bgcolor: 'rgba(59, 130, 246, 0.03)',
      transform: 'translateY(-2px)',
      boxShadow: '0 8px 25px rgba(59, 130, 246, 0.12)'
    }
  }),
  previewCard: {
    borderRadius: 3,
    border: '1px solid #e2e8f0',
    transition: 'all 0.2s ease',
    '&:hover': {
      boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
      borderColor: '#94a3b8'
    }
  },
  sectionHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: 1.5,
    mb: 2,
    p: 1.5,
    borderRadius: 2,
    bgcolor: 'rgba(30, 64, 175, 0.04)'
  },
  statCard: (color) => ({
    borderRadius: 3,
    p: 2.5,
    textAlign: 'center',
    border: `1px solid ${color}20`,
    bgcolor: `${color}05`,
    transition: 'all 0.2s ease',
    '&:hover': { transform: 'translateY(-2px)', boxShadow: `0 4px 15px ${color}15` }
  }),
  successScreen: {
    textAlign: 'center',
    py: 8,
    px: 4,
    background: 'linear-gradient(135deg, #ecfdf5 0%, #f0fdf4 50%, #f5f3ff 100%)',
    borderRadius: 4,
    border: '1px solid #86efac'
  }
};

// ═════════════════════════════════ HELPERS ═════════════════════════════════
const formatNumber = (val) => {
  if (!val && val !== 0) return '-';
  return Number(val).toLocaleString('tr-TR');
};

const formatDate = (val) => {
  if (!val) return '-';
  try {
    return new Date(val).toLocaleDateString('tr-TR');
  } catch { return '-'; }
};

// ═════════════════════════════════ MAIN COMPONENT ═════════════════════════
const EskiTesvikImport = () => {
  const navigate = useNavigate();
  const fileInputRef = useRef(null);

  // State
  const [activeStep, setActiveStep] = useState(0);
  const [selectedFile, setSelectedFile] = useState(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [previewData, setPreviewData] = useState(null);
  const [importSessionId, setImportSessionId] = useState(null);
  const [expandedRows, setExpandedRows] = useState({});
  const [expandedSections, setExpandedSections] = useState({});
  const [confirming, setConfirming] = useState(false);
  const [importResult, setImportResult] = useState(null);
  const [error, setError] = useState(null);

  // ─── File Handling ───
  const handleFileDrop = useCallback((e) => {
    e.preventDefault();
    setIsDragOver(false);
    const file = e.dataTransfer?.files?.[0];
    if (file) validateAndSetFile(file);
  }, []);

  const handleFileSelect = useCallback((e) => {
    const file = e.target.files?.[0];
    if (file) validateAndSetFile(file);
  }, []);

  const validateAndSetFile = (file) => {
    setError(null);
    const ext = file.name.split('.').pop().toLowerCase();
    if (!['xlsx', 'xls', 'csv'].includes(ext)) {
      setError('Geçersiz dosya formatı. Sadece .xlsx, .xls veya .csv kabul edilir.');
      return;
    }
    if (file.size > 50 * 1024 * 1024) {
      setError('Dosya boyutu 50MB limitini aşıyor.');
      return;
    }
    setSelectedFile(file);
  };

  const handleRemoveFile = () => {
    setSelectedFile(null);
    setPreviewData(null);
    setImportSessionId(null);
    setActiveStep(0);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // ─── Upload & Preview ───
  const handleUpload = async () => {
    if (!selectedFile) return;
    setUploading(true);
    setError(null);
    setUploadProgress(0);

    // Simulate progress
    const progressInterval = setInterval(() => {
      setUploadProgress(prev => Math.min(prev + 8, 85));
    }, 200);

    try {
      const formData = new FormData();
      formData.append('file', selectedFile);
      const result = await tesvikService.importUpload(formData);
      clearInterval(progressInterval);
      setUploadProgress(100);

      if (result.success) {
        setPreviewData(result.data);
        setImportSessionId(result.data.importSessionId);
        setActiveStep(1);
        
        // İlk satırı otomatik aç
        if (result.data.previews?.length > 0) {
          setExpandedRows({ 0: true });
        }
      } else {
        setError(result.message || 'Dosya işlenirken hata oluştu');
      }
    } catch (err) {
      clearInterval(progressInterval);
      setError(err.response?.data?.message || err.message || 'Dosya yüklenirken hata oluştu');
    } finally {
      setUploading(false);
      setTimeout(() => setUploadProgress(0), 500);
    }
  };

  // ─── Confirm Import ───
  const handleConfirm = async () => {
    if (!importSessionId) return;
    setConfirming(true);
    setError(null);

    try {
      const result = await tesvikService.importConfirm(importSessionId);
      if (result.success) {
        setImportResult(result.data);
        setActiveStep(2);
      } else {
        setError(result.message || 'Import sırasında hata oluştu');
      }
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Import onaylanırken hata oluştu');
    } finally {
      setConfirming(false);
    }
  };

  // ─── Toggle Helpers ───
  const toggleRow = (idx) => {
    setExpandedRows(prev => ({ ...prev, [idx]: !prev[idx] }));
  };

  const toggleSection = (key) => {
    setExpandedSections(prev => ({ ...prev, [key]: !prev[key] }));
  };

  // ═══════════════════════ STEP 0: UPLOAD ═══════════════════════
  const renderUploadStep = () => (
    <Fade in>
      <Box>
        {/* Drop Zone */}
        <Paper
          sx={styles.dropZone(isDragOver, !!selectedFile)}
          onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
          onDragLeave={() => setIsDragOver(false)}
          onDrop={handleFileDrop}
          onClick={() => !selectedFile && fileInputRef.current?.click()}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept=".xlsx,.xls,.csv"
            onChange={handleFileSelect}
            style={{ display: 'none' }}
          />

          {!selectedFile ? (
            <Box>
              <UploadIcon sx={{ fontSize: 64, color: isDragOver ? '#3b82f6' : '#94a3b8', mb: 2 }} />
              <Typography variant="h5" fontWeight={600} color="text.primary" gutterBottom>
                Bakanlık Excel/CSV Dosyasını Yükleyin
              </Typography>
              <Typography color="text.secondary" sx={{ mb: 2, maxWidth: 500, mx: 'auto' }}>
                Teşvik belgesi verilerini içeren Excel veya CSV dosyasını sürükleyip bırakın
                ya da tıklayarak seçin. Bakanlık formatındaki standart belge yapısı otomatik tanınacaktır.
              </Typography>
              <Stack direction="row" spacing={1} justifyContent="center">
                <Chip label=".xlsx" size="small" variant="outlined" color="primary" />
                <Chip label=".xls" size="small" variant="outlined" color="primary" />
                <Chip label=".csv" size="small" variant="outlined" color="primary" />
                <Chip label="Max 50MB" size="small" variant="outlined" />
              </Stack>
            </Box>
          ) : (
            <Box>
              <SuccessIcon sx={{ fontSize: 56, color: '#10b981', mb: 2 }} />
              <Typography variant="h6" fontWeight={600} color="text.primary" gutterBottom>
                {selectedFile.name}
              </Typography>
              <Typography variant="body2" color="text.secondary" gutterBottom>
                {(selectedFile.size / 1024).toFixed(1)} KB
              </Typography>
              <Stack direction="row" spacing={1} justifyContent="center" sx={{ mt: 2 }}>
                <Button
                  variant="contained"
                  startIcon={uploading ? <CircularProgress size={18} color="inherit" /> : <MagicIcon />}
                  onClick={(e) => { e.stopPropagation(); handleUpload(); }}
                  disabled={uploading}
                  sx={{
                    background: 'linear-gradient(135deg, #1e40af 0%, #6d28d9 100%)',
                    px: 4, py: 1.2, borderRadius: 3,
                    fontWeight: 600, fontSize: '1rem',
                    '&:hover': { background: 'linear-gradient(135deg, #1e3a8a 0%, #5b21b6 100%)' }
                  }}
                >
                  {uploading ? 'İşleniyor...' : 'Analiz Et ve Önizle'}
                </Button>
                <Button
                  variant="outlined"
                  color="error"
                  startIcon={<DeleteIcon />}
                  onClick={(e) => { e.stopPropagation(); handleRemoveFile(); }}
                  disabled={uploading}
                >
                  Kaldır
                </Button>
              </Stack>
            </Box>
          )}
        </Paper>

        {/* Progress Bar */}
        {uploading && (
          <Box sx={{ mt: 3 }}>
            <LinearProgress
              variant="determinate"
              value={uploadProgress}
              sx={{
                height: 8, borderRadius: 4,
                bgcolor: '#e2e8f0',
                '& .MuiLinearProgress-bar': {
                  background: 'linear-gradient(90deg, #3b82f6, #8b5cf6)',
                  borderRadius: 4
                }
              }}
            />
            <Typography variant="body2" color="text.secondary" sx={{ mt: 1, textAlign: 'center' }}>
              Dosya analiz ediliyor... ({uploadProgress}%)
            </Typography>
          </Box>
        )}
      </Box>
    </Fade>
  );

  // ═══════════════════════ STEP 1: PREVIEW ═══════════════════════
  const renderPreviewStep = () => {
    if (!previewData) return null;
    const { summary, previews, errors } = previewData;

    return (
      <Fade in>
        <Box>
          {/* Summary Cards */}
          <Grid container spacing={2} sx={{ mb: 4 }}>
            {[
              { label: 'Toplam Kayıt', value: summary.total, color: '#3b82f6', icon: <ArticleIcon /> },
              { label: 'İmport Edilebilir', value: summary.canImport, color: '#10b981', icon: <SuccessIcon /> },
              { label: 'Duplicate', value: summary.duplicates, color: '#f59e0b', icon: <WarningIcon /> },
              { label: 'Firma Eşleşti', value: summary.firmaFound, color: '#06b6d4', icon: <FirmaIcon /> },
              { label: 'Yeni Firma', value: summary.firmaWillCreate, color: '#8b5cf6', icon: <FirmaIcon /> },
              { label: 'Hatalı', value: summary.validationErrors, color: '#ef4444', icon: <ErrorIcon /> },
            ].map((stat, i) => (
              <Grid item xs={6} sm={4} md={2} key={i}>
                <Box sx={styles.statCard(stat.color)}>
                  <Box sx={{ color: stat.color, mb: 0.5 }}>{stat.icon}</Box>
                  <Typography variant="h4" fontWeight={700} color={stat.color}>
                    {stat.value}
                  </Typography>
                  <Typography variant="caption" color="text.secondary" fontWeight={500}>
                    {stat.label}
                  </Typography>
                </Box>
              </Grid>
            ))}
          </Grid>

          {/* Error List */}
          {errors?.length > 0 && (
            <Alert severity="error" sx={{ mb: 3, borderRadius: 2 }}>
              <AlertTitle>Parse Hataları</AlertTitle>
              {errors.map((err, i) => (
                <Typography key={i} variant="body2">• Satır {err.rowIndex}: {err.message}</Typography>
              ))}
            </Alert>
          )}

          {/* Preview Records */}
          {previews?.map((preview, idx) => (
            <Paper key={idx} sx={{ ...styles.previewCard, mb: 2 }} elevation={0}>
              {/* Header Row */}
              <Box
                sx={{
                  p: 2, display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  cursor: 'pointer', borderBottom: expandedRows[idx] ? '1px solid #e2e8f0' : 'none',
                  '&:hover': { bgcolor: '#fafbfc' }
                }}
                onClick={() => toggleRow(idx)}
              >
                <Stack direction="row" spacing={2} alignItems="center">
                  <IconButton size="small">
                    {expandedRows[idx] ? <CollapseIcon /> : <ExpandIcon />}
                  </IconButton>
                  <Box>
                    <Typography variant="subtitle1" fontWeight={600}>
                      {preview.tesvikData?.yatirimciUnvan || 'Firma Belirtilmemiş'}
                    </Typography>
                    <Stack direction="row" spacing={1} sx={{ mt: 0.5 }}>
                      <Chip
                        label={`GM ID: ${preview.tesvikData?.gmId || '-'}`}
                        size="small" variant="outlined"
                      />
                      <Chip
                        label={`Belge: ${preview.tesvikData?.belgeYonetimi?.belgeNo || '-'}`}
                        size="small" variant="outlined" color="primary"
                      />
                      <Chip
                        label={`${preview.tesvikData?.yatirimBilgileri?.yerinIl || '-'}`}
                        size="small" variant="outlined" color="secondary"
                        icon={<LocationIcon sx={{ fontSize: 14 }} />}
                      />
                    </Stack>
                  </Box>
                </Stack>

                <Stack direction="row" spacing={1} alignItems="center">
                  {preview.isDuplicate && (
                    <Chip label={`Duplicate (${preview.existingTesvikId})`} color="warning" size="small" />
                  )}
                  {preview.firma.found ? (
                    <Chip label="Firma Eşleşti" color="success" size="small" icon={<SuccessIcon />} />
                  ) : preview.firma.willCreate ? (
                    <Chip label="Yeni Firma" color="info" size="small" icon={<FirmaIcon />} />
                  ) : (
                    <Chip label="Firma Yok" color="error" size="small" />
                  )}
                  {preview.canImport ? (
                    <Chip label="HAZIR" color="success" size="small" variant="filled" />
                  ) : (
                    <Chip label="ATLANACAK" color="default" size="small" variant="outlined" />
                  )}
                </Stack>
              </Box>

              {/* Expanded Detail */}
              <Collapse in={expandedRows[idx]}>
                <Box sx={{ p: 3 }}>
                  {/* Validation Messages */}
                  {(preview.validation?.errors?.length > 0 || preview.validation?.warnings?.length > 0) && (
                    <Box sx={{ mb: 3 }}>
                      {preview.validation.errors.map((e, i) => (
                        <Alert key={`e-${i}`} severity="error" sx={{ mb: 1, borderRadius: 2 }}>
                          {e}
                        </Alert>
                      ))}
                      {preview.validation.warnings.map((w, i) => (
                        <Alert key={`w-${i}`} severity="warning" sx={{ mb: 1, borderRadius: 2 }}>
                          {w}
                        </Alert>
                      ))}
                    </Box>
                  )}

                  {/* Firma Info */}
                  {preview.firma.existing && (
                    <Alert severity="success" sx={{ mb: 2, borderRadius: 2 }}>
                      <AlertTitle>Firma Eşleştirildi</AlertTitle>
                      <strong>{preview.firma.existing.tamUnvan}</strong> ({preview.firma.existing.firmaId})
                      {preview.firma.matchType === 'partial' && ' — Kısmi eşleşme'}
                    </Alert>
                  )}

                  <Grid container spacing={3}>
                    {/* Belge Bilgileri */}
                    <Grid item xs={12} md={6}>
                      <Box sx={styles.sectionHeader}>
                        <BelgeIcon sx={{ color: '#1e40af' }} />
                        <Typography variant="subtitle2" fontWeight={600}>Belge Bilgileri</Typography>
                      </Box>
                      <TableContainer>
                        <Table size="small">
                          <TableBody>
                            {[
                              ['Belge ID', preview.tesvikData?.belgeYonetimi?.belgeId],
                              ['Belge No', preview.tesvikData?.belgeYonetimi?.belgeNo],
                              ['Belge Tarihi', formatDate(preview.tesvikData?.belgeYonetimi?.belgeTarihi)],
                              ['Başlama', formatDate(preview.tesvikData?.belgeYonetimi?.belgeBaslamaTarihi)],
                              ['Bitiş', formatDate(preview.tesvikData?.belgeYonetimi?.belgeBitisTarihi)],
                              ['Kanun', preview.tesvikData?.belgeYonetimi?.dayandigiKanun],
                              ['Durum', preview.tesvikData?.belgeYonetimi?.belgeDurumu],
                            ].map(([label, val], i) => (
                              <TableRow key={i}>
                                <TableCell sx={{ fontWeight: 600, color: '#64748b', width: 140, py: 0.8, borderBottom: '1px solid #f1f5f9' }}>{label}</TableCell>
                                <TableCell sx={{ py: 0.8, borderBottom: '1px solid #f1f5f9' }}>{val || '-'}</TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </TableContainer>
                    </Grid>

                    {/* Yatırım Bilgileri */}
                    <Grid item xs={12} md={6}>
                      <Box sx={styles.sectionHeader}>
                        <LocationIcon sx={{ color: '#059669' }} />
                        <Typography variant="subtitle2" fontWeight={600}>Yatırım Bilgileri</Typography>
                      </Box>
                      <TableContainer>
                        <Table size="small">
                          <TableBody>
                            {[
                              ['Yatırım Konusu', preview.tesvikData?.yatirimBilgileri?.yatirimKonusu],
                              ['Cinsi', [preview.tesvikData?.yatirimBilgileri?.sCinsi1, preview.tesvikData?.yatirimBilgileri?.tCinsi2].filter(Boolean).join(', ')],
                              ['Destek Sınıfı', preview.tesvikData?.yatirimBilgileri?.destekSinifi],
                              ['İl/İlçe', `${preview.tesvikData?.yatirimBilgileri?.yerinIl || ''} / ${preview.tesvikData?.yatirimBilgileri?.yerinIlce || ''}`],
                              ['Ada/Parsel', `${preview.tesvikData?.yatirimBilgileri?.ada || ''} / ${preview.tesvikData?.yatirimBilgileri?.parsel || ''}`],
                              ['Adres', preview.tesvikData?.yatirimBilgileri?.yatirimAdresi1],
                              ['OSB', preview.tesvikData?.yatirimBilgileri?.osbIseMudurluk],
                            ].map(([label, val], i) => (
                              <TableRow key={i}>
                                <TableCell sx={{ fontWeight: 600, color: '#64748b', width: 140, py: 0.8, borderBottom: '1px solid #f1f5f9' }}>{label}</TableCell>
                                <TableCell sx={{ py: 0.8, borderBottom: '1px solid #f1f5f9' }}>{val || '-'}</TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </TableContainer>
                    </Grid>

                    {/* İstihdam */}
                    <Grid item xs={12} md={4}>
                      <Box sx={styles.sectionHeader}>
                        <PeopleIcon sx={{ color: '#8b5cf6' }} />
                        <Typography variant="subtitle2" fontWeight={600}>İstihdam</Typography>
                      </Box>
                      <Stack direction="row" spacing={2}>
                        <Box sx={{ textAlign: 'center', flex: 1, p: 1.5, borderRadius: 2, bgcolor: '#f5f3ff' }}>
                          <Typography variant="h5" fontWeight={700} color="#7c3aed">
                            {preview.tesvikData?.istihdam?.mevcutKisi || 0}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">Mevcut</Typography>
                        </Box>
                        <Box sx={{ textAlign: 'center', flex: 1, p: 1.5, borderRadius: 2, bgcolor: '#ecfdf5' }}>
                          <Typography variant="h5" fontWeight={700} color="#059669">
                            {preview.tesvikData?.istihdam?.ilaveKisi || 0}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">İlave</Typography>
                        </Box>
                        <Box sx={{ textAlign: 'center', flex: 1, p: 1.5, borderRadius: 2, bgcolor: '#eff6ff' }}>
                          <Typography variant="h5" fontWeight={700} color="#1e40af">
                            {(preview.tesvikData?.istihdam?.mevcutKisi || 0) + (preview.tesvikData?.istihdam?.ilaveKisi || 0)}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">Toplam</Typography>
                        </Box>
                      </Stack>
                    </Grid>

                    {/* Ürünler */}
                    <Grid item xs={12} md={8}>
                      <Box sx={styles.sectionHeader}>
                        <ProductIcon sx={{ color: '#0891b2' }} />
                        <Typography variant="subtitle2" fontWeight={600}>
                          Ürün Bilgileri ({preview.tesvikData?.urunler?.length || 0})
                        </Typography>
                      </Box>
                      {preview.tesvikData?.urunler?.length > 0 ? (
                        <TableContainer sx={{ borderRadius: 2, border: '1px solid #e2e8f0' }}>
                          <Table size="small">
                            <TableHead>
                              <TableRow sx={{ bgcolor: '#f8fafc' }}>
                                <TableCell sx={{ fontWeight: 700, fontSize: '0.75rem' }}>NACE</TableCell>
                                <TableCell sx={{ fontWeight: 700, fontSize: '0.75rem' }}>Ürün</TableCell>
                                <TableCell align="right" sx={{ fontWeight: 700, fontSize: '0.75rem' }}>Mevcut</TableCell>
                                <TableCell align="right" sx={{ fontWeight: 700, fontSize: '0.75rem' }}>İlave</TableCell>
                                <TableCell align="right" sx={{ fontWeight: 700, fontSize: '0.75rem' }}>Toplam</TableCell>
                                <TableCell sx={{ fontWeight: 700, fontSize: '0.75rem' }}>Birim</TableCell>
                              </TableRow>
                            </TableHead>
                            <TableBody>
                              {preview.tesvikData.urunler.map((urun, ui) => (
                                <TableRow key={ui} sx={{ '&:nth-of-type(even)': { bgcolor: '#fafbfc' } }}>
                                  <TableCell><Chip label={urun.u97Kodu} size="small" variant="outlined" /></TableCell>
                                  <TableCell sx={{ maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                    {urun.urunAdi}
                                  </TableCell>
                                  <TableCell align="right">{formatNumber(urun.mevcutKapasite)}</TableCell>
                                  <TableCell align="right">{formatNumber(urun.ilaveKapasite)}</TableCell>
                                  <TableCell align="right" sx={{ fontWeight: 600 }}>{formatNumber(urun.toplamKapasite)}</TableCell>
                                  <TableCell>{urun.kapasiteBirimi}</TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </TableContainer>
                      ) : (
                        <Alert severity="info" sx={{ borderRadius: 2 }}>Ürün bilgisi bulunamadı</Alert>
                      )}
                    </Grid>

                    {/* Destek Unsurları */}
                    <Grid item xs={12} md={6}>
                      <Box sx={styles.sectionHeader}>
                        <ShieldIcon sx={{ color: '#0d9488' }} />
                        <Typography variant="subtitle2" fontWeight={600}>
                          Destek Unsurları ({preview.tesvikData?.destekUnsurlari?.length || 0})
                        </Typography>
                      </Box>
                      {preview.tesvikData?.destekUnsurlari?.map((d, di) => (
                        <Box key={di} sx={{ p: 1.5, mb: 1, borderRadius: 2, bgcolor: '#f0fdfa', border: '1px solid #99f6e4' }}>
                          <Typography variant="body2" fontWeight={600} color="#0f766e">{d.destekUnsuru}</Typography>
                          {d.sarti && <Typography variant="caption" color="text.secondary">{d.sarti}</Typography>}
                        </Box>
                      ))}
                      {(!preview.tesvikData?.destekUnsurlari || preview.tesvikData.destekUnsurlari.length === 0) && (
                        <Alert severity="info" sx={{ borderRadius: 2 }}>Destek unsuru bulunamadı</Alert>
                      )}
                    </Grid>

                    {/* Özel Şartlar */}
                    <Grid item xs={12} md={6}>
                      <Box sx={styles.sectionHeader}>
                        <GavelIcon sx={{ color: '#dc2626' }} />
                        <Typography variant="subtitle2" fontWeight={600}>
                          Özel Şartlar ({preview.tesvikData?.ozelSartlar?.length || 0})
                        </Typography>
                      </Box>
                      {preview.tesvikData?.ozelSartlar?.slice(0, 5).map((s, si) => (
                        <Box key={si} sx={{ p: 1.5, mb: 1, borderRadius: 2, bgcolor: '#fef2f2', border: '1px solid #fecaca' }}>
                          <Typography variant="body2" fontWeight={600} color="#991b1b">{s.koşulMetni}</Typography>
                          {s.aciklamaNotu && (
                            <Typography variant="caption" color="text.secondary" sx={{
                              display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden'
                            }}>
                              {s.aciklamaNotu}
                            </Typography>
                          )}
                        </Box>
                      ))}
                      {(preview.tesvikData?.ozelSartlar?.length || 0) > 5 && (
                        <Typography variant="caption" color="text.secondary">
                          +{preview.tesvikData.ozelSartlar.length - 5} daha fazla
                        </Typography>
                      )}
                    </Grid>

                    {/* Mali Hesaplamalar */}
                    <Grid item xs={12}>
                      <Box sx={styles.sectionHeader}>
                        <MoneyIcon sx={{ color: '#d97706' }} />
                        <Typography variant="subtitle2" fontWeight={600}>Mali Hesaplamalar</Typography>
                      </Box>
                      <Grid container spacing={2}>
                        {[
                          { label: 'Arazi-Arsa Bedeli', value: preview.tesvikData?.maliHesaplamalar?.maliyetlenen?.sn, color: '#92400e' },
                          { label: 'Bina İnşaat', value: preview.tesvikData?.maliHesaplamalar?.binaInsaatGideri?.toplamBinaGideri, color: '#1e40af' },
                          { label: 'Toplam Sabit Yatırım', value: preview.tesvikData?.maliHesaplamalar?.toplamSabitYatirim, color: '#059669' },
                          { label: 'Makine Teçhizat', value: preview.tesvikData?.maliHesaplamalar?.makinaTechizat?.toplamMakina, color: '#7c3aed' },
                          { label: 'Toplam Finansman', value: preview.tesvikData?.maliHesaplamalar?.finansman?.toplamFinansman, color: '#0891b2' },
                        ].map((item, i) => (
                          <Grid item xs={6} sm={4} md key={i}>
                            <Box sx={{ p: 2, borderRadius: 2, bgcolor: `${item.color}08`, border: `1px solid ${item.color}20`, textAlign: 'center' }}>
                              <Typography variant="h6" fontWeight={700} color={item.color}>
                                {formatNumber(item.value)} ₺
                              </Typography>
                              <Typography variant="caption" color="text.secondary">{item.label}</Typography>
                            </Box>
                          </Grid>
                        ))}
                      </Grid>
                    </Grid>
                  </Grid>
                </Box>
              </Collapse>
            </Paper>
          ))}

          {/* Action Buttons */}
          <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 4 }}>
            <Button
              variant="outlined"
              startIcon={<ArrowBackIcon />}
              onClick={handleRemoveFile}
              sx={{ borderRadius: 3 }}
            >
              Geri — Yeni Dosya
            </Button>
            <Button
              variant="contained"
              startIcon={confirming ? <CircularProgress size={18} color="inherit" /> : <SaveIcon />}
              onClick={handleConfirm}
              disabled={confirming || !previewData?.summary?.canImport}
              sx={{
                background: 'linear-gradient(135deg, #059669 0%, #0d9488 100%)',
                px: 5, py: 1.5, borderRadius: 3,
                fontWeight: 700, fontSize: '1rem',
                boxShadow: '0 4px 15px rgba(5, 150, 105, 0.3)',
                '&:hover': {
                  background: 'linear-gradient(135deg, #047857 0%, #0f766e 100%)',
                  boxShadow: '0 6px 20px rgba(5, 150, 105, 0.4)',
                }
              }}
            >
              {confirming
                ? 'Kaydediliyor...'
                : `${previewData?.summary?.canImport || 0} Teşviki Kaydet`
              }
            </Button>
          </Box>
        </Box>
      </Fade>
    );
  };

  // ═══════════════════════ STEP 2: SUCCESS ═══════════════════════
  const renderSuccessStep = () => {
    if (!importResult) return null;

    return (
      <Fade in>
        <Box sx={styles.successScreen}>
          <CelebrationIcon sx={{ fontSize: 80, color: '#10b981', mb: 3 }} />
          <Typography variant="h4" fontWeight={700} gutterBottom color="#065f46">
            Import Başarıyla Tamamlandı!
          </Typography>
          <Typography variant="h6" color="text.secondary" sx={{ mb: 4, maxWidth: 500, mx: 'auto' }}>
            {importResult.success} teşvik kaydı otomatik olarak oluşturuldu
            {importResult.failed > 0 && `, ${importResult.failed} hatalı`}
          </Typography>

          {/* Created Records */}
          {importResult.created?.length > 0 && (
            <Box sx={{ maxWidth: 600, mx: 'auto', mb: 4 }}>
              <TableContainer component={Paper} sx={{ borderRadius: 3, boxShadow: '0 2px 10px rgba(0,0,0,0.06)' }}>
                <Table size="small">
                  <TableHead>
                    <TableRow sx={{ bgcolor: '#f0fdf4' }}>
                      <TableCell sx={{ fontWeight: 700 }}>Teşvik ID</TableCell>
                      <TableCell sx={{ fontWeight: 700 }}>Firma</TableCell>
                      <TableCell sx={{ fontWeight: 700 }}>Belge ID</TableCell>
                      <TableCell align="center">İşlem</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {importResult.created.map((rec, i) => (
                      <TableRow key={i}>
                        <TableCell>
                          <Chip label={rec.tesvikId} color="success" size="small" variant="outlined" />
                        </TableCell>
                        <TableCell sx={{ maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {rec.yatirimciUnvan}
                        </TableCell>
                        <TableCell>{rec.belgeId || '-'}</TableCell>
                        <TableCell align="center">
                          <IconButton
                            size="small"
                            color="primary"
                            onClick={() => navigate(`/tesvik/${rec.tesvikId}`)}
                          >
                            <OpenIcon fontSize="small" />
                          </IconButton>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </Box>
          )}

          {/* Error List */}
          {importResult.errors?.length > 0 && (
            <Alert severity="warning" sx={{ maxWidth: 600, mx: 'auto', mb: 4, borderRadius: 2, textAlign: 'left' }}>
              <AlertTitle>Bazı Hatalar Oluştu</AlertTitle>
              {importResult.errors.map((err, i) => (
                <Typography key={i} variant="body2">• {err}</Typography>
              ))}
            </Alert>
          )}

          <Stack direction="row" spacing={2} justifyContent="center">
            <Button
              variant="contained"
              startIcon={<ArrowIcon />}
              onClick={() => navigate('/tesvik')}
              sx={{
                background: 'linear-gradient(135deg, #1e40af 0%, #6d28d9 100%)',
                px: 4, py: 1.2, borderRadius: 3, fontWeight: 600
              }}
            >
              Teşvik Listesine Git
            </Button>
            <Button
              variant="outlined"
              startIcon={<UploadIcon />}
              onClick={() => {
                handleRemoveFile();
                setImportResult(null);
                setActiveStep(0);
              }}
              sx={{ borderRadius: 3 }}
            >
              Yeni Import
            </Button>
          </Stack>
        </Box>
      </Fade>
    );
  };

  // ═══════════════════════ MAIN RENDER ═══════════════════════
  const steps = ['Dosya Yükle', 'Önizle & Doğrula', 'Tamamlandı'];

  return (
    <LayoutWrapper>
      <Box sx={styles.pageContainer}>
        <Box sx={{ maxWidth: 1400, mx: 'auto', px: 3, pt: 4 }}>
          {/* Hero Section */}
          <Box sx={styles.heroSection}>
            <Stack direction="row" alignItems="center" justifyContent="space-between">
              <Box>
                <Typography variant="h4" fontWeight={700} sx={{ mb: 1 }}>
                  📊 Eski Teşvik Excel Import
                </Typography>
                <Typography variant="body1" sx={{ opacity: 0.85, maxWidth: 600 }}>
                  Bakanlık formatındaki teşvik belgesi dosyalarını yükleyin,
                  veriler otomatik olarak analiz edilip eski teşvik kaydı oluşturulacaktır.
                </Typography>
              </Box>
              <Button
                variant="outlined"
                startIcon={<ArrowBackIcon />}
                onClick={() => navigate('/tesvik')}
                sx={{
                  color: 'white', borderColor: 'rgba(255,255,255,0.4)',
                  '&:hover': { borderColor: 'white', bgcolor: 'rgba(255,255,255,0.1)' },
                  borderRadius: 3
                }}
              >
                Geri Dön
              </Button>
            </Stack>
          </Box>

          {/* Stepper */}
          <Paper sx={{ p: 3, mb: 4, borderRadius: 3 }} elevation={0}>
            <Stepper activeStep={activeStep} alternativeLabel>
              {steps.map((label, i) => (
                <Step key={label} completed={activeStep > i}>
                  <StepLabel
                    StepIconProps={{
                      sx: {
                        '&.Mui-completed': { color: '#10b981' },
                        '&.Mui-active': { color: '#3b82f6' }
                      }
                    }}
                  >
                    <Typography variant="body2" fontWeight={activeStep === i ? 700 : 400}>
                      {label}
                    </Typography>
                  </StepLabel>
                </Step>
              ))}
            </Stepper>
          </Paper>

          {/* Error Alert */}
          {error && (
            <Alert
              severity="error"
              sx={{ mb: 3, borderRadius: 2 }}
              onClose={() => setError(null)}
            >
              <AlertTitle>Hata</AlertTitle>
              {error}
            </Alert>
          )}

          {/* Step Content */}
          {activeStep === 0 && renderUploadStep()}
          {activeStep === 1 && renderPreviewStep()}
          {activeStep === 2 && renderSuccessStep()}
        </Box>
      </Box>
    </LayoutWrapper>
  );
};

export default EskiTesvikImport;
