const pool = require('../db/index');

const updateCalorieGoal = async (req, res) => {
    try {
        const { athlete_id, daily_calorie_goal } = req.body;

        if (!athlete_id || !daily_calorie_goal) {
            return res.status(400).json({ error: 'Missing athlete_id or daily_calorie_goal' });
        }

        if (daily_calorie_goal < 500 || daily_calorie_goal > 10000) {
            return res.status(400).json({ error: 'Calorie goal must be between 500 and 10000' });
        }

        const result = await pool.query(
            `UPDATE athletes 
             SET daily_calorie_goal = $1 
             WHERE id = $2 
             RETURNING id, name, username, daily_calorie_goal`,
            [daily_calorie_goal, athlete_id]
        );

        res.json({ athlete: result.rows[0] });

    } catch (error) {
        console.error('Update goal error:', error);
        res.status(500).json({ error: 'Could not update calorie goal' });
    }
};

const getTodayCalories = async (req, res) => {
    try {
        const { athlete_id } = req.query;

        if (!athlete_id) {
            return res.status(400).json({ error: 'Missing athlete_id' });
        }

        const result = await pool.query(
            `SELECT 
                COALESCE(SUM(calories), 0) AS total_calories,
                COUNT(DISTINCT DATE_TRUNC('minute', logged_at)) AS meal_count
             FROM food_logs
             WHERE athlete_id = $1
             AND logged_at >= CURRENT_DATE
             AND logged_at < CURRENT_DATE + INTERVAL '1 day'`,
            [athlete_id]
        );

        res.json({
            total_calories: Math.round(Number(result.rows[0].total_calories)),
            meal_count: Number(result.rows[0].meal_count)
        });

    } catch (error) {
        console.error('Today calories error:', error);
        res.status(500).json({ error: 'Could not fetch today calories' });
    }
};

const getAthleteGoal = async (req, res) => {
    try {
        const { athlete_id } = req.query;

        if (!athlete_id) {
            return res.status(400).json({ error: 'Missing athlete_id' });
        }

        const result = await pool.query(
            `SELECT daily_calorie_goal FROM athletes WHERE id = $1`,
            [athlete_id]
        );

        res.json({ daily_calorie_goal: result.rows[0].daily_calorie_goal });

    } catch (error) {
        console.error('Get goal error:', error);
        res.status(500).json({ error: 'Could not fetch calorie goal' });
    }
};

module.exports = { updateCalorieGoal, getTodayCalories, getAthleteGoal };