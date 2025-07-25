// 📊 REPORT ROUTES - ENTERPRISE REPORTING SUITE
// Routes for report generation, templates, analytics, download

const express = require('express');
const router = express.Router();
const {
  getReportAnalytics,
  getSavedReports,
  saveReportTemplate,
  generateReport,
  downloadReport
} = require('../controllers/reportController');
const { authenticate } = require('../middleware/auth');

// 📊 ANALYTICS ROUTES
router.get('/analytics', authenticate, getReportAnalytics);

// 📋 TEMPLATE ROUTES
router.get('/saved', authenticate, getSavedReports);
router.post('/templates', authenticate, saveReportTemplate);

// 📊 GENERATION ROUTES
router.post('/generate', authenticate, generateReport);

// 📥 DOWNLOAD ROUTES
router.get('/download/:filename', authenticate, downloadReport);

module.exports = router; 