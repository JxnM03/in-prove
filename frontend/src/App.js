import React, { useCallback, useEffect, useMemo, useState } from 'react';
import './App.css';
import AudioRecorder from './components/AudioRecorder';
import FoodList from './components/FoodList';
import ConfirmDialog from './components/ConfirmDialog';
import MealTypeConflict from './components/MealTypeConflict';
import Login from './components/Login';
import CheckIn from './components/CheckIn';
import Settings from './components/Settings';
import axios from 'axios';

const MEAL_TYPE_LABELS = {
    Frühstück: 'Breakfast',
    Mittagessen: 'Lunch',
    Abendessen: 'Dinner',
    Snack: 'Snack',
    Mahlzeit: 'Meal'
};

const getMealTypeLabel = (mealType) => {
    return MEAL_TYPE_LABELS[mealType] || mealType || 'Meal';
};

const translateDisplayText = (text) => {
    if (!text) return text;

    const replacements = {
        'Sind diese Angaben korrekt?': 'Are these details correct?',
        'Welche Menge fehlt noch?': 'Which quantity is still missing?'
    };

    if (replacements[text]) {
        return replacements[text];
    }

    const quantityMatch = text.match(/^Wie viel (.+) hast du gegessen\?$/);
    if (quantityMatch) {
        return `How much ${quantityMatch[1]} did you eat?`;
    }

    return text;
};

const isPositiveNumber = (value) => {
    const number = Number(value);
    return Number.isFinite(number) && number > 0;
};

const hasResolvedQuantity = (item) => {
    return isPositiveNumber(item.quantity_grams) && item.quantity_unclear !== true;
};

const areAllFoodItemsResolved = (items) => {
    return Array.isArray(items) && items.length > 0 && items.every(hasResolvedQuantity);
};

const formatDateTime = (value) => {
    if (!value) return 'Unknown';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return 'Unknown';
    return date.toLocaleString('en-US', {
        day: '2-digit',
        month: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
    });
};

const buildMealGroupKey = (row) => {
    const date = row.logged_at ? new Date(row.logged_at) : new Date();
    const roundedToMinute = Number.isNaN(date.getTime())
        ? 'unknown-time'
        : Math.floor(date.getTime() / 60000);
    return [row.meal_type || 'Mahlzeit', row.raw_transcript || '', roundedToMinute].join('|');
};

const formatDbLogsToEntries = (rows) => {
    if (!Array.isArray(rows)) return [];
    const groups = new Map();

    rows.forEach((row) => {
        const key = buildMealGroupKey(row);
        if (!groups.has(key)) {
            const sortTime = row.logged_at ? new Date(row.logged_at).getTime() : 0;
            groups.set(key, {
                id: key,
                logIds: [],
                mealType: row.meal_type || 'Mahlzeit',
                items: [],
                transcript: row.raw_transcript || '',
                totalCalories: 0,
                createdAt: formatDateTime(row.logged_at),
                sortTime
            });
        }

        const group = groups.get(key);
        group.logIds.push(row.id);
        group.items.push({
            id: row.id,
            food_item: row.food_item,
            quantity_grams: row.quantity_grams ? Number(row.quantity_grams) : null,
            calories: row.calories ? Number(row.calories) : null,
            quantity_unclear: false
        });
        group.totalCalories += Number(row.calories) || 0;

        const rowTime = row.logged_at ? new Date(row.logged_at).getTime() : 0;
        if (rowTime > group.sortTime) {
            group.sortTime = rowTime;
            group.createdAt = formatDateTime(row.logged_at);
        }
    });

    return Array.from(groups.values())
        .sort((a, b) => b.sortTime - a.sortTime)
        .map((entry) => ({ ...entry, totalCalories: Math.round(entry.totalCalories) }));
};

