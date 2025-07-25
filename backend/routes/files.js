// 📁 FILE ROUTES - ENTERPRISE FILE MANAGEMENT SUITE
// Routes for file upload, download, folder management, versioning

const express = require('express');
const router = express.Router();
const {
  getFiles,
  uploadFiles,
  downloadFile,
  deleteFile,
  createFolder,
  deleteFolder
} = require('../controllers/fileController');
const { authenticate } = require('../middleware/auth');

// 📂 FILE & FOLDER LISTING
router.get('/', authenticate, getFiles);

// 📤 FILE UPLOAD
router.post('/upload', authenticate, uploadFiles);

// 📥 FILE DOWNLOAD
router.get('/download/:filename', authenticate, downloadFile);

// 🗑️ FILE DELETE
router.delete('/:filename', authenticate, deleteFile);

// 📁 FOLDER OPERATIONS
router.post('/folders', authenticate, createFolder);
router.delete('/folders/:foldername', authenticate, deleteFolder);

module.exports = router; 