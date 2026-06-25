const express = require('express');
const multer = require('multer');
const { transcribeAudio } = require('../controllers/audioController');

const router = express.Router();

// Temporärer Speicher für Audiodateien
const upload = multer({ dest: 'uploads/' });

router.post('/transcribe', upload.single('audio'), transcribeAudio);

module.exports = router;