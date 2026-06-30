-- ============================================================
-- in:prove — Demo Setup Script
-- Run with: psql -U postgres -d inprove -f demo_setup.sql
--
-- Creates 4 demo athletes + realistic food log history
-- All athletes use password: "password"
-- ============================================================

-- ────────────────────────────────────────────────────────────
-- 0. Clean up existing demo data (safe to re-run)
-- ────────────────────────────────────────────────────────────
DELETE FROM food_logs WHERE athlete_id IN (
    SELECT id FROM athletes WHERE username IN ('messi', 'ronaldo', 'mueller', 'athlete1', 'athlete2')
);
DELETE FROM athletes WHERE username IN ('messi', 'ronaldo', 'mueller');

-- ────────────────────────────────────────────────────────────
-- 1. Insert demo athletes
-- Password for all: "password"
-- ────────────────────────────────────────────────────────────
INSERT INTO athletes (name, username, password_hash, daily_calorie_goal, macro_protein_pct, macro_carbs_pct, macro_fat_pct)
VALUES
  ('Lionel Messi',      'messi',   '$2b$10$aSlfe4zUfb.bExHJNiwlM.S.kS1qXzTy1ZDVTVKxuhYnNV7brj7t6', 3200, 30, 45, 25),
  ('Cristiano Ronaldo', 'ronaldo', '$2b$10$aSlfe4zUfb.bExHJNiwlM.S.kS1qXzTy1ZDVTVKxuhYnNV7brj7t6', 3500, 35, 40, 25),
  ('Thomas Müller',     'mueller', '$2b$10$aSlfe4zUfb.bExHJNiwlM.S.kS1qXzTy1ZDVTVKxuhYnNV7brj7t6', 2800, 25, 50, 25);

-- ────────────────────────────────────────────────────────────
-- 2. Helper: reference athlete IDs
-- ────────────────────────────────────────────────────────────
DO $$
DECLARE
  messi_id   INT := (SELECT id FROM athletes WHERE username = 'messi');
  ronaldo_id INT := (SELECT id FROM athletes WHERE username = 'ronaldo');
  mueller_id INT := (SELECT id FROM athletes WHERE username = 'mueller');
BEGIN

-- ============================================================
-- LIONEL MESSI  (messi)
-- Goal: 3200 kcal · 30% P / 45% C / 25% F
-- Used to DEMO: voice input & clarification loop (today entries
--               are added live during demo — history shows past)
-- ============================================================

-- 7 days ago
INSERT INTO food_logs (athlete_id, meal_type, food_item, quantity_grams, calories, protein_grams, carbs_grams, fat_grams, raw_transcript, logged_at)
VALUES
  (messi_id, 'Breakfast', 'Oatmeal with banana', 300, 350, 12, 62, 6, 'Oatmeal with banana for breakfast', NOW() - INTERVAL '7 days' + INTERVAL '7 hours 30 minutes'),
  (messi_id, 'Breakfast', 'Orange juice', 250, 110, 2, 26, 0, 'Oatmeal with banana for breakfast', NOW() - INTERVAL '7 days' + INTERVAL '7 hours 30 minutes'),
  (messi_id, 'Lunch', 'Grilled chicken breast', 200, 330, 62, 0, 7, 'Grilled chicken with rice and salad', NOW() - INTERVAL '7 days' + INTERVAL '12 hours 15 minutes'),
  (messi_id, 'Lunch', 'Cooked rice', 250, 325, 7, 71, 1, 'Grilled chicken with rice and salad', NOW() - INTERVAL '7 days' + INTERVAL '12 hours 15 minutes'),
  (messi_id, 'Lunch', 'Mixed salad', 120, 45, 2, 8, 1, 'Grilled chicken with rice and salad', NOW() - INTERVAL '7 days' + INTERVAL '12 hours 15 minutes'),
  (messi_id, 'Dinner', 'Whole wheat pasta', 200, 280, 10, 56, 2, 'Pasta with tomato sauce and parmesan', NOW() - INTERVAL '7 days' + INTERVAL '19 hours 0 minutes'),
  (messi_id, 'Dinner', 'Tomato sauce', 150, 85, 3, 16, 2, 'Pasta with tomato sauce and parmesan', NOW() - INTERVAL '7 days' + INTERVAL '19 hours 0 minutes'),
  (messi_id, 'Dinner', 'Parmesan cheese', 30, 120, 11, 1, 8, 'Pasta with tomato sauce and parmesan', NOW() - INTERVAL '7 days' + INTERVAL '19 hours 0 minutes');

