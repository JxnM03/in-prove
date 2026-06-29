const express = require('express');
const { updateCalorieGoal, updateMacros, getTodayCalories, getAthleteGoal } = require('../controllers/athleteController');

const router = express.Router();

router.patch('/goal', updateCalorieGoal);
router.patch('/macros', updateMacros);
router.get('/today-calories', getTodayCalories);
router.get('/goal', getAthleteGoal);

module.exports = router;