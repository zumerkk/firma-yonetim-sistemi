// 📥 IMPORT WIZARD
// Genel ingest akışı: dosya seç → önizleme → commit

import React, { useMemo, useRef, useState } from 'react';
import {
  Box,
  Typography,
  Paper,
  Stepper,
  Step,
  StepLabel,
  StepContent,
  Button,
  Alert,
  LinearProgress,
  Divider,
} from '@mui/material';
import {
  CloudUpload as UploadIcon,
  Visibility as PreviewIcon,
  Save as SaveIcon,
  NavigateNext as NextIcon,
  NavigateBefore as BackIcon,
} from '@mui/icons-material';

import LayoutWrapper from '../../components/Layout/LayoutWrapper';
import ingestService from '../../services/ingestService';

const styles = {
  pageContainer: {
    minHeight: '100vh',
    background: 'linear-gradient(135deg, #f0f4ff 0%, #f8fafc 60%, #f5f3ff 100%)',
    p: { xs: 2, sm: 2.5, md: 3 },
  },
  hero: {
    background: 'linear-gradient(135deg, #1e40af 0%, #3730a3 60%, #6d28d9 100%)',
    borderRadius: 3,
    p: { xs: 2.5, sm: 3 },
    mb: 3,
    color: 'white',
  },
  card: {
    borderRadius: 3,
    border: '1px solid rgba(226, 232, 240, 0.9)',
    overflow: 'hidden',
  },
  dropZone: (hasFile) => ({
    border: `2px dashed ${hasFile ? '#10b981' : '#94a3b8'}`,
    borderRadius: 3,
    p: 3,
    textAlign: 'center',
    bgcolor: hasFile ? 'rgba(16, 185, 129, 0.04)' : 'rgba(248, 250, 252, 0.9)',
    transition: 'all 0.2s ease',
    cursor: 'pointer',
    '&:hover': {
      borderColor: '#3b82f6',
      bgcolor: 'rgba(59, 130, 246, 0.03)',
      transform: 'translateY(-1px)',
    },
  }),
  codeBlock: {
    mt: 2,
    p: 2,
    borderRadius: 2,
    border: '1px solid rgba(226, 232, 240, 0.9)',
    background: 'rgba(15, 23, 42, 0.96)',
    color: '#e2e8f0',
    overflow: 'auto',
    fontSize: '0.8rem',
    lineHeight: 1.45,
    maxHeight: 420,
    whiteSpace: 'pre-wrap',
    wordBreak: 'break-word',
  },
};