-- 5 days ago
INSERT INTO food_logs (athlete_id, meal_type, food_item, quantity_grams, calories, protein_grams, carbs_grams, fat_grams, raw_transcript, logged_at)
VALUES
  (messi_id, 'Breakfast', 'Scrambled eggs', 150, 220, 15, 2, 16, 'Scrambled eggs and toast for breakfast', NOW() - INTERVAL '5 days' + INTERVAL '8 hours 0 minutes'),
  (messi_id, 'Breakfast', 'Toast white', 60, 160, 5, 30, 2, 'Scrambled eggs and toast for breakfast', NOW() - INTERVAL '5 days' + INTERVAL '8 hours 0 minutes'),
  (messi_id, 'Snack', 'Banana', 120, 107, 1, 27, 0, 'Had a banana as snack', NOW() - INTERVAL '5 days' + INTERVAL '10 hours 30 minutes'),
  (messi_id, 'Snack', 'Almonds', 40, 232, 8, 8, 20, 'Had a banana as snack', NOW() - INTERVAL '5 days' + INTERVAL '10 hours 30 minutes'),
  (messi_id, 'Lunch', 'Salmon fillet grilled', 180, 374, 36, 0, 23, 'Salmon with sweet potato and broccoli', NOW() - INTERVAL '5 days' + INTERVAL '13 hours 0 minutes'),
  (messi_id, 'Lunch', 'Sweet potato', 200, 172, 3, 40, 0, 'Salmon with sweet potato and broccoli', NOW() - INTERVAL '5 days' + INTERVAL '13 hours 0 minutes'),
  (messi_id, 'Lunch', 'Broccoli steamed', 150, 51, 4, 10, 1, 'Salmon with sweet potato and broccoli', NOW() - INTERVAL '5 days' + INTERVAL '13 hours 0 minutes'),
  (messi_id, 'Dinner', 'Beef steak grilled', 200, 420, 54, 0, 22, 'Beef steak with vegetables', NOW() - INTERVAL '5 days' + INTERVAL '19 hours 30 minutes'),
  (messi_id, 'Dinner', 'Grilled zucchini', 150, 38, 3, 7, 1, 'Beef steak with vegetables', NOW() - INTERVAL '5 days' + INTERVAL '19 hours 30 minutes');

