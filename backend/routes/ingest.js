const express = require('express');
const router = express.Router();
const multer = require('multer');

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 50 * 1024 * 1024 },
});

const { authenticate } = require('../middleware/auth');
const ingestController = require('../controllers/ingestController');

router.post('/preview', authenticate, upload.single('file'), ingestController.preview);
router.post('/commit', authenticate, ingestController.commit);

module.exports = router;

