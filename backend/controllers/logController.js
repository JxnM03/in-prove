const pool = require('../db/index');

const savefoodLog = async (req, res) => {
    try {
        const { athlete_id, meal_type, items, raw_transcript } = req.body;

        if (!items || items.length === 0) {
            return res.status(400).json({ error: 'Keine Lebensmittel zum Speichern' });
        }

        // Alle items in die Datenbank schreiben
        const savedItems = [];

        for (const item of items) {
            const result = await pool.query(
                `INSERT INTO food_logs 
                    (athlete_id, meal_type, food_item, quantity_grams, calories, raw_transcript)
                VALUES 
                    ($1, $2, $3, $4, $5, $6)
                RETURNING *`,
                [
                    athlete_id || null,
                    meal_type || null,
                    item.food_item,
                    item.quantity_grams || null,
                    item.calories || null,
                    raw_transcript || null
                ]
            );
            savedItems.push(result.rows[0]);
        }

        res.json({
            message: `✅ ${savedItems.length} Einträge gespeichert`,
            saved: savedItems
        });

    } catch (error) {
        console.error('Speicher-Fehler:', error);
        res.status(500).json({ error: 'Speichern fehlgeschlagen' });
    }
};

const getFoodLogs = async (req, res) => {
    try {
        const result = await pool.query(
            `SELECT * FROM food_logs ORDER BY logged_at DESC`
        );
        res.json(result.rows);

    } catch (error) {
        console.error('Abruf-Fehler:', error);
        res.status(500).json({ error: 'Abrufen fehlgeschlagen' });
    }
};

module.exports = { savefoodLog, getFoodLogs };