-- 3 days ago
INSERT INTO food_logs (athlete_id, meal_type, food_item, quantity_grams, calories, protein_grams, carbs_grams, fat_grams, raw_transcript, logged_at)
VALUES
  (messi_id, 'Breakfast', 'Greek yogurt', 200, 118, 20, 8, 1, 'Greek yogurt with honey and granola', NOW() - INTERVAL '3 days' + INTERVAL '7 hours 45 minutes'),
  (messi_id, 'Breakfast', 'Honey', 20, 61, 0, 17, 0, 'Greek yogurt with honey and granola', NOW() - INTERVAL '3 days' + INTERVAL '7 hours 45 minutes'),
  (messi_id, 'Breakfast', 'Granola', 60, 266, 7, 44, 8, 'Greek yogurt with honey and granola', NOW() - INTERVAL '3 days' + INTERVAL '7 hours 45 minutes'),
  (messi_id, 'Lunch', 'Turkey sandwich on rye', 250, 380, 28, 42, 10, 'Turkey sandwich on rye with avocado', NOW() - INTERVAL '3 days' + INTERVAL '12 hours 30 minutes'),
  (messi_id, 'Lunch', 'Avocado', 80, 128, 1, 7, 12, 'Turkey sandwich on rye with avocado', NOW() - INTERVAL '3 days' + INTERVAL '12 hours 30 minutes'),
  (messi_id, 'Snack', 'Protein shake', 300, 210, 30, 18, 3, 'Protein shake after training', NOW() - INTERVAL '3 days' + INTERVAL '16 hours 0 minutes'),
  (messi_id, 'Dinner', 'Grilled chicken thigh', 180, 310, 38, 0, 17, 'Chicken thigh with quinoa and spinach', NOW() - INTERVAL '3 days' + INTERVAL '19 hours 15 minutes'),
  (messi_id, 'Dinner', 'Quinoa cooked', 200, 222, 8, 39, 4, 'Chicken thigh with quinoa and spinach', NOW() - INTERVAL '3 days' + INTERVAL '19 hours 15 minutes'),
  (messi_id, 'Dinner', 'Spinach sauteed', 100, 23, 3, 4, 0, 'Chicken thigh with quinoa and spinach', NOW() - INTERVAL '3 days' + INTERVAL '19 hours 15 minutes');

-- Yesterday
INSERT INTO food_logs (athlete_id, meal_type, food_item, quantity_grams, calories, protein_grams, carbs_grams, fat_grams, raw_transcript, logged_at)
VALUES
  (messi_id, 'Breakfast', 'Whole grain bread', 80, 200, 8, 38, 3, 'Bread with peanut butter and banana', NOW() - INTERVAL '1 day' + INTERVAL '8 hours 0 minutes'),
  (messi_id, 'Breakfast', 'Peanut butter', 30, 188, 8, 6, 16, 'Bread with peanut butter and banana', NOW() - INTERVAL '1 day' + INTERVAL '8 hours 0 minutes'),
  (messi_id, 'Breakfast', 'Banana', 120, 107, 1, 27, 0, 'Bread with peanut butter and banana', NOW() - INTERVAL '1 day' + INTERVAL '8 hours 0 minutes'),
  (messi_id, 'Lunch', 'Tuna in water', 150, 158, 35, 0, 1, 'Tuna salad with pasta', NOW() - INTERVAL '1 day' + INTERVAL '13 hours 0 minutes'),
  (messi_id, 'Lunch', 'Pasta cooked', 200, 260, 9, 53, 1, 'Tuna salad with pasta', NOW() - INTERVAL '1 day' + INTERVAL '13 hours 0 minutes'),
  (messi_id, 'Lunch', 'Cherry tomatoes', 100, 18, 1, 4, 0, 'Tuna salad with pasta', NOW() - INTERVAL '1 day' + INTERVAL '13 hours 0 minutes'),
  (messi_id, 'Dinner', 'Lentil soup', 350, 350, 18, 52, 5, 'Lentil soup with bread', NOW() - INTERVAL '1 day' + INTERVAL '19 hours 0 minutes'),
  (messi_id, 'Dinner', 'Sourdough bread', 80, 188, 7, 38, 1, 'Lentil soup with bread', NOW() - INTERVAL '1 day' + INTERVAL '19 hours 0 minutes');


-- ============================================================
-- CRISTIANO RONALDO  (ronaldo)
-- Goal: 3500 kcal · 35% P / 40% C / 25% F
-- Used to DEMO: macro settings & daily check-in progress
-- ============================================================