const filterEntries = (entries, filters) => {
    const now = new Date();

    const startOfDay = (date) => {
        const d = new Date(date);
        d.setHours(0, 0, 0, 0);
        return d;
    };

    const endOfDay = (date) => {
        const d = new Date(date);
        d.setHours(23, 59, 59, 999);
        return d;
    };

    return entries.filter((entry) => {
        const entryDate = new Date(entry.sortTime || 0);

        // Schnellfilter
        if (filters.period === 'today') {
            if (entryDate < startOfDay(now) || entryDate > endOfDay(now)) return false;
        }

        if (filters.period === 'thisWeek') {
            const weekStart = new Date(now);
            weekStart.setDate(now.getDate() - now.getDay() + (now.getDay() === 0 ? -6 : 1));
            weekStart.setHours(0, 0, 0, 0);
            if (entryDate < weekStart) return false;
        }

        if (filters.period === 'thisMonth') {
            const sameMonth =
                entryDate.getMonth() === now.getMonth() &&
                entryDate.getFullYear() === now.getFullYear();
            if (!sameMonth) return false;
        }

        // Erweiterte Suche: Datumsbereich
        if (filters.period === 'custom') {
            if (filters.dateFrom) {
                const from = startOfDay(new Date(filters.dateFrom));
                if (entryDate < from) return false;
            }
            if (filters.dateTo) {
                const to = endOfDay(new Date(filters.dateTo));
                if (entryDate > to) return false;
            }
        }

        // Mahlzeit-Typ
        if (filters.mealType !== 'all' && entry.mealType !== filters.mealType) return false;

        // Textsuche
        const search = filters.search.trim().toLowerCase();
        if (search) {
            const searchableText = [
                entry.mealType,
                entry.transcript,
                ...entry.items.map((item) => item.food_item)
            ].join(' ').toLowerCase();
            if (!searchableText.includes(search)) return false;
        }

        return true;
    });
};

