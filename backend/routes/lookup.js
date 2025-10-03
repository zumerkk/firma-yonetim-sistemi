const express = require('express');
const router = express.Router();

const { searchUnits, searchCurrencies, searchUsedMachines, getCurrencyRate, searchMachineTypes, searchOecdKod4Haneli } = require('../controllers/lookupController');

// Public endpoints (hızlı autocomplete için auth yok)
router.get('/unit', searchUnits);
router.get('/currency', searchCurrencies);
router.get('/used-machine', searchUsedMachines);
router.get('/machine-type', searchMachineTypes);
router.get('/rate', getCurrencyRate);

// 🆕 OECD 4 Haneli Kodları (Yeni Teşvik Sistemi için)
router.get('/oecd-4-haneli', searchOecdKod4Haneli);

module.exports = router;