-- 6 days ago
INSERT INTO food_logs (athlete_id, meal_type, food_item, quantity_grams, calories, protein_grams, carbs_grams, fat_grams, raw_transcript, logged_at)
VALUES
  (ronaldo_id, 'Breakfast', 'Egg white omelette', 200, 170, 34, 2, 2, 'Egg white omelette with vegetables', NOW() - INTERVAL '6 days' + INTERVAL '6 hours 30 minutes'),
  (ronaldo_id, 'Breakfast', 'Bell pepper', 100, 31, 1, 7, 0, 'Egg white omelette with vegetables', NOW() - INTERVAL '6 days' + INTERVAL '6 hours 30 minutes'),
  (ronaldo_id, 'Breakfast', 'Whole grain toast', 60, 150, 6, 28, 2, 'Egg white omelette with vegetables', NOW() - INTERVAL '6 days' + INTERVAL '6 hours 30 minutes'),
  (ronaldo_id, 'Snack', 'Protein bar', 60, 240, 20, 27, 6, 'Protein bar after morning workout', NOW() - INTERVAL '6 days' + INTERVAL '10 hours 0 minutes'),
  (ronaldo_id, 'Lunch', 'Chicken breast grilled', 250, 413, 78, 0, 9, 'Large chicken breast with brown rice', NOW() - INTERVAL '6 days' + INTERVAL '13 hours 0 minutes'),
  (ronaldo_id, 'Lunch', 'Brown rice cooked', 300, 330, 7, 69, 3, 'Large chicken breast with brown rice', NOW() - INTERVAL '6 days' + INTERVAL '13 hours 0 minutes'),
  (ronaldo_id, 'Lunch', 'Olive oil', 15, 133, 0, 0, 15, 'Large chicken breast with brown rice', NOW() - INTERVAL '6 days' + INTERVAL '13 hours 0 minutes'),
  (ronaldo_id, 'Snack', 'Greek yogurt', 200, 118, 20, 8, 1, 'Greek yogurt afternoon snack', NOW() - INTERVAL '6 days' + INTERVAL '16 hours 30 minutes'),
  (ronaldo_id, 'Dinner', 'Cod fillet baked', 200, 176, 38, 0, 2, 'Baked cod with sweet potato', NOW() - INTERVAL '6 days' + INTERVAL '20 hours 0 minutes'),
  (ronaldo_id, 'Dinner', 'Sweet potato', 250, 215, 4, 50, 0, 'Baked cod with sweet potato', NOW() - INTERVAL '6 days' + INTERVAL '20 hours 0 minutes'),
  (ronaldo_id, 'Dinner', 'Asparagus', 150, 35, 4, 7, 0, 'Baked cod with sweet potato', NOW() - INTERVAL '6 days' + INTERVAL '20 hours 0 minutes');

-- 4 days ago
INSERT INTO food_logs (athlete_id, meal_type, food_item, quantity_grams, calories, protein_grams, carbs_grams, fat_grams, raw_transcript, logged_at)
VALUES
  (ronaldo_id, 'Breakfast', 'Overnight oats', 350, 385, 14, 65, 8, 'Overnight oats with berries', NOW() - INTERVAL '4 days' + INTERVAL '7 hours 0 minutes'),
  (ronaldo_id, 'Breakfast', 'Mixed berries', 150, 65, 1, 16, 1, 'Overnight oats with berries', NOW() - INTERVAL '4 days' + INTERVAL '7 hours 0 minutes'),
  (ronaldo_id, 'Snack', 'Almonds', 50, 290, 11, 11, 25, 'Almonds as snack', NOW() - INTERVAL '4 days' + INTERVAL '10 hours 30 minutes'),
  (ronaldo_id, 'Lunch', 'Beef tenderloin grilled', 220, 374, 52, 0, 18, 'Beef with quinoa and green beans', NOW() - INTERVAL '4 days' + INTERVAL '13 hours 30 minutes'),
  (ronaldo_id, 'Lunch', 'Quinoa cooked', 220, 244, 9, 43, 4, 'Beef with quinoa and green beans', NOW() - INTERVAL '4 days' + INTERVAL '13 hours 30 minutes'),
  (ronaldo_id, 'Lunch', 'Green beans', 150, 53, 3, 12, 0, 'Beef with quinoa and green beans', NOW() - INTERVAL '4 days' + INTERVAL '13 hours 30 minutes'),
  (ronaldo_id, 'Dinner', 'Turkey breast', 200, 218, 46, 0, 3, 'Turkey with pasta and vegetables', NOW() - INTERVAL '4 days' + INTERVAL '19 hours 30 minutes'),
  (ronaldo_id, 'Dinner', 'Pasta cooked', 250, 325, 11, 66, 2, 'Turkey with pasta and vegetables', NOW() - INTERVAL '4 days' + INTERVAL '19 hours 30 minutes'),
  (ronaldo_id, 'Dinner', 'Cherry tomatoes', 100, 18, 1, 4, 0, 'Turkey with pasta and vegetables', NOW() - INTERVAL '4 days' + INTERVAL '19 hours 30 minutes');

