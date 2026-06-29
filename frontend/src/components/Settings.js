import React, { useState } from 'react';
import axios from 'axios';

function Settings({ athlete, calorieGoal, macros, onGoalUpdated, onMacrosUpdated }) {
    const [goal, setGoal] = useState(calorieGoal);
    const [protein, setProtein] = useState(macros.protein);
    const [carbs, setCarbs] = useState(macros.carbs);
    const [fat, setFat] = useState(macros.fat);
    const [isSavingGoal, setIsSavingGoal] = useState(false);
    const [isSavingMacros, setIsSavingMacros] = useState(false);
    const [savedGoal, setSavedGoal] = useState(false);
    const [savedMacros, setSavedMacros] = useState(false);
    const [errorGoal, setErrorGoal] = useState('');
    const [errorMacros, setErrorMacros] = useState('');

    const macroTotal = Number(protein) + Number(carbs) + Number(fat);

    const handleSaveGoal = async () => {
        const parsed = parseInt(goal, 10);
        if (!parsed || parsed < 500 || parsed > 10000) {
            setErrorGoal('Please enter a value between 500 and 10000 kcal');
            return;
        }
        setIsSavingGoal(true);
        setErrorGoal('');
        setSavedGoal(false);
        try {
            const response = await axios.patch(
                'http://localhost:3001/api/athletes/goal',
                { athlete_id: athlete.id, daily_calorie_goal: parsed }
            );
            onGoalUpdated(response.data.athlete.daily_calorie_goal);
            setSavedGoal(true);
            setTimeout(() => setSavedGoal(false), 3000);
        } catch {
            setErrorGoal('Could not save goal. Please try again.');
        } finally {
            setIsSavingGoal(false);
        }
    };

    const handleSaveMacros = async () => {
        if (macroTotal !== 100) {
            setErrorMacros(`Percentages must add up to 100% (currently ${macroTotal}%)`);
            return;
        }
        setIsSavingMacros(true);
        setErrorMacros('');
        setSavedMacros(false);
        try {
            const response = await axios.patch(
                'http://localhost:3001/api/athletes/macros',
                {
                    athlete_id: athlete.id,
                    macro_protein_pct: Number(protein),
                    macro_carbs_pct: Number(carbs),
                    macro_fat_pct: Number(fat)
                }
            );
            onMacrosUpdated(response.data.athlete);
            setSavedMacros(true);
            setTimeout(() => setSavedMacros(false), 3000);
        } catch {
            setErrorMacros('Could not save macros. Please try again.');
        } finally {
            setIsSavingMacros(false);
        }
    };

    return (
        <section className="settings-view">
            <div className="section-heading">
                <div>
                    <p className="eyebrow">Settings</p>
                    <h2>Your profile</h2>
                </div>
            </div>

            {/* Athlete Info */}
            <div className="settings-card card">
                <p className="eyebrow">Athlete</p>
                <h3>{athlete.name}</h3>
                <p className="settings-username">@{athlete.username}</p>
            </div>

            {/* Calorie Goal */}
            <div className="settings-card card">
                <p className="eyebrow">Daily calorie goal</p>
                <h3>Set your target</h3>
                <p className="settings-desc">
                    Your daily calorie goal is used to track your progress throughout the day.
                </p>
                <div className="settings-input-row">
                    <input
                        type="number"
                        value={goal}
                        onChange={(e) => setGoal(e.target.value)}
                        min="500"
                        max="10000"
                        step="50"
                    />
                    <span className="settings-unit">kcal</span>
                    <button className="btn-primary" onClick={handleSaveGoal} disabled={isSavingGoal}>
                        {isSavingGoal ? 'Saving...' : 'Save'}
                    </button>
                </div>
                {errorGoal && <p className="settings-error">❌ {errorGoal}</p>}
                {savedGoal && <p className="settings-success">✅ Goal saved!</p>}
            </div>

            {/* Macro Goals */}
            <div className="settings-card card">
                <p className="eyebrow">Macro targets</p>
                <h3>Set your macro split</h3>
                <p className="settings-desc">
                    Distribute your daily calories across protein, carbohydrates and fat. Must add up to 100%.
                </p>

                <div className="macro-inputs">
                    <div className="macro-input-group">
                        <label>
                            <span className="macro-label protein">Protein</span>
                            <div className="settings-input-row">
                                <input
                                    type="number"
                                    value={protein}
                                    onChange={(e) => setProtein(e.target.value)}
                                    min="10" max="80" step="5"
                                />
                                <span className="settings-unit">%</span>
                            </div>
                            <p className="macro-gram-hint">
                                ≈ {Math.round((Number(protein) / 100) * calorieGoal / 4)}g / day
                            </p>
                        </label>
                    </div>

                    <div className="macro-input-group">
                        <label>
                            <span className="macro-label carbs">Carbs</span>
                            <div className="settings-input-row">
                                <input
                                    type="number"
                                    value={carbs}
                                    onChange={(e) => setCarbs(e.target.value)}
                                    min="10" max="80" step="5"
                                />
                                <span className="settings-unit">%</span>
                            </div>
                            <p className="macro-gram-hint">
                                ≈ {Math.round((Number(carbs) / 100) * calorieGoal / 4)}g / day
                            </p>
                        </label>
                    </div>

                    <div className="macro-input-group">
                        <label>
                            <span className="macro-label fat">Fat</span>
                            <div className="settings-input-row">
                                <input
                                    type="number"
                                    value={fat}
                                    onChange={(e) => setFat(e.target.value)}
                                    min="10" max="80" step="5"
                                />
                                <span className="settings-unit">%</span>
                            </div>
                            <p className="macro-gram-hint">
                                ≈ {Math.round((Number(fat) / 100) * calorieGoal / 9)}g / day
                            </p>
                        </label>
                    </div>
                </div>

                <div className={`macro-total ${macroTotal === 100 ? 'ok' : 'error'}`}>
                    Total: {macroTotal}% {macroTotal === 100 ? '✅' : `(${100 - macroTotal > 0 ? '+' : ''}${100 - macroTotal}% to go)`}
                </div>

                <button
                    className="btn-primary"
                    onClick={handleSaveMacros}
                    disabled={isSavingMacros || macroTotal !== 100}
                    style={{ marginTop: '12px' }}
                >
                    {isSavingMacros ? 'Saving...' : 'Save macros'}
                </button>

                {errorMacros && <p className="settings-error">❌ {errorMacros}</p>}
                {savedMacros && <p className="settings-success">✅ Macros saved!</p>}
            </div>
        </section>
    );
}

export default Settings;