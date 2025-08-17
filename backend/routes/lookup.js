const express = require('express');
const router = express.Router();

const { searchUnits, searchCurrencies, searchUsedMachines, getCurrencyRate, searchMachineTypes } = require('../controllers/lookupController');

// Public endpoints (hızlı autocomplete için auth yok)
router.get('/unit', searchUnits);
router.get('/currency', searchCurrencies);
router.get('/used-machine', searchUsedMachines);
router.get('/machine-type', searchMachineTypes);
router.get('/rate', getCurrencyRate);

module.exports = router;