-- 2 days ago
INSERT INTO food_logs (athlete_id, meal_type, food_item, quantity_grams, calories, protein_grams, carbs_grams, fat_grams, raw_transcript, logged_at)
VALUES
  (ronaldo_id, 'Breakfast', 'Protein pancakes', 200, 340, 28, 40, 7, 'Protein pancakes with maple syrup', NOW() - INTERVAL '2 days' + INTERVAL '7 hours 30 minutes'),
  (ronaldo_id, 'Breakfast', 'Maple syrup', 30, 79, 0, 20, 0, 'Protein pancakes with maple syrup', NOW() - INTERVAL '2 days' + INTERVAL '7 hours 30 minutes'),
  (ronaldo_id, 'Snack', 'Banana', 130, 116, 1, 29, 0, 'Banana before training', NOW() - INTERVAL '2 days' + INTERVAL '11 hours 0 minutes'),
  (ronaldo_id, 'Lunch', 'Salmon grilled', 200, 416, 40, 0, 28, 'Salmon with brown rice', NOW() - INTERVAL '2 days' + INTERVAL '14 hours 0 minutes'),
  (ronaldo_id, 'Lunch', 'Brown rice cooked', 280, 308, 6, 64, 2, 'Salmon with brown rice', NOW() - INTERVAL '2 days' + INTERVAL '14 hours 0 minutes'),
  (ronaldo_id, 'Snack', 'Cottage cheese', 200, 160, 24, 8, 4, 'Cottage cheese afternoon snack', NOW() - INTERVAL '2 days' + INTERVAL '17 hours 0 minutes'),
  (ronaldo_id, 'Dinner', 'Chicken breast grilled', 220, 363, 69, 0, 8, 'Chicken with vegetables and olive oil', NOW() - INTERVAL '2 days' + INTERVAL '20 hours 0 minutes'),
  (ronaldo_id, 'Dinner', 'Mixed vegetables roasted', 200, 90, 4, 18, 1, 'Chicken with vegetables and olive oil', NOW() - INTERVAL '2 days' + INTERVAL '20 hours 0 minutes'),
  (ronaldo_id, 'Dinner', 'Olive oil', 20, 177, 0, 0, 20, 'Chicken with vegetables and olive oil', NOW() - INTERVAL '2 days' + INTERVAL '20 hours 0 minutes');

