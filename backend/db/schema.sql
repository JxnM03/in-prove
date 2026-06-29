-- Datenbank-Schema für in:prove

CREATE TABLE IF NOT EXISTS athletes (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    username VARCHAR(50) UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    daily_calorie_goal INTEGER DEFAULT 2500,
    macro_protein_pct INTEGER DEFAULT 30,
    macro_carbs_pct INTEGER DEFAULT 40,
    macro_fat_pct INTEGER DEFAULT 30,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS food_logs (
    id SERIAL PRIMARY KEY,
    athlete_id INTEGER REFERENCES athletes(id),
    meal_type VARCHAR(50),
    food_item VARCHAR(200) NOT NULL,
    quantity_grams NUMERIC,
    calories NUMERIC,
    protein_grams NUMERIC,
    carbs_grams NUMERIC,
    fat_grams NUMERIC,
    logged_at TIMESTAMP DEFAULT NOW(),
    raw_transcript TEXT
);