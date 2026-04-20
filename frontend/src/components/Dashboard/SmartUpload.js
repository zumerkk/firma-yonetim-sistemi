// 🧠 SmartUpload - Dashboard Akıllı Dosya Yükleme Modülü
// Dosyayı otomatik analiz edip türünü algılar ve sisteme aktarır

import React, { useState, useRef, useCallback } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Button,
  Chip,
  LinearProgress,
  Alert,
  Avatar,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  IconButton,
  Collapse,
  Fade,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
} from '@mui/material';
import {
  CloudUpload as UploadIcon,
  AutoAwesome as SmartIcon,
  Business as FirmaIcon,
  EmojiEvents as TesvikIcon,
  Assignment as DosyaIcon,
  Build as MakineIcon,
  HelpOutline as UnknownIcon,
  CheckCircle as SuccessIcon,
  Error as ErrorIcon,
  Close as CloseIcon,
  ExpandMore as ExpandIcon,
  ExpandLess as CollapseIcon,
  Save as SaveIcon,
  Refresh as ResetIcon,
  TableChart as TableIcon,
  InsertDriveFile as FileIcon,
} from '@mui/icons-material';
import ingestService from '../../services/ingestService';

// Modül konfigürasyonları
const MODULE_CONFIG = {
  FIRMA: {
    label: 'Firma Listesi',
    icon: <FirmaIcon />,
    color: '#059669',
    gradient: 'linear-gradient(135deg, #064e3b 0%, #059669 100%)',
    bgLight: 'rgba(5, 150, 105, 0.08)',
    borderLight: 'rgba(5, 150, 105, 0.25)',
    emoji: '🏢',
  },
  TESVIK: {
    label: 'Eski Teşvik Belgesi',
    icon: <TesvikIcon />,
    color: '#dc2626',
    gradient: 'linear-gradient(135deg, #7f1d1d 0%, #dc2626 100%)',
    bgLight: 'rgba(220, 38, 38, 0.08)',
    borderLight: 'rgba(220, 38, 38, 0.25)',
    emoji: '🏆',
  },
  YENI_TESVIK: {
    label: 'Yeni Teşvik Belgesi',
    icon: <TesvikIcon />,
    color: '#2563eb',
    gradient: 'linear-gradient(135deg, #1e3a8a 0%, #2563eb 100%)',
    bgLight: 'rgba(37, 99, 235, 0.08)',
    borderLight: 'rgba(37, 99, 235, 0.25)',
    emoji: '🆕',
  },
  DOSYA_TAKIP: {
    label: 'Dosya İş Akış Takip',
    icon: <DosyaIcon />,
    color: '#d97706',
    gradient: 'linear-gradient(135deg, #92400e 0%, #d97706 100%)',
    bgLight: 'rgba(217, 119, 6, 0.08)',
    borderLight: 'rgba(217, 119, 6, 0.25)',
    emoji: '📋',
  },
  MAKINE_LIST: {
    label: 'Makine Teçhizat Listesi',
    icon: <MakineIcon />,
    color: '#7c3aed',
    gradient: 'linear-gradient(135deg, #4c1d95 0%, #7c3aed 100%)',
    bgLight: 'rgba(124, 58, 237, 0.08)',
    borderLight: 'rgba(124, 58, 237, 0.25)',
    emoji: '🔧',
  },
  UNKNOWN: {
    label: 'Bilinmeyen Format',
    icon: <UnknownIcon />,
    color: '#64748b',
    gradient: 'linear-gradient(135deg, #334155 0%, #64748b 100%)',
    bgLight: 'rgba(100, 116, 139, 0.08)',
    borderLight: 'rgba(100, 116, 139, 0.25)',
    emoji: '❓',
  },
};

