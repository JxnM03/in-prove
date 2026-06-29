const express = require('express');
const { savefoodLog, getFoodLogs, deleteFoodLogs, updateFoodLogItem, deleteSingleFoodLogItem } = require('../controllers/logController');

const router = express.Router();

router.post('/save', savefoodLog);
router.get('/all', getFoodLogs);
router.delete('/delete', deleteFoodLogs);
router.patch('/update-item', updateFoodLogItem);
router.delete('/delete-item', deleteSingleFoodLogItem);

module.exports = router;