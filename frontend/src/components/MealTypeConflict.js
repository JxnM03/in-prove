import React from 'react';

function MealTypeConflict({ selected, detected, onChoose }) {
  if (!detected || detected === selected) return null;

  return (
    <div className="meal-conflict">
      <p>🤖 Du hast <strong>"{detected}"</strong> erwähnt, aber <strong>"{selected}"</strong> ist ausgewählt. Was möchtest du speichern?</p>
      <div className="conflict-buttons">
        <button onClick={() => onChoose(selected)} className="btn-conflict">
          📋 {selected} (Dropdown)
        </button>
        <button onClick={() => onChoose(detected)} className="btn-conflict-alt">
          🎤 {detected} (Gesagt)
        </button>
      </div>
    </div>
  );
}

export default MealTypeConflict;