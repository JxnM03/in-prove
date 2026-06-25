const express = require('express');
const { savefoodLog, getFoodLogs } = require('../controllers/logController');

const router = express.Router();

router.post('/save', savefoodLog);
router.get('/all', getFoodLogs);

module.exports = router;