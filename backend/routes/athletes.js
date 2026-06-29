const express = require('express');
const { updateCalorieGoal, getTodayCalories, getAthleteGoal } = require('../controllers/athleteController');

const router = express.Router();

router.patch('/goal', updateCalorieGoal);
router.get('/today-calories', getTodayCalories);
router.get('/goal', getAthleteGoal);

module.exports = router;