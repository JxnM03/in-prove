const express = require('express');
const { savefoodLog, getFoodLogs, deleteFoodLogs } = require('../controllers/logController');

const router = express.Router();

router.post('/save', savefoodLog);
router.get('/all', getFoodLogs);
router.delete('/delete', deleteFoodLogs);

module.exports = router;