-- Yesterday
INSERT INTO food_logs (athlete_id, meal_type, food_item, quantity_grams, calories, protein_grams, carbs_grams, fat_grams, raw_transcript, logged_at)
VALUES
  (ronaldo_id, 'Breakfast', 'Egg white omelette', 200, 170, 34, 2, 2, 'Egg whites with avocado and toast', NOW() - INTERVAL '1 day' + INTERVAL '6 hours 45 minutes'),
  (ronaldo_id, 'Breakfast', 'Avocado', 100, 160, 2, 9, 15, 'Egg whites with avocado and toast', NOW() - INTERVAL '1 day' + INTERVAL '6 hours 45 minutes'),
  (ronaldo_id, 'Breakfast', 'Whole grain toast', 60, 150, 6, 28, 2, 'Egg whites with avocado and toast', NOW() - INTERVAL '1 day' + INTERVAL '6 hours 45 minutes'),
  (ronaldo_id, 'Lunch', 'Tuna steak grilled', 180, 252, 42, 0, 9, 'Tuna steak with sweet potato', NOW() - INTERVAL '1 day' + INTERVAL '13 hours 0 minutes'),
  (ronaldo_id, 'Lunch', 'Sweet potato', 250, 215, 4, 50, 0, 'Tuna steak with sweet potato', NOW() - INTERVAL '1 day' + INTERVAL '13 hours 0 minutes'),
  (ronaldo_id, 'Dinner', 'Chicken breast grilled', 250, 413, 78, 0, 9, 'Large chicken with rice', NOW() - INTERVAL '1 day' + INTERVAL '19 hours 30 minutes'),
  (ronaldo_id, 'Dinner', 'White rice cooked', 300, 390, 8, 86, 1, 'Large chicken with rice', NOW() - INTERVAL '1 day' + INTERVAL '19 hours 30 minutes');

-- Today (partial — to show progress bar not full)
INSERT INTO food_logs (athlete_id, meal_type, food_item, quantity_grams, calories, protein_grams, carbs_grams, fat_grams, raw_transcript, logged_at)
VALUES
  (ronaldo_id, 'Breakfast', 'Protein shake', 400, 280, 40, 24, 4, 'Protein shake for breakfast', NOW() - INTERVAL '2 hours'),
  (ronaldo_id, 'Breakfast', 'Banana', 130, 116, 1, 29, 0, 'Protein shake for breakfast', NOW() - INTERVAL '2 hours'),
  (ronaldo_id, 'Snack', 'Almonds', 40, 232, 8, 8, 20, 'Almonds as morning snack', NOW() - INTERVAL '30 minutes');


-- ============================================================
-- THOMAS MÜLLER  (mueller)
-- Goal: 2800 kcal · 25% P / 50% C / 25% F
-- Used to DEMO: history filters & inline editing
-- Has data spread across past weeks for filter demo
-- ============================================================

-- 14 days ago (2 weeks)
INSERT INTO food_logs (athlete_id, meal_type, food_item, quantity_grams, calories, protein_grams, carbs_grams, fat_grams, raw_transcript, logged_at)
VALUES
  (mueller_id, 'Breakfast', 'Muesli with milk', 300, 380, 14, 68, 7, 'Muesli with milk for breakfast', NOW() - INTERVAL '14 days' + INTERVAL '7 hours 30 minutes'),
  (mueller_id, 'Breakfast', 'Apple', 180, 94, 0, 25, 0, 'Muesli with milk for breakfast', NOW() - INTERVAL '14 days' + INTERVAL '7 hours 30 minutes'),
  (mueller_id, 'Lunch', 'Schnitzel breaded', 200, 460, 32, 28, 22, 'Schnitzel with potatoes and salad', NOW() - INTERVAL '14 days' + INTERVAL '12 hours 30 minutes'),
  (mueller_id, 'Lunch', 'Boiled potatoes', 250, 193, 4, 44, 0, 'Schnitzel with potatoes and salad', NOW() - INTERVAL '14 days' + INTERVAL '12 hours 30 minutes'),
  (mueller_id, 'Lunch', 'Green salad', 100, 20, 2, 3, 0, 'Schnitzel with potatoes and salad', NOW() - INTERVAL '14 days' + INTERVAL '12 hours 30 minutes'),
  (mueller_id, 'Dinner', 'Pasta bolognese', 400, 680, 32, 78, 22, 'Pasta bolognese for dinner', NOW() - INTERVAL '14 days' + INTERVAL '19 hours 0 minutes');