const ImportWizard = () => {
  const fileInputRef = useRef(null);

  const [activeStep, setActiveStep] = useState(0);
  const [file, setFile] = useState(null);

  const [previewLoading, setPreviewLoading] = useState(false);
  const [commitLoading, setCommitLoading] = useState(false);

  const [previewData, setPreviewData] = useState(null);
  const [ingestSessionId, setIngestSessionId] = useState(null);

  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  const steps = useMemo(
    () => [
      {
        label: 'Dosya Seç',
        description: 'İçe aktarılacak dosyayı yükleyin.',
      },
      {
        label: 'Önizleme',
        description: 'Sistem dosyayı okuyup bir önizleme üretir.',
      },
      {
        label: 'Commit',
        description: 'Önizlemeyi onaylayıp kalıcı kaydı başlatın.',
      },
    ],
    []
  );

  const resetFlow = () => {
    setPreviewData(null);
    setPreviewId(null);
    setError(null);
    setSuccess(null);
  };

  const handlePickFile = () => fileInputRef.current?.click();

  const handleFileChange = (evt) => {
    const picked = evt.target.files?.[0] || null;
    setFile(picked);
    resetFlow();
    setActiveStep(0);
  };

  const handleNext = () => setActiveStep((s) => Math.min(s + 1, steps.length - 1));
  const handleBack = () => setActiveStep((s) => Math.max(s - 1, 0));

  const handlePreview = async () => {
    if (!file) return;
    setError(null);
    setSuccess(null);
    setPreviewLoading(true);

    const result = await ingestService.previewIngest({ file });
    setPreviewLoading(false);

    if (!result?.success) {
      setError(result?.message || 'Önizleme alınamadı');
      return;
    }

    const data = result.data;
    const resolvedSessionId =
      data?.ingestSessionId ||
      data?.ingest_session_id ||
      data?.ingestSessionID ||
      data?.previewId || // geriye dönük uyumluluk (eski UI)
      null;
    setIngestSessionId(resolvedSessionId);
    setPreviewId(resolvedPreviewId);
    setSuccess(result?.message || 'Önizleme hazır');
    setActiveStep(2);
  };

  const handleCommit = async () => {
    setError(null);
    setSuccess(null);
    setCommitLoading(true);

    const { data } = await ingestService.commitIngest({
      ingestSessionId,
      payload: ingestSessionId ? undefined : previewData,
    });

    setCommitLoading(false);

    if (!result?.success) {
      setError(result?.message || 'Commit başarısız');
      return;
    }

    setSuccess(result?.message || 'Commit başarılı');
  };

  return (
    <LayoutWrapper>
      <Box sx={styles.pageContainer}>
        <Box sx={styles.hero}>
          <Typography variant="h4" sx={{ fontWeight: 800, mb: 0.5 }}>
            Import Sihirbazı
          </Typography>
          <Typography variant="body2" sx={{ opacity: 0.92 }}>
            Dosya seçimi → Önizleme → Commit akışı (ingest servisleri).
          </Typography>
        </Box>

        <Paper sx={styles.card}>
          {(previewLoading || commitLoading) && <LinearProgress />}

          <Box sx={{ p: { xs: 2, sm: 2.5 } }}>
            {error && (
              <Alert severity="error" sx={{ mb: 2 }}>
                {error}
              </Alert>
            )}
            {success && (
              <Alert severity="success" sx={{ mb: 2 }}>
                {success}
              </Alert>
            )}

            <Stepper activeStep={activeStep} orientation="vertical">
              {/* Step 1 */}
              <Step>
                <StepLabel>{steps[0].label}</StepLabel>
                <StepContent>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                    {steps[0].description}
                  </Typography>

                  <input
                    ref={fileInputRef}
                    type="file"
                    onChange={handleFileChange}
                    style={{ display: 'none' }}
                  />

                  <Box sx={styles.dropZone(Boolean(file))} onClick={handlePickFile}>
                    <UploadIcon sx={{ fontSize: 32, color: file ? '#10b981' : '#64748b', mb: 1 }} />
                    <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
                      {file ? file.name : 'Dosya seçmek için tıklayın'}
                    </Typography>
                    <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                      CSV / Excel veya backend’in desteklediği formatlar
                    </Typography>
                  </Box>

                  <Box sx={{ mt: 2, display: 'flex', gap: 1 }}>
                    <Button
                      variant="contained"
                      endIcon={<NextIcon />}
                      onClick={handleNext}
                      disabled={!file}
                      sx={{ textTransform: 'none', fontWeight: 700 }}
                    >
                      Devam
                    </Button>
                  </Box>
                </StepContent>
              </Step>

              {/* Step 2 */}
              <Step>
                <StepLabel>{steps[1].label}</StepLabel>
                <StepContent>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                    {steps[1].description}
                  </Typography>

                  <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                    <Button
                      variant="outlined"
                      startIcon={<BackIcon />}
                      onClick={handleBack}
                      sx={{ textTransform: 'none', fontWeight: 700 }}
                    >
                      Geri
                    </Button>
                    <Button
                      variant="contained"
                      startIcon={<PreviewIcon />}
                      onClick={handlePreview}
                      disabled={!file || previewLoading}
                      sx={{ textTransform: 'none', fontWeight: 700 }}
                    >
                      Önizleme Al
                    </Button>
                  </Box>

                  {previewData && (
                    <>
                      <Divider sx={{ my: 2 }} />
                      <Typography variant="subtitle2" sx={{ fontWeight: 800, mb: 1 }}>
                        Önizleme Çıktısı {ingestSessionId ? `(ingestSessionId: ${ingestSessionId})` : ''}
                      </Typography>
                      <Box component="pre" sx={styles.codeBlock}>
                        {JSON.stringify(previewData, null, 2)}
                      </Box>
                    </>
                  )}
                </StepContent>
              </Step>

              {/* Step 3 */}
              <Step>
                <StepLabel>{steps[2].label}</StepLabel>
                <StepContent>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                    {steps[2].description}
                  </Typography>

                  <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                    <Button
                      variant="outlined"
                      startIcon={<BackIcon />}
                      onClick={handleBack}
                      sx={{ textTransform: 'none', fontWeight: 700 }}
                    >
                      Geri
                    </Button>
                    <Button
                      variant="contained"
                      color="success"
                      startIcon={<SaveIcon />}
                      onClick={handleCommit}
                      disabled={commitLoading || !previewData}
                      sx={{ textTransform: 'none', fontWeight: 800 }}
                    >
                      Commit Et
                    </Button>
                  </Box>
                </StepContent>
              </Step>
            </Stepper>
          </Box>
        </Paper>
      </Box>
    </LayoutWrapper>
  );
};

export default ImportWizard;
