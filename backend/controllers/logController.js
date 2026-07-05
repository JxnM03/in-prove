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
        const { athlete_id, meal_type, items, raw_transcript, logged_at } = req.body;

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
            // Nur logged_at in Query aufnehmen wenn es explizit übergeben wurde
            const queryText = logged_at
                ? `INSERT INTO food_logs 
                    (athlete_id, meal_type, food_item, quantity_grams, calories, protein_grams, carbs_grams, fat_grams, raw_transcript, logged_at)
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING *`
                : `INSERT INTO food_logs 
                    (athlete_id, meal_type, food_item, quantity_grams, calories, protein_grams, carbs_grams, fat_grams, raw_transcript)
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING *`;

            const queryParams = logged_at
                ? [athlete_id || null, meal_type || null, item.food_item, item.quantity_grams || null, item.calories || null, item.protein_grams || null, item.carbs_grams || null, item.fat_grams || null, raw_transcript || null, logged_at]
                : [athlete_id || null, meal_type || null, item.food_item, item.quantity_grams || null, item.calories || null, item.protein_grams || null, item.carbs_grams || null, item.fat_grams || null, raw_transcript || null];

            const result = await pool.query(queryText, queryParams);
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

const updateFoodLogItem = async (req, res) => {
    try {
        const { id, quantity_grams } = req.body;

        if (!id || !isPositiveNumber(Number(quantity_grams))) {
            return res.status(400).json({ error: 'Missing id or valid quantity_grams' });
        }

        // Erst aktuellen Eintrag holen für proportionale Berechnung
        const current = await pool.query(
            'SELECT * FROM food_logs WHERE id = $1',
            [id]
        );

        if (current.rows.length === 0) {
            return res.status(404).json({ error: 'Item not found' });
        }

        const old = current.rows[0];
        const oldQty = Number(old.quantity_grams);
        const newQty = Number(quantity_grams);
        const ratio = oldQty > 0 ? newQty / oldQty : 1;

        // Nährwerte proportional anpassen
        const newCalories = old.calories ? Math.round(Number(old.calories) * ratio) : null;
        const newProtein = old.protein_grams ? Math.round(Number(old.protein_grams) * ratio * 10) / 10 : null;
        const newCarbs = old.carbs_grams ? Math.round(Number(old.carbs_grams) * ratio * 10) / 10 : null;
        const newFat = old.fat_grams ? Math.round(Number(old.fat_grams) * ratio * 10) / 10 : null;

        const result = await pool.query(
            `UPDATE food_logs
             SET quantity_grams = $1, calories = $2, protein_grams = $3, carbs_grams = $4, fat_grams = $5
             WHERE id = $6
             RETURNING *`,
            [newQty, newCalories, newProtein, newCarbs, newFat, id]
        );

        res.json({ updated: result.rows[0] });

    } catch (error) {
        console.error('Update item error:', error);
        res.status(500).json({ error: 'Update fehlgeschlagen' });
    }
};

const deleteSingleFoodLogItem = async (req, res) => {
    try {
        const { id } = req.body;

        if (!id) {
            return res.status(400).json({ error: 'Missing id' });
        }

        const result = await pool.query(
            'DELETE FROM food_logs WHERE id = $1 RETURNING *',
            [id]
        );

        if (result.rowCount === 0) {
            return res.status(404).json({ error: 'Item not found' });
        }

        res.json({ deleted: result.rows[0] });

    } catch (error) {
        console.error('Delete item error:', error);
        res.status(500).json({ error: 'Löschen fehlgeschlagen' });
    }
};

module.exports = { savefoodLog, getFoodLogs, deleteFoodLogs, updateFoodLogItem, deleteSingleFoodLogItem };