const express = require('express');
const router = express.Router();

const { searchUnits, searchCurrencies, searchUsedMachines, getCurrencyRate } = require('../controllers/lookupController');

// Public endpoints (hızlı autocomplete için auth yok)
router.get('/unit', searchUnits);
router.get('/currency', searchCurrencies);
router.get('/used-machine', searchUsedMachines);
router.get('/rate', getCurrencyRate);

module.exports = router;