-- 10 days ago
INSERT INTO food_logs (athlete_id, meal_type, food_item, quantity_grams, calories, protein_grams, carbs_grams, fat_grams, raw_transcript, logged_at)
VALUES
  (mueller_id, 'Breakfast', 'Bread with butter and jam', 120, 340, 7, 60, 8, 'Bread with butter and jam', NOW() - INTERVAL '10 days' + INTERVAL '8 hours 0 minutes'),
  (mueller_id, 'Breakfast', 'Coffee with milk', 200, 50, 2, 5, 2, 'Bread with butter and jam', NOW() - INTERVAL '10 days' + INTERVAL '8 hours 0 minutes'),
  (mueller_id, 'Snack', 'Banana', 130, 116, 1, 29, 0, 'Banana snack', NOW() - INTERVAL '10 days' + INTERVAL '10 hours 30 minutes'),
  (mueller_id, 'Lunch', 'Currywurst', 200, 440, 22, 26, 28, 'Currywurst with fries', NOW() - INTERVAL '10 days' + INTERVAL '13 hours 0 minutes'),
  (mueller_id, 'Lunch', 'French fries', 200, 540, 7, 68, 26, 'Currywurst with fries', NOW() - INTERVAL '10 days' + INTERVAL '13 hours 0 minutes'),
  (mueller_id, 'Dinner', 'Grilled chicken', 180, 297, 56, 0, 7, 'Grilled chicken with bread', NOW() - INTERVAL '10 days' + INTERVAL '19 hours 30 minutes'),
  (mueller_id, 'Dinner', 'Bread roll', 80, 210, 7, 40, 3, 'Grilled chicken with bread', NOW() - INTERVAL '10 days' + INTERVAL '19 hours 30 minutes');

-- 6 days ago
INSERT INTO food_logs (athlete_id, meal_type, food_item, quantity_grams, calories, protein_grams, carbs_grams, fat_grams, raw_transcript, logged_at)
VALUES
  (mueller_id, 'Breakfast', 'Scrambled eggs', 150, 220, 15, 2, 16, 'Scrambled eggs with toast', NOW() - INTERVAL '6 days' + INTERVAL '7 hours 45 minutes'),
  (mueller_id, 'Breakfast', 'Toast white', 60, 160, 5, 30, 2, 'Scrambled eggs with toast', NOW() - INTERVAL '6 days' + INTERVAL '7 hours 45 minutes'),
  (mueller_id, 'Lunch', 'Chicken soup', 400, 280, 22, 28, 8, 'Chicken soup for lunch', NOW() - INTERVAL '6 days' + INTERVAL '12 hours 0 minutes'),
  (mueller_id, 'Lunch', 'Bread', 80, 210, 7, 40, 3, 'Chicken soup for lunch', NOW() - INTERVAL '6 days' + INTERVAL '12 hours 0 minutes'),
  (mueller_id, 'Snack', 'Apple', 180, 94, 0, 25, 0, 'Apple snack', NOW() - INTERVAL '6 days' + INTERVAL '15 hours 30 minutes'),
  (mueller_id, 'Dinner', 'Salmon fillet', 180, 374, 36, 0, 23, 'Salmon with potatoes', NOW() - INTERVAL '6 days' + INTERVAL '19 hours 15 minutes'),
  (mueller_id, 'Dinner', 'Boiled potatoes', 250, 193, 4, 44, 0, 'Salmon with potatoes', NOW() - INTERVAL '6 days' + INTERVAL '19 hours 15 minutes');

