import React, { useCallback, useEffect, useMemo, useState } from 'react';
import './App.css';
import AudioRecorder from './components/AudioRecorder';
import FoodList from './components/FoodList';
import ConfirmDialog from './components/ConfirmDialog';
import MealTypeConflict from './components/MealTypeConflict';
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

    if (Number.isNaN(date.getTime())) {
        return 'Unknown';
    }

    return date.toLocaleString('en-US', {
        day: '2-digit',
        month: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
    });
};

const formatMonthLabel = (timestamp) => {
    const date = new Date(timestamp);

    if (Number.isNaN(date.getTime())) {
        return 'Unknown time period';
    }

    return date.toLocaleDateString('en-US', {
        month: 'long',
        year: 'numeric'
    });
};

const buildMealGroupKey = (row) => {
    const date = row.logged_at ? new Date(row.logged_at) : new Date();

    const roundedToMinute = Number.isNaN(date.getTime())
        ? 'unknown-time'
        : Math.floor(date.getTime() / 60000);

    return [
        row.meal_type || 'Mahlzeit',
        row.raw_transcript || '',
        roundedToMinute
    ].join('|');
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
        .map((entry) => ({
            ...entry,
            totalCalories: Math.round(entry.totalCalories)
        }));
};

const filterEntries = (entries, filters) => {
    const now = new Date();

    return entries.filter((entry) => {
        const entryDate = new Date(entry.sortTime || 0);

        if (filters.period === 'thisMonth') {
            const sameMonth =
                entryDate.getMonth() === now.getMonth() &&
                entryDate.getFullYear() === now.getFullYear();

            if (!sameMonth) return false;
        }

        if (filters.period === 'last3Months') {
            const threeMonthsAgo = new Date(now);
            threeMonthsAgo.setMonth(now.getMonth() - 3);

            if (entryDate < threeMonthsAgo) return false;
        }

        if (filters.period === 'last6Months') {
            const sixMonthsAgo = new Date(now);
            sixMonthsAgo.setMonth(now.getMonth() - 6);

            if (entryDate < sixMonthsAgo) return false;
        }

        if (filters.mealType !== 'all' && entry.mealType !== filters.mealType) {
            return false;
        }

        const search = filters.search.trim().toLowerCase();

        if (search) {
            const searchableText = [
                entry.mealType,
                entry.transcript,
                ...entry.items.map((item) => item.food_item)
            ]
                .join(' ')
                .toLowerCase();

            if (!searchableText.includes(search)) return false;
        }

        return true;
    });
};

const groupEntriesByMonth = (entries) => {
    const groups = [];

    entries.forEach((entry) => {
        const label = formatMonthLabel(entry.sortTime || 0);
        const lastGroup = groups[groups.length - 1];

        if (!lastGroup || lastGroup.label !== label) {
            groups.push({
                label,
                entries: [entry]
            });
        } else {
            lastGroup.entries.push(entry);
        }
    });

    return groups;
};

