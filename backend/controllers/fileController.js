// 📁 FILE CONTROLLER - ENTERPRISE FILE MANAGEMENT SUITE
// Comprehensive file operations for upload, download, folder management, versioning

const multer = require('multer');
const path = require('path');
const fs = require('fs');
const Activity = require('../models/Activity');

// 📁 File storage configuration
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadPath = req.body.path || '';
    const fullPath = path.join(__dirname, '../uploads/files', uploadPath);
    
    // Create directory if it doesn't exist
    if (!fs.existsSync(fullPath)) {
      fs.mkdirSync(fullPath, { recursive: true });
    }
    
    cb(null, fullPath);
  },
  filename: (req, file, cb) => {
    // Generate unique filename
    const timestamp = Date.now();
    const ext = path.extname(file.originalname);
    const name = path.basename(file.originalname, ext);
    cb(null, `${name}_${timestamp}${ext}`);
  }
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    // Allow common file types
    const allowedTypes = /\.(pdf|doc|docx|xls|xlsx|ppt|pptx|png|jpg|jpeg|gif|txt|csv)$/i;
    if (allowedTypes.test(file.originalname)) {
      cb(null, true);
    } else {
      cb(new Error('Desteklenmeyen dosya türü'), false);
    }
  }
});

// 📂 GET /api/files - Get files and folders
const getFiles = async (req, res) => {
  try {
    const { path: requestPath = '', search = '', filter = 'all', sort = 'name' } = req.query;
    
    console.log('📂 Dosyalar istendi:', { requestPath, search, filter, sort });
    
    const fullPath = path.join(__dirname, '../uploads/files', requestPath);
    
    if (!fs.existsSync(fullPath)) {
      return res.status(200).json({
        success: true,
        data: {
          files: [],
          folders: [],
          stats: { used: 0, total: 1000, files: 0, folders: 0 }
        }
      });
    }
    
    const items = fs.readdirSync(fullPath);
    const files = [];
    const folders = [];
    
    for (const item of items) {
      const itemPath = path.join(fullPath, item);
      const stats = fs.statSync(itemPath);
      
      if (stats.isDirectory()) {
        const fileCount = fs.readdirSync(itemPath).length;
        folders.push({
          _id: item,
          name: item,
          fileCount,
          createdAt: stats.birthtime,
          updatedAt: stats.mtime
        });
      } else {
        // Apply search filter
        if (search && !item.toLowerCase().includes(search.toLowerCase())) {
          continue;
        }
        
        // Apply type filter
        const ext = path.extname(item).toLowerCase();
        const isDocument = ['.pdf', '.doc', '.docx', '.xls', '.xlsx', '.ppt', '.pptx'].includes(ext);
        const isImage = ['.png', '.jpg', '.jpeg', '.gif', '.bmp'].includes(ext);
        
        if (filter === 'documents' && !isDocument) continue;
        if (filter === 'images' && !isImage) continue;
        if (filter === 'others' && (isDocument || isImage)) continue;
        
        files.push({
          _id: item,
          name: item,
          size: stats.size,
          type: `application/${ext.substring(1)}`,
          description: '',
          uploadedBy: { adSoyad: 'Sistem', email: 'system@company.com' },
          createdAt: stats.birthtime,
          updatedAt: stats.mtime
        });
      }
    }
    
    // Apply sorting
    const sortFiles = (a, b) => {
      switch (sort) {
        case 'date':
          return new Date(b.updatedAt) - new Date(a.updatedAt);
        case 'size':
          return (b.size || 0) - (a.size || 0);
        case 'type':
          return a.type?.localeCompare(b.type || '') || 0;
        default: // name
          return a.name.localeCompare(b.name);
      }
    };
    
    files.sort(sortFiles);
    folders.sort((a, b) => a.name.localeCompare(b.name));
    
    // Calculate storage stats
    const calculateSize = (dirPath) => {
      let totalSize = 0;
      const items = fs.readdirSync(dirPath);
      
      for (const item of items) {
        const itemPath = path.join(dirPath, item);
        const stats = fs.statSync(itemPath);
        
        if (stats.isDirectory()) {
          totalSize += calculateSize(itemPath);
        } else {
          totalSize += stats.size;
        }
      }
      
      return totalSize;
    };
    
    const baseDir = path.join(__dirname, '../uploads/files');
    const totalUsed = fs.existsSync(baseDir) ? calculateSize(baseDir) : 0;
    
    const stats = {
      used: totalUsed,
      total: 1000 * 1024 * 1024, // 1GB in bytes
      files: files.length,
      folders: folders.length
    };
    
    console.log('✅ Dosya listesi hazırlandı:', { files: files.length, folders: folders.length });
    
    res.status(200).json({
      success: true,
      data: { files, folders, stats }
    });

  } catch (error) {
    console.error('🚨 Dosya listesi hatası:', error);
    res.status(500).json({
      success: false,
      message: 'Dosyalar yüklenirken hata oluştu',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// 📤 POST /api/files/upload - Upload files
const uploadFiles = async (req, res) => {
  try {
    const uploadMiddleware = upload.array('files', 10); // Max 10 files
    
    uploadMiddleware(req, res, async (err) => {
      if (err) {
        console.error('🚨 Upload hatası:', err);
        return res.status(400).json({
          success: false,
          message: err.message || 'Dosya yüklenirken hata oluştu'
        });
      }
      
      const uploadedFiles = req.files || [];
      console.log('📤 Dosyalar yüklendi:', uploadedFiles.length);
      
      // Log activity
      await Activity.logActivity({
        userId: req.user._id,
        action: 'upload',
        category: 'system',
        details: `${uploadedFiles.length} dosya yüklendi`,
        metadata: {
          uploadedBy: req.user.adSoyad,
          fileCount: uploadedFiles.length,
          path: req.body.path || '',
          files: uploadedFiles.map(f => f.originalname)
        }
      });
      
      res.status(200).json({
        success: true,
        message: `${uploadedFiles.length} dosya başarıyla yüklendi`,
        data: uploadedFiles.map(file => ({
          name: file.filename,
          originalName: file.originalname,
          size: file.size,
          path: file.path
        }))
      });
    });

  } catch (error) {
    console.error('🚨 Upload controller hatası:', error);
    res.status(500).json({
      success: false,
      message: 'Dosya yüklenirken hata oluştu',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// 📥 GET /api/files/download/:filename - Download file
const downloadFile = async (req, res) => {
  try {
    const { filename } = req.params;
    const { path: requestPath = '' } = req.query;
    
    console.log('📥 Dosya indiriliyor:', filename);
    
    const filePath = path.join(__dirname, '../uploads/files', requestPath, filename);
    
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({
        success: false,
        message: 'Dosya bulunamadı'
      });
    }
    
    // Log activity
    await Activity.logActivity({
      userId: req.user._id,
      action: 'download',
      category: 'system',
      details: `Dosya indirildi: ${filename}`,
      metadata: {
        downloadedBy: req.user.adSoyad,
        filename,
        path: requestPath
      }
    });
    
    res.download(filePath, filename);

  } catch (error) {
    console.error('🚨 Download hatası:', error);
    res.status(500).json({
      success: false,
      message: 'Dosya indirilemedi',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// 🗑️ DELETE /api/files/:filename - Delete file
const deleteFile = async (req, res) => {
  try {
    const { filename } = req.params;
    const { path: requestPath = '' } = req.query;
    
    console.log('🗑️ Dosya siliniyor:', filename);
    
    const filePath = path.join(__dirname, '../uploads/files', requestPath, filename);
    
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({
        success: false,
        message: 'Dosya bulunamadı'
      });
    }
    
    fs.unlinkSync(filePath);
    
    // Log activity
    await Activity.logActivity({
      userId: req.user._id,
      action: 'delete',
      category: 'system',
      details: `Dosya silindi: ${filename}`,
      metadata: {
        deletedBy: req.user.adSoyad,
        filename,
        path: requestPath
      }
    });
    
    console.log('✅ Dosya silindi:', filename);
    
    res.status(200).json({
      success: true,
      message: 'Dosya başarıyla silindi'
    });

  } catch (error) {
    console.error('🚨 Delete hatası:', error);
    res.status(500).json({
      success: false,
      message: 'Dosya silinirken hata oluştu',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// 📁 POST /api/files/folders - Create folder
const createFolder = async (req, res) => {
  try {
    const { name, path: requestPath = '', description } = req.body;
    
    console.log('📁 Klasör oluşturuluyor:', name);
    
    const fullPath = path.join(__dirname, '../uploads/files', requestPath, name);
    
    if (fs.existsSync(fullPath)) {
      return res.status(400).json({
        success: false,
        message: 'Bu isimde bir klasör zaten mevcut'
      });
    }
    
    fs.mkdirSync(fullPath, { recursive: true });
    
    // Log activity
    await Activity.logActivity({
      userId: req.user._id,
      action: 'create',
      category: 'system',
      details: `Klasör oluşturuldu: ${name}`,
      metadata: {
        createdBy: req.user.adSoyad,
        folderName: name,
        path: requestPath,
        description
      }
    });
    
    console.log('✅ Klasör oluşturuldu:', name);
    
    res.status(201).json({
      success: true,
      message: 'Klasör başarıyla oluşturuldu',
      data: {
        name,
        path: requestPath,
        description
      }
    });

  } catch (error) {
    console.error('🚨 Klasör oluşturma hatası:', error);
    res.status(500).json({
      success: false,
      message: 'Klasör oluşturulurken hata oluştu',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// 🗑️ DELETE /api/files/folders/:foldername - Delete folder
const deleteFolder = async (req, res) => {
  try {
    const { foldername } = req.params;
    const { path: requestPath = '' } = req.query;
    
    console.log('🗑️ Klasör siliniyor:', foldername);
    
    const fullPath = path.join(__dirname, '../uploads/files', requestPath, foldername);
    
    if (!fs.existsSync(fullPath)) {
      return res.status(404).json({
        success: false,
        message: 'Klasör bulunamadı'
      });
    }
    
    // Remove directory recursively
    fs.rmSync(fullPath, { recursive: true, force: true });
    
    // Log activity
    await Activity.logActivity({
      userId: req.user._id,
      action: 'delete',
      category: 'system',
      details: `Klasör silindi: ${foldername}`,
      metadata: {
        deletedBy: req.user.adSoyad,
        folderName: foldername,
        path: requestPath
      }
    });
    
    console.log('✅ Klasör silindi:', foldername);
    
    res.status(200).json({
      success: true,
      message: 'Klasör başarıyla silindi'
    });

  } catch (error) {
    console.error('🚨 Klasör silme hatası:', error);
    res.status(500).json({
      success: false,
      message: 'Klasör silinirken hata oluştu',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

module.exports = {
  getFiles,
  uploadFiles,
  downloadFile,
  deleteFile,
  createFolder,
  deleteFolder
}; 