-- 3 days ago
INSERT INTO food_logs (athlete_id, meal_type, food_item, quantity_grams, calories, protein_grams, carbs_grams, fat_grams, raw_transcript, logged_at)
VALUES
  (mueller_id, 'Breakfast', 'Yogurt with granola', 300, 360, 15, 58, 8, 'Yogurt with granola and berries', NOW() - INTERVAL '3 days' + INTERVAL '8 hours 0 minutes'),
  (mueller_id, 'Breakfast', 'Mixed berries', 100, 43, 1, 11, 1, 'Yogurt with granola and berries', NOW() - INTERVAL '3 days' + INTERVAL '8 hours 0 minutes'),
  (mueller_id, 'Lunch', 'Pasta with pesto', 350, 630, 18, 84, 24, 'Pasta with pesto and cherry tomatoes', NOW() - INTERVAL '3 days' + INTERVAL '13 hours 0 minutes'),
  (mueller_id, 'Lunch', 'Cherry tomatoes', 100, 18, 1, 4, 0, 'Pasta with pesto and cherry tomatoes', NOW() - INTERVAL '3 days' + INTERVAL '13 hours 0 minutes'),
  (mueller_id, 'Snack', 'Protein bar', 60, 240, 20, 27, 6, 'Protein bar after training', NOW() - INTERVAL '3 days' + INTERVAL '17 hours 0 minutes'),
  (mueller_id, 'Dinner', 'Beef burger', 300, 650, 38, 48, 32, 'Beef burger with salad', NOW() - INTERVAL '3 days' + INTERVAL '19 hours 30 minutes'),
  (mueller_id, 'Dinner', 'Green salad', 100, 20, 2, 3, 0, 'Beef burger with salad', NOW() - INTERVAL '3 days' + INTERVAL '19 hours 30 minutes');

-- Yesterday
INSERT INTO food_logs (athlete_id, meal_type, food_item, quantity_grams, calories, protein_grams, carbs_grams, fat_grams, raw_transcript, logged_at)
VALUES
  (mueller_id, 'Breakfast', 'Oatmeal', 300, 300, 10, 54, 6, 'Oatmeal with apple and cinnamon', NOW() - INTERVAL '1 day' + INTERVAL '7 hours 30 minutes'),
  (mueller_id, 'Breakfast', 'Apple', 180, 94, 0, 25, 0, 'Oatmeal with apple and cinnamon', NOW() - INTERVAL '1 day' + INTERVAL '7 hours 30 minutes'),
  (mueller_id, 'Lunch', 'Grilled chicken breast', 180, 297, 56, 0, 7, 'Chicken with rice and salad', NOW() - INTERVAL '1 day' + INTERVAL '12 hours 45 minutes'),
  (mueller_id, 'Lunch', 'White rice cooked', 250, 325, 7, 71, 1, 'Chicken with rice and salad', NOW() - INTERVAL '1 day' + INTERVAL '12 hours 45 minutes'),
  (mueller_id, 'Lunch', 'Cucumber salad', 150, 24, 1, 5, 0, 'Chicken with rice and salad', NOW() - INTERVAL '1 day' + INTERVAL '12 hours 45 minutes'),
  (mueller_id, 'Dinner', 'Pizza Margherita', 350, 770, 28, 98, 28, 'Pizza margherita for dinner', NOW() - INTERVAL '1 day' + INTERVAL '19 hours 0 minutes');

-- Today (partial)
INSERT INTO food_logs (athlete_id, meal_type, food_item, quantity_grams, calories, protein_grams, carbs_grams, fat_grams, raw_transcript, logged_at)
VALUES
  (mueller_id, 'Breakfast', 'Bread with cheese', 150, 380, 18, 42, 14, 'Bread with cheese for breakfast', NOW() - INTERVAL '3 hours'),
  (mueller_id, 'Breakfast', 'Orange juice', 200, 88, 1, 21, 0, 'Bread with cheese for breakfast', NOW() - INTERVAL '3 hours'),
  (mueller_id, 'Snack', 'Banana', 130, 116, 1, 29, 0, 'Banana as snack', NOW() - INTERVAL '1 hour');

END $$;

-- ────────────────────────────────────────────────────────────
-- 3. Verify
-- ────────────────────────────────────────────────────────────
SELECT
    a.name,
    a.username,
    a.daily_calorie_goal,
    COUNT(fl.id) AS total_food_items
FROM athletes a
LEFT JOIN food_logs fl ON fl.athlete_id = a.id
WHERE a.username IN ('messi', 'ronaldo', 'mueller', 'athlete1', 'athlete2')
GROUP BY a.id, a.name, a.username, a.daily_calorie_goal
ORDER BY a.id;