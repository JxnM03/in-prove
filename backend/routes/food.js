const express = require('express');
const { extractFoodItems, clarifyQuantities } = require('../controllers/foodController');

const router = express.Router();

router.post('/extract', extractFoodItems);
router.post('/clarify', clarifyQuantities);

module.exports = router;