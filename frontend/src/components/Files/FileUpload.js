// 📤 FILE UPLOAD COMPONENT - ENTERPRISE EDITION
// Drag & drop file upload with progress, validation, preview

import React, { useState, useCallback } from 'react';
import {
  Box,
  Typography,
  Button,
  LinearProgress,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  IconButton,
  Chip
} from '@mui/material';
import {
  CloudUpload as UploadIcon,
  InsertDriveFile as FileIcon,
  Close as CloseIcon,
  CheckCircle as CheckIcon,
  Error as ErrorIcon
} from '@mui/icons-material';
import { useDropzone } from 'react-dropzone';
import api from '../../utils/axios';
import usePanoDosyaYapistir from '../../hooks/usePanoDosyaYapistir';

const FileUpload = ({ open, onClose, onUploadComplete, currentPath = '' }) => {
  const [files, setFiles] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState({});
  const [uploadResults, setUploadResults] = useState([]);
  const [error, setError] = useState(null);

  // 📁 Dosya türü kontrolü
  const validateFile = (file) => {
    const allowedTypes = [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-powerpoint',
      'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      'image/jpeg',
      'image/png',
      'image/gif',
      'text/plain',
      'text/csv'
    ];

    const maxSize = 10 * 1024 * 1024; // 10MB

    if (!allowedTypes.includes(file.type)) {
      return { valid: false, error: 'Desteklenmeyen dosya türü' };
    }

    if (file.size > maxSize) {
      return { valid: false, error: 'Dosya boyutu 10MB\'dan büyük olamaz' };
    }

    return { valid: true };
  };

  // 📤 Dropzone konfigürasyonu
  const onDrop = useCallback((acceptedFiles, rejectedFiles) => {
    setError(null);
    
    // Reddedilen dosyalar için hata göster
    if (rejectedFiles.length > 0) {
      setError(`${rejectedFiles.length} dosya reddedildi. Lütfen desteklenen dosya türlerini kullanın.`);
    }

    // Kabul edilen dosyaları validate et
    const validatedFiles = acceptedFiles.map(file => {
      const validation = validateFile(file);
      return {
        file,
        id: Math.random().toString(36).substr(2, 9),
        name: file.name,
        size: file.size,
        type: file.type,
        status: validation.valid ? 'ready' : 'error',
        error: validation.error || null
      };
    });

    setFiles(prev => [...prev, ...validatedFiles]);
  }, []);

  // 📋 Panodan yapıştırma — dialog kapalıyken sayfanın yapıştırmasını çalmasın diye `aktif`
  usePanoDosyaYapistir((dosyalar) => onDrop(dosyalar, []), { aktif: !!open && !uploading });

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/pdf': ['.pdf'],
      'application/msword': ['.doc'],
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
      'application/vnd.ms-excel': ['.xls'],
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
      'application/vnd.ms-powerpoint': ['.ppt'],
      'application/vnd.openxmlformats-officedocument.presentationml.presentation': ['.pptx'],
      'image/jpeg': ['.jpg', '.jpeg'],
      'image/png': ['.png'],
      'image/gif': ['.gif'],
      'text/plain': ['.txt'],
      'text/csv': ['.csv']
    },
    maxSize: 10 * 1024 * 1024,
    multiple: true
  });

  // 🗑️ Dosya kaldır
  const removeFile = (fileId) => {
    setFiles(prev => prev.filter(f => f.id !== fileId));
  };

  // 📤 Dosyaları yükle
  const handleUpload = async () => {
    const validFiles = files.filter(f => f.status === 'ready');
    
    if (validFiles.length === 0) {
      setError('Yüklenecek geçerli dosya bulunamadı');
      return;
    }

    setUploading(true);
    setError(null);
    setUploadResults([]);

    try {
      const formData = new FormData();
      
      validFiles.forEach(fileObj => {
        formData.append('files', fileObj.file);
      });
      
      formData.append('path', currentPath);

      const response = await api.post('/files/upload', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        },
        onUploadProgress: (progressEvent) => {
          const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
          setUploadProgress({ overall: percentCompleted });
        }
      });

      if (response.data.success) {
        setUploadResults(response.data.data);
        
        // Dosya listesini güncelle
        setFiles(prev => prev.map(f => ({
          ...f,
          status: validFiles.find(vf => vf.id === f.id) ? 'success' : f.status
        })));

        // Parent component'e bildir
        if (onUploadComplete) {
          onUploadComplete(response.data.data);
        }

        // 2 saniye sonra dialog'u kapat
        setTimeout(() => {
          handleClose();
        }, 2000);
      }
    } catch (error) {
      console.error('🚨 Upload hatası:', error);
      setError(error.response?.data?.message || 'Dosyalar yüklenirken hata oluştu');
      
      // Dosya durumlarını hata olarak işaretle
      setFiles(prev => prev.map(f => ({
        ...f,
        status: validFiles.find(vf => vf.id === f.id) ? 'error' : f.status
      })));
    } finally {
      setUploading(false);
      setUploadProgress({});
    }
  };

  // 🧹 Dialog'u kapat ve temizle
  const handleClose = () => {
    if (!uploading) {
      setFiles([]);
      setUploadProgress({});
      setUploadResults([]);
      setError(null);
      onClose();
    }
  };

  // 📊 Dosya boyutunu formatla
  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  // 🎨 Dosya durumu ikonu
  const getStatusIcon = (status) => {
    switch (status) {
      case 'ready':
        return <FileIcon color="primary" />;
      case 'success':
        return <CheckIcon color="success" />;
      case 'error':
        return <ErrorIcon color="error" />;
      default:
        return <FileIcon />;
    }
  };

  // 🎨 Dosya durumu rengi
  const getStatusColor = (status) => {
    switch (status) {
      case 'ready':
        return 'primary';
      case 'success':
        return 'success';
      case 'error':
        return 'error';
      default:
        return 'default';
    }
  };

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      maxWidth="md"
      fullWidth
      disableEscapeKeyDown={uploading}
    >
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
        <UploadIcon color="primary" />
        Dosya Yükle
        {!uploading && (
          <IconButton
            onClick={handleClose}
            sx={{ ml: 'auto' }}
          >
            <CloseIcon />
          </IconButton>
        )}
      </DialogTitle>

      <DialogContent>
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        {uploadResults.length > 0 && (
          <Alert severity="success" sx={{ mb: 2 }}>
            {uploadResults.length} dosya başarıyla yüklendi!
          </Alert>
        )}

        {/* Drag & Drop Area */}
        <Box
          {...getRootProps()}
          sx={{
            border: '2px dashed',
            borderColor: isDragActive ? 'primary.main' : 'grey.300',
            borderRadius: 2,
            p: 4,
            textAlign: 'center',
            backgroundColor: isDragActive ? 'action.hover' : 'background.paper',
            cursor: uploading ? 'not-allowed' : 'pointer',
            mb: 2,
            transition: 'all 0.2s'
          }}
        >
          <input {...getInputProps()} disabled={uploading} />
          <UploadIcon sx={{ fontSize: 48, color: 'text.secondary', mb: 1 }} />
          <Typography variant="h6" color="text.secondary">
            {isDragActive
              ? 'Dosyaları buraya bırakın'
              : 'Dosya yüklemek için tıklayın, sürükleyip bırakın veya Ctrl/⌘+V ile yapıştırın'
            }
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
            PDF, DOC, XLS, PPT, resim dosyaları desteklenir (Max 10MB)
          </Typography>
        </Box>

        {/* Upload Progress */}
        {uploading && uploadProgress.overall !== undefined && (
          <Box sx={{ mb: 2 }}>
            <Typography variant="body2" sx={{ mb: 1 }}>
              Yükleniyor... {uploadProgress.overall}%
            </Typography>
            <LinearProgress variant="determinate" value={uploadProgress.overall} />
          </Box>
        )}

        {/* File List */}
        {files.length > 0 && (
          <Box>
            <Typography variant="h6" sx={{ mb: 1 }}>
              Seçilen Dosyalar ({files.length})
            </Typography>
            <List>
              {files.map((fileObj) => (
                <ListItem
                  key={fileObj.id}
                  sx={{
                    border: 1,
                    borderColor: 'divider',
                    borderRadius: 1,
                    mb: 1
                  }}
                >
                  <ListItemIcon>
                    {getStatusIcon(fileObj.status)}
                  </ListItemIcon>
                  <ListItemText
                    primary={fileObj.name}
                    secondary={
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 0.5 }}>
                        <Chip
                          label={formatFileSize(fileObj.size)}
                          size="small"
                          variant="outlined"
                        />
                        <Chip
                          label={fileObj.status === 'ready' ? 'Hazır' : 
                                fileObj.status === 'success' ? 'Yüklendi' : 
                                fileObj.status === 'error' ? 'Hata' : 'Bilinmiyor'}
                          size="small"
                          color={getStatusColor(fileObj.status)}
                        />
                        {fileObj.error && (
                          <Typography variant="caption" color="error">
                            {fileObj.error}
                          </Typography>
                        )}
                      </Box>
                    }
                  />
                  {!uploading && fileObj.status !== 'success' && (
                    <IconButton
                      onClick={() => removeFile(fileObj.id)}
                      size="small"
                    >
                      <CloseIcon />
                    </IconButton>
                  )}
                </ListItem>
              ))}
            </List>
          </Box>
        )}
      </DialogContent>

      <DialogActions sx={{ p: 3 }}>
        <Button
          onClick={handleClose}
          disabled={uploading}
        >
          İptal
        </Button>
        <Button
          onClick={handleUpload}
          variant="contained"
          disabled={uploading || files.filter(f => f.status === 'ready').length === 0}
          startIcon={<UploadIcon />}
        >
          {uploading ? 'Yükleniyor...' : `${files.filter(f => f.status === 'ready').length} Dosya Yükle`}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default FileUpload;