const formatDayLabel = (timestamp) => {
    const date = new Date(timestamp);
    if (Number.isNaN(date.getTime())) return 'Unknown';
    const now = new Date();
    const isToday =
        date.getDate() === now.getDate() &&
        date.getMonth() === now.getMonth() &&
        date.getFullYear() === now.getFullYear();
    const isYesterday =
        date.getDate() === now.getDate() - 1 &&
        date.getMonth() === now.getMonth() &&
        date.getFullYear() === now.getFullYear();
    if (isToday) return 'Today';
    if (isYesterday) return 'Yesterday';
    return date.toLocaleDateString('en-US', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' });
};

const groupEntriesByDay = (entries) => {
    const groups = [];
    entries.forEach((entry) => {
        const date = new Date(entry.sortTime || 0);
        const label = formatDayLabel(entry.sortTime || 0);
        const dayKey = `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
        const lastGroup = groups[groups.length - 1];
        if (!lastGroup || lastGroup.dayKey !== dayKey) {
            groups.push({ label, dayKey, entries: [entry] });
        } else {
            lastGroup.entries.push(entry);
        }
    });
    return groups;
};

function EntryHistory({
    entries, filters, setFilters, onResetFilters, onNewEntry, onRefresh, onDeleteEntry
}) {
    const filteredEntries = useMemo(() => filterEntries(entries, filters), [entries, filters]);
    const groupedEntries = useMemo(() => groupEntriesByDay(filteredEntries), [filteredEntries]);
    const mealTypeOptions = useMemo(() => {
        return Array.from(new Set(entries.map((entry) => entry.mealType))).filter(Boolean);
    }, [entries]);

    const hasActiveFilters =
        filters.period !== 'today' || filters.mealType !== 'all' ||
        filters.search.trim() !== '' || filters.dateFrom !== '' || filters.dateTo !== '';

    if (entries.length === 0) {
        return (
            <section className="empty-state card">
                <div className="empty-icon">📋</div>
                <h2>No entries found</h2>
                <p>Saved meals will appear here as soon as they are loaded from the database.</p>
                <div className="empty-actions">
                    <button className="btn-primary" onClick={onNewEntry}>Track first meal</button>
                    <button className="btn-secondary" onClick={onRefresh}>Reload entries</button>
                </div>
            </section>
        );
    }

    return (
        <section className="entries-view">
            <div className="section-heading">
                <div>
                    <p className="eyebrow">History</p>
                    <h2>Saved entries</h2>
                </div>
                <div className="entry-actions">
                    <button className="btn-secondary" onClick={onRefresh}>↻ Reload</button>
                    <button className="btn-secondary" onClick={onNewEntry}>+ New entry</button>
                </div>
            </div>

            <div className="filter-card card">
                {/* Schnellfilter */}
                <div className="quick-filters">
                    {[
                        { value: 'today', label: 'Today' },
                        { value: 'thisWeek', label: 'This week' },
                        { value: 'thisMonth', label: 'This month' },
                        { value: 'all', label: 'All time' },
                        { value: 'custom', label: '📅 Custom' },
                    ].map((opt) => (
                        <button
                            key={opt.value}
                            className={filters.period === opt.value ? 'quick-filter-btn active' : 'quick-filter-btn'}
                            onClick={() => setFilters((prev) => ({ ...prev, period: opt.value }))}
                        >
                            {opt.label}
                        </button>
                    ))}
                </div>

                {/* Erweiterte Suche */}
                {filters.period === 'custom' && (
                    <div className="filter-grid advanced">
                        <label>
                            <span>From</span>
                            <input
                                type="date"
                                value={filters.dateFrom}
                                onChange={(e) => setFilters((prev) => ({ ...prev, dateFrom: e.target.value }))}
                            />
                        </label>
                        <label>
                            <span>To</span>
                            <input
                                type="date"
                                value={filters.dateTo}
                                onChange={(e) => setFilters((prev) => ({ ...prev, dateTo: e.target.value }))}
                            />
                        </label>
                        <label>
                            <span>Meal type</span>
                            <select
                                value={filters.mealType}
                                onChange={(e) => setFilters((prev) => ({ ...prev, mealType: e.target.value }))}
                            >
                                <option value="all">All</option>
                                {mealTypeOptions.map((mealType) => (
                                    <option value={mealType} key={mealType}>{getMealTypeLabel(mealType)}</option>
                                ))}
                            </select>
                        </label>
                        <label>
                            <span>Search</span>
                            <input
                                type="text"
                                value={filters.search}
                                onChange={(e) => setFilters((prev) => ({ ...prev, search: e.target.value }))}
                                placeholder="e.g. pizza, chicken..."
                            />
                        </label>
                    </div>
                )}

    {hasActiveFilters && filters.period !== 'today' && (
        <button className="filter-reset" onClick={onResetFilters}>Reset filters</button>
    )}
</div>

            <div className="entry-count">{filteredEntries.length} of {entries.length} entries</div>

            {filteredEntries.length === 0 ? (
                <section className="empty-state card">
                    <div className="empty-icon">🔎</div>
                    <h2>No results</h2>
                    <p>Reset the filters or change your search.</p>
                    <button className="btn-primary" onClick={onResetFilters}>Reset filters</button>
                </section>
            ) : (
                <div className="entry-list">
                    {groupedEntries.map((group) => (
                        <div className="month-group" key={group.dayKey}>
                            <div className="month-separator"><span>{group.label}</span></div>
                            {group.entries.map((entry) => (
                                <article className="entry-card card" key={entry.id}>
                                    <div className="entry-header">
                                        <div>
                                            <h3>{getMealTypeLabel(entry.mealType)}</h3>
                                            <p>{entry.createdAt}</p>
                                        </div>
                                        <strong>{entry.totalCalories} kcal</strong>
                                    </div>
                                    <div className="entry-items">
                                        {entry.items.map((item, index) => (
                                            <div className="entry-item" key={`${entry.id}-${index}`}>
                                                <span>{item.food_item}</span>
                                                <span>
                                                    {item.quantity_grams || '?'} g
                                                    {item.calories ? ` · ${Math.round(item.calories)} kcal` : ''}
                                                </span>
                                            </div>
                                        ))}
                                    </div>
                                    <div className="entry-footer">
                                        <button className="btn-delete" onClick={() => onDeleteEntry(entry)}>
                                            🗑️ Delete
                                        </button>
                                    </div>
                                </article>
                            ))}
                        </div>
                    ))}
                </div>
            )}
        </section>
    );
}

function App() {
    // ── Auth State ──
    const [athlete, setAthlete] = useState(() => {
        try {
            const stored = localStorage.getItem('inproveAthlete');
            return stored ? JSON.parse(stored) : null;
        } catch { return null; }
    });
    const [token, setToken] = useState(() => localStorage.getItem('inproveToken') || null);
    const [calorieGoal, setCalorieGoal] = useState(2500);
    const [consumedCalories, setConsumedCalories] = useState(0);
    const [mealCount, setMealCount] = useState(0);

    // ── Meal Tracking State ──
    const [transcript, setTranscript] = useState('');
    const [foodItems, setFoodItems] = useState([]);
    const [followupQuestion, setFollowupQuestion] = useState(null);
    const [allClear, setAllClear] = useState(false);
    const [awaitingClarification, setAwaitingClarification] = useState(false);
    const [isClarifying, setIsClarifying] = useState(false);
    const [saved, setSaved] = useState(false);
    const [mealType, setMealType] = useState('Mittagessen');
    const [detectedMealType, setDetectedMealType] = useState(null);
    const [mealTypeResolved, setMealTypeResolved] = useState(true);
    const [activeTab, setActiveTab] = useState('track');
    const [filters, setFilters] = useState({ period: 'today', mealType: 'all', search: '', dateFrom: '', dateTo: '' });
    const [savedEntries, setSavedEntries] = useState([]);

    // ── Login / Logout ──
    const handleLogin = (newToken, newAthlete) => {
        setToken(newToken);
        setAthlete(newAthlete);
        localStorage.setItem('inproveToken', newToken);
        localStorage.setItem('inproveAthlete', JSON.stringify(newAthlete));
    };

    const handleLogout = () => {
        setToken(null);
        setAthlete(null);
        setSavedEntries([]);
        localStorage.removeItem('inproveToken');
        localStorage.removeItem('inproveAthlete');
    };

    const loadTodayCalories = useCallback(async () => {
    if (!athlete) return;
    try {
        const [todayRes, goalRes] = await Promise.all([
            axios.get(`http://localhost:3001/api/athletes/today-calories?athlete_id=${athlete.id}`),
            axios.get(`http://localhost:3001/api/athletes/goal?athlete_id=${athlete.id}`)
        ]);
        setConsumedCalories(todayRes.data.total_calories);
        setMealCount(todayRes.data.meal_count);
        setCalorieGoal(goalRes.data.daily_calorie_goal);
    } catch (error) {
        console.error('Could not load today calories:', error);
    }
    }, [athlete]);

    // ── Load entries filtered by athlete ──
    const loadSavedEntriesFromDatabase = useCallback(async () => {
        if (!athlete) return;
        try {
            const response = await axios.get(
                `http://localhost:3001/api/log/all?athlete_id=${athlete.id}`
            );
            setSavedEntries(formatDbLogsToEntries(response.data));
        } catch (error) {
            console.error('Could not load database entries:', error);
        }
    }, [athlete]);

    useEffect(() => {
        if (athlete) loadSavedEntriesFromDatabase();
    }, [athlete, loadSavedEntriesFromDatabase]);

    useEffect(() => {
    if (athlete) loadTodayCalories();
    }, [athlete, loadTodayCalories]);

    // ── Food extraction ──
    const applyFoodResponse = (data) => {
        const items = data.items || [];
        const clear = Boolean(data.all_quantities_clear) && areAllFoodItemsResolved(items);
        setFoodItems(items);
        setAllClear(clear);
        setAwaitingClarification(!clear);
        setFollowupQuestion(
            clear
                ? 'Are these details correct?'
                : translateDisplayText(data.followup_question) || 'Which quantity is still missing?'
        );
        return { clear, items };
    };

    const handleTranscriptReceived = async (text) => {
        setTranscript(text);
        setSaved(false);
        setDetectedMealType(null);
        setMealTypeResolved(true);
        setAwaitingClarification(false);
        setIsClarifying(false);
        setActiveTab('track');

        try {
            const response = await axios.post(
                'http://localhost:3001/api/food/extract',
                { transcript: text }
            );
            applyFoodResponse(response.data);
            const detected = response.data.detected_meal_type;
            if (detected && detected !== mealType) {
                setDetectedMealType(detected);
                setMealTypeResolved(false);
            }
        } catch (error) {
            console.error('Extraction error:', error);
        }
    };

    const handleClarification = async (text) => {
        const updatedTranscript = transcript ? `${transcript}\nAnswer: ${text}` : text;
        setTranscript(updatedTranscript);
        setSaved(false);
        setActiveTab('track');
        setIsClarifying(true);

        try {
            const response = await axios.post(
                'http://localhost:3001/api/food/clarify',
                { transcript: text, previousItems: foodItems }
            );
            applyFoodResponse(response.data);
        } catch (error) {
            console.error('Clarification error:', error);
        } finally {
            setIsClarifying(false);
        }
    };

    const handleMealTypeChoice = (chosen) => {
        setMealType(chosen);
        setDetectedMealType(null);
        setMealTypeResolved(true);
    };

    const resetCurrentMeal = () => {
        setFollowupQuestion(null);
        setFoodItems([]);
        setTranscript('');
        setSaved(false);
        setAllClear(false);
        setAwaitingClarification(false);
        setIsClarifying(false);
        setDetectedMealType(null);
        setMealTypeResolved(true);
    };

    const handleConfirm = async () => {
        if (!allClear || !areAllFoodItemsResolved(foodItems)) return;

        try {
            await axios.post('http://localhost:3001/api/log/save', {
                athlete_id: athlete?.id,
                meal_type: mealType,
                items: foodItems,
                raw_transcript: transcript
            });
            await loadSavedEntriesFromDatabase();
            await loadTodayCalories();
            setSaved(true);
            setFollowupQuestion(null);
            setAwaitingClarification(false);
            setIsClarifying(false);
            setAllClear(false);
            setActiveTab('entries');
        } catch (error) {
            console.error('Save error:', error);
        }
    };

    const handleDeleteEntry = async (entry) => {
        const confirmed = window.confirm(
            `Delete "${getMealTypeLabel(entry.mealType)}" from ${entry.createdAt}?`
        );
        if (!confirmed) return;

        try {
            await axios.delete('http://localhost:3001/api/log/delete', {
                data: { ids: entry.logIds }
            });
            await loadSavedEntriesFromDatabase();
        } catch (error) {
            console.error('Delete error:', error);
        }
    };

    const handleNewEntry = () => {
        resetCurrentMeal();
        setActiveTab('track');
    };

    const resetFilters = () => setFilters({ period: 'today', mealType: 'all', search: '', dateFrom: '', dateTo: '' });

    const canConfirm = allClear && areAllFoodItemsResolved(foodItems);

    // ── Render Login if not authenticated ──
    if (!athlete || !token) {
        return <Login onLogin={handleLogin} />;
    }

    return (
        <div className="app-shell">
            <header className="app-header">
                <div className="brand-mark">in:prove</div>
                <div className="header-athlete">
                    <span>👤 {athlete.name}</span>
                    <button className="btn-logout" onClick={handleLogout}>Logout</button>
                </div>
            </header>

            <div className="app-container">
                <nav className="tab-bar">
                    <button
                        className={activeTab === 'track' ? 'tab active' : 'tab'}
                        onClick={() => setActiveTab('track')}
                    >
                        Track
                    </button>
                    <button
                        className={activeTab === 'entries' ? 'tab active' : 'tab'}
                        onClick={() => setActiveTab('entries')}
                    >
                        Entries
                        <span>{savedEntries.length}</span>
                    </button>
                    <button
                        className={activeTab === 'settings' ? 'tab active' : 'tab'}
                        onClick={() => setActiveTab('settings')}
                    >
                        Settings
                    </button>
                </nav>

                {activeTab === 'track' ? (
                    <main className="track-layout">
                        <CheckIn
                            athlete={athlete}
                            calorieGoal={calorieGoal}
                            consumedCalories={consumedCalories}
                            mealCount={mealCount}
                        />
                        <section className="meal-card card">
                            <div>
                                <p className="eyebrow">Current meal</p>
                                <h2>{getMealTypeLabel(mealType)}</h2>
                            </div>
                            <select
                                value={mealType}
                                onChange={(e) => handleMealTypeChoice(e.target.value)}
                            >
                                <option value="Frühstück">Breakfast</option>
                                <option value="Mittagessen">Lunch</option>
                                <option value="Abendessen">Dinner</option>
                                <option value="Snack">Snack</option>
                            </select>
                        </section>

                        <AudioRecorder
                            isClarification={awaitingClarification}
                            onTranscriptReceived={
                                awaitingClarification ? handleClarification : handleTranscriptReceived
                            }
                        />

                        {transcript && (
                            <section className="transcript card">
                                <p className="eyebrow">Transcript</p>
                                <p>{transcript}</p>
                            </section>
                        )}

                        <FoodList items={foodItems} isUpdating={isClarifying} />

                        <MealTypeConflict
                            selected={mealType}
                            detected={detectedMealType}
                            onChoose={handleMealTypeChoice}
                        />

                        {mealTypeResolved && (
                            <ConfirmDialog
                                question={followupQuestion}
                                onConfirm={handleConfirm}
                                onCorrect={resetCurrentMeal}
                                showButtons={canConfirm}
                            />
                        )}

                        {saved && <div className="success card">✅ Meal saved.</div>}
                    </main>
                ) : activeTab === 'entries' ? (
                    <EntryHistory
                        entries={savedEntries}
                        filters={filters}
                        setFilters={setFilters}
                        onResetFilters={resetFilters}
                        onNewEntry={handleNewEntry}
                        onRefresh={loadSavedEntriesFromDatabase}
                        onDeleteEntry={handleDeleteEntry}
                    />
                ) : (
                    <Settings
                        athlete={athlete}
                        calorieGoal={calorieGoal}
                        onGoalUpdated={(newGoal) => {
                            setCalorieGoal(newGoal);
                            loadTodayCalories();
                        }}
                    />
                )}
            </div>
        </div>
    );
}

export default App;