const SmartUpload = () => {
  const fileInputRef = useRef(null);
  const dropZoneRef = useRef(null);

  // State
  const [file, setFile] = useState(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [commitLoading, setCommitLoading] = useState(false);
  const [previewData, setPreviewData] = useState(null);
  const [ingestSessionId, setIngestSessionId] = useState(null);
  const [commitResult, setCommitResult] = useState(null);
  const [error, setError] = useState(null);
  const [showPreviewTable, setShowPreviewTable] = useState(true);
  const [commitMode, setCommitMode] = useState('upsert');
  const [collapsed, setCollapsed] = useState(false);

  // Drag & Drop handlers
  const handleDragEnter = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.currentTarget === dropZoneRef.current) {
      setIsDragOver(false);
    }
  }, []);

  const handleDragOver = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);

    const droppedFile = e.dataTransfer.files?.[0];
    if (droppedFile) {
      handleFileSelected(droppedFile);
    }
  }, []);

  // File selection & preview
  const handleFileSelected = async (selectedFile) => {
    setFile(selectedFile);
    setPreviewData(null);
    setCommitResult(null);
    setError(null);
    setIngestSessionId(null);
    setCollapsed(false);

    // Auto-preview
    setPreviewLoading(true);
    try {
      const result = await ingestService.previewIngest({ file: selectedFile });

      if (!result?.success) {
        setError(result?.message || 'Dosya analiz edilemedi');
        setPreviewLoading(false);
        return;
      }

      const data = result.data;
      setPreviewData(data);
      setIngestSessionId(
        data?.ingestSessionId ||
        data?.ingest_session_id ||
        data?.ingestSessionID ||
        data?.previewId ||
        null
      );
    } catch (err) {
      setError(err.message || 'Beklenmeyen hata');
    }
    setPreviewLoading(false);
  };

  const handleFileInputChange = (e) => {
    const picked = e.target.files?.[0];
    if (picked) handleFileSelected(picked);
    // Reset input so same file can be re-picked
    e.target.value = '';
  };

  // Commit
  const handleCommit = async () => {
    if (!ingestSessionId) return;
    setError(null);
    setCommitLoading(true);

    try {
      const result = await ingestService.commitIngest({
        ingestSessionId,
        mode: commitMode,
      });

      if (!result?.success) {
        setError(result?.message || 'Kayıt başarısız');
        setCommitLoading(false);
        return;
      }

      setCommitResult(result.data);
    } catch (err) {
      setError(err.message || 'Commit hatası');
    }
    setCommitLoading(false);
  };

  // Reset
  const resetAll = () => {
    setFile(null);
    setPreviewData(null);
    setCommitResult(null);
    setError(null);
    setIngestSessionId(null);
    setPreviewLoading(false);
    setCommitLoading(false);
  };

  // Get module config
  const getModuleConfig = () => {
    if (!previewData?.classification?.module) return MODULE_CONFIG.UNKNOWN;
    return MODULE_CONFIG[previewData.classification.module] || MODULE_CONFIG.UNKNOWN;
  };

  const moduleConfig = getModuleConfig();
  const confidence = previewData?.classification?.confidence || 0;
  const confidencePercent = Math.round(confidence * 100);
  const rowCount = previewData?.rowPreview?.length || 0;
  const totalRows = previewData?.payloadRows?.length || previewData?.rowPreview?.length || 0;
  const headerCount = previewData?.headers?.length || 0;
  const mappingCount = previewData?.mapping ? Object.keys(previewData.mapping).filter(k => previewData.mapping[k]).length : 0;

  return (
    <Card
      id="smart-upload-module"
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
          background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 60%, #334155 100%)',
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
          <Avatar
            sx={{
              width: 36,
              height: 36,
              background: 'linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%)',
              boxShadow: '0 4px 14px rgba(59, 130, 246, 0.35)',
            }}
          >
            <SmartIcon sx={{ fontSize: 20 }} />
          </Avatar>
          <Box>
            <Typography
              variant="subtitle1"
              sx={{
                fontWeight: 800,
                color: 'white',
                fontSize: '1rem',
                lineHeight: 1.2,
              }}
            >
              🧠 Akıllı Dosya Yükleme
            </Typography>
            <Typography
              variant="caption"
              sx={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.7rem' }}
            >
              Excel/CSV dosyanızı yükleyin • Sistem otomatik algılasın
            </Typography>
          </Box>
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          {file && !commitResult && (
            <Chip
              label={file.name}
              size="small"
              icon={<FileIcon sx={{ fontSize: 14 }} />}
              onDelete={resetAll}
              sx={{
                background: 'rgba(255,255,255,0.12)',
                color: 'white',
                fontSize: '0.7rem',
                height: 24,
                maxWidth: 200,
                '& .MuiChip-deleteIcon': { color: 'rgba(255,255,255,0.5)' },
              }}
            />
          )}
          <IconButton size="small" sx={{ color: 'rgba(255,255,255,0.5)' }}>
            {collapsed ? <ExpandIcon /> : <CollapseIcon />}
          </IconButton>
        </Box>
      </Box>

      {/* Loading Bar */}
      {(previewLoading || commitLoading) && (
        <LinearProgress
          sx={{
            height: 3,
            '& .MuiLinearProgress-bar': {
              background: 'linear-gradient(90deg, #3b82f6, #8b5cf6, #3b82f6)',
              backgroundSize: '200% 100%',
              animation: 'shimmer 2s linear infinite',
            },
            '@keyframes shimmer': {
              '0%': { backgroundPosition: '200% 0' },
              '100%': { backgroundPosition: '-200% 0' },
            },
          }}
        />
      )}

      <Collapse in={!collapsed}>
        <CardContent sx={{ p: { xs: 2, sm: 3 } }}>
          {/* Error Alert */}
          {error && (
            <Alert
              severity="error"
              onClose={() => setError(null)}
              sx={{ mb: 2, borderRadius: 2, fontSize: '0.8rem' }}
            >
              {error}
            </Alert>
          )}

          {/* ========== PHASE 1: Drop Zone (no file) ========== */}
          {!file && !commitResult && (
            <Box
              ref={dropZoneRef}
              onDragEnter={handleDragEnter}
              onDragLeave={handleDragLeave}
              onDragOver={handleDragOver}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              sx={{
                border: `2px dashed ${isDragOver ? '#3b82f6' : '#cbd5e1'}`,
                borderRadius: 3,
                py: { xs: 3, sm: 4 },
                px: 3,
                textAlign: 'center',
                cursor: 'pointer',
                transition: 'all 0.3s ease',
                background: isDragOver
                  ? 'rgba(59, 130, 246, 0.04)'
                  : 'rgba(248, 250, 252, 0.6)',
                '&:hover': {
                  borderColor: '#3b82f6',
                  background: 'rgba(59, 130, 246, 0.03)',
                  transform: 'translateY(-1px)',
                  boxShadow: '0 4px 12px rgba(59, 130, 246, 0.08)',
                },
              }}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx,.xls,.csv"
                onChange={handleFileInputChange}
                style={{ display: 'none' }}
              />
              <UploadIcon
                sx={{
                  fontSize: 44,
                  color: isDragOver ? '#3b82f6' : '#94a3b8',
                  mb: 1.5,
                  transition: 'all 0.3s ease',
                }}
              />
              <Typography
                variant="subtitle1"
                sx={{ fontWeight: 700, color: '#334155', mb: 0.5 }}
              >
                Excel veya CSV dosyanızı sürükleyin
              </Typography>
              <Typography variant="body2" sx={{ color: '#64748b', fontSize: '0.8rem', mb: 1.5 }}>
                Sistem dosyayı otomatik olarak tanıyacak: Firma, Teşvik, Dosya Takip, Makine...
              </Typography>
              <Box sx={{ display: 'flex', gap: 1, justifyContent: 'center', flexWrap: 'wrap' }}>
                {['🏢 Firma', '🏆 Teşvik', '🆕 Yeni Teşvik', '📋 Dosya Takip', '🔧 Makine'].map(
                  (label) => (
                    <Chip
                      key={label}
                      label={label}
                      size="small"
                      variant="outlined"
                      sx={{
                        fontSize: '0.68rem',
                        height: 22,
                        borderColor: 'rgba(148, 163, 184, 0.4)',
                        color: '#64748b',
                      }}
                    />
                  )
                )}
              </Box>
            </Box>
          )}

          {/* ========== PHASE 2: Preview Results ========== */}
          {previewData && !commitResult && (
            <Fade in timeout={500}>
              <Box>
                {/* Detection Result Card */}
                <Box
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 2,
                    p: 2,
                    borderRadius: 2.5,
                    background: moduleConfig.bgLight,
                    border: `1px solid ${moduleConfig.borderLight}`,
                    mb: 2,
                  }}
                >
                  <Avatar
                    sx={{
                      width: 48,
                      height: 48,
                      background: moduleConfig.gradient,
                      boxShadow: `0 4px 14px ${moduleConfig.color}30`,
                    }}
                  >
                    {moduleConfig.icon}
                  </Avatar>
                  <Box sx={{ flex: 1 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                      <Typography
                        variant="subtitle1"
                        sx={{ fontWeight: 800, color: moduleConfig.color, fontSize: '0.95rem' }}
                      >
                        {moduleConfig.emoji} {moduleConfig.label}
                      </Typography>
                      <Chip
                        label={`${confidencePercent}% güven`}
                        size="small"
                        sx={{
                          height: 20,
                          fontSize: '0.68rem',
                          fontWeight: 700,
                          background:
                            confidencePercent >= 80
                              ? 'rgba(5, 150, 105, 0.12)'
                              : confidencePercent >= 60
                              ? 'rgba(217, 119, 6, 0.12)'
                              : 'rgba(220, 38, 38, 0.12)',
                          color:
                            confidencePercent >= 80
                              ? '#059669'
                              : confidencePercent >= 60
                              ? '#d97706'
                              : '#dc2626',
                        }}
                      />
                    </Box>
                    <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                      <Typography variant="caption" sx={{ color: '#64748b', fontSize: '0.75rem' }}>
                        📊 <strong>{totalRows}</strong> satır bulundu
                      </Typography>
                      <Typography variant="caption" sx={{ color: '#64748b', fontSize: '0.75rem' }}>
                        📋 <strong>{headerCount}</strong> kolon
                      </Typography>
                      <Typography variant="caption" sx={{ color: '#64748b', fontSize: '0.75rem' }}>
                        🔗 <strong>{mappingCount}</strong> eşleştirildi
                      </Typography>
                    </Box>
                  </Box>
                  <IconButton size="small" onClick={resetAll} sx={{ color: '#94a3b8' }}>
                    <CloseIcon fontSize="small" />
                  </IconButton>
                </Box>

                {/* Preview Table */}
                {previewData.rowPreview && previewData.rowPreview.length > 0 && (
                  <Box sx={{ mb: 2 }}>
                    <Box
                      sx={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        mb: 1,
                      }}
                    >
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
                        <TableIcon sx={{ fontSize: 16, color: '#64748b' }} />
                        <Typography
                          variant="subtitle2"
                          sx={{ fontWeight: 700, fontSize: '0.8rem', color: '#334155' }}
                        >
                          Önizleme (ilk {Math.min(rowCount, 5)} satır)
                        </Typography>
                      </Box>
                      <IconButton
                        size="small"
                        onClick={() => setShowPreviewTable(!showPreviewTable)}
                      >
                        {showPreviewTable ? (
                          <CollapseIcon sx={{ fontSize: 18 }} />
                        ) : (
                          <ExpandIcon sx={{ fontSize: 18 }} />
                        )}
                      </IconButton>
                    </Box>

                    <Collapse in={showPreviewTable}>
                      <TableContainer
                        sx={{
                          borderRadius: 2,
                          border: '1px solid rgba(226, 232, 240, 0.7)',
                          maxHeight: 260,
                          overflow: 'auto',
                        }}
                      >
                        <Table size="small" stickyHeader>
                          <TableHead>
                            <TableRow>
                              <TableCell
                                sx={{
                                  fontWeight: 700,
                                  fontSize: '0.68rem',
                                  background: '#f1f5f9',
                                  color: '#475569',
                                  py: 1,
                                  whiteSpace: 'nowrap',
                                  borderBottom: '2px solid #e2e8f0',
                                }}
                              >
                                #
                              </TableCell>
                              {(previewData.headers || []).slice(0, 8).map((h, i) => (
                                <TableCell
                                  key={i}
                                  sx={{
                                    fontWeight: 700,
                                    fontSize: '0.68rem',
                                    background: '#f1f5f9',
                                    color: '#475569',
                                    py: 1,
                                    whiteSpace: 'nowrap',
                                    borderBottom: '2px solid #e2e8f0',
                                    maxWidth: 150,
                                    overflow: 'hidden',
                                    textOverflow: 'ellipsis',
                                  }}
                                >
                                  {h}
                                  {previewData.mapping?.[h] && (
                                    <Typography
                                      component="span"
                                      sx={{
                                        display: 'block',
                                        fontSize: '0.6rem',
                                        color: moduleConfig.color,
                                        fontWeight: 600,
                                      }}
                                    >
                                      → {previewData.mapping[h]}
                                    </Typography>
                                  )}
                                </TableCell>
                              ))}
                              {(previewData.headers || []).length > 8 && (
                                <TableCell
                                  sx={{
                                    fontWeight: 700,
                                    fontSize: '0.68rem',
                                    background: '#f1f5f9',
                                    color: '#94a3b8',
                                    py: 1,
                                  }}
                                >
                                  +{previewData.headers.length - 8} daha
                                </TableCell>
                              )}
                            </TableRow>
                          </TableHead>
                          <TableBody>
                            {previewData.rowPreview.slice(0, 5).map((row, rIdx) => (
                              <TableRow
                                key={rIdx}
                                sx={{ '&:hover': { background: 'rgba(59, 130, 246, 0.02)' } }}
                              >
                                <TableCell
                                  sx={{ fontSize: '0.7rem', color: '#94a3b8', py: 0.75 }}
                                >
                                  {rIdx + 1}
                                </TableCell>
                                {(previewData.headers || []).slice(0, 8).map((h, cIdx) => (
                                  <TableCell
                                    key={cIdx}
                                    sx={{
                                      fontSize: '0.7rem',
                                      color: '#334155',
                                      py: 0.75,
                                      maxWidth: 150,
                                      overflow: 'hidden',
                                      textOverflow: 'ellipsis',
                                      whiteSpace: 'nowrap',
                                    }}
                                  >
                                    {row[h] != null ? String(row[h]).substring(0, 40) : '—'}
                                  </TableCell>
                                ))}
                                {(previewData.headers || []).length > 8 && (
                                  <TableCell sx={{ fontSize: '0.65rem', color: '#94a3b8' }}>
                                    …
                                  </TableCell>
                                )}
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </TableContainer>
                    </Collapse>
                  </Box>
                )}

                {/* Action Buttons */}
                <Box
                  sx={{
                    display: 'flex',
                    gap: 1.5,
                    flexWrap: 'wrap',
                    alignItems: 'center',
                  }}
                >
                  <Button
                    variant="contained"
                    startIcon={<SaveIcon />}
                    onClick={handleCommit}
                    disabled={commitLoading || !ingestSessionId}
                    sx={{
                      textTransform: 'none',
                      fontWeight: 800,
                      borderRadius: 2,
                      px: 3,
                      py: 1,
                      background: moduleConfig.gradient,
                      boxShadow: `0 4px 14px ${moduleConfig.color}30`,
                      '&:hover': {
                        boxShadow: `0 6px 20px ${moduleConfig.color}40`,
                      },
                    }}
                  >
                    {commitLoading ? 'Kaydediliyor...' : `✅ Sisteme Kaydet (${totalRows} satır)`}
                  </Button>

                  <FormControl size="small" sx={{ minWidth: 140 }}>
                    <InputLabel sx={{ fontSize: '0.75rem' }}>Mod</InputLabel>
                    <Select
                      label="Mod"
                      value={commitMode}
                      onChange={(e) => setCommitMode(e.target.value)}
                      sx={{ fontSize: '0.75rem', borderRadius: 2 }}
                    >
                      <MenuItem value="upsert" sx={{ fontSize: '0.75rem' }}>
                        Upsert (Önerilen)
                      </MenuItem>
                      <MenuItem value="create_only" sx={{ fontSize: '0.75rem' }}>
                        Sadece Yeni
                      </MenuItem>
                    </Select>
                  </FormControl>

                  <Button
                    variant="outlined"
                    startIcon={<ResetIcon />}
                    onClick={resetAll}
                    size="small"
                    sx={{
                      textTransform: 'none',
                      fontWeight: 600,
                      borderRadius: 2,
                      fontSize: '0.75rem',
                      borderColor: '#cbd5e1',
                      color: '#64748b',
                    }}
                  >
                    Sıfırla
                  </Button>
                </Box>
              </Box>
            </Fade>
          )}

          {/* ========== PHASE 3: Commit Result ========== */}
          {commitResult && (
            <Fade in timeout={400}>
              <Box>
                <Alert
                  severity="success"
                  icon={<SuccessIcon sx={{ fontSize: 28 }} />}
                  sx={{
                    borderRadius: 2.5,
                    mb: 2,
                    background: 'rgba(5, 150, 105, 0.06)',
                    border: '1px solid rgba(5, 150, 105, 0.2)',
                    '& .MuiAlert-message': { width: '100%' },
                  }}
                >
                  <Typography variant="subtitle1" sx={{ fontWeight: 800, mb: 1, fontSize: '0.95rem' }}>
                    ✅ İşlem Tamamlandı!
                  </Typography>
                  <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                    {commitResult.created > 0 && (
                      <Chip
                        label={`${commitResult.created} yeni oluşturuldu`}
                        size="small"
                        sx={{
                          height: 24,
                          fontSize: '0.72rem',
                          fontWeight: 700,
                          background: 'rgba(5, 150, 105, 0.12)',
                          color: '#059669',
                        }}
                      />
                    )}
                    {commitResult.updated > 0 && (
                      <Chip
                        label={`${commitResult.updated} güncellendi`}
                        size="small"
                        sx={{
                          height: 24,
                          fontSize: '0.72rem',
                          fontWeight: 700,
                          background: 'rgba(37, 99, 235, 0.12)',
                          color: '#2563eb',
                        }}
                      />
                    )}
                    {commitResult.skipped > 0 && (
                      <Chip
                        label={`${commitResult.skipped} atlandı`}
                        size="small"
                        sx={{
                          height: 24,
                          fontSize: '0.72rem',
                          fontWeight: 700,
                          background: 'rgba(100, 116, 139, 0.12)',
                          color: '#64748b',
                        }}
                      />
                    )}
                    {commitResult.errorsCount > 0 && (
                      <Chip
                        icon={<ErrorIcon sx={{ fontSize: 14 }} />}
                        label={`${commitResult.errorsCount} hata`}
                        size="small"
                        sx={{
                          height: 24,
                          fontSize: '0.72rem',
                          fontWeight: 700,
                          background: 'rgba(220, 38, 38, 0.12)',
                          color: '#dc2626',
                        }}
                      />
                    )}
                  </Box>
                </Alert>

                {/* Error details */}
                {commitResult.errors && commitResult.errors.length > 0 && (
                  <Box
                    sx={{
                      mt: 1,
                      mb: 2,
                      p: 1.5,
                      borderRadius: 2,
                      background: 'rgba(220, 38, 38, 0.04)',
                      border: '1px solid rgba(220, 38, 38, 0.15)',
                      maxHeight: 160,
                      overflow: 'auto',
                    }}
                  >
                    <Typography
                      variant="caption"
                      sx={{ fontWeight: 700, color: '#dc2626', display: 'block', mb: 0.5 }}
                    >
                      Hata Detayları:
                    </Typography>
                    {commitResult.errors.slice(0, 5).map((err, i) => (
                      <Typography
                        key={i}
                        variant="caption"
                        sx={{ color: '#991b1b', display: 'block', fontSize: '0.68rem' }}
                      >
                        • Satır {err.row}: {(err.issues || []).join(', ')}
                      </Typography>
                    ))}
                    {commitResult.errors.length > 5 && (
                      <Typography
                        variant="caption"
                        sx={{ color: '#94a3b8', fontStyle: 'italic', fontSize: '0.65rem' }}
                      >
                        ... ve {commitResult.errors.length - 5} hata daha
                      </Typography>
                    )}
                  </Box>
                )}

                <Button
                  variant="outlined"
                  startIcon={<UploadIcon />}
                  onClick={resetAll}
                  sx={{
                    textTransform: 'none',
                    fontWeight: 700,
                    borderRadius: 2,
                    borderColor: '#cbd5e1',
                    color: '#475569',
                  }}
                >
                  Yeni Dosya Yükle
                </Button>
              </Box>
            </Fade>
          )}
        </CardContent>
      </Collapse>
    </Card>
  );
};

export default SmartUpload;
