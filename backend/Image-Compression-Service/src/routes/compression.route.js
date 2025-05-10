const express = require('express');
const router = express.Router();
const multer = require('multer');
const upload = multer({ storage: multer.memoryStorage() });
const ImageCompressionController = require('../controllers/compression.controller');

// Original route (medium compression - 80%)
router.post('/compress', upload.single('file'), ImageCompressionController.compressImage);

// New compression level routes
router.post('/compress/low', upload.single('file'), ImageCompressionController.compressImageLow);    // Low compression (high quality - 95%)
router.post('/compress/medium', upload.single('file'), ImageCompressionController.compressImage);    // Medium compression (80%) - alias for /compress
router.post('/compress/high', upload.single('file'), ImageCompressionController.compressImageHigh);  // High compression (low quality - 50%)

module.exports = router;