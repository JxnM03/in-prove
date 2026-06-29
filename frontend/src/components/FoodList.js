import React, { useState } from 'react';

const formatNumber = (value) => {
  const number = Number(value);
  if (!Number.isFinite(number) || number <= 0) return null;
  return Math.round(number);
};

function InlineLoadingDots() {
  return (
    <span className="inline-loading-dots" aria-label="Loading">
      <span></span>
      <span></span>
      <span></span>
    </span>
  );
}

function MacroTag({ label, value, color, isUpdating }) {
  return (
    <span className="macro-tag" style={{ color }}>
      <span className="macro-tag-label">{label}</span>
      {value !== null ? (
        <strong>{value}g</strong>
      ) : isUpdating ? (
        <InlineLoadingDots />
      ) : (
        <strong>—</strong>
      )}
    </span>
  );
}

function FoodList({ items, isUpdating = false, onItemsChange, onAddItem }) {
  const [editingIndex, setEditingIndex] = useState(null);
  const [editValue, setEditValue] = useState('');
  const [addText, setAddText] = useState('');
  const [isAdding, setIsAdding] = useState(false);

  if (!items || items.length === 0) {
    return (
      <section className="food-list card empty-food">
        <p className="eyebrow">Current meal</p>
        <h2>No food items detected yet</h2>
        <p>Start a recording to track your meal.</p>
      </section>
    );
  }

  const totalCalories = items.reduce((sum, item) => sum + (Number(item.calories) || 0), 0);
  const totalProtein = items.reduce((sum, item) => sum + (Number(item.protein_grams) || 0), 0);
  const totalCarbs = items.reduce((sum, item) => sum + (Number(item.carbs_grams) || 0), 0);
  const totalFat = items.reduce((sum, item) => sum + (Number(item.fat_grams) || 0), 0);
  const resolvedItems = items.filter((item) => formatNumber(item.quantity_grams)).length;

  const handleEditStart = (index, currentQty) => {
    setEditingIndex(index);
    setEditValue(String(currentQty || ''));
  };

  const handleEditSave = (index) => {
    const newQty = Number(editValue);
    if (!newQty || newQty <= 0) {
      setEditingIndex(null);
      return;
    }

    const item = items[index];
    const oldQty = Number(item.quantity_grams) || 1;
    const ratio = newQty / oldQty;

    const updatedItem = {
      ...item,
      quantity_grams: newQty,
      calories: item.calories ? Math.round(Number(item.calories) * ratio) : null,
      protein_grams: item.protein_grams ? Math.round(Number(item.protein_grams) * ratio * 10) / 10 : null,
      carbs_grams: item.carbs_grams ? Math.round(Number(item.carbs_grams) * ratio * 10) / 10 : null,
      fat_grams: item.fat_grams ? Math.round(Number(item.fat_grams) * ratio * 10) / 10 : null,
    };

    const updatedItems = items.map((it, i) => i === index ? updatedItem : it);
    onItemsChange(updatedItems);
    setEditingIndex(null);
  };

  const handleEditKeyDown = (e, index) => {
    if (e.key === 'Enter') handleEditSave(index);
    if (e.key === 'Escape') setEditingIndex(null);
  };

  const handleAddSubmit = async () => {
    const text = addText.trim();
    if (!text || isAdding) return;
    setIsAdding(true);
    try {
      await onAddItem(text, items);
      setAddText('');
    } finally {
      setIsAdding(false);
    }
  };

  const handleAddKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleAddSubmit();
    }
  };

  return (
    <section className="food-list card">
      <div className="section-heading">
        <div>
          <p className="eyebrow">Current meal</p>
          <h2>Detected food items</h2>
        </div>
        <div className="progress-pill">
          {resolvedItems}/{items.length} quantities
        </div>
      </div>

      <div className="nutrition-summary">
        <div>
          <span>Calories</span>
          <strong>{Math.round(totalCalories) > 0 ? `${Math.round(totalCalories)} kcal` : '— kcal'}</strong>
        </div>
        <div>
          <span>Protein</span>
          <strong>{totalProtein > 0 ? `${Math.round(totalProtein)}g` : '—'}</strong>
        </div>
        <div>
          <span>Carbs</span>
          <strong>{totalCarbs > 0 ? `${Math.round(totalCarbs)}g` : '—'}</strong>
        </div>
        <div>
          <span>Fat</span>
          <strong>{totalFat > 0 ? `${Math.round(totalFat)}g` : '—'}</strong>
        </div>
      </div>

      <div className="food-card-list">
        {items.map((item, index) => {
          const quantity = formatNumber(item.quantity_grams);
          const calories = formatNumber(item.calories);
          const protein = formatNumber(item.protein_grams);
          const carbs = formatNumber(item.carbs_grams);
          const fat = formatNumber(item.fat_grams);
          const quantityMissing = !quantity;
          const caloriesMissing = !calories;
          const isEditing = editingIndex === index;

          return (
            <article
              className={quantityMissing ? 'food-item-card missing' : 'food-item-card'}
              key={index}
            >
              <div className="food-main">
                <div className="food-icon">{quantityMissing ? '❔' : '🍽️'}</div>
                <div style={{ flex: 1 }}>
                  <h3>{item.food_item}</h3>

                  {isEditing ? (
                    <div className="inline-edit-row">
                      <input
                        type="number"
                        className="inline-edit-input"
                        value={editValue}
                        onChange={(e) => setEditValue(e.target.value)}
                        onKeyDown={(e) => handleEditKeyDown(e, index)}
                        autoFocus
                        min="1"
                      />
                      <span className="inline-edit-unit">g</span>
                      <button className="btn-inline-save" onClick={() => handleEditSave(index)}>✓</button>
                      <button className="btn-inline-cancel" onClick={() => setEditingIndex(null)}>✕</button>
                    </div>
                  ) : (
                    <p>
                      {quantityMissing ? (
                        isUpdating ? <InlineLoadingDots /> : 'Quantity still missing'
                      ) : (
                        <span
                          className="editable-quantity"
                          onClick={() => handleEditStart(index, quantity)}
                        >
                          {quantity} g ✏️
                        </span>
                      )}
                    </p>
                  )}

                  {!quantityMissing && !isEditing && (
                    <div className="food-macros">
                      <MacroTag label="P" value={protein} color="#3157d5" isUpdating={isUpdating} />
                      <MacroTag label="C" value={carbs} color="#0ea5e9" isUpdating={isUpdating} />
                      <MacroTag label="F" value={fat} color="#8b5cf6" isUpdating={isUpdating} />
                    </div>
                  )}
                </div>
              </div>

              <div className="food-metrics">
                <strong>
                  {caloriesMissing && isUpdating ? <InlineLoadingDots /> : (calories || '—')}
                </strong>
                <span>kcal</span>
              </div>
            </article>
          );
        })}
      </div>

      {/* Add item */}
      {onAddItem && (
        <div className="add-item-panel">
          <p className="eyebrow" style={{ marginBottom: '8px' }}>Add another item</p>
          <div className="typed-input-row">
            <textarea
              className="add-item-input"
              value={addText}
              onChange={(e) => setAddText(e.target.value)}
              onKeyDown={handleAddKeyDown}
              placeholder="e.g. 1 banana, 200ml orange juice..."
              rows={2}
              disabled={isAdding}
            />
            <button
              className="btn-typed-submit"
              onClick={handleAddSubmit}
              disabled={!addText.trim() || isAdding}
            >
              {isAdding ? 'Adding...' : 'Add'}
            </button>
          </div>
        </div>
      )}
    </section>
  );
}

export default FoodList;