function EntryHistory({
    entries,
    filters,
    setFilters,
    onResetFilters,
    onNewEntry,
    onRefresh,
    onDeleteEntry
}) {
    const filteredEntries = useMemo(() => filterEntries(entries, filters), [entries, filters]);
    const groupedEntries = useMemo(() => groupEntriesByMonth(filteredEntries), [filteredEntries]);

    const mealTypeOptions = useMemo(() => {
        return Array.from(new Set(entries.map((entry) => entry.mealType))).filter(Boolean);
    }, [entries]);

    const hasActiveFilters =
        filters.period !== 'all' ||
        filters.mealType !== 'all' ||
        filters.search.trim() !== '';

    if (entries.length === 0) {
        return (
            <section className="empty-state card">
                <div className="empty-icon">📋</div>
                <h2>No entries found</h2>
                <p>
                    Saved meals will appear here as soon as they are loaded from the database.
                </p>
                <div className="empty-actions">
                    <button className="btn-primary" onClick={onNewEntry}>
                        Track first meal
                    </button>
                    <button className="btn-secondary" onClick={onRefresh}>
                        Reload entries
                    </button>
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
                    <button className="btn-secondary" onClick={onRefresh}>
                        ↻ Reload
                    </button>
                    <button className="btn-secondary" onClick={onNewEntry}>
                        + New entry
                    </button>
                </div>
            </div>

            <div className="filter-card card">
                <div className="filter-grid">
                    <label>
                        <span>Time period</span>
                        <select
                            value={filters.period}
                            onChange={(e) =>
                                setFilters((prev) => ({ ...prev, period: e.target.value }))
                            }
                        >
                            <option value="all">All</option>
                            <option value="thisMonth">This month</option>
                            <option value="last3Months">Last 3 months</option>
                            <option value="last6Months">Last 6 months</option>
                        </select>
                    </label>

                    <label>
                        <span>Meal</span>
                        <select
                            value={filters.mealType}
                            onChange={(e) =>
                                setFilters((prev) => ({ ...prev, mealType: e.target.value }))
                            }
                        >
                            <option value="all">All</option>
                            {mealTypeOptions.map((mealType) => (
                                <option value={mealType} key={mealType}>
                                    {getMealTypeLabel(mealType)}
                                </option>
                            ))}
                        </select>
                    </label>

                    <label>
                        <span>Search</span>
                        <input
                            value={filters.search}
                            onChange={(e) =>
                                setFilters((prev) => ({ ...prev, search: e.target.value }))
                            }
                            placeholder="e.g. rice, avocado..."
                        />
                    </label>
                </div>

                {hasActiveFilters && (
                    <button className="filter-reset" onClick={onResetFilters}>
                        Reset filters
                    </button>
                )}
            </div>

            <div className="entry-count">
                {filteredEntries.length} of {entries.length} entries
            </div>

            {filteredEntries.length === 0 ? (
                <section className="empty-state card">
                    <div className="empty-icon">🔎</div>
                    <h2>No results</h2>
                    <p>Reset the filters or change your search.</p>
                    <button className="btn-primary" onClick={onResetFilters}>
                        Reset filters
                    </button>
                </section>
            ) : (
                <div className="entry-list">
                    {groupedEntries.map((group) => (
                        <div className="month-group" key={group.label}>
                            <div className="month-separator">
                                <span>{group.label}</span>
                            </div>

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
                                                    {item.calories
                                                        ? ` · ${Math.round(item.calories)} kcal`
                                                        : ''}
                                                </span>
                                            </div>
                                        ))}
                                    </div>

                                    <div className="entry-footer">
                                        <button
                                            className="btn-delete"
                                            onClick={() => onDeleteEntry(entry)}
                                        >
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
    const [filters, setFilters] = useState({
        period: 'all',
        mealType: 'all',
        search: ''
    });

    const [savedEntries, setSavedEntries] = useState(() => {
        try {
            const storedEntries = localStorage.getItem('inproveSavedEntries');
            return storedEntries ? JSON.parse(storedEntries) : [];
        } catch (error) {
            console.error('Could not load saved entries:', error);
            return [];
        }
    });

    const loadSavedEntriesFromDatabase = useCallback(async () => {
        try {
            const response = await axios.get('http://localhost:3001/api/log/all');
            const dbEntries = formatDbLogsToEntries(response.data);

            setSavedEntries(dbEntries);
            localStorage.setItem('inproveSavedEntries', JSON.stringify(dbEntries));
        } catch (error) {
            console.error('Could not load database entries:', error);
        }
    }, []);

    useEffect(() => {
        loadSavedEntriesFromDatabase();
    }, [loadSavedEntriesFromDatabase]);

    useEffect(() => {
        try {
            localStorage.setItem('inproveSavedEntries', JSON.stringify(savedEntries));
        } catch (error) {
            console.error('Could not save entries:', error);
        }
    }, [savedEntries]);

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
        const updatedTranscript = transcript
            ? `${transcript}\nAnswer: ${text}`
            : text;

        setTranscript(updatedTranscript);
        setSaved(false);
        setActiveTab('track');
        setIsClarifying(true);

        try {
            const response = await axios.post(
                'http://localhost:3001/api/food/clarify',
                {
                    transcript: text,
                    previousItems: foodItems
                }
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
        if (!allClear || !areAllFoodItemsResolved(foodItems)) {
            console.warn('Save blocked: quantities are still missing.');
            return;
        }

        try {
            await axios.post('http://localhost:3001/api/log/save', {
                meal_type: mealType,
                items: foodItems,
                raw_transcript: transcript
            });

            await loadSavedEntriesFromDatabase();

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

    const resetFilters = () => {
        setFilters({
            period: 'all',
            mealType: 'all',
            search: ''
        });
    };

    const canConfirm = allClear && areAllFoodItemsResolved(foodItems);

    return (
        <div className="app-shell">
            <header className="app-header">
                <div className="brand-mark">in:prove</div>
                <p>Smart food tracking for athletes</p>
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
                </nav>

                {activeTab === 'track' ? (
                    <main className="track-layout">
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

                        {saved && (
                            <div className="success card">
                                ✅ Meal saved.
                            </div>
                        )}
                    </main>
                ) : (
                    <EntryHistory
                        entries={savedEntries}
                        filters={filters}
                        setFilters={setFilters}
                        onResetFilters={resetFilters}
                        onNewEntry={handleNewEntry}
                        onRefresh={loadSavedEntriesFromDatabase}
                        onDeleteEntry={handleDeleteEntry}
                    />
                )}
            </div>
        </div>
    );
}

export default App;
