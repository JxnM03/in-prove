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
    Breakfast: 'Breakfast',
    Lunch: 'Lunch',
    Dinner: 'Dinner',
    Snack: 'Snack',
    Meal: 'Meal'
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
            const sortTime = row.logged_at ? new Date(row.logged_at).getTime() : Date.now();
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
            protein_grams: row.protein_grams ? Number(row.protein_grams) : null,
            carbs_grams: row.carbs_grams ? Number(row.carbs_grams) : null,
            fat_grams: row.fat_grams ? Number(row.fat_grams) : null,
            quantity_unclear: false
        });
        group.totalCalories += Number(row.calories) || 0;

        const rowTime = row.logged_at ? new Date(row.logged_at).getTime() : Date.now();
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
    entries, filters, setFilters, onResetFilters, onNewEntry, onRefresh, onDeleteEntry, onUpdateItem, onDeleteItem, onAddItemToEntry
}) {
    const [editingItemId, setEditingItemId] = useState(null);
    const [editingItemValue, setEditingItemValue] = useState('');
    const [addingToEntryId, setAddingToEntryId] = useState(null);
    const [addingToEntryText, setAddingToEntryText] = useState('');
    const [isAddingToEntry, setIsAddingToEntry] = useState(false);
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
                                                <span className="entry-item-name">{item.food_item}</span>
                                                <div className="entry-item-right">
                                                    {editingItemId === item.id ? (
                                                        <div className="inline-edit-row">
                                                            <input
                                                                type="number"
                                                                className="inline-edit-input"
                                                                value={editingItemValue}
                                                                onChange={(e) => setEditingItemValue(e.target.value)}
                                                                onKeyDown={(e) => {
                                                                    if (e.key === 'Enter') {
                                                                        onUpdateItem(item.id, Number(editingItemValue));
                                                                        setEditingItemId(null);
                                                                    }
                                                                    if (e.key === 'Escape') setEditingItemId(null);
                                                                }}
                                                                autoFocus
                                                                min="1"
                                                            />
                                                            <span className="inline-edit-unit">g</span>
                                                            <button
                                                                className="btn-inline-save"
                                                                onClick={() => {
                                                                    onUpdateItem(item.id, Number(editingItemValue));
                                                                    setEditingItemId(null);
                                                                }}
                                                            >✓</button>
                                                            <button
                                                                className="btn-inline-cancel"
                                                                onClick={() => setEditingItemId(null)}
                                                            >✕</button>
                                                        </div>
                                                    ) : (
                                                        <span
                                                            className="editable-quantity"
                                                            onClick={() => {
                                                                setEditingItemId(item.id);
                                                                setEditingItemValue(String(item.quantity_grams || ''));
                                                            }}
                                                        >
                                                            {item.quantity_grams || '?'} g ✏️
                                                        </span>
                                                    )}
                                                    <span>{item.calories ? `${Math.round(item.calories)} kcal` : '—'}</span>
                                                    <div className="entry-item-macros">
                                                        {item.protein_grams ? <span style={{ color: '#3157d5' }}>P {Math.round(item.protein_grams)}g</span> : null}
                                                        {item.carbs_grams ? <span style={{ color: '#0ea5e9' }}>C {Math.round(item.carbs_grams)}g</span> : null}
                                                        {item.fat_grams ? <span style={{ color: '#8b5cf6' }}>F {Math.round(item.fat_grams)}g</span> : null}
                                                    </div>
                                                </div>
                                                <button
                                                    className="btn-delete-item"
                                                    onClick={() => onDeleteItem(item.id)}
                                                    title="Delete item"
                                                >
                                                    🗑️
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                    <div className="entry-footer">
                                        <button
                                            className="btn-secondary"
                                            onClick={() => setAddingToEntryId(addingToEntryId === entry.id ? null : entry.id)}
                                        >
                                            {addingToEntryId === entry.id ? '✕ Cancel' : '+ Add item'}
                                        </button>
                                        <button className="btn-delete" onClick={() => onDeleteEntry(entry)}>
                                            🗑️ Delete
                                        </button>
                                    </div>

                                    {addingToEntryId === entry.id && (
                                        <div className="add-item-panel">
                                            <p className="eyebrow" style={{ marginBottom: '8px' }}>Add to this meal</p>
                                            <div className="typed-input-row">
                                                <textarea
                                                    className="add-item-input"
                                                    value={addingToEntryText}
                                                    onChange={(e) => setAddingToEntryText(e.target.value)}
                                                    onKeyDown={(e) => {
                                                        if (e.key === 'Enter' && !e.shiftKey) {
                                                            e.preventDefault();
                                                            if (!addingToEntryText.trim() || isAddingToEntry) return;
                                                            setIsAddingToEntry(true);
                                                            onAddItemToEntry(addingToEntryText, entry).finally(() => {
                                                                setIsAddingToEntry(false);
                                                                setAddingToEntryText('');
                                                                setAddingToEntryId(null);
                                                            });
                                                        }
                                                    }}
                                                    placeholder="e.g. 1 banana, 200ml orange juice..."
                                                    rows={2}
                                                    disabled={isAddingToEntry}
                                                />
                                                <button
                                                    className="btn-typed-submit"
                                                    disabled={!addingToEntryText.trim() || isAddingToEntry}
                                                    onClick={() => {
                                                        if (!addingToEntryText.trim() || isAddingToEntry) return;
                                                        setIsAddingToEntry(true);
                                                        onAddItemToEntry(addingToEntryText, entry).finally(() => {
                                                            setIsAddingToEntry(false);
                                                            setAddingToEntryText('');
                                                            setAddingToEntryId(null);
                                                        });
                                                    }}
                                                >
                                                    {isAddingToEntry ? 'Adding...' : 'Add'}
                                                </button>
                                            </div>
                                        </div>
                                    )}
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
    const [macros, setMacros] = useState({ protein: 30, carbs: 40, fat: 30 });
    const [consumedMacros, setConsumedMacros] = useState({ protein: 0, carbs: 0, fat: 0 });
    const [macroGoals, setMacroGoals] = useState({ protein: 0, carbs: 0, fat: 0 });

    // ── Meal Tracking State ──
    const [transcript, setTranscript] = useState('');
    const [foodItems, setFoodItems] = useState([]);
    const [followupQuestion, setFollowupQuestion] = useState(null);
    const [allClear, setAllClear] = useState(false);
    const [awaitingClarification, setAwaitingClarification] = useState(false);
    const [isClarifying, setIsClarifying] = useState(false);
    const [saved, setSaved] = useState(false);
    const [mealType, setMealType] = useState('Lunch');
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
        const cal = goalRes.data.daily_calorie_goal;
        setConsumedCalories(todayRes.data.total_calories);
        setMealCount(todayRes.data.meal_count);
        setCalorieGoal(cal);
        setConsumedMacros({
            protein: todayRes.data.total_protein,
            carbs: todayRes.data.total_carbs,
            fat: todayRes.data.total_fat
        });
        setMacros({
            protein: goalRes.data.macro_protein_pct,
            carbs: goalRes.data.macro_carbs_pct,
            fat: goalRes.data.macro_fat_pct
        });
        setMacroGoals({
            protein: Math.round((goalRes.data.macro_protein_pct / 100) * cal / 4),
            carbs: Math.round((goalRes.data.macro_carbs_pct / 100) * cal / 4),
            fat: Math.round((goalRes.data.macro_fat_pct / 100) * cal / 9)
        });
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

    const handleAddItem = async (text, currentItems) => {
        try {
            const response = await axios.post(
                'http://localhost:3001/api/food/clarify',
                { transcript: text, previousItems: currentItems }
            );
            applyFoodResponse(response.data);
        } catch (error) {
            console.error('Add item error:', error);
        }
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

    const handleUpdateItem = async (itemId, newQuantity) => {
        try {
            await axios.patch('http://localhost:3001/api/log/update-item', {
                id: itemId,
                quantity_grams: newQuantity
            });
            await loadSavedEntriesFromDatabase();
            await loadTodayCalories();
        } catch (error) {
            console.error('Update item error:', error);
        }
    };

    const handleDeleteItem = async (itemId) => {
        const confirmed = window.confirm('Delete this food item?');
        if (!confirmed) return;
        try {
            await axios.delete('http://localhost:3001/api/log/delete-item', {
                data: { id: itemId }
            });
            await loadSavedEntriesFromDatabase();
            await loadTodayCalories();
        } catch (error) {
            console.error('Delete item error:', error);
        }
    };

    const handleAddItemToEntry = async (text, entry) => {
        try {
            const response = await axios.post(
                'http://localhost:3001/api/food/extract',
                { transcript: text }
            );

            const newItems = response.data.items.filter(
                (item) => item.quantity_grams && item.calories
            );

            if (newItems.length === 0) return;

            // logged_at vom bestehenden Entry übernehmen
            const offsetMs = new Date().getTimezoneOffset() * -60 * 1000;
            const entryTimestamp = new Date(entry.sortTime + offsetMs).toISOString();

            await axios.post('http://localhost:3001/api/log/save', {
                athlete_id: athlete?.id,
                meal_type: entry.mealType,
                items: newItems,
                raw_transcript: entry.transcript,
                logged_at: entryTimestamp
            });

            await loadSavedEntriesFromDatabase();
            await loadTodayCalories();
        } catch (error) {
            console.error('Add item to entry error:', error);
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
                        onClick={() => {
                            setActiveTab('track');
                            loadTodayCalories();
                        }}
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
                            consumedMacros={consumedMacros}
                            macroGoals={macroGoals}
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
                                <option value="Breakfast">Breakfast</option>
                                <option value="Lunch">Lunch</option>
                                <option value="Dinner">Dinner</option>
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

                        <FoodList
                            items={foodItems}
                            isUpdating={isClarifying}
                            onItemsChange={(updatedItems) => setFoodItems(updatedItems)}
                            onAddItem={handleAddItem}
                        />

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
                        onUpdateItem={handleUpdateItem}
                        onDeleteItem={handleDeleteItem}
                        onAddItemToEntry={handleAddItemToEntry}
                    />
                ) : (
                    <Settings
                        athlete={athlete}
                        calorieGoal={calorieGoal}
                        macros={macros}
                        onGoalUpdated={(newGoal) => {
                            setCalorieGoal(newGoal);
                            setMacroGoals({
                                protein: Math.round((macros.protein / 100) * newGoal / 4),
                                carbs: Math.round((macros.carbs / 100) * newGoal / 4),
                                fat: Math.round((macros.fat / 100) * newGoal / 9)
                            });
                            loadTodayCalories();
                        }}
                        onMacrosUpdated={(updatedAthlete) => {
                            const newProtein = updatedAthlete.macro_protein_pct;
                            const newCarbs = updatedAthlete.macro_carbs_pct;
                            const newFat = updatedAthlete.macro_fat_pct;
                            setMacros({ protein: newProtein, carbs: newCarbs, fat: newFat });
                            setMacroGoals({
                                protein: Math.round((newProtein / 100) * calorieGoal / 4),
                                carbs: Math.round((newCarbs / 100) * calorieGoal / 4),
                                fat: Math.round((newFat / 100) * calorieGoal / 9)
                            });
                            console.log('onMacrosUpdated called:', newProtein, newCarbs, newFat);
                            console.log('calorieGoal at update time:', calorieGoal);
                            loadTodayCalories();
                        }}
                    />
                )}
            </div>
        </div>
    );
}

export default App;