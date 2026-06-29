import React, { useState } from 'react';
import axios from 'axios';

function Settings({ athlete, calorieGoal, onGoalUpdated }) {
    const [goal, setGoal] = useState(calorieGoal);
    const [isSaving, setIsSaving] = useState(false);
    const [saved, setSaved] = useState(false);
    const [error, setError] = useState('');

    const handleSave = async () => {
        const parsed = parseInt(goal, 10);

        if (!parsed || parsed < 500 || parsed > 10000) {
            setError('Please enter a value between 500 and 10000 kcal');
            return;
        }

        setIsSaving(true);
        setError('');
        setSaved(false);

        try {
            const response = await axios.patch(
                'http://localhost:3001/api/athletes/goal',
                { athlete_id: athlete.id, daily_calorie_goal: parsed }
            );
            onGoalUpdated(response.data.athlete.daily_calorie_goal);
            setSaved(true);
            setTimeout(() => setSaved(false), 3000);
        } catch (err) {
            setError('Could not save goal. Please try again.');
        } finally {
            setIsSaving(false);
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

            <div className="settings-card card">
                <div className="settings-field">
                    <p className="eyebrow">Athlete</p>
                    <h3>{athlete.name}</h3>
                    <p className="settings-username">@{athlete.username}</p>
                </div>
            </div>

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
                    <button
                        className="btn-primary"
                        onClick={handleSave}
                        disabled={isSaving}
                    >
                        {isSaving ? 'Saving...' : 'Save'}
                    </button>
                </div>

                {error && <p className="settings-error">❌ {error}</p>}
                {saved && <p className="settings-success">✅ Goal saved!</p>}
            </div>
        </section>
    );
}

export default Settings;