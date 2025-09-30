const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const { searchNaceCodes, getNaceCategories, getNaceCodeByKod } = require('../controllers/naceController');

// Arama (auth olmadan)
router.get('/search', searchNaceCodes);

// Kategoriler
router.get('/categories', getNaceCategories);

// Kod detay
router.get('/code/:kod', getNaceCodeByKod);

module.exports = router;