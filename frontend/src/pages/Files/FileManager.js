// 📁 FILE MANAGER - ENTERPRISE DOCUMENT MANAGEMENT SUITE
// Comprehensive file management system with upload, storage, versioning, access control

import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Typography,
  Grid,
  Card,
  CardContent,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  IconButton,
  Tooltip,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  LinearProgress,
  Snackbar,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Fab,
  Breadcrumbs,
  Link,
  Chip,
  Avatar
} from '@mui/material';
import {
  CloudUpload as UploadIcon,
  Folder as FolderIcon,
  Download as DownloadIcon,
  Visibility as ViewIcon,
  CreateNewFolder as NewFolderIcon,
  Search as SearchIcon,
  Share as ShareIcon,
  Delete as DeleteIcon
} from '@mui/icons-material';
import { useDropzone } from 'react-dropzone';
import usePanoDosyaYapistir from '../../hooks/usePanoDosyaYapistir';
import Header from '../../components/Layout/Header';
import Sidebar from '../../components/Layout/Sidebar';
import FileUpload from '../../components/Files/FileUpload';
// import { useAuth } from '../../contexts/AuthContext'; // Future use
import api, { uploadPost } from '../../utils/axios';
import UploadProgress from '../../components/common/UploadProgress';

const FileManager = () => {
  // const { user } = useAuth(); // Future use
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 1024);
  const [loading, setLoading] = useState(false);
  
  // 📁 FILE SYSTEM STATE
  const [currentPath, setCurrentPath] = useState([]);
  const [files, setFiles] = useState([]);
  const [folders, setFolders] = useState([]);
  // const [selectedItems, setSelectedItems] = useState([]); // Future use
  
  // 📋 DIALOGS STATE
  const [uploadDialog, setUploadDialog] = useState(false);
  const [yukleme, setYukleme] = useState(null); // dosya yükleme göstergesi
  const setFileDialog = () => {}; // Placeholder  
  const setShareDialog = () => {}; // Placeholder
  
  // 🔍 SEARCH & FILTER STATE
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState('all'); // all, documents, images, others
  const [sortBy, setSortBy] = useState('name'); // name, date, size, type
  
  // 📊 STORAGE STATS
  const [storageStats, setStorageStats] = useState({
    used: 0,
    total: 1000, // 1GB
    files: 0,
    folders: 0
  });
  
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });

  // 📱 Responsive handling
  useEffect(() => {
    const handleResize = () => {
      const mobile = window.innerWidth < 1024;
      setIsMobile(mobile);
      if (mobile) setSidebarOpen(false);
      else setSidebarOpen(true);
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // 📢 Snackbar helper
  const showSnackbar = useCallback((message, severity = 'success') => {
    setSnackbar({ open: true, message, severity });
  }, []);

  // 📂 Load files and folders
  const loadFileSystem = useCallback(async () => {
    setLoading(true);
    try {
      const pathString = currentPath.join('/');
      const response = await api.get(`/files?path=${pathString}&search=${searchQuery}&filter=${filterType}&sort=${sortBy}`);
      
      if (response.data.success) {
        setFiles(response.data.data.files || []);
        setFolders(response.data.data.folders || []);
        setStorageStats(prevStats => response.data.data.stats || prevStats);
      }
    } catch (error) {
      console.error('File system loading error:', error);
      showSnackbar('Dosyalar yüklenirken hata oluştu', 'error');
    } finally {
      setLoading(false);
    }
  }, [currentPath, searchQuery, filterType, sortBy, showSnackbar]);

  useEffect(() => {
    loadFileSystem();
  }, [loadFileSystem]);

  // 📂 NAVIGATION FUNCTIONS
  const navigateToFolder = (folderName) => {
    setCurrentPath(prev => [...prev, folderName]);
  };

  const navigateToPath = (index) => {
    setCurrentPath(prev => prev.slice(0, index + 1));
  };

  // const navigateUp = () => {
  //   if (currentPath.length > 0) {
  //     setCurrentPath(prev => prev.slice(0, -1));
  //   }
  // };

  // 📁 FOLDER OPERATIONS
  /* const createFolder = async (folderData) => {
    try {
      setLoading(true);
      const response = await api.post('/files/folders', {
        name: folderData.name,
        path: currentPath.join('/'),
        description: folderData.description
      });
      
      if (response.data.success) {
        showSnackbar('Klasör başarıyla oluşturuldu', 'success');
        // setFolderDialog({ open: false, mode: 'create', folder: null }); // Placeholder
        loadFileSystem();
      }
    } catch (error) {
      showSnackbar('Klasör oluşturulurken hata oluştu', 'error');
    } finally {
      setLoading(false);
    }
  };

  const deleteFolder = async (folderId) => {
    try {
      setLoading(true);
      const response = await api.delete(`/files/folders/${folderId}`);
      
      if (response.data.success) {
        showSnackbar('Klasör başarıyla silindi', 'success');
        loadFileSystem();
      }
    } catch (error) {
      showSnackbar('Klasör silinirken hata oluştu', 'error');
    } finally {
      setLoading(false);
    }
  }; */

  // 📄 FILE OPERATIONS
  const uploadFiles = async (files) => {
    try {
      setLoading(true);
      const formData = new FormData();
      
      files.forEach(file => {
        formData.append('files', file);
      });
      formData.append('path', currentPath.join('/'));
      
      // Yüzde artık konsola değil ekrana yazılır (müşteri: yükleme göstergesi olsun)
      const response = await uploadPost('/files/upload', formData, {
        onProgress: ({ pct, loaded, total }) => setYukleme({
          fileName: files.length > 1 ? `${files.length} dosya` : files[0]?.name,
          pct, loaded, total
        })
      });
      
      if (response.data.success) {
        showSnackbar(`${files.length} dosya başarıyla yüklendi`, 'success');
        setUploadDialog(false);
        loadFileSystem();
      }
    } catch (error) {
      showSnackbar(error?.kullaniciMesaji || 'Dosya yüklenirken hata oluştu', 'error');
    } finally {
      setLoading(false);
      setYukleme(null);
    }
  };

  const downloadFile = async (fileId, fileName) => {
    try {
      const response = await api.get(`/files/download/${fileId}`, {
        responseType: 'blob'
      });
      
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      
      showSnackbar('Dosya indirildi', 'success');
    } catch (error) {
      showSnackbar('Dosya indirilemedi', 'error');
    }
  };

  const deleteFile = async (fileId) => {
    try {
      setLoading(true);
      const response = await api.delete(`/files/${fileId}`);
      
      if (response.data.success) {
        showSnackbar('Dosya başarıyla silindi', 'success');
        loadFileSystem();
      }
    } catch (error) {
      showSnackbar('Dosya silinirken hata oluştu', 'error');
    } finally {
      setLoading(false);
    }
  };

  // 🎨 FILE TYPE HELPERS
  const getFileIcon = (fileType) => {
    if (fileType.includes('pdf')) return '📄';
    if (fileType.includes('image')) return '🖼️';
    if (fileType.includes('excel') || fileType.includes('spreadsheet')) return '📊';
    if (fileType.includes('word') || fileType.includes('document')) return '📝';
    if (fileType.includes('powerpoint') || fileType.includes('presentation')) return '📽️';
    return '📄';
  };

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  // 📋 Panodan yapıştırma — yükleme dialogu açıkken orası devralır
  usePanoDosyaYapistir(uploadFiles, { aktif: !uploadDialog && !yukleme });

  // 🎯 DROPZONE CONFIG
  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop: uploadFiles,
    accept: {
      'application/*': ['.pdf', '.doc', '.docx', '.xls', '.xlsx', '.ppt', '.pptx'],
      'image/*': ['.png', '.jpg', '.jpeg', '.gif', '.bmp'],
      'text/*': ['.txt', '.csv']
    },
    maxSize: 10 * 1024 * 1024, // 10MB
    multiple: true
  });

  // 📊 STORAGE STATS CARD
  const renderStorageStats = () => (
    <Card sx={{ mb: 3 }}>
      <CardContent>
        <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>
          💾 Depolama Kullanımı
        </Typography>
        
        <Box sx={{ mb: 2 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
            <Typography variant="body2">
              {formatFileSize(storageStats.used)} / {formatFileSize(storageStats.total * 1024 * 1024)}
            </Typography>
            <Typography variant="body2">
              %{Math.round((storageStats.used / (storageStats.total * 1024 * 1024)) * 100)}
            </Typography>
          </Box>
          <LinearProgress 
            variant="determinate" 
            value={(storageStats.used / (storageStats.total * 1024 * 1024)) * 100}
            sx={{ height: 8 }}
          />
        </Box>
        
        <Grid container spacing={2}>
          <Grid item xs={6}>
            <Typography variant="body2" color="text.secondary">
              📁 {storageStats.folders} Klasör
            </Typography>
          </Grid>
          <Grid item xs={6}>
            <Typography variant="body2" color="text.secondary">
              📄 {storageStats.files} Dosya
            </Typography>
          </Grid>
        </Grid>
      </CardContent>
    </Card>
  );

  // 🧭 BREADCRUMB NAVIGATION
  const renderBreadcrumbs = () => (
    <Breadcrumbs sx={{ mb: 2 }}>
      <Link
        component="button"
        variant="body1"
        onClick={() => setCurrentPath([])}
        sx={{ textDecoration: 'none' }}
      >
        🏠 Ana Klasör
      </Link>
      {currentPath.map((folder, index) => (
        <Link
          key={index}
          component="button"
          variant="body1"
          onClick={() => navigateToPath(index)}
          sx={{ textDecoration: 'none' }}
        >
          📁 {folder}
        </Link>
      ))}
    </Breadcrumbs>
  );

  // 📁 FOLDER GRID
  const renderFolders = () => (
    <Grid container spacing={2} sx={{ mb: 3 }}>
      {folders.map((folder) => (
        <Grid item xs={6} sm={4} md={3} lg={2} key={folder._id}>
          <Card
            sx={{
              cursor: 'pointer',
              transition: 'transform 0.2s',
              '&:hover': { transform: 'translateY(-2px)' }
            }}
            onClick={() => navigateToFolder(folder.name)}
          >
            <CardContent sx={{ textAlign: 'center', p: 2 }}>
              <FolderIcon sx={{ fontSize: 48, color: '#fbbf24', mb: 1 }} />
              <Typography variant="body2" sx={{ fontWeight: 600 }}>
                {folder.name}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {folder.fileCount || 0} dosya
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      ))}
    </Grid>
  );

  // 📄 FILE TABLE
  const renderFiles = () => (
    <TableContainer component={Paper}>
      <Table>
        <TableHead sx={{ backgroundColor: '#f8fafc' }}>
          <TableRow>
            <TableCell sx={{ fontWeight: 600 }}>Dosya</TableCell>
            <TableCell sx={{ fontWeight: 600 }}>Boyut</TableCell>
            <TableCell sx={{ fontWeight: 600 }}>Tür</TableCell>
            <TableCell sx={{ fontWeight: 600 }}>Değiştirilme</TableCell>
            <TableCell sx={{ fontWeight: 600 }}>Yükleyen</TableCell>
            <TableCell sx={{ fontWeight: 600 }}>İşlemler</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {files.map((file) => (
            <TableRow key={file._id} hover>
              <TableCell>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                  <Typography sx={{ fontSize: '1.5rem' }}>
                    {getFileIcon(file.type)}
                  </Typography>
                  <Box>
                    <Typography variant="body2" sx={{ fontWeight: 600 }}>
                      {file.name}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {file.description || 'Açıklama yok'}
                    </Typography>
                  </Box>
                </Box>
              </TableCell>
              <TableCell>{formatFileSize(file.size)}</TableCell>
              <TableCell>
                <Chip 
                  label={file.type.split('/')[1] || 'Bilinmiyor'} 
                  size="small" 
                  variant="outlined" 
                />
              </TableCell>
              <TableCell>
                {new Date(file.updatedAt).toLocaleDateString('tr-TR')}
              </TableCell>
              <TableCell>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Avatar sx={{ width: 24, height: 24 }}>
                    {file.uploadedBy?.adSoyad?.charAt(0) || 'U'}
                  </Avatar>
                  <Typography variant="caption">
                    {file.uploadedBy?.adSoyad || 'Bilinmiyor'}
                  </Typography>
                </Box>
              </TableCell>
              <TableCell>
                <Box sx={{ display: 'flex', gap: 1 }}>
                  <Tooltip title="İndir">
                    <IconButton
                      size="small"
                      onClick={() => downloadFile(file._id, file.name)}
                    >
                      <DownloadIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title="Görüntüle">
                    <IconButton
                      size="small"
                      onClick={() => setFileDialog({ open: true, mode: 'view', file })}
                    >
                      <ViewIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title="Paylaş">
                    <IconButton
                      size="small"
                      onClick={() => setShareDialog({ open: true, item: file })}
                    >
                      <ShareIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title="Sil">
                    <IconButton
                      size="small"
                      onClick={() => deleteFile(file._id)}
                      sx={{ color: '#dc2626' }}
                    >
                      <DeleteIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                </Box>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );

  return (
    <Box sx={{ 
      display: 'grid',
      gridTemplateRows: '64px 1fr',
      gridTemplateColumns: {
        xs: '1fr',
        lg: sidebarOpen ? '280px 1fr' : '1fr'
      },
      gridTemplateAreas: {
        xs: '"header" "content"',
        lg: sidebarOpen ? '"header header" "sidebar content"' : '"header" "content"'
      },
      height: '100vh',
      backgroundColor: '#f8fafc'
    }}>
      {/* Header */}
      <Box sx={{ gridArea: 'header', zIndex: 1201 }}>
        <Header onSidebarToggle={() => setSidebarOpen(!sidebarOpen)} />
      </Box>

      {/* Sidebar */}
      {!isMobile && sidebarOpen && (
        <Box sx={{ gridArea: 'sidebar', zIndex: 1200 }}>
          <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} variant="persistent" />
        </Box>
      )}

      {isMobile && (
        <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} variant="temporary" />
      )}

      {/* Main Content */}
      <Box
        component="main"
        sx={{
          gridArea: 'content',
          overflow: 'auto',
          p: { xs: 2, sm: 2.5, md: 3 },
          display: 'flex',
          flexDirection: 'column'
        }}
      >
          {/* Page Header */}
          <Box sx={{ mb: 3 }}>
            <Typography variant="h4" sx={{ fontWeight: 'bold', mb: 1, display: 'flex', alignItems: 'center', gap: 2 }}>
              <FolderIcon sx={{ fontSize: 40, color: '#f59e0b' }} />
              Dosya Yöneticisi
            </Typography>
            <Typography variant="body1" color="text.secondary">
              Belge yükleme, depolama, sürüm kontrolü ve erişim yönetimi
            </Typography>
          </Box>

          <Grid container spacing={3}>
            {/* Left Sidebar - Storage Stats */}
            <Grid item xs={12} md={3}>
              {renderStorageStats()}
              
              {/* Quick Actions */}
              <Card>
                <CardContent>
                  <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>
                    ⚡ Hızlı İşlemler
                  </Typography>
                  
                  <List>
                    <ListItem 
                      button 
                      onClick={() => setUploadDialog(true)}
                      sx={{ mb: 1 }}
                    >
                      <ListItemIcon>
                        <UploadIcon color="primary" />
                      </ListItemIcon>
                      <ListItemText primary="Dosya Yükle" />
                    </ListItem>
                    
                    <ListItem 
                      button 
                      onClick={() => {}}
                      sx={{ mb: 1 }}
                    >
                      <ListItemIcon>
                        <NewFolderIcon color="primary" />
                      </ListItemIcon>
                      <ListItemText primary="Klasör Oluştur" />
                    </ListItem>
                    
                    <ListItem 
                      button
                    >
                      <ListItemIcon>
                        <SearchIcon color="primary" />
                      </ListItemIcon>
                      <ListItemText primary="Gelişmiş Arama" />
                    </ListItem>
                  </List>
                </CardContent>
              </Card>
            </Grid>

            {/* Main Content */}
            <Grid item xs={12} md={9}>
              {/* Navigation & Controls */}
              <Card sx={{ p: 2, mb: 3 }}>
                {renderBreadcrumbs()}
                
                <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', flexWrap: 'wrap' }}>
                  <TextField
                    size="small"
                    placeholder="Dosya ara..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    InputProps={{
                      startAdornment: <SearchIcon sx={{ mr: 1, color: 'text.secondary' }} />
                    }}
                    sx={{ minWidth: 200 }}
                  />
                  
                  <FormControl size="small" sx={{ minWidth: 120 }}>
                    <InputLabel>Filtre</InputLabel>
                    <Select
                      value={filterType}
                      onChange={(e) => setFilterType(e.target.value)}
                    >
                      <MenuItem value="all">Tümü</MenuItem>
                      <MenuItem value="documents">Belgeler</MenuItem>
                      <MenuItem value="images">Resimler</MenuItem>
                      <MenuItem value="others">Diğer</MenuItem>
                    </Select>
                  </FormControl>
                  
                  <FormControl size="small" sx={{ minWidth: 120 }}>
                    <InputLabel>Sırala</InputLabel>
                    <Select
                      value={sortBy}
                      onChange={(e) => setSortBy(e.target.value)}
                    >
                      <MenuItem value="name">İsim</MenuItem>
                      <MenuItem value="date">Tarih</MenuItem>
                      <MenuItem value="size">Boyut</MenuItem>
                      <MenuItem value="type">Tür</MenuItem>
                    </Select>
                  </FormControl>
                </Box>
              </Card>

              {/* Drag & Drop Area */}
              <Card 
                {...getRootProps()} 
                sx={{ 
                  p: 3, 
                  mb: 3, 
                  border: '2px dashed #d1d5db',
                  backgroundColor: isDragActive ? '#f0f9ff' : 'transparent',
                  cursor: 'pointer',
                  transition: 'all 0.2s'
                }}
              >
                <input {...getInputProps()} />
                <Box sx={{ textAlign: 'center' }}>
                  <UploadIcon sx={{ fontSize: 48, color: '#9ca3af', mb: 1 }} />
                  <Typography variant="h6" color="text.secondary">
                    {isDragActive ? 'Dosyaları buraya bırakın' : 'Dosya yüklemek için tıklayın, sürükleyip bırakın veya Ctrl/⌘+V ile yapıştırın'}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    PDF, DOC, XLS, PPT, resim dosyaları desteklenir (Max 10MB)
                  </Typography>
                </Box>
              </Card>

              {/* Content */}
              <UploadProgress active={!!yukleme} {...(yukleme || {})} />
              {loading && !yukleme && <LinearProgress sx={{ mb: 2 }} />}
              
              {renderFolders()}
              {renderFiles()}
            </Grid>
          </Grid>

          {/* Floating Action Button */}
          <Fab
            color="primary"
            aria-label="upload"
            sx={{ position: 'fixed', bottom: 16, right: 16 }}
            onClick={() => setUploadDialog(true)}
          >
            <UploadIcon />
          </Fab>

        {/* Snackbar */}
        <Snackbar
          open={snackbar.open}
          autoHideDuration={6000}
          onClose={() => setSnackbar(prev => ({ ...prev, open: false }))}
          message={snackbar.message}
        />

        {/* File Upload Dialog */}
        <FileUpload
          open={uploadDialog}
          onClose={() => setUploadDialog(false)}
          onUploadComplete={(uploadedFiles) => {
            showSnackbar(`${uploadedFiles.length} dosya başarıyla yüklendi`, 'success');
            loadFileSystem();
          }}
          currentPath={currentPath.join('/')}
        />
      </Box>
    </Box>
  );
};

export default FileManager;