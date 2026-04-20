/**
 * 📸 ScreenshotImport - Dashboard Entegre Ekran Görüntüsü İthalat Modülü
 * 
 * ETUYS/DYS portalından alınan ekran görüntülerini Gemini Vision API ile
 * analiz edip otomatik teşvik belgesi oluşturur.
 */

import React, { useState, useCallback, useRef } from 'react';
import {
  Box,
  Card,
  Typography,
  Button,
  IconButton,
  Chip,
  CircularProgress,
  LinearProgress,
  Alert,
  AlertTitle,
  Grid,
  TextField,
  Divider,
  Collapse,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
} from '@mui/material';
import {
  CameraAlt as CameraIcon,
  CloudUpload as UploadIcon,
  CheckCircle as SuccessIcon,
  Delete as DeleteIcon,
  ExpandMore as ExpandIcon,
  ExpandLess as CollapseIcon,
  Save as SaveIcon,
  Refresh as ResetIcon,
  Image as ImageIcon,
  AutoFixHigh as AiIcon,
  Description as DocIcon,
  AccountBalance as BelgeIcon,
  AttachMoney as MoneyIcon,
  Gavel as SartIcon,
  CardGiftcard as DestekIcon,
  Category as UrunIcon,
} from '@mui/icons-material';
import axios from 'axios';

const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:5001/api';

// Tab tipi meta bilgileri
const TAB_META = {
  belge_kunye: { label: 'Belge Künye', icon: <BelgeIcon />, color: '#3b82f6' },
  yatirim_cinsi: { label: 'Yatırım Cinsi', icon: <DocIcon />, color: '#8b5cf6' },
  urun_bilgileri: { label: 'Ürün Bilgileri', icon: <UrunIcon />, color: '#10b981' },
  finansal_bilgiler: { label: 'Finansal Bilgiler', icon: <MoneyIcon />, color: '#f59e0b' },
  ozel_sartlar: { label: 'Özel Şartlar', icon: <SartIcon />, color: '#ef4444' },
  destek_unsurlari: { label: 'Destek Unsurları', icon: <DestekIcon />, color: '#06b6d4' },
  unknown: { label: 'Bilinmeyen', icon: <ImageIcon />, color: '#6b7280' },
};

