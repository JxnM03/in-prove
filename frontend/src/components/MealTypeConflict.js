import React from 'react';

const MEAL_TYPE_LABELS = {
  Breakfast: 'Breakfast',
  Lunch: 'Lunch',
  Dinner: 'Dinner',
  Snack: 'Snack'
};

const getMealTypeLabel = (mealType) => {
  return MEAL_TYPE_LABELS[mealType] || mealType;
};

function MealTypeConflict({ selected, detected, onChoose }) {
  if (!detected || detected === selected) return null;

  return (
    <div className="meal-conflict">
      <p>
        🤖 You mentioned <strong>"{getMealTypeLabel(detected)}"</strong>, but{' '}
        <strong>"{getMealTypeLabel(selected)}"</strong> is selected. What would
        you like to save?
      </p>
      <div className="conflict-buttons">
        <button onClick={() => onChoose(selected)} className="btn-conflict">
          📋 {getMealTypeLabel(selected)} (Dropdown)
        </button>
        <button onClick={() => onChoose(detected)} className="btn-conflict-alt">
          🎤 {getMealTypeLabel(detected)} (Spoken)
        </button>
      </div>
    </div>
  );
}

export default MealTypeConflict;
