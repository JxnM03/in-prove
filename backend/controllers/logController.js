const pool = require('../db/index');

const isPositiveNumber = (value) => {
    const number = Number(value);
    return Number.isFinite(number) && number > 0;
};

const isCompleteFoodItem = (item) => {
    return (
        item.food_item &&
        isPositiveNumber(item.quantity_grams) &&
        isPositiveNumber(item.calories) &&
        item.quantity_unclear !== true
    );
};

const savefoodLog = async (req, res) => {
    try {
        const { athlete_id, meal_type, items, raw_transcript } = req.body;

        if (!items || items.length === 0) {
            return res.status(400).json({ error: 'Keine Lebensmittel zum Speichern' });
        }

        if (items.some((item) => !isCompleteFoodItem(item))) {
            return res.status(400).json({
                error: 'Bitte vervollständige alle Mengen und Kalorien vor dem Speichern'
            });
        }

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
        const { athlete_id } = req.query;

        let query = 'SELECT * FROM food_logs';
        const params = [];

        if (athlete_id) {
            query += ' WHERE athlete_id = $1';
            params.push(athlete_id);
        }

        query += ' ORDER BY logged_at DESC, id DESC';

        const result = await pool.query(query, params);
        res.json(result.rows);

    } catch (error) {
        console.error('Abruf-Fehler:', error);
        res.status(500).json({ error: 'Abrufen fehlgeschlagen' });
    }
};

const deleteFoodLogs = async (req, res) => {
    try {
        const { ids } = req.body;

        if (!Array.isArray(ids) || ids.length === 0) {
            return res.status(400).json({ error: 'Keine IDs zum Löschen übergeben' });
        }

        const validIds = ids
            .map((id) => Number(id))
            .filter((id) => Number.isInteger(id) && id > 0);

        if (validIds.length === 0) {
            return res.status(400).json({ error: 'Keine gültigen IDs zum Löschen übergeben' });
        }

        const result = await pool.query(
            `DELETE FROM food_logs WHERE id = ANY($1::int[]) RETURNING *`,
            [validIds]
        );

        res.json({
            message: `🗑️ ${result.rowCount} Einträge gelöscht`,
            deleted: result.rows
        });

    } catch (error) {
        console.error('Lösch-Fehler:', error);
        res.status(500).json({ error: 'Löschen fehlgeschlagen' });
    }
};

module.exports = { savefoodLog, getFoodLogs, deleteFoodLogs };