const ScreenshotImport = () => {
  // State
  const [collapsed, setCollapsed] = useState(true);
  const [files, setFiles] = useState([]);
  const [previews, setPreviews] = useState([]);
  const [analyzing, setAnalyzing] = useState(false);
  const [analyzeProgress, setAnalyzeProgress] = useState(0);
  const [analysisResult, setAnalysisResult] = useState(null);
  const [editedData, setEditedData] = useState(null);
  const [committing, setCommitting] = useState(false);
  const [commitResult, setCommitResult] = useState(null);
  const [error, setError] = useState(null);
  const [expandedSections, setExpandedSections] = useState({
    kunye: true,
    yatirim: false,
    urunler: false,
    finansal: false,
    ozelSartlar: false,
    destekUnsurlari: false,
  });

  const fileInputRef = useRef(null);
  const dropZoneRef = useRef(null);

  // Drag & Drop
  const handleDragOver = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    if (dropZoneRef.current) {
      dropZoneRef.current.style.borderColor = '#3b82f6';
      dropZoneRef.current.style.background = 'rgba(59, 130, 246, 0.05)';
    }
  }, []);

  const handleDragLeave = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    if (dropZoneRef.current) {
      dropZoneRef.current.style.borderColor = 'rgba(148, 163, 184, 0.5)';
      dropZoneRef.current.style.background = 'transparent';
    }
  }, []);

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    if (dropZoneRef.current) {
      dropZoneRef.current.style.borderColor = 'rgba(148, 163, 184, 0.5)';
      dropZoneRef.current.style.background = 'transparent';
    }
    const droppedFiles = Array.from(e.dataTransfer.files).filter((f) =>
      ['image/png', 'image/jpeg', 'image/jpg', 'image/webp'].includes(f.type)
    );
    addFiles(droppedFiles);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleFileSelect = useCallback((e) => {
    const selectedFiles = Array.from(e.target.files || []);
    addFiles(selectedFiles);
    e.target.value = '';
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const addFiles = (newFiles) => {
    setError(null);
    setAnalysisResult(null);
    setEditedData(null);
    setCommitResult(null);

    const updatedFiles = [...files, ...newFiles];
    setFiles(updatedFiles);

    // Create previews
    newFiles.forEach((file) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        setPreviews((prev) => [
          ...prev,
          { name: file.name, url: e.target.result, size: file.size },
        ]);
      };
      reader.readAsDataURL(file);
    });
  };

  const removeFile = (index) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
    setPreviews((prev) => prev.filter((_, i) => i !== index));
    setAnalysisResult(null);
    setEditedData(null);
  };

  // Analiz
  const handleAnalyze = async () => {
    if (files.length === 0) return;

    setAnalyzing(true);
    setAnalyzeProgress(0);
    setError(null);
    setAnalysisResult(null);
    setEditedData(null);
    setCommitResult(null);

    try {
      const formData = new FormData();
      files.forEach((file) => {
        formData.append('screenshots', file);
      });

      // Progress simulation
      const progressInterval = setInterval(() => {
        setAnalyzeProgress((prev) => {
          if (prev >= 90) {
            clearInterval(progressInterval);
            return 90;
          }
          return prev + (90 - prev) * 0.1;
        });
      }, 500);

      const token = localStorage.getItem('token');
      const response = await axios.post(`${API_BASE}/screenshot-import/analyze`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
          Authorization: `Bearer ${token}`,
        },
        timeout: 120000, // 2 dakika timeout
      });

      clearInterval(progressInterval);
      setAnalyzeProgress(100);

      if (response.data.success) {
        setAnalysisResult(response.data.data);
        setEditedData(JSON.parse(JSON.stringify(response.data.data.merged)));
      } else {
        setError(response.data.message || 'Analiz başarısız oldu.');
      }
    } catch (err) {
      const msg = err.response?.data?.message || err.message || 'Analiz sırasında hata oluştu.';
      setError(msg);
    } finally {
      setAnalyzing(false);
    }
  };

  // Commit
  const handleCommit = async () => {
    if (!editedData) return;

    setCommitting(true);
    setError(null);

    try {
      const token = localStorage.getItem('token');
      const response = await axios.post(
        `${API_BASE}/screenshot-import/commit`,
        {
          mergedData: editedData,
          belgeFormati: editedData.belgeFormati || 'eski',
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (response.data.success) {
        setCommitResult(response.data.data);
      } else {
        setError(response.data.message || 'Kayıt başarısız oldu.');
      }
    } catch (err) {
      const msg = err.response?.data?.message || err.message || 'Kayıt sırasında hata oluştu.';
      setError(msg);
    } finally {
      setCommitting(false);
    }
  };

  // Reset
  const handleReset = () => {
    setFiles([]);
    setPreviews([]);
    setAnalysisResult(null);
    setEditedData(null);
    setCommitResult(null);
    setError(null);
    setAnalyzeProgress(0);
  };

  // Editable field updater
  const updateField = (path, value) => {
    setEditedData((prev) => {
      const updated = { ...prev };
      const keys = path.split('.');
      let obj = updated;
      for (let i = 0; i < keys.length - 1; i++) {
        if (!obj[keys[i]]) obj[keys[i]] = {};
        obj = obj[keys[i]];
      }
      obj[keys[keys.length - 1]] = value;
      return updated;
    });
  };

  const toggleSection = (section) => {
    setExpandedSections((prev) => ({ ...prev, [section]: !prev[section] }));
  };

  // ─── Render Helpers ─────────────────────────────────────────────

  const renderTabBadge = (tabType, confidence) => {
    const meta = TAB_META[tabType] || TAB_META.unknown;
    return (
      <Chip
        icon={meta.icon}
        label={`${meta.label} (${Math.round((confidence || 0) * 100)}%)`}
        size="small"
        sx={{
          backgroundColor: `${meta.color}15`,
          color: meta.color,
          border: `1px solid ${meta.color}40`,
          fontWeight: 600,
          fontSize: '0.7rem',
        }}
      />
    );
  };

  const renderEditableField = (label, path, value, type = 'text') => (
    <TextField
      fullWidth
      size="small"
      label={label}
      value={value ?? ''}
      onChange={(e) => updateField(path, type === 'number' ? Number(e.target.value) : e.target.value)}
      type={type}
      variant="outlined"
      sx={{
        mb: 1.5,
        '& .MuiOutlinedInput-root': { borderRadius: 1.5, fontSize: '0.85rem' },
        '& .MuiInputLabel-root': { fontSize: '0.8rem' },
      }}
    />
  );

  const renderSectionHeader = (title, sectionKey, icon, count = null) => (
    <Box
      onClick={() => toggleSection(sectionKey)}
      sx={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        cursor: 'pointer',
        py: 1,
        px: 1.5,
        borderRadius: 1.5,
        '&:hover': { backgroundColor: 'rgba(0,0,0,0.03)' },
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        {icon}
        <Typography variant="subtitle2" fontWeight={700}>
          {title}
        </Typography>
        {count !== null && (
          <Chip label={count} size="small" sx={{ height: 20, fontSize: '0.7rem' }} />
        )}
      </Box>
      {expandedSections[sectionKey] ? <CollapseIcon /> : <ExpandIcon />}
    </Box>
  );

  // ─── Main Render ────────────────────────────────────────────────

  return (
    <Card
      id="screenshot-import-module"
      elevation={2}
      sx={{
        mb: 3,
        borderRadius: 3,
        border: '1px solid rgba(226, 232, 240, 0.7)',
        overflow: 'hidden',
        background: '#ffffff',
        boxShadow: '0 4px 24px rgba(0, 0, 0, 0.06)',
        transition: 'all 0.3s ease',
        flexShrink: 0,
        '&:hover': {
          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.08)',
        },
      }}
    >
      {/* Header */}
      <Box
        sx={{
          background: 'linear-gradient(135deg, #1e3a5f 0%, #2563eb 60%, #3b82f6 100%)',
          px: { xs: 2, sm: 3 },
          py: 2,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          cursor: 'pointer',
        }}
        onClick={() => setCollapsed(!collapsed)}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <CameraIcon sx={{ color: '#fff', fontSize: 28 }} />
          <Box>
            <Typography variant="h6" sx={{ color: '#fff', fontWeight: 700, fontSize: '1rem', lineHeight: 1.2 }}>
              📸 Ekran Görüntüsünden Belge Oluştur
            </Typography>
            <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.72rem' }}>
              ETUYS/DYS portalı ekran görüntülerini AI ile analiz edip otomatik teşvik kaydı oluşturun
            </Typography>
          </Box>
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Chip
            label="AI Powered"
            size="small"
            sx={{
              backgroundColor: 'rgba(255,255,255,0.15)',
              color: '#fff',
              fontWeight: 600,
              fontSize: '0.65rem',
              border: '1px solid rgba(255,255,255,0.3)',
            }}
            icon={<AiIcon sx={{ color: '#fbbf24 !important', fontSize: 16 }} />}
          />
          <IconButton size="small" sx={{ color: '#fff' }}>
            {collapsed ? <ExpandIcon /> : <CollapseIcon />}
          </IconButton>
        </Box>
      </Box>

      {/* Body */}
      <Collapse in={!collapsed} timeout="auto">
        <Box sx={{ p: { xs: 2, sm: 3 } }}>
          {/* Error */}
          {error && (
            <Alert severity="error" sx={{ mb: 2, borderRadius: 2 }} onClose={() => setError(null)}>
              <AlertTitle>Hata</AlertTitle>
              {error}
            </Alert>
          )}

          {/* Commit Success */}
          {commitResult && (
            <Alert severity="success" sx={{ mb: 2, borderRadius: 2 }} icon={<SuccessIcon />}>
              <AlertTitle>Başarılı!</AlertTitle>
              <Typography variant="body2">
                <strong>{commitResult.firmaAdi}</strong> firması için{' '}
                <strong>{commitResult.belgeFormati === 'yeni' ? 'Yeni' : 'Eski'} Teşvik</strong> belgesi oluşturuldu.
              </Typography>
              <Typography variant="caption" color="text.secondary">
                ID: {commitResult.tesvikId} | Belge No: {commitResult.belgeNo}
              </Typography>
            </Alert>
          )}

          {/* Step 1: File Upload */}
          {!analysisResult && !commitResult && (
            <>
              {/* Drop Zone */}
              <Box
                ref={dropZoneRef}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                sx={{
                  border: '2px dashed rgba(148, 163, 184, 0.5)',
                  borderRadius: 3,
                  p: 4,
                  textAlign: 'center',
                  cursor: 'pointer',
                  transition: 'all 0.3s ease',
                  '&:hover': {
                    borderColor: '#3b82f6',
                    background: 'rgba(59, 130, 246, 0.03)',
                  },
                }}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  multiple
                  onChange={handleFileSelect}
                  style={{ display: 'none' }}
                />
                <UploadIcon sx={{ fontSize: 48, color: '#94a3b8', mb: 1 }} />
                <Typography variant="h6" sx={{ fontWeight: 600, color: '#334155', fontSize: '0.95rem' }}>
                  ETUYS/DYS ekran görüntülerini sürükleyin
                </Typography>
                <Typography variant="body2" sx={{ color: '#64748b', mt: 0.5, fontSize: '0.8rem' }}>
                  veya tıklayarak seçin • PNG, JPEG, WebP • Maks 10 görsel
                </Typography>
                <Box sx={{ display: 'flex', gap: 0.8, justifyContent: 'center', mt: 2, flexWrap: 'wrap' }}>
                  {Object.entries(TAB_META)
                    .filter(([k]) => k !== 'unknown')
                    .map(([key, meta]) => (
                      <Chip
                        key={key}
                        label={meta.label}
                        size="small"
                        sx={{
                          fontSize: '0.65rem',
                          height: 22,
                          backgroundColor: `${meta.color}10`,
                          color: meta.color,
                          border: `1px solid ${meta.color}30`,
                        }}
                      />
                    ))}
                </Box>
              </Box>

              {/* File Previews */}
              {previews.length > 0 && (
                <Box sx={{ mt: 2 }}>
                  <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 600 }}>
                    📁 Yüklenen Görseller ({previews.length})
                  </Typography>
                  <Grid container spacing={1.5}>
                    {previews.map((preview, index) => (
                      <Grid item xs={6} sm={4} md={3} lg={2} key={index}>
                        <Box
                          sx={{
                            position: 'relative',
                            borderRadius: 2,
                            border: '1px solid #e2e8f0',
                            overflow: 'hidden',
                            '&:hover .delete-btn': { opacity: 1 },
                          }}
                        >
                          <img
                            src={preview.url}
                            alt={preview.name}
                            style={{
                              width: '100%',
                              height: 100,
                              objectFit: 'cover',
                              display: 'block',
                            }}
                          />
                          <IconButton
                            className="delete-btn"
                            size="small"
                            onClick={(e) => {
                              e.stopPropagation();
                              removeFile(index);
                            }}
                            sx={{
                              position: 'absolute',
                              top: 4,
                              right: 4,
                              opacity: 0,
                              transition: 'opacity 0.2s',
                              backgroundColor: 'rgba(239,68,68,0.9)',
                              color: '#fff',
                              '&:hover': { backgroundColor: '#ef4444' },
                              width: 24,
                              height: 24,
                            }}
                          >
                            <DeleteIcon sx={{ fontSize: 14 }} />
                          </IconButton>
                          <Typography
                            variant="caption"
                            sx={{
                              display: 'block',
                              p: 0.5,
                              fontSize: '0.6rem',
                              textAlign: 'center',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap',
                              backgroundColor: '#f8fafc',
                            }}
                          >
                            {preview.name}
                          </Typography>
                        </Box>
                      </Grid>
                    ))}
                  </Grid>

                  {/* Analyze Button */}
                  <Box sx={{ display: 'flex', gap: 1, mt: 2 }}>
                    <Button
                      variant="contained"
                      onClick={handleAnalyze}
                      disabled={analyzing || files.length === 0}
                      startIcon={analyzing ? <CircularProgress size={18} color="inherit" /> : <AiIcon />}
                      sx={{
                        background: 'linear-gradient(135deg, #2563eb, #3b82f6)',
                        borderRadius: 2,
                        textTransform: 'none',
                        fontWeight: 600,
                        px: 3,
                        '&:hover': {
                          background: 'linear-gradient(135deg, #1d4ed8, #2563eb)',
                        },
                      }}
                    >
                      {analyzing ? 'Gemini Analiz Ediyor...' : `🤖 AI ile Analiz Et (${files.length} görsel)`}
                    </Button>
                    <Button
                      variant="outlined"
                      onClick={handleReset}
                      startIcon={<ResetIcon />}
                      sx={{ borderRadius: 2, textTransform: 'none' }}
                    >
                      Sıfırla
                    </Button>
                  </Box>

                  {/* Progress */}
                  {analyzing && (
                    <Box sx={{ mt: 2 }}>
                      <LinearProgress
                        variant="determinate"
                        value={analyzeProgress}
                        sx={{
                          height: 6,
                          borderRadius: 3,
                          backgroundColor: '#e2e8f0',
                          '& .MuiLinearProgress-bar': {
                            background: 'linear-gradient(90deg, #3b82f6, #8b5cf6)',
                            borderRadius: 3,
                          },
                        }}
                      />
                      <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5 }}>
                        Gemini Vision API ile ekran görüntüleri analiz ediliyor...{' '}
                        {Math.round(analyzeProgress)}%
                      </Typography>
                    </Box>
                  )}
                </Box>
              )}
            </>
          )}

          {/* Step 2: Analysis Results & Preview */}
          {analysisResult && editedData && !commitResult && (
            <Box>
              {/* Analysis Summary */}
              <Alert severity="info" sx={{ mb: 2, borderRadius: 2 }}>
                <AlertTitle>Analiz Sonuçları</AlertTitle>
                <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mt: 0.5 }}>
                  {analysisResult.screenshots?.map((s, i) => (
                    <Box key={i}>{renderTabBadge(s.detectedTab, s.confidence)}</Box>
                  ))}
                </Box>
                {analysisResult.errors?.length > 0 && (
                  <Typography variant="caption" color="error" sx={{ mt: 1, display: 'block' }}>
                    ⚠️ {analysisResult.errors.length} görsel analiz edilemedi
                  </Typography>
                )}
              </Alert>

              {/* Belge Format Badge */}
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                <Chip
                  label={editedData.belgeFormati === 'yeni' ? '🆕 Yeni Teşvik (NACE6)' : '📋 Eski Teşvik (US97)'}
                  color={editedData.belgeFormati === 'yeni' ? 'success' : 'primary'}
                  sx={{ fontWeight: 700 }}
                />
                <Typography variant="caption" color="text.secondary">
                  Otomatik algılandı — değiştirmek için tıklayın
                </Typography>
                <Button
                  size="small"
                  onClick={() =>
                    updateField('belgeFormati', editedData.belgeFormati === 'yeni' ? 'eski' : 'yeni')
                  }
                  sx={{ textTransform: 'none', fontSize: '0.7rem' }}
                >
                  Değiştir
                </Button>
              </Box>

              <Divider sx={{ mb: 2 }} />

              {/* Section 1: Belge Künye */}
              {renderSectionHeader('Belge Künye Bilgileri', 'kunye', <BelgeIcon sx={{ color: '#3b82f6' }} />)}
              <Collapse in={expandedSections.kunye}>
                <Box sx={{ pl: 1, pr: 1, pb: 2 }}>
                  <Grid container spacing={1.5}>
                    <Grid item xs={12} md={6}>
                      {renderEditableField('Firma Adı', 'firmaAdi', editedData.firmaAdi)}
                    </Grid>
                    <Grid item xs={6} md={3}>
                      {renderEditableField('Belge ID', 'belgeId', editedData.belgeId)}
                    </Grid>
                    <Grid item xs={6} md={3}>
                      {renderEditableField('Belge No', 'belgeNo', editedData.belgeNo)}
                    </Grid>
                    <Grid item xs={6} md={3}>
                      {renderEditableField('Belge Tarihi', 'belgeTarihi', editedData.belgeTarihi)}
                    </Grid>
                    <Grid item xs={6} md={3}>
                      {renderEditableField('Müracaat Tarihi', 'muracaatTarihi', editedData.muracaatTarihi)}
                    </Grid>
                    <Grid item xs={6} md={3}>
                      {renderEditableField('Belge Başlama', 'belgeBaslamaTarihi', editedData.belgeBaslamaTarihi)}
                    </Grid>
                    <Grid item xs={6} md={3}>
                      {renderEditableField('Belge Bitiş', 'belgeBitisTarihi', editedData.belgeBitisTarihi)}
                    </Grid>
                    <Grid item xs={12} md={6}>
                      {renderEditableField('Yatırım Konusu', 'yatirimKonusu', editedData.yatirimKonusu)}
                    </Grid>
                    <Grid item xs={6} md={3}>
                      {renderEditableField('Destek Sınıfı', 'destekSinifi', editedData.destekSinifi)}
                    </Grid>
                    <Grid item xs={6} md={3}>
                      {renderEditableField('Kararname', 'kararnameNo', editedData.kararnameNo)}
                    </Grid>
                    <Grid item xs={6} md={3}>
                      {renderEditableField('İl', 'il', editedData.il)}
                    </Grid>
                    <Grid item xs={6} md={3}>
                      {renderEditableField('İlçe', 'ilce', editedData.ilce)}
                    </Grid>
                    <Grid item xs={6} md={3}>
                      {renderEditableField('İl Bazlı Bölge', 'ilBazliBolge', editedData.ilBazliBolge)}
                    </Grid>
                    <Grid item xs={6} md={3}>
                      {renderEditableField('Sermaye Türü', 'sermayeTuru', editedData.sermayeTuru)}
                    </Grid>
                    <Grid item xs={4} md={2}>
                      {renderEditableField('Mevcut İstihdam', 'mevcutIstihdam', editedData.mevcutIstihdam, 'number')}
                    </Grid>
                    <Grid item xs={4} md={2}>
                      {renderEditableField('İlave İstihdam', 'ilaveIstihdam', editedData.ilaveIstihdam, 'number')}
                    </Grid>
                  </Grid>
                </Box>
              </Collapse>

              <Divider sx={{ my: 1 }} />

              {/* Section 2: Yatırım Cinsi */}
              {renderSectionHeader('Yatırım Cinsi', 'yatirim', <DocIcon sx={{ color: '#8b5cf6' }} />)}
              <Collapse in={expandedSections.yatirim}>
                <Box sx={{ pl: 1, pr: 1, pb: 2 }}>
                  <Typography variant="body2" sx={{ mb: 1 }}>
                    {editedData.yatirimCinsleri?.join(', ') || 'Bilgi bulunamadı'}
                  </Typography>
                </Box>
              </Collapse>

              <Divider sx={{ my: 1 }} />

              {/* Section 3: Ürünler */}
              {renderSectionHeader(
                'Ürün Bilgileri',
                'urunler',
                <UrunIcon sx={{ color: '#10b981' }} />,
                editedData.urunler?.length
              )}
              <Collapse in={expandedSections.urunler}>
                <Box sx={{ pl: 1, pr: 1, pb: 2 }}>
                  {editedData.urunler?.length > 0 ? (
                    <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: 2 }}>
                      <Table size="small">
                        <TableHead>
                          <TableRow sx={{ backgroundColor: '#f8fafc' }}>
                            <TableCell sx={{ fontWeight: 700, fontSize: '0.75rem' }}>Ürün Kodu</TableCell>
                            <TableCell sx={{ fontWeight: 700, fontSize: '0.75rem' }}>Ürün Adı</TableCell>
                            <TableCell align="right" sx={{ fontWeight: 700, fontSize: '0.75rem' }}>Mevcut</TableCell>
                            <TableCell align="right" sx={{ fontWeight: 700, fontSize: '0.75rem' }}>İlave</TableCell>
                            <TableCell align="right" sx={{ fontWeight: 700, fontSize: '0.75rem' }}>Toplam</TableCell>
                            <TableCell sx={{ fontWeight: 700, fontSize: '0.75rem' }}>Birim</TableCell>
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {editedData.urunler.map((u, i) => (
                            <TableRow key={i}>
                              <TableCell sx={{ fontSize: '0.8rem' }}>{u.urunKodu}</TableCell>
                              <TableCell sx={{ fontSize: '0.8rem' }}>{u.urunAdi}</TableCell>
                              <TableCell align="right" sx={{ fontSize: '0.8rem' }}>
                                {u.mevcutKapasite?.toLocaleString('tr-TR')}
                              </TableCell>
                              <TableCell align="right" sx={{ fontSize: '0.8rem' }}>
                                {u.ilaveKapasite?.toLocaleString('tr-TR')}
                              </TableCell>
                              <TableCell align="right" sx={{ fontSize: '0.8rem', fontWeight: 600 }}>
                                {u.toplamKapasite?.toLocaleString('tr-TR')}
                              </TableCell>
                              <TableCell sx={{ fontSize: '0.8rem' }}>{u.birim}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </TableContainer>
                  ) : (
                    <Typography variant="body2" color="text.secondary">
                      Ürün bilgisi bulunamadı
                    </Typography>
                  )}
                </Box>
              </Collapse>

              <Divider sx={{ my: 1 }} />

              {/* Section 4: Finansal */}
              {renderSectionHeader('Finansal Bilgiler', 'finansal', <MoneyIcon sx={{ color: '#f59e0b' }} />)}
              <Collapse in={expandedSections.finansal}>
                <Box sx={{ pl: 1, pr: 1, pb: 2 }}>
                  {editedData.finansal ? (
                    <Grid container spacing={1.5}>
                      <Grid item xs={6} md={3}>
                        <Box sx={{ p: 1.5, borderRadius: 2, backgroundColor: '#fefce8', textAlign: 'center' }}>
                          <Typography variant="caption" color="text.secondary">Toplam Sabit Yatırım</Typography>
                          <Typography variant="h6" sx={{ fontWeight: 700, fontSize: '1rem' }}>
                            {(editedData.finansal.toplamSabitYatirimTutari || 0).toLocaleString('tr-TR')} ₺
                          </Typography>
                        </Box>
                      </Grid>
                      <Grid item xs={6} md={3}>
                        <Box sx={{ p: 1.5, borderRadius: 2, backgroundColor: '#eff6ff', textAlign: 'center' }}>
                          <Typography variant="caption" color="text.secondary">Toplam Makine Teçhizat</Typography>
                          <Typography variant="h6" sx={{ fontWeight: 700, fontSize: '1rem' }}>
                            {(editedData.finansal.makinaTechizatGiderleri?.toplamMakine || 0).toLocaleString('tr-TR')} ₺
                          </Typography>
                        </Box>
                      </Grid>
                      <Grid item xs={6} md={3}>
                        <Box sx={{ p: 1.5, borderRadius: 2, backgroundColor: '#f0fdf4', textAlign: 'center' }}>
                          <Typography variant="caption" color="text.secondary">Toplam Finansman</Typography>
                          <Typography variant="h6" sx={{ fontWeight: 700, fontSize: '1rem' }}>
                            {(editedData.finansal.toplamFinansman || 0).toLocaleString('tr-TR')} ₺
                          </Typography>
                        </Box>
                      </Grid>
                      <Grid item xs={6} md={3}>
                        <Box sx={{ p: 1.5, borderRadius: 2, backgroundColor: '#fdf2f8', textAlign: 'center' }}>
                          <Typography variant="caption" color="text.secondary">İthal Makine ($)</Typography>
                          <Typography variant="h6" sx={{ fontWeight: 700, fontSize: '1rem' }}>
                            {(editedData.finansal.ithalMakineDolar?.toplam || 0).toLocaleString('tr-TR')} $
                          </Typography>
                        </Box>
                      </Grid>
                    </Grid>
                  ) : (
                    <Typography variant="body2" color="text.secondary">
                      Finansal bilgi bulunamadı
                    </Typography>
                  )}
                </Box>
              </Collapse>

              <Divider sx={{ my: 1 }} />

              {/* Section 5: Özel Şartlar */}
              {renderSectionHeader(
                'Özel Şartlar',
                'ozelSartlar',
                <SartIcon sx={{ color: '#ef4444' }} />,
                editedData.ozelSartlar?.length
              )}
              <Collapse in={expandedSections.ozelSartlar}>
                <Box sx={{ pl: 1, pr: 1, pb: 2 }}>
                  {editedData.ozelSartlar?.length > 0 ? (
                    <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: 2 }}>
                      <Table size="small">
                        <TableHead>
                          <TableRow sx={{ backgroundColor: '#fef2f2' }}>
                            <TableCell sx={{ fontWeight: 700, fontSize: '0.75rem', width: '35%' }}>Şart Adı</TableCell>
                            <TableCell sx={{ fontWeight: 700, fontSize: '0.75rem' }}>Açıklama</TableCell>
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {editedData.ozelSartlar.map((s, i) => (
                            <TableRow key={i}>
                              <TableCell sx={{ fontSize: '0.8rem' }}>{s.sartAdi}</TableCell>
                              <TableCell sx={{ fontSize: '0.8rem' }}>{s.sartAciklamasi}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </TableContainer>
                  ) : (
                    <Typography variant="body2" color="text.secondary">
                      Özel şart bulunamadı
                    </Typography>
                  )}
                </Box>
              </Collapse>

              <Divider sx={{ my: 1 }} />

              {/* Section 6: Destek Unsurları */}
              {renderSectionHeader(
                'Destek Unsurları',
                'destekUnsurlari',
                <DestekIcon sx={{ color: '#06b6d4' }} />,
                editedData.destekUnsurlari?.length
              )}
              <Collapse in={expandedSections.destekUnsurlari}>
                <Box sx={{ pl: 1, pr: 1, pb: 2 }}>
                  {editedData.destekUnsurlari?.length > 0 ? (
                    <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: 2 }}>
                      <Table size="small">
                        <TableHead>
                          <TableRow sx={{ backgroundColor: '#ecfeff' }}>
                            <TableCell sx={{ fontWeight: 700, fontSize: '0.75rem' }}>Destek Unsuru</TableCell>
                            <TableCell sx={{ fontWeight: 700, fontSize: '0.75rem' }}>Destek Oranı</TableCell>
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {editedData.destekUnsurlari.map((d, i) => (
                            <TableRow key={i}>
                              <TableCell sx={{ fontSize: '0.8rem' }}>{d.destekUnsuru}</TableCell>
                              <TableCell sx={{ fontSize: '0.8rem', fontWeight: 600 }}>{d.destekOrani}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </TableContainer>
                  ) : (
                    <Typography variant="body2" color="text.secondary">
                      Destek unsuru bulunamadı
                    </Typography>
                  )}
                </Box>
              </Collapse>

              <Divider sx={{ my: 2 }} />

              {/* Action Buttons */}
              <Box sx={{ display: 'flex', gap: 1.5, justifyContent: 'flex-end' }}>
                <Button
                  variant="outlined"
                  onClick={handleReset}
                  startIcon={<ResetIcon />}
                  sx={{ borderRadius: 2, textTransform: 'none' }}
                >
                  Sıfırla
                </Button>
                <Button
                  variant="contained"
                  onClick={handleCommit}
                  disabled={committing || !editedData.firmaAdi}
                  startIcon={committing ? <CircularProgress size={18} color="inherit" /> : <SaveIcon />}
                  sx={{
                    background: 'linear-gradient(135deg, #059669, #10b981)',
                    borderRadius: 2,
                    textTransform: 'none',
                    fontWeight: 700,
                    px: 4,
                    '&:hover': {
                      background: 'linear-gradient(135deg, #047857, #059669)',
                    },
                  }}
                >
                  {committing ? 'Kaydediliyor...' : '💾 Sisteme Kaydet'}
                </Button>
              </Box>
            </Box>
          )}

          {/* Commit Result - Reset */}
          {commitResult && (
            <Box sx={{ textAlign: 'center', mt: 1 }}>
              <Button
                variant="contained"
                onClick={handleReset}
                startIcon={<CameraIcon />}
                sx={{
                  background: 'linear-gradient(135deg, #2563eb, #3b82f6)',
                  borderRadius: 2,
                  textTransform: 'none',
                  fontWeight: 600,
                }}
              >
                Yeni Belge Yükle
              </Button>
            </Box>
          )}
        </Box>
      </Collapse>
    </Card>
  );
};

export default ScreenshotImport;
