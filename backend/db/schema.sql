-- Datenbank-Schema für in:prove

CREATE TABLE IF NOT EXISTS athletes (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS food_logs (
    id SERIAL PRIMARY KEY,
    athlete_id INTEGER REFERENCES athletes(id),
    meal_type VARCHAR(50),
    food_item VARCHAR(200) NOT NULL,
    quantity_grams NUMERIC,
    calories NUMERIC,
    logged_at TIMESTAMP DEFAULT NOW(),
    raw_transcript TEXT
);